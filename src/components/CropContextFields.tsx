import { useMemo } from 'react';
import { Select } from './Select';
import { getCrops, getRegions, getGrowthStages } from '../data/catalog';
import { useTranslation } from '../i18n/LanguageContext';

export interface CropContext {
  cropId: string | null;
  regionId: string | null;
  growthStageId: string | null;
}

interface Props {
  value: CropContext;
  onChange: (next: CropContext) => void;
  requireCropRegion?: boolean;
  layout?: 'grid' | 'stack';
}

export function CropContextFields({ value, onChange, requireCropRegion = false, layout = 'grid' }: Props) {
  const { language, t } = useTranslation();

  const crops = useMemo(() => getCrops(language), [language]);
  const regions = useMemo(() => getRegions(language), [language]);
  const growthStages = useMemo(() => getGrowthStages(language), [language]);

  const wrapperClass =
    layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-3 gap-4' : 'space-y-4';

  return (
    <div className={wrapperClass}>
      <Select
        label={t.cropLabel}
        value={value.cropId}
        onChange={(cropId) => onChange({ ...value, cropId })}
        options={crops}
        required={requireCropRegion}
        placeholder={t.selectCropOptional}
      />
      <Select
        label={t.regionLabel}
        value={value.regionId}
        onChange={(regionId) => onChange({ ...value, regionId })}
        options={regions}
        required={requireCropRegion}
        placeholder={t.selectRegionOptional}
      />
      <Select
        label={t.growthStageLabel}
        value={value.growthStageId}
        onChange={(growthStageId) => onChange({ ...value, growthStageId })}
        options={growthStages}
        optional
        placeholder={t.selectStageOptional}
      />
    </div>
  );
}
