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
    # Create a tiny mock 1x1 JPEG byte stream
    mock_jpeg = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00"
        b"\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f"
        b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01"
        b"\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
        b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    )

    files = {"image": ("test_leaf.jpg", io.BytesIO(mock_jpeg), "image/jpeg")}
    data = {
        "query": "Are these brown spots early blight or nutrient deficiency?",
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
