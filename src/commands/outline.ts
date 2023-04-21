import { ExtensionModule } from "@/types";
import { OutlineProvider } from "@/tree/outline";
import { commands, window } from "vscode";
import { Commands } from "./";
import Nodes from "@/utils/node";

export function refresh() {
    Nodes.update(window.activeTextEditor?.document);
}

export default <ExtensionModule> function() {
    OutlineProvider.init();
    return [
        commands.registerCommand(Commands.outline_refresh, refresh),
    ];
};
