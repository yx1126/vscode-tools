module.exports = {
    root: true,
    extends: ["@yx1126/eslint-config"],
    ignorePatterns: [
        "out",
        "dist",
        "**/*.d.ts",
    ],
    rules: {
        "no-case-declarations": "off",
    },
};
