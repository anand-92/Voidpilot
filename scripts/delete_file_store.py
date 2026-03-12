#!/usr/bin/env python3
"""Delete the Gemini File Search store."""

from google import genai

API_KEY = "AIzaSyByiOc5mdAKygGhccMJTkix1Z4I68gLuM8"
STORE_NAME = "fileSearchStores/voidpilotprojectcontext-xtuwmpcar7he"

client = genai.Client(api_key=API_KEY)

print(f"Deleting store: {STORE_NAME}")
try:
    client.file_search_stores.delete(name=STORE_NAME, config={"force": True})
    print("Deleted successfully!")
except Exception as e:
    print(f"Error: {e}")
