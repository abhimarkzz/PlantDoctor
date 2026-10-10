# Plant Doctor

An offline-first, evidence-grounded agricultural assistant that helps users access traceable agricultural guidance and understand when available evidence is incomplete, conflicting, outdated, or unsuitable for their situation.

## Current status: Frontend milestone (v0.1.0)

This is the frontend-only milestone. No backend, database, model, or real agricultural data is connected. All example content is clearly labelled as illustrative.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | Type-check only (no emit) |
| `npm run lint` | Lint with Oxlint |

## Tech stack

- **React 19** with TypeScript (strict, TS 6)
- **Vite 8** for bundling and dev server
- **Tailwind CSS v4** for styling
- **React Router v7** for client-side routing
- **Lucide React** for icons
- **vite-plugin-pwa** for service worker and web app manifest
- **Vitest** + Testing Library for tests

## Pages

| Route | Page | Status |
|-------|------|--------|
| `/` | Home / Dashboard | ✅ Complete |
| `/ask` | Ask Plant Doctor | ✅ Complete (backend unavailable state, illustrative demo) |
| `/evidence/:id` | Evidence result details | ✅ Complete (demo data only) |
| `/library` | Offline Library | ✅ Complete (download disabled, honest messaging) |
| `/library/:id` | Knowledge pack details | ✅ Complete (illustrative data) |
| `/about` | About, limitations, source trust | ✅ Complete |

## Evidence Status Gate

Every piece of guidance displays one of five evidence statuses:

- **Applicable** — Evidence verified and matches context
- **Context Incomplete** — Missing information needed for full assessment
- **Conflicting Evidence** — Sources disagree
- **Freshness Unverified** — Source not recently re-checked
- **Insufficient Evidence** — Too few sources found

These describe *intended system behavior*. They are not yet implemented or validated — the backend does not exist yet.

## Architecture

```
src/
  api/           Typed API client (fetch-based, configurable base URL)
  app/           Layout shell
  components/    Reusable UI components (badges, cards, banners, states)
  demo/          Labelled illustrative fixtures (never presented as real data)
  hooks/         useOnlineStatus, useBackendHealth
  models/        TypeScript types for Source, EvidenceChunk, KnowledgePack, etc.
  pages/         Route pages
  test/          Test setup
```

## PWA

The app includes a web app manifest and service worker that caches the application shell. This allows installing the app to a phone's home screen.

**Important:** The service worker caches static assets only. It does *not* enable offline question answering. Offline knowledge retrieval requires a local evidence store (IndexedDB + downloaded knowledge packs) that is planned for a future milestone.

## What is NOT implemented (scope boundary)

- FastAPI backend
- MongoDB Atlas connection
- Real embeddings or RAG
- External LLM calls
- Authentication
- Image classification / diagnosis inference
- Offline knowledge pack downloads
- IndexedDB local evidence store

## Planned next milestone

FastAPI API contract and MongoDB-backed evidence retrieval.

## Design system

Generated using UI/UX Pro Max. See `design-system/plant-doctor/MASTER.md` for the persisted design tokens.

- **Style:** Organic Biophilic
- **Palette:** Forest green (#15803D), leaf green (#22c55e), warm white (#F0FDF4)
- **Typography:** Lora (headings) / Raleway (body)
- **Corners:** 16–24px rounded
- **Accessibility:** 4.5:1 contrast, visible focus rings, reduced-motion support, 44px touch targets
