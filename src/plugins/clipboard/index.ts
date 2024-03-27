import { window, env, workspace, Uri, Selection, TextEditorRevealType, commands } from "vscode";
import type { Plugin } from "@/vscode-context";
import { ClipboardProvider, type ClipboardItem } from "./treeView";
import i18n from "@/utils/i18n";
import { TreeViews, Commands, LocalKey } from "@/maps";
import { Local } from "@/utils/storage";

interface CommandData {
    data: ClipboardItem;
}

function add(clipboard: ClipboardProvider) {
    const editor = window.activeTextEditor!;
    const selectText = editor.document.getText(editor.selection);
    if(selectText) {
        env.clipboard.writeText(selectText);
    }
    clipboard.insert({
        label: selectText.replace(/\s/g, ""),
        content: selectText,
        filePath: editor.document.fileName,
        selection: editor.selection,
    });
}

async function edit(item: CommandData, clipboard: ClipboardProvider) {
    const input = await window.showInputBox({
        placeHolder: i18n.t("prompt.clipboard.treeinput.placeholder"),
        value: item.data.label,
    });
    if(!input) return;
    clipboard.update({
        ...item.data,
        label: input,
    });
}

function deleteFn(item: CommandData, clipboard: ClipboardProvider) {
    clipboard.remove(item.data);
    // window.showInformationMessage(i18n.t("prompt.clipboard.delete"));
}

function clear(clipboard: ClipboardProvider) {
    clipboard.clear();
    // window.showInformationMessage(i18n.t("prompt.clipboard.clear"));
}

async function gotoFile(item: CommandData) {
    try {
        const wsFolder = workspace.getWorkspaceFolder(Uri.file(item.data.filePath));
        if(!wsFolder)
            return;

        const document = await workspace.openTextDocument(item.data.filePath);
        const data = item.data as ClipboardItem;
        const selection = new Selection(data.selection.start, data.selection.end);
        const text = document.getText(selection);
        if(text !== data.content)
            return;

        const textEdit = await window.showTextDocument(document);
        textEdit.selection = selection;
        textEdit.revealRange(selection, TextEditorRevealType.InCenter);
    } catch (error) {
        window.showErrorMessage(String(error));
    }
}

export default <Plugin> function(app) {

    return {
        name: "clipboard",
        install() {

            const local = new Local<ClipboardItem[]>(app.ctx, LocalKey.Clipboard);
            const clipboard = new ClipboardProvider(local);
            const treeView = window.createTreeView(TreeViews.Cliboard, {
                treeDataProvider: clipboard,
            });

            return [
                treeView,
                commands.registerCommand(Commands.clipboard_add, () => add.call(null, clipboard)),
                commands.registerCommand(Commands.clipboard_edit, (item) => edit.call(null, item, clipboard)),
                commands.registerCommand(Commands.clipboard_delete, (item) => deleteFn.call(null, item, clipboard)),
                commands.registerCommand(Commands.clipboard_clear, () => clear.call(null, clipboard)),
                commands.registerCommand(Commands.clipboard_goto_file, (item) => gotoFile.call(null, item)),
            ];
        },
    };
};
