$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location (Join-Path $projectRoot 'frontend')
try {
    if (-not (Test-Path 'node_modules')) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'npm ci uğursuz oldu.' } }
    & npm.cmd run dev -- --hostname 127.0.0.1
} finally { Pop-Location }
