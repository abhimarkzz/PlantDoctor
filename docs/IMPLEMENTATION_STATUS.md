# Plant Doctor — Implementation Status

**Date:** 2026-10-10  
**Status:** MongoDB Atlas Live & Fully Integrated (Atlas Vector Search, Hybrid RRF, Evidence Status Gate & Offline PWA)

---

## 1. Retrieval Modes Architecture & Distinction

The system defines and strictly separates four distinct retrieval execution paths. Results explicitly carry their execution provenance (`retrievalMode`) to guarantee that local fallbacks never masquerade as Atlas Search.

```
                    ┌──────────────────────────────────────────────┐
                    │              USER / CLIENT QUERY             │
                    └──────────────────────┬───────────────────────┘
                                           │
                    ┌──────────────────────┴───────────────────────┐
                    │       Online / Connected to Backend?         │
                    └───────────┬──────────────────────┬───────────┘
                               YES                     NO
                                │                       │
            ┌───────────────────┴──────────┐   ┌────────┴─────────────┐
            │   FastAPI Backend Retrieval  │   │ Offline PWA Engine   │
            │          (Port 8000)         │   │ (Browser IndexedDB)  │
            └─────────┬────────────────────┘   └────────┬─────────────┘
                      │                                 │
     ┌────────────────┴────────────────┐                │
     ▼                                 ▼                ▼
┌──────────────────────────┐ ┌───────────────────┐ ┌──────────────────┐
│ Atlas Vector Search      │ │ Local Cosine      │ │ Browser          │
│ Mode: atlas_vector_search│ │ Mode:             │ │ Mode:            │
│ ($vectorSearch stage on  │ │ local_cosine_     │ │ offline_         │
│ collection with          │ │ test_double       │ │ indexeddb        │
│ index: 'vector_index')   │ │ (In-memory dot    │ │ (IndexedDB local │
│                          │ │ product in tests) │ │ text search)     │
└─────────────┬────────────┘ └─────────┬─────────┘ └──────────────────┘
              │                        │
              └────────────┬───────────┘
                           ▼
              ┌────────────────────────┐
              │ Reciprocal Rank Fusion │
              │      (RRF, k=60)       │
              └────────────┬───────────┘
                           ▼
              ┌────────────────────────┐
              │  Evidence Status Gate  │
              │ (Deterministic Filter) │
              └────────────┬───────────┘
                           ▼
              ┌────────────────────────┐
              │ Grounded & Validated   │
              │ Answer with Citations  │
              └────────────────────────┘
```

### 1.1 Real Atlas Vector Search (`atlas_vector_search`)
- **Execution Target:** Live MongoDB Atlas cluster (`plant_doctor` database, collection `evidence_chunks`).
- **Aggregation Pipeline:**
  ```python
  pipeline = [
      {
          "$vectorSearch": {
              "index": "vector_index",
              "path": "embedding",
              "queryVector": query_vector,  # 384-dimensional FastEmbed dense vector
              "numCandidates": bounded_candidates,  # Bounded: min(max(limit * 10, 20), 200)
              "limit": limit,
              "filter": {  # Pre-filters matching Atlas index definition
                  "crop_id": {"$in": [crop_id, "all"]},
                  "region_id": {"$in": [region_id, "global", "all"]},
                  "status": {"$eq": "verified"},
              }
          }
      },
      {
          "$project": {
              "_id": 0, "id": 1, "source_id": 1, "text": 1, "crop_id": 1,
              "region_id": 1, "status": 1, "page_or_section": 1,
              "score": {"$meta": "vectorSearchScore"}
          }
      }
  ]
  ```
- **Readiness Verification:** Checked prior to querying via `col.list_search_indexes()`. If absent or building (`status != "READY"` or `queryable != True`), raises `AtlasVectorSearchUnavailableError` with clear diagnostics and exact Atlas Console recovery instructions.
- **Result Provenance:** Chunks are stamped with `retrievalMode: "atlas_vector_search"`.

### 1.2 Local Cosine Vector Retrieval (`local_cosine_test_double`)
- **Execution Target:** In-memory repository chunks using `EmbeddingService.cosine_similarity`.
- **Purpose:** Fast, isolated unit testing and offline development fallback when disconnected from Atlas.
- **Safety Guarantee:** Always tagged with `retrievalMode: "local_cosine_test_double"`. It NEVER silently claims that Atlas Vector Search succeeded.

### 1.3 Hybrid Retrieval (Reciprocal Rank Fusion)
- **Rank Fusion:** Combines Vector Search and Keyword Text Search (Atlas `$text` search or in-memory overlap).
- **Formula:**
  $$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)} \quad (k = 60)$$
- **Score Normalization:** Scaled into $0.0 - 1.0$ range for intuitive UI display, preserving genuine vector similarity scores when higher.
- **Provenance:** Inherits the vector channel provenance (`atlas_vector_search` or `local_cosine_test_double`).

### 1.4 Offline PWA Retrieval (`offline_indexeddb`)
- **Execution Target:** Browser-native IndexedDB store (`plant_doctor_offline_db`) containing downloaded knowledge pack chunks and sources.
- **Network Independence:** Zero requests to MongoDB Atlas or cloud APIs while disconnected.
- **Safety:** Enforces hard crop mismatch rejections and displays offline caveats indicating live regulatory alerts cannot be verified offline.

---

## 2. Live MongoDB Atlas Verification

### Cluster Details
- **Cluster Host:** `plantdoctor.nawuow3.mongodb.net`
- **Database:** `plant_doctor`
- **Collections Populated:**
  - `sources`: 5 official agricultural reference publications (UC ANR, USDA ARS, NCAT ATTRA, IRRI, Archival Circular).
  - `evidence_chunks`: 12 passages with 384-dimensional dense vectors generated via `BAAI/bge-small-en-v1.5`.
  - `knowledge_packs`: 2 versioned packs (`pack-veg-001`, `pack-rice-001`) with SHA-256 payload checksums.
  - `evaluation_cases`: Golden retrieval test cases.

### Search Index Verification
- **Index Name:** `vector_index`
- **Type:** `vectorSearch`
- **Dimensions:** `384`
- **Similarity Metric:** `cosine`
- **Filter Paths:** `crop_id`, `region_id`, `status`, `source_id`
- **Verified Status:** `READY` (queryable: `True`)

### Live Health Endpoint Verification (`GET /health`)
```json
{
  "status": "healthy",
  "database": "connected",
  "mongoConnected": true,
  "databaseName": "plant_doctor",
  "embeddingModel": "BAAI/bge-small-en-v1.5",
  "embeddingDimension": 384,
  "llmStatus": "not_configured",
  "version": "0.1.0",
  "vectorSearch": {
    "name": "vector_index",
    "exists": true,
    "status": "READY",
    "queryable": true,
    "numDimensions": 384,
    "similarity": "cosine",
    "filterFields": ["crop_id", "region_id", "status", "source_id"],
    "diagnosticMessage": "Atlas Vector Search index 'vector_index' is READY and queryable (dimensions=384, similarity=cosine, filters=['crop_id', 'region_id', 'status', 'source_id']).",
    "hasError": false
  }
}
```

---

## 3. Verified Acceptance Criteria & Test Suites

### 3.1 Backend Test Suite (Pytest) — 25 / 25 Passed (100%)
- `backend/tests/test_vector_search_atlas.py` (8 tests):
  - `test_pipeline_definition_structure`: Validates `$vectorSearch` stage, fields, bounded candidates, and score projection.
  - `test_pipeline_candidate_bounding`: Validates bounding between 20 and 200 candidates.
  - `test_pipeline_metadata_filters`: Validates normalization and `$in` filtering for `crop_id`, `region_id`, `status`.
  - `test_vector_dimension_validation`: Strictly rejects vectors with incorrect dimensions (e.g. 128, 768).
  - `test_atlas_vector_search_missing_index_error`: Verifies `AtlasVectorSearchUnavailableError` with JSON setup instructions when index is missing.
  - `test_atlas_vector_search_building_index_error`: Verifies clear diagnostic when index is in `BUILDING` state.
  - `test_result_provenance_tagging`: Verifies provenance tags `atlas_vector_search` vs `local_cosine_test_double`.
  - `test_live_atlas_vector_search_smoke`: Live smoke test executing genuine `$vectorSearch` on Atlas with score > 0.80.
- `backend/tests/test_citation_validation.py` (3 tests): Verifies citation integrity and prevents fabricated chunk references.
- `backend/tests/test_evidence_gate.py` (5 tests): Deterministic gate logic for crop context, cross-crop hard mismatch, conflicting advice, and freshness.
- `backend/tests/test_evaluation_benchmark.py` (1 test): Measured benchmark across Vector-only, Hybrid, and Hybrid + Gate.
- `backend/tests/test_health.py` (2 tests): Verifies `/health` and `/api/health`.
- `backend/tests/test_packs.py` (3 tests): Verifies pack listings, detail retrieval, and payload download with SHA-256 checksums.
- `backend/tests/test_retrieval.py` (3 tests): Verifies vector search, text search, and RRF rank fusion.

### 3.2 Frontend Test Suite (Vitest) — 32 / 32 Passed (100%)
- `src/api/__tests__/client.test.ts` (2 tests): Offline device guards preventing network requests when offline.
- `src/components/__tests__/ConnectionBanner.test.tsx` (3 tests): Online/offline and backend connection state banners.
- `src/components/__tests__/EvidenceStatusBadge.test.tsx` (3 tests): Badge colors, icons, and honest status labels.
- `src/components/__tests__/OfflineServiceScreen.test.tsx` (4 tests): Helpful offline screen with navigation.
- `src/hooks/__tests__/useOnlineStatus.test.ts` (2 tests): Reactive browser online/offline event listeners.
- `src/pages/__tests__/HomePage.test.tsx` (4 tests): Hero, recent activity, and navigation links.
- `src/pages/__tests__/AskPage.test.tsx` (3 tests): Form validation, crop/region selection, evidence display.
- `src/pages/__tests__/LibraryPage.test.tsx` (2 tests): Knowledge pack browsing and offline previews.
- `src/pages/__tests__/PackDetailPage.test.tsx` (2 tests): Pack detail, download action, and honest offline states.
- `src/pages/__tests__/EvidenceDetailPage.test.tsx` (2 tests): Full source citation metadata and passage display.
- `src/services/__tests__/demoService.test.ts` (5 tests): Illustrative demo service fallbacks.

### 3.3 Total Combined Test Suite
- **Combined Test Count:** **57 / 57 PASSED (100%)**
- **TypeScript Typecheck:** `tsc -b` passed with 0 errors.
- **Production Build:** `npm run build` succeeded; Workbox precaches 19 entries (~467 KiB).

---

## 4. Summary of Verification Against Real Atlas Cluster

| Operation | Verified Result | Details |
| :--- | :--- | :--- |
| **Cluster Connection** | Verified | Authenticated with `plantdoctor.nawuow3.mongodb.net` |
| **Search Index Queryability** | Verified | Index `vector_index` verified `READY` and `queryable: true` |
| **Vector Search Pipeline** | Verified | `$vectorSearch` with FastEmbed query vector (384-dim) returned top chunks with score ~0.93 |
| **Metadata Filtering** | Verified | Filtered queries on `crop_id="tomato"` and `region_id="tropical"` successfully matched applicable chunks |
| **Conflicting Advice Gate** | Verified | Detected chemical vs organic tomato blight guidance; returned status `conflicting_evidence` |
| **Citation Integrity** | Verified | All citations linked to authentic sources with zero hallucinated IDs |
| **Provenance Tracking** | Verified | Chunks stamped `retrievalMode: "atlas_vector_search"` |
