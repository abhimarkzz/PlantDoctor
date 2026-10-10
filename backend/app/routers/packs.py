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


@router.get("/ai-model/metadata")
def get_offline_model_metadata() -> Dict[str, Any]:
    """Retrieves on-device ONNX plant classifier metadata and taxonomy."""
    from pathlib import Path
    import json
    meta_path = Path(__file__).resolve().parent.parent / "models" / "artifacts" / "model_metadata.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Model metadata not found.")
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/ai-model/download")
def download_offline_model():
    """Streams the verified MobileNetV2 ONNX model binary for local onnxruntime-web execution."""
    from pathlib import Path
    from fastapi.responses import FileResponse
    model_path = Path(__file__).resolve().parent.parent / "models" / "artifacts" / "mobilenet_v2_plant_disease.onnx"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model binary not found.")
    return FileResponse(
        path=model_path,
        media_type="application/octet-stream",
        filename="mobilenet_v2_plant_disease.onnx",
    )


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

