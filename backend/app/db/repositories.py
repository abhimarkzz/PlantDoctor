"""Data access repositories for Sources, Evidence Chunks, Knowledge Packs, and Evaluation Cases."""

import logging
from typing import Any, Dict, List, Optional
from pymongo.database import Database
from pymongo.errors import PyMongoError

from ..models.schemas import (
    SourceRecord,
    EvidenceChunkRecord,
    KnowledgePackRecord,
    EvaluationCaseRecord,
)
from .mongo import get_database

logger = logging.getLogger("plantdoctor.db.repos")


class BaseRepository:
    def __init__(self, db: Optional[Database] = None):
        self._custom_db = db
        # In-memory storage fallback for tests or disconnected environment
        self._memory_store: Dict[str, Dict[str, Any]] = {}

    @property
    def db(self) -> Optional[Database]:
        if self._custom_db is not None:
            return self._custom_db
        return get_database()

    @property
    def is_connected(self) -> bool:
        return self.db is not None


class SourceRepository(BaseRepository):
    def get_collection(self):
        return self.db["sources"] if self.db is not None else None

    def upsert(self, source: SourceRecord) -> SourceRecord:
        doc = source.model_dump()
        if self.is_connected:
            col = self.get_collection()
            col.update_one({"id": source.id}, {"$set": doc}, upsert=True)
        else:
            self._memory_store[source.id] = doc
        return source

    def get_by_id(self, source_id: str) -> Optional[SourceRecord]:
        if self.is_connected:
            col = self.get_collection()
            doc = col.find_one({"id": source_id})
            return SourceRecord.model_validate(doc) if doc else None
        else:
            doc = self._memory_store.get(source_id)
            return SourceRecord.model_validate(doc) if doc else None

    def find_by_identifier(self, identifier: str) -> Optional[SourceRecord]:
        if not identifier:
            return None
        if self.is_connected:
            col = self.get_collection()
            doc = col.find_one({"identifier": identifier})
            return SourceRecord.model_validate(doc) if doc else None
        else:
            for doc in self._memory_store.values():
                if doc.get("identifier") == identifier:
                    return SourceRecord.model_validate(doc)
            return None

    def find_by_checksum(self, checksum: str) -> Optional[SourceRecord]:
        if not checksum:
            return None
        if self.is_connected:
            col = self.get_collection()
            doc = col.find_one({"checksum": checksum})
            return SourceRecord.model_validate(doc) if doc else None
        else:
            for doc in self._memory_store.values():
                if doc.get("checksum") == checksum:
                    return SourceRecord.model_validate(doc)
            return None

    def list_all(self, limit: int = 100) -> List[SourceRecord]:
        if self.is_connected:
            col = self.get_collection()
            docs = list(col.find().limit(limit))
            return [SourceRecord.model_validate(d) for d in docs]
        else:
            return [SourceRecord.model_validate(d) for d in list(self._memory_store.values())[:limit]]

    def count(self) -> int:
        if self.is_connected:
            return self.get_collection().count_documents({})
        return len(self._memory_store)


class EvidenceChunkRepository(BaseRepository):
    def get_collection(self):
        return self.db["evidence_chunks"] if self.db is not None else None

    def upsert(self, chunk: EvidenceChunkRecord) -> EvidenceChunkRecord:
        doc = chunk.model_dump()
        if self.is_connected:
            col = self.get_collection()
            col.update_one({"id": chunk.id}, {"$set": doc}, upsert=True)
        else:
            self._memory_store[chunk.id] = doc
        return chunk

    def upsert_many(self, chunks: List[EvidenceChunkRecord]) -> int:
        count = 0
        for chunk in chunks:
            self.upsert(chunk)
            count += 1
        return count

    def get_by_id(self, chunk_id: str) -> Optional[EvidenceChunkRecord]:
        if self.is_connected:
            col = self.get_collection()
            doc = col.find_one({"id": chunk_id})
            return EvidenceChunkRecord.model_validate(doc) if doc else None
        else:
            doc = self._memory_store.get(chunk_id)
            return EvidenceChunkRecord.model_validate(doc) if doc else None

    def find_by_source_id(self, source_id: str) -> List[EvidenceChunkRecord]:
        if self.is_connected:
            col = self.get_collection()
            docs = list(col.find({"source_id": source_id}))
            return [EvidenceChunkRecord.model_validate(d) for d in docs]
        else:
            return [
                EvidenceChunkRecord.model_validate(d)
                for d in self._memory_store.values()
                if d.get("source_id") == source_id
            ]

    def delete_by_source_id(self, source_id: str) -> int:
        if self.is_connected:
            col = self.get_collection()
            res = col.delete_many({"source_id": source_id})
            return res.deleted_count
        else:
            keys_to_del = [k for k, v in self._memory_store.items() if v.get("source_id") == source_id]
            for k in keys_to_del:
                del self._memory_store[k]
            return len(keys_to_del)

    def list_all(self, limit: int = 500) -> List[EvidenceChunkRecord]:
        if self.is_connected:
            col = self.get_collection()
            docs = list(col.find().limit(limit))
            return [EvidenceChunkRecord.model_validate(d) for d in docs]
        else:
            return [EvidenceChunkRecord.model_validate(d) for d in list(self._memory_store.values())[:limit]]

    def count(self) -> int:
        if self.is_connected:
            return self.get_collection().count_documents({})
        return len(self._memory_store)


class KnowledgePackRepository(BaseRepository):
    def get_collection(self):
        return self.db["knowledge_packs"] if self.db is not None else None

    def upsert(self, pack: KnowledgePackRecord) -> KnowledgePackRecord:
        doc = pack.model_dump()
        if self.is_connected:
            col = self.get_collection()
            col.update_one({"id": pack.id}, {"$set": doc}, upsert=True)
        else:
            self._memory_store[pack.id] = doc
        return pack

    def get_by_id(self, pack_id: str) -> Optional[KnowledgePackRecord]:
        if self.is_connected:
            col = self.get_collection()
            doc = col.find_one({"id": pack_id})
            return KnowledgePackRecord.model_validate(doc) if doc else None
        else:
            doc = self._memory_store.get(pack_id)
            return KnowledgePackRecord.model_validate(doc) if doc else None

    def list_all(self) -> List[KnowledgePackRecord]:
        if self.is_connected:
            col = self.get_collection()
            docs = list(col.find())
            return [KnowledgePackRecord.model_validate(d) for d in docs]
        else:
            return [KnowledgePackRecord.model_validate(d) for d in self._memory_store.values()]

    def count(self) -> int:
        if self.is_connected:
            return self.get_collection().count_documents({})
        return len(self._memory_store)


class EvaluationCaseRepository(BaseRepository):
    def get_collection(self):
        return self.db["evaluation_cases"] if self.db is not None else None

    def upsert(self, case: EvaluationCaseRecord) -> EvaluationCaseRecord:
        doc = case.model_dump()
        if self.is_connected:
            col = self.get_collection()
            col.update_one({"case_id": case.case_id}, {"$set": doc}, upsert=True)
        else:
            self._memory_store[case.case_id] = doc
        return case

    def get_by_id(self, case_id: str) -> Optional[EvaluationCaseRecord]:
        if self.is_connected:
            col = self.get_collection()
            doc = col.find_one({"case_id": case_id})
            return EvaluationCaseRecord.model_validate(doc) if doc else None
        else:
            doc = self._memory_store.get(case_id)
            return EvaluationCaseRecord.model_validate(doc) if doc else None

    def list_all(self) -> List[EvaluationCaseRecord]:
        if self.is_connected:
            col = self.get_collection()
            docs = list(col.find())
            return [EvaluationCaseRecord.model_validate(d) for d in docs]
        else:
            return [EvaluationCaseRecord.model_validate(d) for d in self._memory_store.values()]

    def count(self) -> int:
        if self.is_connected:
            return self.get_collection().count_documents({})
        return len(self._memory_store)
