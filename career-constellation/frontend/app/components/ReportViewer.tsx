import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { 
  FileText, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  Maximize2,
  Minimize2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReportConfig } from '@/reports.config';
import api from '@/lib/api';

interface ReportViewerProps {
  report: ReportConfig;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function ReportViewer({ 
  report, 
  isFullscreen,
  onToggleFullscreen 
}: ReportViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load local markdown content from backend API
  useEffect(() => {
    if (report.type === 'local') {
      setLoading(true);
      // URL-encode the report source to handle spaces and special characters
      const encodedSource = encodeURIComponent(report.source);
      api.get(`/api/reports/${encodedSource}`)
        .then((res) => {
          const text = res.data.content;
          // Remove YAML frontmatter
          const cleanContent = text.replace(/^---\s*\n[\s\S]*?---\s*\n/, '');
          setContent(cleanContent);
          setError(null);
        })
        .catch((err) => {
          console.error('Error loading report:', err);
          setError(`Failed to load report: ${report.title}. Make sure the backend server is running.`);
        })
        .finally(() => setLoading(false));
    }
  }, [report]);

  // Render Gemini iframe
  if (report.type === 'gemini_link') {
    return (
      <div className="flex h-full flex-col bg-base-100">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-base-300 bg-base-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-primary to-secondary">
              <span className="text-xs font-bold text-white">G</span>
            </div>
            <span className="text-sm font-medium text-base-content">{report.title}</span>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
              Gemini Deep Research
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={report.source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Gemini
            </a>
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="rounded-lg bg-base-200 p-1.5 text-base-content/60 transition-colors hover:bg-base-300"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Gemini iframe with fallback */}
        <div className="relative flex-1 overflow-hidden bg-base-100">
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-100 p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
              <span className="text-2xl font-bold text-white">G</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-base-content">
              Gemini Deep Research
            </h3>
            <p className="mb-6 max-w-sm text-sm text-base-content/60">
              This report is hosted on Google Gemini. Due to security restrictions, it cannot be embedded directly.
            </p>
            <a
              href={report.source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Open Report in Gemini
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Render local markdown
  return (
    <div className="flex h-full flex-col bg-base-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-base-300 bg-base-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-base-content">{report.title}</span>
          <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">
            Local Report
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Download via backend API
              const encodedSource = encodeURIComponent(report.source);
              api.get(`/api/reports/${encodedSource}`).then((res) => {
                const blob = new Blob([res.data.content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${report.source}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              });
            }}
            className="flex items-center gap-1.5 rounded-lg bg-base-200 px-3 py-1.5 text-xs text-base-content transition-colors hover:bg-base-300"
          >
            <Download className="h-3.5 w-3.5" />
            Download MD
          </button>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="rounded-lg bg-base-200 p-1.5 text-base-content/60 transition-colors hover:bg-base-300"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-base-content/60">Loading report...</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full items-center justify-center p-8"
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertCircle className="h-10 w-10 text-error" />
                <p className="text-base-content">{error}</p>
                <p className="text-sm text-base-content/60">
                  Make sure the backend server is running on port 8000.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="prose prose-base max-w-none p-6 dark:prose-invert"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-4 border-b border-base-300 pb-2 text-2xl font-bold text-base-content">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-6 text-xl font-semibold text-primary">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-4 text-lg font-medium text-base-content">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed text-base-content/80">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 ml-4 list-disc space-y-1 text-base-content/80">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 ml-4 list-decimal space-y-1 text-base-content/80">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  table: ({ children }) => (
                    <div className="mb-4 overflow-x-auto">
                      <table className="table table-zebra table-sm w-full">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-base-200">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="text-left text-sm font-semibold text-base-content">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="text-sm text-base-content/80">
                      {children}
                    </td>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="rounded bg-base-200 px-1.5 py-0.5 text-sm text-secondary">
                        {children}
                      </code>
                    ) : (
                      <pre className="overflow-x-auto rounded-lg bg-base-200 p-4">
                        <code className={className}>{children}</code>
                      </pre>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="mb-4 border-l-4 border-primary bg-base-200/50 pl-4 italic text-base-content/60">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-6 border-base-300" />,
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-primary underline-offset-2 hover:text-primary/80 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-base-content">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-base-content/80">{children}</em>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
