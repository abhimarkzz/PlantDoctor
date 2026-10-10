"""MongoDB indexes definition and ensure_indexes routine."""

import logging
from typing import Any, Dict
from pymongo import ASCENDING, TEXT
from pymongo.database import Database
from pymongo.errors import PyMongoError

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


def ensure_indexes(db: Database) -> Dict[str, int]:
    """
    Creates ordinary MongoDB indexes on collections:
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


def get_atlas_vector_search_instructions() -> str:
    """Returns exact instructions for creating the Atlas Vector Search Index in MongoDB Atlas UI."""
    return f"""
MongoDB Atlas Vector Search Index Setup Instructions
=====================================================
Collection: evidence_chunks
Index Name: {ATLAS_VECTOR_SEARCH_INDEX_DEFINITION['name']}

1. Log into your MongoDB Atlas Console (https://cloud.mongodb.com/).
2. Navigate to your cluster -> 'Atlas Search' tab.
3. Click 'Create Search Index' -> Select 'Atlas Vector Search' (JSON Editor).
4. Select database: 'plantdoctor' (or your configured database name).
5. Select collection: 'evidence_chunks'.
6. Paste the following JSON definition:

{str(ATLAS_VECTOR_SEARCH_INDEX_DEFINITION['definition']).replace("'", '"')}

7. Click 'Next' and then 'Create Search Index'.
8. Wait for the index status to change to 'Active'.
"""
