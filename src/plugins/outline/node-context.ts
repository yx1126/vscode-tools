import { toArray } from "@/utils/array";
import type { VsocdeContext } from "../../vscode-context";
import type { DocumentSymbol, TextDocument } from "vscode";
import { SymbolKind, TreeItemCollapsibleState, commands } from "vscode";
import type { Local } from "@/utils/storage";

export interface NodeOptions {
    deep: number;
    rootName: string;
    lang?: string;
    collapsibleState?: TreeItemCollapsibleState;
}

export interface FileNode extends Omit<NodeOptions, "collapsibleState">, DocumentSymbol {
    children: FileNode[];
    collapsibleState: TreeItemCollapsibleState;
}

export interface FormatOptions {
    readonly modules: string[];
    readonly onlyDefault: boolean;
    readonly deepExpand: number | Record<string, number>;
    readonly document: TextDocument;
    readonly filter?: (node: FileNode) => FileNode;
}

export enum VUE_SECRIPT {
    DEFAULT = "script",
    SETUP = "script setup",
}

export const langRe = new RegExp(/lang=(\"|\')(.*?)(\"|\')/);
export const TEMPLATE_MAP = ["template"];
export const SCRIUPT_MAP: string[] = [VUE_SECRIPT.DEFAULT, VUE_SECRIPT.SETUP];
export const STYLE_MAP = ["style", "style scoped"];
export const SCRIPU_PROPS = ["props", "data", "methods", "computed", "watch", "provide", "inject", "setup"];

export class NodeContext {

    fileNodes: FileNode[] = [];
    private local: Local<boolean>;
    private ctx: VsocdeContext;
    private timer: any = null;
    private watcher: Array<(data: FileNode[]) => void> = [];

    constructor(ctx: VsocdeContext, local: Local<boolean>) {
        this.ctx = ctx;
        this.local = local;
    }

    dispose() {
        this.fileNodes = [];
        this.watcher = [];
        this.clearTimer();
    }

    clearTimer() {
        if(this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private get enable() {
        const tools = this.ctx.tools;
        if(!tools) return true;
        return tools.includes("outline") || tools.includes("ellipsis");
    }

    private refresh(data: FileNode[]) {
        this.fileNodes = data;
        this.watcher.forEach((watcher) => watcher(data));
    }

    private async getFileNodes(document?: TextDocument) {
        try {
            if(!document) return [];
            const nodes = await commands.executeCommand<FileNode[]>("vscode.executeDocumentSymbolProvider", document.uri);
            if(!nodes) return [];
            const options: FormatOptions = {
                modules: this.ctx.config.get<string[]>("outline.vue.modules") || [],
                onlyDefault: this.ctx.config.get<boolean>("outline.vue.script.default") || false,
                deepExpand: this.ctx.config.get<number | Record<string, number>>("outline.expand") || 0,
                document: document,
            };
            if(document.languageId !== "vue" || this.local.getItem()) {
                return formatFileNodes(nodes, options);
            }
            return formatVueNodes(nodes, options);
        } catch (error) {
            return [];
        }
    }

    async update(document?: TextDocument) {
        if(!this.enable || !document) {
            this.refresh([]);
            return;
        }
        this.ctx.document = document;
        const data = await this.getFileNodes(document);
        this.refresh(data);
    }

    load(document?: TextDocument) {
        if(!this.enable || !document) {
            this.refresh([]);
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

    on(fn: (data: FileNode[]) => void) {
        this.watcher.push(fn);
    }
}

function getLang(node: FileNode, document: TextDocument) {
    const langList = document.lineAt(node.range.start.line).text.match(langRe);
    if(langList) return langList[2];
}

function getCollapseState(node: FileNode, deepExpand: FormatOptions["deepExpand"]) {
    if(node.children.length <= 0) return TreeItemCollapsibleState.None;
    const deepValue = typeof deepExpand === "number" ? deepExpand : (deepExpand[node.rootName] || 0);
    return node.deep <= deepValue ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
}

/**
 * format the vue file nodes
 * @param nodes
 * @param options
 * @param document
 * @returns
 */
export function formatVueNodes(nodes: FileNode[], options: FormatOptions) {
    const { onlyDefault, modules, document, deepExpand } = options;
    const { scriptModules, otherModules } = nodes.reduce<Record<string, FileNode[]>>((result, item) => {
        result[SCRIUPT_MAP.includes(item.name) ? "scriptModules" : "otherModules"].push(item);
        return result;
    }, { scriptModules: [], otherModules: [] });

    // vue script module is has default export
    let hasDefault = false;
    // default filter
    function filter(node: FileNode) {
        node.collapsibleState = node.deep === 1 && !modules.includes(node.name) && !SCRIUPT_MAP.includes(node.name) ? TreeItemCollapsibleState.None : getCollapseState(node, deepExpand);
        if(node.deep === 1) {
            node.lang = getLang(node, document);
        }
        return node;
    }
    return [
        ...formatFileNodes(scriptModules, {
            ...options,
            filter(node) {
                if(node.name === VUE_SECRIPT.SETUP) {
                    // setup
                    node.children = clearChilds(node.children);
                } else {
                    // default
                    const defaultModule = node.children.find(n => n.name === "default" && n.kind === SymbolKind.Variable);
                    if(defaultModule && onlyDefault) {
                        node.children = defaultModule.children;
                        hasDefault = true;
                    }
                    if(!modules.includes(node.rootName) && node.deep === (hasDefault ? 2 : 3)) {
                        if(SCRIPU_PROPS.includes(node.name)) {
                            node.children = clearChilds(node.children).filter(deleteProperty);
                        } else {
                            node.children = [];
                        }
                    }
                }
                node = filter(node);
                return node;
            },
        }),
        ...formatFileNodes(otherModules, {
            ...options,
            filter,
        }),
    ].sort((a, b) => a.range.start.line - b.range.start.line);
}

function deleteProperty(nodes: Arrayable<FileNode>) {
    return toArray(nodes).filter(node => {
        node.children = deleteProperty(node.children);
        return node.kind !== SymbolKind.Property;
    });
}

function clearChilds(nodes: Arrayable<FileNode>) {
    return toArray(nodes).map(node => {
        node.children = [];
        return node;
    });
}

/**
 * format file nodes
 * @param nodes
 * @param options
 * @returns
 */
export function formatFileNodes(nodes: FileNode[], options: FormatOptions) {
    const { filter } = options;
    function recursion(nodes: FileNode[], opt: NodeOptions): FileNode[] {
        return nodes.map(node => {
            node.deep = opt.deep;
            node.rootName = opt.deep === 1 ? node.name : opt.rootName;
            node.collapsibleState = getCollapseState(node, options.deepExpand);
            const result = filter ? filter(node) : node;
            if(result.children.length > 0) {
                result.children = recursion(result.children, {
                    ...opt,
                    deep: opt.deep + 1,
                    rootName: node.rootName,
                });
            }
            return result;
        }).sort((a, b) => a.range.start.line - b.range.start.line);
    }
    return recursion(nodes, { deep: 1, rootName: "" });
}
