# Plant Doctor — Privacy & Security Audit

**Date:** 2026-10-11 · **Scope:** running app + repository. Secrets were never printed.
**Status labels:** PASS — VERIFIED · FAIL · BLOCKED · NOT VERIFIED · NOT APPLICABLE · NOT IMPLEMENTED

## Summary

The application is privacy-friendly by construction: no accounts, no analytics/tracking SDKs, no
advertising, no server-side retention of user inputs, and an on-device inference option. Security
basics (input validation, upload limits, auth on ingestion, no secret leakage, configured CORS) are
in place. Main gaps are operational/legal (missing operator details) and a few defense-in-depth items.

## Privacy data-flow inventory

| Data | Collected? | Processed where | Sent to third party | Retained | Status |
|------|-----------|-----------------|---------------------|----------|--------|
| Question text + crop/region/stage | Yes (to answer) | Backend → MongoDB Atlas (retrieval) when online | Atlas (evidence DB) | Not stored server-side | PASS — VERIFIED (no question/answer DB writes, no content logging) |
| Photo (optional) | Only if attached | In-memory server assessment OR on-device ONNX | Atlas not sent the image | Not written to disk/DB | PASS — VERIFIED (no image persistence) |
| Language preference | Yes | On device | No | localStorage | PASS — VERIFIED |
| Recent questions | Yes | On device | No | localStorage | PASS — VERIFIED |
| Offline packs | On download | On device | No | IndexedDB | PASS — VERIFIED |
| Analytics / telemetry | No | — | — | — | PASS — VERIFIED (no trackers found) |
| Accounts / contact info | No | — | — | — | NOT APPLICABLE |

Evidence: `grep` for GA/gtag/mixpanel/segment/sentry/hotjar/fb/amplitude/posthog/plausible → none in `src`.
Only external host referenced in `src` is `icar.gov.in` (a source link, not a tracker). No `insert_one`/image
write/question logging in backend services.

## Security findings (OWASP-aligned)

| # | Severity | Area | Finding | Status | Files |
|---|----------|------|---------|--------|-------|
| 1 | Info | Secrets | `.env` untracked; `.gitignore` covers it; `.env.example` placeholders only; **0** secret hits in `dist/` | PASS — VERIFIED | `.gitignore`, `dist/` |
| 2 | Info | Access control | Ingestion routes require `x-admin-key`; no-key & wrong-key → 401 | PASS — VERIFIED | `backend/app/routers/ingest.py` |
| 3 | Info | Input validation | `/api/v1/ask` whitespace/short query → 422 (not 500/200); safe message | PASS — VERIFIED (fixed earlier) | `routers/questions.py`, `models/schemas.py` |
| 4 | Info | Upload safety | 10 MB image limit (422) + MIME allowlist (JPEG/PNG/WebP, 422) | PASS — VERIFIED | `routers/questions.py` |
| 5 | Info | Error handling | Malformed body → safe 500 message, no stack trace/secrets | PASS — VERIFIED | `main.py` handler |
| 6 | Info | CORS | `allow_origins` from configured env, not hardcoded `*` | PASS — VERIFIED | `main.py`, `config.py` |
| 7 | Info | Dependencies (JS) | `npm audit --omit=dev` → 0 vulnerabilities | PASS — VERIFIED | `package-lock.json` |
| 8 | Low | Dependencies (Py) | No `pip-audit`/`safety` installed; not scanned | NOT VERIFIED | `requirements.txt` |
| 9 | Low | Upload hardening | Image type checked via client `content_type` header only (no magic-byte sniff) | NOT IMPLEMENTED | `routers/questions.py` |
| 10 | Low | Rate limiting | No request-rate limiting on `/ask` observed | NOT IMPLEMENTED | backend |
| 11 | Medium | CORS default | Confirm the deployed `CORS_ORIGINS` is not `*` in production | NOT VERIFIED | `config.py` / deploy env |
| 12 | Info | Prompt injection | Optional LLM (Gemini) not configured; retrieved text is not executed; deterministic gate not LLM-overridable | PASS — VERIFIED (config) / NOT APPLICABLE (LLM off) | `services/` |

## Cookies & third-party embeds (Phase D)

- No advertising/analytics cookies, no third-party tracking scripts, no external embeds (maps/chat/video).
- Browser storage used (SW cache, IndexedDB, localStorage) is **functional, not tracking** — no consent
  banner is required, and none was added (avoiding a dark-pattern/placeholder banner). A **Cookies & Storage**
  page documents this accurately.

## Remaining risks / owner actions

1. **Operator & grievance details missing** — Medium (legal/launch blocker). Provide legal entity, address,
   grievance-officer name, and contact email; wire into the Privacy/Terms pages. **Do not launch publicly without these.**
2. **Production CORS value** — confirm `CORS_ORIGINS` is the real frontend origin (not `*`).
3. **Python dependency scan** — run `pip-audit` in CI (tool not present locally).
4. **Defense-in-depth (Low)** — add image magic-byte validation and basic rate limiting before public exposure.
5. **DPDP Act applicability** — see IMPLEMENTATION_STATUS / RELEASE_CHECKLIST; requires qualified Indian legal review.
   No compliance claim is made by the app.
