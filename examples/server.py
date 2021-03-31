import os
import random
from flask_cors import CORS, cross_origin
from flask import Flask
from flask import request

app = Flask(__name__)

# Fixes
# Access to fetch at 'http://localhost:5000/' from origin 'app://obsidian.md'

obsidian_origin = "app://obsidian.md"
cors = CORS(app, resources={r"/random": {"origins": obsidian_origin}})

app.config['CORS_HEADERS'] = 'Content-Type'

model = 0


# Example call
# {commandId: "obsidian_lab_0", vaultPath: "/home/cvasquez/obsidian/development", selectedText: "hi", activeNotePath: "snippets-plugin/Test1.md"}

@app.route('/index', methods=['POST'])
@cross_origin(origin=obsidian_origin,headers=['Content-Type','Authorization'])
def re_index():
    super.model = random.random()
    return {
        "status": "ok",
        "model": model,
    }


@app.route('/random', methods=['POST'])
def get_random_files(max_results=20):
    print(request.json)
    vault_path = request.json['vaultPath']
    active_note_path = request.json['activeNotePath']

    items = []
    exclude = {'.obsidian', '.trash', '.git'}
    for root, dirs, files in os.walk(vault_path, topdown=True):
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
