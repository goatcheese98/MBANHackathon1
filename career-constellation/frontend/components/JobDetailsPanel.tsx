'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Hash, Zap, Users, ChevronRight, Sparkles, MapPin } from 'lucide-react';
import { JobPoint, SimilarJob } from '@/types';
import { fetchSimilarJobs } from '@/lib/api';
import { cn, truncateText, getSimilarityColor } from '@/lib/utils';

interface JobDetailsPanelProps {
  job: JobPoint | null;
  onClose: () => void;
  onJobSelect: (job: JobPoint) => void;
}

export default function JobDetailsPanel({ job, onClose, onJobSelect }: JobDetailsPanelProps) {
  const [similarJobs, setSimilarJobs] = useState<SimilarJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'similar'>('overview');

  useEffect(() => {
    if (job) {
      setLoading(true);
      fetchSimilarJobs(job.id, 5)
        .then(data => setSimilarJobs(data.similar_jobs))
        .finally(() => setLoading(false));
    }
  }, [job]);

  if (!job) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Briefcase },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'similar', label: 'Similar Jobs', icon: Users },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-4 top-20 bottom-4 w-96 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden z-40 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b border-gray-800"
          style={{ backgroundColor: `${job.color}15` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: job.color }}
                />
                <span className="text-xs text-gray-400 uppercase tracking-wider">
                  Cluster {job.cluster_id}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">{job.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Summary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Summary
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {job.summary || 'No summary available.'}
                </p>
              </div>

              {/* Coordinates */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Position in Constellation
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {(['x', 'y', 'z'] as const).map(coord => (
                    <div key={coord} className="text-center">
                      <div className="text-lg font-mono font-bold text-blue-400">
                        {(job[coord] as number).toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500 uppercase">{coord}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {job.keywords.map((keyword, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-gray-800 rounded-full text-xs text-gray-300 border border-gray-700"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Responsibilities */}
              {job.responsibilities && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Responsibilities</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {truncateText(job.responsibilities, 300)}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'skills' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Skills List */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Required Skills</h3>
                <div className="space-y-2">
                  {job.skills.length > 0 ? (
                    job.skills.map((skill, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
                      >
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: job.color }}
                        />
                        <span className="text-sm text-gray-200">{skill}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No specific skills extracted</p>
                  )}
                </div>
              </div>

              {/* Qualifications */}
              {job.qualifications && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Qualifications</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {truncateText(job.qualifications, 400)}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'similar' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <p className="text-sm text-gray-400 mb-4">
                Jobs with similar responsibilities and requirements
              </p>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : (
                similarJobs.map((similarJob) => (
                  <div
                    key={similarJob.id}
                    onClick={() => {
                      const newJob = { ...job, id: similarJob.id, title: similarJob.title, cluster_id: similarJob.cluster_id };
                      onJobSelect(newJob as JobPoint);
                    }}
                    className="bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-800 transition-colors border border-gray-700/50 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                          {similarJob.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Hash className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            Cluster {similarJob.cluster_id}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-lg font-bold"
                          style={{ color: getSimilarityColor(similarJob.similarity) }}
                        >
                          {(similarJob.similarity * 100).toFixed(0)}%
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                      </div>
                    </div>
                    
                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {similarJob.keywords.slice(0, 3).map((kw, j) => (
                        <span
                          key={j}
                          className="px-2 py-0.5 bg-gray-900 rounded text-[10px] text-gray-500"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Job ID: {job.id}</span>
            <span>Complexity: {job.size.toFixed(1)}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
