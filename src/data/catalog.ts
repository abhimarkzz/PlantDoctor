/**
 * Selection taxonomy for crops, regions, and growth stages.
 * These are UI option lists (taxonomy), not fabricated claims or data.
 */

export interface CropOption {
  id: string;
  label: string;
  category: string;
}

export interface RegionOption {
  id: string;
  label: string;
}

export interface GrowthStageOption {
  id: string;
  label: string;
}

export const CROPS: CropOption[] = [
  { id: 'tomato', label: 'Tomato', category: 'Vegetable' },
  { id: 'pepper', label: 'Pepper / Chilli', category: 'Vegetable' },
  { id: 'okra', label: 'Okra', category: 'Vegetable' },
  { id: 'eggplant', label: 'Eggplant / Brinjal', category: 'Vegetable' },
  { id: 'onion', label: 'Onion', category: 'Vegetable' },
  { id: 'potato', label: 'Potato', category: 'Vegetable' },
  { id: 'rice', label: 'Rice', category: 'Cereal' },
  { id: 'wheat', label: 'Wheat', category: 'Cereal' },
  { id: 'maize', label: 'Maize / Corn', category: 'Cereal' },
  { id: 'sorghum', label: 'Sorghum', category: 'Cereal' },
  { id: 'banana', label: 'Banana / Plantain', category: 'Fruit' },
  { id: 'mango', label: 'Mango', category: 'Fruit' },
  { id: 'citrus', label: 'Citrus', category: 'Fruit' },
  { id: 'coffee', label: 'Coffee', category: 'Cash crop' },
  { id: 'cotton', label: 'Cotton', category: 'Cash crop' },
  { id: 'other', label: 'Other / Not listed', category: 'Other' },
];

export const REGIONS: RegionOption[] = [
  { id: 'tropical', label: 'Tropical' },
  { id: 'subtropical', label: 'Sub-tropical' },
  { id: 'arid', label: 'Arid / Semi-arid' },
  { id: 'temperate', label: 'Temperate' },
  { id: 'highland', label: 'Highland / Montane' },
  { id: 'mediterranean', label: 'Mediterranean' },
  { id: 'other', label: 'Other / Not sure' },
];

export const GROWTH_STAGES: GrowthStageOption[] = [
  { id: 'seedling', label: 'Seedling / Germination' },
  { id: 'vegetative', label: 'Vegetative growth' },
  { id: 'flowering', label: 'Flowering' },
  { id: 'fruiting', label: 'Fruiting / Grain fill' },
  { id: 'maturity', label: 'Maturity / Harvest' },
];

export function cropLabel(id: string | null): string | null {
  return CROPS.find((c) => c.id === id)?.label ?? null;
}

export function regionLabel(id: string | null): string | null {
  return REGIONS.find((r) => r.id === id)?.label ?? null;
}

export function growthStageLabel(id: string | null): string | null {
  return GROWTH_STAGES.find((g) => g.id === id)?.label ?? null;
}
