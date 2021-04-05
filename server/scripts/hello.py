import os


class Plugin:
    def __init__(self, *args, **kwargs):
        super()
        self.plugin_name = os.path.basename(__file__)

    def execute(self, note_path, text):
        return f'Hello from {self.plugin_name}'