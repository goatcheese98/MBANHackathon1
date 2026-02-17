# 🚀 Quick Start Guide

## Step 1: Start the Backend (Terminal 1)

```bash
cd /Users/rohanjasani/Desktop/Hackathon/career-constellation/backend

# Create virtual environment (first time only)
python3 -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pandas numpy scikit-learn python-multipart

# Optional: Install AI model for better embeddings
pip install sentence-transformers

# Start the server
python main.py
```

Wait until you see: `Application startup complete.`

## Step 2: Start the Frontend (Terminal 2)

```bash
cd /Users/rohanjasani/Desktop/Hackathon/career-constellation/frontend

# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

## Step 3: Open Browser

Go to: **http://localhost:3000**

---

## 📊 What You'll See

The app will process all **622 job descriptions** from your dataset:

1. **3D Galaxy View** - Jobs as stars, colored by cluster
2. **Click any star** - See job details, responsibilities, qualifications
3. **Left panel** - Browse job families (clusters)
4. **Similar Jobs** - Find roles that could be standardized

---

## 🔧 Troubleshooting

### "Connection Error" in browser
The backend isn't running. Check Terminal 1 for errors.

### Port already in use
```bash
# Kill existing processes
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Missing dependencies
```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

---

## 📁 Your Dataset

**Location:** `/Users/rohanjasani/Desktop/Hackathon/Hackathon Challenge #1 Datasets.csv`

**Contents:** 622 job descriptions with:
- `job_title` - Position name
- `position_summary` - Brief description
- `responsibilities` - Role duties
- `qualifications` - Required skills/experience

The backend automatically finds and uses this file!
