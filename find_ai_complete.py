#!/usr/bin/env python
# coding: utf-8

# # Comprehensive Job Description Analysis & Standardization Strategy
# 
# ## Objectives
# This notebook performs a deep-dive analysis on the job description dataset (`Hackathon_Datasets_Refined_v5.csv`) to drive the standardization process. It goes beyond basic clustering to provide actionable insights for HR and organizational efficiency.
# 
# **Key Analyses:**
# 1.  **Hierarchical Clustering:** Uncovering the natural taxonomy of roles (Dendrograms).
# 2.  **Standardization Scout:** Identifying "Near-Duplicate" roles (high content similarity, different titles).
# 3.  **Cluster Profiling:** Analyzing job levels and distinctive terminology (N-grams) within families.
# 4.  **"Messiness" Report:** Ranking job families by variance to prioritize standardization efforts.

# In[1]:


# Install necessary libraries
# get_ipython().system('pip install sentence-transformers pandas numpy scikit-learn seaborn matplotlib scipy')


# In[2]:


import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics import silhouette_score
from scipy.cluster.hierarchy import dendrogram, linkage, fcluster

# Configuration
INPUT_FILE = 'Hackathon_Datasets_Refined_v5.csv'
MODEL_NAME = 'all-MiniLM-L6-v2'
RANDOM_STATE = 42

# Output Settings
pd.set_option('display.max_colwidth', None)
plt.style.use('seaborn-v0_8-whitegrid')


# ## 1. Data Loading & Preprocessing
# We construct a rich text representation for each job by combining title, summary, responsibilities, and qualifications.

# In[3]:


# Load Data
print(f"Loading {INPUT_FILE}...")
df = pd.read_csv(INPUT_FILE)

# Preprocessing: Fill NaN values
text_cols = ['Unified Job Title', 'position_summary', 'responsibilities', 'qualifications']
for col in text_cols:
    df[col] = df[col].fillna('')

# Weighting the Title: We repeat it to ensure the model pays attention to the explicit label
df['combined_text'] = (
    "Job Title: " + df['Unified Job Title'] + ". " +
    "Job Title: " + df['Unified Job Title'] + ". " +  # Repeated for emphasis
    "Summary: " + df['position_summary'] + ". " +
    "Responsibilities: " + df['responsibilities'] + ". " +
    "Qualifications: " + df['qualifications']
)

print(f"Loaded {len(df)} job records.")


# ## 2. Generating High-Dimensional Embeddings
# Using **SBERT (Sentence-BERT)** to transform job descriptions into dense vector representations that capture semantic meaning.

# In[4]:


print(f"Loading SBERT Model ({MODEL_NAME})...")
model = SentenceTransformer(MODEL_NAME)

print("Generating embeddings...")
embeddings = model.encode(df['combined_text'].tolist(), show_progress_bar=True)
print(f"Embeddings Matrix Shape: {embeddings.shape}")


# ## 3. Phase 1: High-Resolution Hierarchical Clustering
# Investigating the natural taxonomy of the organization using Ward's method. This visualization helps us see how major departments break down into sub-families.

# In[5]:


# Compute Linkage Matrix (Ward's Method minimizes variance within clusters)
linked = linkage(embeddings, 'ward')

# Plot Dendrogram (Truncated for readability)
plt.figure(figsize=(15, 8))
plt.title('Job Taxonomy Dendrogram (Hierarchical Clustering)')
plt.xlabel('Job Index (or Cluster Size)')
plt.ylabel('Semantic Distance')
dendrogram(
    linked,
    truncate_mode='lastp',  # show only the last p merged clusters
    p=30,                   # show only the last 30 merged clusters
    leaf_rotation=90.,
    leaf_font_size=12.,
    show_contracted=True,
)
plt.axhline(y=3.5, color='r', linestyle='--', label='Potential Cut Line (High Level)')
plt.text(0, 3.6, 'Broad Families', color='r')
plt.show()


# ## 4. Phase 2: Refined Clustering (K-Means)
# Based on the previous analysis (which suggested ~12 clusters), we will enforce a practical number of clusters (e.g., 15) to get granular families and assign every job to a family.

# In[6]:


NUM_CLUSTERS = 15

kmeans = KMeans(n_clusters=NUM_CLUSTERS, random_state=RANDOM_STATE, n_init=10)
df['Cluster_ID'] = kmeans.fit_predict(embeddings)

# Calculate Distance to Cluster Center for each point (Messiness Metric)
centers = kmeans.cluster_centers_
distances = []
for i, row in df.iterrows():
    cluster_idx = row['Cluster_ID']
    center = centers[cluster_idx]
    dist = np.linalg.norm(embeddings[i] - center)
    distances.append(dist)
df['Distance_to_Center'] = distances

print("Cluster Assignments Completed.")


# ## 5. Phase 3: Cluster Profiling & N-Gram Analysis
# Extracting distinctive keywords (Bi-grams) for each cluster to automatically label them (e.g., "Supply Chain", "Process Engineering").

# In[7]:


def get_top_ngrams(corpus, n=2, top_k=5):
    """Extract frequent n-grams from a text corpus excluding stop words."""
    vec = CountVectorizer(ngram_range=(n, n), stop_words='english', min_df=2).fit(corpus)
    bag_of_words = vec.transform(corpus)
    sum_words = bag_of_words.sum(axis=0)
    words_freq = [(word, sum_words[0, idx]) for word, idx in vec.vocabulary_.items()]
    words_freq = sorted(words_freq, key=lambda x: x[1], reverse=True)
    return [w[0] for w in words_freq[:top_k]]

cluster_profiles = []

print("Profiling Candidates...")
for cid in range(NUM_CLUSTERS):
    cluster_df = df[df['Cluster_ID'] == cid]

    # Representative text for N-gram extraction
    # We focus on Title + Summary for cleaner keywords
    text_corpus = (cluster_df['Unified Job Title'] + " " + cluster_df['position_summary']).tolist()

    # Catch empty or too small clusters
    if len(text_corpus) < 2:
        continue

    top_bigrams = get_top_ngrams(text_corpus, n=2, top_k=4)
    sample_titles = cluster_df['Unified Job Title'].value_counts().head(3).index.tolist()

    # Calculate "Tightness" (Lower Std Dev of Distance means more consistent)
    tightness = cluster_df['Distance_to_Center'].mean()

    cluster_profiles.append({
        'Cluster ID': cid,
        'Size': len(cluster_df),
        'Avg Distance (Messiness)': round(tightness, 3),
        'Distinctive Terms': ", ".join(top_bigrams),
        'Common Titles': ", ".join(sample_titles)
    })

profile_df = pd.DataFrame(cluster_profiles)
print(profile_df.sort_values('Avg Distance (Messiness)', ascending=False)) # Most chaotic clusters first


# ## 6. Phase 4: Standardization Scout (The "Mirror" Detector)
# This is the most critical step for standardization. We look for jobs that are **semantically identical (>95% similarity)** but have **different titles**.
# These are immediate candidates for title consolidation.

# In[8]:


# Calculate Cosine Similarity Matrix (600x600 is fast)
sim_matrix = cosine_similarity(embeddings)

potential_duplicates = []
threshold = 0.95  # Strict threshold for "near-identical" roles

# Iterate through upper triangle of matrix
visited = set()
rows, cols = sim_matrix.shape

for i in range(rows):
    for j in range(i + 1, cols):
        score = sim_matrix[i, j]
        if score > threshold:
            title_a = df.iloc[i]['Unified Job Title']
            title_b = df.iloc[j]['Unified Job Title']

            # Only flag if titles are DIFFERENT (ignore exact matches, they are boring)
            # Also check if title_a contains title_b to avoid "Senior Acct" vs "Acct" trivial matches if desired
            # But here we want to catch ALL inconsistencies.
            if title_a.lower() != title_b.lower():
                potential_duplicates.append({
                    'Job A': title_a,
                    'Job B': title_b,
                    'Similarity Score': round(score, 4),
                    'Cluster': df.iloc[i]['Cluster_ID']
                })

dup_df = pd.DataFrame(potential_duplicates)
if not dup_df.empty:
    print(f"Found {len(dup_df)} pairs of Near-Duplicate roles with different titles.")
    print(dup_df.sort_values('Similarity Score', ascending=False).head(20))
else:
    print("No near-duplicates found above threshold.")


# ## 7. Conclusions & Action Plan
# 
# ### **Highest Priority for Standardization (The "Messy" Clusters)**
# Look at the Cluster Profile table above. Clusters with **Higher Avg Distance** contain roles that are loosely defined or contain a mix of disparate skills. These departments need interviews to clarify role boundaries.
# 
# ### **Immediate Wins (The "Mirror" Roles)**
# The *Near-Duplicate* table identifies roles that perform the exact same function but have inconsistent titles. 
# **Action:** Recommend consolidating these title pairs immediately (e.g., rename all "Sr. Acct Specialist" to "Senior Accountant").

# Find the cluster for "AI Developer"
print(f"\\nSearching for 'AI Developer'...")

search_term = "AI Developer"
mask = df['Unified Job Title'].str.contains(search_term, case=False, na=False)
ai_jobs = df[mask]

if not ai_jobs.empty:
    print(f"Found {len(ai_jobs)} jobs matching '{search_term}':")
    for index, row in ai_jobs.iterrows():
        cluster_id = row['Cluster_ID']
        print(f" - Title: {row['Unified Job Title']}")
        print(f"   Cluster ID: {cluster_id}")
        
        # Get context about this cluster
        cluster_data = df[df['Cluster_ID'] == cluster_id]
        sample_titles = cluster_data['Unified Job Title'].value_counts().head(5).index.tolist()
        print(f"   Cluster Context (Top 5 Titles): {', '.join(sample_titles)}")
        print("-" * 40)
else:
    print(f"No exact match for '{search_term}' found in Unified Job Titles.")
    # Try broader search
    print("Trying broader search...")
    mask_broad = df['combined_text'].str.contains("AI", case=False, na=False) & df['combined_text'].str.contains("Developer", case=False, na=False)
    ai_jobs_broad = df[mask_broad]
    if not ai_jobs_broad.empty:
        print(f"Found {len(ai_jobs_broad)} potential matches in full text:")
        for index, row in ai_jobs_broad.iterrows():
             print(f" - Title: {row['Unified Job Title']} (Cluster {row['Cluster_ID']})")
