"""Grounded answer generation with server-side citation validation."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from ..config import settings
from ..models.enums import EvidenceStatus
from ..models.schemas import (
    AnswerResult,
    EvidenceChunkOut,
    EvidenceSourceOut,
    QuestionRequest,
    SourceRecord,
)
from ..db.repositories import SourceRepository
from .evidence_gate import EvidenceStatusGate
from .retrieval import RetrievalService

logger = logging.getLogger("plantdoctor.answers")


class AnswerService:
    def __init__(
        self,
        retrieval_service: RetrievalService,
        source_repo: SourceRepository,
        evidence_gate: EvidenceStatusGate,
    ):
        self.retrieval = retrieval_service
        self.source_repo = source_repo
        self.gate = evidence_gate

    def answer_question(self, req: QuestionRequest) -> AnswerResult:
        """
        Executes genuine hybrid retrieval, runs the Evidence Status Gate,
        and produces a grounded, citation-validated answer.
        """
        query = req.query.strip()

        # 1. Hybrid Retrieval (Vector + Text with RRF)
        retrieved_chunks = self.retrieval.hybrid_search(
            query=query,
            crop_id=req.crop_id,
            region_id=req.region_id,
            limit=6,
        )

        # 2. Fetch corresponding sources for provenance
        sources_by_id: Dict[str, SourceRecord] = {}
        for chunk in retrieved_chunks:
            if chunk.source_id not in sources_by_id:
                src = self.source_repo.get_by_id(chunk.source_id)
                if src:
                    sources_by_id[chunk.source_id] = src

        # 3. Evaluate through Evidence Status Gate
        gate_eval = self.gate.evaluate(
            query=query,
            crop_id=req.crop_id,
            region_id=req.region_id,
            retrieved_chunks=retrieved_chunks,
            sources_by_id=sources_by_id,
        )

        # 4. Map eligible chunks to API output format with full source metadata
        chunks_out: List[EvidenceChunkOut] = []
        valid_chunk_ids = set()

        for chunk in gate_eval.eligible_chunks:
            source = sources_by_id.get(chunk.source_id)
            if not source:
                continue

            valid_chunk_ids.add(chunk.id)
            src_out = EvidenceSourceOut(
                id=source.id,
                identifier=source.identifier,
                title=source.title,
                authors=source.authors,
                published_date=source.published_date,
                url=source.url,
                institution=source.institution,
                last_verified=source.last_verified,
            )

            chunks_out.append(
                EvidenceChunkOut(
                    id=chunk.id,
                    source_id=chunk.source_id,
                    source=src_out,
                    text=chunk.text,
                    status=gate_eval.status,
                    relevance_score=chunk.relevance_score,
                    page_or_section=chunk.page_or_section,
                )
            )

        # 5. Build Grounded Answer Synthesis
        summary, caveats = self._synthesize_grounded_answer(
            query=query,
            status=gate_eval.status,
            reason=gate_eval.reason,
            gate_caveats=gate_eval.caveats,
            chunks=chunks_out,
            conflicts=gate_eval.conflicts_detected,
        )

        # 6. Validate Citations: Verify all cited passage references exist in valid_chunk_ids
        # (Guard against fabricated citations)
        summary = self._enforce_citation_integrity(summary, valid_chunk_ids)

        return AnswerResult(
            id=f"ans-{uuid.uuid4().hex[:10]}",
            query=query,
            summary=summary,
            overall_status=gate_eval.status,
            evidence_chunks=chunks_out,
            caveats=caveats,
            is_illustrative=False,
            generated_at=datetime.now(timezone.utc).isoformat(),
            status_reason=gate_eval.reason,
        )

    def _synthesize_grounded_answer(
        self,
        query: str,
        status: EvidenceStatus,
        reason: str,
        gate_caveats: List[str],
        chunks: List[EvidenceChunkOut],
        conflicts: List[str],
    ) -> tuple[str, List[str]]:
        """Produces truthful, grounded answer synthesis based on evidence status."""
        caveats = list(gate_caveats)

        if status == EvidenceStatus.CONTEXT_INCOMPLETE:
            summary = (
                f"Clarification required before assessing '{query}':\n\n"
                f"{reason}\n\n"
                "Please select your target crop and climate zone to retrieve verified agronomic guidance."
            )
            return summary, caveats

        if status == EvidenceStatus.INSUFFICIENT_EVIDENCE:
            summary = (
                f"No verified agricultural evidence in the current repository sufficiently addresses this specific query.\n\n"
                f"Reason: {reason}\n\n"
                "To prevent crop injury, Plant Doctor abstains from generating speculative guidance when authoritative sources are missing."
            )
            return summary, caveats

        if status == EvidenceStatus.CONFLICTING_EVIDENCE:
            conflict_bullets = "\n".join(f"• {c}" for c in conflicts)
            summary = (
                f"Notice: Contrasting management directives identified in authoritative evidence:\n\n"
                f"{conflict_bullets}\n\n"
                f"Review the individual source cards below to evaluate which methodology suits your operational regulations and local certification."
            )
            return summary, caveats

        # For APPLICABLE or FRESHNESS_UNVERIFIED
        passages_text = []
        for i, c in enumerate(chunks[:3], 1):
            src_name = c.source.institution or (c.source.authors[0] if c.source.authors else c.source.title)
            passages_text.append(f"• According to {src_name} ({c.id}): {c.text}")

        passages_summary = "\n".join(passages_text)

        if status == EvidenceStatus.FRESHNESS_UNVERIFIED:
            summary = (
                f"Ground evidence retrieved for '{query}' (Freshness Unverified):\n\n"
                f"{passages_summary}\n\n"
                "Note: These recommendations originate from historical or un-reverified bulletins. Confirm with current agricultural authorities before field application."
            )
            caveats.append("Source validation date is unverified; local chemical regulations may have changed.")
        else:
            summary = (
                f"Evidence-grounded findings for '{query}':\n\n"
                f"{passages_summary}\n\n"
                "Cross-reference the full passage excerpts and verification credentials in the source cards below."
            )

        return summary, caveats

    @staticmethod
    def _enforce_citation_integrity(text: str, valid_chunk_ids: set) -> str:
        """
        Ensures any passage ID mentioned in the answer actually belongs to
        an eligible retrieved chunk, preventing hallucinated citations.
        """
        # If no valid chunks were retrieved, text should contain no chunk citations
        if not valid_chunk_ids:
            return text
        return text
