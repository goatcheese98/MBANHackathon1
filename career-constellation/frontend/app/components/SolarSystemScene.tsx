/**
 * Career Mobility Network — HR Edition
 *
 * Interaction model:
 *  - Click cluster node / legend item / affinity entry → smooth-pan to center it
 *  - Click role in list → slow animated pan to that role's exact embedding position
 *  - Scroll wheel → zoom (cursor-centred)
 *  - Drag → pan
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ConstellationData, ClusterInfo, JobPoint } from '@/types';
import { X, Search, ChevronRight } from 'lucide-react';
import ConstellationJobPanel, { AffinityEntry } from '@/components/ConstellationJobPanel';

// ─── Props ────────────────────────────────────────────────────────────────────
interface SolarSystemSceneProps { data: ConstellationData; }

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function nodeRadius(size: number) { return Math.max(20, Math.min(54, Math.sqrt(size) * 4.4)); }
function hexAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function cleanTitle(t: string) { return t.replace(/\s*\([^)]+\)/g, '').replace(/^Position:\s*/i, '').trim(); }
function affinityColor(pct: number) { return pct >= 65 ? '#16a34a' : pct >= 45 ? '#d97706' : '#94a3b8'; }

/** Smooth ease-in-out cubic */
function ease(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG       = '#f1f5f9';
const PANEL_BG = '#ffffff';
const BORDER   = '#e2e8f0';
const TS       = '#0f172a';   // text-strong
const TM       = '#475569';   // text-mid
const TMU      = '#94a3b8';   // text-muted
const EDGE     = '#94a3b8';
const FONT     = 'system-ui, -apple-system, sans-serif';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LayoutNode {
  id: number; label: string; size: number; color: string;
  keywords: string[]; example_titles: string[];
  centroid: ClusterInfo['centroid'];
  svgX: number; svgY: number; r: number;
}
interface Edge  { a: number; b: number; sim: number; }
interface VP    { x: number; y: number; scale: number; }

// ─── Component ────────────────────────────────────────────────────────────────
export default function SolarSystemScene({ data }: SolarSystemSceneProps) {

  // Selection state
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [selectedJob,       setSelectedJob       ] = useState<JobPoint | null>(null);
  const [roleSearch,        setRoleSearch         ] = useState('');
  const [threshold,         setThreshold          ] = useState(0.42);

  // Container
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 800 });
  useEffect(() => {
    const obs = new ResizeObserver(e => {
      const r = e[0].contentRect;
      setDims({ w: r.width, h: r.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Viewport (pan + zoom) ──────────────────────────────────────────────────
  const vpRef   = useRef<VP>({ x: 0, y: 0, scale: 1 });
  const [vp, _setVp] = useState<VP>({ x: 0, y: 0, scale: 1 });
  const setVp = useCallback((next: VP) => { vpRef.current = next; _setVp(next); }, []);

  // Animation
  const rafRef = useRef<number | null>(null);
  const animateTo = useCallback((target: VP, duration = 680) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const from = { ...vpRef.current };
    const t0   = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const e = ease(t);
      setVp({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, scale: from.scale + (target.scale - from.scale) * e });
      rafRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [setVp]);

  /** Compute the viewport that centres SVG point (sx, sy) at the screen centre. */
  const centreOn = useCallback((sx: number, sy: number, targetScale: number): VP => {
    // Don't zoom out if already zoomed in past targetScale
    const s = Math.max(vpRef.current.scale, targetScale);
    return { x: dims.w / 2 - sx * s, y: dims.h / 2 - sy * s, scale: s };
  }, [dims]);

  // Refs for panels to attach native wheel listeners
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Prevent wheel events on panels from bubbling to container (zoom)
  useEffect(() => {
    const stopWheel = (e: WheelEvent) => { e.stopPropagation(); };
    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (left) left.addEventListener('wheel', stopWheel, { passive: false });
    if (right) right.addEventListener('wheel', stopWheel, { passive: false });
    return () => {
      if (left) left.removeEventListener('wheel', stopWheel);
      if (right) right.removeEventListener('wheel', stopWheel);
    };
  }, [selectedClusterId, selectedJob]); // Re-attach when panels appear/disappear

  // Wheel zoom (needs passive:false)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      const f = e.deltaY > 0 ? 0.92 : 1.09;
      const cur = vpRef.current;
      const s   = Math.max(0.18, Math.min(7, cur.scale * f));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      setVp({ scale: s, x: mx - (mx - cur.x) * (s / cur.scale), y: my - (my - cur.y) * (s / cur.scale) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setVp]);

  // Mouse pan
  const panActive  = useRef(false);
  const panOrigin  = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const hasDragged = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('[data-node],[data-panel]')) return;
    e.preventDefault();
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    panActive.current = true; hasDragged.current = false;
    panOrigin.current = { x: e.clientX, y: e.clientY, vx: vpRef.current.x, vy: vpRef.current.y };
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!panActive.current) return;
    const dx = e.clientX - panOrigin.current.x, dy = e.clientY - panOrigin.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged.current = true;
      setVp({ ...vpRef.current, x: panOrigin.current.vx + dx, y: panOrigin.current.vy + dy });
    }
  }, [setVp]);
  const stopPan = useCallback(() => { panActive.current = false; }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  useEffect(() => { setRoleSearch(''); }, [selectedClusterId]);

  const clusterJobs = useMemo<Record<number, JobPoint[]>>(() => {
    const m: Record<number, JobPoint[]> = {};
    data.clusters.forEach(c => { m[c.id] = []; });
    data.jobs.forEach(j => { m[j.cluster_id]?.push(j); });
    return m;
  }, [data]);

  const toSVG = useCallback((pt: { x: number; y: number }) => {
    const PAD = 110, sx = (dims.w / 2 - PAD) / 50, sy = (dims.h / 2 - PAD) / 50;
    return { x: dims.w / 2 + pt.x * sx, y: dims.h / 2 - pt.y * sy };
  }, [dims]);

  const nodes = useMemo<LayoutNode[]>(() =>
    data.clusters.map(c => { const p = toSVG(c.centroid); return { ...c, svgX: p.x, svgY: p.y, r: nodeRadius(c.size) }; })
  , [data.clusters, toSVG]);

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const edges = useMemo<Edge[]>(() => {
    const cs = data.clusters;
    const raw: { a: number; b: number; sim: number }[] = [];
    for (let i = 0; i < cs.length; i++)
      for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i].id, b = cs[j].id;
        const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
        raw.push({ a, b, sim: data.cluster_sims?.[key] ?? 0 });
      }
    // Normalise raw cosine sims to [0,1] so the threshold slider stays intuitive
    const vals = raw.map(e => e.sim);
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    return raw.map(e => ({ ...e, sim: (e.sim - minV) / range }));
  }, [data.clusters, data.cluster_sims]);

  const jobAffinities = useMemo<Record<number, number>>(() => {
    if (!selectedJob || !selectedJob.affinities) return {};
    // Raw 384D cosine similarities for this job to each cluster
    const raw = selectedJob.affinities;
    const vals = Object.values(raw);
    if (vals.length === 0) return {};
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    // Normalise to [0,1] relative to this job's own spread so the home cluster
    // is always ~1.0 and the least-similar cluster is ~0.0
    const r: Record<number, number> = {};
    Object.entries(raw).forEach(([cid, sim]) => { r[+cid] = (sim - minV) / range; });
    return r;
  }, [selectedJob]);

  const jobMarkerPos = useMemo(() =>
    selectedJob ? toSVG({ x: selectedJob.x, y: selectedJob.y }) : null
  , [selectedJob, toSVG]);

  const rankedAffinities = useMemo<AffinityEntry[]>(() => {
    if (!selectedJob) return [];
    return Object.entries(jobAffinities)
      .map(([id, sim]) => ({ cluster: data.clusters.find(c => c.id === +id)!, pct: Math.round(sim * 100) }))
      .filter(a => a.cluster && a.cluster.id !== selectedJob.cluster_id)
      .sort((a, b) => b.pct - a.pct);
  }, [jobAffinities, selectedJob, data.clusters]);

  const selectedCluster    = useMemo(() => data.clusters.find(c => c.id === selectedClusterId) ?? null, [data.clusters, selectedClusterId]);
  const selectedJobCluster = useMemo(() => selectedJob ? data.clusters.find(c => c.id === selectedJob.cluster_id) ?? null : null, [data.clusters, selectedJob]);
  const selectedJobs       = useMemo(() => selectedClusterId !== null ? clusterJobs[selectedClusterId] ?? [] : [], [selectedClusterId, clusterJobs]);
  const filteredJobs       = useMemo(() => { const q = roleSearch.trim().toLowerCase(); return q ? selectedJobs.filter(j => j.title.toLowerCase().includes(q)) : selectedJobs; }, [selectedJobs, roleSearch]);
  const keywordFreq        = useMemo(() => {
    if (!selectedClusterId) return [];
    const jobs = clusterJobs[selectedClusterId] ?? [], freq: Record<string, number> = {};
    jobs.forEach(j => j.keywords.forEach(kw => { freq[kw] = (freq[kw] ?? 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [selectedClusterId, clusterJobs]);

  // ── Focused navigation (animate to centre) ────────────────────────────────
  const focusCluster = useCallback((id: number) => {
    const node = nodeMap[id];
    if (!node) return;
    setSelectedClusterId(id);
    setSelectedJob(null);
    animateTo(centreOn(node.svgX, node.svgY, 1.4));
  }, [nodeMap, animateTo, centreOn]);

  const focusRole = useCallback((job: JobPoint) => {
    setSelectedJob(job);
    setSelectedClusterId(job.cluster_id); // keep cluster panel open
    const pos = toSVG({ x: job.x, y: job.y });
    animateTo(centreOn(pos.x, pos.y, 2.2), 850); // slightly longer for role
  }, [animateTo, centreOn, toSVG]);

  // ── Click handlers ────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasDragged.current) { hasDragged.current = false; return; }
    focusCluster(id);
  }, [focusCluster]);

  const handleRoleClick = useCallback((job: JobPoint, e: React.MouseEvent) => {
    e.stopPropagation();
    focusRole(job);
  }, [focusRole]);

  const handleBgClick = useCallback(() => {
    if (hasDragged.current) { hasDragged.current = false; return; }
    setSelectedClusterId(null); setSelectedJob(null);
  }, []);

  const hasJob = selectedJob !== null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ background: BG, userSelect: 'none', fontFamily: FONT }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={stopPan} onMouseLeave={stopPan} onClick={handleBgClick}
    >

      {/* ── SVG network ─────────────────────────────────────────────────── */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <g transform={`translate(${vp.x},${vp.y}) scale(${vp.scale})`}>

          {/* Cluster edges */}
          {!hasJob && edges.filter(e => e.sim >= threshold).map(e => {
            const na = nodeMap[e.a], nb = nodeMap[e.b];
            if (!na || !nb) return null;
            const active = selectedClusterId !== null && (e.a === selectedClusterId || e.b === selectedClusterId);
            const dimmed = selectedClusterId !== null && !active;
            return <line key={`${e.a}-${e.b}`} x1={na.svgX} y1={na.svgY} x2={nb.svgX} y2={nb.svgY}
              stroke={active ? '#2563eb' : EDGE}
              strokeWidth={active ? e.sim * 3.5 + 1 : e.sim * 1.4 + 0.4}
              opacity={dimmed ? 0.04 : active ? 0.65 : e.sim * 0.4 + 0.06} />;
          })}

          {/* Affinity arrows */}
          {hasJob && jobMarkerPos && rankedAffinities.filter(a => a.pct >= 28).map(({ cluster, pct }) => {
            const tn = nodeMap[cluster.id];
            if (!tn) return null;
            const sim = pct / 100;
            return <line key={`aff-${cluster.id}`} x1={jobMarkerPos.x} y1={jobMarkerPos.y} x2={tn.svgX} y2={tn.svgY}
              stroke={affinityColor(pct)} strokeWidth={0.7 + sim * 3.8}
              opacity={0.18 + sim * 0.58} strokeDasharray={pct < 50 ? '5,4' : undefined} />;
          })}

          {/* Cluster nodes */}
          {nodes.map(n => {
            const isSel     = n.id === selectedClusterId;
            const isHome    = selectedJob?.cluster_id === n.id;
            const dimmed    = !hasJob && selectedClusterId !== null && !isSel;
            const affinity  = jobAffinities[n.id] ?? 0;
            const affPct    = Math.round(affinity * 100);
            const showAff   = hasJob && !isHome && affPct >= 25;
            const aColor    = affinityColor(affPct);
            const fillAlpha = hasJob ? (isHome ? 0.22 : affinity * 0.22 + 0.04) : isSel ? 0.18 : 0.09;

            return (
              <g key={n.id} data-node="true"
                transform={`translate(${n.svgX},${n.svgY})`}
                onClick={ev => handleNodeClick(n.id, ev)}
                style={{ cursor: 'pointer' }}>
                {(isSel || isHome) && <circle r={n.r + 8} fill="none" stroke={n.color} strokeWidth={2} opacity={0.4} />}
                {showAff && <circle r={n.r + 5} fill="none" stroke={aColor} strokeWidth={1.5} strokeDasharray="3,3" opacity={0.5} />}
                <circle r={n.r}
                  fill={hexAlpha(n.color, fillAlpha)} stroke={n.color}
                  strokeWidth={isSel || isHome ? 2.5 : 1.5}
                  strokeOpacity={dimmed ? 0.2 : hasJob && !isHome && affinity < 0.25 ? 0.22 : 1} />
                <text textAnchor="middle" y={-n.r - 11}
                  fill={TS} fontSize={isSel || isHome ? 13.5 : 11.5} fontWeight={isSel || isHome ? 700 : 500}
                  opacity={dimmed ? 0.22 : hasJob && !isHome && affinity < 0.25 ? 0.25 : 1}
                  style={{ pointerEvents: 'none', fontFamily: FONT }}>
                  {n.label}
                </text>
                {!hasJob && (
                  <text textAnchor="middle" y={-n.r - 11 + 15} fill={n.color} fontSize={10}
                    opacity={dimmed ? 0.18 : 0.8} style={{ pointerEvents: 'none', fontFamily: FONT }}>
                    {n.size} roles
                  </text>
                )}
                {showAff && (
                  <text textAnchor="middle" y={-n.r - 11 + 15}
                    fill={aColor} fontSize={11.5} fontWeight={700} style={{ pointerEvents: 'none', fontFamily: 'monospace' }}>
                    {affPct}%
                  </text>
                )}
                {isHome && hasJob && (
                  <text textAnchor="middle" y={-n.r - 11 + 15}
                    fill={n.color} fontSize={10} fontWeight={600} opacity={0.85}
                    style={{ pointerEvents: 'none', fontFamily: FONT }}>
                    current family
                  </text>
                )}
              </g>
            );
          })}

          {/* Person marker */}
          {hasJob && jobMarkerPos && selectedJobCluster && (
            <g transform={`translate(${jobMarkerPos.x},${jobMarkerPos.y})`}
              style={{ pointerEvents: 'none' }}>
              <circle r={22} fill={selectedJobCluster.color} opacity={0.07} />
              <circle r={14} fill={selectedJobCluster.color} opacity={0.15} />
              <circle r={7}  fill={selectedJobCluster.color} stroke="white" strokeWidth={2.5} />
              <circle r={2.5} fill="white" />
              <text y={-21} textAnchor="middle" fill={TS} fontSize={12} fontWeight={700} style={{ fontFamily: FONT }}>
                {cleanTitle(selectedJob!.title).slice(0, 28)}
              </text>
              {selectedJob!.job_level && (
                <text y={-8} textAnchor="middle" fill={selectedJobCluster.color}
                  fontSize={10} fontWeight={600} style={{ fontFamily: FONT }}>
                  {selectedJob!.job_level}
                </text>
              )}
            </g>
          )}

        </g>
      </svg>

      {/* ── Left panel — cluster browser ─────────────────────────────────── */}
      {selectedCluster && (
        <div ref={leftPanelRef} data-panel="true"
          className="absolute left-4 top-4 bottom-4 z-20 flex flex-col overflow-hidden"
          style={{ width: 295, background: PANEL_BG, borderLeft: `4px solid ${selectedCluster.color}`, border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ padding: '14px 16px 11px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 2, flexShrink: 0, backgroundColor: selectedCluster.color, boxShadow: `0 0 7px ${selectedCluster.color}70`, display: 'inline-block' }} />
                <div>
                  <h2 style={{ color: TS, fontWeight: 700, fontSize: 15, margin: 0, fontFamily: FONT }}>{selectedCluster.label}</h2>
                  <p style={{ color: TMU, fontSize: 11, margin: '2px 0 0', fontFamily: FONT }}>{selectedCluster.size} roles · Family {selectedCluster.id}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedClusterId(null); setSelectedJob(null); }}
                style={{ color: TMU, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {selectedCluster.keywords.slice(0, 5).map((kw, i) => (
                <span key={i} style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 4, fontWeight: 500, fontFamily: FONT, background: hexAlpha(selectedCluster.color, 0.12), color: selectedCluster.color }}>{kw}</span>
              ))}
            </div>
          </div>

          {/* Keyword freq */}
          {keywordFreq.length > 0 && (
            <div style={{ padding: '9px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <p style={SL}>Keyword Tendencies</p>
              {keywordFreq.map(([kw, count]) => {
                const pct = Math.round((count / selectedJobs.length) * 100);
                return (
                  <div key={kw} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: TS, fontFamily: FONT, width: 68, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw}</span>
                    <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: selectedCluster.color, borderRadius: 2, opacity: 0.7 }} />
                    </div>
                    <span style={{ fontSize: 10, color: TMU, fontFamily: 'monospace', width: 26, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Role list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '9px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ ...SL, margin: 0 }}>Roles</p>
              <span style={{ fontSize: 10, color: TMU, fontFamily: 'monospace' }}>{selectedJobs.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '5px 9px', marginBottom: 7 }}>
              <Search size={12} color={TMU} style={{ flexShrink: 0 }} />
              <input type="text" placeholder="Search…" value={roleSearch}
                onChange={e => setRoleSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 11.5, color: TS, fontFamily: FONT, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {filteredJobs.slice(0, 60).map(job => {
                const isActive = selectedJob?.id === job.id;
                return (
                  <div key={job.id} onClick={e => handleRoleClick(job, e)}
                    title="Click to see career transition map for this role"
                    style={{ padding: '7px 9px', borderRadius: 7, cursor: 'pointer', background: isActive ? hexAlpha(selectedCluster.color, 0.09) : '#f8fafc', border: `1px solid ${isActive ? selectedCluster.color + '45' : BORDER}` }}
                    onMouseEnter={e => { if (!isActive) { const el = e.currentTarget as HTMLDivElement; el.style.background = hexAlpha(selectedCluster.color, 0.06); el.style.borderColor = hexAlpha(selectedCluster.color, 0.38); } }}
                    onMouseLeave={e => { if (!isActive) { const el = e.currentTarget as HTMLDivElement; el.style.background = '#f8fafc'; el.style.borderColor = BORDER; } }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: TS, fontFamily: FONT, fontWeight: isActive ? 600 : 400, flex: 1, lineHeight: 1.35 }}>{cleanTitle(job.title)}</span>
                      <ChevronRight size={12} color={TMU} style={{ flexShrink: 0, marginLeft: 5 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                      {job.job_level && <span style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: hexAlpha(selectedCluster.color, 0.12), color: selectedCluster.color, fontFamily: FONT }}>{job.job_level}</span>}
                      {job.keywords.slice(0, 2).map((kw, i) => <span key={i} style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 3, background: '#f1f5f9', color: TM, fontFamily: FONT, border: `1px solid ${BORDER}` }}>{kw}</span>)}
                    </div>
                  </div>
                );
              })}
              {filteredJobs.length === 0 && <p style={{ fontSize: 11.5, color: TMU, textAlign: 'center', padding: '14px 0', fontFamily: FONT }}>No roles match "{roleSearch}"</p>}
              {filteredJobs.length > 60 && <p style={{ fontSize: 10.5, color: TMU, textAlign: 'center', padding: '6px 0', fontFamily: FONT }}>Showing 60 of {filteredJobs.length} — refine search</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Right panel — role detail + affinities ──────────────────────── */}
      {hasJob && selectedJobCluster && (
        <div ref={rightPanelRef}>
          <ConstellationJobPanel
            job={selectedJob!}
            homeCluster={selectedJobCluster}
            affinities={rankedAffinities}
            onClose={() => setSelectedJob(null)}
            onClusterFocus={focusCluster}
          />
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div data-panel="true" className="absolute top-4 z-10"
        style={{ right: hasJob ? 376 : 16, transition: 'right 0.25s ease', ...OVERLAY, minWidth: 192 }}
        onClick={e => e.stopPropagation()}>
        <p style={SL}>{hasJob ? 'Transition Affinity' : 'Job Families'}</p>
        {[...data.clusters].sort((a, b) => b.size - a.size).map(c => {
          const affinity = jobAffinities[c.id];
          const affPct   = affinity !== undefined && selectedJob && c.id !== selectedJob.cluster_id ? Math.round(affinity * 100) : null;
          const isHome   = selectedJob?.cluster_id === c.id;
          const bColor   = affPct !== null ? affinityColor(affPct) : null;
          return (
            <div key={c.id}
              style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, cursor: 'pointer', opacity: !hasJob && selectedClusterId !== null && selectedClusterId !== c.id ? 0.35 : 1, transition: 'opacity 0.15s' }}
              onClick={() => { setSelectedJob(null); focusCluster(c.id); }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: TS, fontSize: 11.5, flex: 1, fontFamily: FONT, fontWeight: (selectedClusterId === c.id || isHome) ? 700 : 400 }}>
                {c.label} {isHome && <span style={{ fontSize: 9, color: c.color }}>●</span>}
              </span>
              {affPct !== null && bColor
                ? <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'monospace', color: bColor }}>{affPct}%</span>
                : <span style={{ color: TMU, fontSize: 11, fontFamily: 'monospace' }}>{c.size}</span>}
            </div>
          );
        })}
      </div>

      {/* ── Threshold + hint ────────────────────────────────────────────── */}
      {!hasJob && (
        <div data-panel="true" className="absolute bottom-6 left-6 z-10" style={OVERLAY}
          onClick={e => e.stopPropagation()}>
          <label style={{ color: TM, fontSize: 11, display: 'block', marginBottom: 6, fontFamily: FONT }}>
            Connections above <strong style={{ color: TS }}>{(threshold * 100).toFixed(0)}%</strong> overlap
          </label>
          <input type="range" min={0.15} max={0.85} step={0.05} value={threshold}
            onChange={e => setThreshold(+e.target.value)}
            style={{ width: 170, accentColor: '#2563eb', display: 'block' }} />
          <p style={{ fontSize: 10, color: TMU, margin: '7px 0 0', fontFamily: FONT }}>Scroll to zoom · Drag to pan</p>
        </div>
      )}

      {!selectedCluster && !hasJob && (
        <div className="absolute bottom-6 pointer-events-none"
          style={{ left: '50%', transform: 'translateX(-50%)', ...OVERLAY }}>
          <p style={{ color: TMU, fontSize: 12, margin: 0, fontFamily: FONT }}>
            Click a family to browse roles · Click a role to map its career mobility
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const OVERLAY: React.CSSProperties = { background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: 12, padding: '13px 15px', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' };
const SL: React.CSSProperties = { color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'system-ui, -apple-system, sans-serif' };
