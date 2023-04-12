import { ExtensionModule } from "@/types";
import OutlineProvider from "@/tree/outline";
import { commands, window } from "vscode";
import { Commands } from "./commands";

export function refresh(outline: OutlineProvider) {
    outline.update(window.activeTextEditor?.document);
}

export default <ExtensionModule> function() {
    const outline = OutlineProvider.init();
    return [
        commands.registerCommand(Commands.outline_refresh, () => refresh(outline)),
        ...outline.watch(),
    ];
};
