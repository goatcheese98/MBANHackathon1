"""
Career Constellation Navigator - Backend API
AI-powered job description clustering and visualization.
Aligned with Hackathon Challenge #1: Job Description Clustering & Standardization
Dataset: Hackathon_Datasets_Refined_v5.csv
Methodology mirrors assignments_analysis.ipynb and comprehensive_job_analysis.ipynb
"""

import os
import logging
from typing import List, Dict, Optional
from pathlib import Path
from collections import Counter

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Import RAG chat module
try:
    from rag_chat import initialize_rag, chat_with_rag, rag_engine
    RAG_AVAILABLE = True
except ImportError as e:
    RAG_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning(f"RAG chat module not available: {e}")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Career Constellation Navigator API",
    description="Hackathon Challenge #1 — Job Description Clustering & Standardization",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve report markdown files
REPORTS_DIR = Path(__file__).parent.parent / "reports"
if REPORTS_DIR.exists():
    app.mount("/reports", StaticFiles(directory=str(REPORTS_DIR)), name="reports")
    logger.info(f"Serving reports from: {REPORTS_DIR}")

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------
model = None
job_data: Optional[pd.DataFrame] = None
embeddings: Optional[np.ndarray] = None
cluster_centers: Optional[np.ndarray] = None
cluster_cluster_cos: Optional[np.ndarray] = None   # shape: (n_clusters, n_clusters)
n_standardization_pairs: int = 0

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class JobPoint(BaseModel):
    id: int
    title: str
    summary: str
    responsibilities: str
    qualifications: str
    cluster_id: int
    x: float
    y: float
    z: float = 0.0  # deprecated, kept for API compat
    size: float
    color: str
    keywords: List[str]
    skills: List[str]
    job_level: Optional[str] = None
    scope: Optional[str] = None
    affinities: Dict[int, float] = {}  # cluster_id → 384D cosine similarity


class ClusterInfo(BaseModel):
    id: int
    label: str
    keywords: List[str]
    example_titles: List[str]
    size: int
    color: str
    centroid: Dict[str, float]
    jobs: List[int]


class ConstellationData(BaseModel):
    jobs: List[JobPoint]
    clusters: List[ClusterInfo]
    total_jobs: int
    num_clusters: int
    cluster_sims: Dict[str, float] = {}  # "a-b" → 384D cosine similarity (a < b)


class SimilarityRequest(BaseModel):
    job_id: int
    top_k: int = 5


# ---------------------------------------------------------------------------
# ML helpers
# ---------------------------------------------------------------------------

CLUSTER_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57",
    "#FF9FF3", "#54A0FF", "#48DBFB", "#1DD1A1", "#FFA502",
    "#FF7675", "#74B9FF", "#A29BFE", "#FD79A8", "#FDCB6E",
]

# Generic words to ignore when auto-labelling clusters
_LABEL_STOP = {
    "methanex", "medicine", "hat", "posting", "temp", "temporary",
    "talented", "opportunity", "powerful", "impact", "yvr", "mh", "pd",
    "provides", "obtain", "responsible", "care", "update", "final",
}


def load_model():
    global model
    if model is None:
        try:
            logger.info("Loading Sentence-BERT model (all-MiniLM-L6-v2)...")
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Sentence-BERT loaded successfully.")
        except Exception as exc:
            logger.warning(f"Sentence-BERT unavailable ({exc}). Falling back to TF-IDF.")
            model = "fallback"
    return model


def generate_embeddings(texts: List[str]) -> np.ndarray:
    """SBERT embeddings or TF-IDF fallback — matches notebook approach."""
    load_model()
    if model == "fallback":
        logger.info("Using TF-IDF fallback for embeddings.")
        vec = TfidfVectorizer(max_features=300, stop_words="english", min_df=1)
        return vec.fit_transform(texts).toarray()
    logger.info(f"Generating SBERT embeddings for {len(texts)} texts…")
    return model.encode(texts, show_progress_bar=True, batch_size=32)


def cluster_jobs(emb: np.ndarray, n_clusters: int = 15):
    """K-Means clustering — matches both analysis notebooks."""
    logger.info(f"K-Means clustering: {len(emb)} jobs → {n_clusters} clusters")
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10, max_iter=300)
    labels = km.fit_predict(emb)
    return labels, km


def extract_keywords(text: str, top_n: int = 5) -> List[str]:
    """Per-job keyword extraction via single-doc TF-IDF."""
    try:
        vec = TfidfVectorizer(
            max_features=100, stop_words="english", ngram_range=(1, 2), min_df=1
        )
        mat = vec.fit_transform([text])
        names = vec.get_feature_names_out()
        scores = mat.toarray()[0]
        top_idx = scores.argsort()[-(top_n + 1):][::-1]
        return [names[i] for i in top_idx if scores[i] > 0][:top_n]
    except Exception:
        _sw = {"the", "and", "for", "are", "with", "this", "that", "from",
               "they", "been", "have", "were", "also", "into", "just", "over"}
        words = [w for w in text.lower().split() if len(w) > 4 and w not in _sw]
        return [w for w, _ in Counter(words).most_common(top_n)]


def extract_skills(text: str) -> List[str]:
    """Keyword-match skill extraction."""
    skill_list = [
        "python", "java", "javascript", "sql", "excel", "powerpoint",
        "accounting", "finance", "budget", "forecasting", "analysis", "reporting",
        "leadership", "management", "supervision", "coaching", "mentoring",
        "communication", "presentation", "negotiation", "interpersonal",
        "project management", "planning", "organization", "scheduling",
        "engineering", "mechanical", "electrical", "chemical", "process",
        "safety", "compliance", "regulatory", "risk assessment",
        "data analysis", "statistics", "modeling", "simulation",
        "maintenance", "repair", "troubleshooting", "operations",
        "procurement", "purchasing", "contracts", "vendor management",
        "human resources", "recruitment", "training", "performance management",
        "quality control", "inspection", "testing", "audit",
        "financial", "tax", "forecast", "supervisory", "administrative",
        "technical", "strategic",
    ]
    tl = text.lower()
    found: List[str] = []
    for sk in skill_list:
        if sk in tl and sk.title() not in found:
            found.append(sk.title())
    return found[:10]


def get_cluster_label_ngram(cluster_df: pd.DataFrame) -> str:
    """
    Generate a meaningful cluster label using N-gram analysis of job titles.
    Mirrors the get_top_ngrams approach in comprehensive_job_analysis.ipynb.
    """
    titles = cluster_df["Unified Job Title"].fillna("").tolist()
    if not titles:
        return "Unknown"

    if len(titles) < 2:
        words = [
            w for w in titles[0].lower().split()
            if len(w) > 3 and w not in _LABEL_STOP
        ]
        return " ".join(words[:2]).title() or titles[0][:30]

    try:
        # Try bigrams first (most informative)
        vec2 = CountVectorizer(ngram_range=(2, 2), stop_words="english", min_df=2)
        bag2 = vec2.fit_transform(titles)
        sums2 = bag2.sum(axis=0)
        freq2 = sorted(
            [(w, int(sums2[0, i])) for w, i in vec2.vocabulary_.items()],
            key=lambda x: x[1], reverse=True,
        )
        for phrase, _ in freq2:
            if not any(p in _LABEL_STOP for p in phrase.split()):
                return phrase.title()
    except Exception:
        pass

    try:
        # Fall back to unigrams
        vec1 = CountVectorizer(ngram_range=(1, 1), stop_words="english", min_df=2)
        bag1 = vec1.fit_transform(titles)
        sums1 = bag1.sum(axis=0)
        freq1 = sorted(
            [(w, int(sums1[0, i])) for w, i in vec1.vocabulary_.items()],
            key=lambda x: x[1], reverse=True,
        )
        for word, _ in freq1:
            if word not in _LABEL_STOP and len(word) > 3:
                return word.title()
    except Exception:
        pass

    # Last resort
    try:
        return cluster_df["Unified Job Title"].value_counts().index[0][:40]
    except Exception:
        return "Cluster"


# ---------------------------------------------------------------------------
# Data loading & processing
# ---------------------------------------------------------------------------

def load_and_process_data(csv_path: str, max_jobs: int = 10000) -> pd.DataFrame:
    """
    Load Hackathon_Datasets_Refined_v5.csv and run the same pipeline as:
      - assignments_analysis.ipynb  (SBERT + silhouette → 12 clusters)
      - comprehensive_job_analysis.ipynb (SBERT + 15 clusters + messiness)
    We use 15 clusters for granular job-family visibility.
    """
    global job_data, embeddings, cluster_centers, n_standardization_pairs

    logger.info(f"Loading dataset: {csv_path}")
    df = pd.read_csv(csv_path)
    logger.info(f"Rows loaded: {len(df)}")

    if len(df) > max_jobs:
        logger.info(f"Sampling {max_jobs} rows for performance.")
        df = df.sample(n=max_jobs, random_state=42).reset_index(drop=True)

    # ---- Column normalisation ------------------------------------------------
    # The refined v5 CSV uses 'Unified Job Title' as the clean title column.
    if "Unified Job Title" not in df.columns:
        if "job_title" in df.columns:
            df["Unified Job Title"] = df["job_title"]
        else:
            df["Unified Job Title"] = "Unknown"

    for col in ["Unified Job Title", "position_summary", "responsibilities", "qualifications"]:
        if col in df.columns:
            df[col] = df[col].fillna("")
        else:
            df[col] = ""

    for col in ["Job Level", "Scope"]:
        if col in df.columns:
            df[col] = df[col].fillna("")
        else:
            df[col] = ""

    # ---- Text construction ---------------------------------------------------
    # Mirrors assignments_analysis.ipynb — title weighted (repeated) + all sections.
    df["full_text"] = (
        "Job Title: " + df["Unified Job Title"] + ". "
        + "Job Title: " + df["Unified Job Title"] + ". "   # emphasis
        + "Summary: " + df["position_summary"] + ". "
        + "Responsibilities: " + df["responsibilities"] + ". "
        + "Qualifications: " + df["qualifications"]
    )
    df = df[df["full_text"].str.len() > 50].copy()
    logger.info(f"Valid records after filtering: {len(df)}")

    # ---- Embeddings ----------------------------------------------------------
    emb_arr = generate_embeddings(df["full_text"].tolist())
    embeddings = np.array(emb_arr)
    logger.info(f"Embedding matrix shape: {embeddings.shape}")

    # ---- Clustering ----------------------------------------------------------
    # comprehensive_job_analysis.ipynb uses NUM_CLUSTERS = 15
    n_clusters = 15 if len(df) >= 45 else max(3, len(df) // 5)
    labels, km = cluster_jobs(embeddings, n_clusters=n_clusters)
    cluster_centers = km.cluster_centers_
    df["cluster_id"] = labels
    logger.info(f"Clusters created: {n_clusters}")

    # ---- Distance to centroid (messiness metric from comprehensive notebook) --
    df["distance_to_center"] = [
        float(np.linalg.norm(embeddings[i] - cluster_centers[labels[i]]))
        for i in range(len(df))
    ]

    # ---- 2-D layout via UMAP (from full 384D embeddings) --------------------
    logger.info("Running UMAP for 2-D layout from 384D embeddings…")
    try:
        import umap as umap_lib
        reducer = umap_lib.UMAP(
            n_components=2, random_state=42,
            n_neighbors=15, min_dist=0.1, metric='cosine',
        )
        coords_2d = reducer.fit_transform(embeddings)
        logger.info("UMAP complete.")
    except ImportError:
        logger.warning("umap-learn not installed — falling back to PCA-2D.")
        from sklearn.decomposition import PCA
        coords_2d = PCA(n_components=2, random_state=42).fit_transform(embeddings)

    for k, col in enumerate(["x", "y"]):
        df[col] = coords_2d[:, k]
        df[col] = (df[col] - df[col].min()) / (df[col].max() - df[col].min())
        df[col] = df[col] * 100 - 50  # scale to [-50, 50]
    df["z"] = 0.0  # deprecated, kept for API compatibility

    # ---- Pre-compute 384D cosine affinities (job → each cluster) -----------
    logger.info("Pre-computing 384D cosine affinities (job → cluster)…")
    job_cluster_cos = cosine_similarity(embeddings, cluster_centers)  # (n_jobs, n_clusters)
    df["affinities"] = [
        {int(cid): float(job_cluster_cos[i, cid]) for cid in range(job_cluster_cos.shape[1])}
        for i in range(len(df))
    ]

    # ---- Pre-compute 384D cluster-to-cluster cosine similarities -----------
    logger.info("Pre-computing 384D cluster-to-cluster cosine similarities…")
    global cluster_cluster_cos
    cluster_cluster_cos = cosine_similarity(cluster_centers, cluster_centers)  # (n_clusters, n_clusters)
    logger.info("384D affinity pre-computation complete.")

    # ---- Keywords & skills ---------------------------------------------------
    logger.info("Extracting per-job keywords and skills…")
    df["keywords"] = df["full_text"].apply(lambda t: extract_keywords(t, 5))
    df["skills"] = df["full_text"].apply(extract_skills)

    # ---- Visual properties ---------------------------------------------------
    df["color"] = df["cluster_id"].apply(lambda x: CLUSTER_COLORS[x % len(CLUSTER_COLORS)])
    df["size"] = df["full_text"].str.len().apply(lambda l: max(2.0, min(8.0, l / 500)))

    # ---- Finalise ------------------------------------------------------------
    job_data = df.reset_index(drop=True)
    job_data["id"] = job_data.index

    # ---- Pre-compute global standardisation pair count -----------------------
    logger.info("Pre-computing standardisation pair count…")
    try:
        sim = cosine_similarity(embeddings)
        count = 0
        n = sim.shape[0]
        for i in range(n):
            for j in range(i + 1, n):
                if sim[i, j] > 0.95:
                    ta = str(job_data.iloc[i]["Unified Job Title"])
                    tb = str(job_data.iloc[j]["Unified Job Title"])
                    if ta.lower() != tb.lower():
                        count += 1
        n_standardization_pairs = count
        logger.info(f"Near-duplicate standardisation pairs found: {n_standardization_pairs}")
    except Exception as exc:
        logger.warning(f"Could not pre-compute standardisation pairs: {exc}")
        n_standardization_pairs = 0

    logger.info("Data processing complete.")
    return job_data


def build_cluster_info_list(df: pd.DataFrame) -> List[ClusterInfo]:
    """Build ClusterInfo objects with N-gram labels — matches notebook profiling."""
    result = []
    for cid in sorted(df["cluster_id"].unique()):
        try:
            cdf = df[df["cluster_id"] == cid]
            if cdf.empty:
                continue

            centroid = {
                "x": float(cdf["x"].mean()),
                "y": float(cdf["y"].mean()),
                "z": 0.0,  # deprecated
            }

            all_kw: List[str] = []
            for kws in cdf["keywords"]:
                if isinstance(kws, list):
                    all_kw.extend(kws)
                elif isinstance(kws, str):
                    try:
                        all_kw.extend(eval(kws))
                    except Exception:
                        pass
            top_keywords = [w for w, _ in Counter(all_kw).most_common(5)]

            label = get_cluster_label_ngram(cdf)
            example_titles = cdf["Unified Job Title"].head(5).tolist()

            result.append(
                ClusterInfo(
                    id=int(cid),
                    label=label,
                    keywords=top_keywords,
                    example_titles=example_titles,
                    size=len(cdf),
                    color=str(cdf["color"].iloc[0]),
                    centroid=centroid,
                    jobs=cdf["id"].tolist(),
                )
            )
        except Exception as exc:
            logger.error(f"Error building ClusterInfo for cluster {cid}: {exc}")
    return result


# ---------------------------------------------------------------------------
# Sample data fallback
# ---------------------------------------------------------------------------

def create_sample_data():
    """Minimal sample dataset matching the refined v5 column schema."""
    os.makedirs("data", exist_ok=True)
    sample = {
        "Unified Job Title": [
            "Finance Manager", "Senior Accountant", "Financial Analyst",
            "Process Engineer", "Senior Process Engineer", "Mechanical Engineer",
            "HR Advisor", "HR Manager", "Recruitment Specialist",
            "Safety Manager", "Safety Coordinator", "Operations Manager",
            "IT Manager", "Systems Analyst", "Database Administrator",
        ],
        "Job Level": [
            "Manager", "Senior", "", "Engineer", "Senior", "Engineer",
            "", "Manager", "", "Manager", "", "Manager", "Manager", "", "",
        ],
        "Scope": [""] * 15,
        "Internal Posting": ["No"] * 15,
        "job_title": [t.lower() + " posting" for t in [
            "Finance Manager", "Senior Accountant", "Financial Analyst",
            "Process Engineer", "Senior Process Engineer", "Mechanical Engineer",
            "HR Advisor", "HR Manager", "Recruitment Specialist",
            "Safety Manager", "Safety Coordinator", "Operations Manager",
            "IT Manager", "Systems Analyst", "Database Administrator",
        ]],
        "position_summary": [
            "Oversees financial operations and strategy for the site",
            "Responsible for monthly close and financial reporting",
            "Analyzes financial data to support business decisions",
            "Provides process engineering support for operations",
            "Leads process optimization and mentors junior engineers",
            "Designs and maintains mechanical equipment",
            "Partners with leaders on HR strategies",
            "Leads HR department and develops people strategies",
            "Manages full-cycle recruitment for all positions",
            "Ensures workplace safety and regulatory compliance",
            "Coordinates daily safety activities and inspections",
            "Oversees daily plant operations and production targets",
            "Manages IT infrastructure and support services",
            "Analyzes business requirements and system solutions",
            "Manages database systems and ensures data integrity",
        ],
        "responsibilities": [
            "Financial reporting, budgeting, forecasting, and analysis. Manage accounting team.",
            "Prepare journal entries, reconcile accounts, produce financial statements.",
            "Build financial models, perform variance analysis, create dashboards.",
            "Process studies, develop procedures, troubleshooting operational problems.",
            "Monitor process parameters, optimize yields, mentor junior engineers.",
            "Design equipment modifications, perform calculations, review drawings.",
            "Advise managers on HR policies, handle employee relations issues.",
            "Develop HR strategy, manage HR team, oversee talent programs.",
            "Source candidates, conduct interviews, manage applicant tracking system.",
            "Develop safety programs, investigate incidents, ensure regulatory compliance.",
            "Conduct safety inspections, maintain safety records, coordinate training.",
            "Manage production schedules, optimize resources, ensure quality output.",
            "Manage IT projects, oversee helpdesk, ensure system availability.",
            "Gather requirements, document processes, configure systems.",
            "Perform database tuning, backups, and troubleshoot database issues.",
        ],
        "qualifications": [
            "CPA designation, 10 years experience, leadership skills, Excel proficiency.",
            "Accounting degree, 5 years experience, knowledge of GAAP, attention to detail.",
            "Finance degree, analytical skills, advanced Excel, modeling experience.",
            "Engineering degree, problem-solving skills, teamwork, communication.",
            "Chemical engineering degree, 7 years experience, process simulation skills.",
            "Mechanical engineering degree, CAD skills, PE license preferred.",
            "HR degree, 5 years experience, employee relations, conflict resolution.",
            "HR degree, 10 years experience, strategic thinking, leadership.",
            "HR background, sourcing skills, interviewing experience, ATS knowledge.",
            "Safety certification, 10 years experience, regulatory knowledge, leadership.",
            "Safety training, attention to detail, communication, inspection skills.",
            "Operations experience, leadership, decision-making, problem-solving.",
            "IT degree, 10 years experience, infrastructure knowledge, leadership.",
            "IT degree, analytical skills, SQL knowledge, business acumen.",
            "Database certification, SQL expertise, performance tuning.",
        ],
    }
    pd.DataFrame(sample).to_csv("data/sample_jobs.csv", index=False)
    logger.info("Sample data written to data/sample_jobs.csv")


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event():
    global job_data

    # Prioritise the refined v5 dataset, then fall back to earlier versions
    candidate_paths = [
        "/Users/rohanjasani/Desktop/Hackathon/Hackathon_Datasets_Refined_v5.csv",
        "../../Hackathon_Datasets_Refined_v5.csv",
        "../Hackathon_Datasets_Refined_v5.csv",
        "Hackathon_Datasets_Refined_v5.csv",
        # Legacy fallbacks
        "/Users/rohanjasani/Desktop/Hackathon/Hackathon Challenge #1 Datasets Cleaned.csv",
        "/Users/rohanjasani/Desktop/Hackathon/Hackathon Challenge #1 Datasets.csv",
        "../../Hackathon Challenge #1 Datasets Cleaned.csv",
        "../../Hackathon Challenge #1 Datasets.csv",
    ]

    env_path = os.getenv("DATA_PATH")
    if env_path:
        candidate_paths.insert(0, env_path)

    csv_path = next((p for p in candidate_paths if os.path.exists(p)), None)

    if csv_path:
        logger.info(f"Using dataset: {csv_path}")
    else:
        logger.warning("No dataset found — generating sample data.")
        create_sample_data()
        csv_path = "data/sample_jobs.csv"

    try:
        job_data = load_and_process_data(csv_path)
        logger.info(f"Backend ready — {len(job_data)} jobs loaded.")
    except Exception as exc:
        import traceback
        logger.error(f"Fatal error loading data: {exc}\n{traceback.format_exc()}")
        logger.info("Falling back to sample data.")
        create_sample_data()
        job_data = load_and_process_data("data/sample_jobs.csv")
    
    # Initialize RAG chat engine
    if RAG_AVAILABLE:
        try:
            initialize_rag(job_data)
            logger.info("RAG chat engine initialized.")
        except Exception as exc:
            logger.error(f"Error initializing RAG engine: {exc}")


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "message": "Career Constellation Navigator API v2.0",
        "status": "running",
        "dataset": "Hackathon_Datasets_Refined_v5",
        "clusters": 15,
        "model": "all-MiniLM-L6-v2 (SBERT)",
    }


@app.get("/api/reports")
async def get_available_reports():
    """List all available research reports."""
    reports = []
    if REPORTS_DIR.exists():
        for md_file in sorted(REPORTS_DIR.glob("*.md")):
            try:
                content = md_file.read_text(encoding='utf-8')
                # Extract title from frontmatter or first heading
                title = md_file.stem.replace('_', ' ').title()
                import re
                fm_match = re.search(r'^---\s*\ntitle:\s*"([^"]+)"', content, re.MULTILINE)
                if fm_match:
                    title = fm_match.group(1)
                else:
                    h1_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
                    if h1_match:
                        title = h1_match.group(1)
                
                reports.append({
                    "id": md_file.stem,
                    "title": title,
                    "filename": md_file.name,
                })
            except Exception as e:
                logger.warning(f"Error reading report {md_file}: {e}")
    
    return {"reports": reports, "count": len(reports)}


@app.get("/api/reports/{report_id}")
async def get_report_content(report_id: str):
    """Get content of a specific research report."""
    if not REPORTS_DIR.exists():
        raise HTTPException(404, "Reports directory not found")
    
    # Security: prevent directory traversal
    report_id = report_id.replace('..', '').replace('/', '')
    md_file = REPORTS_DIR / f"{report_id}.md"
    
    if not md_file.exists():
        raise HTTPException(404, f"Report not found: {report_id}")
    
    try:
        content = md_file.read_text(encoding='utf-8')
        return {
            "id": report_id,
            "content": content,
            "filename": md_file.name,
        }
    except Exception as e:
        logger.error(f"Error reading report {report_id}: {e}")
        raise HTTPException(500, f"Error reading report: {str(e)}")


@app.get("/api/constellation", response_model=ConstellationData)
async def get_constellation():
    """All job points + cluster metadata for 2-D UMAP visualisation with 384D affinities."""
    if job_data is None:
        raise HTTPException(503, "Data not loaded yet")

    jobs: List[JobPoint] = []
    for _, row in job_data.iterrows():
        try:
            kws = row["keywords"]
            if isinstance(kws, str):
                try:
                    kws = eval(kws)
                except Exception:
                    kws = []
            sks = row["skills"]
            if isinstance(sks, str):
                try:
                    sks = eval(sks)
                except Exception:
                    sks = []

            affs = row.get("affinities", {})
            if isinstance(affs, str):
                try:
                    affs = eval(affs)
                except Exception:
                    affs = {}
            # Ensure keys are ints
            affs = {int(k): float(v) for k, v in affs.items()} if isinstance(affs, dict) else {}

            jl = str(row.get("Job Level", "")).strip() or None
            sc = str(row.get("Scope", "")).strip() or None

            jobs.append(
                JobPoint(
                    id=int(row["id"]),
                    title=str(row["Unified Job Title"]),
                    summary=str(row.get("position_summary", ""))[:200],
                    responsibilities=str(row.get("responsibilities", ""))[:300],
                    qualifications=str(row.get("qualifications", ""))[:300],
                    cluster_id=int(row["cluster_id"]),
                    x=float(row["x"]),
                    y=float(row["y"]),
                    z=0.0,
                    size=float(row["size"]),
                    color=str(row["color"]),
                    keywords=kws or [],
                    skills=sks or [],
                    job_level=jl,
                    scope=sc,
                    affinities=affs,
                )
            )
        except Exception as exc:
            logger.error(f"Error serialising job row: {exc}")

    clusters = build_cluster_info_list(job_data)

    # Build cluster-to-cluster similarity lookup
    cs_lookup: Dict[str, float] = {}
    if cluster_cluster_cos is not None:
        n = cluster_cluster_cos.shape[0]
        for a in range(n):
            for b in range(a + 1, n):
                cs_lookup[f"{a}-{b}"] = float(cluster_cluster_cos[a, b])

    return ConstellationData(
        jobs=jobs,
        clusters=clusters,
        total_jobs=len(jobs),
        num_clusters=len(clusters),
        cluster_sims=cs_lookup,
    )


@app.get("/api/job/{job_id}")
async def get_job_details(job_id: int):
    """Detailed information for a single job."""
    if job_data is None:
        raise HTTPException(503, "Data not loaded yet")

    row_df = job_data[job_data["id"] == job_id]
    if row_df.empty:
        raise HTTPException(404, "Job not found")

    row = row_df.iloc[0]

    kws = row["keywords"]
    if isinstance(kws, str):
        try:
            kws = eval(kws)
        except Exception:
            kws = []

    sks = row["skills"]
    if isinstance(sks, str):
        try:
            sks = eval(sks)
        except Exception:
            sks = []

    return {
        "id": int(row["id"]),
        "title": str(row["Unified Job Title"]),
        "summary": str(row.get("position_summary", "")),
        "responsibilities": str(row.get("responsibilities", "")),
        "qualifications": str(row.get("qualifications", "")),
        "cluster_id": int(row["cluster_id"]),
        "keywords": kws or [],
        "skills": sks or [],
        "job_level": str(row.get("Job Level", "")).strip() or None,
        "scope": str(row.get("Scope", "")).strip() or None,
        "distance_to_center": float(row.get("distance_to_center", 0.0)),
        "coordinates": {
            "x": float(row["x"]),
            "y": float(row["y"]),
            "z": float(row["z"]),
        },
    }


@app.post("/api/similar-jobs")
async def get_similar_jobs(request: SimilarityRequest):
    """
    Find semantically similar jobs using cosine similarity on SBERT embeddings.
    Mirrors the standardisation-scout approach in comprehensive_job_analysis.ipynb.
    """
    if job_data is None or embeddings is None:
        raise HTTPException(503, "Data not loaded yet")

    idx = request.job_id
    if idx < 0 or idx >= len(job_data):
        raise HTTPException(404, "Job not found")

    sims = cosine_similarity(embeddings[idx].reshape(1, -1), embeddings)[0]
    top_idx = np.argsort(sims)[::-1][1: request.top_k + 1]

    similar = []
    for i in top_idx:
        row = job_data.iloc[i]
        kws = row["keywords"]
        if isinstance(kws, str):
            try:
                kws = eval(kws)
            except Exception:
                kws = []
        similar.append(
            {
                "id": int(row["id"]),
                "title": str(row["Unified Job Title"]),
                "similarity": float(sims[i]),
                "cluster_id": int(row["cluster_id"]),
                "keywords": kws or [],
            }
        )

    return {
        "source_job_id": request.job_id,
        "source_title": str(job_data.iloc[idx]["Unified Job Title"]),
        "similar_jobs": similar,
    }


@app.get("/api/clusters/{cluster_id}/details")
async def get_cluster_details(cluster_id: int):
    """
    Detailed cluster profile including:
    - Top skills & keywords
    - Messiness score (avg distance to centroid)
    - Near-duplicate pairs within the cluster (standardisation candidates)
    Mirrors Phase 3 & 4 of comprehensive_job_analysis.ipynb.
    """
    if job_data is None or embeddings is None:
        raise HTTPException(503, "Data not loaded yet")

    cdf = job_data[job_data["cluster_id"] == cluster_id]
    if cdf.empty:
        raise HTTPException(404, "Cluster not found")

    # Aggregate skills
    all_skills: List[str] = []
    for sks in cdf["skills"]:
        if isinstance(sks, list):
            all_skills.extend(sks)
        elif isinstance(sks, str):
            try:
                all_skills.extend(eval(sks))
            except Exception:
                pass
    top_skills = [
        {"skill": s, "count": c} for s, c in Counter(all_skills).most_common(10)
    ]

    # Aggregate keywords
    all_kw: List[str] = []
    for kws in cdf["keywords"]:
        if isinstance(kws, list):
            all_kw.extend(kws)
        elif isinstance(kws, str):
            try:
                all_kw.extend(eval(kws))
            except Exception:
                pass
    top_keywords = [
        {"keyword": k, "count": c} for k, c in Counter(all_kw).most_common(10)
    ]

    # Messiness score — avg distance to cluster centroid (from comprehensive notebook)
    messiness_score = (
        float(cdf["distance_to_center"].mean())
        if "distance_to_center" in cdf.columns
        else 0.0
    )

    # Near-duplicate pairs within this cluster (threshold 0.90 — intra-cluster)
    cluster_indices = cdf.index.tolist()
    near_duplicate_pairs = []
    if len(cluster_indices) > 1:
        try:
            c_emb = embeddings[cluster_indices]
            sim_mat = cosine_similarity(c_emb)
            for i in range(len(cluster_indices)):
                for j in range(i + 1, len(cluster_indices)):
                    score = float(sim_mat[i, j])
                    if score > 0.90:
                        ta = str(cdf.iloc[i]["Unified Job Title"])
                        tb = str(cdf.iloc[j]["Unified Job Title"])
                        if ta.lower() != tb.lower():
                            near_duplicate_pairs.append(
                                {"job_a": ta, "job_b": tb, "similarity": round(score, 3)}
                            )
            near_duplicate_pairs.sort(key=lambda x: x["similarity"], reverse=True)
            near_duplicate_pairs = near_duplicate_pairs[:10]
        except Exception as exc:
            logger.warning(f"Near-duplicate detection failed for cluster {cluster_id}: {exc}")

    # Standardisation candidates: jobs involved in near-duplicate pairs first,
    # then outliers (highest distance to centroid) as fallback.
    if near_duplicate_pairs:
        seen: set = set()
        std_candidates: List[str] = []
        for pair in near_duplicate_pairs:
            for title in (pair["job_a"], pair["job_b"]):
                if title not in seen:
                    std_candidates.append(title)
                    seen.add(title)
        standardization_candidates = std_candidates[:5]
    elif "distance_to_center" in cdf.columns:
        q75 = cdf["distance_to_center"].quantile(0.75)
        outliers = cdf[cdf["distance_to_center"] > q75]
        standardization_candidates = outliers["Unified Job Title"].tolist()[:5]
    else:
        standardization_candidates = cdf["Unified Job Title"].head(5).tolist()

    return {
        "cluster_id": cluster_id,
        "size": len(cdf),
        "messiness_score": round(messiness_score, 3),
        "jobs": [
            {
                "id": int(row["id"]),
                "title": str(row["Unified Job Title"]),
                "summary": str(row.get("position_summary", ""))[:150],
            }
            for _, row in cdf.iterrows()
        ],
        "top_skills": top_skills,
        "top_keywords": top_keywords,
        "standardization_candidates": standardization_candidates,
        "near_duplicate_pairs": near_duplicate_pairs,
    }


@app.get("/api/stats")
async def get_statistics():
    """
    Dataset-level statistics including standardisation pair count.
    """
    if job_data is None:
        raise HTTPException(503, "Data not loaded yet")

    all_kw: List[str] = []
    for kws in job_data["keywords"]:
        if isinstance(kws, list):
            all_kw.extend(kws)
        elif isinstance(kws, str):
            try:
                all_kw.extend(eval(kws))
            except Exception:
                pass

    kw_counts = Counter(all_kw)

    level_dist: Dict[str, int] = {}
    if "Job Level" in job_data.columns:
        level_dist = {
            str(k): int(v)
            for k, v in job_data["Job Level"]
            .fillna("Unknown")
            .value_counts()
            .to_dict()
            .items()
        }

    return {
        "total_jobs": len(job_data),
        "num_clusters": int(job_data["cluster_id"].nunique()),
        "avg_jobs_per_cluster": float(len(job_data) / job_data["cluster_id"].nunique()),
        "cluster_distribution": {
            str(k): int(v)
            for k, v in job_data["cluster_id"].value_counts().to_dict().items()
        },
        "top_keywords_overall": {
            str(k): int(v) for k, v in dict(kw_counts.most_common(20)).items()
        },
        "standardization_pairs": n_standardization_pairs,
        "job_level_distribution": level_dist,
    }


@app.get("/api/standardization/duplicates")
async def get_standardization_duplicates(threshold: float = 0.95, limit: int = 50):
    """
    Find near-duplicate job roles — candidates for title consolidation.
    Mirrors the 'Standardisation Scout' in comprehensive_job_analysis.ipynb
    (cosine similarity > threshold, different titles).
    """
    if job_data is None or embeddings is None:
        raise HTTPException(503, "Data not loaded yet")

    try:
        sim = cosine_similarity(embeddings)
        pairs = []
        n = sim.shape[0]
        for i in range(n):
            for j in range(i + 1, n):
                score = float(sim[i, j])
                if score > threshold:
                    ta = str(job_data.iloc[i]["Unified Job Title"])
                    tb = str(job_data.iloc[j]["Unified Job Title"])
                    if ta.lower() != tb.lower():
                        pairs.append(
                            {
                                "job_a_id": int(job_data.iloc[i]["id"]),
                                "job_a_title": ta,
                                "job_b_id": int(job_data.iloc[j]["id"]),
                                "job_b_title": tb,
                                "similarity": round(score, 4),
                                "cluster_id": int(job_data.iloc[i]["cluster_id"]),
                            }
                        )
        pairs.sort(key=lambda x: x["similarity"], reverse=True)
        return {
            "total_pairs": len(pairs),
            "threshold": threshold,
            "duplicates": pairs[:limit],
        }
    except Exception as exc:
        logger.error(f"Error computing standardisation duplicates: {exc}")
        raise HTTPException(500, str(exc))


# ---------------------------------------------------------------------------
# RAG Chat Endpoints
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class DataContextRequest(BaseModel):
    """Data pipeline context from the frontend"""
    dataset_name: str = "Hackathon_Datasets_Refined_v5.csv"
    total_jobs: int = 622
    num_clusters: int = 15
    active_filters: Optional[Dict] = None  # Active filters from dashboard
    selected_clusters: Optional[List[int]] = None  # Clusters being viewed
    search_query: Optional[str] = None  # Current search query


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    current_report: Optional[str] = None  # The report the user is currently viewing
    include_data_context: bool = False  # Whether to include full data pipeline context
    data_context: Optional[DataContextRequest] = None  # Optional data context from frontend


class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []
    rag_enabled: bool


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    RAG-enabled chat endpoint using Gemini 2.0 Flash.
    Retrieves relevant context from 6 research reports and 622 job postings.
    Prioritizes the report the user is currently viewing.
    """
    if not RAG_AVAILABLE:
        return ChatResponse(
            response="AI chat is currently unavailable. Please check back later.",
            sources=[],
            rag_enabled=False
        )
    
    if not rag_engine.initialized:
        return ChatResponse(
            response="AI chat is still initializing. Please try again in a moment.",
            sources=[],
            rag_enabled=False
        )
    
    try:
        # Convert history to format expected by RAG engine
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
        
        # Build data context
        data_context = None
        if request.include_data_context:
            # Get basic data context from global state
            if job_data is not None:
                data_context = {
                    "dataset_name": "Hackathon_Datasets_Refined_v5.csv",
                    "total_jobs": len(job_data),
                    "num_clusters": int(job_data["cluster_id"].nunique()),
                    "available_columns": [c for c in job_data.columns],
                    "cluster_distribution": {
                        str(k): int(v)
                        for k, v in job_data["cluster_id"].value_counts().to_dict().items()
                    }
                }
                # Add frontend-provided context if available
                if request.data_context:
                    data_context["active_filters"] = request.data_context.active_filters
                    data_context["selected_clusters"] = request.data_context.selected_clusters
                    data_context["search_query"] = request.data_context.search_query
            
        # Get response from RAG engine with current report context
        response_text, sources = chat_with_rag(
            request.message, 
            history_dicts, 
            request.current_report,
            data_context
        )
        
        return ChatResponse(
            response=response_text,
            sources=sources,
            rag_enabled=True
        )
        
    except Exception as exc:
        logger.error(f"Error in chat endpoint: {exc}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(500, f"Chat error: {str(exc)}")


@app.get("/api/chat/status")
async def chat_status():
    """Get the status of the RAG chat engine"""
    status = {
        "rag_enabled": RAG_AVAILABLE,
        "initialized": rag_engine.initialized if RAG_AVAILABLE else False,
        "reports_loaded": len(rag_engine.chunks) if RAG_AVAILABLE else 0,
        "jobs_available": len(job_data) if job_data is not None else 0,
        "dataset": "Hackathon_Datasets_Refined_v5.csv",
        "num_clusters": int(job_data["cluster_id"].nunique()) if job_data is not None else 0,
    }
    
    # Add cluster summary if data is loaded
    if job_data is not None:
        status["clusters"] = []
        for cid in sorted(job_data["cluster_id"].unique()):
            cdf = job_data[job_data["cluster_id"] == cid]
            # Get representative titles
            titles = cdf["Unified Job Title"].value_counts().head(3).to_dict()
            status["clusters"].append({
                "id": int(cid),
                "size": len(cdf),
                "top_titles": [{"title": t, "count": c} for t, c in titles.items()]
            })
    
    # Add available reports
    status["available_reports"] = []
    if RAG_AVAILABLE and REPORTS_DIR.exists():
        for md_file in sorted(REPORTS_DIR.glob("*.md")):
            try:
                content = md_file.read_text(encoding='utf-8')
                title = md_file.stem.replace('_', ' ').title()
                fm_match = re.search(r'^---\s*\ntitle:\s*"([^"]+)"', content, re.MULTILINE)
                if fm_match:
                    title = fm_match.group(1)
                else:
                    h1_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
                    if h1_match:
                        title = h1_match.group(1)
                status["available_reports"].append({
                    "id": md_file.stem,
                    "title": title
                })
            except Exception:
                pass
    
    return status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
