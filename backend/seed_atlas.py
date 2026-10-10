"""Standalone script to verify Atlas connection, ensure indexes, and seed live MongoDB."""

import sys
import logging
from pymongo import MongoClient

from backend.app.config import settings
from backend.app.db.indexes import ensure_indexes, get_atlas_vector_search_instructions
from backend.app.db.repositories import (
    SourceRepository,
    EvidenceChunkRepository,
    KnowledgePackRepository,
)
from backend.app.services.ingestion import IngestionService
from backend.app.services.pack_service import KnowledgePackService
from backend.app.db.seed_data import seed_database_corpus

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("plantdoctor.seed_atlas")


def main():
    print("\n========================================================")
    print("  PLANT DOCTOR — MONGODB ATLAS SEEDING & INDEX ROUTINE  ")
    print("========================================================\n")

    uri = settings.mongodb_uri
    if not uri or "<" in uri or ">" in uri:
        print("❌ ERROR: MONGODB_URI in .env is missing or still contains angle brackets '<>'.")
        print("\nPlease update .env line 10:")
        print("MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?appName=PlantDoctor\n")
        print("Tips:")
        print("1. Remove '<' and '>'.")
        print("2. If your password contains '@', replace it with '%40'.")
        sys.exit(1)

    # Mask URI for display
    masked_uri = uri
    if "@" in uri:
        prefix, host = uri.rsplit("@", 1)
        scheme_user = prefix.split(":", 2)
        if len(scheme_user) >= 2:
            masked_uri = f"{scheme_user[0]}:{scheme_user[1]}:****@{host}"

    print(f"Connecting to MongoDB Atlas...")
    print(f"Target Database: '{settings.mongodb_db_name}'\n")

    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=8000)
        client.admin.command("ping")
        print("✅ SUCCESS: Successfully authenticated with MongoDB Atlas cluster!\n")
    except Exception as e:
        print(f"❌ AUTHENTICATION FAILED: {e}\n")
        print("Troubleshooting steps in MongoDB Atlas (https://cloud.mongodb.com/):")
        print("1. Go to 'Security' -> 'Database Access'.")
        print("   - Check that username 'tabhishek_db_user' exists.")
        print("   - Click 'Edit' and reset the password to verify the exact password.")
        print("2. Go to 'Security' -> 'Network Access'.")
        print("   - Ensure IP Access List allows '0.0.0.0/0' (Allow access from anywhere for development).\n")
        sys.exit(1)

    db = client[settings.mongodb_db_name]

    # 1. Ensure ordinary indexes
    print("Step 1: Creating database indexes on Atlas collections...")
    index_counts = ensure_indexes(db)
    for col, count in index_counts.items():
        print(f"  - Collection '{col}': {count} indexes created.")

    # 2. Seed sources and evidence chunks
    print("\nStep 2: Ingesting verified agricultural reference corpus into Atlas...")
    source_repo = SourceRepository(db)
    chunk_repo = EvidenceChunkRepository(db)
    pack_repo = KnowledgePackRepository(db)

    ingestion_service = IngestionService(source_repo, chunk_repo)
    pack_service = KnowledgePackService(pack_repo, source_repo, chunk_repo)

    source_count_before = source_repo.count()
    if source_count_before == 0:
        seeded_count = seed_database_corpus(ingestion_service)
        print(f"  - Ingested {seeded_count} official agricultural reference documents.")
        print(f"  - Chunks generated and embedded: {chunk_repo.count()}")
    else:
        print(f"  - Atlas already contains {source_count_before} sources ({chunk_repo.count()} chunks). Skipping re-seed.")

    # 3. Build baseline knowledge packs
    print("\nStep 3: Generating baseline offline knowledge packs in Atlas...")
    pack_count_before = pack_repo.count()
    if pack_count_before == 0:
        p1 = pack_service.build_pack(
            pack_id="pack-veg-001",
            name="Solanaceous & Tropical Vegetables",
            description="Diagnostic evidence and nutrient disorder management for tomato, pepper, and eggplant.",
            version="1.0.0",
            crop_categories=["Tomato", "Pepper", "Eggplant"],
            region="Tropical / Sub-tropical",
        )
        print(f"  - Created pack: {p1.name} (SHA-256: {p1.checksum[:16]}...)")

        p2 = pack_service.build_pack(
            pack_id="pack-rice-001",
            name="Lowland Paddy Rice Pathology",
            description="Blast prevention and water regulation for tropical flooded lowland rice.",
            version="1.0.0",
            crop_categories=["Rice"],
            region="Tropical",
        )
        print(f"  - Created pack: {p2.name} (SHA-256: {p2.checksum[:16]}...)")
    else:
        print(f"  - Atlas already contains {pack_count_before} knowledge packs.")

    # 4. Final summary
    print("\n========================================================")
    print("  LIVE ATLAS DATABASE STATUS: POPULATED & READY")
    print("========================================================")
    print(f"  Database Name:     {settings.mongodb_db_name}")
    print(f"  Sources:           {source_repo.count()} records")
    print(f"  Evidence Chunks:   {chunk_repo.count()} records (with 384-dim dense vectors)")
    print(f"  Knowledge Packs:   {pack_repo.count()} records")
    print("========================================================\n")

    print(get_atlas_vector_search_instructions())


if __name__ == "__main__":
    main()
