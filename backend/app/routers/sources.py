"""Agricultural sources and evidence chunks inspection endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from ..deps import get_chunk_repo, get_source_repo
from ..db.repositories import EvidenceChunkRepository, SourceRepository
from ..models.schemas import EvidenceChunkRecord, SourceRecord

router = APIRouter(prefix="/api/v1", tags=["Sources & Evidence"])


@router.get("/sources", response_model=List[SourceRecord])
def list_sources(
    source_repo: SourceRepository = Depends(get_source_repo),
) -> List[SourceRecord]:
    """Lists all approved agricultural source documents."""
    return source_repo.list_all()


@router.get("/sources/{source_id}", response_model=SourceRecord)
def get_source(
    source_id: str,
    source_repo: SourceRepository = Depends(get_source_repo),
) -> SourceRecord:
    """Retrieves metadata and provenance for an authoritative source."""
    source = source_repo.get_by_id(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Agricultural source not found.")
    return source


@router.get("/evidence/{chunk_id}", response_model=EvidenceChunkRecord)
def get_evidence_chunk(
    chunk_id: str,
    chunk_repo: EvidenceChunkRepository = Depends(get_chunk_repo),
) -> EvidenceChunkRecord:
    """Retrieves an individual evidence chunk with full provenance."""
    chunk = chunk_repo.get_by_id(chunk_id)
    if not chunk:
        raise HTTPException(status_code=404, detail="Evidence passage not found.")
    return chunk
