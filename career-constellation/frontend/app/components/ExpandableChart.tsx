import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X } from 'lucide-react';

interface ExpandableChartProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
  expandedContent?: React.ReactNode;
}

export default function ExpandableChart({ 
  children, 
  title, 
  subtitle, 
  className,
  expandedContent 
}: ExpandableChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Normal View */}
      <div className={`card bg-base-100 border border-base-300 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${className || ''}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-base-300 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-base-content">{title}</h3>
            {subtitle && <p className="text-xs text-base-content/60 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="btn btn-ghost btn-sm btn-square"
            title="Expand view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Chart Content */}
        <div className="p-4">
          {children}
        </div>
      </div>

      {/* Expanded Modal View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 150 }}
              className="card bg-base-100 border border-base-300 shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-base-300 flex items-center justify-between bg-base-200">
                <div>
                  <h3 className="text-lg font-semibold text-base-content">{title}</h3>
                  {subtitle && <p className="text-sm text-base-content/60 mt-0.5">{subtitle}</p>}
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="btn btn-ghost btn-sm btn-square"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
                {expandedContent || children}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
