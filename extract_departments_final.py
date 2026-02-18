#!/usr/bin/env python3
"""
Extract departments from filenames and map subdepartments to parent departments.
"""

import csv
import re

def extract_and_map_department(filename):
    """Extract department from path and map subdepartments to parent departments."""
    if not filename:
        return None
    
    # Check for "Full JDs" folder structure
    if 'Full JDs' in filename:
        # Extract the folder immediately after "Full JDs"
        match = re.search(r'Full JDs[\\/]([^\\/]+)', filename)
        if match:
            parent_dept = match.group(1).strip()
            
            # Mapping of parent folder names to standard department names
            parent_mappings = {
                'Finance': 'Finance',
                'Human Resources': 'Human Resources',
                'HR': 'Human Resources',
                'Operations': 'Operations',
                'Technical': 'Technical',
                'Maintenance': 'Maintenance',
                'Responsible Care': 'Responsible Care',
                'IT': 'IT',
                'Administration': 'Administration',
                'Business Services (Executive Office)': 'Administration',
                'Communications': 'Communications',
                'Commercial': 'Commercial',
                'Supply Chain': 'Supply Chain',
                'Turnaround': 'Turnaround',
                'TAR': 'Turnaround',
                'Legal': 'Legal',
                'Marketing and Logistics': 'Marketing',
                'Marketing': 'Marketing',
                'Sustainability': 'Sustainability',
                'Manufacturing': 'Manufacturing',
                'Corporate Development': 'Corporate Development',
                'GSCMP': 'Supply Chain',  # Global Supply Chain & Market Planning
            }
            
            for key, value in parent_mappings.items():
                if key.lower() == parent_dept.lower() or key in parent_dept:
                    return value
            
            # If no mapping found, return the parent folder name
            return parent_dept
    
    # Check for date-prefixed filenames
    basename = filename.split('\\')[-1] if '\\' in filename else filename
    name_without_ext = re.sub(r'\.(docx?|pdf)$', '', basename, flags=re.IGNORECASE)
    
    match = re.match(r'\d{4}\s*[-\\]\s*(.+)', name_without_ext)
    if match:
        rest = match.group(1).strip()
        rest = re.sub(r'^JD\s*[-\\]\s*', '', rest, flags=re.IGNORECASE)
        parts = re.split(r'\s*[-\\]\s*', rest)
        
        if parts:
            dept_candidate = parts[0].strip().rstrip(',; ')
            
            # Map known patterns to departments
            dept_mappings = {
                'Finance': 'Finance',
                'Human Resources': 'Human Resources',
                'HR': 'Human Resources',
                'Operations': 'Operations',
                'Technical': 'Technical',
                'Maintenance': 'Maintenance',
                'Responsible Care': 'Responsible Care',
                'IT': 'IT',
                'Administration': 'Administration',
                'Commercial': 'Commercial',
                'Supply Chain': 'Supply Chain',
                'Turnaround': 'Turnaround',
                'TAR': 'Turnaround',
                'Legal': 'Legal',
                'Marketing': 'Marketing',
                'Sustainability': 'Sustainability',
                'Manufacturing': 'Manufacturing',
                'Corporate Development': 'Corporate Development',
            }
            
            for key, value in dept_mappings.items():
                if key.lower() in dept_candidate.lower():
                    return value
    
    return None

def determine_department_from_content(job_title, position_summary, responsibilities):
    """Determine department based on job content for rows without clear path info."""
    
    job_title_lower = (job_title or "").lower()
    summary_lower = (position_summary or "").lower()
    resp_lower = (responsibilities or "").lower()
    all_text = job_title_lower + " " + summary_lower + " " + resp_lower
    
    # Finance
    if any(w in all_text for w in ['finance manager', 'financial analyst', 'accountant', 
                                    'finance ', 'accounting', 'controller', 'treasury', 'tax ']):
        return 'Finance'
    
    # Human Resources
    if any(w in all_text for w in ['hr advisor', 'hr business partner', 'human resources', 
                                    'hr ', 'benefits', 'recruitment', 'hr administrator']):
        return 'Human Resources'
    
    # Operations
    if any(w in all_text for w in ['operations manager', 'process operator', 'production', 
                                    'shift supervisor', 'product handler', 'power engineering']):
        return 'Operations'
    
    # Technical
    if any(w in all_text for w in ['process engineer', 'instrument', 'electrical engineer', 
                                    'ie engineer', 'drafter', 'lab technician', 'project engineer']):
        return 'Technical'
    
    # Maintenance
    if any(w in all_text for w in ['pipefitter', 'millwright', 'mechanic', 'welder', 
                                    'maintenance', 'inspector', 'reliability engineer']):
        return 'Maintenance'
    
    # Responsible Care
    if any(w in all_text for w in ['safety advisor', 'process safety', 'emergency services', 
                                    'security advisor', 'responsible care', 'environmental engineer']):
        return 'Responsible Care'
    
    # IT
    if any(w in all_text for w in ['it analyst', 'it ', 'information technology', 
                                    'systems', 'developer', 'applications analyst']):
        return 'IT'
    
    # Administration
    if any(w in all_text for w in ['administrative assistant', 'executive assistant', 
                                    'receptionist', 'front desk']):
        return 'Administration'
    
    # Commercial
    if any(w in all_text for w in ['customer service', 'market analyst', 'product manager', 'commercial']):
        return 'Commercial'
    
    # Supply Chain
    if any(w in all_text for w in ['buyer', 'procurement', 'logistics', 'supply chain', 
                                    'warehouse', 'inventory', 'material']):
        return 'Supply Chain'
    
    # Turnaround
    if 'turnaround' in all_text or ' tar ' in all_text:
        return 'Turnaround'
    
    # Legal
    if any(w in all_text for w in ['counsel', 'legal', 'paralegal', 'lawyer']):
        return 'Legal'
    
    # Communications
    if 'communications' in all_text:
        return 'Communications'
    
    # Sustainability
    if 'sustainability' in all_text:
        return 'Sustainability'
    
    # Manufacturing
    if 'manufacturing' in all_text:
        return 'Manufacturing'
    
    # Marketing
    if 'marketing' in all_text:
        return 'Marketing'
    
    # Corporate Development
    if 'corporate development' in all_text:
        return 'Corporate Development'
    
    return 'Other'

def main():
    input_file = "Hackathon Challenge #1 Datasets Cleaned.csv"
    output_file = "job_postings_with_departments.csv"
    
    rows = []
    
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    
    print(f"Total rows: {len(rows)}")
    
    results = []
    path_extracted = 0
    content_fallback = 0
    
    for i, row in enumerate(rows):
        employee_id = i + 1
        filename = row.get('filename', '')
        job_title = row.get('job_title', '')
        position_summary = row.get('position_summary', '')
        responsibilities = row.get('responsibilities', '')
        
        # Try to extract department from filename/path
        department = extract_and_map_department(filename)
        
        if department:
            path_extracted += 1
        else:
            # Fallback to content analysis
            department = determine_department_from_content(job_title, position_summary, responsibilities)
            content_fallback += 1
        
        results.append({
            'employee_id': employee_id,
            'department': department,
            'filename': filename,
            'job_title': job_title,
            'position_summary': position_summary,
            'responsibilities': responsibilities,
            'qualifications': row.get('qualifications', '')
        })
    
    # Write output
    output_fieldnames = ['employee_id', 'department', 'filename', 'job_title', 
                         'position_summary', 'responsibilities', 'qualifications']
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=output_fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"Output written to: {output_file}")
    print(f"\nExtraction method:")
    print(f"  From filename/path: {path_extracted}")
    print(f"  From content analysis: {content_fallback}")
    
    # Print department distribution
    dept_counts = {}
    for r in results:
        dept = r['department']
        dept_counts[dept] = dept_counts.get(dept, 0) + 1
    
    print(f"\nDepartment Distribution ({len(dept_counts)} unique departments):")
    for dept, count in sorted(dept_counts.items(), key=lambda x: -x[1]):
        print(f"  {count:3d} | {dept}")
    
    # Verify Finance consolidation
    print("\n--- Verification: Finance subdepartments should all be 'Finance' ---")
    finance_examples = [r for r in results if 'Full JDs' in r['filename'] and 'Finance' in r['filename']][:10]
    for r in finance_examples:
        folder = r['filename'].split('\\')[5] if len(r['filename'].split('\\')) > 5 else ''
        print(f"  {r['employee_id']}: {r['department']} (from: {folder})")

if __name__ == "__main__":
    main()
