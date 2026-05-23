// 仅用于本地预览，部署到 Vercel 时不会用到此文件。
// Vercel 会直接把 faststart.html / faststart.js 作为静态资源托管。

const { createReadStream } = require("node:fs");
const { stat } = require("node:fs/promises");
const { createServer } = require("node:http");
const { extname, join, normalize, resolve, sep } = require("node:path");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 8088);
const rootDir = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".map": "application/json; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/" || pathname === "") {
      pathname = "/faststart.html";
    }

    const filePath = resolve(join(rootDir, normalize(pathname)));

    if (!filePath.startsWith(rootDir + sep) && filePath !== rootDir) {
      response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const fileStat = await stat(filePath).catch(() => null);

    if (!fileStat || !fileStat.isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const contentType = mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream";

    response.writeHead(200, {
      "content-type": contentType,
      "content-length": fileStat.size,
      "cache-control": "no-cache",
    });

    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error.message || String(error));
  }
}).listen(port, host, () => {
  console.log(`本地预览：http://${host}:${port}/faststart.html`);
});
