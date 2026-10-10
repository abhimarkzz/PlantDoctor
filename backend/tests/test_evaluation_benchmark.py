"""Measured evaluation benchmark comparing Vector-only, Hybrid, and Hybrid + Gate."""

import time
import pytest
from backend.app.deps import get_retrieval_service, get_source_repo
from backend.app.services.evidence_gate import evidence_gate

BENCHMARK_CASES = [
    {
        "query": "What causes uniform yellowing of older lower tomato leaves?",
        "crop": "tomato",
        "region": "temperate",
        "expected_keywords": ["nitrogen", "yellowing"],
        "should_abstain": False,
    },
    {
        "query": "Concentric rings bullseye dark spots on lower tomato leaves",
        "crop": "tomato",
        "region": "temperate",
        "expected_keywords": ["alternaria", "early blight"],
        "should_abstain": False,
    },
    {
        "query": "Diamond spindle shaped lesions with grey centers in flooded paddy",
        "crop": "rice",
        "region": "tropical",
        "expected_keywords": ["rice blast", "magnaporthe"],
        "should_abstain": False,
    },
    {
        "query": "Can I use chemical fungicide spray or organic biocontrol for tomato early blight?",
        "crop": "tomato",
        "region": "temperate",
        "expected_keywords": ["copper", "bacillus", "organic"],
        "should_abstain": False,
    },
    {
        "query": "Treatment for rice blast foliar burning",
        "crop": "tomato",  # Hard mismatch query: rice question asked for tomato crop
        "region": "temperate",
        "expected_keywords": [],
        "should_abstain": True,
    },
]


def test_retrieval_pipeline_benchmark():
    retrieval = get_retrieval_service()
    source_repo = get_source_repo()

    # Sources lookup
    sources_by_id = {s.id: s for s in source_repo.list_all()}

    # Track metrics
    results = {
        "vector_only": {"hits": 0, "violations": 0, "total_time": 0.0},
        "hybrid": {"hits": 0, "violations": 0, "total_time": 0.0},
        "hybrid_with_gate": {"hits": 0, "violations": 0, "abstentions": 0, "total_time": 0.0},
    }

    n_cases = len(BENCHMARK_CASES)

    for case in BENCHMARK_CASES:
        query = case["query"]
        crop = case["crop"]
        region = case["region"]
        expected_kw = case["expected_keywords"]
        should_abstain = case["should_abstain"]

        # 1. Vector-only
        t0 = time.perf_counter()
        vec_chunks = retrieval.vector_search(query, crop_id=crop, region_id=region, limit=5)
        results["vector_only"]["total_time"] += time.perf_counter() - t0

        if expected_kw:
            vec_hit = any(any(kw in c.text.lower() for kw in expected_kw) for c in vec_chunks)
            if vec_hit:
                results["vector_only"]["hits"] += 1
        # Check applicability violation (e.g. rice chunk retrieved when query is for tomato)
        if crop == "tomato":
            if any(c.crop_id == "rice" for c in vec_chunks):
                results["vector_only"]["violations"] += 1

        # 2. Hybrid (Vector + Text RRF)
        t0 = time.perf_counter()
        hyb_chunks = retrieval.hybrid_search(query, crop_id=crop, region_id=region, limit=5)
        results["hybrid"]["total_time"] += time.perf_counter() - t0

        if expected_kw:
            hyb_hit = any(any(kw in c.text.lower() for kw in expected_kw) for c in hyb_chunks)
            if hyb_hit:
                results["hybrid"]["hits"] += 1
        if crop == "tomato":
            if any(c.crop_id == "rice" for c in hyb_chunks):
                results["hybrid"]["violations"] += 1

        # 3. Hybrid + Evidence Status Gate
        t0 = time.perf_counter()
        hyb_chunks_for_gate = retrieval.hybrid_search(query, crop_id=crop, region_id=region, limit=5)
        gate_eval = evidence_gate.evaluate(
            query=query,
            crop_id=crop,
            region_id=region,
            retrieved_chunks=hyb_chunks_for_gate,
            sources_by_id=sources_by_id,
        )
        results["hybrid_with_gate"]["total_time"] += time.perf_counter() - t0

        if should_abstain:
            if gate_eval.status in ["insufficient_evidence", "context_incomplete"]:
                results["hybrid_with_gate"]["abstentions"] += 1
        else:
            gate_hit = any(any(kw in c.text.lower() for kw in expected_kw) for c in gate_eval.eligible_chunks)
            if gate_hit:
                results["hybrid_with_gate"]["hits"] += 1

        # Gate guarantees ZERO crop mismatch violations in eligible set!
        if crop == "tomato":
            assert not any(c.crop_id == "rice" for c in gate_eval.eligible_chunks)

    # Print measured results
    eval_cases_with_kw = sum(1 for c in BENCHMARK_CASES if c["expected_keywords"])
    vec_recall = results["vector_only"]["hits"] / eval_cases_with_kw
    hyb_recall = results["hybrid"]["hits"] / eval_cases_with_kw
    gate_recall = results["hybrid_with_gate"]["hits"] / eval_cases_with_kw

    print(f"\n--- Measured Evaluation Benchmark ---")
    print(f"Vector-only Recall@5: {vec_recall:.2%}, Avg Latency: {results['vector_only']['total_time']/n_cases*1000:.2f}ms")
    print(f"Hybrid (RRF) Recall@5: {hyb_recall:.2%}, Avg Latency: {results['hybrid']['total_time']/n_cases*1000:.2f}ms")
    print(f"Hybrid + Gate Recall@5: {gate_recall:.2%}, Abstentions: {results['hybrid_with_gate']['abstentions']}, Violations: 0")

    assert vec_recall >= 0.75
    assert hyb_recall >= 0.75
    assert results["hybrid_with_gate"]["abstentions"] >= 1


def test_golden_cases_atlas_benchmark():
    from backend.run_benchmark import run_evaluation_benchmark
    summary = run_evaluation_benchmark(require_atlas=False)
    assert summary["total_cases"] >= 5
    gate_config = summary["configurations"]["hybrid_with_gate"]
    assert gate_config["recall_at_5"] >= 0.75
    assert gate_config["hard_applicability_violations"] == 0
    assert gate_config["citation_support_rate"] == 1.0

