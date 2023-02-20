// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import type { ExtensionContext, Disposable } from "vscode";
import i18n from "@/utils/i18n";
import flatten from "@/utils/flatten";
import CommandsModules from "@/commands";


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

    const modules = [
        CommandsModules,
    ];

    const disposables = flatten(modules.map(m => m(context))) as Disposable[];

    disposables.forEach(item => {
        context.subscriptions.push(item);
    });

}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log("Congratulations, your extension \"shear-plate\" is now deactivate!");
}



