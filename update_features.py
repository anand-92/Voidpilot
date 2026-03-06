import json

path = 'C:/Users/tazzo/.factory/missions/284f19d3-b491-482c-b480-7b01b56c7d04/features.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

new_feature = {
    'id': 'delta-vision-threshold-update',
    'description': 'Update the Delta-Vision skip threshold from 1% to 5% in frontend/src/hooks/useGeminiLive.ts. Change 0.01 to 0.05.',
    'skillName': 'electron-worker',
    'milestone': 'misc-optimization-fixes',
    'preconditions': [],
    'expectedBehavior': ['The skipThreshold uses 0.05 instead of 0.01'],
    'verificationSteps': ['Check the code in frontend/src/hooks/useGeminiLive.ts'],
    'fulfills': [],
    'status': 'pending'
}

data['features'].append(new_feature)

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Updated features.json")
