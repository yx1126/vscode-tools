import { commands, window, workspace } from "vscode";
import { Commands } from "./";
import type { ExtensionModule } from "@/types";

export async function openPosition() {
    const editor = window.activeTextEditor;
    if(!editor) return;
    const wsFolder = workspace.getWorkspaceFolder(editor.document.uri);
    if(wsFolder) {
        await commands.executeCommand("workbench.files.action.collapseExplorerFolders");
        await commands.executeCommand("workbench.files.action.showActiveFileInExplorer");
    }
}

export default <ExtensionModule> function() {

    return [
        commands.registerCommand(Commands.explorer_position, openPosition),
    ];
};
