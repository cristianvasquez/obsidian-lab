import {
  ItemView,
  Menu,
  WorkspaceLeaf,
  FileSystemAdapter,
  Notice,
  TFile,
} from 'obsidian';
var path = require('path');

class LabPanel extends ItemView {
  private commandId: string;
  private label: string;
  private state: PanelState;

  constructor(leaf: WorkspaceLeaf, commandId: string, label: string) {
    super(leaf);
    this.commandId = commandId;

    this.label = label;

    this.setData({
      label: '',
      contents: [],
    });

    this.redraw();
  }

  public setData(state: PanelState) {
    this.state = state;
  }

  public getViewType(): string {
    return this.commandId;
  }

  public getDisplayText(): string {
    return this.label;
  }

  public getIcon(): string {
    return 'lab';
  }

  // Used to handle 'onfocus'
  registerCallback(callback: () => Promise<void>) {
    const handleOpenFile = async (openedFile: TFile): Promise<void> => {
      if (!openedFile) {
        return;
      }
      callback();
    };

    this.registerEvent(this.app.workspace.on('file-open', handleOpenFile));
  }

  /**
   * The menu that appears with right click on the icon
   */
  public onHeaderMenu(menu: Menu): void {
    menu
      .addItem((item) => {
        item
          .setTitle('Clear list')
          .setIcon('sweep')
          .onClick(async () => {
            this.setData({
              label: '',
              contents: [],
            });
            this.redraw();
          });
      })
      .addItem((item) => {
        item
          .setTitle('Close')
          .setIcon('cross')
          .onClick(() => {
            this.app.workspace.detachLeavesOfType(this.commandId);
          });
      });
  }

  onfocusHandler: (openedFile: TFile) => Promise<void>;

  public load(): void {
    super.load();
  }

  /**
   * Updates the panel
   */

  public readonly redraw = (): void => {
    const openFile = this.app.workspace.getActiveFile();

    const rootEl = createDiv({ cls: 'nav-folder mod-root' });
    // Label of the panel
    if (this.state.label) {
      const context = rootEl.createDiv({
        title: 'title',
        cls: 'nav-file python-lab-title',
        text: this.state.label,
      });
    }

    // Function open on click
    let clickElement = (file: Item, shouldSplit = false): void => {
      let filePath = file.path;

      // If it applies, remove the vault path
      if (this.app.vault.adapter instanceof FileSystemAdapter) {
        const vaultPath = this.app.vault.adapter.getBasePath();
        if (filePath.startsWith(vaultPath)) {
          filePath = path.relative(vaultPath, filePath);
        }
      }

      const targetFile = this.app.vault
        .getFiles()
        .find((f) => f.path === filePath);

      if (targetFile) {
        let leaf = this.app.workspace.getMostRecentLeaf();
        if (shouldSplit) {
          leaf = this.app.workspace.createLeafBySplit(leaf);
        }
        leaf.openFile(targetFile);
      } else {
        new Notice(`'${file.path}' not found`);

        if (Array.isArray(this.state.contents)) {
            this.state.contents = this.state.contents.filter(
              (fp) => fp.path !== file.path,
            );
        }

        this.redraw();
      }
    };

    if (this.state){

      // Draw a list, when is a list
        if (Array.isArray(this.state.contents)) {

          this.state.contents.forEach((currentFile) => {
            const childrenEl = rootEl.createDiv({ cls: 'nav-folder-children' });

            // The info that will appear on hover
            let jsonInfo = JSON.stringify(currentFile, null, 4);

            const navFile = childrenEl.createDiv({
              title: jsonInfo,
              cls: 'nav-file',
            });
            const navFileTitle = navFile.createDiv({ cls: 'nav-file-title' });

            if (openFile && currentFile.path === openFile.path) {
              navFileTitle.addClass('is-active');
            }

            navFileTitle.createDiv({
              cls: 'nav-file-title-content',
              text: currentFile.name,
            });

            navFile.onClickEvent((event) =>
              clickElement(currentFile, event.ctrlKey || event.metaKey),
            );
          });
        } else if (String.isString(this.state.contents)) {
          // Draw the contents as a list
          const context = rootEl.createDiv({
            title: 'contents',
            cls: 'python-lab-text',
            text: this.state.contents,
          });
        } else {
          console.error('cannot draw',this.state)
        }

    }

    const contentEl = this.containerEl.children[1];
    contentEl.empty();
    contentEl.appendChild(rootEl);
  };
}

export { LabPanel as ResultListView };
