"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clipboard_1 = require("clipboard");
function copy(text, action = "copy", el, destroy = true) {
    return new Promise((resolve, reject) => {
        const node = el || document.createElement("button");
        node.style.display = "none";
        const clipboard = new clipboard_1.default(node, {
            text: function () {
                return text;
            },
            action: function () {
                return action;
            },
        });
        clipboard.on("success", function (e) {
            destroy && clipboard.destroy();
            e.clearSelection();
            resolve(e);
        });
        clipboard.on("error", function (e) {
            destroy && clipboard.destroy();
            reject(e);
        });
        if (node) {
            document.body.appendChild(node);
            node?.click?.();
            document.body.removeChild(node);
        }
    });
}
exports.default = copy;
//# sourceMappingURL=index.js.map