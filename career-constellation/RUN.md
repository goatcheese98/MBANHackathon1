# 🚀 Running Career Constellation Navigator

## Quick Start (One Command)

```bash
cd /Users/rohanjasani/Desktop/Hackathon/career-constellation
./start.sh
```

This will automatically:
1. ✅ Set up Python virtual environment
2. ✅ Install all Python dependencies (FastAPI, Sentence-BERT, HDBSCAN, etc.)
3. ✅ Install Node.js dependencies (Next.js, Three.js, etc.)
4. ✅ Start the backend API on http://localhost:8000
5. ✅ Start the frontend on http://localhost:3000

## Manual Start (If Needed)

### Terminal 1 - Backend
```bash
cd /Users/rohanjasani/Desktop/Hackathon/career-constellation/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Terminal 2 - Frontend
```bash
cd /Users/rohanjasani/Desktop/Hackathon/career-constellation/frontend
npm install
npm run dev
```

## Access Points

| Service | URL | Description |
|---------|-----|-------------|
| 🌐 **Frontend** | http://localhost:3000 | Interactive 3D Galaxy |
| 📊 **Backend API** | http://localhost:8000 | REST API |
| 📚 **API Docs** | http://localhost:8000/docs | Swagger UI |
| 🔍 **ReDoc** | http://localhost:8000/redoc | Alternative API Docs |

## What You'll See

### 🌌 3D Galaxy Visualization
- Each **star** is a job from the dataset
- **Colors** represent different job families (clusters)
- **Constellation lines** connect similar roles
- **Size** indicates job complexity/description length

### 🎮 Controls
- **Click** a star → View job details
- **Drag** → Rotate the galaxy
- **Scroll** → Zoom in/out
- **Left panel** → Browse clusters/job families
- **Right panel** → Detailed job information

### 🤖 AI Features
- **Semantic Clustering**: Jobs grouped by meaning, not just keywords
- **Similarity Matching**: Find roles that could be standardized
- **Skill Extraction**: Automatically identifies required competencies
- **Standardization Insights**: Recommendations for merging similar roles

## Troubleshooting

### Backend won't start?
```bash
# Check if port 8000 is in use
lsof -ti:8000 | xargs kill -9

# Try running directly
cd backend && python main.py
```

### Frontend won't start?
```bash
# Clear Next.js cache
cd frontend && rm -rf .next node_modules && npm install

# Try different port
npm run dev -- --port 3001
```

### Dataset not found?
The backend automatically looks for the dataset in:
- `/Users/rohanjasani/Desktop/Hackathon/Hackathon Challenge #1 Datasets.csv` ✅ (configured)
- Various relative paths

If needed, set the path explicitly:
```bash
export DATA_PATH="/path/to/your/dataset.csv"
```

## Project Structure

```
career-constellation/
├── backend/
│   ├── main.py              # FastAPI + AI clustering logic
│   ├── requirements.txt     # Python dependencies
│   └── venv/                # Virtual environment
├── frontend/
│   ├── app/                 # Next.js pages
│   ├── components/          # React components
│   │   ├── GalaxyScene.tsx      # 3D Three.js visualization
│   │   ├── JobDetailsPanel.tsx  # Job info sidebar
│   │   ├── ClusterPanel.tsx     # Cluster browser
│   │   └── StatsDashboard.tsx   # Analytics panel
│   ├── lib/
│   │   └── api.ts           # API client
│   └── node_modules/        # Node dependencies
└── start.sh                 # Launch script
```

## Performance Notes

- **First load**: May take 30-60 seconds as the AI model downloads (Sentence-BERT)
- **72,000+ jobs**: The system is designed to handle the full dataset
- **3D Performance**: Uses GPU acceleration via Three.js
- **Memory**: Requires ~2GB RAM for processing large datasets

## Stopping the Application

Press `Ctrl+C` in the terminal to stop both servers.

---

**Built for the Methanex 2026 Hackathon** 🏆
