// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { type ExtensionContext, type Disposable, workspace, commands } from "vscode";
import i18n from "@/utils/i18n";
import flatten from "@/utils/flatten";
import CommandsModules from "@/commands";

// plugins simple-tools.plugin.${SIMPLE_TOOLS_PLUGINS}
const SIMPLE_TOOLS_PLUGINS = ["clipboard", "location"];


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log("Congratulations, your extension \"tools\" is now active!");


    // init i18n
    i18n.init(context.extensionPath);

    // config
    const config = workspace.getConfiguration("simple-tools");

    // default use tools
    const tools = config.get("tools") as string[] | undefined;

    // init plugins
    SIMPLE_TOOLS_PLUGINS.forEach(plugin => {
        const flag = !tools || (tools && tools.includes(plugin));
        commands.executeCommand("setContext", `simple-tools.plugin.${plugin}`, flag);
    });

    const onDocumentChange = workspace.onDidChangeTextDocument((...args) => {
        console.log("------------------document change----------------", args);
    });

    // modules
    const modules = [
        CommandsModules,
    ];

    const disposables = flatten(modules.map(m => m(context, tools))) as Disposable[];

    disposables.forEach(item => {
        context.subscriptions.push(item);
    });

    context.subscriptions.push(onDocumentChange);

}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log("Congratulations, your extension \"tools\" is now deactivate!");
}



