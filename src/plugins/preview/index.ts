import { ViewColumn, commands, window, workspace, Uri } from "vscode";
import type { WebviewPanel, WorkspaceFolder } from "vscode";
import type { Plugin, VsocdeContext } from "@/vscode-context";
import { TreeViews, Commands } from "@/maps";
import { PreviewProvider } from "./treeView";
import i18n from "@/utils/i18n";
import fs from "fs-extra";
import path from "node:path";
import { parse } from "@/utils/svgo";
import fg from "fast-glob";

const SVG_BEGIN = "<svg>";
const SVG_END = "</svg>";

export enum FileType {
    Folder,
    SVG,
}

export interface SVGItem {
    name: string;
    fsPath: string;
    value: string;
    readonly type: FileType;
}

export interface SVGFolder {
    readonly folder: WorkspaceFolder;
    readonly name: string;
    readonly type: FileType;
    children: Array<SVGItem>;
}

interface SVGFile {
    readonly folder: WorkspaceFolder;
    children: Array<string>;
}

interface ReceiveMessageOption {
    type: "copy" | "rename";
    data: SVGItem;
}


export default <Plugin> function(app) {
    let currentPanel: WebviewPanel | undefined;
    let timer: any = null;
    let preview: PreviewProvider;
    let svgFolders: SVGFolder[] = [];

    function onSVGFileChange() {
        svgFolders = getSvgIcons(app);

        if(currentPanel) {
            if(timer) {
                clearTimeout(timer);
                timer = null;
            }
            timer = setTimeout(() => {
                currentPanel!.webview.html = renderHtml(app, svgFolders);
            }, 400);
        }
        if(preview) {
            preview.refresh(svgFolders);
        }
    }

    function onPreview() {
        const columnToShowIn = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;

        if(currentPanel) {
            currentPanel.reveal(columnToShowIn);
        } else {
            currentPanel = window.createWebviewPanel("preview", i18n.t("menu.preview.webview.title"), ViewColumn.One, {
                enableScripts: true,
            });
            currentPanel.iconPath = {
                dark: Uri.file(path.join(app.ctx.extensionPath, "resources/jetBrains/dark-icon/html.svg")),
                light: Uri.file(path.join(app.ctx.extensionPath, "resources/jetBrains/light-icon/html.svg")),
            };
            currentPanel.webview.html = renderHtml(app, svgFolders);
            currentPanel.webview.onDidReceiveMessage(async ({ type, data }: ReceiveMessageOption) => {
                if(type === "copy") {
                    await commands.executeCommand(Commands.helper_copytext, data.name);
                    window.showInformationMessage(i18n.t("prompt.clipboard.copy"));
                } else if(type === "rename") {
                    await commands.executeCommand(Commands.helper_rename, { path: data.fsPath, name: data.name });
                }
            });
            currentPanel.onDidDispose(() => {
                currentPanel = undefined;
            }, null, app.ctx.subscriptions);
        }
    }

    return {
        name: "preview",
        onConfigurationChange(e) {
            if(["dev-tools.preview.index", "dev-tools.preview.ignore"].some(s => e.affectsConfiguration(s))) {
                onSVGFileChange();
            }
        },
        install() {
            const svgFileWatcher = workspace.createFileSystemWatcher("**/*.svg");

            svgFileWatcher.onDidCreate(onSVGFileChange);
            svgFileWatcher.onDidChange(onSVGFileChange);
            svgFileWatcher.onDidDelete(onSVGFileChange);

            svgFolders = getSvgIcons(app);

            preview = new PreviewProvider(app.ctx);

            preview.refresh(svgFolders);

            const treeView = window.createTreeView(TreeViews.SvgIcon, {
                treeDataProvider: preview,
                showCollapseAll: true,
            });

            return [
                treeView,
                svgFileWatcher,
                commands.registerCommand(Commands.preview_webview, onPreview),
                commands.registerCommand(Commands.preview_rename, async ({ data }: { data: SVGItem }) => {
                    await commands.executeCommand(Commands.helper_rename, { path: data.fsPath, name: data.name });
                }),
                workspace.onDidChangeWorkspaceFolders(onSVGFileChange),
            ];
        },
    };
};

function renderHtml(app: VsocdeContext, svgList: SVGFolder[]) {
    const isShowSvgIndex = app.config.get<boolean>("preview.index");

    const html = fs.readFileSync(path.join(app.ctx.extensionPath, "preview.html"), "utf-8");
    const copy = fs.readFileSync(path.join(app.ctx.extensionPath, "resources/preview", "copy.svg"), "utf-8");
    const rename = fs.readFileSync(path.join(app.ctx.extensionPath, "resources/preview", "rename.svg"), "utf-8");
    const data: Record<string, any> = {
        title: i18n.t("menu.preview.webview.title").replace(/\.html/, ""),
        icons: "",
    };

    data.icons = svgList.reduce((pre, item) => {
        let iconItems = "";
        item.children.forEach((svg, index) => {
            const dataJson: any = Object.assign({}, svg);
            delete dataJson.value;
            iconItems += `
                <div class="icon-item" title="${svg.fsPath.substring(svg.fsPath.indexOf(item.folder.name))}" data-json='${JSON.stringify(dataJson)}'>
                    <span>
                        <i class="icon">${svg.value}</i>
                        <span class="icon-name">${svg.name}</span>
                        ${isShowSvgIndex ? `<span class="icon-index">${index + 1}</span>` : ""}
                    </span>
                    <div class="icon-item-hover">
                        <div title="${i18n.t("preview.icon.copy")}" data-click="copy"><i>${copy}</i></div>
                        <div title="${i18n.t("preview.icon.rename")}" data-click="rename"><i>${rename}</i></div>
                    </div>
                </div>
            `;
        });
        pre += `<div class="folder-item">
            <h2>${item.folder.name}</h2>
            <div class="icon-box">${iconItems}</div>
        </div>`;
        return pre;
    }, "");
    return html.replace(/{{(.+?)}}/g, (_, key: string) => {
        return data[key.trim()] || "";
    });
}

function getSvgIcons(app: VsocdeContext) {
    const folders = getSvgPath(app.config.get<null | string[]>("preview.folder"));
    const ignore = app.config.get<string[]>("preview.ignore");
    return folders.reduce<SVGFolder[]>((pre, item) => {
        const list = fg.sync(item.children.map(s => formatPath(s)), {
            ignore: ignore ? ignore.map(s => formatPath(path.join(item.folder.uri.fsPath, s))) : ignore,
        });
        pre.push({
            folder: item.folder,
            name: item.folder.name,
            type: FileType.Folder,
            children: list.map(fsPath => getSvgFile(fsPath)),
        });
        return pre;
    }, []);
}

function formatPath(value: string) {
    return path.normalize(value).replace(/\\/g, "/");
}

function getSvgPath(folders?: null | string[]) {
    const scanFiles = (workspace.workspaceFolders || []).map(item => {
        const value: SVGFile = {
            folder: item,
            children: [],
        };
        if(folders) {
            folders.forEach(s => {
                const fsPath = path.join(item.uri.fsPath, s);
                if(!fs.existsSync(fsPath)) return;
                if(fs.statSync(fsPath).isDirectory()) {
                    value.children.push(path.join(fsPath, "**/*.svg"));
                } else {
                    if(fsPath.endsWith(".svg")) {
                        value.children.push(fsPath);
                    }
                }
            });
        } else {
            value.children.push(path.join(item.uri.fsPath, "**/*.svg"));
        }
        return value;
    });
    return scanFiles;
}

function getSvgFile(fsPath: string): SVGItem {
    const file = fs.readFileSync(fsPath, "utf-8");
    const svgBody = file.substring(file.indexOf(SVG_BEGIN), file.lastIndexOf(SVG_END) + SVG_END.length);
    const name = path.parse(fsPath).name;
    const { data } = parse(svgBody, {
        name: "addAttributesToSVGElement",
        params: {
            attributes: [{ id: name }],
        },
    });
    return {
        name,
        type: FileType.SVG,
        fsPath: fsPath,
        value: data || (`<svg id="${name}" ` + svgBody.substring(4)).replace(/(width|height)=[\'\"](.+?)[\'\"]/g, ""),
    };
}
