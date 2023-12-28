import { commands } from "vscode";

export async function setContext(name: string, ...rest: any[]) {
    commands.executeCommand("setContext", `dev-tools.plugin.${name}`, ...rest);
}
