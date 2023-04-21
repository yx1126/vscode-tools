import { TreeItemCollapsibleState, SymbolKind, commands, window, workspace } from "vscode";
import Config from "./config";
import { type DocumentSymbol, TextDocument, Disposable, TextDocumentChangeEvent, ConfigurationChangeEvent } from "vscode";
import debounce from "./debounce";



export interface NodeOptions {
    path: number[];
    deep: number;
    rootName: string;
    lang: string;
    language: string;
    collapsibleState?: TreeItemCollapsibleState;
}

export interface FileNode extends NodeOptions, DocumentSymbol {
    children: FileNode[];
    collapsibleState: TreeItemCollapsibleState;
};

export const langRe = new RegExp(/lang=(\"|\')(.*?)(\"|\')/);
export const TEMPLATE_MAP = ["template"];
export const SCRIUPT_MAP = ["script", "script setup"];
export const STYLE_MAP = ["style", "style scoped"];
export const SCRIPU_PROPS = ["props", "data", "methods", "computed", "watch", "provide", "inject"];


class Nodes {

    nodes: FileNode[] = [];

    templateNodes: FileNode[] = [];

    disposable: Disposable[] = [];

    updateFns: Array<(data: FileNode[]) => void> = [];

    timer: any = null;

    document?: TextDocument;

    clearTimer() {
        if(this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    get enable() {
        const tools = Config.getTools();
        if(!tools) return true;
        return tools.includes("outline") || tools.includes("ellipsis");
    };

    async update(document?: TextDocument) {
        if(!this.enable) return;
        this.document = document;
        this.nodes = await this.getFileNodes(document);
        this.updateFns.forEach(fn => fn(this.nodes));
    }

    load(document?: TextDocument) {
        if(!this.enable) return;
        let index = 0;
        this.timer = setInterval(() => {
            index = index + 1;
            if(index >= 10 || this.nodes.length > 0) {
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
            return getFileNodes(nodes, document);
        } catch (error) {
            return [];
        }
    }

    onDidChangeConfiguration(e: ConfigurationChangeEvent) {
        if(!e.affectsConfiguration("simple-tools.tools")) return;
        if(this.enable) {
            Config.ctx.subscriptions.push(...this.watch());
        } else {
            this.unWatch();
        }
    }

    unWatch() {
        this.disposable.forEach(fn => {
            const index = Config.ctx.subscriptions.findIndex(v => v === fn);
            if(index !== -1) {
                Config.ctx.subscriptions.splice(index, 1);
            }
            fn.dispose();
        });
        this.disposable = [];
    }

    watch(): Disposable[] {
        if(this.disposable.length > 0 || !this.enable) return [];
        this.disposable = [
            window.onDidChangeActiveTextEditor((textEditor) => {
                this.clearTimer();
                this.nodes = [];
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
        return this.disposable;
    }
}

export default new Nodes();


export function getFileNodes(nodes: FileNode[], document?: TextDocument): FileNode[] {
    if(!document) return [];
    const outlineModules = Config.getOutlineModules();
    const isOnlyShowDefaultModule = Config.getScriptDefault();
    const deepExpand = Config.getExpandDeep();

    function getState(node: FileNode) {
        const deepValue = typeof deepExpand === "number" ? deepExpand : (deepExpand[node.rootName || node.name] || 0);
        if(outlineModules && !outlineModules.find(v => v === node.name) || !SCRIPU_PROPS.includes(node.name)) {
            return TreeItemCollapsibleState.None;
        }
        return node.deep <= deepValue ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
    }

    function getLanguage(name: string) {
        return TEMPLATE_MAP.includes(name) ? "html" : STYLE_MAP.includes(name) ? "css" : SCRIUPT_MAP.includes(name) ? "" : "javascript";
    }

    function getChildren(nodes: FileNode[]) {
        if(!isOnlyShowDefaultModule) return nodes;
        return nodes.filter(v => v.name === "default" && v.kind === SymbolKind.Variable);
    }

    return nodes.map((node, i) => {
        const langList = document.lineAt(node.range.start.line).text.match(langRe);
        const lang = langList ? langList[2] : "";
        const language = lang || getLanguage(node.name);
        function recursion(nodes: FileNode[], options: NodeOptions): FileNode[] {
            const { deep, language, rootName, path, collapsibleState } = options;
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
                    collapsibleState: collapsibleState !== undefined ? collapsibleState : getState(newChildNode),
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
            collapsibleState: getState(node),
            children: SCRIUPT_MAP.includes(newNode.name) ? getChildren(newNode.children) : newNode.children,
        };
    });
}
