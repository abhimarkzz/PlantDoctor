"""Deterministic tests for the Evidence Status Gate.
Verifies all 7 core failure prevention mechanisms:
1. Supported question for selected crop -> APPLICABLE.
2. Missing crop or required context -> CONTEXT_INCOMPLETE.
3. Known cross-crop mismatch (e.g. rice query in tomato context) -> INSUFFICIENT_EVIDENCE (rejection).
4. Withdrawn/deprecated or expired source -> REJECTED / FRESHNESS_UNVERIFIED.
5. Incompatible recommendations between sources -> CONFLICTING_EVIDENCE.
6. Question unsupported by available corpus -> INSUFFICIENT_EVIDENCE (abstention).
7. Semantically similar but contextually inapplicable passages (e.g. low relevance or wrong climate) -> REJECTED.
"""

from backend.app.models.enums import EvidenceStatus, SourceStatus
from backend.app.models.schemas import EvidenceChunkRecord, SourceRecord
from backend.app.services.evidence_gate import EvidenceStatusGate


def test_gate_approves_fully_applicable():
    """1. Supported question with verified, applicable crop and region context."""
    gate = EvidenceStatusGate()
    valid_chunk = EvidenceChunkRecord(
        id="chunk-valid",
        source_id="src-valid",
        text="Tomato nitrogen deficiency causes uniform yellowing of older lower leaves.",
        crop_id="tomato",
        region_id="temperate",
        relevance_score=0.92,
    )
    sources = {
        "src-valid": SourceRecord(
            id="src-valid",
            title="Current Extension 2023",
            crops=["tomato"],
            last_verified="2024-01-01T00:00:00Z",
        )
    }

    eval_result = gate.evaluate(
        query="Why are my tomato lower leaves yellowing?",
        crop_id="tomato",
        region_id="temperate",
        retrieved_chunks=[valid_chunk],
        sources_by_id=sources,
    )
    assert eval_result.status == EvidenceStatus.APPLICABLE
    assert len(eval_result.eligible_chunks) == 1
    assert eval_result.eligible_chunks[0].id == "chunk-valid"


def test_gate_rejects_missing_crop_context():
    """2. Missing crop context requires clarification before assessing symptoms."""
    gate = EvidenceStatusGate()
    eval_result = gate.evaluate(
        query="The leaves are turning yellow with brown spots",
        crop_id=None,
        region_id="temperate",
        retrieved_chunks=[],
        sources_by_id={},
    )
    assert eval_result.status == EvidenceStatus.CONTEXT_INCOMPLETE
    assert "Crop context was not provided" in eval_result.reason


def test_gate_deterministic_hard_crop_mismatch():
    """3. Hard cross-crop mismatch: rice question asked in tomato context."""
    gate = EvidenceStatusGate()
    rice_chunk = EvidenceChunkRecord(
        id="chunk-rice-01",
        source_id="src-rice",
        text="Rice blast symptoms include spindle shaped foliar lesions.",
        crop_id="rice",
        region_id="tropical",
        relevance_score=0.88,
    )
    sources = {
        "src-rice": SourceRecord(
            id="src-rice",
            title="Rice Pathology",
            crops=["rice"],
            last_verified="2023-01-01T00:00:00Z",
        )
    }

    # Query explicitly mentions rice while active context is tomato
    eval_result = gate.evaluate(
        query="Treatment for rice blast foliar burning",
        crop_id="tomato",
        region_id="tropical",
        retrieved_chunks=[rice_chunk],
        sources_by_id=sources,
    )
    # The gate must reject the rice chunk deterministically and abstain
    assert eval_result.status == EvidenceStatus.INSUFFICIENT_EVIDENCE
    assert len(eval_result.eligible_chunks) == 0
    assert any("Hard crop mismatch" in r for _, r in eval_result.rejected_chunks)


def test_gate_rejects_withdrawn_or_deprecated_source():
    """4a. Expired / withdrawn / deprecated sources are disqualified."""
    gate = EvidenceStatusGate()
    withdrawn_chunk = EvidenceChunkRecord(
        id="chunk-withdrawn",
        source_id="src-withdrawn",
        text="Apply banned chlorinated hydrocarbon spray for pest control.",
        crop_id="tomato",
        region_id="temperate",
        relevance_score=0.90,
    )
    sources = {
        "src-withdrawn": SourceRecord(
            id="src-withdrawn",
            title="Withdrawn Circular 1970",
            status=SourceStatus.WITHDRAWN,
            crops=["tomato"],
            last_verified="1970-01-01T00:00:00Z",
        )
    }

    eval_result = gate.evaluate(
        query="How to spray tomato pests?",
        crop_id="tomato",
        region_id="temperate",
        retrieved_chunks=[withdrawn_chunk],
        sources_by_id=sources,
    )
    assert eval_result.status == EvidenceStatus.INSUFFICIENT_EVIDENCE
    assert len(eval_result.eligible_chunks) == 0
    assert any("withdrawn or deprecated" in r for _, r in eval_result.rejected_chunks)


def test_gate_detects_freshness_unverified():
    """4b. Sources older than freshness window (>3 years) marked FRESHNESS_UNVERIFIED."""
    gate = EvidenceStatusGate()
    stale_chunk = EvidenceChunkRecord(
        id="chunk-stale",
        source_id="src-stale",
        text="Apply organophosphate insecticide for hornworms.",
        crop_id="tomato",
        region_id="temperate",
        relevance_score=0.85,
    )
    sources = {
        "src-stale": SourceRecord(
            id="src-stale",
            title="Archival Guide 1998",
            crops=["tomato"],
            last_verified="1998-05-01T00:00:00Z",
        )
    }

    eval_result = gate.evaluate(
        query="How to control tomato hornworms?",
        crop_id="tomato",
        region_id="temperate",
        retrieved_chunks=[stale_chunk],
        sources_by_id=sources,
    )
    assert eval_result.status == EvidenceStatus.FRESHNESS_UNVERIFIED
    assert "freshness limits" in eval_result.reason


def test_gate_detects_conflicting_evidence():
    """5. Incompatible recommendations (chemical spray vs organic prohibition)."""
    gate = EvidenceStatusGate()
    chunk_conventional = EvidenceChunkRecord(
        id="chunk-conv",
        source_id="src-conv",
        text="Apply protective copper fungicide spray at first sign of early blight.",
        crop_id="tomato",
        region_id="temperate",
        relevance_score=0.91,
    )
    chunk_organic = EvidenceChunkRecord(
        id="chunk-org",
        source_id="src-org",
        text="Organic certified: avoid chemical fungicides and synthetic copper spray due to soil toxicity.",
        crop_id="tomato",
        region_id="temperate",
        relevance_score=0.89,
    )
    sources = {
        "src-conv": SourceRecord(id="src-conv", title="Conventional IPM", crops=["tomato"], last_verified="2023-01-01T00:00:00Z"),
        "src-org": SourceRecord(id="src-org", title="Organic Guidelines", crops=["tomato"], last_verified="2023-01-01T00:00:00Z"),
    }

    eval_result = gate.evaluate(
        query="How to treat early blight on tomato?",
        crop_id="tomato",
        region_id="temperate",
        retrieved_chunks=[chunk_conventional, chunk_organic],
        sources_by_id=sources,
    )
    assert eval_result.status == EvidenceStatus.CONFLICTING_EVIDENCE
    assert len(eval_result.conflicts_detected) > 0


def test_gate_abstains_when_corpus_unsupported():
    """6. Question completely unsupported by corpus -> INSUFFICIENT_EVIDENCE."""
    gate = EvidenceStatusGate()
    eval_result = gate.evaluate(
        query="How to prune hydroponic dragon fruit in greenhouse?",
        crop_id="tomato",
        region_id="temperate",
        retrieved_chunks=[],
        sources_by_id={},
    )
    assert eval_result.status == EvidenceStatus.INSUFFICIENT_EVIDENCE
    assert len(eval_result.eligible_chunks) == 0


def test_gate_rejects_semantically_similar_but_contextually_inapplicable():
    """7. Semantically overlapping chunk rejected due to climate / threshold mismatch."""
    gate = EvidenceStatusGate()
    # Low relevance score below MIN_RELEVANCE_THRESHOLD (0.40)
    low_sim_chunk = EvidenceChunkRecord(
        id="chunk-low",
        source_id="src-tomato",
        text="General gardening advice on garden tool sterilization.",
        crop_id="tomato",
        region_id="temperate",
        relevance_score=0.25,  # Below 0.40 floor
    )
    # Climatic mismatch: tropical flooded chunk returned for arid temperate query
    arid_mismatch_chunk = EvidenceChunkRecord(
        id="chunk-clim",
        source_id="src-tomato",
        text="Tomato humid wet season management instructions.",
        crop_id="tomato",
        region_id="tropical",  # Incompatible with arid
        relevance_score=0.85,
    )
    sources = {
        "src-tomato": SourceRecord(
            id="src-tomato",
            title="Tomato Guide",
            crops=["tomato"],
            regions=["tropical"],
            last_verified="2024-01-01T00:00:00Z",
        )
    }

    eval_result = gate.evaluate(
        query="How to manage tomato drought in arid region?",
        crop_id="tomato",
        region_id="arid",
        retrieved_chunks=[low_sim_chunk, arid_mismatch_chunk],
        sources_by_id=sources,
    )
    assert eval_result.status == EvidenceStatus.INSUFFICIENT_EVIDENCE
    assert len(eval_result.eligible_chunks) == 0
    assert any("below threshold" in r for _, r in eval_result.rejected_chunks)
    assert any("Hard climatic mismatch" in r for _, r in eval_result.rejected_chunks)
