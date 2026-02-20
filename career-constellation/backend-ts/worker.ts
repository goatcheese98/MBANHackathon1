import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ragEngine, getRAG, setApiKey } from './rag.js';

// Import data - Wrangler/Vite will bundle these
import constellationData from '../data/constellation_data.json';
import statsData from '../data/stats_data.json';
import { bundledReports } from './reports-bundled.js';

const app = new Hono();

// CORS configuration - allows local dev and production domains
app.use('*', cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        // Deployed Pages domains - add new deployments here
        'https://career-constellation.pages.dev',
        'https://*.career-constellation.pages.dev',
    ],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400,
}));

// Health check and metadata
app.get('/', (c) => {
    const rag = getRAG();
    return c.json({
        message: 'Career Constellation API (Cloudflare Worker)',
        status: 'running',
        clusters: (constellationData as any).num_clusters,
        jobs: (constellationData as any).total_jobs,
        rag: 'enabled',
        gemini_configured: !!(rag as any).chatModel,
    });
});

// Debug endpoint to check API key status
app.get('/api/debug', (c) => {
    const rag = getRAG();
    // Check both process.env and binding
    const envKey = (c.env as any)?.GEMINI_API_KEY;
    const processKey = process.env.GEMINI_API_KEY;
    const effectiveKey = envKey || processKey;

    return c.json({
        gemini_api_key_set: !!effectiveKey,
        gemini_api_key_source: envKey ? 'binding' : (processKey ? 'process.env' : 'none'),
        gemini_api_key_prefix: effectiveKey ? effectiveKey.slice(0, 5) + '...' : null,
        chat_model_exists: !!(rag as any).chatModel,
        rag_initialized: (rag as any).isInitialized,
    });
});

// Initialization Middleware - ensures RAG is ready on first request
app.use('*', async (c, next) => {
    // Inject API key from environment binding if available
    const apiKey = (c.env as any)?.GEMINI_API_KEY;
    if (apiKey) {
        setApiKey(apiKey);
    }

    const rag = getRAG();
    if (!(rag as any).isInitialized) {
        console.log('Initializing RAG in Worker...');
        await rag.initialize({
            jobs: (constellationData as any).jobs,
            stats: statsData,
            reports: bundledReports,
        });
        console.log('RAG initialized successfully');
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

// Reports API
app.get('/api/reports', (c) => {
    const reports = bundledReports.map((r: any) => ({
        id: r.name.replace('.md', ''),
        title: r.name.replace('.md', '').replace(/_/g, ' '),
        filename: r.name,
    }));
    return c.json({ reports, count: reports.length });
});

app.get('/api/reports/:id', (c) => {
    const id = c.req.param('id');
    // Decode the ID in case it was URL-encoded
    const decodedId = decodeURIComponent(id);

    // Try to find the report - frontend sends name WITHOUT .md extension
    const report = bundledReports.find((r: any) => {
        const nameWithoutExt = r.name.replace('.md', '');
        return nameWithoutExt === decodedId ||
            r.name === decodedId ||
            r.name === `${decodedId}.md` ||
            nameWithoutExt === `${decodedId}`;
    });

    if (!report) {
        console.log(`Report not found: ${decodedId}`);
        console.log(`Available reports: ${bundledReports.map((r: any) => r.name.replace('.md', '')).join(', ')}`);
        return c.json({ error: 'Report not found', id: decodedId }, 404);
    }

    return c.json({
        id: report.name.replace('.md', ''),
        content: report.content,
        filename: report.name,
    });
});

app.post('/api/chat', async (c) => {
    const { message, history } = await c.req.json();
    try {
        const result = await ragEngine.chat(message, history || []);
        return c.json({
            response: result.response,
            sources: result.sources,
            rag_enabled: result.rag_enabled,
        });
    } catch (error: any) {
        return c.json({
            response: error?.message || 'Error in chat engine',
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
