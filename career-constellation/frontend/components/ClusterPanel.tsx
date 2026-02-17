'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Users, 
  Tag, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Target,
  GitMerge,
  BarChart3
} from 'lucide-react';
import { ClusterInfo, ClusterDetails } from '@/types';
import { fetchClusterDetails } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ClusterPanelProps {
  cluster: ClusterInfo | null;
  allClusters: ClusterInfo[];
  onClose: () => void;
  onClusterSelect: (clusterId: number) => void;
  selectedCluster: number | null;
}

export default function ClusterPanel({ 
  cluster, 
  allClusters,
  onClose, 
  onClusterSelect,
  selectedCluster 
}: ClusterPanelProps) {
  const [details, setDetails] = useState<ClusterDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('jobs');

  useState(() => {
    if (cluster && selectedCluster === cluster.id) {
      setLoading(true);
      fetchClusterDetails(cluster.id)
        .then(data => setDetails(data))
        .finally(() => setLoading(false));
    }
  });

  // Load details when cluster is selected
  useState(() => {
    if (selectedCluster !== null) {
      const selected = allClusters.find(c => c.id === selectedCluster);
      if (selected) {
        setLoading(true);
        fetchClusterDetails(selectedCluster)
          .then(data => setDetails(data))
          .finally(() => setLoading(false));
      }
    }
  });

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const currentCluster = cluster || (selectedCluster !== null ? allClusters.find(c => c.id === selectedCluster) : null);

  if (!currentCluster) {
    // Show cluster list overview
    return (
      <motion.div
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -400, opacity: 0 }}
        className="fixed left-4 top-4 bottom-4 w-80 glass rounded-2xl overflow-hidden z-20 flex flex-col"
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Job Families</h2>
              <p className="text-sm text-white/50">{allClusters.length} clusters found</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {allClusters.map((c, index) => (
            <button
              key={c.id}
              onClick={() => onClusterSelect(c.id)}
              className={cn(
                'w-full text-left p-4 rounded-xl transition-all duration-200',
                selectedCluster === c.id
                  ? 'bg-white/10 ring-1 ring-white/20'
                  : 'hover:bg-white/5'
              )}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                  style={{ 
                    backgroundColor: c.color,
                    boxShadow: `0 0 10px ${c.color}40`
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white truncate">{c.label}</h3>
                    <span className="text-xs text-white/40 ml-2">{c.size}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.keywords.slice(0, 2).map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/50"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      className="fixed left-4 top-4 bottom-4 w-96 glass rounded-2xl overflow-hidden z-20 flex flex-col"
    >
      {/* Header */}
      <div 
        className="p-6 border-b border-white/10"
        style={{ backgroundColor: `${currentCluster.color}15` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-5 h-5 rounded-full"
              style={{ 
                backgroundColor: currentCluster.color,
                boxShadow: `0 0 15px ${currentCluster.color}`
              }}
            />
            <div>
              <h2 className="text-xl font-bold text-white">{currentCluster.label}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {currentCluster.size} jobs
                </span>
                <span>Cluster {currentCluster.id}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Keywords */}
        <div className="p-6 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-cosmic-pink" />
            Key Characteristics
          </h3>
          <div className="flex flex-wrap gap-2">
            {currentCluster.keywords.map((keyword, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ 
                  backgroundColor: `${currentCluster.color}20`,
                  color: currentCluster.color
                }}
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Expandable Sections */}
        <div className="p-4 space-y-2">
          {/* Jobs in Cluster */}
          <div className="glass-dark rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('jobs')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cosmic-blue" />
                <span className="font-medium text-white">Jobs in this Family</span>
                <span className="text-xs text-white/40">({currentCluster.size})</span>
              </div>
              {expandedSection === 'jobs' ? (
                <ChevronUp className="w-4 h-4 text-white/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/40" />
              )}
            </button>
            
            <AnimatePresence>
              {expandedSection === 'jobs' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {currentCluster.example_titles.map((title, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                        <div 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: currentCluster.color }}
                        />
                        {title}
                      </div>
                    ))}
                    {currentCluster.size > 3 && (
                      <p className="text-xs text-white/40 pl-3.5">
                        +{currentCluster.size - 3} more jobs...
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Standardization Insights */}
          {details && (
            <div className="glass-dark rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('standardization')}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-cosmic-yellow" />
                  <span className="font-medium text-white">Standardization Insights</span>
                </div>
                {expandedSection === 'standardization' ? (
                  <ChevronUp className="w-4 h-4 text-white/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/40" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSection === 'standardization' && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                          Top Skills
                        </h4>
                        <div className="space-y-1">
                          {details.top_skills.slice(0, 5).map((skill, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-white/70">{skill.skill}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full"
                                    style={{ 
                                      width: `${(skill.count / currentCluster.size) * 100}%`,
                                      backgroundColor: currentCluster.color
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-white/40 w-6 text-right">
                                  {skill.count}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10">
                        <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                          Standardization Candidates
                        </h4>
                        <p className="text-xs text-white/50 mb-2">
                          These roles have high similarity and could be merged:
                        </p>
                        <div className="space-y-1">
                          {details.standardization_candidates.slice(0, 3).map((title, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                              <Target className="w-3 h-3 text-cosmic-yellow" />
                              {title}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Cluster Stats */}
          <div className="glass-dark rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('stats')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cosmic-purple" />
                <span className="font-medium text-white">Cluster Statistics</span>
              </div>
              {expandedSection === 'stats' ? (
                <ChevronUp className="w-4 h-4 text-white/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/40" />
              )}
            </button>
            
            <AnimatePresence>
              {expandedSection === 'stats' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                    <div className="glass rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-white">{currentCluster.size}</div>
                      <div className="text-xs text-white/40">Total Jobs</div>
                    </div>
                    <div className="glass rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-cosmic-blue">
                        {((currentCluster.size / allClusters.reduce((a, b) => a + b.size, 0)) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-white/40">Of Workforce</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 glass-dark">
        <button
          onClick={() => onClusterSelect(currentCluster.id)}
          className="w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
          style={{ 
            backgroundColor: currentCluster.color,
            color: '#000'
          }}
        >
          <Sparkles className="w-4 h-4" />
          Focus on This Cluster
        </button>
      </div>
    </motion.div>
  );
}
