"""Health and diagnostic status endpoints."""

from fastapi import APIRouter
from ..config import settings
from ..db.mongo import check_mongo_health
from ..models.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
@router.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """
    Returns application and database connectivity status.
    Explicitly distinguishes overall application health from database connectivity.
    """
    db_status, _ = check_mongo_health()
    overall_status = "healthy" if db_status == "connected" else "degraded"

    llm_status = "available" if settings.is_llm_configured else "not_configured"

    return HealthResponse(
        status=overall_status,
        database=db_status,
        mongo_connected=(db_status == "connected"),
        database_name=settings.mongodb_db_name if settings.is_mongodb_configured else None,
        embedding_model=settings.embedding_model,
        embedding_dimension=settings.embedding_dimension,
        llm_status=llm_status,
        version="0.1.0",
    )
