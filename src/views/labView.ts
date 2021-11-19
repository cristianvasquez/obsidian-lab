import {
    ItemView,
    WorkspaceLeaf,
} from 'obsidian';


export default class LabView extends ItemView {
    protected command: Command;
    protected commandId: string;

    constructor(leaf: WorkspaceLeaf, commandId: string, command: Command) {
        super(leaf);
        this.command = command;
        this.commandId = commandId;
    }

    public getViewType(): string {
        return this.commandId;
    }

    public getDisplayText(): string {
        return this.command.label == null ? this.commandId : this.command.label;
    }

    public getIcon(): string {
        return this.command.icon == null ? 'lab' : this.command.icon;
    }

}