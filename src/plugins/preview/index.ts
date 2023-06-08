import { FileSystemWatcher, ViewColumn, commands, env, window, workspace } from "vscode";
import type { WebviewPanel, ExtensionContext, WorkspaceFolder } from "vscode";
import { type ToolsPluginCallback } from "@/tools";
import { Commands } from "@/maps";
import i18n from "@/utils/i18n";
import fs from "fs-extra";
import path from "node:path";
import { Tools } from "@/tools";
import { formatSVG } from "@/utils//svgo";
import { Uri } from "vscode";

interface SVGItem {
    name: string;
    path: string;
    fsPath: string;
    value: string;
}

interface SVGFolder {
    folder: WorkspaceFolder;
    list: Array<SVGItem>;
}

interface ReceiveMessageOption {
    type: "copy" | "rename";
    data: Omit<SVGItem, "value">;
}

function readFile(fsPath: string, basePath: string) {
    const result: SVGFolder["list"] = [];
    function start(_fsPath: string, _path: string) {
        if(fs.statSync(_fsPath).isDirectory()) {
            const list = fs.readdirSync(_fsPath);
            for(let i = 0; i < list.length; i++) {
                const filename = list[i];
                if(["node_modules", "scripts", "dist", ".vscode", ".idea"].includes(filename)) {
                    continue;
                } else {
                    start(path.join(_fsPath, filename), path.join(_path, filename));
                }
            }
        } else {
            const { ext, name } = path.parse(_fsPath);
            if(ext === ".svg") {
                const file = fs.readFileSync(_fsPath, "utf-8");
                const svgBody = file.substring(file.indexOf("<svg"), file.lastIndexOf("</svg>") + 6);
                const value = {
                    name,
                    path: _path,
                    fsPath: _fsPath,
                    value: "",
                };
                const { data } = formatSVG(svgBody, {
                    name: "addAttributesToSVGElement",
                    params: {
                        attributes: [{ id: name }],
                    },
                });
                if(data) {
                    value.value = data;
                } else {
                    value.value = (`<svg id="${name}" ` + svgBody.substring(4)).replace(/(width|height)=(\'|\")(.+?)(\'|\")/g, "");
                }
                result.push(value);
            }
        }
    }
    start(fsPath, basePath);
    return result;
}

function createHTML(ctx: ExtensionContext) {
    const html = fs.readFileSync(path.join(ctx.extensionPath, "preview.html"), "utf-8");
    const copy = fs.readFileSync(path.join(ctx.extensionPath, "resources/preview", "copy.svg"), "utf-8");
    const rename = fs.readFileSync(path.join(ctx.extensionPath, "resources/preview", "rename.svg"), "utf-8");
    const data: Record<string, any> = {
        title: i18n.t("menu.explorer.preview.title"),
        icons: "",
    };
    const svgList = (workspace.workspaceFolders || []).reduce<SVGFolder[]>((pre, item) => {
        pre.push({ folder: item, list: readFile(item.uri.fsPath, item.name) });
        return pre;
    }, []);
    data.icons = svgList.reduce((pre, item) => {
        let iconItems = "";
        item.list.forEach((svg) => {
            const dataJson: any = Object.assign({}, svg);
            delete dataJson.value;
            iconItems += `
                <div class="icon-item" title="${svg.path}" data-json='${JSON.stringify(dataJson)}'>
                    <span>
                        <i class="icon">${svg.value}</i>
                        <span class="icon-name">${svg.name}</span>
                    </span>
                    <div class="icon-item-hover">
                        <div title="${i18n.t("preview.icon.copy")}" data-click="copy"><i>${formatSVG(copy).data}</i></div>
                        <div title="${i18n.t("preview.icon.rename")}" data-click="rename"><i>${formatSVG(rename).data}</i></div>
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
    panel.webview.html = createHTML(app.ctx);
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
                    panel.webview.html = createHTML(app.ctx);
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
            currentPanel!.webview.html = createHTML(app.ctx);
        }, 400);
    }

    return {
        name: "preview",
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
