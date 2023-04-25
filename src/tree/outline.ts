import { EventEmitter, TreeItem, window, TreeItemCollapsibleState, TextDocument, SymbolKind, ThemeIcon, MarkdownString } from "vscode";
import { Commands } from "@/core/commands";
import type { Event, TreeDataProvider, Range } from "vscode";
import Nodes, { type FileNode } from "@/utils/node";


export class OutlineProvider implements TreeDataProvider<OutlineTreeItem> {

    list: FileNode[] = [];

    constructor() {}

    private _onDidChangeTreeData: EventEmitter<OutlineTreeItem | undefined | null | void> = new EventEmitter<OutlineTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<OutlineTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    getTreeItem(element: OutlineTreeItem): TreeItem {
        return element;
    }

    getChildren(element?: OutlineTreeItem): Thenable<OutlineTreeItem[]> {
        const list = element ? element.children : this.list;
        const data = list.map((item) => {
            return new OutlineTreeItem(item, item.collapsibleState, Nodes.document!);
        });
        return Promise.resolve(data);
    }

    refresh(data?: FileNode[]): void {
        this.list = data || [];
        this._onDidChangeTreeData.fire();
    }

    clear() {
        this.list = [];
        this.refresh();
    }

    static init() {
        const outline = new OutlineProvider();
        window.createTreeView("tools.outline", {
            treeDataProvider: outline,
            showCollapseAll: true,
        });
        return outline;
    }
}


export class OutlineTreeItem extends TreeItem {

    children: FileNode[];
    document: TextDocument;

    constructor(
        public readonly data: FileNode,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly doc: TextDocument,
    ) {
        super(data.name, collapsibleState);
        this.document = doc!;
        this.children = data.children as FileNode[];
        this.data = data;

        this.label = this.getLabel();
        this.tooltip = this.markDown();
        this.iconPath = this.getIcon();
        this.command = {
            title: data.name,
            command: Commands.helper_scrollTo,
            arguments: [data.range.start.line],
        };
    }

    getIcon() {
        return new ThemeIcon(`symbol-${SymbolKind[this.data.kind].toLowerCase()}`);
    }

    getLabel() {
        const { kind, name, lang } = this.data;
        return name + (kind === SymbolKind.Module && lang ? `  ${lang}` : "");
    }

    getOverRow(range: Range) {
        const textList = [range.start.line, range.end.line].map(v => this.document.lineAt(v).text.trimStart().trimEnd());
        textList.splice(1, 0, "...");
        return textList.join(" ");
    }

    markDown() {
        const { range, language } = this.data;
        // get current line text
        const value = range.end.line - range.start.line >= 2 ? this.getOverRow(range) : this.document.getText(range);
        return new MarkdownString(`\`\`\`${language}\n${value}\n\`\`\``) ;
    }
}
