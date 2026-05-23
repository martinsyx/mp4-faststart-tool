const { copyFile, mkdir, rm } = require("node:fs/promises");
const { join } = require("node:path");

const outputDir = join(__dirname, "public");
const files = ["faststart.html", "faststart.js", "vercel.json"];

async function build() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  await Promise.all(
    files.map((file) => copyFile(join(__dirname, file), join(outputDir, file))),
  );
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
