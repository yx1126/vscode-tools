import { ViewColumn, commands, window, workspace } from "vscode";
import type {  WebviewPanel, ExtensionContext, WorkspaceFolder } from "vscode";
import { type ToolsPluginCallback } from "@/tools";
import { Commands } from "@/maps";
import i18n from "@/utils/i18n";
import fs from "fs-extra";
import path from "node:path";
import { Tools } from "@/tools";

interface SVGItem {
    folder: WorkspaceFolder;
    list: Array<{ name: string; path: string; value: string }>;
}

function readFile(fsPath: string) {
    const result: SVGItem["list"] = [];

    function start(_path: string) {
        if(fs.statSync(_path).isDirectory()) {
            const list = fs.readdirSync(_path);
            for(let i = 0; i < list.length; i++) {
                const filename = list[i];
                if(["node_modules"].includes(filename)) {
                    continue;
                } else {
                    start(path.join(_path, filename));
                }
            }
        } else {
            const { ext, name } = path.parse(_path);
            if(ext === ".svg") {
                const file = fs.readFileSync(_path, "utf-8");
                result.push({
                    name,
                    path: _path,
                    value: file.toString().replace(/(width|height)=(\'|\")(.+?)(\'|\")/g, ""),
                });
            }
        }
    }
    start(fsPath);
    return result;
}

function createHTML(ctx: ExtensionContext) {
    const html = fs.readFileSync(path.join(ctx.extensionPath, "src/plugins/preview", "index.html"), "utf-8");
    const data: Record<string, any> = {
        title: i18n.t("menu.explorer.preview.title"),
    };
    return html.replace(/{{(.+?)}}/g, (_, key: string) => {
        return data[key.trim()] || "";
    });
}


function onPreview(app: Tools) {
    const panel = window.createWebviewPanel("preview", i18n.t("menu.explorer.preview.title"), ViewColumn.One, {
        enableScripts: true,
    });
    const page = createHTML(app.ctx);
    panel.webview.html = page;
    const svgList = (workspace.workspaceFolders || []).reduce<SVGItem[]>((pre, item) => {
        pre.push({ folder: item, list: readFile(item.uri.fsPath) });
        return pre;
    }, []);
    panel.webview.postMessage(svgList);
    return panel;
}

export default <ToolsPluginCallback> function(app) {
    let currentPanel: WebviewPanel | undefined = undefined;
    return {
        name: "preview",
        install() {
            return [
                commands.registerCommand(Commands.explorer_preview, () => {
                    const columnToShowIn = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;
                    if(currentPanel) {
                        currentPanel.reveal(columnToShowIn);
                    } else {
                        currentPanel = onPreview(app);
                        currentPanel.onDidDispose(() => {
                            currentPanel = undefined;
                        }, null, app.ctx.subscriptions);
                    }
                }),
            ];
        },
    };
};
