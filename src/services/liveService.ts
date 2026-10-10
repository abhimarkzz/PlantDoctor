import type { PlantDoctorService } from './types';
import type { AnswerResult, KnowledgePack, Question } from '../models/types';
import { askQuestion, getAnswer, listKnowledgePacks, getKnowledgePack } from '../api/client';

/**
 * Live adapter backed by the FastAPI REST client.
 * This is the adapter that will be used once the backend exists.
 * It performs NO fabrication — if the backend is unreachable, the
 * underlying client throws BackendUnavailableError and the UI reacts.
 */
export const liveService: PlantDoctorService = {
  kind: 'live',

  ask(question: Question, image?: File): Promise<AnswerResult> {
    return askQuestion(question.query, image);
  },

  getAnswer(id: string): Promise<AnswerResult> {
    return getAnswer(id);
  },

  listPacks(): Promise<KnowledgePack[]> {
    return listKnowledgePacks();
  },

  getPack(id: string): Promise<KnowledgePack> {
    return getKnowledgePack(id);
  },
};
