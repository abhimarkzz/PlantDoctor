"""Tests for idempotent ingestion, duplicate prevention, and safe source updates."""

import pytest
from backend.app.models.schemas import IngestDocumentRequest
from backend.app.db.repositories import SourceRepository, EvidenceChunkRepository
from backend.app.services.ingestion import IngestionService


def test_idempotent_ingestion_and_safe_update():
    source_repo = SourceRepository(db=None)
    chunk_repo = EvidenceChunkRepository(db=None)
    ingestion = IngestionService(source_repo, chunk_repo)

    req1 = IngestDocumentRequest(
        identifier="test-doc-001",
        title="Tomato Early Blight Guide",
        authors=["State Ag Extension"],
        institution="ICAR",
        published_date="2024-01-15",
        text="Early blight in tomato is caused by the fungus Alternaria solani. " * 20,
        crops=["tomato"],
        regions=["tropical"],
    )

    # 1. Initial ingestion
    res1 = ingestion.ingest_document(req1)
    assert res1.source_id is not None
    assert res1.chunks_created > 0
    initial_chunks = chunk_repo.count()
    assert initial_chunks > 0

    # 2. Duplicate ingestion (same identifier, same content)
    res2 = ingestion.ingest_document(req1)
    assert res2.source_id == res1.source_id
    assert "already ingested" in res2.message.lower()
    # Chunk count should not have doubled
    assert chunk_repo.count() == initial_chunks

    # 3. Update existing document with new content
    req_updated = IngestDocumentRequest(
        identifier="test-doc-001",
        title="Tomato Early Blight Guide (Updated Edition)",
        authors=["State Ag Extension"],
        institution="ICAR",
        published_date="2024-06-01",
        text="Updated research indicates copper fungicides must be applied at first sign of concentric lesions. " * 15,
        crops=["tomato"],
        regions=["tropical"],
    )
    res3 = ingestion.ingest_document(req_updated)
    assert res3.source_id == res1.source_id  # Preserves stable source ID
    updated_source = source_repo.get_by_id(res1.source_id)
    assert updated_source is not None
    assert updated_source.title == "Tomato Early Blight Guide (Updated Edition)"
    assert updated_source.version != "1.0.0"
