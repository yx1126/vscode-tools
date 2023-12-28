import { workspace, commands, Disposable } from "vscode";
import type { ExtensionContext, ConfigurationChangeEvent, TextDocument } from "vscode";
import debounce from "./utils/debounce";
import { setContext } from "./utils/setContext";

interface ToolsPluginBase {
    name: string;
    always?: boolean;
    onConfigurationChange?: (e: ConfigurationChangeEvent, context: VsocdeContext) => void;
    install: (context: VsocdeContext) => Disposable[] | void;
    destory?: (context: VsocdeContext) => void;
}

export type Plugin = () => ToolsPluginBase;

type PluginOption = {
    enable: boolean;
    plugin: ToolsPluginBase;
};

const CONFIG_KEY = "dev-tools";

export class VsocdeContext {
    ctx: ExtensionContext;
    document?: TextDocument;

    // plugins
    private pluginMap = new Map<string, PluginOption>();
    private disposableMap = new Map<string, Disposable[]>();
    private eventMap = new Map<string, Disposable[]>();

    get config() {
        return workspace.getConfiguration(CONFIG_KEY);
    }

    get tools() {
        const tools = this.config.get<string[]>("tools");
        if(Array.isArray(tools)) {
            return tools;
        }
        return [...this.pluginMap.keys()];
    }

    constructor(ctx: ExtensionContext) {
        this.ctx = ctx;
    }

    // 打开辅助侧栏
    private openAuxiliaryBar() {
        commands.executeCommand("workbench.action.focusAuxiliaryBar");
    }

    // 关闭辅助侧栏
    private closeAuxiliaryBar() {
        commands.executeCommand("workbench.action.closeAuxiliaryBar");
    }

    private onSettingChange() {
        this.pluginMap.forEach((p, pname) => {
            const enable = this.tools.includes(pname);
            setContext(pname, enable);
            if(enable) {
                if(!p.enable) {
                    p.enable = enable;
                    const disposables = p.plugin.install(this);
                    if(disposables) {
                        this.disposableMap.set(p.plugin.name, disposables);
                    }
                }
            } else {
                if(p.plugin.always) return;
                p.enable = enable;
                const disposables = this.disposableMap.get(pname);
                if(disposables) {
                    Disposable.from(...disposables).dispose();
                }
                if(p.plugin.destory) {
                    p.plugin.destory(this);
                }
                this.disposableMap.delete(pname);
            }
        });
    }

    use(plugin: Plugin) {
        const pluginCtx = plugin();
        if(this.pluginMap.has(pluginCtx.name)) {
            throw new Error(`The Plugin '${pluginCtx.name}' already exists, please do not add it again`);
        } else {
            this.pluginMap.set(pluginCtx.name, { enable: false, plugin: pluginCtx });
        }
    }

    private onSettingEvent() {
        const disposable =  workspace.onDidChangeConfiguration(debounce((e: ConfigurationChangeEvent) => {
            if(e.affectsConfiguration("dev-tools.tools")) {
                this.onSettingChange();
            }
            this.pluginMap.forEach((p) => {
                if(p.enable && p.plugin.onConfigurationChange) {
                    p.plugin.onConfigurationChange(e, this);
                }
            });
        }, 300));
        this.eventMap.set("onDidChangeConfiguration", [disposable]);
    }

    init() {
        this.onSettingChange();
        this.onSettingEvent();
        if(this.config.get<boolean>("openAuxiliaryBar")) {
            this.openAuxiliaryBar();
        }
    }

    dispose() {
        this.disposableMap.forEach(d => {
            Disposable.from(...d).dispose();
        });
        this.eventMap.forEach(e => {
            Disposable.from(...e).dispose();
        });
    }
}
