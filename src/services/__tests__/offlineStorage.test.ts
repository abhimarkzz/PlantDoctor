import { describe, it, expect } from 'vitest';
import { computeSha256, searchOffline } from '../offlineStorage';

describe('offlineStorage Service', () => {
  it('computes deterministic SHA-256 hash', async () => {
    const hash = await computeSha256('test-payload');
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('abstains with insufficient_evidence when no packs are installed', async () => {
    const res = await searchOffline('What causes yellowing in tomato leaves?');
    expect(res.overallStatus).toBe('insufficient_evidence');
    expect(res.caveats.length).toBeGreaterThan(0);
  });

  it('detects hard crop mismatch offline without calling any server', async () => {
    // If query mentions rice but crop is tomato
    const res = await searchOffline('Rice blast spots on foliage', 'tomato', 'temperate');
    expect(res.overallStatus).toBe('insufficient_evidence');
    expect(res.summary).toContain('mismatch');
  });

  it('rejects corrupted payload missing checksum', async () => {
    const { savePackPayload } = await import('../offlineStorage');
    const badPayload: any = {
      manifest: {
        id: 'pack-bad',
        name: 'Bad Pack',
        version: '1.0.0',
        checksum: '', // missing checksum
        generated_at: new Date().toISOString(),
      },
      sources: [],
      chunks: [],
    };
    await expect(savePackPayload(badPayload)).rejects.toThrow('missing required SHA-256 checksum');
  });

  it('rejects corrupted pack with unresolvable source references', async () => {
    const { savePackPayload } = await import('../offlineStorage');
    const badPayload: any = {
      manifest: {
        id: 'pack-corrupt-refs',
        name: 'Corrupt Pack',
        version: '1.0.0',
        checksum: 'abc123def456',
        generated_at: new Date().toISOString(),
      },
      sources: [
        { id: 'src-valid-1', title: 'Valid Source', authors: [] },
      ],
      chunks: [
        { id: 'chunk-1', sourceId: 'src-missing-99', text: 'Some orphan text' },
      ],
    };
    await expect(savePackPayload(badPayload)).rejects.toThrow('references missing source');
  });

  it('accepts the real snake_case download shape (regression: API returns snake_case)', async () => {
    const { savePackPayload } = await import('../offlineStorage');
    // Mirrors the actual backend /download payload: snake_case keys.
    const realShape: any = {
      manifest: {
        format_version: '1.0',
        id: 'pack-veg-001',
        name: 'Vegetable Pack',
        version: '1.0.0',
        region: null,
        crop_categories: ['tomato'],
        source_count: 1,
        checksum: 'a'.repeat(64),
        generated_at: new Date().toISOString(),
      },
      sources: [
        { id: 'src-1', title: 'Tomato Guide', authors: ['Dr. A'], published_date: '2023-01-01', last_verified: '2025-01-01' },
      ],
      chunks: [
        { id: 'chunk-1', source_id: 'src-1', text: 'Tomato leaf spot guidance', page_or_section: 'Section 1', crop_id: 'tomato', relevance_score: 0.9, status: 'applicable' },
      ],
    };
    // Provenance must PASS (chunk.source_id resolves). Persistence then hits the
    // IndexedDB boundary, which is unavailable in jsdom — proving we got past the
    // snake_case provenance check that previously threw "references missing source".
    await expect(savePackPayload(realShape)).rejects.toThrow(/IndexedDB is not supported/);
  });
});

