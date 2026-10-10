"""Tests for the Evidence Status Gate deterministic evaluation logic."""

from backend.app.models.enums import EvidenceStatus
from backend.app.models.schemas import EvidenceChunkRecord, SourceRecord
from backend.app.services.evidence_gate import EvidenceStatusGate


def test_gate_rejects_missing_crop_context():
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
    gate = EvidenceStatusGate()
    # A chunk strictly for rice
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

    # User query is specifically for tomato
    eval_result = gate.evaluate(
        query="Yellow leaves on tomato plant",
        crop_id="tomato",
        region_id="tropical",
        retrieved_chunks=[rice_chunk],
        sources_by_id=sources,
    )
    # The rice chunk must be deterministically rejected, leaving insufficient evidence for tomato!
    assert eval_result.status == EvidenceStatus.INSUFFICIENT_EVIDENCE
    assert len(eval_result.eligible_chunks) == 0
    assert any("Hard crop mismatch" in r for _, r in eval_result.rejected_chunks)


def test_gate_detects_conflicting_evidence():
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


def test_gate_detects_freshness_unverified():
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
            last_verified="1998-05-01T00:00:00Z",  # Over 20 years old
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


def test_gate_approves_fully_applicable():
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
