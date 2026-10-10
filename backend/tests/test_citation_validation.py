"""Tests for question answering, evidence provenance, and citation verification."""

def test_ask_question_applicable(client):
    res = client.post(
        "/api/v1/ask",
        json={
            "query": "Why are my tomato lower leaves yellowing and stunted?",
            "cropId": "tomato",
            "regionId": "temperate",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["overallStatus"] == "applicable"
    assert len(data["evidenceChunks"]) > 0

    # Verify each chunk has complete provenance
    for chunk in data["evidenceChunks"]:
        assert chunk["id"].startswith("chunk-")
        assert "source" in chunk
        assert chunk["source"]["title"]
        assert chunk["source"]["institution"]
        assert chunk["relevanceScore"] is not None


def test_ask_question_context_incomplete(client):
    res = client.post(
        "/api/v1/ask",
        json={
            "query": "The leaves are curling and have spots",
            # No crop specified
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["overallStatus"] == "context_incomplete"
    assert "Clarification required" in data["summary"]


def test_ask_question_conflicting_advice(client):
    res = client.post(
        "/api/v1/ask",
        json={
            "query": "Should I apply copper fungicide spray or avoid chemicals for early blight?",
            "cropId": "tomato",
            "regionId": "temperate",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["overallStatus"] == "conflicting_evidence"
    assert "Contrasting" in data["summary"]
