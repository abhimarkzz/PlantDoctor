"""Tests for multimodal agricultural assessment and multilingual endpoints."""

import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_assess_text_only_query():
    """Verify text-only multimodal assessment returns structured diagnostic result."""
    payload = {
        "query": "Why are my tomato leaves turning yellow with brown concentric rings?",
        "crop_id": "Tomato",
        "region_id": "Tropical / Sub-tropical",
        "language": "hi",
    }
    response = client.post("/api/v1/assess", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["query"] == payload["query"]
    assert "likelyIssue" in data
    assert isinstance(data["visibleObservations"], list)
    assert isinstance(data["possibleCauses"], list)
    assert isinstance(data["differentialChecks"], list)
    assert isinstance(data["recommendedNextSteps"], list)
    assert isinstance(data["warnings"], list)
    assert "confidenceLevel" in data
    assert data["language"] == "hi"
    assert data["overallStatus"] in ["applicable", "freshness_unverified", "context_incomplete"]


def test_assess_with_multipart_image():
    """Verify assessment with valid uploaded image file attachment."""
    from PIL import Image
    img = Image.new("RGB", (224, 224), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    valid_jpeg = buf.getvalue()

    files = {"image": ("test_leaf.jpg", io.BytesIO(valid_jpeg), "image/jpeg")}
    data = {
        "query": "Are these brown spots early blight or nutrient deficiency on Tomato?",
        "cropId": "Tomato",
        "regionId": "Tropical / Sub-tropical",
        "language": "te",
    }

    response = client.post("/api/v1/assess", data=data, files=files)
    assert response.status_code == 200, response.text
    result = response.json()

    assert result["imageAttached"] is True
    assert result["language"] == "te"
    assert len(result["visibleObservations"]) > 0
    assert "Tomato" in result["likelyIssue"] or "టమోటా" in result["likelyIssue"] or "Symptom" in result["likelyIssue"] or "లక్షణాల" in result["likelyIssue"]


def test_photo_only_diagnosis():
    """Verify photo-only plant diagnosis works without typing a question."""
    from PIL import Image
    img = Image.new("RGB", (224, 224), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    valid_jpeg = buf.getvalue()

    files = {"image": ("field_leaf.jpg", io.BytesIO(valid_jpeg), "image/jpeg")}
    data = {"query": "", "language": "hi"}

    response = client.post("/api/v1/ask", data=data, files=files)
    assert response.status_code == 200, response.text
    result = response.json()
    assert "summary" in result
    assert "overallStatus" in result
    assert "assessment" in result
    assert result["assessment"]["imageAttached"] is True
    assert result["assessment"]["visionModelStatus"] == "onnx_mobilenet_v2_active"


def test_assess_rejects_invalid_mime_type():
    """Verify non-image attachment (e.g. text file) is rejected with 422."""
    files = {"image": ("malicious.txt", io.BytesIO(b"not an image"), "text/plain")}
    data = {"query": "How to treat yellow spots?"}

    response = client.post("/api/v1/assess", data=data, files=files)
    assert response.status_code == 422
    assert "Invalid image type" in response.text


def test_assess_rejects_oversized_image():
    """Verify image exceeding 10MB limit is rejected with 422."""
    # 10.5 MB mock buffer
    oversized = io.BytesIO(b"0" * (11 * 1024 * 1024))
    files = {"image": ("large.jpg", oversized, "image/jpeg")}
    data = {"query": "How to treat leaf rust?"}

    response = client.post("/api/v1/assess", data=data, files=files)
    assert response.status_code == 422
    assert "too large" in response.text


def test_ask_endpoint_backward_compatibility():
    """Verify /api/v1/ask continues to return standard AnswerResult and includes assessment when requested."""
    response = client.post(
        "/api/v1/ask",
        json={"query": "Blast lesions on paddy rice leaf tips", "cropId": "Rice", "regionId": "Tropical"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "overallStatus" in data
    assert "evidenceChunks" in data
    assert "assessment" in data  # Multimodal assessment attached
    assert data["assessment"]["likelyIssue"] is not None
