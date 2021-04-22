import {
  addIcon,
  App,
  FileSystemAdapter,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  WorkspaceLeaf,
  ViewCreator,
} from 'obsidian';
import LabPanel from './views/panel';
import ChatView from './views/chatView';
import { icons, sweepIcon } from './icons';
const COMMAND_PREFIX = 'obsidian_lab_';

const DEFAULT_ICON = 'gear';

const DEFAULT_SETTINGS: Settings = {
  server_url: 'http://localhost:5000',
  debug: 'verbose',
  commands: {
    hello_world: {
      active: true,
      label: 'Hello world',
      type: 'insert-text',
    },

    to_upper_case: {
      active: false,
      label: 'Convert to upper case',
      type: 'replace-text',
    },

    chat: {
      active: false,
      label: 'Simple chat service',
      type: 'command-line',
    },

    random_similarity: {
      active: true,
      label: 'Random score similarity',
      type: 'panel',
      icon: DEFAULT_ICON,
      invokeOnOpen: true,
    },
  },
};

async function getServerStatus(serverUrl: string) {
  const result: ServerStatus = await fetch(serverUrl, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    },
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      const status: ServerStatus = {
        status: 'available',
        availableCommandUrls: data.scripts ? data.scripts : [],
      };
      return status;
    })
    .catch(function (error) {
      return {
        status: 'unavailable',
        availableCommandUrls: [],
        error: error,
      };
    });
  return result;
}

function commandIdFromName(command_name: string): string {
  return `${COMMAND_PREFIX}${command_name}`;
}

function getNameFromUrl(currentUrl: any) {
  return currentUrl.substring(currentUrl.lastIndexOf('/') + 1);
}

function loadCommands(
  commandUrls: string[],
  commandSettings: Record<string, Command>,
) {
  let result: Map<string, Command> = new Map();
  for (const commandURL of commandUrls) {
    let commandName = getNameFromUrl(commandURL);

    // If the settings for this command are already stored
    if (commandSettings[commandName]) {
      result.set(commandName, commandSettings[commandName]);
    } else {
      // Otherwise use the default one
      result.set(commandName, {
        label: commandName,
        type: 'insert-text',
        active: false,
        invokeOnOpen: false,
        icon: 'lab',
      });
    }
  }
  return result;
}

export default class PythonLabPlugin extends Plugin {
  public settings: Settings;

  public commandUrlFromName(command_name: string): string {
    return `${this.settings.server_url}/${command_name}`;
  }

  public getVaultPath(): string {
    if (!(this.app.vault.adapter instanceof FileSystemAdapter)) {
      throw new Error('app.vault is not a FileSystemAdapter instance');
    }
    return this.app.vault.adapter.getBasePath();
  }

  public async loadCommandPanes(): Promise<void> {
    await this.loadSettings();
    const serverStatus = await getServerStatus(this.settings.server_url);

    // Detach panes
    // Disclaimer: I still cannot figure out how to detach or unregister all leaves produced by this plugin
    // The intention here is to clean all leaves of created by the lab. @TODO detach properly in the future
    this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
      if (leaf.getViewState().type.startsWith(COMMAND_PREFIX)) {
        if (this.settings.debug == 'verbose') {
          console.log('detaching', leaf.getViewState().type);
        }
        leaf.detach();
      }
    });

    if (serverStatus.status == 'available') {
      const availableCommands: Map<string, Command> = loadCommands(
        serverStatus.availableCommandUrls,
        this.settings.commands,
      );
      for (let [name, command] of availableCommands) {
        if (command.active) {
          this.initCommand(name, command);
        }
      }
      const init: () => any = this.initViews(availableCommands);
      if (this.app.workspace.layoutReady) {
        init();
      } else {
        this.app.workspace.onLayoutReady(init);
      }
    } else {
      new Notice('Lab disconected, Start server');
      if (this.settings.debug == 'verbose') {
        console.log(serverStatus);
      }
    }
  }

  public async onload(): Promise<void> {
    console.log('loading python lab plugin');

    addIcon('sweep', sweepIcon);
    this.loadCommandPanes();
    this.addSettingTab(new PythonLabSettings(this.app, this));
  }

  private initCommand(name: string, command: Command) {
    let commandId: string = commandIdFromName(name);
    let commandUrl = this.commandUrlFromName(name);

    if (this.settings.debug == 'verbose') {
      console.log(`init [${name}] as [${command.type}]`);
    }

    if (command.type == 'command-line') {
      let viewCreator: ViewCreator = (leaf: WorkspaceLeaf) => {
        let commandLine = new ChatView(leaf, commandId, command);

        const commandLineCallback = async () => {
          let parameters = this.getDefaultPostParameters();
          parameters.data = {
            input: commandLine.getLastInput(),
          };
          return await this.doPost(commandUrl, parameters);
        };

        commandLine.registerOnSendMessage(commandLineCallback);

        this.addCommand({
          id: commandId,
          name: command.label,
          callback: () => commandLineCallback(),
          hotkeys: [],
        });

        return commandLine;
      };

      // I would love to know if this view is already registered, but I don't know how.
      this.registerView(commandId, viewCreator);
    } else if (command.type == 'panel') {
      let viewCreator: ViewCreator = (leaf: WorkspaceLeaf) => {
        let panel = new LabPanel(leaf, commandId, command);

        const panelCallback = async () => {
          let parameters = this.getDefaultPostParameters();
          const data = await this.doPost(commandUrl, parameters);
          data.label = command.label;

          // Update the state of the view panel
          panel.setData(data);
          panel.draw();
        };

        this.addCommand({
          id: commandId,
          name: command.label,
          callback: () => panelCallback(),
          hotkeys: [],
        });

        if (command.invokeOnOpen) {
          panel.registerOnFileOpen(panelCallback);
        }

        return panel;
      };
      // I would love to know if this view is already registered, but I don't know how.
      this.registerView(commandId, viewCreator);
    } else if (
      command.type == 'insert-text' ||
      command.type == 'replace-text'
    ) {
      const callbackWithoutView = async () => {
        let parameters = this.getDefaultPostParameters();
        const data = await this.doPost(commandUrl, parameters);
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (
          command.type == 'replace-text' &&
          activeView instanceof MarkdownView
        ) {
          // Replaces the current selection
          // const editor = activeView.sourceMode.cmEditor;
          if (data.contents) {
            const editor = activeView.editor;
            editor.replaceSelection(data.contents);
          }
        } else if (
          command.type == 'insert-text' &&
          activeView instanceof MarkdownView
        ) {
          // Insert content in the cursor position
          let doc = activeView.editor.getDoc();
          let cursor = doc.getCursor();
          if (data.contents) {
            doc.replaceRange(data.contents, cursor);
          }
        } else {
          console.error(`Cannot process: `, command);
        }
      };
      this.addCommand({
        id: commandId,
        name: command.label,
        callback: () => callbackWithoutView(),
        hotkeys: [],
      });
    }
  }

  private async doPost(command_url: string, parameters: any) {
    let requestBody = JSON.stringify(parameters);

    if (this.settings.debug == 'verbose') {
      console.info('Post:', command_url);
      console.info('requestBody', requestBody);
    }

    const response = await fetch(command_url, {
      method: 'POST',
      body: requestBody,
      headers: {
        'content-type': 'application/json',
      },
    });
    const data = await response.json();
    if (this.settings.debug == 'verbose') {
      console.info('response data', data);
    }
    if (data.errors) {
      console.error(data);
      new Notification(data.message);
    }
    return data;
  }

  private getDefaultPostParameters() {
    let parameters: Input = {
      vaultPath: this.getVaultPath(),
    };
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      const editor = activeView.editor;
      let selectedText = editor.getSelection();
      if (selectedText) {
        parameters.text = selectedText;
      }
      if (activeView.file && activeView.file.path) {
        parameters.notePath = activeView.file.path;
      }
    }
    return parameters;
  }

  public async loadSettings(): Promise<void> {
    this.settings = Object.assign(DEFAULT_SETTINGS, await super.loadData());
  }

  public async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Init all commands
   */
  private initViews = (commands: Map<string, Command>) => {
    return () => {
      // Attach only commands that have a view.
      for (let [name, command] of commands) {
        let hasView = command.type == 'panel' || command.type == 'command-line';
        if (hasView && command.active) {
          let commandId: string = commandIdFromName(name);
          this.showPanel(commandId);
        }
      }
    };
  };

  private async showPanel(commandId: string) {
    const existing = this.app.workspace.getLeavesOfType(commandId);
    if (existing.length) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    await this.app.workspace.getRightLeaf(false).setViewState({
      type: commandId,
      active: true,
    });
  }
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
    containerEl.createEl('h2', { text: 'Obsidian lab settings' });
    containerEl.createEl('h4', { text: 'Restart after making changes' });

    const settings = this.plugin.settings;

    const serverURLSetting = new Setting(this.containerEl)
      .setName('Server url')
      .addText((text) => {
        text.setValue(settings.server_url);
        text.onChange(async (value) => {
          this.plugin.settings.server_url = value as string;
          // await this.plugin.saveSettings();
          // How to maintain focus on this?
          // this.display();
        });
      })

      .addExtraButton((b) => {
        b.setIcon('reset')
          .setTooltip('set and refresh')
          .onClick(async () => {
            await this.plugin.saveSettings();
            await this.plugin.loadCommandPanes();
            this.display();
          });
      });

    const updateSetting = async (commandId: string, command: Command) => {

      this.plugin.settings.commands[commandId] = command;
      if (this.plugin.settings.debug == 'verbose') {
        console.log('save', command);
      }
      await this.plugin.saveSettings();
    };

    getServerStatus(settings.server_url).then((serverStatus) => {
      if (serverStatus.status == 'available') {
        const availableCommands = loadCommands(
          serverStatus.availableCommandUrls,
          settings.commands,
        );
        let n = 0;
        for (let [name, command] of availableCommands) {
          addCommandSetting(name, command);
          n++;
        }
        serverURLSetting.setName(`Server online [${n}]`);
      } else {
        serverURLSetting
          .setName('⚠ Cannot reach server')
          .setDesc('')
          .setClass('python-lab-error');
        console.log(serverStatus);
      }

      this.setFooter(containerEl, settings);
    });

    /**
     * Given a command, adds the configuration
     * @param name
     * @param command
     */
    const addCommandSetting = (name: string, command: Command) => {
      let commandEl = containerEl.createEl('div', {});
      let commandUrl = this.plugin.commandUrlFromName(name);
      let commandDesc = `${commandUrl}`;

      if (command.active) {
        new Setting(commandEl)
          .setName(`${name}`)
          .setDesc(commandDesc)

          // Type
          .addDropdown((dropdown) => {
            dropdown.addOption('insert-text', 'Insert text');
            dropdown.addOption('replace-text', 'Replace selected text');
            dropdown.addOption('panel', 'Panel: text or lists');
            dropdown.addOption('command-line', 'Chat');
            // dropdown.addOption('graph', 'a graph');
            dropdown.setValue(String(command.type)).onChange(async (value) => {
              command.type = value as
                | 'panel'
                | 'replace-text'
                | 'insert-text'
                | 'command-line';
              await updateSetting(name, command);
              this.display();
            });
          })

          // Active or not
          .addToggle((toggle) => {
            toggle.setValue(command.active);
            toggle.onChange(async (value) => {
              command.active = value as boolean;
              await updateSetting(name, command);
              this.display();
            });
          });

        const isWidget =
          command.type == 'panel' || command.type == 'command-line';

        new Setting(commandEl)
          .setDesc(isWidget ? 'Widget name' : 'Command name')
          // Name
          .addText((text) => {
            text.setValue(command.label);
            text.onChange(async (value) => {
              command.label = value as string;
              await updateSetting(name, command);
            });
          });

        if (isWidget) {
          new Setting(commandEl)
            .setDesc('Widget icon')
            // Icon
            .addDropdown((dropdown) => {
              icons.forEach((icon) => {
                dropdown.addOption(icon, icon);
              });
              dropdown
                .setValue(String(command.icon))
                .onChange(async (value) => {
                  command.icon = value;
                  await updateSetting(name, command);
                  this.display();
                });
            })
            .addExtraButton((b) => {
              b.setIcon(command.icon)
                .setTooltip('Icon shown in the widget tab')
                .onClick(async () => {});
            });
        }

        if (command.type == 'panel') {
          new Setting(commandEl)
            .setDesc('Additional triggers for panel')
            .addDropdown((dropdown) => {
              dropdown.addOption('false', 'no triggers');
              dropdown.addOption('true', 'trigers when opening a file');
              dropdown
                .setValue(String(command.invokeOnOpen))
                .onChange(async (value) => {
                  command.invokeOnOpen = value == 'true';
                  await updateSetting(name, command);
                  this.display();
                });
            });
        }
      } else {
        new Setting(commandEl)
          .setName(`${name}`)
          .setDesc(commandDesc)
          // Active or not
          .addToggle((toggle) => {
            toggle.setValue(command.active);
            toggle.onChange(async (value) => {
              command.active = value as boolean;
              await updateSetting(name, command);
              this.display();
            });
          });
      }
    };
  }

  private setFooter(containerEl: HTMLElement, settings: Settings) {
    new Setting(containerEl)
      .setName('Debug')
      .setDesc('')
      .addDropdown((dropdown) => {
        dropdown.addOption('off', 'off');
        dropdown.addOption('verbose', 'verbose');
        // dropdown.addOption('graph', 'a graph');
        dropdown.setValue(String(settings.debug)).onChange(async (value) => {
          this.plugin.settings.debug = value as 'off' | 'verbose';
          await this.plugin.saveSettings();
          this.display();
        });
      });

    containerEl.createEl('a', {
      text: 'You can find a simple server at github: obsidian-lab-py',
      href: 'https://github.com/cristianvasquez/obsidian-lab-py',
    });

    containerEl.createEl('p', {
      text: 'Pull requests are both welcome and appreciated. :)',
    });
  }
}
