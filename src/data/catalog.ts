/**
 * Selection taxonomy for crops, regions, and growth stages.
 * Fully localized for English, Hindi, Telugu, and Tamil.
 */

import type { SupportedLanguage } from '../i18n/types';

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

const CROP_TRANSLATIONS: Record<string, Record<SupportedLanguage, { label: string; category: string }>> = {
  tomato: {
    en: { label: 'Tomato', category: 'Vegetable' },
    hi: { label: 'टमाटर', category: 'सब्जी' },
    te: { label: 'టమాటా', category: 'కూరగాయ' },
    ta: { label: 'தக்காளி', category: 'காய்கறி' },
  },
  pepper: {
    en: { label: 'Pepper / Chilli', category: 'Vegetable' },
    hi: { label: 'मिर्च', category: 'सब्जी' },
    te: { label: 'మిరప', category: 'కూరగాయ' },
    ta: { label: 'மிளகாய்', category: 'காய்கறி' },
  },
  okra: {
    en: { label: 'Okra / Bhindi', category: 'Vegetable' },
    hi: { label: 'भिंडी', category: 'सब्जी' },
    te: { label: 'బెండకాయ', category: 'కూరగాయ' },
    ta: { label: 'வெண்டைக்காய்', category: 'காய்கறி' },
  },
  eggplant: {
    en: { label: 'Eggplant / Brinjal', category: 'Vegetable' },
    hi: { label: 'बैंगन', category: 'सब्जी' },
    te: { label: 'వంకాయ', category: 'కూరగాయ' },
    ta: { label: 'கத்தரிக்காய்', category: 'காய்கறி' },
  },
  onion: {
    en: { label: 'Onion', category: 'Vegetable' },
    hi: { label: 'प्याज', category: 'सब्जी' },
    te: { label: 'ఉల్లిపాయ', category: 'కూరగాయ' },
    ta: { label: 'வெங்காயம்', category: 'காய்கறி' },
  },
  potato: {
    en: { label: 'Potato', category: 'Vegetable' },
    hi: { label: 'आलू', category: 'सब्जी' },
    te: { label: 'బంగాళాదుంప', category: 'కూరగాయ' },
    ta: { label: 'உருளைக்கிழங்கு', category: 'காய்கறி' },
  },
  rice: {
    en: { label: 'Rice / Paddy', category: 'Cereal' },
    hi: { label: 'चावल / धान', category: 'अनाज' },
    te: { label: 'వరి (వరి ధాన్యం)', category: 'ధాన్యం' },
    ta: { label: 'நெல்', category: 'தானியம்' },
  },
  wheat: {
    en: { label: 'Wheat', category: 'Cereal' },
    hi: { label: 'गेहूं', category: 'अनाज' },
    te: { label: 'గోధుమ', category: 'ధాన్యం' },
    ta: { label: 'கோதுமை', category: 'தானியம்' },
  },
  maize: {
    en: { label: 'Maize / Corn', category: 'Cereal' },
    hi: { label: 'मक्का', category: 'अनाज' },
    te: { label: 'మొక్కజొన్న', category: 'ధాన్యం' },
    ta: { label: 'மக்காச்சோளம்', category: 'தானியம்' },
  },
  sorghum: {
    en: { label: 'Sorghum / Jowar', category: 'Cereal' },
    hi: { label: 'ज्वार', category: 'अनाज' },
    te: { label: 'జొన్న', category: 'ధాన్యం' },
    ta: { label: 'சோளம்', category: 'தானியம்' },
  },
  banana: {
    en: { label: 'Banana / Plantain', category: 'Fruit' },
    hi: { label: 'केला', category: 'फल' },
    te: { label: 'అరటి', category: 'పండ్లు' },
    ta: { label: 'வாழை', category: 'பழம்' },
  },
  mango: {
    en: { label: 'Mango', category: 'Fruit' },
    hi: { label: 'आम', category: 'फल' },
    te: { label: 'మామిడి', category: 'పండ్లు' },
    ta: { label: 'மாம்பழம்', category: 'பழம்' },
  },
  citrus: {
    en: { label: 'Citrus / Lemon', category: 'Fruit' },
    hi: { label: 'नींबू / संतरा', category: 'फल' },
    te: { label: 'నిమ్మ / బత్తాయి', category: 'పండ్లు' },
    ta: { label: 'எலுமிச்சை / சிட்ரஸ்', category: 'பழம்' },
  },
  coffee: {
    en: { label: 'Coffee', category: 'Cash crop' },
    hi: { label: 'कॉफ़ी', category: 'नकदी फसल' },
    te: { label: 'కాఫీ', category: 'వాణిజ్య పంట' },
    ta: { label: 'காபி', category: 'பணப்பயிர்' },
  },
  cotton: {
    en: { label: 'Cotton', category: 'Cash crop' },
    hi: { label: 'कपास', category: 'नकदी फसल' },
    te: { label: 'పత్తి', category: 'వాణిజ్య పంట' },
    ta: { label: 'பருத்தி', category: 'பணப்பயிர்' },
  },
  other: {
    en: { label: 'Other / Not listed', category: 'Other' },
    hi: { label: 'अन्य फसल', category: 'अन्य' },
    te: { label: 'ఇతర పంట', category: 'ఇతర' },
    ta: { label: 'பிற பயிர்', category: 'பிற' },
  },
};

const REGION_TRANSLATIONS: Record<string, Record<SupportedLanguage, string>> = {
  tropical: {
    en: 'Tropical',
    hi: 'उष्णकटिबंधीय (Tropical)',
    te: 'ఉష్ణమండల (Tropical)',
    ta: 'வெப்பமண்டல (Tropical)',
  },
  subtropical: {
    en: 'Sub-tropical',
    hi: 'उपोष्णकटिबंधीय (Sub-tropical)',
    te: 'ఉప ఉష్ణమండల (Sub-tropical)',
    ta: 'மிதவெப்பமண்டல (Sub-tropical)',
  },
  arid: {
    en: 'Arid / Semi-arid',
    hi: 'शुष्क / अर्ध-शुष्क (Arid)',
    te: 'శుష్క / అర్ధ-శుష్క (Arid)',
    ta: 'வறண்ட பகுதி (Arid)',
  },
  temperate: {
    en: 'Temperate',
    hi: 'समशीतोष्ण (Temperate)',
    te: 'సమశీతోష్ణ (Temperate)',
    ta: 'மிதமான காலநிலை (Temperate)',
  },
  highland: {
    en: 'Highland / Montane',
    hi: 'पहाड़ी क्षेत्र (Highland)',
    te: 'పర్వత ప్రాంతం (Highland)',
    ta: 'மலைப்பகுதி (Highland)',
  },
  mediterranean: {
    en: 'Mediterranean',
    hi: 'भूमध्यसागरीय (Mediterranean)',
    te: 'మధ్యధరా ప్రాంతం (Mediterranean)',
    ta: 'மத்திய தரைக்கடல் (Mediterranean)',
  },
  other: {
    en: 'Other / Not sure',
    hi: 'अन्य / अनिश्चित',
    te: 'ఇతర / తెలియదు',
    ta: 'பிற / தெரியவில்லை',
  },
};

const GROWTH_STAGE_TRANSLATIONS: Record<string, Record<SupportedLanguage, string>> = {
  seedling: {
    en: 'Seedling / Germination',
    hi: 'अंकुरण / पौध अवस्था (Seedling)',
    te: 'మొలక / నారు దశ (Seedling)',
    ta: 'நாற்று பருவம் (Seedling)',
  },
  vegetative: {
    en: 'Vegetative growth',
    hi: 'कायिक वृद्धि अवस्था (Vegetative)',
    te: 'శాకీయ పెరుగుదల దశ (Vegetative)',
    ta: 'வளர்ச்சி பருவம் (Vegetative)',
  },
  flowering: {
    en: 'Flowering',
    hi: 'फूल आने की अवस्था (Flowering)',
    te: 'పూత దశ (Flowering)',
    ta: 'பூக்கும் பருவம் (Flowering)',
  },
  fruiting: {
    en: 'Fruiting / Grain fill',
    hi: 'फल / दाने बनने की अवस्था (Fruiting)',
    te: 'కాయ / గింజ దశ (Fruiting)',
    ta: 'காய் / தானிய பருவம் (Fruiting)',
  },
  maturity: {
    en: 'Maturity / Harvest',
    hi: 'परिपक्वता / कटाई अवस्था (Maturity)',
    te: 'కోత / పక్వత దశ (Harvest)',
    ta: 'அறுவடை பருவம் (Harvest)',
  },
};

export const CROPS: CropOption[] = Object.entries(CROP_TRANSLATIONS).map(([id, t]) => ({
  id,
  label: t.en.label,
  category: t.en.category,
}));

export const REGIONS: RegionOption[] = Object.entries(REGION_TRANSLATIONS).map(([id, t]) => ({
  id,
  label: t.en,
}));

export const GROWTH_STAGES: GrowthStageOption[] = Object.entries(GROWTH_STAGE_TRANSLATIONS).map(([id, t]) => ({
  id,
  label: t.en,
}));

export function getCrops(lang: SupportedLanguage = 'en'): CropOption[] {
  return Object.entries(CROP_TRANSLATIONS).map(([id, t]) => {
    const entry = t[lang] || t.en;
    return {
      id,
      label: entry.label,
      category: entry.category,
    };
  });
}

export function getRegions(lang: SupportedLanguage = 'en'): RegionOption[] {
  return Object.entries(REGION_TRANSLATIONS).map(([id, t]) => ({
    id,
    label: t[lang] || t.en,
  }));
}

export function getGrowthStages(lang: SupportedLanguage = 'en'): GrowthStageOption[] {
  return Object.entries(GROWTH_STAGE_TRANSLATIONS).map(([id, t]) => ({
    id,
    label: t[lang] || t.en,
  }));
}

export function cropLabel(id: string | null, lang: SupportedLanguage = 'en'): string | null {
  if (!id) return null;
  const entry = CROP_TRANSLATIONS[id];
  if (!entry) return null;
  return (entry[lang] || entry.en).label;
}

export function regionLabel(id: string | null, lang: SupportedLanguage = 'en'): string | null {
  if (!id) return null;
  const entry = REGION_TRANSLATIONS[id];
  if (!entry) return null;
  return entry[lang] || entry.en;
}

export function growthStageLabel(id: string | null, lang: SupportedLanguage = 'en'): string | null {
  if (!id) return null;
  const entry = GROWTH_STAGE_TRANSLATIONS[id];
  if (!entry) return null;
  return entry[lang] || entry.en;
}
