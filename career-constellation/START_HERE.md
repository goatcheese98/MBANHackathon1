# 🌌 Career Constellation Navigator - START HERE

## ✅ What You're Getting

An AI-powered **3D visualization** of your job descriptions that:
- Groups 622 jobs into clusters ("job families") using ML
- Shows them as an interactive star constellation
- Identifies similar roles for standardization
- Extracts skills and keywords automatically

---

## 🚀 How to Run (3 Steps)

### Step 1: Start Backend (Terminal 1)

```bash
cd /Users/rohanjasani/Desktop/Hackathon/career-constellation/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**Wait for:** `Application startup complete.`

The backend will:
- Load your `Hackathon Challenge #1 Datasets.csv` (622 jobs)
- Generate AI embeddings
- Cluster into job families
- Start API server on **http://localhost:8000**

⏱️ **Takes ~30-60 seconds** on first startup

---

### Step 2: Start Frontend (Terminal 2)

```bash
cd /Users/rohanjasani/Desktop/Hackathon/career-constellation/frontend
npm install
npm run dev
```

**Opens:** http://localhost:3000

---

### Step 3: Use the App

1. **🖱️ Click any star** = View job details
2. **🔄 Drag** = Rotate the galaxy
3. **📜 Scroll** = Zoom in/out
4. **👈 Left panel** = Browse job families

---

## 📊 Your Dataset

**File:** `/Users/rohanjasani/Desktop/Hackathon/Hackathon Challenge #1 Datasets.csv`

**Columns:**
- `job_title` - Position name
- `position_summary` - Brief overview
- `responsibilities` - What they do
- `qualifications` - Required skills

**Total:** 622 job descriptions

The backend **automatically finds this file** - no configuration needed!

---

## 🔧 If You See "Connection Error"

The backend isn't running. Check:

1. Is Terminal 1 still open?
2. Any error messages in Terminal 1?
3. Try: `curl http://localhost:8000/` should return `{"message": "Career Constellation Navigator API"...`

---

## 🎯 Features

| Feature | What It Does |
|---------|--------------|
| **3D Galaxy** | Jobs as stars, similar jobs cluster together |
| **Constellation Lines** | Shows connections within job families |
| **Color Coding** | Each cluster has its own color |
| **Similar Jobs** | Find roles that could be merged |
| **Skill Extraction** | Auto-identifies required competencies |
| **Standardization Insights** | Recommendations for HR |

---

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python)
- scikit-learn (K-Means clustering)
- TF-IDF (embeddings)
- Pandas (data processing)

**Frontend:**
- Next.js 14 (React)
- TypeScript
- Three.js (3D graphics)
- Tailwind CSS

---

## 🐛 Troubleshooting

### Port conflicts
```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Dependencies missing
```bash
# Backend
cd backend && source venv/bin/activate && pip install -r requirements.txt

# Frontend  
cd frontend && npm install
```

### Dataset not found
The backend looks in these locations:
1. `/Users/rohanjasani/Desktop/Hackathon/Hackathon Challenge #1 Datasets.csv` ← Your file
2. Relative paths from backend folder

If needed, set: `export DATA_PATH="/path/to/your/file.csv"`

---

## 📁 Project Files

```
career-constellation/
├── backend/
│   ├── main.py              # AI clustering logic
│   ├── requirements.txt     # Python packages
│   └── venv/                # Virtual environment
├── frontend/
│   ├── app/                 # Next.js pages
│   ├── components/          # React components
│   │   ├── GalaxyScene.tsx      # 3D visualization ⭐
│   │   ├── JobDetailsPanel.tsx
│   │   └── ClusterPanel.tsx
│   └── node_modules/        # Node packages
└── START_HERE.md            # This file!
```

---

**Ready to launch? Open two terminals and follow Step 1 & 2 above! 🚀**
