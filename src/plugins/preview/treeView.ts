import { TreeItem, type ExtensionContext, TreeItemCollapsibleState, Uri, MarkdownString } from "vscode";
import { TreeProvider } from "@/utils/provider";
import { FileType, type SVGFolder, type SVGItem } from "./index";
import { Commands } from "@/maps";

export class PreviewProvider extends TreeProvider<SVGTreeItem, SVGFolder> {

    ctx: ExtensionContext;

    constructor(ctx: ExtensionContext) {
        super();
        this.ctx = ctx;
    }

    getTreeItem(element: SVGTreeItem): TreeItem {
        return element;
    }

    getChildren(element: SVGTreeItem): Thenable<SVGTreeItem[]> {
        const dataList = element ? element.children : this.dataList.length === 1 ? this.dataList[0].children : this.dataList;
        const data = dataList.map((item, index) => {
            return new SVGTreeItem(
                item,
                index,
                this.ctx,
                item.type === FileType.Folder ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None,
            );
        });
        return Promise.resolve(data);
    }
}

class SVGTreeItem extends TreeItem {
    children: SVGItem[] = [];
    constructor(
        public readonly data: SVGFolder | SVGItem,
        public readonly index: number,
        public readonly ctx: ExtensionContext,
        public readonly collapsibleState: TreeItemCollapsibleState,
    ) {
        super(data.name);
        this.collapsibleState = collapsibleState;
        this.label = `(${index + 1}).  ${data.name}`;
        switch(data.type) {
            case FileType.Folder:
                this.children = (data as SVGFolder).children;
                this.iconPath = {
                    light: ctx.asAbsolutePath("resources/jetBrains/light-icon/folder.svg"),
                    dark: ctx.asAbsolutePath("resources/jetBrains/dark-icon/folder.svg"),
                };
                break;
            case FileType.SVG:
                this.iconPath = Uri.file((data as SVGItem).fsPath);
                const md = new MarkdownString(`<img src="${this.iconPath}" width="100" height="100" alt="${data.name}" />`);
                md.supportHtml = true;
                this.tooltip = md;
                this.command = {
                    title: this.label,
                    command: Commands.helper_copytext,
                    arguments: [data.name],
                };
                break;
            default:
                break;
        }
    }
}
