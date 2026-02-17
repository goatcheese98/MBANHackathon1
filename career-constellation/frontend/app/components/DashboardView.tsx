import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Search,
  Filter,
  Download,
  FileText,
  Users,
  Target,
  BarChart3,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
} from 'lucide-react';
import { JobPoint, ClusterInfo } from '@/types';

// Keyword color mapping
const KEYWORD_COLORS: Record<string, string> = {
  // Management
  management: '#3b82f6',
  manager: '#3b82f6',
  lead: '#6366f1',
  director: '#8b5cf6',
  supervisor: '#a855f7',
  
  // Engineering/Tech
  engineering: '#059669',
  engineer: '#059669',
  technical: '#10b981',
  systems: '#14b8a6',
  electrical: '#06b6d4',
  process: '#0891b2',
  
  // Operations
  operations: '#d97706',
  plant: '#f59e0b',
  site: '#fbbf24',
  logistics: '#f97316',
  
  // Safety/Security
  emergency: '#dc2626',
  safety: '#ef4444',
  security: '#b91c1c',
  response: '#f87171',
  
  // Skills
  experience: '#64748b',
  ability: '#64748b',
  knowledge: '#64748b',
  team: '#ec4899',
  
  // Industry specific
  methanex: '#0ea5e9',
  railcars: '#84cc16',
  piping: '#22c55e',
  loading: '#eab308',
  human: '#f43f5e',
  resources: '#f43f5e',
};

function getKeywordColor(keyword: string): string {
  const lowerKw = keyword.toLowerCase();
  return KEYWORD_COLORS[lowerKw] || '#6b7280';
}

interface DashboardViewProps {
  jobs: JobPoint[];
  clusters: ClusterInfo[];
  selectedCluster: number | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClusterSelect: (clusterId: number | null) => void;
  onJobSelect: (job: JobPoint) => void;
}

// Stat Card Component with GSAP animation
function StatCard({ 
  label, 
  value, 
  icon: Icon,
  subtext,
  delay = 0
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType;
  subtext?: string;
  delay?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.6, 
          delay: delay * 0.1,
          ease: 'back.out(1.7)'
        }
      );
    }
  }, [delay]);

  return (
    <div ref={cardRef} className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="card-body p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-base-content/60">{label}</p>
            <p className="text-3xl font-bold text-base-content mt-1">{value}</p>
            {subtext && <p className="text-xs text-base-content/40 mt-1">{subtext}</p>}
          </div>
          <div className="p-3 bg-base-200 rounded-xl">
            <Icon className="w-6 h-6 text-base-content/70" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ 
  title, 
  subtitle, 
  children,
  onExpand,
  delay = 0
}: { 
  title: string; 
  subtitle?: string; 
  children: React.ReactNode;
  onExpand?: () => void;
  delay?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 40 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.7, 
          delay: 0.3 + delay * 0.15,
          ease: 'power3.out'
        }
      );
    }
  }, [delay]);

  return (
    <div ref={cardRef} className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="px-5 py-4 border-b border-base-300 flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-base-content">{title}</h3>
          {subtitle && <p className="text-sm text-base-content/60 mt-0.5">{subtitle}</p>}
        </div>
        {onExpand && (
          <button 
            onClick={onExpand}
            className="btn btn-ghost btn-sm btn-square hover:scale-110 transition-transform"
            title="Expand chart"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-5 flex-1">
        {children}
      </div>
    </div>
  );
}

// Pagination Component
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-base-300 bg-base-200/30">
      <span className="text-sm text-base-content/60">
        Showing <span className="font-semibold">{startItem}-{endItem}</span> of <span className="font-semibold">{totalItems}</span> positions
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="btn btn-ghost btn-sm btn-square disabled:opacity-30"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-ghost btn-sm btn-square disabled:opacity-30"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-base-content/70 px-3 py-1 bg-base-100 rounded-lg border border-base-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-ghost btn-sm btn-square disabled:opacity-30"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="btn btn-ghost btn-sm btn-square disabled:opacity-30"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Floating Filter Button
function FloatingFilterButton({ 
  isOpen, 
  onClick, 
  activeFiltersCount 
}: { 
  isOpen: boolean; 
  onClick: () => void;
  activeFiltersCount: number;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pulseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (pulseRef.current && activeFiltersCount > 0) {
      gsap.to(pulseRef.current, {
        scale: 1.5,
        opacity: 0,
        duration: 1,
        repeat: -1,
        ease: 'power2.out'
      });
    }
  }, [activeFiltersCount]);

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={`fixed top-20 right-6 z-40 btn btn-circle btn-lg shadow-2xl transition-all duration-500 ${
        isOpen ? 'btn-primary rotate-90' : 'btn-neutral hover:btn-primary'
      }`}
      style={{ 
        boxShadow: isOpen ? '0 0 30px rgba(var(--p), 0.5)' : '0 10px 40px rgba(0,0,0,0.3)'
      }}
    >
      <SlidersHorizontal className="w-6 h-6" />
      {activeFiltersCount > 0 && (
        <>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-xs flex items-center justify-center text-white font-bold">
            {activeFiltersCount}
          </span>
          <span ref={pulseRef} className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full" />
        </>
      )}
    </button>
  );
}

// Filter Panel
function FilterPanel({
  isOpen,
  onClose,
  clusters,
  selectedCluster,
  onClusterSelect,
  searchQuery,
  onSearchChange,
  keywordFilters,
  onKeywordFilterChange,
  allKeywords,
}: {
  isOpen: boolean;
  onClose: () => void;
  clusters: ClusterInfo[];
  selectedCluster: number | null;
  onClusterSelect: (id: number | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  keywordFilters: string[];
  onKeywordFilterChange: (keywords: string[]) => void;
  allKeywords: string[];
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panelRef.current && contentRef.current) {
      if (isOpen) {
        gsap.to(panelRef.current, {
          x: 0,
          duration: 0.5,
          ease: 'power3.out'
        });
        gsap.fromTo(contentRef.current.children,
          { x: 50, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, delay: 0.2, ease: 'power2.out' }
        );
      } else {
        gsap.to(panelRef.current, {
          x: '100%',
          duration: 0.4,
          ease: 'power3.in'
        });
      }
    }
  }, [isOpen]);

  const toggleKeyword = (kw: string) => {
    if (keywordFilters.includes(kw)) {
      onKeywordFilterChange(keywordFilters.filter(k => k !== kw));
    } else {
      onKeywordFilterChange([...keywordFilters, kw]);
    }
  };

  const activeFiltersCount = (selectedCluster !== null ? 1 : 0) + keywordFilters.length + (searchQuery ? 1 : 0);

  return (
    <div
      ref={panelRef}
      className="fixed top-0 right-0 h-full w-96 bg-base-100 shadow-2xl z-50 transform translate-x-full border-l border-base-300"
    >
      <div ref={contentRef} className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-base-300 flex items-center justify-between bg-gradient-to-r from-base-100 to-base-200">
          <div>
            <h3 className="text-xl font-bold text-base-content flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filters
            </h3>
            <p className="text-sm text-base-content/60 mt-1">Refine your data view</p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square hover:rotate-90 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Search */}
          <div>
            <label className="text-sm font-semibold text-base-content mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="input input-bordered w-full pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-base-content/40 hover:text-base-content" />
                </button>
              )}
            </div>
          </div>

          {/* Job Families */}
          <div>
            <label className="text-sm font-semibold text-base-content mb-3 block">Job Families</label>
            <div className="space-y-2">
              <button
                onClick={() => onClusterSelect(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  selectedCluster === null 
                    ? 'bg-primary text-primary-content shadow-lg shadow-primary/30' 
                    : 'bg-base-200 hover:bg-base-300'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-current" />
                <span className="flex-1 text-left">All Families</span>
                {selectedCluster === null && <motion.span layoutId="check" className="text-lg">✓</motion.span>}
              </button>
              {clusters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onClusterSelect(c.id === selectedCluster ? null : c.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                    selectedCluster === c.id 
                      ? 'shadow-lg' 
                      : 'bg-base-200 hover:bg-base-300'
                  }`}
                  style={selectedCluster === c.id ? { backgroundColor: c.color, color: 'white' } : {}}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="flex-1 text-left truncate">{c.label}</span>
                  <span className="text-xs opacity-70">({c.size})</span>
                  {selectedCluster === c.id && <motion.span layoutId="check" className="text-lg">✓</motion.span>}
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          {allKeywords.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-base-content mb-3 block">
                Keywords
                {keywordFilters.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-base-content/60">
                    ({keywordFilters.length} selected)
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {allKeywords.slice(0, 30).map((kw) => {
                  const isSelected = keywordFilters.includes(kw);
                  const color = getKeywordColor(kw);
                  return (
                    <button
                      key={kw}
                      onClick={() => toggleKeyword(kw)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        isSelected 
                          ? 'text-white shadow-md scale-105' 
                          : 'bg-base-200 text-base-content/70 hover:bg-base-300'
                      }`}
                      style={isSelected ? { backgroundColor: color } : {}}
                    >
                      {kw}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-base-300 bg-base-200/50 space-y-3">
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-base-content/60">{activeFiltersCount} filter(s) active</span>
              <button
                onClick={() => {
                  onClusterSelect(null);
                  onSearchChange('');
                  onKeywordFilterChange([]);
                }}
                className="text-error hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="btn btn-primary w-full"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardView({
  jobs,
  clusters,
  selectedCluster,
  searchQuery,
  onSearchChange,
  onClusterSelect,
  onJobSelect,
}: DashboardViewProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [keywordFilters, setKeywordFilters] = useState<string[]>([]);
  const ITEMS_PER_PAGE = 15;

  // Get all unique keywords
  const allKeywords = useMemo(() => {
    const kwSet = new Set<string>();
    jobs.forEach(job => job.keywords.forEach(kw => kwSet.add(kw)));
    return Array.from(kwSet).sort();
  }, [jobs]);

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
        j.summary.toLowerCase().includes(query)
      );
    }

    if (keywordFilters.length > 0) {
      result = result.filter(j => 
        keywordFilters.some(kw => j.keywords.includes(kw))
      );
    }
    
    return result;
  }, [jobs, selectedCluster, searchQuery, keywordFilters]);

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJobs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  // Chart data
  const clusterData = useMemo(() => {
    return clusters
      .map(c => ({
        name: c.label || `Family ${c.id}`,
        count: c.size,
        color: c.color,
      }))
      .sort((a, b) => b.count - a.count);
  }, [clusters]);

  const keywordData = useMemo(() => {
    const keywords: Record<string, number> = {};
    filteredJobs.forEach(job => {
      job.keywords.forEach(kw => {
        keywords[kw] = (keywords[kw] || 0) + 1;
      });
    });
    return Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [filteredJobs]);

  const scatterData = useMemo(() => {
    return filteredJobs.map(j => ({
      x: j.x,
      y: j.y,
      id: j.id,
      title: j.title,
      color: j.color,
      cluster: j.cluster_id,
    }));
  }, [filteredJobs]);

  const pieData = useMemo(() => {
    return clusters.map(c => ({
      name: c.label || `Family ${c.id}`,
      value: c.size,
      color: c.color,
    }));
  }, [clusters]);

  // Stats
  const stats = {
    total: filteredJobs.length,
    families: new Set(filteredJobs.map(j => j.cluster_id)).size,
    avgSkills: (filteredJobs.reduce((acc, j) => acc + j.skills.length, 0) / filteredJobs.length || 0).toFixed(1),
    standardizable: clusters.filter(c => c.size > 20).length,
  };

  const activeFiltersCount = (selectedCluster !== null ? 1 : 0) + keywordFilters.length + (searchQuery ? 1 : 0);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCluster, keywordFilters]);

  // Table row animation
  const tableRef = useRef<HTMLTableSectionElement>(null);
  useEffect(() => {
    if (tableRef.current) {
      gsap.fromTo(tableRef.current.children,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.03, ease: 'power2.out' }
      );
    }
  }, [paginatedJobs]);

  return (
    <div className="h-full flex flex-col bg-base-200/50 overflow-hidden">
      {/* Floating Filter Button */}
      <FloatingFilterButton 
        isOpen={showFilters} 
        onClick={() => setShowFilters(!showFilters)}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        clusters={clusters}
        selectedCluster={selectedCluster}
        onClusterSelect={onClusterSelect}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        keywordFilters={keywordFilters}
        onKeywordFilterChange={setKeywordFilters}
        allKeywords={allKeywords}
      />

      {/* Overlay */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <header className="bg-base-100 border-b border-base-300 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-base-content">Dashboard</h1>
            <p className="text-sm text-base-content/60">Explore job families and positions</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-outline btn-sm gap-2 hover:scale-105 transition-transform">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Positions" value={stats.total.toLocaleString()} icon={FileText} subtext="Across all families" delay={0} />
            <StatCard label="Job Families" value={stats.families} icon={Users} delay={1} />
            <StatCard label="Avg Competencies" value={stats.avgSkills} icon={Target} delay={2} />
            <StatCard label="Standardizable" value={stats.standardizable} icon={BarChart3} subtext="Families with 20+ positions" delay={3} />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-2 gap-6">
            <ChartCard 
              title="Jobs by Family" 
              subtitle="Distribution of positions across families"
              onExpand={() => setExpandedChart('families')}
              delay={0}
            >
              <div className="min-h-[256px] h-64 relative">
                {clusterData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clusterData} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--bc) / 0.5)" fontSize={11} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="hsl(var(--bc) / 0.7)" 
                        width={70}
                        tick={{ fontSize: 11 }}
                      />
                      <RechartsTooltip 
                        cursor={{ fill: 'hsl(var(--b2))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--b1))', 
                          border: '1px solid hsl(var(--b3))', 
                          borderRadius: '0.5rem',
                          color: 'hsl(var(--bc))'
                        }}
                        labelStyle={{ color: 'hsl(var(--bc))' }}
                        itemStyle={{ color: 'hsl(var(--bc))' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                        {clusterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard 
              title="Top Keywords" 
              subtitle="Most frequent terms in position descriptions"
              onExpand={() => setExpandedChart('keywords')}
              delay={1}
            >
              <div className="min-h-[256px] h-64 relative">
                {keywordData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={keywordData} margin={{ bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--bc) / 0.5)" 
                        tick={{ fontSize: 10 }} 
                        angle={-35}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis stroke="hsl(var(--bc) / 0.5)" fontSize={11} />
                      <RechartsTooltip 
                        cursor={{ fill: 'hsl(var(--b2))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--b1))', 
                          border: '1px solid hsl(var(--b3))', 
                          borderRadius: '0.5rem',
                          color: 'hsl(var(--bc))'
                        }}
                        labelStyle={{ color: 'hsl(var(--bc))' }}
                        itemStyle={{ color: 'hsl(var(--bc))' }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--p))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-3 gap-6">
            {/* Scatter Plot */}
            <div className="col-span-2">
              <ChartCard 
                title="Position Landscape" 
                subtitle="Similarity-based 2D projection"
                onExpand={() => setExpandedChart('landscape')}
                delay={2}
              >
                <div className="min-h-[288px] h-72 relative">
                  {scatterData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" />
                        <XAxis type="number" dataKey="x" tick={false} axisLine={false} />
                        <YAxis type="number" dataKey="y" tick={false} axisLine={false} />
                        <ZAxis type="number" range={[20, 20]} />
                        <RechartsTooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload?.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-base-100 border border-base-300 rounded-lg p-2 shadow-lg text-xs" style={{ color: 'hsl(var(--bc))' }}>
                                  <p className="font-medium" style={{ color: 'hsl(var(--bc))' }}>{data.title}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter data={scatterData} onClick={(d) => {
                          const job = jobs.find(j => j.id === d.id);
                          if (job) onJobSelect(job);
                        }}>
                          {scatterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* Pie Chart */}
            <div>
              <ChartCard title="Distribution" subtitle="By job family" delay={3}>
                <div className="min-h-[288px] h-72 relative">
                  {pieData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData.slice(0, 6)}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.slice(0, 6).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--b1))', 
                            border: '1px solid hsl(var(--b3))', 
                            borderRadius: '0.5rem',
                            color: 'hsl(var(--bc))'
                          }} 
                          labelStyle={{ color: 'hsl(var(--bc))' }}
                          itemStyle={{ color: 'hsl(var(--bc))' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartCard>
            </div>
          </div>

          {/* Positions Table - Full Featured */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="card bg-base-100 border border-base-300 shadow-lg overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-base-300 flex items-center justify-between bg-gradient-to-r from-base-100 to-base-200/50">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-base-content">
                  {selectedCluster !== null 
                    ? (clusters.find(c => c.id === selectedCluster)?.label || 'Selected Family')
                    : 'All Positions'
                  }
                </h3>
                <span className="badge badge-lg badge-primary">
                  {filteredJobs.length} positions
                </span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      onClusterSelect(null);
                      onSearchChange('');
                      setKeywordFilters([]);
                    }}
                    className="text-sm text-error hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead className="bg-base-200/70">
                  <tr>
                    <th className="w-[30%]">Position</th>
                    <th className="w-[12%]">Family</th>
                    <th className="w-[25%]">Keywords</th>
                    <th className="w-[20%]">Skills</th>
                    <th className="w-[13%]"></th>
                  </tr>
                </thead>
                <tbody ref={tableRef}>
                  {paginatedJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-base-200/50 transition-colors group">
                      <td className="py-4">
                        <p className="font-semibold text-base-content group-hover:text-primary transition-colors">{job.title}</p>
                        <p className="text-xs text-base-content/50 mt-1 line-clamp-2">{job.summary}</p>
                      </td>
                      <td>
                        <span 
                          className="badge badge-md gap-1.5 whitespace-nowrap px-3 py-2"
                          style={{ 
                            backgroundColor: `${job.color}20`, 
                            color: job.color, 
                            borderColor: `${job.color}40` 
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: job.color }} />
                          Family {job.cluster_id}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {job.keywords.slice(0, 5).map((kw, i) => {
                            const color = getKeywordColor(kw);
                            return (
                              <span 
                                key={i} 
                                className="badge badge-sm text-white border-0"
                                style={{ backgroundColor: color }}
                              >
                                {kw}
                              </span>
                            );
                          })}
                          {job.keywords.length > 5 && (
                            <span className="badge badge-ghost badge-sm">
                              +{job.keywords.length - 5}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {job.skills.slice(0, 3).map((skill, i) => (
                            <span key={i} className="badge badge-outline badge-sm">
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 3 && (
                            <span className="badge badge-ghost badge-sm">
                              +{job.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => onJobSelect(job)}
                          className="btn btn-primary btn-sm opacity-80 group-hover:opacity-100 transition-all hover:scale-105"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {paginatedJobs.length === 0 && (
                <div className="p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-base-200 flex items-center justify-center">
                    <Search className="w-10 h-10 text-base-content/30" />
                  </div>
                  <p className="text-lg text-base-content/50 mb-2">No positions found</p>
                  <p className="text-sm text-base-content/40 mb-4">Try adjusting your filters</p>
                  <button
                    onClick={() => {
                      onClusterSelect(null);
                      onSearchChange('');
                      setKeywordFilters([]);
                    }}
                    className="btn btn-primary"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredJobs.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            )}
            {totalPages <= 1 && filteredJobs.length > 0 && (
              <div className="px-6 py-4 text-center text-sm text-base-content/50 border-t border-base-300 bg-base-200/30">
                Showing all {filteredJobs.length} positions
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Expanded Chart Modal */}
      <AnimatePresence>
        {expandedChart && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setExpandedChart(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 25 }}
              className="card bg-base-100 w-full max-w-5xl max-h-[80vh] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-base-300 flex items-center justify-between bg-gradient-to-r from-base-100 to-base-200">
                <h3 className="text-xl font-bold">
                  {expandedChart === 'families' && 'Jobs by Family'}
                  {expandedChart === 'keywords' && 'Top Keywords'}
                  {expandedChart === 'landscape' && 'Position Landscape'}
                </h3>
                <button 
                  onClick={() => setExpandedChart(null)}
                  className="btn btn-ghost btn-sm btn-square hover:rotate-90 transition-transform"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 h-[500px]">
                <p className="text-base-content/60 text-center">Expanded view placeholder</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
