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
import {ResultListView} from './panel';

const COMMAND_PREFIX = 'obsidian_lab_'

const DEFAULT_SETTINGS: Settings = {
    server_url: 'http://localhost:5000',
    debug: 'verbose',
    commands: {
        hello_world: {
            active: true,
            label: 'Hello world',
            type: 'insert-text',
            invokeOnOpen: false,
        },

        to_upper_case: {
            active: true,
            label: 'Convert to upper case',
            type: 'replace-text',
            invokeOnOpen: false,
        },

        random_similarity: {
            active: true,
            label: 'Random score similarity',
            type: 'panel',
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
                availableCommandUrls: data.scripts ? data.scripts : []
            }
            return status;
        })
        .catch(function (error) {
            return {
                status: 'unavailable',
                availableCommandUrls: [],
                error: error
            }
        });
    return result
}

function commandIdFromName(command_name: string): string {
    return `${COMMAND_PREFIX}${command_name}`;
}

function getNameFromUrl(currentUrl: any) {
    return currentUrl.substring(currentUrl.lastIndexOf('/') + 1);
}

function expandCommands(commandUrls: string[], commandSettings: Record<string, Command>) {
    let result: Map<string, Command> = new Map()
    for (const commandURL of commandUrls) {
        let commandName = getNameFromUrl(commandURL);
        if (commandSettings[commandName]) {
            // If command settings are already stored
            result.set(commandName, commandSettings[commandName])
        } else {
            // Otherwise use the default one
            result.set(commandName, {
                label: commandName,
                type: 'insert-text',
                active: false,
                invokeOnOpen: false,
            })
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
        const serverStatus = await getServerStatus(this.settings.server_url)

        // Detach panes
        // Disclaimer: I still cannot figure out how to detach or unregister all leaves produced by this plugin
        // The intention here is to clean all leaves of created by the lab
        this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
            if (leaf.getViewState().type.startsWith(COMMAND_PREFIX)) {
                if (this.settings.debug=='verbose'){
                    console.log('detaching',leaf.getViewState().type)
                }
                leaf.detach();
            }
        });

        if (serverStatus.status == 'available') {
            const availableCommands: Map<string, Command> = expandCommands(serverStatus.availableCommandUrls, this.settings.commands)
            for (let [name, command] of availableCommands) {

                if (command.active) {
                    this.initCommand(name, command)
                }
            }
            const init: () => any = this.initViews(availableCommands)
            if (this.app.workspace.layoutReady) {
                init();
            } else {
                this.app.workspace.onLayoutReady(init)
            }
        } else {
            new Notice('Lab: Cannot reach server')
            if (this.settings.debug == 'verbose') {
                console.log(serverStatus)
            }
        }
    }

    public async onload(): Promise<void> {
        console.log('loading python lab plugin');

        addIcon('sweep', sweepIcon);
        addIcon('lab', labIcon);

        this.loadCommandPanes();
        this.addSettingTab(new PythonLabSettings(this.app, this));
    }

    private initCommand(name: string, command: Command) {
        let commandId: string = commandIdFromName(name);
        let commandUrl = this.commandUrlFromName(name);
        if (this.settings.debug == 'verbose') {
            console.log(`init [${name}] as [${command.type}]`);
        }

        if (command.type=='panel') {
            let viewCreator: ViewCreator = (leaf: WorkspaceLeaf) => {
                let commandView = new ResultListView(
                    leaf,
                    commandId,
                    command.label,
                );
                const callbackWithView = async () => {
                    const data = await this.doPost(commandUrl)
                    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                    data.label = command.label;
                    PythonLabPlugin.applyUpdatePanel(commandView, data);
                }
                this.addCommand({
                    id: commandId,
                    name: command.label,
                    callback: () => callbackWithView(),
                    hotkeys: [],
                });

                if (command.invokeOnOpen) {
                    commandView.registerCallback(callbackWithView);
                }
                return commandView;
            };
            // I would love to know if this view is already registered, but I don't know how.
            this.registerView(commandId, viewCreator);
        } else if (command.type=='insert-text' || command.type=='replace-text'){
            const callbackWithoutView = () => {
                const data = this.doPost(commandUrl)
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (command.type == 'replace-text' && activeView instanceof MarkdownView) {
                    PythonLabPlugin.applyReplaceText(activeView, data);
                } else if (command.type == 'insert-text' && activeView instanceof MarkdownView) {
                    PythonLabPlugin.applyInsertText(activeView, data);
                } else {
                    console.error(`Cannot process: `, command);
                }
            }
            this.addCommand({
                id: commandId,
                name: command.label,
                callback: () => callbackWithoutView(),
                hotkeys: [],
            });
        }
    }

    private async doPost(command_url: string) {
            let parameters = this.getPostParameters();
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
            })
            const data = await response.json()
            if (this.settings.debug == 'verbose') {
                console.info('response data', data);
            }
            if (data.errors) {
                console.error(data);
                new Notification(data.message);
            }
            return data
    }

    private getPostParameters() {
        let parameters: Input = {
            vaultPath: this.getVaultPath(),
        };
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            const editor = activeView.editor
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

    private static applyUpdatePanel(commandView: CommandView, data: any) {
        // Update the state of the view panel
        commandView.setData(data);
        commandView.redraw();
    }

    private static applyInsertText(activeView: MarkdownView, data: any) {
        // Insert content in the cursor position
        let doc = activeView.editor.getDoc();
        let cursor = doc.getCursor();
        doc.replaceRange(data.contents, cursor);
    }

    private static applyReplaceText(activeView: MarkdownView, data: any) {
        // Replaces the current selection
        // const editor = activeView.sourceMode.cmEditor;
        const editor = activeView.editor
        editor.replaceSelection(data.contents);
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
            // Attach only commands that are panel based.
            for (let [name, command] of commands) {
                if ( command.type=='panel' && command.active) {
                    let commandId: string = commandIdFromName(name);
                    this.showPanel(commandId);
                }
            }
        };
    }

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
        const {containerEl} = this;

        containerEl.empty();
        containerEl.createEl('h2', {text: 'Obsidian lab settings'});
        containerEl.createEl('h4', {text: 'Restart after making changes'});

        const settings = this.plugin.settings;

        const serverURLSetting = new Setting(this.containerEl)
            .setName('Server url')
            .setDesc('')
            .addText((text) => {
                text.setValue(settings.server_url);
                text.onChange(async (value) => {
                    this.plugin.settings.server_url = value as string;
                    // await this.plugin.saveSettings();
                    // How to maintain focus on this?
                    // this.display();
                })
            }).addButton((button) =>
                button.setButtonText("set and refresh").onClick(async () => {
                    await this.plugin.saveSettings();
                    await this.plugin.loadCommandPanes()
                    this.display();
                })
            );


        const updateSetting = async (commandName: string, command: Command) => {
            this.plugin.settings.commands[commandName] = command;
            if (this.plugin.settings.debug == 'verbose') {
                console.log('save', command);
            }
            await this.plugin.saveSettings();
        };


        getServerStatus(settings.server_url).then((serverStatus) => {
            if (serverStatus.status == 'available') {
                const availableCommands = expandCommands(serverStatus.availableCommandUrls, settings.commands)
                let n = 0
                for (let [name, command] of availableCommands) {
                    addCommandSetting(name, command)
                    n++
                }
                serverURLSetting.setName(`Server online [${n}]`);
            } else {
                serverURLSetting
                    .setName('⚠ Cannot reach server')
                    .setDesc('')
                    .setClass('python-lab-error');
                console.log(serverStatus)
            }

            this.setFooter(containerEl, settings);

        })

        /**
         * Given a command, adds the configuration
         * @param name
         * @param command
         */
        const addCommandSetting = (name: string, command: Command) => {
            let commandEl = containerEl.createEl('div', {});
            let commandUrl = this.plugin.commandUrlFromName(name);

            const clz = command.active ? 'python-lab-activated' : 'python-lab-deactivated';
            new Setting(commandEl)
                .setName(`${name}`)
                .setDesc(`Activate ${commandUrl}`)
                .setClass(clz)
                .addToggle((toggle) => {
                    toggle.setValue(command.active);
                    toggle.onChange(async (value) => {
                        command.active = value as boolean;
                        await updateSetting(name, command);
                        this.display();
                    });
                });

            if (command.active) {
                new Setting(commandEl)
                    .setName('Setup')
                    .setDesc(``)
                    // Name
                    .addText((text) => {
                        text.setValue(command.label);
                        text.onChange(async (value) => {
                            command.label = value as string;
                            await updateSetting(name, command);
                        });
                    })
                    // Type
                    .addDropdown((dropdown) => {
                        dropdown.addOption('insert-text', 'insert text');
                        dropdown.addOption('replace-text', 'replace selected text');
                        dropdown.addOption('panel', 'items or text in a panel');
                        // dropdown.addOption('graph', 'a graph');
                        dropdown.setValue(String(command.type)).onChange(async (value) => {
                            command.type = value as
                                | 'panel'
                                | 'replace-text'
                                | 'insert-text';
                            await updateSetting(name, command);
                            this.display();
                        })
                    })

                new Setting(containerEl)
                    .setName('Additional triggers')
                    .setDesc('')
                    .addDropdown((dropdown) => {
                        dropdown.addOption('false', 'none');
                        dropdown.addOption('true', 'when opening a file');
                        dropdown.setValue(String(command.invokeOnOpen)).onChange(async (value) => {
                            command.invokeOnOpen = value == 'true'
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
            href: 'https://github.com/cristianvasquez/obsidian-lab-py'
        });

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
