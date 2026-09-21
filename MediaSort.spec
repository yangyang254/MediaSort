# -*- mode: python ; coding: utf-8 -*-
# PyInstaller build configuration for MediaSort.
# Usage:  python -m PyInstaller --noconfirm --clean MediaSort.spec
# Output: dist/MediaSort.exe (single file, no console window)

# pywebview picks its GUI backend at runtime through a dynamic import, so the
# Windows backends must be listed explicitly or PyInstaller cannot see them.
# clr/clr_loader come with pythonnet, which the EdgeChromium backend needs.
hiddenimports = [
    "clr",
    "clr_loader",
    "webview.platforms.winforms",
    "webview.platforms.edgechromium",
    "webview.platforms.mshtml",
    "webview.platforms.win32",
]

# Nothing here is used by MediaSort; dropping them keeps the bundle smaller.
excludes = [
    "tkinter",
    "test",
    "unittest",
    "pytest",
    "matplotlib",
    "pandas",
    "scipy",
    "IPython",
    "PyQt5",
    "PyQt6",
    "PySide2",
    "PySide6",
    "cefpython3",
    "gi",
]

a = Analysis(
    ["app.py"],
    pathex=[],
    binaries=[],
    # The compiled React UI is served straight from the bundle by app.py.
    datas=[("ui/dist", "ui/dist")],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="MediaSort",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # UPX is not installed; packing cv2/numpy DLLs with it is risky anyway.
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # GUI app: no console window. app.py redirects stdio to a log file.
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon="icon.ico",
)
