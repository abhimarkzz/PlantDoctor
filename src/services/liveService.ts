import type { PlantDoctorService } from './types';
import type { AnswerResult, KnowledgePack, Question } from '../models/types';
import {
  askQuestion,
  getAnswer,
  listKnowledgePacks,
  getKnowledgePack,
  downloadKnowledgePackPayload,
} from '../api/client';
import {
  listInstalledPacks,
  getInstalledPack,
  savePackPayload,
  removeInstalledPack,
  searchOffline,
} from './offlineStorage';

/**
 * Live adapter backed by the FastAPI REST backend and client-side IndexedDB offline store.
 * Performs real vector/hybrid queries when online, and searches validated offline
 * knowledge packs when disconnected.
 */
export const liveService: PlantDoctorService = {
  kind: 'live',

  async ask(question: Question, image?: File): Promise<AnswerResult> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return searchOffline(question.query, question.cropId, question.regionId);
    }
    return askQuestion(question.query, {
      cropId: question.cropId,
      regionId: question.regionId,
      growthStageId: question.growthStageId,
      imageFile: image,
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
