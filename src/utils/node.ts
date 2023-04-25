import { TreeItemCollapsibleState, SymbolKind, commands, window, workspace } from "vscode";
import { type DocumentSymbol, TextDocument, Disposable, TextDocumentChangeEvent } from "vscode";
import debounce from "./debounce";
import { Tools } from "@/core";



export interface NodeOptions {
    path: number[];
    deep: number;
    rootName: string;
    lang: string;
    language: string;
    collapsibleState?: TreeItemCollapsibleState;
}

export interface FileNode extends Omit<NodeOptions, "collapsibleState">, DocumentSymbol {
    children: FileNode[];
    collapsibleState: TreeItemCollapsibleState;
};

export const langRe = new RegExp(/lang=(\"|\')(.*?)(\"|\')/);
export const TEMPLATE_MAP = ["template"];
export const SCRIUPT_MAP = ["script", "script setup"];
export const STYLE_MAP = ["style", "style scoped"];
export const SCRIPU_PROPS = ["props", "data", "methods", "computed", "watch", "provide", "inject"];


export default class Node {

    fileNodes: FileNode[] = [];
    templateNodes: FileNode[] = [];
    timer: any = null;
    tools: Tools;

    constructor(tools: Tools) {
        this.tools = tools;
    }

    clearTimer() {
        if(this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    get enable() {
        const tools = this.tools.tools;
        if(!tools) return true;
        return tools.includes("outline") || tools.includes("ellipsis");
    };

    async update(document?: TextDocument) {
        if(!document || !this.enable) return;
        this.tools.document = document;
        const data = await this.getFileNodes(document);
        this.fileNodes = data;
        this.tools.onFileNodeChange.forEach(fn => {
            fn(data);
        });
    }

    load(document?: TextDocument) {
        if(!this.enable) return;
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

    async getFileNodes(document?: TextDocument) {
        try {
            if(!document || document.languageId !== "vue") return [];
            const nodes = await commands.executeCommand<FileNode[]>("vscode.executeDocumentSymbolProvider", document.uri);
            if(!nodes) return [];
            return getFileNodes(nodes, this.tools, document);
        } catch (error) {
            return [];
        }
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
                this.update(window.activeTextEditor?.document);
            }),
        ];
    }
}



function getLanguage(name: string) {
    return TEMPLATE_MAP.includes(name) ? "html" : STYLE_MAP.includes(name) ? "css" : SCRIUPT_MAP.includes(name) ? "" : "javascript";
}

export function getFileNodes(nodes: FileNode[], tools: Tools, document?: TextDocument): FileNode[] {
    if(!document) return [];
    const outlineModules = tools.config.get<string[]>("outline.modules") || [];
    const isOnlyShowDefaultModule = tools.config.get<boolean>("outline.script.default");
    const deepExpand = tools.config.get<number | Record<string, number>>("outline.expand") || 0;

    function getState(node: FileNode, root: boolean) {
        if(root && !outlineModules.find(v => v === node.name) && !SCRIUPT_MAP.includes(node.name)) {
            return TreeItemCollapsibleState.None;
        }
        const deepValue = typeof deepExpand === "number" ? deepExpand : (deepExpand[node.rootName || node.name] || 0);
        return node.deep <= deepValue ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
    }

    return nodes.map((node, i) => {
        const langList = document.lineAt(node.range.start.line).text.match(langRe);
        const lang = langList ? langList[2] : "";
        const language = lang || getLanguage(node.name);
        function recursion(nodes: FileNode[], options: NodeOptions): FileNode[] {
            const { deep, language, rootName, path, collapsibleState } = options;

            const isHasDefaultModule = nodes.find(n => node.name === "default" && n.kind === SymbolKind.Variable);

            return nodes.map((node, ci) => {
                const nodePath = [...path, ci];

                const newChildNodeChildrens = recursion(node.children, {
                    ...options,
                    deep: deep + 1,
                    path: nodePath,
                    collapsibleState: SCRIUPT_MAP.includes(rootName) && SCRIPU_PROPS.includes(node.name) ? TreeItemCollapsibleState.None : undefined,
                });

                const newChildNode = {
                    ...node,
                    deep,
                    language,
                    rootName,
                    path: nodePath,
                    children: newChildNodeChildrens,
                };
                return {
                    ...newChildNode,
                    collapsibleState: collapsibleState !== undefined ? collapsibleState : getState(newChildNode, false),
                };
            });
        };

        const newNode = {
            ...node,
            lang,
            language,
            deep: 1,
            path: [],
            children: recursion(node.children, {
                deep: 2,
                rootName: node.name,
                lang: lang,
                language: language,
                path: [i],
            }),
        };
        return {
            ...newNode,
            collapsibleState: getState(newNode, true),
        };
    });
}
