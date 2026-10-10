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
    EvaluationCaseRepository,
)
from backend.app.models.schemas import EvaluationCaseRecord
from backend.app.models.enums import EvidenceStatus
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
    seeded_count = seed_database_corpus(ingestion_service)
    print(f"  - Ingested/verified {seeded_count} official agricultural reference documents.")
    print(f"  - Current sources: {source_repo.count()}, Chunks embedded: {chunk_repo.count()}")

    # 3. Build baseline knowledge packs
    print("\nStep 3: Generating baseline offline knowledge packs in Atlas...")
    p1 = pack_service.build_pack(
        pack_id="pack-veg-001",
        name="Solanaceous & Tropical Vegetables",
        description="Diagnostic evidence and integrated management for tomato, pepper, and eggplant.",
        version="1.1.0",
        crop_categories=["Tomato", "Pepper", "Eggplant", "Chilli"],
        region="Tropical / Sub-tropical",
    )
    print(f"  - Updated pack: {p1.name} (v{p1.version}, SHA-256: {p1.checksum[:16]}...)")

    p2 = pack_service.build_pack(
        pack_id="pack-potato-001",
        name="Potato Pathology & Blight Management",
        description="Integrated management of Late Blight (Phytophthora infestans) and Early Blight for potato.",
        version="1.0.0",
        crop_categories=["Potato"],
        region="Sub-tropical / Temperate",
    )
    print(f"  - Created pack: {p2.name} (v{p2.version}, SHA-256: {p2.checksum[:16]}...)")

    p3 = pack_service.build_pack(
        pack_id="pack-rice-001",
        name="Lowland Paddy Rice Pathology",
        description="Blast prevention and water regulation for tropical flooded lowland rice.",
        version="1.0.0",
        crop_categories=["Rice"],
        region="Tropical",
    )
    print(f"  - Created pack: {p3.name} (v{p3.version}, SHA-256: {p3.checksum[:16]}...)")

    p4 = pack_service.build_pack(
        pack_id="pack-cereals-fruits-001",
        name="Horticultural Fruits & Field Cereals",
        description="Diagnostic guidance for maize foliar blights, citrus greening, grape esca, and apple scab.",
        version="1.0.0",
        crop_categories=["Corn", "Maize", "Orange", "Citrus", "Grape", "Apple"],
        region="All-India / Temperate & Sub-tropical",
    )
    print(f"  - Created pack: {p4.name} (v{p4.version}, SHA-256: {p4.checksum[:16]}...)")

    # 4. Ensure evaluation cases
    print("\nStep 4: Ensuring evaluation benchmark cases in Atlas...")
    eval_repo = EvaluationCaseRepository(db)
    if eval_repo.count() == 0:
        eval_cases = [
            EvaluationCaseRecord(
                case_id="eval-001",
                query="What causes uniform yellowing of older lower tomato leaves?",
                crop_id="tomato",
                region_id="temperate",
                expected_source_ids=["src-7233dae1"],
                expected_status=EvidenceStatus.APPLICABLE,
                expected_abstention=False,
                notes="Tomato nitrogen deficiency - oldest lower leaves yellow first."
            ),
            EvaluationCaseRecord(
                case_id="eval-002",
                query="Concentric rings bullseye dark spots on lower tomato leaves",
                crop_id="tomato",
                region_id="temperate",
                expected_source_ids=["src-301141a6"],
                expected_status=EvidenceStatus.APPLICABLE,
                expected_abstention=False,
                notes="Alternaria solani early blight bullseye symptom diagnosis."
            ),
            EvaluationCaseRecord(
                case_id="eval-003",
                query="Diamond spindle shaped lesions with grey centers in flooded paddy",
                crop_id="rice",
                region_id="tropical",
                expected_source_ids=["src-d77ca02c"],
                expected_status=EvidenceStatus.APPLICABLE,
                expected_abstention=False,
                notes="Magnaporthe oryzae lowland paddy blast lesion diagnosis."
            ),
            EvaluationCaseRecord(
                case_id="eval-004",
                query="Can I use chemical fungicide spray or organic biocontrol for tomato early blight?",
                crop_id="tomato",
                region_id="temperate",
                expected_source_ids=["src-301141a6", "src-064f83aa"],
                expected_status=EvidenceStatus.CONFLICTING_EVIDENCE,
                expected_abstention=False,
                notes="Conflicting management: USDA conventional copper/chlorothalonil vs NCAT organic bio-control."
            ),
            EvaluationCaseRecord(
                case_id="eval-005",
                query="Treatment for rice blast foliar burning",
                crop_id="tomato",
                region_id="temperate",
                expected_source_ids=[],
                expected_status=EvidenceStatus.INSUFFICIENT_EVIDENCE,
                expected_abstention=True,
                notes="Hard crop mismatch: asking rice blast treatment in tomato crop context."
            ),
        ]
        for ec in eval_cases:
            eval_repo.upsert(ec)
        print(f"  - Seeded {len(eval_cases)} golden evaluation benchmark cases.")
    else:
        print(f"  - Atlas already contains {eval_repo.count()} evaluation cases.")

    # 5. Final summary
    print("\n========================================================")
    print("  LIVE ATLAS DATABASE STATUS: POPULATED & READY")
    print("========================================================")
    print(f"  Database Name:     {settings.mongodb_db_name}")
    print(f"  Sources:           {source_repo.count()} records")
    print(f"  Evidence Chunks:   {chunk_repo.count()} records (with 384-dim dense vectors)")
    print(f"  Knowledge Packs:   {pack_repo.count()} records")
    print(f"  Evaluation Cases:  {eval_repo.count()} records")
    print("========================================================\n")

    print(get_atlas_vector_search_instructions())


if __name__ == "__main__":
    main()
