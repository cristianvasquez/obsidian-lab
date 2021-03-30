interface LabSettings {
  experiments: Experiment[];
}

interface Parameter {
  label: string; // Human readable indicator, for example 'pagerank'
  path?: string; // The current note path
  textSelection?: string; // What's currently selected
}

interface Experiment {
  name: string;
  type: 'result-list';
  position: 'leaf-left' | 'leaf-right';
  trigger: 'invoke-on-focus' | 'command';
  debug: 'verbose' | 'off';
  command?: string;
  call?(parameter: Parameter): any;
}

interface Item {
  path: string;
  name: string;
  info?: object;
}
