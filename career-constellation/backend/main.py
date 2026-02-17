"""
Career Constellation Navigator - Backend API
AI-powered job description clustering and visualization
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sklearn.decomposition import PCA
from sklearn.cluster import AgglomerativeClustering, KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Career Constellation Navigator API",
    description="AI-powered job clustering and visualization",
    version="1.0.0"
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and data
model = None
job_data = None
embeddings = None
clusters = None

# ============== Data Models ==============

class JobPoint(BaseModel):
    id: int
    title: str
    summary: str
    responsibilities: str
    qualifications: str
    cluster_id: int
    x: float
    y: float
    z: float
    size: float
    color: str
    keywords: List[str]
    skills: List[str]

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

class SimilarityRequest(BaseModel):
    job_id: int
    top_k: int = 5

class SkillGapRequest(BaseModel):
    source_job_id: int
    target_job_id: int

# ============== AI/ML Functions ==============

def load_model():
    """Load the sentence transformer model"""
    global model
    if model is None:
        try:
            logger.info("Loading Sentence-BERT model...")
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load Sentence-BERT: {e}. Using fallback.")
            model = "fallback"
    return model

def extract_keywords(text: str, top_n: int = 5) -> List[str]:
    """Extract keywords using simple TF-IDF approach"""
    try:
        vectorizer = TfidfVectorizer(
            max_features=100,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=1
        )
        
        tfidf_matrix = vectorizer.fit_transform([text])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf_matrix.toarray()[0]
        
        # Get top keywords
        top_indices = scores.argsort()[-top_n:][::-1]
        keywords = [feature_names[i] for i in top_indices if scores[i] > 0]
        return keywords[:top_n]
    except Exception as e:
        # Fallback: return common words
        words = text.lower().split()
        # Filter out common stop words
        stop_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye', 'ago', 'off', 'too', 'any', 'say', 'man', 'try', 'ask', 'end', 'why', 'let', 'put', 'say', 'she', 'try', 'way', 'own', 'say', 'too', 'old', 'tell', 'very', 'when', 'much', 'would', 'there', 'their', 'what', 'said', 'have', 'each', 'which', 'will', 'about', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'while', 'this', 'that', 'with', 'from', 'they', 'know', 'want', 'been', 'good', 'have', 'does', 'made', 'well', 'were', 'said', 'time', 'than', 'them', 'into', 'just', 'like', 'over', 'also', 'back', 'only', 'know', 'take', 'year', 'come', 'make', 'well', 'work', 'life', 'even', 'more', 'want', 'here', 'look', 'down', 'most', 'long', 'last', 'find', 'give', 'does', 'made', 'part', 'such', 'keep', 'call', 'came', 'need', 'feel', 'seem', 'turn', 'hand', 'high', 'sure', 'upon', 'head', 'help', 'home', 'side', 'move', 'both', 'five', 'once', 'same', 'must', 'name', 'left', 'each', 'done', 'open', 'case', 'show', 'live', 'play', 'went', 'told', 'seen', 'stop', 'face', 'fact', 'land', 'line', 'kind', 'next', 'word', 'came', 'went', 'told', 'seen', 'stop', 'face', 'fact', 'land', 'line', 'kind', 'next', 'word', 'came', 'went', 'told', 'seen', 'stop', 'face', 'fact', 'land', 'line', 'kind', 'next', 'word'}
        filtered = [w for w in words if len(w) > 4 and w not in stop_words]
        from collections import Counter
        return [word for word, count in Counter(filtered).most_common(top_n)]

def extract_skills(text: str) -> List[str]:
    """Extract skills from job text using keyword matching"""
    skill_keywords = [
        "python", "java", "javascript", "typescript", "sql", "excel", "powerpoint",
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
        "quality control", "inspection", "testing", "audit", "audit",
        "financial", "accounting", "tax", "audit", "budget", "forecast",
        "supervisory", "administrative", "technical", "strategic"
    ]
    
    text_lower = text.lower()
    found_skills = []
    
    for skill in skill_keywords:
        if skill in text_lower and skill.title() not in found_skills:
            found_skills.append(skill.title())
    
    return found_skills[:10]

def generate_embeddings(texts: List[str]):
    """Generate embeddings using Sentence-BERT or fallback to TF-IDF"""
    load_model()
    
    if model == "fallback":
        # Use TF-IDF as fallback
        logger.info("Using TF-IDF fallback for embeddings")
        vectorizer = TfidfVectorizer(max_features=100, stop_words='english', min_df=2)
        return vectorizer.fit_transform(texts).toarray()
    else:
        # Use Sentence-BERT
        logger.info(f"Generating embeddings for {len(texts)} texts...")
        return model.encode(texts, show_progress_bar=True, batch_size=64)

def cluster_jobs(embeddings, n_clusters: int = 15):
    """Cluster jobs using K-Means (faster for large datasets)"""
    logger.info(f"Clustering {len(embeddings)} jobs into {n_clusters} clusters...")
    
    # Use K-Means for speed on large datasets
    clusterer = KMeans(n_clusters=n_clusters, random_state=42, n_init=10, max_iter=300)
    labels = clusterer.fit_predict(embeddings)
    
    return labels, clusterer

def load_and_process_data(csv_path: str, max_jobs: int = 5000):
    """Load and preprocess job description data"""
    global job_data, embeddings, clusters
    
    logger.info(f"Loading data from {csv_path}")
    
    # Load CSV
    df = pd.read_csv(csv_path)
    logger.info(f"Loaded {len(df)} job descriptions")
    
    # For large datasets, sample to keep processing fast
    # but ensure we get diversity across job types
    if len(df) > max_jobs:
        logger.info(f"Sampling {max_jobs} jobs for optimal performance")
        # Try to get diverse sample using job titles
        df = df.sample(n=max_jobs, random_state=42).reset_index(drop=True)
    
    # Combine text fields for embedding
    df['full_text'] = (
        df['job_title'].fillna('') + ' ' +
        df['position_summary'].fillna('') + ' ' +
        df['responsibilities'].fillna('') + ' ' +
        df['qualifications'].fillna('')
    )
    
    # Clean data
    df = df.dropna(subset=['full_text'])
    df = df[df['full_text'].str.len() > 50]
    
    logger.info(f"Processing {len(df)} valid job descriptions")
    
    # Generate embeddings
    embeddings_list = generate_embeddings(df['full_text'].tolist())
    embeddings = np.array(embeddings_list)
    logger.info(f"Generated embeddings with shape: {embeddings.shape}")
    
    # Perform clustering
    n_clusters = min(15, len(df) // 10)  # Adaptive cluster count
    labels, clusterer = cluster_jobs(embeddings, n_clusters=n_clusters)
    df['cluster_id'] = labels
    clusters = labels
    
    logger.info(f"Created {n_clusters} clusters")
    
    # 3D projection using PCA (faster than UMAP for large datasets)
    logger.info("Creating 3D projection...")
    pca = PCA(n_components=3, random_state=42)
    coords_3d = pca.fit_transform(embeddings)
    
    df['x'] = coords_3d[:, 0]
    df['y'] = coords_3d[:, 1]
    df['z'] = coords_3d[:, 2]
    
    # Normalize coordinates for better visualization
    for coord in ['x', 'y', 'z']:
        df[coord] = (df[coord] - df[coord].min()) / (df[coord].max() - df[coord].min())
        df[coord] = df[coord] * 100 - 50  # Scale to [-50, 50]
    
    # Extract keywords and skills for each job
    logger.info("Extracting keywords and skills...")
    df['keywords'] = df['full_text'].apply(lambda x: extract_keywords(x, 5))
    df['skills'] = df['full_text'].apply(extract_skills)
    
    # Assign colors based on cluster
    colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        '#FF9FF3', '#54A0FF', '#48DBFB', '#1DD1A1', '#FFA502',
        '#FF7675', '#74B9FF', '#A29BFE', '#FD79A8', '#FDCB6E'
    ]
    df['color'] = df['cluster_id'].apply(lambda x: colors[x % len(colors)])
    
    # Calculate size based on text length
    df['size'] = df['full_text'].str.len().apply(lambda x: max(2, min(8, x / 500)))
    
    job_data = df.reset_index(drop=True)
    job_data['id'] = job_data.index
    
    logger.info("Data processing complete!")
    return job_data

def get_cluster_info(df: pd.DataFrame) -> List[ClusterInfo]:
    """Generate cluster summary information"""
    clusters = []
    
    for cluster_id in sorted(df['cluster_id'].unique()):
        try:
            cluster_df = df[df['cluster_id'] == cluster_id]
            
            if cluster_df.empty:
                continue
            
            # Get cluster centroid
            centroid = {
                'x': float(cluster_df['x'].mean()),
                'y': float(cluster_df['y'].mean()),
                'z': float(cluster_df['z'].mean())
            }
            
            # Get top keywords for cluster
            all_keywords = []
            for keywords in cluster_df['keywords']:
                if isinstance(keywords, list):
                    all_keywords.extend(keywords)
                elif isinstance(keywords, str):
                    try:
                        all_keywords.extend(eval(keywords))
                    except:
                        pass
            
            from collections import Counter
            top_keywords = [word for word, count in Counter(all_keywords).most_common(5)]
            
            # Get example titles
            example_titles = cluster_df['job_title'].head(3).tolist()
            
            # Generate cluster label from keywords
            label = top_keywords[0].title() if top_keywords else f"Cluster {cluster_id}"
            
            clusters.append(ClusterInfo(
                id=int(cluster_id),
                label=label,
                keywords=top_keywords,
                example_titles=example_titles,
                size=len(cluster_df),
                color=str(cluster_df['color'].iloc[0]),
                centroid=centroid,
                jobs=cluster_df['id'].tolist()
            ))
        except Exception as e:
            logger.error(f"Error processing cluster {cluster_id}: {e}")
            continue
    
    return clusters

# ============== API Endpoints ==============

@app.on_event("startup")
async def startup_event():
    """Initialize data on startup"""
    global job_data
    
    # Look for the dataset - check multiple possible locations
    possible_paths = [
        # Absolute path from the hackathon folder
        "/Users/rohanjasani/Desktop/Hackathon/Hackathon Challenge #1 Datasets.csv",
        # Relative paths from backend directory
        "../Hackathon Challenge #1 Datasets.csv",
        "../../Hackathon Challenge #1 Datasets.csv",
        "../data/jobs.csv",
        "data/jobs.csv",
        # From current working directory
        "Hackathon Challenge #1 Datasets.csv",
        # From parent directories
        "../HackathonData/Hackathon Challenge #1 Datasets.csv",
    ]
    
    # Also check environment variable
    if os.getenv('DATA_PATH'):
        possible_paths.insert(0, os.getenv('DATA_PATH'))
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            logger.info(f"Found dataset at: {csv_path}")
            break
    
    if csv_path is None:
        logger.warning("Dataset not found, creating sample data...")
        # Create sample data for testing
        create_sample_data()
        csv_path = "data/sample_jobs.csv"
    
    if csv_path:
        try:
            # Process all jobs in the dataset
            logger.info(f"Starting data processing from {csv_path}")
            job_data = load_and_process_data(csv_path, max_jobs=10000)
            logger.info(f"Successfully loaded {len(job_data)} jobs")
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            import traceback
            logger.error(traceback.format_exc())
            logger.info("Creating sample data instead...")
            create_sample_data()
            job_data = load_and_process_data("data/sample_jobs.csv")

def create_sample_data():
    """Create sample job data for testing"""
    os.makedirs("data", exist_ok=True)
    
    sample_data = {
        'job_title': [
            'Finance Manager', 'Senior Accountant', 'Financial Analyst', 'Budget Coordinator',
            'Senior Process Engineer', 'Process Engineer', 'Mechanical Engineer', 'Project Engineer',
            'HR Advisor', 'HR Manager', 'Recruitment Specialist', 'Training Coordinator',
            'Safety Manager', 'Safety Coordinator', 'Environmental Specialist', 'Compliance Officer',
            'Operations Manager', 'Plant Operator', 'Maintenance Supervisor', 'Technician',
            'Procurement Manager', 'Buyer', 'Contract Administrator', 'Supply Chain Analyst',
            'IT Manager', 'Systems Analyst', 'Network Administrator', 'Database Administrator',
            'Marketing Manager', 'Communications Specialist', 'Graphic Designer', 'Content Writer'
        ],
        'position_summary': [
            'Oversees financial operations and strategy for the site',
            'Responsible for monthly close and financial reporting',
            'Analyzes financial data to support business decisions',
            'Coordinates annual budget preparation and monitoring',
            'Optimizes plant processes for maximum efficiency',
            'Provides process engineering support for operations',
            'Designs and maintains mechanical equipment',
            'Manages capital projects from conception to completion',
            'Partners with leaders on HR strategies and employee relations',
            'Leads HR department and develops people strategies',
            'Manages full-cycle recruitment for all positions',
            'Develops and delivers training programs for employees',
            'Ensures workplace safety and regulatory compliance',
            'Coordinates daily safety activities and inspections',
            'Manages environmental programs and compliance',
            'Ensures adherence to corporate policies and regulations',
            'Oversees daily plant operations and production targets',
            'Operates process equipment and monitors parameters',
            'Leads maintenance team and schedules work',
            'Performs equipment repairs and preventive maintenance',
            'Manages procurement function and vendor relationships',
            'Processes purchase orders and manages inventory',
            'Administers contracts and tracks compliance',
            'Analyzes supply chain data and optimizes logistics',
            'Manages IT infrastructure and support services',
            'Analyzes business requirements and system solutions',
            'Maintains network security and connectivity',
            'Manages database systems and ensures data integrity',
            'Develops marketing strategies and brand positioning',
            'Manages internal and external communications',
            'Creates visual designs for marketing materials',
            'Produces written content for various channels'
        ],
        'responsibilities': [
            'Financial reporting, budgeting, forecasting, and analysis. Manage accounting team.',
            'Prepare journal entries, reconcile accounts, produce financial statements.',
            'Build financial models, perform variance analysis, create dashboards.',
            'Collect budget inputs, track spending, prepare budget reports.',
            'Monitor process parameters, troubleshoot issues, optimize yields.',
            'Conduct process studies, develop procedures, support troubleshooting.',
            'Design equipment modifications, perform calculations, review drawings.',
            'Manage project scope, schedule, and budget. Coordinate with stakeholders.',
            'Advise managers on HR policies, handle employee relations issues.',
            'Develop HR strategy, manage HR team, oversee talent programs.',
            'Source candidates, conduct interviews, manage applicant tracking system.',
            'Assess training needs, design curriculum, deliver training sessions.',
            'Develop safety programs, investigate incidents, ensure regulatory compliance.',
            'Conduct safety inspections, maintain safety records, coordinate training.',
            'Monitor emissions, manage waste programs, prepare regulatory reports.',
            'Audit processes for compliance, develop policies, conduct investigations.',
            'Manage production schedules, optimize resources, ensure quality output.',
            'Monitor control systems, respond to alarms, maintain logbooks.',
            'Schedule maintenance work, manage spare parts, supervise technicians.',
            'Repair equipment, perform PMs, maintain documentation.',
            'Develop sourcing strategies, negotiate contracts, manage vendors.',
            'Issue POs, track deliveries, resolve invoice discrepancies.',
            'Draft contracts, track obligations, maintain contract database.',
            'Analyze spend data, optimize inventory, improve logistics processes.',
            'Manage IT projects, oversee helpdesk, ensure system availability.',
            'Gather requirements, document processes, configure systems.',
            'Monitor network performance, troubleshoot issues, manage security.',
            'Perform database tuning, backups, and troubleshoot database issues.',
            'Develop marketing plans, manage campaigns, analyze market trends.',
            'Write communications, manage intranet, coordinate events.',
            'Design brochures, create digital assets, maintain brand standards.',
            'Write articles, edit content, manage editorial calendar.'
        ],
        'qualifications': [
            'CPA designation, 10 years experience, leadership skills, Excel proficiency.',
            'Accounting degree, 5 years experience, knowledge of GAAP, attention to detail.',
            'Finance degree, analytical skills, advanced Excel, modeling experience.',
            'Business degree, organizational skills, Excel, communication skills.',
            'Chemical engineering degree, 7 years experience, process simulation skills.',
            'Engineering degree, problem-solving skills, teamwork, communication.',
            'Mechanical engineering degree, CAD skills, PE license preferred.',
            'Engineering degree, project management certification, leadership.',
            'HR degree, 5 years experience, employee relations, conflict resolution.',
            'HR degree, 10 years experience, strategic thinking, leadership.',
            'HR background, sourcing skills, interviewing experience, ATS knowledge.',
            'Education background, presentation skills, curriculum design.',
            'Safety certification, 10 years experience, regulatory knowledge, leadership.',
            'Safety training, attention to detail, communication, inspection skills.',
            'Environmental science degree, regulatory knowledge, data analysis.',
            'Legal or compliance background, attention to detail, investigation skills.',
            'Operations experience, leadership, decision-making, problem-solving.',
            'Technical aptitude, attention to detail, teamwork, shift work.',
            'Technical background, leadership, planning skills, maintenance knowledge.',
            'Technical diploma, mechanical aptitude, troubleshooting skills.',
            'Supply chain degree, negotiation skills, vendor management experience.',
            'Business degree, organizational skills, attention to detail.',
            'Legal or business background, contract knowledge, organization.',
            'Supply chain degree, analytical skills, Excel, data analysis.',
            'IT degree, 10 years experience, infrastructure knowledge, leadership.',
            'IT degree, analytical skills, SQL knowledge, business acumen.',
            'IT certification, network knowledge, troubleshooting, security awareness.',
            'Database certification, SQL expertise, performance tuning.',
            'Marketing degree, strategic thinking, campaign management, creativity.',
            'Communications degree, writing skills, media relations, organization.',
            'Design degree, Adobe Creative Suite, portfolio, creativity.',
            'English or journalism degree, writing samples, editing skills, creativity.'
        ]
    }
    
    df = pd.DataFrame(sample_data)
    df.to_csv("data/sample_jobs.csv", index=False)
    logger.info("Sample data created")

@app.get("/")
async def root():
    return {"message": "Career Constellation Navigator API", "status": "running"}

@app.get("/api/constellation", response_model=ConstellationData)
async def get_constellation():
    """Get all job data with clustering for 3D visualization"""
    if job_data is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    
    try:
        jobs = []
        for _, row in job_data.iterrows():
            try:
                keywords = row['keywords']
                if isinstance(keywords, str):
                    try:
                        keywords = eval(keywords)
                    except:
                        keywords = []
                
                skills = row['skills']
                if isinstance(skills, str):
                    try:
                        skills = eval(skills)
                    except:
                        skills = []
                
                jobs.append(JobPoint(
                    id=int(row['id']),
                    title=str(row['job_title']),
                    summary=str(row.get('position_summary', ''))[:200],
                    responsibilities=str(row.get('responsibilities', ''))[:300],
                    qualifications=str(row.get('qualifications', ''))[:300],
                    cluster_id=int(row['cluster_id']),
                    x=float(row['x']),
                    y=float(row['y']),
                    z=float(row['z']),
                    size=float(row['size']),
                    color=str(row['color']),
                    keywords=keywords or [],
                    skills=skills or []
                ))
            except Exception as e:
                logger.error(f"Error processing job row: {e}")
                continue
        
        clusters = get_cluster_info(job_data)
        
        return ConstellationData(
            jobs=jobs,
            clusters=clusters,
            total_jobs=len(jobs),
            num_clusters=len(clusters)
        )
    except Exception as e:
        logger.error(f"Error in get_constellation: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.get("/api/job/{job_id}")
async def get_job_details(job_id: int):
    """Get detailed information for a specific job"""
    if job_data is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    
    job = job_data[job_data['id'] == job_id]
    if job.empty:
        raise HTTPException(status_code=404, detail="Job not found")
    
    row = job.iloc[0]
    
    keywords = row['keywords']
    if isinstance(keywords, str):
        try:
            keywords = eval(keywords)
        except:
            keywords = []
    
    skills = row['skills']
    if isinstance(skills, str):
        try:
            skills = eval(skills)
        except:
            skills = []
    
    return {
        "id": int(row['id']),
        "title": row['job_title'],
        "summary": str(row.get('position_summary', '')),
        "responsibilities": str(row.get('responsibilities', '')),
        "qualifications": str(row.get('qualifications', '')),
        "cluster_id": int(row['cluster_id']),
        "keywords": keywords,
        "skills": skills,
        "coordinates": {
            "x": float(row['x']),
            "y": float(row['y']),
            "z": float(row['z'])
        }
    }

@app.post("/api/similar-jobs")
async def get_similar_jobs(request: SimilarityRequest):
    """Find similar jobs based on embedding similarity"""
    if job_data is None or embeddings is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    
    job_idx = request.job_id
    if job_idx < 0 or job_idx >= len(job_data):
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Calculate cosine similarity
    job_embedding = embeddings[job_idx].reshape(1, -1)
    similarities = cosine_similarity(job_embedding, embeddings)[0]
    
    # Get top k similar jobs (excluding self)
    similar_indices = np.argsort(similarities)[::-1][1:request.top_k + 1]
    
    similar_jobs = []
    for idx in similar_indices:
        row = job_data.iloc[idx]
        keywords = row['keywords']
        if isinstance(keywords, str):
            try:
                keywords = eval(keywords)
            except:
                keywords = []
        
        similar_jobs.append({
            "id": int(row['id']),
            "title": row['job_title'],
            "similarity": float(similarities[idx]),
            "cluster_id": int(row['cluster_id']),
            "keywords": keywords
        })
    
    return {
        "source_job_id": request.job_id,
        "source_title": job_data.iloc[job_idx]['job_title'],
        "similar_jobs": similar_jobs
    }

@app.get("/api/clusters/{cluster_id}/details")
async def get_cluster_details(cluster_id: int):
    """Get detailed information about a specific cluster"""
    if job_data is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    
    cluster_df = job_data[job_data['cluster_id'] == cluster_id]
    if cluster_df.empty:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Aggregate skills
    all_skills = []
    for skills in cluster_df['skills']:
        if isinstance(skills, list):
            all_skills.extend(skills)
        elif isinstance(skills, str):
            try:
                all_skills.extend(eval(skills))
            except:
                pass
    
    from collections import Counter
    skill_counts = Counter(all_skills)
    top_skills = [{"skill": skill, "count": count} for skill, count in skill_counts.most_common(10)]
    
    # Get all keywords
    all_keywords = []
    for keywords in cluster_df['keywords']:
        if isinstance(keywords, list):
            all_keywords.extend(keywords)
        elif isinstance(keywords, str):
            try:
                all_keywords.extend(eval(keywords))
            except:
                pass
    
    keyword_counts = Counter(all_keywords)
    top_keywords = [{"keyword": kw, "count": count} for kw, count in keyword_counts.most_common(10)]
    
    return {
        "cluster_id": cluster_id,
        "size": len(cluster_df),
        "jobs": [
            {
                "id": int(row['id']),
                "title": row['job_title'],
                "summary": str(row.get('position_summary', ''))[:100]
            }
            for _, row in cluster_df.iterrows()
        ],
        "top_skills": top_skills,
        "top_keywords": top_keywords,
        "standardization_candidates": cluster_df.nsmallest(5, 'size')['job_title'].tolist()
    }

@app.get("/api/stats")
async def get_statistics():
    """Get overall statistics about the dataset"""
    if job_data is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    
    # Get all keywords
    all_keywords = []
    for keywords in job_data['keywords']:
        if isinstance(keywords, list):
            all_keywords.extend(keywords)
        elif isinstance(keywords, str):
            try:
                all_keywords.extend(eval(keywords))
            except:
                pass
    
    from collections import Counter
    keyword_counts = Counter(all_keywords)
    
    return {
        "total_jobs": len(job_data),
        "num_clusters": int(job_data['cluster_id'].nunique()),
        "avg_jobs_per_cluster": float(len(job_data) / job_data['cluster_id'].nunique()),
        "cluster_distribution": {str(k): int(v) for k, v in job_data['cluster_id'].value_counts().to_dict().items()},
        "top_keywords_overall": {str(k): int(v) for k, v in dict(keyword_counts.most_common(20)).items()}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
