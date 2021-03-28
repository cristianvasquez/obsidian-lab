
interface LabConfig {
  experiments: Experiment[];
}

interface Experiment {
  name: string;
  autoCall: boolean;
  position: 'leaf-left' | 'leaf-right';
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