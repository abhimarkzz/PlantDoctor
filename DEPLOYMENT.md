# Plant Doctor — Zero-Cost Free-Tier Deployment Guide

This guide details the complete end-to-end production deployment for Plant Doctor using 100% free hosting tiers:

- **Frontend:** Cloudflare Pages (Free Tier) — React 19 + TypeScript + Vite + PWA + Workbox Service Worker
- **Backend:** Render (Free Web Service) — FastAPI + Uvicorn + PyMongo + FastEmbed
- **Database & Search:** MongoDB Atlas M0 (Free Tier) — `plant_doctor` database, collection `evidence_chunks`, Search Index `vector_index`

**Total Budget:** $0.00 / month.

---

## 1. Architecture & Network Topology

```
┌─────────────────────────────────┐
│     Client Browser / Mobile     │
│   (PWA with IndexedDB Cache)    │
└───────────────┬─────────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌──────────────────┐ ┌──────────────────────────────────────┐
│ Cloudflare Pages │ │ Render Free Web Service              │
│ (Frontend PWA)   │ │ (FastAPI Backend, Port 8000/dynamic) │
│ Static SPA + SW  │ │ Pre-cached ONNX BGE-Small Model      │
└──────────────────┘ └──────────────────┬───────────────────┘
                                        │
                                        ▼
                             ┌───────────────────────┐
                             │  MongoDB Atlas (M0)   │
                             │  Database: plant_doctor│
                             │  $vectorSearch Ready  │
                             └───────────────────────┘
```

---

## 2. Backend Deployment on Render (FastAPI)

### Method A: One-Click Blueprint Deployment (Recommended)
1. Commit the provided `render.yaml` to your GitHub repository `https://github.com/abhimarkzz/PlantDoctor`.
2. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Blueprint**.
3. Select your repository `abhimarkzz/PlantDoctor`.
4. Render automatically parses `render.yaml` and detects:
   - **Service Name:** `plant-doctor-backend`
   - **Runtime:** `Python`
   - **Plan:** `Free`
   - **Build Command:** `pip install -r requirements.txt && python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5')"`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/health`
5. Render will prompt you for the uncommitted secret variable `MONGODB_URI`:
   - Paste your authentic MongoDB Atlas URI:
     `mongodb+srv://<username>:<password>@plantdoctor.nawuow3.mongodb.net/?appName=PlantDoctor`
6. Click **Apply**. Render will trigger the build and deploy.

### Method B: Manual Web Service Configuration
If not using Blueprints:
1. Click **New +** → **Web Service**.
2. Connect `https://github.com/abhimarkzz/PlantDoctor`.
3. Fill in:
   - **Name:** `plant-doctor-backend`
   - **Region:** Any (e.g. `Oregon (US West)` or closest to Atlas cluster)
   - **Branch:** `main`
   - **Root Directory:** (leave blank for repository root)
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt && python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5')"`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
4. Expand **Advanced** → **Add Environment Variable**:
   - `FASTAPI_ENV`: `production`
   - `PYTHON_VERSION`: `3.11.9`
   - `MONGODB_DB_NAME`: `plant_doctor`
   - `MONGODB_URI`: `<your-atlas-connection-string>`
   - `EMBEDDING_MODEL`: `BAAI/bge-small-en-v1.5`
   - `EMBEDDING_DIMENSION`: `384`
   - `CORS_ORIGIN_REGEX`: `^https:\/\/.*\.pages\.dev$`
   - `CORS_ORIGINS`: `http://localhost:5173,http://localhost:4173`
   - **Health Check Path:** `/health`
5. Click **Create Web Service**.
6. Note the generated public URL (e.g., `https://plant-doctor-backend.onrender.com`).

---

## 3. Frontend Deployment on Cloudflare Pages (React PWA)

### Method A: Git Integration (Recommended)
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Compute (Workers & Pages)** → **Pages** → **Connect to Git**.
2. Select repository `abhimarkzz/PlantDoctor`.
3. In **Build settings**:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (leave empty)
4. Under **Environment variables**:
   - Add variable: `VITE_API_BASE_URL`
   - Value: `https://<your-render-backend-name>.onrender.com` (from Step 2)
   - (Optional) `NODE_VERSION`: `20`
5. Click **Save and Deploy**.
6. Cloudflare builds the bundle, generates the PWA service worker, and copies `public/_redirects` into `dist/_redirects`.
7. Your app is live at `https://<project-name>.pages.dev`.

### SPA Routing & PWA Asset Rules
- Single Page Application routing fallback is governed by `public/_redirects` (`/* /index.html 200`), ensuring refreshing on `/ask` or `/library` never returns 404.
- Service worker precaching and web app manifest (`manifest.webmanifest`) are generated automatically by `vite-plugin-pwa` and served under HTTPS.

---

## 4. Environment Variables Reference

| Variable | Target Platform | Required | Description | Example / Default |
| :--- | :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Cloudflare Pages | **Yes** | Base URL of the deployed FastAPI backend | `https://plant-doctor-backend.onrender.com` |
| `MONGODB_URI` | Render | **Yes** | MongoDB Atlas SRV connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `MONGODB_DB_NAME` | Render | **Yes** | Database name | `plant_doctor` |
| `FASTAPI_ENV` | Render | No | Environment tag | `production` |
| `PYTHON_VERSION` | Render | No | Python runtime version | `3.11.9` |
| `PORT` | Render | Auto | Port assigned dynamically by Render | `8000` (Render sets `$PORT`) |
| `HOST` | Render | No | Bind host interface | `0.0.0.0` |
| `CORS_ORIGIN_REGEX` | Render | No | Allowed frontend origin regex | `^https:\/\/.*\.pages\.dev$` |
| `CORS_ORIGINS` | Render | No | Comma-separated allowed origins | `https://plant-doctor.pages.dev` |
| `EMBEDDING_MODEL` | Render | No | Local embedding model name | `BAAI/bge-small-en-v1.5` |
| `EMBEDDING_DIMENSION` | Render | No | Model vector dimensions | `384` |

---

## 5. Startup & Cold-Start Optimization

### Model Pre-Caching
On Render Free, processes are ephemeral and spin down after 15 minutes of inactivity. To prevent cold starts from timing out while downloading the ~130MB ONNX embedding weights:
- The build command explicitly pre-fetches the model:
  ```bash
  pip install -r requirements.txt && python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5')"
  ```
- FastEmbed stores the weights in the local build cache directory. On service boot, `get_embedding_service()` loads the cached model in <2 seconds.

### Memory Footprint
- Model: `BAAI/bge-small-en-v1.5` (~130MB ONNX format via FastEmbed).
- Total baseline RAM usage on boot: ~240 MB, safely under Render's 512 MB Free tier memory ceiling.

---

## 6. Post-Deployment Verification Checklist

Once both services are active:

1. **Verify Backend Health:**
   ```bash
   curl -i https://<your-backend>.onrender.com/health
   ```
   - Expected status: `HTTP 200 OK`
   - JSON response contains `"database": "connected"`, `"mongoConnected": true`, `"vectorSearch.status": "READY"`.

2. **Verify Live Atlas Vector Retrieval:**
   ```bash
   curl -i -X POST https://<your-backend>.onrender.com/api/v1/ask \
     -H "Content-Type: application/json" \
     -d '{"query": "What causes uniform yellowing of older lower tomato leaves?", "crop_id": "tomato", "region_id": "temperate"}'
   ```
   - Expected: `HTTP 200 OK`, `retrievalMode: "atlas_vector_search"`, citations to UC ANR 8356.

3. **Verify Knowledge Pack API:**
   ```bash
   curl -i https://<your-backend>.onrender.com/api/v1/packs/pack-veg-001/download
   ```
   - Expected: `HTTP 200 OK`, valid manifest and SHA-256 checksum.

4. **Verify Frontend in Browser:**
   - Open `https://<your-frontend>.pages.dev/`.
   - Ensure green "Backend Connected" indicator appears.
   - Navigate to `/ask` and refresh page; confirm no 404 error.
   - Submit a test query; confirm evidence cards render with verified citations.
   - Go to `/library`, click "Download Pack" on Solanaceous Vegetables.
   - Open DevTools → Application → IndexedDB → `plant_doctor_offline_db` to verify local chunks and sources.
   - Toggle Chrome DevTools Network to "Offline" and ask a question. Verify that results are retrieved from local storage with the offline indicator and caveats.

---

## 7. Known Free-Tier Behaviors & Limitations

- **Render Free Cold Starts:** Render Free instances automatically spin down after 15 minutes of inactivity. When a new request arrives, boot time takes ~45–60 seconds. Subsequent requests execute in ~400ms.
- **Render Outbound Bandwidth:** 100 GB/month included on Free tier.
- **Cloudflare Pages:** 500 builds/month, unlimited bandwidth, global CDN caching.
- **MongoDB Atlas M0:** 512 MB storage, shared vCPU. Sufficient for thousands of chunk records and vector search indexes.
