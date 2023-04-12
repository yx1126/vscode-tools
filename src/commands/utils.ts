import { ExtensionModule } from "@/types";
import { commands } from "vscode";
import { Commands } from "./commands";

export async function scrollTo(lineNumber: number, at: "top" | "center" | "bottm" = "center") {
    if(typeof lineNumber !== "number") return;
    await commands.executeCommand("revealLine", { lineNumber, at });
}

export default <ExtensionModule> function() {
    return [
        commands.registerCommand(Commands.utils_scrollto, scrollTo),
    ];
};
