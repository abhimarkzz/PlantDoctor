import type { AnswerResult, HealthResponse, KnowledgePack } from '../models/types';

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
  constructor() {
    super('Backend is not connected');
    this.name = 'BackendUnavailableError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

/** Submit a question to the Plant Doctor */
export async function askQuestion(query: string, imageFile?: File): Promise<AnswerResult> {
  if (imageFile) {
    // When image support exists, this will use FormData
    const formData = new FormData();
    formData.append('query', query);
    formData.append('image', imageFile);

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/v1/ask`, {
        method: 'POST',
        body: formData,
      });
    } catch {
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
    body: JSON.stringify({ query }),
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
