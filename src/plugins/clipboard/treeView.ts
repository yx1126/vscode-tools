import { Commands } from "@/maps";
import { EventEmitter, TreeItem, TreeItemCollapsibleState, workspace, Uri } from "vscode";
import type { TreeDataProvider, Event, Selection } from "vscode";
import type GlobStorage from "@/utils/globStorage";

export interface ClipboardItem {
    label: string;
    content: string;
    filePath: string;
    selection: Selection;
}

export class ClipboardProvider implements TreeDataProvider<ClipboardTreeItem> {

    list: ClipboardItem[] = [];
    stroage: GlobStorage<ClipboardItem[]>;


    private _onDidChangeTreeData: EventEmitter<ClipboardTreeItem | undefined | null | void> = new EventEmitter<ClipboardTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<ClipboardTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(stroage: GlobStorage<ClipboardItem[]>) {
        this.stroage = stroage;
        this.list = this.stroage.getItem() || [];
    }

    getTreeItem(element: ClipboardTreeItem): TreeItem {
        return element;
    }

    getChildren(): Thenable<ClipboardTreeItem[]> {
        const data = this.list.map((item, i) => {
            return new ClipboardTreeItem(item, i, TreeItemCollapsibleState.None);
        });
        return Promise.resolve(data);
    }

    refresh(data?: ClipboardItem[]): void {
        if(data) {
            this.list = data;
        }
        this.stroage.setItem(this.list);
        this._onDidChangeTreeData.fire();
    }

    insert(data: ClipboardItem) {
        const isIn = this.list.find(item => item.content === data.content);
        if(data.content && !isIn) {
            this.list = [...this.list, data];
            this.refresh();
        }
    }

    clear() {
        this.list = [];
        this.refresh();
    }

    remove(data: ClipboardItem) {
        const index = this.list.findIndex(item => item.content === data.content);
        if(index !== -1) {
            this.list.splice(index, 1);
            this.refresh();
        }
    }

    update(data: ClipboardItem) {
        const index = this.list.findIndex(item => item.content === data.content);
        const isHasLabel = this.list.findIndex(item => item.label === data.label);
        if(index !== -1 && isHasLabel === -1) {
            this.list[index] = data;
            this.refresh();
        }
    }
}

class ClipboardTreeItem extends TreeItem {

    constructor(
        public readonly data: ClipboardItem,
        public readonly index: number,
        public readonly collapsibleState: TreeItemCollapsibleState,
    ) {
        super(data.label, collapsibleState);
        this.data = data;
        this.label = `${index + 1}.  ${data.label}`;
        this.tooltip = data.content;
        this.contextValue = workspace.getWorkspaceFolder(Uri.file(data.filePath)) ? "goto_file" : "";
        this.command = {
            title: this.label,
            command: Commands.clipboard_copytext,
            arguments: [{ data }],
        };
    }
}
