"""Offline knowledge packs endpoints."""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from ..deps import get_pack_service
from ..models.schemas import KnowledgePackOut
from ..services.pack_service import KnowledgePackService

router = APIRouter(prefix="/api/v1/packs", tags=["Knowledge Packs"])


@router.get("", response_model=List[KnowledgePackOut])
def list_knowledge_packs(
    pack_service: KnowledgePackService = Depends(get_pack_service),
) -> List[KnowledgePackOut]:
    """Lists all versioned knowledge packs available on the server."""
    return pack_service.list_packs_out()


@router.get("/{pack_id}", response_model=KnowledgePackOut)
def get_knowledge_pack(
    pack_id: str,
    pack_service: KnowledgePackService = Depends(get_pack_service),
) -> KnowledgePackOut:
    """Retrieves metadata and checksum for a single knowledge pack."""
    packs = pack_service.list_packs_out()
    for p in packs:
        if p.id == pack_id:
            return p
    raise HTTPException(status_code=404, detail="Knowledge pack not found.")


@router.get("/{pack_id}/download")
def download_knowledge_pack(
    pack_id: str,
    pack_service: KnowledgePackService = Depends(get_pack_service),
) -> Dict[str, Any]:
    """
    Downloads the complete versioned package (manifest + sources + chunks)
    for offline storage in client-side IndexedDB.
    """
    payload = pack_service.get_pack_download_payload(pack_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Knowledge pack not found or payload unavailable.")
    return payload
