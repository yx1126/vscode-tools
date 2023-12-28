import { TreeItem, type ExtensionContext } from "vscode";
import { TreeProvider } from "@/utils/provider";
import i18n from "@/utils/i18n";
import { Commands } from "@/maps";

export interface HelpItemDefine {
    label: string;
    icon: string;
    url: string;
}

export class HelperProvider extends TreeProvider<HelpItem, HelpItemDefine> {

    ctx: ExtensionContext;

    constructor(ctx: ExtensionContext) {
        super();
        this.ctx = ctx;
    }

    getTreeItem(element: HelpItem): TreeItem {
        return element;
    }

    getChildren(): Thenable<HelpItem[]> {

        const data = [
            { label: i18n.t("menu.help.star"), icon: "help-star", url: "https://github.com/yx1126/vscode-tools" },
        ].map(item => {
            return new HelpItem(item, this.ctx);
        });

        return Promise.resolve(data);
    }
}

class HelpItem extends TreeItem {

    constructor(
        public readonly data: HelpItemDefine,
        public readonly ctx: ExtensionContext,
    ) {
        super(data.label);
        this.label = data.label;
        this.tooltip = data.label;
        this.iconPath = {
            light: ctx.asAbsolutePath(`resources/light/${data.icon}.svg`),
            dark: ctx.asAbsolutePath(`resources/dark/${data.icon}.svg`),
        };
        this.command = {
            title: data.label,
            command: Commands.helper_open_url,
            arguments: [data.url],
        };
    }
}
