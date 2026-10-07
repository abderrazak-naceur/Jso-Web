<#
    Avvia in locale API + sito JSO, ognuno nella propria finestra (log visibili).

    Uso (dalla root del repository):
        .\start-dev.ps1          # ferma eventuali istanze e avvia API + sito
        .\start-dev.ps1 -Stop    # ferma API e sito

    URL:
        Sito   http://localhost:5173
        Admin  http://localhost:5173/admin    (admin@jso.tn / LocalAdminPass123)
        API    http://localhost:8080/health   (Swagger: http://localhost:8080/swagger)

    Il sito e' servito anche sulla rete locale (es. http://192.168.x.x:5173) per
    provarlo dal telefono: Vite gira con --host e inoltra /api e /health all'API.
#>
param([switch]$Stop)

$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

function Stop-JsoDev {
    Get-CimInstance Win32_Process -Filter "Name='dotnet.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like '*JSO.Api*' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like '*vite*' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

if ($Stop) {
    Stop-JsoDev
    Write-Host 'API e frontend fermati.' -ForegroundColor Yellow
    return
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Warning 'npm non trovato nel PATH: apri il terminale in cui npm funziona (nvm) e rilancia lo script.'
}

# Evita conflitti di porta (5173/8080) con istanze precedenti.
Stop-JsoDev
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList @(
    '-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $backend 'run-dev.ps1'))

Start-Process powershell -ArgumentList @(
    '-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-Command', "Set-Location '$frontend'; npm run dev -- --host")

$deadline = (Get-Date).AddSeconds(120)
$api = $false
$web = $false
while ((Get-Date) -lt $deadline -and -not ($api -and $web)) {
    if (-not $api) {
        try { $api = (Invoke-WebRequest 'http://localhost:8080/health' -UseBasicParsing -TimeoutSec 4).StatusCode -eq 200 }
        catch { $api = $false }
    }
    if (-not $web) {
        try { $web = (Invoke-WebRequest 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 4).StatusCode -eq 200 }
        catch { $web = $false }
    }
    if (-not ($api -and $web)) { Start-Sleep -Seconds 2 }
}

Write-Host ''
$apiTxt = 'NON PRONTA'; if ($api) { $apiTxt = 'OK' }
$webTxt = 'NON PRONTO'; if ($web) { $webTxt = 'OK' }
Write-Host ("API  http://localhost:8080/health -> " + $apiTxt)
Write-Host ("Sito http://localhost:5173        -> " + $webTxt)
Write-Host 'Admin: http://localhost:5173/admin  (admin@jso.tn / LocalAdminPass123)'
Write-Host 'Stop:  .\start-dev.ps1 -Stop'
