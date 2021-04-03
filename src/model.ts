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

interface CommandView {
  setData: any;
  redraw: any;
}

interface Input {
  vaultPath: string; // The current vault
  notePath?: string; // The active note (if there is one)
  text?: string; // The selected text (if there is)
  variant?: string; // when having different ML models.
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