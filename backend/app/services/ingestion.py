"""Document ingestion pipeline for plain text and PDF agricultural materials."""

import hashlib
import logging
import uuid
from typing import List, Optional
from pypdf import PdfReader
from io import BytesIO

from ..models.enums import SourceStatus
from ..models.schemas import (
    EvidenceChunkRecord,
    IngestDocumentRequest,
    IngestResponse,
    SourceRecord,
)
from ..db.repositories import EvidenceChunkRepository, SourceRepository
from .embeddings import get_embedding_service

logger = logging.getLogger("plantdoctor.ingestion")

CHUNK_SIZE_WORDS = 70
CHUNK_OVERLAP_WORDS = 15


class IngestionService:
    def __init__(
        self,
        source_repo: SourceRepository,
        chunk_repo: EvidenceChunkRepository,
    ):
        self.source_repo = source_repo
        self.chunk_repo = chunk_repo
        self.embedding_service = get_embedding_service()

    def ingest_document(self, doc_req: IngestDocumentRequest) -> IngestResponse:
        """
        Ingests a document: creates a SourceRecord, splits into overlapping chunks,
        generates real embeddings, and saves to repository.
        """
        raw_text = doc_req.text.strip()
        checksum = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

        # Check for existing source with same identifier or checksum to prevent accidental duplicate ingestion
        existing = None
        if doc_req.identifier:
            existing = self.source_repo.find_by_identifier(doc_req.identifier)
        if not existing and checksum:
            existing = self.source_repo.find_by_checksum(checksum)

        if existing:
            # If checksum is identical, it's an exact duplicate: return existing without re-embedding
            if existing.checksum == checksum:
                existing_chunks = self.chunk_repo.find_by_source_id(existing.id)
                logger.info(f"Duplicate document detected for identifier '{doc_req.identifier}'. Returning existing source {existing.id}.")
                return IngestResponse(
                    source_id=existing.id,
                    title=existing.title,
                    chunks_created=len(existing_chunks),
                    checksum=checksum,
                    message="Document already ingested with matching content checksum. Existing record preserved.",
                )

            # Safe source update: increment version and clean old chunks before re-indexing
            source_id = existing.id
            version_parts = existing.version.split(".")
            try:
                new_minor = int(version_parts[-1]) + 1
                new_version = f"{version_parts[0]}.{new_minor}"
            except Exception:
                new_version = f"{existing.version}.1"

            source = existing.model_copy(update={
                "title": doc_req.title,
                "authors": doc_req.authors or existing.authors,
                "institution": doc_req.institution or existing.institution,
                "published_date": doc_req.published_date or existing.published_date,
                "last_verified": doc_req.last_verified or doc_req.published_date or existing.last_verified,
                "url": doc_req.url or existing.url,
                "crops": doc_req.crops or existing.crops,
                "regions": doc_req.regions or existing.regions,
                "license": doc_req.license or existing.license,
                "checksum": checksum,
                "version": new_version,
            })
            self.chunk_repo.delete_by_source_id(source.id)
        else:
            source_id = f"src-{uuid.uuid4().hex[:8]}"
            source = SourceRecord(
                id=source_id,
                identifier=doc_req.identifier,
                title=doc_req.title,
                authors=doc_req.authors,
                institution=doc_req.institution,
                published_date=doc_req.published_date,
                last_verified=doc_req.last_verified or doc_req.published_date,
                url=doc_req.url,
                crops=doc_req.crops,
                regions=doc_req.regions,
                license=doc_req.license,
                checksum=checksum,
                status=SourceStatus.VERIFIED,
            )

        self.source_repo.upsert(source)

        # Chunk the text into meaningful passages
        chunks = self._chunk_text(
            text=raw_text,
            source_id=source.id,
            source_version=source.version,
            crop_id=doc_req.crops[0] if doc_req.crops else None,
            region_id=doc_req.regions[0] if doc_req.regions else None,
        )

        # Generate dense embeddings for all chunks
        texts = [c.text for c in chunks]
        embeddings = self.embedding_service.embed_documents(texts)
        for chunk, emb in zip(chunks, embeddings):
            chunk.embedding = emb

        # Persist chunks
        self.chunk_repo.upsert_many(chunks)

        logger.info(f"Ingested source '{source.title}' ({source.id}) with {len(chunks)} chunks.")

        return IngestResponse(
            source_id=source.id,
            title=source.title,
            chunks_created=len(chunks),
            checksum=checksum,
            message="Document successfully ingested and indexed with dense embeddings.",
        )

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extracts text pages from PDF binary."""
        reader = PdfReader(BytesIO(pdf_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            extracted = page.extract_text() or ""
            if extracted.strip():
                pages_text.append(f"[Page {i + 1}]\n{extracted.strip()}")
        return "\n\n".join(pages_text)

    def _chunk_text(
        self,
        text: str,
        source_id: str,
        source_version: str,
        crop_id: Optional[str] = None,
        region_id: Optional[str] = None,
    ) -> List[EvidenceChunkRecord]:
        """Splits text into overlapping word windows."""
        words = text.split()
        if not words:
            return []

        chunks: List[EvidenceChunkRecord] = []
        step = CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS
        chunk_idx = 1

        for i in range(0, len(words), step):
            chunk_words = words[i : i + CHUNK_SIZE_WORDS]
            if not chunk_words:
                break

            chunk_text = " ".join(chunk_words)
            chunk_id = f"chunk-{source_id}-{chunk_idx:03d}"
            chunk_idx += 1

            chunks.append(
                EvidenceChunkRecord(
                    id=chunk_id,
                    source_id=source_id,
                    source_version=source_version,
                    text=chunk_text,
                    page_or_section=f"Section {chunk_idx - 1}",
                    crop_id=crop_id,
                    region_id=region_id,
                )
            )

        return chunks
