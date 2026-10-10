"""Evidence Status Gate — Deterministic evaluation of agricultural evidence applicability."""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel

from ..models.enums import EvidenceStatus, SourceStatus
from ..models.schemas import EvidenceChunkRecord, SourceRecord

logger = logging.getLogger("plantdoctor.evidence_gate")

MIN_RELEVANCE_THRESHOLD = 0.40  # Minimum vector/hybrid relevance score
MAX_FRESHNESS_DAYS = 365 * 3   # 3 years max before freshness is flagged unverified


class GateEvaluation(BaseModel):
    status: EvidenceStatus
    eligible_chunks: List[EvidenceChunkRecord]
    rejected_chunks: List[Tuple[str, str]]  # (chunk_id, rejection_reason)
    reason: str
    caveats: List[str]
    conflicts_detected: List[str] = []


class EvidenceStatusGate:
    """
    Deterministic gate that evaluates retrieved evidence against user context
    and source metadata before any answer synthesis can occur.
    """

    def evaluate(
        self,
        query: str,
        crop_id: Optional[str],
        region_id: Optional[str],
        retrieved_chunks: List[EvidenceChunkRecord],
        sources_by_id: Dict[str, SourceRecord],
    ) -> GateEvaluation:
        caveats: List[str] = []
        rejected: List[Tuple[str, str]] = []

        # 1. Check for Context Incomplete (if query is broad and crop or region is missing)
        crop_clean = crop_id.strip().lower() if crop_id else None
        region_clean = region_id.strip().lower() if region_id else None

        query_lower = query.lower()
        mentions_crop = any(
            c in query_lower
            for c in ["tomato", "potato", "pepper", "chilli", "okra", "eggplant", "rice", "wheat", "maize", "onion"]
        )

        # If user did not provide crop context and query doesn't specify one:
        if not crop_clean and not mentions_crop:
            return GateEvaluation(
                status=EvidenceStatus.CONTEXT_INCOMPLETE,
                eligible_chunks=[],
                rejected_chunks=[],
                reason="Crop context was not provided. Management of symptoms like yellowing, spots, or wilting differs fundamentally across plant species.",
                caveats=["Please select or specify the affected crop to receive reliable evidence."],
            )

        # Check for hard query-context crop mismatch (e.g. query explicitly targets rice but user selected tomato)
        known_crops = ["rice", "tomato", "potato", "pepper", "chilli", "okra", "eggplant", "wheat", "maize", "corn"]
        query_crops = [c for c in known_crops if c in query_lower]
        if crop_clean and query_crops and crop_clean not in query_crops:
            return GateEvaluation(
                status=EvidenceStatus.INSUFFICIENT_EVIDENCE,
                eligible_chunks=[],
                rejected_chunks=[(c.id, f"Hard crop mismatch: Query targets '{query_crops[0]}', active context is '{crop_clean}'") for c in retrieved_chunks],
                reason=f"Hard crop mismatch: Active context is set to '{crop_clean}', but query specifically targets '{query_crops[0]}'. Agronomic advice for {query_crops[0]} cannot be safely applied to {crop_clean}.",
                caveats=["Change active crop context to match the crop in your question."],
            )

        if not region_clean:
            caveats.append("No climate/region specified — recommendations may vary based on local humidity, soil, and disease pressures.")

        # 2. Hard Applicability Filter & Minimum Relevance
        eligible: List[EvidenceChunkRecord] = []

        for chunk in retrieved_chunks:
            source = sources_by_id.get(chunk.source_id)

            # Check for withdrawn or deprecated source / chunk
            if (source and source.status in [SourceStatus.WITHDRAWN, SourceStatus.DEPRECATED]) or \
               (chunk.status in [SourceStatus.WITHDRAWN, SourceStatus.DEPRECATED]):
                rejected.append((chunk.id, f"Source '{chunk.source_id}' is withdrawn or deprecated"))
                continue

            # Check minimum relevance
            score = chunk.relevance_score if chunk.relevance_score is not None else 0.5
            if score < MIN_RELEVANCE_THRESHOLD:
                rejected.append((chunk.id, f"Relevance score ({score:.2f}) below threshold ({MIN_RELEVANCE_THRESHOLD:.2f})"))
                continue

            # Hard Crop Mismatch:
            # If the user specified a crop, and the chunk or source is strictly tagged for a different crop:
            if crop_clean:
                chunk_crop = chunk.crop_id.lower() if chunk.crop_id else None
                source_crops = [c.lower() for c in (source.crops if source else [])]

                if chunk_crop and chunk_crop != crop_clean and chunk_crop != "general":
                    rejected.append((chunk.id, f"Hard crop mismatch: chunk is for '{chunk_crop}', user queried '{crop_clean}'"))
                    continue
                if source_crops and crop_clean not in source_crops and "general" not in source_crops:
                    rejected.append((chunk.id, f"Hard crop mismatch: source covers {source_crops}, user queried '{crop_clean}'"))
                    continue

            # Hard Region Mismatch:
            if region_clean:
                chunk_region = chunk.region_id.lower() if chunk.region_id else None
                source_regions = [r.lower() for r in (source.regions if source else [])]

                # If source or chunk is restricted to a different specific region
                if chunk_region and chunk_region != region_clean and chunk_region != "global":
                    # Check if regions are mutually exclusive (e.g. tropical vs temperate/arid, or arid vs humid/tropical)
                    if ("tropical" in chunk_region and ("temperate" in region_clean or "arid" in region_clean)) or \
                       ("arid" in chunk_region and ("humid" in region_clean or "tropical" in region_clean)):
                        rejected.append((chunk.id, f"Hard climatic mismatch: chunk applies to '{chunk_region}', not '{region_clean}'"))
                        continue

            eligible.append(chunk)

        # 3. Check for Insufficient Evidence
        if not eligible:
            reasons_summary = "; ".join(f"{cid}: {r}" for cid, r in rejected[:3]) if rejected else "No relevant passages found."
            return GateEvaluation(
                status=EvidenceStatus.INSUFFICIENT_EVIDENCE,
                eligible_chunks=[],
                rejected_chunks=rejected,
                reason="Insufficient supporting evidence found in approved agricultural corpus. " + reasons_summary,
                caveats=["Do not treat lack of evidence as proof that the plant is healthy. Consult a local extension officer."],
            )

        # 4. Check for Source Conflicts
        conflicts = self._detect_conflicts(eligible, sources_by_id)
        if conflicts:
            return GateEvaluation(
                status=EvidenceStatus.CONFLICTING_EVIDENCE,
                eligible_chunks=eligible,
                rejected_chunks=rejected,
                reason="Conflicting agricultural evidence detected between approved sources. Different authoritative guides recommend differing approaches.",
                caveats=caveats + ["Multiple applicable sources disagree — see contrasting passages below."],
                conflicts_detected=conflicts,
            )

        # 5. Check for Freshness Unverified
        has_stale_source = False
        now = datetime.now(timezone.utc)
        for chunk in eligible:
            source = sources_by_id.get(chunk.source_id)
            if not source or not source.last_verified:
                has_stale_source = True
                break
            try:
                # Parse ISO date
                verified_dt = datetime.fromisoformat(source.last_verified.replace("Z", "+00:00"))
                if (now - verified_dt).days > MAX_FRESHNESS_DAYS:
                    has_stale_source = True
                    break
            except Exception:
                has_stale_source = True
                break

        if has_stale_source:
            return GateEvaluation(
                status=EvidenceStatus.FRESHNESS_UNVERIFIED,
                eligible_chunks=eligible,
                rejected_chunks=rejected,
                reason="Supporting evidence retrieved, but source verification date exceeds freshness limits or has not been recently re-validated.",
                caveats=caveats + ["Pesticide regulations and pathogen resistance profiles change frequently. Verify with current local extension bulletin."],
            )

        # 6. If crop context was provided only in free text rather than explicit context selector:
        if not crop_clean and mentions_crop:
            return GateEvaluation(
                status=EvidenceStatus.CONTEXT_INCOMPLETE,
                eligible_chunks=eligible,
                rejected_chunks=rejected,
                reason="Crop detected in query text but not selected in context parameters. Confirmation needed for precise agronomic match.",
                caveats=caveats,
            )

        # 7. Fully Applicable
        return GateEvaluation(
            status=EvidenceStatus.APPLICABLE,
            eligible_chunks=eligible,
            rejected_chunks=rejected,
            reason="Retrieved evidence matches the specified crop and region context and is grounded in verified sources.",
            caveats=caveats,
        )

    def _detect_conflicts(
        self, chunks: List[EvidenceChunkRecord], sources_by_id: Dict[str, SourceRecord]
    ) -> List[str]:
        """
        Detects genuine semantic / agronomic contradictions between applicable chunks
        (e.g., opposing chemical vs organic restrictions, or conflicting moisture directives).
        """
        conflicts = []
        texts = [c.text.lower() for c in chunks]

        # Check for chemical vs organic opposing directives
        has_chemical_spray = any(
            "copper fungicide" in t or "chemical spray" in t or "apply chlorothalonil" in t or "synthetic chemical" in t
            for t in texts
        )
        has_organic_prohibition = any(
            "prohibits synthetic chemical" in t
            or "avoid synthetic copper" in t
            or "avoid chemical fungicides" in t
            or "prohibit synthetic copper" in t
            or "prohibits synthetic" in t
            or "organic certified" in t
            for t in texts
        )
        if has_chemical_spray and has_organic_prohibition:
            conflicts.append("Contradictory management advice: Chemical fungicide application vs. organic certification prohibition.")

        # Check for moisture contradictions
        has_increase_water = any("increase watering frequency" in t or "keep soil continuously soaked" in t for t in texts)
        has_reduce_water = any("reduce irrigation immediately" in t or "allow soil to dry between waterings" in t for t in texts)
        if has_increase_water and has_reduce_water:
            conflicts.append("Contradictory moisture advice: One source advises increasing irrigation while another advises immediate reduction.")

        return conflicts


evidence_gate = EvidenceStatusGate()
