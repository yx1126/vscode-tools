import { workspace, Disposable, commands, TextDocument, window } from "vscode";
import type { ExtensionContext, ConfigurationChangeEvent } from "vscode";
import Node, { type FileNode } from "./utils/node";
import debounce from "./utils/debounce";

interface ToolsPluginBase {
    readonly name: string;
    readonly onDidChangeConfiguration?: (e: ConfigurationChangeEvent) => void;
    readonly onFileNodeChange?: (fileNodes: FileNode[]) => void;
}

export type ToolsPluginCallback = (app: Tools) => ToolsPluginBase & { readonly install: () => Disposable[] | void };

export type ToolsPluginOptions = (ToolsPluginBase & { readonly install: (app: Tools) => Disposable[] | void });

export type ToolsPlugin = ToolsPluginOptions | ToolsPluginCallback;

// simpie-tools config key
const CONFIG_KEY = "vue-tools";

export function createTools(...args: ConstructorParameters<typeof Tools>) {
    return new Tools(...args);
}

export default class Tools {

    ctx: ExtensionContext;
    disposable: Disposable[] = [];
    document?: TextDocument;
    node: Node;

    // plugins
    private plugins: ToolsPluginOptions[] = [];
    onFileNodeChange: Array<(fileNodes: FileNode[]) => void> = [];
    private onDidChangeConfiguration: Array<(e: ConfigurationChangeEvent) => void> = [];

    constructor(ctx: ExtensionContext) {
        this.ctx = ctx;
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
            commands.executeCommand("setContext", `vue-tools.plugin.${p.name}`, enable);
        });
    }

    // 打开辅助侧栏
    private openAuxiliaryBar() {
        commands.executeCommand("workbench.action.focusAuxiliaryBar");
    }

    // 关闭辅助侧栏
    private closeAuxiliaryBar() {
        commands.executeCommand("workbench.action.closeAuxiliaryBar");
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
                if(e.affectsConfiguration("vue-tools.tools")) {
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
        if(this.config.get<boolean>("openAuxiliaryBar")) {
            this.openAuxiliaryBar();
        }
    }

    dispose() {
        Disposable.from(...this.disposable).dispose();
    }
}
