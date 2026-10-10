import type { PlantDoctorService } from './types';
import type { AnswerResult, KnowledgePack, Question, MultimodalAssessmentResult } from '../models/types';
import { DEMO_ANSWER, DEMO_PACKS } from '../demo/fixtures';
import { cropLabel, regionLabel, growthStageLabel } from '../data/catalog';
import { BackendUnavailableError } from '../api/client';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DEMO_SUMMARIES: Record<string, string> = {
  en: 'Leaf yellowing in tomato plants can result from multiple factors: nutrient deficiencies (especially nitrogen or iron), early blight (Alternaria solani), or overwatering. A soil test and inspecting the yellowing pattern will help determine the cause.',
  hi: 'टमाटर के पौधों में पत्तियों का पीला पड़ना कई कारणों से हो सकता है: पोषक तत्वों की कमी (विशेष रूप से नाइट्रोजन और लोहा), अगेती झुलसा रोग (अल्टरनेरिया सोलानी), या अधिक पानी देना। मिट्टी परीक्षण और पत्तियों के रंग के पैटर्न की जांच से सही कारण पहचानने में मदद मिलेगी।',
  te: 'టమోటా మొక్కలలో ఆకులు పసుపు రంగులోకి మారడం బహుళ కారకాల వల్ల సంభవించవచ్చు: పోషకాల లోపం (ముఖ్యంగా నత్రజని మరియు ఇనుము), ముందస్తు తెగులు (ఆల్టర్నేరియా సోలానీ), లేదా అధిక నీటిపారుదల. మట్టి పరీక్ష మరియు ఆకుల రంగు విధానాన్ని తనిఖీ చేయడం ద్వారా ఖచ్చితమైన కారణాన్ని గుర్తించవచ్చు.',
  ta: 'தக்காளி செடிகளில் இலைகள் மஞ்சள் நிறமாக மாறுவது பல காரணங்களால் ஏற்படலாம்: ஊட்டச்சத்து குறைபாடு (குறிப்பாக நைட்ரஜன் மற்றும் இரும்பு), ஆரம்பகால கருகல் நோய் (ஆல்டர்நேரியா சோலானி), அல்லது அதிக நீர் பாசனம். மண் பரிசோதனை மற்றும் இலைகளின் மஞ்சள் நிற அமைப்பை ஆய்வு செய்வது சரியான காரணத்தை உறுதிப்படுத்த உதவும்.',
};

const DEMO_CAVEATS: Record<string, string[]> = {
  en: [
    'Without knowing your soil type, watering schedule, and regional climate, this guidance is general.',
    'A soil test is recommended before applying nutrient supplements.',
    'If disease is suspected, consult a local agricultural extension service.',
  ],
  hi: [
    'मिट्टी के प्रकार, सिंचाई अनुसूची और क्षेत्रीय जलवायु के बिना, यह सलाह सामान्य है।',
    'पोषक तत्व पूरक देने से पहले मिट्टी परीक्षण की सिफारिश की जाती है।',
    'यदि रोग का संदेह है, तो स्थानीय कृषि विज्ञान केंद्र (KVK) से संपर्क करें।',
  ],
  te: [
    'మీ నేల రకం, నీటిపారుదల షెడ్యూల్ మరియు ప్రాంతీయ వాతావరణం తెలియకుండా, ఈ సలహా సాధారణమైనది.',
    'ఎరువులు వేయడానికి ముందు నేల పరీక్ష చేయించుకోవడం మంచిది.',
    'తెగులు అనుమానం ఉంటే, స్థానిక కృషి విజ్ఞాన కేంద్రాన్ని (KVK) సంప్రదించండి.',
  ],
  ta: [
    'உங்கள் மண் வகை, நீர் பாசன அட்டவணை மற்றும் பிராந்திய தட்பவெப்பநிலை தெரியாமல், இந்த வழிகாட்டுதல் பொதுவானது.',
    'ஊட்டச்சத்துக்களை இடுவதற்கு முன் மண் பரிசோதனை பரிந்துரைக்கப்படுகிறது.',
    'நோய் சந்தேகம் இருந்தால், உள்ளூர் வேளாண் அறிவியல் மையத்தை (KVK) அணுகவும்.',
  ],
};

const DEMO_ASSESSMENTS: Record<string, MultimodalAssessmentResult> = {
  en: {
    id: 'demo-assess-en',
    query: 'Leaf yellowing in tomato plants',
    likelyIssue: 'Early Blight / Nitrogen Deficiency in Solanaceae',
    confidenceLevel: 'High (0.85)',
    visibleObservations: [
      'Uniform or concentric yellowing patterns observed on lower foliar tissue',
      'Stem and leaf margins show stress characteristics typical of solanaceous crops',
    ],
    possibleCauses: [
      'Alternaria solani fungal infection (Early Blight)',
      'Suboptimal nitrogen bioavailability in soil matrix',
      'Over-saturation reducing root aeration',
    ],
    differentialChecks: [
      'Check underside of leaves for fuzzy dark sporulation (indicates fungal blight)',
      'Inspect root system for brown rot or nematode galls',
      'Verify pH and electrical conductivity of irrigation runoff',
    ],
    recommendedNextSteps: [
      'Isolate severely infected lower leaves and safely dispose away from field',
      'Apply copper hydroxide or chlorothalonil fungicide early morning if fungal lesions expand',
      'Ensure 3-4 days between furrow irrigations to restore soil oxygenation',
    ],
    warnings: [
      'Wear protective mask and nitrile gloves when preparing spray mixtures',
      'Respect minimum 7-day pre-harvest interval (PHI) for all chemical applications',
    ],
    missingContext: ['What is your irrigation frequency and approximate soil drainage rate?'],
    overallStatus: 'context_incomplete',
    evidenceChunks: [],
    caveats: [],
    language: 'en',
    visionModelStatus: 'ready',
    imageAttached: false,
    generatedAt: new Date().toISOString(),
  },
  hi: {
    id: 'demo-assess-hi',
    query: 'टमाटर में पत्तियों का पीला पड़ना',
    likelyIssue: 'टमाटर में अगेती झुलसा / नाइट्रोजन की कमी',
    confidenceLevel: 'उच्च (0.85)',
    visibleObservations: [
      'निचली पत्तियों पर एकसमान पीलापन या संकेंद्रित छल्लेदार धब्बे',
      'तने और पत्ती के किनारों पर पोषण तनाव के लक्षण',
    ],
    possibleCauses: [
      'अल्टरनेरिया सोलानी कवक संक्रमण (अगेती झुलसा)',
      'मिट्टी में नाइट्रोजन की अनुपलब्धता',
      'अधिक जलभराव से जड़ों में ऑक्सीजन की कमी',
    ],
    differentialChecks: [
      'पत्तियों के नीचे गहरे काले फफूंद के बीजाणुओं की जांच करें',
      'जड़ों में सड़न या गांठों की जांच करें',
      'खेत में जल निकासी की स्थिति देखें',
    ],
    recommendedNextSteps: [
      'गंभीर रूप से प्रभावित निचली पत्तियों को तोड़कर खेत से दूर नष्ट करें',
      'लक्षण बढ़ने पर सुबह कॉपर ऑक्सीक्लोराइड या मैंकोजेब का छिड़काव करें',
      'सिंचाई के बीच 3-4 दिनों का अंतर रखें ताकि मिट्टी में वायु संचार सुधरे',
    ],
    warnings: [
      'छिड़काव मिश्रण तैयार करते समय मास्क और दस्ताने अवश्य पहनें',
      'रसायनों के प्रयोग के बाद फसल कटाई से पहले 7 दिन का अंतराल (PHI) रखें',
    ],
    missingContext: ['आपकी सिंचाई की आवृत्ति और खेत की मिट्टी का प्रकार क्या है?'],
    overallStatus: 'context_incomplete',
    evidenceChunks: [],
    caveats: [],
    language: 'hi',
    visionModelStatus: 'ready',
    imageAttached: false,
    generatedAt: new Date().toISOString(),
  },
  te: {
    id: 'demo-assess-te',
    query: 'టమోటా ఆకులు పసుపు రంగులోకి మారడం',
    likelyIssue: 'టమోటాలో ముందస్తు తెగులు / నత్రజని లోపం',
    confidenceLevel: 'అధిక (0.85)',
    visibleObservations: [
      'దిగువ ఆకులపై ఏకరూప పసుపు రంగు లేదా వలయాకార మచ్చలు',
      'మొక్క యొక్క కొమ్మలు మరియు ఆకుల అంచులలో ఒత్తిడి లక్షణాలు',
    ],
    possibleCauses: [
      'ఆల్టర్నేరియా సోలానీ శిలీంధ్ర సంక్రమణ (ముందస్తు తెగులు)',
      'నేలలో నత్రజని లభ్యత తగ్గడం',
      'అధిక తేమ వల్ల వేర్లకు గాలి అందకపోవడం',
    ],
    differentialChecks: [
      'ఆకుల అడుగు భాగంలో నల్లటి శిలీంధ్ర పెరుగుదలను తనిఖీ చేయండి',
      'వేర్లలో కుళ్లు లేదా బుడిపెలను తనిఖీ చేయండి',
      'పొలంలో నీటి పారుదల నాణ్యతను పరిశీలించండి',
    ],
    recommendedNextSteps: [
      'తీవ్రంగా ప్రభావితమైన దిగువ ఆకులను తొలగించి పొలానికి దూరంగా నాశనం చేయండి',
      'శిలీంధ్ర వ్యాప్తి ఉంటే ఉదయం కాపర్ ఆక్సిక్లోరైడ్ లేదా మాంకోజెబ్ పిచికారీ చేయండి',
      'నేలలో గాలి ఆడేలా నీటి తడుల మధ్య 3-4 రోజుల వ్యవధి ఇవ్వండి',
    ],
    warnings: [
      'మందులు పిచికారీ చేసేటప్పుడు రక్షణ మాస్క్ మరియు చేతి తొడుగులు ధరించండి',
      'రసాయనాల వాడకం తర్వాత పంట కోతకు కనీసం 7 రోజుల వ్యవధి పాటించండి',
    ],
    missingContext: ['మీరు ఎన్ని రోజులకు ఒకసారి నీరు పెడతారు మరియు మీ నేల రకం ఏమిటి?'],
    overallStatus: 'context_incomplete',
    evidenceChunks: [],
    caveats: [],
    language: 'te',
    visionModelStatus: 'ready',
    imageAttached: false,
    generatedAt: new Date().toISOString(),
  },
  ta: {
    id: 'demo-assess-ta',
    query: 'தக்காளி இலைகள் மஞ்சள் நிறமாக மாறுதல்',
    likelyIssue: 'தக்காளியில் ஆரம்பகால கருகல் நோய் / தழைச்சத்து குறைபாடு',
    confidenceLevel: 'உயர் (0.85)',
    visibleObservations: [
      'கீழ் இலைகளில் சீரான மஞ்சள் நிறம் அல்லது வளைய வடிவ புள்ளிகள்',
      'தண்டு மற்றும் இலை விளிம்புகளில் சத்து குறைபாட்டின் அறிகுறிகள்',
    ],
    possibleCauses: [
      'ஆல்டர்நேரியா சோலானி பூஞ்சை தொற்று (ஆரம்ப கருகல்)',
      'மண்ணில் தழைச்சத்து (நைட்ரஜன்) பற்றாக்குறை',
      'அதிக நீர் தேங்குவதால் வேர்களுக்கு பிராணவாயு பற்றாக்குறை',
    ],
    differentialChecks: [
      'இலைகளின் அடிப்பகுதியில் இருண்ட பூஞ்சை வித்திகளை சோதிக்கவும்',
      'வேர் அமைப்பில் அழுகல் அல்லது முடிச்சுகளை பரிசோதிக்கவும்',
      'பாசன நீரின் வடிகால் வசதியை உறுதிப்படுத்தவும்',
    ],
    recommendedNextSteps: [
      'பாதிக்கப்பட்ட கீழ் இலைகளைப் பறித்து வயலை விட்டு அப்புறப்படுத்தவும்',
      'பூஞ்சை புள்ளிகள் பரவினால் காலை வேளையில் காப்பர் ஆக்ஸிகுளோரைடு தெளிக்கவும்',
      'மண்ணில் காற்று சுழற்சி ஏற்பட பாசனங்களுக்கு இடையே 3-4 நாட்கள் இடைவெளி விடவும்',
    ],
    warnings: [
      'மருந்து தெளிக்கும் போது பாதுகாப்பு முகக்கவசம் மற்றும் கையுறைகளை அணியுங்கள்',
      'ரசாயன தெளிப்பிற்கு பின் அறுவடைக்கு முன் 7 நாட்கள் இடைவெளியை (PHI) கடைபிடிக்கவும்',
    ],
    missingContext: ['உங்கள் பாசன இடைவெளி மற்றும் மண்ணின் வகை என்ன?'],
    overallStatus: 'context_incomplete',
    evidenceChunks: [],
    caveats: [],
    language: 'ta',
    visionModelStatus: 'ready',
    imageAttached: false,
    generatedAt: new Date().toISOString(),
  },
};

export const demoService: PlantDoctorService = {
  kind: 'demo',

  async ask(question: Question): Promise<AnswerResult> {
    await delay(600);

    const lang = question.language || 'en';
    const baseSummary = DEMO_SUMMARIES[lang] || DEMO_SUMMARIES.en;
    const caveats = DEMO_CAVEATS[lang] || DEMO_CAVEATS.en;
    const assessment = DEMO_ASSESSMENTS[lang] || DEMO_ASSESSMENTS.en;

    const contextBits = [
      cropLabel(question.cropId, lang as any),
      regionLabel(question.regionId, lang as any),
      growthStageLabel(question.growthStageId, lang as any),
    ].filter(Boolean);

    let contextNote = '';
    if (contextBits.length > 0) {
      if (lang === 'hi') {
        contextNote = ` प्रदान किया गया संदर्भ: ${contextBits.join(', ')}।`;
      } else if (lang === 'te') {
        contextNote = ` అందించిన సందర్భం: ${contextBits.join(', ')}.`;
      } else if (lang === 'ta') {
        contextNote = ` வழங்கப்பட்ட சூழல்: ${contextBits.join(', ')}.`;
      } else {
        contextNote = ` Context provided: ${contextBits.join(', ')}.`;
      }
    } else {
      if (lang === 'hi') {
        contextNote = ' कोई फसल या क्षेत्र संदर्भ प्रदान नहीं किया गया (No crop/region context), जिससे प्रयोज्यता सीमित हो जाती है।';
      } else if (lang === 'te') {
        contextNote = ' పంట లేదా ప్రాంతీయ సందర్భం అందించబడలేదు (No crop/region context), ఇది వర్తింపును పరిమితం చేస్తుంది.';
      } else if (lang === 'ta') {
        contextNote = ' பயிர் அல்லது பிராந்திய சூழல் வழங்கப்படவில்லை (No crop/region context), இது பொருந்தக்கூடிய தன்மையை கட்டுப்படுத்துகிறது.';
      } else {
        contextNote = ' No crop/region context was provided, which limits applicability.';
      }
    }

    const result: AnswerResult = {
      ...DEMO_ANSWER,
      id: DEMO_ANSWER.id,
      query: question.query,
      summary: `${baseSummary}${contextNote}`,
      overallStatus: 'context_incomplete',
      caveats,
      assessment,
      isIllustrative: true,
      generatedAt: new Date().toISOString(),
      responseLanguage: lang,
    };

    return getLocalizedDemoAnswer(result, lang as any);
  },

  async getAnswer(id: string, language: string = 'en'): Promise<AnswerResult> {
    await delay(200);
    if (id === DEMO_ANSWER.id) {
      return getLocalizedDemoAnswer(DEMO_ANSWER, language as any);
    }
    throw new BackendUnavailableError();
  },

  async listPacks(): Promise<KnowledgePack[]> {
    await delay(300);
    return DEMO_PACKS;
  },

  async getPack(id: string): Promise<KnowledgePack> {
    await delay(200);
    const pack = DEMO_PACKS.find((p) => p.id === id);
    if (!pack) throw new Error(`Knowledge pack not found: ${id}`);
    return pack;
  },
};

export function getLocalizedDemoAnswer(
  baseAnswer: AnswerResult,
  lang: string = 'en'
): AnswerResult {
  const language = (lang || 'en').toLowerCase().slice(0, 2);
  let summary = DEMO_SUMMARIES[language] || baseAnswer.summary || DEMO_SUMMARIES.en;

  // Preserve and adapt context notes if present on baseAnswer
  if (baseAnswer.summary) {
    if (
      baseAnswer.summary.includes('No crop/region context') ||
      baseAnswer.summary.includes('कोई फसल या क्षेत्र संदर्भ') ||
      baseAnswer.summary.includes('పంట లేదా ప్రాంతీయ సందర్భం') ||
      baseAnswer.summary.includes('பயிர் அல்லது பிராந்திய சூழல்')
    ) {
      if (language === 'hi') {
        summary = `${DEMO_SUMMARIES.hi} कोई फसल या क्षेत्र संदर्भ प्रदान नहीं किया गया (No crop/region context), जिससे प्रयोज्यता सीमित हो जाती है।`;
      } else if (language === 'te') {
        summary = `${DEMO_SUMMARIES.te} పంట లేదా ప్రాంతీయ సందర్భం అందించబడలేదు (No crop/region context), ఇది వర్తింపును పరిమితం చేస్తుంది.`;
      } else if (language === 'ta') {
        summary = `${DEMO_SUMMARIES.ta} பயிர் அல்லது பிராந்திய சூழல் வழங்கப்படவில்லை (No crop/region context), ఇది பொருந்தக்கூடிய தன்மையை கட்டுப்படுத்துகிறது.`;
      } else {
        summary = `${DEMO_SUMMARIES.en} No crop/region context was provided, which limits applicability.`;
      }
    } else if (
      baseAnswer.summary.includes('Context provided:') ||
      baseAnswer.summary.includes('प्रदान किया गया संदर्भ:') ||
      baseAnswer.summary.includes('అందించిన సందర్భం:') ||
      baseAnswer.summary.includes('வழங்கப்பட்ட சூழல்:')
    ) {
      const match = baseAnswer.summary.match(/(?:Context provided:|प्रदान किया गया संदर्भ:|అందించిన సందర్భం:|வழங்கப்பட்ட சூழல்:)\s*([^.]+)/i);
      const bits = match ? match[1].trim() : 'Tomato, Tropical, Fruiting';
      if (language === 'hi') {
        summary = `${DEMO_SUMMARIES.hi} प्रदान किया गया संदर्भ: ${bits}।`;
      } else if (language === 'te') {
        summary = `${DEMO_SUMMARIES.te} అందించిన సందర్భం: ${bits}.`;
      } else if (language === 'ta') {
        summary = `${DEMO_SUMMARIES.ta} வழங்கப்பட்ட சூழல்: ${bits}.`;
      } else {
        summary = `${DEMO_SUMMARIES.en} Context provided: ${bits}.`;
      }
    }
  }

  const caveats = DEMO_CAVEATS[language] || baseAnswer.caveats || DEMO_CAVEATS.en;
  const assessment = DEMO_ASSESSMENTS[language] || baseAnswer.assessment || DEMO_ASSESSMENTS.en;

  // Localize chunk explanations
  const evidenceChunks = (baseAnswer.evidenceChunks || DEMO_ANSWER.evidenceChunks).map((chunk) => {
    let explanation: string | null = null;
    if (chunk.id === 'chunk-demo-001') {
      if (language === 'hi') {
        explanation = 'नाइट्रोजन की कमी में सबसे पहले पुरानी निचली पत्तियां एकसमान रूप से पीली पड़ने लगती हैं और धीरे-धीरे ऊपर की ओर बढ़ती हैं। लौह (आयरन) की कमी में नई पत्तियों की नसों के बीच का हिस्सा पीला पड़ता है जबकि नसें हरी रहती हैं।';
      } else if (language === 'te') {
        explanation = 'నత్రజని లోపం వల్ల మొదట పాత దిగువ ఆకులు ఏకరూపంలో పసుపు రంగులోకి మారి క్రమంగా పైకి వ్యాపిస్తాయి. ఇనుము లోపం వల్ల పై లేత ఆకుల ఈనెల మధ్య భాగం పసుపు రంగులోకి మారుతుంది, ఈనెలు ఆకుపచ్చగానే ఉంటాయి.';
      } else if (language === 'ta') {
        explanation = 'தழைச்சத்து (நைட்ரஜன்) பற்றாக்குறையின் போது முதலில் முதிர்ந்த கீழ் இலைகள் சீராக மஞ்சள் நிறமாக மாறி படிப்படியாக மேல்நோக்கிப் பரவும். இரும்புச்சத்து குறைபாட்டின் போது இளம் இலைகளின் நரம்புகளுக்கு இடைப்பட்ட பகுதி மஞ்சளாகவும் நரம்புகள் பச்சையாகவும் இருக்கும்.';
      } else {
        explanation = 'Nitrogen deficiency begins as uniform yellowing of older lower foliage; iron deficiency presents interveinal chlorosis on terminal growth.';
      }
    } else if (chunk.id === 'chunk-demo-002') {
      if (language === 'hi') {
        explanation = 'फ्यूजेरियम और वर्टिसिलियम विल्ट से पत्तियां पीली होती हैं, जो प्रायः पौधे के एक हिस्से या व्यक्तिगत शाखाओं को पहले प्रभावित करती हैं।';
      } else if (language === 'te') {
        explanation = 'ఫ్యుసేరియం మరియు వర్టిసిలియం విల్ట్ వల్ల ఆకులు పసుపు రంగులోకి మారతాయి, ఇది మొదట మొక్క యొక్క ఒక వైపు భాగాన్ని మాత్రమే ప్రభావితం చేస్తుంది.';
      } else if (language === 'ta') {
        explanation = 'பியூசேரியம் மற்றும் வெர்டிசிலியம் வாடல் ஆகியவை இலைகள் மஞ்சளாவதற்கு காரணமாகின்றன, இது பொதுவாக முதலில் செடியின் ஒரு பகுதியை மட்டுமே தாக்கும்.';
      } else {
        explanation = 'Fusarium and Verticillium vascular wilts cause foliar chlorosis typically isolated to unilateral plant sections.';
      }
    } else if (chunk.id === 'chunk-demo-003') {
      if (language === 'hi') {
        explanation = 'मिट्टी में अत्यधिक जलभराव से जड़ों में ऑक्सीजन की कमी हो जाती है, जिससे पत्तियों में पीलापन और जड़ सड़न की समस्या आती है।';
      } else if (language === 'te') {
        explanation = 'నేలలో అధిక తేమ వేర్లకు ఆక్సిజన్ అందకుండా చేస్తుంది, దీనివల్ల ఆకులు పసుపు రంగులోకి మారి వేరు కుళ్లు తెగులు వచ్చే ప్రమాదం ఉంది.';
      } else if (language === 'ta') {
        explanation = 'அதிகப்படியான மண் ஈரப்பதம் வேர்களின் ஆக்சிஜன் ஏற்பைக் குறைத்து, இலைகள் மஞ்சளாகவும் வேர் அழுகவும் வழிவகுக்கிறது.';
      } else {
        explanation = 'Excessive soil moisture impairs root aeration, precipitating generalized chlorosis and potential root necrosis.';
      }
    }

    return {
      ...chunk,
      translatedExplanation: explanation ?? chunk.translatedExplanation,
    };
  });

  return {
    ...baseAnswer,
    summary,
    caveats,
    assessment,
    evidenceChunks,
    responseLanguage: language,
    generatedAt: baseAnswer.generatedAt || new Date().toISOString(),
  };
}
