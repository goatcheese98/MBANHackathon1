#!/usr/bin/env python3
"""
Generate constellation_data.json, stats_data.json, and constellation_data_full.csv.

Sources (all 622 rows, aligned by row index):
  - cleaned_output_8pm.csv        → main truth: titles, text, cluster, labels, keywords,
                                    job_level, seniority_score, top_seniority_buckets
  - employees_with_skills_and_similarity.csv
                                  → Employee_ID, skills, correct top-3 similar jobs + scores
  - constellation_data_full.csv   → x, y coordinates (only source that has them)

Outputs:
  - constellation_data_full.csv         (updated, in career-constellation/)
  - frontend/public/constellation_data.json
  - frontend/public/stats_data.json

Usage:
    cd career-constellation/
    python generate_constellation_data.py
"""

import json
import sys
import numpy as np
import pandas as pd
from collections import Counter
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────

PROJECT_ROOT    = Path(__file__).parent.resolve()          # career-constellation/
HACKATHON_ROOT  = PROJECT_ROOT.parent                      # Hackathon/

MAIN_CSV        = HACKATHON_ROOT / 'cleaned_output_8pm.csv'
SKILLS_CSV      = HACKATHON_ROOT / 'employees_with_skills_and_similarity.csv'
EXISTING_FULL   = PROJECT_ROOT  / 'constellation_data_full.csv'   # x/y source

OUTPUT_FULL_CSV = PROJECT_ROOT  / 'constellation_data_full.csv'
OUTPUT_JSON     = PROJECT_ROOT  / 'frontend' / 'public' / 'constellation_data.json'
OUTPUT_STATS    = PROJECT_ROOT  / 'frontend' / 'public' / 'stats_data.json'

# 25 visually distinct colours, one per cluster (index == cluster id)
CLUSTER_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
    "#82E0AA", "#F0B27A", "#AED6F1", "#A9DFBF", "#F9E79F",
    "#D7BDE2", "#A3E4D7", "#FAD7A0", "#A9CCE3", "#A2D9CE",
    "#54A0FF", "#5F27CD", "#00D2D3", "#FF9F43", "#EE5A24",
]

# ── Helpers ────────────────────────────────────────────────────────────────────

def parse_list(value: str, sep: str = ',') -> list[str]:
    """Split a comma-separated string into a clean list, handling NaN/None."""
    if pd.isna(value) or str(value).strip() in ('', 'None', 'nan'):
        return []
    return [s.strip() for s in str(value).split(sep) if s.strip()]


def safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_str(value, default: str = '') -> str:
    if pd.isna(value):
        return default
    return str(value).strip()

# ── Load ───────────────────────────────────────────────────────────────────────

def load_sources() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    print("Loading source files…")
    for p in (MAIN_CSV, SKILLS_CSV, EXISTING_FULL):
        if not p.exists():
            sys.exit(f"ERROR: required file not found: {p}")

    main    = pd.read_csv(MAIN_CSV).reset_index(drop=True)
    skills  = pd.read_csv(SKILLS_CSV).reset_index(drop=True)
    existing = pd.read_csv(EXISTING_FULL).reset_index(drop=True)

    print(f"  main CSV:    {main.shape}")
    print(f"  skills CSV:  {skills.shape}")
    print(f"  existing CSV (x/y): {existing.shape}")

    # Sanity-check alignment
    assert len(main) == len(skills), \
        f"Row count mismatch: main={len(main)}, skills={len(skills)}"
    assert len(main) == len(existing), \
        f"Row count mismatch: main={len(main)}, existing={len(existing)}"
    assert (main['title_clean'] == skills['title_clean']).all(), \
        "title_clean mismatch between main and skills CSV — files are not aligned!"
    assert (main['cluster'] == skills['cluster'].astype(int)).all(), \
        "cluster mismatch between main and skills CSV — files are not aligned!"

    print("  ✅ Row alignment verified (title_clean + cluster match on all 622 rows)")
    return main, skills, existing

# ── Merge ──────────────────────────────────────────────────────────────────────

def merge(main: pd.DataFrame, skills: pd.DataFrame, existing: pd.DataFrame) -> pd.DataFrame:
    print("Merging…")
    df = main.copy()

    # From skills CSV
    df['employee_id']              = skills['Employee_ID'].values
    df['Skills_String']            = skills['Skills_String'].values
    df['Skills_Count']             = skills['Skills_Count'].values
    df['Individual_Skills']        = skills['Individual_Skills'].values
    df['Cluster_Label']            = skills['Cluster_Label'].values
    df['Similar_Employee_1']       = skills['Similar_Employee_1'].values
    df['Similar_Employee_1_Score'] = skills['Similar_Employee_1_Score'].values
    df['Similar_Employee_2']       = skills['Similar_Employee_2'].values
    df['Similar_Employee_2_Score'] = skills['Similar_Employee_2_Score'].values
    df['Similar_Employee_3']       = skills['Similar_Employee_3'].values
    df['Similar_Employee_3_Score'] = skills['Similar_Employee_3_Score'].values

    # x / y from existing (only source that has them)
    df['x'] = existing['x'].values
    df['y'] = existing['y'].values

    print(f"  Merged: {df.shape[0]} rows, {df.shape[1]} columns")
    return df

# ── Build constellation_data.json ─────────────────────────────────────────────

def build_constellation(df: pd.DataFrame) -> dict:  # noqa: C901
    print("Building constellation_data.json…")

    jobs = []
    for i, row in df.iterrows():
        cluster_id = int(row['cluster'])

        similar_jobs = []
        for n in (1, 2, 3):
            emp   = row.get(f'Similar_Employee_{n}')
            score = row.get(f'Similar_Employee_{n}_Score')
            if pd.notna(emp) and pd.notna(score) and str(emp).strip():
                similar_jobs.append({
                    'employee_id': str(emp),
                    'similarity':  round(safe_float(score), 8),
                })

        jobs.append({
            'id':                    i,
            'employee_id':           safe_str(row['employee_id']),
            'title':                 safe_str(row.get('Unified Job Title (display)', row['title_clean'])),
            'title_clean':           safe_str(row['title_clean']),
            'summary':               safe_str(row.get('position_summary')),
            'responsibilities':      safe_str(row.get('responsibilities')),
            'qualifications':        safe_str(row.get('qualifications')),
            'cluster_id':            cluster_id,
            'cluster_label':         safe_str(row['Label']),
            'x':                     round(safe_float(row['x']), 6),
            'y':                     round(safe_float(row['y']), 6),
            'z':                     0.0,
            'size':                  2.0,
            'color':                 CLUSTER_COLORS[cluster_id % len(CLUSTER_COLORS)],
            'keywords':              parse_list(row.get('Keywords', '')),
            'skills':                parse_list(row.get('Skills_String', '')),
            'job_level':             safe_str(row.get('job_level')),
            'seniority_score':       round(safe_float(row.get('seniority_score')), 6),
            'top_seniority_buckets': safe_str(row.get('top_seniority_buckets')),
            'distance_to_center':    round(safe_float(row.get('Distance_to_Center')), 8),
            'similar_jobs':          similar_jobs,
        })

    # Build cluster summaries — also pull keywords/example_titles from the merged df
    # (these are cluster-level fields, same for every row in a cluster)
    cluster_meta: dict[int, dict] = {}
    for _, row in df.iterrows():
        cid = int(row['cluster'])
        if cid not in cluster_meta:
            cluster_meta[cid] = {
                'keywords':       parse_list(row.get('Keywords', '')),
                'example_titles': parse_list(row.get('Example Titles', '')),
            }

    cluster_groups: dict[int, list] = {}
    for job in jobs:
        cluster_groups.setdefault(job['cluster_id'], []).append(job)

    clusters = []
    for cid, cjobs in sorted(cluster_groups.items()):
        xs = [j['x'] for j in cjobs]
        ys = [j['y'] for j in cjobs]
        meta = cluster_meta.get(cid, {})
        clusters.append({
            'id':             cid,
            'label':          cjobs[0]['cluster_label'],
            'keywords':       meta.get('keywords', []),
            'example_titles': meta.get('example_titles', []),
            'size':           len(cjobs),
            'color':          CLUSTER_COLORS[cid % len(CLUSTER_COLORS)],
            'centroid':       {
                'x': round(float(np.mean(xs)), 4),
                'y': round(float(np.mean(ys)), 4),
                'z': 0.0,
            },
            'jobs':           [j['id'] for j in cjobs],
        })

    return {
        'jobs':         jobs,
        'clusters':     clusters,
        'total_jobs':   len(jobs),
        'num_clusters': len(clusters),
    }

# ── Build stats_data.json ──────────────────────────────────────────────────────

def build_stats(constellation: dict) -> dict:
    print("Building stats_data.json…")
    jobs     = constellation['jobs']
    clusters = constellation['clusters']

    # Cluster distribution
    cluster_dist = [
        {'cluster_id': c['id'], 'label': c['label'], 'count': c['size']}
        for c in clusters
    ]

    # Keyword / skill frequency
    all_keywords = [kw for j in jobs for kw in j['keywords']]
    all_skills   = [sk for j in jobs for sk in j['skills']]
    top_keywords = [{'keyword': k, 'count': v}
                    for k, v in Counter(all_keywords).most_common(20)]
    top_skills   = [{'skill': s, 'count': v}
                    for s, v in Counter(all_skills).most_common(20)]

    # Near-duplicate pairs (cosine similarity ≥ 0.95)
    seen: set[tuple] = set()
    dup_count = 0
    for job in jobs:
        for sim in job['similar_jobs']:
            if sim['similarity'] >= 0.95:
                pair_key = tuple(sorted([job['employee_id'], sim['employee_id']]))
                if pair_key not in seen:
                    seen.add(pair_key)
                    dup_count += 1

    # Job-level distribution
    job_level_dist = dict(Counter(
        j['job_level'] for j in jobs if j['job_level']
    ))

    # Seniority score distribution (bucketed)
    seniority_scores = [j['seniority_score'] for j in jobs if j['seniority_score']]
    seniority_dist = {
        'mean':   round(float(np.mean(seniority_scores)), 4) if seniority_scores else 0,
        'median': round(float(np.median(seniority_scores)), 4) if seniority_scores else 0,
        'min':    round(float(np.min(seniority_scores)), 4) if seniority_scores else 0,
        'max':    round(float(np.max(seniority_scores)), 4) if seniority_scores else 0,
    }

    # Cluster labels map (id → label)
    cluster_labels = {str(c['id']): c['label'] for c in clusters}

    return {
        'total_jobs':             len(jobs),
        'num_clusters':           len(clusters),
        'avg_jobs_per_cluster':   round(len(jobs) / len(clusters), 2),
        'cluster_distribution':   cluster_dist,
        'cluster_labels':         cluster_labels,
        'top_keywords_overall':   top_keywords,
        'top_skills_overall':     top_skills,
        'standardization_pairs':  dup_count,
        'job_level_distribution': job_level_dist,
        'seniority_distribution': seniority_dist,
    }

# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 60)
    print("Constellation Data Generator")
    print("=" * 60)

    main_df, skills_df, existing_df = load_sources()
    merged = merge(main_df, skills_df, existing_df)

    # 1. Save updated constellation_data_full.csv
    print(f"\nSaving {OUTPUT_FULL_CSV.name}…")
    merged.to_csv(OUTPUT_FULL_CSV, index=False)
    print(f"  ✅ {len(merged)} rows, {len(merged.columns)} columns")

    # 2. Build + save constellation_data.json
    constellation = build_constellation(merged)
    print(f"\nSaving {OUTPUT_JSON.name}…")
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(constellation, f, indent=2, ensure_ascii=False)
    print(f"  ✅ {len(constellation['jobs'])} jobs, {len(constellation['clusters'])} clusters")

    # 3. Build + save stats_data.json
    stats = build_stats(constellation)
    print(f"\nSaving {OUTPUT_STATS.name}…")
    with open(OUTPUT_STATS, 'w') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print(f"  ✅ {stats['total_jobs']} jobs, "
          f"{stats['standardization_pairs']} near-duplicate pairs (≥0.95)")

    print("\n" + "=" * 60)
    print("Done! Restart the backend to serve updated data.")
    print("=" * 60)


if __name__ == '__main__':
    main()
