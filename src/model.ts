interface Settings {
  commands: Command[];
}

interface Command {
  name: string;
  url: string;
  type: 'collection' | 'text' | 'graph';
  userInterface: 'panel-left' | 'panel-right' | 'replace-or-insert';
  invokeOnFocus: boolean,
  addHotkey: boolean,
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
  path: string; // Can be an internal link (perhaps a url?)
  name: string;
  info?: object;
}

interface PanelState {
  label?: string;
  contents: Item[] | string;
}
