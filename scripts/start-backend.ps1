$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$localJdk = Get-ChildItem (Join-Path $projectRoot '.tools/jdk') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($localJdk) { $env:JAVA_HOME = $localJdk.FullName }
if (-not $env:JAVA_HOME) { throw 'Java 21 JDK quraşdırın və JAVA_HOME təyin edin.' }
# Some Windows MSIX environments cannot connect AF_UNIX pipes. A nonexistent socket
# directory makes the JDK use its normal TCP loopback fallback; no OS setting changes.
$socketFallback = Join-Path $projectRoot '.tools/nonexistent-unix-socket-directory'
if (-not (Test-Path -LiteralPath $socketFallback)) {
    $env:JAVA_TOOL_OPTIONS = ($env:JAVA_TOOL_OPTIONS + ' "-Djdk.net.unixdomain.tmpdir=' + $socketFallback + '"').Trim()
}
Push-Location (Join-Path $projectRoot 'backend')
try { & .\mvnw.cmd spring-boot:run; if ($LASTEXITCODE -ne 0) { throw 'Backend başlaya bilmədi.' } }
finally { Pop-Location }
