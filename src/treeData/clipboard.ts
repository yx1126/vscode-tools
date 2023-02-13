import * as vscode from "vscode";
// import * as fs from "fs";
// import * as path from "path";

export class ClipboardProvider implements vscode.TreeDataProvider<Dependency> {

    list: string[] = [];

    private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | null | void> = new vscode.EventEmitter<Dependency | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private data: string[]) {
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

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    public static init(data: string[]) {
        const clipboard = new ClipboardProvider(data);
        vscode.window.registerTreeDataProvider("clipboard", clipboard);
        return clipboard;
    }
}

class Dependency extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly index: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.label = `${index + 1}.  ${label}`;
        this.tooltip = label;
    }
}
