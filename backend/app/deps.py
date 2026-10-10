"""Dependency injection and service container."""

import logging
from typing import Optional
from pymongo.database import Database

from .db.mongo import get_database
from .db.repositories import (
    EvidenceChunkRepository,
    EvaluationCaseRepository,
    KnowledgePackRepository,
    SourceRepository,
)
from .db.seed_data import seed_database_corpus
from .services.answer_service import AnswerService
from .services.evidence_gate import evidence_gate
from .services.ingestion import IngestionService
from .services.pack_service import KnowledgePackService
from .services.retrieval import RetrievalService

from .services.classifier_service import PlantClassifierService
from .services.multimodal_service import MultimodalService

logger = logging.getLogger("plantdoctor.deps")

# Global singleton repository and service instances
_source_repo: Optional[SourceRepository] = None
_chunk_repo: Optional[EvidenceChunkRepository] = None
_pack_repo: Optional[KnowledgePackRepository] = None
_eval_repo: Optional[EvaluationCaseRepository] = None
_retrieval_service: Optional[RetrievalService] = None
_answer_service: Optional[AnswerService] = None
_ingestion_service: Optional[IngestionService] = None
_pack_service: Optional[KnowledgePackService] = None
_classifier_service: Optional[PlantClassifierService] = None
_multimodal_service: Optional[MultimodalService] = None


def reset_services():
    """Resets global service and repository singletons."""
    global _source_repo, _chunk_repo, _pack_repo, _eval_repo
    global _retrieval_service, _answer_service, _ingestion_service, _pack_service, _classifier_service, _multimodal_service
    _source_repo = None
    _chunk_repo = None
    _pack_repo = None
    _eval_repo = None
    _retrieval_service = None
    _answer_service = None
    _ingestion_service = None
    _pack_service = None
    _classifier_service = None
    _multimodal_service = None


def init_services(db: Optional[Database] = None):
    """Initializes repositories and services, and seeds the authentic corpus if empty."""
    global _source_repo, _chunk_repo, _pack_repo, _eval_repo
    global _retrieval_service, _answer_service, _ingestion_service, _pack_service, _classifier_service, _multimodal_service

    if db is None:
        db = get_database()

    _source_repo = SourceRepository(db)
    _chunk_repo = EvidenceChunkRepository(db)
    _pack_repo = KnowledgePackRepository(db)
    _eval_repo = EvaluationCaseRepository(db)

    _ingestion_service = IngestionService(_source_repo, _chunk_repo)
    _retrieval_service = RetrievalService(_chunk_repo, db)
    _answer_service = AnswerService(_retrieval_service, _source_repo, evidence_gate)
    _pack_service = KnowledgePackService(_pack_repo, _source_repo, _chunk_repo)
    _classifier_service = PlantClassifierService()
    _multimodal_service = MultimodalService(_retrieval_service, _source_repo, evidence_gate, _classifier_service)


    # Seed baseline corpus if repository is empty and database reachable
    try:
        if _source_repo.count() == 0:
            logger.info("Initializing baseline agricultural evidence corpus...")
            seed_database_corpus(_ingestion_service)

        # Build seed knowledge packs if pack repo is empty
        if _pack_repo.count() == 0:
            logger.info("Generating baseline versioned knowledge packs...")
            _pack_service.build_pack(
                pack_id="pack-veg-001",
                name="Solanaceous & Tropical Vegetables",
                description="Diagnostic evidence and nutrient disorder management for tomato, pepper, and eggplant.",
                version="1.0.0",
                crop_categories=["Tomato", "Pepper", "Eggplant"],
                region="Tropical / Sub-tropical",
            )
            _pack_service.build_pack(
                pack_id="pack-rice-001",
                name="Lowland Paddy Rice Pathology",
                description="Blast prevention and water regulation for tropical flooded lowland rice.",
                version="1.0.0",
                crop_categories=["Rice"],
                region="Tropical",
            )
    except Exception as e:
        logger.warning("Could not verify or initialize seed corpus on startup: %s", e)


def get_source_repo() -> SourceRepository:
    if _source_repo is None:
        init_services()
    return _source_repo


def get_chunk_repo() -> EvidenceChunkRepository:
    if _chunk_repo is None:
        init_services()
    return _chunk_repo


def get_pack_repo() -> KnowledgePackRepository:
    if _pack_repo is None:
        init_services()
    return _pack_repo


def get_retrieval_service() -> RetrievalService:
    if _retrieval_service is None:
        init_services()
    return _retrieval_service


def get_answer_service() -> AnswerService:
    if _answer_service is None:
        init_services()
    return _answer_service


def get_ingestion_service() -> IngestionService:
    if _ingestion_service is None:
        init_services()
    return _ingestion_service


def get_pack_service() -> KnowledgePackService:
    if _pack_service is None:
        init_services()
    return _pack_service


def get_multimodal_service() -> MultimodalService:
    if _multimodal_service is None:
        init_services()
    return _multimodal_service


def get_classifier_service() -> PlantClassifierService:
    global _classifier_service
    if _classifier_service is None:
        init_services()
    return _classifier_service

