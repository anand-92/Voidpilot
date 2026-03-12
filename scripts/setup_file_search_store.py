#!/usr/bin/env python3
"""
Script to create and populate the Gemini File Search store for the Walkthrough Agent.
Uploads: /docs folder (generated MD files) + root README.md, AGENTS.md
"""

import os
import time
from google import genai
from google.genai import types

# Configuration - using hardcoded key from project
API_KEY = "AIzaSyByiOc5mdAKygGhccMJTkix1Z4I68gLuM8"
STORE_NAME = "voidpilot-docs-context"


def get_files_to_upload(base_dir: str) -> list[str]:
    """Get list of .md files to upload from base directory."""
    files = []
    for root, dirs, filenames in os.walk(base_dir):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        
        for filename in filenames:
            if filename.endswith(".md"):
                filepath = os.path.join(root, filename)
                files.append(filepath)
    return files


def main():
    client = genai.Client(api_key=API_KEY)
    
    # Create the file search store
    print(f"Creating file search store: {STORE_NAME}")
    file_search_store = client.file_search_stores.create(
        config={"display_name": STORE_NAME}
    )
    print(f"Created store: {file_search_store.name}")
    
    # Prepare files to upload
    files_to_upload = []
    
    # Add /docs files
    print("\nScanning /docs...")
    docs_files = get_files_to_upload("/Users/nikhilanand/gemini-live-3d-bridge/docs")
    files_to_upload.extend(docs_files)
    print(f"  Found {len(docs_files)} files")
    
    # Add root markdown files
    root_md_files = [
        "/Users/nikhilanand/gemini-live-3d-bridge/README.md",
        "/Users/nikhilanand/gemini-live-3d-bridge/AGENTS.md",
    ]
    for f in root_md_files:
        if os.path.exists(f):
            files_to_upload.append(f)
            print(f"  Added root: {f}")
    
    print(f"\nTotal files to upload: {len(files_to_upload)}")
    
    # Upload files
    for filepath in files_to_upload:
        try:
            # Upload file first
            uploaded_file = client.files.upload(
                file=filepath,
                config={
                    "display_name": filepath.split("/")[-1],
                    "mime_type": "text/markdown"
                }
            )
            
            # Then import to store
            operation = client.file_search_stores.import_file(
                file_search_store_name=file_search_store.name,
                file_name=uploaded_file.name,
            )
            
            # Wait for operation to complete
            while not operation.done:
                time.sleep(2)
                operation = client.operations.get(operation)
            
            print(f"  Uploaded: {filepath}")
        except Exception as e:
            print(f"  ERROR uploading {filepath}: {e}")
    
    print(f"\n=== SUCCESS ===")
    print(f"File Search Store ID: {file_search_store.name}")
    print(f"Add this to your .env: GEMINI_FILE_SEARCH_STORE_ID={file_search_store.name}")


if __name__ == "__main__":
    main()
