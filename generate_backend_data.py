#!/usr/bin/env python3
"""
Generate backend CSV files with pre-computed data.
This script replaces the need to run the Jupyter notebook.

Prerequisites:
1. Install dependencies: pip install pandas numpy scikit-learn vertexai
2. Authenticate with Google Cloud: gcloud auth application-default login

Usage:
    python generate_backend_data.py

Output:
    - employees_with_skills_and_similarity.csv (with x, y coordinates)
"""

import os
import re
import ast
import pickle
from pathlib import Path
from collections import Counter

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity

# Try to import Vertex AI
try:
    import vertexai
    from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput
    VERTEX_AI_AVAILABLE = True
except ImportError:
    VERTEX_AI_AVAILABLE = False
    print("Warning: vertexai not available. Install with: pip install google-cloud-aiplatform")


def load_data():
    """Load the raw dataset."""
    csv_paths = [
        'Hackathon Challenge #1 Datasets.csv',
        '../Hackathon Challenge #1 Datasets.csv',
        '/Users/rohanjasani/Desktop/Hackathon/Hackathon Challenge #1 Datasets.csv',
    ]
    
    csv_path = next((p for p in csv_paths if os.path.exists(p)), None)
    if not csv_path:
        raise FileNotFoundError("Could not find 'Hackathon Challenge #1 Datasets.csv'")
    
    print(f"Loading data from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} rows")
    return df


def clean_title(filename):
    """Extract and clean job title from filename."""
    base = Path(filename).name
    
    # Remove extension
    stem = re.sub(r'\.[^.]+$', '', base).strip()
    
    # Remove date patterns
    stem = re.sub(r'^\d{6}\s+', '', stem)
    stem = re.sub(r'^\d{4}\s+\d{1,2}[ _\-]+', '', stem)
    
    # Clean up title
    t = stem.replace('_', ' ').replace('–', '-').replace('—', '-')
    
    # Remove common phrases
    phrases_to_remove = [
        r'\binternal job posting\b', r'\bjob posting\b', r'\bposting\b',
        r'\bjob advertisement\b', r'\bAD\b', r'\bJD\b',
        r'\btemp\b|\btemporary\b', r'\bcontract\b|\bterm\b|\bsecondment\b',
        r'\(?\s*~?\s*\d+\s*(?:-\s*\d+)?\s*[- ]?\s*month[s]?\s*\)?',
        r'\(?\s*\d+\s*(?:-\s*\d+)?\s*[- ]?\s*year[s]?\s*\)?',
        r'\bassignment\b',
    ]
    
    for pattern in phrases_to_remove:
        t = re.sub(pattern, ' ', t, flags=re.IGNORECASE)
    
    # Remove digits
    t = re.sub(r'\d+', '', t)
    
    # Clean up
    t = re.sub(r'[()~]', ' ', t)
    t = re.sub(r'\s*-\s*', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    
    return t


def extract_skills(text, skill_lexicon):
    """Extract skills from text using regex patterns."""
    if pd.isna(text):
        return []
    
    text_lower = str(text).lower()
    skills_found = []
    
    for skill_name, patterns in skill_lexicon.items():
        for pattern in patterns:
            try:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    skills_found.append(skill_name)
                    break
            except re.error:
                continue
    
    return skills_found


def get_embeddings(texts, use_cache=True):
    """Get embeddings using Vertex AI with caching."""
    cache_file = 'embeddings_cache.pkl'
    
    # Try to load from cache
    if use_cache and os.path.exists(cache_file):
        print(f"Loading embeddings from cache: {cache_file}")
        with open(cache_file, 'rb') as f:
            cache = pickle.load(f)
            if cache.get('texts') == texts:
                print(f"Using cached embeddings: {cache['embeddings'].shape}")
                return cache['embeddings']
            print("Cache mismatch, recomputing...")
    
    if not VERTEX_AI_AVAILABLE:
        raise RuntimeError("Vertex AI not available. Install with: pip install google-cloud-aiplatform")
    
    # Initialize Vertex AI
    print("Initializing Vertex AI...")
    vertexai.init(project="hackathon-487919", location="us-central1")
    
    model = TextEmbeddingModel.from_pretrained("text-embedding-005")
    
    print(f"Generating embeddings for {len(texts)} texts...")
    
    def embed_batch(texts, batch_size=25):
        vectors = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            inputs = [TextEmbeddingInput(task_type="RETRIEVAL_DOCUMENT", title="", text=t) for t in batch]
            embeddings = model.get_embeddings(inputs)
            vectors.extend([e.values for e in embeddings])
            if (i // batch_size + 1) % 10 == 0:
                print(f"  Processed {i + len(batch)}/{len(texts)}...")
        return np.array(vectors, dtype=np.float32)
    
    X = embed_batch(texts)
    print(f"Embeddings shape: {X.shape}")
    
    # Save to cache
    if use_cache:
        print(f"Saving embeddings to cache: {cache_file}")
        with open(cache_file, 'wb') as f:
            pickle.dump({'texts': texts, 'embeddings': X}, f)
    
    return X


def main():
    print("=" * 60)
    print("Backend Data Generation Script")
    print("=" * 60)
    
    # Load data
    df = load_data()
    
    # Clean titles
    print("\nCleaning job titles...")
    df['title_clean'] = df['filename'].apply(clean_title)
    
    # Remove locations
    location_tokens = {"ab", "usa", "canada", "alberta", "calgary", "edmonton", 
                      "vancouver", "toronto", "medicine hat", "texas", "hong kong"}
    
    def strip_locations(text):
        if pd.isna(text):
            return ""
        text = str(text).lower()
        for loc in sorted(location_tokens, key=len, reverse=True):
            text = re.sub(rf'\b{re.escape(loc)}\b', ' ', text, flags=re.IGNORECASE)
        return re.sub(r'\s+', ' ', text).strip()
    
    df['title_clean'] = df['title_clean'].apply(strip_locations)
    
    # Create full text
    print("Creating text field...")
    df['text'] = (
        df['filename'].fillna('') + ' ' +
        df['job_title'].fillna('') + ' ' +
        df['position_summary'].fillna('').str[:1200] + ' ' +
        df['responsibilities'].fillna('').str[:3000] + ' ' +
        df['qualifications'].fillna('').str[:1500]
    ).str.strip()
    
    df['text'] = df['text'].apply(strip_locations)
    df['text'] = df['text'].str.replace('docx', '', regex=True)
    
    # Get embeddings
    print("\nGenerating embeddings...")
    texts = df['text'].fillna('').tolist()
    X = get_embeddings(texts)
    
    # Clustering
    print("\nClustering...")
    k = 25
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=30)
    df['cluster'] = kmeans.fit_predict(X)
    
    # Calculate distance to center
    print("Calculating distances to centroids...")
    centroids = kmeans.cluster_centers_
    distances = []
    for i, (idx, row) in enumerate(df.iterrows()):
        cluster_id = row['cluster']
        dist = np.linalg.norm(X[i] - centroids[cluster_id])
        distances.append(dist)
    df['Distance_to_Center'] = distances
    
    # 2D coordinates using PCA (lighter than UMAP)
    print("Generating 2D coordinates...")
    from sklearn.decomposition import PCA
    pca = PCA(n_components=2, random_state=42)
    coords_2d = pca.fit_transform(X)
    df['x'] = coords_2d[:, 0]
    df['y'] = coords_2d[:, 1]
    
    # Normalize to [-50, 50]
    for col in ['x', 'y']:
        df[col] = (df[col] - df[col].min()) / (df[col].max() - df[col].min())
        df[col] = df[col] * 100 - 50
    
    # Skill extraction
    print("Extracting skills...")
    skill_lexicon = {
        "SQL": [r'\bsql\b', r'\bpostgres\b', r'\bmysql\b', r'\bsnowflake\b', r'\bbigquery\b'],
        "Python": [r'\bpython\b', r'\bpandas\b', r'\bnumpy\b'],
        "Excel": [r'\bexcel\b', r'\bpivot table\b', r'\bvlookup\b'],
        "Oracle/ERP": [r'\boracle\b', r'\berp\b', r'\bebs\b', r'\bpeople soft\b', r'\bsap\b'],
        "Engineering/Maintenance": [
            r'\b(cmms|work orders?|preventive maintenance|reliability|root cause|rca)\b',
        ],
        "Safety/EHS": [r'\b(ehs|hse)\b', r'\bsafety\b', r'\bloto\b', r'\bosha\b'],
        "Supply Chain": [r'\bsupply chain\b', r'\bmrp\b', r'\bprocurement\b'],
        "Audit/SOX": [r'\bsox\b', r'\bsarbanes[- ]oxley\b', r'\binternal audit\b'],
        "Tax/Transfer Pricing": [r'\btransfer pricing\b', r'\btaxation\b'],
        "HR/Payroll": [r'\bpayroll\b', r'\bhr\b', r'\bcompensation\b', r'\bbenefits\b'],
        "ESG/Sustainability": [r'\besg\b', r'\bsustainability\b', r'\bcarbon\b'],
        "Finance/Reporting": [r'\bfinancial reporting\b', r'\bifrs\b', r'\bgaap\b'],
        "Legal/Contracts": [r'\blegal counsel\b', r'\bnda\b', r'\bcontract\b'],
    }
    
    df['Individual_Skills'] = df['text'].apply(lambda x: extract_skills(x, skill_lexicon))
    df['Skills_Count'] = df['Individual_Skills'].apply(len)
    df['Skills_String'] = df['Individual_Skills'].apply(lambda x: ', '.join(x) if x else '')
    
    # Calculate similarities
    print("Calculating similarities...")
    sim_matrix = cosine_similarity(X)
    
    similar_employees = []
    for i in range(len(df)):
        sim_scores = sim_matrix[i]
        # Get top 3 (excluding self)
        top_indices = np.argsort(sim_scores)[::-1][1:4]
        similar_employees.append({
            'Similar_Employee_1': f'EMP_{top_indices[0]+1:04d}',
            'Similar_Employee_1_Score': round(float(sim_scores[top_indices[0]]), 6),
            'Similar_Employee_2': f'EMP_{top_indices[1]+1:04d}',
            'Similar_Employee_2_Score': round(float(sim_scores[top_indices[1]]), 6),
            'Similar_Employee_3': f'EMP_{top_indices[2]+1:04d}',
            'Similar_Employee_3_Score': round(float(sim_scores[top_indices[2]]), 6),
        })
    
    similar_df = pd.DataFrame(similar_employees)
    df = pd.concat([df.reset_index(drop=True), similar_df], axis=1)
    
    # Add Employee_ID
    df['Employee_ID'] = [f'EMP_{i+1:04d}' for i in range(len(df))]
    
    # Cluster labels
    cluster_labels = {
        0: "Applications & Business Systems Analysis",
        1: "Treasury & Corporate Finance Leadership",
        2: "Customer Service & Logistics",
        3: "Corporate Admin Support",
        4: "IT Applications Support",
        5: "Process Engineering",
        6: "Financial Reporting & Accounting",
        7: "HR Operations",
        8: "Plant Operations & HSE",
        9: "Corporate Communications & ESG",
        10: "Engineering (Electrical / Instrumentation)",
        11: "Internal Audit & SOX Compliance",
        12: "Tax & Transfer Pricing",
        13: "Legal (Corporate Counsel)",
        14: "Executive & Legal Administrative Support",
        15: "Front Office & Reception",
        16: "Process Safety",
        17: "Maintenance & Reliability Engineering",
        18: "Oracle Finance Systems",
        19: "Enterprise IT / Technology Services",
        20: "Global Supply Chain Planning",
        21: "Procurement / Buying",
        22: "IT Service Desk & End-User Support",
        23: "Mechanical Maintenance Planning",
        24: "Admin Support (Document Control)",
    }
    df['Cluster_Label'] = df['cluster'].map(lambda x: cluster_labels.get(x, f"Cluster {x}"))
    
    # Export
    print("\nExporting CSV files...")
    
    export_columns = [
        'Employee_ID', 'title_clean', 'cluster', 'Cluster_Label',
        'Individual_Skills', 'Skills_String', 'Skills_Count',
        'x', 'y', 'Distance_to_Center',
        'Similar_Employee_1', 'Similar_Employee_1_Score',
        'Similar_Employee_2', 'Similar_Employee_2_Score',
        'Similar_Employee_3', 'Similar_Employee_3_Score'
    ]
    
    export_df = df[export_columns].copy()
    
    # Convert Individual_Skills to string representation
    export_df['Individual_Skills'] = export_df['Individual_Skills'].apply(str)
    
    output_file = 'employees_with_skills_and_similarity.csv'
    export_df.to_csv(output_file, index=False)
    print(f"✅ Exported: {output_file} ({len(export_df)} rows)")
    
    # Also export main_output.csv with text content
    main_output_cols = [
        'Employee_ID', 'filename', 'job_title', 'position_summary',
        'responsibilities', 'qualifications', 'title_clean', 'text',
        'cluster', 'Distance_to_Center'
    ]
    main_output_df = df[main_output_cols].copy()
    main_output_file = 'main_output_with_coords.csv'
    main_output_df.to_csv(main_output_file, index=False)
    print(f"✅ Exported: {main_output_file} ({len(main_output_df)} rows)")
    
    print("\n" + "=" * 60)
    print("Done! You can now start the backend.")
    print("=" * 60)


if __name__ == '__main__':
    main()
