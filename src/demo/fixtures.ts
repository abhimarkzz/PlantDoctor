/**
 * ILLUSTRATIVE EXAMPLES ONLY
 * These fixtures are clearly labelled placeholders used to demonstrate the UI.
 * They are NOT real agricultural guidance, real citations, or real data.
 * Do not present these as actual recommendations.
 */

import type { AnswerResult, KnowledgePack, EvidenceStatus } from '../models/types';

export const DEMO_ANSWER: AnswerResult = {
  id: 'demo-001',
  query: 'What causes yellowing leaves on tomato plants?',
  summary:
    'Leaf yellowing in tomato plants can result from multiple factors including nutrient deficiencies (especially nitrogen and iron), overwatering, root disease, or environmental stress. A soil test and visual inspection of the pattern of yellowing would help narrow the cause.',
  overallStatus: 'context_incomplete',
  evidenceChunks: [
    {
      id: 'chunk-demo-001',
      sourceId: 'src-demo-001',
      source: {
        id: 'src-demo-001',
        identifier: 'DEMO-REF-0001',
        title: 'Illustrative Source — Tomato Nutrient Disorders (Placeholder)',
        authors: ['Example Author A', 'Example Author B'],
        publishedDate: '2023-01-15',
        url: null,
        institution: 'Placeholder Agricultural Institute',
        lastVerified: null,
      },
      text: 'Nitrogen deficiency typically presents as uniform yellowing of older, lower leaves first, progressing upward. Iron deficiency shows interveinal chlorosis on younger leaves.',
      status: 'applicable',
      relevanceScore: 0.92,
      pageOrSection: 'Chapter 4 — Nutrient Deficiency Symptoms',
    },
    {
      id: 'chunk-demo-002',
      sourceId: 'src-demo-002',
      source: {
        id: 'src-demo-002',
        identifier: 'DEMO-REF-0002',
        title: 'Illustrative Source — Root Diseases of Solanaceae (Placeholder)',
        authors: ['Example Author C'],
        publishedDate: '2021-06-01',
        url: null,
        institution: 'Placeholder University Extension',
        lastVerified: null,
      },
      text: 'Fusarium wilt and Verticillium wilt both cause yellowing, but typically affect one side of the plant or individual branches first.',
      status: 'freshness_unverified',
      relevanceScore: 0.78,
      pageOrSection: 'Section 2.3',
    },
    {
      id: 'chunk-demo-003',
      sourceId: 'src-demo-003',
      source: {
        id: 'src-demo-003',
        identifier: 'DEMO-REF-0003',
        title: 'Illustrative Source — Overwatering Effects (Placeholder)',
        authors: ['Example Author D'],
        publishedDate: '2022-09-10',
        url: null,
        institution: null,
        lastVerified: null,
      },
      text: 'Excessive soil moisture reduces root oxygen uptake, leading to generalized chlorosis and potential root rot.',
      status: 'conflicting_evidence',
      relevanceScore: 0.65,
      pageOrSection: null,
    },
  ],
  caveats: [
    'Without knowing your soil type, watering schedule, and regional climate, this guidance is general.',
    'A soil test is recommended before applying nutrient supplements.',
    'If disease is suspected, consult a local agricultural extension service.',
  ],
  generatedAt: new Date().toISOString(),
  isIllustrative: true,
};

export const DEMO_PACKS: KnowledgePack[] = [
  {
    id: 'pack-demo-001',
    name: 'Tropical Vegetable Crops',
    description: 'Common diseases, nutrient deficiencies, and pest management for tropical vegetables including tomato, pepper, okra, and eggplant.',
    version: '0.1.0-placeholder',
    region: 'Tropical / Sub-tropical',
    cropCategories: ['Tomato', 'Pepper', 'Okra', 'Eggplant'],
    sizeBytes: 12_500_000,
    sourceCount: 48,
    lastUpdated: '2024-03-15T00:00:00Z',
    lastSynced: null,
    lastVerified: null,
    status: 'available',
  },
  {
    id: 'pack-demo-002',
    name: 'Rice Paddy Management',
    description: 'Disease identification, water management, and nutrient timing for lowland and upland rice.',
    version: '0.1.0-placeholder',
    region: 'South & Southeast Asia',
    cropCategories: ['Rice'],
    sizeBytes: 8_200_000,
    sourceCount: 35,
    lastUpdated: '2024-01-20T00:00:00Z',
    lastSynced: null,
    lastVerified: null,
    status: 'available',
  },
  {
    id: 'pack-demo-003',
    name: 'Cereal Crop Basics',
    description: 'Introductory evidence on wheat, maize, and sorghum health management.',
    version: '0.1.0-placeholder',
    region: null,
    cropCategories: ['Wheat', 'Maize', 'Sorghum'],
    sizeBytes: 6_800_000,
    sourceCount: 22,
    lastUpdated: '2023-11-05T00:00:00Z',
    lastSynced: null,
    lastVerified: null,
    status: 'available',
  },
];

export function getEvidenceStatusExamples(): { status: EvidenceStatus; scenario: string }[] {
  return [
    { status: 'applicable', scenario: 'Evidence verified, context matches the user\'s region and crop.' },
    { status: 'context_incomplete', scenario: 'Soil type or climate zone was not specified by the user.' },
    { status: 'conflicting_evidence', scenario: 'Two peer-reviewed sources disagree on the recommended treatment.' },
    { status: 'freshness_unverified', scenario: 'Source was published 4 years ago and has not been re-checked.' },
    { status: 'insufficient_evidence', scenario: 'Fewer than 2 sources were found for this specific pest–crop combination.' },
  ];
}
