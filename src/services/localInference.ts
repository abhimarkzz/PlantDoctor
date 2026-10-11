/**
 * On-Device Plant Disease Image Classification using onnxruntime-web (WebAssembly).
 * Runs completely locally inside the browser with ZERO remote network requests.
 */

// Import the wasm-only entry (not the default, which also bundles the large
// WebGPU/JSEP wasm). We only use the 'wasm' execution provider, so this avoids
// emitting a ~27 MiB asset that exceeds Cloudflare Pages' 25 MiB/file limit.
import * as ort from 'onnxruntime-web/wasm';
import { getModelArrayBuffer } from './offlineStorage';

// Configure onnxruntime-web for maximum compatibility on mobile devices
if (typeof window !== 'undefined') {
  ort.env.wasm.wasmPaths = '/ort/';
  ort.env.wasm.numThreads = 1; // Single thread avoids SharedArrayBuffer cross-origin isolation restrictions
}

export interface CandidatePrediction {
  label: string;
  crop: string;
  condition: string;
  probability: number;
  isHealthy: boolean;
}

export interface LocalClassificationResult {
  label: string;
  cropId: string;
  conditionId: string;
  conditionName: string;
  confidence: number;
  isHealthy: boolean;
  shouldAbstain: boolean;
  abstentionReason: string | null;
  suggestedQuery: string;
  topCandidates: CandidatePrediction[];
  runtime: 'onnx_wasm_local';
}

/** 38-class PlantVillage taxonomy mapping verified against MobileNetV2 ONNX model */
export const PLANT_VILLAGE_TAXONOMY: Record<number, { label: string; crop: string; condition: string; healthy: boolean }> = {
  0: { label: 'Apple Scab', crop: 'apple', condition: 'Apple Scab (Venturia inaequalis)', healthy: false },
  1: { label: 'Apple with Black Rot', crop: 'apple', condition: 'Black Rot (Botryosphaeria obtusa)', healthy: false },
  2: { label: 'Cedar Apple Rust', crop: 'apple', condition: 'Cedar Apple Rust (Gymnosporangium juniperi-virginianae)', healthy: false },
  3: { label: 'Healthy Apple', crop: 'apple', condition: 'Healthy Foliage', healthy: true },
  4: { label: 'Healthy Blueberry Plant', crop: 'blueberry', condition: 'Healthy Foliage', healthy: true },
  5: { label: 'Cherry with Powdery Mildew', crop: 'cherry', condition: 'Powdery Mildew (Podosphaera clandestina)', healthy: false },
  6: { label: 'Healthy Cherry Plant', crop: 'cherry', condition: 'Healthy Foliage', healthy: true },
  7: { label: 'Corn (Maize) with Cercospora and Gray Leaf Spot', crop: 'corn', condition: 'Gray Leaf Spot (Cercospora zeae-maydis)', healthy: false },
  8: { label: 'Corn (Maize) with Common Rust', crop: 'corn', condition: 'Common Rust (Puccinia sorghi)', healthy: false },
  9: { label: 'Corn (Maize) with Northern Leaf Blight', crop: 'corn', condition: 'Northern Leaf Blight (Exserohilum turcicum)', healthy: false },
  10: { label: 'Healthy Corn (Maize) Plant', crop: 'corn', condition: 'Healthy Foliage', healthy: true },
  11: { label: 'Grape with Black Rot', crop: 'grape', condition: 'Black Rot (Guignardia bidwellii)', healthy: false },
  12: { label: 'Grape with Esca (Black Measles)', crop: 'grape', condition: 'Esca / Black Measles', healthy: false },
  13: { label: 'Grape with Isariopsis Leaf Spot', crop: 'grape', condition: 'Leaf Spot (Phaeoisariopsis clavispora)', healthy: false },
  14: { label: 'Healthy Grape Plant', crop: 'grape', condition: 'Healthy Foliage', healthy: true },
  15: { label: 'Orange with Citrus Greening', crop: 'orange', condition: 'Citrus Greening (Huanglongbing)', healthy: false },
  16: { label: 'Peach with Bacterial Spot', crop: 'peach', condition: 'Bacterial Spot (Xanthomonas campestris pv. pruni)', healthy: false },
  17: { label: 'Healthy Peach Plant', crop: 'peach', condition: 'Healthy Foliage', healthy: true },
  18: { label: 'Bell Pepper with Bacterial Spot', crop: 'pepper', condition: 'Bacterial Spot (Xanthomonas campestris pv. vesicatoria)', healthy: false },
  19: { label: 'Healthy Bell Pepper Plant', crop: 'pepper', condition: 'Healthy Foliage', healthy: true },
  20: { label: 'Potato with Early Blight', crop: 'potato', condition: 'Early Blight (Alternaria solani)', healthy: false },
  21: { label: 'Potato with Late Blight', crop: 'potato', condition: 'Late Blight (Phytophthora infestans)', healthy: false },
  22: { label: 'Healthy Potato Plant', crop: 'potato', condition: 'Healthy Foliage', healthy: true },
  23: { label: 'Healthy Raspberry Plant', crop: 'raspberry', condition: 'Healthy Foliage', healthy: true },
  24: { label: 'Healthy Soybean Plant', crop: 'soybean', condition: 'Healthy Foliage', healthy: true },
  25: { label: 'Squash with Powdery Mildew', crop: 'squash', condition: 'Powdery Mildew (Podosphaera xanthii)', healthy: false },
  26: { label: 'Strawberry with Leaf Scorch', crop: 'strawberry', condition: 'Leaf Scorch (Diplocarpon earlianum)', healthy: false },
  27: { label: 'Healthy Strawberry Plant', crop: 'strawberry', condition: 'Healthy Foliage', healthy: true },
  28: { label: 'Tomato with Bacterial Spot', crop: 'tomato', condition: 'Bacterial Spot (Xanthomonas campestris pv. vesicatoria)', healthy: false },
  29: { label: 'Tomato with Early Blight', crop: 'tomato', condition: 'Early Blight (Alternaria solani)', healthy: false },
  30: { label: 'Tomato with Late Blight', crop: 'tomato', condition: 'Late Blight (Phytophthora infestans)', healthy: false },
  31: { label: 'Tomato with Leaf Mold', crop: 'tomato', condition: 'Leaf Mold (Passalora fulva)', healthy: false },
  32: { label: 'Tomato with Septoria Leaf Spot', crop: 'tomato', condition: 'Septoria Leaf Spot (Septoria lycopersici)', healthy: false },
  33: { label: 'Tomato with Spider Mites or Two-spotted Spider Mite', crop: 'tomato', condition: 'Two-Spotted Spider Mite (Tetranychus urticae)', healthy: false },
  34: { label: 'Tomato with Target Spot', crop: 'tomato', condition: 'Target Spot (Corynespora cassiicola)', healthy: false },
  35: { label: 'Tomato Yellow Leaf Curl Virus', crop: 'tomato', condition: 'Tomato Yellow Leaf Curl Virus (TYLCV)', healthy: false },
  36: { label: 'Tomato Mosaic Virus', crop: 'tomato', condition: 'Tomato Mosaic Virus (ToMV)', healthy: false },
  37: { label: 'Healthy Tomato Plant', crop: 'tomato', condition: 'Healthy Foliage', healthy: true },
};

let activeSession: ort.InferenceSession | null = null;
let sessionLoadingPromise: Promise<ort.InferenceSession | null> | null = null;

/**
 * Loads and reuses the on-device ONNX inference session.
 */
export async function getLocalInferenceSession(): Promise<ort.InferenceSession | null> {
  if (activeSession) return activeSession;
  if (sessionLoadingPromise) return sessionLoadingPromise;

  sessionLoadingPromise = (async () => {
    try {
      const buffer = await getModelArrayBuffer();
      if (!buffer || buffer.byteLength === 0) {
        return null;
      }

      const session = await ort.InferenceSession.create(buffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      activeSession = session;
      return session;
    } catch (err) {
      console.warn('Failed to initialize onnxruntime-web session:', err);
      return null;
    } finally {
      sessionLoadingPromise = null;
    }
  })();

  return sessionLoadingPromise;
}

/** Resets the local ONNX inference session (e.g. after model removal or replacement) */
export function resetLocalInferenceSession(): void {
  activeSession = null;
  sessionLoadingPromise = null;
}

/**
 * Preprocesses an image File into a 1x3x224x224 float32 tensor using offscreen HTMLCanvas.
 * Performs validated quality checks (detecting underexposed, washed-out, or flat frames).
 */
export async function preprocessImageForInference(imageFile: File | Blob): Promise<{
  tensor: ort.Tensor | null;
  qualityError: string | null;
}> {
  if (typeof document === 'undefined') {
    return { tensor: null, qualityError: 'Canvas environment not available.' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      if (origW < 40 || origH < 40) {
        resolve({
          tensor: null,
          qualityError: 'Image resolution is too low (<40px) to distinguish botanical symptoms.',
        });
        return;
      }

      // Calculate resize dimensions (shortest edge 256)
      let targetW = 256;
      let targetH = 256;
      if (origW < origH) {
        targetW = 256;
        targetH = Math.round((origH * 256) / origW);
      } else {
        targetH = 256;
        targetW = Math.round((origW * 256) / origH);
      }

      // Draw resized image on canvas
      const canvas = document.createElement('canvas');
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ tensor: null, qualityError: 'Failed to obtain 2D canvas context.' });
        return;
      }

      // Center crop 224x224
      const left = Math.round((targetW - 224) / 2);
      const top = Math.round((targetH - 224) / 2);

      // Create temporary canvas for initial resize
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetW;
      tempCanvas.height = targetH;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        resolve({ tensor: null, qualityError: 'Failed to obtain temporary canvas context.' });
        return;
      }

      tempCtx.drawImage(img, 0, 0, targetW, targetH);
      ctx.drawImage(tempCanvas, left, top, 224, 224, 0, 0, 224, 224);

      const imgData = ctx.getImageData(0, 0, 224, 224);
      const rawPixels = imgData.data;

      // Quality evaluation: mean luminance and pixel variance
      let sumLuminance = 0;
      let sumSqLuminance = 0;
      const pixelCount = 224 * 224;

      for (let i = 0; i < pixelCount; i++) {
        const r = rawPixels[i * 4];
        const g = rawPixels[i * 4 + 1];
        const b = rawPixels[i * 4 + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        sumLuminance += lum;
        sumSqLuminance += lum * lum;
      }

      const meanLum = sumLuminance / pixelCount;
      const variance = sumSqLuminance / pixelCount - meanLum * meanLum;
      const stdLum = Math.sqrt(Math.max(0, variance));

      if (stdLum < 10.0 || meanLum < 15.0 || meanLum > 242.0) {
        resolve({
          tensor: null,
          qualityError:
            'Image is uninformative, extremely dark, or overexposed. Please capture a clear, well-lit photo of the foliage.',
        });
        return;
      }

      // Normalize to float32 tensor (NCHW: [1, 3, 224, 224], rescale 1/255, mean 0.5, std 0.5)
      const float32Data = new Float32Array(3 * 224 * 224);
      const channelSize = 224 * 224;

      for (let i = 0; i < channelSize; i++) {
        const r = rawPixels[i * 4] / 255.0;
        const g = rawPixels[i * 4 + 1] / 255.0;
        const b = rawPixels[i * 4 + 2] / 255.0;

        float32Data[i] = (r - 0.5) / 0.5; // Red channel
        float32Data[channelSize + i] = (g - 0.5) / 0.5; // Green channel
        float32Data[2 * channelSize + i] = (b - 0.5) / 0.5; // Blue channel
      }

      const tensor = new ort.Tensor('float32', float32Data, [1, 3, 224, 224]);
      resolve({ tensor, qualityError: null });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ tensor: null, qualityError: 'Failed to decode image file.' });
    };

    img.src = url;
  });
}

/**
 * Runs genuine on-device local plant disease classification over an uploaded photo.
 */
export async function classifyPlantPhotoLocally(imageFile: File | Blob): Promise<LocalClassificationResult> {
  const session = await getLocalInferenceSession();
  if (!session) {
    throw new Error('On-device plant diagnosis model is not installed or failed to initialize.');
  }

  // Preprocess image
  const { tensor, qualityError } = await preprocessImageForInference(imageFile);
  if (qualityError || !tensor) {
    return {
      label: 'Uninformative Image',
      cropId: 'unknown',
      conditionId: 'uninformative',
      conditionName: 'Image Quality Warning',
      confidence: 0.0,
      isHealthy: false,
      shouldAbstain: true,
      abstentionReason: qualityError || 'Unable to analyze image.',
      suggestedQuery: 'Plant disease identification',
      topCandidates: [],
      runtime: 'onnx_wasm_local',
    };
  }

  // Run onnxruntime inference
  const feeds: Record<string, ort.Tensor> = { pixel_values: tensor };
  const outputMap = await session.run(feeds);
  const outputTensor = outputMap.logits || outputMap[session.outputNames[0]];

  if (!outputTensor) {
    throw new Error('Local ONNX inference did not return logits.');
  }

  const logits = outputTensor.data as Float32Array;
  const numClasses = logits.length;

  // Softmax
  let maxLogit = -Infinity;
  for (let i = 0; i < numClasses; i++) {
    if (logits[i] > maxLogit) maxLogit = logits[i];
  }

  let sumExp = 0;
  const expVals = new Float32Array(numClasses);
  for (let i = 0; i < numClasses; i++) {
    expVals[i] = Math.exp(logits[i] - maxLogit);
    sumExp += expVals[i];
  }

  const probs = new Float32Array(numClasses);
  let entropy = 0;
  for (let i = 0; i < numClasses; i++) {
    probs[i] = expVals[i] / sumExp;
    if (probs[i] > 1e-12) {
      entropy -= probs[i] * Math.log(probs[i]);
    }
  }

  // Sort candidate indices
  const indices = Array.from({ length: numClasses }, (_, i) => i);
  indices.sort((a, b) => probs[b] - probs[a]);

  const topIdx = indices[0];
  const topConfidence = probs[topIdx];
  const topItem = PLANT_VILLAGE_TAXONOMY[topIdx] || {
    label: `Class ${topIdx}`,
    crop: 'unknown',
    condition: 'Plant Condition',
    healthy: false,
  };

  const topCandidates: CandidatePrediction[] = indices.slice(0, 3).map((idx) => {
    const item = PLANT_VILLAGE_TAXONOMY[idx] || {
      label: `Class ${idx}`,
      crop: 'unknown',
      condition: 'Unknown Condition',
      healthy: false,
    };
    return {
      label: item.label,
      crop: item.crop,
      condition: item.condition,
      probability: Math.round(probs[idx] * 1000) / 1000,
      isHealthy: item.healthy,
    };
  });

  // Safe abstention threshold
  let shouldAbstain = false;
  let abstentionReason: string | null = null;
  if (topConfidence < 0.20 || entropy > 3.2) {
    shouldAbstain = true;
    abstentionReason = `Local model confidence (${(topConfidence * 100).toFixed(1)}%) is below calibrated threshold (20%). Symptom pattern is ambiguous or unsupported.`;
  }

  const suggestedQuery = topItem.healthy
    ? `${topItem.crop} healthy plant maintenance agronomic practices`
    : `${topItem.crop} ${topItem.condition} symptoms cause management control`;

  return {
    label: topItem.label,
    cropId: topItem.crop,
    conditionId: topItem.label.toLowerCase().replace(/\s+/g, '_'),
    conditionName: topItem.condition,
    confidence: Math.round(topConfidence * 1000) / 1000,
    isHealthy: topItem.healthy,
    shouldAbstain,
    abstentionReason,
    suggestedQuery,
    topCandidates,
    runtime: 'onnx_wasm_local',
  };
}
