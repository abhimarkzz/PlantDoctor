# Plant Doctor

An offline-first, evidence-grounded agricultural assistant. It helps growers understand possible
causes of plant-health issues and, crucially, shows **how trustworthy the supporting evidence is** —
when it is applicable, incomplete, conflicting, unverified, or insufficient — instead of returning a
confident guess.

Plant Doctor is **decision support, not a guaranteed diagnosis**. A photo assessment or model score is
never treated as a confirmed disease.

## What it does

- **Ask a question** with crop, region, and optional growth stage. The backend retrieves matching
  agricultural sources and returns an answer with citations and an **evidence status**.
- **Evidence Status Gate** — a deterministic layer that rejects hard crop mismatches, asks for missing
  context, surfaces conflicting sources honestly, drops stale/withdrawn evidence, and abstains when
  evidence is insufficient. It is not overridable by a language model.
- **Photo assist** — attach a plant photo for an on-device image classification (ONNX Runtime Web) or a
  server-side structured assessment. Results are framed as *possible* causes with next checks, not a
  verdict.
- **Offline library** — download versioned knowledge packs (with SHA-256 manifests) into the browser
  (IndexedDB) for offline reference.
- **Four languages** — English, Hindi, Telugu, Tamil UI.
- **Installable PWA** — add to a phone home screen; the app shell works offline.

## Technology

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, `vite-plugin-pwa`,
  `onnxruntime-web`, Capacitor (Android wrapper).
- **Backend:** FastAPI, Pydantic, PyMongo.
- **Database:** MongoDB Atlas (`plant_doctor`) with Atlas Vector Search (`vector_index`, 384-dim).
- **Embeddings:** `BAAI/bge-small-en-v1.5` (384-dim) via FastEmbed.
- **Retrieval:** Atlas `$vectorSearch` + keyword retrieval fused with application-level RRF; results
  carry a `retrievalMode` provenance tag.

## Architecture & data flow

```
Browser (React PWA)
  │  question + crop/region (+ optional photo)
  ▼
FastAPI  ──►  embed query (bge-small, 384d)
  │           │
  │           ▼
  │     MongoDB Atlas  $vectorSearch (vector_index) + keyword → RRF
  │           │
  ▼           ▼
Evidence Status Gate (deterministic)  ──►  answer + citations + status
```

Online answering requires the backend + Atlas. Offline, the app serves its cached shell and any
downloaded packs; it does not contact Atlas or a cloud model.

## Prerequisites

- Node.js 20+, npm
- Python 3.13 (a `.venv` is used in examples)
- A MongoDB Atlas cluster with a Vector Search index named `vector_index` (384-dim, cosine)

## Quick start

Backend:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # then fill in MONGODB_URI, MONGODB_DB_NAME, ADMIN_API_KEY, CORS_ORIGINS
PYTHONPATH=. .venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```bash
npm install
npm run dev        # http://localhost:5173
```

Set `VITE_API_BASE_URL` for the frontend to reach the backend (defaults to `http://localhost:8000`).

## Environment variables

Names only — see `.env.example` for safe placeholders. Never commit real values.

- `MONGODB_URI`, `MONGODB_DB_NAME`
- `CORS_ORIGINS` (comma-separated allowed frontend origins; do **not** use `*` in production)
- `ADMIN_API_KEY` (protects ingestion routes)
- `EMBEDDING_MODEL` (defaults to `BAAI/bge-small-en-v1.5`)
- `GEMINI_API_KEY` (optional; the cloud LLM is **not** required and is off unless configured)

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` / `npm run build` / `npm run preview` | Dev server / production build / preview |
| `npm test` | Frontend tests (Vitest) |
| `npm run typecheck` / `npm run lint` | `tsc -b` / `oxlint` |
| `PYTHONPATH=. .venv/bin/pytest backend/tests -v` | Backend tests |
| `PYTHONPATH=. .venv/bin/python backend/run_benchmark.py` | Retrieval benchmark (live Atlas) |

### Verified results (2026-10-11)

- Frontend tests: **74 passed**. Backend tests: **43 passed** (in-memory services; one live-Atlas smoke test).
- `tsc -b`: 0 errors. `oxlint`: 0 errors. Production build: succeeds.
- Benchmark (live Atlas `$vectorSearch`, **N = 5** cases from `evaluation_cases`): Recall@5 100%, 0
  applicability violations, 1/1 hard-mismatch abstention, latency ≈ 340–570 ms/config. **Five cases
  validate the pipeline; they are not proof of general agricultural accuracy.**

## Online vs. offline

| Works offline (after first load) | Requires network + backend |
|----------------------------------|----------------------------|
| App shell, navigation, all pages | Live question answering (Atlas retrieval) |
| Downloaded knowledge packs (IndexedDB) | Library sync / new pack downloads |
| On-device image classification (ONNX) | Server-side multimodal assessment |

Installing the PWA caches the shell only; it does **not** by itself make agricultural answering work
offline — that needs downloaded packs.

### Install

- **Android (Chrome/Edge):** ⋮ menu → Install app / Add to Home screen.
- **iPhone/iPad (Safari):** Share → Add to Home Screen.

## Languages

English, Hindi, Telugu, Tamil for the UI and bundled demo content, with Noto fonts for Indic scripts.
Legal/info pages are currently **English-authoritative**; localized legal translations need professional
review before publication. Source passages retain their original language and provenance.

## Privacy

No accounts, no advertising, no analytics or tracking SDKs. Questions and answers are **not stored
server-side** and photos are **not persisted** (processed in memory, or on-device via ONNX). On-device
data (offline packs, language, recent questions) stays in your browser. See the in-app **Privacy**,
**Terms**, and **Cookies & Storage** pages, and [docs/PRIVACY_AND_SECURITY_AUDIT.md](docs/PRIVACY_AND_SECURITY_AUDIT.md).

## Known limitations

- Photo classification accuracy and label fidelity are **not independently verified**; treat predictions
  as possibilities to confirm.
- Full offline flow and service-worker behavior are verified by design/build but need a manual browser
  pass (see [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)).
- The benchmark covers only 5 cases.
- Operator/grievance details are not yet provided — a launch blocker for the legal pages.
- No payments exist; a refund policy is not applicable.

## More documentation

- [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) — feature-by-feature verification.
- [docs/PRIVACY_AND_SECURITY_AUDIT.md](docs/PRIVACY_AND_SECURITY_AUDIT.md)
- [docs/ACCESSIBILITY_AUDIT.md](docs/ACCESSIBILITY_AUDIT.md)
- [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)

## License & attribution

Project license and third-party asset/source/model licensing are **not yet confirmed** in-repo. Confirm
licenses for bundled fonts, icons, model weights, and agricultural source documents before distribution.
