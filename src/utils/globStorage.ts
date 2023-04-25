import type { ExtensionContext } from "vscode";

export default class GlobStorage<T> {
    key: string;
    ctx: ExtensionContext;
    constructor(ctx: ExtensionContext, key: string) {
        this.key = key;
        this.ctx = ctx;
    }
    getItem(): T | undefined {
        return this.ctx.globalState.get(this.key) as T;
    }
    setItem(value: T) {
        this.ctx.globalState.update(this.key, value);
    }
}
