import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { createFileRoute } from '@tanstack/react-router';
import {
  Send,
  Bot,
  Loader2,
  Sparkles,
  FileText,
  Database,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Filter,
  Table,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { sendChatMessage, fetchChatStatus, ChatMessage } from '@/lib/api';
import ChatMessageComponent from '@/components/ChatMessage';

export const Route = createFileRoute('/_layout/ai-chat')({
  component: AIChatComponent,
});

// Data pipeline context for the AI
interface DataContext {
  dataset: {
    name: string;
    totalJobs: number;
    numClusters: number;
    columns: string[];
  };
  filters: {
    clusters?: number[];
    keywords?: string[];
    searchQuery?: string;
  };
  availableReports: string[];
}

function AIChatComponent() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your AI Career Assistant with full access to the Methanex job data pipeline.

**📊 Data Pipeline Access:**
• **622 job postings** from Hackathon_Datasets_Refined_v5.csv
• **15 job clusters** identified via ML (SBERT + K-Means)
• **6 research reports** with industry intelligence
• **Active filters** from Dashboard/Constellation views

**What I can do:**
• Query specific job data ("Show me Process Engineer roles in cluster 3")
• Analyze patterns across the dataset
• Compare compensation across roles
• Identify skill gaps and career paths
• Answer questions about any report or job posting

Try asking me to analyze the data directly!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [showDataContext, setShowDataContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat status with full data pipeline info
  const { data: status } = useQuery({
    queryKey: ['chat-status'],
    queryFn: fetchChatStatus,
    refetchInterval: 30000,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        message: input,
        history: messages,
        // Include data pipeline context
        include_data_context: true,
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setSources(response.sources || []);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Analyze the top skills across all 622 job postings",
    "What are the most common job levels in the dataset?",
    "Compare salary ranges between clusters",
    "Show me jobs that mention 'CCS' or 'carbon capture'",
    "Which cluster has the most senior positions?",
    "Analyze the relationship between job level and scope",
  ];

  return (
    <div className="flex h-full flex-col bg-base-100">
      {/* Header */}
      <div className="border-b border-base-300 bg-base-100">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-base-content">AI Career Assistant</h1>
              <p className="text-xs text-base-content/60">Full data pipeline access • 622 jobs • 6 reports • 15 clusters</p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-3">
            {status && (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200 px-3 py-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs text-base-content/70">
                    {status.reports_loaded} chunks
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200 px-3 py-1.5">
                  <Database className="h-4 w-4 text-success" />
                  <span className="text-xs text-base-content/70">
                    {status.jobs_available} jobs
                  </span>
                </div>
                <button
                  onClick={() => setShowDataContext(!showDataContext)}
                  className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200 px-3 py-1.5 text-xs text-base-content/70 hover:bg-base-300"
                >
                  <Table className="h-4 w-4" />
                  Data Pipeline
                  {showDataContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                <div className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200 px-3 py-1.5">
                  {status.rag_enabled && status.initialized ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                  <span className="text-xs text-base-content/70">
                    {status.rag_enabled && status.initialized ? 'RAG Ready' : 'Initializing...'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Data Pipeline Context Panel */}
        <AnimatePresence>
          {showDataContext && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-base-300 bg-base-200/50 overflow-hidden"
            >
              <div className="px-6 py-4">
                <div className="grid grid-cols-3 gap-6">
                  {/* Dataset Info */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-base-content">
                      <Database className="h-4 w-4 text-primary" />
                      Dataset: Hackathon_Datasets_Refined_v5.csv
                    </h3>
                    <ul className="space-y-1 text-xs text-base-content/70">
                      <li>• 622 job postings with full descriptions</li>
                      <li>• Columns: Job Title, Level, Scope, Summary, Responsibilities, Qualifications</li>
                      <li>• Pre-processed and standardized titles</li>
                      <li>• 15 ML-generated clusters via SBERT embeddings</li>
                    </ul>
                  </div>

                  {/* ML Pipeline */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-base-content">
                      <BarChart3 className="h-4 w-4 text-secondary" />
                      ML Pipeline
                    </h3>
                    <ul className="space-y-1 text-xs text-base-content/70">
                      <li>• Model: all-MiniLM-L6-v2 (Sentence-BERT)</li>
                      <li>• Clustering: K-Means (k=15)</li>
                      <li>• Visualization: UMAP 2D projection</li>
                      <li>• Similarity: Cosine on 384D embeddings</li>
                      <li>• 71 near-duplicate pairs identified</li>
                    </ul>
                  </div>

                  {/* Available Reports */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-base-content">
                      <FileText className="h-4 w-4 text-accent" />
                      Research Reports (6)
                    </h3>
                    <ul className="space-y-1 text-xs text-base-content/70">
                      <li>• Global Methanol Industry Intelligence</li>
                      <li>• Chemical Industry Career Architecture</li>
                      <li>• Methanol Operations Skills Matrix</li>
                      <li>• Chemicals & Energy Compensation</li>
                      <li>• Energy Transition Impact on Careers</li>
                      <li>• Methanol Industry Competitive Intelligence</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {messages.map((message, index) => (
            <ChatMessageComponent 
              key={index} 
              message={message} 
              sources={index === messages.length - 1 && message.role === 'assistant' ? sources : undefined}
            />
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-base-300 bg-base-200 px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-base-content/60">Analyzing data pipeline...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested questions */}
      {messages.length === 1 && !isLoading && (
        <div className="border-t border-base-300 bg-base-200/30 px-6 py-3">
          <div className="mx-auto max-w-4xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium text-base-content/50">
              <Sparkles className="h-3.5 w-3.5" />
              Try asking about the data
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => setInput(question)}
                  className="rounded-lg border border-base-300 bg-base-100 px-3 py-1.5 text-xs text-base-content/70 transition-all hover:border-primary hover:text-primary"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-base-300 bg-base-100 p-4">
        <div className="mx-auto flex max-w-4xl gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about careers, analyze the data, query specific jobs..."
            className="max-h-32 min-h-[48px] flex-1 resize-none rounded-xl border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-4xl text-center text-xs text-base-content/40">
          I can access and analyze the full Hackathon_Datasets_Refined_v5.csv dataset and all 6 research reports
        </p>
      </div>
    </div>
  );
}
