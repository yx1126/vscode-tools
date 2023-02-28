import cliboard from "./clipboard";
import help from "./help";
import type { ExtensionModule } from "@/types";


export default <ExtensionModule> function(ctx) {
    return [
        cliboard(ctx),
        help(ctx),
    ];
};
