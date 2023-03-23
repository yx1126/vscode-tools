import type { ExtensionContext, Disposable } from "vscode";

export interface ExtensionModule {
  (ctx: ExtensionContext, tools?: string[]): Disposable | Disposable[];
}
