import { workspace, commands, ExtensionContext, type ConfigurationChangeEvent } from "vscode";
import debounce from "./debounce";
import { Commands } from "@/commands/commands";

// plugins simple-tools.plugin.${SIMPLE_TOOLS_PLUGINS}
const SIMPLE_TOOLS_PLUGINS = ["clipboard", "location", "outline"];

// simpie-tools config key
const CONFIG_KEY = "simple-tools";

// clipboard store key
export const CLIPBOARD_STORE_KEY = "clipboardKeys";

export default class Config {

    static ctx: ExtensionContext;

    static init(context: ExtensionContext) {
        this.ctx = context;
        this.onSettingChange();
        this.initAuxiliaryBar();
        this.ctx.subscriptions.push(
            workspace.onDidChangeConfiguration(debounce((e: ConfigurationChangeEvent) => {
                if(e.affectsConfiguration("simple-tools.tools")) {
                    this.onSettingChange();
                }
            }, 300))
        );
    }

    static async execute(delay: number) {
        await new Promise(resolve => setTimeout(resolve, delay));
        commands.executeCommand(Commands.outline_refresh);
    }

    static onSettingChange() {
        this.initPlugins();
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
        return this.getConfig().get<string[]>("outline.modules") || [];
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
