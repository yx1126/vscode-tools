import { window, commands, env, workspace, Selection, TextEditorRevealType } from "vscode";
import { Commands } from "./commands";
import { CLIPBOARD_STORE_KEY } from "@/config";
import GlobStorage from "@/utils/globStorage";
import { ClipboardProvider, type ClipboardItem } from "@/tree/clipboard";
import i18n from "@/utils/i18n";
import type { ExtensionModule } from "@/types";

export function add(clipboard: ClipboardProvider) {
    const editor = window.activeTextEditor!;
    const selectText = editor.document.getText(editor.selection);
    clipboard.insert({
        label: selectText.replace(/\s/g, ""),
        content: selectText,
        filePath: editor.document.fileName,
        selection: editor.selection,
    });
}

export async function edit(item: any, clipboard: ClipboardProvider) {
    const input = await window.showInputBox({
        title: i18n.t("prompt.clipboard.treeinput.title"),
        placeHolder: i18n.t("prompt.clipboard.treeinput.placeHolder"),
        value: item.data.label,
    });
    if(!input) return;
    clipboard.update({
        ...item.data,
        label: input,
    });
}

export function copytext(item: any) {
    env.clipboard.writeText(item.data.content);
    window.showInformationMessage(i18n.t("prompt.clipboard.copy"));
}

export function deleteFn(item: any, clipboard: ClipboardProvider) {
    clipboard.remove(item.data);
    window.showInformationMessage(i18n.t("prompt.clipboard.delete"));
}

export function clear(clipboard: ClipboardProvider) {
    clipboard.clear();
    window.showInformationMessage(i18n.t("prompt.clipboard.clear"));
}

export async function goto_file(item: any) {
    try {
        const document = await workspace.openTextDocument(item.data.filePath);
       const textEdit = await window.showTextDocument(document);
       const data = item.data as ClipboardItem;
       textEdit.selection = new Selection(
            data.selection.anchor,
            data.selection.active,
       );
       textEdit.revealRange(textEdit.selection, TextEditorRevealType.InCenter);
    } catch (error) {
        window.showErrorMessage(String(error));
    }
}


export default <ExtensionModule> function(ctx) {
    const clipboardStore = new GlobStorage<ClipboardItem[]>(CLIPBOARD_STORE_KEY, ctx);
    const clipboard = ClipboardProvider.init(clipboardStore);
    return [
        commands.registerCommand(Commands.clipboard_add, () => add.call(null, clipboard)),
        commands.registerCommand(Commands.clipboard_edit, (item) => edit.call(null, item, clipboard)),
        commands.registerCommand(Commands.clipboard_copytext, (item) => copytext.call(null, item)),
        commands.registerCommand(Commands.clipboard_delete, (item) => deleteFn.call(null, item, clipboard)),
        commands.registerCommand(Commands.clipboard_clear, () => clear.call(null, clipboard)),
        commands.registerCommand(Commands.clipboard_goto_file, (item) => goto_file.call(null, item)),
    ];
};
