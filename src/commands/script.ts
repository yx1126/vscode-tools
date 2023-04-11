import { ExtensionModule } from "@/types";
import ScriptProvider from "@/tree/script";


export default <ExtensionModule> function() {
    const script = ScriptProvider.init();
    return [
        ...script.watch(),
    ];
};
