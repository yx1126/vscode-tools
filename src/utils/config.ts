import { workspace, commands, ExtensionContext, type ConfigurationChangeEvent, type Disposable, type DocumentSymbol, type TextDocument } from "vscode";
import debounce from "./debounce";

// plugins simple-tools.plugin.${SIMPLE_TOOLS_PLUGINS}
export const SIMPLE_TOOLS_PLUGINS = ["clipboard", "location", "outline"];

// simpie-tools config key
const CONFIG_KEY = "simple-tools";

// clipboard store key
export const CLIPBOARD_STORE_KEY = "clipboardKeys";

export default class Config {

    static ctx: ExtensionContext;

    static onSettingChangeFn: Array<(e: ConfigurationChangeEvent) => void> = [];

    static init(context: ExtensionContext) {
        this.ctx = context;
        this.initPlugins();
        this.initAuxiliaryBar();
        this.onSettingChangeFn.push((e) => {
            if(e.affectsConfiguration("simple-tools.tools")) {
                this.initPlugins();
            }
        });
    }

    static watch() {
        const result: Disposable[] = [];
        if(this.onSettingChangeFn.length > 0) {
            result.push(
                workspace.onDidChangeConfiguration(debounce((e: ConfigurationChangeEvent) => {
                    this.onSettingChangeFn.forEach(fn => fn(e));
                }, 300))
            );
        }
        return result;
    }

    static initPlugins() {
        const tools = this.getTools();

        SIMPLE_TOOLS_PLUGINS.forEach(plugin => {
            const flag = !tools || (tools && tools.includes(plugin));
            commands.executeCommand("setContext", `simple-tools.plugin.${plugin}`, flag);
        });
    }

    // 获取配置
    static getConfig() {
        return workspace.getConfiguration(CONFIG_KEY);
    }

    static getOutlineModules() {
        return this.getConfig().get<string[]>("outline.modules") || [];
    }

    static getScriptDefault() {
        return this.getConfig().get<boolean>("outline.script.default");
    }

    static getExpandDeep() {
        return this.getConfig().get<number | Record<string, number>>("outline.expand") || 0;
    }

    // 获取默认功能配合着
    static getTools() {
        return this.getConfig().get<string[] | null>("tools");
    }

    // 切换辅助侧栏
    static async initAuxiliaryBar() {
        const isShow = !!this.getConfig().get("openAuxiliaryBar");
        if(isShow) {
            this.openAuxiliaryBar();
        }
    }

    // 打开辅助侧栏
    static async openAuxiliaryBar() {
        await commands.executeCommand("workbench.action.focusAuxiliaryBar");
    }

    // 关闭辅助侧栏
    static async closeAuxiliaryBar() {
        await commands.executeCommand("workbench.action.closeAuxiliaryBar");
    }
}


export interface NodeOptions {
    root?: number;
    parentPath?: [];
    deep: number;
    rootName: string;
    lang: string;
    language: string;
    document?: TextDocument;
}

export type FileNodes = NodeOptions & DocumentSymbol;

export const langRe = new RegExp(/lang=(\"|\')(.*?)(\"|\')/);
export const TEMPLATE_MAP = ["template"];
export const SCRIUPT_MAP = ["script", "script setup"];
export const STYLE_MAP = ["style", "style scoped"];
export const SCRIPU_PROPS = ["props", "data", "methods", "computed", "watch", "provide", "inject"];


export function getFileNodes(nodes: FileNodes[], options?: NodeOptions) {
    const { document, language } = options || { deep: 1, rootName: "", lang: "" };

    if(!document) return [];
    return nodes.map(node => {
        node.deep = 1;
        const langList = document.lineAt(node.range.start.line).text.match(langRe);
        if(langList) {
            node.lang = langList[2];
        }
        if(language) {
            node.language = language || node.lang || TEMPLATE_MAP.includes(node.name)
                ? "html"
                : STYLE_MAP.includes(node.name)
                    ? "css"
                    : SCRIUPT_MAP.includes(node.name)
                        ? "javascript"
                        : "";
        }

        return node;
    });
}

