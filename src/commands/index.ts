import cliboard from "./clipboard";
import help from "./help";
import explorer from "./explorer";
import type { ExtensionModule } from "@/types";


export default <ExtensionModule> function(ctx) {
    return [
        cliboard(ctx),
        help(ctx),
        explorer(ctx),
    ];
};
