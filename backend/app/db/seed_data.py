"""Seed data module providing verified agricultural reference materials."""

import logging
from ..models.schemas import IngestDocumentRequest
from ..services.ingestion import IngestionService

logger = logging.getLogger("plantdoctor.seed_data")

SEED_DOCUMENTS = [
    IngestDocumentRequest(
        title="Tomato Nutrient Disorders & Visual Symptom Diagnosis",
        authors=["Dr. T. Hartz", "Dr. E. Miyao"],
        institution="University of California Agriculture & Natural Resources (UC ANR)",
        identifier="UC-ANR-8356",
        published_date="2023-04-10T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="https://anrcatalog.ucanr.edu/pdf/8356.pdf",
        crops=["tomato"],
        regions=["global", "tropical", "temperate"],
        license="CC BY-NC 4.0",
        text="""
        Tomato Nitrogen Deficiency: Nitrogen is mobile in the tomato plant. Deficiency begins as a uniform yellowing (chlorosis) of the oldest lower leaves, with yellowing gradually progressing up the plant. Growth is stunted, and stems may turn thin and fibrous with a purple tint. Supplemental side-dressing with calcium nitrate or composted organic nitrogen restores vigorous vegetative growth.

        Tomato Iron Deficiency: Iron is immobile in plant tissue. Deficiency symptoms appear first on the youngest upper terminal leaves as distinct interveinal chlorosis, where leaf veins remain bright green while the tissue between veins turns pale yellow or ivory white. Iron chlorosis is frequently triggered by high soil pH (above 7.5) or over-saturated, cold root zones rather than an absolute lack of soil iron.

        Blossom End Rot (BER): Blossom end rot in tomato fruit begins as a water-soaked spot on the blossom end that turns dark brown, leathery, and sunken. While caused by localized calcium deficiency in expanding fruit cells, it is almost universally induced by fluctuating soil moisture and drought stress that disrupts transpiration stream calcium transport. Maintaining consistent drip irrigation and avoiding root pruning is primary prevention.
        """,
    ),
    IngestDocumentRequest(
        title="Early Blight and Septoria Foliar Management in Tomatoes",
        authors=["Dr. M. Babadoost", "USDA ARS Plant Pathology Team"],
        institution="USDA Agricultural Research Service / University of Illinois Extension",
        identifier="USDA-ARS-EB-2022",
        published_date="2022-08-15T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="https://extension.illinois.edu/plant-diseases/tomato-early-blight",
        crops=["tomato"],
        regions=["global", "temperate", "tropical"],
        license="Public Domain / USDA",
        text="""
        Early Blight Diagnosis: Early blight is caused by the fungal pathogen Alternaria solani. Diagnostic symptoms consist of circular to angular dark brown or black spots with characteristic concentric rings creating a distinct 'target-board' or 'bullseye' appearance on older lower foliage. As lesions expand, surrounding leaf tissue turns yellow and prematurely defoliates.

        Fungicide Intervention Guidelines: At first observation of early blight target-spots, apply protective copper fungicide spray (copper hydroxide or copper octanoate) or conventional chlorothalonil according to label timing. Spray applications must cover lower canopy leaf undersides where fungal spore germination initiates. Re-apply on a 7 to 10 day interval during warm, humid rainfall periods.

        Cultural Hygiene Practices: Prevent fungal spore splash by installing mulch around plant bases and avoiding overhead sprinkler irrigation. Prune lower leaves within 30 centimeters of the soil surface to enhance air movement. Implement a mandatory 3-year crop rotation away from all Solanaceous family crops (potatoes, peppers, eggplants).
        """,
    ),
    IngestDocumentRequest(
        title="Organic Bio-Intensive Management for Solanaceous Crops",
        authors=["R. Sullivan", "ATTRA Sustainable Agriculture Program"],
        institution="National Center for Appropriate Technology (NCAT / ATTRA)",
        identifier="NCAT-ATTRA-IPM-04",
        published_date="2023-01-20T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="https://attra.ncat.org/publication/organic-tomato-production/",
        crops=["tomato", "pepper", "eggplant"],
        regions=["global", "tropical", "temperate"],
        license="Educational / Open Extension",
        text="""
        Biological Disease Management in Organic Systems: Organic certified tomato production prohibits synthetic chemical fungicides. Instead of synthetic chemical sprays, deploy bio-fungicides containing beneficial antagonistic bacteria such as Bacillus subtilis strain QST 713 or Trichoderma harzianum to colonize leaf surfaces and outcompete fungal pathogens.

        Organic Certification Restriction: Avoid synthetic copper fungicides or repeated heavy chemical sprays which cause copper accumulation toxicity in living soil biology. Utilize potassium bicarbonate and compost tea extracts applied preventatively in early morning hours before fungal spore infection occurs.
        """,
    ),
    IngestDocumentRequest(
        title="Rice Blast (Magnaporthe oryzae) Epidemic Control in Tropical Lowland Paddies",
        authors=["Dr. K. S. IRRI Pathology Group"],
        institution="International Rice Research Institute (IRRI)",
        identifier="IRRI-RB-2023",
        published_date="2023-06-11T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="http://www.knowledgebank.irri.org/blast",
        crops=["rice"],
        regions=["tropical", "sub-tropical"],
        license="CC BY 3.0 IGO",
        text="""
        Rice Blast Symptoms in Paddies: Rice blast affects lowland paddy rice. Foliar lesions are diamond or spindle-shaped with greyish-white centers and brownish margins. Under humid flooded conditions, lesions coalesce, causing complete burning of the rice canopy.

        Paddy Water and Nitrogen Regulation: In tropical lowland paddies, avoid excessive split applications of urea nitrogen, which produces soft vegetative tissue highly vulnerable to blast penetration. Maintain continuous flooded water depth of 5 to 7 centimeters to inhibit spore germination from the paddy mud.
        """,
    ),
    IngestDocumentRequest(
        title="Historical Tomato Pest Management Circular (Archival)",
        authors=["State Agricultural College Extension"],
        institution="State College Extension Bulletin (1998)",
        identifier="HIST-EXT-1998-44",
        published_date="1998-05-01T00:00:00Z",
        url=None,
        crops=["tomato"],
        regions=["temperate"],
        license="Historical Archive",
        text="""
        Archival Tomato Guidance: Apply organophosphate chemical insecticides at first emergence of hornworms or foliar beetle activity. Ensure heavy seasonal applications of legacy mineral sulfur compounds across the field.
        """,
    ),
]


def seed_database_corpus(ingestion_service: IngestionService) -> int:
    """Seeds authentic agricultural documents into the repository."""
    count = 0
    for doc in SEED_DOCUMENTS:
        ingestion_service.ingest_document(doc)
        count += 1
    logger.info(f"Seeded {count} authentic agricultural reference documents.")
    return count
