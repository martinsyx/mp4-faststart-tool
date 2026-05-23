import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.10";
import { fetchFile, toBlobURL } from "https://esm.sh/@ffmpeg/util@0.12.1";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

const fileInput = document.querySelector("#fileInput");
const loadButton = document.querySelector("#loadButton");
const runButton = document.querySelector("#runButton");
const progressBar = document.querySelector("#progressBar");
const statusText = document.querySelector("#statusText");
const downloadLink = document.querySelector("#downloadLink");
const logBox = document.querySelector("#logBox");
const compatNotice = document.querySelector("#compatNotice");

const ffmpeg = new FFmpeg();
let ffmpegReady = false;
let busy = false;

ffmpeg.on("log", ({ message }) => log(message));
ffmpeg.on("progress", ({ progress }) => {
  if (Number.isFinite(progress) && progress >= 0 && progress <= 1) {
    progressBar.value = Math.min(99, Math.round(progress * 100));
  }
});

loadButton.addEventListener("click", loadFFmpeg);
runButton.addEventListener("click", remuxToFastStart);
fileInput.addEventListener("change", () => {
  clearDownload();
  updateControls();
});

checkBrowserCompat();
updateControls();

function checkBrowserCompat() {
  const issues = [];

  if (typeof WebAssembly === "undefined") {
    issues.push("浏览器不支持 WebAssembly。");
  }

  if (!("Worker" in window)) {
    issues.push("浏览器不支持 Web Worker。");
  }

  if (issues.length > 0) {
    compatNotice.hidden = false;
    compatNotice.classList.add("error");
    compatNotice.textContent = `当前浏览器不兼容：${issues.join(" ")} 请改用最新版 Chrome / Edge / Firefox / Safari。`;
    loadButton.disabled = true;
  }
}

async function loadFFmpeg() {
  if (ffmpegReady) {
    return;
  }

  setBusy(true, "正在加载 FFmpeg 引擎，首次约 30MB...");
  progressBar.removeAttribute("value");

  try {
    log("正在下载 ffmpeg-core.js ...");
    const coreResp = await fetch(`${CORE_BASE}/ffmpeg-core.js`);
    log(`  ffmpeg-core.js: HTTP ${coreResp.status}`);
    if (!coreResp.ok) throw new Error(`ffmpeg-core.js 下载失败: HTTP ${coreResp.status}`);
    const coreBlob = new Blob([await coreResp.arrayBuffer()], { type: "text/javascript" });
    const coreURL = URL.createObjectURL(coreBlob);
    log("  ffmpeg-core.js 就绪");

    log("正在下载 ffmpeg-core.wasm (~30MB) ...");
    const wasmResp = await fetch(`${CORE_BASE}/ffmpeg-core.wasm`);
    log(`  ffmpeg-core.wasm: HTTP ${wasmResp.status}`);
    if (!wasmResp.ok) throw new Error(`ffmpeg-core.wasm 下载失败: HTTP ${wasmResp.status}`);
    const wasmBlob = new Blob([await wasmResp.arrayBuffer()], { type: "application/wasm" });
    const wasmURL = URL.createObjectURL(wasmBlob);
    log("  ffmpeg-core.wasm 就绪");

    log("正在初始化 FFmpeg ...");
    await ffmpeg.load({ coreURL, wasmURL });

    ffmpegReady = true;
    progressBar.value = 0;
    statusText.textContent = "FFmpeg 已加载，可以选择 MP4 文件。";
    log("FFmpeg 引擎加载完成。");
  } catch (error) {
    progressBar.value = 0;
    statusText.textContent = `加载失败：${formatError(error)}`;
    log(`加载失败：${formatError(error)}`);
  } finally {
    setBusy(false);
    updateControls();
  }
}

async function remuxToFastStart() {
  const file = fileInput.files?.[0];

  if (!file) {
    statusText.textContent = "请先选择一个 MP4 文件。";
    return;
  }

  if (!file.name.toLowerCase().endsWith(".mp4")) {
    statusText.textContent = "当前工具只处理 .mp4 文件。";
    return;
  }

  clearDownload();
  progressBar.removeAttribute("value");
  setBusy(true, "正在重新封装为 FastStart MP4...");
  log(`开始处理：${file.name}，${formatBytes(file.size)}`);

  const inputName = "input.mp4";
  const outputName = "output_faststart.mp4";

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const code = await ffmpeg.exec([
      "-y",
      "-hide_banner",
      "-i",
      inputName,
      "-map",
      "0",
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      outputName,
    ]);

    if (code !== 0) {
      throw new Error(`FFmpeg 退出码：${code}`);
    }

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: "video/mp4" });
    const downloadUrl = URL.createObjectURL(blob);
    const friendlyName = toFastStartName(file.name);

    downloadLink.href = downloadUrl;
    downloadLink.download = friendlyName;
    downloadLink.hidden = false;
    downloadLink.textContent = `下载：${friendlyName}（${formatBytes(blob.size)}）`;

    progressBar.value = 100;
    statusText.textContent = "处理完成。";
    log(`处理完成：${friendlyName}，${formatBytes(blob.size)}`);
  } catch (error) {
    progressBar.value = 0;
    statusText.textContent = `处理失败：${formatError(error)}`;
    log(`处理失败：${formatError(error)}`);
  } finally {
    await safeDelete(inputName);
    await safeDelete(outputName);
    setBusy(false);
    updateControls();
  }
}

async function safeDelete(name) {
  try {
    await ffmpeg.deleteFile(name);
  } catch {
    // 文件可能不存在，忽略
  }
}

function toFastStartName(fileName) {
  return fileName.replace(/\.mp4$/i, "") + "_faststart.mp4";
}

function clearDownload() {
  if (downloadLink.href) {
    URL.revokeObjectURL(downloadLink.href);
  }

  downloadLink.hidden = true;
  downloadLink.removeAttribute("href");
  downloadLink.removeAttribute("download");
  progressBar.value = 0;
}

function setBusy(isBusy, message) {
  busy = isBusy;

  if (message) {
    statusText.textContent = message;
  }

  updateControls();
}

function updateControls() {
  loadButton.disabled = busy || ffmpegReady;
  loadButton.textContent = ffmpegReady ? "FFmpeg 已加载" : "加载 FFmpeg 引擎";
  runButton.disabled = busy || !ffmpegReady || !fileInput.files?.[0];
}

function log(message) {
  logBox.textContent += `${new Date().toLocaleTimeString()} ${message}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

function formatError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
