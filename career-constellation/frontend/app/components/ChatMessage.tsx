import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Bot, User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/api';

interface ChatMessageProps {
  message: ChatMessageType;
  sources?: string[];
}

// Parse source string to extract report name and section
function parseSource(source: string): { report: string; section: string | null } {
  // Format: "Section Name (filename.md)"
  const match = source.match(/(.+?)\s*\((.+?)\.md\)/);
  if (match) {
    return {
      section: stripMarkdown(match[1].replace(/^#+\s*/, '').trim()),
      report: match[2].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    };
  }
  return { report: source, section: null };
}

// Strip markdown formatting (bold, italic, etc.)
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove **bold**
    .replace(/\*(.+?)\*/g, '$1')      // Remove *italic*
    .replace(/_(.+?)_/g, '$1')        // Remove _italic_
    .replace(/`(.+?)`/g, '$1')        // Remove `code`
    .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Remove [link](url) -> keep text
}

export default function ChatMessage({ message, sources = [] }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';
  
  // Group sources by report
  const groupedSources = sources.reduce((acc, source) => {
    const parsed = parseSource(source);
    if (!acc[parsed.report]) {
      acc[parsed.report] = [];
    }
    if (parsed.section) {
      acc[parsed.report].push(parsed.section);
    }
    return acc;
  }, {} as Record<string, string[]>);

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 flex-row-reverse"
      >
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-success">
          <User className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-success px-4 py-2.5 text-sm text-success-content">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2"
    >
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      
      <div className="max-w-[90%] flex-1">
        {/* AI Response */}
        <div className="rounded-2xl rounded-tl-sm border border-base-300 bg-base-100 px-4 py-3 text-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="mb-3 text-lg font-bold text-base-content">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-2 mt-4 text-base font-semibold text-primary">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-3 text-sm font-medium text-base-content">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-2 leading-relaxed text-base-content/80">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-2 ml-4 list-disc space-y-1 text-base-content/80">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 ml-4 list-decimal space-y-1 text-base-content/80">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-base-content">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-base-content/70">{children}</em>
              ),
              code: ({ children }) => (
                <code className="rounded bg-base-200 px-1 py-0.5 text-xs font-mono text-secondary">
                  {children}
                </code>
              ),
              blockquote: ({ children }) => (
                <blockquote className="mb-2 border-l-2 border-primary bg-base-200/50 pl-3 italic text-base-content/70">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-3 border-base-300" />,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Sources Section - Deep Research Style */}
        {sources.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs text-base-content/60 hover:text-primary transition-colors"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSources ? 'rotate-180' : ''}`} />
              {sources.length} sources
            </button>
            
            <AnimatePresence>
              {showSources && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1">
                    {Object.entries(groupedSources).map(([report, sections], idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-2 rounded border border-base-300 bg-base-200/30 px-2 py-1.5"
                      >
                        {/* Report Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-base-content/90 truncate">
                            {sections.length > 0 ? (
                              <span>{sections[0]}</span>
                            ) : (
                              <span>{report}</span>
                            )}
                          </p>
                          {sections.length > 1 && (
                            <p className="text-[10px] text-base-content/50 mt-0.5">
                              +{sections.length - 1} more sections from {report}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
