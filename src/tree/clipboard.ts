import {  window, EventEmitter, TreeItem, TreeItemCollapsibleState, type TreeDataProvider, type Event } from "vscode";
import { ClipboardItem } from "../types";
import type GlobStorage from "../utils/globStorage";

export class ClipboardProvider implements TreeDataProvider<Dependency> {

    list: ClipboardItem[] = [];
    stroage: GlobStorage<ClipboardItem[]>;


    private _onDidChangeTreeData: EventEmitter<Dependency | undefined | null | void> = new EventEmitter<Dependency | undefined | null | void>();
    readonly onDidChangeTreeData: Event<Dependency | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(stroage: GlobStorage<ClipboardItem[]>) {
        this.stroage = stroage;
        this.list = this.stroage.getItem() || [];
    }

    getTreeItem(element: Dependency): TreeItem {
        return element;
    }

    getChildren(): Thenable<Dependency[]> {
        const data = this.list.map((item, i) => {
            return new Dependency(item, i, TreeItemCollapsibleState.None);
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

    public static init(storage: GlobStorage<ClipboardItem[]>) {
        const clipboard = new ClipboardProvider(storage);
        window.registerTreeDataProvider("shear-plate.clipboard", clipboard);
        return clipboard;
    }
}

class Dependency extends TreeItem {

    constructor(
        public readonly data: ClipboardItem,
        public readonly index: number,
        public readonly collapsibleState: TreeItemCollapsibleState
    ) {
        super(data.label, collapsibleState);
        this.data = data;
        this.label = `${index + 1}.  ${data.label}`;
        this.tooltip = data.content;
    }
}
