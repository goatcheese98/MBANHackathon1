import pandas as pd
import re
import os

# 1. Load the dataset
input_file = '/Users/rohanjasani/Desktop/Hackathon/Hackathon Challenge #1 Datasets Cleaned.csv'
output_file = '/Users/rohanjasani/Desktop/Hackathon/Hackathon_Datasets_Refined_v2.csv'

print(f"Loading data from {input_file}...")
df = pd.read_csv(input_file)

# --- Cleaning Functions ---

def clean_filename(path):
    """
    Extracts a clean job title from a file path.
    1. Removes directory path.
    2. Removes file extension.
    3. Removes dates/numeric prefixes (e.g., 202203, 2024-02).
    4. Removes common suffixes/noise words.
    5. Cleans whitespace.
    """
    if not isinstance(path, str):
        return ""

    # 1. Get base filename
    # Handle both Windows and Unix separators just in case
    filename = os.path.basename(path).replace('\\', '/')
    filename = filename.split('/')[-1]

    # 2. Remove extension
    filename = os.path.splitext(filename)[0]

    # 3. Remove date prefixes (e.g., "202203 ", "2024-05-")
    # Matches: Start of string, 4-8 digits, optional separators like - or _ or space
    filename = re.sub(r'^\d{4,8}[-_\s]*', '', filename)
    
    # 4. Remove common noise words (Case insensitive)
    noise_words = [
        r'\bposting\b', 
        r'\bjob description\b', 
        r'\bjd\b', 
        r'\bexternal\b', 
        r'\binternal\b',
        r'\bexpression of interest\b',
        r'\bsecondment\b',
        r'\bacting\b', # often appears in temp roles
        r'\bterm\b',
        r'\bcontract\b'
    ]
    
    for word in noise_words:
        filename = re.sub(word, '', filename, flags=re.IGNORECASE)

    # 5. Clean whitespace (remove extra spaces, trim)
    filename = re.sub(r'\s+', ' ', filename).strip()
    
    return filename

def determine_internal(row):
    """
    Determines if a role is an internal posting based on keywords
    in the original filename or job title.
    """
    # Combine relevant fields for searching
    text_to_search = str(row.get('filename', '')) + " " + str(row.get('job_title', ''))
    
    keywords = ['internal', 'expression of interest', 'secondment', 'acting']
    
    if any(keyword in text_to_search.lower() for keyword in keywords):
        return 'Yes'
    return 'No'

def create_unified_title(row):
    """
    Creates the final 'Unified Job Title'.
    Prioritizes the cleaned filename. Falls back to original job_title if cleaned filename is too short/empty.
    """
    cleaned_name = clean_filename(row.get('filename', ''))
    original_title = str(row.get('job_title', '')).strip()
    
    # Validation logic
    if len(cleaned_name) > 3:
        return cleaned_name.title() # Convert to Title Case
    elif len(original_title) > 3:
        return original_title.title()
    else:
        return "Unknown Position"

# --- Apply Logic ---

print("Cleaning filenames...")
# Apply the cleaning function to create a temporary column for inspection if needed, 
# but we'll go straight to the Unified Title.

print("Generating Unified Job Titles...")
df['Unified Job Title'] = df.apply(create_unified_title, axis=1)

print("Determining Internal Posting status...")
df['Internal Posting'] = df.apply(determine_internal, axis=1)

# --- Additional Cleaning ---

# Fill NaN values in updateable text fields to avoid backend errors
text_columns = ['position_summary', 'responsibilities', 'qualifications']
for col in text_columns:
    if col in df.columns:
        df[col] = df[col].fillna("")

# Remove duplicates based on the new Unified Title (optional, but good for clean datasets)
# We will keep the first occurrence.
# initial_count = len(df)
# df = df.drop_duplicates(subset=['Unified Job Title'], keep='first')
# print(f"Removed {initial_count - len(df)} duplicate job titles.")

# --- Export ---

print(f"Saving refined dataset to {output_file}...")
df.to_csv(output_file, index=False)

# Preview results
print("\nPreview of the first 5 rows:")
print(df[['filename', 'Unified Job Title', 'Internal Posting']].head())
