"""Pydantic schemas for Plant Doctor backend models and API contracts."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator

from .enums import EvidenceStatus, SourceStatus, KnowledgePackStatus


class CamelModel(BaseModel):
    """Base model with population by alias enabled and camelCase serialization support."""
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


# --- Core Database Entity Schemas ---

class SourceRecord(BaseModel):
    id: str = Field(description="Stable source identifier, e.g. src-001")
    identifier: Optional[str] = Field(default=None, description="Official citation code / DOI, e.g. FAO-AGP-2023-01")
    title: str
    authors: List[str] = Field(default_factory=list)
    institution: Optional[str] = None
    published_date: Optional[str] = None
    last_verified: Optional[str] = None
    url: Optional[str] = None
    version: str = "1.0.0"
    status: SourceStatus = SourceStatus.VERIFIED
    crops: List[str] = Field(default_factory=list)
    regions: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=lambda: ["en"])
    license: Optional[str] = None
    checksum: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EvidenceChunkRecord(BaseModel):
    id: str = Field(description="Stable chunk identifier, e.g. chunk-001")
    source_id: str
    source_version: str = "1.0.0"
    text: str
    page_or_section: Optional[str] = None
    crop_id: Optional[str] = None
    region_id: Optional[str] = None
    growth_stage_id: Optional[str] = None
    embedding: Optional[List[float]] = None
    status: SourceStatus = SourceStatus.VERIFIED
    relevance_score: Optional[float] = None
    pack_ids: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class KnowledgePackRecord(BaseModel):
    id: str
    name: str
    description: str
    version: str
    region: Optional[str] = None
    crop_categories: List[str] = Field(default_factory=list)
    size_bytes: int = 0
    source_count: int = 0
    chunk_ids: List[str] = Field(default_factory=list)
    source_ids: List[str] = Field(default_factory=list)
    checksum: str = Field(description="SHA-256 hash of included chunks and metadata")
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_synced: Optional[str] = None
    last_verified: Optional[str] = None
    status: KnowledgePackStatus = KnowledgePackStatus.AVAILABLE


class EvaluationCaseRecord(BaseModel):
    case_id: str
    query: str
    crop_id: Optional[str] = None
    region_id: Optional[str] = None
    expected_source_ids: List[str] = Field(default_factory=list)
    expected_status: EvidenceStatus
    expected_abstention: bool = False
    notes: Optional[str] = None


# --- API Request and Response Models (Compatible with Frontend) ---

class EvidenceSourceOut(CamelModel):
    id: str
    identifier: Optional[str] = None
    title: str
    authors: List[str] = Field(default_factory=list)
    published_date: Optional[str] = Field(default=None, serialization_alias="publishedDate")
    url: Optional[str] = None
    institution: Optional[str] = None
    last_verified: Optional[str] = Field(default=None, serialization_alias="lastVerified")


class EvidenceChunkOut(CamelModel):
    id: str
    source_id: str = Field(serialization_alias="sourceId")
    source: EvidenceSourceOut
    text: str
    status: EvidenceStatus
    relevance_score: Optional[float] = Field(default=None, serialization_alias="relevanceScore")
    page_or_section: Optional[str] = Field(default=None, serialization_alias="pageOrSection")


class QuestionRequest(BaseModel):
    query: str = Field(min_length=3, max_length=2000)
    crop_id: Optional[str] = Field(default=None, alias="cropId")
    region_id: Optional[str] = Field(default=None, alias="regionId")
    growth_stage_id: Optional[str] = Field(default=None, alias="growthStageId")
    language: Optional[str] = "en"

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="before")
    @classmethod
    def accept_question_alias(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "query" not in data and "question" in data:
                data["query"] = data["question"]
        return data


class AnswerResult(CamelModel):
    id: str
    query: str
    summary: str
    overall_status: EvidenceStatus = Field(serialization_alias="overallStatus")
    evidence_chunks: List[EvidenceChunkOut] = Field(default_factory=list, serialization_alias="evidenceChunks")
    caveats: List[str] = Field(default_factory=list)
    is_illustrative: bool = Field(default=False, serialization_alias="isIllustrative")
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), serialization_alias="generatedAt")
    status_reason: Optional[str] = Field(default=None, serialization_alias="statusReason")


class KnowledgePackOut(CamelModel):
    id: str
    name: str
    description: str
    version: str
    region: Optional[str] = None
    crop_categories: List[str] = Field(default_factory=list, serialization_alias="cropCategories")
    size_bytes: int = Field(default=0, serialization_alias="sizeBytes")
    source_count: int = Field(default=0, serialization_alias="sourceCount")
    checksum: str
    last_updated: str = Field(serialization_alias="lastUpdated")
    last_synced: Optional[str] = Field(default=None, serialization_alias="lastSynced")
    last_verified: Optional[str] = Field(default=None, serialization_alias="lastVerified")
    status: KnowledgePackStatus


class HealthResponse(CamelModel):
    status: str = "healthy"
    database: str = Field(description="'connected', 'unconfigured', or 'unavailable'")
    mongo_connected: bool = Field(default=False, serialization_alias="mongoConnected")
    database_name: Optional[str] = Field(default=None, serialization_alias="databaseName")
    embedding_model: str = Field(serialization_alias="embeddingModel")
    embedding_dimension: int = Field(serialization_alias="embeddingDimension")
    llm_status: str = Field(description="'available' or 'not_configured'", serialization_alias="llmStatus")
    version: str = "0.1.0"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class IngestDocumentRequest(BaseModel):
    title: str = Field(min_length=3)
    authors: List[str] = Field(default_factory=list)
    institution: Optional[str] = None
    identifier: Optional[str] = None
    published_date: Optional[str] = None
    last_verified: Optional[str] = None
    url: Optional[str] = None
    crops: List[str] = Field(default_factory=list)
    regions: List[str] = Field(default_factory=list)
    license: Optional[str] = None
    text: str = Field(min_length=10)


class IngestResponse(CamelModel):
    source_id: str = Field(serialization_alias="sourceId")
    title: str
    chunks_created: int = Field(serialization_alias="chunksCreated")
    checksum: str
    message: str
