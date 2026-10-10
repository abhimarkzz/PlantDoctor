"""Tests for knowledge packs endpoints, manifests, and downloadable packages."""

import hashlib
import json


def test_list_knowledge_packs(client):
    res = client.get("/api/v1/packs")
    assert res.status_code == 200
    packs = res.json()
    assert len(packs) >= 2
    for p in packs:
        assert p["id"]
        assert p["version"]
        assert len(p["checksum"]) == 64  # Valid SHA-256 hex string


def test_get_knowledge_pack_detail(client):
    res = client.get("/api/v1/packs/pack-veg-001")
    assert res.status_code == 200
    pack = res.json()
    assert pack["id"] == "pack-veg-001"
    assert "Tomato" in pack["cropCategories"]


def test_download_knowledge_pack_payload(client):
    res = client.get("/api/v1/packs/pack-veg-001/download")
    assert res.status_code == 200
    payload = res.json()

    assert "manifest" in payload
    assert "sources" in payload
    assert "chunks" in payload
    assert len(payload["sources"]) > 0
    assert len(payload["chunks"]) > 0

    # Verify manifest integrity
    manifest = payload["manifest"]
    assert manifest["id"] == "pack-veg-001"
    assert manifest["format_version"] == "1.0"
    assert manifest["checksum"]

    # Verify each chunk has text and sourceId
    for chunk in payload["chunks"]:
        assert chunk["text"]
        assert chunk["source_id"]
