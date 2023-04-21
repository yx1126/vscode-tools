import { workspace, commands, ExtensionContext } from "vscode";
import type { ConfigurationChangeEvent, Disposable } from "vscode";
import debounce from "./debounce";
import Nodes from "./node";

// plugins simple-tools.plugin.${SIMPLE_TOOLS_PLUGINS}
export const SIMPLE_TOOLS_PLUGINS = ["clipboard", "location", "outline", "ellipsis"];

// simpie-tools config key
const CONFIG_KEY = "simple-tools";

// clipboard store key
export const CLIPBOARD_STORE_KEY = "clipboardKeys";

export default class Config {

    static ctx: ExtensionContext;

    static onSettingChangeFn: Array<(e: ConfigurationChangeEvent) => void> = [];

    static init(context: ExtensionContext) {
        this.ctx = context;
        this.initPlugins();
        this.initAuxiliaryBar();
        this.onSettingChangeFn.push((e) => {
            if(e.affectsConfiguration("simple-tools.tools")) {
                this.initPlugins();
            }
        });
        this.onSettingChangeFn.push(Nodes.onDidChangeConfiguration);
    }

    static watch() {
        const result: Disposable[] = [];
        if(this.onSettingChangeFn.length > 0) {
            result.push(
                workspace.onDidChangeConfiguration(debounce((e: ConfigurationChangeEvent) => {
                    this.onSettingChangeFn.forEach(fn => fn(e));
                }, 300))
            );
        }
        result.push(...Nodes.watch());
        return result;
    }

    static initPlugins() {
        const tools = this.getTools();

        SIMPLE_TOOLS_PLUGINS.forEach(plugin => {
            const flag = !tools || (tools && tools.includes(plugin));
            commands.executeCommand("setContext", `simple-tools.plugin.${plugin}`, flag);
        });
    }

    // 获取配置
    static getConfig() {
        return workspace.getConfiguration(CONFIG_KEY);
    }

    static getOutlineModules() {
        return this.getConfig().get<string[] | null>("outline.modules");
    }

    static getScriptDefault() {
        return this.getConfig().get<boolean>("outline.script.default");
    }

    static getExpandDeep() {
        return this.getConfig().get<number | Record<string, number>>("outline.expand") || 0;
    }

    // 获取默认功能配合着
    static getTools() {
        return this.getConfig().get<string[] | null>("tools");
    }

    // 切换辅助侧栏
    static async initAuxiliaryBar() {
        const isShow = !!this.getConfig().get("openAuxiliaryBar");
        if(isShow) {
            this.openAuxiliaryBar();
        }
    }

    // 打开辅助侧栏
    static async openAuxiliaryBar() {
        await commands.executeCommand("workbench.action.focusAuxiliaryBar");
    }

    // 关闭辅助侧栏
    static async closeAuxiliaryBar() {
        await commands.executeCommand("workbench.action.closeAuxiliaryBar");
    }
}



