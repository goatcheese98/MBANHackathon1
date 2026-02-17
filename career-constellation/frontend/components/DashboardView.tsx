'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';
import {
  Search,
  Filter,
  LayoutGrid,
  Globe,
  Users,
  Briefcase,
  Layers,
  ArrowRight,
  X,
  Building2,
  TrendingUp,
  Target,
  MapPin,
} from 'lucide-react';
import { JobPoint, ClusterInfo } from '@/types';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
  jobs: JobPoint[];
  clusters: ClusterInfo[];
  selectedCluster: number | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClusterSelect: (clusterId: number | null) => void;
  onJobSelect: (job: JobPoint) => void;
  onSwitchTo3D: () => void;
}

const COLORS = [
  '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#4338ca', '#0d9488', '#65a30d',
  '#ea580c', '#16a34a', '#0284c7', '#9333ea', '#e11d48'
];

export default function DashboardView({
  jobs,
  clusters,
  selectedCluster,
  searchQuery,
  onSearchChange,
  onClusterSelect,
  onJobSelect,
  onSwitchTo3D,
}: DashboardViewProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    let result = jobs;
    
    if (selectedCluster !== null) {
      result = result.filter(j => j.cluster_id === selectedCluster);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(j => 
        j.title.toLowerCase().includes(query) ||
        j.summary.toLowerCase().includes(query) ||
        j.keywords.some(k => k.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [jobs, selectedCluster, searchQuery]);

  // Chart data
  const clusterChartData = useMemo(() => {
    return clusters
      .map(c => ({
        name: c.label || `Cluster ${c.id}`,
        id: c.id,
        size: c.size,
        color: c.color,
      }))
      .sort((a, b) => b.size - a.size);
  }, [clusters]);

  const scatterData = useMemo(() => {
    return filteredJobs.map(j => ({
      x: j.x,
      y: j.y,
      z: 20, // Fixed smaller size
      id: j.id,
      title: j.title,
      cluster: j.cluster_id,
      color: j.color,
    }));
  }, [filteredJobs]);

  const topKeywords = useMemo(() => {
    const keywords: Record<string, number> = {};
    filteredJobs.forEach(job => {
      job.keywords.forEach(kw => {
        keywords[kw] = (keywords[kw] || 0) + 1;
      });
    });
    return Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filteredJobs]);

  // Stats
  const stats = useMemo(() => {
    const totalJobs = filteredJobs.length;
    const uniqueClusters = new Set(filteredJobs.map(j => j.cluster_id)).size;
    const avgSkills = filteredJobs.reduce((acc, j) => acc + j.skills.length, 0) / totalJobs || 0;
    
    return [
      { 
        label: 'Total Positions', 
        value: totalJobs, 
        icon: Briefcase, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50',
        border: 'border-blue-100'
      },
      { 
        label: 'Job Families', 
        value: uniqueClusters, 
        icon: Layers, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50',
        border: 'border-emerald-100'
      },
      { 
        label: 'Avg Competencies', 
        value: avgSkills.toFixed(1), 
        icon: Target, 
        color: 'text-amber-600', 
        bg: 'bg-amber-50',
        border: 'border-amber-100'
      },
      { 
        label: 'Unique Keywords', 
        value: topKeywords.length, 
        icon: TrendingUp, 
        color: 'text-purple-600', 
        bg: 'bg-purple-50',
        border: 'border-purple-100'
      },
    ];
  }, [filteredJobs, topKeywords.length]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Talent Analytics Dashboard</h1>
                <p className="text-xs text-gray-500">Job Family Analysis & Standardization</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 pl-10 pr-10 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                showFilters
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              {selectedCluster !== null && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold">
                  1
                </span>
              )}
            </button>

            {/* 3D View Button */}
            <button
              onClick={onSwitchTo3D}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
            >
              <Globe className="w-4 h-4" />
              Constellation View
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Filter by Job Family:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onClusterSelect(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                    selectedCluster === null
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  )}
                >
                  All Families
                </button>
                {clusters.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onClusterSelect(c.id === selectedCluster ? null : c.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-2',
                      selectedCluster === c.id
                        ? 'text-white shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    )}
                    style={selectedCluster === c.id ? { 
                      backgroundColor: c.color,
                      borderColor: c.color 
                    } : {}}
                  >
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.label || `Family ${c.id}`}
                    <span className={selectedCluster === c.id ? 'text-white/80' : 'text-gray-500'}>
                      ({c.size})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn('bg-white border rounded-xl p-4 shadow-sm', stat.border)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.bg)}>
                    <stat.icon className={cn('w-5 h-5', stat.color)} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Cluster Distribution */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Jobs by Family</h3>
              <p className="text-xs text-gray-500 mb-4">Distribution across identified job families</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={clusterChartData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" fontSize={11} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#374151" 
                    width={75}
                    tick={{ fontSize: 11, fontWeight: 500 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="size" radius={[0, 4, 4, 0]}>
                    {clusterChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Keywords */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Top Competencies</h3>
              <p className="text-xs text-gray-500 mb-4">Most frequent keywords across positions</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topKeywords} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280" 
                    tick={{ fontSize: 10 }} 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scatter Plot & Job List Row */}
          <div className="grid grid-cols-3 gap-6">
            {/* 2D Scatter Plot */}
            <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Position Landscape</h3>
              <p className="text-xs text-gray-500 mb-4">2D projection of job similarity space</p>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" dataKey="x" name="X" stroke="#9ca3af" tick={false} axisLine={false} />
                  <YAxis type="number" dataKey="y" name="Y" stroke="#9ca3af" tick={false} axisLine={false} />
                  <ZAxis type="number" dataKey="z" range={[30, 30]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                            <p className="text-sm font-medium text-gray-900">{data.title}</p>
                            <p className="text-xs text-gray-500">Family {data.cluster}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter
                    name="Jobs"
                    data={scatterData}
                    onClick={(data) => {
                      const job = jobs.find(j => j.id === data.id);
                      if (job) onJobSelect(job);
                    }}
                  >
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 mt-2 text-center">Click a point to view position details</p>
            </div>

            {/* Cluster Legend */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Job Families</h3>
              <p className="text-xs text-gray-500 mb-4">Click to filter</p>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {clusters
                  .sort((a, b) => b.size - a.size)
                  .map(c => (
                    <button
                      key={c.id}
                      onClick={() => onClusterSelect(c.id === selectedCluster ? null : c.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border',
                        selectedCluster === c.id
                          ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                          : 'bg-gray-50 border-transparent hover:bg-gray-100'
                      )}
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {c.label || `Family ${c.id}`}
                        </div>
                        <div className="text-xs text-gray-500">{c.size} positions</div>
                      </div>
                      <ArrowRight className={cn(
                        'w-4 h-4 flex-shrink-0 transition-colors',
                        selectedCluster === c.id ? 'text-blue-600' : 'text-gray-300'
                      )} />
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {selectedCluster !== null 
                    ? clusters.find(c => c.id === selectedCluster)?.label || 'Selected Family'
                    : 'All Positions'
                  }
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {filteredJobs.length} position{filteredJobs.length !== 1 ? 's' : ''} found
                </p>
              </div>
              {selectedCluster !== null && (
                <button
                  onClick={() => onClusterSelect(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Position Title</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Family</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Keywords</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Competencies</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.slice(0, 15).map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{job.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-xs">
                          {job.summary}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${job.color}15`,
                            color: job.color 
                          }}
                        >
                          <span 
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: job.color }}
                          />
                          Family {job.cluster_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {job.keywords.slice(0, 3).map((kw, j) => (
                            <span key={j} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {job.skills.slice(0, 2).map((skill, j) => (
                            <span key={j} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 2 && (
                            <span className="px-2 py-0.5 text-xs text-gray-400">+{job.skills.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onJobSelect(job)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredJobs.length > 15 && (
                <div className="px-6 py-3 text-center text-xs text-gray-500 border-t border-gray-100 bg-gray-50/30">
                  Showing 15 of {filteredJobs.length} positions
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
