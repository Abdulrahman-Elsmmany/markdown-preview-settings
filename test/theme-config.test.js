const assert = require("node:assert/strict");
const extensionManifest = require("../package.json");
const {
  DEFAULT_THEME_ID,
  THEME_DEFINITIONS,
  getTheme,
  isManagedStylesheet,
  replaceManagedStylesheet
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
assert.deepEqual(
  extensionManifest.contributes.configuration.properties[
    "markdownPreviewThemes.selectedTheme"
  ].enum,
  THEME_DEFINITIONS.map((theme) => theme.id)
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

assert.equal(isManagedStylesheet(oldManagedStylesheet), true);
assert.equal(isManagedStylesheet(userStylesheet), false);
assert.equal(
  isManagedStylesheet("D:\\repo\\themes\\terminal.css", "D:\\repo\\themes\\terminal.css"),
  true
);

assert.deepEqual(
  replaceManagedStylesheet([userStylesheet, oldManagedStylesheet], nextManagedStylesheet),
  [userStylesheet, nextManagedStylesheet]
);
assert.deepEqual(replaceManagedStylesheet([userStylesheet], undefined), [userStylesheet]);
assert.deepEqual(
  replaceManagedStylesheet([nextManagedStylesheet], nextManagedStylesheet),
  [nextManagedStylesheet]
);

console.log("theme-config tests passed");
