"""Questions and diagnostic guidance endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, Form, Request, UploadFile, File
from ..deps import get_answer_service
from ..models.schemas import AnswerResult, QuestionRequest
from ..services.answer_service import AnswerService

router = APIRouter(tags=["Questions"])


@router.post("/api/v1/ask", response_model=AnswerResult)
@router.post("/api/questions", response_model=AnswerResult)
async def ask_question(
    request: Request,
    answer_service: AnswerService = Depends(get_answer_service),
) -> AnswerResult:
    """
    Primary evidence-grounded question answering endpoint.
    Accepts JSON body or multipart form (if photo attachment is included).
    Processes query through dense vector / hybrid retrieval and the Evidence Status Gate.
    """
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        query = str(form.get("query", "")).strip()
        crop_id = form.get("crop_id") or form.get("cropId")
        region_id = form.get("region_id") or form.get("regionId")
        growth_stage_id = form.get("growth_stage_id") or form.get("growthStageId")

        req = QuestionRequest(
            query=query,
            crop_id=str(crop_id) if crop_id else None,
            region_id=str(region_id) if region_id else None,
            growth_stage_id=str(growth_stage_id) if growth_stage_id else None,
        )
    else:
        body = await request.json()
        req = QuestionRequest.model_validate(body)

    return answer_service.answer_question(req)
