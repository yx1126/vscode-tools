import { type Plugin } from "@/vscode-context";
import { commands, window, workspace, type TextDocumentChangeEvent } from "vscode";
import { OutlineProvider } from "./treeView";
import { TreeViews, Commands, LocalKey } from "@/maps";
import debounce from "@/utils/debounce";
import { NodeContext } from "./node-context";
import { Local } from "@/utils/storage";
import { setContext } from "@/utils/setContext";

export default <Plugin> function() {

    const outline = new OutlineProvider();

    return {
        name: "outline",
        install(vsCtx) {
            const treeView = window.createTreeView(TreeViews.Outline, {
                treeDataProvider: outline,
                showCollapseAll: true,
            });

            const local = new Local<boolean>(vsCtx.ctx, LocalKey.Outline_vue);

            function setStateContext(state: boolean) {
                local.setItem(state);
                if(state) {
                    setContext("outline.vue.open", true);
                    setContext("outline.vue.close", false);
                } else {
                    setContext("outline.vue.open", false);
                    setContext("outline.vue.close", true);
                }
            }

            setStateContext(!!local.getItem());
            // set file languageId
            setContext("file.languageId", window?.activeTextEditor?.document.languageId === "vue");

            const nodeCtx = new NodeContext(vsCtx, local);

            nodeCtx.load(window.activeTextEditor?.document);

            nodeCtx.on((data) => {
                outline.refresh(data);
            });

            return [
                treeView,
                nodeCtx,
                window.onDidChangeActiveTextEditor((textEditor) => {
                    // set file languageId
                    setContext("file.languageId", textEditor?.document.languageId === "vue");
                    nodeCtx.clearTimer();
                    nodeCtx.fileNodes = [];
                    nodeCtx.load(textEditor?.document);
                }),
                workspace.onDidChangeTextDocument(debounce((event: TextDocumentChangeEvent) => {
                    nodeCtx.clearTimer();
                    nodeCtx.update(event.document);
                }, 500)),
                workspace.onDidChangeWorkspaceFolders(() => {
                    // set file languageId
                    setContext("file.languageId", window.activeTextEditor?.document.languageId === "vue");
                    nodeCtx.clearTimer();
                    nodeCtx.load(window.activeTextEditor?.document);
                }),
                commands.registerCommand(Commands.outline_refresh, () => {
                    nodeCtx.update(window.activeTextEditor?.document);
                }),
                commands.registerCommand(Commands.outline_vue_close, () => {
                    setStateContext(false);
                    nodeCtx.update(window.activeTextEditor?.document);
                }),
                commands.registerCommand(Commands.outline_vue_open, () => {
                    setStateContext(true);
                    nodeCtx.update(window.activeTextEditor?.document);
                }),
            ];
        },
    };
};
