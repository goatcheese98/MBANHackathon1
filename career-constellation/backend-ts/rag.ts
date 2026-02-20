import { GoogleGenerativeAI } from '@google/generative-ai';
import naturalPkg from 'natural';
const { TfIdf } = naturalPkg;
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine project root: if we're in dist/, go up one more level
const isCompiled = __dirname.endsWith('dist');
const projectRoot = isCompiled 
  ? path.join(__dirname, '..', '..')  // dist/ -> backend-ts/ -> career-constellation/
  : path.join(__dirname, '..');       // backend-ts/ -> career-constellation/

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
  distance_to_center?: number;
}

interface TextChunk {
  id: string;
  content: string;
  type: 'report' | 'job' | 'stats';
  source: string;
  metadata: Record<string, any>;
}

interface RetrievalResult {
  chunk: TextChunk;
  score: number;
}

type TfIdfType = InstanceType<typeof naturalPkg.TfIdf>;

export class RAGSystem {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private chunks: TextChunk[] = [];
  private jobs: Job[] = [];
  private tfidf: TfIdfType;
  private isInitialized = false;
  private stats: any = null;
  private hasGemini = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyC4AM-Zfb7laK3Umnh90XpFM0kpJAT2R9c';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    this.hasGemini = true;
    this.tfidf = new naturalPkg.TfIdf();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 Initializing RAG system...');

    try {
      await Promise.all([
        this.loadReports(),
        this.loadJobsFromCSV(),
        this.loadStats(),
      ]);

      this.buildTfIdfIndex();
      this.isInitialized = true;
      console.log(`✅ RAG system initialized with ${this.chunks.length} chunks`);
    } catch (error) {
      console.error('Failed to initialize RAG:', error);
      throw error;
    }
  }

  private async loadReports(): Promise<void> {
    const reportsDir = path.join(projectRoot, 'reports');
    const files = (await fs.readdir(reportsDir)).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const content = await fs.readFile(path.join(reportsDir, file), 'utf-8');
      const chunks = this.chunkByHeaders(content, file);
      this.chunks.push(...chunks);
      console.log(`  📄 Loaded ${chunks.length} chunks from ${file}`);
    }
  }

  private chunkByHeaders(content: string, sourceFile: string): TextChunk[] {
    const sections = content.split(/\n(?=#{1,3} )/);
    const chunks: TextChunk[] = [];
    let chunkId = 0;

    for (const section of sections) {
      if (!section.trim()) continue;

      const headerMatch = section.match(/^(#{1,3})\s+(.+)/);
      if (!headerMatch) continue;

      const lines = section.split('\n');
      const header = lines[0];
      const body = lines.slice(1).join('\n').trim();

      const maxChunkSize = 1000;
      const overlapSize = 100;

      if (body.length <= maxChunkSize) {
        chunks.push({
          id: `${sourceFile}-${chunkId++}`,
          content: `${header}\n\n${body}`,
          type: 'report',
          source: sourceFile,
          metadata: { header, sourceFile },
        });
      } else {
        const sentences = body.split(/(?<=[.!?])\s+/);
        let currentChunk = '';
        let sentenceBuffer: string[] = [];

        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
            chunks.push({
              id: `${sourceFile}-${chunkId++}`,
              content: `${header}\n\n${currentChunk}`,
              type: 'report',
              source: sourceFile,
              metadata: { header, sourceFile },
            });

            const overlapText = sentenceBuffer.slice(-3).join(' ');
            currentChunk = overlapText + ' ' + sentence;
            sentenceBuffer = [overlapText, sentence].filter(Boolean);
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
            sentenceBuffer.push(sentence);
          }
        }

        if (currentChunk) {
          chunks.push({
            id: `${sourceFile}-${chunkId++}`,
            content: `${header}\n\n${currentChunk}`,
            type: 'report',
            source: sourceFile,
            metadata: { header, sourceFile },
          });
        }
      }
    }

    return chunks;
  }

  private async loadJobsFromCSV(): Promise<void> {
    const csvPath = path.join(projectRoot, 'constellation_data_full.csv');
    const fileContent = await fs.readFile(csvPath, 'utf-8');

    const { data: records } = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

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
      skills: [],
      job_level: r.job_level,
      distance_to_center: parseFloat(r.Distance_to_Center) || 0,
    }));

    const jobChunks: TextChunk[] = this.jobs.map(job => ({
      id: `job-${job.id}`,
      content: this.formatJobForRAG(job),
      type: 'job',
      source: 'constellation_data',
      metadata: {
        job_id: job.id,
        title: job.title,
        cluster_id: job.cluster_id,
        cluster_label: job.cluster_label,
      },
    }));

    this.chunks.push(...jobChunks);
    console.log(`  💼 Loaded ${jobChunks.length} job chunks`);
  }

  private async loadStats(): Promise<void> {
    const statsPath = path.join(projectRoot, 'frontend', 'public', 'stats_data.json');
    try {
      const content = await fs.readFile(statsPath, 'utf-8');
      this.stats = JSON.parse(content);

      const statsChunks: TextChunk[] = [
        {
          id: 'stats-overview',
          content: this.formatStatsOverview(this.stats),
          type: 'stats',
          source: 'stats.json',
          metadata: { type: 'overview' },
        },
        ...this.formatClusterSummaries(this.stats),
      ];

      this.chunks.push(...statsChunks);
      console.log(`  📊 Loaded ${statsChunks.length} stats chunks`);
    } catch (e) {
      console.log('  ⚠️ Stats file not found');
    }
  }

  private formatStatsOverview(stats: any): string {
    return `# Organization Overview

**Total Positions:** ${stats.total_positions || 'N/A'}
**Total Clusters:** ${stats.total_clusters || 'N/A'}
**Positions with Summaries:** ${stats.positions_with_summaries || 'N/A'}
**Positions with Responsibilities:** ${stats.positions_with_responsibilities || 'N/A'}
**Positions with Qualifications:** ${stats.positions_with_qualifications || 'N/A'}
**Average Summary Length:** ${stats.avg_summary_length?.toFixed(0) || 'N/A'} characters
**Average Responsibilities Length:** ${stats.avg_responsibilities_length?.toFixed(0) || 'N/A'} characters
**Average Qualifications Length:** ${stats.avg_qualifications_length?.toFixed(0) || 'N/A'} characters`;
  }

  private formatClusterSummaries(stats: any): TextChunk[] {
    if (!stats.cluster_summaries) return [];

    return Object.entries(stats.cluster_summaries).map(([clusterId, summary]: [string, any]) => ({
      id: `cluster-summary-${clusterId}`,
      content: `# Cluster ${clusterId}: ${summary.label}

**Number of Positions:** ${summary.count}
**Key Responsibilities:** ${(summary.common_responsibilities || []).join(', ')}
**Key Qualifications:** ${(summary.common_qualifications || []).join(', ')}
**Key Skills:** ${(summary.common_skills || []).join(', ')}`,
      type: 'stats',
      source: 'stats.json',
      metadata: { type: 'cluster_summary', cluster_id: clusterId },
    }));
  }

  private formatJobForRAG(job: Job): string {
    return `Position: ${job.title} (ID: ${job.employee_id})
Cluster: ${job.cluster_label} (Cluster ${job.cluster_id})

Summary: ${job.summary || 'N/A'}

Responsibilities: ${job.responsibilities || 'N/A'}

Qualifications: ${job.qualifications || 'N/A'}

Keywords: ${job.keywords.join(', ')}`;
  }

  private buildTfIdfIndex(): void {
    for (const chunk of this.chunks) {
      this.tfidf.addDocument(chunk.content, chunk.id);
    }
  }

  private calculateTFIDFSimilarity(query: string, content: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const contentTerms = content.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    if (queryTerms.length === 0) return 0;

    const termFrequency: Record<string, number> = {};
    let matches = 0;

    for (const term of contentTerms) {
      termFrequency[term] = (termFrequency[term] || 0) + 1;
    }

    for (const term of queryTerms) {
      if (termFrequency[term]) {
        matches++;
      }
    }

    const score = matches / queryTerms.length;
    return Math.min(score * 2, 1.0);
  }

  async retrieve(query: string, topK: number = 5): Promise<RetrievalResult[]> {
    await this.initialize();

    const results: RetrievalResult[] = [];

    for (const chunk of this.chunks) {
      const score = this.calculateTFIDFSimilarity(query, chunk.content);
      if (score > 0) {
        results.push({ chunk, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async generateResponse(
    message: string,
    history: Array<{ role: string; content: string }> = [],
    enableRAG: boolean = true
  ): Promise<{ response: string; sources: string[]; rag_enabled: boolean }> {
    if (!this.hasGemini || !this.model) {
      return {
        response: 'AI chat is currently unavailable. Please set GEMINI_API_KEY to enable this feature.',
        sources: [],
        rag_enabled: false,
      };
    }

    await this.initialize();

    let context = '';
    let sources: string[] = [];
    let ragEnabled = false;

    if (enableRAG) {
      const relevantChunks = await this.retrieve(message, 5);

      if (relevantChunks.length > 0) {
        context = relevantChunks
          .map(({ chunk, score }) => `---\nSource: ${chunk.source} (Relevance: ${(score * 100).toFixed(1)}%)\n${chunk.content}`)
          .join('\n\n');

        sources = [...new Set(relevantChunks.map(r => r.chunk.source))];
        ragEnabled = true;
      }
    }

    const systemPrompt = `You are an AI assistant for Career Constellation, helping employees explore job positions and career paths within the organization.

Guidelines:
- Be helpful, accurate, and concise
- If you don't know something, say so
- Cite sources when using retrieved information
- Provide specific job IDs when relevant

${context ? `Use this context to answer the user's question:\n\n${context}\n\nOnly use information from the provided context. If the context doesn't contain relevant information, say so.` : 'Answer based on your general knowledge.'}`;

    try {
      // Simple prompt-based approach for Gemini
      const fullPrompt = `${systemPrompt}\n\nConversation History:\n${history.slice(-5).map(h => `${h.role}: ${h.content}`).join('\n')}\n\nUser: ${message}\n\nAssistant:`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      });

      const response = result.response;

      return {
        response: response.text(),
        sources,
        rag_enabled: ragEnabled,
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        response: 'I apologize, but I encountered an error processing your request. Please try again.',
        sources: [],
        rag_enabled: false,
      };
    }
  }

  getJobs(): Job[] {
    return this.jobs;
  }

  getClusters(): any[] {
    const clusterMap = new Map<number, any>();

    for (const job of this.jobs) {
      if (!clusterMap.has(job.cluster_id)) {
        clusterMap.set(job.cluster_id, {
          id: job.cluster_id,
          label: job.cluster_label,
          jobs: [],
        });
      }
      clusterMap.get(job.cluster_id)!.jobs.push(job);
    }

    return Array.from(clusterMap.values());
  }

  searchJobs(query: string): Job[] {
    const q = query.toLowerCase();
    return this.jobs.filter(job =>
      job.title.toLowerCase().includes(q) ||
      job.keywords.some(k => k.toLowerCase().includes(q)) ||
      job.summary.toLowerCase().includes(q)
    );
  }
}

let ragInstance: RAGSystem | null = null;

export function getRAG(): RAGSystem {
  if (!ragInstance) {
    ragInstance = new RAGSystem();
  }
  return ragInstance;
}

// Singleton export for server.ts compatibility
export const ragEngine = {
  initialize: async function() {
    const rag = getRAG();
    await rag.initialize();
  },
  chat: async function(message: string, history: Array<{ role: string; content: string }> = []) {
    const rag = getRAG();
    return rag.generateResponse(message, history, true);
  },
  getStatus: function() {
    const rag = getRAG();
    const reportChunks = rag['chunks']?.filter((c: TextChunk) => c.type === 'report') || [];
    const reportSources = [...new Set(reportChunks.map((c: TextChunk) => c.source))];
    return {
      initialized: rag['isInitialized'] || false,
      chunk_count: rag['chunks']?.length || 0,
      job_count: rag['jobs']?.length || 0,
      available_reports: reportSources,
    };
  },
};
