import importlib, scripts
import pkgutil

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_json_schema import JsonSchema, JsonValidationError

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


@app.route('/<path:script_path>', methods=['POST'])
@validator.validate(input_schema)
def execute_script(script_path):

    vault_path = request.json['vaultPath'] if 'vaultPath' in request.json else None
    note_path = request.json['notePath'] if 'notePath' in request.json else None
    text = request.json['text'] if 'text' in request.json else None

    module_str = script_path.replace("/", ".")
    module = importlib.import_module(module_str)
    plugin = module.Plugin(vault_path=vault_path)

    return plugin.execute(note_path, text)


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

if __name__ == '__main__':

    print(scripts)
    for i, module in scripts.items():
        plugin = module.Plugin('vault')
        # plugin.execute('var')

    app.run()
