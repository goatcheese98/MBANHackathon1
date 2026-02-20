import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
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
  rectSortingStrategy,
  horizontalListSortingStrategy,
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
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { JobPoint, ClusterInfo } from '@/types';

// ─── Widget Config System ────────────────────────────────────────────────────

interface WidgetConfig {
  id: string;
  visible: boolean;
  cols: 4 | 6 | 8 | 12;
  locked?: boolean;
  hideResize?: boolean;
}

const STORAGE_KEY = 'dashboard-widget-configs';

const DEFAULT_CONFIGS: WidgetConfig[] = [
  { id: 'stats',             visible: true, cols: 12, hideResize: true },
  { id: 'familyChart',       visible: true, cols: 12 },
  { id: 'keywordsChart',     visible: true, cols: 12 },
  { id: 'landscape',         visible: true, cols: 12 },
  { id: 'distributionChart', visible: true, cols: 12 },
  { id: 'table',             visible: true, cols: 12, locked: true },
];

// Load configs from localStorage or use defaults
const loadConfigs = (): WidgetConfig[] => {
  if (typeof window === 'undefined') return DEFAULT_CONFIGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new widgets
      const merged = DEFAULT_CONFIGS.map(defaultConfig => {
        const savedConfig = parsed.find((c: WidgetConfig) => c.id === defaultConfig.id);
        return savedConfig ? { ...defaultConfig, ...savedConfig } : defaultConfig;
      });
      return merged;
    }
  } catch (e) {
    console.error('Failed to load widget configs:', e);
  }
  return DEFAULT_CONFIGS;
};

const WIDGET_TITLES: Record<string, string> = {
  stats:             'Overview Stats',
  familyChart:       'Jobs by Family',
  keywordsChart:     'Top Keywords',
  distributionChart: 'Job Level Distribution',
  landscape:         'Position Landscape',
  table:             'All Positions',
};

// ─── Colour helpers ──────────────────────────────────────────────────────────

// Gradient palette for the top-5 most-frequent global keywords (rank 0→4)
const TOP5_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c026d3', '#db2777'];
const KEYWORD_NEUTRAL = '#6b7280';

function getKeywordColor(keyword: string, top5: string[]): string {
  const idx = top5.indexOf(keyword.toLowerCase());
  return idx >= 0 ? TOP5_COLORS[idx] : KEYWORD_NEUTRAL;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface DashboardViewProps {
  jobs: JobPoint[];
  clusters: ClusterInfo[];
  selectedClusters: number[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClustersSelect: (clusterIds: number[]) => void;
  onJobSelect: (job: JobPoint) => void;
}

// ─── Stats Widget — individual cards are draggable within their container ────

const STAT_ITEMS = [
  { id: 'total',          label: 'Total Positions',  icon: FileText,  sub: 'Full workforce',          color: 'text-primary',    bg: 'bg-primary/10'   },
  { id: 'families',       label: 'Job Families',     icon: Users,     sub: 'Distinct clusters',       color: 'text-primary',    bg: 'bg-primary/10'   },
  { id: 'avgSkills',      label: 'Avg Competencies', icon: Target,    sub: 'Per position (filtered)', color: 'text-primary',    bg: 'bg-primary/10'   },
  { id: 'avgSeniority',    label: 'Avg Seniority Score', icon: BarChart3, sub: 'Filtered positions',      color: 'text-primary',    bg: 'bg-primary/10'   },
];

function SortableStatCard({ id, item, value, isEditMode }: { id: string; item: typeof STAT_ITEMS[0]; value: string | number; isEditMode: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isEditMode });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="card bg-base-100 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 relative border-0">
      {isEditMode && (
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 p-1 rounded cursor-grab active:cursor-grabbing text-base-content/30 hover:text-primary transition-colors"
          title="Drag to reorder card"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
      <div className={`flex items-start justify-between ${isEditMode ? 'pl-5' : ''}`}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">{item.label}</p>
          <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
          <p className="text-xs text-base-content/40 mt-1.5 font-medium">{item.sub}</p>
        </div>
        <div className={`p-3 rounded-2xl ${item.bg} shadow-sm`}><item.icon className={`w-6 h-6 ${item.color}`} /></div>
      </div>
    </div>
  );
}

function StatsWidget({ stats, isEditMode }: { stats: any; isEditMode: boolean }) {
  const statValues: Record<string, string | number> = {
    total:          stats.total.toLocaleString(),
    families:       stats.families,
    avgSkills:      stats.avgSkills,
    avgSeniority:   stats.avgSeniority,
  };

  const [cardOrder, setCardOrder] = useState(STAT_ITEMS.map(i => i.id));
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const cardSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const orderedItems = cardOrder.map(id => STAT_ITEMS.find(i => i.id === id)!);

  const handleCardDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    setActiveCardId(null);
    if (over && active.id !== over.id) {
      setCardOrder(order => {
        const oldIdx = order.indexOf(active.id as string);
        const newIdx = order.indexOf(over.id as string);
        return arrayMove(order, oldIdx, newIdx);
      });
    }
  }, []);

  return (
    <DndContext
      sensors={cardSensors}
      collisionDetection={closestCenter}
      onDragStart={(e: DragStartEvent) => setActiveCardId(e.active.id as string)}
      onDragEnd={handleCardDragEnd}
    >
      <SortableContext items={cardOrder} strategy={horizontalListSortingStrategy}>
        <div className="grid grid-cols-4 gap-5">
          {orderedItems.map(item => (
            <SortableStatCard key={item.id} id={item.id} item={item} value={statValues[item.id]} isEditMode={isEditMode} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
        {activeCardId ? (
          <div className="card bg-base-100 border-2 border-primary shadow-2xl p-6 opacity-90">
            <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
              {STAT_ITEMS.find(i => i.id === activeCardId)?.label}
            </p>
            <p className="text-3xl font-bold mt-1">{statValues[activeCardId]}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ─── Chart Card Shell ────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children, onExpand, tall }: any) {
  const height = tall ? 440 : 400;
  const contentHeight = tall ? 376 : 340;
  return (
    <div className="card bg-base-100 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300" style={{ height: `${height}px` }}>
      <div className="px-5 py-4 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-base-content/50 mt-0.5">{subtitle}</p>}
        </div>
        {onExpand && (
          <button onClick={onExpand} className="btn btn-ghost btn-sm btn-square">
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-4" style={{ height: `${contentHeight}px` }}>{children}</div>
    </div>
  );
}

// ─── Chart Tooltip Hook ───────────────────────────────────────────────────────

function useChartTooltip() {
  const [tooltip, setTooltip] = useState<{show: boolean, text: string, subtext?: string}>({ show: false, text: '' });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const posRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const COMPANY_BLUE = '#1B75BC';
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const updatePos = () => {
      if (tooltipRef.current) {
        tooltipRef.current.style.transform = `translate3d(${posRef.current.x + 12}px, ${posRef.current.y - 35}px, 0)`;
      }
      rafRef.current = undefined;
    };
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      posRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (!rafRef.current) rafRef.current = requestAnimationFrame(updatePos);
    };
    const onLeave = () => {
      // Hide tooltip immediately when leaving the container
      setTooltip(t => ({ ...t, show: false }));
    };
    const el = containerRef.current;
    if (el) {
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      return () => { 
        el.removeEventListener('mousemove', onMove); 
        el.removeEventListener('mouseleave', onLeave);
        if (rafRef.current) cancelAnimationFrame(rafRef.current); 
      };
    }
  }, []);

  // Clear any pending hide timeouts on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const showTooltip = (text: string, subtext?: string) => {
    // Clear any pending hide to prevent stale tooltips
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setTooltip({ show: true, text, subtext });
  };
  
  const hideTooltip = () => {
    // Small delay to allow moving between bars without flickering
    hideTimeoutRef.current = setTimeout(() => {
      setTooltip(t => ({ ...t, show: false }));
    }, 50);
  };

  const TooltipEl = tooltip.show ? (
    <div key={`${tooltip.text}-${tooltip.subtext}`} ref={tooltipRef} className="absolute z-50 pointer-events-none rounded-lg px-3 py-2 shadow-2xl" style={{ left: 0, top: 0, backgroundColor: COMPANY_BLUE, color: 'white' }}>
      <p className="font-semibold text-sm whitespace-nowrap">{tooltip.text}</p>
      {tooltip.subtext && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>{tooltip.subtext}</p>}
    </div>
  ) : null;

  return { containerRef, showTooltip, hideTooltip, TooltipEl };
}

// ─── Draggable Bubble Chart Component ─────────────────────────────────────────

interface BubbleNode extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  count: number;
  color: string;
  radius: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

function DraggableBubbleChart({ clusterData, width, height }: { clusterData: any[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<BubbleNode | null>(null);
  
  // Detect dark mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.getAttribute('data-theme') === 'dark' ||
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
    });
    
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    
    // Also listen to media query changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!document.documentElement.hasAttribute('data-theme')) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  // Text color based on dark mode
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  
  // Find max count for scaling
  const maxCount = useMemo(() => Math.max(...clusterData.map(d => d.count)), [clusterData]);
  const minCount = useMemo(() => Math.min(...clusterData.map(d => d.count)), [clusterData]);
  
  // Scale radius between 25 and 90 based on count
  const radiusScale = useMemo(() => {
    return d3.scaleSqrt()
      .domain([minCount, maxCount])
      .range([25, 90]);
  }, [minCount, maxCount]);

  // Prepare nodes
  const nodes: BubbleNode[] = useMemo(() => {
    return clusterData.map((cluster, i) => ({
      id: i,
      name: cluster.name,
      count: cluster.count,
      color: cluster.color,
      radius: radiusScale(cluster.count),
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
    }));
  }, [clusterData, radiusScale, width, height]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create simulation with bounds (slower animation for better visibility)
    const simulation = d3.forceSimulation<BubbleNode>(nodes)
      .force('charge', d3.forceManyBody().strength(5))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<BubbleNode>().radius(d => d.radius + 2).strength(0.8))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))
      .alphaDecay(0.02)  // Slower decay = longer animation
      .velocityDecay(0.3);  // More damping = smoother movement

    // Constrain bubbles within container bounds
    const constrainBounds = (d: BubbleNode) => {
      const padding = d.radius + 5;
      d.x = Math.max(padding, Math.min(width - padding, d.x || width / 2));
      d.y = Math.max(padding, Math.min(height - padding, d.y || height / 2));
    };

    // Create bubble groups
    const bubbleGroups = svg.selectAll('.bubble-group')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'bubble-group')
      .style('cursor', 'grab');

    // Add circles
    const circles = bubbleGroups
      .append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.85)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 1);

    // Add labels for larger bubbles - adaptive text color
    const labels = bubbleGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('pointer-events', 'none')
      .style('font-size', d => Math.min(d.radius / 3.5, 11) + 'px')
      .style('font-weight', '700')
      .style('fill', textColor)
      .style('text-shadow', 'none')
      .each(function(d) {
        const text = d3.select(this);
        const words = d.name.split(/\s+/);
        const lineHeight = Math.min(d.radius / 3.5, 11) * 1.3;
        
        // Only show label if bubble is large enough (lowered threshold for better visibility)
        if (d.radius < 20) {
          text.text('');
          return;
        }
        
        // Truncate text if too long
        let truncated = d.name;
        if (d.name.length > d.radius / 2) {
          truncated = d.name.substring(0, Math.floor(d.radius / 2.5)) + '...';
        }
        
        // Simple multi-line for larger bubbles
        if (d.radius >= 45 && words.length > 2) {
          const mid = Math.ceil(words.length / 2);
          text.append('tspan')
            .attr('x', 0)
            .attr('dy', -lineHeight / 2)
            .text(words.slice(0, mid).join(' '));
          text.append('tspan')
            .attr('x', 0)
            .attr('dy', lineHeight)
            .text(words.slice(mid).join(' '));
        } else {
          text.text(truncated);
        }
      });

    // Add count labels for medium+ bubbles - adaptive text color
    const countLabels = bubbleGroups
      .filter(d => d.radius >= 40)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('dy', d => Math.min(d.radius / 3.5, 11) * 1.3)
      .style('pointer-events', 'none')
      .style('font-size', d => Math.min(d.radius / 5, 9) + 'px')
      .style('font-weight', '600')
      .style('fill', textColor)
      .style('text-shadow', 'none')
      .text(d => `${d.count} jobs`);

    // Drag behavior
    const drag = d3.drag<SVGGElement, BubbleNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(event.sourceEvent.target.parentNode).style('cursor', 'grabbing');
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        d3.select(event.sourceEvent.target.parentNode).style('cursor', 'grab');
      });

    bubbleGroups.call(drag as any);

    // Hover effects
    bubbleGroups
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        d3.select(event.currentTarget).select('circle')
          .transition().duration(150)
          .attr('fill-opacity', 1)
          .attr('stroke-width', 4);
      })
      .on('mouseleave', (event, d) => {
        setHoveredNode(null);
        d3.select(event.currentTarget).select('circle')
          .transition().duration(150)
          .attr('fill-opacity', 0.85)
          .attr('stroke-width', 2);
      });

    // Update positions on tick with bounds checking
    simulation.on('tick', () => {
      nodes.forEach(constrainBounds);
      bubbleGroups
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, width, height, textColor]);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} width={width} height={height} className="overflow-visible" />
      {hoveredNode && (
        <div 
          className="absolute pointer-events-none bg-base-100 border border-base-300 rounded-lg px-3 py-2 shadow-xl z-10"
          style={{
            left: (hoveredNode.x || 0) + hoveredNode.radius + 10,
            top: (hoveredNode.y || 0) - 20,
          }}
        >
          <p className="font-semibold text-sm">{hoveredNode.name}</p>
          <p className="text-sm text-base-content/70">{hoveredNode.count} positions</p>
        </div>
      )}
    </div>
  );
}

// ─── Individual Chart Widgets ─────────────────────────────────────────────────

function FamilyChartWidget({ clusterData, onExpand }: { clusterData: any[]; onExpand: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    // Initial measurement
    updateDimensions();
    
    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <ChartCard title="Jobs by Family" subtitle={`${clusterData.length} families`} onExpand={onExpand} tall>
      <div ref={containerRef} className="w-full h-full">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <DraggableBubbleChart 
            clusterData={clusterData} 
            width={dimensions.width} 
            height={dimensions.height} 
          />
        )}
      </div>
    </ChartCard>
  );
}

function KeywordsChartWidget({ keywordData, onExpand }: { keywordData: any[]; onExpand: () => void }) {
  const { containerRef, showTooltip, hideTooltip, TooltipEl } = useChartTooltip();
  const COMPANY_BLUE = '#1B75BC';
  return (
    <ChartCard title="Top Keywords" subtitle="Most frequent terms in position descriptions" onExpand={onExpand} tall>
      <div ref={containerRef} className="relative w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={keywordData} layout="vertical" margin={{ left: 10, right: 40, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" horizontal={false} />
            <XAxis type="number" stroke="#6b7280" tick={{ fill: 'currentColor', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#6b7280' }} />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#6b7280"
              width={110}
              tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#6b7280' }}
            />
            <RechartsTooltip content={() => null} />
            <Bar
              dataKey="count"
              fill={COMPANY_BLUE}
              radius={[0, 4, 4, 0]}
              barSize={18}
              label={{ position: 'right', fontSize: 10, fill: 'currentColor' }}
              onMouseEnter={(data: any) => showTooltip(data.name, `Appears in ${data.count} positions`)}
              onMouseLeave={hideTooltip}
            />
          </BarChart>
        </ResponsiveContainer>
        {TooltipEl}
      </div>
    </ChartCard>
  );
}

// Fixed color palette for known job levels
const JOB_LEVEL_COLORS: Record<string, string> = {
  'Junior':       '#22c55e',
  'Mid':          '#3b82f6',
  'Senior':       '#6366f1',
  'Lead':         '#a855f7',
  'Manager':      '#f59e0b',
  'Director':     '#ef4444',
  'Executive':    '#1e293b',
  'Unclassified': '#94a3b8',
};
function jobLevelColor(level: string): string {
  return JOB_LEVEL_COLORS[level] ?? '#cbd5e1';
}

function JobLevelDistributionWidget({ levelData }: { levelData: { name: string; value: number; color: string }[] }) {
  const { containerRef, showTooltip, hideTooltip, TooltipEl } = useChartTooltip();
  const total = levelData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm" style={{ height: '440px' }}>
      <div className="px-5 py-3.5 border-b border-base-300">
        <h3 className="font-semibold text-sm">Job Level Distribution</h3>
        <p className="text-xs text-base-content/50 mt-0.5">Seniority breakdown · {total} positions</p>
      </div>
      <div className="flex flex-col" style={{ height: '376px' }}>
        {/* Donut */}
        <div ref={containerRef} className="relative flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={levelData}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={96}
                paddingAngle={2}
                dataKey="value"
                label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                isAnimationActive={false}
              >
                {levelData.map((e, i) => (
                  <Cell
                    key={i}
                    fill={e.color}
                    onMouseEnter={() => showTooltip(e.name, `${e.value} of ${total} positions (${((e.value / total) * 100).toFixed(1)}%)`)}
                    onMouseLeave={hideTooltip}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {TooltipEl}
        </div>
        {/* Legend */}
        <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1.5" style={{ maxHeight: '148px', overflowY: 'auto' }}>
          {levelData.map((e, i) => (
            <div key={i} className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
              <span className="text-[11px] text-base-content/70 truncate flex-1" title={e.name}>{e.name}</span>
              <span className="text-[11px] font-semibold text-base-content/50 flex-shrink-0">{e.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Landscape Widget ─────────────────────────────────────────────────────────

function LandscapeWidget({ scatterData, jobs, onJobSelect, onExpand }: any) {
  const { containerRef, showTooltip, hideTooltip, TooltipEl } = useChartTooltip();

  const cells = useMemo(() =>
    scatterData.map((e: any, i: number) => <Cell key={i} fill={e.color} fillOpacity={0.8} />),
    [scatterData]
  );

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm" style={{ height: '440px' }}>
      <div className="px-5 py-3.5 border-b border-base-300 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-sm">Position Landscape</h3>
          <p className="text-xs text-base-content/50 mt-0.5">UMAP 2D Projection</p>
        </div>
        <button onClick={() => onExpand('landscape')} className="btn btn-ghost btn-sm btn-square">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      <div ref={containerRef} className="p-4 relative" style={{ height: '376px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" />
            <XAxis type="number" dataKey="x" tick={{ fill: 'currentColor', fontSize: 10 }} stroke="#6b7280" tickLine={false} label={{ value: 'UMAP 1', position: 'insideBottom', offset: -25, fill: 'currentColor', fontSize: 11 }} />
            <YAxis type="number" dataKey="y" tick={{ fill: 'currentColor', fontSize: 10 }} stroke="#6b7280" tickLine={false} label={{ value: 'UMAP 2', angle: -90, position: 'insideLeft', fill: 'currentColor', fontSize: 11 }} />
            <ZAxis type="number" range={[40, 40]} />
            <RechartsTooltip content={() => null} />
            <Scatter
              data={scatterData}
              onClick={(d: any) => { const job = jobs.find((j: JobPoint) => j.id === d.id); if (job) onJobSelect(job); }}
              onMouseEnter={(d: any) => showTooltip(d.title, `Family ${d.cluster}`)}
              onMouseLeave={hideTooltip}
              isAnimationActive={false}
            >
              {cells}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {TooltipEl}
      </div>
    </div>
  );
}

// ─── Search Field Selector ────────────────────────────────────────────────────

interface SearchFieldConfig {
  key: string;
  label: string;
  checked: boolean;
}

const DEFAULT_SEARCH_FIELDS: SearchFieldConfig[] = [
  { key: 'title', label: 'Title', checked: true },
  { key: 'summary', label: 'Summary', checked: true },
  { key: 'employee_id', label: 'Employee ID', checked: false },
  { key: 'job_level', label: 'Level', checked: true },
  { key: 'responsibilities', label: 'Responsibilities', checked: false },
  { key: 'qualifications', label: 'Qualifications', checked: false },
  { key: 'keywords', label: 'Keywords', checked: false },
  { key: 'skills', label: 'Skills', checked: true },
  { key: 'cluster_label', label: 'Job Family', checked: true },
];

function SearchFieldSelector({ 
  fields, 
  onChange,
  onSelectAll,
  onClearAll 
}: { 
  fields: SearchFieldConfig[]; 
  onChange: (key: string, checked: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const checkedCount = fields.filter(f => f.checked).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-sm btn-outline btn-primary gap-2 min-w-[100px]"
        title="Select search fields"
      >
        <span className="font-medium">Fields</span>
        <span className="badge badge-sm badge-primary badge-outline">{checkedCount}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-base-100 border border-base-300 rounded-xl shadow-xl z-50 py-2">
          <div className="px-3 py-2.5 border-b border-base-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-base-content/50">Search in:</span>
            <div className="flex gap-1">
              <button onClick={onSelectAll} className="text-[10px] text-primary hover:underline">All</button>
              <span className="text-base-content/30">|</span>
              <button onClick={onClearAll} className="text-[10px] text-primary hover:underline">None</button>
            </div>
          </div>
          <div className="py-1">
            {fields.map((field) => (
              <label
                key={field.key}
                className="flex items-center gap-3 px-3 py-2 hover:bg-base-200 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={field.checked}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                  className="checkbox checkbox-sm checkbox-primary"
                />
                <span className="text-sm flex-1">{field.label}</span>
                {field.checked && <Check className="w-3 h-3 text-primary" />}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table Widget ─────────────────────────────────────────────────────────────

function TableWidget({ paginatedJobs, filteredJobs, totalJobs, totalPages, currentPage, setCurrentPage, onJobSelect, selectedClusters, clusters, activeFiltersCount, onClearFilters, searchQuery, onSearchChange, searchFields, onSearchFieldsChange }: any) {
  const tableTitle =
    selectedClusters.length === 0 ? 'All Positions' :
    selectedClusters.length === 1 ? (clusters.find((c: ClusterInfo) => c.id === selectedClusters[0])?.label || 'Selected Family') :
    `${selectedClusters.length} Job Families`;

  const handleSelectAllFields = () => {
    onSearchFieldsChange(searchFields.map((f: SearchFieldConfig) => ({ ...f, checked: true })));
  };

  const handleClearAllFields = () => {
    onSearchFieldsChange(searchFields.map((f: SearchFieldConfig) => ({ ...f, checked: false })));
  };

  const handleFieldChange = (key: string, checked: boolean) => {
    onSearchFieldsChange(searchFields.map((f: SearchFieldConfig) => 
      f.key === key ? { ...f, checked } : f
    ));
  };

  const checkedFieldsCount = searchFields.filter((f: SearchFieldConfig) => f.checked).length;
  const searchPlaceholder = checkedFieldsCount === 0 
    ? 'Select fields to search...' 
    : `Search in ${checkedFieldsCount} field${checkedFieldsCount !== 1 ? 's' : ''}...`;

  return (
    <div className="card bg-base-100 rounded-2xl shadow-lg overflow-hidden border-0">
      <div className="px-6 py-5 flex items-center justify-between bg-gradient-to-r from-base-100 to-base-200/50">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold tracking-tight">{tableTitle}</h3>
          <span className="badge badge-lg badge-primary font-semibold shadow-sm">{filteredJobs.length} positions</span>
          {activeFiltersCount > 0 && (
            <>
              <span className="text-sm text-base-content/40">of {totalJobs} total</span>
              <button onClick={onClearFilters} className="text-sm text-error hover:underline">Clear all</button>
            </>
          )}
        </div>
        {/* Search Bar with Field Selector */}
        <div className="flex items-center gap-2">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              value={searchQuery} 
              onChange={(e) => onSearchChange(e.target.value)} 
              disabled={checkedFieldsCount === 0}
              className="input input-bordered w-full pl-10 pr-10 text-sm rounded-xl disabled:bg-base-200 disabled:text-base-content/40 shadow-sm focus:shadow-md transition-shadow" 
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <SearchFieldSelector
            fields={searchFields}
            onChange={handleFieldChange}
            onSelectAll={handleSelectAllFields}
            onClearAll={handleClearAllFields}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead className="bg-base-200/60 text-sm font-semibold">
            <tr>
              <th className="py-3.5 text-base-content/70" style={{ width: '35%' }}>Position</th>
              <th className="py-3.5 text-base-content/70" style={{ minWidth: '180px' }}>Family</th>
              <th className="py-3.5 text-base-content/70" style={{ width: '12%' }}>Level</th>
              <th className="py-3.5 text-base-content/70" style={{ width: '15%' }}>Skills</th>
              <th className="py-3.5 w-[12%]"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedJobs.map((job: JobPoint) => {
              const clusterLabel = clusters.find((c: ClusterInfo) => c.id === job.cluster_id)?.label || `Family ${job.cluster_id}`;
              return (
                <tr key={job.id} className="hover:bg-base-200/40 transition-all duration-150 border-b border-base-200/50 last:border-0 group">
                  <td className="py-4">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{job.title}</p>
                    <p className="text-xs text-base-content/50 line-clamp-1">{job.summary}</p>
                    {job.employee_id && (
                      <p className="text-[10px] text-base-content/35 mt-0.5 font-mono">{job.employee_id}</p>
                    )}
                  </td>
                  <td>
                    <span className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold leading-snug shadow-sm" style={{ backgroundColor: `${job.color}20`, color: job.color }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: job.color }} />
                      <span>{clusterLabel}</span>
                    </span>
                  </td>
                  <td>
                    {job.job_level ? (
                      <span className="badge badge-ghost badge-sm rounded-lg font-medium">{job.job_level}</span>
                    ) : (
                      <span className="text-xs text-base-content/40">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {job.skills.slice(0, 3).map((s: string, i: number) => <span key={i} className="badge badge-outline badge-xs rounded-md font-medium">{s}</span>)}
                      {job.skills.length > 3 && <span className="badge badge-ghost badge-xs rounded-md font-medium">+{job.skills.length - 3}</span>}
                    </div>
                  </td>
                  <td className="text-right">
                    <button onClick={() => onJobSelect(job)} className="btn btn-primary btn-sm whitespace-nowrap rounded-lg shadow-sm hover:shadow-md transition-shadow">View Details</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-base-300/70 bg-base-200/30">
          <span className="text-sm text-base-content/60 font-medium">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="btn btn-ghost btn-xs btn-square rounded-lg"><ChevronsLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="btn btn-ghost btn-xs btn-square rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="btn btn-ghost btn-xs btn-square rounded-lg"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="btn btn-ghost btn-xs btn-square rounded-lg"><ChevronsRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

function FilterPanel({ isOpen, onClose, clusters, selectedClusters, onClustersSelect, searchQuery, onSearchChange, keywordFilters, onKeywordFilterChange, allKeywords, onClearAll }: any) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (panelRef.current) gsap.to(panelRef.current, { x: isOpen ? 0 : '100%', duration: 0.3, ease: 'power3.out' }); }, [isOpen]);

  const toggleKeyword = (kw: string) => onKeywordFilterChange(
    keywordFilters.includes(kw) ? keywordFilters.filter((k: string) => k !== kw) : [...keywordFilters, kw]
  );

  const toggleCluster = (id: number) => onClustersSelect(
    selectedClusters.includes(id) ? selectedClusters.filter((c: number) => c !== id) : [...selectedClusters, id]
  );

  const activeCount = selectedClusters.length + keywordFilters.length + (searchQuery ? 1 : 0);

  return (
    <div ref={panelRef} className="fixed top-0 right-0 h-full w-96 bg-base-100 shadow-2xl z-50 transform translate-x-full border-l border-base-300/50 rounded-l-2xl flex flex-col">
      <div className="p-6 border-b border-base-300/70 flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Filters
          {activeCount > 0 && <span className="badge badge-primary badge-sm">{activeCount}</span>}
        </h3>
        <button onClick={onClose} className="btn btn-ghost btn-sm btn-square"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Search */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-2 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input type="text" placeholder="Search positions…" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="input input-bordered w-full pl-10 text-sm rounded-xl" />
            {searchQuery && <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4" /></button>}
          </div>
        </div>

        {/* Job Families — multi-select */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
              Job Families {selectedClusters.length > 0 && <span className="text-primary">({selectedClusters.length} selected)</span>}
            </label>
            {selectedClusters.length > 0 && (
              <button onClick={() => onClustersSelect([])} className="text-xs text-error hover:underline">Clear</button>
            )}
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => onClustersSelect([])}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm transition-all ${selectedClusters.length === 0 ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-current" />
              <span className="flex-1 text-left">All Families</span>
              <span className="text-xs opacity-70">{clusters.reduce((s: number, c: ClusterInfo) => s + c.size, 0)}</span>
            </button>
            {clusters.map((c: ClusterInfo) => {
              const isSelected = selectedClusters.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCluster(c.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm transition-all ${isSelected ? 'text-white' : 'bg-base-200 hover:bg-base-300'}`}
                  style={isSelected ? { backgroundColor: c.color } : {}}
                >
                  {/* Checkbox indicator */}
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-white bg-white/20' : 'border-base-content/30'}`}>
                    {isSelected && <span className="w-2 h-2 rounded-sm bg-white" />}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="flex-1 text-left truncate">{c.label}</span>
                  <span className="text-xs opacity-70">{c.size}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Keywords — multi-select (already supported) */}
        {allKeywords.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
                Keywords {keywordFilters.length > 0 && <span className="text-primary">({keywordFilters.length} selected)</span>}
              </label>
              {keywordFilters.length > 0 && (
                <button onClick={() => onKeywordFilterChange([])} className="text-xs text-error hover:underline">Clear</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allKeywords.slice(0, 30).map((kw: string) => {
                const isSelected = keywordFilters.includes(kw);
                return (
                  <button
                    key={kw}
                    onClick={() => toggleKeyword(kw)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${isSelected ? 'text-white border-transparent' : 'bg-base-200 hover:bg-base-300 border-transparent'}`}
                    style={isSelected ? { backgroundColor: '#6366f1' } : {}}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-base-300 bg-base-200/30 space-y-3">
        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-error text-sm hover:underline block w-full text-left"
          >
            Clear all filters ({activeCount})
          </button>
        )}
        <button onClick={onClose} className="btn btn-primary w-full">Close</button>
      </div>
    </div>
  );
}

// ─── Sortable Widget Wrapper ──────────────────────────────────────────────────

const SIZE_OPTIONS: { cols: 4 | 6 | 8 | 12; label: string }[] = [
  { cols: 4,  label: '⅓' },
  { cols: 6,  label: '½' },
  { cols: 8,  label: '⅔' },
  { cols: 12, label: 'Full' },
];

function SortableDashboardWidget({
  config,
  isEditMode,
  onToggleVisibility,
  onResize,
  children,
}: {
  config: WidgetConfig;
  isEditMode: boolean;
  onToggleVisibility: (id: string) => void;
  onResize: (id: string, cols: 4 | 6 | 8 | 12) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: config.id,
    disabled: !isEditMode,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${config.cols}`,
    opacity: isDragging ? 0.35 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {isEditMode && (
        <>
          {/* Blue outline border */}
          <div className="absolute inset-0 border-2 border-primary/50 rounded-2xl pointer-events-none z-10" />

          {/* Drag handle — top-left */}
          <button
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 z-20 p-1.5 bg-primary text-primary-content rounded-lg shadow-md cursor-grab active:cursor-grabbing hover:bg-primary/90 transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Size picker + eye toggle — top-right */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
            {!config.hideResize && (
              <div className="bg-base-100/95 backdrop-blur-sm border border-base-300 rounded-xl flex shadow-md overflow-hidden">
                {SIZE_OPTIONS.map(s => (
                  <button
                    key={s.cols}
                    onClick={() => onResize(config.id, s.cols)}
                    className={`px-2 py-1 text-xs font-semibold transition-colors ${config.cols === s.cols ? 'bg-primary text-primary-content' : 'hover:bg-base-200 text-base-content/70'}`}
                    title={`${s.label} width`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => onToggleVisibility(config.id)}
              className={`p-1.5 rounded-xl shadow-md border transition-colors ${config.visible ? 'bg-base-100/95 border-base-300 hover:bg-base-200' : 'bg-error text-error-content border-error'}`}
              title={config.visible ? 'Hide widget' : 'Show widget'}
            >
              {config.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </>
      )}

      <div className={isEditMode && !config.visible ? 'opacity-25 grayscale pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}

// ─── Header Controls ──────────────────────────────────────────────────────────

function HeaderControls({ isEditMode, onToggleEdit, onOpenFilters, activeFiltersCount, onReset }: any) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onToggleEdit} className={`btn btn-sm gap-2 rounded-lg ${isEditMode ? 'btn-primary' : 'btn-outline'}`}>
        {isEditMode ? <X className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
        {isEditMode ? 'Done' : 'Customize'}
      </button>
      {!isEditMode && (
        <>
          <button onClick={onOpenFilters} className="btn btn-sm btn-outline gap-2 relative rounded-lg">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-0.5 w-5 h-5 bg-error rounded-full text-xs flex items-center justify-center text-white font-bold">{activeFiltersCount}</span>
            )}
          </button>
          <button onClick={onReset} className="btn btn-sm btn-ghost btn-square rounded-lg" title="Reset all"><RotateCcw className="w-4 h-4" /></button>
        </>
      )}
    </div>
  );
}

// ─── Expanded Chart Modal ─────────────────────────────────────────────────────

function ExpandedChartModal({
  expandedChart,
  onClose,
  clusterData,
  keywordData,
  pieData,
  scatterData,
  jobs,
  filteredJobs,
  onJobSelect,
}: {
  expandedChart: string | null;
  onClose: () => void;
  clusterData: any[];
  keywordData: any[];
  pieData: any[];
  scatterData: any[];
  jobs: JobPoint[];
  filteredJobs: JobPoint[];
  onJobSelect: (job: JobPoint) => void;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const expandedKeywordData = useMemo(() => {
    const kws: Record<string, number> = {};
    filteredJobs.forEach(j => j.keywords.forEach(kw => kws[kw] = (kws[kw] || 0) + 1));
    return Object.entries(kws).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ name, count }));
  }, [filteredJobs]);

  const fullScatterData = useMemo(() =>
    filteredJobs.map(j => ({ x: j.x, y: j.y, id: j.id, title: j.title, color: j.color, cluster: j.cluster_id })),
    [filteredJobs]
  );

  const title =
    expandedChart === 'families'  ? 'Jobs by Family' :
    expandedChart === 'keywords'  ? 'Top Keywords' :
    'Position Landscape';

  const subtitle =
    expandedChart === 'families'  ? 'Complete distribution across all job families' :
    expandedChart === 'keywords'  ? 'Most frequent keywords across positions' :
    'Interactive UMAP 2D projection of all positions';

  return (
    <AnimatePresence>
      {expandedChart && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className="card bg-base-100 w-full max-w-7xl max-h-[95vh] overflow-hidden shadow-2xl rounded-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-base-300/70 flex justify-between items-center bg-base-200/50">
              <div>
                <h3 className="text-xl font-bold text-base-content">{title}</h3>
                <p className="text-sm text-base-content/60 mt-1">{subtitle}</p>
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              {expandedChart === 'families' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 card bg-base-200/30 rounded-2xl p-4" style={{ height: '700px' }}>
                    <DraggableBubbleChart 
                      clusterData={clusterData} 
                      width={800} 
                      height={700} 
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="card bg-base-200/30 rounded-2xl p-4">
                      <h4 className="font-semibold text-sm text-base-content/70 mb-3">Distribution Summary</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-sm">Total Families</span><span className="font-bold">{clusterData.length}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm">Total Jobs</span><span className="font-bold">{clusterData.reduce((acc, c) => acc + c.count, 0).toLocaleString()}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm">Avg per Family</span><span className="font-bold">{(clusterData.reduce((acc, c) => acc + c.count, 0) / clusterData.length).toFixed(1)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm">Largest Family</span><span className="font-bold text-primary">{clusterData[0]?.name}</span></div>
                      </div>
                    </div>
                    <div className="card bg-base-200/30 p-4">
                      <h4 className="font-semibold text-sm text-base-content/70 mb-3">All Families</h4>
                      <div className="space-y-2 max-h-[300px] overflow-auto">
                        {clusterData.map((cluster, idx) => (
                          <div key={cluster.name} className="flex items-center gap-3 p-2 rounded-xl hover:bg-base-200 transition-colors">
                            <span className="text-xs text-base-content/50 w-6">{idx + 1}.</span>
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cluster.color }} />
                            <span className="text-sm flex-1 truncate">{cluster.name}</span>
                            <span className="text-sm font-medium">{cluster.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {expandedChart === 'keywords' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 card bg-base-200/30 rounded-2xl p-4" style={{ height: '750px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expandedKeywordData} layout="vertical" margin={{ left: 100, right: 30, top: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" horizontal={false} />
                        <XAxis type="number" stroke="#6b7280" tick={{ fill: 'currentColor', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#6b7280' }} />
                        <YAxis dataKey="name" type="category" stroke="#6b7280" width={80} tick={{ fill: 'currentColor', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#6b7280' }} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-base-100 border border-base-300 rounded-xl px-3 py-2 shadow-xl">
                                  <p className="font-semibold text-sm">{payload[0].payload.name}</p>
                                  <p className="text-sm text-base-content/70">Appears in {payload[0].value} positions</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    <div className="card bg-base-200/30 rounded-2xl p-4">
                      <h4 className="font-semibold text-sm text-base-content/70 mb-3">Keyword Statistics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-sm">Total Unique</span><span className="font-bold">{expandedKeywordData.length}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm">Most Frequent</span><span className="font-bold text-primary">{expandedKeywordData[0]?.name || 'N/A'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm">Top Count</span><span className="font-bold">{expandedKeywordData[0]?.count || 0}</span></div>
                      </div>
                    </div>
                    <div className="card bg-base-200/30 rounded-2xl p-4">
                      <h4 className="font-semibold text-sm text-base-content/70 mb-3">Top 10 Keywords</h4>
                      <div className="space-y-2">
                        {expandedKeywordData.slice(0, 10).map((kw, idx) => {
                          const maxCount = expandedKeywordData[0]?.count || 1;
                          const percentage = (kw.count / maxCount) * 100;
                          return (
                            <div key={kw.name} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium">{idx + 1}. {kw.name}</span>
                                <span className="text-base-content/60">{kw.count}</span>
                              </div>
                              <div className="h-2 bg-base-300 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {expandedChart === 'landscape' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3 card bg-base-200/30 rounded-2xl p-4" style={{ height: '750px' }}>
                    <div ref={containerRef} className="relative w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--b3))" />
                          <XAxis type="number" dataKey="x" tick={{ fill: 'currentColor', fontSize: 11 }} stroke="#6b7280" tickLine={false} label={{ value: 'UMAP Dimension 1', position: 'insideBottom', offset: -30, fill: 'currentColor', fontSize: 12 }} />
                          <YAxis type="number" dataKey="y" tick={{ fill: 'currentColor', fontSize: 11 }} stroke="#6b7280" tickLine={false} label={{ value: 'UMAP Dimension 2', angle: -90, position: 'insideLeft', fill: 'currentColor', fontSize: 12 }} />
                          <ZAxis type="number" range={[50, 50]} />
                          <RechartsTooltip
                            cursor={{ strokeDasharray: '3 3' }}
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
                          <Scatter
                            data={fullScatterData}
                            onClick={(d: any) => { const job = jobs.find((j: JobPoint) => j.id === d.id); if (job) onJobSelect(job); }}
                            onMouseEnter={(d: any) => setHoveredPoint(d)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            {fullScatterData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={hoveredPoint?.id === entry.id ? 1 : 0.7} stroke={hoveredPoint?.id === entry.id ? '#000' : 'none'} strokeWidth={2} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="card bg-base-200/30 rounded-2xl p-4">
                      <h4 className="font-semibold text-sm text-base-content/70 mb-1">Visible Positions</h4>
                      <div className="text-3xl font-bold">{fullScatterData.length.toLocaleString()}</div>
                    </div>
                    <div className="card bg-base-200/30 rounded-2xl p-4">
                      <h4 className="font-semibold text-sm text-base-content/70 mb-3">Legend</h4>
                      <div className="space-y-2 max-h-[300px] overflow-auto">
                        {pieData.slice(0, 8).map((cluster: any) => (
                          <div key={cluster.name} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cluster.color }} />
                            <span className="text-sm flex-1 truncate">{cluster.name}</span>
                            <span className="text-xs text-base-content/50">{cluster.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card bg-base-200/30 rounded-2xl p-4">
                      <h4 className="font-semibold text-sm text-base-content/70 mb-2">Interaction</h4>
                      <p className="text-xs text-base-content/60">Click any point to view job details. Hover to highlight.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export default function DashboardView({ jobs, clusters, selectedClusters, searchQuery, onSearchChange, onClustersSelect, onJobSelect }: DashboardViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [keywordFilters, setKeywordFilters] = useState<string[]>([]);
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>(loadConfigs);

  // Save configs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetConfigs));
  }, [widgetConfigs]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchFields, setSearchFields] = useState<SearchFieldConfig[]>(DEFAULT_SEARCH_FIELDS);

  const ITEMS_PER_PAGE = 12;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Widget config mutations ──────────────────────────────────────────────
  const toggleVisibility = useCallback((id: string) => {
    setWidgetConfigs(cs => cs.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  }, []);

  const resizeWidget = useCallback((id: string, cols: 4 | 6 | 8 | 12) => {
    setWidgetConfigs(cs => cs.map(c => c.id === id ? { ...c, cols } : c));
  }, []);

  const resetAll = useCallback(() => {
    setWidgetConfigs(DEFAULT_CONFIGS);
    setKeywordFilters([]);
    onClustersSelect([]);
    onSearchChange('');
  }, [onClustersSelect, onSearchChange]);

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(e.active.id as string), []);
  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (over && active.id !== over.id) {
      setWidgetConfigs(cs => {
        const oldIdx = cs.findIndex(c => c.id === active.id);
        const newIdx = cs.findIndex(c => c.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return cs;
        return arrayMove(cs, oldIdx, newIdx);
      });
    }
  }, []);

  // ── Data computations ────────────────────────────────────────────────────
  const allKeywords = useMemo(() => {
    const kwSet = new Set<string>();
    jobs.forEach(j => j.keywords.forEach(kw => kwSet.add(kw)));
    return Array.from(kwSet).sort();
  }, [jobs]);

  // Top-5 most frequent keywords across the full dataset (used for badge gradient)
  const globalTop5Keywords = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => j.keywords.forEach(kw => { counts[kw] = (counts[kw] || 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw]) => kw.toLowerCase());
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (selectedClusters.length > 0) result = result.filter(j => selectedClusters.includes(j.cluster_id));
    if (searchQuery) { 
      const q = searchQuery.toLowerCase();
      const activeFields = searchFields.filter(f => f.checked).map(f => f.key);
      
      if (activeFields.length > 0) {
        result = result.filter(j => {
          return activeFields.some(field => {
            switch (field) {
              case 'title':
                return j.title.toLowerCase().includes(q);
              case 'summary':
                return j.summary.toLowerCase().includes(q);
              case 'employee_id':
                return j.employee_id?.toLowerCase().includes(q) || false;
              case 'responsibilities':
                return j.responsibilities?.toLowerCase().includes(q) || false;
              case 'qualifications':
                return j.qualifications?.toLowerCase().includes(q) || false;
              case 'keywords':
                return j.keywords.some(kw => kw.toLowerCase().includes(q));
              case 'skills':
                return j.skills.some(s => s.toLowerCase().includes(q));
              case 'cluster_label':
                const clusterLabel = clusters.find((c: ClusterInfo) => c.id === j.cluster_id)?.label || '';
                return clusterLabel.toLowerCase().includes(q);
              case 'job_level':
                return j.job_level?.toLowerCase().includes(q) || false;
              default:
                return false;
            }
          });
        });
      }
    }
    if (keywordFilters.length > 0) result = result.filter(j => keywordFilters.some(kw => j.keywords.includes(kw)));
    return result;
  }, [jobs, selectedClusters, searchQuery, keywordFilters, searchFields, clusters]);

  useEffect(() => setCurrentPage(1), [searchQuery, selectedClusters, keywordFilters, searchFields]);

  const totalPages   = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJobs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  // Compute cluster data from filtered jobs so charts update with filters
  const clusterCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    filteredJobs.forEach(j => { counts[j.cluster_id] = (counts[j.cluster_id] || 0) + 1; });
    return counts;
  }, [filteredJobs]);
  
  const clusterData = useMemo(() => 
    clusters
      .map(c => ({ name: c.label || `Family ${c.id}`, count: clusterCounts[c.id] || 0, color: c.color }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count), 
    [clusters, clusterCounts]
  );
  
  const keywordData  = useMemo(() => { const kws: Record<string, number> = {}; filteredJobs.forEach(j => j.keywords.forEach(kw => kws[kw] = (kws[kw] || 0) + 1)); return Object.entries(kws).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })); }, [filteredJobs]);
  const scatterData  = useMemo(() => filteredJobs.map(j => ({ x: j.x, y: j.y, id: j.id, title: j.title, color: j.color, cluster: j.cluster_id })), [filteredJobs]);
  
  const pieData = useMemo(() =>
    clusters
      .map(c => ({ name: c.label || `Family ${c.id}`, value: clusterCounts[c.id] || 0, color: c.color }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value),
    [clusters, clusterCounts]
  );

  const jobLevelData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredJobs.forEach(j => {
      const level = j.job_level ?? 'Unclassified';
      counts[level] = (counts[level] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: jobLevelColor(name) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredJobs]);

  const stats = {
    total:          jobs.length,
    filtered:       filteredJobs.length,
    families:       new Set(filteredJobs.map(j => j.cluster_id)).size,
    avgSkills:      (filteredJobs.reduce((acc, j) => acc + j.skills.length, 0) / (filteredJobs.length || 1)).toFixed(1),
    avgSeniority:   (() => {
      const withScore = filteredJobs.filter(j => j.seniority_score != null);
      if (withScore.length === 0) return '—';
      const avg = withScore.reduce((acc, j) => acc + (j.seniority_score ?? 0), 0) / withScore.length;
      return avg.toFixed(2);
    })(),
  };

  const activeFiltersCount = selectedClusters.length + keywordFilters.length + (searchQuery && searchFields.some(f => f.checked) ? 1 : 0);

  // ── Sortable items ───────────────────────────────────────────────────────
  // Non-locked widgets: these go inside SortableContext
  const sortableConfigs = widgetConfigs.filter(c => !c.locked);
  // In edit mode show all (incl. hidden); otherwise only visible
  const sortableConfigsToRender = isEditMode ? sortableConfigs : sortableConfigs.filter(c => c.visible);
  const sortableIds = sortableConfigsToRender.map(c => c.id);

  // ── Widget renderer ──────────────────────────────────────────────────────
  const renderWidget = (id: string) => {
    switch (id) {
      case 'stats':             return <StatsWidget stats={stats} isEditMode={isEditMode} />;
      case 'familyChart':       return <FamilyChartWidget clusterData={clusterData} onExpand={() => setExpandedChart('families')} />;
      case 'keywordsChart':     return <KeywordsChartWidget keywordData={keywordData} onExpand={() => setExpandedChart('keywords')} />;
      case 'distributionChart': return <JobLevelDistributionWidget levelData={jobLevelData} />;
      case 'landscape':         return <LandscapeWidget scatterData={scatterData} jobs={jobs} onJobSelect={onJobSelect} onExpand={setExpandedChart} />;
      default: return null;
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-base-200/50 overflow-hidden">

      {/* Slide-over filter panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        clusters={clusters}
        selectedClusters={selectedClusters}
        onClustersSelect={onClustersSelect}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        keywordFilters={keywordFilters}
        onKeywordFilterChange={setKeywordFilters}
        allKeywords={allKeywords}
        onClearAll={() => { onClustersSelect([]); onSearchChange(''); setKeywordFilters([]); setSearchFields(DEFAULT_SEARCH_FIELDS); }}
      />
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={() => setShowFilters(false)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-base-100/95 backdrop-blur-sm border-b border-base-300/70 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/logo_colour.svg" alt="Logo" className="h-10 w-auto" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Workforce Dashboard</h1>
              <p className="text-sm text-base-content/50 mt-0.5 font-medium">
                {isEditMode ? 'Drag to reorder · Resize with size buttons · Toggle visibility with eye icon' : 'Explore job families and positions'}
              </p>
            </div>
          </div>
          <HeaderControls
            isEditMode={isEditMode}
            onToggleEdit={() => setIsEditMode(!isEditMode)}
            onOpenFilters={() => setShowFilters(true)}
            activeFiltersCount={activeFiltersCount}
            onReset={resetAll}
          />
        </div>
      </header>

      {/* Edit mode info banner */}
      {isEditMode && (
        <div className="bg-primary/5 border-b border-primary/10 px-6 py-2.5 flex items-center gap-2.5 text-sm text-primary shadow-sm">
          <LayoutGrid className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">Customize layout — drag widgets to reorder, pick a size (<strong>⅓ ½ ⅔ Full</strong>), or hide with the eye icon. The table is always last.</span>
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* 12-column grid — only table is fixed; all other widgets are sortable */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '28px' }}>

              {/* Sortable widgets (stats + charts + landscape) */}
              <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                {sortableConfigsToRender.map(cfg => (
                  <SortableDashboardWidget
                    key={cfg.id}
                    config={cfg}
                    isEditMode={isEditMode}
                    onToggleVisibility={toggleVisibility}
                    onResize={resizeWidget}
                  >
                    {renderWidget(cfg.id)}
                  </SortableDashboardWidget>
                ))}
              </SortableContext>

              {/* Table — locked, always last, full width */}
              <div style={{ gridColumn: 'span 12' }}>
                <TableWidget
                  paginatedJobs={paginatedJobs}
                  filteredJobs={filteredJobs}
                  totalJobs={jobs.length}
                  totalPages={totalPages}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  onJobSelect={onJobSelect}
                  selectedClusters={selectedClusters}
                  clusters={clusters}
                  activeFiltersCount={activeFiltersCount}
                  onClearFilters={() => { onClustersSelect([]); onSearchChange(''); setKeywordFilters([]); setSearchFields(DEFAULT_SEARCH_FIELDS); }}
                  searchQuery={searchQuery}
                  onSearchChange={onSearchChange}
                  searchFields={searchFields}
                  onSearchFieldsChange={setSearchFields}
                />
              </div>
            </div>

            {/* Drag overlay — ghost card showing widget title */}
            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
              {activeId ? (
                <div className="card bg-base-100 border-2 border-primary shadow-2xl px-5 py-3 opacity-90">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <GripVertical className="w-4 h-4" />
                    {WIDGET_TITLES[activeId] || activeId}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Expanded chart modal */}
      <ExpandedChartModal
        expandedChart={expandedChart}
        onClose={() => setExpandedChart(null)}
        clusterData={clusterData}
        keywordData={keywordData}
        pieData={pieData}
        scatterData={scatterData}
        jobs={jobs}
        filteredJobs={filteredJobs}
        onJobSelect={onJobSelect}
      />
    </div>
  );
}
