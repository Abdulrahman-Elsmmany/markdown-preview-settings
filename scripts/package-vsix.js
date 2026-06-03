const { mkdirSync, readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const outputPath = join("dist", `${manifest.name}-${manifest.version}.vsix`);

mkdirSync("dist", { recursive: true });

const result = spawnSync("vsce", ["package", "--out", outputPath], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
