import type { AnswerResult, KnowledgePack, Question } from '../models/types';

/**
 * The service boundary. Pages depend ONLY on this interface, never on a
 * concrete transport. To connect the real FastAPI backend later, implement
 * this interface in `liveService.ts` and swap the export in `index.ts` —
 * no page component needs to change.
 */
export interface PlantDoctorService {
  /** Human-readable label for the active adapter (shown in the UI). */
  readonly kind: 'demo' | 'live';

  /** Submit a structured question and receive an evidence-grounded result. */
  ask(question: Question, image?: File): Promise<AnswerResult>;

  /** Retrieve a previously generated answer by id. */
  getAnswer(id: string): Promise<AnswerResult>;

  /** List knowledge packs that genuinely exist in storage. */
  listPacks(): Promise<KnowledgePack[]>;

  /** Retrieve a single pack by id. */
  getPack(id: string): Promise<KnowledgePack>;

  /** Download a knowledge pack for offline use and persist in IndexedDB. */
  downloadPack?(id: string): Promise<void>;

  /** Remove an installed pack from local device storage. */
  removePack?(id: string): Promise<void>;
}
