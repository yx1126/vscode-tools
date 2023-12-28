import type { TreeDataProvider, TreeItem, Event, ProviderResult } from "vscode";
import { EventEmitter } from "vscode";
import { toArray } from "./array";


export class TreeProvider<T extends TreeItem, D extends object> implements TreeDataProvider<T> {

    dataList: D[] = [];

    _onDidChangeTreeData: EventEmitter<T | undefined | null | void> = new EventEmitter<T | undefined | null | void>();
    readonly onDidChangeTreeData: Event<T | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {}

    getTreeItem(element: T): TreeItem | Thenable<TreeItem> {
        return element;
    }

    getChildren(): ProviderResult<T[]> {
        return [];
    }

    refresh(data?: D | D[]) {
        if(data) {
            this.dataList = toArray(data);
        }
        this._onDidChangeTreeData.fire();
        return this;
    }

    clear() {
        this.dataList = [];
        this.refresh();
        return this;
    }

    append(data: D | D[]) {
        this.dataList.push(...toArray(data));
        this.refresh();
        return this;
    }

    deleteIndex(index: number) {
        if(index !== -1) {
            this.dataList.splice(index, 1);
            this.refresh();
        }
        return this;
    }

    delete(data: D, key?: keyof D) {
        const index = this.dataList.findIndex((v: any) => {
            if(key) return v[key] === (data as any)[key];
            return v === data;
        });
        return this.deleteIndex(index);
    }
}
