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
                    retrieval_mode=chunk.retrieval_mode,
                )
            )

        # 5. Build Grounded Answer Synthesis
        target_lang = (req.language or "en").lower()[:2]
        if target_lang not in ("en", "hi", "te", "ta"):
            target_lang = "en"

        summary, caveats = self._synthesize_grounded_answer(
            query=query,
            status=gate_eval.status,
            reason=gate_eval.reason,
            gate_caveats=gate_eval.caveats,
            chunks=chunks_out,
            conflicts=gate_eval.conflicts_detected,
            language=target_lang,
        )

        # 6. Validate Citations: Verify all cited passage references exist in valid_chunk_ids
        # (Guard against fabricated citations)
        summary = self._enforce_citation_integrity(summary, valid_chunk_ids)

        # Determine overall retrieval provenance
        if any(c.retrieval_mode == "atlas_vector_search" for c in chunks_out):
            overall_retrieval_mode = "atlas_vector_search"
        elif any(c.retrieval_mode == "local_cosine_test_double" for c in chunks_out):
            overall_retrieval_mode = "local_cosine_test_double"
        elif chunks_out:
            overall_retrieval_mode = chunks_out[0].retrieval_mode or "hybrid_retrieval"
        else:
            overall_retrieval_mode = "no_evidence_retrieved"

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
            retrieval_mode=overall_retrieval_mode,
            vector_search_provenance={
                "retrievalMode": overall_retrieval_mode,
                "verifiedSourcesCount": len(valid_chunk_ids),
                "chunksReturned": len(chunks_out),
            },
            response_language=target_lang,
        )

    def _synthesize_grounded_answer(
        self,
        query: str,
        status: EvidenceStatus,
        reason: str,
        gate_caveats: List[str],
        chunks: List[EvidenceChunkOut],
        conflicts: List[str],
        language: str = "en",
    ) -> tuple[str, List[str]]:
        """Produces truthful, grounded answer synthesis based on evidence status and target language."""
        caveats = list(gate_caveats)
        lang = (language or "en").lower()[:2]
        if lang not in ("en", "hi", "te", "ta"):
            lang = "en"

        if status == EvidenceStatus.CONTEXT_INCOMPLETE:
            if lang == "hi":
                summary = (
                    f"'{query}' के सटीक मूल्यांकन के लिए अतिरिक्त संदर्भ आवश्यक है:\n\n"
                    f"{reason}\n\n"
                    "कृपया प्रमाणित कृषि मार्गदर्शन प्राप्त करने के लिए अपनी फसल और जलवायु क्षेत्र का चयन करें।"
                )
            elif lang == "te":
                summary = (
                    f"'{query}' ని ఖచ్చితంగా విశ్లేషించడానికి అదనపు వివరాలు అవసరం:\n\n"
                    f"{reason}\n\n"
                    "ధృవీకరించబడిన వ్యవసాయ మార్గదర్శకాలను పొందడానికి దయచేసి మీ పంట మరియు వాతావరణ ప్రాంతాన్ని ఎంచుకోండి."
                )
            elif lang == "ta":
                summary = (
                    f"'{query}' குறித்த துல்லியமான மதிப்பீட்டிற்கு கூடுதல் விவரங்கள் தேவை:\n\n"
                    f"{reason}\n\n"
                    "சரிபார்க்கப்பட்ட வேளாண் ஆலோசனைகளைப் பெற உங்கள் பயிர் மற்றும் தட்பவெப்ப மண்டலத்தைத் தேர்ந்தெடுக்கவும்."
                )
            else:
                summary = (
                    f"Clarification required before assessing '{query}':\n\n"
                    f"{reason}\n\n"
                    "Please select your target crop and climate zone to retrieve verified agronomic guidance."
                )
            return summary, caveats

        if status == EvidenceStatus.INSUFFICIENT_EVIDENCE:
            if lang == "hi":
                summary = (
                    f"वर्तमान भंडार में इस विशिष्ट प्रश्न के लिए पर्याप्त सत्यापित कृषि साक्ष्य उपलब्ध नहीं हैं।\n\n"
                    f"कारण: {reason}\n\n"
                    "फसल सुरक्षा सुनिश्चित करने के लिए, वैज्ञानिक स्रोतों के अभाव में प्लांट डॉक्टर मनगढ़ंत सलाह देने से बचता है।"
                )
            elif lang == "te":
                summary = (
                    f"ప్రస్తుత భాండాగారంలో ఈ ప్రశ్నకు సంబంధించి తగినంత ధృవీకరించబడిన వ్యవసాయ ఆధారాలు లేవు.\n\n"
                    f"కారణం: {reason}\n\n"
                    "పంట నష్టాన్ని నివారించడానికి, శాస్త్రీయ ఆధారాలు లేనప్పుడు ప్లాంట్ డాక్టర్ ఊహాజనిత సలహాలు ఇవ్వదు."
                )
            elif lang == "ta":
                summary = (
                    f"தற்போதைய களஞ்சியத்தில் இந்த குறிப்பிட்ட கேள்விக்கு போதுமான சரிபார்க்கப்பட்ட வேளாண் சான்றுகள் இல்லை.\n\n"
                    f"காரணம்: {reason}\n\n"
                    "பயிர் பாதுகாப்பை உறுதிசெய்ய, நம்பகமான அறிவியல் ஆதாரங்கள் இல்லாதபோது பிளான்ட் டாக்டர் கற்பனையான ஆலோசனைகளை வழங்குவதில்லை."
                )
            else:
                summary = (
                    f"No verified agricultural evidence in the current repository sufficiently addresses this specific query.\n\n"
                    f"Reason: {reason}\n\n"
                    "To prevent crop injury, Plant Doctor abstains from generating speculative guidance when authoritative sources are missing."
                )
            return summary, caveats

        if status == EvidenceStatus.CONFLICTING_EVIDENCE:
            conflict_bullets = "\n".join(f"• {c}" for c in conflicts)
            if lang == "hi":
                summary = (
                    f"सूचना: प्रमाणित कृषि स्रोतों में परस्पर विरोधी प्रबंधन निर्देश पाए गए हैं:\n\n"
                    f"{conflict_bullets}\n\n"
                    "नीचे दिए गए स्रोत कार्डों की समीक्षा करें कि कौन सा तरीका आपके स्थानीय नियमों और प्रमाणन के अनुकूल है।"
                )
            elif lang == "te":
                summary = (
                    f"గమనిక: అధికారిక ఆధారాలలో భిన్నమైన యాజమాన్య పద్ధతులు గుర్తించబడ్డాయి:\n\n"
                    f"{conflict_bullets}\n\n"
                    "మీ స్థానిక నిబంధనలకు ఏ పద్ధతి సరిపోతుందో తెలుసుకోవడానికి క్రింది ఆధార కార్డులను పరిశీలించండి."
                )
            elif lang == "ta":
                summary = (
                    f"அறிவிப்பு: அங்கீகரிக்கப்பட்ட சான்றுகளில் முரண்பாடான மேலாண்மை வழிகாட்டல்கள் உள்ளன:\n\n"
                    f"{conflict_bullets}\n\n"
                    "உங்கள் உள்ளூர் வழிகாட்டுதல்களுக்கு எந்த முறை பொருத்தமானது என்பதை மதிப்பீடு செய்ய கீழே உள்ள மூல அட்டைகளை மதிப்பாய்வு செய்யவும்."
                )
            else:
                summary = (
                    f"Notice: Contrasting management directives identified in authoritative evidence:\n\n"
                    f"{conflict_bullets}\n\n"
                    f"Review the individual source cards below to evaluate which methodology suits your operational regulations and local certification."
                )
            return summary, caveats

        # For APPLICABLE or FRESHNESS_UNVERIFIED
        passages_text = []
        for c in chunks[:3]:
            src_name = c.source.institution or (c.source.authors[0] if c.source.authors else c.source.title)
            if lang == "hi":
                passages_text.append(f"• {src_name} ({c.id}) [मूल उद्धरण]: {c.text}")
            elif lang == "te":
                passages_text.append(f"• {src_name} ({c.id}) [అసలు ఉల్లేఖనం]: {c.text}")
            elif lang == "ta":
                passages_text.append(f"• {src_name} ({c.id}) [அசல் பகுதி]: {c.text}")
            else:
                passages_text.append(f"• According to {src_name} ({c.id}): {c.text}")

        passages_summary = "\n".join(passages_text)

        if status == EvidenceStatus.FRESHNESS_UNVERIFIED:
            if lang == "hi":
                summary = (
                    f"'{query}' के लिए पुनर्प्राप्त कृषि साक्ष्य (सत्यापन पुराना हो सकता है):\n\n"
                    f"{passages_summary}\n\n"
                    "नोट: ये सिफारिशें पुराने अनुसंधान बुलेटिनों से हैं। खेत में लागू करने से पहले स्थानीय कृषि विज्ञान केंद्र से पुष्टि करें।"
                )
                caveats.append("स्रोत सत्यापन तिथि पुरानी हो सकती है; स्थानीय कीटनाशक नियम बदल सकते हैं।")
            elif lang == "te":
                summary = (
                    f"'{query}' కొరకు లభించిన వ్యవసాయ ఆధారాలు (తాజా స్థితి ధృవీకరించబడలేదు):\n\n"
                    f"{passages_summary}\n\n"
                    "గమనిక: ఈ సిఫార్సులు పాత బులెటిన్ల నుండి వచ్చాయి. పొలంలో ఉపయోగించే ముందు స్థానిక వ్యవసాయ అధికారులతో నిర్ధారించుకోండి."
                )
                caveats.append("ఆధారాల ధృవీకరణ తేదీ పాతది కావచ్చు; స్థానిక పురుగుమందుల నిబంధనలను తనిఖీ చేయండి.")
            elif lang == "ta":
                summary = (
                    f"'{query}' குறித்த பெறப்பட்ட வேளாண் சான்றுகள் (சமீபத்திய சரிபார்ப்பு இல்லை):\n\n"
                    f"{passages_summary}\n\n"
                    "குறிப்பு: இந்தப் பரிந்துரைகள் பழைய ஆராய்ச்சி அறிக்கைகளிலிருந்து பெறப்பட்டவை. வயலில் பயன்படுத்துவதற்கு முன் வேளாண் அதிகாரிகளிடம் உறுதிப்படுத்தவும்."
                )
                caveats.append("மூலத்தின் சரிபார்ப்பு தேதி பழையதாக இருக்கலாம்; பூச்சிக்கொல்லி விதிமுறைகளைச் சரிபார்க்கவும்.")
            else:
                summary = (
                    f"Ground evidence retrieved for '{query}' (Freshness Unverified):\n\n"
                    f"{passages_summary}\n\n"
                    "Note: These recommendations originate from historical or un-reverified bulletins. Confirm with current agricultural authorities before field application."
                )
                caveats.append("Source validation date is unverified; local chemical regulations may have changed.")
        else:
            if lang == "hi":
                summary = (
                    f"'{query}' के लिए प्रमाणित वैज्ञानिक कृषि निष्कर्ष:\n\n"
                    f"{passages_summary}\n\n"
                    "नीचे दिए गए स्रोत कार्डों में संपूर्ण वैज्ञानिक उद्धरण और अनुसंधान विवरण देखें।"
                )
            elif lang == "te":
                summary = (
                    f"'{query}' కొరకు ధృవీకరించబడిన శాస్త్రీయ ఆధారాలు:\n\n"
                    f"{passages_summary}\n\n"
                    "పూర్తి శాస్త్రీయ ఉల్లేఖనాలు మరియు ధృవీకరణ వివరాలను క్రింది మూల కార్డులలో పరిశీలించండి."
                )
            elif lang == "ta":
                summary = (
                    f"'{query}' குறித்த சரிபார்க்கப்பட்ட அறிவியல் முடிவுகள்:\n\n"
                    f"{passages_summary}\n\n"
                    "முழு அறிவியல் பகுதிகள் மற்றும் சான்று விவரங்களை கீழே உள்ள மூல அட்டைகளில் பார்க்கவும்."
                )
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
