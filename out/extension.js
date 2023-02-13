"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const clipboard_1 = require("./treeData/clipboard");
const globStorage_1 = require("./utils/globStorage");
const config_1 = require("./config");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
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
    const editor = vscode.window.activeTextEditor;
    const clipboardStore = new globStorage_1.default(config_1.CLIPBOARD_STORE_KEY, context);
    const clipboardKeys = clipboardStore.getItem() || [];
    const clipboard = clipboard_1.ClipboardProvider.init(clipboardKeys);
    // update views data
    function updateViews(data) {
        clipboardStore.setItem(data);
        clipboard.refresh(data);
    }
    // add command
    const addDisposable = vscode.commands.registerCommand("shear-plate.add", () => {
        const selectText = editor.document.getText(editor.selection);
        const data = clipboardStore.getItem() || [];
        if (!data.includes(selectText)) {
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
        if (data.length !== filterData.length) {
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
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map