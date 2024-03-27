export enum LocalKey {
    Outline_vue = "dev-tools.local.outline.vue",
    Clipboard = "dev-tools.local.clipboard",
}

export enum TreeViews {
    Cliboard = "dev-tools.treeViews.clipboard",
    HelpAndFeedback = "dev-tools.treeViews.helpAndFeedback",
    SvgIcon = "dev-tools.treeViews.svg",
    Outline = "dev-tools.treeViews.outline",
}

export enum Commands {
    // clipboard
    clipboard_add = "dev-tools.commands.clipboard.add",
    clipboard_edit = "dev-tools.commands.clipboard.edit",
    clipboard_delete = "dev-tools.commands.clipboard.delete",
    clipboard_clear = "dev-tools.commands.clipboard.clear",
    clipboard_goto_file = "dev-tools.commands.clipboard.goto_file",

    // location
    location_position = "dev-tools.commands.location.position",

    // outline
    outline_refresh = "dev-tools.commands.outline.refresh",
    outline_vue_open = "dev-tools.commands.outline.show_vue_modules_open",
    outline_vue_close = "dev-tools.commands.outline.show_vue_modules_close",
    outline_collapsed = "dev-tools.commands.outline.collapsed",

    // preview
    preview_webview = "dev-tools.commands.preview.webview",
    preview_rename = "dev-tools.commands.preview.rename",

    // helper
    helper_open_url = "dev-tools.commands.helper.open_url",
    helper_scrollTo = "dev-tools.commands.helper.scroll_to",
    helper_copytext = "dev-tools.commands.helper.copytext",
    helper_rename = "dev-tools.commands.helper.rename",
    helper_position = "dev-tools.commands.helper.position",
}
