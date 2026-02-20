/**
 * Career Constellation — simplified map
 *
 * - Click cluster → browse roles in that family
 * - Click role → see top 3 pre-computed similar roles
 * - Scroll to zoom, drag to pan
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ConstellationData, JobPoint } from '@/types';
import { X, Search, ChevronRight } from 'lucide-react';

interface Props { data: ConstellationData; }

// ── helpers ───────────────────────────────────────────────────────────────────
function nodeRadius(size: number) { return Math.max(22, Math.min(52, Math.sqrt(size) * 4.2)); }
function hexAlpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
function cleanTitle(t: string) { return t.replace(/\s*\([^)]+\)/g,'').replace(/^Position:\s*/i,'').trim(); }
function easeInOut(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
function simPct(s: number) { return Math.round(s * 100); }

// ── tokens ────────────────────────────────────────────────────────────────────
const BG     = '#f1f5f9';
const BORDER = '#e2e8f0';
const TS     = '#0f172a';
const TM     = '#475569';
const TMU    = '#94a3b8';
const FONT   = 'system-ui, -apple-system, sans-serif';
const PANEL: React.CSSProperties = {
  background: 'rgba(255,255,255,0.97)',
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  fontFamily: FONT,
};

interface VP { x: number; y: number; scale: number; }

export default function SolarSystemScene({ data }: Props) {
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [selectedJob,       setSelectedJob]        = useState<JobPoint | null>(null);
  const [roleSearch,        setRoleSearch]          = useState('');

  // container size
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 800 });
  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setDims({ w: e.contentRect.width, h: e.contentRect.height }));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // viewport
  const vpRef = useRef<VP>({ x: 0, y: 0, scale: 1 });
  const [vp, _setVp] = useState<VP>({ x: 0, y: 0, scale: 1 });
  const setVp = useCallback((v: VP) => { vpRef.current = v; _setVp(v); }, []);

  // animation
  const rafRef = useRef<number | null>(null);
  const animateTo = useCallback((target: VP, dur = 680) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = { ...vpRef.current }, t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur), e = easeInOut(t);
      setVp({ x: from.x + (target.x - from.x)*e, y: from.y + (target.y - from.y)*e, scale: from.scale + (target.scale - from.scale)*e });
      rafRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [setVp]);

  const centreOn = useCallback((sx: number, sy: number, s: number): VP => {
    const scale = Math.max(vpRef.current.scale, s);
    return { x: dims.w/2 - sx*scale, y: dims.h/2 - sy*scale, scale };
  }, [dims]);

  // wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      const f = e.deltaY > 0 ? 0.92 : 1.09;
      const cur = vpRef.current, s = Math.max(0.2, Math.min(7, cur.scale * f));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      setVp({ scale: s, x: mx - (mx - cur.x)*(s/cur.scale), y: my - (my - cur.y)*(s/cur.scale) });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [setVp]);

  // pan
  const panRef    = useRef(false);
  const originRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const dragRef   = useRef(false);
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('[data-ui]')) return;
    e.preventDefault();
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    panRef.current = true; dragRef.current = false;
    originRef.current = { x: e.clientX, y: e.clientY, vx: vpRef.current.x, vy: vpRef.current.y };
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    const dx = e.clientX - originRef.current.x, dy = e.clientY - originRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current = true;
      setVp({ ...vpRef.current, x: originRef.current.vx + dx, y: originRef.current.vy + dy });
    }
  }, [setVp]);
  const stopPan = useCallback(() => { panRef.current = false; }, []);

  // SVG coords
  const toSVG = useCallback((x: number, y: number) => {
    const PAD = 110, sx = (dims.w/2 - PAD)/50, sy = (dims.h/2 - PAD)/50;
    return { x: dims.w/2 + x*sx, y: dims.h/2 - y*sy };
  }, [dims]);

  // cluster nodes
  const nodes = useMemo(() =>
    data.clusters.map(c => {
      const p = toSVG(c.centroid.x, c.centroid.y);
      return { ...c, svgX: p.x, svgY: p.y, r: nodeRadius(c.size) };
    }), [data.clusters, toSVG]);

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  // cluster → jobs
  const clusterJobs = useMemo<Record<number, JobPoint[]>>(() => {
    const m: Record<number, JobPoint[]> = {};
    data.clusters.forEach(c => { m[c.id] = []; });
    data.jobs.forEach(j => { m[j.cluster_id]?.push(j); });
    return m;
  }, [data]);

  useEffect(() => { setRoleSearch(''); }, [selectedClusterId]);

  const selectedCluster = useMemo(() => data.clusters.find(c => c.id === selectedClusterId) ?? null, [data.clusters, selectedClusterId]);
  const clusterRoles    = useMemo(() => selectedClusterId !== null ? clusterJobs[selectedClusterId] ?? [] : [], [selectedClusterId, clusterJobs]);
  const filteredRoles   = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    return q ? clusterRoles.filter(j => j.title.toLowerCase().includes(q)) : clusterRoles;
  }, [clusterRoles, roleSearch]);

  // top-3 similar jobs (pre-computed) — used in both SVG and right panel
  const similarJobs = useMemo(() => {
    if (!selectedJob?.similar_jobs?.length) return [];
    return selectedJob.similar_jobs.slice(0, 3).flatMap(s => {
      const job = data.jobs.find(j => j.employee_id === s.employee_id);
      return job ? [{ job, pct: simPct(s.similarity) }] : [];
    });
  }, [selectedJob, data.jobs]);

  // SVG positions for selected job + its similar jobs
  const selectedJobSVG = useMemo(() =>
    selectedJob ? toSVG(selectedJob.x, selectedJob.y) : null
  , [selectedJob, toSVG]);

  const similarJobsSVG = useMemo(() =>
    similarJobs.map(({ job, pct }) => ({ ...toSVG(job.x, job.y), pct, job }))
  , [similarJobs, toSVG]);

  // focus helpers
  const focusCluster = useCallback((id: number) => {
    const n = nodeMap[id]; if (!n) return;
    setSelectedClusterId(id); setSelectedJob(null);
    animateTo(centreOn(n.svgX, n.svgY, 1.4));
  }, [nodeMap, animateTo, centreOn]);

  const focusRole = useCallback((job: JobPoint) => {
    setSelectedJob(job); setSelectedClusterId(job.cluster_id);
    const p = toSVG(job.x, job.y);
    animateTo(centreOn(p.x, p.y, 2.2), 820);
  }, [animateTo, centreOn, toSVG]);

  const handleBgClick = useCallback(() => {
    if (dragRef.current) { dragRef.current = false; return; }
    setSelectedClusterId(null); setSelectedJob(null);
  }, []);

  const handleNodeClick = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragRef.current) { dragRef.current = false; return; }
    focusCluster(id);
  }, [focusCluster]);

  const handleRoleClick = useCallback((job: JobPoint, e: React.MouseEvent) => {
    e.stopPropagation();
    focusRole(job);
  }, [focusRole]);

  const jobCluster = useMemo(() =>
    selectedJob ? data.clusters.find(c => c.id === selectedJob.cluster_id) ?? null : null
  , [data.clusters, selectedJob]);

  const hasJob = selectedJob !== null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ background: BG, userSelect: 'none', fontFamily: FONT }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={stopPan} onMouseLeave={stopPan} onClick={handleBgClick}
    >
      {/* ── SVG ─────────────────────────────────────────────────────────── */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <g transform={`translate(${vp.x},${vp.y}) scale(${vp.scale})`}>

          {/* Cluster nodes */}
          {nodes.map(n => {
            const isSel  = n.id === selectedClusterId;
            const dimmed = selectedClusterId !== null && !isSel;
            const alpha  = dimmed ? 0.05 : isSel ? 0.15 : 0.09;
            return (
              <g key={n.id} data-ui
                transform={`translate(${n.svgX},${n.svgY})`}
                onClick={ev => handleNodeClick(n.id, ev)}
                style={{ cursor: 'pointer' }}>
                {isSel && (
                  <circle r={n.r + 9} fill="none" stroke={n.color} strokeWidth={2} opacity={0.35} />
                )}
                <circle r={n.r}
                  fill={hexAlpha(n.color, alpha)} stroke={n.color}
                  strokeWidth={isSel ? 2.5 : 1.5}
                  strokeOpacity={dimmed ? 0.18 : 1} />
                <text textAnchor="middle" y={-n.r - 10}
                  fill={TS} fontSize={isSel ? 13 : 11} fontWeight={isSel ? 700 : 500}
                  opacity={dimmed ? 0.22 : 1}
                  style={{ pointerEvents: 'none', fontFamily: FONT }}>
                  {n.label}
                </text>
                <text textAnchor="middle" y={-n.r - 10 + 14}
                  fill={n.color} fontSize={9.5} opacity={dimmed ? 0.18 : 0.75}
                  style={{ pointerEvents: 'none', fontFamily: FONT }}>
                  {n.size} roles
                </text>
              </g>
            );
          })}

          {/* Similarity lines — from selected job to its top-3 similar roles */}
          {hasJob && selectedJobSVG && similarJobsSVG.map(({ x, y, pct, job: sj }, i) => {
            const color = pct >= 90 ? '#16a34a' : pct >= 80 ? '#2563eb' : '#94a3b8';
            const sjCluster = data.clusters.find(c => c.id === sj.cluster_id);
            return (
              <g key={`sim-${i}`}>
                <line
                  x1={selectedJobSVG.x} y1={selectedJobSVG.y}
                  x2={x} y2={y}
                  stroke={color} strokeWidth={1.8}
                  strokeDasharray="5,4" opacity={0.55}
                />
                <circle cx={x} cy={y} r={14} fill={color} opacity={0.08} />
                <circle
                  cx={x} cy={y} r={6}
                  fill={sjCluster?.color ?? color}
                  fillOpacity={0.9}
                  stroke="white" strokeWidth={2}
                  onClick={e => handleRoleClick(sj, e)}
                  style={{ cursor: 'pointer' }}
                />
                <text
                  x={x} y={y - 12}
                  textAnchor="middle" fill={color}
                  fontSize={9.5} fontWeight={700}
                  fontFamily="monospace"
                  style={{ pointerEvents: 'none' }}>
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Member dots — actual UMAP positions, shown when cluster is selected */}
          {selectedClusterId !== null && selectedCluster && clusterRoles.map(job => {
            const p = toSVG(job.x, job.y);
            const isActive = selectedJob?.id === job.id;
            return (
              <g key={`m-${job.id}`} onClick={e => handleRoleClick(job, e)} style={{ cursor: 'pointer' }}>
                {isActive && <circle cx={p.x} cy={p.y} r={13} fill={selectedCluster.color} opacity={0.15} />}
                <circle
                  cx={p.x} cy={p.y}
                  r={isActive ? 7 : 4.5}
                  fill={selectedCluster.color}
                  fillOpacity={isActive ? 1 : 0.55}
                  stroke="white"
                  strokeWidth={isActive ? 2.5 : 1.2}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Left panel — cluster browser ─────────────────────────────────── */}
      {selectedCluster && (
        <div data-ui className="absolute left-4 top-4 bottom-4 z-20 flex flex-col"
          style={{ width: 280, ...PANEL, overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}>

          {/* header */}
          <div style={{ padding: '14px 16px 11px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: selectedCluster.color, boxShadow: `0 0 6px ${selectedCluster.color}80`, flexShrink: 0, display: 'inline-block' }} />
                <div>
                  <div style={{ color: TS, fontWeight: 700, fontSize: 14 }}>{selectedCluster.label}</div>
                  <div style={{ color: TMU, fontSize: 11, marginTop: 2 }}>{selectedCluster.size} roles</div>
                </div>
              </div>
              <button onClick={() => { setSelectedClusterId(null); setSelectedJob(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: TMU, padding: 2 }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {selectedCluster.keywords.slice(0, 5).map((kw, i) => (
                <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
                  background: hexAlpha(selectedCluster.color, 0.12), color: selectedCluster.color }}>
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* search + role list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6,
              background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 7,
              padding: '5px 9px', marginBottom: 8 }}>
              <Search size={12} color={TMU} style={{ flexShrink: 0 }} />
              <input type="text" placeholder="Search roles…" value={roleSearch}
                onChange={e => setRoleSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ border: 'none', background: 'transparent', outline: 'none',
                  fontSize: 11.5, color: TS, fontFamily: FONT, width: '100%' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {filteredRoles.slice(0, 60).map(job => {
                const active = selectedJob?.id === job.id;
                return (
                  <div key={job.id} onClick={e => handleRoleClick(job, e)}
                    style={{ padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                      background: active ? hexAlpha(selectedCluster.color, 0.09) : '#f8fafc',
                      border: `1px solid ${active ? selectedCluster.color + '50' : BORDER}` }}
                    onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLDivElement; el.style.background = hexAlpha(selectedCluster.color, 0.06); } }}
                    onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLDivElement; el.style.background = '#f8fafc'; } }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: TS, fontWeight: active ? 600 : 400, flex: 1, lineHeight: 1.35 }}>
                        {cleanTitle(job.title)}
                      </span>
                      <ChevronRight size={12} color={TMU} style={{ flexShrink: 0, marginLeft: 4 }} />
                    </div>
                    {job.job_level && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3, marginTop: 4, display: 'inline-block',
                        background: hexAlpha(selectedCluster.color, 0.12), color: selectedCluster.color }}>
                        {job.job_level}
                      </span>
                    )}
                  </div>
                );
              })}
              {filteredRoles.length === 0 && (
                <p style={{ fontSize: 11.5, color: TMU, textAlign: 'center', padding: '16px 0' }}>No matches</p>
              )}
              {filteredRoles.length > 60 && (
                <p style={{ fontSize: 10.5, color: TMU, textAlign: 'center', padding: '6px 0' }}>
                  Showing 60 of {filteredRoles.length} — refine search
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Right panel — selected job ────────────────────────────────────── */}
      {hasJob && jobCluster && (
        <div data-ui
          className="absolute right-0 top-0 h-full flex flex-col"
          style={{ width: 340, borderLeft: `1px solid ${BORDER}`, background: '#fff',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.07)', fontFamily: FONT, zIndex: 30 }}
          onClick={e => e.stopPropagation()}>

          {/* header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: jobCluster.color,
                  boxShadow: `0 0 5px ${jobCluster.color}90`, display: 'inline-block', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: TMU, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {jobCluster.label}
                </span>
              </div>
              <button onClick={() => setSelectedJob(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: TMU, padding: 2 }}>
                <X size={15} />
              </button>
            </div>
            <h2 style={{ color: TS, fontWeight: 700, fontSize: 17, margin: 0, lineHeight: 1.25 }}>
              {cleanTitle(selectedJob!.title)}
            </h2>
            {selectedJob!.job_level && (
              <span style={{ display: 'inline-block', marginTop: 7, fontSize: 11, fontWeight: 600,
                padding: '2px 9px', borderRadius: 5,
                background: hexAlpha(jobCluster.color, 0.12), color: jobCluster.color }}>
                {selectedJob!.job_level}
              </span>
            )}
          </div>

          {/* body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

            {/* Similar roles */}
            <section style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: TMU, marginBottom: 10 }}>
                Similar Roles
              </div>

              {similarJobs.length === 0 && (
                <p style={{ fontSize: 12, color: TMU }}>No similar roles found.</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {similarJobs.map(({ job: sj, pct }, i) => {
                  const sjCluster = data.clusters.find(c => c.id === sj.cluster_id);
                  return (
                    <div key={i}
                      onClick={e => handleRoleClick(sj, e)}
                      style={{ padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                        background: '#f8fafc', border: `1px solid ${BORDER}` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f1f5f9'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, color: TS, fontWeight: 600, flex: 1, lineHeight: 1.3 }}>
                          {cleanTitle(sj.title)}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 90 ? '#16a34a' : pct >= 80 ? '#2563eb' : TM,
                          fontFamily: 'monospace', marginLeft: 8, flexShrink: 0 }}>
                          {pct}%
                        </span>
                      </div>
                      {/* similarity bar */}
                      <div style={{ height: 3, background: BORDER, borderRadius: 2, marginBottom: 7, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2,
                          background: pct >= 90 ? '#16a34a' : pct >= 80 ? '#2563eb' : '#94a3b8' }} />
                      </div>
                      {sjCluster && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sjCluster.color, display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontSize: 10.5, color: TMU }}>{sjCluster.label}</span>
                          {sj.job_level && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, marginLeft: 'auto',
                              background: hexAlpha(sjCluster.color, 0.12), color: sjCluster.color }}>
                              {sj.job_level}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <div style={{ height: 1, background: BORDER, marginBottom: 16 }} />

            {/* Summary */}
            {selectedJob!.summary && (
              <section style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: TMU, marginBottom: 8 }}>Summary</div>
                <p style={{ fontSize: 12.5, color: TM, lineHeight: 1.6, margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                  {selectedJob!.summary}
                </p>
              </section>
            )}

            {/* Skills */}
            {selectedJob!.skills.length > 0 && (
              <section>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: TMU, marginBottom: 8 }}>
                  Skills ({selectedJob!.skills.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {selectedJob!.skills.map((sk, i) => (
                    <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5,
                      background: '#f8fafc', border: `1px solid ${BORDER}`, color: TM }}>
                      {sk}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* footer */}
          <div style={{ padding: '10px 20px', borderTop: `1px solid ${BORDER}`, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: TMU }}>
              ID <span style={{ fontFamily: 'monospace', fontWeight: 600, color: TM }}>{selectedJob!.employee_id ?? selectedJob!.id}</span>
            </span>
            <span style={{ fontSize: 11, color: TMU }}>{selectedJob!.keywords.length} keywords · {selectedJob!.skills.length} skills</span>
          </div>
        </div>
      )}

      {/* ── Cluster legend — hidden once a role is selected ─────────────── */}
      {!hasJob && (
        <div data-ui className="absolute top-4 right-4 z-10"
          style={{ ...PANEL, padding: '12px 14px', minWidth: 188, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: TMU, marginBottom: 8 }}>Job Families</div>
          {[...data.clusters].sort((a, b) => b.size - a.size).map(c => (
            <div key={c.id}
              style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, cursor: 'pointer',
                opacity: selectedClusterId !== null && selectedClusterId !== c.id ? 0.4 : 1, transition: 'opacity 0.15s' }}
              onClick={() => focusCluster(c.id)}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: TS, fontSize: 11, flex: 1, fontWeight: selectedClusterId === c.id ? 700 : 400 }}>
                {c.label}
              </span>
              <span style={{ color: TMU, fontSize: 10.5, fontFamily: 'monospace' }}>{c.size}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Hint ─────────────────────────────────────────────────────────── */}
      {!selectedCluster && !hasJob && (
        <div className="absolute bottom-5 pointer-events-none"
          style={{ left: '50%', transform: 'translateX(-50%)',
            ...PANEL, padding: '9px 14px' }}>
          <p style={{ color: TMU, fontSize: 12, margin: 0 }}>
            Click a family to browse roles · Click a role to see similar positions
          </p>
        </div>
      )}
    </div>
  );
}
