export interface JobPoint {
  id: number;
  title: string;
  summary: string;
  responsibilities: string;
  qualifications: string;
  cluster_id: number;
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  keywords: string[];
  skills: string[];
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
    z: number;
  };
  jobs: number[];
}

export interface ConstellationData {
  jobs: JobPoint[];
  clusters: ClusterInfo[];
  total_jobs: number;
  num_clusters: number;
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
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
}

export interface ClusterDetails {
  cluster_id: number;
  size: number;
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
}
