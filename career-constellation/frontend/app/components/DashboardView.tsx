import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  GripVertical,
  LayoutGrid,
  Eye,
  EyeOff,
  RotateCcw,
  Settings2,
} from 'lucide-react';
import { JobPoint, ClusterInfo } from '@/types';

const KEYWORD_COLORS: Record<string, string> = {
  management: '#3b82f6', manager: '#3b82f6', lead: '#6366f1', director: '#8b5cf6', supervisor: '#a855f7',
  engineering: '#059669', engineer: '#059669', technical: '#10b981', systems: '#14b8a6', electrical: '#06b6d4', process: '#0891b2',
  operations: '#d97706', plant: '#f59e0b', site: '#fbbf24', logistics: '#f97316',
  emergency: '#dc2626', safety: '#ef4444', security: '#b91c1c', response: '#f87171',
  experience: '#64748b', ability: '#64748b', knowledge: '#64748b', team: '#ec4899',
  methanex: '#0ea5e9', railcars: '#84cc16', piping: '#22c55e', loading: '#eab308', human: '#f43f5e', resources: '#f43f5e',
};

function getKeywordColor(keyword: string): string {
  return KEYWORD_COLORS[keyword.toLowerCase()] || '#6b7280';
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

// WIDGET COMPONENTS - Each renders independently

function StatsWidget({ stats }: { stats: any }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) gsap.fromTo(ref.current.children, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 });
  }, []);

  const items = [
    { label: 'Total Positions', value: stats.total.toLocaleString(), icon: FileText, sub: 'Across families', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Job Families', value: stats.families, icon: Users, sub: 'Clusters', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Avg Competencies', value: stats.avgSkills, icon: Target, sub: 'Per position', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Standardizable', value: stats.standardizable, icon: BarChart3, sub: '20+ positions', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div ref={ref} className="grid grid-cols-4 gap-5">
      {items.map(item => (
        <div key={item.label} className="card bg-base-100 border border-base-300 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-base-content/60">{item.label}</p>
              <p className="text-3xl font-bold">{item.value}</p>
              <p className="text-xs text-base-content/40 mt-1">{item.sub}</p>
            </div>
            <div className={`p-3 rounded-xl ${item.bg}`}><item.icon className={`w-6 h-6 ${item.color}`} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children, onExpand }: any) {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm" style={{ height: '280px' }}>
      <div className="px-4 py-3 border-b border-base-300 flex justify-between items-center">
        <div><h3 className="font-semibold">{title}</h3>{subtitle && <p className="text-xs text-base-content/60">{subtitle}</p>}</div>
        {onExpand && <button onClick={onExpand} className="btn btn-ghost btn-sm btn-square"><Maximize2 className="w-4 h-4" /></button>}
      </div>
      <div className="p-3" style={{ height: '220px' }}>{children}</div>
    </div>
  );
}

function ChartsWidget({ clusterData, keywordData, pieData, onExpand }: any) {
  return (
    <div className="grid grid-cols-3 gap-5">
      <ChartCard title="Jobs by Family" subtitle="Distribution" onExpand={() => onExpand('families')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={clusterData} layout="vertical" margin={{ left: 80, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" horizontal={false} />
            <XAxis type="number" stroke="hsl(var(--bc) / 0.5)" fontSize={10} tickLine={false} />
            <YAxis dataKey="name" type="category" stroke="hsl(var(--bc) / 0.7)" width={70} tick={{ fontSize: 10 }} tickLine={false} />
            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--b1))', border: '1px solid hsl(var(--b3))', borderRadius: '0.5rem' }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>{clusterData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top Keywords" subtitle="Most frequent" onExpand={() => onExpand('keywords')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={keywordData} margin={{ bottom: 40, left: 5, right: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(var(--bc) / 0.5)" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={45} interval={0} tickLine={false} />
            <YAxis stroke="hsl(var(--bc) / 0.5)" fontSize={10} tickLine={false} />
            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--b1))', border: '1px solid hsl(var(--b3))', borderRadius: '0.5rem' }} />
            <Bar dataKey="count" fill="hsl(var(--p))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Distribution" subtitle="By family">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData.slice(0, 6)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {pieData.slice(0, 6).map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--b1))', border: '1px solid hsl(var(--b3))', borderRadius: '0.5rem' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function LandscapeWidget({ scatterData, jobs, onJobSelect, onExpand }: any) {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm" style={{ height: '380px' }}>
      <div className="px-5 py-4 border-b border-base-300 flex justify-between items-center">
        <div><h3 className="font-semibold">Position Landscape</h3><p className="text-sm text-base-content/60">2D projection</p></div>
        <button onClick={() => onExpand('landscape')} className="btn btn-ghost btn-sm btn-square"><Maximize2 className="w-4 h-4" /></button>
      </div>
      <div className="p-4" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" />
            <XAxis type="number" dataKey="x" tick={{ fontSize: 10 }} stroke="hsl(var(--bc) / 0.4)" tickLine={false} label={{ value: 'Dimension 1', position: 'insideBottom', offset: -25, fill: 'hsl(var(--bc) / 0.6)', fontSize: 11 }} />
            <YAxis type="number" dataKey="y" tick={{ fontSize: 10 }} stroke="hsl(var(--bc) / 0.4)" tickLine={false} label={{ value: 'Dimension 2', angle: -90, position: 'insideLeft', fill: 'hsl(var(--bc) / 0.6)', fontSize: 11 }} />
            <ZAxis type="number" range={[25, 25]} />
            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => active && payload?.length ? <div className="bg-base-100 border border-base-300 rounded-lg p-3 shadow-xl"><p className="font-semibold text-sm">{payload[0].payload.title}</p></div> : null} />
            <Scatter data={scatterData} onClick={(d: any) => { const job = jobs.find((j: JobPoint) => j.id === d.id); if (job) onJobSelect(job); }}>{scatterData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}</Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TableWidget({ paginatedJobs, filteredJobs, totalPages, currentPage, setCurrentPage, onJobSelect, selectedCluster, clusters, activeFiltersCount, onClearFilters }: any) {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-base-300 flex items-center justify-between bg-gradient-to-r from-base-100 to-base-200/30">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold">{selectedCluster !== null ? (clusters.find((c: ClusterInfo) => c.id === selectedCluster)?.label || 'Selected') : 'All Positions'}</h3>
          <span className="badge badge-lg badge-primary">{filteredJobs.length} positions</span>
          {activeFiltersCount > 0 && <button onClick={onClearFilters} className="text-sm text-error hover:underline">Clear all</button>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead className="bg-base-200/70 text-sm">
            <tr><th className="w-[40%] py-3">Position</th><th className="w-[10%]">Family</th><th className="w-[22%]">Keywords</th><th className="w-[16%]">Skills</th><th className="w-[12%]"></th></tr>
          </thead>
          <tbody>
            {paginatedJobs.map((job: JobPoint) => (
              <tr key={job.id} className="hover:bg-base-200/50 transition-colors group">
                <td className="py-3"><p className="font-semibold text-sm group-hover:text-primary transition-colors">{job.title}</p><p className="text-xs text-base-content/50 line-clamp-1">{job.summary}</p></td>
                <td><span className="badge badge-sm gap-1 whitespace-nowrap px-2 py-1" style={{ backgroundColor: `${job.color}20`, color: job.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: job.color }} />Family {job.cluster_id}</span></td>
                <td><div className="flex flex-wrap gap-1">{job.keywords.slice(0, 4).map((kw: string, i: number) => <span key={i} className="badge badge-xs text-white border-0" style={{ backgroundColor: getKeywordColor(kw) }}>{kw}</span>)}{job.keywords.length > 4 && <span className="badge badge-ghost badge-xs">+{job.keywords.length - 4}</span>}</div></td>
                <td><div className="flex flex-wrap gap-1">{job.skills.slice(0, 2).map((s: string, i: number) => <span key={i} className="badge badge-outline badge-xs">{s}</span>)}{job.skills.length > 2 && <span className="badge badge-ghost badge-xs">+{job.skills.length - 2}</span>}</div></td>
                <td className="text-right"><button onClick={() => onJobSelect(job)} className="btn btn-primary btn-sm whitespace-nowrap">View Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-base-300 bg-base-200/30">
          <span className="text-sm text-base-content/60">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="btn btn-ghost btn-xs btn-square"><ChevronsLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="btn btn-ghost btn-xs btn-square"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="btn btn-ghost btn-xs btn-square"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="btn btn-ghost btn-xs btn-square"><ChevronsRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// Filter Panel Component
function FilterPanel({ isOpen, onClose, clusters, selectedCluster, onClusterSelect, searchQuery, onSearchChange, keywordFilters, onKeywordFilterChange, allKeywords }: any) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (panelRef.current) gsap.to(panelRef.current, { x: isOpen ? 0 : '100%', duration: 0.3, ease: 'power3.out' }); }, [isOpen]);
  const toggleKeyword = (kw: string) => onKeywordFilterChange(keywordFilters.includes(kw) ? keywordFilters.filter((k: string) => k !== kw) : [...keywordFilters, kw]);
  const activeCount = (selectedCluster !== null ? 1 : 0) + keywordFilters.length + (searchQuery ? 1 : 0);

  return (
    <div ref={panelRef} className="fixed top-0 right-0 h-full w-96 bg-base-100 shadow-2xl z-50 transform translate-x-full border-l border-base-300 flex flex-col">
      <div className="p-6 border-b border-base-300 flex justify-between items-center"><h3 className="text-xl font-bold flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" />Filters</h3><button onClick={onClose} className="btn btn-ghost btn-sm btn-square"><X className="w-5 h-5" /></button></div>
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div>
          <label className="text-sm font-semibold mb-2 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input type="text" placeholder="Search positions..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="input input-bordered w-full pl-10 text-sm" />
            {searchQuery && <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4" /></button>}
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold mb-3 block">Job Families</label>
          <div className="space-y-2">
            <button onClick={() => onClusterSelect(null)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${selectedCluster === null ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`}><span className="w-2.5 h-2.5 rounded-full bg-current" /><span className="flex-1 text-left">All Families</span></button>
            {clusters.map((c: ClusterInfo) => (
              <button key={c.id} onClick={() => onClusterSelect(c.id === selectedCluster ? null : c.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${selectedCluster === c.id ? 'text-white' : 'bg-base-200 hover:bg-base-300'}`} style={selectedCluster === c.id ? { backgroundColor: c.color } : {}}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} /><span className="flex-1 text-left truncate">{c.label}</span><span className="text-xs opacity-70">{c.size}</span>
              </button>
            ))}
          </div>
        </div>
        {allKeywords.length > 0 && (
          <div>
            <label className="text-sm font-semibold mb-3 block">Keywords {keywordFilters.length > 0 && `(${keywordFilters.length})`}</label>
            <div className="flex flex-wrap gap-2">
              {allKeywords.slice(0, 25).map((kw: string) => {
                const isSelected = keywordFilters.includes(kw);
                return <button key={kw} onClick={() => toggleKeyword(kw)} className={`px-2.5 py-1 rounded-full text-xs transition-all ${isSelected ? 'text-white' : 'bg-base-200 hover:bg-base-300'}`} style={isSelected ? { backgroundColor: getKeywordColor(kw) } : {}}>{kw}</button>;
              })}
            </div>
          </div>
        )}
      </div>
      <div className="p-6 border-t border-base-300 bg-base-200/30">
        {activeCount > 0 && <button onClick={() => { onClusterSelect(null); onSearchChange(''); onKeywordFilterChange([]); }} className="text-error text-sm hover:underline mb-3 block">Clear all filters</button>}
        <button onClick={onClose} className="btn btn-primary w-full">Apply</button>
      </div>
    </div>
  );
}

// Draggable Row Wrapper
function SortableDashboardRow({ id, isEditMode, onToggleVisibility, visible, children }: { id: string; isEditMode: boolean; onToggleVisibility: (id: string) => void; visible: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isEditMode });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isEditMode && (
        <>
          <button {...attributes} {...listeners} className="absolute -top-3 -left-12 z-50 btn btn-circle btn-sm btn-primary shadow-xl cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4" />
          </button>
          <button onClick={() => onToggleVisibility(id)} className={`absolute -top-3 -right-3 z-50 btn btn-circle btn-sm shadow-xl ${visible ? 'btn-ghost bg-base-100' : 'btn-error'}`}>
            {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          {visible && <div className="absolute inset-0 border-2 border-primary rounded-2xl pointer-events-none" />}
        </>
      )}
      <div className={isEditMode && !visible ? 'opacity-30 grayscale' : ''}>
        {children}
      </div>
    </div>
  );
}

// Floating Controls
function FloatingControls({ isEditMode, onToggleEdit, onOpenFilters, activeFiltersCount, onReset }: any) {
  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-3">
      <button onClick={onToggleEdit} className={`btn btn-circle btn-lg shadow-2xl transition-all ${isEditMode ? 'btn-primary' : 'btn-neutral hover:btn-primary'}`}>{isEditMode ? <X className="w-6 h-6" /> : <LayoutGrid className="w-6 h-6" />}</button>
      {!isEditMode && (
        <>
          <button onClick={onOpenFilters} className="btn btn-circle btn-lg btn-neutral hover:btn-primary shadow-2xl relative"><SlidersHorizontal className="w-6 h-6" />{activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-xs flex items-center justify-center text-white font-bold">{activeFiltersCount}</span>}</button>
          <button onClick={onReset} className="btn btn-circle btn-neutral hover:btn-error shadow-2xl"><RotateCcw className="w-5 h-5" /></button>
        </>
      )}
    </div>
  );
}

// MAIN DASHBOARD COMPONENT
export default function DashboardView({ jobs, clusters, selectedCluster, searchQuery, onSearchChange, onClusterSelect, onJobSelect }: DashboardViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [keywordFilters, setKeywordFilters] = useState<string[]>([]);
  
  // Widget visibility state - ALL VISIBLE BY DEFAULT
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>({
    stats: true,
    charts: true,
    landscape: true,
    table: true,
  });
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 12;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Widget order state
  const [widgetOrder, setWidgetOrder] = useState<string[]>(['stats', 'charts', 'landscape', 'table']);

  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(e.active.id as string), []);
  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (over && active.id !== over.id) {
      setWidgetOrder(items => {
        const oldIdx = items.indexOf(active.id as string);
        const newIdx = items.indexOf(over.id as string);
        return arrayMove(items, oldIdx, newIdx);
      });
    }
  }, []);

  const toggleVisibility = (id: string) => setWidgetVisibility(prev => ({ ...prev, [id]: !prev[id] }));
  const resetAll = () => {
    setWidgetVisibility({ stats: true, charts: true, landscape: true, table: true });
    setWidgetOrder(['stats', 'charts', 'landscape', 'table']);
    setKeywordFilters([]);
    onClusterSelect(null);
    onSearchChange('');
  };

  // Data computations
  const allKeywords = useMemo(() => { const kwSet = new Set<string>(); jobs.forEach(j => j.keywords.forEach(kw => kwSet.add(kw))); return Array.from(kwSet).sort(); }, [jobs]);

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (selectedCluster !== null) result = result.filter(j => j.cluster_id === selectedCluster);
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter(j => j.title.toLowerCase().includes(q) || j.summary.toLowerCase().includes(q)); }
    if (keywordFilters.length > 0) result = result.filter(j => keywordFilters.some(kw => j.keywords.includes(kw)));
    return result;
  }, [jobs, selectedCluster, searchQuery, keywordFilters]);

  useEffect(() => setCurrentPage(1), [searchQuery, selectedCluster, keywordFilters]);

  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = useMemo(() => { const start = (currentPage - 1) * ITEMS_PER_PAGE; return filteredJobs.slice(start, start + ITEMS_PER_PAGE); }, [filteredJobs, currentPage]);

  const clusterData = useMemo(() => clusters.map(c => ({ name: c.label || `Family ${c.id}`, count: c.size, color: c.color })).sort((a, b) => b.count - a.count), [clusters]);
  const keywordData = useMemo(() => { const kws: Record<string, number> = {}; filteredJobs.forEach(j => j.keywords.forEach(kw => kws[kw] = (kws[kw] || 0) + 1)); return Object.entries(kws).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })); }, [filteredJobs]);
  const scatterData = useMemo(() => filteredJobs.map(j => ({ x: j.x, y: j.y, id: j.id, title: j.title, color: j.color, cluster: j.cluster_id })), [filteredJobs]);
  const pieData = useMemo(() => clusters.map(c => ({ name: c.label || `Family ${c.id}`, value: c.size, color: c.color })), [clusters]);

  const stats = { total: filteredJobs.length, families: new Set(filteredJobs.map(j => j.cluster_id)).size, avgSkills: (filteredJobs.reduce((acc, j) => acc + j.skills.length, 0) / filteredJobs.length || 0).toFixed(1), standardizable: clusters.filter(c => c.size > 20).length };
  const activeFiltersCount = (selectedCluster !== null ? 1 : 0) + keywordFilters.length + (searchQuery ? 1 : 0);

  // Get visible widgets in order
  const visibleWidgetIds = isEditMode ? widgetOrder : widgetOrder.filter(id => widgetVisibility[id]);

  const renderWidget = (id: string) => {
    switch (id) {
      case 'stats': return <StatsWidget stats={stats} />;
      case 'charts': return <ChartsWidget clusterData={clusterData} keywordData={keywordData} pieData={pieData} onExpand={setExpandedChart} />;
      case 'landscape': return <LandscapeWidget scatterData={scatterData} jobs={jobs} onJobSelect={onJobSelect} onExpand={setExpandedChart} />;
      case 'table': return <TableWidget paginatedJobs={paginatedJobs} filteredJobs={filteredJobs} totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} onJobSelect={onJobSelect} selectedCluster={selectedCluster} clusters={clusters} activeFiltersCount={activeFiltersCount} onClearFilters={() => { onClusterSelect(null); onSearchChange(''); setKeywordFilters([]); }} />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-base-200/50 overflow-hidden">
      <FloatingControls isEditMode={isEditMode} onToggleEdit={() => setIsEditMode(!isEditMode)} onOpenFilters={() => setShowFilters(true)} activeFiltersCount={activeFiltersCount} onReset={resetAll} />
      <FilterPanel isOpen={showFilters} onClose={() => setShowFilters(false)} clusters={clusters} selectedCluster={selectedCluster} onClusterSelect={onClusterSelect} searchQuery={searchQuery} onSearchChange={onSearchChange} keywordFilters={keywordFilters} onKeywordFilterChange={setKeywordFilters} allKeywords={allKeywords} />
      <AnimatePresence>{showFilters && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowFilters(false)} />}</AnimatePresence>

      <header className="bg-base-100 border-b border-base-300 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-base-content/60">{isEditMode ? 'Drag to reorder • Toggle visibility' : 'Explore job families and positions'}</p>
          </div>
          {!isEditMode && <button className="btn btn-outline btn-sm gap-2"><Download className="w-4 h-4" />Export</button>}
        </div>
      </header>

      <div className={`flex-1 overflow-auto p-6 ${isEditMode ? 'pl-16' : 'pl-6'}`}>
        <div className="max-w-[1600px] mx-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleWidgetIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-6">
                {visibleWidgetIds.map(id => (
                  <SortableDashboardRow key={id} id={id} isEditMode={isEditMode} onToggleVisibility={toggleVisibility} visible={widgetVisibility[id]}>
                    {renderWidget(id)}
                  </SortableDashboardRow>
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
              {activeId ? <div className="opacity-50"><div className="card bg-base-100 border-2 border-primary p-8 text-center font-semibold">Moving...</div></div> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <AnimatePresence>
        {expandedChart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setExpandedChart(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card bg-base-100 w-full max-w-5xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-base-300 flex justify-between items-center"><h3 className="text-xl font-bold">{expandedChart === 'families' ? 'Jobs by Family' : expandedChart === 'keywords' ? 'Top Keywords' : 'Position Landscape'}</h3><button onClick={() => setExpandedChart(null)} className="btn btn-ghost btn-sm btn-square"><X className="w-5 h-5" /></button></div>
              <div className="p-6 h-[500px] flex items-center justify-center text-base-content/50">Expanded view</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
