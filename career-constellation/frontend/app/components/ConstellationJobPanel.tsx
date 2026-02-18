/**
 * ConstellationJobPanel
 *
 * Right-side role detail panel for the Career Mobility Network.
 * Compact, light-mode, consistent system-ui font throughout.
 * Shows: role header → transition affinity → summary → skills.
 */

import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { JobPoint, ClusterInfo } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AffinityEntry {
  cluster: ClusterInfo;
  pct: number; // 0 – 100
}

interface Props {
  job:            JobPoint;
  homeCluster:    ClusterInfo;
  affinities:     AffinityEntry[];   // ranked, excludes homeCluster
  onClose:        () => void;
  onClusterFocus: (clusterId: number) => void;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const BORDER      = '#e2e8f0';
const BG          = '#ffffff';
const BG_SUBTLE   = '#f8fafc';
const TEXT_STRONG = '#0f172a';
const TEXT_MID    = '#475569';
const TEXT_MUTED  = '#94a3b8';
const FONT        = 'system-ui, -apple-system, sans-serif';

function hexAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function affinityColor(pct: number) {
  if (pct >= 65) return '#16a34a';
  if (pct >= 45) return '#d97706';
  return '#94a3b8';
}

function cleanTitle(t: string) {
  return t.replace(/\s*\([^)]+\)/g, '').replace(/^Position:\s*/i, '').trim();
}

// ─── Section label ────────────────────────────────────────────────────────────
const SL = ({ children }: { children: React.ReactNode }) => (
  <p style={{
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: TEXT_MUTED, margin: '0 0 9px',
    fontFamily: FONT,
  }}>
    {children}
  </p>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function ConstellationJobPanel({ job, homeCluster, affinities, onClose, onClusterFocus }: Props) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  const title = cleanTitle(job.title);
  const hc    = homeCluster;

  return (
    <div
      className="absolute right-0 top-0 h-full flex flex-col"
      style={{
        width: 360,
        background: BG,
        borderLeft: `1px solid ${BORDER}`,
        boxShadow: '-4px 0 20px rgba(0,0,0,0.07)',
        fontFamily: FONT,
        zIndex: 50,
      }}
      onClick={e => e.stopPropagation()}
    >

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 3,
              backgroundColor: hc.color,
              boxShadow: `0 0 6px ${hc.color}80`,
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {hc.label}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: TEXT_MUTED, padding: 2, lineHeight: 1,
            }}
          >
            <X size={15} />
          </button>
        </div>

        <h2 style={{ color: TEXT_STRONG, fontWeight: 700, fontSize: 18, margin: 0, lineHeight: 1.25 }}>
          {title}
        </h2>

        {job.job_level && (
          <span style={{
            display: 'inline-block', marginTop: 6,
            fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 5,
            background: hexAlpha(hc.color, 0.12), color: hc.color,
          }}>
            {job.job_level}
          </span>
        )}
      </div>

      {/* ── Scrollable body ──────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Transition Affinity — leading section */}
        <section style={{ marginBottom: 22 }}>
          <SL>Transition Affinity</SL>
          <p style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12, lineHeight: 1.55 }}>
            Skill-overlap likelihood based on this role's embedding position.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {affinities.map(({ cluster, pct }) => {
              const bColor = affinityColor(pct);
              return (
                <div
                  key={cluster.id}
                  onClick={() => onClusterFocus(cluster.id)}
                  title={`Click to centre map on ${cluster.label}`}
                  style={{
                    padding: '8px 11px',
                    background: BG_SUBTLE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = hexAlpha(cluster.color, 0.07); el.style.borderColor = hexAlpha(cluster.color, 0.4); }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = BG_SUBTLE; el.style.borderColor = BORDER; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: cluster.color, display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12.5, color: TEXT_STRONG, fontWeight: 500 }}>
                        {cluster.label}
                      </span>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: bColor, fontFamily: 'monospace' }}>
                      {pct}%
                    </span>
                  </div>

                  {/* Affinity bar */}
                  <div style={{ height: 4, background: BORDER, borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, background: bColor,
                      borderRadius: 2, transition: 'width 0.45s ease',
                    }} />
                  </div>

                  {/* Cluster keywords */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {cluster.keywords.slice(0, 3).map((kw, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500,
                        background: hexAlpha(cluster.color, 0.10),
                        color: cluster.color,
                      }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ height: 1, background: BORDER, marginBottom: 18 }} />

        {/* Summary */}
        {job.summary && (
          <section style={{ marginBottom: 18 }}>
            <SL>Summary</SL>
            <p style={{
              fontSize: 12.5, color: TEXT_MID, lineHeight: 1.6, margin: 0,
              display: summaryOpen ? 'block' : '-webkit-box',
              WebkitLineClamp: summaryOpen ? undefined : 3,
              WebkitBoxOrient: 'vertical',
              overflow: summaryOpen ? 'visible' : 'hidden',
            } as React.CSSProperties}>
              {job.summary}
            </p>
            {job.summary.length > 180 && (
              <button
                onClick={() => setSummaryOpen(o => !o)}
                style={{
                  marginTop: 5, background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: hc.color, fontWeight: 600, padding: 0,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                {summaryOpen ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show more</>}
              </button>
            )}
          </section>
        )}

        {/* Keywords */}
        {job.keywords.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <SL>Keywords</SL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {job.keywords.map((kw, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 5, fontWeight: 500,
                  background: hexAlpha(hc.color, 0.10),
                  border: `1px solid ${hexAlpha(hc.color, 0.25)}`,
                  color: hc.color,
                }}>
                  {kw}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Competencies */}
        {job.skills.length > 0 && (
          <section style={{ marginBottom: 8 }}>
            <SL>Competencies <span style={{ color: '#cbd5e1', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({job.skills.length})</span></SL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {job.skills.map((sk, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 5,
                  background: BG_SUBTLE, border: `1px solid ${BORDER}`,
                  color: TEXT_MID, fontWeight: 400,
                }}>
                  {sk}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 20px',
        borderTop: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>
          ID <span style={{ fontFamily: 'monospace', fontWeight: 600, color: TEXT_MID }}>{job.id}</span>
        </span>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: TEXT_MUTED }}>
          <span>{job.keywords.length} keywords</span>
          <span style={{ color: BORDER }}>·</span>
          <span>{job.skills.length} skills</span>
        </div>
      </div>
    </div>
  );
}
