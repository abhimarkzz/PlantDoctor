"""Tests for dense vector search, text search, and Reciprocal Rank Fusion."""

from backend.app.deps import get_retrieval_service


def test_vector_search():
    retrieval = get_retrieval_service()
    chunks = retrieval.vector_search("tomato yellow lower leaves nitrogen", limit=5)
    assert len(chunks) > 0
    # Top chunk should have high relevance score and discuss tomato nitrogen/deficiency
    top_chunk = chunks[0]
    assert top_chunk.relevance_score is not None
    assert top_chunk.relevance_score > 0.5
    assert "nitrogen" in top_chunk.text.lower() or "yellow" in top_chunk.text.lower()


def test_text_search():
    retrieval = get_retrieval_service()
    chunks = retrieval.text_search("blossom end rot calcium", limit=5)
    assert len(chunks) > 0
    assert any("blossom end rot" in c.text.lower() for c in chunks)


def test_hybrid_search_rrf():
    retrieval = get_retrieval_service()
    chunks = retrieval.hybrid_search("early blight Alternaria solani bullseye", limit=5)
    assert len(chunks) > 0
    assert any("early blight" in c.text.lower() for c in chunks)
