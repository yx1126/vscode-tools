import cliboard from "./clipboard";
import helper from "./helper";
import explorer from "./explorer";
import outline from "./outline";
import utils from "./utils";
import type { ExtensionModule } from "@/types";

export const enum Commands {
    clipboard_add = "tools.clipboard.add",
    clipboard_edit = "tools.clipboard.edit",
    clipboard_copytext = "tools.clipboard.copytext",
    clipboard_delete = "tools.clipboard.delete",
    clipboard_clear = "tools.clipboard.clear",
    clipboard_goto_file = "tools.clipboard.goto_file",
    help_star = "tools.help.star",
    open_url = "tools.help.open_url",
    explorer_position = "tools.explorer.position",
    outline_refresh = "tools.outline.refresh",
    outline_collapsed = "tools.outline.collapsed",
    utils_scrollto = "tools.utils.scroll_to",
}

export default <ExtensionModule> function(ctx) {
    return [
        cliboard(ctx),
        helper(ctx),
        explorer(ctx),
        outline(ctx),
        utils(ctx),
    ];
};
