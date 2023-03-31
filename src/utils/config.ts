import { workspace, commands, ExtensionContext } from "vscode";

// plugins simple-tools.plugin.${SIMPLE_TOOLS_PLUGINS}
const SIMPLE_TOOLS_PLUGINS = ["clipboard", "location"];

// simpie-tools config key
const CONFIG_KEY = "simple-tools";

// clipboard store key
export const CLIPBOARD_STORE_KEY = "clipboardKeys";

export default class Config {

    static context: ExtensionContext;

    static init() {
        this.onSettingChange();
        this.context.subscriptions.push(workspace.onDidChangeConfiguration(() => this.onSettingChange()));
    }

    static onSettingChange() {
        this.initPlugins();
        this.initAuxiliaryBar();
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

    // 获取默认功能配合着
    static getTools(): string [] | undefined {
        return this.getConfig().get("tools");
    }

    // 切换辅助侧栏
    static async initAuxiliaryBar() {
        const isShow = !!this.getConfig().get("openAuxiliaryBar");
        if(isShow) {
            this.openAuxiliaryBar();
        } else {
            this.closeAuxiliaryBar();
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
