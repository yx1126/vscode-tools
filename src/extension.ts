// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, env, commands, workspace, type ExtensionContext } from "vscode";
import { ClipboardProvider } from "./tree/clipboard";
import GlobStorage from "./utils/globStorage";
import { CLIPBOARD_STORE_KEY } from "./config";
import i18n from "./utils/i18n";
import type { ClipboardItem } from "./types";


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log("Congratulations, your extension \"shear-plate\" is now active!");

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json


	// const disposable = vscode.commands.registerCommand("shear-plate.helloWorld", () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage("Hello World from shear-plate!");
	// });
	// context.subscriptions.push(disposable);

    // init i18n
    i18n.init(context.extensionPath);

    const clipboardStore = new GlobStorage<ClipboardItem[]>(CLIPBOARD_STORE_KEY, context);
    const clipboard = ClipboardProvider.init(clipboardStore);

    // add command
    const addDisposable = commands.registerCommand("shear-plate.add", async () => {
        const editor = window.activeTextEditor!;
        const selectText = editor.document.getText(editor.selection);
        clipboard.insert({
            label: selectText,
            content: selectText,
            filePath: editor.document.fileName,
            line: editor.selection.start.line,
        });
    });
    context.subscriptions.push(addDisposable);

    // delete all text command
    const deleteAllDisposable = commands.registerCommand("shear-plate.clipboard.clear", () => {
        clipboard.clear();
        window.showInformationMessage(i18n.t("prompt.clear"));
    });
    context.subscriptions.push(deleteAllDisposable);

    // copy command
    const copyDisposable = commands.registerCommand("shear-plate.clipboard.copytext", (item) => {
        env.clipboard.writeText(item.data.content);
        window.showInformationMessage(i18n.t("prompt.copy"));
    });
    context.subscriptions.push(copyDisposable);

    // edit label command
    const editDisposable = commands.registerCommand("shear-plate.clipboard.edit", async (item) => {
        const input = await window.showInputBox({
            title: i18n.t("prompt.treeinput.title"),
            placeHolder: i18n.t("prompt.treeinput.placeHolder"),
            value: item.data.label.replace(/\s/g, ""),
        });
        if(!input) return;
        clipboard.update({
            ...item.data,
            label: input,
        });
    });
    context.subscriptions.push(editDisposable);

    // delete command
    const deleteTextDisposable = commands.registerCommand("shear-plate.clipboard.delete", (item) => {
        clipboard.remove(item.data);
        window.showInformationMessage(i18n.t("prompt.delete"));
    });
    context.subscriptions.push(deleteTextDisposable);

    // goto file
    const gotoDisposable = commands.registerCommand("shear-plate.clipboard.goto_file", async (item) => {
        try {
            const document = await workspace.openTextDocument(item.data.filePath);
            await window.showTextDocument(document);
        } catch (error) {
            window.showErrorMessage(String(error));
        }
    });
    context.subscriptions.push(gotoDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log("Congratulations, your extension \"shear-plate\" is now deactivate!");
}



