
interface LabSettings {
  experiments: Experiment[];
}

interface Experiment {
  name: string;
  type: 'python-result-list';
  position: 'leaf-left' | 'leaf-right';
  invokeOnFocus: boolean;
  implementation?: object;
}

interface Item {
  path: string;
  basename: string;
  info?: object;
}

interface Parameter {
  label: string;
  path?: string;
  textSelection?: string;
}
