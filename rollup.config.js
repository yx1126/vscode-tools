import { defineConfig } from "rollup";
import ts from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import alias from "@rollup/plugin-alias";
import path from "path";

export default defineConfig({
    input: "./src/extension.ts",
    output: {
        file: "./dist/extension.js",
        sourcemap: true,
        format: "cjs",
    },
    treeshake: true,
    external: [
        "vscode",
        "commonjs",
        "path",
        "fs",
    ],
    plugins: [
        ts({
            tsconfigOverride: { compilerOptions: { module: "esnext" } },
        }),
        terser(),
        resolve(),
        json(),
        commonjs(),
        alias({
            entries: [
                { find: "@", replacement: path.resolve(__dirname, "./src") },
            ],
        }),
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
