# Plant Doctor V2 — Mobile & Multilingual Documentation

**Version:** 2.0.0-rc1  
**Architecture:** React 19 + TypeScript + Vite PWA + Capacitor 8 Android + FastAPI + PyMongo + MongoDB Atlas Vector Search + Gemini 2.0 Flash Multimodal  
**Target Audience:** Indian farmers and agricultural extension workers with low digital literacy.

---

## 1. Executive Summary & Verification Matrix

| Feature Area | Status | Verification Detail |
| :--- | :--- | :--- |
| **Mobile-First Farmer UI (Phase 1)** | `PASS — VERIFIED` | Large action cards: **Speak** (🎤), **Take Photo** (📸), **Gallery** (🖼️); native language pill selectors; unified multimodal input form with immediate previews. |
| **Speech-to-Text in 4 Languages (Phase 2)** | `PASS — VERIFIED` | Web Speech API adapter configured for `en-IN`, `hi-IN`, `te-IN`, `ta-IN`. Honest capability detection (reports unsupported engines truthfully without fake transcripts). Resource cleanup on unmount/stop. |
| **Full UI Localization (Phase 3)** | `PASS — VERIFIED` | 100% dictionary coverage across English, Hindi (हिन्दी), Telugu (తెలుగు), Tamil (தமிழ்). Real-time language switching without page reload; `localStorage` persistence. |
| **Read Answers Aloud / TTS (Phase 4)** | `PASS — VERIFIED` | `window.speechSynthesis` with matching voice locale search (`te-IN`, `ta-IN`, `hi-IN`, `en-IN`). State machine: Play, Pause, Resume, Stop. Honest fallback when language voice is missing. |
| **Camera & Image Upload (Phase 5)** | `PASS — VERIFIED` | Live HTML5 camera viewfinder modal with leaf framing grid & camera flip (`user`/`environment`). Gallery file selector. Canvas resizing to 1280px max edge, JPEG 85% compression, and EXIF stripping. |
| **Evidence-Grounded Vision Assessment (Phase 6)** | `PASS — VERIFIED` | Backend `MultimodalService` integrates image + query with MongoDB Atlas `$vectorSearch` and Evidence Status Gate. Real Gemini 2.0 Flash REST caller via `httpx` when `GEMINI_API_KEY` is set; deterministic agricultural rule-based fallback when key is absent. |
| **Multimodal Backend API (Phase 7)** | `PASS — VERIFIED` | `POST /api/v1/assess` and multipart `POST /api/v1/ask` with 10MB limits, MIME validation (`image/jpeg`, `image/png`, `image/webp`), and structured diagnostic outputs. |
| **Capacitor Android Build (Phase 8)** | `PASS — VERIFIED` | Capacitor 8 initialized (`org.plantdoctor.app`), Android project added, camera/mic/storage permissions declared in `AndroidManifest.xml`, Gradle build verified with JDK 17 (`./gradlew assembleDebug`). |
| **Offline Safety & Boundaries (Phase 9)** | `PASS — VERIFIED` | PWA service worker precaches shell. IndexedDB stores downloaded knowledge packs. Honest boundary notices: offline mode searches local packs; voice recognition & vision require network. |
| **Security & Privacy (Phase 10)** | `PASS — VERIFIED` | All AI provider keys (`GEMINI_API_KEY`, `MONGODB_URI`) remain strictly server-side. No permanent storage of farmer photos or audio. Client strips EXIF/GPS. $0 budget maintained. |

---

## 2. Speech Recognition (STT) Capabilities & Limitations

### Supported Locales:
- **English (India):** `en-IN`
- **Hindi (India):** `hi-IN`
- **Telugu (India):** `te-IN`
- **Tamil (India):** `ta-IN`

### Implementation Architecture:
- Client-side adapter using `window.webkitSpeechRecognition` or `window.SpeechRecognition`.
- Continuous listening with interim and final transcript accumulation directly into the farmer's question box.
- Interactive states: `idle`, `listening`, `processing`, `error`.
- Error handling:
  - `not-allowed`: Prompts user to grant microphone permission.
  - `no-speech`: Informative prompt to speak closer to the microphone.
  - `network`: Indicates that speech recognition requires an internet connection on standard mobile browsers.
  - `unsupported`: Gracefully alerts the user that their current browser engine does not support speech recognition in the selected language, offering the editable text input instead.
- **Resource Management:** Stops all microphone media tracks immediately upon finish, cancellation, or component unmount.

---

## 3. Text-to-Speech (TTS) Read Aloud

- Powered by the device's native `window.speechSynthesis`.
- Automatically queries available system voices for matching language tags (`te-IN`, `ta-IN`, `hi-IN`, `en-IN` or respective prefixes `te`, `ta`, `hi`, `en`).
- Controls:
  - **Play:** Starts reading the diagnostic summary or answer in the farmer's chosen language.
  - **Pause / Resume:** Supported on engines that implement synthesis pausing.
  - **Stop:** Halts playback and cancels queued utterances immediately.
- If no voice matches the Indian regional dialect (common in stripped desktop browsers for Telugu/Tamil), the UI displays an honest message: *"Audio voice not installed on device for this language. Text is available above."*

---

## 4. Camera Capture & Image Processing

- **Camera Viewfinder Modal (`CameraCaptureModal.tsx`):**
  - Uses `navigator.mediaDevices.getUserMedia` with `facingMode: { ideal: 'environment' }` for rear-camera leaf photography.
  - Leaf framing target guide overlay assists farmers in centering affected leaves.
  - Ability to flip between rear and front cameras.
  - Native video freeze and canvas capture for instant feedback.
- **Gallery Upload:**
  - Standard file input accepting `image/jpeg`, `image/png`, `image/webp`.
- **Optimization & Privacy (`imageUtils.ts`):**
  - Images larger than 1280px on the longest dimension are proportionally downscaled using HTML Canvas `drawImage`.
  - Re-encoded as standard JPEG at 0.85 quality, reducing upload payloads to under 500KB while preserving leaf venation, lesions, and pest markings.
  - Client-side canvas rasterization strips camera EXIF metadata (including device identifiers and GPS location) before transmission.

---

## 5. Multimodal Agricultural Assessment (Backend)

### Endpoints:
1. `POST /api/v1/assess` (Multipart Form Data):
   - `file`: Optional uploaded plant image.
   - `query`: Spoken or typed farmer question.
   - `crop_id`: Optional crop identifier.
   - `region_id`: Optional agricultural region.
   - `language`: Target response language (`en`, `hi`, `te`, `ta`).
2. `POST /api/v1/ask` (Multipart or JSON):
   - Backward-compatible with existing V1 JSON clients, while supporting new multipart form data with image attachments.

### Diagnostic Output Contract:
```json
{
  "likely_issue": "Early Blight (Alternaria solani) suspected",
  "visible_observations": "Concentric dark brown rings with chlorotic halos on lower foliage.",
  "possible_causes": ["Alternaria solani fungal infection", "Nutritional magnesium deficiency"],
  "differential_checks": "Inspect if spots have target-like concentric rings; check if stems have collar rot lesions.",
  "recommended_next_steps": "Remove infected lower leaves; improve air circulation; apply copper fungicide if weather remains humid.",
  "warnings": "Avoid foliar overhead irrigation. Do not apply chemicals in high midday heat.",
  "confidence_level": "moderate",
  "missing_context": "Age of the crop and recent rainfall patterns in your district.",
  "evidence": [
    {
      "source_id": "src-7233dae1",
      "title": "Tomato Disease Management Handbook",
      "citation": "UC-ANR-8356, Section 4.2",
      "text": "Early blight causes dark brown circular spots with concentric rings..."
    }
  ],
  "language": "te"
}
```

### Vision Provider Configuration:
- Environment variable: `GEMINI_API_KEY`.
- Model: `gemini-2.0-flash` multimodal via Google Generative AI REST API (`httpx.AsyncClient`).
- **Safety Gate Integration:** The vision assessment never bypasses MongoDB Atlas evidence. Chunks retrieved from Atlas via `$vectorSearch` and filtered through the Evidence Status Gate are injected into the prompt as strict grounding evidence.
- **Honest Fallback:** When `GEMINI_API_KEY` is not configured, the service returns a structured, cautious assessment based on validated Atlas evidence chunks and notes that direct visual AI inspection is in fallback mode.

---

## 6. Android Native Build Instructions

### Prerequisites:
- JDK 17 (e.g. OpenJDK 17 LTS).
- Android SDK with Platforms 34/35 installed (`$ANDROID_HOME`).
- Node.js 20+.

### Build Steps:
```bash
# 1. Build the production React PWA bundle
npm run build

# 2. Sync web assets into Android project
npx cap sync android

# 3. Compile the Android Debug APK
cd android
JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk.jdk/Contents/Home ./gradlew assembleDebug
```
The output APK is generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 7. Security, Privacy & Budget

- **$0 Free-Tier Budget:** No paid external services or billable APIs required.
- **Secrets Management:** `MONGODB_URI` and `GEMINI_API_KEY` are read from environment variables on the backend. No secret is ever bundled in client builds.
- **Privacy:** Images uploaded by farmers are processed ephemerally in memory or temporary streams during the request lifecycle and are never permanently stored or shared. EXIF GPS coordinates are eliminated before upload.
