import { defineConfig } from "rollup";
import ts from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import eslint from "@rollup/plugin-eslint";
import alias from "@rollup/plugin-alias";
import path from "path";

export default defineConfig({
    input: "./src/extension.ts",
    output: {
        file: "./dist/extension.js",
        sourcemap: true,
        format: "commonjs",
    },
    treeshake: true,
    external: [
        "vscode",
    ],
    plugins: [
        ts(),
        terser(),
        resolve(),
        json(),
        commonjs(),
        alias({
            entries: [
                { find: "@", replacement: path.resolve(__dirname, "./src") },
            ],
        }),
        eslint({
            fix: true,
            throwOnError: true,
            throwOnWarning: true,
            exclude: [
                "node_modules/**",
            ],
            include: [
                "src/**",
                "*.json",
                "rollup.config.ts",
            ],
        }),
    ],
    watch: {
        buildDelay: 1500,
        exclude: [
            "node_modules/**",
        ],
        include: [
            "src/**",
        ],
    },
});
