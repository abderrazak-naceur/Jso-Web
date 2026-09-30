<#
    Avvia l'API JSO in locale su http://localhost:8080 in modalita' Development.

    Default di questo script (macchina Windows locale):
      - provider: sqlserver  (l'istanza locale SQLEXPRESS su localhost,1433)
      - autenticazione Windows ("Integrated Security"), quindi nessuna password 'sa'
      - schema creato da EnsureCreatedAsync + dati demo (DevelopmentDataSeeder)
      - admin di sviluppo: admin@jso.tn / LocalAdminPass123

    Uso (dalla cartella backend):
        .\run-dev.ps1
        .\run-dev.ps1 -DatabaseProvider postgres -ConnectionString 'Host=localhost;Port=5432;Database=JSO;Username=jso;Password=jso_local_password'

    Le variabili d'ambiente gia' presenti (Jwt__Key, ADMIN_BOOTSTRAP_*) non vengono
    sovrascritte: puoi esportarle prima di lanciare lo script.

    Per fermare l'API: Ctrl+C, oppure
        Get-CimInstance Win32_Process -Filter "Name='dotnet.exe'" |
            Where-Object { $_.CommandLine -like '*JSO.Api*' } |
            ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
#>
param(
    [string]$DatabaseProvider = 'sqlserver',
    [string]$ConnectionString = 'Server=localhost,1433;Database=JSO;Integrated Security=True;TrustServerCertificate=True;Encrypt=False',
    [string]$Urls = 'http://localhost:8080'
)

$ErrorActionPreference = 'Stop'
$backendRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

Push-Location $backendRoot
try {
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:ASPNETCORE_URLS = $Urls
    $env:Database__Provider = $DatabaseProvider
    $env:ConnectionStrings__DefaultConnection = $ConnectionString

    # Valori di sviluppo: non sovrascrivono quelli eventualmente gia' esportati.
    if (-not $env:Jwt__Key) { $env:Jwt__Key = 'local-dev-jwt-secret-at-least-32-characters-long' }
    if (-not $env:ADMIN_BOOTSTRAP_EMAIL) { $env:ADMIN_BOOTSTRAP_EMAIL = 'admin@jso.tn' }
    if (-not $env:ADMIN_BOOTSTRAP_PASSWORD) { $env:ADMIN_BOOTSTRAP_PASSWORD = 'LocalAdminPass123' }

    Write-Host "JSO API -> $Urls (provider: $DatabaseProvider, environment: Development)" -ForegroundColor Cyan
    Write-Host "Health: $Urls/health   Swagger: $Urls/swagger" -ForegroundColor DarkGray

    dotnet run --project src/JSO.Api --no-launch-profile
}
finally {
    Pop-Location
}
