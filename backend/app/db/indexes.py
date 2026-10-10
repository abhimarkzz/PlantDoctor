"""MongoDB indexes definition, verification, and ensure_indexes routine."""

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from pymongo import ASCENDING, TEXT
from pymongo.database import Database
from pymongo.errors import PyMongoError, OperationFailure

from ..config import settings

logger = logging.getLogger("plantdoctor.db.indexes")

# Atlas Vector Search Index definition JSON
ATLAS_VECTOR_SEARCH_INDEX_DEFINITION: Dict[str, Any] = {
    "name": "vector_index",
    "type": "vectorSearch",
    "definition": {
        "fields": [
            {
                "type": "vector",
                "path": "embedding",
                "numDimensions": 384,
                "similarity": "cosine",
            },
            {
                "type": "filter",
                "path": "crop_id",
            },
            {
                "type": "filter",
                "path": "region_id",
            },
            {
                "type": "filter",
                "path": "status",
            },
            {
                "type": "filter",
                "path": "source_id",
            },
        ]
    },
}


@dataclass
class VectorIndexStatus:
    name: str = "vector_index"
    exists: bool = False
    status: str = "UNCONFIGURED"  # READY, BUILDING, FAILED, NOT_FOUND, UNCONFIGURED, UNAVAILABLE
    queryable: bool = False
    num_dimensions: Optional[int] = None
    similarity: Optional[str] = None
    filter_fields: List[str] = field(default_factory=list)
    error_message: Optional[str] = None
    diagnostic_message: str = ""
    recovery_instructions: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "exists": self.exists,
            "status": self.status,
            "queryable": self.queryable,
            "numDimensions": self.num_dimensions,
            "similarity": self.similarity,
            "filterFields": self.filter_fields,
            "diagnosticMessage": self.diagnostic_message,
            "hasError": self.error_message is not None,
        }


def check_atlas_vector_index(db: Optional[Database]) -> VectorIndexStatus:
    """
    Inspects search index status on collection 'evidence_chunks' against the active MongoDB Atlas cluster.
    Returns VectorIndexStatus with clear diagnostics and exact recovery instructions if not ready.
    Does NOT print or leak secrets.
    """
    index_name = ATLAS_VECTOR_SEARCH_INDEX_DEFINITION["name"]

    if db is None:
        return VectorIndexStatus(
            name=index_name,
            exists=False,
            status="UNCONFIGURED",
            queryable=False,
            diagnostic_message="MongoDB database is not configured or connection is inactive.",
            recovery_instructions="Provide a valid MONGODB_URI in .env and ensure Atlas network access is allowed.",
        )

    try:
        col = db["evidence_chunks"]
        # list_search_indexes is supported on MongoDB Atlas clusters
        indexes = list(col.list_search_indexes())
    except OperationFailure as e:
        logger.warning(f"list_search_indexes failed: {e}. Cluster may not support Atlas Search.")
        return VectorIndexStatus(
            name=index_name,
            exists=False,
            status="UNAVAILABLE",
            queryable=False,
            error_message=str(e),
            diagnostic_message=f"Atlas Search command is unavailable on this MongoDB cluster: {e}",
            recovery_instructions=get_atlas_vector_search_instructions(db.name),
        )
    except Exception as e:
        logger.warning(f"Error inspecting search indexes: {e}")
        return VectorIndexStatus(
            name=index_name,
            exists=False,
            status="ERROR",
            queryable=False,
            error_message=str(e),
            diagnostic_message=f"Could not inspect search indexes: {e}",
            recovery_instructions=get_atlas_vector_search_instructions(db.name),
        )

    # Locate index by name
    v_idx = next((idx for idx in indexes if idx.get("name") == index_name), None)

    if not v_idx:
        return VectorIndexStatus(
            name=index_name,
            exists=False,
            status="NOT_FOUND",
            queryable=False,
            diagnostic_message=f"Search index '{index_name}' does not exist on collection 'evidence_chunks'.",
            recovery_instructions=get_atlas_vector_search_instructions(db.name),
        )

    # Index was found; inspect definition and queryability
    idx_status = str(v_idx.get("status", "UNKNOWN")).upper()
    is_queryable = bool(v_idx.get("queryable", False))

    fields = v_idx.get("latestDefinition", {}).get("fields", [])
    vec_field = next((f for f in fields if f.get("type") == "vector"), {})
    filter_fields = [f.get("path") for f in fields if f.get("type") == "filter" and f.get("path")]

    num_dims = vec_field.get("numDimensions")
    sim = vec_field.get("similarity")

    if is_queryable and idx_status == "READY":
        diagnostic = (
            f"Atlas Vector Search index '{index_name}' is READY and queryable "
            f"(dimensions={num_dims}, similarity={sim}, filters={filter_fields})."
        )
        instructions = ""
    else:
        diagnostic = (
            f"Atlas Vector Search index '{index_name}' exists but is not ready for queries "
            f"(status='{idx_status}', queryable={is_queryable})."
        )
        instructions = (
            f"Wait for index build to finish in Atlas Console -> Atlas Search tab, "
            f"or verify index status on cluster."
        )

    return VectorIndexStatus(
        name=index_name,
        exists=True,
        status=idx_status,
        queryable=is_queryable,
        num_dimensions=num_dims,
        similarity=sim,
        filter_fields=filter_fields,
        diagnostic_message=diagnostic,
        recovery_instructions=instructions,
    )


def ensure_indexes(db: Database) -> Dict[str, int]:
    """
    Creates ordinary MongoDB B-tree indexes on collections:
    - sources
    - evidence_chunks
    - knowledge_packs
    - evaluation_cases
    Returns count of indexes created per collection.
    """
    counts = {}

    try:
        # 1. Sources indexes
        sources_col = db["sources"]
        sources_col.create_index([("id", ASCENDING)], unique=True, name="uniq_source_id")
        sources_col.create_index([("crops", ASCENDING)], name="idx_sources_crops")
        sources_col.create_index([("regions", ASCENDING)], name="idx_sources_regions")
        sources_col.create_index([("status", ASCENDING)], name="idx_sources_status")
        counts["sources"] = 4

        # 2. Evidence chunks indexes
        chunks_col = db["evidence_chunks"]
        chunks_col.create_index([("id", ASCENDING)], unique=True, name="uniq_chunk_id")
        chunks_col.create_index([("source_id", ASCENDING)], name="idx_chunks_source_id")
        chunks_col.create_index([("crop_id", ASCENDING)], name="idx_chunks_crop_id")
        chunks_col.create_index([("region_id", ASCENDING)], name="idx_chunks_region_id")
        chunks_col.create_index([("status", ASCENDING)], name="idx_chunks_status")
        chunks_col.create_index([("pack_ids", ASCENDING)], name="idx_chunks_pack_ids")
        # Text index for text search and RRF hybrid retrieval
        chunks_col.create_index([("text", TEXT)], name="idx_chunks_text_search")
        counts["evidence_chunks"] = 7

        # 3. Knowledge packs indexes
        packs_col = db["knowledge_packs"]
        packs_col.create_index([("id", ASCENDING)], unique=True, name="uniq_pack_id")
        packs_col.create_index([("crop_categories", ASCENDING)], name="idx_packs_crops")
        packs_col.create_index([("region", ASCENDING)], name="idx_packs_region")
        counts["knowledge_packs"] = 3

        # 4. Evaluation cases indexes
        eval_col = db["evaluation_cases"]
        eval_col.create_index([("case_id", ASCENDING)], unique=True, name="uniq_case_id")
        counts["evaluation_cases"] = 1

        logger.info(f"Successfully ensured MongoDB indexes: {counts}")
    except PyMongoError as e:
        logger.error(f"Error ensuring MongoDB indexes: {e}")
        raise

    return counts


def get_atlas_vector_search_instructions(db_name: Optional[str] = None) -> str:
    """Returns exact instructions for creating the Atlas Vector Search Index in MongoDB Atlas UI."""
    target_db = db_name or settings.mongodb_db_name or "plant_doctor"
    definition_json = json.dumps(ATLAS_VECTOR_SEARCH_INDEX_DEFINITION["definition"], indent=2)

    return f"""=====================================================
MongoDB Atlas Vector Search Index Setup Instructions
=====================================================
Collection: evidence_chunks
Index Name: {ATLAS_VECTOR_SEARCH_INDEX_DEFINITION['name']}

1. Log into your MongoDB Atlas Console (https://cloud.mongodb.com/).
2. Navigate to your cluster -> 'Atlas Search' tab.
3. Click 'Create Search Index' -> Select 'Atlas Vector Search' (JSON Editor).
4. Select database: '{target_db}'.
5. Select collection: 'evidence_chunks'.
6. Paste the following JSON definition:

{definition_json}

7. Click 'Next' and then 'Create Search Index'.
8. Wait for the index status to change to 'Active' (READY).
====================================================="""
