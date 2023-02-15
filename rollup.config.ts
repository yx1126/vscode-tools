import { defineConfig } from "rollup";
import ts from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";

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
    ],
});
