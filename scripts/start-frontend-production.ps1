$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location (Join-Path $projectRoot 'frontend')
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build uğursuz oldu.' }
    foreach ($asset in @(@{Source='public';Target='.next/standalone/public'}, @{Source='.next/static';Target='.next/standalone/.next/static'})) {
        New-Item -ItemType Directory -Path $asset.Target -Force | Out-Null
        Get-ChildItem -LiteralPath $asset.Source -Force | Copy-Item -Destination $asset.Target -Recurse -Force
    }
    $env:HOSTNAME = '127.0.0.1'
    $env:PORT = '3000'
    & node.exe .next/standalone/server.js
} finally { Pop-Location }
