"""Regression tests for /api/v1/ask input validation.

These exercise the validation path only (before retrieval), so they do not
require live Atlas and run against the in-memory test services.
"""


def test_whitespace_only_query_rejected(client):
    """A whitespace-only query must be rejected, not treated as valid."""
    res = client.post("/api/v1/ask", json={"query": "   ", "cropId": "tomato"})
    assert res.status_code == 422
    # Safe message, no stack trace leaked
    assert "detail" in res.json()
    assert "Traceback" not in res.text


def test_too_short_query_returns_422_not_500(client):
    """A sub-threshold query must return 422, not an unhandled 500."""
    res = client.post("/api/v1/ask", json={"query": "hi", "cropId": "tomato"})
    assert res.status_code == 422


def test_missing_query_returns_422(client):
    res = client.post("/api/v1/ask", json={"cropId": "tomato"})
    assert res.status_code == 422


def test_question_alias_still_accepted(client):
    """The 'question' alias should still map to 'query' (backward compatible)."""
    res = client.post("/api/v1/ask", json={"question": "My tomato leaves have yellow spots", "cropId": "tomato"})
    assert res.status_code == 200
