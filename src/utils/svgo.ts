import svgo, { type PluginConfig, type Output } from "svgo";

export function parse(file: string, plugins: PluginConfig | PluginConfig[] = [], defaultValue = ""): Output {
    try {
        return svgo.optimize(file, {
            plugins: [
                "preset-default",
                "removeDimensions",
                "removeXMLNS",
                ...(Array.isArray(plugins) ? plugins : [plugins]),
            ],
        });
    } catch (error) {
        return { data: defaultValue };
    }
}
