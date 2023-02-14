import path from "path";
import * as fs from "fs-extra";
import fg from "fast-glob";

const DEFAULT_LOCAL = "en";

(async () => {
    const fallbackMessages  = JSON.parse(await fs.readFile(`./locales/${DEFAULT_LOCAL}.json`, "utf-8"));

    const files =  await fg("./locales/*.json");
    files.forEach(async file => {
        const { name: local } = path.parse(file);
        const fileMessages = JSON.parse(await fs.readFile(`./locales/${local}.json`, "utf-8"));
        Object.keys(fallbackMessages).forEach(key => {
            fileMessages[key] = fileMessages[key] || fallbackMessages[key];
        });
        const output = DEFAULT_LOCAL === local ? "./package.nls.json" : `./package.nls.${local.toLowerCase()}.json`;
        await fs.writeFile(output, JSON.stringify(fileMessages, null, 4), "utf-8");
    });
})();
