// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import type { ExtensionContext } from "vscode";
import i18n from "@/utils/i18n";
// import { createTools } from "./tools";
import { VsocdeContext } from "./vscode-context";
import plugins from "@/plugins";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log("Congratulations, your extension \"tools\" is now active!");
    // init i18n
    i18n.init(context.extensionPath);

    const vctx = new VsocdeContext(context);

    plugins.forEach(p => {
        vctx.use(p);
    });
    vctx.init();

    context.subscriptions.push(vctx);
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log("Congratulations, your extension \"tools\" is now deactivate!");
}



