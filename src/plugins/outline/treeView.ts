import { EventEmitter, TreeItem, TreeItemCollapsibleState, TextDocument, SymbolKind, ThemeIcon } from "vscode";
import { Commands } from "@/core/commands";
import type { Event, TreeDataProvider } from "vscode";
import { type FileNode } from "@/utils/node";


export class OutlineProvider implements TreeDataProvider<OutlineTreeItem> {

    list: FileNode[] = [];
    document?: TextDocument;

    constructor(document: TextDocument) {
        this.document = document;
    }

    private _onDidChangeTreeData: EventEmitter<OutlineTreeItem | undefined | null | void> = new EventEmitter<OutlineTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<OutlineTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    getTreeItem(element: OutlineTreeItem): TreeItem {
        return element;
    }

    getChildren(element?: OutlineTreeItem): Thenable<OutlineTreeItem[]> {
        const list = element ? element.children : this.list;
        const data = list.map((item) => {
            return new OutlineTreeItem(item, item.collapsibleState, this.document);
        });
        return Promise.resolve(data);
    }

    refresh(data?: FileNode[], document?: TextDocument): void {
        this.list = data || [];
        this.document = document;
        this._onDidChangeTreeData.fire();
    }

    clear() {
        this.list = [];
        this.refresh();
    }
}


export class OutlineTreeItem extends TreeItem {

    children: FileNode[];

    constructor(
        public readonly data: FileNode,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly doc?: TextDocument,
    ) {
        super(data.name, collapsibleState);
        this.children = data.children as FileNode[];
        this.data = data;

        this.label = this.labelValue();
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
