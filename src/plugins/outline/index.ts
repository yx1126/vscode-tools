import { commands, window } from "vscode";
import { type ToolsPluginCallback } from "@/tools";
import { OutlineProvider } from "./treeView";
import { Commands } from "@/commands";

export default <ToolsPluginCallback> function(app) {

    const outline = new OutlineProvider();

    window.createTreeView("vue-tools.outline", {
        treeDataProvider: outline,
        showCollapseAll: true,
    });

    return {
        name: "outline",
        install() {
            return [
                commands.registerCommand(Commands.outline_refresh, () => {
                    app.node.update(window.activeTextEditor?.document);
                }),
            ];
        },
        onFileNodeChange(data) {
            outline.refresh(data);
        },
    };
};
