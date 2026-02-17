import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Target, Users } from 'lucide-react';
import { JobPoint, SimilarJob } from '@/types';
import { fetchSimilarJobs } from '@/lib/api';
import { truncateText, getSimilarityColor } from '@/lib/utils';

interface JobDetailsPanelProps {
  job: JobPoint | null;
  onClose: () => void;
  onJobSelect: (job: JobPoint) => void;
}

export default function JobDetailsPanel({ job, onClose, onJobSelect }: JobDetailsPanelProps) {
  const [similarJobs, setSimilarJobs] = useState<SimilarJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'similar'>('overview');

  useEffect(() => {
    if (job) {
      setLoading(true);
      fetchSimilarJobs(job.id, 5)
        .then(data => setSimilarJobs(data.similar_jobs))
        .finally(() => setLoading(false));
    }
  }, [job]);

  if (!job) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-96 bg-base-100 border-l border-base-300 shadow-xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-base-300 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: job.color }}
              />
              <span className="text-xs font-medium text-base-content/60">
                Family {job.cluster_id}
              </span>
            </div>
            <h2 className="text-base font-semibold text-base-content pr-4">{job.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-bordered border-b border-base-300">
          <button
            onClick={() => setActiveTab('overview')}
            className={`tab gap-2 ${activeTab === 'overview' ? 'tab-active' : ''}`}
          >
            <FileText className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('similar')}
            className={`tab gap-2 ${activeTab === 'similar' ? 'tab-active' : ''}`}
          >
            <Users className="w-4 h-4" />
            Similar
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h3 className="text-sm font-medium text-base-content mb-2">Summary</h3>
                  <p className="text-sm text-base-content/70 leading-relaxed">
                    {job.summary || 'No summary available.'}
                  </p>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <h3 className="text-sm font-medium text-base-content mb-2">Keywords</h3>
                <div className="flex flex-wrap gap-1.5">
                  {job.keywords.map((kw, i) => (
                    <span key={i} className="badge badge-ghost badge-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Competencies */}
              <div>
                <h3 className="text-sm font-medium text-base-content mb-2">Competencies</h3>
                <div className="space-y-1.5">
                  {job.skills.length > 0 ? (
                    job.skills.map((skill, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-base-content/70">
                        <Target className="w-3.5 h-3.5 text-base-content/40" />
                        {skill}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-base-content/40">No competencies listed</p>
                  )}
                </div>
              </div>

              {/* Responsibilities */}
              {job.responsibilities && (
                <div className="card bg-base-200">
                  <div className="card-body p-4">
                    <h3 className="text-sm font-medium text-base-content mb-2">Responsibilities</h3>
                    <p className="text-sm text-base-content/70 leading-relaxed">
                      {truncateText(job.responsibilities, 250)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'similar' && (
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                </div>
              ) : (
                similarJobs.map((similar) => (
                  <div
                    key={similar.id}
                    onClick={() => {
                      const newJob = { ...job, id: similar.id, title: similar.title, cluster_id: similar.cluster_id };
                      onJobSelect(newJob as JobPoint);
                    }}
                    className="card bg-base-200 cursor-pointer hover:bg-base-300 transition-colors"
                  >
                    <div className="card-body p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-base-content">{similar.title}</p>
                          <p className="text-xs text-base-content/50">Family {similar.cluster_id}</p>
                        </div>
                        <div className="badge" style={{ backgroundColor: getSimilarityColor(similar.similarity), color: '#fff' }}>
                          {(similar.similarity * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-base-300 bg-base-200">
          <p className="text-xs text-base-content/40">Position ID: {job.id}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
