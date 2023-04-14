
import { commands, window } from "vscode";
import type { DocumentSymbol, TextDocument } from "vscode";

export interface HTMLNode extends DocumentSymbol {
    children: HTMLNode[];
}

export default class AttrsEllipsis {

    document?: TextDocument;
    htmlNodes: HTMLNode[] = [];
    timer: any = null;


    watch() {

    }

    async update(document?: TextDocument) {
        this.document = document;
        this.htmlNodes = await this.getNodes(document);
    }

    async getNodes(document?: TextDocument) {
        try {
            if(!document || document.languageId !== "vue") return [];
            const nodes = await commands.executeCommand<HTMLNode[]>("vscode.executeDocumentSymbolProvider", document.uri) || [];
            if(!nodes) return [];

            return nodes;
        } catch (error) {
            return [];
        }
    }

    clearTimer() {
        if(this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async load(document = window.activeTextEditor?.document) {
        if(!document || document.languageId !== "vue") return;
        let index = 0;
        this.timer = setInterval(() => {
            index = index + 1;
            if(index >= 10 || this.htmlNodes.length > 0) {
                this.clearTimer();
                return;
            }

        }, 300);
    }

    static async init() {
        // const attrs = new AttrsEllipsis();
    }
}
