// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { ClipboardProvider } from "./treeData/clipboard";
import GlobStorage from "./utils/globStorage";
import { CLIPBOARD_STORE_KEY } from "./config";


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

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

    const editor = vscode.window.activeTextEditor!;
    const clipboardStore = new GlobStorage<string[]>(CLIPBOARD_STORE_KEY, context);
    const clipboardKeys: string[] = clipboardStore.getItem() || [];
    const clipboard = ClipboardProvider.init(clipboardKeys);

    // update views data
    function updateViews(data: string[]) {
        clipboardStore.setItem(data);
        clipboard.refresh(data);
    }


    // add command
    const addDisposable = vscode.commands.registerCommand("shear-plate.add", () => {
        const selectText = editor.document.getText(editor.selection);
        const data = clipboardStore.getItem() || [];
        if(!data.includes(selectText)) {
            updateViews([...data, selectText]);
        }
    });
    context.subscriptions.push(addDisposable);

    // delete command
    const deleteDisposable = vscode.commands.registerCommand("shear-plate.delete", () => {
        // const selectText = editor.document.getText(editor.selection);
        const selectText = editor.document.getText(editor.selection);
        const data = clipboardStore.getItem() || [];
        const filterData = (clipboardStore.getItem() || []).filter(item => item !== selectText);
        if(data.length !== filterData.length) {
            updateViews(filterData);
        }
    });
    context.subscriptions.push(deleteDisposable);

    // delete all text command
    const deleteAllDisposable = vscode.commands.registerCommand("clipboard.deleteAll", () => {
        updateViews([]);
    });
    context.subscriptions.push(deleteAllDisposable);

    // copy command
    const copyDisposable = vscode.commands.registerCommand("clipboard.copytext", (item) => {
        vscode.env.clipboard.writeText(item.text);
    });
    context.subscriptions.push(copyDisposable);

    // delete command
    const deleteTextDisposable = vscode.commands.registerCommand("clipboard.delete", (item) => {
        const data = clipboardStore.getItem() || [];
        data.splice(item.index, 1);
        updateViews(data);
    });
    context.subscriptions.push(deleteTextDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}



