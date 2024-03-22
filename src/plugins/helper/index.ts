import { type Plugin } from "@/vscode-context";
import { Selection, TextEditorRevealType, commands, window, Position, Uri, env, workspace, type Range } from "vscode";
import { HelperProvider } from "./treeView";
import { TreeViews, Commands } from "@/maps";
import path from "node:path";
import i18n from "@/utils/i18n";

export async function scrollTo(range: Range, at: TextEditorRevealType = TextEditorRevealType.InCenter) {
    const document = window.activeTextEditor?.document;
    if(document) {
        const textEditor = await window.showTextDocument(document);
        const character = range.isSingleLine ? range.end.character + 1 : document.lineAt(range.start.line).text.trimEnd().length;
        const lineEnd = new Position(range.start.line, character);
        const selection = new Selection(lineEnd, lineEnd);
        textEditor.selection = selection;
        textEditor.revealRange(selection, at);
    }
}

export async function onOpenUrl(url: string) {
    await env.openExternal(Uri.parse(url));
}

export function copytext(text: string) {
    if(typeof text !== "string") return;
    env.clipboard.writeText(text);
    // window.showInformationMessage(i18n.t("prompt.clipboard.copy"));
}

export async function rename(data: { path: string; name: string }) {
    const input = await window.showInputBox({
        placeHolder: i18n.t("prompt.preview.treeinput.placeholder"),
        value: data.name,
    });
    if(input && (input !== data.name)) {
        try {
            const pathConfig = path.parse(data.path);
            const fsPath = path.format({ ...pathConfig, name: input, base: input + ".svg" });
            await workspace.fs.rename(Uri.file(data.path), Uri.file(fsPath));
        } catch (error) {
            window.showErrorMessage(String(error));
        }
    }

}

export default <Plugin> function(app) {

    return {
        name: "helper",
        always: true,
        install() {
            const helper = new HelperProvider(app.ctx);

            const treeView = window.createTreeView(TreeViews.HelpAndFeedback, {
                treeDataProvider: helper,
            });

            return [
                treeView,
                commands.registerCommand(Commands.helper_scrollTo, scrollTo),
                commands.registerCommand(Commands.helper_open_url, onOpenUrl),
                commands.registerCommand(Commands.helper_copytext, copytext),
                commands.registerCommand(Commands.helper_rename, rename),
            ];
        },
    };
};
