# Plant Doctor — Release Checklist

**Date:** 2026-10-11 · Status: **Ready with limitations** for a controlled demo; **Not ready** for public production launch until the owner/legal items below are resolved.

## Engineering readiness

| Item | Status | Evidence |
|------|--------|----------|
| Frontend tests | PASS — VERIFIED | `npm test` → 74 passed |
| Backend tests | PASS — VERIFIED | `pytest backend/tests` → 43 passed (in-memory; 1 live-Atlas smoke) |
| Type check | PASS — VERIFIED | `tsc -b` → 0 errors |
| Lint | PASS — VERIFIED | `oxlint` → 0 errors, 17 benign warnings (vendored `public/ort` now ignored) |
| Production build | PASS — VERIFIED | `npm run build` succeeds; PWA SW generated |
| Backend health + Atlas | PASS — VERIFIED | `/health` mongoConnected, `vector_index` READY/queryable, 384-dim |
| Live `$vectorSearch` retrieval | PASS — VERIFIED | `/api/v1/ask` → `retrievalMode: atlas_vector_search`, real citations |
| Evidence Status Gate | PASS — VERIFIED | cross-crop reject, missing-context ask, abstain, conflict |
| Input validation & upload limits | PASS — VERIFIED | 422 on bad query; 10 MB + MIME allowlist on image |
| Secrets hygiene | PASS — VERIFIED | `.env` untracked; 0 secret hits in `dist/` |
| Legal/info pages present | PASS — VERIFIED | `/privacy`, `/terms`, `/storage` routes + footer links |

## Not verified in this environment (verify before launch)

| Item | Status | Next action |
|------|--------|-------------|
| Live offline flow (download → offline → search → reconnect) | NOT VERIFIED | Manual Chrome test (DevTools → Network → Offline); IndexedDB absent in CI/jsdom |
| Service-worker registration / install | BLOCKED (automation browser) | Verify in Chrome DevTools → Application |
| Photo model accuracy & label fidelity | NOT VERIFIED | Test ONNX classifier against known images; confirm labels map to the actual model and are shown as *possible*, not confirmed |
| Four-language UI + TTS + dynamic summaries | NOT VERIFIED | Manual pass per language; confirm no English-as-translated |
| Benchmark generalization | NOT VERIFIED | Only N=5 Atlas cases; expand before citing accuracy |
| Python dependency vulnerabilities | NOT VERIFIED | Run `pip-audit` in CI |
| Production CORS value | NOT VERIFIED | Confirm `CORS_ORIGINS` ≠ `*` |

## Owner / legal blockers (must resolve before public launch)

1. **Operator identity & grievance contact** — legal entity, registered address, grievance officer,
   contact email. Currently blank by design (not invented). Required for Privacy/Terms and DPDP readiness.
2. **DPDP Act applicability review** — confirm current obligations with qualified Indian counsel. The
   app makes **no** compliance claim; it minimizes data and avoids tracking, which reduces but does not
   eliminate obligations.
3. **Localized legal text** — Privacy/Terms/Storage are English-authoritative; Hindi/Telugu/Tamil legal
   translations need professional review before publication.
4. **Asset/source licensing** — confirm licenses for any bundled fonts, icons, model weights, and
   agricultural source documents (see IMPLEMENTATION_STATUS / Phase I).

## Payments

**NOT APPLICABLE** — no products, subscriptions, or paid consultations exist. No refund policy or
checkout infrastructure is present or needed.
