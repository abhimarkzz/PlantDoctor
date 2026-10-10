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
| `PYTHONPATH=. .venv/bin/pytest backend/tests -v` | Run all 17 backend unit and benchmark tests | ✅ 17/17 Passed |
| `npm test` | Run all 32 frontend Vitest component tests | ✅ 32/32 Passed |
| `npm run typecheck` | Strict TypeScript typecheck (`tsc -b`) | ✅ 0 Errors |
| `npm run lint` | Fast linter (`oxlint`) | ✅ 0 Errors |
| `npm run build` | Compile PWA production bundle with Workbox | ✅ Built (~467 KiB) |
| `npm run preview` | Serve production build locally on port 4173 | ✅ Complete |

---

## Measured Benchmark Results

Ran on verified agricultural reference corpus:
- **Vector-only Retrieval:** Recall@5 = **100.00%**, Avg Latency = **6.63 ms**, Applicability Violations = **1** (cross-crop violation).
- **Hybrid Retrieval (Vector + Keyword RRF):** Recall@5 = **100.00%**, Avg Latency = **7.08 ms**, Applicability Violations = **1**.
- **Hybrid + Evidence Status Gate:** Recall@5 = **100.00%**, Abstentions = **1**, Applicability Violations = **0** (Hard mismatches deterministically rejected).

---

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
