# MP4 FastStart 在线工具

在浏览器内通过 ffmpeg.wasm 把 MP4 重新封装为 FastStart 格式，方便视频在网页中边下载边播放。

工具执行的 FFmpeg 命令等价于：

```bash
ffmpeg -y -hide_banner -i input.mp4 -map 0 -c copy -movflags +faststart output_faststart.mp4
```

**不会重新编码视频和音频**，只会重新封装 MP4 文件。**文件不会上传到任何服务器**，所有处理都在浏览器内完成。

## 在线使用

直接访问部署在 Vercel 的在线版本（待部署后填入 URL）：

```
https://your-project.vercel.app
```

## 本地预览

如果想在本地运行：

1. 确保已安装 Node.js（v16+）
2. 进入项目目录：

   ```bash
   cd mp4-faststart-tool
   ```

3. 启动本地服务：

   ```bash
   node faststart-server.js
   ```

4. 浏览器打开：

   ```
   http://127.0.0.1:8080/faststart.html
   ```

## 部署到 Vercel

### 方式一：通过 Vercel CLI

1. 安装 Vercel CLI：

   ```bash
   npm install -g vercel
   ```

2. 在项目目录运行：

   ```bash
   vercel
   ```

3. 按提示登录并完成部署。

### 方式二：通过 Vercel 网站

1. 访问 [vercel.com](https://vercel.com)，登录或注册账号。
2. 点击 "Add New Project"。
3. 导入你的 Git 仓库（GitHub / GitLab / Bitbucket）。
4. Vercel 会自动检测到静态站点，无需配置构建命令。
5. 点击 "Deploy"。

部署完成后，Vercel 会提供一个 `.vercel.app` 域名，也可以绑定自定义域名。

## 技术实现

- **前端**：纯静态 HTML + ES Module JavaScript
- **FFmpeg 引擎**：[@ffmpeg/ffmpeg](https://github.com/ffmpegwasm/ffmpeg.wasm) WebAssembly 版本
- **部署平台**：Vercel（或任何支持静态托管的平台）

首次使用时会从 CDN 加载约 30MB 的 FFmpeg WebAssembly 文件，加载后会被浏览器缓存。

## 浏览器兼容性

需要浏览器支持：
- WebAssembly
- Web Worker
- ES Module

推荐使用最新版：
- Chrome / Edge 90+
- Firefox 89+
- Safari 15+

## 文件说明

- `faststart.html`：网页界面
- `faststart.js`：前端逻辑，调用 ffmpeg.wasm
- `faststart-server.js`：本地预览用的静态文件服务（部署时不需要）
- `vercel.json`：Vercel 部署配置
- `package.json`：项目元信息
- `README.md`：使用说明

## 常见问题

### 处理速度如何？

WebAssembly 版 FFmpeg 的速度约为原生 FFmpeg 的 30-50%。由于 FastStart 操作只是重新封装（不重新编码），对于几百 MB 的视频通常在 10-30 秒内完成。

### 文件大小有限制吗？

理论上没有服务端限制，但受浏览器内存约束。一般 1-2GB 以内的视频都能正常处理。如果文件过大导致浏览器卡死，建议使用本地 FFmpeg 命令行工具。

### 文件会上传到服务器吗？

不会。所有处理都在浏览器内完成，文件不会离开你的设备。

### 可以处理非 MP4 文件吗？

当前工具只允许选择 `.mp4` 文件。如果需要处理其他格式，可以修改 `faststart.html` 中的 `accept` 属性和 `faststart.js` 中的文件名检查逻辑。

### 为什么首次加载很慢？

首次使用需要从 CDN 下载约 30MB 的 FFmpeg WebAssembly 文件。加载完成后，浏览器会缓存这些文件，后续使用会很快。

### 可以部署到其他平台吗？

可以。这是一个纯静态站点，可以部署到任何支持静态托管的平台，如：
- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- 任何支持静态文件的 Web 服务器

只需要把 `faststart.html`、`faststart.js` 和 `vercel.json`（可选）上传即可。

## 许可

MIT License
