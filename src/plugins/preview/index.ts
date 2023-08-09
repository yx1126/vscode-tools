import type Tools from "@/tools";
import type { WebviewPanel, WorkspaceFolder } from "vscode";
import { type ToolsPluginCallback } from "@/tools";
import { FileSystemWatcher, ViewColumn, commands, env, window, workspace } from "vscode";
import { Commands } from "@/maps";
import i18n from "@/utils/i18n";
import fs from "fs-extra";
import path from "node:path";
import { Uri } from "vscode";
import { formatSVG } from "@/utils/svgo";
import fg from "fast-glob";

const SVG_BEGIN = "<svg>";
const SVG_END = "</svg>";

interface SVGItem {
    name: string;
    fsPath: string;
    value: string;
}

interface SVGFolder {
    readonly folder: WorkspaceFolder;
    list: Array<SVGItem>;
}

interface SVGFile {
    readonly folder: WorkspaceFolder;
    list: Array<string>;
}

interface ReceiveMessageOption {
    type: "copy" | "rename";
    data: Omit<SVGItem, "value">;
}

export function getSvgPath(folders?: null | string[]) {
    const scanFiles = (workspace.workspaceFolders || []).map(item => {
        const value: SVGFile = {
            folder: item,
            list: [],
        };
        if(folders) {
            folders.forEach(s => {
                const fsPath = path.join(item.uri.fsPath, s);
                if(!fs.existsSync(fsPath)) return;
                if(fs.statSync(fsPath).isDirectory()) {
                    value.list.push(path.join(fsPath, "**/*.svg"));
                } else {
                    if(fsPath.endsWith(".svg")) {
                        value.list.push(fsPath);
                    }
                }
            });
        } else {
            value.list.push(path.join(item.uri.fsPath, "**/*.svg"));
        }
        return value;
    });
    return scanFiles;
}

function getSvgFile(fsPath: string) {
    const file = fs.readFileSync(fsPath, "utf-8");
    const svgBody = file.substring(file.indexOf(SVG_BEGIN), file.lastIndexOf(SVG_END) + SVG_END.length);
    const svgitem: SVGItem = {
        name: path.parse(fsPath).name,
        fsPath: fsPath,
        value: "",
    };
    const { data } = formatSVG(svgBody, {
        name: "addAttributesToSVGElement",
        params: {
            attributes: [{ id: svgitem.name }],
        },
    });
    if(data) {
        svgitem.value = data;
    } else {
        svgitem.value = (`<svg id="${svgitem.name}" ` + svgBody.substring(4)).replace(/(width|height)=[\'\"](.+?)[\'\"]/g, "");
    }
    return svgitem;
}


function formatPath(value: string) {
    return path.normalize(value).replace(/\\/g, "/");
}

function createHTML(app: Tools) {
    const folders = getSvgPath(app.config.get<null | string[]>("preview.folder"));
    const isShowSvgIndex = app.config.get<boolean>("preview.index");
    const ignore = app.config.get<string[]>("preview.ignore");
    const svgList = folders.reduce<SVGFolder[]>((pre, item) => {
        const list = fg.sync(item.list.map(s => formatPath(s)), {
            ignore: ignore ? ignore.map(s => formatPath(path.join(item.folder.uri.fsPath, s))) : ignore,
        });
        pre.push({
            folder: item.folder,
            list: list.map(fsPath => getSvgFile(fsPath)),
        });
        return pre;
    }, []);

    const html = fs.readFileSync(path.join(app.ctx.extensionPath, "preview.html"), "utf-8");
    const copy = fs.readFileSync(path.join(app.ctx.extensionPath, "resources/preview", "copy.svg"), "utf-8");
    const rename = fs.readFileSync(path.join(app.ctx.extensionPath, "resources/preview", "rename.svg"), "utf-8");
    const data: Record<string, any> = {
        title: i18n.t("menu.explorer.preview.title"),
        icons: "",
    };

    data.icons = svgList.reduce((pre, item) => {
        let iconItems = "";
        item.list.forEach((svg, index) => {
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


function onPreview(app: Tools) {
    const panel = window.createWebviewPanel("preview", i18n.t("menu.explorer.preview.title"), ViewColumn.One, {
        enableScripts: true,
    });

    panel.webview.html = createHTML(app);
    panel.webview.onDidReceiveMessage(async ({ type, data }: ReceiveMessageOption) => {
        if(type === "copy") {
            env.clipboard.writeText(data.name);
            window.showInformationMessage(i18n.t("prompt.clipboard.copy"));
        } else if(type === "rename") {
            const input = await window.showInputBox({
                placeHolder: i18n.t("prompt.preview.treeinput.placeholder"),
                value: data.name,
            });
            if(input && (input !== data.name)) {
                try {
                    const pathConfig = path.parse(data.fsPath);
                    const fsPath = path.format({ ...pathConfig, name: input, base: input + ".svg" });
                    await workspace.fs.rename(Uri.file(data.fsPath), Uri.file(fsPath));
                    panel.webview.html = createHTML(app);
                } catch (error) {
                    window.showErrorMessage(String(error));
                }
            }
        }
    });
    return panel;
}

export default <ToolsPluginCallback> function(app) {
    let currentPanel: WebviewPanel | undefined = undefined;
    let svgFileWatcher: FileSystemWatcher | undefined;
    let timer: any = null;

    function onSVGChange() {
        if(!currentPanel) return;
        if(timer) {
            clearTimeout(timer);
            timer = null;
        }
        timer = setTimeout(() => {
            currentPanel!.webview.html = createHTML(app);
        }, 400);
    }

    return {
        name: "preview",
        onDidChangeConfiguration(e) {
            if(["vue-tools.preview.index", "vue-tools.preview.ignore"].some(s => e.affectsConfiguration(s))) {
                onSVGChange();
            }
        },
        install() {
            return [
                commands.registerCommand(Commands.explorer_preview, () => {
                    const columnToShowIn = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;

                    if(!svgFileWatcher) {
                        svgFileWatcher = workspace.createFileSystemWatcher("**/*.svg");

                        svgFileWatcher.onDidCreate(onSVGChange);
                        svgFileWatcher.onDidChange(onSVGChange);
                        svgFileWatcher.onDidDelete(onSVGChange);
                    }

                    if(currentPanel) {
                        currentPanel.reveal(columnToShowIn);
                    } else {
                        currentPanel = onPreview(app);
                        currentPanel.onDidDispose(() => {
                            currentPanel = undefined;
                            if(svgFileWatcher) {
                                svgFileWatcher.dispose();
                                svgFileWatcher = undefined;
                            }
                        }, null, app.ctx.subscriptions);
                    }
                }),
            ];
        },
    };
};
