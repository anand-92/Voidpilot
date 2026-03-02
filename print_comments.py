import json
with open('comments.json', encoding='utf-8') as f:
    comments = json.load(f)
for c in comments:
    print(f"File: {c.get('path')}")
    print(f"Line: {c.get('line')}")
    print(f"Body: {c.get('body')}")
    print("---")
