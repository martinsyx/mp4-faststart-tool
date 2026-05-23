const { copyFile, mkdir, rm } = require("node:fs/promises");
const { join } = require("node:path");

const root = __dirname;
const outDir = join(root, "public");
const files = ["faststart.html", "faststart.js"];

async function build() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await Promise.all(files.map((f) => copyFile(join(root, f), join(outDir, f))));
}

build().catch((e) => { console.error(e); process.exitCode = 1; });
