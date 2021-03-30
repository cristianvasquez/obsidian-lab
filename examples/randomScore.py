import sys
import os
import random
import json

vault = sys.argv[2]
note_path = sys.argv[4]
maxResults = 20;

results = []

exclude = set(['.obsidian', '.trash', '.git'])
for root, dirs, files in os.walk(vault, topdown=True):
    dirs[:] = [d for d in dirs if d not in exclude]
    for file in files:
        if (file.endswith('.md') and random.random() > 0.5 and len(results) < maxResults):
            
            results.append({
                'path': os.path.join(root, file),
                'name': file[:-3],
                'info': {
                    'score': random.random()
                }
            })
    

results.sort(key=lambda x: x['info']['score'], reverse=True)
print(json.dumps( results ))