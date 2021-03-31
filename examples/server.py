import os
import random

from flask import Flask

app = Flask(__name__)

# Fixes
# Access to fetch at 'http://localhost:5000/' from origin 'app://obsidian.md'
from flask_cors import CORS

obsidian_origin = "app://obsidian.md"
cors = CORS(app, resources={r"/random": {"origins": obsidian_origin}})

app.config['CORS_HEADERS'] = 'Content-Type'

model = 0


# Example call
# {commandId: "obsidian_lab_0", vaultPath: "/home/cvasquez/obsidian/development", selectedText: "hi", activeNotePath: "snippets-plugin/Test1.md"}

@app.route('/index', methods=['POST'])
def re_index():
    super.model = random.random()
    return {
        "status": "ok",
        "model": model,
    }


@app.route('/random', methods=['POST'])
def get_random_files(vault='/home/cvasquez/obsidian/development', max_results=20):
    items = []
    exclude = {'.obsidian', '.trash', '.git'}
    for root, dirs, files in os.walk(vault, topdown=True):
        dirs[:] = [d for d in dirs if d not in exclude]
        for file in files:
            if file.endswith('.md') and random.random() > 0.5 and len(items) < max_results:
                items.append({
                    'path': os.path.join(root, file),
                    'name': file[:-3],
                    'info': {
                        'score': random.random()
                    }
                })

    items.sort(key=lambda x: x['info']['score'], reverse=True)
    return {
        "items": items,
    }


if __name__ == '__main__':
    model = random.random()
    app.run()
