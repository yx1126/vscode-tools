import {  window, EventEmitter, TreeItem, type TreeDataProvider, type Event, type ExtensionContext } from "vscode";
import i18n from "@/utils/i18n";
import { Commands } from "@/commands/commands";

export interface HelpItemDefine {
    label: string;
    icon: string;
    url: string;
}

export class HelpProvider implements TreeDataProvider<HelpItem> {

    ctx: ExtensionContext;
    private _onDidChangeTreeData: EventEmitter<HelpItem | undefined | null | void> = new EventEmitter<HelpItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<HelpItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(ctx: ExtensionContext) {
        this.ctx = ctx;
    }

    getTreeItem(element: HelpItem): TreeItem {
        return element;
    }

    getChildren(): Thenable<HelpItem[]> {

        const data = [
            { label: i18n.t("menu.help.star"), icon: "help-star", url: "https://github.com/yx1126/tools" },
        ].map(item => {
            return new HelpItem(item, this.ctx);
        });

        return Promise.resolve(data);
    }

    public static init(ctx: ExtensionContext) {
        const help = new HelpProvider(ctx);
        window.registerTreeDataProvider("tools.helpAndFeedback", help);
        return help;
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
            command: Commands.open_url,
            arguments: [data.url],
        };
    }
}
