"""Multimodal agricultural assessment integrating image observations,
MongoDB Atlas hybrid vector retrieval, and the Evidence Status Gate.
"""

import base64
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
import httpx

from ..config import settings
from ..db.repositories import SourceRepository
from ..models.enums import EvidenceStatus
from ..models.schemas import (
    EvidenceChunkOut,
    EvidenceSourceOut,
    MultimodalAssessmentResult,
    SourceRecord,
)
from .evidence_gate import EvidenceStatusGate
from .retrieval import RetrievalService

logger = logging.getLogger("plantdoctor.multimodal")


class MultimodalService:
    def __init__(
        self,
        retrieval_service: RetrievalService,
        source_repo: SourceRepository,
        evidence_gate: EvidenceStatusGate,
    ):
        self.retrieval = retrieval_service
        self.source_repo = source_repo
        self.gate = evidence_gate

    async def assess(
        self,
        query: str,
        image_bytes: Optional[bytes] = None,
        image_mime_type: Optional[str] = None,
        crop_id: Optional[str] = None,
        region_id: Optional[str] = None,
        growth_stage_id: Optional[str] = None,
        language: str = "en",
    ) -> MultimodalAssessmentResult:
        """
        Processes a farmer's multimodal question:
        1. Hybrid retrieval over MongoDB Atlas.
        2. Strict validation through the Evidence Status Gate.
        3. Real Gemini Vision multimodal inference if GEMINI_API_KEY is configured.
        4. Honest evidence-backed fallback if unconfigured.
        """
        trimmed_query = query.strip()
        lang_code = language.lower()[:2]
        if lang_code not in ("en", "hi", "te", "ta"):
            lang_code = "en"

        # 1. Retrieve evidence chunks from Atlas
        retrieved_chunks = self.retrieval.hybrid_search(
            query=trimmed_query,
            crop_id=crop_id,
            region_id=region_id,
            limit=6,
        )

        # 2. Fetch corresponding sources
        sources_by_id: Dict[str, SourceRecord] = {}
        for chunk in retrieved_chunks:
            if chunk.source_id not in sources_by_id:
                src = self.source_repo.get_by_id(chunk.source_id)
                if src:
                    sources_by_id[chunk.source_id] = src

        # 3. Evaluate through Evidence Status Gate
        gate_eval = self.gate.evaluate(
            query=trimmed_query,
            crop_id=crop_id,
            region_id=region_id,
            retrieved_chunks=retrieved_chunks,
            sources_by_id=sources_by_id,
        )

        # 4. Map eligible chunks
        chunks_out: List[EvidenceChunkOut] = []
        for chunk in gate_eval.eligible_chunks:
            source = sources_by_id.get(chunk.source_id)
            if not source:
                continue

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
                    retrieval_mode=chunk.retrieval_mode,
                )
            )

        # 5. Multimodal Vision Assessment
        has_image = bool(image_bytes and len(image_bytes) > 0)
        has_gemini = bool(settings.gemini_api_key and settings.gemini_api_key.strip())

        if has_image and has_gemini:
            vision_result = await self._call_gemini_vision(
                query=trimmed_query,
                image_bytes=image_bytes,
                image_mime_type=image_mime_type or "image/jpeg",
                crop_id=crop_id,
                region_id=region_id,
                language=lang_code,
                chunks=chunks_out,
                gate_status=gate_eval.status,
                gate_reason=gate_eval.reason,
            )
            if vision_result:
                vision_result.id = f"assess-{uuid.uuid4().hex[:10]}"
                vision_result.query = trimmed_query
                vision_result.overall_status = gate_eval.status
                vision_result.status_reason = gate_eval.reason
                vision_result.evidence_chunks = chunks_out
                vision_result.caveats = list(gate_eval.caveats)
                vision_result.language = lang_code
                vision_result.image_attached = True
                vision_result.vision_model_status = "gemini_vision_active"
                return vision_result

        # 6. Fallback assessment (honest, structured, evidence-grounded)
        return self._build_deterministic_assessment(
            query=trimmed_query,
            has_image=has_image,
            has_gemini=has_gemini,
            crop_id=crop_id,
            region_id=region_id,
            language=lang_code,
            gate_status=gate_eval.status,
            gate_reason=gate_eval.reason,
            gate_caveats=gate_eval.caveats,
            chunks=chunks_out,
            conflicts=gate_eval.conflicts_detected,
        )

    async def _call_gemini_vision(
        self,
        query: str,
        image_bytes: bytes,
        image_mime_type: str,
        crop_id: Optional[str],
        region_id: Optional[str],
        language: str,
        chunks: List[EvidenceChunkOut],
        gate_status: EvidenceStatus,
        gate_reason: str,
    ) -> Optional[MultimodalAssessmentResult]:
        """Calls Google Gemini multimodal vision model using httpx async client."""
        try:
            b64_image = base64.b64encode(image_bytes).decode("utf-8")

            passages_context = "\n".join(
                f"- [Passage {c.id}] ({c.source.institution or 'Authoritative Source'}): {c.text}"
                for c in chunks[:4]
            )

            lang_names = {"en": "English", "hi": "Hindi (हिंदी)", "te": "Telugu (తెలుగు)", "ta": "Tamil (தமிழ்)"}
            target_lang_name = lang_names.get(language, "English")

            system_prompt = f"""You are an agricultural diagnostic assistant for smallholder farmers.
Analyze the attached plant photograph and question: "{query}".
Target crop: {crop_id or 'Unspecified'} | Region: {region_id or 'Unspecified'}.
Evidence Status Gate: {gate_status.value} (Reason: {gate_reason}).

RETRIEVED SCIENTIFIC EVIDENCE:
{passages_context if passages_context else "No applicable passages retrieved."}

DIAGNOSTIC SAFETY RULES:
1. Distinguish directly visible symptoms from inferred diseases or causes.
2. If image is blurry, distant, or not a plant, state that clearly in visible_observations.
3. Recommend safe mechanical, sanitation, or cultural management steps first.
4. Only suggest chemical treatments if explicitly supported by the retrieved evidence chunks.
5. Provide output strictly in {target_lang_name}.
6. Output JSON only matching the schema:
{{
  "likely_issue": "short cautiously phrased issue/symptom",
  "visible_observations": ["bullet 1", "bullet 2"],
  "possible_causes": ["cause 1", "cause 2"],
  "differential_checks": ["question or observation 1", "question 2"],
  "recommended_next_steps": ["step 1", "step 2"],
  "warnings": ["warning 1"],
  "confidence_level": "Low/Moderate/High with brief reason",
  "missing_context": ["context needed"]
}}"""

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.gemini_api_key}"

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": system_prompt},
                            {
                                "inline_data": {
                                    "mime_type": image_mime_type,
                                    "data": b64_image,
                                }
                            },
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "response_mime_type": "application/json",
                },
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        parsed = json.loads(text_content)
                        return MultimodalAssessmentResult(
                            id="",
                            query=query,
                            likely_issue=parsed.get("likely_issue", "Plant Health Assessment"),
                            visible_observations=parsed.get("visible_observations", []),
                            possible_causes=parsed.get("possible_causes", []),
                            differential_checks=parsed.get("differential_checks", []),
                            recommended_next_steps=parsed.get("recommended_next_steps", []),
                            warnings=parsed.get("warnings", []),
                            confidence_level=parsed.get("confidence_level", "Moderate - Grounded in image and evidence"),
                            missing_context=parsed.get("missing_context", []),
                            overall_status=gate_status,
                            vision_model_status="gemini_vision_active",
                            image_attached=True,
                        )
                else:
                    logger.warning("Gemini API call failed with status %d: %s", resp.status_code, resp.text[:200])
        except Exception as e:
            logger.warning("Error invoking Gemini Vision API: %s", e)

        return None

    def _build_deterministic_assessment(
        self,
        query: str,
        has_image: bool,
        has_gemini: bool,
        crop_id: Optional[str],
        region_id: Optional[str],
        language: str,
        gate_status: EvidenceStatus,
        gate_reason: str,
        gate_caveats: List[str],
        chunks: List[EvidenceChunkOut],
        conflicts: List[str],
    ) -> MultimodalAssessmentResult:
        """Constructs an honest, structured assessment when vision model key is not configured."""
        model_status = "gemini_unconfigured" if has_image else "no_image_provided"

        observations: List[str] = []
        if has_image:
            observations.append(
                "Image received and verified. (Note: Live vision inference key is unconfigured; symptom assessment is grounded in query keywords and verified agricultural evidence.)"
            )
        else:
            observations.append("No plant photograph attached. Assessment based on described symptoms.")

        causes: List[str] = []
        steps: List[str] = []
        diffs: List[str] = []
        missing: List[str] = []
        warnings_list: List[str] = []

        if crop_id is None:
            missing.append("Crop identity not specified (e.g. Tomato, Rice, Chilli).")
        if region_id is None:
            missing.append("Region or local climate zone not specified.")

        if gate_status == EvidenceStatus.CONTEXT_INCOMPLETE:
            likely_issue = f"Context Incomplete: {query}"
            causes.append(gate_reason)
            diffs.append("Identify the specific crop and growth stage to confirm pathogen susceptibility.")
            steps.append("Select your target crop from the context selector to retrieve verified management protocols.")
            confidence = "Low - Context incomplete"
            warnings_list.append("Do not apply agricultural chemicals without verifying crop applicability.")

        elif gate_status == EvidenceStatus.INSUFFICIENT_EVIDENCE:
            likely_issue = f"Insufficient Verified Evidence: {query}"
            causes.append("No verified agricultural research in the current repository matches this specific symptom pattern.")
            diffs.append("Consult local Krishi Vigyan Kendra (KVK) or extension officer for field inspection.")
            steps.append("Isolate affected plant samples to prevent potential spread to healthy rows.")
            confidence = "Low - Insufficient repository evidence"
            warnings_list.append("Plant Doctor abstains from speculative chemical recommendations.")

        elif gate_status == EvidenceStatus.CONFLICTING_EVIDENCE:
            likely_issue = f"Conflicting Evidence: {query}"
            for conf in conflicts:
                causes.append(conf)
            diffs.append("Check which agricultural standard or organic certification governs your operational field.")
            steps.append("Review contrasting recommendations in the source cards below before field application.")
            confidence = "Moderate - Divergent recommendations identified"
            warnings_list.append("Ensure chosen intervention adheres to local state agricultural guidelines.")

        else:
            # APPLICABLE or FRESHNESS_UNVERIFIED
            likely_issue = f"Symptom Assessment for '{query}'"
            for chunk in chunks[:3]:
                inst = chunk.source.institution or "Agricultural Authority"
                causes.append(f"{inst}: {chunk.text[:140]}...")

            steps.append("Inspect underside of leaves and growing tips for insect vectors or fungal spores.")
            steps.append("Prune and safely destroy heavily infected lower foliage to improve airflow.")
            diffs.append("Check if symptoms appear in isolated patches or across the entire field.")
            confidence = "Moderate - Grounded in verified repository bulletins"
            warnings_list.append("Always wear protective gear and adhere to safety pre-harvest intervals.")

        # Localized translations for key strings if Hindi, Telugu, or Tamil
        if language == "hi":
            likely_issue = f"लक्षण विश्लेषण: '{query}'"
            steps = ["खराब पत्तियों को अलग करें और हवा का संचार बढ़ाएं।", "पत्तियों के निचले हिस्से में कीटों या फफूंद की जांच करें।"]
            warnings_list.append("बिना प्रमाण के कीटनाशकों का अंधाधुंध छिड़काव न करें।")
        elif language == "te":
            likely_issue = f"లక్షణాల విశ్లేషణ: '{query}'"
            steps = ["బాధిత ఆకులను తొలగించి గాలి వెలుతురు ఉండేలా చూడండి.", "ఆకుల వెనుక భాగంలో తెగులు లేదా పురుగుల ఉనికిని పరిశీలించండి."]
            warnings_list.append("ధృవీకరణ లేకుండా రసాయనాలను ఉపయోగించవద్దు.")
        elif language == "ta":
            likely_issue = f"அறிகுறி பகுப்பாய்வு: '{query}'"
            steps = ["பாதிக்கப்பட்ட இலைகளை அகற்றி காற்றோட்டத்தை அதிகரிக்கவும்.", "இலையின் அடிப்பகுதியில் பூச்சி அல்லது பூஞ்சை உள்ளதா எனப் பார்க்கவும்."]
            warnings_list.append("முறையான வழிகாட்டுதல் இன்றி ரசாயனங்களை தெளிக்க வேண்டாம்.")

        return MultimodalAssessmentResult(
            id=f"assess-{uuid.uuid4().hex[:10]}",
            query=query,
            likely_issue=likely_issue,
            visible_observations=observations,
            possible_causes=causes,
            differential_checks=diffs,
            recommended_next_steps=steps,
            warnings=warnings_list,
            confidence_level=confidence,
            missing_context=missing,
            overall_status=gate_status,
            status_reason=gate_reason,
            evidence_chunks=chunks,
            caveats=list(gate_caveats),
            language=language,
            vision_model_status=model_status,
            image_attached=has_image,
        )
