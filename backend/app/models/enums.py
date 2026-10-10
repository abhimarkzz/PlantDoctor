"""Domain enums for Plant Doctor."""

from enum import Enum


class EvidenceStatus(str, Enum):
    APPLICABLE = "applicable"
    CONTEXT_INCOMPLETE = "context_incomplete"
    CONFLICTING_EVIDENCE = "conflicting_evidence"
    FRESHNESS_UNVERIFIED = "freshness_unverified"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class SourceStatus(str, Enum):
    VERIFIED = "verified"
    FRESHNESS_UNVERIFIED = "freshness_unverified"
    DEPRECATED = "deprecated"
    WITHDRAWN = "withdrawn"


class KnowledgePackStatus(str, Enum):
    AVAILABLE = "available"
    DOWNLOADING = "downloading"
    DOWNLOADED = "downloaded"
    UPDATE_AVAILABLE = "update_available"
