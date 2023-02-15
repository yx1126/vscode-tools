// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, env, commands, type ExtensionContext } from "vscode";
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
    i18n.init(context.extensionPath);

    const editor = window.activeTextEditor!;
    const clipboardStore = new GlobStorage<ClipboardItem[]>(CLIPBOARD_STORE_KEY, context);
    const clipboardKeys: ClipboardItem[] = clipboardStore.getItem() || [];
    const clipboard = ClipboardProvider.init(clipboardKeys);

    // update views data
    function updateViews(data: ClipboardItem[]) {
        clipboardStore.setItem(data);
        clipboard.refresh(data);
    }


    // add command
    const addDisposable = commands.registerCommand("shear-plate.add", () => {
        const selectText = editor.document.getText(editor.selection);
        const localData = clipboardStore.getItem() || [];
        const data = localData.find(item => item.content === selectText);
        if(!data) {
            updateViews([...localData, { label: selectText, content: selectText }]);
            window.showInformationMessage(i18n.t("prompt.insert"));
        }
    });
    context.subscriptions.push(addDisposable);

    // delete command
    const deleteDisposable = commands.registerCommand("shear-plate.delete", () => {
        // const selectText = editor.document.getText(editor.selection);
        const selectText = editor.document.getText(editor.selection);
        const localData = clipboardStore.getItem() || [];
        const filterData = localData.filter(item => item.content !== selectText);
        if(localData.length !== filterData.length) {
            updateViews(filterData);
            window.showInformationMessage(i18n.t("prompt.delete"));
        }
    });
    context.subscriptions.push(deleteDisposable);

    // delete all text command
    const deleteAllDisposable = commands.registerCommand("clipboard.clear", () => {
        updateViews([]);
        window.showInformationMessage(i18n.t("prompt.clear"));
    });
    context.subscriptions.push(deleteAllDisposable);

    // copy command
    const copyDisposable = commands.registerCommand("clipboard.copytext", (item) => {
        env.clipboard.writeText(item.content);
        window.showInformationMessage(i18n.t("prompt.copy"));
    });
    context.subscriptions.push(copyDisposable);

    // edit label command
    const editDisposable = commands.registerCommand("clipboard.edit", async (item) => {
        const localData = clipboardStore.getItem() || [];
        const input = await window.showInputBox({
            title: i18n.t("prompt.treeinput.title"),
            placeHolder: i18n.t("prompt.treeinput.placeHolder"),
            value: localData[item.index].label.replace(/\s/g, ""),
        });
        const isIn = localData.find(item => item.label === input);
        if(input && !isIn) {
            localData[item.index].label = input;
            updateViews(localData);
        }
    });
    context.subscriptions.push(editDisposable);

    // delete command
    const deleteTextDisposable = commands.registerCommand("clipboard.delete", (item) => {
        const localData = clipboardStore.getItem() || [];
        localData.splice(item.index, 1);
        updateViews(localData);
        window.showInformationMessage(i18n.t("prompt.delete"));
    });
    context.subscriptions.push(deleteTextDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}



