# TypeScript RAG Backend

Full-featured Node.js/Express backend with RAG (Retrieval-Augmented Generation) - **Replaces Python entirely**.

## 🚀 Quick Start

```bash
cd career-constellation/backend-ts
npm install
npm run dev
```

Or use the combined start script:
```bash
cd career-constellation
./start.sh
```

## 📊 Features

| Feature | Status | Notes |
|---------|--------|-------|
| **Static Data API** | ✅ Full | Jobs, clusters, stats from CSV/JSON |
| **RAG Chat** | ✅ Full | Gemini 2.0 Flash + TF-IDF retrieval |
| **Report Loading** | ✅ Full | Markdown reports chunked & indexed |
| **CSV Queries** | ✅ Full | Direct answers from job data |
| **Report API** | ✅ Full | List and read reports |
| **Similar Jobs** | ✅ Full | Pre-computed similarities |

## 🆚 Python Backend Comparison

| Aspect | TypeScript (this) | Python (old) |
|--------|-------------------|--------------|
| **Startup** | ⚡ 2-3 seconds | 🐢 5-10 seconds |
| **Memory** | ~100MB | ~300MB |
| **RAG Chat** | ✅ Gemini + TF-IDF | ✅ Gemini + TF-IDF |
| **ML Libraries** | Basic (custom TF-IDF) | sklearn, pandas |
| **Dependencies** | Node.js only | Python + venv |
| **Maintenance** | TypeScript | Python |

## 🔌 API Endpoints

All same as Python backend:

| Endpoint | Description |
|----------|-------------|
| `GET /` | Status |
| `GET /api/constellation` | All jobs + clusters |
| `GET /api/stats` | Statistics |
| `GET /api/job/:id` | Job details |
| `GET /api/clusters/:id/details` | Cluster details |
| `POST /api/chat` | **AI Chat with RAG** |
| `GET /api/chat/status` | RAG status |
| `GET /api/reports` | List reports |
| `GET /api/reports/:id` | Read report |

## 🤖 RAG Architecture

```
User Query
    ↓
TF-IDF Retrieval (reports)
    ↓
CSV Data Lookup (if applicable)
    ↓
Gemini 2.0 Flash LLM
    ↓
Response with citations
```

### Data Sources:
1. **Reports** - 6 markdown files chunked with TF-IDF indexing
2. **CSV Data** - 622 jobs with cluster info
3. **Gemini API** - For natural language generation

## 🔑 Environment Variables

```bash
GEMINI_API_KEY=your_key_here  # Optional, has default
PORT=8000                     # Optional, default 8000
```

## 📁 File Structure

```
backend-ts/
├── server.ts       # Express routes
├── rag.ts          # RAG engine (Gemini + TF-IDF)
├── package.json
├── tsconfig.json
└── README.md
```

## 🗑️ Removing Python Backend

To completely remove Python:

```bash
cd career-constellation
rm -rf backend/           # Remove Python backend
rm -rf venv/              # Remove virtualenv (if any)
```

The TypeScript backend reads directly from:
- `../frontend/public/constellation_data.json` (jobs)
- `../reports/*.md` (research reports)

## 🧪 Testing RAG

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the methanol industry outlook?"}'
```

## 📝 Notes

- TF-IDF implemented from scratch in TypeScript (no sklearn needed)
- Report chunking by headers for better semantic retrieval
- CSV answers for data-specific queries (job counts, clusters, etc.)
- Gemini 2.0 Flash for fast, high-quality responses
