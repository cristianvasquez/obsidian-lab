import {
  ItemView,
  Menu,
  TFile,
  WorkspaceLeaf,
  FileSystemAdapter,
  Notice,
  MarkdownView,
} from 'obsidian';
var path = require('path');

interface ResultListState {
  parameter?: Parameter;
  items: Item[];
}

class ResultListView extends ItemView {
  private viewTypeId: string;
  private experiment: Experiment;
  private data: ResultListState;

  constructor(leaf: WorkspaceLeaf, experiment: Experiment, viewTypeId: string) {
    super(leaf);

    this.experiment = experiment;

    this.setData({
      items: [],
    });

    this.viewTypeId = viewTypeId;
    this.redraw();
  }

  public setData(data: ResultListState) {
    this.data = data;
  }

  public getViewType(): string {
    return this.viewTypeId;
  }

  public getDisplayText(): string {
    return this.experiment.name;
  }

  public getIcon(): string {
    return 'lab';
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
            this.app.workspace.detachLeavesOfType(this.viewTypeId);
          });
      });
  }

  public load(): void {
    super.load();

    if (this.experiment.trigger == 'invoke-on-focus') {
      const handleOpenFile = async (openedFile: TFile): Promise<void> => {
        if (!openedFile) {
          return;
        }
        this.data.parameter = {
          label: openedFile.name,
          path: openedFile.path,
        };

        this.data.items = await this.experiment.call(
          this.data.parameter,
        );

        this.redraw();
      };

      this.registerEvent(this.app.workspace.on('file-open', handleOpenFile));
    }
  }

  /**
   * Updates the panel
   */

  public readonly redraw = (): void => {
    const openFile = this.app.workspace.getActiveFile();
    const rootEl = createDiv({ cls: 'nav-folder mod-root' });

    if (this.data.parameter) {
      const context = rootEl.createDiv({
        title: 'context',
        cls: 'nav-file python-lab-context',
        text: this.data.parameter.label,
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
        this.data.items = this.data.items.filter((fp) => fp.path !== file.path);
        this.redraw();
      }
    };

    const childrenEl = rootEl.createDiv({ cls: 'nav-folder-children' });

    this.data.items.forEach((currentFile) => {
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

    const contentEl = this.containerEl.children[1];
    contentEl.empty();
    contentEl.appendChild(rootEl);
  };
}

export { ResultListView };
