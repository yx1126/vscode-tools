import { Selection, TextEditorRevealType, commands, window, Position, Uri, env } from "vscode";
import { type ToolsPluginCallback } from "@/core";
import { Commands } from "@/core/commands";
import { HelperProvider } from "./treeView";

export async function scrollTo(lineNumber: number, at: TextEditorRevealType = TextEditorRevealType.InCenter) {
    const document = window.activeTextEditor?.document;
    if(document) {
        const textEditor = await window.showTextDocument(document);
        const character = document.lineAt(lineNumber).text.trimEnd().length;
        const lineEnd = new Position(lineNumber, character);
        const selection = new Selection(lineEnd, lineEnd);
        textEditor.selection = selection;
        textEditor.revealRange(selection, at);
    }
}

export async function onOpenUrl(url: string) {
    await env.openExternal(Uri.parse(url));
}


export default <ToolsPluginCallback> function(app) {

    const helper = new HelperProvider(app.ctx);
    window.createTreeView("tools.helpAndFeedback", {
        treeDataProvider: helper,
    });

    return {
        name: "helper",
        install() {
            return [
                commands.registerCommand(Commands.helper_scrollTo, scrollTo),
                commands.registerCommand(Commands.helper_open_url, onOpenUrl),
            ];
        },
    };
};
