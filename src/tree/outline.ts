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
            const collapsibleState = item.children.length > 0 ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None;
            return new OutlineTreeItem(item, collapsibleState, this.document);
        });
        return Promise.resolve(data);
    }

    refresh(data?: Outline[], document?: TextDocument): void {
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

    deep(data: Outline[], deep = 1, language?: string) {
        const result: Outline[] = [];
        for(let i = 0; i < data.length; i++) {
            const docSymbol = data[i];
            docSymbol.deep = deep;
            if(deep === 1) {
                const langList = this.document?.lineAt(docSymbol.range.start.line).text.match(langRe);
                docSymbol.lang = langList ? langList[2] : undefined;
                docSymbol.language = language ? language : langList
                    ? langList[2]
                    : TEMPLATE_MAP.includes(docSymbol.name)
                        ? "html"
                        : STYLE_MAP.includes(docSymbol.name)
                            ? "css"
                            : "javascript";
            } else {
                docSymbol.language = language!;
            }
            result.push({
                ...docSymbol,
                children: this.deep(docSymbol.children as Outline[], deep + 1, docSymbol.language),
            });
        }
        return result.sort((a, b) => {
            return a.range.start.line - b.range.start.line;
        });
    }

    async getDocSymbols(document?: TextDocument) {
        try {
            if(!document || document.languageId !== "vue") return [];
            const docSymbols = await commands.executeCommand<Outline[]>("vscode.executeDocumentSymbolProvider", document.uri);
            if(!docSymbols) return [];
            const outlineList = Config.getOutline() || [];
            const isShowOther = Config.getScriptDefault();

            function isShowAllChild(name: string) {
                if(!outlineList || outlineList.length <= 0) return;
                return outlineList.find(s => name.startsWith(s));
            };

            const scriptModules = docSymbols.filter(v => SCRIUPT_MAP.includes(v.name) && v.kind === SymbolKind.Module).map(sms => {
                if(isShowAllChild(sms.name)) return sms;
                // show all nodes
                if(!isShowOther) {
                    sms.children = sms.children.map(smsc => {
                        if(smsc.name === "default" && smsc.kind === SymbolKind.Variable) {
                            smsc.children = smsc.children.map(dm => {
                                dm.children = SCRIPU_PROPS.includes(dm.name) ? dm.children.map(mc => ({ ...mc, children: [] })) : [];
                                return dm;
                            });
                        } else {
                            smsc.children = smsc.children.map(dm => ({ ...dm, children: [] }));
                        }
                        return smsc;
                    });
                    return sms;
                }
                const defaultModules = sms.children.filter(vc => vc.name === "default" && vc.kind === SymbolKind.Variable);
                // when no default modules return
                if(defaultModules.length <= 0) {
                    sms.children = sms.children.map(smsc => ({ ...smsc, children: [] }));
                    return sms;
                }
                // get default module
                const defaultModule = (defaultModules.length > 0 ? defaultModules[0].children : []).map(dm => {
                    dm.children = SCRIPU_PROPS.includes(dm.name) ? dm.children.map(mc => ({ ...mc, children: [] })) : [];
                    return dm;
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
            const modules = [...TEMPLATE_MAP, ...STYLE_MAP, ...SCRIUPT_MAP];
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
        } catch (error) {
            return [];
        }
    }

    watch(): Disposable[] {
        return [
            window.onDidChangeActiveTextEditor((textEditor) => {
                this.clearTimer();
                this.update(textEditor?.document);
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

    // vscode.executeDocumentSymbolProvider can not get data when vscode first open
    load() {
        const document = window.activeTextEditor?.document;
        if(!document || document.languageId !== "vue") return;
        let index = 0;
        this.timer = setInterval(() => {
            index = index + 1;
            if(index >= 10 || this.list.length > 0) {
                this.clearTimer();
                return;
            }
            this.update(document);
        }, 500);
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
        public readonly doc?: TextDocument,
    ) {
        super(data.name, collapsibleState);
        this.document = doc!;
        this.children = data.children as Outline[];
        this.data = data;

        this.label = this.getLabel();
        // get current line text
        const range = data.range;
        const value = range.end.line - range.start.line >= 2 ? this.getOverRow(range) : this.document.getText(range);
        this.tooltip = new MarkdownString(this.markDown(value));

        this.iconPath = new ThemeIcon(`symbol-${SymbolKind[data.kind].toLowerCase()}`);
        this.command = {
            title: data.name,
            command: Commands.utils_scrollto,
            arguments: [data.range.start.line],
        };
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

    markDown(value: string) {
        return `\`\`\`${this.data.language}\n${value}\n\`\`\``;
    }
}
