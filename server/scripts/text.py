class Plugin:
    vault_path = ''
    max_results = 20

    def __init__(self, vault_path):
        self.vault_path = vault_path
        super()

    def execute(self, note_path, text):
        return {
            "contents": text.upper(),
        }
