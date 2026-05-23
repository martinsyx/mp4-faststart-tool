const { copyFile, mkdir, rm, writeFile } = require("node:fs/promises");
const { join } = require("node:path");

const root = __dirname;
const outputDir = join(root, ".vercel", "output");
const staticDir = join(outputDir, "static");

const staticFiles = ["faststart.html", "faststart.js"];

async function build() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(staticDir, { recursive: true });

  await Promise.all(
    staticFiles.map((f) =>
      copyFile(join(root, f), join(staticDir, f)),
    ),
  );

  await writeFile(
    join(outputDir, "config.json"),
    JSON.stringify({ version: 3, routes: [{ src: "/", dest: "/faststart.html" }] }),
  );
}

build().catch((e) => { console.error(e); process.exitCode = 1; });
