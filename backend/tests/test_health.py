"""Tests for /health and /api/health endpoints."""

def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "database" in data
    assert data["database"] in ["connected", "unconfigured", "unavailable"]
    assert data["embeddingModel"] == "BAAI/bge-small-en-v1.5"
    assert data["embeddingDimension"] == 384
    assert data["version"] == "0.1.0"


def test_api_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
