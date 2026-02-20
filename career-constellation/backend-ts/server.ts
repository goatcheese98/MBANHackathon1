import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ragEngine } from './rag.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine project root: if we're in dist/, go up one more level
const isCompiled = __dirname.endsWith('dist');
const projectRoot = isCompiled
  ? path.join(__dirname, '..', '..')  // dist/ -> backend-ts/ -> career-constellation/
  : path.join(__dirname, '..');       // backend-ts/ -> career-constellation/

const app = express();
app.use(cors());
app.use(express.json());

// Load static data
const constellationData = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'frontend', 'public', 'constellation_data.json'), 'utf-8')
);
const statsData = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'frontend', 'public', 'stats_data.json'), 'utf-8')
);

// Create lookup maps
const jobMap = new Map(constellationData.jobs.map((j: any) => [j.id, j]));
const clusterMap = new Map(constellationData.clusters.map((c: any) => [c.id, c]));

// Initialize RAG on startup
ragEngine.initialize().catch(console.error);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Career Constellation API (TypeScript + RAG)',
    status: 'running',
    clusters: constellationData.num_clusters,
    jobs: constellationData.total_jobs,
    rag: 'enabled',
  });
});

app.get('/api/constellation', (req, res) => {
  res.json(constellationData);
});

app.get('/api/stats', (req, res) => {
  res.json(statsData);
});

app.get('/api/job/:id', (req, res) => {
  const job = jobMap.get(parseInt(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const jobData = job as any;
  const similarJobs = (jobData.similar_jobs || [])
    .map((s: any) => {
      const similarJob = constellationData.jobs.find((j: any) => j.employee_id === s.employee_id);
      if (!similarJob) return null;
      return {
        id: similarJob.id,
        employee_id: s.employee_id,
        title: similarJob.title,
        cluster_id: similarJob.cluster_id,
        cluster_label: similarJob.cluster_label,
        similarity: s.similarity,
      };
    })
    .filter(Boolean);

  res.json({
    ...jobData,
    similar_jobs: similarJobs,
    coordinates: { x: jobData.x, y: jobData.y, z: 0 },
  });
});

app.get('/api/clusters/:id/details', (req, res) => {
  const cluster = clusterMap.get(parseInt(req.params.id));
  if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

  const clusterData = cluster as any;
  const clusterJobs = constellationData.jobs.filter((j: any) => j.cluster_id === clusterData.id);

  const skillCounts: Record<string, number> = {};
  clusterJobs.forEach((j: any) => j.skills.forEach((s: string) => {
    skillCounts[s] = (skillCounts[s] || 0) + 1;
  }));

  const keywordCounts: Record<string, number> = {};
  clusterJobs.forEach((j: any) => j.keywords.forEach((k: string) => {
    keywordCounts[k] = (keywordCounts[k] || 0) + 1;
  }));

  // Get real near-duplicate pairs for this cluster from the RAG system
  const allPairs = ragEngine.getNearDuplicatePairs(0.95);
  const clusterPairs = allPairs.filter(
    (p: any) => clusterJobs.some((j: any) => j.employee_id === p.emp1 || j.employee_id === p.emp2)
  );

  // Messiness score = duplicate pairs / cluster size
  const messinessRaw = clusterJobs.length > 0 ? clusterPairs.length / clusterJobs.length : 0;
  const messinessScore = Math.min(messinessRaw, 1.0);

  res.json({
    cluster_id: clusterData.id,
    label: clusterData.label,
    size: clusterData.size,
    messiness_score: messinessScore,
    jobs: clusterJobs.map((j: any) => ({
      id: j.id,
      employee_id: j.employee_id,
      title: j.title,
      summary: j.summary?.slice(0, 150) || '',
    })),
    top_skills: Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count })),
    top_keywords: Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count })),
    standardization_candidates: clusterJobs.slice(0, 5).map((j: any) => j.title),
    near_duplicate_pairs: clusterPairs.slice(0, 20).map((p: any) => ({
      emp1: p.emp1, title1: p.title1,
      emp2: p.emp2, title2: p.title2,
      similarity: p.score,
    })),
  });
});

// AI Chat with RAG
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;

  try {
    const result = await ragEngine.chat(message, history || []);
    res.json({
      response: result.response,
      sources: result.sources,
      rag_enabled: true,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      response: 'I apologize, but I encountered an error. Please try again.',
      sources: [],
      rag_enabled: false,
    });
  }
});

app.get('/api/chat/status', async (req, res) => {
  const status = ragEngine.getStatus();
  res.json(status);
});

// Reports
app.get('/api/reports', async (req, res) => {
  const reportsDir = path.join(projectRoot, 'reports');
  try {
    const files = (await fsPromises.readdir(reportsDir)).filter(f => f.endsWith('.md'));
    const reports = files.map((filename: string) => ({
      id: filename.replace('.md', ''),
      title: filename.replace('.md', '').replace(/_/g, ' '),
      filename,
    }));
    res.json({ reports, count: reports.length });
  } catch (error) {
    res.status(500).json({ error: 'Error reading reports directory' });
  }
});

app.get('/api/reports/:id', async (req, res) => {
  const reportId = req.params.id.replace(/\.{2,}/g, '').replace(/\/+/g, '');
  const reportsDir = path.join(projectRoot, 'reports');
  const mdFile = path.join(reportsDir, `${reportId}.md`);

  // Security check - ensure file is within reports directory
  const resolvedPath = path.resolve(mdFile);
  const resolvedReportsDir = path.resolve(reportsDir);
  if (!resolvedPath.startsWith(resolvedReportsDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    await fsPromises.access(mdFile);
    const content = await fsPromises.readFile(mdFile, 'utf-8');
    res.json({ id: reportId, content, filename: `${reportId}.md` });
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.status(500).json({ error: 'Error reading report' });
  }
});

// Standardization: real near-duplicate pairs from similarity CSV
app.get('/api/standardization/duplicates', (req, res) => {
  const threshold = parseFloat(req.query.threshold as string) || 0.95;
  const pairs = ragEngine.getNearDuplicatePairs(threshold);
  res.json({
    total_pairs: pairs.length,
    threshold,
    duplicates: pairs.slice(0, 100).map((p: any) => ({
      employee_1: p.emp1,
      title_1: p.title1,
      employee_2: p.emp2,
      title_2: p.title2,
      similarity_score: p.score,
      cluster: p.cluster,
    })),
  });
});

// Cluster messiness ranking
app.get('/api/standardization/messiness', (req, res) => {
  const messiness = ragEngine.getClusterMessiness();
  const ranked = Object.entries(messiness)
    .map(([id, v]: [string, any]) => ({ cluster_id: id, ...v }))
    .sort((a: any, b: any) => b.messiness - a.messiness);
  res.json({ clusters: ranked, total_clusters: ranked.length });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 TypeScript RAG Backend running on http://localhost:${PORT}`);
  console.log(`📊 Serving ${constellationData.total_jobs} jobs in ${constellationData.num_clusters} clusters`);
  console.log(`🤖 RAG Chat: Enabled with Gemini 2.0 Flash`);
});
