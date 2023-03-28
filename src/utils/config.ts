import { workspace } from "vscode";

export default class Config {
    static getConfig() {
        return workspace.getConfiguration("simple-tools");
    }
    static getTools(): string [] {
        return this.getConfig().get("tools") || [];
    }
}
