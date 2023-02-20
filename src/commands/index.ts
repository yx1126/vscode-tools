import cliboard from "./clipboard";
import type { ExtensionModule } from "@/types";


export default <ExtensionModule> function(ctx) {
    return [
        cliboard(ctx),
    ];
};
