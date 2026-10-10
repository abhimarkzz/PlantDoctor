"""Questions and diagnostic guidance endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import ValidationError
from ..deps import get_answer_service
from ..models.schemas import AnswerResult, QuestionRequest
from ..services.answer_service import AnswerService

_INVALID_QUERY_DETAIL = "Invalid request: 'query' must be 3–2000 non-whitespace characters."

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

        try:
            req = QuestionRequest(
                query=query,
                crop_id=str(crop_id) if crop_id else None,
                region_id=str(region_id) if region_id else None,
                growth_stage_id=str(growth_stage_id) if growth_stage_id else None,
            )
        except ValidationError:
            raise HTTPException(status_code=422, detail=_INVALID_QUERY_DETAIL)
    else:
        body = await request.json()
        try:
            req = QuestionRequest.model_validate(body)
        except ValidationError:
            raise HTTPException(status_code=422, detail=_INVALID_QUERY_DETAIL)

    return answer_service.answer_question(req)
