import { commands } from "vscode";

// plugins simple-tools.plugin.${SIMPLE_TOOLS_PLUGINS}
export const SIMPLE_TOOLS_PLUGINS = ["clipboard", "location", "outline", "ellipsis"];



export default class Config {


    // 打开辅助侧栏
    static async openAuxiliaryBar() {
        await commands.executeCommand("workbench.action.focusAuxiliaryBar");
    }

    // 关闭辅助侧栏
    static async closeAuxiliaryBar() {
        await commands.executeCommand("workbench.action.closeAuxiliaryBar");
    }
}



