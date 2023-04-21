import type { ExtensionContext, Disposable } from "vscode";

export interface ToolsPlugin {
    name: string;
    install: (ctx: ExtensionContext) => Disposable[];
}

class Tools {

    ctx: ExtensionContext;

    plugins: [] = [];

    constructor(ctx: ExtensionContext) {
        this.ctx = ctx;
    }

    use(plugin: ToolsPlugin | ToolsPlugin[]) {
        const plugins = Array.isArray(plugin) ? plugin : [plugin];
        plugins.forEach(p => {
            const index = this.plugins
        });
    }
}


export default Tools;
