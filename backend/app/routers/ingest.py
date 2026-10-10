"""Protected document ingestion endpoints for agricultural administrators."""

from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from ..config import settings
from ..deps import get_ingestion_service
from ..models.schemas import IngestDocumentRequest, IngestResponse
from ..services.ingestion import IngestionService

router = APIRouter(prefix="/api/v1/ingest", tags=["Ingestion"])


def verify_admin_key(x_admin_key: Optional[str] = Header(default=None, alias="x-admin-key")):
    """Verifies that caller possesses the authorized admin ingestion key."""
    if not x_admin_key or x_admin_key != settings.admin_api_key:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Valid 'x-admin-key' header required for document ingestion.",
        )


@router.post("/text", response_model=IngestResponse, dependencies=[Depends(verify_admin_key)])
def ingest_text_document(
    doc: IngestDocumentRequest,
    ingest_service: IngestionService = Depends(get_ingestion_service),
) -> IngestResponse:
    """Ingests a structured text agricultural publication into MongoDB."""
    return ingest_service.ingest_document(doc)


@router.post("/pdf", response_model=IngestResponse, dependencies=[Depends(verify_admin_key)])
async def ingest_pdf_document(
    title: str = Form(...),
    institution: Optional[str] = Form(None),
    identifier: Optional[str] = Form(None),
    published_date: Optional[str] = Form(None),
    crops: Optional[str] = Form(""),
    regions: Optional[str] = Form(""),
    file: UploadFile = File(...),
    ingest_service: IngestionService = Depends(get_ingestion_service),
) -> IngestResponse:
    """Extracts text from PDF, chunks, computes embeddings, and indexes into MongoDB."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file format: Only PDF files (.pdf) are accepted.")

    # Read binary safely
    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:  # 25 MB limit
        raise HTTPException(status_code=400, detail="PDF exceeds maximum allowed size (25MB).")

    extracted_text = ingest_service.extract_text_from_pdf(contents)
    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract readable text from provided PDF.")

    crop_list = [c.strip() for c in crops.split(",") if c.strip()]
    region_list = [r.strip() for r in regions.split(",") if r.strip()]

    doc_req = IngestDocumentRequest(
        title=title,
        institution=institution,
        identifier=identifier,
        published_date=published_date,
        crops=crop_list,
        regions=region_list,
        text=extracted_text,
    )

    return ingest_service.ingest_document(doc_req)
