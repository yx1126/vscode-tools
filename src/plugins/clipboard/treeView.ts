import { Commands } from "@/maps";
import { TreeItem, TreeItemCollapsibleState, workspace, Uri } from "vscode";
import type { Selection } from "vscode";
import { TreeProvider } from "@/utils/provider";
import type { Local } from "@/utils/storage";
import { toArray } from "@/utils/array";

export interface ClipboardItem {
    label: string;
    content: string;
    filePath: string;
    selection: Selection;
}

export class ClipboardProvider extends TreeProvider<ClipboardTreeItem, ClipboardItem> {

    stroage: Local<ClipboardItem[]>;

    constructor(stroage: Local<ClipboardItem[]>) {
        super();
        this.stroage = stroage;
        this.dataList = this.stroage.getItem() || [];
    }

    getTreeItem(element: ClipboardTreeItem): TreeItem {
        return element;
    }

    getChildren(): Thenable<ClipboardTreeItem[]> {
        const data = this.dataList.map((item, i) => {
            return new ClipboardTreeItem(item, i, TreeItemCollapsibleState.None);
        });
        return Promise.resolve(data);
    }

    refresh(data?: ClipboardItem | ClipboardItem[]) {
        if(data) {
            this.dataList = toArray(data);
        }
        this.stroage.setItem(this.dataList);
        this._onDidChangeTreeData.fire();
        return this;
    }

    insert(data: ClipboardItem) {
        const isIn = this.dataList.find(item => item.content === data.content);
        if(data.content && !isIn) {
            this.append(data);
        }
    }

    remove(data: ClipboardItem) {
        this.delete(data, "content");
    }

    update(data: ClipboardItem) {
        const index = this.dataList.findIndex(item => item.content === data.content);
        const isHasLabel = this.dataList.findIndex(item => item.label === data.label);
        if(index !== -1 && isHasLabel === -1) {
            this.dataList[index] = data;
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
            command: Commands.helper_copytext,
            arguments: [data.content],
        };
    }
}
