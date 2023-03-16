import { commands } from "vscode";
import { Commands } from "./commands";
import type { ExtensionModule } from "@/types";

export async function openPosition() {
    await commands.executeCommand("workbench.files.action.collapseExplorerFolders");
    await commands.executeCommand("workbench.files.action.showActiveFileInExplorer");
}

export default <ExtensionModule> function() {

    return [
        commands.registerCommand(Commands.explorer_position, openPosition),
    ];
};
