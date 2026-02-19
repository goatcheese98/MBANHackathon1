# Career Constellation: SBERT-to-CSV Migration Plan

## Executive Summary

This document outlines the strategic migration from the current **SBERT-based backend architecture** to a **CSV-only frontend architecture**. The goal is to eliminate the Python backend server dependency and run the application entirely from pre-computed CSV files.

---

## 1. Current Architecture Analysis

### 1.1 Backend (Python/FastAPI + SBERT)

**Current Tech Stack:**
- FastAPI web server
- Sentence-BERT (all-MiniLM-L6-v2) for embeddings
- scikit-learn for clustering (K-Means)
- UMAP/PCA for 2D visualization
- Runtime computation of similarities

**Current Data Flow:**
```
CSV Input → SBERT Embeddings → K-Means Clustering → UMAP 2D coords → API Response
                ↑                                              ↑
                └────────── Runtime computation ──────────────┘
```

**API Endpoints (Current):**
| Endpoint | Method | Description | SBERT Required? |
|----------|--------|-------------|-----------------|
| `/api/constellation` | GET | All jobs + clusters + 2D coords | Yes (embeddings) |
| `/api/job/{id}` | GET | Single job details | No |
| `/api/similar-jobs` | POST | Find similar jobs | **Yes** (cosine sim) |
| `/api/clusters/{id}/details` | GET | Cluster stats + messiness | **Yes** (centroid dist) |
| `/api/stats` | GET | Dataset statistics | Partial |
| `/api/standardization/duplicates` | GET | Near-duplicate detection | **Yes** (full sim matrix) |
| `/api/chat` | POST | RAG chat | **Yes** (embeddings) |
| `/api/reports/*` | GET | Research reports | No |

### 1.2 Frontend (React/TypeScript)

**Current Tech Stack:**
- React with TanStack Router
- Axios for API calls
- 3D visualization (Three.js/React Three Fiber)
- Recharts for data visualization

**Current API Layer:** (`frontend/app/lib/api.ts`)
```typescript
fetchConstellationData() → /api/constellation
fetchJobDetails(id) → /api/job/{id}
fetchSimilarJobs(id, topK) → /api/similar-jobs
fetchClusterDetails(id) → /api/clusters/{id}/details
fetchStats() → /api/stats
fetchStandardizationDuplicates() → /api/standardization/duplicates
sendChatMessage() → /api/chat
```

---

## 2. Target Architecture (CSV-Only)

### 2.1 Data Sources

**Primary CSV Files:**
1. **`employees_with_skills_and_similarity.csv`** (622 rows × 13 columns)
   - Employee_ID
   - title_clean
   - cluster / Cluster_Label
   - Individual_Skills / Skills_String / Skills_Count
   - Similar_Employee_1/2/3 + Similarity Scores

2. **`main_output.csv`** (622 rows × 16 columns)
   - filename, job_title
   - position_summary, responsibilities, qualifications
   - title_clean, text, cluster
   - Unified Job Title (display)
   - Distance_to_Center
   - Group, Label, Count, Keywords, Example Titles

### 2.2 Target Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND ONLY                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  CSV Loader     │  │  Data Store      │  │  UI Components │ │
│  │  (Papa Parse)   │→ │  (React State/   │→ │  (Charts, 3D,  │ │
│  │                 │  │   TanStack       │  │  Tables)       │ │
│  │                 │  │   Query)         │  │                │ │
│  └─────────────────┘  └──────────────────┘  └────────────────┘ │
│           ↑                                                    │
│           │  employees_with_skills_and_similarity.csv          │
│           │  main_output.csv                                   │
│           │  (Static files in /public)                         │
└───────────┼────────────────────────────────────────────────────┘
            │
            ↓
     ┌──────────────┐
     │  Vite Server │  (Dev only - no backend)
     └──────────────┘
```

---

## 3. Migration Strategy

### 3.1 Backend Changes (Elimination)

**Files to Remove/Deprecate:**
```
career-constellation/backend/
├── main.py                    # REMOVE - SBERT clustering
├── rag_chat.py                # REMOVE - RAG chat (optional: move to frontend LLM)
├── requirements.txt           # REMOVE - Python deps
├── venv/                      # REMOVE - Python environment
└── start.sh / start.bat       # REMOVE - Server startup
```

**Capabilities Lost & Mitigations:**

| Current Capability | Loss Mitigation | Priority |
|-------------------|-----------------|----------|
| SBERT embeddings | Pre-computed in CSV | N/A |
| Runtime clustering | Pre-computed cluster assignments | N/A |
| UMAP 2D coordinates | **Must pre-compute in notebook** | HIGH |
| Cosine similarity search | Use pre-computed Similar_Employee_* | N/A |
| RAG Chat | **Option A:** Remove<br>**Option B:** Use OpenAI API directly from frontend | MEDIUM |
| Standardization duplicates | Pre-compute pairs in notebook | MEDIUM |
| Cluster-to-cluster similarity | Pre-compute in notebook | MEDIUM |
| Job-to-all-clusters affinity | Pre-compute or approximate | LOW |

### 3.2 Required CSV Enhancements

**Must Add to Notebook (Min_del.ipynb):**

1. **2D Coordinates (x, y)** from UMAP/PCA
   ```python
   # Add to notebook
   import umap
   reducer = umap.UMAP(n_components=2, random_state=42)
   coords_2d = reducer.fit_transform(X)
   df['x'] = coords_2d[:, 0]
   df['y'] = coords_2d[:, 1]
   ```

2. **Job-to-Cluster Affinity Scores**
   ```python
   # Pre-compute cosine similarity to each cluster centroid
   affinities = cosine_similarity(X, kmeans.cluster_centers_)
   for i in range(n_clusters):
       df[f'affinity_cluster_{i}'] = affinities[:, i]
   ```

3. **Standardization Duplicate Pairs**
   ```python
   # Pre-compute high-similarity pairs
   sim_matrix = cosine_similarity(X)
   duplicate_pairs = []
   for i in range(n_jobs):
       for j in range(i+1, n_jobs):
           if sim_matrix[i, j] > 0.95:
               duplicate_pairs.append({
                   'job_a_id': df.iloc[i]['Employee_ID'],
                   'job_b_id': df.iloc[j]['Employee_ID'],
                   'similarity': sim_matrix[i, j]
               })
   pd.DataFrame(duplicate_pairs).to_csv('duplicate_pairs.csv', index=False)
   ```

4. **Cluster-to-Cluster Similarity Matrix**
   ```python
   cluster_sims = cosine_similarity(kmeans.cluster_centers_)
   pd.DataFrame(cluster_sims).to_csv('cluster_similarity_matrix.csv', index=False)
   ```

5. **Keywords per Job**
   ```python
   # Extract keywords using TF-IDF per job
   from sklearn.feature_extraction.text import TfidfVectorizer
   vectorizer = TfidfVectorizer(max_features=5, stop_words='english')
   # ... extract and save to df['keywords']
   ```

6. **Enhanced Skills Extraction**
   ```python
   # Already done - ensure comprehensive coverage
   ```

### 3.3 New CSV Schema

**`main_data.csv`** (merged from both sources + enhancements):
```csv
// Core identifiers
Employee_ID,filename,job_title,title_clean,Unified_Job_Title

// Text content
position_summary,responsibilities,qualifications,text

// Clustering
cluster,Cluster_Label,Group

// 2D Visualization (NEW - to be added)
x,y,z

// Skills & Keywords (from employees_with_skills...csv)
Individual_Skills,Skills_String,Skills_Count,keywords

// Similarity Data (from employees_with_skills...csv)
Similar_Employee_1,Similar_Employee_1_Score,
Similar_Employee_2,Similar_Employee_2_Score,
Similar_Employee_3,Similar_Employee_3_Score

// Messiness Metric (from main_output.csv)
Distance_to_Center

// Job Level/Scope if available
Job_Level,Scope
```

**`cluster_metadata.csv`**:
```csv
cluster_id,label,size,centroid_x,centroid_y,color,
top_keywords,example_titles,
affinity_to_cluster_0,affinity_to_cluster_1,...
```

**`cluster_similarity_matrix.csv`**:
```csv
// Square matrix of cluster-to-cluster cosine similarities
```

**`duplicate_pairs.csv`**:
```csv
job_a_id,job_b_id,similarity,cluster_a,cluster_b
```

---

## 4. Frontend Changes

### 4.1 New Data Layer Architecture

**Replace `api.ts` with `dataService.ts`:**

```typescript
// app/lib/dataService.ts
import Papa from 'papaparse';

class DataService {
  private jobs: Job[] = [];
  private clusters: Cluster[] = [];
  private similarityMatrix: Map<string, number> = new Map();
  
  async initialize() {
    // Load CSV files from /public
    const [jobsData, clustersData] = await Promise.all([
      fetch('/data/main_data.csv').then(r => r.text()),
      fetch('/data/cluster_metadata.csv').then(r => r.text()),
    ]);
    
    this.jobs = Papa.parse(jobsData, { header: true }).data;
    this.clusters = Papa.parse(clustersData, { header: true }).data;
  }
  
  // Direct lookups - no API calls
  getJobById(id: string): Job | undefined {
    return this.jobs.find(j => j.Employee_ID === id);
  }
  
  getSimilarJobs(jobId: string, topK: number = 3): SimilarJob[] {
    const job = this.getJobById(jobId);
    if (!job) return [];
    
    // Use pre-computed similarities
    return [
      {
        id: job.Similar_Employee_1,
        title: this.getJobById(job.Similar_Employee_1)?.title_clean,
        similarity: parseFloat(job.Similar_Employee_1_Score)
      },
      // ... etc
    ].slice(0, topK);
  }
  
  getClusterDetails(clusterId: number): ClusterDetails {
    const clusterJobs = this.jobs.filter(j => j.cluster === clusterId);
    
    return {
      cluster_id: clusterId,
      size: clusterJobs.length,
      messiness_score: this.calculateMessiness(clusterJobs),
      top_skills: this.aggregateSkills(clusterJobs),
      // ...
    };
  }
}

export const dataService = new DataService();
```

### 4.2 Component Changes

| Component | Current | New | Changes Required |
|-----------|---------|-----|------------------|
| `SolarSystemScene.tsx` | Fetches `/api/constellation` | Loads CSV | Replace fetch with dataService |
| `ConstellationJobPanel.tsx` | Fetches `/api/job/{id}` | CSV lookup | Direct array lookup |
| `JobDetailsPanel.tsx` | Fetches `/api/similar-jobs` | Pre-computed | Use Similar_Employee_* columns |
| `ClusterPanel.tsx` | Fetches `/api/clusters/{id}` | CSV aggregation | Compute stats on-the-fly |
| `StatsDashboard.tsx` | Fetches `/api/stats` | CSV aggregation | Derive from loaded data |
| `DashboardView.tsx` | Fetches `/api/standardization/*` | Pre-computed | Load duplicate_pairs.csv |
| `AI Chat` | Fetches `/api/chat` | **Remove or use OpenAI** | Option A: Remove<br>Option B: Direct OpenAI |

### 4.3 Route Changes

**Current (`app/routes/_layout/constellation.tsx`):**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['constellation'],
  queryFn: fetchConstellationData,  // → /api/constellation
});
```

**New:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['constellation'],
  queryFn: () => dataService.getAllJobs(),  // CSV loaded
  staleTime: Infinity,  // Never refetch - static data
});
```

### 4.4 State Management

**Option A: TanStack Query (Recommended)**
- Cache CSV data indefinitely
- Use `useQuery` for async loading
- No background refetching

**Option B: React Context**
- Load CSV at app initialization
- Provide data via context
- Simpler but less flexible

**Recommended Implementation:**
```typescript
// app/context/DataContext.tsx
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    dataService.initialize().then(() => setIsLoaded(true));
  }, []);
  
  if (!isLoaded) return <LoadingScreen />;
  
  return <DataContext.Provider value={dataService}>{children}</DataContext.Provider>;
};
```

---

## 5. File Structure Changes

### 5.1 New Frontend Structure

```
career-constellation/frontend/
├── app/
│   ├── lib/
│   │   ├── dataService.ts       # NEW - CSV data manager
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useJobs.ts           # NEW - React hook for jobs
│   │   ├── useClusters.ts       # NEW - React hook for clusters
│   │   └── useSimilarJobs.ts    # NEW - Hook for similarity
│   ├── types/
│   │   └── index.ts             # UPDATE - Add CSV types
│   ├── components/
│   │   └── (existing components - modified)
│   └── routes/
│       └── (existing routes - modified)
└── public/
    └── data/                    # NEW - CSV files
        ├── main_data.csv
        ├── cluster_metadata.csv
        ├── cluster_similarity_matrix.csv
        └── duplicate_pairs.csv
```

### 5.2 Removed/Deprecated Files

```
career-constellation/
├── backend/                     # REMOVE ENTIRE DIRECTORY
│   ├── main.py
│   ├── rag_chat.py
│   ├── requirements.txt
│   ├── start.sh
│   └── venv/
├── frontend/app/lib/api.ts      # REMOVE - Replaced by dataService
└── start.sh / start_backend.py  # UPDATE - Remove backend refs
```

---

## 6. Implementation Roadmap

### Phase 1: Data Preparation (1-2 days)

1. **Update Min_del.ipynb** to export enhanced CSVs:
   - [ ] Add UMAP 2D coordinates
   - [ ] Add keywords extraction
   - [ ] Export cluster metadata
   - [ ] Export cluster similarity matrix
   - [ ] Export duplicate pairs
   - [ ] Merge into `main_data.csv`

2. **Verify CSV completeness**:
   - [ ] All 622 jobs included
   - [ ] All 13+ clusters represented
   - [ ] Similarity scores present
   - [ ] Skills extracted

### Phase 2: Data Service Layer (1 day)

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install papaparse @types/papaparse
   ```

2. **Create data service**:
   - [ ] `app/lib/dataService.ts`
   - [ ] Define TypeScript interfaces
   - [ ] Implement CSV parsing
   - [ ] Implement lookup methods

3. **Create React hooks**:
   - [ ] `useDataInitialization()`
   - [ ] `useJobs()`
   - [ ] `useJob(id)`
   - [ ] `useSimilarJobs(jobId)`
   - [ ] `useClusters()`
   - [ ] `useCluster(id)`

### Phase 3: Component Migration (2-3 days)

Migrate components one by one:

| Day | Component | Effort |
|-----|-----------|--------|
| 1 | StatsDashboard, Header | Low |
| 1 | ConstellationJobPanel, JobDetailsPanel | Medium |
| 2 | SolarSystemScene (3D viz) | High |
| 2 | ClusterPanel | Medium |
| 3 | DashboardView (standardization) | Medium |

### Phase 4: Cleanup & Optimization (1 day)

1. **Remove backend dependencies**:
   - [ ] Delete `/backend` directory
   - [ ] Remove `api.ts`
   - [ ] Update `package.json` scripts
   - [ ] Update documentation

2. **Performance optimization**:
   - [ ] Lazy load CSVs if needed
   - [ ] Implement data memoization
   - [ ] Add loading states

3. **Testing**:
   - [ ] Verify all features work
   - [ ] Check data accuracy
   - [ ] Performance benchmarks

---

## 7. Risk Assessment

### 7.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CSV file too large for browser | Low | High | Use streaming CSV parser, lazy load |
| Loss of RAG chat functionality | Certain | Medium | Option A: Accept loss<br>Option B: Use OpenAI API |
| Static data becomes stale | Low | Low | Document refresh process |
| Missing pre-computed data | Medium | High | Comprehensive CSV generation checklist |
| 3D visualization performance | Medium | Medium | Optimize data structure |

### 7.2 Feature Trade-offs

**Fully Preserved:**
- Job constellation visualization
- Cluster browsing
- Individual job details
- Skills display
- Similar jobs (top 3)
- Basic statistics

**Modified/Approximated:**
- Similar jobs beyond top 3 (currently limited)
- Cluster-to-cluster affinities (pre-computed)
- Messiness score (pre-computed distance)

**Lost (Decision Required):**
- RAG AI Chat
- Dynamic similarity search (any job, any k)
- Real-time standardization duplicate detection

**Recommendation:**
- **For RAG Chat:** Remove for now, can add OpenAI integration later
- **For Dynamic Search:** Accept limitation of top 3 similar jobs
- **For Standardization:** Use pre-computed pairs only

---

## 8. Code Examples

### 8.1 CSV Loader Hook

```typescript
// app/hooks/useData.ts
import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export function useCSVData<T>(url: string): { data: T[] | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            setData(results.data as T[]);
            setLoading(false);
          },
          error: (err) => {
            setError(err);
            setLoading(false);
          }
        });
      });
  }, [url]);

  return { data, loading, error };
}
```

### 8.2 Job Lookup Hook

```typescript
// app/hooks/useJob.ts
import { useMemo } from 'react';
import { useCSVData } from './useData';
import type { Job } from '@/types';

export function useJob(jobId: string | null) {
  const { data: jobs, loading, error } = useCSVData<Job>('/data/main_data.csv');
  
  const job = useMemo(() => {
    if (!jobs || !jobId) return null;
    return jobs.find(j => j.Employee_ID === jobId) || null;
  }, [jobs, jobId]);
  
  const similarJobs = useMemo(() => {
    if (!job) return [];
    return [
      { id: job.Similar_Employee_1, score: job.Similar_Employee_1_Score },
      { id: job.Similar_Employee_2, score: job.Similar_Employee_2_Score },
      { id: job.Similar_Employee_3, score: job.Similar_Employee_3_Score },
    ].filter(s => s.id);
  }, [job]);
  
  return { job, similarJobs, loading, error };
}
```

### 8.3 Constellation Data Hook

```typescript
// app/hooks/useConstellation.ts
import { useMemo } from 'react';
import { useCSVData } from './useData';
import type { Job, Cluster } from '@/types';

export function useConstellation() {
  const { data: jobs, loading: jobsLoading } = useCSVData<Job>('/data/main_data.csv');
  const { data: clusters, loading: clustersLoading } = useCSVData<Cluster>('/data/cluster_metadata.csv');
  
  const constellationData = useMemo(() => {
    if (!jobs || !clusters) return null;
    
    return {
      jobs: jobs.map(job => ({
        id: job.Employee_ID,
        title: job.title_clean,
        x: job.x,
        y: job.y,
        cluster_id: job.cluster,
        color: getClusterColor(job.cluster),
        size: getJobSize(job.text?.length),
      })),
      clusters: clusters.map(c => ({
        id: c.cluster_id,
        label: c.label,
        centroid: { x: c.centroid_x, y: c.centroid_y },
        color: c.color,
      })),
    };
  }, [jobs, clusters]);
  
  return {
    data: constellationData,
    loading: jobsLoading || clustersLoading,
  };
}
```

---

## 9. Decision Checklist

Before proceeding with migration, confirm:

- [ ] **Acceptable to lose RAG chat?** OR budget for OpenAI API?
- [ ] **Acceptable to limit similar jobs to top 3?**
- [ ] **Acceptable to use static data only?** (no real-time updates)
- [ ] **2D coordinates (UMAP) can be pre-computed?**
- [ ] **Can update notebook to export all required CSVs?**
- [ ] **Team comfortable with frontend-only architecture?**

---

## 10. Next Steps

1. **Review this plan** with the team
2. **Decide on RAG chat fate** (keep/remove/relocate)
3. **Update Min_del.ipynb** to generate all required CSV columns
4. **Start Phase 1** (data preparation)
5. **Parallel work:** Frontend team can start building data service

---

## Appendix A: CSV Column Reference

### main_data.csv

| Column | Source | Description |
|--------|--------|-------------|
| Employee_ID | employees_with_skills... | Unique identifier |
| title_clean | Both | Cleaned job title |
| position_summary | main_output | Job summary text |
| responsibilities | main_output | Responsibilities text |
| qualifications | main_output | Qualifications text |
| cluster | Both | Cluster assignment |
| Cluster_Label | employees_with_skills... | Human-readable cluster name |
| x, y | **NEW** | UMAP 2D coordinates |
| Individual_Skills | employees_with_skills... | Array of skills |
| Skills_Count | employees_with_skills... | Number of skills |
| Similar_Employee_1/2/3 | employees_with_skills... | IDs of similar jobs |
| Similar_Employee_*_Score | employees_with_skills... | Similarity scores |
| Distance_to_Center | main_output | Messiness metric |
| keywords | **NEW** | Extracted keywords |

### cluster_metadata.csv

| Column | Description |
|--------|-------------|
| cluster_id | Cluster identifier |
| label | Cluster label |
| size | Number of jobs |
| centroid_x, centroid_y | Average x,y of cluster |
| color | Hex color code |
| top_keywords | Array of top keywords |
| example_titles | Array of example titles |
| affinity_to_cluster_* | Similarity to other clusters |

---

*Document Version: 1.0*
*Last Updated: 2026-02-19*
