import os
import random
from flask_cors import CORS, cross_origin

from flask_json_schema import JsonSchema, JsonValidationError
from flask import Flask, jsonify, request


app = Flask(__name__)

# Fixes
# Access to fetch at 'http://localhost:5000/' from origin 'app://obsidian.md'
obsidian_origin = "app://obsidian.md"
cors = CORS(app, resources = { r"/random": {"origins": obsidian_origin}})
app.config['CORS_HEADERS'] = 'Content-Type'

schema = JsonSchema(app)

# Example call
# { 
#   vaultPath: "/home/cvasquez/obsidian/development", 
#   notePath: "snippets-plugin/Test1.md"
#   text: "Some selected text", 
#   variant: "model-3", 
# }
input_schema = {
    'required': ['vaultPath'],
    'properties': {
        'vaultPath': { 'type': 'string' },
        'notePath': { 'type': 'string' },
        'text': { 'type': 'string' },
        'variant': { 'type': 'string' },
    }
}

@app.errorhandler(JsonValidationError)
def validation_error(e):
    error = {
        'message': e.message,
        'status': 400,
        'errors': [validation_error.message for validation_error  in e.errors]
        }    
    return jsonify(error)

@app.route('/random', methods=['POST'])
@schema.validate(input_schema)
def get_random_files(max_results=20):
    print('hit')
    print(request.json)
    vault_path = request.json['vaultPath']

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

@app.route('/text', methods=['POST'])
@schema.validate(input_schema)
def process_text(max_results=20):
    text = request.json['text']
    
    return {
        "text": f'Modified[${text}]',
    }


if __name__ == '__main__':
    model = random.random()
    app.run()
