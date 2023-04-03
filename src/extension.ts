// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { type ExtensionContext, type Disposable, workspace, window } from "vscode";
import i18n from "@/utils/i18n";
import flatten from "@/utils/flatten";
import CommandsModules from "@/commands";
import Config from "@/utils/config";


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log("Congratulations, your extension \"tools\" is now active!");

    // init i18n
    i18n.init(context.extensionPath);
    // init plugins
    Config.init(context);

    // modules
    const modules = [
        CommandsModules,
    ];

    const disposables = flatten(modules.map(m => m(context))) as Disposable[];

    const onTextOpen = workspace.onDidOpenTextDocument((textDocument) => {
        if(!["vue", "html"].includes(textDocument.languageId)) return;
        console.log("---------  onDidOpenTextDocument  ----------");
        console.log("textDocument:  ", textDocument);
        console.log("--------------------------------------------");
    });
    const onTextChange = window.onDidChangeActiveTextEditor((textEdit) => {
        if(!textEdit) return;
        if(!["vue", "html"].includes(textEdit.document.languageId)) return;
        console.log("---------  onDidChangeActiveTextEditor  ----------");
        console.log("textEdit:  ", textEdit);
        console.log("--------------------------------------------");
    });
    const events = [onTextOpen, onTextChange];

    context.subscriptions.push(...disposables);
    context.subscriptions.push(...events);

}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log("Congratulations, your extension \"tools\" is now deactivate!");
}



