class Plugin:

    def __init__(self, *args, **kwargs):
        super()

    def execute(self, note_path, text):
        return {
            "contents": text.upper()
        }
