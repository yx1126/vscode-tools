import { TreeProvider } from "@/utils/provider";
import { TreeItem, SymbolKind, ThemeIcon, type TreeItemCollapsibleState } from "vscode";
import { Commands } from "@/maps";
import type { FileNode } from "./node-context";


export class OutlineProvider extends TreeProvider<OutlineTreeItem, FileNode> {

    getTreeItem(element: OutlineTreeItem): TreeItem {
        return element;
    }

    getChildren(element?: OutlineTreeItem): Thenable<OutlineTreeItem[]> {
        const list = element ? element.children : this.dataList;
        const data = list.map((item) => {
            return new OutlineTreeItem(item, item.collapsibleState);
        });
        return Promise.resolve(data);
    }

    refresh(data?: FileNode[]) {
        this.dataList = data || [];
        this._onDidChangeTreeData.fire();
        return this;
    }
}


export class OutlineTreeItem extends TreeItem {

    children: FileNode[];

    constructor(
        public readonly data: FileNode,
        public readonly collapsibleState: TreeItemCollapsibleState,
    ) {
        super(data.name, collapsibleState);
        this.children = data.children as FileNode[];
        this.data = data;

        this.label = this.labelValue();
        this.collapsibleState = collapsibleState;
        this.tooltip = data.name;
        this.iconPath = this.icon();
        this.command = {
            title: data.name,
            command: Commands.helper_scrollTo,
            arguments: [data.range],
        };
    }

    icon() {
        return new ThemeIcon(`symbol-${SymbolKind[this.data.kind].toLowerCase()}`);
    }

    labelValue() {
        const { kind, name, lang } = this.data;
        return name + (kind === SymbolKind.Module && lang ? `  ${lang}` : "");
    }
}
