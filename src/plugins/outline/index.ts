import { type ToolsPluginCallback } from "@/tools";
import { commands, window } from "vscode";
import { OutlineProvider } from "./treeView";
import { TreeViews, Commands } from "@/maps";

export default <ToolsPluginCallback> function(app) {

    const outline = new OutlineProvider();

    window.createTreeView(TreeViews.Outline, {
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
