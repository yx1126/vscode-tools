"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipboardProvider = void 0;
const vscode = require("vscode");
// import * as fs from "fs";
// import * as path from "path";
class ClipboardProvider {
    constructor(data) {
        this.data = data;
        this.list = [];
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.list = data;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        const data = this.list.map((item, i) => {
            return new Dependency(item, i, vscode.TreeItemCollapsibleState.None);
        });
        return Promise.resolve(data);
    }
    refresh(data) {
        if (data) {
            this.list = data;
        }
        this._onDidChangeTreeData.fire();
    }
    static init(data) {
        const clipboard = new ClipboardProvider(data);
        vscode.window.registerTreeDataProvider("clipboard", clipboard);
        return clipboard;
    }
}
exports.ClipboardProvider = ClipboardProvider;
class Dependency extends vscode.TreeItem {
    constructor(label, index, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.index = index;
        this.collapsibleState = collapsibleState;
        this.label = `${index + 1}.  ${label.replace(/\s/g, "")}`;
        this.text = label;
        this.tooltip = label;
    }
}
//# sourceMappingURL=clipboard.js.map