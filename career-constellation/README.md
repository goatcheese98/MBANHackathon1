# 🌌 Career Constellation Navigator

An AI-powered 3D visualization platform for job description clustering and standardization. Built for the Methanex Hackathon Challenge #1.

![Constellation Visualization](https://img.shields.io/badge/3D-Three.js-black)
![AI](https://img.shields.io/badge/AI-Gemini%20RAG-blue)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-purple)
![Backend](https://img.shields.io/badge/Backend-TypeScript%20%2B%20Express-green)

## ✨ Features

### 🤖 AI-Powered RAG Chat
- **Gemini Integration** - AI assistant powered by Google Gemini
- **Report Analysis** - Ask questions about 6 research reports
- **Job Search** - Find relevant positions using natural language
- **Context-Aware Responses** - Uses TF-IDF retrieval for relevant context

### 🎨 Stunning 3D Visualization
- **Interactive Galaxy** - 622 jobs as stars in a cosmic constellation
- **25 Clusters** - Jobs grouped into color-coded families
- **Constellation Lines** - Visual connections between related roles
- **Smooth Animations** - Powered by React Three Fiber

### 📊 Rich Data Exploration
- **Job Details Panel** - Full descriptions, responsibilities, qualifications
- **Cluster Analysis** - Browse 25 job families
- **Research Reports** - 6 markdown reports on methanol industry
- **Search & Filter** - Quickly locate specific positions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Gemini API key (for AI chat)

### Start the Application

```bash
cd career-constellation
./start.sh
```

This will:
1. Start the TypeScript backend (http://localhost:8000)
2. Start the React frontend (http://localhost:3000)
3. Initialize RAG with 1,233 chunks (610 reports + 622 jobs)

### Set up Gemini API Key (Optional - for AI chat)

```bash
cd backend-ts
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

Get your API key at: https://makersuite.google.com/app/apikey

## 📁 Project Structure

```
career-constellation/
├── backend-ts/                 # TypeScript/Express backend
│   ├── server.ts              # Express server
│   ├── rag.ts                 # RAG system with Gemini
│   ├── package.json
│   └── dist/                  # Compiled JavaScript
├── frontend/                   # React/TypeScript frontend
│   ├── app/                   # Vite app
│   ├── components/            # React components
│   ├── lib/api.ts             # API client
│   └── public/                # Static assets
├── reports/                    # 6 research reports
├── start.sh                    # Startup script
└── README.md
```

## 🔧 Technology Stack

### Backend
- **Express.js** - Fast web framework
- **TypeScript** - Type safety
- **Google Generative AI** - Gemini for chat
- **Natural.js** - TF-IDF for retrieval
- **PapaParse** - CSV parsing

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Three.js + React Three Fiber** - 3D graphics
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

## 📊 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/constellation` | Get all jobs with clustering data |
| `GET /api/job/{id}` | Get detailed job information |
| `GET /api/clusters/{id}/details` | Get cluster analysis |
| `GET /api/stats` | Get overall statistics |
| `GET /api/reports` | List all research reports |
| `GET /api/reports/{id}` | Get report content |
| `POST /api/chat` | AI chat with RAG |
| `GET /api/chat/status` | RAG system status |

## 🎮 How to Use

1. **Explore the Galaxy**
   - Drag to rotate the view
   - Scroll to zoom in/out
   - Click stars to see job details

2. **Browse Reports**
   - Go to Reports section
   - Select a research report
   - Ask AI questions about the report

3. **AI Chat**
   - Ask questions like "What are the main findings?"
   - Search across all 6 reports
   - Get context-aware answers

4. **Analyze Clusters**
   - Select job families from the left panel
   - View cluster statistics

## 🏆 Hackathon Challenge #1

This project addresses the Methanex Job Description Clustering challenge:

> **Problem**: Methanex has job descriptions with a 1:1 ratio to employees, making it difficult to standardize positions and career paths.

> **Solution**: An AI-driven approach that:
> 1. Clusters 622 job descriptions into 25 job families
> 2. Visualizes relationships in an interactive 3D space
> 3. Provides AI-powered report analysis
> 4. Offers actionable insights for HR processes

## 📝 License

MIT License - Built for the 2026 Methanex Hackathon

## 🙏 Credits

- Built with ❤️ for the Methanex Data & AI Hackathon
- Feb 17-20, 2026
