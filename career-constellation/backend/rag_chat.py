"""
RAG Chat Module for Career Constellation
Integrates Gemini 2.0 Flash with intelligent retrieval over reports and CSV data
"""

import os
import re
import logging
from typing import List, Dict, Optional
from pathlib import Path
from dataclasses import dataclass
from collections import Counter

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyCTzq0XBhE4Wc8Rtwq6ni3AuDRmmJcktw0")
GEMINI_MODEL = "gemini-2.0-flash"
REPORTS_DIR = Path(__file__).parent.parent / "reports"
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 300
TOP_K_CHUNKS = 7


@dataclass
class DocumentChunk:
    """Represents a chunk of text with metadata"""
    content: str
    source: str
    title: str
    chunk_id: int


@dataclass
class RetrievedContext:
    """Context retrieved for RAG"""
    content: str
    source: str
    relevance_score: float


class RAGChatEngine:
    """RAG Chat Engine with Gemini integration"""
    
    def __init__(self):
        self.chunks: List[DocumentChunk] = []
        self.chunk_vectors: Optional[np.ndarray] = None
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.df: Optional[pd.DataFrame] = None
        self.initialized = False
        self.gemini_model = None
        
    def initialize(self, job_data_df: Optional[pd.DataFrame] = None):
        """Initialize the RAG engine with reports and job data"""
        if self.initialized:
            return
            
        logger.info("Initializing RAG Chat Engine...")
        
        # Load and chunk markdown reports
        self._load_reports()
        
        # Store job data for CSV-based queries
        if job_data_df is not None:
            self.df = job_data_df
            logger.info(f"Loaded {len(self.df)} job records for RAG")
        
        # Build vector index
        self._build_index()
        
        # Initialize Gemini
        self._init_gemini()
        
        self.initialized = True
        logger.info("RAG Chat Engine initialized successfully")
        
    def _load_reports(self):
        """Load markdown reports and chunk them"""
        if not REPORTS_DIR.exists():
            logger.warning(f"Reports directory not found: {REPORTS_DIR}")
            return
            
        report_files = list(REPORTS_DIR.glob("*.md"))
        logger.info(f"Found {len(report_files)} report files")
        
        for report_file in report_files:
            try:
                content = report_file.read_text(encoding='utf-8')
                title = self._extract_title(content) or report_file.stem
                
                # Split into semantic chunks by headers
                chunks = self._chunk_by_headers(content, str(report_file.name))
                
                for i, chunk in enumerate(chunks):
                    self.chunks.append(DocumentChunk(
                        content=chunk['content'],
                        source=str(report_file.name),
                        title=chunk['header'] or title,
                        chunk_id=i
                    ))
                    
                logger.info(f"Loaded {report_file.name}: {len(chunks)} chunks")
            except Exception as e:
                logger.error(f"Error loading {report_file}: {e}")
                
    def _extract_title(self, content: str) -> Optional[str]:
        """Extract title from markdown frontmatter or first heading"""
        fm_match = re.search(r'^---\s*\ntitle:\s*"([^"]+)"', content, re.MULTILINE)
        if fm_match:
            return fm_match.group(1)
        
        h1_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        if h1_match:
            return h1_match.group(1)
            
        return None
        
    def _chunk_by_headers(self, text: str, filename: str) -> List[Dict]:
        """Split text into chunks by markdown headers while preserving context"""
        # Remove frontmatter
        text = re.sub(r'^---\s*\n.*?---\s*\n', '', text, flags=re.DOTALL)
        
        # Split by headers (h2 and h3)
        pattern = r'(^#{2,3}\s+.+$)'
        parts = re.split(pattern, text, flags=re.MULTILINE)
        
        chunks = []
        current_header = ""
        current_content = ""
        
        for part in parts:
            if re.match(r'^#{2,3}\s+', part):
                # Save previous chunk if exists
                if current_content.strip():
                    chunks.append({
                        'header': current_header,
                        'content': f"{current_header}\n{current_content}".strip()
                    })
                current_header = part.strip()
                current_content = ""
            else:
                current_content += part
        
        # Add final chunk
        if current_content.strip():
            chunks.append({
                'header': current_header,
                'content': f"{current_header}\n{current_content}".strip()
            })
        
        # If no headers found, create chunks by size
        if not chunks:
            words = text.split()
            for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
                chunk_text = ' '.join(words[i:i + CHUNK_SIZE])
                chunks.append({'header': '', 'content': chunk_text})
        
        return chunks
        
    def _build_index(self):
        """Build TF-IDF vector index for retrieval"""
        if not self.chunks:
            logger.warning("No chunks to index")
            return
            
        texts = [chunk.content for chunk in self.chunks]
        
        self.vectorizer = TfidfVectorizer(
            max_features=8000,
            stop_words='english',
            ngram_range=(1, 3),
            min_df=1,
            max_df=0.95
        )
        
        self.chunk_vectors = self.vectorizer.fit_transform(texts)
        logger.info(f"Built index with {self.chunk_vectors.shape[0]} chunks, {self.chunk_vectors.shape[1]} features")
        
    def _init_gemini(self):
        """Initialize Gemini model"""
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            self.gemini_model = genai.GenerativeModel(GEMINI_MODEL)
            logger.info(f"Gemini model {GEMINI_MODEL} initialized")
        except ImportError:
            logger.error("google-generativeai not installed. Run: pip install google-generativeai")
            self.gemini_model = None
        except Exception as e:
            logger.error(f"Error initializing Gemini: {e}")
            self.gemini_model = None
            
    def retrieve_context(self, query: str, current_report: Optional[str] = None, top_k: int = TOP_K_CHUNKS) -> List[RetrievedContext]:
        """Retrieve relevant document chunks for a query, prioritizing current report"""
        if not self.vectorizer or self.chunk_vectors is None:
            logger.warning("Index not built, cannot retrieve")
            return []
            
        # Vectorize query
        query_vec = self.vectorizer.transform([query])
        
        # Calculate similarities
        similarities = cosine_similarity(query_vec, self.chunk_vectors)[0]
        
        # Get all chunks sorted by relevance
        all_indices = np.argsort(similarities)[::-1]
        
        results = []
        current_report_chunks = []
        other_chunks = []
        
        for idx in all_indices:
            if similarities[idx] < 0.05:  # Minimum relevance threshold
                continue
                
            chunk = self.chunks[idx]
            # Clean up the source name
            clean_title = chunk.title.replace('##', '').replace('#', '').strip() if chunk.title else 'General'
            clean_filename = chunk.source.replace('.md', '').replace('_', ' ')
            context = RetrievedContext(
                content=chunk.content,
                source=f"{clean_title} ({clean_filename})",
                relevance_score=float(similarities[idx])
            )
            
            # Prioritize current report
            if current_report and current_report.lower() in chunk.source.lower():
                current_report_chunks.append(context)
            else:
                other_chunks.append(context)
        
        # Combine: current report chunks first, then others
        results = current_report_chunks[:top_k] + other_chunks[:max(0, top_k - len(current_report_chunks))]
        
        return results[:top_k]
        
    def get_job_data_context(self, query: str) -> str:
        """Extract relevant job data context from CSV"""
        if self.df is None or len(self.df) == 0:
            return ""
            
        query_lower = query.lower()
        relevant_jobs = []
        
        # Search in multiple columns
        search_cols = ['Unified Job Title', 'job_title', 'responsibilities', 'qualifications', 'position_summary']
        
        for col in search_cols:
            if col in self.df.columns:
                try:
                    matching = self.df[self.df[col].astype(str).str.lower().str.contains(query_lower, na=False, regex=False)]
                    if len(matching) > 0:
                        relevant_jobs.extend(matching.to_dict('records'))
                        if len(relevant_jobs) >= 5:
                            break
                except:
                    continue
        
        if not relevant_jobs:
            return ""
            
        # Remove duplicates
        seen_titles = set()
        unique_jobs = []
        for job in relevant_jobs:
            title = job.get('Unified Job Title', job.get('job_title', ''))
            if title and title not in seen_titles:
                seen_titles.add(title)
                unique_jobs.append(job)
        
        # Format context
        context_parts = ["\n### Relevant Job Postings:"]
        for job in unique_jobs[:3]:
            title = job.get('Unified Job Title', job.get('job_title', 'Unknown Title'))
            level = job.get('Job Level', '')
            summary = str(job.get('position_summary', ''))[:150] if 'position_summary' in job else ""
            
            context_parts.append(f"\n**{title}" + (f" ({level})" if level else "") + "**")
            if summary:
                context_parts.append(f"{summary}...")
                
        return "\n".join(context_parts)

    def build_system_prompt(self, current_report: Optional[str] = None, data_context: Optional[Dict] = None) -> str:
        """Build dynamic system prompt based on context"""
        base_prompt = """You are an AI Career Assistant specializing in the methanol and chemical process industries. You help professionals at Methanex navigate their careers with data-driven insights.

CORE CAPABILITIES:
1. Analyze career paths, skills requirements, and progression strategies
2. Provide compensation benchmarks and industry comparisons
3. Explain energy transition impacts on job roles and required skills
4. Answer questions about competitive landscape and market trends
5. Match user profiles to relevant job opportunities
6. Query and analyze the full job dataset (622 postings, 15 clusters)

RESPONSE GUIDELINES:
- Be SPECIFIC: Use concrete data from the reports (salary ranges, years of experience, certification requirements)
- Be ACTIONABLE: End responses with clear next steps the user can take
- CITE SOURCES: Reference specific report sections or job postings
- CONSIDER CONTEXT: Factor in the user's current report view, active filters, and question history
- BE HONEST: Acknowledge uncertainty when data is incomplete or speculative
- USE DATA: When asked about patterns, trends, or analysis, query the CSV dataset and provide concrete statistics"""

        if current_report:
            base_prompt += f"\n\nACTIVE REPORT: The user is currently reading: {current_report}\nPrioritize information from this report in your response."
        
        if data_context:
            base_prompt += f"\n\nDATA PIPELINE CONTEXT:"
            base_prompt += f"\n- Dataset: {data_context.get('dataset_name', 'Hackathon_Datasets_Refined_v5.csv')}"
            base_prompt += f"\n- Total Jobs: {data_context.get('total_jobs', 622)}"
            base_prompt += f"\n- Clusters: {data_context.get('num_clusters', 15)}"
            base_prompt += f"\n- Available Columns: {', '.join(data_context.get('available_columns', ['Unified Job Title', 'Job Level', 'Scope', 'position_summary', 'responsibilities', 'qualifications']))}"
            
            # Add active filters context
            if data_context.get('selected_clusters'):
                base_prompt += f"\n- User is viewing clusters: {data_context['selected_clusters']}"
            if data_context.get('search_query'):
                base_prompt += f"\n- User searched for: '{data_context['search_query']}'"
            if data_context.get('active_filters'):
                base_prompt += f"\n- Active filters: {data_context['active_filters']}"
            
            base_prompt += "\n\nWhen the user asks about data analysis, patterns, or statistics, leverage this context to provide specific insights from the dataset."
        
        return base_prompt

    def determine_action_type(self, message: str) -> str:
        """Determine the type of action the user wants"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['summarize', 'summary', 'overview', 'key points', 'main points']):
            return 'summarize'
        elif any(word in message_lower for word in ['compare', 'difference', 'vs', 'versus', 'better', 'worse']):
            return 'compare'
        elif any(word in message_lower for word in ['career path', 'progression', 'promotion', 'advance', 'next step', 'grow']):
            return 'career_path'
        elif any(word in message_lower for word in ['salary', 'compensation', 'pay', 'earn', 'wage', 'bonus']):
            return 'compensation'
        elif any(word in message_lower for word in ['skill', 'learn', 'training', 'certification', 'course', 'develop']):
            return 'skills'
        elif any(word in message_lower for word in ['job', 'role', 'position', 'title', 'apply', 'hiring']):
            return 'job_search'
        elif any(word in message_lower for word in ['company', 'competitor', 'methanex', 'proman', 'industry']):
            return 'competitive_intel'
        else:
            return 'general'

    def format_action_response(self, action_type: str, contexts: List[RetrievedContext], job_context: str) -> str:
        """Format response based on action type"""
        action_prompts = {
            'summarize': "Provide a concise summary of the key points from the retrieved context. Use bullet points for clarity.",
            'compare': "Present a balanced comparison using the data. Create a comparison table if appropriate.",
            'career_path': "Outline clear career progression steps with timelines, required skills, and potential roadblocks.",
            'compensation': "Present salary ranges, factors affecting pay, and negotiation tips based on the data.",
            'skills': "List specific skills to develop, prioritize them, and suggest learning resources or certifications.",
            'job_search': "Match relevant job postings to the query and explain why they fit.",
            'competitive_intel': "Analyze the competitive landscape and provide strategic insights about companies mentioned.",
            'general': "Provide a comprehensive answer that connects the retrieved information to the user's question."
        }
        return action_prompts.get(action_type, action_prompts['general'])

    def chat(self, message: str, history: List[Dict[str, str]], current_report: Optional[str] = None, data_context: Optional[Dict] = None) -> tuple[str, List[str]]:
        """Process a chat message and return a response with sources"""
        if not self.initialized:
            return "RAG engine not initialized. Please try again later.", []
            
        # Determine action type
        action_type = self.determine_action_type(message)
        logger.info(f"Detected action type: {action_type} for query: {message[:50]}...")
        
        # Check if this is a data analysis query
        is_data_query = any(word in message.lower() for word in 
            ['analyze', 'count', 'how many', 'percentage', 'statistics', 'distribution', 
             'top', 'most common', 'cluster', 'trend', 'pattern', 'compare', 'average'])
        
        # Retrieve relevant context
        doc_contexts = self.retrieve_context(message, current_report)
        job_context = self.get_job_data_context(message)
        
        # For data queries, add rich dataset context
        if is_data_query and self.df is not None:
            job_context += self._get_data_analysis_context(message)
        
        # Track sources
        sources = [ctx.source for ctx in doc_contexts]
        
        # Build context string
        context_parts = []
        
        if doc_contexts:
            context_parts.append("### RESEARCH REPORT CONTEXT:")
            for i, ctx in enumerate(doc_contexts, 1):
                context_parts.append(f"\n[Source {i}] {ctx.source}:\n{ctx.content[:1000]}")
                
        if job_context:
            context_parts.append(f"\n{job_context}")
            
        full_context = "\n\n".join(context_parts) if context_parts else "No specific documents retrieved for this query."
        
        # Build dynamic prompt
        system_prompt = self.build_system_prompt(current_report, data_context)
        action_instruction = self.format_action_response(action_type, doc_contexts, job_context)
        
        # Add data analysis guidance for relevant queries
        if is_data_query:
            action_instruction += "\n\nDATA ANALYSIS MODE: When answering, use specific numbers from the CSV dataset context provided. Calculate percentages, counts, and provide statistical insights."
        
        user_prompt = f"""USER QUESTION: {message}

INTENDED ACTION: {action_type}
INSTRUCTION: {action_instruction}

RETRIEVED CONTEXT:
{full_context}

Please provide a helpful, specific response. Structure your answer with clear headers and bullet points. Always cite which source(s) you're referencing."""

        # Call Gemini
        if self.gemini_model:
            try:
                # Create chat with history
                chat = self.gemini_model.start_chat(history=[])
                
                # Add history (last 3 exchanges)
                for h in history[-3:]:
                    if h.get("role") == "user":
                        chat.history.append({"role": "user", "parts": [h.get("content", "")]})
                    else:
                        chat.history.append({"role": "model", "parts": [h.get("content", "")]})
                
                # Send system prompt first, then user query
                response = chat.send_message(
                    f"{system_prompt}\n\n{user_prompt}",
                    generation_config={
                        "temperature": 0.3,
                        "max_output_tokens": 2500,
                        "top_p": 0.95,
                        "top_k": 40,
                    }
                )
                
                return response.text, sources
                
            except Exception as e:
                logger.error(f"Gemini API error: {e}")
                return self._fallback_response(message, doc_contexts, job_context, action_type), sources
        else:
            return self._fallback_response(message, doc_contexts, job_context, action_type), sources
            
    def _get_data_analysis_context(self, query: str) -> str:
        """Generate rich data analysis context for data-focused queries"""
        if self.df is None:
            return ""
            
        context_parts = ["\n### DATASET STATISTICS & ANALYSIS:"]
        
        # Overall stats
        context_parts.append(f"\n**Dataset Overview:**")
        context_parts.append(f"- Total jobs: {len(self.df)}")
        context_parts.append(f"- Number of clusters: {self.df['cluster_id'].nunique()}")
        
        # Cluster distribution
        cluster_counts = self.df['cluster_id'].value_counts().sort_index()
        context_parts.append(f"\n**Cluster Distribution (jobs per cluster):**")
        for cid, count in cluster_counts.head(10).items():
            context_parts.append(f"  - Cluster {cid}: {count} jobs")
        if len(cluster_counts) > 10:
            context_parts.append(f"  - ... and {len(cluster_counts) - 10} more clusters")
        
        # Job level distribution
        if 'Job Level' in self.df.columns:
            level_counts = self.df['Job Level'].fillna('Not Specified').value_counts()
            if len(level_counts) > 0:
                context_parts.append(f"\n**Job Level Distribution:**")
                for level, count in level_counts.head(10).items():
                    pct = count / len(self.df) * 100
                    context_parts.append(f"  - {level}: {count} jobs ({pct:.1f}%)")
        
        # Top job titles
        context_parts.append(f"\n**Top Job Titles:**")
        title_counts = self.df['Unified Job Title'].value_counts().head(10)
        for title, count in title_counts.items():
            context_parts.append(f"  - {title}: {count} postings")
        
        # Keywords analysis
        all_keywords = []
        for kws in self.df['keywords']:
            if isinstance(kws, list):
                all_keywords.extend(kws)
            elif isinstance(kws, str):
                try:
                    all_keywords.extend(eval(kws))
                except:
                    pass
        if all_keywords:
            from collections import Counter
            top_kw = Counter(all_keywords).most_common(15)
            context_parts.append(f"\n**Most Common Keywords:**")
            for kw, count in top_kw:
                context_parts.append(f"  - {kw}: {count} occurrences")
        
        # Search for specific terms in query
        query_lower = query.lower()
        search_terms = []
        if 'ccs' in query_lower or 'carbon capture' in query_lower:
            search_terms.append(('CCS', ['ccs', 'carbon capture', 'carbon capture and storage', 'sequestration']))
        if 'engineer' in query_lower:
            search_terms.append(('Engineer', ['engineer', 'engineering', 'technical']))
        if 'manager' in query_lower:
            search_terms.append(('Manager', ['manager', 'management', 'leadership']))
        if 'senior' in query_lower:
            search_terms.append(('Senior', ['senior', 'sr.', 'lead', 'principal']))
        
        for term_name, term_list in search_terms:
            matching_jobs = self.df[self.df['full_text'].str.lower().str.contains('|'.join(term_list), na=False, regex=True)]
            if len(matching_jobs) > 0:
                context_parts.append(f"\n**Jobs related to '{term_name}':** {len(matching_jobs)} postings")
                # Get cluster distribution for these jobs
                term_clusters = matching_jobs['cluster_id'].value_counts().head(3)
                context_parts.append(f"  - Found in clusters: {', '.join([f'Cluster {c}' for c in term_clusters.index])}")
        
        return "\n".join(context_parts)

    def _fallback_response(self, query: str, doc_contexts: List[RetrievedContext], job_context: str, action_type: str = 'general') -> str:
        """Fallback response when Gemini is unavailable"""
        response_parts = ["I'm operating in limited mode, but here's what I found:\n"]
        
        if doc_contexts:
            response_parts.append(f"\n**Top relevant sections from {len(doc_contexts)} report chunks:**\n")
            for i, ctx in enumerate(doc_contexts[:3], 1):
                # Extract first paragraph or first 300 chars
                preview = ctx.content[:300].replace('\n', ' ').strip()
                if len(ctx.content) > 300:
                    preview += "..."
                response_parts.append(f"\n{i}. **{ctx.source}**")
                response_parts.append(f"   {preview}")
                
        if job_context:
            response_parts.append(f"\n\n{job_context}")
            
        if not doc_contexts and not job_context:
            response_parts.append("\nI couldn't find specific information. Try rephrasing your question or asking about:")
            response_parts.append("- Specific job roles (e.g., 'Process Engineer', 'Plant Manager')")
            response_parts.append("- Skills (e.g., 'CCS', 'process safety', 'project management')")
            response_parts.append("- Companies (e.g., 'Methanex', 'Proman', 'compensation comparison')")
            
        return "\n".join(response_parts)


# Global instance
rag_engine = RAGChatEngine()


def initialize_rag(job_data_df: Optional[pd.DataFrame] = None):
    """Initialize the global RAG engine"""
    rag_engine.initialize(job_data_df)


def chat_with_rag(message: str, history: List[Dict[str, str]], current_report: Optional[str] = None, data_context: Optional[Dict] = None) -> tuple[str, List[str]]:
    """Chat with the RAG engine - returns (response, sources)"""
    return rag_engine.chat(message, history, current_report, data_context)
