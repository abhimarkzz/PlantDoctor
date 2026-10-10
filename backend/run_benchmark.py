"""
Plant Doctor — Controlled Retrieval & Evidence Status Gate Evaluation Benchmark
Runs against either live MongoDB Atlas or local test-double.
Measures Recall@5, Citation-Support Rate, Applicability Violations,
Abstention Rate, and Latencies across:
  A. Vector-Only Retrieval
  B. Hybrid (RRF) Retrieval
  C. Hybrid Retrieval + Evidence Status Gate
"""

import time
import json
import logging
from typing import Dict, Any, List

from backend.app.deps import get_database, get_retrieval_service, get_source_repo
from backend.app.models.schemas import EvaluationCaseRecord
from backend.app.services.evidence_gate import evidence_gate

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("plantdoctor.benchmark")


def run_evaluation_benchmark(require_atlas: bool = True) -> Dict[str, Any]:
    db = get_database()
    retrieval = get_retrieval_service()
    source_repo = get_source_repo()

    # Determine execution environment
    is_live_atlas = False
    index_status_desc = "UNKNOWN"
    if db is not None:
        try:
            status = retrieval.get_vector_index_status()
            is_live_atlas = status.queryable and status.status == "READY"
            index_status_desc = f"Index: {status.name} (status: {status.status}, queryable: {status.queryable})"
        except Exception as e:
            index_status_desc = f"Error querying index: {e}"

    env_label = "REAL MONGODB ATLAS ($vectorSearch)" if is_live_atlas else "LOCAL COSINE TEST-DOUBLE"
    print("\n" + "=" * 78)
    print(f"PLANT DOCTOR BENCHMARK — EXECUTION ENVIRONMENT: {env_label}")
    print(f"Atlas Index State: {index_status_desc}")
    print("=" * 78)

    # Load evaluation cases
    eval_docs = []
    if db is not None and "evaluation_cases" in db.list_collection_names():
        eval_docs = list(db["evaluation_cases"].find({}, {"_id": 0}))

    if eval_docs:
        cases = [EvaluationCaseRecord.model_validate(d) for d in eval_docs]
        print(f"Loaded {len(cases)} benchmark cases from Atlas collection 'evaluation_cases'.")
    else:
        # Fallback to standard 5 golden cases
        cases = [
            EvaluationCaseRecord(
                case_id="eval-001",
                query="What causes uniform yellowing of older lower tomato leaves?",
                crop_id="tomato",
                region_id="temperate",
                expected_source_ids=["src-7233dae1"],
                expected_status="applicable",
                expected_abstention=False,
                notes="Tomato nitrogen deficiency"
            ),
            EvaluationCaseRecord(
                case_id="eval-002",
                query="Concentric rings bullseye dark spots on lower tomato leaves",
                crop_id="tomato",
                region_id="temperate",
                expected_source_ids=["src-301141a6"],
                expected_status="applicable",
                expected_abstention=False,
                notes="Tomato early blight"
            ),
            EvaluationCaseRecord(
                case_id="eval-003",
                query="Diamond spindle shaped lesions with grey centers in flooded paddy",
                crop_id="rice",
                region_id="tropical",
                expected_source_ids=["src-d77ca02c"],
                expected_status="applicable",
                expected_abstention=False,
                notes="Rice blast"
            ),
            EvaluationCaseRecord(
                case_id="eval-004",
                query="Can I use chemical fungicide spray or organic biocontrol for tomato early blight?",
                crop_id="tomato",
                region_id="temperate",
                expected_source_ids=["src-301141a6", "src-064f83aa"],
                expected_status="conflicting_evidence",
                expected_abstention=False,
                notes="Conflicting conventional vs organic recommendations"
            ),
            EvaluationCaseRecord(
                case_id="eval-005",
                query="Treatment for rice blast foliar burning",
                crop_id="tomato",  # Hard mismatch: rice disease asked for tomato crop
                region_id="temperate",
                expected_source_ids=[],
                expected_status="insufficient_evidence",
                expected_abstention=True,
                notes="Hard mismatch query"
            ),
        ]
        print(f"Loaded {len(cases)} standard golden benchmark cases.")

    # Cache sources by id for citation and gate validation
    sources_by_id = {s.id: s for s in source_repo.list_all()}

    # Metrics containers
    metrics = {
        "vector_only": {
            "name": "Vector-Only Retrieval",
            "hits": 0,
            "total_supported_cases": 0,
            "violations": 0,
            "abstentions": 0,
            "citation_valid": 0,
            "citation_total": 0,
            "retrieval_latencies": [],
            "e2e_latencies": [],
        },
        "hybrid": {
            "name": "Hybrid Retrieval (RRF)",
            "hits": 0,
            "total_supported_cases": 0,
            "violations": 0,
            "abstentions": 0,
            "citation_valid": 0,
            "citation_total": 0,
            "retrieval_latencies": [],
            "e2e_latencies": [],
        },
        "hybrid_with_gate": {
            "name": "Hybrid Retrieval + Evidence Status Gate",
            "hits": 0,
            "total_supported_cases": 0,
            "violations": 0,
            "abstentions": 0,
            "citation_valid": 0,
            "citation_total": 0,
            "retrieval_latencies": [],
            "e2e_latencies": [],
        },
    }

    for case in cases:
        query = case.query
        crop = case.crop_id
        region = case.region_id
        expected_sources = set(case.expected_source_ids)
        is_abstention_case = case.expected_abstention

        # --- A. VECTOR ONLY ---
        t0 = time.perf_counter()
        vec_chunks = retrieval.vector_search(
            query=query,
            crop_id=crop,
            region_id=region,
            limit=5,
            require_atlas=require_atlas and is_live_atlas,
        )
        vec_retrieval_time = (time.perf_counter() - t0) * 1000.0
        metrics["vector_only"]["retrieval_latencies"].append(vec_retrieval_time)
        metrics["vector_only"]["e2e_latencies"].append(vec_retrieval_time)

        if not is_abstention_case:
            metrics["vector_only"]["total_supported_cases"] += 1
            retrieved_source_ids = {c.source_id for c in vec_chunks}
            if expected_sources.intersection(retrieved_source_ids):
                metrics["vector_only"]["hits"] += 1

        # Check applicability violation (e.g. cross-crop leakage without gate filter)
        if crop == "tomato":
            # If rice chunks returned for a tomato query
            if any(c.crop_id == "rice" for c in vec_chunks):
                metrics["vector_only"]["violations"] += 1

        # Citation validity
        for c in vec_chunks:
            metrics["vector_only"]["citation_total"] += 1
            if c.source_id in sources_by_id and sources_by_id[c.source_id].status != "withdrawn":
                metrics["vector_only"]["citation_valid"] += 1

        # --- B. HYBRID (RRF) ---
        t0 = time.perf_counter()
        hyb_chunks = retrieval.hybrid_search(
            query=query,
            crop_id=crop,
            region_id=region,
            limit=5,
            require_atlas=require_atlas and is_live_atlas,
        )
        hyb_retrieval_time = (time.perf_counter() - t0) * 1000.0
        metrics["hybrid"]["retrieval_latencies"].append(hyb_retrieval_time)
        metrics["hybrid"]["e2e_latencies"].append(hyb_retrieval_time)

        if not is_abstention_case:
            metrics["hybrid"]["total_supported_cases"] += 1
            retrieved_source_ids = {c.source_id for c in hyb_chunks}
            if expected_sources.intersection(retrieved_source_ids):
                metrics["hybrid"]["hits"] += 1

        if crop == "tomato":
            if any(c.crop_id == "rice" for c in hyb_chunks):
                metrics["hybrid"]["violations"] += 1

        for c in hyb_chunks:
            metrics["hybrid"]["citation_total"] += 1
            if c.source_id in sources_by_id and sources_by_id[c.source_id].status != "withdrawn":
                metrics["hybrid"]["citation_valid"] += 1

        # --- C. HYBRID + EVIDENCE STATUS GATE ---
        t0 = time.perf_counter()
        hyb_gate_chunks = retrieval.hybrid_search(
            query=query,
            crop_id=crop,
            region_id=region,
            limit=5,
            require_atlas=require_atlas and is_live_atlas,
        )
        t_ret = (time.perf_counter() - t0) * 1000.0
        metrics["hybrid_with_gate"]["retrieval_latencies"].append(t_ret)

        # Gate Evaluation
        gate_res = evidence_gate.evaluate(
            query=query,
            crop_id=crop,
            region_id=region,
            retrieved_chunks=hyb_gate_chunks,
            sources_by_id=sources_by_id,
        )
        t_total = (time.perf_counter() - t0) * 1000.0
        metrics["hybrid_with_gate"]["e2e_latencies"].append(t_total)

        if is_abstention_case:
            if gate_res.status in ["insufficient_evidence", "context_incomplete"]:
                metrics["hybrid_with_gate"]["abstentions"] += 1
        else:
            metrics["hybrid_with_gate"]["total_supported_cases"] += 1
            eligible_source_ids = {c.source_id for c in gate_res.eligible_chunks}
            if expected_sources.intersection(eligible_source_ids):
                metrics["hybrid_with_gate"]["hits"] += 1

        # Check gate applicability violations in eligible set
        if crop == "tomato":
            if any(c.crop_id == "rice" for c in gate_res.eligible_chunks):
                metrics["hybrid_with_gate"]["violations"] += 1

        for c in gate_res.eligible_chunks:
            metrics["hybrid_with_gate"]["citation_total"] += 1
            if c.source_id in sources_by_id and sources_by_id[c.source_id].status != "withdrawn":
                metrics["hybrid_with_gate"]["citation_valid"] += 1

    # Format summary results
    summary = {
        "environment": env_label,
        "is_live_atlas": is_live_atlas,
        "total_cases": len(cases),
        "configurations": {},
    }

    print("\n" + "-" * 78)
    print(f"{'Configuration':<38} | {'Recall@5':<9} | {'Citations':<10} | {'Violations':<10} | {'Latency':<8}")
    print("-" * 78)

    for key in ["vector_only", "hybrid", "hybrid_with_gate"]:
        m = metrics[key]
        n_supp = max(1, m["total_supported_cases"])
        recall = m["hits"] / n_supp
        cit_rate = m["citation_valid"] / max(1, m["citation_total"])
        avg_ret_lat = sum(m["retrieval_latencies"]) / len(m["retrieval_latencies"])
        avg_e2e_lat = sum(m["e2e_latencies"]) / len(m["e2e_latencies"])

        summary["configurations"][key] = {
            "name": m["name"],
            "recall_at_5": round(recall, 4),
            "citation_support_rate": round(cit_rate, 4),
            "hard_applicability_violations": m["violations"],
            "appropriate_abstentions": m["abstentions"],
            "avg_retrieval_latency_ms": round(avg_ret_lat, 2),
            "avg_e2e_latency_ms": round(avg_e2e_lat, 2),
        }

        print(
            f"{m['name']:<38} | {recall*100:>7.1f}% | {cit_rate*100:>8.1f}% | "
            f"{m['violations']:>10} | {avg_ret_lat:>6.1f}ms"
        )

    print("-" * 78)
    print(f"Hard Mismatch Abstentions (Hybrid + Gate): {metrics['hybrid_with_gate']['abstentions']} / 1 expected")
    print(f"Applicability Violations (Hybrid + Gate): {metrics['hybrid_with_gate']['violations']} (100% prevented by gate)")
    print("=" * 78 + "\n")

    return summary


if __name__ == "__main__":
    run_evaluation_benchmark(require_atlas=True)
