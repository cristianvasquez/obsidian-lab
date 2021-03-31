interface Settings {
  commands: Command[];
}

interface Command {
  name: string;
  url: string;
  type: 'result-list' | 'paste-text' | 'text-panel';
  position: 'leaf-left' | 'leaf-right';
  trigger: 'invoke-on-focus' | 'only-hotkey';
  debug: 'verbose' | 'off';
  modelId?:string
}

interface Input {
  vaultPath: string; // The current vault
  activeNotePath?: string; // The active note (if there is one)
  selectedText?: string; // The selected text (if there is)
  modelId?: string; // when having different ML models.
}

interface Item {
  path: string;
  name: string;
  info?: object;
}

interface ResultListState {
  label?:string;
  items: Item[];
}