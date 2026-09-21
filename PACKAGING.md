# 打包成 EXE

## 前置条件

- Python 3.11+（本机实测 3.13.2）
- Node.js + npm
- 后端依赖：`pip install -r requirements.txt`，另外需要 `pip install pyinstaller`
- 前端依赖：`cd ui && npm install`
- 根目录必须有 `MediaSort.spec`：本仓库 `.gitignore` 忽略了 `*.spec`，上游并未提交该文件，已在本工作区补齐

## 一键打包

```powershell
powershell -ExecutionPolicy Bypass -File .\build_release.ps1
```

## 手动打包

```powershell
cd ui
npm run build
cd ..
python -m PyInstaller --noconfirm --clean MediaSort.spec
```

产物：`dist/MediaSort.exe`（单文件，约 66 MB，无控制台窗口）。

也可以只重打后端（前端已经 build 过）：加 `-SkipFrontend`，或直接执行上面的第二条命令。

## spec 里的几个关键点

- `datas=[("ui/dist", "ui/dist")]`：把编译好的 React 界面打进包内，`app.py` 的 `resource_path()` 会优先加载它。
- `hiddenimports` 显式列出 `webview.platforms.*` 与 `clr`/`clr_loader`：pywebview 的 GUI 后端是运行时动态 import，PyInstaller 的静态分析看不见它们。WebView2 的原生 DLL 由 hooks-contrib 的 `hook-webview.py` 自动收集。
- `console=False`：GUI 程序不带黑窗。因此 `app.py` 在 frozen 模式下会把 `sys.stdout`/`sys.stderr` 重定向到 `%TEMP%\MediaSort.log`；否则 windowed 环境下的裸 `print()` 会抛 `AttributeError`，让「选择文件夹」这类桥接调用静默失败。
- `excludes` 去掉 tkinter、Qt、matplotlib、pandas 等无关依赖，删掉这一项体积会明显变大。

## 注意事项

- 每次改完前端都要先 `npm run build` 再打包，否则 exe 里仍是旧界面。
- onefile 是「引导父进程 + 实际子进程」双进程结构。若用任务管理器结束进程，确认 `MediaSort` 全部退出，否则下次打包会因文件被占用报 `PermissionError: [WinError 5]`。
- 排障看 `%TEMP%\MediaSort.log`（Flask 启动信息、各端点请求记录都会写进去）。
- 首次运行单文件 exe 会稍慢（系统扫描+解包），之后约 2.8 秒可交互。

## 本机实测结果

- `dist/MediaSort.exe` 65.9 MB，启动到 Flask 端口可用约 2.8 秒。
- `_lcs_work/verify_exe.ps1`：`/view`(jpg)、`/thumbnail`(jpg)、`/thumbnail`(mp4，验证打包后的 OpenCV 真能解码视频帧)、`/video`(mp4) 全部返回 200，日志文件正常生成。
- `_lcs_work/verify_exe_bridge.ps1`：通过 CDP 连上 exe 内的 WebView2，确认 React 界面渲染成功、`window.pywebview.api` 暴露 8 个方法、`scan_images` 返回真实文件列表、`get_image_metadata` 由打包后的 Pillow 正常返回 JPEG 尺寸。
