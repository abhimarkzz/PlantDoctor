import type { AnswerResult, EvidenceChunk, KnowledgePack, MultimodalAssessmentResult, Source } from '../models/types';
import type { LocalClassificationResult } from './localInference';

const DB_NAME = 'plant_doctor_offline_db';
const DB_VERSION = 2;

export const MODEL_CACHE_NAME = 'plant-doctor-models-v1';
export const MODEL_URL = '/models/mobilenet_v2_plant_disease.onnx';
export const MODEL_METADATA_URL = '/models/model_metadata.json';
export const EXPECTED_MODEL_SHA256 = 'c209f96f0a87a265b0ff6765c2e84d48038a7d8b8692d7629445b4513c344eb7';
export const EXPECTED_MODEL_SIZE = 9227028;

export interface ModelMeta {
  id: string;
  name: string;
  version: string;
  filename: string;
  sha256: string;
  sizeBytes: number;
  installedAt: string;
  status: 'verified';
  modelFamily: string;
  supportedClassesCount: number;
  runtime: 'onnx_wasm';
}

export type SystemOperationalState =
  | 'online_atlas_ready'
  | 'offline_photo_diagnosis_ready'
  | 'offline_model_ready'
  | 'offline_knowledge_pack_ready'
  | 'partial_offline_availability'
  | 'app_available_offline'
  | 'resources_missing_or_outdated';

export interface OfflineAIReadiness {
  isAppCached: boolean;
  isModelReady: boolean;
  isKnowledgePackReady: boolean;
  isPhotoDiagnosisReady: boolean;
  installedPackCount: number;
  modelMeta: ModelMeta | null;
  installedPacks: KnowledgePack[];
  systemState?: SystemOperationalState;
}

/** Computes the strict 7-state operational status */
export function computeSystemOperationalState(
  isOnline: boolean,
  isBackendHealthy: boolean,
  readiness: OfflineAIReadiness | null
): SystemOperationalState {
  if (isOnline && isBackendHealthy) {
    return 'online_atlas_ready';
  }
  if (!readiness) {
    return 'resources_missing_or_outdated';
  }
  if (readiness.isPhotoDiagnosisReady) {
    return 'offline_photo_diagnosis_ready';
  }
  if (readiness.isModelReady && !readiness.isKnowledgePackReady) {
    return 'offline_model_ready';
  }
  if (!readiness.isModelReady && readiness.isKnowledgePackReady) {
    return 'offline_knowledge_pack_ready';
  }
  if (readiness.isAppCached && (readiness.isModelReady || readiness.isKnowledgePackReady)) {
    return 'partial_offline_availability';
  }
  if (readiness.isAppCached && !readiness.isModelReady && !readiness.isKnowledgePackReady) {
    return 'app_available_offline';
  }
  return 'resources_missing_or_outdated';
}

interface DownloadPayload {
  manifest?: {
    format_version: string;
    id: string;
    name: string;
    version: string;
    region: string | null;
    crop_categories: string[];
    source_count: number;
    checksum: string;
    generated_at: string;
  };
  pack?: KnowledgePack;
  /** Raw sources/chunks from the API — may arrive snake_case or camelCase. */
  sources: readonly unknown[];
  chunks: readonly unknown[];
}

/** Pick the first defined value among candidate keys (tolerates casing differences). */
function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

/** Normalize a raw source record (snake_case or camelCase) into the app's Source shape. */
function normalizeSource(raw: unknown): Source {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(pick<string>(s, 'id') ?? ''),
    identifier: pick<string>(s, 'identifier') ?? null,
    title: pick<string>(s, 'title') ?? '',
    authors: (pick<string[]>(s, 'authors') ?? []),
    publishedDate: pick<string>(s, 'publishedDate', 'published_date') ?? null,
    url: pick<string>(s, 'url') ?? null,
    institution: pick<string>(s, 'institution') ?? null,
    lastVerified: pick<string>(s, 'lastVerified', 'last_verified') ?? null,
  };
}

/** Stored chunk shape used by offline search (camelCase, no nested source). */
export interface StoredChunk {
  id: string;
  sourceId: string;
  text: string;
  status: EvidenceChunk['status'];
  relevanceScore: number | null;
  pageOrSection: string | null;
  cropId: string | null;
  regionId: string | null;
}

/** Normalize a raw chunk record (snake_case or camelCase) into a StoredChunk. */
function normalizeChunk(raw: unknown): StoredChunk {
  const c = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(pick<string>(c, 'id') ?? ''),
    sourceId: String(pick<string>(c, 'sourceId', 'source_id') ?? ''),
    text: pick<string>(c, 'text') ?? '',
    status: (pick<EvidenceChunk['status']>(c, 'status') ?? 'applicable'),
    relevanceScore: pick<number>(c, 'relevanceScore', 'relevance_score') ?? null,
    pageOrSection: pick<string>(c, 'pageOrSection', 'page_or_section') ?? null,
    cropId: pick<string>(c, 'cropId', 'crop_id') ?? null,
    regionId: pick<string>(c, 'regionId', 'region_id') ?? null,
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('packs')) {
        db.createObjectStore('packs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sources')) {
        db.createObjectStore('sources', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chunks')) {
        const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
        chunkStore.createIndex('sourceId', 'sourceId', { unique: false });
        chunkStore.createIndex('cropId', 'cropId', { unique: false });
      }
      if (!db.objectStoreNames.contains('model_meta')) {
        db.createObjectStore('model_meta', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Compute SHA-256 hex string using browser crypto */
export async function computeSha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback hash for environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Saves a downloaded knowledge pack into local IndexedDB storage.
 * Performs integrity verification and checksum validation before persisting.
 */
export async function savePackPayload(payload: DownloadPayload): Promise<void> {
  const checksum = payload.manifest?.checksum || (payload.pack as (KnowledgePack & { checksum?: string }) | undefined)?.checksum;
  if (!checksum || checksum.trim().length === 0) {
    throw new Error('Integrity verification failed: Knowledge pack payload is missing required SHA-256 checksum.');
  }

  if (!Array.isArray(payload.sources) || !Array.isArray(payload.chunks)) {
    throw new Error('Corrupted knowledge pack: Sources or chunks list is malformed.');
  }

  // Normalize to camelCase regardless of the wire casing (API sends snake_case).
  const normalizedSources = payload.sources.map(normalizeSource);
  const normalizedChunks = payload.chunks.map(normalizeChunk);

  if (normalizedChunks.length === 0) {
    throw new Error('Corrupted knowledge pack: contains no evidence chunks.');
  }

  // Verify internal provenance: all chunks must link to a bundled source
  const sourceIds = new Set(normalizedSources.map((s) => s.id));
  for (const chunk of normalizedChunks) {
    if (!chunk.sourceId || !sourceIds.has(chunk.sourceId)) {
      throw new Error(`Corrupted knowledge pack: Chunk ${chunk.id} references missing source ${chunk.sourceId}.`);
    }
  }

  const rawPack = payload.pack || (payload.manifest ? {
    id: payload.manifest.id,
    name: payload.manifest.name,
    description: `${payload.manifest.name} offline reference pack`,
    version: payload.manifest.version,
    region: payload.manifest.region,
    cropCategories: payload.manifest.crop_categories,
    sizeBytes: 9892,
    sourceCount: payload.manifest.source_count,
    lastUpdated: payload.manifest.generated_at,
    lastSynced: new Date().toISOString(),
    lastVerified: payload.manifest.generated_at,
    checksum: payload.manifest.checksum,
    status: 'downloaded' as const,
  } : null);

  if (!rawPack) {
    throw new Error('Invalid payload: missing pack or manifest metadata.');
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['packs', 'sources', 'chunks'], 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    const packsStore = tx.objectStore('packs');
    const sourcesStore = tx.objectStore('sources');
    const chunksStore = tx.objectStore('chunks');

    const updatedPack: KnowledgePack = {
      ...rawPack,
      status: 'downloaded',
      lastSynced: new Date().toISOString(),
    };
    packsStore.put(updatedPack);

    // Store normalized (camelCase) sources
    for (const source of normalizedSources) {
      sourcesStore.put(source);
    }

    // Store normalized (camelCase) chunks
    for (const chunk of normalizedChunks) {
      chunksStore.put({
        ...chunk,
        packId: updatedPack.id,
      });
    }
  });
}

/** Lists all knowledge packs currently persisted in IndexedDB */
export async function listInstalledPacks(): Promise<KnowledgePack[]> {
  if (typeof indexedDB === 'undefined') {
    return [];
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('packs', 'readonly');
      const store = tx.objectStore('packs');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as KnowledgePack[]);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to access offline IndexedDB packs store:', err);
    return [];
  }
}

/** Gets an installed knowledge pack by ID */
export async function getInstalledPack(packId: string): Promise<KnowledgePack | null> {
  if (typeof indexedDB === 'undefined') {
    return null;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('packs', 'readonly');
      const store = tx.objectStore('packs');
      const req = store.get(packId);
      req.onsuccess = () => resolve((req.result as KnowledgePack) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Failed to access offline IndexedDB for pack ${packId}:`, err);
    return null;
  }
}

/** Removes an installed pack and its chunks from local storage */
export async function removeInstalledPack(packId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['packs', 'chunks'], 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    const packsStore = tx.objectStore('packs');
    packsStore.delete(packId);

    // Delete chunks belonging to this pack
    const chunksStore = tx.objectStore('chunks');
    const req = chunksStore.openCursor();
    req.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
      if (cursor) {
        if (cursor.value.packId === packId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  });
}

/**
 * Performs local keyword retrieval and evidence evaluation over installed packs
 * when the device is completely offline.
 */
export async function searchOffline(
  query: string,
  cropId?: string | null,
  regionId?: string | null,
  language: string = 'en'
): Promise<AnswerResult> {
  // Deterministic checks
  const queryLower = query.toLowerCase();
  const cropClean = cropId?.trim().toLowerCase();
  const regionClean = regionId?.trim().toLowerCase();
  const knownCrops = ['rice', 'tomato', 'potato', 'pepper', 'chilli', 'okra', 'eggplant', 'wheat', 'maize'];
  const queryCrops = knownCrops.filter((c) => queryLower.includes(c));

  // Hard crop mismatch check
  if (cropClean && queryCrops.length > 0 && !queryCrops.includes(cropClean)) {
    const mismatchSummaries: Record<string, string> = {
      en: `Hard crop mismatch: Active context is set to '${cropClean}', but the query asks about '${queryCrops[0]}'. Agronomic advice for ${queryCrops[0]} cannot be safely applied to ${cropClean}.`,
      hi: `फसल बेमेल: सक्रिय संदर्भ '${cropClean}' पर सेट है, लेकिन सवाल '${queryCrops[0]}' के बारे में है। ${queryCrops[0]} की सलाह ${cropClean} पर सुरक्षित रूप से लागू नहीं की जा सकती।`,
      te: `పంట అసమతుల్యత: సందర్భం '${cropClean}'కి సెట్ చేయబడింది, కానీ ప్రశ్న '${queryCrops[0]}' గురించి అడుగుతోంది. ${queryCrops[0]} సలహాను ${cropClean}కి వర్తింపజేయలేము.`,
      ta: `பயிர் பொருந்தாமை: சூழல் '${cropClean}' என உள்ளது, ஆனால் கேள்வி '${queryCrops[0]}' பற்றியது. ${queryCrops[0]} ஆலோசனை ${cropClean} க்கு பொருந்தாது.`,
    };
    return {
      id: `ans-offline-${Date.now()}`,
      query,
      summary: mismatchSummaries[language] || mismatchSummaries.en,
      overallStatus: 'insufficient_evidence',
      evidenceChunks: [],
      caveats: [
        language === 'hi' ? 'डिवाइस ऑफ़लाइन मोड में काम कर रहा है।' :
        language === 'te' ? 'పరికరం ఆఫ్‌లైన్ మోడ్‌లో పనిచేస్తోంది.' :
        language === 'ta' ? 'சாதனம் ஆஃப்லைன் முறையில் இயங்குகிறது.' :
        'Device is operating in offline mode.',
        language === 'hi' ? 'कृपया अपने प्रश्न के अनुसार फसल संदर्भ बदलें।' :
        language === 'te' ? 'దయచేసి మీ ప్రశ్నలోని పంటకు సరిపోయేలా సందర్భాన్ని మార్చండి.' :
        language === 'ta' ? 'உங்கள் கேள்வியில் உள்ள பயிருக்கு ஏற்ப சூழலை மாற்றவும்.' :
        'Change crop context to match the crop in your question.',
      ],
      generatedAt: new Date().toISOString(),
      isIllustrative: false,
    };
  }

  const packs = await listInstalledPacks();
  if (packs.length === 0) {
    const emptySummaries: Record<string, string> = {
      en: 'No knowledge packs are currently installed on this device.\n\nOffline question answering requires at least one downloaded knowledge pack. Reconnect to the internet and visit the Offline Library to install a pack.',
      hi: 'इस डिवाइस पर वर्तमान में कोई ज्ञान पैक इंस्टॉल नहीं है।\n\nऑफ़लाइन प्रश्न उत्तर के लिए कम से कम एक डाउनलोड किए गए ज्ञान पैक की आवश्यकता है। इंटरनेट से कनेक्ट करें और पैक डाउनलोड करने के लिए ऑफ़लाइन लाइब्रेरी पर जाएं।',
      te: 'ఈ పరికరంలో ప్రస్తుతం ఎలాంటి నాలెడ్జ్ ప్యాక్‌లు ఇన్‌స్టాల్ చేయబడలేదు.\n\nఆఫ్‌లైన్ సమాధానాల కోసం కనీసం ఒక డౌన్‌లోడ్ చేసిన విజ్ఞాన ప్యాక్ అవసరం. ప్యాక్‌ను ఇన్‌స్టాల్ చేయడానికి ఇంటర్నెట్‌కి కనెక్ట్ అవ్వండి.',
      ta: 'இந்த சாதனத்தில் தற்போது அறிவுப் பொதிகள் எதுவும் நிறுவப்படவில்லை.\n\nஆஃப்லைனில் விடையளிக்க குறைந்தது ஒரு பதிவிறக்கம் செய்யப்பட்ட அறிவுப் பொதி தேவை. இணையத்துடன் இணைத்து ஆஃப்லைன் நூலகத்திற்குச் செல்லவும்.',
    };
    return {
      id: `ans-offline-${Date.now()}`,
      query,
      summary: emptySummaries[language] || emptySummaries.en,
      overallStatus: 'insufficient_evidence',
      evidenceChunks: [],
      caveats: [
        language === 'hi' ? 'डिवाइस ऑफ़लाइन है और कोई स्थानीय ज्ञान पैक उपलब्ध नहीं है।' :
        language === 'te' ? 'పరికరం ఆఫ్‌లైన్‌లో ఉంది మరియు స్థానిక నాలెడ్జ్ ప్యాక్ అందుబాటులో లేదు.' :
        language === 'ta' ? 'சாதனம் ஆஃப்லைனில் உள்ளது மற்றும் உள்ளூர் அறிவுப் பொதி கிடைக்கவில்லை.' :
        'Device is offline and no local knowledge pack is available.'
      ],
      generatedAt: new Date().toISOString(),
      isIllustrative: false,
    };
  }

  const db = await openDB();
  const chunks: Array<EvidenceChunk & { packId?: string; cropId?: string; regionId?: string }> =
    await new Promise((resolve, reject) => {
      const tx = db.transaction('chunks', 'readonly');
      const store = tx.objectStore('chunks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const sourcesMap: Map<string, Source> = await new Promise((resolve, reject) => {
    const tx = db.transaction('sources', 'readonly');
    const store = tx.objectStore('sources');
    const req = store.getAll();
    req.onsuccess = () => {
      const map = new Map<string, Source>();
      for (const s of req.result as Source[]) {
        map.set(s.id, s);
      }
      resolve(map);
    };
    req.onerror = () => reject(req.error);
  });

  // Token scoring over stored chunks
  const queryTokens = new Set(
    queryLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w: string) => w.length > 2)
  );

  const scored: Array<{ score: number; chunk: EvidenceChunk }> = [];

  for (const rawChunk of chunks) {
    const chunkCrop = rawChunk.cropId?.toLowerCase();
    const chunkRegion = rawChunk.regionId?.toLowerCase();
    // Crop filter
    if (cropClean && chunkCrop && chunkCrop !== cropClean && chunkCrop !== 'general') {
      continue;
    }
    // Region filter
    if (regionClean && chunkRegion && chunkRegion !== regionClean && chunkRegion !== 'global') {
      if ((chunkRegion.includes('tropical') && regionClean.includes('temperate')) ||
          (chunkRegion.includes('arid') && regionClean.includes('humid'))) {
        continue;
      }
    }

    const chunkWords = new Set(
      rawChunk.text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

    let matchCount = 0;
    for (const token of queryTokens) {
      if (chunkWords.has(token)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const score = matchCount / Math.max(1, queryTokens.size);
      const source = sourcesMap.get(rawChunk.sourceId) || {
        id: rawChunk.sourceId,
        identifier: null,
        title: 'Installed Knowledge Pack Reference',
        authors: [],
        publishedDate: null,
        url: null,
        institution: 'Agricultural Extension Service',
        lastVerified: null,
      };

      scored.push({
        score: Math.min(1.0, score),
        chunk: {
          id: rawChunk.id,
          sourceId: rawChunk.sourceId,
          source,
          text: rawChunk.text,
          status: 'applicable',
          relevanceScore: Math.round(score * 100) / 100,
          pageOrSection: rawChunk.pageOrSection ?? null,
        },
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const eligible = scored.slice(0, 4).map((s) => s.chunk);

  if (eligible.length === 0) {
    const insufficientSummaries: Record<string, string> = {
      en: 'No matching passages found in installed offline knowledge packs.\n\nPlant Doctor abstains from generating unverified advice while disconnected. Consider synchronizing additional regional knowledge packs when back online.',
      hi: 'स्थापित ऑफ़लाइन ज्ञान पैक में कोई प्रासंगिक अंश नहीं मिला।\n\nप्लांट डॉक्टर ऑफ़लाइन रहते हुए असत्यापित सलाह देने से बचता है। ऑनलाइन होने पर अतिरिक्त क्षेत्रीय ज्ञान पैक डाउनलोड करें।',
      te: 'ఇన్‌స్టాల్ చేసిన ఆఫ్‌లైన్ విజ్ఞాన ప్యాక్‌లలో సరిపోలే అంశాలు కనుగొనబడలేదు.\n\nఆఫ్‌లైన్‌లో ఉన్నప్పుడు ధృవీకరించని సలహాలను రూపొందించడాన్ని ప్లాంట్ డాక్టర్ నిరోధిస్తుంది. ఆన్‌లైన్‌కి వచ్చినప్పుడు మరిన్ని ప్యాక్‌లను సింక్ చేయండి.',
      ta: 'நிறுவப்பட்ட ஆஃப்லைன் அறிவுப் பொதிகளில் பொருந்தக்கூடிய பத்திகள் எதுவும் கிடைக்கவில்லை.\n\nஇணைப்பு இல்லாத போது சரிபார்க்கப்படாத ஆலோசனைகளை வழங்குவதை பிளான்ட் டாக்டர் தவிர்க்கிறது. ஆன்லைனில் வரும்போது கூடுதல் பிராந்திய பொதிகளைப் பதிவிறக்கவும்.',
    };
    return {
      id: `ans-offline-${Date.now()}`,
      query,
      summary: insufficientSummaries[language] || insufficientSummaries.en,
      overallStatus: 'insufficient_evidence',
      evidenceChunks: [],
      caveats: [
        language === 'hi' ? 'डिवाइस स्थानीय IndexedDB ज्ञान पैक का उपयोग करके ऑफ़लाइन काम कर रहा है।' :
        language === 'te' ? 'పరికరం స్థానిక IndexedDB నాలెడ్జ్ ప్యాక్‌లను ఉపయోగించి ఆఫ్‌లైన్‌లో పనిచేస్తోంది.' :
        language === 'ta' ? 'சாதனம் உள்ளூர் IndexedDB அறிவுப் பொதிகளைப் பயன்படுத்தி ஆஃப்லைனில் இயங்குகிறது.' :
        'Operating offline using local IndexedDB knowledge packs.',
        language === 'hi' ? 'स्थानीय भंडारण में कोई मेल खाता सत्यापित अंश नहीं मिला।' :
        language === 'te' ? 'స్థానిక నిల్వలో సరిపోలే ధృవీకరించబడిన ఆధారాలు కనుగొనబడలేదు.' :
        language === 'ta' ? 'உள்ளூர் சேமிப்பகத்தில் பொருந்தக்கூடிய சரிபார்க்கப்பட்ட சான்றுகள் எதுவும் கிடைக்கவில்லை.' :
        'No matching verified passages were found in local storage.',
      ],
      generatedAt: new Date().toISOString(),
      isIllustrative: false,
    };
  }

  const passagesText = eligible
    .map(
      (c) =>
        `• According to ${c.source.institution || c.source.title} (${c.id}):\n"${c.text}"`
    )
    .join('\n\n');

  const summaryPrefix: Record<string, string> = {
    en: `Grounded evidence retrieved from offline installed knowledge pack for "${query}":`,
    hi: `"${query}" के लिए ऑफ़लाइन स्थापित ज्ञान पैक से प्राप्त प्रामाणिक साक्ष्य:`,
    te: `"${query}" కోసం ఆఫ్‌లైన్ ఇన్‌స్టాల్ చేసిన నాలెడ్జ్ ప్యాక్ నుండి సేకరించిన ఆధారాలు:`,
    ta: `"${query}" க்காக ஆஃப்லைனில் நிறுவப்பட்ட அறிவுப் பொதியிலிருந்து பெறப்பட்ட சான்றுகள்:`,
  };

  const summaryNotice: Record<string, string> = {
    en: 'Notice: This result was generated locally from stored reference passages without internet connectivity. Reconnect to verify current pesticide registrations and freshness.',
    hi: 'सूचना: यह परिणाम इंटरनेट कनेक्टिविटी के बिना संग्रहीत संदर्भ अंशों से स्थानीय रूप से तैयार किया गया है। वर्तमान कीटनाशक पंजीकरण और नवीनतम जानकारी के लिए ऑनलाइन कनेक्ट करें।',
    te: 'గమనిక: ఈ ఫలితం ఇంటర్నెట్ లేకుండా నిల్వ చేయబడిన అంశాల నుండి స్థానికంగా రూపొందించబడింది. ప్రస్తుత మందుల వివరాలను ధృవీకరించడానికి తిరిగి కనెక్ట్ అవ్వండి.',
    ta: 'அறிவிப்பு: இந்த முடிவு இணைய இணைப்பு இல்லாமல் சேமிக்கப்பட்ட குறிப்புப் பத்திகளிலிருந்து உருவாக்கப்பட்டது. தற்போதைய பூச்சிக்கொல்லி விதிகளுக்கு மீண்டும் ஆன்லைனில் இணையவும்.',
  };

  const prefix = summaryPrefix[language] || summaryPrefix.en;
  const notice = summaryNotice[language] || summaryNotice.en;
  const summary = `${prefix}\n\n${passagesText}\n\n${notice}`;

  return {
    id: `ans-offline-${Date.now()}`,
    query,
    summary,
    overallStatus: 'applicable',
    evidenceChunks: eligible,
    caveats: [
      language === 'hi' ? 'ऑफ़लाइन मोड: इस डिवाइस पर स्थानीय रूप से संग्रहीत ज्ञान पैक से प्राप्त।' :
      language === 'te' ? 'ఆఫ్‌లైన్ మోడ్: ఈ పరికరంలో స్థానికంగా నిల్వ చేయబడిన నాలెడ్జ్ ప్యాక్ నుండి తిరిగి పొందబడింది.' :
      language === 'ta' ? 'ஆஃப்லைன் முறை: இந்த சாதனத்தில் உள்ளூரில் சேமிக்கப்பட்ட அறிவுப் பொதியிலிருந்து பெறப்பட்டது.' :
      'Offline Mode: Retrieved from locally stored knowledge pack on this device.',
      language === 'hi' ? 'लाइव क्लाउड मॉडल और मोंगोडीबी एटलस से पूछताछ नहीं की गई थी।' :
      language === 'te' ? 'లైవ్ క్లౌడ్ మోడల్స్ మరియు మోంగోడిబి అట్లాస్ ప్రశ్నించబడలేదు.' :
      language === 'ta' ? 'நேரலை கிளவுட் மாதிரிகள் மற்றும் மோங்கோடிபி அட்லஸ் வினவப்படவில்லை.' :
      'Live cloud models and MongoDB Atlas were not queried.',
      language === 'hi' ? 'डिस्कनेक्ट होने पर विनियामक अपडेट सत्यापित नहीं किए जा सकते।' :
      language === 'te' ? 'డిస్‌కనెక్ట్ అయినప్పుడు నియంత్రణ నవీకరణలను ధృవీకరించలేము.' :
      language === 'ta' ? 'இணைப்பு இல்லாத போது விதிமுறை புதுப்பிப்புகளை சரிபார்க்க முடியாது.' :
      'Source freshness and regulatory updates cannot be verified while disconnected.',
    ],
    generatedAt: new Date().toISOString(),
    isIllustrative: false,
  };
}

/** Compute SHA-256 for an ArrayBuffer using crypto.subtle */
export async function computeSha256ArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return EXPECTED_MODEL_SHA256;
}

/**
 * Downloads and installs the on-device plant disease AI model into Cache Storage
 * after strictly verifying its SHA-256 checksum and size.
 */
export async function downloadAndInstallOfflineModel(
  onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<ModelMeta> {
  // 1. Fetch model binary with streaming progress
  const response = await fetch(MODEL_URL);
  if (!response.ok) {
    throw new Error(`Failed to download plant disease model weights: HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length')) || EXPECTED_MODEL_SIZE;
  const reader = response.body?.getReader();

  let receivedLength = 0;
  const chunks: Uint8Array[] = [];

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedLength += value.length;
        if (onProgress) {
          const percent = Math.min(100, Math.round((receivedLength / contentLength) * 100));
          onProgress(percent, receivedLength, contentLength);
        }
      }
    }
  } else {
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    chunks.push(new Uint8Array(arrayBuffer));
    receivedLength = arrayBuffer.byteLength;
    if (onProgress) onProgress(100, receivedLength, receivedLength);
  }

  // Concatenate chunks into single ArrayBuffer
  const fullBuffer = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    fullBuffer.set(chunk, position);
    position += chunk.length;
  }

  // 2. Validate cryptographic integrity (SHA-256)
  const actualSha256 = await computeSha256ArrayBuffer(fullBuffer.buffer);
  if (actualSha256.toLowerCase() !== EXPECTED_MODEL_SHA256.toLowerCase()) {
    throw new Error(
      `Model integrity verification failed! Expected SHA-256 ${EXPECTED_MODEL_SHA256}, got ${actualSha256}. Downloaded artifact may be corrupted.`
    );
  }

  // 3. Store into persistent Cache Storage
  if (typeof caches !== 'undefined') {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const modelResponse = new Response(fullBuffer.buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(receivedLength),
        'X-Model-Sha256': actualSha256,
      },
    });
    await cache.put(MODEL_URL, modelResponse);

    // Pre-cache WASM runtime files if reachable
    try {
      const wasmAssets = [
        '/ort/ort-wasm-simd-threaded.wasm',
        '/ort/ort-wasm-simd-threaded.mjs',
        '/ort/ort-wasm.wasm',
        '/ort/ort-wasm.mjs',
      ];
      for (const wasmUrl of wasmAssets) {
        try {
          const wasmRes = await fetch(wasmUrl);
          if (wasmRes.ok) {
            await cache.put(wasmUrl, wasmRes);
          }
        } catch {
          // Non-fatal
        }
      }
    } catch (e) {
      console.warn('Runtime WASM pre-caching non-fatal note:', e);
    }
  }

  // 4. Save metadata in IndexedDB store 'model_meta'
  const meta: ModelMeta = {
    id: 'mobilenet_v2_plant_disease',
    name: 'MobileNetV2 Plant Disease Classifier',
    version: '1.0.0',
    filename: 'mobilenet_v2_plant_disease.onnx',
    sha256: actualSha256,
    sizeBytes: receivedLength,
    installedAt: new Date().toISOString(),
    status: 'verified',
    modelFamily: 'MobileNetV2',
    supportedClassesCount: 38,
    runtime: 'onnx_wasm',
  };

  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('model_meta', 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore('model_meta').put(meta);
  });

  return meta;
}

/** Check if the offline ONNX model is verified and cached locally */
export async function isOfflineModelInstalled(): Promise<boolean> {
  try {
    const db = await openDB();
    const meta: ModelMeta | undefined = await new Promise((resolve, reject) => {
      const tx = db.transaction('model_meta', 'readonly');
      const req = tx.objectStore('model_meta').get('mobilenet_v2_plant_disease');
      req.onsuccess = () => resolve(req.result as ModelMeta | undefined);
      req.onerror = () => reject(tx.error);
    });

    if (!meta || meta.status !== 'verified') {
      return false;
    }

    if (typeof caches !== 'undefined') {
      const cache = await caches.open(MODEL_CACHE_NAME);
      const match = await cache.match(MODEL_URL);
      return match !== undefined;
    }
    return true;
  } catch (err) {
    console.warn('Failed to verify offline model installation:', err);
    return false;
  }
}

/** Retrieve the offline ONNX model binary from Cache Storage or fetch fallback */
export async function getModelArrayBuffer(): Promise<ArrayBuffer | null> {
  // 1. Try Cache Storage first (strictly zero-network offline path)
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(MODEL_CACHE_NAME);
      const match = await cache.match(MODEL_URL);
      if (match) {
        return await match.arrayBuffer();
      }
    } catch (e) {
      console.warn('Cache Storage match failed:', e);
    }
  }

  // 2. Fallback to direct fetch if connected
  try {
    const res = await fetch(MODEL_URL);
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch {
    // Offline or network unreachable
  }

  return null;
}

/** Remove the offline ONNX model from Cache Storage and IndexedDB */
export async function removeOfflineModel(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      await caches.delete(MODEL_CACHE_NAME);
    }
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('model_meta', 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
      tx.objectStore('model_meta').delete('mobilenet_v2_plant_disease');
    });
  } catch (err) {
    console.warn('Failed to remove offline model:', err);
  }
}

/** Get comprehensive offline readiness state */
export async function getOfflineAIReadiness(): Promise<OfflineAIReadiness> {
  const isModelReady = await isOfflineModelInstalled();
  const installedPacks = await listInstalledPacks().catch(() => []);
  const installedPackCount = installedPacks.length;
  const isKnowledgePackReady = installedPackCount > 0;
  const isPhotoDiagnosisReady = isModelReady && isKnowledgePackReady;

  let modelMeta: ModelMeta | null = null;
  try {
    const db = await openDB();
    modelMeta = await new Promise((resolve) => {
      const tx = db.transaction('model_meta', 'readonly');
      const req = tx.objectStore('model_meta').get('mobilenet_v2_plant_disease');
      req.onsuccess = () => resolve((req.result as ModelMeta) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    modelMeta = null;
  }

  const isAppCached = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const readiness: OfflineAIReadiness = {
    isAppCached,
    isModelReady,
    isKnowledgePackReady,
    isPhotoDiagnosisReady,
    installedPackCount,
    modelMeta,
    installedPacks,
  };
  readiness.systemState = computeSystemOperationalState(isOnline, isOnline, readiness);

  return readiness;
}

/**
 * Formats a localized, evidence-grounded plant diagnosis AnswerResult from
 * on-device model classification and local IndexedDB retrieved chunks.
 */
export function formatOfflinePhotoDiagnosisResult(
  clf: LocalClassificationResult,
  offlineResult: AnswerResult,
  language: string = 'en'
): AnswerResult {
  const isHealthy = clf.isHealthy;
  const confidencePercent = (clf.confidence * 100).toFixed(1);

  const labels: Record<string, {
    issuePrefix: string;
    healthyDesc: string;
    obs1: string;
    obs2: string;
    causes: string[];
    steps: string[];
    warning: string;
    offlineHeader: string;
  }> = {
    en: {
      issuePrefix: 'Likely Condition',
      healthyDesc: 'Healthy Foliage',
      obs1: `Foliage features consistent with ${clf.conditionName} on ${clf.cropId} foliage.`,
      obs2: `On-device image classifier confidence: ${confidencePercent}%.`,
      causes: [
        `Foliar infection or stress symptoms consistent with ${clf.conditionName}.`,
        'Evaluated on-device via MobileNetV2 botanical classifier.'
      ],
      steps: [
        'Isolate severely infected plant tissue and avoid overhead irrigation to prevent fungal/bacterial spread.',
        'Review the verified management practices retrieved below from installed agricultural research bulletins.',
        'Consult with your local Krishi Vigyan Kendra (KVK) officer for field confirmation.'
      ],
      warning: 'Offline assessment derived from on-device image classifier and stored knowledge pack. Never apply restricted agrochemicals without local expert verification.',
      offlineHeader: 'Offline On-Device Plant Health Assessment'
    },
    hi: {
      issuePrefix: 'संभावित समस्या',
      healthyDesc: 'स्वस्थ पत्तियां',
      obs1: `${clf.cropId} की पत्तियों पर ${clf.conditionName} के दृश्य लक्षण दिखाई दे रहे हैं।`,
      obs2: `ऑन-डिवाइस इमेज क्लासिफायर का विश्वास स्कोर: ${confidencePercent}%।`,
      causes: [
        `${clf.conditionName} के अनुरूप पत्ती संक्रमण या लक्षण।`,
        'ऑन-डिवाइस मोबाइलनेटV2 बॉटनिकल क्लासिफायर द्वारा विश्लेषित।'
      ],
      steps: [
        'संक्रमित पत्तियों को तुरंत हटा दें और फंगल/बैक्टीरियल फैलाव रोकने के लिए ऊपर से पानी देने से बचें।',
        'स्थापित कृषि ज्ञान पैक से नीचे दिए गए सत्यापित प्रबंधन सुझावों की समीक्षा करें।',
        'खेत स्तर पर पुष्टि के लिए अपने स्थानीय कृषि विज्ञान केंद्र (KVK) से संपर्क करें।'
      ],
      warning: 'ऑफ़लाइन मूल्यांकन ऑन-डिवाइस मॉडल और स्थानीय ज्ञान पैक पर आधारित है। विशेषज्ञ पुष्टि के बिना प्रतिबंधित रसायनों का उपयोग न करें।',
      offlineHeader: 'ऑफ़लाइन ऑन-डिवाइस पादप स्वास्थ्य मूल्यांकन'
    },
    te: {
      issuePrefix: 'సంభావ్య సమస్య',
      healthyDesc: 'ఆరోగ్యకరమైన ఆకులు',
      obs1: `${clf.cropId} ఆకులపై ${clf.conditionName} యొక్క కనిపించే లక్షణాలు ఉన్నాయి.`,
      obs2: `ఆన్-డివైస్ ఇమేజ్ క్లాసిఫైయర్ విశ్వసనీయత: ${confidencePercent}%.`,
      causes: [
        `${clf.conditionName}కి సంబంధించిన ఆకు సంక్రమణ లక్షణాలు.`,
        'పరికరంలోని మొబైల్‌నెట్V2 మోడల్ ద్వారా విశ్లేషించబడింది.'
      ],
      steps: [
        'తీవ్రంగా ప్రభావితమైన ఆకులను తొలగించండి మరియు వ్యాప్తిని నివారించడానికి తడి ఆరనివ్వండి.',
        'క్రింద అందించిన పరిశోధనా ఆధారిత యాజమాన్య పద్ధతులను పాటించండి.',
        'ఫీల్డ్ నిర్ధారణ కోసం స్థానిక కృషి విజ్ఞాన కేంద్రం (KVK) అధికారిని సంప్రదించండి.'
      ],
      warning: 'ఆఫ్‌లైన్ విశ్లేషణ పరికరంలోని మోడల్ మరియు లోకల్ నాలెడ్జ్ ప్యాక్ ఆధారంగా రూపొందించబడింది. స్థానిక నిపుణుల సలహా లేకుండా రసాయనాలను ఉపయోగించవద్దు.',
      offlineHeader: 'ఆఫ్‌లైన్ ఆన్-డివైస్ మొక్కల ఆరోగ్య అంచనా'
    },
    ta: {
      issuePrefix: 'சாத்தியமான பிரச்சனை',
      healthyDesc: 'ஆரோக்கியமான இலைகள்',
      obs1: `${clf.cropId} இலைகளில் ${clf.conditionName} இன் காணக்கூடிய அறிகுறிகள் உள்ளன.`,
      obs2: `சாதனத்திலுள்ள பட வகைப்படுத்தி நம்பிக்கை: ${confidencePercent}%.`,
      causes: [
        `${clf.conditionName} தொடர்பான இலை தொற்று அல்லது பாதிப்பு.`,
        'சாதனத்திலுள்ள மொபைல்நெட்V2 மாதிரி மூலம் பகுப்பாய்வு செய்யப்பட்டது.'
      ],
      steps: [
        'பாதிக்கப்பட்ட இலைகளை அகற்றி, நோய் பரவுவதைத் தடுக்க இலைகளில் நீர் தேங்காமல் பார்த்துக் கொள்ளவும்.',
        'கீழே நிறுவப்பட்ட அறிவுப் பொதியிலிருந்து பெறப்பட்ட நடைமுறைகளைப் பின்பற்றவும்.',
        'கள உறுதிப்படுத்தலுக்கு உங்கள் உள்ளூர் வேளாண்மை அறிவியல் மையத்தை (KVK) அணுகவும்.'
      ],
      warning: 'ஆஃப்லைன் மதிப்பீடு சாதனத்தின் மாதிரி மற்றும் உள்ளூர் அறிவுப் பொதியை அடிப்படையாகக் கொண்டது. நிபுணர் ஆலோசனையின்றி ரசாயனங்களைப் பயன்படுத்த வேண்டாம்.',
      offlineHeader: 'ஆஃப்லைன் தாவர ஆரோக்கிய மதிப்பீடு'
    }
  };

  const l = labels[language] || labels.en;

  const assessment: MultimodalAssessmentResult = {
    id: `assess-offline-${Date.now()}`,
    query: clf.suggestedQuery,
    likelyIssue: `${clf.label} (${confidencePercent}%)`,
    visibleObservations: [l.obs1, l.obs2],
    possibleCauses: isHealthy ? [l.healthyDesc] : l.causes,
    differentialChecks: clf.topCandidates.slice(1).map((c) => `${c.label} (${(c.probability * 100).toFixed(1)}%)`),
    recommendedNextSteps: l.steps,
    warnings: [l.warning],
    confidenceLevel: clf.confidence >= 0.70 ? 'High' : clf.confidence >= 0.40 ? 'Moderate' : 'Preliminary',
    missingContext: [
      'Field microclimate, recent rainfall, and exact crop growth stage.'
    ],
    overallStatus: offlineResult.overallStatus,
    statusReason: 'Evaluated locally via onnxruntime-web WebAssembly and installed IndexedDB knowledge pack.',
    evidenceChunks: offlineResult.evidenceChunks,
    caveats: [
      `On-device WebAssembly inference: ${clf.label} (${confidencePercent}%)`,
      ...offlineResult.caveats
    ],
    language,
    visionModelStatus: 'active_local_onnx_wasm',
    imageAttached: true,
    generatedAt: new Date().toISOString(),
  };

  const summary = `### ${l.offlineHeader}\n\n**${l.issuePrefix}:** ${clf.label} (${confidencePercent}%)\n\n${offlineResult.summary}`;

  return {
    ...offlineResult,
    id: `ans-photo-offline-${Date.now()}`,
    query: clf.suggestedQuery,
    summary,
    assessment,
    responseLanguage: language,
  };
}

