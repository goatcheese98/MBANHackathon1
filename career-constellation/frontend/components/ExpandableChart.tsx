'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md',
        className
      )}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
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
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                  {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
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
