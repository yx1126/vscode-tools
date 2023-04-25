import { workspace, Disposable, commands } from "vscode";
import type { ExtensionContext, ConfigurationChangeEvent } from "vscode";
import type { FileNode } from "../utils/node";
import debounce from "../utils/debounce";

interface ToolsPluginBase {
    name: string;
    onDidChangeConfiguration?: (e: ConfigurationChangeEvent) => void;
    onFileNodeChange?: () => void;
}

export type ToolsPluginCallback = (app: Tools) => ToolsPluginBase & { install: () => Disposable[] | void };

export type ToolsPluginOptions = (ToolsPluginBase & { install: (app: Tools) => Disposable[] | void });

export type ToolsPlugin = ToolsPluginOptions | ToolsPluginCallback;

// simpie-tools config key
const CONFIG_KEY = "simple-tools";

export function createTools(...args: ConstructorParameters<typeof Tools>) {
    return new Tools(...args);
}

class Tools {

    ctx: ExtensionContext;
    fileNodes: FileNode[] = [];
    disposable: Disposable[] = [];

    // plugins
    plugins: ToolsPluginOptions[] = [];
    onFileNodeChange: Array<(fileNodes: FileNode[]) => void> = [];
    onDidChangeConfiguration: Array<(e: ConfigurationChangeEvent) => void> = [];

    $t: (key: string, ...args: any[]) => void;

    constructor(ctx: ExtensionContext, t: (key: string, ...args: any[]) => void) {
        this.ctx = ctx;
        this.$t = t;
    }

    get config() {
        return workspace.getConfiguration(CONFIG_KEY);
    }

    get tools() {
        return this.config.get<string[]>("tools");
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

    onSettingChange() {
        this.plugins.forEach(p => {
            const enable = !this.tools || this.tools.includes(p.name);
            commands.executeCommand("setContext", `simple-tools.plugin.${p.name}`, enable);
        });
    }

    watch() {
        const result = [
            workspace.onDidChangeConfiguration(debounce((e: ConfigurationChangeEvent) => {
                this.onDidChangeConfiguration.forEach(fn => fn(e));
                if(e.affectsConfiguration("simple-tools.tools")) {
                    this.onSettingChange();
                }
            }, 300)),
        ];
        this.disposable.push(...result);
    }

    init() {
        this.onSettingChange();
        this.watch();
        const disposes = this.plugins.map(p => p.install(this)).reduce<Disposable[]>((result, list) => {
            if(list && list.length > 0) {
                result.push(...list);
            }
            return result;
        }, []);
        this.disposable.push(...disposes);
    }

    dispose() {
        Disposable.from(...this.disposable).dispose();
    }
}
