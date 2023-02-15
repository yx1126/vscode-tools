import * as vscode from "vscode";
import { ClipboardItem } from "../types";

export class ClipboardProvider implements vscode.TreeDataProvider<Dependency> {

    list: ClipboardItem[] = [];

    private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | null | void> = new vscode.EventEmitter<Dependency | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private data: ClipboardItem[]) {
        this.list = data;
    }

    getTreeItem(element: Dependency): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<Dependency[]> {
        const data = this.list.map((item, i) => {
            return new Dependency(item, i, vscode.TreeItemCollapsibleState.None);
        });
        return Promise.resolve(data);
    }

    refresh(data?: ClipboardItem[]): void {
        if(data) {
            this.list = data;
        }
        this._onDidChangeTreeData.fire();
    }

    public static init(data: ClipboardItem[]) {
        const clipboard = new ClipboardProvider(data);
        vscode.window.registerTreeDataProvider("shear-plate.clipboard", clipboard);
        return clipboard;
    }
}

class Dependency extends vscode.TreeItem {

    content: string;
    filePath: string;
    line: number;

    constructor(
        public readonly data: ClipboardItem,
        public readonly index: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(data.label, collapsibleState);
        this.label = `${index + 1}.  ${data.label.replace(/\s/g, "")}`;
        this.tooltip = data.content;
        this.content = data.content;
        this.filePath = data.filePath;
        this.line = data.line;
    }
}
