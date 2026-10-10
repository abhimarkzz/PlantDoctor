import type { PlantDoctorService } from './types';
import type { AnswerResult, KnowledgePack, Question } from '../models/types';
import { DEMO_ANSWER, DEMO_PACKS } from '../demo/fixtures';
import { cropLabel, regionLabel, growthStageLabel } from '../data/catalog';
import { BackendUnavailableError } from '../api/client';

/**
 * Explicitly labelled DEMONSTRATION adapter.
 *
 * Every result it returns carries `isIllustrative: true`, so the UI always
 * marks it as non-real. It never claims to have verified a source, never
 * writes to a database, and never reports a successful download. It exists
 * only to demonstrate the interface shape and the UI states.
 */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const demoService: PlantDoctorService = {
  kind: 'demo',

  async ask(question: Question): Promise<AnswerResult> {
    await delay(600);

    const contextBits = [
      cropLabel(question.cropId),
      regionLabel(question.regionId),
      growthStageLabel(question.growthStageId),
    ].filter(Boolean);

    const contextNote = contextBits.length
      ? ` Context provided: ${contextBits.join(', ')}.`
      : ' No crop/region context was provided, which limits applicability.';

    return {
      ...DEMO_ANSWER,
      id: DEMO_ANSWER.id,
      query: question.query,
      summary: `${DEMO_ANSWER.summary}${contextNote}`,
      isIllustrative: true,
      generatedAt: new Date().toISOString(),
    };
  },

  async getAnswer(id: string): Promise<AnswerResult> {
    await delay(200);
    if (id === DEMO_ANSWER.id) return { ...DEMO_ANSWER, generatedAt: new Date().toISOString() };
    throw new BackendUnavailableError();
  },

  async listPacks(): Promise<KnowledgePack[]> {
    await delay(300);
    return DEMO_PACKS;
  },

  async getPack(id: string): Promise<KnowledgePack> {
    await delay(200);
    const pack = DEMO_PACKS.find((p) => p.id === id);
    if (!pack) throw new BackendUnavailableError();
    return pack;
  },
};
