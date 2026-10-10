"""Local on-device and backend image classifier service using real ONNX MobileNetV2."""

import io
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import onnxruntime as ort
from PIL import Image
from pydantic import BaseModel, Field

logger = logging.getLogger("plantdoctor.classifier")

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "models" / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "mobilenet_v2_plant_disease.onnx"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"


class CandidatePrediction(BaseModel):
    label: str
    crop: str
    condition: str
    probability: float
    is_healthy: bool


class PlantClassificationResult(BaseModel):
    label: str
    crop_id: str
    condition_id: str
    condition_name: str
    confidence: float
    is_healthy: bool
    should_abstain: bool = False
    abstention_reason: Optional[str] = None
    suggested_query: str
    top_candidates: List[CandidatePrediction] = Field(default_factory=list)
    model_name: str = "MobileNetV2 Plant Disease Classifier"
    model_version: str = "1.0.0"


class PlantClassifierService:
    def __init__(self, model_path: Optional[str] = None, metadata_path: Optional[str] = None):
        self.model_path = Path(model_path) if model_path else MODEL_PATH
        self.metadata_path = Path(metadata_path) if metadata_path else METADATA_PATH
        self._session: Optional[ort.InferenceSession] = None
        self._metadata: Dict[str, Any] = {}
        self._load()

    def _load(self) -> None:
        if not self.model_path.exists():
            logger.warning(f"ONNX plant classifier model not found at {self.model_path}")
            return
        if not self.metadata_path.exists():
            logger.warning(f"ONNX metadata not found at {self.metadata_path}")
            return

        try:
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self._metadata = json.load(f)

            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 2
            opts.inter_op_num_threads = 1
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            self._session = ort.InferenceSession(str(self.model_path), sess_options=opts)
            logger.info("Successfully initialized ONNX plant classifier session.")
        except Exception as e:
            logger.error(f"Failed to load ONNX model session: {e}", exc_info=True)
            self._session = None

    @property
    def is_available(self) -> bool:
        return self._session is not None and bool(self._metadata)

    def classify_image(self, image_bytes: bytes) -> Optional[PlantClassificationResult]:
        """Classifies plant leaf photo using ONNX runtime and taxonomy."""
        if not self.is_available:
            logger.warning("Plant classifier session is unavailable.")
            return None

        # 1. Decode image
        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            logger.warning(f"Failed to decode image bytes: {e}")
            return PlantClassificationResult(
                label="Unreadable Image",
                crop_id="unknown",
                condition_id="unreadable",
                condition_name="Unreadable Image",
                confidence=0.0,
                is_healthy=False,
                should_abstain=True,
                abstention_reason="Uploaded image could not be decoded. Please upload a standard JPEG, PNG, or WebP photo.",
                suggested_query="Plant disease identification",
            )

        # 2. Basic image quality & non-plant check
        w, h = pil_img.size
        if w < 40 or h < 40:
            return PlantClassificationResult(
                label="Low Resolution",
                crop_id="unknown",
                condition_id="low_resolution",
                condition_name="Image Too Small",
                confidence=0.0,
                is_healthy=False,
                should_abstain=True,
                abstention_reason="Image resolution is too low (<40px) to distinguish botanical symptoms.",
                suggested_query="Plant disease identification",
            )

        # Check for uninformative blank/black/white frames
        img_np = np.array(pil_img, dtype=np.float32)
        mean_val = float(np.mean(img_np))
        std_val = float(np.std(img_np))

        if std_val < 10.0 or mean_val < 15.0 or mean_val > 242.0:
            return PlantClassificationResult(
                label="Uninformative Frame",
                crop_id="unknown",
                condition_id="uninformative",
                condition_name="Uninformative / Underexposed Frame",
                confidence=0.0,
                is_healthy=False,
                should_abstain=True,
                abstention_reason="Image is uninformative, extremely dark, or overexposed. Please capture a clear, well-lit photo of the foliage.",
                suggested_query="Plant disease identification",
            )

        # 3. Preprocessing (Resize shortest edge 256, center crop 224x224, normalize mean=0.5, std=0.5)
        if w < h:
            new_w = 256
            new_h = int(h * 256 / w)
        else:
            new_h = 256
            new_w = int(w * 256 / h)
        img_resized = pil_img.resize((new_w, new_h), Image.Resampling.BILINEAR)

        left = (new_w - 224) // 2
        top = (new_h - 224) // 2
        img_cropped = img_resized.crop((left, top, left + 224, top + 224))

        arr = np.array(img_cropped, dtype=np.float32) / 255.0
        arr = (arr - 0.5) / 0.5
        arr = np.transpose(arr, (2, 0, 1))  # (3, 224, 224)
        tensor = np.expand_dims(arr, axis=0)  # (1, 3, 224, 224)

        # 4. Run inference
        try:
            input_name = self._session.get_inputs()[0].name
            output_name = self._session.get_outputs()[0].name
            logits = self._session.run([output_name], {input_name: tensor})[0][0]
        except Exception as e:
            logger.error(f"Inference session execution failed: {e}")
            return None

        # 5. Softmax & Entropy
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / np.sum(exp_logits)
        entropy = -float(np.sum(probs * np.log(probs + 1e-12)))

        sorted_indices = np.argsort(probs)[::-1]
        top_idx = int(sorted_indices[0])
        top_conf = float(probs[top_idx])

        taxonomy = self._metadata.get("taxonomy", {})
        top_item = taxonomy.get(str(top_idx), {
            "label": f"Class {top_idx}",
            "crop": "unknown",
            "condition": "Plant Condition",
            "healthy": False,
        })

        # Collect top candidates
        candidates: List[CandidatePrediction] = []
        for idx in sorted_indices[:3]:
            tax = taxonomy.get(str(idx), {})
            candidates.append(
                CandidatePrediction(
                    label=tax.get("label", f"Class {idx}"),
                    crop=tax.get("crop", "unknown"),
                    condition=tax.get("condition", "Unknown Condition"),
                    probability=round(float(probs[idx]), 4),
                    is_healthy=tax.get("healthy", False),
                )
            )

        # 6. Evaluation-backed confidence & abstention threshold
        # If confidence is lower than 0.20 or entropy is excessively high (>3.2), abstain
        should_abstain = False
        abstention_reason = None
        if top_conf < 0.20 or entropy > 3.2:
            should_abstain = True
            abstention_reason = (
                f"Model confidence ({top_conf:.1%}) is below the calibrated diagnostic threshold (20%). "
                "The symptom pattern is ambiguous or outside known supported crop diseases."
            )

        crop_id = top_item.get("crop", "unknown")
        condition_name = top_item.get("condition", top_item.get("label", "Plant Health Issue"))

        # Build natural search query for RAG
        if top_item.get("healthy", False):
            suggested_query = f"{crop_id} healthy plant maintenance agronomic practices"
        else:
            suggested_query = f"{crop_id} {condition_name} symptoms cause management control"

        return PlantClassificationResult(
            label=top_item.get("label", f"Class {top_idx}"),
            crop_id=crop_id,
            condition_id=top_item.get("label", "").lower().replace(" ", "_"),
            condition_name=condition_name,
            confidence=round(top_conf, 4),
            is_healthy=top_item.get("healthy", False),
            should_abstain=should_abstain,
            abstention_reason=abstention_reason,
            suggested_query=suggested_query,
            top_candidates=candidates,
        )
