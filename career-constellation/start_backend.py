#!/usr/bin/env python3
"""
Simple backend starter that handles the large dataset properly
"""

import os
import sys
import subprocess

def main():
    os.chdir('/Users/rohanjasani/Desktop/Hackathon/career-constellation/backend')
    
    # Create venv if needed
    if not os.path.exists('venv'):
        print("🔧 Creating Python virtual environment...")
        subprocess.run([sys.executable, '-m', 'venv', 'venv'])
    
    # Determine activation and pip paths
    if os.name == 'nt':  # Windows
        pip_path = 'venv\\Scripts\\pip'
        python_path = 'venv\\Scripts\\python'
    else:  # macOS/Linux
        pip_path = 'venv/bin/pip'
        python_path = 'venv/bin/python'
    
    # Install dependencies
    print("📦 Installing dependencies...")
    subprocess.run([pip_path, 'install', '-q', 'fastapi', 'uvicorn', 'pandas', 'numpy', 'scikit-learn', 'python-multipart'])
    
    # Try to install sentence-transformers, but don't fail if it doesn't work
    print("🤖 Attempting to install AI models (optional)...")
    result = subprocess.run([pip_path, 'install', '-q', 'sentence-transformers'], capture_output=True)
    if result.returncode != 0:
        print("⚠️  Sentence-BERT not installed, will use TF-IDF fallback")
    
    # Start the server
    print("🚀 Starting backend server on http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("\n⚠️  First startup may take 1-2 minutes to process the dataset...")
    print("")
    
    os.environ['PYTHONUNBUFFERED'] = '1'
    subprocess.run([python_path, 'main.py'])

if __name__ == '__main__':
    main()
