# 🌌 Career Constellation Navigator

An AI-powered 3D visualization platform for job description clustering and standardization. Built for the Methanex Hackathon Challenge #1.

![Constellation Visualization](https://img.shields.io/badge/3D-Three.js-black)
![AI](https://img.shields.io/badge/AI-Sentence--BERT-blue)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-purple)
![Backend](https://img.shields.io/badge/Backend-FastAPI-green)

## ✨ Features

### 🤖 AI-Powered Clustering
- **Sentence-BERT Embeddings** - Converts job descriptions into semantic vectors
- **HDBSCAN Clustering** - Discovers natural job families without predefined categories
- **TF-IDF Keyword Extraction** - Identifies key characteristics of each role
- **Similarity Analysis** - Finds similar jobs for standardization opportunities

### 🎨 Stunning 3D Visualization
- **Interactive Galaxy** - Jobs represented as stars in a cosmic constellation
- **Constellation Lines** - Visual connections between related roles
- **Cluster Color Coding** - Each job family has its own cosmic hue
- **Smooth Animations** - Powered by React Three Fiber and Framer Motion

### 📊 Rich Data Exploration
- **Job Details Panel** - Full job descriptions, skills, and requirements
- **Cluster Analysis** - Insights into job families and standardization candidates
- **Similar Jobs** - Find roles that could be merged
- **Search & Filter** - Quickly locate specific positions

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Option 1: Automated Startup (Recommended)

```bash
cd career-constellation
chmod +x start.sh
./start.sh
```

This will:
1. Set up Python virtual environment
2. Install all dependencies
3. Start the backend (http://localhost:8000)
4. Start the frontend (http://localhost:3000)

### Option 2: Manual Setup

#### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
career-constellation/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   └── data/                   # Data files
├── frontend/
│   ├── app/                    # Next.js app router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── GalaxyScene.tsx     # 3D visualization
│   │   ├── JobDetailsPanel.tsx
│   │   ├── ClusterPanel.tsx
│   │   └── Header.tsx
│   ├── lib/
│   │   ├── api.ts              # API client
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   ├── package.json
│   └── next.config.js
├── start.sh                    # Startup script
└── README.md
```

## 🔧 Technology Stack

### Backend
- **FastAPI** - Modern, fast web framework
- **Sentence Transformers** - For semantic text embeddings
- **HDBSCAN** - Density-based clustering
- **UMAP** - Dimensionality reduction for visualization
- **scikit-learn** - ML utilities

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Three.js + React Three Fiber** - 3D graphics
- **Drei** - Three.js helpers
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling
- **Zustand** - State management (ready for use)

## 🎯 Key Algorithms

### 1. Text Embedding
```python
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(job_descriptions)
```

### 2. Clustering
```python
clusterer = hdbscan.HDBSCAN(
    min_cluster_size=5,
    min_samples=3,
    metric='euclidean'
)
clusters = clusterer.fit_predict(embeddings)
```

### 3. 3D Projection
```python
reducer = umap.UMAP(n_components=3, metric='cosine')
coords_3d = reducer.fit_transform(embeddings)
```

## 📊 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/constellation` | Get all jobs with clustering data |
| `GET /api/job/{id}` | Get detailed job information |
| `POST /api/similar-jobs` | Find similar jobs |
| `GET /api/clusters/{id}/details` | Get cluster analysis |
| `GET /api/stats` | Get overall statistics |

## 🎮 How to Use

1. **Explore the Galaxy**
   - Drag to rotate the view
   - Scroll to zoom in/out
   - Watch stars pulse - each is a job!

2. **Inspect a Job**
   - Click any star to see job details
   - View responsibilities, qualifications, and skills
   - Find similar roles in the "Similar Jobs" tab

3. **Analyze Clusters**
   - Select a job family from the left panel
   - See cluster statistics and top skills
   - Identify standardization candidates

4. **Search & Filter**
   - Use the search bar to find specific roles
   - Filter by keywords, titles, or descriptions

## 🏆 Hackathon Challenge #1

This project addresses the Methanex Job Description Clustering challenge:

> **Problem**: Methanex has ~2,000 job descriptions with a 1:1 ratio to employees, making it difficult to standardize positions and career paths.

> **Solution**: An AI-driven approach that:
> 1. Clusters similar job descriptions into job families
> 2. Visualizes relationships in an interactive 3D space
> 3. Identifies standardization opportunities
> 4. Provides actionable insights for HR processes

## 📝 License

MIT License - Built for the 2026 Methanex Hackathon

## 🙏 Credits

- Built with ❤️ for the Methanex Data & AI Hackathon
- Feb 17-20, 2026
