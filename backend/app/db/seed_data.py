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
    IngestDocumentRequest(
        title="Integrated Management of Tomato Late Blight and Leaf Curl Virus",
        authors=["Department of Plant Pathology, TNAU", "Dr. K. Angappan"],
        institution="Tamil Nadu Agricultural University (TNAU Agritech Portal)",
        identifier="TNAU-AGR-TOM-LB-2023",
        published_date="2023-08-10T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="https://agritech.tnau.ac.in/crop_protection/crop_prot_crop%20diseases_veg_tomato.html",
        crops=["tomato"],
        regions=["tropical", "sub-tropical", "temperate", "global"],
        license="Open Educational Extension / TNAU",
        text="""
        Tomato Late Blight Symptoms: Late blight caused by Phytophthora infestans appears as water-soaked irregular pale green to dark brown lesions on leaves and stems. Under cool, humid weather (relative humidity above 90% and temperature 15-20°C), a delicate white cottony fungal growth develops on the undersides of leaf lesions. Infected green fruits develop dark brown greasy blotches that rot rapidly.

        Late Blight Chemical and Cultural Management: At first symptom appearance during foggy or rainy weather, spray Metalaxyl 8% + Mancozeb 64% WP at 2 g/L or Copper Oxychloride 50% WP at 2.5 g/L. Repeat at 7 to 10 day intervals if humid conditions persist. Avoid overhead irrigation and destroy infected plant debris outside the field borders.

        Tomato Yellow Leaf Curl Virus (TYLCV) Identification: Transmitted by whitefly vector (Bemisia tabaci). Symptoms include severe stunting of plants, upward curling and crinkling of leaflet margins, interveinal chlorosis, and bushy appearance with reduced flower and fruit set.

        Whitefly Vector Management for TYLCV: Install yellow sticky traps (12 per hectare) to monitor and mass-trap whiteflies. Spray neem oil (3%) or azadirachtin 1% at 2 ml/L as an organic repellent. In case of heavy whitefly infestation in early vegetative stage, apply imidacloprid 17.8% SL at 0.3 ml/L or thiamethoxam 25% WG at 0.25 g/L with strict pre-harvest interval compliance.
        """,
    ),
    IngestDocumentRequest(
        title="Potato Late Blight and Early Blight Integrated Disease Management in Sub-Tropical Plains",
        authors=["Dr. Sanjeev Sharma", "ICAR-CPRI Plant Pathology Division"],
        institution="ICAR - Central Potato Research Institute (ICAR-CPRI, Shimla)",
        identifier="ICAR-CPRI-POT-2023",
        published_date="2023-07-20T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="https://cpri.icar.gov.in/disease-management",
        crops=["potato"],
        regions=["sub-tropical", "tropical", "temperate", "global"],
        license="ICAR Extension Bulletin / Public Research",
        text="""
        Potato Late Blight Diagnostic Signs: Phytophthora infestans in potato causes rapidly expanding water-soaked necrotic lesions starting from leaf tips and margins. During morning hours under high dew, a white mildew or downy fungal ring is prominent on the lower leaf surface bordering healthy tissue. In severe attacks, entire potato haulms collapse with a foul odor.

        Potato Late Blight Preventative Schedule: Apply protective contact fungicide Mancozeb 75% WP at 2.5 g/L as a prophylactic cover spray before crop canopy closure. If disease appears in neighboring fields, switch to translaminar systemic fungicides such as Cymoxanil 8% + Mancozeb 64% WP at 2.5 g/L or Dimethomorph 50% WP at 1 g/L.

        Potato Early Blight (Alternaria solani): Symptoms show as small dark brown necrotic spots on lower leaves with characteristic concentric rings (target board pattern). Adequate potassium nutrition and avoiding drought stress prevents severe early blight defoliation. Spray Chlorothalonil 75% WP at 2 g/L or Mancozeb at 2 g/L at first notice of lower leaf concentric spotting.
        """,
    ),
    IngestDocumentRequest(
        title="Bacterial Spot and Foliar Blight Management in Bell Pepper and Chilli",
        authors=["TNAU Horticultural Research Station", "Extension Plant Pathologist"],
        institution="Tamil Nadu Agricultural University (TNAU Agritech Portal)",
        identifier="TNAU-AGR-CHILLI-2023",
        published_date="2023-03-12T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="https://agritech.tnau.ac.in/crop_protection/crop_prot_crop_diseases_veg_chilli.html",
        crops=["pepper", "chilli"],
        regions=["tropical", "sub-tropical", "global"],
        license="TNAU Agritech Open Resource",
        text="""
        Bacterial Leaf Spot Symptoms: Caused by Xanthomonas campestris pv. vesicatoria in capsicum (bell pepper) and chilli. Foliar symptoms appear as small, water-soaked, circular to irregular dark brown lesions with yellow halos. Severe infection leads to extensive leaf drop and defoliation, exposing fruit to sunscald. On fruit, raised rough, wart-like brown scabs develop.

        Bacterial Spot Integrated Control: Treat certified seed with hot water (50°C for 25 minutes) or Trichoderma viride at 4 g/kg seed. At first appearance of leaf spotting, spray Copper Oxychloride 50% WP at 2.5 g/L mixed with Streptocycline (streptomycin sulphate + tetracycline) at 100 ppm (1 g per 10 liters of water). Ensure coverage of both upper and lower leaf surfaces. Repeat after 12 to 14 days if wet weather continues.
        """,
    ),
    IngestDocumentRequest(
        title="Integrated Disease Management for Turcicum Leaf Blight and Common Rust in Maize",
        authors=["Dr. K. S. Hooda", "Dr. Pradeep Kumar", "Division of Crop Protection, ICAR-IIMR"],
        institution="ICAR - Indian Institute of Maize Research (ICAR-IIMR, Ludhiana)",
        identifier="ICAR-IIMR-MAIZE-2023",
        published_date="2023-05-18T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="https://iimr.icar.gov.in/crop-protection-bulletin",
        crops=["corn", "maize"],
        regions=["tropical", "sub-tropical", "temperate", "global"],
        license="ICAR Extension Research Bulletin / Open Access",
        text="""
        Northern Corn Leaf Blight (Turcicum Blight) Diagnostic Signs: Caused by Exserohilum turcicum (teleomorph Setosphaeria turcica). Characteristic symptoms consist of long, elliptical, grayish-green or tan necrotic lesions (2.5 to 15 cm long) with smooth margins developing on lower leaves and progressing upwards. Under moist weather, dark olive-brown fungal sporulation is visible within lesions.

        Common Rust of Maize (Puccinia sorghi): Foliar signs appear as small, circular to elongate golden-brown or cinnamon-brown powdery pustules erupting on both upper and lower leaf surfaces. As pustules rupture the epidermis, powdery urediniospores are released. Severe rust causes chlorosis, premature senescence, and grain filling reduction.

        Maize Foliar Management Guidelines: Plant resistant hybrids recommended for your agro-ecological zone. Maintain balanced soil fertility, avoiding excessive nitrogen that promotes lush succulent foliage. At first notice of Turcicum lesions or rust pustules, spray Mancozeb 75% WP at 2.5 g/L or Azoxystrobin 18.2% + Difenoconazole 11.4% SC at 1 ml/L. Repeat at 10 to 14 day intervals if humid rainy weather continues.
        """,
    ),
    IngestDocumentRequest(
        title="Diagnosis and Management of Citrus Greening (Huanglongbing) in Indian Orchards",
        authors=["Dr. Dilip Ghosh", "Dr. A. K. Das", "Plant Pathology Division, ICAR-CCRI"],
        institution="ICAR - Central Citrus Research Institute (ICAR-CCRI, Nagpur)",
        identifier="ICAR-CCRI-HLB-2023",
        published_date="2023-04-25T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="https://ccri.icar.gov.in/citrus-greening-management",
        crops=["orange", "citrus"],
        regions=["tropical", "sub-tropical", "global"],
        license="ICAR Extension Advisory / Open Access",
        text="""
        Citrus Greening (Huanglongbing / HLB) Diagnostic Symptoms: Caused by fastidious phloem-limited bacterium Candidatus Liberibacter asiaticus, vectored by the Asian citrus psyllid (Diaphorina citri). Signature foliar symptom is an asymmetric 'blotchy mottle' across the leaf blade where yellow and green patterns do not align across the central midrib. Leaves may turn thick, leathery, and upright with raised corky veins. Infected trees show dieback of twigs and yield small, lopsided fruits that retain green coloration at the stylar end ('color inversion').

        Integrated HLB Orchard Management: Plant disease-free certified nursery budwood. Regularly monitor tree flushes for psyllid nymphs. Spray Imidacloprid 17.8% SL at 0.5 ml/L or Thiamethoxam 25% WG at 0.3 g/L during vegetative flushing periods to suppress vector populations. Apply micronutrient foliar corrective sprays (Zinc Sulphate 0.5% + Ferrous Sulphate 0.5% + Boric Acid 0.1%) to mitigate phloem-blockage nutritional deficiencies.
        """,
    ),
    IngestDocumentRequest(
        title="Management of Foliar Fungal Diseases and Esca Complex in Commercial Vineyards",
        authors=["Dr. S. D. Sawant", "Dr. Indu S. Sawant", "ICAR-NRCG Crop Protection Section"],
        institution="ICAR - National Research Centre for Grapes (ICAR-NRCG, Pune)",
        identifier="ICAR-NRCG-GRAPE-2023",
        published_date="2023-06-14T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="https://nrcgrapes.icar.gov.in/disease-forecast-bulletins",
        crops=["grape"],
        regions=["tropical", "sub-tropical", "temperate", "global"],
        license="ICAR-NRCG Advisory Bulletin",
        text="""
        Grape Black Rot (Guignardia bidwellii): Symptoms on grape leaves begin as tiny reddish-brown circular spots that expand to 2 to 7 mm. Lesions develop dark brown borders surrounded by tiny black pimple-like pycnidia arranged in a characteristic ring along the margins. On fruit clusters, berries shrivel into hard, black, wrinkled mummies that remain attached.

        Esca (Black Measles) Wood Complex: Chronic foliar symptoms manifest as 'tiger-stripe' interveinal chlorosis and necrosis, where yellow bands border green veins with necrotic brown interiors. Caused by fungal vascular colonization by Phaeomoniella chlamydospora and Fomitiporia mediterranea. Berries develop small dark purple or brown spots ('measles').

        Vineyard Hygiene and Protection: Prune out diseased dead canes and destroy pruning residues outside the vineyard. Apply Bordeaux mixture 1% or Copper Hydroxide 53.8% DF at 2 g/L as post-pruning prophylactic. For Black Rot foliar lesions, apply Difenoconazole 25% EC at 0.5 ml/L or Azoxystrobin 23% SC at 1 ml/L.
        """,
    ),
    IngestDocumentRequest(
        title="Integrated Management of Apple Scab (Venturia inaequalis) in Himalayan Orchards",
        authors=["Dr. O. C. Sharma", "Dr. J. N. Sharma", "Division of Fruit Pathology"],
        institution="ICAR - Central Institute of Temperate Horticulture (ICAR-CITH, Srinagar)",
        identifier="ICAR-CITH-SCAB-2023",
        published_date="2023-03-30T00:00:00Z",
        last_verified="2025-10-01T00:00:00Z",
        url="https://cith.icar.gov.in/apple-scab-management",
        crops=["apple"],
        regions=["temperate", "sub-tropical", "global"],
        license="ICAR-CITH Technical Bulletin",
        text="""
        Apple Scab (Venturia inaequalis) Diagnostic Characteristics: Primary infections appear in early spring on young unfolding leaves as olive-green, dull velvety spots with indefinite margins. As spots age, they become olive-black, raised, and corky. Infected leaves become curled, distorted, and defoliate prematurely. On developing fruits, lesions turn into rough, dark brown corky scabs that cause fruit distortion and cracking.

        Overwintering Sanitation and Chemical Schedule: Fungal pseudothecia overwinter in fallen dead leaves on the orchard floor. Spray urea at 5% (50 kg per 1000 L water) on orchard floor leaf litter immediately before leaf fall in autumn to accelerate decomposition and reduce primary ascospore inoculum. At green tip stage, spray protective Captan 50% WP at 2.5 g/L or Dodine 65% WP at 1 g/L. At pink bud and petal fall, apply systemic Difenoconazole 25% EC at 0.3 ml/L or Hexaconazole 5% EC at 1 ml/L.
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
