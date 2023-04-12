import cliboard from "./clipboard";
import helper from "./helper";
import explorer from "./explorer";
import outline from "./outline";
import utils from "./utils";
import type { ExtensionModule } from "@/types";

export default <ExtensionModule> function(ctx) {
    return [
        cliboard(ctx),
        helper(ctx),
        explorer(ctx),
        outline(ctx),
        utils(ctx),
    ];
};
