# One-shot release build for MediaSort.
#   powershell -ExecutionPolicy Bypass -File .\build_release.ps1
# Rebuilds the React UI (vite) and then packages everything into dist\MediaSort.exe.
param(
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

if (-not $SkipFrontend) {
    Write-Host "[1/2] Building frontend (vite)..." -ForegroundColor Cyan
    Push-Location (Join-Path $root "ui")
    try {
        npm run build
    }
    finally {
        Pop-Location
    }
}

Write-Host "[2/2] Packaging MediaSort.exe (PyInstaller)..." -ForegroundColor Cyan
python -m PyInstaller --noconfirm --clean MediaSort.spec

$exe = Join-Path $root "dist\MediaSort.exe"
if (Test-Path $exe) {
    $size = [math]::Round((Get-Item $exe).Length / 1MB, 1)
    Write-Host "Done: $exe ($size MB)" -ForegroundColor Green
}
else {
    throw "Build finished but $exe was not produced."
}
