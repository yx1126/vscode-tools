import { ExtensionModule } from "@/types";
import { Selection, TextEditorRevealType, commands, window, Position } from "vscode";
import { Commands } from "./commands";

export async function scrollTo(lineNumber: number, at: TextEditorRevealType = TextEditorRevealType.InCenter) {
    const document = window.activeTextEditor?.document;
    if(document) {
        const textEditor = await window.showTextDocument(document);
        const character = document.lineAt(lineNumber).text.trimEnd().length;
        const selection = new Selection(
            new Position(lineNumber, character),
            new Position(lineNumber, character)
        );
        textEditor.selection = selection;
        textEditor.revealRange(selection, at);
    }
}

export default <ExtensionModule> function() {
    return [
        commands.registerCommand(Commands.utils_scrollto, scrollTo),
    ];
};
