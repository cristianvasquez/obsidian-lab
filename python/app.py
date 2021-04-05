import importlib
import pkgutil
import scripts
import socket

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_json_schema import JsonSchema, JsonValidationError


PORT=5000
HOST='127.0.0.1'

app = Flask(__name__)
validator = JsonSchema(app)

# Allows access to fetch at 'http://localhost:5000/' from origin 'app://obsidian.md'
obsidian_origin = "app://obsidian.md"
cors = CORS(app, origins=obsidian_origin)
app.config['CORS_HEADERS'] = 'Content-Type'

# Input schema example:
# {
#   vaultPath: "/home/cvasquez/obsidian/development", 
#   notePath: "snippets-plugin/Test1.md"
#   text: "Some selected text", 
# }
input_schema = {
    'required': ['vaultPath'],
    'properties': {
        'vaultPath': {'type': 'string'},
        'notePath': {'type': 'string'},
        'text': {'type': 'string'},
        'script': {'type': 'string'},
    }
}


@app.errorhandler(JsonValidationError)
def validation_error(e):
    error = {
        'message': e.message,
        'status': 400,
        'errors': [validation_error.message for validation_error in e.errors]
    }
    return jsonify(error)

def iter_namespace(ns_pkg):
    # Specifying the second argument (prefix) to iter_modules makes the
    # returned name an absolute name instead of a relative one. This allows
    # import_module to work without having to do additional modification to
    # the name.
    return pkgutil.iter_modules(ns_pkg.__path__, ns_pkg.__name__ + ".")

scripts = {
    name: importlib.import_module(name)
    for finder, name, ispkg
    in iter_namespace(scripts)
    if name.startswith('scripts')
}

'''Returns the status of the app'''
@app.route('/', methods=['GET'])
def root():

    def host(script):
        return  f'http://{HOST}:{PORT}/{script.replace(".", "/")}' 

    return  {
        'scripts':   [host(x) for x in scripts.keys()]
    }


'''Invokes a plugin'''
@app.route('/<path:script_path>', methods=['POST'])
@validator.validate(input_schema)
def execute_script(script_path):

    vault_path = request.json['vaultPath'] if 'vaultPath' in request.json else None
    note_path = request.json['notePath'] if 'notePath' in request.json else None
    text = request.json['text'] if 'text' in request.json else None

    try:
        module_str = script_path.replace("/", ".")
        module = importlib.import_module(module_str)
        plugin = module.Plugin(vault_path=vault_path)
    except ModuleNotFoundError as e:
        return  {
            'message': e.message,
            'status': 500,
            'errors': [e.message]
        }

    return plugin.execute(note_path, text)

if __name__ == '__main__':
    app.run(port=PORT,host=HOST)