import { describe, it, expect } from 'vitest';
import { demoService } from '../demoService';
import type { Question } from '../../models/types';

describe('demoService', () => {
  const baseQuestion: Question = {
    query: 'Why are my tomato leaves yellowing?',
    cropId: 'tomato',
    regionId: 'tropical',
    growthStageId: 'fruiting',
    hasImage: false,
  };

  it('always returns an illustrative result', async () => {
    const result = await demoService.ask(baseQuestion);
    expect(result.isIllustrative).toBe(true);
  });

  it('echoes the user query and includes provided context', async () => {
    const result = await demoService.ask(baseQuestion);
    expect(result.query).toBe(baseQuestion.query);
    expect(result.summary).toMatch(/Tomato/);
    expect(result.summary).toMatch(/Tropical/);
  });

  it('notes missing context when none is provided', async () => {
    const result = await demoService.ask({
      ...baseQuestion,
      cropId: null,
      regionId: null,
      growthStageId: null,
    });
    expect(result.summary).toMatch(/No crop\/region context/);
  });

  it('lists illustrative packs', async () => {
    const packs = await demoService.listPacks();
    expect(packs.length).toBeGreaterThan(0);
    expect(packs[0].lastSynced).toBeNull();
  });

  it('identifies as the demo adapter', () => {
    expect(demoService.kind).toBe('demo');
  });
});
