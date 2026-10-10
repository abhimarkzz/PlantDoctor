# Plant Doctor

An offline-first, evidence-grounded agricultural assistant that helps growers access traceable agricultural guidance and understand when available evidence is incomplete, conflicting, outdated, or unsuitable for their situation.

---

## Technical Highlights

1. **MongoDB Atlas Evidence Data Model:**
   - Authoritative database architecture for `sources`, `evidence_chunks`, `knowledge_packs`, and `evaluation_cases`.
   - Real 384-dimensional dense vector embeddings generated via FastEmbed (`BAAI/bge-small-en-v1.5`) without requiring third-party cloud API keys.
   - Atlas Vector Search definition (`vector_index`) with metadata pre-filtering by crop and region.
   - Hybrid retrieval fusing Dense Vector Search and Keyword Text Search with Reciprocal Rank Fusion ($RRF$, $k=60$).

2. **Defensible Evidence Status Gate:**
   - Deterministic agricultural applicability evaluation:
     - **Applicable:** Evidence matches crop/climate context, meets relevance floor (0.40), and is fresh (< 3 years).
     - **Context Incomplete:** Informs user when crop or regional context is missing rather than guessing.
     - **Conflicting Evidence:** Detects opposing management directives across authoritative sources (e.g., chemical fungicide applications vs. organic biocontrol restrictions).
     - **Freshness Unverified:** Flags historical or un-reverified bulletins (> 3 years old) without obscuring them.
     - **Insufficient Evidence:** Deterministically rejects hard cross-crop mismatches (e.g. rice blast advice applied to tomato), preventing LLM hallucination.

3. **Offline Knowledge Packs & PWA IndexedDB Engine:**
   - Server-side pack generator with SHA-256 payload integrity manifests.
   - Genuine client-side download and persistence in browser IndexedDB (`plant_doctor_offline_db`).
   - Browser-native local keyword search over stored chunks when disconnected (`navigator.onLine === false`).
   - Honest offline reporting: no remote database queries or cloud LLMs are contacted when offline, and source verification caveats are made visible.

---

## Architecture Overview

```
PlantDoctor/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── config.py         # Pydantic Settings & environment validation
│   │   ├── deps.py           # Dependency injection & service singletons
│   │   ├── db/               # PyMongo manager, indexes, repositories, seed corpus
│   │   ├── models/           # Enums, database records, and camelCase API schemas
│   │   ├── routers/          # /health, /api/v1/ask, /api/questions, /packs, /ingest
│   │   └── services/         # FastEmbed, Retrieval (RRF), Evidence Gate, Answer Synth, Packs
│   └── tests/                # 17 automated pytest suites covering gate, RRF, benchmark, packs
├── src/                      # React 19 + TypeScript + Vite PWA
│   ├── api/                  # Typed REST client with offline error guards & pack downloader
│   ├── components/           # Biophilic UI components, badges, offline screens, install modal
│   ├── hooks/                # useOnlineStatus, useBackendHealth, useRecentActivity
│   ├── pages/                # HomePage, AskPage, LibraryPage, PackDetailPage, AboutPage
│   └── services/             # liveService adapter, offlineStorage (IndexedDB), demoService
└── public/                   # PWA Manifest, service worker, touch & maskable icons
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Create virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start FastAPI server on port 8000
PYTHONPATH=. uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# Install frontend dependencies
npm install

# Start Vite development server on port 5173
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## Verified Commands & Test Suites

| Command | Description | Status |
|---------|-------------|--------|
| `PYTHONPATH=. .venv/bin/pytest backend/tests -v` | Backend tests (in-memory services; 1 live-Atlas smoke) | ✅ 33/33 Passed |
| `npm test` | Run all frontend Vitest tests | ✅ 38/38 Passed |
| `npm run typecheck` | Strict TypeScript typecheck (`tsc -b`) | ✅ 0 Errors |
| `npm run lint` | Fast linter (`oxlint`) | ✅ 0 Errors |
| `npm run build` | Compile PWA production bundle with Workbox | ✅ Built (~467 KiB) |
| `npm run preview` | Serve production build locally on port 4173 | ✅ Complete |

---

## Measured Benchmark Results

Run via `PYTHONPATH=. .venv/bin/python backend/run_benchmark.py` against **live MongoDB Atlas `$vectorSearch`**, over **N = 5** cases from the Atlas `evaluation_cases` collection. A 5-case set validates the pipeline; it is **not** proof of general agricultural accuracy.

- **Vector-only Retrieval:** Recall@5 = **100.0%**, Citations = **100.0%**, Applicability Violations = **0**, Avg Latency ≈ **398 ms**.
- **Hybrid Retrieval (RRF):** Recall@5 = **100.0%**, Citations = **100.0%**, Applicability Violations = **0**, Avg Latency ≈ **569 ms**.
- **Hybrid + Evidence Status Gate:** Recall@5 = **100.0%**, Applicability Violations = **0**, Hard-mismatch abstentions = **1/1**, Avg Latency ≈ **340 ms**.

Latencies reflect live Atlas round-trips (not local cosine). Re-run the command to reproduce.

---

## Progressive Web App (PWA) & Offline Shell

Plant Doctor is installable as a PWA. **This phase provides offline access to the
application shell only** — the UI reopens without a network connection once the
browser has cached it. It does **not** mean agricultural questions can be answered
offline: live question answering, library sync, and pack downloads all require a
network connection and a running backend.

### Install on Android (Chrome / Edge)
1. Open the deployed site in Chrome.
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**).
3. Confirm. The app launches standalone from your home screen.
   - The in-app **Install App (PWA)** button triggers the same native prompt when the browser offers it.

### Install on iPhone / iPad (Safari)
1. Open the deployed site in **Safari** (iOS only installs PWAs from Safari).
2. Tap the **Share** icon → **Add to Home Screen**.
3. Tap **Add**. The app launches standalone with the Plant Doctor icon.

### What works offline vs. what does not
| Works offline (after first load) | Requires network |
|----------------------------------|------------------|
| App shell, navigation, all pages | Live question answering (backend) |
| Cached static assets, icons, fonts | Knowledge-pack download & library sync |
| Accurate online/offline indicator | Cloud retrieval / generation |

When offline, the app shows an offline indicator and will **not** attempt to contact
the backend or any cloud service. No pack download reports success unless a real
pack is downloaded and stored.

### PWA verification results (actual)

Verified against the production build (`npm run build` + `npm run preview`, port 4173):

- ✅ **Manifest** loads and parses: name, short_name, `display: standalone`,
  `start_url: /`, theme `#15803D`, background `#F0FDF4`, 5 icons (incl. maskable
  + 180×180 apple-touch). Verified in-browser via `fetch`.
- ✅ **Icons** — all referenced icon files return HTTP 200 (no missing references).
- ✅ **Service worker (static config)** — generated `dist/sw.js` precaches the app
  shell (19 entries: `index.html`, JS, CSS, manifest, icons) and registers a
  `NavigationRoute` bound to `index.html`, so an offline refresh on any route
  serves the cached shell.
- ✅ **Safe caching** — `sw.js` contains **0** references to the API origin; only
  static assets and Google Fonts are cached. No authenticated/evidence responses
  are persisted by the service worker.
- ⚠️ **Live SW registration / offline refresh** could **not** be verified in the
  built-in automation browser: it exposes the `serviceWorker` API but blocks
  script registration (`register('/sw.js')` throws "unknown error fetching the
  script" even though the file serves with HTTP 200 and `Content-Type:
  text/javascript`). Verify these manually in a real browser (steps below).

### Manual verification (Chrome DevTools)
1. `npm run build && npm run preview` → open `http://localhost:4173/` in Chrome.
2. **DevTools → Application → Manifest**: confirm name, icons, theme, standalone.
3. **Application → Service Workers**: confirm `sw.js` is "activated and running".
4. **Application → Cache Storage**: confirm a `workbox-precache` cache holds
   `index.html`, the JS/CSS bundles, manifest, and icons.
5. **Offline refresh**: tick **Network → Offline**, then reload — the app shell
   should still load, and the offline indicator should appear.
6. **Indicator**: toggle Offline/Online and confirm the status badge flips.
7. **Missing resource**: in Offline mode, trigger a backend call (Ask) — it should
   fail gracefully with the "device offline / backend unavailable" state, not hang.

## Production Deployment Checklist

### 1. Backend (FastAPI on Render / Cloud Run / Railway)
- Copy `.env.example` to `.env` and set:
  - `MONGODB_URI`: MongoDB Atlas connection string (`mongodb+srv://...`).
  - `MONGODB_DB_NAME`: `plant_doctor`
  - `CORS_ORIGINS`: Comma-separated allowed frontend origins (e.g. `https://your-plant-doctor.web.app`).
  - `ADMIN_API_KEY`: Secret key for `/api/v1/ingest` endpoint.
- In MongoDB Atlas:
  - Ensure Atlas Search / Vector Search is enabled on the cluster.
  - Create the vector index named `vector_index` using the JSON definition from `backend/app/db/indexes.py`.
- Run database index synchronization:
  ```bash
  python3 -m backend.app.db.indexes
  ```

### 2. Frontend (Firebase Hosting / Vercel / Cloudflare Pages)
- Set build environment variable:
  - `VITE_API_BASE_URL`: URL of the deployed FastAPI backend.
- Build and deploy:
  ```bash
  npm run build
  ```
- Deploy the `dist/` directory as a single-page application.
