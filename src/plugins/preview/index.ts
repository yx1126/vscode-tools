import { commands } from "vscode";
import { type ToolsPluginCallback } from "@/tools";
import { Commands } from "@/maps";

function onPreview() {
    console.log("preview");
}

export default <ToolsPluginCallback> function() {
    return {
        name: "preview",
        install() {
            return [
                commands.registerCommand(Commands.explorer_preview, onPreview),
            ];
        },
    };
};
