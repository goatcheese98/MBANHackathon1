import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Layers, 
  Zap,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { fetchStats } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

interface StatsData {
  total_jobs: number;
  num_clusters: number;
  avg_jobs_per_cluster: number;
  cluster_distribution: Record<string, number>;
  top_keywords_overall: Record<string, number>;
  standardization_pairs?: number;
  job_level_distribution?: Record<string, number>;
}

export default function StatsDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card bg-base-100 border border-base-300 rounded-2xl p-8">
        <div className="flex items-center justify-center h-40">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      icon: Users,
      label: 'Total Jobs',
      value: stats.total_jobs,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      icon: Layers,
      label: 'Job Families',
      value: stats.num_clusters,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      icon: BarChart3,
      label: 'Avg per Cluster',
      value: stats.avg_jobs_per_cluster.toFixed(1),
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      icon: Zap,
      label: 'Std. Pairs',
      value: stats.standardization_pairs ?? Object.keys(stats.top_keywords_overall).length,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  return (
    <div className="card bg-base-100 border border-base-300 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Constellation Analytics
        </h3>
        <span className="badge badge-sm">Real-time</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card bg-base-200 rounded-xl p-4"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold text-base-content">{formatNumber(Number(card.value))}</div>
            <div className="text-xs text-base-content/50">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Top Keywords */}
      <div>
        <h4 className="text-sm font-semibold text-base-content/70 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-success" />
          Top Keywords Across All Jobs
        </h4>
        <div className="space-y-2">
          {Object.entries(stats.top_keywords_overall)
            .slice(0, 6)
            .map(([keyword, count], i) => {
              const maxCount = Math.max(...Object.values(stats.top_keywords_overall));
              const percentage = (count / maxCount) * 100;
              
              return (
                <div key={keyword} className="flex items-center gap-3">
                  <span className="text-xs text-base-content/60 w-24 truncate">{keyword}</span>
                  <div className="flex-1 h-2 bg-base-300 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <span className="text-xs text-base-content/40 w-8 text-right">{count}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Cluster Distribution */}
      <div>
        <h4 className="text-sm font-semibold text-base-content/70 mb-3 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-secondary" />
          Cluster Size Distribution
        </h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.cluster_distribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([clusterId, size]) => (
              <div
                key={clusterId}
                className="badge badge-lg gap-2 p-2"
              >
                <span className="text-xs font-medium text-base-content/80">Cluster {clusterId}</span>
                <span className="text-xs text-base-content/40">{size}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
