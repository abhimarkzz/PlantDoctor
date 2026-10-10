"""Unit and integration tests for real MongoDB Atlas Vector Search pipeline,
metadata filters, dimension validation, error diagnostics, and result provenance.
"""

from unittest.mock import MagicMock
import pytest

from backend.app.config import settings
from backend.app.db.mongo import get_database
from backend.app.db.indexes import (
    VectorIndexStatus,
    check_atlas_vector_index,
    get_atlas_vector_search_instructions,
)
from backend.app.deps import get_retrieval_service
from backend.app.services.retrieval import (
    AtlasVectorSearchUnavailableError,
    RetrievalService,
    VectorDimensionMismatchError,
    build_vector_search_pipeline,
    validate_vector_dimension,
)


def test_pipeline_definition_structure():
    """Verify $vectorSearch aggregation pipeline structure, candidate bounding, and projection."""
    dummy_vector = [0.1] * 384
    pipeline = build_vector_search_pipeline(
        query_vector=dummy_vector,
        limit=5,
        num_candidates=None,
        index_name="vector_index",
    )

    assert len(pipeline) == 2

    # Stage 0: $vectorSearch
    v_stage = pipeline[0].get("$vectorSearch")
    assert v_stage is not None
    assert v_stage["index"] == "vector_index"
    assert v_stage["path"] == "embedding"
    assert len(v_stage["queryVector"]) == 384
    assert v_stage["limit"] == 5
    # Bounded candidates: limit * 10 = 50
    assert v_stage["numCandidates"] == 50

    # Stage 1: $project with score meta
    p_stage = pipeline[1].get("$project")
    assert p_stage is not None
    assert p_stage["score"] == {"$meta": "vectorSearchScore"}
    assert p_stage["id"] == 1
    assert p_stage["source_id"] == 1
    assert p_stage["text"] == 1


def test_pipeline_candidate_bounding():
    """Verify that candidate count is bounded between 20 and 200."""
    dummy_vector = [0.1] * 384

    # Very small limit -> bounded at minimum 20
    pipeline_small = build_vector_search_pipeline(dummy_vector, limit=1)
    assert pipeline_small[0]["$vectorSearch"]["numCandidates"] == 20

    # Very large limit -> bounded at maximum 200
    pipeline_large = build_vector_search_pipeline(dummy_vector, limit=35)
    assert pipeline_large[0]["$vectorSearch"]["numCandidates"] == 200


def test_pipeline_metadata_filters():
    """Verify metadata pre-filters match the Atlas index definition."""
    dummy_vector = [0.1] * 384

    # 1. Crop filter alone
    p1 = build_vector_search_pipeline(dummy_vector, crop_id="Tomato", status=None)
    filter1 = p1[0]["$vectorSearch"]["filter"]
    assert "crop_id" in filter1
    assert filter1["crop_id"] == {"$in": ["tomato", "all"]}
    assert "region_id" not in filter1

    # 2. Region filter alone
    p2 = build_vector_search_pipeline(dummy_vector, region_id="Tropical", status=None)
    filter2 = p2[0]["$vectorSearch"]["filter"]
    assert "region_id" in filter2
    assert filter2["region_id"] == {"$in": ["tropical", "global", "all"]}

    # 3. Combined filters with status
    p3 = build_vector_search_pipeline(dummy_vector, crop_id="Rice", region_id="Tropical", status="verified")
    filter3 = p3[0]["$vectorSearch"]["filter"]
    assert filter3["crop_id"] == {"$in": ["rice", "all"]}
    assert filter3["region_id"] == {"$in": ["tropical", "global", "all"]}
    assert filter3["status"] == {"$eq": "verified"}

    # 4. No filters provided
    p4 = build_vector_search_pipeline(dummy_vector, crop_id=None, region_id=None, status=None)
    assert "filter" not in p4[0]["$vectorSearch"]


def test_vector_dimension_validation():
    """Verify that vector dimension is strictly validated against configured model dimension."""
    valid_vector = [0.0] * 384
    validate_vector_dimension(valid_vector, expected_dimension=384)

    invalid_vector_short = [0.0] * 128
    with pytest.raises(VectorDimensionMismatchError) as exc_short:
        validate_vector_dimension(invalid_vector_short, expected_dimension=384)
    assert "got 128 dimensions, expected 384" in str(exc_short.value)

    invalid_vector_long = [0.0] * 768
    with pytest.raises(VectorDimensionMismatchError) as exc_long:
        validate_vector_dimension(invalid_vector_long, expected_dimension=384)
    assert "got 768 dimensions, expected 384" in str(exc_long.value)


def test_atlas_vector_search_missing_index_error():
    """Verify clear diagnostic and recovery instructions when vector_index is absent."""
    retrieval = get_retrieval_service()

    # Mock get_vector_index_status returning NOT_FOUND
    mock_status = VectorIndexStatus(
        name="vector_index",
        exists=False,
        status="NOT_FOUND",
        queryable=False,
        diagnostic_message="Search index 'vector_index' does not exist on collection 'evidence_chunks'.",
        recovery_instructions=get_atlas_vector_search_instructions("plant_doctor"),
    )

    original_checker = retrieval.get_vector_index_status
    retrieval.get_vector_index_status = MagicMock(return_value=mock_status)

    try:
        with pytest.raises(AtlasVectorSearchUnavailableError) as exc_info:
            retrieval.atlas_vector_search("tomato disease", limit=5)

        err = exc_info.value
        assert err.index_status == "NOT_FOUND"
        assert "does not exist on collection 'evidence_chunks'" in str(err)
        assert "Atlas Vector Search Index Setup Instructions" in err.instructions
        assert "evidence_chunks" in err.instructions
    finally:
        retrieval.get_vector_index_status = original_checker


def test_atlas_vector_search_building_index_error():
    """Verify clear diagnostic when vector_index exists but is still building."""
    retrieval = get_retrieval_service()

    mock_status = VectorIndexStatus(
        name="vector_index",
        exists=True,
        status="BUILDING",
        queryable=False,
        diagnostic_message="Atlas Vector Search index 'vector_index' exists but is not ready for queries (status='BUILDING', queryable=False).",
        recovery_instructions="Wait for index build to finish in Atlas Console.",
    )

    original_checker = retrieval.get_vector_index_status
    retrieval.get_vector_index_status = MagicMock(return_value=mock_status)

    try:
        with pytest.raises(AtlasVectorSearchUnavailableError) as exc_info:
            retrieval.atlas_vector_search("tomato disease", limit=5)

        err = exc_info.value
        assert err.index_status == "BUILDING"
        assert "not queryable" in str(err)
    finally:
        retrieval.get_vector_index_status = original_checker


def test_result_provenance_tagging():
    """Verify result provenance distinguishes Atlas Vector Search from local cosine test double."""
    retrieval = get_retrieval_service()

    # 1. Local vector search must have 'local_cosine_test_double' provenance
    local_chunks = retrieval.local_vector_search("tomato nitrogen deficiency yellow leaves", limit=3)
    assert len(local_chunks) > 0
    for chunk in local_chunks:
        assert chunk.retrieval_mode == "local_cosine_test_double"

    # 2. Resilient fallback path must preserve honest provenance
    mock_status = VectorIndexStatus(exists=False, status="NOT_FOUND", queryable=False)
    original_checker = retrieval.get_vector_index_status
    retrieval.get_vector_index_status = MagicMock(return_value=mock_status)

    try:
        fallback_chunks = retrieval.vector_search("tomato leaves", limit=3, require_atlas=False)
        assert len(fallback_chunks) > 0
        # Must NEVER silently claim 'atlas_vector_search' when falling back
        for chunk in fallback_chunks:
            assert chunk.retrieval_mode == "local_cosine_test_double"
    finally:
        retrieval.get_vector_index_status = original_checker


@pytest.mark.skipif(not settings.is_mongodb_configured, reason="Requires configured MongoDB Atlas")
def test_live_atlas_vector_search_smoke():
    """Live Atlas smoke test verifying genuine $vectorSearch against the live cluster."""
    db = get_database()
    assert db is not None, "Live test requires active database connection"

    status = check_atlas_vector_index(db)
    if not status.exists or not status.queryable:
        pytest.skip(f"Atlas search index not ready for live querying: {status.diagnostic_message}")

    retrieval = get_retrieval_service()
    chunks = retrieval.atlas_vector_search(
        query="What causes blossom end rot in tomatoes?",
        crop_id="Tomato",
        region_id="Tropical / Sub-tropical",
        limit=3,
    )

    assert len(chunks) > 0
    top_chunk = chunks[0]
    assert top_chunk.retrieval_mode == "atlas_vector_search"
    assert top_chunk.relevance_score is not None
    assert top_chunk.relevance_score > 0.80
    assert "blossom end rot" in top_chunk.text.lower() or "calcium" in top_chunk.text.lower()
