import { workspace, Disposable, commands, TextDocument, window } from "vscode";
import type { ExtensionContext, ConfigurationChangeEvent } from "vscode";
import Node, { type FileNode } from "../utils/node";
import debounce from "../utils/debounce";

interface ToolsPluginBase {
    readonly name: string;
    readonly onDidChangeConfiguration?: (e: ConfigurationChangeEvent) => void;
    readonly onFileNodeChange?: (fileNodes: FileNode[]) => void;
}

export type ToolsPluginCallback = (app: Tools) => ToolsPluginBase & { readonly install: () => Disposable[] | void };

export type ToolsPluginOptions = (ToolsPluginBase & { readonly install: (app: Tools) => Disposable[] | void });

export type ToolsPlugin = ToolsPluginOptions | ToolsPluginCallback;

// simpie-tools config key
const CONFIG_KEY = "simple-tools";

export function createTools(...args: ConstructorParameters<typeof Tools>) {
    return new Tools(...args);
}

export class Tools {

    ctx: ExtensionContext;
    disposable: Disposable[] = [];
    document?: TextDocument;
    node: Node;

    // plugins
    private plugins: ToolsPluginOptions[] = [];
    onFileNodeChange: Array<(fileNodes: FileNode[]) => void> = [];
    private onDidChangeConfiguration: Array<(e: ConfigurationChangeEvent) => void> = [];

    $t: (key: string, ...args: any[]) => void;

    constructor(ctx: ExtensionContext, t: (key: string, ...args: any[]) => void) {
        this.ctx = ctx;
        this.$t = t;
        this.node = new Node(this);
    }

    get config() {
        return workspace.getConfiguration(CONFIG_KEY);
    }

    get tools() {
        return this.config.get<string[]>("tools");
    }

    private onSettingChange() {
        this.plugins.forEach(p => {
            const enable = !this.tools || this.tools.includes(p.name);
            commands.executeCommand("setContext", `simple-tools.plugin.${p.name}`, enable);
        });
    }

    use(plugin: ToolsPlugin | ToolsPlugin[]) {
        const plugins = Array.isArray(plugin) ? plugin : [plugin];
        plugins.forEach(p => {
            const pluginOption = typeof p === "function" ? p(this) : p;
            const index = this.plugins.findIndex(fn => fn.name === pluginOption.name);
            if(index === -1) {
                this.plugins.push(pluginOption);
                if(pluginOption.onDidChangeConfiguration) this.onDidChangeConfiguration.push(pluginOption.onDidChangeConfiguration);
                if(pluginOption.onFileNodeChange) this.onFileNodeChange.push(pluginOption.onFileNodeChange);
            }
        });
    }

    watch() {
        const result = [
            workspace.onDidChangeConfiguration(debounce((e: ConfigurationChangeEvent) => {
                this.onDidChangeConfiguration.forEach(fn => fn(e));
                if(e.affectsConfiguration("simple-tools.tools")) {
                    this.onSettingChange();
                    this.node.load(window.activeTextEditor?.document);
                }
            }, 300)),
        ];
        this.disposable.push(...result);
    }

    init() {
        this.onSettingChange();
        this.watch();
        const nideDisposes = this.node.watch();
        const disposes = this.plugins.map(p => p.install(this)).reduce<Disposable[]>((result, list) => {
            if(list && list.length > 0) {
                result.push(...list);
            }
            return result;
        }, []);
        this.node.load(window.activeTextEditor?.document);
        this.disposable.push(...disposes, ...nideDisposes);
    }

    dispose() {
        Disposable.from(...this.disposable).dispose();
    }
}
