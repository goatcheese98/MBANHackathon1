import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { createFileRoute } from '@tanstack/react-router';
import { Panel, Group, Separator } from 'react-resizable-panels';
import {
  Send,
  Bot,
  Loader2,
  Sparkles,
  FileText,
  Database,
  AlertCircle,
  CheckCircle2,
  PanelLeft,
  GripVertical,
  BookOpen,
  HelpCircle,
  X,
} from 'lucide-react';
import { sendChatMessage, fetchChatStatus, ChatMessage } from '@/lib/api';
import ReportViewer from '@/components/ReportViewer';
import ChatMessageComponent from '@/components/ChatMessage';
import { RESEARCH_REPORTS, DEFAULT_REPORT_ID } from '@/reports.config';

export const Route = createFileRoute('/_layout/research-hub')({
  component: ResearchHubComponent,
});

type ContextScope = 'all' | 'current';

function ResearchHubComponent() {
  // Active report state
  const [activeReportId, setActiveReportId] = useState(DEFAULT_REPORT_ID);
  const activeReport = RESEARCH_REPORTS.find(r => r.id === activeReportId) || RESEARCH_REPORTS[0];
  
  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Context scope: 'all' reports or 'current' report only
  const [contextScope, setContextScope] = useState<ContextScope>('current');
  
  // Help modal state
  const [showHelp, setShowHelp] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your **Report Agent**. I can answer questions about the research reports.

**Context Mode:**
Use the toggle above to choose your search scope:

**Current Report**
Focus on the specific report you're currently reading for detailed, targeted answers.

**All Reports**  
Search across all 6 research reports for broader insights and cross-report comparisons.

**I can help you with:**
• Summarizing report sections
• Finding specific information
• Comparing data across reports
• Understanding career implications

**Tip:** Ask specific questions for better answers!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat status — poll every 3s until initialized, then stop
  const { data: status } = useQuery({
    queryKey: ['chat-status'],
    queryFn: fetchChatStatus,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.initialized ? false : 3000;
    },
  });

  // Auto-scroll chat to bottom
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
        // Pass current report only when in 'current' mode
        current_report: contextScope === 'current' ? activeReport?.source : undefined,
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

  // Get suggested questions based on context scope
  const getSuggestedQuestions = () => {
    // When in "All" mode, show higher-level questions across all reports
    if (contextScope === 'all') {
      return [
        "What are the key trends across all reports?",
        "How does compensation vary by career level?",
        "Compare Methanex to competitors across all areas",
        "What skills are most important for career growth?",
        "How will the energy transition impact all job types?",
        "Summarize the methanol industry outlook",
      ];
    }
    
    // When in "Current" mode, show report-specific questions
    const reportType = activeReport?.id || '';
    
    if (reportType.includes('industry') || reportType.includes('methanol')) {
      return [
        "Summarize the methanol market outlook",
        "What are the key demand drivers for methanol?",
        "How is China affecting global methanol supply?",
        "What are the emerging applications for methanol?",
      ];
    } else if (reportType.includes('career') || reportType.includes('architecture')) {
      return [
        "What are the typical career progression paths?",
        "How long does it take to become a Senior Engineer?",
        "What certifications are most valuable?",
        "Compare management vs technical tracks",
      ];
    } else if (reportType.includes('skill') || reportType.includes('competency')) {
      return [
        "What are the core chemical engineering competencies?",
        "Which skills are in highest demand?",
        "What training should I prioritize for CCS?",
        "How do I develop process safety expertise?",
      ];
    } else if (reportType.includes('compensation') || reportType.includes('salary')) {
      return [
        "What are typical salary ranges for Process Engineers?",
        "How does Methanex compare to competitors?",
        "What factors affect compensation most?",
        "What's the premium for CCS expertise?",
      ];
    } else if (reportType.includes('energy') || reportType.includes('transition')) {
      return [
        "How will CCS impact methanol careers?",
        "What are the green methanol pathways?",
        "Which roles are at risk from automation?",
        "How do I transition to hydrogen economy roles?",
      ];
    } else if (reportType.includes('competitive')) {
      return [
        "How does Methanex compare to Proman?",
        "What are the key competitive advantages?",
        "Which companies are hiring most aggressively?",
        "What's the culture like at major competitors?",
      ];
    }
    
    return [
      "Summarize the key points from this report",
      "What are the main findings?",
      "How does this apply to my career?",
      "What actions should I take based on this?",
    ];
  };

  const suggestedQuestions = getSuggestedQuestions();

  return (
    <div className="flex h-full overflow-hidden bg-base-100">
      {/* Left Sidebar - Report Navigator */}
      <motion.div
        initial={false}
        animate={{ width: sidebarCollapsed ? 60 : 280 }}
        className="flex-shrink-0 border-r border-base-300 bg-base-100"
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between border-b border-base-300 px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold text-base-content">Internal Market Reports</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-lg p-1.5 text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Report List */}
        <div className="overflow-y-auto p-2">
          {RESEARCH_REPORTS.map((report) => (
            <button
              key={report.id}
              onClick={() => setActiveReportId(report.id)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-all ${
                activeReportId === report.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
              }`}
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="truncate text-sm">{report.title}</span>
              )}
            </button>
          ))}
        </div>

        {/* RAG Status */}
        {!sidebarCollapsed && status && (
          <div className="border-t border-base-300 p-3">
            <p className="mb-2 text-xs font-medium text-base-content/50">AI Knowledge Base</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-base-content/60">
                <FileText className="h-3 w-3" />
                <span>{status.reports_loaded} report chunks</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-base-content/60">
                <Database className="h-3 w-3" />
                <span>{status.jobs_available} jobs indexed</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {status.rag_enabled && status.initialized ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    <span className="text-success">RAG Ready</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-warning" />
                    <span className="text-warning">Initializing...</span>
                  </>
                )}
              </div>
            </div>
            {/* Powered by Gemini */}
            <div className="mt-3 pt-3 border-t border-base-200 flex items-center gap-2">
              <img src="/gemini.png" alt="Gemini" className="h-5 w-5 rounded-full object-cover" />
              <span className="text-[11px] text-base-content/50">Powered by Gemini Deep Research</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Main Content Area with Resizable Panels */}
      <Group orientation="horizontal" className="flex-1">
        {/* Report Panel */}
        <Panel 
          defaultSize={65} 
          minSize={30} 
          maxSize={85}
          className="border-r border-base-300"
        >
          <div className="h-full overflow-hidden bg-base-100">
            <ReportViewer report={activeReport} />
          </div>
        </Panel>

        {/* Resize Handle */}
        <Separator className="w-2 bg-base-300 hover:bg-primary focus:bg-primary active:bg-primary transition-colors cursor-col-resize flex items-center justify-center">
          <GripVertical className="h-4 w-4 text-base-content/30 pointer-events-none" />
        </Separator>

        {/* Chat Panel */}
        <Panel 
          defaultSize={35} 
          minSize={15} 
          maxSize={70}
          className="flex flex-col bg-base-100"
        >
          {/* Chat Header */}
          <div className="flex flex-col border-b border-base-300 bg-base-100 px-4 py-2 gap-2">
            {/* Top row: Title and controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-base-content truncate">Report Agent</h2>
                  <p className="text-xs text-base-content/60 truncate">
                    {contextScope === 'current' ? 'Focused on current report' : 'Searching all reports'}
                  </p>
                </div>
              </div>
              
              {/* Help Button */}
              <button
                onClick={() => setShowHelp(true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-base-content/50 hover:bg-base-200 hover:text-primary transition-colors flex-shrink-0"
                title="How to use the Report Agent"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
            
            {/* Bottom row: Context Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-base-content/50 whitespace-nowrap">Search:</span>
              {/* Context Scope Toggle */}
              <div className="flex items-center rounded-lg border border-base-300 bg-base-200 p-0.5 flex-1">
                <button
                  onClick={() => setContextScope('current')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all flex-1 ${
                    contextScope === 'current'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                  title="Focus on the currently selected report"
                >
                  Current Report
                </button>
                <button
                  onClick={() => setContextScope('all')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all flex-1 ${
                    contextScope === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                  title="Search across all reports"
                >
                  All Reports
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-4">
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
                  className="flex gap-2"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-base-300 bg-base-200 px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-base-content/60">Thinking...</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && !isLoading && (
            <div className="border-t border-base-300 bg-base-100 px-3 py-2">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-base-content/50">
                <Sparkles className="h-3 w-3" />
                {contextScope === 'all' ? 'Cross-report questions' : 'Report-specific questions'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedQuestions.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(question)}
                    className="rounded-md border border-base-300 bg-base-200 px-2 py-1 text-xs text-base-content/70 transition-all hover:border-primary hover:text-primary"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-base-300 bg-base-100 p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={contextScope === 'all' ? "Ask about any report..." : "Ask about this report..."}
                className="max-h-24 min-h-[40px] flex-1 resize-none rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-lg transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-base-content/40">
              AI responses based on reports and job data
            </p>
          </div>
        </Panel>
      </Group>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full rounded-xl border border-base-300 bg-base-100 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-base-content flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  How to use Report Agent
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="rounded-lg p-1 text-base-content/50 hover:bg-base-200 hover:text-base-content"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-4 text-sm text-base-content/80">
                <div>
                  <h4 className="font-medium text-base-content mb-1">📄 Report Agent</h4>
                  <p>Your AI assistant for exploring the 6 research reports. Ask questions about any topic covered in the reports.</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-base-content mb-1">🎯 Context Modes</h4>
                  <ul className="space-y-1.5 ml-4 list-disc">
                    <li><strong>Current</strong> - Focuses on the report you're currently reading for precise answers</li>
                    <li><strong>All</strong> - Searches across all 6 reports for broader questions</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-base-content mb-1">💡 Tips for best results</h4>
                  <ul className="space-y-1.5 ml-4 list-disc">
                    <li>Be specific with your questions</li>
                    <li>Use the suggested questions as inspiration</li>
                    <li>Toggle between Current and All depending on your needs</li>
                    <li>Check the sources shown with each answer</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-base-content mb-1">↔️ Resizing</h4>
                  <p>Drag the grip handle between the report and chat panels to adjust the layout.</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowHelp(false)}
                className="mt-6 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
