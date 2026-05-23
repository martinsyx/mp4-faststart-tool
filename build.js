const { copyFile, mkdir, rm } = require("node:fs/promises");
const { join } = require("node:path");

const root = __dirname;
const outDir = join(root, "public");

async function build() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await copyFile(join(root, "faststart.html"), join(outDir, "index.html"));
  await copyFile(join(root, "faststart.js"), join(outDir, "faststart.js"));
}

build().catch((e) => { console.error(e); process.exitCode = 1; });
