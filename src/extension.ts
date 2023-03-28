// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { type ExtensionContext, type Disposable, workspace, commands } from "vscode";
import i18n from "@/utils/i18n";
import flatten from "@/utils/flatten";
import CommandsModules from "@/commands";
import Config from "@/utils/config";

// plugins simple-tools.plugin.${SIMPLE_TOOLS_PLUGINS}
const SIMPLE_TOOLS_PLUGINS = ["clipboard", "location"];

function setPlugins() {
    // default use tools
    const tools = Config.getTools();

    SIMPLE_TOOLS_PLUGINS.forEach(plugin => {
        const flag = !tools || (tools && tools.includes(plugin));
        commands.executeCommand("setContext", `simple-tools.plugin.${plugin}`, flag);
    });
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log("Congratulations, your extension \"tools\" is now active!");

    // init i18n
    i18n.init(context.extensionPath);

    // init plugins
    setPlugins();


    const onDocumentChange = workspace.onDidChangeConfiguration(() => {
        setPlugins();
    });

    // modules
    const modules = [
        CommandsModules,
    ];

    const disposables = flatten(modules.map(m => m(context))) as Disposable[];
    const EventSunscriptions = [onDocumentChange];

    context.subscriptions.push(...disposables);
    context.subscriptions.push(...EventSunscriptions);

}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log("Congratulations, your extension \"tools\" is now deactivate!");
}



