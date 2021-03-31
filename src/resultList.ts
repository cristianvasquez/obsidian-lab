import {
  ItemView,
  Menu,
  WorkspaceLeaf,
  FileSystemAdapter,
  Notice,
  TFile,
} from 'obsidian';
var path = require('path');

class ResultListView extends ItemView {
  private commandId: string;
  private label: string;
  private state: ResultListState;

  constructor(leaf: WorkspaceLeaf, commandId: string, label: string) {
    super(leaf);
    this.commandId = commandId;
  
    this.label = label;

    this.setData({
      label:'',
      items:[]
    })

    this.redraw();
  }

  public setData(state: ResultListState) {
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
              items: [],
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

    if (this.state.label) {
      const context = rootEl.createDiv({
        title: 'context',
        cls: 'nav-file python-lab-context',
        text: this.state.label,
      });
    }

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
        this.state.items = this.state.items.filter(
          (fp) => fp.path !== file.path,
        );
        this.redraw();
      }
    };

    const childrenEl = rootEl.createDiv({ cls: 'nav-folder-children' });

    if (this.state && this.state.items){
      this.state.items.forEach((currentFile) => {
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
    }


    const contentEl = this.containerEl.children[1];
    contentEl.empty();
    contentEl.appendChild(rootEl);
  };
}

export { ResultListView };
