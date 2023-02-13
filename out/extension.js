"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const clipboard_1 = require("./treeData/clipboard");
const CLIPBOARD_STORE_KEY = "clipboardKeys";
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
    const clipboardStore = new GlobStorage(CLIPBOARD_STORE_KEY, context);
    const clipboardKeys = clipboardStore.getItem() || [];
    const clipboard = clipboard_1.ClipboardProvider.init(clipboardKeys);
    // add command
    const addDisposable = vscode.commands.registerCommand("shear-plate.add", () => {
        const selectText = editor.document.getText(editor.selection);
        const data = clipboardStore.getItem() || [];
        if (!data.includes(selectText)) {
            clipboardStore.setItem([...data, selectText]);
            clipboard.refresh();
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
            clipboardStore.setItem(filterData);
            clipboard.refresh();
        }
    });
    context.subscriptions.push(deleteDisposable);
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
class GlobStorage {
    constructor(key, ctx) {
        this.key = key;
        this.ctx = ctx;
    }
    getItem() {
        return this.ctx.globalState.get(this.key);
    }
    setItem(value) {
        this.ctx.globalState.update(this.key, value);
    }
}
//# sourceMappingURL=extension.js.map