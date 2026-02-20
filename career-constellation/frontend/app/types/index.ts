export interface JobPoint {
  id: number;
  employee_id?: string;
  title: string;
  summary: string;
  responsibilities: string;
  qualifications: string;
  cluster_id: number;
  cluster_label?: string;
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  keywords: string[];
  skills: string[];
  job_level?: string | null;
  scope?: string | null;
  distance_to_center?: number;
  affinities?: Record<number, number>;  // optional — only available with SBERT embeddings
  similar_jobs?: { employee_id: string; similarity: number }[];
}

export interface ClusterInfo {
  id: number;
  label: string;
  keywords: string[];
  example_titles: string[];
  size: number;
  color: string;
  centroid: {
    x: number;
    y: number;
    z?: number;
  };
  jobs: number[];
}

export interface ConstellationData {
  jobs: JobPoint[];
  clusters: ClusterInfo[];
  total_jobs: number;
  num_clusters: number;
  cluster_sims: Record<string, number>;  // "a-b" → 384D cosine similarity (a < b)
}

export interface SimilarJob {
  id: number;
  title: string;
  similarity: number;
  cluster_id: number;
  keywords: string[];
}

export interface JobDetails {
  id: number;
  title: string;
  summary: string;
  responsibilities: string;
  qualifications: string;
  cluster_id: number;
  keywords: string[];
  skills: string[];
  job_level?: string | null;
  scope?: string | null;
  distance_to_center?: number;
  coordinates: {
    x: number;
    y: number;
  };
}

export interface NearDuplicatePair {
  job_a: string;
  job_b: string;
  similarity: number;
}

export interface ClusterDetails {
  cluster_id: number;
  size: number;
  messiness_score?: number;
  jobs: {
    id: number;
    title: string;
    summary: string;
  }[];
  top_skills: {
    skill: string;
    count: number;
  }[];
  top_keywords: {
    keyword: string;
    count: number;
  }[];
  standardization_candidates: string[];
  near_duplicate_pairs?: NearDuplicatePair[];
}

export interface StandardizationDuplicate {
  job_a_id: number;
  job_a_title: string;
  job_b_id: number;
  job_b_title: string;
  similarity: number;
  cluster_id: number;
}

export interface StandardizationDuplicatesResponse {
  total_pairs: number;
  threshold: number;
  duplicates: StandardizationDuplicate[];
}
