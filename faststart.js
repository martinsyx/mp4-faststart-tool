// 使用 @ffmpeg/core UMD 版本 (单线程)
const CORE_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js";

const fileInput = document.querySelector("#fileInput");
const loadButton = document.querySelector("#loadButton");
const runButton = document.querySelector("#runButton");
const progressBar = document.querySelector("#progressBar");
const statusText = document.querySelector("#statusText");
const downloadLink = document.querySelector("#downloadLink");
const logBox = document.querySelector("#logBox");
const compatNotice = document.querySelector("#compatNotice");

let ffmpegCore = null;
let ffmpegReady = false;
let busy = false;

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

  setBusy(true, "正在加载 FFmpeg 引擎 (单线程版本)，首次约 32MB...");
  progressBar.removeAttribute("value");

  try {
    log("正在加载 ffmpeg-core.js (UMD) ...");
    
    // 加载 UMD 脚本
    await loadScript(CORE_URL);
    
    if (typeof createFFmpegCore === "undefined") {
      throw new Error("createFFmpegCore 未定义，脚本加载失败");
    }

    log("正在初始化 FFmpeg WASM 模块...");
    ffmpegCore = await createFFmpegCore({
      printErr: (msg) => log(`[FFmpeg] ${msg}`),
      print: (msg) => log(`[FFmpeg] ${msg}`)
    });

    ffmpegReady = true;
    progressBar.value = 0;
    statusText.textContent = "FFmpeg 已加载，可以选择 MP4 文件。";
    log("FFmpeg 引擎加载完成 (单线程模式)。");
  } catch (error) {
    progressBar.value = 0;
    statusText.textContent = `加载失败：${formatError(error)}`;
    log(`加载失败：${formatError(error)}`);
  } finally {
    setBusy(false);
    updateControls();
  }
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
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
    // 读取文件到内存
    const fileData = new Uint8Array(await file.arrayBuffer());
    
    // 写入 FFmpeg 虚拟文件系统
    log("写入文件到 FFmpeg 虚拟文件系统...");
    ffmpegCore.FS.writeFile(inputName, fileData);

    // 执行 FFmpeg 命令
    log("执行 FFmpeg 命令: -i input.mp4 -c copy -movflags +faststart output_faststart.mp4");
    const exitCode = ffmpegCore.callMain([
      "-i", inputName,
      "-c", "copy",
      "-movflags", "+faststart",
      outputName
    ]);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg 执行失败，退出码: ${exitCode}`);
    }

    // 读取输出文件
    log("读取输出文件...");
    const outputData = ffmpegCore.FS.readFile(outputName);

    // 清理虚拟文件系统
    ffmpegCore.FS.unlink(inputName);
    ffmpegCore.FS.unlink(outputName);

    // 创建下载链接
    const blob = new Blob([outputData.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    const outputFileName = file.name.replace(/\.mp4$/i, "_faststart.mp4");

    downloadLink.href = url;
    downloadLink.download = outputFileName;
    downloadLink.hidden = false;
    downloadLink.textContent = `下载 ${outputFileName} (${formatBytes(blob.size)})`;

    progressBar.value = 100;
    statusText.textContent = `处理完成！文件大小：${formatBytes(blob.size)}`;
    log(`处理完成：${outputFileName}，${formatBytes(blob.size)}`);
  } catch (error) {
    progressBar.value = 0;
    statusText.textContent = `处理失败：${formatError(error)}`;
    log(`处理失败：${formatError(error)}`);
  } finally {
    setBusy(false);
    updateControls();
  }
}

function setBusy(isBusy, message = "") {
  busy = isBusy;
  if (message) {
    statusText.textContent = message;
  }
  updateControls();
}

function updateControls() {
  const hasFile = fileInput.files?.length > 0;
  loadButton.disabled = busy || ffmpegReady;
  runButton.disabled = busy || !ffmpegReady || !hasFile;
  fileInput.disabled = busy;
}

function clearDownload() {
  if (downloadLink.href && downloadLink.href.startsWith("blob:")) {
    URL.revokeObjectURL(downloadLink.href);
  }
  downloadLink.hidden = true;
  downloadLink.href = "";
  downloadLink.download = "";
  downloadLink.textContent = "";
}

function log(message) {
  const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const line = `${time} ${message}\n`;
  logBox.textContent += line;
  logBox.scrollTop = logBox.scrollHeight;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
