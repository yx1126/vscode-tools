import { EventEmitter, TreeItem, window, TreeItemCollapsibleState, TextDocument, commands, workspace, SymbolKind, Disposable, ThemeIcon, MarkdownString } from "vscode";
import type { Event, TreeDataProvider, DocumentSymbol, TextDocumentChangeEvent, Range } from "vscode";
import Config from "@/utils/config";
import debounce from "@/utils/debounce";
import { Commands } from "@/commands/commands";

export const templateRe = new RegExp(/<template[^>]*?>(?:.|\n)*?<\/template>/g);
export const scriptRe = new RegExp(/<script[^>]*?>(?:.|\n)*?<\/script>/g);
export const styleRe = new RegExp(/<style[^>]*?>(?:.|\n)*?<\/style>/g);
export const langRe = new RegExp(/lang=(\"|\')(.*?)(\"|\')/);

const TEMPLATE_MAP = ["template"];
const SCRIUPT_MAP = ["script", "script setup"];
const STYLE_MAP = ["style", "style scoped"];
const SCRIPU_PROPS = ["props", "data", "methods", "computed", "watch", "provide", "inject"];

export interface Outline extends DocumentSymbol {
    deep: number;
    lang?: string;
    language: string;
    expand: TreeItemCollapsibleState;
}

export default class OutlineProvider implements TreeDataProvider<OutlineTreeItem> {

    list: Outline[] = [];
    document?: TextDocument;

    timer: any = null;

    private _onDidChangeTreeData: EventEmitter<OutlineTreeItem | undefined | null | void> = new EventEmitter<OutlineTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<OutlineTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    getTreeItem(element: OutlineTreeItem): TreeItem {
        return element;
    }

    getChildren(element?: OutlineTreeItem): Thenable<OutlineTreeItem[]> {
        const list = element ? element.children : this.list;
        const data = list.map((item) => {
            return new OutlineTreeItem(item, item.expand, this.document!);
        });
        return Promise.resolve(data);
    }

    refresh(data?: Outline[]): void {
        this.list = data || [];
        this._onDidChangeTreeData.fire();
    }

    async update(document?: TextDocument) {
        this.document = document;
        const data = await this.getDocSymbols(this.document);
        this.refresh(data);
    }

    clear() {
        this.list = [];
        this.refresh();
    }

    async getDocSymbols(document?: TextDocument) {
        try {
            if(!document || document.languageId !== "vue") return [];
            const docSymbols = await commands.executeCommand<Outline[]>("vscode.executeDocumentSymbolProvider", document.uri);
            if(!docSymbols) return [];
            const outlineModules = Config.getOutlineModules();
            const isOnlyShowDefaultModule = Config.getScriptDefault();
            const expandDeep = Config.getExpandDeep();

            function recursion(data: Outline[], deep = 1, language?: string, rootName?: string) {
                const result: Outline[] = [];
                for(let i = 0; i < data.length; i++) {
                    const docSymbol = data[i];
                    docSymbol.deep = deep;
                    if(deep === 1) {
                        // mudule name
                        rootName = docSymbol.name;
                        const isShowAllChild = outlineModules.length <= 0 ? false : outlineModules.find(s => s === docSymbol.name);
                        const langList = document!.lineAt(docSymbol.range.start.line).text.match(langRe);
                        docSymbol.lang = langList ? langList[2] : undefined;
                        docSymbol.language = language ? language : langList
                            ? langList[2]
                            : TEMPLATE_MAP.includes(docSymbol.name)
                                ? "html"
                                : STYLE_MAP.includes(docSymbol.name)
                                    ? "css"
                                    : "javascript";
                        const defaultModule = docSymbol.children.find(v => v.name === "default" && v.kind === SymbolKind.Variable);
                        // show default export
                        if(isOnlyShowDefaultModule && defaultModule) {
                            docSymbol.children = defaultModule.children;
                        }
                        // not show all children nodes
                        if(!isShowAllChild) {
                            // script module
                            if(SCRIUPT_MAP.includes(docSymbol.name)) {
                                // show default export
                                if(isOnlyShowDefaultModule && defaultModule) {
                                    docSymbol.children = docSymbol.children.map(v => {
                                        v.children = SCRIPU_PROPS.includes(v.name) ? v.children.map(vc => ({ ...vc, children: [] })) : [];
                                        return v;
                                    });
                                } else {
                                    // not show default export
                                    docSymbol.children = docSymbol.children.map((v) => {
                                        if(v.name === "default" && v.kind === SymbolKind.Variable) {
                                            v.children = v.children.map(v => {
                                                v.children = SCRIPU_PROPS.includes(v.name) ? v.children.map(vc => ({ ...vc, children: [] })) : [];
                                                return v;
                                            });
                                        } else {
                                            v.children = [];
                                        }
                                        return v;
                                    });
                                }
                            } else {
                                // other modules
                                docSymbol.children = [];
                            }
                        }
                    } else {
                        docSymbol.language = language!;
                    }
                    // expand
                    const deepValue = typeof expandDeep === "number" ? expandDeep : (expandDeep[rootName!] || 0);
                    docSymbol.expand = docSymbol.children.length <= 0
                        ? TreeItemCollapsibleState.None
                        : deep <= deepValue
                            ? TreeItemCollapsibleState.Expanded
                            : TreeItemCollapsibleState.Collapsed;
                    result.push({
                        ...docSymbol,
                        children: recursion(docSymbol.children as Outline[], deep + 1, docSymbol.language, rootName),
                    });
                }
                return result.sort((a, b) => {
                    return a.range.start.line - b.range.start.line;
                });
            }
            return recursion(docSymbols);
        } catch (error) {
            return [];
        }
    }

    watch(): Disposable[] {
        return [
            window.onDidChangeActiveTextEditor((textEditor) => {
                this.clearTimer();
                this.clear();
                this.load(textEditor?.document);
            }),
            workspace.onDidChangeTextDocument(debounce((event: TextDocumentChangeEvent) => {
                this.clearTimer();
                this.update(event.document);
            }, 300)),
            workspace.onDidChangeWorkspaceFolders(() => {
                this.clearTimer();
                this.update(window.activeTextEditor?.document);
            }),
        ];
    }

    clearTimer() {
        if(this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    // Sometimes vscode. ExecuteDocumentSymbolProvider unable to get to the data
    load(document = window.activeTextEditor?.document) {
        if(!document || document.languageId !== "vue") return;
        let index = 0;
        this.timer = setInterval(() => {
            index = index + 1;
            if(index >= 10 || this.list.length > 0) {
                this.clearTimer();
                return;
            }
            this.update(document);
        }, 300);
    }

    static init() {
        const script = new OutlineProvider();
        script.load();
        window.createTreeView("tools.outline", {
            treeDataProvider: script,
            showCollapseAll: true,
        });
        return script;
    }
}


export class OutlineTreeItem extends TreeItem {

    children: Outline[];
    document: TextDocument;

    constructor(
        public readonly data: Outline,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly doc: TextDocument,
    ) {
        super(data.name, collapsibleState);
        this.document = doc!;
        this.children = data.children as Outline[];
        this.data = data;

        this.label = this.getLabel();
        this.tooltip = this.markDown();
        this.iconPath = this.getIcon();
        this.command = {
            title: data.name,
            command: Commands.utils_scrollto,
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
