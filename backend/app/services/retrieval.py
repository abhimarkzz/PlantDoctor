"""Retrieval service implementing Vector Search, Text Search, and Reciprocal Rank Fusion (RRF)."""

import logging
from typing import Any, Dict, List, Optional
from pymongo.database import Database

from ..models.schemas import EvidenceChunkRecord
from ..db.repositories import EvidenceChunkRepository
from ..db.mongo import get_database
from .embeddings import get_embedding_service

logger = logging.getLogger("plantdoctor.retrieval")

RRF_K = 60  # Standard constant for Reciprocal Rank Fusion


class RetrievalService:
    def __init__(self, chunk_repo: EvidenceChunkRepository, db: Optional[Database] = None):
        self.chunk_repo = chunk_repo
        self._custom_db = db
        self.embedding_service = get_embedding_service()

    @property
    def db(self) -> Optional[Database]:
        if self._custom_db is not None:
            return self._custom_db
        return get_database()

    def vector_search(
        self,
        query: str,
        crop_id: Optional[str] = None,
        region_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[EvidenceChunkRecord]:
        """Performs dense vector retrieval using fastembed embeddings."""
        query_vector = self.embedding_service.embed_query(query)

        # Check if connected to MongoDB Atlas and vector search aggregation is supported
        if self.db is not None:
            try:
                pipeline: List[Dict[str, Any]] = [
                    {
                        "$vectorSearch": {
                            "index": "vector_index",
                            "path": "embedding",
                            "queryVector": query_vector,
                            "numCandidates": limit * 5,
                            "limit": limit,
                        }
                    }
                ]
                # Add optional filter if provided
                filter_doc: Dict[str, Any] = {}
                if crop_id:
                    filter_doc["crop_id"] = crop_id
                if region_id:
                    filter_doc["region_id"] = region_id
                if filter_doc:
                    pipeline[0]["$vectorSearch"]["filter"] = filter_doc

                pipeline.append({
                    "$project": {
                        "_id": 0,
                        "id": 1,
                        "source_id": 1,
                        "source_version": 1,
                        "text": 1,
                        "page_or_section": 1,
                        "crop_id": 1,
                        "region_id": 1,
                        "status": 1,
                        "score": {"$meta": "vectorSearchScore"},
                    }
                })

                results = list(self.db["evidence_chunks"].aggregate(pipeline))
                chunks = []
                for doc in results:
                    chunk = EvidenceChunkRecord.model_validate(doc)
                    chunk.relevance_score = float(doc.get("score", 0.8))
                    chunks.append(chunk)
                if chunks:
                    return chunks
            except Exception as e:
                logger.warning(f"Atlas $vectorSearch aggregation not available or failed: {e}. Falling back to in-memory cosine similarity.")

        # In-memory vector cosine similarity ranking
        all_chunks = self.chunk_repo.list_all(limit=500)
        scored: List[Tuple[float, EvidenceChunkRecord]] = []

        for chunk in all_chunks:
            if not chunk.embedding:
                continue
            sim = self.embedding_service.cosine_similarity(query_vector, chunk.embedding)
            chunk_copy = chunk.model_copy()
            chunk_copy.relevance_score = round(sim, 4)
            scored.append((sim, chunk_copy))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:limit]]

    def text_search(
        self,
        query: str,
        limit: int = 10,
    ) -> List[EvidenceChunkRecord]:
        """Performs keyword text retrieval over evidence passages."""
        query_words = set(query.lower().split())

        all_chunks = self.chunk_repo.list_all(limit=500)
        scored = []
        for chunk in all_chunks:
            chunk_words = set(chunk.text.lower().split())
            overlap = len(query_words.intersection(chunk_words))
            if overlap > 0:
                score = overlap / max(1, len(query_words))
                chunk_copy = chunk.model_copy()
                chunk_copy.relevance_score = round(score, 4)
                scored.append((score, chunk_copy))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:limit]]

    def hybrid_search(
        self,
        query: str,
        crop_id: Optional[str] = None,
        region_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[EvidenceChunkRecord]:
        """
        Combines Dense Vector Retrieval and Keyword Text Retrieval
        using Reciprocal Rank Fusion (RRF).
        RRF(d) = sum_{m in M} 1 / (k + r_m(d))
        """
        vector_results = self.vector_search(query, crop_id=crop_id, region_id=region_id, limit=limit * 2)
        text_results = self.text_search(query, limit=limit * 2)

        rrf_scores: Dict[str, float] = {}
        chunk_map: Dict[str, EvidenceChunkRecord] = {}

        # 1. Rank vector results
        for rank, chunk in enumerate(vector_results, start=1):
            chunk_map[chunk.id] = chunk
            rrf_scores[chunk.id] = rrf_scores.get(chunk.id, 0.0) + (1.0 / (RRF_K + rank))

        # 2. Rank text results
        for rank, chunk in enumerate(text_results, start=1):
            if chunk.id not in chunk_map:
                chunk_map[chunk.id] = chunk
            rrf_scores[chunk.id] = rrf_scores.get(chunk.id, 0.0) + (1.0 / (RRF_K + rank))

        # 3. Sort fused results
        sorted_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)

        fused_chunks = []
        for cid in sorted_ids[:limit]:
            chunk = chunk_map[cid].model_copy()
            # Normalize RRF score to 0..1 range for UI display
            raw_rrf = rrf_scores[cid]
            # Max possible score with rank 1 in both is 2 / (61) ~= 0.0328
            normalized_score = min(1.0, round(raw_rrf * 30.0, 4))
            # Preserve highest similarity if vector was high
            if chunk.relevance_score is not None:
                chunk.relevance_score = max(chunk.relevance_score, normalized_score)
            else:
                chunk.relevance_score = normalized_score
            fused_chunks.append(chunk)

        return fused_chunks
