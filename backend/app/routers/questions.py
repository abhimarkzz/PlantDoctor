"""Questions and multimodal diagnostic guidance endpoints."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.datastructures import UploadFile
from pydantic import ValidationError

from ..deps import get_answer_service, get_multimodal_service, get_classifier_service
from ..models.schemas import (
    AnswerResult,
    MultimodalAssessmentResult,
    QuestionRequest,
)
from ..services.answer_service import AnswerService
from ..services.multimodal_service import MultimodalService
from ..services.classifier_service import PlantClassifierService

logger = logging.getLogger("plantdoctor.routers.questions")

_INVALID_QUERY_DETAIL = "Invalid request: 'query' must be 3–2000 non-whitespace characters."
_MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB limit
_ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}

router = APIRouter(tags=["Questions"])


@router.post("/api/v1/ask", response_model=AnswerResult)
@router.post("/api/questions", response_model=AnswerResult)
async def ask_question(
    request: Request,
    answer_service: AnswerService = Depends(get_answer_service),
    multimodal_service: MultimodalService = Depends(get_multimodal_service),
    classifier_service: PlantClassifierService = Depends(get_classifier_service),
) -> AnswerResult:
    """
    Primary evidence-grounded question answering endpoint.
    Accepts JSON body or multipart form (if photo attachment is included).
    Processes query through dense vector / hybrid retrieval and the Evidence Status Gate.
    When a photo is attached without text, runs real on-device/backend image classification
    and retrieves evidence relevant to the identified condition.
    """
    content_type = request.headers.get("content-type", "")

    image_bytes = None
    image_mime = None
    language = "en"

    if "multipart/form-data" in content_type:
        form = await request.form()
        query = str(form.get("query", "")).strip()
        crop_id = form.get("crop_id") or form.get("cropId")
        region_id = form.get("region_id") or form.get("regionId")
        growth_stage_id = form.get("growth_stage_id") or form.get("growthStageId")
        language = str(form.get("language") or "en")

        # Check for uploaded image file
        upload = form.get("image") or form.get("file")
        if upload and isinstance(upload, UploadFile):
            if upload.content_type and upload.content_type.lower() not in _ALLOWED_IMAGE_MIMES:
                raise HTTPException(
                    status_code=422,
                    detail="Invalid image type. Accepted formats: JPEG, PNG, WebP.",
                )
            image_bytes = await upload.read()
            if len(image_bytes) > _MAX_IMAGE_SIZE_BYTES:
                raise HTTPException(
                    status_code=422,
                    detail="Image file too large. Maximum allowed size is 10MB.",
                )
            image_mime = upload.content_type

        has_image = bool(image_bytes and len(image_bytes) > 0)

        # Photo-only plant diagnosis: if no text query is entered, classify image
        if has_image and classifier_service.is_available:
            clf_result = classifier_service.classify_image(image_bytes)
            if clf_result:
                if not crop_id and clf_result.crop_id != "unknown":
                    crop_id = clf_result.crop_id
                if not query or len(query) < 3:
                    query = clf_result.suggested_query

        try:
            req = QuestionRequest(
                query=query,
                crop_id=str(crop_id) if crop_id else None,
                region_id=str(region_id) if region_id else None,
                growth_stage_id=str(growth_stage_id) if growth_stage_id else None,
                language=language,
                has_image=has_image,
            )
        except ValidationError:
            raise HTTPException(status_code=422, detail=_INVALID_QUERY_DETAIL)
    else:
        body = await request.json()
        try:
            req = QuestionRequest.model_validate(body)
            language = req.language or "en"
        except ValidationError:
            raise HTTPException(status_code=422, detail=_INVALID_QUERY_DETAIL)

    answer = answer_service.answer_question(req)

    # If an image was attached or multimodal assessment is requested, attach structured assessment
    if image_bytes is not None or req.crop_id or req.region_id:
        assessment = await multimodal_service.assess(
            query=req.query,
            image_bytes=image_bytes,
            image_mime_type=image_mime,
            crop_id=req.crop_id,
            region_id=req.region_id,
            growth_stage_id=req.growth_stage_id,
            language=language,
        )
        answer.assessment = assessment

    return answer


@router.post("/api/v1/assess", response_model=MultimodalAssessmentResult)
async def assess_crop(
    request: Request,
    multimodal_service: MultimodalService = Depends(get_multimodal_service),
    classifier_service: PlantClassifierService = Depends(get_classifier_service),
) -> MultimodalAssessmentResult:
    """
    Dedicated multimodal diagnostic assessment endpoint.
    Accepts natural language problem description, optional image file,
    crop, region context, and requested response language.
    Supports photo-only diagnosis when query text is omitted.
    """
    content_type = request.headers.get("content-type", "")

    image_bytes = None
    image_mime = None
    language = "en"
    crop_id = None
    region_id = None
    growth_stage_id = None
    query = ""

    if "multipart/form-data" in content_type:
        form = await request.form()
        query = str(form.get("query", "")).strip()
        crop_id = form.get("crop_id") or form.get("cropId")
        region_id = form.get("region_id") or form.get("regionId")
        growth_stage_id = form.get("growth_stage_id") or form.get("growthStageId")
        language = str(form.get("language") or "en")

        upload = form.get("image") or form.get("file")
        if upload and isinstance(upload, UploadFile):
            if upload.content_type and upload.content_type.lower() not in _ALLOWED_IMAGE_MIMES:
                raise HTTPException(
                    status_code=422,
                    detail="Invalid image type. Accepted formats: JPEG, PNG, WebP.",
                )
            image_bytes = await upload.read()
            if len(image_bytes) > _MAX_IMAGE_SIZE_BYTES:
                raise HTTPException(
                    status_code=422,
                    detail="Image file too large. Maximum allowed size is 10MB.",
                )
            image_mime = upload.content_type
    else:
        body = await request.json()
        query = str(body.get("query", "")).strip()
        crop_id = body.get("crop_id") or body.get("cropId")
        region_id = body.get("region_id") or body.get("regionId")
        growth_stage_id = body.get("growth_stage_id") or body.get("growthStageId")
        language = str(body.get("language") or "en")

    has_image = bool(image_bytes and len(image_bytes) > 0)
    if not query or len(query) < 3:
        if has_image and classifier_service.is_available:
            clf_result = classifier_service.classify_image(image_bytes)
            if clf_result:
                if not crop_id and clf_result.crop_id != "unknown":
                    crop_id = clf_result.crop_id
                query = clf_result.suggested_query
        else:
            raise HTTPException(status_code=422, detail=_INVALID_QUERY_DETAIL)

    return await multimodal_service.assess(
        query=query,
        image_bytes=image_bytes,
        image_mime_type=image_mime,
        crop_id=str(crop_id) if crop_id else None,
        region_id=str(region_id) if region_id else None,
        growth_stage_id=str(growth_stage_id) if growth_stage_id else None,
        language=language,
    )
