import type { Selection } from "vscode";

export interface ClipboardItem {
    label: string;
    content: string;
    filePath: string;
    selection: Selection;
};
