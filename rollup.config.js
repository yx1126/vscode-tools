import { defineConfig } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import alias from "@rollup/plugin-alias";
import typescript from "@rollup/plugin-typescript";
import eslint from "@rollup/plugin-eslint";
import json from "@rollup/plugin-json";
import path from "path";

export default defineConfig({
    input: "./src/extension.ts",
    output: {
        file: "./out/extension.js",
        format: "cjs",
        sourcemap: true,
    },
    treeshake: true,
    external: [
        "vscode",
    ],
    plugins: [
        eslint({ fix: true }),
        typescript(),
        commonjs(),
        json(),
        alias({
            entries: [
                { find: "@", replacement: path.resolve(process.cwd(), "./src") },
            ],
        }),
        nodeResolve(),
    ],
    watch: {
        buildDelay: 1500,
        exclude: [
            "node_modules/**",
        ],
        include: [
            "locales/**",
            "src/**",
        ],
    },
});
