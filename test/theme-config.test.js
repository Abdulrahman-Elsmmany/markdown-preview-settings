const assert = require("node:assert/strict");
const extensionManifest = require("../package.json");
const {
  DEFAULT_PAGE_LAYOUT_ID,
  DEFAULT_THEME_ID,
  PAGE_LAYOUT_DEFINITIONS,
  THEME_DEFINITIONS,
  getPageLayout,
  getTheme,
  isManagedLayoutStylesheet,
  isManagedStylesheet,
  replaceManagedLayoutStylesheet,
  replaceManagedStylesheet,
  replaceManagedThemeStylesheet
} = require("../lib/theme-config");

assert.equal(DEFAULT_THEME_ID, "vera");
assert.deepEqual(
  THEME_DEFINITIONS.map((theme) => theme.id),
  [
    "vera",
    "linen",
    "terminal",
    "blueprint",
    "bauhaus",
    "nocturne",
    "forest",
    "graphite",
    "synthwave",
    "ember",
    "abyss",
    "rosewood",
    "cathedral",
    "aurora",
    "inkstone"
  ]
);
assert.equal(getTheme("blueprint").stylesheet, "themes/blueprint.css");
assert.equal(getTheme("ember").stylesheet, "themes/ember.css");
assert.equal(getTheme("inkstone").stylesheet, "themes/inkstone.css");
assert.equal(getTheme("missing"), undefined);

assert.equal(DEFAULT_PAGE_LAYOUT_ID, "centered");
assert.deepEqual(
  PAGE_LAYOUT_DEFINITIONS.map((layout) => layout.id),
  ["centered", "fullWidth"]
);
assert.equal(getPageLayout("centered").stylesheet, undefined);
assert.equal(getPageLayout("fullWidth").stylesheet, "layouts/full-width.css");
assert.equal(getPageLayout("missing"), undefined);
assert.deepEqual(
  extensionManifest.contributes.configuration.properties[
    "markdownPreviewThemes.selectedTheme"
  ].enum,
  THEME_DEFINITIONS.map((theme) => theme.id)
);
assert.deepEqual(
  extensionManifest.contributes.configuration.properties[
    "markdownPreviewThemes.pageLayout"
  ].enum,
  PAGE_LAYOUT_DEFINITIONS.map((layout) => layout.id)
);
assert.equal(
  extensionManifest.activationEvents.includes("onCommand:markdownPreviewThemes.selectPageLayout"),
  true
);
assert.equal(
  extensionManifest.contributes.commands.some(
    (command) => command.command === "markdownPreviewThemes.selectPageLayout"
  ),
  true
);
assert.deepEqual(extensionManifest.contributes["markdown.previewScripts"], ["./preview-tools.js"]);
assert.deepEqual(extensionManifest.contributes["markdown.previewStyles"], [
  "./markdown-preview-vera.css",
  "./preview-tools.css"
]);

const userStylesheet = "https://example.com/custom.css";
const oldManagedStylesheet =
  "C:\\Users\\dev\\.vscode\\extensions\\abdulrahman-elsmmany.markdown-preview-themes-0.0.9\\themes\\linen.css";
const nextManagedStylesheet =
  "C:\\Users\\dev\\.vscode\\extensions\\abdulrahman-elsmmany.markdown-preview-themes-0.1.0\\themes\\blueprint.css";
const oldManagedLayoutStylesheet =
  "C:\\Users\\dev\\.vscode\\extensions\\abdulrahman-elsmmany.markdown-preview-themes-0.0.9\\layouts\\full-width.css";
const nextManagedLayoutStylesheet =
  "C:\\Users\\dev\\.vscode\\extensions\\abdulrahman-elsmmany.markdown-preview-themes-0.1.0\\layouts\\full-width.css";

assert.equal(isManagedStylesheet(oldManagedStylesheet), true);
assert.equal(isManagedStylesheet(userStylesheet), false);
assert.equal(isManagedLayoutStylesheet(oldManagedLayoutStylesheet), true);
assert.equal(isManagedLayoutStylesheet(userStylesheet), false);
assert.equal(
  isManagedStylesheet("D:\\repo\\themes\\terminal.css", "D:\\repo\\themes\\terminal.css"),
  true
);

assert.deepEqual(
  replaceManagedStylesheet([userStylesheet, oldManagedStylesheet], nextManagedStylesheet),
  [userStylesheet, nextManagedStylesheet]
);
assert.deepEqual(
  replaceManagedThemeStylesheet(
    [userStylesheet, oldManagedStylesheet],
    nextManagedStylesheet,
    oldManagedStylesheet
  ),
  [userStylesheet, nextManagedStylesheet]
);
assert.deepEqual(replaceManagedStylesheet([userStylesheet], undefined), [userStylesheet]);
assert.deepEqual(
  replaceManagedStylesheet([nextManagedStylesheet], nextManagedStylesheet),
  [nextManagedStylesheet]
);
assert.deepEqual(
  replaceManagedLayoutStylesheet(
    [userStylesheet, oldManagedLayoutStylesheet],
    nextManagedLayoutStylesheet
  ),
  [userStylesheet, nextManagedLayoutStylesheet]
);
assert.deepEqual(
  replaceManagedLayoutStylesheet([userStylesheet, oldManagedLayoutStylesheet], undefined),
  [userStylesheet]
);
assert.deepEqual(
  replaceManagedLayoutStylesheet(
    replaceManagedThemeStylesheet(
      [userStylesheet, oldManagedStylesheet, oldManagedLayoutStylesheet],
      nextManagedStylesheet,
      oldManagedStylesheet
    ),
    nextManagedLayoutStylesheet,
    oldManagedLayoutStylesheet
  ),
  [userStylesheet, nextManagedStylesheet, nextManagedLayoutStylesheet]
);

console.log("theme-config tests passed");
