# Plant Doctor — Audit & End-to-End Verification

**Audit date:** 2026-10-11
**Method:** Live backend (uvicorn on 127.0.0.1:8000) against live MongoDB Atlas, real HTTP requests, executed test suites, static build inspection. Secrets were never printed.

Status legend: **PASS — VERIFIED** · **FAIL** · **BLOCKED** · **NOT VERIFIED** · **NOT IMPLEMENTED**

---

## A. Overall status

**Ready for a live hackathon demo of the online path. Not fully verified for live offline operation.**

- The core differentiator works and is verified live: MongoDB Atlas `$vectorSearch` retrieval with real citations, plus a deterministic Evidence Status Gate that rejects cross-crop mismatches, asks for missing context, and abstains on insufficient/conflicting evidence.
- Two genuine defects were found and fixed (API input validation; offline pack casing). Regression tests added.
- Live **offline** pack download → IndexedDB → offline search could not be executed end-to-end in this environment (no scriptable offline toggle / IndexedDB in the automation browser). The code path is now casing-correct and unit-covered, but true offline persistence is **NOT VERIFIED** here.

## B. Verification matrix

| Area | Status | Evidence |
|------|--------|----------|
| Backend startup & health | PASS — VERIFIED | `/health` + `/api/health` → 200, `mongoConnected: true`, db `plant_doctor` |
| MongoDB Atlas connection | PASS — VERIFIED | health reports live connection; benchmark loaded 5 cases from Atlas `evaluation_cases` |
| Atlas Vector Search index | PASS — VERIFIED | health: `vector_index` exists, status READY, queryable, 384 dims, cosine, filters `[crop_id,region_id,status,source_id]` |
| `$vectorSearch` retrieval (live) | PASS — VERIFIED | `/api/v1/ask` returns chunks with `retrievalMode: "atlas_vector_search"`; live smoke test `test_live_atlas_vector_search_smoke` PASSED (not skipped) |
| Hybrid retrieval + RRF | PASS — VERIFIED | pipeline-structure unit tests pass; benchmark runs "Hybrid Retrieval (RRF)" config live |
| Evidence Status Gate | PASS — VERIFIED | live: cross-crop (rice→tomato) → `insufficient_evidence` "Hard crop mismatch"; missing crop → `context_incomplete`; nonsense → `insufficient_evidence`; conflict → `conflicting_evidence` |
| AI/ML embeddings | PASS — VERIFIED | health: `BAAI/bge-small-en-v1.5`, 384 dims; benchmark initializes FastEmbed model |
| API input validation | PASS — VERIFIED (fixed) | whitespace query → 422, 2-char → 422 (was 500), valid → 200; safe error body, no stack trace |
| Ingestion auth | PASS — VERIFIED | `/api/v1/ingest/text` no-key → 401, wrong-key → 401 |
| Source resolution | PASS — VERIFIED | `/api/v1/sources/src-7233dae1` → real record (UC-ANR-8356); unknown → 404 |
| Frontend build | PASS — VERIFIED | `npm run build` succeeds; 19 precache entries |
| Frontend tests / types / lint | PASS — VERIFIED | `npm test` 38/38, `tsc -b` 0 errors, `oxlint` 0 errors |
| Backend tests | PASS — VERIFIED | `pytest backend/tests` 33/33 (in-memory services; 1 live-Atlas smoke) |
| Offline pack download shape | PASS — VERIFIED (fixed) | API returns snake_case; client now normalizes; regression test added |
| Live offline operation (browser) | NOT VERIFIED | no scriptable offline toggle / IndexedDB in automation browser; manual steps in README |
| Client checksum recompute | NOT IMPLEMENTED | client verifies checksum presence + chunk→source provenance + non-empty, but does not recompute SHA-256 against payload (see E) |
| PWA manifest & icons | PASS — VERIFIED | in-browser fetch: valid manifest, 5 icons incl. maskable+apple-touch, all icon files 200 |
| Service worker (static) | PASS — VERIFIED | `dist/sw.js` precaches shell + `NavigationRoute → index.html`; 0 API-origin references (no sensitive caching) |
| Live SW registration / offline refresh | BLOCKED | built-in automation browser blocks SW registration; verify via Chrome DevTools (README steps) |
| Secrets hygiene | PASS — VERIFIED | `.env` untracked; `.gitignore` covers it; `.env.example` placeholders only; 0 secret-pattern hits in `dist/` |

## C. Test results (actual)

- `PYTHONPATH=. .venv/bin/pytest backend/tests` → **33 passed, 1 warning (~30s)**. Uses in-memory repositories (`init_services(db=None)`); `test_vector_search_atlas.py::test_live_atlas_vector_search_smoke` executed against **live Atlas** and passed.
- `npm test` → **38 passed** (Vitest, jsdom). Unit/component; IndexedDB persistence paths are not executed (jsdom has no IndexedDB).
- `npx tsc -b` → **0 errors**. `npm run lint` (oxlint) → **0 errors**. `npm run build` → **succeeds**, 19 precache entries.
- Live HTTP (curl against running server): health, ask (valid + 3 gate cases), validation (422×2), ingest auth (401×2), source lookup (200 + 404) — all as expected.
- Benchmark (`backend/run_benchmark.py`, live Atlas, **N=5 cases**): Recall@5 = 100%, citation rate 100%, applicability violations 0, hard-mismatch abstention 1/1. Latency ~340–570 ms/config. **N=5 is a tiny denominator — not proof of general agricultural accuracy.**

## D. Defects fixed (this audit)

1. **500 on short query / 200 on whitespace query** — `/api/v1/ask` validated the body with a manual `model_validate`, so a `ValidationError` escaped as HTTP 500; whitespace passed `min_length=3`. Fixed in `backend/app/routers/questions.py` (catch `ValidationError` → 422) and `backend/app/models/schemas.py` (strip + require ≥3 non-whitespace chars). Regression: `backend/tests/test_question_validation.py` (4 tests).
2. **Offline pack download broken by casing mismatch** — backend `/download` returns snake_case (`source_id`, `page_or_section`), but `savePackPayload`/`searchOffline` read camelCase, so every real pack failed the provenance check. Fixed in `src/services/offlineStorage.ts` (casing-tolerant `normalizeSource`/`normalizeChunk`, empty-chunk rejection). Regression added to `src/services/__tests__/offlineStorage.test.ts`.

## E. Remaining blockers / not verified

1. **Live offline operation (NOT VERIFIED).** Download a pack online, disable network, reload PWA, search locally, test mismatch/no-result. Next action: run the README "Manual verification" steps in Chrome with DevTools → Network → Offline (this environment has no scriptable offline toggle or IndexedDB).
2. **Live service-worker registration (BLOCKED).** The built-in automation browser exposes `navigator.serviceWorker` but rejects `register('/sw.js')`. Next action: verify in Chrome (DevTools → Application → Service Workers / Cache Storage).
3. **Client-side cryptographic checksum recompute (NOT IMPLEMENTED).** The client checks checksum presence, chunk→source provenance, and non-empty chunks, but does not recompute SHA-256 over the payload, so content tampering that preserves the checksum string is not cryptographically detected. Next action: have `/download` include the exact canonical string the backend hashed (generation and download already use identical record ordering), then compare `crypto.subtle` SHA-256 to `manifest.checksum` and store the data parsed from the verified canonical.
4. **Benchmark generalization.** Metrics are from N=5 Atlas cases. Next action: expand `evaluation_cases` before citing accuracy beyond this set.

## F. Live demo checklist (supported by current implementation)

1. **Online answer via Atlas Vector Search:** `POST /api/v1/ask` `{"query":"My tomato leaves have yellow spots and brown lesions","cropId":"tomato","regionId":"tropical"}` → chunks tagged `retrievalMode: "atlas_vector_search"`.
2. **Citations & provenance:** `GET /api/v1/sources/src-7233dae1` → real source record (UC-ANR-8356).
3. **Hard cross-crop rejection:** ask "rice blast" with `cropId: tomato` → `insufficient_evidence`, reason "Hard crop mismatch".
4. **Insufficient/conflicting handling:** omit `cropId` → `context_incomplete`; the tomato query above returns `conflicting_evidence` with both sources shown.
5. **Pack download + integrity:** `GET /api/v1/packs/pack-veg-001/download` → manifest with SHA-256 checksum, 4 sources, 10 chunks (client verifies presence + provenance).
6. **Offline search after disconnect:** *(verify manually in Chrome — not executed in this environment)* download a pack, go offline, reload, search; mismatch/no-result still abstain.
7. **Recovery after reconnect:** online indicator flips; `/api/v1/ask` resumes live retrieval.

## G. Final verdict

- **Working & verified live:** Atlas connection, `$vectorSearch` retrieval with real citations, Evidence Status Gate safety behaviors, API validation (fixed), ingest auth, source resolution, frontend build/tests/types/lint, PWA manifest/icons, SW static config, secret hygiene.
- **Fixed this audit:** API validation 500/200 bug; offline pack casing bug. Regression tests added. Backend 33/33, frontend 38/38 after fixes.
- **Still to verify (user action):** live offline pack flow and SW registration in a real browser (README manual steps); expand benchmark beyond 5 cases; optionally implement client-side SHA-256 recompute for full tamper detection.
- **Note:** earlier docs cited "6.63 ms" latency and "17/17 backend tests" — actual live-Atlas latency is ~340–570 ms and the suite is 33 tests; figures in this report reflect real executions.

_No commits or pushes were made. No database writes were performed during the audit; the benchmark and tests are read-only against existing data._
