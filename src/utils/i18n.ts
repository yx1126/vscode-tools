import { env } from "vscode";
import fs from "fs-extra";
import path from "path";


/**
 *  @see https://github.com/lokalise/i18n-ally/blob/main/src/i18n.ts
 */
class i18n {
    static messages: Record<string, string> = {};
    static language: string = env.language.toLowerCase();

    static init(extensionPath: string) {
        let name = this.language === "en" ? "package.nls.json" : `package.nls.${this.language}.json`;
        if(!fs.existsSync(path.join(extensionPath, name))) {
            name = "package.nls.json";
        }; // locale not exist, fallback to English

        this.messages = JSON.parse(fs.readFileSync(path.join(extensionPath, name), "utf-8"));
    }

    static format(str: string, args: any[]) {
        return str.replace(/{(\d+)}/g, (match, number) => {
          return typeof args[number] !== "undefined"
            ? args[number].toString()
            : match;
        });
    }

    static t(key: string, ...args: any[]) {
        let text = this.messages[key] || "";

        if(args && args.length) {
            text = this.format(text, args);
        };

        return text;
    }
}

export default i18n;
