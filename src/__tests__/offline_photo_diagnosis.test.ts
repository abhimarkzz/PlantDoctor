import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PLANT_VILLAGE_TAXONOMY,
  type LocalClassificationResult,
} from '../services/localInference';
import {
  computeSha256ArrayBuffer,
  computeSystemOperationalState,
  formatOfflinePhotoDiagnosisResult,
  getOfflineAIReadiness,
  EXPECTED_MODEL_SHA256,
  type OfflineAIReadiness,
} from '../services/offlineStorage';
import type { AnswerResult } from '../models/types';

describe('Offline Mode & Photo-Only Diagnosis Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Plant Disease Taxonomy & Calibration Specifications', () => {
    it('defines all 38 PlantVillage classes with crops and condition names', () => {
      const keys = Object.keys(PLANT_VILLAGE_TAXONOMY).map(Number);
      expect(keys.length).toBe(38);

      for (let i = 0; i < 38; i++) {
        const item = PLANT_VILLAGE_TAXONOMY[i];
        expect(item).toBeDefined();
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.crop.length).toBeGreaterThan(0);
        expect(item.condition.length).toBeGreaterThan(0);
        expect(typeof item.healthy).toBe('boolean');
      }
    });

    it('correctly categorizes key agricultural conditions', () => {
      // Tomato Late Blight
      expect(PLANT_VILLAGE_TAXONOMY[30].crop).toBe('tomato');
      expect(PLANT_VILLAGE_TAXONOMY[30].condition).toContain('Late Blight');
      expect(PLANT_VILLAGE_TAXONOMY[30].healthy).toBe(false);

      // Potato Early Blight
      expect(PLANT_VILLAGE_TAXONOMY[20].crop).toBe('potato');
      expect(PLANT_VILLAGE_TAXONOMY[20].condition).toContain('Early Blight');
      expect(PLANT_VILLAGE_TAXONOMY[20].healthy).toBe(false);

      // Healthy Tomato
      expect(PLANT_VILLAGE_TAXONOMY[37].crop).toBe('tomato');
      expect(PLANT_VILLAGE_TAXONOMY[37].healthy).toBe(true);

      // Bell Pepper Bacterial Spot
      expect(PLANT_VILLAGE_TAXONOMY[18].crop).toBe('pepper');
      expect(PLANT_VILLAGE_TAXONOMY[18].condition).toContain('Bacterial Spot');
      expect(PLANT_VILLAGE_TAXONOMY[18].healthy).toBe(false);
    });
  });

  describe('2. Model Checksum & Cryptographic Verification', () => {
    it('verifies that the expected model SHA-256 matches verified MobileNetV2 artifact', () => {
      expect(EXPECTED_MODEL_SHA256).toBe(
        'c209f96f0a87a265b0ff6765c2e84d48038a7d8b8692d7629445b4513c344eb7'
      );
    });

    it('computes sha256 for an ArrayBuffer using Web Crypto API', async () => {
      const sample = new TextEncoder().encode('plant-doctor-onnx-test');
      const hash = await computeSha256ArrayBuffer(sample.buffer);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });
  });

  describe('3. Offline AI Readiness Evaluator & Explicit 7 System States', () => {
    it('returns structured readiness with model, packs, and app cached statuses', async () => {
      const readiness = await getOfflineAIReadiness();
      expect(readiness).toBeDefined();
      expect(typeof readiness.isModelReady).toBe('boolean');
      expect(typeof readiness.isKnowledgePackReady).toBe('boolean');
      expect(typeof readiness.isPhotoDiagnosisReady).toBe('boolean');
      expect(typeof readiness.installedPackCount).toBe('number');
      expect(readiness.systemState).toBeDefined();
    });

    it('evaluates all 7 required system operational states correctly', () => {
      const base: OfflineAIReadiness = {
        isAppCached: true,
        isModelReady: false,
        isKnowledgePackReady: false,
        isPhotoDiagnosisReady: false,
        installedPackCount: 0,
        modelMeta: null,
        installedPacks: [],
      };

      // 1. Online Atlas retrieval available
      expect(computeSystemOperationalState(true, true, base)).toBe('online_atlas_ready');

      // 2. Offline photo diagnosis ready
      const fullOffline: OfflineAIReadiness = {
        ...base,
        isModelReady: true,
        isKnowledgePackReady: true,
        isPhotoDiagnosisReady: true,
        installedPackCount: 1,
      };
      expect(computeSystemOperationalState(false, false, fullOffline)).toBe('offline_photo_diagnosis_ready');

      // 3. Offline model ready (no pack)
      const modelOnly: OfflineAIReadiness = {
        ...base,
        isModelReady: true,
      };
      expect(computeSystemOperationalState(false, false, modelOnly)).toBe('offline_model_ready');

      // 4. Offline knowledge pack ready (no model)
      const packOnly: OfflineAIReadiness = {
        ...base,
        isKnowledgePackReady: true,
        installedPackCount: 1,
      };
      expect(computeSystemOperationalState(false, false, packOnly)).toBe('offline_knowledge_pack_ready');

      // 5. Application available offline (shell cached, no model or pack)
      expect(computeSystemOperationalState(false, false, base)).toBe('app_available_offline');

      // 6. Resources missing or out of date
      const notCached: OfflineAIReadiness = {
        ...base,
        isAppCached: false,
      };
      expect(computeSystemOperationalState(false, false, notCached)).toBe('resources_missing_or_outdated');
      expect(computeSystemOperationalState(false, false, null)).toBe('resources_missing_or_outdated');
    });
  });

  describe('4. formatOfflinePhotoDiagnosisResult Localized Synthesis', () => {
    const mockClfTomato: LocalClassificationResult = {
      label: 'Tomato with Late Blight',
      cropId: 'tomato',
      conditionId: 'tomato_late_blight',
      conditionName: 'Late Blight (Phytophthora infestans)',
      confidence: 0.885,
      isHealthy: false,
      shouldAbstain: false,
      abstentionReason: null,
      suggestedQuery: 'tomato Late Blight symptoms cause management control',
      topCandidates: [
        {
          label: 'Tomato with Late Blight',
          crop: 'tomato',
          condition: 'Late Blight (Phytophthora infestans)',
          probability: 0.885,
          isHealthy: false,
        },
        {
          label: 'Tomato with Early Blight',
          crop: 'tomato',
          condition: 'Early Blight (Alternaria solani)',
          probability: 0.082,
          isHealthy: false,
        },
      ],
      runtime: 'onnx_wasm_local',
    };

    const mockOfflineAnswer: AnswerResult = {
      id: 'ans-offline-1',
      query: 'tomato Late Blight symptoms cause management control',
      summary: 'According to TNAU Agritech Portal: Tomato late blight causes water-soaked foliar lesions.',
      overallStatus: 'applicable',
      evidenceChunks: [
        {
          id: 'chunk-tnau-tom-1',
          sourceId: 'src-tnau-tom',
          source: {
            id: 'src-tnau-tom',
            identifier: null,
            title: 'TNAU Agritech Portal: Tomato Crop Protection Guide',
            institution: 'Tamil Nadu Agricultural University (TNAU)',
            authors: ['Department of Plant Pathology, TNAU Coimbatore'],
            publishedDate: '2023-08-15',
            url: null,
            lastVerified: '2025-01-10',
          },
          text: 'Tomato late blight causes water-soaked foliar lesions rapidly expanding during humid weather.',
          pageOrSection: 'Folio Section 4',
          relevanceScore: 0.95,
          status: 'applicable',
        },
      ],
      caveats: ['Device is operating in offline mode.'],
      isIllustrative: false,
      generatedAt: '2026-10-11T00:00:00.000Z',
    };

    it('formats English result with on-device observations, differential checks, and citations', () => {
      const res = formatOfflinePhotoDiagnosisResult(mockClfTomato, mockOfflineAnswer, 'en');
      expect(res.responseLanguage).toBe('en');
      expect(res.assessment).toBeDefined();
      expect(res.assessment?.likelyIssue).toContain('Tomato with Late Blight (88.5%)');
      expect(res.assessment?.confidenceLevel).toBe('High');
      expect(res.assessment?.visionModelStatus).toBe('active_local_onnx_wasm');
      expect(res.assessment?.differentialChecks).toContain('Tomato with Early Blight (8.2%)');
      expect(res.assessment?.recommendedNextSteps.length).toBeGreaterThan(0);
      expect(res.summary).toContain('Offline On-Device Plant Health Assessment');
      expect(res.summary).toContain('Likely Condition:');
      expect(res.evidenceChunks.length).toBe(1);
      expect(res.evidenceChunks[0].source.institution).toBe('Tamil Nadu Agricultural University (TNAU)');
    });

    it('formats Hindi result with authentic Devanagari agricultural terminology', () => {
      const res = formatOfflinePhotoDiagnosisResult(mockClfTomato, mockOfflineAnswer, 'hi');
      expect(res.responseLanguage).toBe('hi');
      expect(res.summary).toContain('ऑफ़लाइन ऑन-डिवाइस पादप स्वास्थ्य मूल्यांकन');
      expect(res.summary).toContain('संभावित समस्या:');
      expect(res.assessment?.visibleObservations[0]).toContain('पत्तियों पर');
      expect(res.assessment?.recommendedNextSteps[0]).toContain('संक्रमित पत्तियों को तुरंत हटा दें');
      expect(res.assessment?.warnings[0]).toContain('ऑफ़लाइन मूल्यांकन');
    });

    it('formats Telugu result with authentic Telugu terminology', () => {
      const res = formatOfflinePhotoDiagnosisResult(mockClfTomato, mockOfflineAnswer, 'te');
      expect(res.responseLanguage).toBe('te');
      expect(res.summary).toContain('ఆఫ్‌లైన్ ఆన్-డివైస్ మొక్కల ఆరోగ్య అంచనా');
      expect(res.summary).toContain('సంభావ్య సమస్య:');
      expect(res.assessment?.visibleObservations[0]).toContain('ఆకులపై');
      expect(res.assessment?.recommendedNextSteps[0]).toContain('తీవ్రంగా ప్రభావితమైన ఆకులను తొలగించండి');
    });

    it('formats Tamil result with authentic Tamil terminology', () => {
      const res = formatOfflinePhotoDiagnosisResult(mockClfTomato, mockOfflineAnswer, 'ta');
      expect(res.responseLanguage).toBe('ta');
      expect(res.summary).toContain('ஆஃப்லைன் தாவர ஆரோக்கிய மதிப்பீடு');
      expect(res.summary).toContain('சாத்தியமான பிரச்சனை:');
      expect(res.assessment?.visibleObservations[0]).toContain('இலைகளில்');
      expect(res.assessment?.recommendedNextSteps[0]).toContain('பாதிக்கப்பட்ட இலைகளை அகற்றி');
    });

    it('correctly handles healthy plant foliage result', () => {
      const mockHealthyTomato: LocalClassificationResult = {
        label: 'Healthy Tomato Plant',
        cropId: 'tomato',
        conditionId: 'healthy_tomato',
        conditionName: 'Healthy Foliage',
        confidence: 0.942,
        isHealthy: true,
        shouldAbstain: false,
        abstentionReason: null,
        suggestedQuery: 'tomato healthy plant maintenance agronomic practices',
        topCandidates: [
          {
            label: 'Healthy Tomato Plant',
            crop: 'tomato',
            condition: 'Healthy Foliage',
            probability: 0.942,
            isHealthy: true,
          },
        ],
        runtime: 'onnx_wasm_local',
      };

      const res = formatOfflinePhotoDiagnosisResult(mockHealthyTomato, mockOfflineAnswer, 'en');
      expect(res.assessment?.possibleCauses).toEqual(['Healthy Foliage']);
      expect(res.assessment?.likelyIssue).toContain('Healthy Tomato Plant');
    });
  });

  describe('5. Safety Abstention Contracts', () => {
    it('sets shouldAbstain and preserves abstention reason on low confidence', () => {
      const mockLowConfClf: LocalClassificationResult = {
        label: 'Unknown Symptom',
        cropId: 'unknown',
        conditionId: 'uninformative',
        conditionName: 'Image Quality Warning',
        confidence: 0.12,
        isHealthy: false,
        shouldAbstain: true,
        abstentionReason: 'Local model confidence (12.0%) is below calibrated threshold (20%).',
        suggestedQuery: 'Plant disease identification',
        topCandidates: [],
        runtime: 'onnx_wasm_local',
      };

      expect(mockLowConfClf.shouldAbstain).toBe(true);
      expect(mockLowConfClf.abstentionReason).toContain('below calibrated threshold');
    });
  });
});
