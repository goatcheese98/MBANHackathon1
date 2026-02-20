/**
 * Career Constellation — v3 (Vertex AI Edition)
 *
 * Visualization built on pre-computed Vertex AI text-embedding-005 + KMeans(k=25).
 * All 622 job positions are rendered as individual dots at their UMAP coordinates.
 * Similarity connections use pre-computed top-3 similar jobs (not SBERT affinities).
 *
 * Interaction:
 *  - Click a cluster bubble / legend item → pan to cluster, open role browser
 *  - Click any job dot → highlight job + draw lines to its 3 most similar positions
 *  - Click a role in the left panel → navigate to that dot on the map
 *  - Scroll → zoom (cursor-centred)
 *  - Drag → pan
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ConstellationData, ClusterInfo, JobPoint } from '@/types';
import { X, Search, ChevronRight, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';

interface SolarSystemSceneProps { data: ConstellationData; }

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function nodeRadius(size: number) { return Math.max(16, Math.min(52, Math.sqrt(size) * 4.0)); }
function hexAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function cleanTitle(t: string) { return t.replace(/\s*\([^)]+\)/g, '').replace(/^Position:\s*/i, '').trim(); }
function similarityColor(sim: number) { return sim >= 0.70 ? '#16a34a' : sim >= 0.50 ? '#d97706' : '#94a3b8'; }
function ease(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG     = '#f1f5f9';
const BORDER = '#e2e8f0';
const TS     = '#0f172a';
const TM     = '#475569';
const TMU    = '#94a3b8';
const FONT   = 'system-ui, -apple-system, sans-serif';

const OVERLAY: React.CSSProperties = {
  background: 'rgba(255,255,255,0.95)', border: `1px solid ${BORDER}`,
  borderRadius: 12, padding: '13px 15px',
  backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
};
const SL: React.CSSProperties = {
  color: TMU, fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.1em',
  marginBottom: 8, fontFamily: FONT,
};

interface LayoutNode {
  id: number; label: string; size: number; color: string;
  keywords: string[]; centroid: ClusterInfo['centroid'];
  svgX: number; svgY: number; r: number;
}
interface VP { x: number; y: number; scale: number; }

// ─── Right Panel: Job Details ─────────────────────────────────────────────────
interface JobDetailsPanelProps {
  job: JobPoint;
  homeCluster: ClusterInfo;
  similarJobPoints: { job: JobPoint; similarity: number }[];
  onClose: () => void;
  onJobSelect: (job: JobPoint) => void;
}

function JobDetailsRightPanel({ job, homeCluster, similarJobPoints, onClose, onJobSelect }: JobDetailsPanelProps) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const title = cleanTitle(job.title);

  return (
    <div data-panel="true" className="absolute top-4 right-4 z-10"
      style={{ ...OVERLAY, width: 348, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: 0, borderRight: `3px solid ${homeCluster.color}` }}
      onClick={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}>

      {/* Header */}
      <div style={{ padding: '14px 16px 11px', borderBottom: `1px solid ${BORDER}`, background: hexAlpha(homeCluster.color, 0.04) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: homeCluster.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: homeCluster.color, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {homeCluster.label}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TMU, padding: 3, borderRadius: 5, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}>
            <X size={14} />
          </button>
        </div>
        <h3 style={{ color: TS, fontWeight: 700, fontSize: 15, margin: 0, lineHeight: 1.3 }}>{title}</h3>
        <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          {job.employee_id && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#f1f5f9', color: TM, fontFamily: 'monospace' }}>
              {job.employee_id}
            </span>
          )}
          {job.job_level && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: hexAlpha(homeCluster.color, 0.12), color: homeCluster.color }}>
              {job.job_level}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Similar Positions */}
        {similarJobPoints.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <p style={{ ...SL, margin: '0 0 10px' }}>Most Similar Positions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {similarJobPoints.map(({ job: simJob, similarity }) => {
                const sColor = similarityColor(similarity);
                const pct = Math.round(similarity * 100);
                return (
                  <div key={simJob.id} onClick={() => onJobSelect(simJob)}
                    style={{ padding: '8px 10px', background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer' }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = hexAlpha(simJob.color, 0.07); el.style.borderColor = hexAlpha(simJob.color, 0.4); }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#f8fafc'; el.style.borderColor = BORDER; }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: simJob.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, color: TS, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cleanTitle(simJob.title)}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sColor, fontFamily: 'monospace', flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
                    </div>
                    {/* Similarity bar */}
                    <div style={{ height: 4, background: BORDER, borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: sColor, borderRadius: 2 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: hexAlpha(simJob.color, 0.10), color: simJob.color }}>
                        {simJob.cluster_label || `Family ${simJob.cluster_id}`}
                      </span>
                      {simJob.employee_id && (
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: TMU }}>{simJob.employee_id}</span>
                      )}
                      {simJob.skills.slice(0, 2).map((sk, i) => (
                        <span key={i} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#f1f5f9', color: TM, border: `1px solid ${BORDER}` }}>{sk}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Summary */}
        {job.summary && (
          <section style={{ marginBottom: 16 }}>
            <p style={{ ...SL, margin: '0 0 8px' }}>Summary</p>
            <p style={{
              fontSize: 11.5, color: TM, lineHeight: 1.55, margin: 0,
              display: summaryOpen ? 'block' : '-webkit-box',
              WebkitLineClamp: summaryOpen ? undefined : 3,
              WebkitBoxOrient: 'vertical',
              overflow: summaryOpen ? 'visible' : 'hidden',
            } as React.CSSProperties}>
              {job.summary}
            </p>
            {job.summary.length > 160 && (
              <button onClick={() => setSummaryOpen(o => !o)}
                style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: homeCluster.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                {summaryOpen ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show more</>}
              </button>
            )}
          </section>
        )}

        {/* Keywords */}
        {job.keywords.length > 0 && (
          <section style={{ marginBottom: 16 }}>
            <p style={{ ...SL, margin: '0 0 8px' }}>Keywords</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {job.keywords.map((kw, i) => (
                <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: hexAlpha(homeCluster.color, 0.10), border: `1px solid ${hexAlpha(homeCluster.color, 0.25)}`, color: homeCluster.color }}>
                  {kw}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {job.skills.length > 0 && (
          <section>
            <p style={{ ...SL, margin: '0 0 8px' }}>Competencies <span style={{ color: TMU, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({job.skills.length})</span></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {job.skills.map((sk, i) => (
                <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#f8fafc', border: `1px solid ${BORDER}`, color: TM }}>
                  {sk}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: TMU }}>
          ID <span style={{ fontFamily: 'monospace', fontWeight: 600, color: TM }}>{job.id}</span>
        </span>
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: TMU }}>
          <span>{job.keywords.length} keywords</span>
          <span style={{ color: BORDER }}>·</span>
          <span>{job.skills.length} skills</span>
          {typeof job.distance_to_center === 'number' && (
            <>
              <span style={{ color: BORDER }}>·</span>
              <span>dist {job.distance_to_center.toFixed(2)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Right Panel: Job Families legend ────────────────────────────────────────
function LegendPanel({ data, selectedClusterId, onClusterFocus }: {
  data: ConstellationData; selectedClusterId: number | null; onClusterFocus: (id: number) => void;
}) {
  return (
    <div data-panel="true" className="absolute top-4 right-4 z-10"
      style={{ ...OVERLAY, width: 220, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: 0 }}
      onClick={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}>
      <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${BORDER}` }}>
        <p style={{ ...SL, margin: 0 }}>Job Families</p>
        <p style={{ fontSize: 10, color: TMU, margin: '3px 0 0', fontFamily: FONT }}>
          {data.clusters.length} clusters · click to explore
        </p>
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        {[...data.clusters].sort((a, b) => b.size - a.size).map(c => {
          const isSelected = selectedClusterId === c.id;
          return (
            <div key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', marginBottom: 2,
                borderRadius: 7, cursor: 'pointer',
                opacity: selectedClusterId !== null && !isSelected ? 0.30 : 1,
                transition: 'opacity 0.15s, background 0.12s',
                background: isSelected ? hexAlpha(c.color, 0.10) : 'transparent',
              }}
              onClick={() => onClusterFocus(c.id)}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: c.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: TS, fontSize: 11.5, flex: 1, fontFamily: FONT, fontWeight: isSelected ? 700 : 400, lineHeight: 1.3 }}>{c.label}</span>
              <span style={{ color: TMU, fontSize: 10, fontFamily: 'monospace', flexShrink: 0 }}>{c.size}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SolarSystemScene({ data }: SolarSystemSceneProps) {

  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [selectedJob,       setSelectedJob       ] = useState<JobPoint | null>(null);
  const [roleSearch,        setRoleSearch         ] = useState('');
  const [hoveredJobId,      setHoveredJobId       ] = useState<number | null>(null);

  const containerRef  = useRef<HTMLDivElement>(null);
  const leftPanelRef  = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const obs = new ResizeObserver(e => {
      const r = e[0].contentRect;
      setDims({ w: r.width, h: r.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Viewport ──────────────────────────────────────────────────────────────
  const vpRef = useRef<VP>({ x: 0, y: 0, scale: 1 });
  const [vp, _setVp] = useState<VP>({ x: 0, y: 0, scale: 1 });
  const setVp = useCallback((next: VP) => { vpRef.current = next; _setVp(next); }, []);

  const rafRef = useRef<number | null>(null);
  const animateTo = useCallback((target: VP, duration = 680) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const from = { ...vpRef.current };
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const e = ease(t);
      setVp({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, scale: from.scale + (target.scale - from.scale) * e });
      rafRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [setVp]);

  const centreOn = useCallback((sx: number, sy: number, targetScale: number): VP => {
    const s = Math.max(vpRef.current.scale, targetScale);
    return { x: dims.w / 2 - sx * s, y: dims.h / 2 - sy * s, scale: s };
  }, [dims]);

  // Scroll-to-zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Let panel elements (legend, job details, etc.) scroll naturally
      if ((e.target as Element).closest('[data-panel]')) return;
      e.preventDefault();
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      const f = e.deltaY > 0 ? 0.92 : 1.09;
      const cur = vpRef.current;
      const s = Math.max(0.15, Math.min(12, cur.scale * f));
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

  useEffect(() => { setRoleSearch(''); }, [selectedClusterId]);

  // ── Data helpers ──────────────────────────────────────────────────────────

  /** employee_id → JobPoint lookup (for resolving precomputed similar jobs) */
  const empToJob = useMemo(() => {
    const m = new Map<string, JobPoint>();
    data.jobs.forEach(j => { if (j.employee_id) m.set(j.employee_id, j); });
    return m;
  }, [data.jobs]);

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

  /** Pre-computed SVG positions for every job */
  const jobPositions = useMemo(() => {
    const m = new Map<number, { x: number; y: number }>();
    data.jobs.forEach(j => { m.set(j.id, toSVG({ x: j.x, y: j.y })); });
    return m;
  }, [data.jobs, toSVG]);

  /** Resolved top-3 similar jobs for the selected role */
  const similarJobPoints = useMemo<{ job: JobPoint; similarity: number }[]>(() => {
    if (!selectedJob?.similar_jobs?.length) return [];
    return selectedJob.similar_jobs
      .map(s => { const found = empToJob.get(s.employee_id); return found ? { job: found, similarity: s.similarity } : null; })
      .filter((x): x is { job: JobPoint; similarity: number } => x !== null);
  }, [selectedJob, empToJob]);

  const similarJobIds   = useMemo(() => new Set(similarJobPoints.map(s => s.job.id)), [similarJobPoints]);
  const selectedJobPos  = useMemo(() => selectedJob ? jobPositions.get(selectedJob.id) ?? null : null, [selectedJob, jobPositions]);
  const selectedCluster = useMemo(() => data.clusters.find(c => c.id === selectedClusterId) ?? null, [data.clusters, selectedClusterId]);
  const selectedJobCluster = useMemo(() => selectedJob ? data.clusters.find(c => c.id === selectedJob.cluster_id) ?? null : null, [data.clusters, selectedJob]);
  const selectedJobs = useMemo(() => selectedClusterId !== null ? clusterJobs[selectedClusterId] ?? [] : [], [selectedClusterId, clusterJobs]);
  const filteredJobs = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    return q ? selectedJobs.filter(j => j.title.toLowerCase().includes(q) || (j.employee_id ?? '').toLowerCase().includes(q)) : selectedJobs;
  }, [selectedJobs, roleSearch]);

  /** Top skills frequency for the selected cluster */
  const clusterSkills = useMemo(() => {
    if (selectedClusterId === null) return [];
    const freq: Record<string, number> = {};
    (clusterJobs[selectedClusterId] ?? []).forEach(j => j.skills.forEach(sk => { freq[sk] = (freq[sk] ?? 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [selectedClusterId, clusterJobs]);

  /** Top keyword frequency for the selected cluster */
  const keywordFreq = useMemo(() => {
    if (selectedClusterId === null) return [];
    const freq: Record<string, number> = {};
    (clusterJobs[selectedClusterId] ?? []).forEach(j => j.keywords.forEach(kw => { freq[kw] = (freq[kw] ?? 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [selectedClusterId, clusterJobs]);

  /** Label positions after iterative repulsion to prevent overlaps */
  const labelPositions = useMemo(() => {
    const CHAR_W = 6.0;
    const PAD_X = 3, PAD_Y = 2; // tight gap between label boxes

    const labels = nodes.map(n => ({
      id: n.id,
      x: n.svgX,
      y: n.svgY - n.r - 10,
      anchorX: n.svgX,
      anchorY: n.svgY - n.r - 10,
      w: n.label.length * CHAR_W + 12,
      h: 22,
    }));

    for (let iter = 0; iter < 20; iter++) {
      // Repulsion
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i], b = labels[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const minDx = (a.w + b.w) / 2 + PAD_X;
          const minDy = (a.h + b.h) / 2 + PAD_Y;

          if (Math.abs(dx) < minDx && Math.abs(dy) < minDy) {
            const overlapX = minDx - Math.abs(dx);
            const overlapY = minDy - Math.abs(dy);
            if (overlapX < overlapY) {
              const push = overlapX * 0.4;
              labels[i].x += dx >= 0 ? push : -push;
              labels[j].x -= dx >= 0 ? push : -push;
            } else {
              const push = overlapY * 0.4;
              labels[i].y += dy >= 0 ? push : -push;
              labels[j].y -= dy >= 0 ? push : -push;
            }
          }
        }
      }
      // Weak anchor pull — prevents labels drifting too far
      for (const l of labels) {
        l.x += (l.anchorX - l.x) * 0.08;
        l.y += (l.anchorY - l.y) * 0.08;
      }
    }

    return new Map(labels.map(l => [l.id, l]));
  }, [nodes]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const fitBounds = useCallback((points: { x: number; y: number }[], padding = 100): VP => {
    if (points.length === 0) return vpRef.current;
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const scale = Math.max(0.3, Math.min(2.8, Math.min(dims.w / contentW, dims.h / contentH)));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return { x: dims.w / 2 - cx * scale, y: dims.h / 2 - cy * scale, scale };
  }, [dims]);

  const focusCluster = useCallback((id: number) => {
    const node = nodeMap[id];
    if (!node) return;
    setSelectedClusterId(id);
    setSelectedJob(null);
    animateTo(centreOn(node.svgX, node.svgY, 1.4));
  }, [nodeMap, animateTo, centreOn]);

  const focusRole = useCallback((job: JobPoint) => {
    setSelectedJob(job);
    setSelectedClusterId(job.cluster_id);
    const pos = jobPositions.get(job.id);
    if (!pos) return;

    // Fit view to include the job + its similar jobs
    const points: { x: number; y: number }[] = [pos];
    (job.similar_jobs ?? []).forEach(s => {
      const simJob = empToJob.get(s.employee_id);
      if (simJob) { const p = jobPositions.get(simJob.id); if (p) points.push(p); }
    });
    const homeNode = nodeMap[job.cluster_id];
    if (homeNode && points.length <= 2) points.push({ x: homeNode.svgX, y: homeNode.svgY });

    animateTo(fitBounds(points, 120), 850);
  }, [jobPositions, nodeMap, empToJob, animateTo, fitBounds]);

  // ── Click handlers ────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasDragged.current) { hasDragged.current = false; return; }
    focusCluster(id);
  }, [focusCluster]);

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

      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <g transform={`translate(${vp.x},${vp.y}) scale(${vp.scale})`}>

          {/* ── Layer 1: Cluster bubble fills (behind everything) ─────────── */}
          {nodes.map(n => {
            const isSel  = n.id === selectedClusterId;
            const isHome = selectedJob?.cluster_id === n.id;
            const dimmed = (selectedClusterId !== null && !isSel && !hasJob) || (hasJob && !isHome);
            const fillAlpha = hasJob ? (isHome ? 0.12 : 0.025) : isSel ? 0.13 : 0.055;

            return (
              <g key={`bubble-${n.id}`} data-node="true" transform={`translate(${n.svgX},${n.svgY})`}
                onClick={ev => handleNodeClick(n.id, ev)} style={{ cursor: 'pointer' }}>
                {(isSel || isHome) && (
                  <circle r={n.r + 9} fill="none" stroke={n.color} strokeWidth={2} opacity={0.35} strokeDasharray="4,3" />
                )}
                <circle r={n.r}
                  fill={hexAlpha(n.color, fillAlpha)}
                  stroke={n.color}
                  strokeWidth={isSel || isHome ? 2.5 : 1.5}
                  strokeOpacity={dimmed ? 0.18 : 0.9} />
              </g>
            );
          })}

          {/* ── Layer 2: Similarity lines (selected job → similar jobs) ───── */}
          {hasJob && selectedJobPos && similarJobPoints.map(({ job: simJob, similarity }) => {
            const simPos = jobPositions.get(simJob.id);
            if (!simPos) return null;
            const sColor = similarityColor(similarity);
            return (
              <line key={`simline-${simJob.id}`}
                x1={selectedJobPos.x} y1={selectedJobPos.y}
                x2={simPos.x} y2={simPos.y}
                stroke={sColor}
                strokeWidth={1.2 + similarity * 2.5}
                opacity={0.35 + similarity * 0.45}
                strokeDasharray={similarity < 0.65 ? '5,4' : undefined} />
            );
          })}

          {/* ── Layer 3: All 622 job dots ─────────────────────────────────── */}
          {data.jobs.map(job => {
            const pos = jobPositions.get(job.id);
            if (!pos) return null;

            const isSelected   = selectedJob?.id === job.id;
            const isSimilar    = similarJobIds.has(job.id);
            const isHovered    = hoveredJobId === job.id;
            const inSelCluster = selectedClusterId !== null && job.cluster_id === selectedClusterId;

            const dimmed =
              (selectedClusterId !== null && !hasJob && !inSelCluster) ||
              (hasJob && !isSelected && !isSimilar);

            const r = isSelected ? 7 : isSimilar ? 5.5 : isHovered ? 5 : 3.5;
            const opacity = dimmed ? 0.07
              : isSelected ? 1
              : isSimilar  ? 0.92
              : isHovered  ? 0.85
              : inSelCluster ? 0.65
              : selectedClusterId !== null ? 0.40
              : 0.18;

            return (
              <circle key={job.id}
                cx={pos.x} cy={pos.y} r={r}
                fill={job.color}
                opacity={opacity}
                stroke={isSelected ? 'white' : isSimilar ? 'white' : 'none'}
                strokeWidth={isSelected ? 2 : isSimilar ? 1.5 : 0}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredJobId(job.id)}
                onMouseLeave={() => setHoveredJobId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasDragged.current) { hasDragged.current = false; return; }
                  focusRole(job);
                }}
              />
            );
          })}

          {/* ── Layer 4: Selected job marker ─────────────────────────────── */}
          {hasJob && selectedJobPos && selectedJobCluster && (
            <g transform={`translate(${selectedJobPos.x},${selectedJobPos.y})`} style={{ pointerEvents: 'none' }}>
              <circle r={22} fill={selectedJobCluster.color} opacity={0.06} />
              <circle r={14} fill={selectedJobCluster.color} opacity={0.13} />
              <circle r={7} fill={selectedJobCluster.color} stroke="white" strokeWidth={2.5} />
              <circle r={2.5} fill="white" />
            </g>
          )}

          {/* ── Layer 5: Similar job rings (text moved to right panel) ──── */}
          {hasJob && similarJobPoints.map(({ job: simJob, similarity }) => {
            const simPos = jobPositions.get(simJob.id);
            if (!simPos) return null;
            const sColor = similarityColor(similarity);
            return (
              <circle key={`simring-${simJob.id}`}
                cx={simPos.x} cy={simPos.y} r={10}
                fill="none" stroke={sColor} strokeWidth={1.5} opacity={0.5}
                style={{ pointerEvents: 'none' }} />
            );
          })}

          {/* ── Layer 6: Hover tooltips ───────────────────────────────────── */}
          {hoveredJobId !== null && (() => {
            const hJob = data.jobs.find(j => j.id === hoveredJobId);
            const hPos = hJob ? jobPositions.get(hJob.id) : null;
            if (!hJob || !hPos) return null;

            /* ── 6a: Similar-job tooltip (when a job is selected) ──────── */
            if (hasJob && similarJobIds.has(hJob.id)) {
              const simData = similarJobPoints.find(s => s.job.id === hJob.id);
              if (!simData) return null;
              const sColor = similarityColor(simData.similarity);
              const pct = Math.round(simData.similarity * 100);
              const title = cleanTitle(hJob.title);
              const clusterLabel = hJob.cluster_label || `Family ${hJob.cluster_id}`;
              const TW = 214, TH = hJob.employee_id ? 58 : 46;
              const cardTop = -TH - 16;
              const lx = -TW / 2 + 11; // left text x (after strip)
              const rx = TW / 2 - 8;   // right text x (for %)
              return (
                <g transform={`translate(${hPos.x},${hPos.y})`} style={{ pointerEvents: 'none' }}>
                  {/* card */}
                  <rect x={-TW / 2} y={cardTop} width={TW} height={TH} rx={7}
                    fill="white" stroke={sColor} strokeWidth={1.5}
                    style={{ filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.10))' }} />
                  {/* left accent strip */}
                  <rect x={-TW / 2} y={cardTop} width={4} height={TH} rx={2} fill={sColor} />
                  {/* row 1: title (left) + similarity % (right) */}
                  <text x={lx} y={cardTop + 17} textAnchor="start"
                    fill={TS} fontSize={11} fontWeight={700} style={{ fontFamily: FONT }}>
                    {title.length > 21 ? title.slice(0, 20) + '…' : title}
                  </text>
                  <text x={rx} y={cardTop + 17} textAnchor="end"
                    fill={sColor} fontSize={12} fontWeight={800} style={{ fontFamily: 'monospace' }}>
                    {pct}%
                  </text>
                  {/* row 2: cluster label */}
                  <text x={lx} y={cardTop + 31} textAnchor="start"
                    fill={TM} fontSize={9.5} style={{ fontFamily: FONT }}>
                    {clusterLabel.length > 34 ? clusterLabel.slice(0, 33) + '…' : clusterLabel}
                  </text>
                  {/* row 3: employee id */}
                  {hJob.employee_id && (
                    <text x={lx} y={cardTop + 44} textAnchor="start"
                      fill={TMU} fontSize={8.5} style={{ fontFamily: 'monospace' }}>
                      {hJob.employee_id}
                    </text>
                  )}
                </g>
              );
            }

            /* ── 6b: Normal hover tooltip (no job selected) ─────────────── */
            if (hasJob) return null;
            const title = cleanTitle(hJob.title);
            const w = Math.min(220, Math.max(120, title.length * 6.2 + 24));
            return (
              <g transform={`translate(${hPos.x},${hPos.y - 14})`} style={{ pointerEvents: 'none' }}>
                <rect x={-w / 2} y={-22} width={w} height={hJob.employee_id ? 28 : 20} rx={5}
                  fill="white" stroke={BORDER} strokeWidth={1}
                  style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />
                <text y={-8} textAnchor="middle" fill={TS} fontSize={10.5} fontWeight={600} style={{ fontFamily: FONT }}>
                  {title.length > 34 ? title.slice(0, 33) + '…' : title}
                </text>
                {hJob.employee_id && (
                  <text y={6} textAnchor="middle" fill={TMU} fontSize={9} style={{ fontFamily: 'monospace' }}>
                    {hJob.employee_id}
                  </text>
                )}
              </g>
            );
          })()}

          {/* ── Layer 7: Cluster labels — hidden when job is focused ──────── */}
          {!hasJob && nodes.map(n => {
            const isSel  = n.id === selectedClusterId;
            const dimmed = selectedClusterId !== null && !isSel;
            const lp = labelPositions.get(n.id);
            if (!lp) return null;

            const dispX = lp.x - lp.anchorX;
            const dispY = lp.y - lp.anchorY;
            const displaced = Math.sqrt(dispX * dispX + dispY * dispY) > 18;

            return (
              <g key={`label-${n.id}`} style={{ pointerEvents: 'none' }}>
                {/* Thin leader line from displaced label back to cluster bubble */}
                {displaced && (
                  <line
                    x1={lp.x} y1={lp.y + 14}
                    x2={n.svgX} y2={n.svgY - n.r - 2}
                    stroke={TS}
                    strokeWidth={0.6}
                    opacity={dimmed ? 0.07 : 0.18}
                    strokeDasharray="2,3"
                  />
                )}
                <g transform={`translate(${lp.x},${lp.y})`}>
                  <text textAnchor="middle" y={0}
                    fill={TS} fontSize={isSel ? 12.5 : 10.5}
                    fontWeight={isSel ? 700 : 500}
                    opacity={dimmed ? 0.20 : 0.9}
                    style={{ fontFamily: FONT }}>
                    {n.label}
                  </text>
                  <text textAnchor="middle" y={12} fill={n.color} fontSize={9}
                    opacity={dimmed ? 0.12 : 0.65}>
                    {n.size} roles
                  </text>
                </g>
              </g>
            );
          })}

        </g>
      </svg>

      {/* ── Left panel — Cluster browser (collapses to breadcrumb when job focused) */}
      {selectedCluster && hasJob ? (
        /* Mini breadcrumb strip when a job is selected */
        <div data-panel="true" className="absolute left-4 top-4 z-20" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setSelectedJob(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 14px 8px 10px',
              background: 'white', border: `1px solid ${BORDER}`,
              borderLeft: `3px solid ${selectedCluster.color}`,
              borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              cursor: 'pointer', fontFamily: FONT, fontSize: 12, color: TS,
            }}
          >
            <ChevronLeft size={13} color={TMU} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: selectedCluster.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: TM, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedCluster.label}
            </span>
            <span style={{ fontSize: 10, color: TMU, fontFamily: 'monospace', flexShrink: 0, marginLeft: 2 }}>
              {selectedCluster.size}
            </span>
          </button>
        </div>
      ) : selectedCluster ? (
        <div ref={leftPanelRef} data-panel="true"
          className="absolute left-4 top-4 bottom-4 z-20 flex flex-col overflow-hidden"
          style={{ width: 295, background: 'white', borderLeft: `4px solid ${selectedCluster.color}`, border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ padding: '14px 16px 11px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 2, flexShrink: 0, backgroundColor: selectedCluster.color, boxShadow: `0 0 8px ${selectedCluster.color}70`, display: 'inline-block' }} />
                <div>
                  <h2 style={{ color: TS, fontWeight: 700, fontSize: 14, margin: 0, fontFamily: FONT, lineHeight: 1.3 }}>{selectedCluster.label}</h2>
                  <p style={{ color: TMU, fontSize: 11, margin: '2px 0 0', fontFamily: FONT }}>{selectedCluster.size} roles · Family {selectedCluster.id}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedClusterId(null); setSelectedJob(null); }}
                style={{ color: TMU, background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {selectedCluster.keywords.slice(0, 5).map((kw, i) => (
                <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500, fontFamily: FONT, background: hexAlpha(selectedCluster.color, 0.12), color: selectedCluster.color }}>{kw}</span>
              ))}
            </div>
          </div>

          {/* Top Skills for this cluster */}
          {clusterSkills.length > 0 && (
            <div style={{ padding: '9px 14px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <p style={SL}>Skill Breakdown</p>
              {clusterSkills.map(([sk, count]) => {
                const pct = Math.round((count / selectedJobs.length) * 100);
                return (
                  <div key={sk} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: TS, fontFamily: FONT, width: 112, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sk}</span>
                    <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: selectedCluster.color, borderRadius: 2, opacity: 0.75 }} />
                    </div>
                    <span style={{ fontSize: 10, color: TMU, fontFamily: 'monospace', width: 28, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Keyword tendencies */}
          {keywordFreq.length > 0 && (
            <div style={{ padding: '9px 14px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <p style={SL}>Keyword Tendencies</p>
              {keywordFreq.map(([kw, count]) => {
                const pct = Math.round((count / selectedJobs.length) * 100);
                return (
                  <div key={kw} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: TS, fontFamily: FONT, width: 72, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw}</span>
                    <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: selectedCluster.color, borderRadius: 2, opacity: 0.65 }} />
                    </div>
                    <span style={{ fontSize: 10, color: TMU, fontFamily: 'monospace', width: 28, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Role list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '9px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ ...SL, margin: 0 }}>Roles</p>
              <span style={{ fontSize: 10, color: TMU, fontFamily: 'monospace' }}>{selectedJobs.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '5px 9px', marginBottom: 7 }}>
              <Search size={12} color={TMU} style={{ flexShrink: 0 }} />
              <input type="text" placeholder="Search by name or ID…" value={roleSearch}
                onChange={e => setRoleSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 11.5, color: TS, fontFamily: FONT, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {filteredJobs.slice(0, 60).map(job => {
                const isActive = selectedJob?.id === job.id;
                return (
                  <div key={job.id}
                    onClick={e => { e.stopPropagation(); focusRole(job); }}
                    style={{ padding: '7px 9px', borderRadius: 7, cursor: 'pointer', background: isActive ? hexAlpha(selectedCluster.color, 0.09) : '#f8fafc', border: `1px solid ${isActive ? selectedCluster.color + '45' : BORDER}` }}
                    onMouseEnter={e => { if (!isActive) { const el = e.currentTarget as HTMLDivElement; el.style.background = hexAlpha(selectedCluster.color, 0.06); el.style.borderColor = hexAlpha(selectedCluster.color, 0.38); } }}
                    onMouseLeave={e => { if (!isActive) { const el = e.currentTarget as HTMLDivElement; el.style.background = '#f8fafc'; el.style.borderColor = BORDER; } }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: TS, fontFamily: FONT, fontWeight: isActive ? 600 : 400, flex: 1, lineHeight: 1.35 }}>{cleanTitle(job.title)}</span>
                      <ChevronRight size={12} color={TMU} style={{ flexShrink: 0, marginLeft: 5 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {job.employee_id && <span style={{ fontSize: 9, fontFamily: 'monospace', color: TMU }}>{job.employee_id}</span>}
                      {job.skills.slice(0, 2).map((sk, i) => (
                        <span key={i} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: hexAlpha(selectedCluster.color, 0.12), color: selectedCluster.color, fontFamily: FONT }}>{sk}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filteredJobs.length === 0 && (
                <p style={{ fontSize: 11.5, color: TMU, textAlign: 'center', padding: '14px 0', fontFamily: FONT }}>No roles match "{roleSearch}"</p>
              )}
              {filteredJobs.length > 60 && (
                <p style={{ fontSize: 10.5, color: TMU, textAlign: 'center', padding: '6px 0', fontFamily: FONT }}>Showing 60 of {filteredJobs.length} — refine search</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      {hasJob && selectedJob && selectedJobCluster ? (
        <JobDetailsRightPanel
          job={selectedJob}
          homeCluster={selectedJobCluster}
          similarJobPoints={similarJobPoints}
          onClose={() => setSelectedJob(null)}
          onJobSelect={job => focusRole(job)}
        />
      ) : (
        <LegendPanel
          data={data}
          selectedClusterId={selectedClusterId}
          onClusterFocus={focusCluster}
        />
      )}

      {/* ── Bottom-left: context-aware hint ────────────────────────────────── */}
      <div data-panel="true" className="absolute bottom-6 left-6 z-10" style={{ ...OVERLAY, padding: '9px 13px' }}
        onClick={e => e.stopPropagation()}>
        {hasJob ? (
          /* Similarity legend — only relevant when viewing a job */
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: TMU, fontFamily: FONT }}>
            <span style={{ fontSize: 10, color: TM, fontWeight: 600, marginRight: 4 }}>Similarity:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />≥70%
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />50–70%
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#94a3b8' }} />&lt;50%
            </span>
          </div>
        ) : (
          <p style={{ fontSize: 10, color: TM, margin: 0, fontFamily: FONT }}>
            {selectedCluster ? 'Click any dot to view job details' : 'Scroll to zoom · Drag to pan · Click a bubble to explore'}
          </p>
        )}
      </div>

      {/* ── Centre hint — only when nothing is selected ─────────────────────── */}
      {!selectedCluster && !hasJob && (
        <div className="absolute bottom-6 pointer-events-none"
          style={{ left: '50%', transform: 'translateX(-50%)', ...OVERLAY }}>
          <p style={{ color: TMU, fontSize: 12, margin: 0, fontFamily: FONT }}>
            Click a family bubble to browse roles · Click any dot to view details &amp; similar positions
          </p>
        </div>
      )}
    </div>
  );
}
