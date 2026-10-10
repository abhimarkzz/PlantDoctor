"""Retrieval service implementing real Atlas Vector Search, Text Search, and Reciprocal Rank Fusion (RRF)."""

import logging
from typing import Any, Dict, List, Optional, Tuple
from pymongo.database import Database
from pymongo.errors import PyMongoError

from ..models.schemas import EvidenceChunkRecord
from ..db.repositories import EvidenceChunkRepository
from ..db.mongo import get_database
from ..db.indexes import (
    VectorIndexStatus,
    check_atlas_vector_index,
    get_atlas_vector_search_instructions,
    ATLAS_VECTOR_SEARCH_INDEX_DEFINITION,
)
from .embeddings import get_embedding_service

logger = logging.getLogger("plantdoctor.retrieval")

RRF_K = 60  # Standard constant for Reciprocal Rank Fusion


class RetrievalError(Exception):
    """Base exception for retrieval operations."""
    pass


class VectorDimensionMismatchError(RetrievalError):
    """Raised when query vector dimension does not match configured embedding model dimension."""
    pass


class AtlasVectorSearchUnavailableError(RetrievalError):
    """Raised when Atlas Vector Search is requested but index is absent, building, or unavailable."""
    def __init__(
        self,
        message: str,
        index_status: str,
        instructions: str,
        diagnostic: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.index_status = index_status
        self.instructions = instructions
        self.diagnostic = diagnostic or message


def validate_vector_dimension(vector: List[float], expected_dimension: int):
    """Validates that vector length matches expected embedding model dimensions."""
    actual_dimension = len(vector)
    if actual_dimension != expected_dimension:
        raise VectorDimensionMismatchError(
            f"Query vector dimension mismatch: got {actual_dimension} dimensions, "
            f"expected {expected_dimension} dimensions for the configured embedding model."
        )


def build_vector_search_pipeline(
    query_vector: List[float],
    crop_id: Optional[str] = None,
    region_id: Optional[str] = None,
    status: Optional[str] = "verified",
    limit: int = 10,
    num_candidates: Optional[int] = None,
    index_name: str = "vector_index",
) -> List[Dict[str, Any]]:
    """
    Constructs a real MongoDB Atlas $vectorSearch aggregation pipeline.
    Applies bounded candidate count and metadata pre-filters matching the Atlas index definition.
    """
    # Candidate bounds: MongoDB requires numCandidates >= limit, bounded between 20 and 200
    bounded_candidates = num_candidates or min(max(limit * 10, 20), 200)

    vector_search_stage: Dict[str, Any] = {
        "index": index_name,
        "path": "embedding",
        "queryVector": query_vector,
        "numCandidates": bounded_candidates,
        "limit": limit,
    }

    # Metadata pre-filters: "crop_id", "region_id", "status", "source_id"
    filters: Dict[str, Any] = {}
    if crop_id:
        norm_crop = crop_id.strip().lower()
        filters["crop_id"] = {"$in": [norm_crop, "all"]}

    if region_id:
        norm_region = region_id.strip().lower()
        filters["region_id"] = {"$in": [norm_region, "global", "all"]}

    if status:
        if isinstance(status, str):
            filters["status"] = {"$eq": status}
        elif isinstance(status, list):
            filters["status"] = {"$in": status}

    if filters:
        vector_search_stage["filter"] = filters

    pipeline: List[Dict[str, Any]] = [
        {"$vectorSearch": vector_search_stage},
        {
            "$project": {
                "_id": 0,
                "id": 1,
                "source_id": 1,
                "source_version": 1,
                "text": 1,
                "page_or_section": 1,
                "crop_id": 1,
                "region_id": 1,
                "growth_stage_id": 1,
                "status": 1,
                "pack_ids": 1,
                "created_at": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]

    return pipeline


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

    def get_vector_index_status(self) -> VectorIndexStatus:
        """Inspects search index status on collection 'evidence_chunks' against the active cluster."""
        return check_atlas_vector_index(self.db)

    def atlas_vector_search(
        self,
        query: str,
        crop_id: Optional[str] = None,
        region_id: Optional[str] = None,
        limit: int = 10,
        num_candidates: Optional[int] = None,
        query_vector: Optional[List[float]] = None,
    ) -> List[EvidenceChunkRecord]:
        """
        Executes real MongoDB Atlas $vectorSearch aggregation on evidence_chunks.
        Fails fast with exact diagnostic and recovery instructions if index is absent or unqueryable.
        All returned chunks are tagged with retrieval_mode='atlas_vector_search'.
        """
        if self.db is None:
            instructions = get_atlas_vector_search_instructions()
            raise AtlasVectorSearchUnavailableError(
                message="Cannot execute Atlas Vector Search: MongoDB Atlas is disconnected or unconfigured.",
                index_status="DISCONNECTED",
                instructions=instructions,
                diagnostic="The active database instance is None.",
            )

        # 1. Generate & validate query embedding
        if query_vector is None:
            query_vector = self.embedding_service.embed_query(query)
        validate_vector_dimension(query_vector, self.embedding_service.dimension)

        # 2. Verify vector_index readiness
        index_status = self.get_vector_index_status()
        if not index_status.exists:
            raise AtlasVectorSearchUnavailableError(
                message=f"Atlas Vector Search index '{index_status.name}' does not exist on collection 'evidence_chunks'.",
                index_status=index_status.status,
                instructions=index_status.recovery_instructions,
                diagnostic=index_status.diagnostic_message,
            )

        if not index_status.queryable or index_status.status != "READY":
            raise AtlasVectorSearchUnavailableError(
                message=f"Atlas Vector Search index '{index_status.name}' is not queryable (status='{index_status.status}', queryable={index_status.queryable}).",
                index_status=index_status.status,
                instructions=index_status.recovery_instructions,
                diagnostic=index_status.diagnostic_message,
            )

        # 3. Build & execute $vectorSearch pipeline
        pipeline = build_vector_search_pipeline(
            query_vector=query_vector,
            crop_id=crop_id,
            region_id=region_id,
            status=None,  # Do not filter out unverified status here; let Evidence Status Gate evaluate
            limit=limit,
            num_candidates=num_candidates,
            index_name=index_status.name,
        )

        try:
            results = list(self.db["evidence_chunks"].aggregate(pipeline))
        except PyMongoError as e:
            logger.error(f"PyMongo aggregation error during Atlas $vectorSearch: {e}")
            raise AtlasVectorSearchUnavailableError(
                message=f"Atlas $vectorSearch execution failed: {e}",
                index_status=index_status.status,
                instructions=index_status.recovery_instructions,
                diagnostic=f"MongoDB server returned error: {e}",
            ) from e

        chunks: List[EvidenceChunkRecord] = []
        for doc in results:
            chunk = EvidenceChunkRecord.model_validate(doc)
            chunk.relevance_score = round(float(doc.get("score", 0.0)), 4)
            chunk.retrieval_mode = "atlas_vector_search"
            chunks.append(chunk)

        return chunks

    def local_vector_search(
        self,
        query: str,
        crop_id: Optional[str] = None,
        region_id: Optional[str] = None,
        limit: int = 10,
        query_vector: Optional[List[float]] = None,
    ) -> List[EvidenceChunkRecord]:
        """
        Executes in-memory cosine similarity over local repository chunks (test double / offline mode).
        All returned chunks are tagged with retrieval_mode='local_cosine_test_double'.
        """
        if query_vector is None:
            query_vector = self.embedding_service.embed_query(query)
        validate_vector_dimension(query_vector, self.embedding_service.dimension)

        all_chunks = self.chunk_repo.list_all(limit=500)
        scored: List[Tuple[float, EvidenceChunkRecord]] = []

        norm_crop = crop_id.strip().lower() if crop_id else None

        for chunk in all_chunks:
            if not chunk.embedding:
                continue
            # Respect crop filter in local test double if requested
            if norm_crop and chunk.crop_id and chunk.crop_id.lower() not in [norm_crop, "all"]:
                continue

            sim = self.embedding_service.cosine_similarity(query_vector, chunk.embedding)
            chunk_copy = chunk.model_copy()
            chunk_copy.relevance_score = round(sim, 4)
            chunk_copy.retrieval_mode = "local_cosine_test_double"
            scored.append((sim, chunk_copy))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:limit]]

    def vector_search(
        self,
        query: str,
        crop_id: Optional[str] = None,
        region_id: Optional[str] = None,
        limit: int = 10,
        require_atlas: bool = False,
        query_vector: Optional[List[float]] = None,
    ) -> List[EvidenceChunkRecord]:
        """
        Retrieves vector results.
        If require_atlas=True, strictly executes real Atlas Vector Search or raises AtlasVectorSearchUnavailableError.
        Otherwise, attempts real Atlas Vector Search and gracefully falls back to local cosine test double,
        clearly preserving result provenance on every chunk.
        """
        if require_atlas:
            return self.atlas_vector_search(
                query=query,
                crop_id=crop_id,
                region_id=region_id,
                limit=limit,
                query_vector=query_vector,
            )

        try:
            return self.atlas_vector_search(
                query=query,
                crop_id=crop_id,
                region_id=region_id,
                limit=limit,
                query_vector=query_vector,
            )
        except (AtlasVectorSearchUnavailableError, PyMongoError) as e:
            logger.warning(
                f"Atlas Vector Search unavailable ({type(e).__name__}: {e}). "
                f"Falling back to local cosine test double with provenance='local_cosine_test_double'."
            )
            return self.local_vector_search(
                query=query,
                crop_id=crop_id,
                region_id=region_id,
                limit=limit,
                query_vector=query_vector,
            )

    def text_search(
        self,
        query: str,
        crop_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[EvidenceChunkRecord]:
        """
        Performs keyword text retrieval over evidence passages.
        Uses MongoDB Atlas $text index when connected, or local in-memory word overlap.
        """
        if self.db is not None:
            try:
                filter_doc: Dict[str, Any] = {"$text": {"$search": query}}
                if crop_id:
                    filter_doc["crop_id"] = {"$in": [crop_id.strip().lower(), "all"]}

                docs = list(
                    self.db["evidence_chunks"]
                    .find(filter_doc, {"score": {"$meta": "textScore"}})
                    .sort([("score", {"$meta": "textScore"})])
                    .limit(limit)
                )

                if docs:
                    chunks = []
                    for doc in docs:
                        chunk = EvidenceChunkRecord.model_validate(doc)
                        chunk.relevance_score = round(float(doc.get("score", 1.0)), 4)
                        chunk.retrieval_mode = "atlas_text_search"
                        chunks.append(chunk)
                    return chunks
            except Exception as e:
                logger.warning(f"Atlas $text search failed or not indexed: {e}. Falling back to in-memory keyword matching.")

        # Local in-memory keyword matching fallback
        query_words = set(query.lower().split())
        all_chunks = self.chunk_repo.list_all(limit=500)
        norm_crop = crop_id.strip().lower() if crop_id else None

        scored = []
        for chunk in all_chunks:
            if norm_crop and chunk.crop_id and chunk.crop_id.lower() not in [norm_crop, "all"]:
                continue
            chunk_words = set(chunk.text.lower().split())
            overlap = len(query_words.intersection(chunk_words))
            if overlap > 0:
                score = overlap / max(1, len(query_words))
                chunk_copy = chunk.model_copy()
                chunk_copy.relevance_score = round(score, 4)
                chunk_copy.retrieval_mode = "local_text_search"
                scored.append((score, chunk_copy))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:limit]]

    def hybrid_search(
        self,
        query: str,
        crop_id: Optional[str] = None,
        region_id: Optional[str] = None,
        limit: int = 10,
        require_atlas: bool = False,
    ) -> List[EvidenceChunkRecord]:
        """
        Combines Dense Vector Retrieval and Keyword Text Retrieval
        using Reciprocal Rank Fusion (RRF).
        RRF(d) = sum_{m in M} 1 / (k + r_m(d))
        """
        vector_results = self.vector_search(
            query=query,
            crop_id=crop_id,
            region_id=region_id,
            limit=limit * 2,
            require_atlas=require_atlas,
        )
        text_results = self.text_search(query=query, crop_id=crop_id, limit=limit * 2)

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
            raw_rrf = rrf_scores[cid]
            normalized_score = min(1.0, round(raw_rrf * 30.0, 4))
            if chunk.relevance_score is not None:
                chunk.relevance_score = max(chunk.relevance_score, normalized_score)
            else:
                chunk.relevance_score = normalized_score
            fused_chunks.append(chunk)

        return fused_chunks
