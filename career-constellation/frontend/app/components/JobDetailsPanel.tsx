import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { 
  X, FileText, Target, Users, MapPin, Building2, 
  Sparkles, Briefcase, GraduationCap, CheckCircle2,
  ChevronRight, Hash
} from 'lucide-react';
import { JobPoint, SimilarJob } from '@/types';
import { fetchSimilarJobs } from '@/lib/api';
import { truncateText, getSimilarityColor } from '@/lib/utils';

interface JobDetailsPanelProps {
  job: JobPoint | null;
  onClose: () => void;
  onJobSelect: (job: JobPoint) => void;
}

// Keyword color mapping (same as DashboardView)
const KEYWORD_COLORS: Record<string, string> = {
  management: '#3b82f6', manager: '#3b82f6', lead: '#6366f1', director: '#8b5cf6', supervisor: '#a855f7',
  engineering: '#059669', engineer: '#059669', technical: '#10b981', systems: '#14b8a6', electrical: '#06b6d4', process: '#0891b2',
  operations: '#d97706', plant: '#f59e0b', site: '#fbbf24', logistics: '#f97316',
  emergency: '#dc2626', safety: '#ef4444', security: '#b91c1c', response: '#f87171',
  experience: '#64748b', ability: '#64748b', knowledge: '#64748b', team: '#ec4899',
  methanex: '#0ea5e9', railcars: '#84cc16', piping: '#22c55e', loading: '#eab308', human: '#f43f5e', resources: '#f43f5e',
  accounting: '#3b82f6', finance: '#10b981', tax: '#f59e0b', budget: '#8b5cf6', analysis: '#06b6d4',
  excel: '#217346', reporting: '#6366f1', compliance: '#dc2626', regulatory: '#f97316',
};

function getKeywordColor(keyword: string): string {
  return KEYWORD_COLORS[keyword.toLowerCase()] || '#6b7280';
}

function getSkillLevelColor(index: number): string {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6'];
  return colors[index % colors.length];
}

export default function JobDetailsPanel({ job, onClose, onJobSelect }: JobDetailsPanelProps) {
  const [similarJobs, setSimilarJobs] = useState<SimilarJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'similar'>('overview');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (job) {
      setLoading(true);
      fetchSimilarJobs(job.id, 5)
        .then(data => setSimilarJobs(data.similar_jobs))
        .finally(() => setLoading(false));
      
      // Animate content on job change
      if (contentRef.current) {
        gsap.fromTo(contentRef.current.children,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
        );
      }
    }
  }, [job]);

  if (!job) return null;

  // Extract location from title if present
  const locationMatch = job.title.match(/\(([^)]+)\)/);
  const location = locationMatch ? locationMatch[1] : null;
  const cleanTitle = job.title.replace(/\s*\([^)]+\)\s*/, '').trim();
  const positionMatch = cleanTitle.match(/^Position:\s*(.+)/i);
  const displayTitle = positionMatch ? positionMatch[1] : cleanTitle;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-[480px] bg-base-100 border-l border-base-300 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-base-300 bg-gradient-to-r from-base-100 to-base-200/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full ring-2 ring-offset-2" 
                style={{ backgroundColor: job.color, ringColor: job.color }}
              />
              <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">
                Family {job.cluster_id}
              </span>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-square hover:bg-error/10 hover:text-error transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <h2 className="text-xl font-bold text-base-content leading-tight mb-2">
            {displayTitle}
          </h2>
          
          {location && (
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-base-300 bg-base-200/30">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'overview' ? 'text-primary' : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            <FileText className="w-4 h-4" />
            Overview
            {activeTab === 'overview' && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('similar')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'similar' ? 'text-primary' : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Similar Positions
            {activeTab === 'similar' && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-gradient-to-br from-base-200 to-base-100 rounded-2xl p-5 border border-base-300 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Briefcase className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base-content">Summary</h3>
                </div>
                <p className="text-sm text-base-content/80 leading-relaxed">
                  {job.summary || 'No summary available.'}
                </p>
              </div>

              {/* Keywords Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-base-content/50" />
                  <h3 className="font-semibold text-base-content">Keywords</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.keywords.map((kw, i) => {
                    const color = getKeywordColor(kw);
                    return (
                      <span 
                        key={i} 
                        className="px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105 cursor-default"
                        style={{ backgroundColor: color }}
                      >
                        {kw}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Competencies Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-base-content/50" />
                  <h3 className="font-semibold text-base-content">Competencies</h3>
                  <span className="text-xs text-base-content/40">({job.skills.length} skills)</span>
                </div>
                <div className="space-y-2">
                  {job.skills.length > 0 ? (
                    job.skills.map((skill, i) => (
                      <div 
                        key={i} 
                        className="flex items-center gap-3 p-3 bg-base-200/50 rounded-xl hover:bg-base-200 transition-colors group"
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                          style={{ backgroundColor: getSkillLevelColor(i) }}
                        >
                          {skill.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-base-content group-hover:text-primary transition-colors flex-1">
                          {skill}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-base-content/40 italic">No competencies listed</p>
                  )}
                </div>
              </div>

              {/* Responsibilities Section */}
              {job.responsibilities && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-base-content/50" />
                    <h3 className="font-semibold text-base-content">Responsibilities</h3>
                  </div>
                  <div className="bg-base-200/30 rounded-2xl p-5 border border-base-300">
                    <p className="text-sm text-base-content/80 leading-relaxed whitespace-pre-line">
                      {job.responsibilities}
                    </p>
                  </div>
                </div>
              )}

              {/* Qualifications Section */}
              {job.qualifications && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="w-4 h-4 text-base-content/50" />
                    <h3 className="font-semibold text-base-content">Qualifications</h3>
                  </div>
                  <div className="bg-base-200/30 rounded-2xl p-5 border border-base-300">
                    <p className="text-sm text-base-content/80 leading-relaxed whitespace-pre-line">
                      {job.qualifications}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'similar' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-base-content/50" />
                <h3 className="font-semibold text-base-content">Similar Positions</h3>
                <span className="text-xs text-base-content/40">({similarJobs.length})</span>
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                  <p className="text-sm text-base-content/50">Finding similar positions...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {similarJobs.map((similar, index) => (
                    <motion.div
                      key={similar.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        const newJob = { ...job, id: similar.id, title: similar.title, cluster_id: similar.cluster_id };
                        onJobSelect(newJob as JobPoint);
                      }}
                      className="group cursor-pointer bg-gradient-to-r from-base-200 to-base-100 rounded-xl p-4 border border-base-300 hover:border-primary/50 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-base-content group-hover:text-primary transition-colors truncate">
                            {similar.title}
                          </p>
                          <p className="text-xs text-base-content/50 mt-1">Family {similar.cluster_id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="badge badge-md text-white font-bold border-0 shadow-sm"
                            style={{ backgroundColor: getSimilarityColor(similar.similarity) }}
                          >
                            {(similar.similarity * 100).toFixed(0)}%
                          </div>
                          <ChevronRight className="w-4 h-4 text-base-content/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                      
                      {/* Similar job keywords preview */}
                      {similar.keywords && similar.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-base-300/50">
                          {similar.keywords.slice(0, 3).map((kw, i) => (
                            <span 
                              key={i} 
                              className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                              style={{ backgroundColor: getKeywordColor(kw) }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  
                  {similarJobs.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-base-200 flex items-center justify-center">
                        <Users className="w-8 h-8 text-base-content/30" />
                      </div>
                      <p className="text-base-content/50">No similar positions found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-base-300 bg-base-200/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-base-content/50">
            <Hash className="w-3 h-3" />
            <span>Position ID: <span className="font-mono font-medium">{job.id}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/40">{job.keywords.length} keywords</span>
            <span className="text-xs text-base-content/30">•</span>
            <span className="text-xs text-base-content/40">{job.skills.length} skills</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
