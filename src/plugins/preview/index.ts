import { ViewColumn, commands, env, window, workspace } from "vscode";
import type { WebviewPanel, ExtensionContext, WorkspaceFolder } from "vscode";
import { type ToolsPluginCallback } from "@/tools";
import { Commands } from "@/maps";
import i18n from "@/utils/i18n";
import fs from "fs-extra";
import path from "node:path";
import { Tools } from "@/tools";
import svgo from "svgo";

interface SVGItem {
    folder: WorkspaceFolder;
    list: Array<{ name: string; path: string; fsPath: string; value: string }>;
}

function readFile(fsPath: string, basePath: string) {
    const result: SVGItem["list"] = [];
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
                try {
                    const { data } = svgo.optimize(svgBody, {
                        plugins: [
                            "removeDimensions",
                            "removeXMLNS",
                            {
                                name: "addAttributesToSVGElement",
                                params: {
                                    attributes: [{ id: name }],
                                },
                            },
                        ],
                    });
                    value.value = data;
                } catch (error) {
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
    const data: Record<string, any> = {
        title: i18n.t("menu.explorer.preview.title"),
        symbols: "",
        icons: "",
    };
    const svgList = (workspace.workspaceFolders || []).reduce<SVGItem[]>((pre, item) => {
        pre.push({ folder: item, list: readFile(item.uri.fsPath, item.name) });
        return pre;
    }, []);
    const { svgChild, icons } = svgList.reduce((pre, item) => {
        let iconItems = "";
        let symbols = "";
        item.list.forEach((v) => {
            symbols += `<symbol ${v.value.substring(v.value.indexOf("<svg") + 4, v.value.lastIndexOf("</svg>"))}</symbol>`;
            iconItems += `
                <div class="icon-item" title="${v.path}" data-name="${v.name}">
                    <span>
                        <i class="icon">
                            <svg aria-hidden="true"><use xlink:href="#${v.name}"></use></svg>
                        </i>
                        <span class="icon-name">${v.name}</span>
                    </span>
                </div>
            `;
        });
        pre.icons += `<div class="folder-item">
            <h2>${item.folder.name}</h2>
            <div class="icon-box">${iconItems}</div>
        </div>`;
        pre.svgChild += symbols;
        return pre;
    }, { svgChild: "", icons: "" });
    data.symbols = svgChild;
    data.icons = icons;
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
    panel.webview.onDidReceiveMessage((name: string) => {
        env.clipboard.writeText(name);
        window.showInformationMessage(i18n.t("prompt.clipboard.copy"));
    });
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
