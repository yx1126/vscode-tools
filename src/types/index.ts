import type { Selection, ExtensionContext, Disposable } from "vscode";

export interface ExtensionModule {
  (ctx: ExtensionContext): Disposable | Disposable[];
}


export interface ClipboardItem {
    label: string;
    content: string;
    filePath: string;
    selection: Selection;
};
