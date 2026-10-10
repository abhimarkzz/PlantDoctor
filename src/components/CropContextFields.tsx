import { Select } from './Select';
import { CROPS, REGIONS, GROWTH_STAGES } from '../data/catalog';

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
  const wrapperClass =
    layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-3 gap-4' : 'space-y-4';

  return (
    <div className={wrapperClass}>
      <Select
        label="Crop"
        value={value.cropId}
        onChange={(cropId) => onChange({ ...value, cropId })}
        options={CROPS}
        required={requireCropRegion}
        placeholder="Select a crop"
      />
      <Select
        label="Region / Climate"
        value={value.regionId}
        onChange={(regionId) => onChange({ ...value, regionId })}
        options={REGIONS}
        required={requireCropRegion}
        placeholder="Select a region"
      />
      <Select
        label="Growth stage"
        value={value.growthStageId}
        onChange={(growthStageId) => onChange({ ...value, growthStageId })}
        options={GROWTH_STAGES}
        optional
        placeholder="Select stage"
      />
    </div>
  );
}
