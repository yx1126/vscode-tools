import { ExtensionModule } from "@/types";
import OutlineProvider from "@/tree/outline";
import { commands, window, workspace, type ConfigurationChangeEvent } from "vscode";
import { Commands } from "./commands";
import debounce from "@/utils/debounce";
import Config from "@/utils/config";

export function refresh(outline: OutlineProvider) {
    outline.update(window.activeTextEditor?.document);
}

export default <ExtensionModule> function() {
    const outline = OutlineProvider.init();
    const disposable = workspace.onDidChangeConfiguration(debounce((e: ConfigurationChangeEvent) => {
        if(e.affectsConfiguration("simple-tools.tools")) {
            if(Config.getTools()?.includes("outline")) {
                Config.ctx.subscriptions.push(...outline.watch());
            } else {
                outline.unWatch();
            }
        }
    }, 300));
    return [
        commands.registerCommand(Commands.outline_refresh, () => refresh(outline)),
        disposable,
        ...outline.watch(),
    ];
};
