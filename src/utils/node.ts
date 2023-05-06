import { SymbolKind, TreeItemCollapsibleState, commands, window, workspace } from "vscode";
import { type DocumentSymbol, TextDocument, Disposable, TextDocumentChangeEvent } from "vscode";
import debounce from "./debounce";
import { Tools } from "@/tools";

export interface NodeOptions {
    deep: number;
    rootName: string;
    lang?: string;
    collapsibleState?: TreeItemCollapsibleState;
}

export interface FileNode extends Omit<NodeOptions, "collapsibleState">, DocumentSymbol {
    children: FileNode[];
    collapsibleState: TreeItemCollapsibleState;
};

export interface FormatOptions {
    readonly modules: string[];
    readonly onlyDefault: boolean;
    readonly deepExpand: number | Record<string, number>;
    readonly document: TextDocument;
    readonly filter?: (node: FileNode) => FileNode;
}

export const langRe = new RegExp(/lang=(\"|\')(.*?)(\"|\')/);
export const TEMPLATE_MAP = ["template"];
export const SCRIUPT_MAP = ["script", "script setup"];
export const STYLE_MAP = ["style", "style scoped"];
export const SCRIPU_PROPS = ["props", "data", "methods", "computed", "watch", "provide", "inject", "setup"];

export default class Node {

    fileNodes: FileNode[] = [];
    private tools: Tools;
    private timer: any = null;

    constructor(tools: Tools) {
        this.tools = tools;
    }

    private clearTimer() {
        if(this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private get enable() {
        const tools = this.tools.tools;
        if(!tools) return true;
        return tools.includes("outline") || tools.includes("ellipsis");
    };

    private emit(data: FileNode[]) {
        this.fileNodes = data;
        this.tools.onFileNodeChange.forEach(fn => fn(data));
    }

    private async getFileNodes(document?: TextDocument) {
        try {
            if(!document || document.languageId !== "vue") return [];
            const nodes = await commands.executeCommand<FileNode[]>("vscode.executeDocumentSymbolProvider", document.uri);
            if(!nodes) return [];
            return getFileNodes(nodes, this.tools, document);
        } catch (error) {
            return [];
        }
    }

    async update(document?: TextDocument) {
        if(!this.enable || !document || document.languageId !== "vue") {
            this.emit([]);
            return;
        }
        this.tools.document = document;
        const data = await this.getFileNodes(document);
        console.log("update", data);
        this.emit(data);
    }

    load(document?: TextDocument) {
        if(!this.enable || !document || document.languageId !== "vue") {
            this.emit([]);
            return;
        }
        let index = 0;
        this.timer = setInterval(() => {
            index = index + 1;
            if(index >= 10 || this.fileNodes.length > 0) {
                this.clearTimer();
                return;
            }
            this.update(document);
        }, 300);
    }

    watch(): Disposable[] {
        return [
            window.onDidChangeActiveTextEditor((textEditor) => {
                this.clearTimer();
                this.fileNodes = [];
                this.load(textEditor?.document);
            }),
            workspace.onDidChangeTextDocument(debounce((event: TextDocumentChangeEvent) => {
                this.clearTimer();
                this.update(event.document);
            }, 300)),
            workspace.onDidChangeWorkspaceFolders(() => {
                this.clearTimer();
                this.load(window.activeTextEditor?.document);
            }),
        ];
    }
}

function getLang(node: FileNode, document: TextDocument) {
    const langList = document.lineAt(node.range.start.line).text.match(langRe);
    if(langList) return langList[2];
}

function getState(node: FileNode, { deepExpand }: FormatOptions) {
    if(node.children.length <= 0) return TreeItemCollapsibleState.None;
    const deepValue = typeof deepExpand === "number" ? deepExpand : (deepExpand[node.rootName] || 0);
    return node.deep <= deepValue ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
}

export function getBeginTag(str: string) {
    const map = new Map();
    const symbol = ["\'", "\"", "\`"];
    let index: undefined | number;
    end:
    for(let i = 0; i < str.length; i++) {
        const t = str[i];
        if(symbol.includes(t)) {
            if(map.has(t)) {
                map.delete(t);
            } else {
                map.set(t, true);
            }
            continue;
        }
        if(map.size === 0 && t === ">") {
            index = i;
            break end;
        }
    }
    return str.substring(0, index! + 1);
}

function formatModules(nodes: FileNode[], options: FormatOptions): FileNode[] {
    const { document, modules, filter = ((v) => v) } = options;
    function recursion(nodes: FileNode[], opt: NodeOptions): FileNode[] {
        return nodes.map(node => {
            node.deep = opt.deep;
            node.rootName = node.deep === 1 ? node.name : opt.rootName;
            if(node.deep === 1) {
                node.lang = getLang(node, document);
            }
            const result = filter(node);
            result.collapsibleState = node.deep === 1 && !modules.includes(node.name) && !SCRIUPT_MAP.includes(node.name) ? TreeItemCollapsibleState.None : getState(node, options);
            result.children = recursion(node.children, {
                ...opt,
                deep: node.deep + 1,
                rootName: node.rootName,
            });
            return result;
        }).sort((a, b) => a.range.start.line - b.range.start.line);
    }
    return recursion(nodes, { deep: 1, rootName: "" });
}

function formatScriptModules(nodes: FileNode[], options: FormatOptions): FileNode[] {
    const { onlyDefault, modules } = options;
    let hasDefault: boolean = false;
    function filter(node: FileNode): FileNode {
        const defaultModule = node.children.find(n => n.name === "default" && n.kind === SymbolKind.Variable);
        if(defaultModule && onlyDefault) {
            node.children = defaultModule.children;
            hasDefault = true;
        }
        if(!modules.includes(node.rootName) && node.deep === (hasDefault ? 2 : 3)) {
            node.children = SCRIPU_PROPS.includes(node.name) ? node.children.map(c => ({ ...c, children: [] })) : [];
            if(node.name === "setup") {
                node.children = node.children.filter(n => n.kind !== SymbolKind.Property);
            }
        }
        return node;
    };
    return formatModules(nodes, {
        ...options,
        filter,
    });
}

export function getFileNodes(nodes: FileNode[], tools: Tools, document?: TextDocument) {
    if(!document) return [];
    const options: FormatOptions = {
        modules: tools.config.get<string[]>("outline.modules") || [],
        onlyDefault: tools.config.get<boolean>("outline.script.default") || false,
        deepExpand: tools.config.get<number | Record<string, number>>("outline.expand") || 0,
        document: document,
    };

    const { scriptModules, otherModules } = nodes.reduce<Record<string, FileNode[]>>((result, item) => {
        result[SCRIUPT_MAP.includes(item.name) ? "scriptModules" : "otherModules"].push(item);
        return result;
    }, { scriptModules: [], otherModules: [] });

    return [
        ...formatScriptModules(scriptModules, options),
        ...formatModules(otherModules, options),
    ].sort((a, b) => a.range.start.line - b.range.start.line);
}
