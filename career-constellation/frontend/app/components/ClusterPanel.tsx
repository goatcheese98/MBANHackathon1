import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (cluster && selectedCluster === cluster.id) {
      setLoading(true);
      fetchClusterDetails(cluster.id)
        .then(data => setDetails(data))
        .finally(() => setLoading(false));
    }
  }, [cluster, selectedCluster]);

  // Load details when cluster is selected
  useEffect(() => {
    if (selectedCluster !== null) {
      const selected = allClusters.find(c => c.id === selectedCluster);
      if (selected) {
        setLoading(true);
        fetchClusterDetails(selectedCluster)
          .then(data => setDetails(data))
          .finally(() => setLoading(false));
      }
    }
  }, [selectedCluster, allClusters]);

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
        className="fixed left-4 top-4 bottom-4 w-80 card bg-base-100/80 backdrop-blur shadow-xl border border-base-300 z-20 flex flex-col"
      >
        <div className="p-6 border-b border-base-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-base-content">Job Families</h2>
              <p className="text-sm text-base-content/50">{allClusters.length} clusters found</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {allClusters.map((c) => (
            <button
              key={c.id}
              onClick={() => onClusterSelect(c.id)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                selectedCluster === c.id
                  ? 'bg-primary/10 ring-1 ring-primary'
                  : 'hover:bg-base-200'
              }`}
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
                    <h3 className="font-medium text-base-content truncate">{c.label}</h3>
                    <span className="text-xs text-base-content/40 ml-2">{c.size}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.keywords.slice(0, 2).map((kw, i) => (
                      <span
                        key={i}
                        className="badge badge-ghost badge-xs"
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
      className="fixed left-4 top-4 bottom-4 w-96 card bg-base-100/90 backdrop-blur shadow-xl border border-base-300 z-20 flex flex-col"
    >
      {/* Header */}
      <div 
        className="p-6 border-b border-base-300"
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
              <h2 className="text-xl font-bold text-base-content">{currentCluster.label}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-base-content/60">
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
            className="btn btn-ghost btn-sm btn-square"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Keywords */}
        <div className="p-6 border-b border-base-300">
          <h3 className="text-sm font-semibold text-base-content/80 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-secondary" />
            Key Characteristics
          </h3>
          <div className="flex flex-wrap gap-2">
            {currentCluster.keywords.map((keyword, i) => (
              <span
                key={i}
                className="badge badge-md"
                style={{ 
                  backgroundColor: `${currentCluster.color}20`,
                  color: currentCluster.color,
                  borderColor: `${currentCluster.color}40`
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
          <div className="collapse collapse-arrow bg-base-200 rounded-xl">
            <input 
              type="checkbox" 
              checked={expandedSection === 'jobs'}
              onChange={() => toggleSection('jobs')}
            />
            <div className="collapse-title flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-info" />
              Jobs in this Family
              <span className="badge badge-sm">({currentCluster.size})</span>
            </div>
            <div className="collapse-content">
              <div className="space-y-2">
                {currentCluster.example_titles.map((title, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-base-content/70">
                    <div 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: currentCluster.color }}
                    />
                    {title}
                  </div>
                ))}
                {currentCluster.size > 3 && (
                  <p className="text-xs text-base-content/40 pl-3.5">
                    +{currentCluster.size - 3} more jobs...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Standardization Insights */}
          {details && (
            <div className="collapse collapse-arrow bg-base-200 rounded-xl">
              <input 
                type="checkbox" 
                checked={expandedSection === 'standardization'}
                onChange={() => toggleSection('standardization')}
              />
              <div className="collapse-title flex items-center gap-2 text-sm font-medium">
                <GitMerge className="w-4 h-4 text-warning" />
                Standardization Insights
              </div>
              <div className="collapse-content space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-2">
                    Top Skills
                  </h4>
                  <div className="space-y-1">
                    {details.top_skills.slice(0, 5).map((skill, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-base-content/70">{skill.skill}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-base-300 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${(skill.count / currentCluster.size) * 100}%`,
                                backgroundColor: currentCluster.color
                              }}
                            />
                          </div>
                          <span className="text-xs text-base-content/40 w-6 text-right">
                            {skill.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-base-300">
                  <h4 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-2">
                    Standardization Candidates
                  </h4>
                  <p className="text-xs text-base-content/50 mb-2">
                    These roles have high similarity and could be merged:
                  </p>
                  <div className="space-y-1">
                    {details.standardization_candidates.slice(0, 3).map((title, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-base-content/70">
                        <Target className="w-3 h-3 text-warning" />
                        {title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cluster Stats */}
          <div className="collapse collapse-arrow bg-base-200 rounded-xl">
            <input 
              type="checkbox" 
              checked={expandedSection === 'stats'}
              onChange={() => toggleSection('stats')}
            />
            <div className="collapse-title flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="w-4 h-4 text-accent" />
              Cluster Statistics
            </div>
            <div className="collapse-content">
              <div className="grid grid-cols-2 gap-3">
                <div className="card bg-base-100 p-3 text-center">
                  <div className="text-2xl font-bold text-base-content">{currentCluster.size}</div>
                  <div className="text-xs text-base-content/40">Total Jobs</div>
                </div>
                <div className="card bg-base-100 p-3 text-center">
                  <div className="text-2xl font-bold text-info">
                    {((currentCluster.size / allClusters.reduce((a, b) => a + b.size, 0)) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-base-content/40">Of Workforce</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-base-300 bg-base-200">
        <button
          onClick={() => onClusterSelect(currentCluster.id)}
          className="btn w-full gap-2"
          style={{ 
            backgroundColor: currentCluster.color,
            color: '#000',
            borderColor: currentCluster.color
          }}
        >
          <Sparkles className="w-4 h-4" />
          Focus on This Cluster
        </button>
      </div>
    </motion.div>
  );
}
