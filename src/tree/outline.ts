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
    ThemeIcon,
    type Event,
    type TreeDataProvider,
    type DocumentSymbol,
    type TextDocumentChangeEvent,
} from "vscode";
import Config from "@/utils/config";
import debounce from "@/utils/debounce";
import { Commands } from "@/commands/commands";

export const templateRe = new RegExp(/<template[^>]*?>(?:.|\n)*?<\/template>/g);
export const scriptRe = new RegExp(/<script[^>]*?>(?:.|\n)*?<\/script>/g);
export const styleRe = new RegExp(/<style[^>]*?>(?:.|\n)*?<\/style>/g);

const TEMPLATE_MAP = ["template"];
const SCRUPT_MAP = ["script", "script setup"];
const STYLE_MAP = ["style", "style scoped"];

export default class OutlineProvider implements TreeDataProvider<OutlineTreeItem> {

    list: DocumentSymbol[] = [];
    document?: TextDocument;

    private _onDidChangeTreeData: EventEmitter<OutlineTreeItem | undefined | null | void> = new EventEmitter<OutlineTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<OutlineTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    getTreeItem(element: OutlineTreeItem): TreeItem {
        return element;
    }

    getChildren(element?: OutlineTreeItem): Thenable<OutlineTreeItem[]> {
        const list = element ? element.children : this.list;
        const data = list.map((item) => {
            const collapsibleState = item.children.length > 0 ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None;
            return new OutlineTreeItem(item, collapsibleState, this.document);
        });
        return Promise.resolve(data);
    }

    refresh(data?: DocumentSymbol[], document?: TextDocument): void {
        if(data) {
            this.document = document;
            this.list = data;
        }
        this._onDidChangeTreeData.fire();
    }

    async update(document?: TextDocument) {
        const data = await this.getDocSymbols(document);
        this.refresh(data, document);
    }

    clear() {
        this.list = [];
        this.refresh();
    }

    deep(data: DocumentSymbol[], deep = 1) {
        const result: DocumentSymbol[] = [];
        for(let i = 0; i < data.length; i++) {
            const docSymbol = data[i];
            result.push({
                ...docSymbol,
                children: this.deep(docSymbol.children, deep + 1).sort((a, b) => {
                    return a.range.start.line - b.range.start.line;
                }),
            });
        }
        return result;
    }

    async getDocSymbols(document?: TextDocument) {
        if(!document || document.languageId !== "vue") return [];
        const docSymbols = await commands.executeCommand<DocumentSymbol[]>("vscode.executeDocumentSymbolProvider", document.uri);
        if(!docSymbols) return [];
        const outlineList = Config.getOutline() || [];

        function isShowAllChild(name: string) {
            if(!outlineList || outlineList.length <= 0) return;
            return outlineList.find(s => name.startsWith(s));
        };

        const scriptModules = docSymbols.filter(v => SCRUPT_MAP.includes(v.name) && v.kind === SymbolKind.Module).map(sms => {
            if(isShowAllChild(sms.name)) return sms;
            const defaultModules = sms.children.filter(vc => vc.name === "default" && vc.kind === SymbolKind.Variable);
            // when no default modules return
            if(defaultModules.length <= 0) {
                return {
                    ...sms,
                    children: sms.children.map(smsc => ({ ...smsc, children: [] })),
                };
            }
            // get default module
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
        // template
        const templateModules = docSymbols.filter(v => TEMPLATE_MAP.includes(v.name) && v.kind === SymbolKind.Module);
        // style
        const styleModules = docSymbols.filter(v => STYLE_MAP.includes(v.name) && v.kind === SymbolKind.Module);
        // template、style、script
        const modules = [...TEMPLATE_MAP, ...STYLE_MAP, ...SCRUPT_MAP];
        // other
        const otherModules = docSymbols.filter(v => !modules.includes(v.name) && v.kind === SymbolKind.Module);

        const tsoModule = [...templateModules, ...styleModules, ...otherModules].map(v => {
            return {
                ...v,
                children: isShowAllChild(v.name) ? v.children : [],
            };
        });

        return this.deep([
            ...tsoModule,
            ...scriptModules,
        ]);
    }

    watch(): Disposable[] {
        return [
            window.onDidChangeActiveTextEditor((textEditor) => {
                this.update(textEditor?.document);
            }),
            workspace.onDidChangeTextDocument(debounce((event: TextDocumentChangeEvent) => {
                this.update(event.document);
            }, 300)),
            workspace.onDidChangeWorkspaceFolders(() => {
                this.update(window.activeTextEditor?.document);
            }),
        ];
    }

    static init() {
        const script = new OutlineProvider();
        script.update(window.activeTextEditor?.document);
        window.createTreeView("tools.outline", {
            treeDataProvider: script,
            showCollapseAll: true,
        });
        return script;
    }
}


export class OutlineTreeItem extends TreeItem {
    children: DocumentSymbol[];
    constructor(
        public readonly data: DocumentSymbol,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly document?: TextDocument,
    ) {
        super(data.name, collapsibleState);
        this.children = data.children;
        this.data = data;
        this.label = data.name;
        // get current line text
        this.tooltip = document ? document.lineAt(data.range.start).text : data.name;
        this.iconPath = new ThemeIcon(`symbol-${SymbolKind[data.kind].toLowerCase()}`);
        this.command = {
            title: data.name,
            command: Commands.utils_scrollto,
            arguments: [data.range.start.line],
        };
    }
}
