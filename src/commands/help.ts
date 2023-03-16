import { HelpProvider } from "@/tree/help";
import { ExtensionModule } from "@/types";
import { commands, env, type ExtensionContext, Uri } from "vscode";
import { Commands } from "./commands";

export async function onOpenUrl(url: string) {
    await env.openExternal(Uri.parse(url));
}

export default <ExtensionModule> function(ctx: ExtensionContext) {
    HelpProvider.init(ctx);
    return [
        commands.registerCommand(Commands.open_url, onOpenUrl),
    ];
};
