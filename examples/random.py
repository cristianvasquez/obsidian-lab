import os

import random


class Plugin:
    vault_path = ''
    max_results = 20

    def __init__(self, vault_path):
        self.vault_path = vault_path
        super()

    def execute(self, note_path, text):

        vault_path = self.vault_path
        items = []
        exclude = {'.obsidian', '.trash', '.git'}
        for root, dirs, files in os.walk(vault_path, topdown=True):
            dirs[:] = [d for d in dirs if d not in exclude]
            for file in files:
                if file.endswith('.md') and random.random() > 0.5 and len(items) < self.max_results:
                    items.append({
                        'path': os.path.join(root, file),
                        'name': file[:-3],
                        'info': {
                            'score': random.random()
                        }
                    })
        items.sort(key=lambda x: x['info']['score'], reverse=True)
        return {
            "contents": items,
        }
