import {
    EventEmitter,
    TreeItem,
    window,
    TreeItemCollapsibleState,
    TextDocument,
    commands,
    workspace,
    SymbolKind,
    Disposable,
    type Event,
    type TreeDataProvider,
    type DocumentSymbol,
    type TextDocumentChangeEvent,
    ThemeIcon,
} from "vscode";

import debounce from "@/utils/debounce";

export const templateRe = new RegExp(/<template[^>]*?>(?:.|\n)*?<\/template>/g);
export const scriptRe = new RegExp(/<script[^>]*?>(?:.|\n)*?<\/script>/g);
export const styleRe = new RegExp(/<style[^>]*?>(?:.|\n)*?<\/style>/g);

export interface ScriptItem {
    label: string;
};

export default class ScriptProvider implements TreeDataProvider<ScriptTreeItem> {

    list: DocumentSymbol[] = [];

    static timer: any = null;


    private _onDidChangeTreeData: EventEmitter<ScriptTreeItem | undefined | null | void> = new EventEmitter<ScriptTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<ScriptTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {
    }

    getTreeItem(element: ScriptTreeItem): TreeItem {
        return element;
    }

    getChildren(element?: ScriptTreeItem): Thenable<ScriptTreeItem[]> {
        const list = element ? element.children : this.list;
        const data = list.map((item, i) => {
            return new ScriptTreeItem(item, i, item.children.length > 0 ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);
        });
        return Promise.resolve(data);
    }

    refresh(data?: DocumentSymbol[]): void {
        if(data) {
            this.list = data;
        }
        this._onDidChangeTreeData.fire();
    }

    async update(document?: TextDocument) {
        const data = await this.getDocSymbols(document);
        this.refresh(data);
    }

    clear() {
        this.list = [];
        this.refresh();
    }

    deep(data: DocumentSymbol[]) {
        const result: DocumentSymbol[] = [];
        for(let i = 0; i < data.length; i++) {
            const docSymbol = data[i];
            result.push({
                ...docSymbol,
                children: this.deep(docSymbol.children).sort((a, b) => {
                    return a.range.start.line - b.range.start.line;
                }),
            });
        }
        return result;
    }

    async getDocSymbols(document?: TextDocument) {
        if(!document || document.languageId !== "vue") return [];
        const docSymbols = await commands.executeCommand<DocumentSymbol[]>("vscode.executeDocumentSymbolProvider", document.uri);
        const scriptModules = docSymbols.filter(v => v.name === "script" && v.kind === SymbolKind.Module).map(sms => {
            const defaultModules = sms.children.filter(vc => vc.name === "default" && vc.kind === SymbolKind.Variable);
            const defaultModule = (defaultModules.length > 0 ? defaultModules[0].children : []).map(dm => {
                const isGetFirstLayer = ["props", "data", "methods", "computed", "watch", "provide", "inject"].includes(dm.name);
                return {
                    ...dm,
                    children: isGetFirstLayer ? dm.children.map(mc => ({ ...mc, children: [] })) : [],
                };
            });
            return {
                ...sms,
                children: defaultModule,
            };
        });

        const data = [
            ...docSymbols.filter(v => v.name === "template" && v.kind === SymbolKind.Module).map(v => ({ ...v, children: [] })),
            ...docSymbols.filter(v => v.name === "style" && v.kind === SymbolKind.Module).map(v => ({ ...v, children: [] })),
            ...scriptModules,
        ];
        return this.deep(data);
    }

    watch(): Disposable[] {
        return [
            window.onDidChangeActiveTextEditor((textEditor) => {
                this.update(textEditor?.document);
            }),
            workspace.onDidChangeTextDocument(debounce((event: TextDocumentChangeEvent) => {
                this.update(event.document);
            }, 300)),
        ];
    }

    static init() {
        const script = new ScriptProvider();
        window.registerTreeDataProvider("tools.script", script);
        return script;
    }
}


export class ScriptTreeItem extends TreeItem {
    children: DocumentSymbol[];
    constructor(
        public readonly data: DocumentSymbol,
        public readonly index: number,
        public readonly collapsibleState: TreeItemCollapsibleState
    ) {
        super(data.name, collapsibleState);
        this.children = data.children;
        this.data = data;
        this.label = data.name;
        this.tooltip = data.name;
        this.iconPath = new ThemeIcon(`symbol-${SymbolKind[data.kind].toLowerCase()}`);
    }
}
