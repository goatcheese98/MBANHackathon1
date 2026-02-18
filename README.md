# 🏢 Job Description Clustering & Standardization

An AI-powered analysis project for clustering and standardizing job descriptions. Built for the **2026 Methanex Data & AI Hackathon** (Challenge #1).

![Python](https://img.shields.io/badge/Python-3.12-blue)
![Jupyter](https://img.shields.io/badge/Jupyter-Notebooks-orange)
![ML](https://img.shields.io/badge/ML-scikit--learn-green)
![NLP](https://img.shields.io/badge/NLP-Sentence--BERT-red)

---

## 📋 Overview

Methanex has approximately 2,000 job descriptions with a 1:1 ratio to employees, making it difficult to standardize positions and define clear career paths. This project addresses that challenge through:

- **Data Cleaning & Standardization** - Extracting and normalizing job titles, departments, and metadata
- **NLP Embeddings** - Converting job descriptions into semantic vectors using Sentence-BERT
- **Clustering Analysis** - Grouping similar roles into job families using K-Means and Hierarchical Clustering
- **Interactive Visualization** - 3D constellation view of job relationships (see `career-constellation/`)

---

## 📁 Repository Structure

```
├── 📊 Data Files
│   ├── Hackathon Challenge #1 Datasets.csv          # Original dataset (~5,000 job postings)
│   ├── Hackathon Challenge #1 Datasets Cleaned.csv  # Cleaned version
│   ├── Hackathon_Datasets_Refined_v5.csv            # Final refined dataset with metadata
│   └── job_postings_with_departments.csv            # Dataset with extracted departments
│
├── 🔧 Data Processing Scripts
│   ├── clean_dataset.py                             # Basic dataset cleaning
│   ├── clean_dataset_v4.ipynb                       # Advanced cleaning with metadata extraction
│   ├── clean_dataset_v5.ipynb                       # Refined cleaning pipeline
│   └── extract_departments_final.py                 # Department extraction from file paths
│
├── 🤖 Analysis & Clustering
│   ├── hackathon 2.ipynb                            # Main clustering notebook (TF-IDF, SBERT, K-Means, Hierarchical)
│   ├── comprehensive_job_analysis.ipynb             # Deep-dive analysis with dendrograms and similarity
│   └── assignments_analysis.ipynb                   # Job assignment analysis
│
├── 🔍 AI Developer Search
│   ├── find_ai_developer.py                         # Script to identify AI/ML roles
│   ├── find_ai_complete.py                          # Complete AI search implementation
│   └── search_ai_dev.py                             # Quick AI developer search
│
└── 🌌 career-constellation/                         # Interactive 3D visualization app
    ├── README.md                                    # Detailed app documentation
    ├── backend/                                     # FastAPI + ML backend
    └── frontend/                                    # Next.js + Three.js frontend
```

---

## 🚀 Quick Start

### Prerequisites

```bash
pip install pandas numpy scikit-learn sentence-transformers matplotlib seaborn jupyter
```

### Running the Analysis

1. **Data Cleaning** (start here if working with raw data):
   ```bash
   python clean_dataset.py
   python extract_departments_final.py
   ```

2. **Clustering Analysis**:
   ```bash
   jupyter notebook "hackathon 2.ipynb"
   ```

3. **Interactive 3D Visualization**:
   ```bash
   cd career-constellation
   ./start.sh  # See career-constellation/README.md for details
   ```

---

## 📊 Data Pipeline

### 1. Data Cleaning & Standardization

The raw dataset contains job descriptions extracted from files with inconsistent naming:

```
Raw:      "202203 Finance Manager Posting.doc"
Cleaned:  "Finance Manager"
```

**Key transformations:**
- Extract clean job titles from file paths
- Remove noise words ("Posting", "Job Description", "External", "Internal")
- Strip date prefixes and file extensions
- Extract metadata: Job Level, Scope, Department, Internal/External status
- Standardize acronyms (HR, IT, HSE, VP)

**Departments Identified** (18 unique):
| Department | Count | Department | Count |
|------------|-------|------------|-------|
| Operations | ~150 | Technical | ~140 |
| Maintenance | ~130 | Finance | ~90 |
| Human Resources | ~80 | Supply Chain | ~70 |
| Responsible Care | ~60 | IT | ~50 |
| Administration | ~40 | Commercial | ~35 |
| Turnaround | ~30 | Marketing | ~25 |
| Legal | ~15 | Communications | ~15 |
| Sustainability | ~10 | Manufacturing | ~10 |
| Corporate Development | ~5 | Other | ~20 |

### 2. Text Embeddings

Using **Sentence-BERT** (`all-MiniLM-L6-v2`) to create 384-dimensional semantic vectors:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(job_descriptions)  # Shape: (622, 384)
```

Combined text fields for embedding:
- Job Title (weighted 2x for emphasis)
- Position Summary
- Responsibilities
- Qualifications

### 3. Clustering Algorithms

**K-Means Clustering**:
- Elbow method to determine optimal k (~12 clusters)
- Groups jobs into distinct families

**Hierarchical Clustering**:
- Ward's linkage method
- Dendrogram visualization for taxonomy understanding
- Distance threshold-based cluster detection

---

## 🔬 Key Notebooks

### `hackathon 2.ipynb`
The main analysis notebook covering:
- **TF-IDF Vectorization** - Baseline text representation (shape: 622×4113)
- **Sentence Embeddings** - Semantic representation (shape: 622×384)
- **K-Means** - Elbow plot and cluster assignment
- **Hierarchical Clustering** - Dendrogram and tree-based clustering

Output: `Hackathon_Clustered_Jobs.csv` with cluster labels

### `comprehensive_job_analysis.ipynb`
Advanced analysis including:
- Hierarchical clustering with dendrograms
- **Near-duplicate detection** - Finding similar roles with different titles
- Cluster profiling - N-gram analysis per cluster
- "Messiness" report - Variance ranking for standardization priority

### `clean_dataset_v4.ipynb` / `clean_dataset_v5.ipynb`
Data refinement pipelines:
- Metadata extraction (Job Level, Scope, Internal status)
- Acronym standardization
- Department classification

---

## 🌌 Career Constellation Navigator

For an interactive 3D visualization of the job clusters:

```bash
cd career-constellation
chmod +x start.sh
./start.sh
```

**Features:**
- 🌠 3D galaxy view with jobs as stars
- 🔗 Constellation lines showing relationships
- 🎨 Color-coded clusters
- 🔍 Click to view job details
- 📊 Cluster statistics and similarity analysis

**Tech Stack:**
- Backend: FastAPI + Sentence-BERT + HDBSCAN + UMAP
- Frontend: Next.js 14 + Three.js + React Three Fiber

See [`career-constellation/README.md`](career-constellation/README.md) for full details.

---

## 📈 Sample Findings

### Job Level Distribution
- **Senior** roles: ~25%
- **Manager/Director** roles: ~15%
- **Lead/Principal** roles: ~10%
- **Junior/Entry** roles: ~8%
- **Individual Contributor** roles: ~42%

### Clustering Results
With k=12, the algorithm identified natural job families including:
- Engineering & Technical roles
- Operations & Production roles  
- Finance & Accounting roles
- HR & People Operations roles
- Maintenance & Reliability roles
- Leadership & Management roles
- Safety & Environmental roles

### Standardization Opportunities
Analysis identified ~15-20% of roles as potential near-duplicates, suggesting:
- Roles with >90% content similarity but different titles
- Opportunities for job family consolidation
- Career path definition within clusters

---

## 🛠️ Technical Stack

| Component | Technology |
|-----------|------------|
| Data Processing | pandas, numpy, re |
| NLP/Embeddings | sentence-transformers (SBERT) |
| Clustering | scikit-learn (KMeans, Agglomerative), HDBSCAN |
| Visualization | matplotlib, seaborn, plotly |
| Dimensionality Reduction | UMAP, PCA |
| Web Framework | FastAPI (backend), Next.js (frontend) |
| 3D Graphics | Three.js, React Three Fiber |

---

## 📝 Data Schema

### Input Schema (`Hackathon Challenge #1 Datasets.csv`)
| Column | Description |
|--------|-------------|
| `filename` | Original file path (e.g., `C:\...\Finance Manager.doc`) |
| `job_title` | Extracted job title |
| `position_summary` | Role overview text |
| `responsibilities` | Key duties and tasks |
| `qualifications` | Required skills and experience |

### Output Schema (`Hackathon_Datasets_Refined_v5.csv`)
| Column | Description |
|--------|-------------|
| `Unified Job Title` | Standardized, cleaned title |
| `Job Level` | Senior, Junior, Lead, Manager, etc. |
| `Scope` | Global, Regional, Local, or empty |
| `Internal Posting` | Yes/No flag |
| `department` | Assigned department |
| `position_summary` | Original summary |
| `responsibilities` | Original responsibilities |
| `qualifications` | Original qualifications |

---

## 🏆 Hackathon Context

**Challenge #1: Job Description Clustering**

> **Problem Statement**: Methanex has ~2,000 job descriptions with a 1:1 relationship to employees. This makes it difficult to:
> - Standardize positions across the organization
> - Define clear career paths and progression ladders
> - Identify redundancy and consolidation opportunities
> - Support workforce planning and talent management

> **Our Solution**: A multi-layered approach combining:
> 1. NLP-based semantic clustering to discover natural job families
> 2. Interactive 3D visualization for intuitive exploration
> 3. Near-duplicate detection for standardization opportunities
> 4. Hierarchical taxonomy for career path planning

**Event**: 2026 Methanex Data & AI Hackathon  
**Dates**: February 17-20, 2026  
**Team**: Career Constellation

---

## 🤝 Contributing

This project was developed during the Methanex Hackathon. Key areas for future enhancement:

- [ ] Expand to full 2,000 job dataset
- [ ] Implement feedback loop for cluster refinement
- [ ] Add career path prediction between clusters
- [ ] Integrate with HR systems (Workday, etc.)
- [ ] Add salary benchmarking data
- [ ] Build competency framework mapping

---

## 📄 License

MIT License - Built for the 2026 Methanex Data & AI Hackathon

---

## 🙏 Credits

Built with ❤️ for the Methanex Data & AI Hackathon  
**Team**: Career Constellation  
**Date**: February 2026
