import {  window, EventEmitter, TreeItem, type TreeDataProvider, type Event } from "vscode";
import i18n from "@/utils/i18n";
import { Commands } from "@/commands/commands";

export interface HelpItemDefine {
    label: string;
    icon: string;
    url: string;
}

export class HelpProvider implements TreeDataProvider<HelpItem> {


    private _onDidChangeTreeData: EventEmitter<HelpItem | undefined | null | void> = new EventEmitter<HelpItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<HelpItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {}

    getTreeItem(element: HelpItem): TreeItem {
        return element;
    }

    getChildren(): Thenable<HelpItem[]> {

        const data = [
            { label: i18n.t("menu.help.star"), icon: "$(extensions-star-full)", url: "https://github.com/yx1126/shear-plate" },
        ].map(item => {
            return new HelpItem(item);
        });

        return Promise.resolve(data);
    }

    public static init() {
        const help = new HelpProvider();
        window.registerTreeDataProvider("shear-plate.helpAndFeedback", help);
        return help;
    }
}

class HelpItem extends TreeItem {

    constructor(
        public readonly data: HelpItemDefine,
    ) {
        super(data.label);
        this.label = data.label;
        this.tooltip = data.label;
        this.iconPath = data.icon;
        this.command = {
            title: data.label,
            command: Commands.open_url,
            arguments: [data.url],
        };
    }
}
