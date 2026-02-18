
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
