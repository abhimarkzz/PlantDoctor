import type { PlantDoctorService } from './types';
import { liveService } from './liveService';

export type { PlantDoctorService } from './types';
export { liveService } from './liveService';
export { demoService, getLocalizedDemoAnswer } from './demoService';

/**
 * The active service adapter.
 *
 * In this frontend milestone there is no backend, so the default adapter is
 * `liveService` — it will genuinely attempt to reach FastAPI and surface an
 * "unavailable" state when it cannot (the honest default). Users can opt into
 * the clearly-labelled `demoService` from the UI to preview how results look.
 *
 * To ship against a real backend, nothing here needs to change: `liveService`
 * already points at `VITE_API_BASE_URL`.
 */
export const activeService: PlantDoctorService = liveService;
