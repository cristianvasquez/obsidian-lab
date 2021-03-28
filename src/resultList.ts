import {
  ItemView,
  Menu,
  Notice,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';

interface ResultListState {
  parameter?: Parameter;
  response: Item[];
}

class ResultListView extends ItemView {
  private viewTypeId: string;
  private experiment: Experiment;
  private data: ResultListState;

  constructor(leaf: WorkspaceLeaf, experiment: Experiment, viewTypeId: string) {
    super(leaf);

    this.experiment = experiment;

    this.data = {
      response: [],
    };

    this.viewTypeId = viewTypeId;
    this.redraw(this.data);
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
            this.data.response = [];
            this.redraw(this.data);
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

    const handleOpenFile = async (openedFile: TFile): Promise<void> => {

      if (this.experiment.implementation){
          console.log('With implementation')
      }
      if (!openedFile) {
        return;
      }

      this.data.response.unshift({
        basename: openedFile.basename,
        path: openedFile.path,
      });

      this.data.parameter = {
        label: openedFile.path,
      };

      this.redraw(this.data);
    };

    this.registerEvent(this.app.workspace.on('file-open', handleOpenFile));
  }

  /**
   * Updates the panel
   */

  public readonly redraw = (data: ResultListState): void => {
    const openFile = this.app.workspace.getActiveFile();
    const rootEl = createDiv({ cls: 'nav-folder mod-root' });

    if (data.parameter) {
      const context = rootEl.createDiv({
        title: 'context',
        cls: 'nav-file python-lab-context',
        text: data.parameter.label,
      });
    }

    let clickElement = (file: Item, shouldSplit = false): void => {
      const targetFile = this.app.vault
        .getFiles()
        .find((f) => f.path === file.path);

      if (targetFile) {
        let leaf = this.app.workspace.getMostRecentLeaf();
        if (shouldSplit) {
          leaf = this.app.workspace.createLeafBySplit(leaf);
        }
        leaf.openFile(targetFile);
      } else {
        new Notice(`'${file.path}' not found`);
        this.data.response = this.data.response.filter(
          (fp) => fp.path !== file.path,
        );
        this.redraw(this.data);
      }
    };

    const childrenEl = rootEl.createDiv({ cls: 'nav-folder-children' });

    data.response.forEach((currentFile) => {
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
        text: currentFile.basename,
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
