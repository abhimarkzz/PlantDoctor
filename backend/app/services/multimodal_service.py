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
from .classifier_service import PlantClassifierService, PlantClassificationResult

logger = logging.getLogger("plantdoctor.multimodal")


class MultimodalService:
    def __init__(
        self,
        retrieval_service: RetrievalService,
        source_repo: SourceRepository,
        evidence_gate: EvidenceStatusGate,
        classifier_service: Optional[PlantClassifierService] = None,
    ):
        self.retrieval = retrieval_service
        self.source_repo = source_repo
        self.gate = evidence_gate
        self.classifier = classifier_service

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

        has_image = bool(image_bytes and len(image_bytes) > 0)
        has_gemini = bool(settings.gemini_api_key and settings.gemini_api_key.strip())

        # Real ONNX plant disease classifier
        clf_result: Optional[PlantClassificationResult] = None
        if has_image and self.classifier:
            clf_result = self.classifier.classify_image(image_bytes)
            if clf_result and not clf_result.should_abstain and clf_result.crop_id != "unknown":
                if not crop_id:
                    crop_id = clf_result.crop_id

        # Determine effective query for evidence retrieval
        effective_query = trimmed_query
        if clf_result and not clf_result.should_abstain:
            if not effective_query or len(effective_query) < 3:
                effective_query = clf_result.suggested_query
            else:
                effective_query = f"{effective_query} {clf_result.suggested_query}".strip()

        # 1. Retrieve evidence chunks from Atlas
        retrieved_chunks = self.retrieval.hybrid_search(
            query=effective_query,
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
            query=effective_query,
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
        if has_image and has_gemini:
            vision_result = await self._call_gemini_vision(
                query=effective_query,
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
            clf_result=clf_result,
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
        clf_result: Optional[PlantClassificationResult] = None,
    ) -> MultimodalAssessmentResult:
        """Constructs an honest, structured assessment when vision model key is not configured."""
        if clf_result is not None:
            model_status = "onnx_mobilenet_v2_active"
            if clf_result.should_abstain:
                gate_status = EvidenceStatus.INSUFFICIENT_EVIDENCE
                gate_reason = clf_result.abstention_reason or gate_reason
        else:
            model_status = "gemini_unconfigured" if has_image else "no_image_provided"

        lang_code = language.lower()[:2] if language else "en"
        observations: List[str] = []

        # Build localized observations
        if clf_result:
            if clf_result.should_abstain:
                if lang_code == "hi":
                    observations.append(f"छवि गुणवत्ता सूचना: {clf_result.abstention_reason}")
                elif lang_code == "te":
                    observations.append(f"చిత్ర నాణ్యత గమనిక: {clf_result.abstention_reason}")
                elif lang_code == "ta":
                    observations.append(f"படத் தரம் குறிப்பு: {clf_result.abstention_reason}")
                else:
                    observations.append(f"Image Quality Note: {clf_result.abstention_reason}")
            else:
                if lang_code == "hi":
                    observations.append(f"विज़ुअल लक्षण पहचान (MobileNetV2): {clf_result.label} (सटीकता स्कोर: {clf_result.confidence:.1%})।")
                elif lang_code == "te":
                    observations.append(f"దృశ్య లక్షణాల గుర్తింపు (MobileNetV2): {clf_result.label} (ఖచ్చితత్వ స్కోరు: {clf_result.confidence:.1%}).")
                elif lang_code == "ta":
                    observations.append(f"காட்சி அறிகுறி பொருத்தம் (MobileNetV2): {clf_result.label} (நம்பகத்தன்மை: {clf_result.confidence:.1%}).")
                else:
                    observations.append(f"Visual symptom match (MobileNetV2): {clf_result.label} (model score: {clf_result.confidence:.1%}).")
        else:
            if lang_code == "hi":
                if has_image:
                    observations.append("पौधे की तस्वीर प्राप्त और जांची गई। (सूचना: लाइव विज़न कुंजी कॉन्फ़िगर नहीं है; विश्लेषण प्रश्न और वैज्ञानिक साक्ष्यों पर आधारित है।)")
                else:
                    observations.append("पौधे की कोई तस्वीर संलग्न नहीं है। विश्लेषण वर्णित लक्षणों पर आधारित है।")
            elif lang_code == "te":
                if has_image:
                    observations.append("మొక్క ఫోటో స్వీకరించబడింది మరియు పరిశీలించబడింది. (గమనిక: లైవ్ విజన్ కీ కాన్ఫిగర్ కాలేదు; విశ్లేషణ ప్రశ్న మరియు శాస్త్రీయ ఆధారాలపై ఆధారపడి ఉంది.)")
                else:
                    observations.append("మొక్క ఫోటో జతచేయబడలేదు. విశ్లేషణ వివరించిన లక్షణాలపై ఆధారపడి ఉంది.")
            elif lang_code == "ta":
                if has_image:
                    observations.append("பயிர் படம் பெறப்பட்டு சரிபார்க்கப்பட்டது. (குறிப்பு: நேரடி பார்வை விசை உள்ளமைக்கப்படவில்லை; பகுப்பாய்வு கேள்வி மற்றும் அறிவியல் சான்றுகளின் அடிப்படையில் உள்ளது.)")
                else:
                    observations.append("பயிர் படம் இணைக்கப்படவில்லை. பகுப்பாய்வு விவரிக்கப்பட்ட அறிகுறிகளின் அடிப்படையில் உள்ளது.")
            else:
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
            if lang_code == "hi":
                missing.append("फसल का नाम निर्दिष्ट नहीं है (उदा. टमाटर, धान, मिर्च)।")
            elif lang_code == "te":
                missing.append("పంట పేరు పేర్కొనబడలేదు (ఉదా. టమాటా, వరి, మిరప).")
            elif lang_code == "ta":
                missing.append("பயிரின் பெயர் குறிப்பிடப்படவில்லை (எ.கா. தக்காளி, நெல், மிளகாய்).")
            else:
                missing.append("Crop identity not specified (e.g. Tomato, Rice, Chilli).")

        if region_id is None:
            if lang_code == "hi":
                missing.append("क्षेत्र या स्थानीय जलवायु क्षेत्र निर्दिष्ट नहीं है।")
            elif lang_code == "te":
                missing.append("ప్రాంతం లేదా స్థానిక వాతావరణ మండలం పేర్కొనబడలేదు.")
            elif lang_code == "ta":
                missing.append("பகுதி அல்லது உள்ளூர் தட்பவெப்ப மண்டலம் குறிப்பிடப்படவில்லை.")
            else:
                missing.append("Region or local climate zone not specified.")

        if gate_status == EvidenceStatus.CONTEXT_INCOMPLETE:
            if lang_code == "hi":
                likely_issue = f"अपूर्ण संदर्भ: {query}"
                causes.append(f"सटीक पहचान के लिए संदर्भ आवश्यक: {gate_reason}")
                diffs.append("रोग की संवेदनशीलता की पुष्टि के लिए विशिष्ट फसल और अवस्था की पहचान करें।")
                steps.append("प्रमाणित प्रबंधन प्रोटोकॉल प्राप्त करने के लिए संदर्भ चयनकर्ता से अपनी फसल चुनें।")
                confidence = "कम - संदर्भ अपूर्ण है"
                warnings_list.append("फसल की प्रयोज्यता की पुष्टि किए बिना कृषि रसायनों का प्रयोग न करें।")
            elif lang_code == "te":
                likely_issue = f"అసంపూర్ణ సందర్భం: {query}"
                causes.append(f"సరైన నిర్ధారణకు సందర్భం అవసరం: {gate_reason}")
                diffs.append("తెగులు తీవ్రతను నిర్ధారించడానికి నిర్దిష్ట పంట మరియు ఎదుగుదల దశను గుర్తించండి.")
                steps.append("ధృవీకరించబడిన నిర్వహణ పద్ధతులను పొందడానికి సెలెక్టర్‌లో మీ పంటను ఎంచుకోండి.")
                confidence = "తక్కువ - సందర్భం అసంపూర్ణం"
                warnings_list.append("పంటకు సరిపోతుందని నిర్ధారించకుండా వ్యవసాయ రసాయనాలను ఉపయోగించవద్దు.")
            elif lang_code == "ta":
                likely_issue = f"முழுமையற்ற சூழல்: {query}"
                causes.append(f"துல்லியமான கணிப்பிற்கு சூழல் தேவை: {gate_reason}")
                diffs.append("நோய் பாதிப்பை உறுதிப்படுத்த குறிப்பிட்ட பயிர் மற்றும் வளர்ச்சி நிலையை அடையாளம் காணவும்.")
                steps.append("சரிபார்க்கப்பட்ட மேலாண்மை வழிகாட்டல்களைப் பெற உங்கள் பயிரைத் தேர்ந்தெடுக்கவும்.")
                confidence = "குறைவு - சூழல் முழுமையடையவில்லை"
                warnings_list.append("பயிருக்கு பொருந்துமா என உறுதிப்படுத்தாமல் விவசாய ரசாயனங்களைப் பயன்படுத்த வேண்டாம்.")
            else:
                likely_issue = f"Context Incomplete: {query}"
                causes.append(gate_reason)
                diffs.append("Identify the specific crop and growth stage to confirm pathogen susceptibility.")
                steps.append("Select your target crop from the context selector to retrieve verified management protocols.")
                confidence = "Low - Context incomplete"
                warnings_list.append("Do not apply agricultural chemicals without verifying crop applicability.")

        elif gate_status == EvidenceStatus.INSUFFICIENT_EVIDENCE:
            if lang_code == "hi":
                likely_issue = f"अपर्याप्त सत्यापित साक्ष्य: {query}"
                causes.append("वर्तमान शोध भंडार में इस विशिष्ट लक्षण पैटर्न से मेल खाता प्रमाणित कृषि अनुसंधान नहीं है।")
                diffs.append("खेत के प्रत्यक्ष निरीक्षण के लिए स्थानीय कृषि विज्ञान केंद्र (KVK) या प्रसार अधिकारी से संपर्क करें।")
                steps.append("स्वस्थ पौधों में संभावित फैलाव को रोकने के लिए प्रभावित पौधे के नमूनों को अलग करें।")
                confidence = "कम - भंडार में साक्ष्य अपर्याप्त हैं"
                warnings_list.append("प्लांट डॉक्टर बिना वैज्ञानिक प्रमाण के रासायनिक सिफारिशें देने से बचता है।")
            elif lang_code == "te":
                likely_issue = f"సరిపోని శాస్త్రీయ ఆధారాలు: {query}"
                causes.append("ప్రస్తుత పరిశోధనలలో ఈ నిర్దిష్ట లక్షణాలకు సరిపోయే ఆధారాలు అందుబాటులో లేవు.")
                diffs.append("క్షేత్ర తనిఖీ కోసం స్థానిక కృషి విజ్ఞాన కేంద్రం (KVK) లేదా వ్యవసాయ అధికారిని సంప్రదించండి.")
                steps.append("ఆరోగ్యకరమైన పైరుకు వ్యాపించకుండా నిరోధించడానికి బాధిత మొక్కల భాగాలను వేరుచేయండి.")
                confidence = "తక్కువ - భాండాగారంలో ఆధారాలు లేవు"
                warnings_list.append("ఆధారాలు లేకుండా ప్లాంట్ డాక్టర్ రసాయన సలహాలను ఇవ్వదు.")
            elif lang_code == "ta":
                likely_issue = f"போதுமான சரிபார்க்கப்பட்ட சான்றுகள் இல்லை: {query}"
                causes.append("தற்போதைய ஆராய்ச்சி களஞ்சியத்தில் இந்த குறிப்பிட்ட அறிகுறிக்கு பொருந்தும் சான்றுகள் இல்லை.")
                diffs.append("நேரடி கள ஆய்வுக்கு உள்ளூர் வேளாண் அறிவியல் மையத்தை (KVK) அணுகவும்.")
                steps.append("ஆரோக்கியமான பயிர்களுக்கு பரவுவதைத் தடுக்க பாதிக்கப்பட்ட செடிகளை தனிமைப்படுத்தவும்.")
                confidence = "குறைவு - களஞ்சியத்தில் சான்றுகள் இல்லை"
                warnings_list.append("அறிவியல் சான்றுகள் இன்றி பிளான்ட் டாக்டர் ரசாயன பரிந்துரைகளை வழங்குவதில்லை.")
            else:
                likely_issue = f"Insufficient Verified Evidence: {query}"
                causes.append("No verified agricultural research in the current repository matches this specific symptom pattern.")
                diffs.append("Consult local Krishi Vigyan Kendra (KVK) or extension officer for field inspection.")
                steps.append("Isolate affected plant samples to prevent potential spread to healthy rows.")
                confidence = "Low - Insufficient repository evidence"
                warnings_list.append("Plant Doctor abstains from speculative chemical recommendations.")

        elif gate_status == EvidenceStatus.CONFLICTING_EVIDENCE:
            if lang_code == "hi":
                likely_issue = f"विरोधाभासी साक्ष्य: {query}"
                for conf in conflicts:
                    causes.append(conf)
                diffs.append("जांचें कि आपके खेत के संचालन के लिए कौन सा कृषि मानक या जैविक प्रमाणीकरण लागू होता है।")
                steps.append("खेत में लागू करने से पहले नीचे दिए गए स्रोत कार्डों में परस्पर विरोधी सिफारिशों की समीक्षा करें।")
                confidence = "मध्यम - स्रोतों में भिन्न सिफारिशें मौजूद हैं"
                warnings_list.append("सुनिश्चित करें कि चुना गया हस्तक्षेप स्थानीय राज्य कृषि दिशानिर्देशों के अनुरूप हो।")
            elif lang_code == "te":
                likely_issue = f"పరస్పర విరుద్ధమైన ఆధారాలు: {query}"
                for conf in conflicts:
                    causes.append(conf)
                diffs.append("మీ పొలానికి ఏ వ్యవసాయ ప్రమాణం లేదా సేంద్రీయ ధృవీకరణ వర్తిస్తుందో తనిఖీ చేయండి.")
                steps.append("పొలంలో ఉపయోగించే ముందు క్రింది ఆధార కార్డులలోని విభిన్న సిఫార్సులను పరిశీలించండి.")
                confidence = "మధ్యస్థం - భిన్నమైన సిఫార్సులు ఉన్నాయి"
                warnings_list.append("ఎంచుకున్న పద్ధతి స్థానిక వ్యవసాయ మార్గదర్శకాలకు అనుగుణంగా ఉందని నిర్ధారించుకోండి.")
            elif lang_code == "ta":
                likely_issue = f"முரண்பாடான சான்றுகள்: {query}"
                for conf in conflicts:
                    causes.append(conf)
                diffs.append("உங்கள் நிலத்திற்கு எந்த வேளாண் தரநிலை அல்லது இயற்கை சான்றிதழ் பொருந்தும் எனச் சரிபார்க்கவும்.")
                steps.append("பயன்படுத்துவதற்கு முன் கீழே உள்ள மூல அட்டைகளில் உள்ள மாறுபட்ட பரிந்துரைகளை மதிப்பாய்வு செய்யவும்.")
                confidence = "நடுத்தரம் - மாறுபட்ட பரிந்துரைகள் கண்டறியப்பட்டன"
                warnings_list.append("தேர்ந்தெடுக்கப்பட்ட முறை உள்ளூர் வேளாண் வழிகாட்டுதல்களுக்கு இணங்குவதை உறுதிப்படுத்தவும்.")
            else:
                likely_issue = f"Conflicting Evidence: {query}"
                for conf in conflicts:
                    causes.append(conf)
                diffs.append("Check which agricultural standard or organic certification governs your operational field.")
                steps.append("Review contrasting recommendations in the source cards below before field application.")
                confidence = "Moderate - Divergent recommendations identified"
                warnings_list.append("Ensure chosen intervention adheres to local state agricultural guidelines.")

        else:
            # APPLICABLE or FRESHNESS_UNVERIFIED
            for chunk in chunks[:3]:
                inst = chunk.source.institution or "Agricultural Authority"
                causes.append(f"{inst}: {chunk.text[:140]}...")

            if lang_code == "hi":
                likely_issue = f"'{query}' के लिए लक्षण विश्लेषण"
                diffs.append("जांचें कि लक्षण खेत में अलग-अलग हिस्सों में हैं या पूरे खेत में फैले हैं।")
                diffs.append("कीट वैक्टर या फफूंद बीजाणुओं के लिए पत्तियों के निचले हिस्से और शाखाओं की जांच करें।")
                steps.append("हवा के संचार को सुधारने के लिए गंभीर रूप से संक्रमित निचली पत्तियों को छांटें और सुरक्षित रूप से नष्ट करें।")
                steps.append("पत्तियों के निचले हिस्से और नई कलियों में रस चूसने वाले कीटों या फफूंद जाले की निगरानी करें।")
                confidence = "मध्यम - सत्यापित कृषि बुलेटिनों पर आधारित"
                warnings_list.append("हमेशा सुरक्षात्मक उपकरण पहनें और फसल कटाई से पूर्व के सुरक्षा अंतराल (PHI) का पालन करें।")
                warnings_list.append("बिना प्रमाण के कीटनाशकों का अंधाधुंध छिड़काव न करें।")
            elif lang_code == "te":
                likely_issue = f"'{query}' కొరకు లక్షణాల విశ్లేషణ"
                diffs.append("లక్షణాలు పొలంలో కొన్ని మొక్కలకే పరిమితమా లేక మొత్తం పొలమంతా వ్యాపించాయా అని గమనించండి.")
                diffs.append("ఆకుల వెనుక భాగంలో మరియు మొగ్గల వద్ద పురుగులు లేదా బూజు తెగులు ఆనవాళ్లను పరిశీలించండి.")
                steps.append("గాలి వెలుతురు పెంచడానికి బాగా దెబ్బతిన్న కింది ఆకులను కత్తిరించి పొలం బయట నాశనం చేయండి.")
                steps.append("ఆకుల అడుగుభాగంలో రసం పీల్చే పురుగులు లేదా శిలీంధ్రాల ఉనికిని క్రమం తప్పకుండా గమనించండి.")
                confidence = "మధ్యస్థం - ధృవీకరించబడిన వ్యవసాయ ఆధారాలపై ఆధారపడి ఉంది"
                warnings_list.append("ఎల్లప్పుడూ రక్షణ దుస్తులు ధరించండి మరియు పురుగుమందుల వేచి ఉండే సమయాన్ని (PHI) పాటించండి.")
                warnings_list.append("ధృవీకరణ లేకుండా రసాయనాలను ఉపయోగించవద్దు.")
            elif lang_code == "ta":
                likely_issue = f"'{query}' குறித்த அறிகுறி பகுப்பாய்வு"
                diffs.append("அறிகுறிகள் குறிப்பிட்ட சில செடிகளில் மட்டுமா அல்லது வயல் முழுவதும் உள்ளதா எனப் பார்க்கவும்.")
                diffs.append("பூச்சிகள் அல்லது பூஞ்சை வித்துக்களுக்கு இலையின் அடிப்பகுதியையும் தளிர்களையும் பரிசோதிக்கவும்.")
                steps.append("காற்றோட்டத்தை அதிகரிக்க கடுமையாகப் பாதிக்கப்பட்ட கீழ் இலைகளை அகற்றி வயலுக்கு வெளியே அழிக்கவும்.")
                steps.append("சாறு உறிஞ்சும் பூச்சிகள் அல்லது பூஞ்சை படலத்திற்கு இலைகளின் அடிப்பகுதியைத் தொடர்ந்து கண்காணிக்கவும்.")
                confidence = "நடுத்தரம் - சரிபார்க்கப்பட்ட ஆராய்ச்சி அறிக்கைகளின் அடிப்படையில்"
                warnings_list.append("எப்போதும் பாதுகாப்புக் கருவிகளை அணியுங்கள் மற்றும் அறுவடைக்கு முந்தைய இடைவெளியைக் கடைபிடிக்கவும்.")
                warnings_list.append("முறையான வழிகாட்டுதல் இன்றி ரசாயனங்களை தெளிக்க வேண்டாம்.")
            else:
                likely_issue = f"Symptom Assessment for '{query}'"
                steps.append("Inspect underside of leaves and growing tips for insect vectors or fungal spores.")
                steps.append("Prune and safely destroy heavily infected lower foliage to improve airflow.")
                diffs.append("Check if symptoms appear in isolated patches or across the entire field.")
                confidence = "Moderate - Grounded in verified repository bulletins"
                warnings_list.append("Always wear protective gear and adhere to safety pre-harvest intervals.")

        # Refine with vision classifier prediction if available and valid
        if clf_result and not clf_result.should_abstain:
            likely_issue = f"{clf_result.label} ({clf_result.confidence:.1%})"
            for c in clf_result.top_candidates[1:]:
                diffs.insert(0, f"{c.label} ({c.probability:.1%})")
            if clf_result.is_healthy:
                causes = ["Healthy plant foliage without visible foliar pathogen lesions."]

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
            language=lang_code,
            vision_model_status=model_status,
            image_attached=has_image,
        )
