import Config from "./config";

export default class GlobStorage<T> {
    key: string;
    constructor(key: string) {
        this.key = key;
    }
    getItem(): T | undefined {
        return Config.ctx.globalState.get(this.key) as T;
    }
    setItem(value: T) {
        Config.ctx.globalState.update(this.key, value);
    }
}
