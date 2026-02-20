import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown, Maximize2 } from 'lucide-react';
import { fetchConstellationData } from '@/lib/api';
import { ClusterInfo, ConstellationData, JobPoint } from '@/types';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ZAxis,
} from 'recharts';

export const Route = createFileRoute('/_layout/clusters')({
  component: ClustersComponent,
  loader: async (): Promise<{ data: ConstellationData }> => {
    const data = await fetchConstellationData();
    return { data };
  },
});

// Gradient palette for the top-5 most-frequent global keywords (rank 0→4)
const TOP5_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c026d3', '#db2777'];
const KEYWORD_NEUTRAL = '#6b7280';

// Job level colors
const JOB_LEVEL_COLORS: Record<string, string> = {
  'Mid': '#3b82f6',
  'Manager': '#f59e0b',
  'Junior': '#22c55e',
  'Unclassified': '#9ca3af',
  'Director': '#ef4444',
  'Senior': '#6366f1',
  'Executive': '#1f2937',
};

function getKeywordColor(keyword: string, top5: string[]): string {
  const idx = top5.indexOf(keyword.toLowerCase());
  return idx >= 0 ? TOP5_COLORS[idx] : KEYWORD_NEUTRAL;
}

// Position Landscape Chart Component
function PositionLandscapeChart({ jobs }: { jobs: JobPoint[] }) {
  const scatterData = useMemo(() => 
    jobs.map(j => ({ 
      x: j.x, 
      y: j.y, 
      id: j.id, 
      title: j.title, 
      color: j.color, 
      cluster: j.cluster_id 
    })), 
    [jobs]
  );

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm" style={{ height: '440px' }}>
      <div className="px-5 py-3.5 border-b border-base-300 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-sm">Position Landscape</h3>
          <p className="text-xs text-base-content/50 mt-0.5">UMAP 2D Projection</p>
        </div>
      </div>
      <div className="p-4" style={{ height: '376px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" />
            <XAxis 
              type="number" 
              dataKey="x" 
              tick={{ fill: 'currentColor', fontSize: 10 }} 
              stroke="#6b7280" 
              tickLine={false} 
              label={{ value: 'UMAP 1', position: 'insideBottom', offset: -25, fill: 'currentColor', fontSize: 11 }} 
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              tick={{ fill: 'currentColor', fontSize: 10 }} 
              stroke="#6b7280" 
              tickLine={false} 
              label={{ value: 'UMAP 2', angle: -90, position: 'insideLeft', fill: 'currentColor', fontSize: 11 }} 
            />
            <ZAxis type="number" range={[40, 40]} />
            <RechartsTooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-base-100 border border-base-300 rounded-xl px-3 py-2 shadow-xl">
                      <p className="font-semibold text-sm">{data.title}</p>
                      <p className="text-xs text-base-content/70">Family {data.cluster}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={scatterData}>
              {scatterData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Job Level Distribution Chart Component
function JobLevelDistributionChart({ jobs }: { jobs: JobPoint[] }) {
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => {
      const level = j.job_level || 'Unclassified';
      counts[level] = (counts[level] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: JOB_LEVEL_COLORS[name] || '#9ca3af' }))
      .sort((a, b) => b.value - a.value);
  }, [jobs]);

  const total = jobs.length;

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm" style={{ height: '440px' }}>
      <div className="px-5 py-3.5 border-b border-base-300">
        <h3 className="font-semibold text-sm">Job Level Distribution</h3>
        <p className="text-xs text-base-content/50 mt-0.5">Seniority breakdown · {total} positions</p>
      </div>
      <div className="flex flex-col" style={{ height: '376px' }}>
        <div className="relative flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
                dataKey="value"
                label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                isAnimationActive={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-1" style={{ maxHeight: '148px', overflowY: 'auto' }}>
          {pieData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-[10px] text-base-content/70 truncate" title={entry.name}>{entry.name}</span>
              <span className="text-[10px] font-semibold text-base-content/50 flex-shrink-0 ml-auto">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClustersComponent() {
  const { data } = Route.useLoaderData();
  const clusters: ClusterInfo[] = data.clusters;
  const jobs: JobPoint[] = data.jobs;
  
  // Top-5 most frequent keywords
  const top5Keywords = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => j.keywords.forEach((kw: string) => { counts[kw] = (counts[kw] || 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw]) => kw.toLowerCase());
  }, [jobs]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'family' | 'label' | 'size'>('size');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const CLUSTERS_PER_PAGE = 10;

  const filteredClusters = useMemo(() => {
    let result = [...clusters];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.label.toLowerCase().includes(q) ||
        c.keywords.some(k => k.toLowerCase().includes(q)) ||
        c.example_titles.some(t => t.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'family':
          comparison = a.id - b.id;
          break;
        case 'label':
          comparison = a.label.localeCompare(b.label);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [clusters, searchTerm, sortField, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredClusters.length / CLUSTERS_PER_PAGE);
  const paginatedClusters = useMemo(() => {
    const start = (currentPage - 1) * CLUSTERS_PER_PAGE;
    return filteredClusters.slice(start, start + CLUSTERS_PER_PAGE);
  }, [filteredClusters, currentPage]);

  const handleSort = (field: 'family' | 'label' | 'size') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'family' | 'label' | 'size' }) => {
    if (sortField !== field) return <span className="text-base-content/20 text-xs">↕</span>;
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-base-200/50 overflow-hidden"
    >
      {/* Header */}
      <header className="bg-base-100/95 backdrop-blur-sm border-b border-base-300/70 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/logo_colour.svg" alt="Logo" className="h-10 w-auto" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Clusters Dashboard</h1>
              <p className="text-sm text-base-content/50 mt-0.5 font-medium">
                Explore all job families and their characteristics
              </p>
            </div>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input 
              type="text" 
              placeholder="Search clusters, keywords, or titles..."
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="input input-bordered w-full pl-10 pr-10 text-sm rounded-xl shadow-sm focus:shadow-md transition-shadow" 
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Static Charts - Not affected by filters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PositionLandscapeChart jobs={jobs} />
            <JobLevelDistributionChart jobs={jobs} />
          </div>

          {/* Clusters Table - Affected by search filter */}
          <div className="card bg-base-100 rounded-2xl shadow-lg overflow-hidden border-0">
            <div className="px-6 py-5 flex items-center justify-between bg-gradient-to-r from-base-100 to-base-200/50">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold tracking-tight">Clusters</h3>
                <span className="badge badge-lg badge-primary font-semibold shadow-sm">{clusters.length} families</span>
              </div>
              {searchTerm && (
                <span className="text-sm text-base-content/60">
                  Showing {filteredClusters.length} of {clusters.length} clusters
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead className="bg-base-200/60 text-sm font-semibold">
                  <tr>
                    <th 
                      className="py-3.5 cursor-pointer hover:bg-base-300/40 transition-colors font-semibold text-base-content/70" 
                      style={{ width: '8%' }}
                      onClick={() => handleSort('family')}
                    >
                      <div className="flex items-center gap-1">
                        Family
                        <SortIcon field="family" />
                      </div>
                    </th>
                    <th 
                      className="py-3.5 cursor-pointer hover:bg-base-300/40 transition-colors font-semibold text-base-content/70" 
                      style={{ width: '28%' }}
                      onClick={() => handleSort('label')}
                    >
                      <div className="flex items-center gap-1">
                        Label
                        <SortIcon field="label" />
                      </div>
                    </th>
                    <th className="py-3.5 font-semibold text-base-content/70" style={{ width: '25%' }}>Keyword</th>
                    <th className="py-3.5 font-semibold text-base-content/70" style={{ width: '30%' }}>Example Titles</th>
                    <th 
                      className="py-3.5 cursor-pointer hover:bg-base-300/40 transition-colors text-right font-semibold text-base-content/70" 
                      style={{ width: '9%' }}
                      onClick={() => handleSort('size')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Jobs
                        <SortIcon field="size" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClusters.map((cluster: ClusterInfo) => (
                    <tr 
                      key={cluster.id} 
                      className="hover:bg-base-200/40 transition-all duration-150 border-b border-base-200/50 last:border-0"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm ring-2 ring-white dark:ring-base-300" 
                            style={{ backgroundColor: cluster.color }} 
                          />
                          <span className="font-mono text-sm text-base-content/70">{cluster.id}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-semibold text-sm text-base-content/90">{cluster.label}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {cluster.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="badge badge-xs border-0 rounded-md shadow-sm font-medium"
                              style={{
                                backgroundColor: getKeywordColor(kw, top5Keywords),
                                color: '#fff',
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                          {cluster.example_titles.map((title, i) => (
                            <p key={i} className="text-xs text-base-content/70">
                              • {title}
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="text-right">
                        <span className="badge badge-outline badge-sm rounded-lg font-semibold">{cluster.size}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filteredClusters.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-base-300/70 bg-base-200/30">
                <span className="text-sm text-base-content/60 font-medium">
                  Showing {((currentPage - 1) * CLUSTERS_PER_PAGE) + 1} - {Math.min(currentPage * CLUSTERS_PER_PAGE, filteredClusters.length)} of {filteredClusters.length} clusters
                </span>
                {totalPages > 1 && (
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="btn btn-ghost btn-xs btn-square rounded-lg"><ChevronsLeft className="w-4 h-4" /></button>
                    <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="btn btn-ghost btn-xs btn-square rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="px-3 py-1 text-sm font-medium">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="btn btn-ghost btn-xs btn-square rounded-lg"><ChevronRight className="w-4 h-4" /></button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="btn btn-ghost btn-xs btn-square rounded-lg"><ChevronsRight className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            )}
            {filteredClusters.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-base-content/50">No clusters found matching &quot;{searchTerm}&quot;</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
