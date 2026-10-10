import type { AnswerResult, EvidenceChunk, HealthResponse, KnowledgePack, Source } from '../models/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class BackendUnavailableError extends Error {
  constructor(message = 'Backend is not connected') {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

export class DeviceOfflineError extends Error {
  constructor(message = 'Device is offline. Network requests cannot be completed.') {
    super(message);
    this.name = 'DeviceOfflineError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new DeviceOfflineError();
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new DeviceOfflineError();
    }
    throw new BackendUnavailableError();
  }

  if (!res.ok) {
    const body = await res.text().catch(() => null);
    throw new ApiError(`HTTP ${res.status}`, res.status, body);
  }

  return res.json() as Promise<T>;
}

/** Check if the backend API is reachable */
export async function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

export interface AskQuestionOptions {
  cropId?: string | null;
  regionId?: string | null;
  growthStageId?: string | null;
  imageFile?: File;
  language?: string;
}

export interface PackDownloadPayload {
  pack: KnowledgePack;
  sources: Source[];
  chunks: EvidenceChunk[];
}

/** Submit a question to the Plant Doctor with complete context */
export async function askQuestion(
  query: string,
  options?: AskQuestionOptions | File
): Promise<AnswerResult> {
  const opts: AskQuestionOptions =
    options instanceof File ? { imageFile: options } : options ?? {};

  if (opts.imageFile) {
    const formData = new FormData();
    formData.append('query', query);
    formData.append('image', opts.imageFile);
    if (opts.cropId) formData.append('cropId', opts.cropId);
    if (opts.regionId) formData.append('regionId', opts.regionId);
    if (opts.growthStageId) formData.append('growthStageId', opts.growthStageId);
    if (opts.language) formData.append('language', opts.language);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new DeviceOfflineError();
    }

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/v1/ask`, {
        method: 'POST',
        body: formData,
      });
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new DeviceOfflineError();
      }
      throw new BackendUnavailableError();
    }

    if (!res.ok) {
      const body = await res.text().catch(() => null);
      throw new ApiError(`HTTP ${res.status}`, res.status, body);
    }

    return res.json() as Promise<AnswerResult>;
  }

  return request<AnswerResult>('/api/v1/ask', {
    method: 'POST',
    body: JSON.stringify({
      query,
      cropId: opts.cropId,
      regionId: opts.regionId,
      growthStageId: opts.growthStageId,
      language: opts.language ?? 'en',
    }),
  });
}

/** Get a previously generated answer by ID */
export async function getAnswer(id: string): Promise<AnswerResult> {
  return request<AnswerResult>(`/api/v1/answers/${encodeURIComponent(id)}`);
}

/** List available knowledge packs */
export async function listKnowledgePacks(): Promise<KnowledgePack[]> {
  return request<KnowledgePack[]>('/api/v1/packs');
}

/** Get details of a single knowledge pack */
export async function getKnowledgePack(id: string): Promise<KnowledgePack> {
  return request<KnowledgePack>(`/api/v1/packs/${encodeURIComponent(id)}`);
}

/** Download complete knowledge pack with manifest, sources, and passages for offline use */
export async function downloadKnowledgePackPayload(packId: string): Promise<PackDownloadPayload> {
  return request<PackDownloadPayload>(`/api/v1/packs/${encodeURIComponent(packId)}/download`);
}
