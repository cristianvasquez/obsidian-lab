type Settings = {
  server_url: string;
  commands: Record<string, Command>;
  debug: 'verbose' | 'off';
};

type Command = {
  label: string;
  type: 'collection' | 'text' | 'graph';
  userInterface: 'panel-left' | 'panel-right' | 'replace-text' | 'insert-text';
  active: boolean;
  addHotkey: boolean;
  invokeOnFocus: boolean;
};

interface CommandView {
  setData: any;
  redraw: any;
}

// This goes to the server
type Input = {
  vaultPath: string; // The current vault
  notePath?: string; // The active note (if there is one)
  text?: string; // The selected text (if there is)
  variant?: string; // when having different ML models.
};

// This comes from the server
type Item = {
  path: string; // Can be an internal link (perhaps a url?)
  name: string;
  info?: object;
};

type PanelState = {
  label?: string;
  contents: Item[] | string;
};
