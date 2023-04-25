import { EventEmitter, TreeItem, TreeItemCollapsibleState, TextDocument, SymbolKind, ThemeIcon, MarkdownString } from "vscode";
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
    document?: TextDocument;

    constructor(
        public readonly data: FileNode,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly doc?: TextDocument,
    ) {
        super(data.name, collapsibleState);
        this.document = doc;
        this.children = data.children as FileNode[];
        this.data = data;

        this.label = this.labelValue;
        this.tooltip = this.markDown;
        this.iconPath = this.icon;
        this.command = {
            title: data.name,
            command: Commands.helper_scrollTo,
            arguments: [data.range.start.line],
        };
    }

    get icon() {
        return new ThemeIcon(`symbol-${SymbolKind[this.data.kind].toLowerCase()}`);
    }

    get labelValue() {
        const { kind, name, lang } = this.data;
        return name + (kind === SymbolKind.Module && lang ? `  ${lang}` : "");
    }

    get markDown() {
        const { range, language, name } = this.data;
        if(!this.document) return name;
        const textList = [range.start.line, range.end.line].map(v => this.document!.lineAt(v).text.trimStart().trimEnd());
        textList.splice(1, 0, "...");
        // get current line text
        const value = range.end.line - range.start.line >= 2 ? textList.join(" ") : this.document.getText(range);
        return new MarkdownString(`\`\`\`${language}\n${value}\n\`\`\``);
    }
}