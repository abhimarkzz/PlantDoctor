import type { PlantDoctorService } from './types';
import type { AnswerResult, KnowledgePack, Question } from '../models/types';
import {
  askQuestion,
  getAnswer,
  listKnowledgePacks,
  getKnowledgePack,
  downloadKnowledgePackPayload,
  DeviceOfflineError,
} from '../api/client';
import {
  listInstalledPacks,
  getInstalledPack,
  savePackPayload,
  removeInstalledPack,
  searchOffline,
  isOfflineModelInstalled,
  formatOfflinePhotoDiagnosisResult,
} from './offlineStorage';
import { classifyPlantPhotoLocally } from './localInference';

/**
 * Live adapter backed by the FastAPI REST backend and client-side IndexedDB offline store.
 * Performs real vector/hybrid queries when online, and searches validated offline
 * knowledge packs when disconnected.
 */
export const liveService: PlantDoctorService = {
  kind: 'live',

  async ask(question: Question, image?: File): Promise<AnswerResult> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const lang = question.language || 'en';

      // 1. Offline Photo Diagnosis path
      if (image) {
        const isModelReady = await isOfflineModelInstalled();
        if (!isModelReady) {
          const noModelMsg: Record<string, string> = {
            en: 'On-device AI plant diagnosis model is not installed.\n\nPlease visit the Offline Library while connected to the internet to prepare and download the offline diagnosis pack.',
            hi: 'ऑन-डिवाइस एआई पादप रोग मॉडल इंस्टॉल नहीं है।\n\nऑफ़लाइन डायग्नोसिस पैक डाउनलोड करने के लिए कृपया इंटरनेट से कनेक्ट होने पर ऑफ़लाइन लाइब्रेरी पर जाएं।',
            te: 'పరికరంలో AI ప్లాంట్ డయాగ్నసిస్ మోడల్ ఇన్‌స్టాల్ చేయబడలేదు.\n\nఆఫ్‌లైన్ డయాగ్నసిస్ ప్యాక్‌ను డౌన్‌లోడ్ చేయడానికి దయచేసి ఇంటర్నెట్‌కి కనెక్ట్ అయినప్పుడు ఆఫ్‌లైన్ లైబ్రరీని సందర్శించండి.',
            ta: 'சாதனத்தில் AI தாவர நோயறிதல் மாதிரி நிறுவப்படவில்லை.\n\nஆஃப்லைன் மாதிரி மற்றும் பொதியை பதிவிறக்க இணையத்துடன் இணைக்கப்பட்டிருக்கும் போது ஆஃப்லைன் நூலகத்திற்குச் செல்லவும்.',
          };
          return {
            id: `ans-offline-nomodel-${Date.now()}`,
            query: question.query || 'Plant Photo Diagnosis',
            summary: noModelMsg[lang] || noModelMsg.en,
            overallStatus: 'insufficient_evidence',
            evidenceChunks: [],
            caveats: [
              'On-device AI image model is not prepared on this device.',
              'Internet is required to download the initial offline AI pack.',
            ],
            generatedAt: new Date().toISOString(),
            isIllustrative: false,
          };
        }

        // Run genuine on-device ONNX WebAssembly inference
        const clf = await classifyPlantPhotoLocally(image);

        // Safe abstention for blurry/dark/low-confidence/unsupported images
        if (clf.shouldAbstain) {
          const abstainMsg: Record<string, string> = {
            en: `On-Device Assessment: Inconclusive or Low-Confidence Diagnosis (${(clf.confidence * 100).toFixed(1)}%).\n\n${clf.abstentionReason || 'Visual pattern does not match supported plant diseases with sufficient certainty. Plant Doctor abstains from generating unverified advice.'}\n\nPlease capture a clearer, well-lit photo of the affected foliage or consult an extension specialist.`,
            hi: `ऑन-डिवाइस मूल्यांकन: अनिर्णायक या कम विश्वास निदान (${(clf.confidence * 100).toFixed(1)}%)।\n\n${clf.abstentionReason || 'दृश्य पैटर्न पर्याप्त निश्चितता के साथ समर्थित पादप रोगों से मेल नहीं खाता है। प्लांट डॉक्टर असत्यापित सलाह देने से बचता है।'}\n\nकृपया प्रभावित पत्तियों की स्पष्ट और अच्छी रोशनी वाली तस्वीर लें या कृषि विशेषज्ञ से परामर्श लें।`,
            te: `ఆన్-డివైస్ అంచనా: అసంపూర్ణ లేదా తక్కువ విశ్వసనీయత నిర్ధారణ (${(clf.confidence * 100).toFixed(1)}%).\n\n${clf.abstentionReason || 'దృశ్య నమూనా తగినంత ఖచ్చితత్వంతో సరిపోలడం లేదు. ప్లాంట్ డాక్టర్ అసత్య సలహాలను నిరోధిస్తుంది.'}\n\nదయచేసి స్పష్టమైన ఫోటోను తీయండి లేదా నిపుణుడిని సంప్రదించండి.`,
            ta: `சாதன மதிப்பீடு: முடிவில்லாத அல்லது குறைந்த நம்பிக்கை நோயறிதல் (${(clf.confidence * 100).toFixed(1)}%).\n\n${clf.abstentionReason || 'காட்சி வடிவம் ஆதரிக்கப்படும் தாவர நோய்களுடன் போதுமான உறுதியுடன் பொருந்தவில்லை. பிளான்ட் டாக்டர் சரிபார்க்கப்படாத ஆலோசனையைத் தவிர்க்கிறது.'}\n\nதயவுசெய்து தெளிவான புகைப்படத்தை எடுக்கவும் அல்லது வேளாண்மை நிபுணரை அணுகவும்.`,
          };
          return {
            id: `ans-offline-abstain-${Date.now()}`,
            query: clf.suggestedQuery,
            summary: abstainMsg[lang] || abstainMsg.en,
            overallStatus: 'insufficient_evidence',
            evidenceChunks: [],
            caveats: [
              `On-device inference output: ${clf.label} (${(clf.confidence * 100).toFixed(1)}%)`,
              clf.abstentionReason || 'Confidence is below calibrated threshold (20%).',
              'Operating fully offline via onnxruntime-web WebAssembly.',
            ],
            generatedAt: new Date().toISOString(),
            isIllustrative: false,
          };
        }

        // Confident detection: Retrieve matching evidence from local IndexedDB
        const installed = await listInstalledPacks().catch(() => []);
        if (installed.length === 0) {
          throw new DeviceOfflineError('Plant detected locally, but no knowledge packs are installed for evidence retrieval.');
        }

        const effectiveQuery = question.query?.trim()
          ? `${question.query} ${clf.suggestedQuery}`
          : clf.suggestedQuery;
        const effectiveCrop = clf.cropId !== 'unknown' ? clf.cropId : question.cropId;

        const rawOfflineResult = await searchOffline(
          effectiveQuery,
          effectiveCrop,
          question.regionId,
          lang
        );

        return formatOfflinePhotoDiagnosisResult(clf, rawOfflineResult, lang);
      }

      // 2. Text-only offline path
      const installed = await listInstalledPacks().catch(() => []);
      if (installed.length === 0) {
        throw new DeviceOfflineError('Device is offline and no knowledge packs are installed.');
      }
      return searchOffline(question.query, question.cropId, question.regionId, lang);
    }
    return askQuestion(question.query, {
      cropId: question.cropId,
      regionId: question.regionId,
      growthStageId: question.growthStageId,
      imageFile: image,
      language: question.language,
    });
  },

  async getAnswer(id: string): Promise<AnswerResult> {
    return getAnswer(id);
  },

  async listPacks(): Promise<KnowledgePack[]> {
    const installed = await listInstalledPacks().catch(() => []);
    const installedMap = new Map(installed.map((p) => [p.id, p]));

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return installed;
    }

    try {
      const remotePacks = await listKnowledgePacks();
      return remotePacks.map((p) => {
        const local = installedMap.get(p.id);
        if (local) {
          return {
            ...p,
            status: 'downloaded',
            lastSynced: local.lastSynced,
          };
        }
        return p;
      });
    } catch (err) {
      // If remote backend is unreachable, return locally installed packs
      if (installed.length > 0) {
        return installed;
      }
      throw err;
    }
  },

  async getPack(id: string): Promise<KnowledgePack> {
    const local = await getInstalledPack(id).catch(() => null);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (local) return local;
      throw new Error(`Pack ${id} is not installed locally.`);
    }

    try {
      const remote = await getKnowledgePack(id);
      if (local) {
        return {
          ...remote,
          status: 'downloaded',
          lastSynced: local.lastSynced,
        };
      }
      return remote;
    } catch (err) {
      if (local) return local;
      throw err;
    }
  },

  async downloadPack(id: string): Promise<void> {
    const payload = await downloadKnowledgePackPayload(id);
    await savePackPayload(payload);
  },

  async removePack(id: string): Promise<void> {
    await removeInstalledPack(id);
  },
};
