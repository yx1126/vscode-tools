import { defineEslint } from "@yx1126/eslint-config";

export default defineEslint({
    yaml: true,
    jsonc: true,
    deprecated: true,
    package: true,
    typescript: {
        parserOptions: {
            EXPERIMENTAL_useProjectService: true
        }
    },
    flatESLintConfig: [
        {
            ignores: ["**/out"]
        },
        {
            rules: {
                "@typescript-eslint/no-unsafe-enum-comparison": "off"
            }
        }
    ]
});
