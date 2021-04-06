import {
  addIcon,
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  FileSystemAdapter,
  Notice,
  MarkdownView,
  View,
} from 'obsidian';
import { ResultListView } from './panel';

const getDefaultSettings = function (currentVaultPath: string): Settings {
  return {
    commands: [
      {
        name: 'Hello world',
        url: 'http://localhost:5000/hello_world',
        type: 'text',
        invokeOnFocus: false,
        addHotkey: true,
        debug: 'verbose',
        userInterface: 'insert-text',
      },
      {
        name: 'Convert to upper case',
        url: 'http://localhost:5000/to_upper_case',
        type: 'text',
        invokeOnFocus: false,
        addHotkey: true,
        debug: 'verbose',
        userInterface: 'replace-text',
      },
      {
        name: 'Random score similarity',
        url: 'http://localhost:5000/random',
        type: 'collection',
        invokeOnFocus: true,
        addHotkey: false,
        debug: 'verbose',
        userInterface: 'panel-right',
      },
    ],
  };
};

export default class PythonLabPlugin extends Plugin {
  public settings: Settings;
  public view: ResultListView;

  private buildCommandId(index: number): string {
    return `obsidian_lab_${index}`;
  }

  public getVaultPath(): string {
    if (!(this.app.vault.adapter instanceof FileSystemAdapter)) {
      throw new Error('app.vault is not a FileSystemAdapter instance');
    }
    return this.app.vault.adapter.getBasePath();
  }

  public async onload(): Promise<void> {
    console.log('loading python lab plugin');

    addIcon('sweep', sweepIcon);
    addIcon('lab', labIcon);

    await this.loadSettings();

    if (this.settings && this.settings.commands) {
      // The function that triggers each time 'command' is executed

      const buildHandler = (command: Command, commandView: CommandView) => {
        return async () => {
          let parameters: Input = {
            vaultPath: this.getVaultPath(),
          };
          const activeView = this.app.workspace.activeLeaf.view;

          if (activeView instanceof MarkdownView) {
            const editor = activeView.sourceMode.cmEditor;
            let selectedText = editor.getSelection();
            if (selectedText) {
              parameters.text = selectedText;
            }
            if (activeView.file && activeView.file.path) {
              parameters.notePath = activeView.file.path;
            }
          }

          let requestBody = JSON.stringify(parameters);
          if (command.debug == 'verbose') {
            console.info('requestBody', requestBody);
          }
          
          fetch(command.url, {
            method: 'POST',
            body: requestBody,
            headers: {
              'content-type': 'application/json',
            },
          })
            .then(function (response) {
              return response.json();
            })
            .then(function (data) {
              if (command.debug == 'verbose') {
                console.info('data', data);
              }
              if (data.errors) {
                console.error(data);
                new Notification(data.message);
              } else {
                if (commandView) {
                  // Update the state of the view panel
                  data.label = command.name;
                  commandView.setData(data);
                  commandView.redraw();
                } else if (command.userInterface == 'replace-text') {
                  // Replaces the current selection
                  if (activeView instanceof MarkdownView) {
                    const editor = activeView.sourceMode.cmEditor;
                    // TODO probably lists should be rendered as markdown lists
                    editor.replaceSelection(data.contents);
                  }
                } else if (command.userInterface == 'insert-text') {
                  // Insert content in the cursor position
                  const activeView = this.app.workspace.activeLeaf.view;
                  if (activeView instanceof MarkdownView) {
                    const editor = activeView.sourceMode.cmEditor;
                    // TODO probably lists should be rendered as markdown lists
                    editor.replaceSelection(data.contents, 'start');
                  }
                }
              }
            })
            .catch(function (error) {
              console.error(error);
              new Notice(`[${command.name}]. ${error.message}`);
            });
        };
      };

      this.settings.commands.forEach((command: Command, index: number) => {
        if (command.debug == 'verbose') {
          console.log(`registering [${command.name}] as [${command.type}]`);
        }
        let commandId: string = this.buildCommandId(index);

        if (
          command.userInterface == 'panel-left' ||
          command.userInterface == 'panel-right'
        ) {
          this.registerView(commandId, (leaf) => {
            let commandView = new ResultListView(leaf, commandId, command.name);

            const handleCall = buildHandler(command, commandView);

            this.addCommand({
              id: commandId,
              name: command.name,
              callback: () => handleCall(),
              hotkeys: [],
            });

            if (command.invokeOnFocus) {
              commandView.registerCallback(handleCall);
            }

            return commandView;
          });
        } else if (command.userInterface == 'replace-text'||command.userInterface == 'insert-text') {
          const handleCall = buildHandler(command, undefined);
          this.addCommand({
            id: commandId,
            name: command.name,
            callback: () => handleCall(),
            hotkeys: [],
          });
        }
      });
    } else {
      console.log(`settings[${this.settings}]`);
    }

    if (this.app.workspace.layoutReady) {
      this.initView();
    } else {
      this.registerEvent(this.app.workspace.on('layout-ready', this.initView));
    }
    this.addSettingTab(new PythonLabSettings(this.app, this));
  }

  public async loadSettings(): Promise<void> {
    const defaultSettings = getDefaultSettings(this.getVaultPath());
    this.settings = Object.assign(defaultSettings, await super.loadData());
  }

  public async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Init all commands
   */
  private readonly initView = (): void => {
    if (this.settings && this.settings.commands) {
      this.settings.commands.forEach((command: Command, index: number) => {
        let commandId: string = this.buildCommandId(index);

        // If is not active
        if (!this.app.workspace.getLeavesOfType(commandId).length) {
          switch (command.userInterface) {
            case 'panel-left': {
              this.app.workspace.getLeftLeaf(false).setViewState({
                type: commandId,
                active: true,
              });
              break;
            }
            case 'panel-right': {
              this.app.workspace.getRightLeaf(false).setViewState({
                type: commandId,
                active: true,
              });
              break;
            }
            default: {
              //statements;
              break;
            }
          }
        }
      });
    }
  };
}

/**
 * Settings
 */

class PythonLabSettings extends PluginSettingTab {
  private readonly plugin: PythonLabPlugin;

  constructor(app: App, plugin: PythonLabPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  public display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2', { text: 'Registered commands' });

    new Setting(containerEl)
      .setName('Commands')
      .setDesc('config for each command')
      .addTextArea((text) => {
        text
          .setPlaceholder(
            JSON.stringify(
              getDefaultSettings(this.plugin.getVaultPath()),
              null,
              2,
            ),
          )
          .setValue(JSON.stringify(this.plugin.settings, null, 2) || '')
          .onChange(async (value) => {
            try {
              const newValue = JSON.parse(value);
              this.plugin.settings = newValue;
              await this.plugin.saveSettings();
            } catch (e) {
              return false;
            }
          });
        text.inputEl.rows = 24;
        text.inputEl.cols = 120;
      });

    const div = containerEl.createEl('div', {
      cls: 'python-lab-text',
    });

    containerEl.createEl('p', { text: 'Restart after making changes.' });
    containerEl.createEl('p', {
      text: 'Pull requests are both welcome and appreciated. :)',
    });
  }
}

const sweepIcon = `
<svg fill="currentColor" stroke="currentColor" version="1.1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <path d="m495.72 1.582c-7.456-3.691-16.421-0.703-20.142 6.694l-136.92 274.08-26.818-13.433c-22.207-11.118-49.277-2.065-60.396 20.083l-6.713 13.405 160.96 80.616 6.713-13.411c11.087-22.143 2.227-49.18-20.083-60.381l-26.823-13.435 136.92-274.08c3.706-7.412 0.703-16.421-6.694-20.141z"/>
  <circle cx="173" cy="497" r="15"/>
  <circle cx="23" cy="407" r="15"/>
  <circle cx="83" cy="437" r="15"/>
  <path d="m113 482h-60c-8.276 0-15-6.724-15-15 0-8.291-6.709-15-15-15s-15 6.709-15 15c0 24.814 20.186 45 45 45h60c8.291 0 15-6.709 15-15s-6.709-15-15-15z"/>
  <path d="m108.64 388.07c-6.563 0.82-11.807 5.845-12.92 12.349-1.113 6.519 2.153 12.993 8.057 15.952l71.675 35.889c12.935 6.475 27.231 9.053 41.177 7.573-1.641 6.65 1.479 13.784 7.852 16.992l67.061 33.589c5.636 2.78 12.169 1.8 16.685-2.197 2.347-2.091 53.436-48.056 83.3-98.718l-161.6-80.94c-36.208 48.109-120.36 59.39-121.28 59.511z"/>
</svg>`;

const labIcon = `<svg fill="currentColor" stroke="currentColor" version="1.1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
<g>
	<path d="M389.481,233.423H327.04c5.93-11.57,8.867-25.613,8.867-42.268c0-77.316-63.773-140.218-142.162-140.218
		c-36.268,0-70.191,13.172-96.496,37.26c-8.119-5.291-17.798-8.379-28.19-8.379c-28.555,0-51.786,23.231-51.786,51.787
		c0,11.137,3.591,21.861,10.079,30.676C10.488,178.752,0,201.725,0,227.105c0,15.821,4.049,27.522,12.379,35.773
		c14.779,14.638,38.832,14.409,66.684,14.141c7.569-0.072,54.375-0.244,63.189-1.774c16.319,1.478,34.363,1.697,51.493,1.697
		c36.471,0,71.354-0.895,97.295-11.694c7.648-3.184,14.296-7.12,19.966-11.824h78.475c12.198,0,22.123,9.925,22.123,22.124
		c0,12.199-9.925,22.124-22.123,22.124H140.494c-22.632,0-41.247,18.411-41.496,41.042c-0.123,11.17,4.136,21.696,11.992,29.639
		c7.855,7.942,18.333,12.316,29.504,12.316h146.671c5.522,0,10-4.477,10-10s-4.478-10-10-10H140.494
		c-5.787,0-11.215-2.266-15.285-6.38c-4.07-4.115-6.276-9.567-6.212-15.354c0.129-11.724,9.772-21.262,21.497-21.262h248.988
		c23.227,0,42.123-18.896,42.123-42.124S412.708,233.423,389.481,233.423z M37.273,131.605c0-17.527,14.259-31.787,31.786-31.787
		c17.527,0,31.787,14.259,31.787,31.787c0,1.816-0.159,3.605-0.457,5.364c-3.22-0.345-6.468-0.518-9.735-0.518
		c-17.42,0-33.704,4.943-47.534,13.494C39.356,144.628,37.273,138.237,37.273,131.605z M102.436,257.02
		c-3.847-0.037-7.781-0.074-11.782-0.074s-7.935,0.038-11.782,0.074c-23.377,0.225-43.565,0.417-52.419-8.352
		C22.111,244.367,20,237.314,20,227.105c0-38.958,31.695-70.654,70.654-70.654c8.497,0,16.819,1.5,24.735,4.46
		c3.155,1.179,6.693,0.691,9.411-1.299c2.718-1.991,4.25-5.216,4.078-8.581c-0.028-0.551-0.043-1.106-0.043-1.665
		c0-17.526,14.258-31.784,31.784-31.784s31.785,14.258,31.785,31.784c0,16.922-13.223,30.864-30.102,31.74
		c-3.369,0.175-6.423,2.037-8.122,4.951c-1.698,2.915-1.813,6.49-0.304,9.507c4.932,9.864,7.433,20.476,7.433,31.54
		c0,10.209-2.111,17.262-6.453,21.563C146.001,257.437,125.807,257.242,102.436,257.02z M283.353,246.784
		c-22.532,9.381-55.243,10.158-89.607,10.158c-6.547,0-13.224-0.037-19.863-0.16c4.978-7.626,7.425-17.407,7.425-29.677
		c0-9.818-1.536-19.361-4.578-28.503c20.805-6.784,35.673-26.335,35.673-49.235c0-28.554-23.23-51.784-51.785-51.784
		c-16.956,0-32.03,8.194-41.482,20.828c-1.554-5.894-4.128-11.376-7.514-16.255c22.487-20.193,51.317-31.217,82.123-31.217
		c67.36,0,122.162,53.93,122.162,120.218C315.907,220.254,305.867,237.41,283.353,246.784z"/>
	<circle cx="105.995" cy="202.676" r="13.499"/>
</g>
</svg>
`;
