"""Embedding service generating real dense vector representations."""

import logging
import math
from typing import List, Optional
from fastembed import TextEmbedding

from ..config import settings

logger = logging.getLogger("plantdoctor.embeddings")

_embedding_instance: Optional["EmbeddingService"] = None


class EmbeddingService:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.embedding_model
        logger.info(f"Initializing FastEmbed model: {self.model_name}")
        self._model = TextEmbedding(self.model_name)
        self.dimension = settings.embedding_dimension

    def embed_query(self, query: str) -> List[float]:
        """Embed a single query into a 384-dimensional vector."""
        if not query or not query.strip():
            return [0.0] * self.dimension
        embeddings = list(self._model.embed([query.strip()]))
        return [float(x) for x in embeddings[0]]

    def embed_documents(self, documents: List[str]) -> List[List[float]]:
        """Embed a batch of text passages into vectors."""
        if not documents:
            return []
        cleaned = [d.strip() if d and d.strip() else "empty passage" for d in documents]
        embeddings = list(self._model.embed(cleaned))
        return [[float(x) for x in vec] for vec in embeddings]

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Compute cosine similarity between two unit vectors."""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        dot = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1))
        norm2 = math.sqrt(sum(b * b for b in vec2))
        if norm1 == 0.0 or norm2 == 0.0:
            return 0.0
        return max(0.0, min(1.0, dot / (norm1 * norm2)))


def get_embedding_service() -> EmbeddingService:
    global _embedding_instance
    if _embedding_instance is None:
        _embedding_instance = EmbeddingService()
    return _embedding_instance
