"""Knowledge pack generation, manifest creation, and export service."""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ..models.enums import KnowledgePackStatus
from ..models.schemas import (
    EvidenceChunkRecord,
    KnowledgePackOut,
    KnowledgePackRecord,
    SourceRecord,
)
from ..db.repositories import EvidenceChunkRepository, KnowledgePackRepository, SourceRepository

logger = logging.getLogger("plantdoctor.packs")


class KnowledgePackService:
    def __init__(
        self,
        pack_repo: KnowledgePackRepository,
        source_repo: SourceRepository,
        chunk_repo: EvidenceChunkRepository,
    ):
        self.pack_repo = pack_repo
        self.source_repo = source_repo
        self.chunk_repo = chunk_repo

    def build_pack(
        self,
        pack_id: str,
        name: str,
        description: str,
        version: str,
        crop_categories: List[str],
        region: Optional[str] = None,
    ) -> KnowledgePackRecord:
        """
        Builds a versioned knowledge pack bundling all chunks and sources
        associated with specified crops and region.
        Computes SHA-256 checksum over the serialized data payload.
        """
        all_chunks = self.chunk_repo.list_all()
        matching_chunks: List[EvidenceChunkRecord] = []
        matching_source_ids = set()

        crops_lower = [c.lower() for c in crop_categories]

        for chunk in all_chunks:
            chunk_crop = (chunk.crop_id or "").lower()
            if chunk_crop in crops_lower or "general" in crops_lower:
                matching_chunks.append(chunk)
                matching_source_ids.add(chunk.source_id)

        # Collect sources
        matching_sources: List[SourceRecord] = []
        for sid in matching_source_ids:
            src = self.source_repo.get_by_id(sid)
            if src:
                matching_sources.append(src)

        # Build payload representation to calculate SHA-256 checksum
        payload = {
            "format_version": "1.0",
            "pack_id": pack_id,
            "version": version,
            "sources": [s.model_dump() for s in matching_sources],
            "chunks": [c.model_dump(exclude={"embedding"}) for c in matching_chunks],
        }
        serialized = json.dumps(payload, sort_keys=True).encode("utf-8")
        checksum = hashlib.sha256(serialized).hexdigest()
        size_bytes = len(serialized)

        pack_record = KnowledgePackRecord(
            id=pack_id,
            name=name,
            description=description,
            version=version,
            region=region,
            crop_categories=crop_categories,
            size_bytes=size_bytes,
            source_count=len(matching_sources),
            chunk_ids=[c.id for c in matching_chunks],
            source_ids=list(matching_source_ids),
            checksum=checksum,
            last_updated=datetime.now(timezone.utc).isoformat(),
            last_synced=None,
            last_verified=datetime.now(timezone.utc).isoformat(),
            status=KnowledgePackStatus.AVAILABLE,
        )

        self.pack_repo.upsert(pack_record)
        logger.info(f"Generated knowledge pack '{name}' ({pack_id}) size={size_bytes}b, checksum={checksum[:8]}")
        return pack_record

    def get_pack_download_payload(self, pack_id: str) -> Optional[Dict[str, Any]]:
        """
        Returns full downloadable pack JSON payload for client-side IndexedDB persistence.
        """
        pack = self.pack_repo.get_by_id(pack_id)
        if not pack:
            return None

        # Gather sources
        sources = []
        for sid in pack.source_ids:
            src = self.source_repo.get_by_id(sid)
            if src:
                sources.append(src.model_dump())

        # Gather chunks
        chunks = []
        for cid in pack.chunk_ids:
            chunk = self.chunk_repo.get_by_id(cid)
            if chunk:
                # Exclude dense embedding from download to minimize payload size for low-bandwidth mobile
                chunks.append(chunk.model_dump(exclude={"embedding"}))

        return {
            "manifest": {
                "format_version": "1.0",
                "id": pack.id,
                "name": pack.name,
                "version": pack.version,
                "region": pack.region,
                "crop_categories": pack.crop_categories,
                "source_count": pack.source_count,
                "checksum": pack.checksum,
                "generated_at": pack.last_updated,
            },
            "pack": self._to_out(pack).model_dump(by_alias=True),
            "sources": sources,
            "chunks": chunks,
        }

    def _to_out(self, p: KnowledgePackRecord) -> KnowledgePackOut:
        return KnowledgePackOut(
            id=p.id,
            name=p.name,
            description=p.description,
            version=p.version,
            region=p.region,
            crop_categories=p.crop_categories,
            size_bytes=p.size_bytes,
            source_count=p.source_count,
            checksum=p.checksum,
            last_updated=p.last_updated,
            last_synced=p.last_synced,
            last_verified=p.last_verified,
            status=p.status,
        )

    def list_packs_out(self) -> List[KnowledgePackOut]:
        """Lists packs formatted for the API."""
        return [self._to_out(p) for p in self.pack_repo.list_all()]
