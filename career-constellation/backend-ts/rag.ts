import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

// Keep global for type safety, but don't execute logic if not in Node
let projectRoot = '';

function getProjectRoot() {
  if (projectRoot) return projectRoot;
  if (typeof process === 'undefined' || !import.meta.url) return '';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const isCompiled = __dirname.endsWith('dist');
  projectRoot = isCompiled
    ? path.join(__dirname, '..', '..')
    : path.join(__dirname, '..');
  return projectRoot;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: number;
  employee_id: string;
  title: string;
  title_clean: string;
  summary: string;
  responsibilities: string;
  qualifications: string;
  cluster_id: number;
  cluster_label: string;
  x: number;
  y: number;
  keywords: string[];
  skills: string[];
  job_level?: string;
  seniority_score?: number;
  top_seniority_buckets?: string;
  distance_to_center?: number;
}

interface SimilarityRecord {
  employee_id: string;
  title: string;
  cluster: string;
  cluster_label: string;
  skills: string[];
  skills_count: number;
  similar_1_id: string;
  similar_1_score: number;
  similar_2_id: string;
  similar_2_score: number;
  similar_3_id: string;
  similar_3_score: number;
}

interface TextChunk {
  id: string;
  content: string;
  type: 'report' | 'job' | 'stats' | 'similarity' | 'cluster_profile';
  source: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

interface RetrievalResult {
  chunk: TextChunk;
  score: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Lightweight BM25-inspired fallback scorer (no external deps)
function bm25Score(query: string, content: string): number {
  const k1 = 1.5, b = 0.75;
  const queryTerms = query.toLowerCase().match(/\b\w{2,}\b/g) || [];
  const docTerms = content.toLowerCase().match(/\b\w{2,}\b/g) || [];
  if (queryTerms.length === 0 || docTerms.length === 0) return 0;

  const avgDocLen = 300; // approximate
  const docLen = docTerms.length;
  const termFreq: Record<string, number> = {};
  for (const t of docTerms) termFreq[t] = (termFreq[t] || 0) + 1;

  let score = 0;
  for (const term of queryTerms) {
    const tf = termFreq[term] || 0;
    if (tf === 0) continue;
    const idf = Math.log(1.5); // simplified — all docs assumed equally likely
    const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen)));
    score += idf * tfNorm;
  }
  return Math.min(score / queryTerms.length, 1.0);
}

// Split text into overlapping chunks of roughly maxLen chars
function splitIntoChunks(text: string, maxLen = 900, overlap = 120): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current) {
      chunks.push(current.trim());
      // carry last ~overlap chars into next chunk
      const words = current.split(' ');
      const carryWords: string[] = [];
      let carryLen = 0;
      for (let i = words.length - 1; i >= 0; i--) {
        carryLen += words[i].length + 1;
        if (carryLen > overlap) break;
        carryWords.unshift(words[i]);
      }
      current = carryWords.join(' ') + ' ' + sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

// ─── Main RAG Class ──────────────────────────────────────────────────────────

export class RAGSystem {
  private genAI: GoogleGenerativeAI;
  private chatModel: any;
  private embeddingModel: any;
  private chunks: TextChunk[] = [];
  private jobs: Job[] = [];
  private similarityRecords: SimilarityRecord[] = [];
  private isInitialized = false;
  private stats: any = null;

  // Near-duplicate pairs (similarity >= 0.95)
  private nearDuplicatePairs: Array<{
    emp1: string; title1: string;
    emp2: string; title2: string;
    score: number; cluster: string;
  }> = [];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.chatModel = this.genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  async initialize(data?: {
    jobs?: Job[],
    similarity?: SimilarityRecord[],
    stats?: any,
    reports?: Array<{ name: string, content: string }>
  }): Promise<void> {
    if (this.isInitialized) return;
    console.log('🚀 Initializing Enhanced RAG system...');

    if (data) {
      if (data.jobs) this.jobs = data.jobs;
      if (data.similarity) this.similarityRecords = data.similarity;
      if (data.stats) this.stats = data.stats;

      if (data.reports) {
        for (const report of data.reports) {
          this.processReportContent(report.name, report.content);
        }
      }

      // If we provided jobs but no chunks yet, create job chunks
      if (this.jobs.length > 0 && this.chunks.length === 0) {
        for (const job of this.jobs) {
          this.chunks.push({
            id: `job-${job.id}`,
            content: this.formatJobForRAG(job),
            type: 'job',
            source: 'constellation_data',
            metadata: {
              job_id: job.id,
              employee_id: job.employee_id,
              title: job.title,
              cluster_id: job.cluster_id,
              cluster_label: job.cluster_label,
            },
          });
        }
      }
    } else {
      // Fallback to FS-based loading (Node.js)
      await Promise.all([
        this.loadReports(),
        this.loadJobsFromCSV(),
        this.loadSimilarityData(),
        this.loadStats(),
      ]);
    }

    // Build similarity-derived chunks (near-dups, cluster profiles)
    this.buildSimilarityChunks();

    // Embed all chunks in parallel batches
    // In Worker environment, we might want to skip this or use pre-calculated embeddings
    // For now, only embed if we are not in a Worker or if specifically requested
    if (typeof process !== 'undefined' && process.env.SKIP_EMBEDDINGS !== 'true') {
      await this.embedAllChunks();
    }

    this.isInitialized = true;
    console.log(`✅ RAG ready — ${this.chunks.length} chunks, ${this.jobs.length} jobs`);
  }

  private processReportContent(filename: string, content: string): void {
    const sections = content.split(/\n(?=#{1,3} )/);

    for (const section of sections) {
      if (!section.trim()) continue;
      const headerMatch = section.match(/^(#{1,3})\s+(.+)/);
      if (!headerMatch) continue;

      const header = section.split('\n')[0];
      const body = section.split('\n').slice(1).join('\n').trim();

      for (const sub of splitIntoChunks(`${header}\n\n${body}`)) {
        this.chunks.push({
          id: `report-${filename}-${this.chunks.length}`,
          content: sub,
          type: 'report',
          source: filename,
          metadata: { header, sourceFile: filename },
        });
      }
    }
  }

  // ── Data Loaders ──────────────────────────────────────────────────────────

  private async loadReports(): Promise<void> {
    const reportsDir = path.join(getProjectRoot(), 'reports');
    const files = (await fs.readdir(reportsDir)).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const content = await fs.readFile(path.join(reportsDir, file), 'utf-8');
      const sections = content.split(/\n(?=#{1,3} )/);

      for (const section of sections) {
        if (!section.trim()) continue;
        const headerMatch = section.match(/^(#{1,3})\s+(.+)/);
        if (!headerMatch) continue;

        const header = section.split('\n')[0];
        const body = section.split('\n').slice(1).join('\n').trim();

        for (const sub of splitIntoChunks(`${header}\n\n${body}`)) {
          this.chunks.push({
            id: `report-${file}-${this.chunks.length}`,
            content: sub,
            type: 'report',
            source: file,
            metadata: { header, sourceFile: file },
          });
        }
      }
      console.log(`  📄 ${file} chunked`);
    }
  }

  private async loadJobsFromCSV(): Promise<void> {
    const csvPath = path.join(getProjectRoot(), 'constellation_data_full.csv');
    const fileContent = await fs.readFile(csvPath, 'utf-8');
    const { data: records } = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

    this.jobs = (records as any[]).map((r: any, i: number) => ({
      id: i,
      employee_id: r.employee_id || `EMP_${String(i + 1).padStart(4, '0')}`,
      title: r['Unified Job Title (display)'] || r.title_clean,
      title_clean: r.title_clean,
      summary: r.position_summary || '',
      responsibilities: r.responsibilities || '',
      qualifications: r.qualifications || '',
      cluster_id: parseInt(r.cluster),
      cluster_label: r.Label,
      x: parseFloat(r.x),
      y: parseFloat(r.y),
      keywords: r.Keywords ? r.Keywords.split(',').map((k: string) => k.trim()) : [],
      skills: r.Skills_String && r.Skills_String !== 'None'
        ? r.Skills_String.split(',').map((s: string) => s.trim())
        : [],
      job_level: r.job_level,
      seniority_score: parseFloat(r.seniority_score) || undefined,
      top_seniority_buckets: r.top_seniority_buckets || undefined,
      distance_to_center: parseFloat(r.Distance_to_Center) || 0,
    }));

    // Add each job as a RAG chunk (compressed to key fields only for performance)
    for (const job of this.jobs) {
      this.chunks.push({
        id: `job-${job.id}`,
        content: this.formatJobForRAG(job),
        type: 'job',
        source: 'constellation_data',
        metadata: {
          job_id: job.id,
          employee_id: job.employee_id,
          title: job.title,
          cluster_id: job.cluster_id,
          cluster_label: job.cluster_label,
        },
      });
    }
    console.log(`  💼 ${this.jobs.length} jobs loaded`);
  }

  private async loadSimilarityData(): Promise<void> {
    // Try both possible locations
    const paths = [
      path.join(getProjectRoot(), '..', 'employees_with_skills_and_similarity.csv'),
      path.join(getProjectRoot(), 'employees_with_skills_and_similarity.csv'),
    ];

    let fileContent: string | null = null;
    for (const p of paths) {
      try { fileContent = await fs.readFile(p, 'utf-8'); break; } catch { }
    }

    if (!fileContent) {
      console.log('  ⚠️  Similarity CSV not found — skipping near-duplicate analysis');
      return;
    }

    const { data: records } = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

    this.similarityRecords = (records as any[]).map((r: any) => ({
      employee_id: r.Employee_ID,
      title: r.title_clean,
      cluster: r.cluster,
      cluster_label: r.Cluster_Label,
      skills: r.Skills_String && r.Skills_String !== 'None'
        ? r.Skills_String.split(',').map((s: string) => s.trim())
        : [],
      skills_count: parseInt(r.Skills_Count) || 0,
      similar_1_id: r.Similar_Employee_1,
      similar_1_score: parseFloat(r.Similar_Employee_1_Score) || 0,
      similar_2_id: r.Similar_Employee_2,
      similar_2_score: parseFloat(r.Similar_Employee_2_Score) || 0,
      similar_3_id: r.Similar_Employee_3,
      similar_3_score: parseFloat(r.Similar_Employee_3_Score) || 0,
    }));

    // Build near-duplicate pairs (score >= 0.95)
    const seen = new Set<string>();
    for (const rec of this.similarityRecords) {
      for (const [sid, score] of [
        [rec.similar_1_id, rec.similar_1_score],
        [rec.similar_2_id, rec.similar_2_score],
        [rec.similar_3_id, rec.similar_3_score],
      ] as [string, number][]) {
        if (!sid || score < 0.95) continue;
        const key = [rec.employee_id, sid].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);

        const other = this.similarityRecords.find(r => r.employee_id === sid);
        if (!other) continue;

        this.nearDuplicatePairs.push({
          emp1: rec.employee_id, title1: rec.title,
          emp2: sid, title2: other.title,
          score,
          cluster: rec.cluster_label,
        });
      }
    }

    console.log(`  🔗 ${this.similarityRecords.length} similarity records, ${this.nearDuplicatePairs.length} near-duplicate pairs (≥0.95)`);
  }

  private async loadStats(): Promise<void> {
    const statsPath = path.join(getProjectRoot(), 'frontend', 'public', 'stats_data.json');
    try {
      this.stats = JSON.parse(await fs.readFile(statsPath, 'utf-8'));
      console.log(`  📊 Stats loaded`);
    } catch {
      console.log('  ⚠️  stats_data.json not found');
    }
  }

  // ── Similarity-Derived Chunks ──────────────────────────────────────────────

  private buildSimilarityChunks(): void {
    // 1) Global near-duplicate summary chunk
    const byCluster: Record<string, typeof this.nearDuplicatePairs> = {};
    for (const pair of this.nearDuplicatePairs) {
      (byCluster[pair.cluster] = byCluster[pair.cluster] || []).push(pair);
    }

    const dupSummaryLines = Object.entries(byCluster)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([cluster, pairs]) => {
        const examples = pairs.slice(0, 3)
          .map(p => `  • "${p.title1}" ↔ "${p.title2}" (score: ${(p.score * 100).toFixed(1)}%)`)
          .join('\n');
        return `**${cluster}** — ${pairs.length} near-duplicate pairs:\n${examples}`;
      })
      .join('\n\n');

    this.chunks.push({
      id: 'similarity-global-near-duplicates',
      content: `# Near-Duplicate Job Pairs — Standardization Candidates

Total near-duplicate pairs (cosine similarity ≥ 0.95): **${this.nearDuplicatePairs.length}**

These pairs have almost identical job descriptions and are prime candidates for title/role standardization.

${dupSummaryLines}

**Recommendation:** Merging near-duplicate roles within the same cluster would reduce the total job description count by up to ${this.nearDuplicatePairs.length} profiles, moving Methanex toward fewer, standardized job families.`,
      type: 'similarity',
      source: 'similarity_analysis',
      metadata: { type: 'near_duplicates_global', count: this.nearDuplicatePairs.length },
    });

    // 2) Per-cluster skill profile chunks
    const clusterGroups: Record<string, SimilarityRecord[]> = {};
    for (const rec of this.similarityRecords) {
      (clusterGroups[rec.cluster_label] = clusterGroups[rec.cluster_label] || []).push(rec);
    }

    for (const [label, members] of Object.entries(clusterGroups)) {
      const skillCounts: Record<string, number> = {};
      for (const m of members) {
        for (const s of m.skills) skillCounts[s] = (skillCounts[s] || 0) + 1;
      }
      const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([sk, cnt]) => `${sk} (${cnt}/${members.length} employees)`)
        .join(', ');

      const avgSkills = members.length > 0
        ? (members.reduce((s, m) => s + m.skills_count, 0) / members.length).toFixed(1)
        : '0';

      const clusterDups = this.nearDuplicatePairs.filter(p => p.cluster === label);

      this.chunks.push({
        id: `cluster-profile-${label.replace(/\s+/g, '-')}`,
        content: `# Cluster: ${label}

**Size:** ${members.length} employees
**Average skills per employee:** ${avgSkills}
**Top skills:** ${topSkills || 'None identified'}
**Near-duplicate pairs within cluster:** ${clusterDups.length}

${clusterDups.length > 0 ? `**Standardization opportunity:** ${clusterDups.length} role pairs in this cluster are ≥95% similar and could be merged into a single job profile.\nExample: "${clusterDups[0].title1}" and "${clusterDups[0].title2}" (${(clusterDups[0].score * 100).toFixed(1)}% match)` : 'No near-duplicate pairs — roles in this cluster are well-differentiated.'}`,
        type: 'cluster_profile',
        source: 'cluster_analysis',
        metadata: { cluster_label: label, size: members.length, dup_count: clusterDups.length },
      });
    }

    // 3) Outlier/unique roles chunk
    const outliers = this.similarityRecords.filter(
      r => r.similar_1_score < 0.80 && r.skills_count <= 1
    );
    if (outliers.length > 0) {
      const sample = outliers.slice(0, 10).map(r => `• ${r.title} (${r.cluster_label})`).join('\n');
      this.chunks.push({
        id: 'similarity-outliers',
        content: `# Unique / Outlier Roles — Potential Niche Positions

These ${outliers.length} roles have low similarity to any other position (max neighbor score < 80%) and very few identifiable skills. They may represent truly unique specialized roles, or job descriptions that need improvement.

Sample outlier roles:
${sample}

**Recommendation:** Review these roles for completeness. Some may represent genuinely unique specialist positions; others may simply have sparse job descriptions that prevented proper clustering.`,
        type: 'similarity',
        source: 'similarity_analysis',
        metadata: { type: 'outliers', count: outliers.length },
      });
    }

    console.log(`  🧩 ${this.chunks.filter(c => c.type === 'similarity' || c.type === 'cluster_profile').length} similarity/cluster profile chunks built`);
  }

  // ── Embedding Layer ────────────────────────────────────────────────────────

  private async embedText(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingModel.embedContent({
        content: { parts: [{ text: text.slice(0, 8000) }] }, // API limit safeguard
        taskType: 'RETRIEVAL_DOCUMENT',
      });
      return result.embedding.values as number[];
    } catch (err) {
      console.error('Embedding error:', err);
      return [];
    }
  }

  private async embedAllChunks(): Promise<void> {
    console.log(`  🔢 Embedding ${this.chunks.length} chunks...`);
    const BATCH = 20; // Gemini embedding API allows batching
    let done = 0;

    for (let i = 0; i < this.chunks.length; i += BATCH) {
      const batch = this.chunks.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (chunk) => {
          chunk.embedding = await this.embedText(chunk.content);
        })
      );
      done += batch.length;
      if (done % 200 === 0) console.log(`    ... ${done}/${this.chunks.length}`);
    }
    console.log(`  ✅ All chunks embedded`);
  }

  // ── Retrieval ─────────────────────────────────────────────────────────────

  async retrieve(query: string, topK = 8): Promise<RetrievalResult[]> {
    await this.initialize();

    // Embed the query
    let queryEmbedding: number[] = [];
    try {
      const result = await this.embeddingModel.embedContent({
        content: { parts: [{ text: query }] },
        taskType: 'RETRIEVAL_QUERY',
      });
      queryEmbedding = result.embedding.values as number[];
    } catch {
      console.warn('Query embedding failed — falling back to BM25');
    }

    const results: RetrievalResult[] = this.chunks.map(chunk => {
      let score = 0;

      if (queryEmbedding.length > 0 && chunk.embedding && chunk.embedding.length > 0) {
        // Primary: semantic cosine similarity
        const semantic = cosineSimilarity(queryEmbedding, chunk.embedding);
        // Secondary: BM25 lexical boost
        const lexical = bm25Score(query, chunk.content);
        score = 0.75 * semantic + 0.25 * lexical;
      } else {
        // Fallback if embedding failed
        score = bm25Score(query, chunk.content);
      }

      // Boost certain chunk types based on query intent
      const q = query.toLowerCase();
      if ((q.includes('standardiz') || q.includes('duplicate') || q.includes('overlap') || q.includes('merge')) &&
        (chunk.type === 'similarity' || chunk.type === 'cluster_profile')) {
        score *= 1.4;
      }
      if ((q.includes('outlier') || q.includes('unique') || q.includes('niche') || q.includes('rare')) &&
        chunk.type === 'similarity' && chunk.metadata.type === 'outliers') {
        score *= 1.5;
      }
      if ((q.includes('cluster') || q.includes('famil') || q.includes('group')) &&
        chunk.type === 'cluster_profile') {
        score *= 1.3;
      }
      if ((q.includes('report') || q.includes('industr') || q.includes('market') || q.includes('compensation') || q.includes('salary')) &&
        chunk.type === 'report') {
        score *= 1.2;
      }

      return { chunk, score };
    });

    results.sort((a, b) => b.score - a.score);

    // Deduplicate: don't return 2 chunks from same source file in a row
    const deduped: RetrievalResult[] = [];
    const sourcesSeen = new Set<string>();
    for (const r of results) {
      if (deduped.length >= topK) break;
      if (r.score < 0.05) break; // relevance cutoff
      const srcKey = `${r.chunk.type}::${r.chunk.source}`;
      // Allow max 3 chunks per source
      const srcCount = deduped.filter(d => d.chunk.source === r.chunk.source).length;
      if (srcCount < 3) deduped.push(r);
    }

    return deduped;
  }

  // ── Generation ────────────────────────────────────────────────────────────

  async generateResponse(
    message: string,
    history: Array<{ role: string; content: string }> = [],
    enableRAG = true
  ): Promise<{ response: string; sources: string[]; rag_enabled: boolean }> {
    await this.initialize();

    let context = '';
    let sources: string[] = [];
    let ragEnabled = false;

    if (enableRAG) {
      const relevantChunks = await this.retrieve(message, 8);
      if (relevantChunks.length > 0) {
        context = relevantChunks
          .map(({ chunk, score }) =>
            `---\nSource: ${chunk.source} [${chunk.type}] (relevance: ${(score * 100).toFixed(1)}%)\n${chunk.content}`
          )
          .join('\n\n');
        sources = [...new Set(relevantChunks.map(r => r.chunk.source))];
        ragEnabled = true;
      }
    }

    // Rich system prompt with dataset context
    const clusterSummary = this.buildClusterSummaryText();
    const systemPrompt = `You are an expert AI Career Analyst for the Methanex Data & AI Hackathon. You have deep knowledge of the Methanex job description clustering project.

## Dataset Context
- **Total job descriptions:** ${this.jobs.length} (from ~2,000 Methanex employees globally)
- **Job clusters (families):** ${[...new Set(this.jobs.map(j => j.cluster_label))].length} distinct families
- **Near-duplicate pairs (similarity ≥ 95%):** ${this.nearDuplicatePairs.length} — prime standardization candidates
- **Clustering method:** Sentence-BERT embeddings → K-Means, visualized via UMAP
- **Skills identified:** Cosine similarity scored across all employees

## Job Families (Clusters)
${clusterSummary}

## Your Capabilities
- Identify which roles could be standardized or merged
- Explain which clusters are "messy" (many near-duplicates) vs clean
- Pinpoint outlier / truly unique roles
- Cite specific employee IDs and similarity scores when relevant
- Answer questions about the 6 industry research reports in context
- Provide actionable HR recommendations for Methanex

## Guidelines
- Be specific and data-driven — cite actual cluster names, employee IDs, and similarity scores when available
- For standardization questions, always reference the ${this.nearDuplicatePairs.length} near-duplicate pairs
- When discussing outliers, mention the roles with <80% max neighbor score
- If the retrieved context doesn't answer the question, say so clearly
- Format your responses with markdown headers and bullet points for readability

${context ? `## Retrieved Context\n${context}\n\nBase your answer primarily on the retrieved context above.` : 'No specific context retrieved — answer from your general knowledge of the dataset above.'}`;

    try {
      const conversationHistory = history.slice(-6).map(h => `${h.role}: ${h.content}`).join('\n');
      const fullPrompt = `${systemPrompt}\n\n${conversationHistory ? `## Conversation History\n${conversationHistory}\n\n` : ''}User: ${message}\n\nAssistant:`;

      const result = await this.chatModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.4, // lower = more factual
          maxOutputTokens: 2000,
        },
      });

      return {
        response: result.response.text(),
        sources,
        rag_enabled: ragEnabled,
      };
    } catch (error: any) {
      console.error('Gemini API error:', error);
      return {
        response: `I encountered an error: ${error?.message || 'Unknown error'}. Please try again.`,
        sources: [],
        rag_enabled: false,
      };
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  private formatJobForRAG(job: Job): string {
    const parts = [
      `Job: ${job.title} | Employee: ${job.employee_id} | Cluster: ${job.cluster_label} (${job.cluster_id})`,
    ];
    if (job.job_level) parts.push(`Level: ${job.job_level}`);
    if (job.summary) parts.push(`Summary: ${job.summary.slice(0, 400)}`);
    if (job.responsibilities) parts.push(`Responsibilities: ${job.responsibilities.slice(0, 400)}`);
    if (job.qualifications) parts.push(`Qualifications: ${job.qualifications.slice(0, 300)}`);
    if (job.keywords.length) parts.push(`Keywords: ${job.keywords.slice(0, 10).join(', ')}`);
    if (job.seniority_score !== undefined) {
      parts.push(`Seniority score: ${job.seniority_score.toFixed(2)}${job.top_seniority_buckets ? ` (${job.top_seniority_buckets})` : ''}`);
    }
    if (job.distance_to_center !== undefined) {
      parts.push(`Distance to cluster center: ${job.distance_to_center?.toFixed(3)} (lower = more typical)`);
    }
    return parts.join('\n');
  }

  private buildClusterSummaryText(): string {
    const groups: Record<string, Job[]> = {};
    for (const job of this.jobs) {
      (groups[job.cluster_label] = groups[job.cluster_label] || []).push(job);
    }
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20)
      .map(([label, jobs]) => {
        const dups = this.nearDuplicatePairs.filter(p => p.cluster === label).length;
        return `- **${label}**: ${jobs.length} roles${dups > 0 ? `, ${dups} near-duplicate pairs` : ''}`;
      })
      .join('\n');
  }

  // ── Public API ────────────────────────────────────────────────────────────

  getJobs(): Job[] { return this.jobs; }

  getClusters(): any[] {
    const clusterMap = new Map<number, any>();
    for (const job of this.jobs) {
      if (!clusterMap.has(job.cluster_id)) {
        clusterMap.set(job.cluster_id, { id: job.cluster_id, label: job.cluster_label, jobs: [] });
      }
      clusterMap.get(job.cluster_id)!.jobs.push(job);
    }
    return Array.from(clusterMap.values());
  }

  searchJobs(query: string): Job[] {
    const q = query.toLowerCase();
    return this.jobs.filter(job =>
      job.title.toLowerCase().includes(q) ||
      job.cluster_label?.toLowerCase().includes(q) ||
      job.keywords.some(k => k.toLowerCase().includes(q)) ||
      job.summary.toLowerCase().includes(q)
    );
  }

  getNearDuplicatePairs(minScore = 0.95) {
    return this.nearDuplicatePairs.filter(p => p.score >= minScore);
  }

  getClusterMessiness() {
    const result: Record<string, { label: string; size: number; dupPairs: number; messiness: number }> = {};
    for (const job of this.jobs) {
      if (!result[job.cluster_id]) {
        result[job.cluster_id] = { label: job.cluster_label, size: 0, dupPairs: 0, messiness: 0 };
      }
      result[job.cluster_id].size++;
    }
    for (const pair of this.nearDuplicatePairs) {
      const job = this.jobs.find(j => j.employee_id === pair.emp1);
      if (job && result[job.cluster_id]) result[job.cluster_id].dupPairs++;
    }
    for (const v of Object.values(result)) {
      v.messiness = v.size > 0 ? v.dupPairs / v.size : 0;
    }
    return result;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let ragInstance: RAGSystem | null = null;

export function getRAG(): RAGSystem {
  if (!ragInstance) ragInstance = new RAGSystem();
  return ragInstance;
}

export const ragEngine = {
  initialize: async () => { await getRAG().initialize(); },

  chat: async (message: string, history: Array<{ role: string; content: string }> = []) => {
    return getRAG().generateResponse(message, history, true);
  },

  getStatus: () => {
    const rag = getRAG();
    const chunks = (rag as any).chunks as TextChunk[] || [];
    const reportSources = [...new Set(chunks.filter(c => c.type === 'report').map(c => c.source))];
    return {
      initialized: (rag as any).isInitialized || false,
      chunk_count: chunks.length,
      job_count: (rag as any).jobs?.length || 0,
      reports_loaded: chunks.filter(c => c.type === 'report').length,
      jobs_available: (rag as any).jobs?.length || 0,
      similarity_chunks: chunks.filter(c => c.type === 'similarity' || c.type === 'cluster_profile').length,
      near_duplicate_pairs: (rag as any).nearDuplicatePairs?.length || 0,
      available_reports: reportSources,
      rag_enabled: true,
    };
  },

  searchJobs: (query: string) => getRAG().searchJobs(query),
  getNearDuplicatePairs: (minScore?: number) => getRAG().getNearDuplicatePairs(minScore),
  getClusterMessiness: () => getRAG().getClusterMessiness(),
};
