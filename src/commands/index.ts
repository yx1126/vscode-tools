import cliboard from "./clipboard";
import helper from "./helper";
import explorer from "./explorer";
import type { ExtensionModule } from "@/types";

export default <ExtensionModule> function(ctx) {
    return [
        cliboard(ctx),
        helper(ctx),
        explorer(ctx),
    ];
};
