import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ragEngine, getRAG } from './rag.js';

// Import data - Wrangler/Vite will bundle these
import constellationData from '../frontend/public/constellation_data.json';
import statsData from '../frontend/public/stats_data.json';
import { bundledReports } from './reports-bundled.js';

const app = new Hono();

app.use('*', cors());

// Health check and metadata
app.get('/', (c) => {
    return c.json({
        message: 'Career Constellation API (Cloudflare Worker)',
        status: 'running',
        clusters: (constellationData as any).num_clusters,
        jobs: (constellationData as any).total_jobs,
        rag: 'enabled',
    });
});

// Initialization Middleware - ensures RAG is ready on first request
app.use('*', async (c, next) => {
    const rag = getRAG();
    if (!(rag as any).isInitialized) {
        console.log('Initializing RAG in Worker...');
        await rag.initialize({
            jobs: (constellationData as any).jobs,
            stats: statsData,
            reports: bundledReports,
        });
    }
    await next();
});

app.get('/api/constellation', (c) => c.json(constellationData));
app.get('/api/stats', (c) => c.json(statsData));

app.get('/api/job/:id', (c) => {
    const id = parseInt(c.req.param('id'));
    const jobs = constellationData.jobs as any[];
    const job = jobs.find(j => j.id === id);

    if (!job) return c.json({ error: 'Job not found' }, 404);

    const similarJobs = (job.similar_jobs || [])
        .map((s: any) => {
            const similarJob = jobs.find((j: any) => j.employee_id === s.employee_id);
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

    return c.json({
        ...job,
        similar_jobs: similarJobs,
        coordinates: { x: job.x, y: job.y, z: 0 },
    });
});

app.post('/api/chat', async (c) => {
    const { message, history } = await c.req.json();
    try {
        const result = await ragEngine.chat(message, history || []);
        return c.json({
            response: result.response,
            sources: result.sources,
            rag_enabled: true,
        });
    } catch (error) {
        return c.json({
            response: 'Error in chat engine',
            sources: [],
            rag_enabled: false,
        }, 500);
    }
});

app.get('/api/chat/status', (c) => {
    return c.json(ragEngine.getStatus());
});

app.get('/api/standardization/duplicates', (c) => {
    const threshold = parseFloat(c.req.query('threshold') || '0.95');
    const pairs = ragEngine.getNearDuplicatePairs(threshold);
    return c.json({
        total_pairs: pairs.length,
        threshold,
        duplicates: pairs.slice(0, 100),
    });
});

export default app;
