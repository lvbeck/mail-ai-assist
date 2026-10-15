param([string]$PackagePath, [string]$ExpectedHash, [string]$ExpectedVersion, [switch]$MachineApproved)
$ErrorActionPreference = 'Stop'
$installRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$installationJson = & (Join-Path $PSScriptRoot 'installation.ps1') -InstallRoot $installRoot
if (-not $installationJson) { exit 0 }
$installation = $installationJson | ConvertFrom-Json
if ($installation.scope -eq 'machine' -and -not $MachineApproved) { exit 0 }
$cacheRoot = Join-Path $env:LOCALAPPDATA 'MailAiAssist\updates'
$resolvedPackage = [IO.Path]::GetFullPath($PackagePath)
if ($resolvedPackage -ne (Join-Path $cacheRoot "Mail-AI-Assist-$ExpectedVersion-x64.msi") -or $ExpectedHash -notmatch '^[a-f0-9]{64}$' -or $ExpectedVersion -notmatch '^\d+\.\d+\.\d+$') { exit 1 }
$mutex = New-Object Threading.Mutex($false, 'Local\MailAIAssistUpdateInstaller')
$acquired = $false
try {
    try { $acquired = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $acquired = $true }
    if (-not $acquired) { exit 0 }
    # Never stop Thunderbird or any helper process to perform an update.
    $deadline = [DateTime]::UtcNow.AddHours(24)
    do {
        $configPath = Join-Path $installRoot 'msi-install.json'
        if (-not (Test-Path -LiteralPath $configPath)) { exit 0 }
        $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
        if ([Version]$config.version -ge [Version]$ExpectedVersion) { exit 0 }
        $running = @(Get-Process thunderbird -ErrorAction SilentlyContinue).Count -gt 0
        $helpers = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($installRoot + '\', [StringComparison]::OrdinalIgnoreCase) })
        if (-not $running -and $helpers.Count -eq 0) { break }
        if ([DateTime]::UtcNow -ge $deadline) { exit 0 }
        Start-Sleep -Seconds 30
    } while ($true)
    if ((Get-FileHash -LiteralPath $resolvedPackage -Algorithm SHA256).Hash -ne $ExpectedHash) { throw 'Package verification failed.' }
    $scopeArgs = if ($installation.scope -eq 'machine') { 'ALLUSERS=1 MSIINSTALLPERUSER="" /passive' } else { 'ALLUSERS=2 MSIINSTALLPERUSER=1 /qn' }
    $arguments = '/i "' + $resolvedPackage + '" ' + $scopeArgs + ' INSTALLFOLDER="' + $installRoot + '" /norestart MSIRESTARTMANAGERCONTROL=Disable /L*v "' + (Join-Path $cacheRoot 'install.log') + '"'
    if ($installation.scope -eq 'machine') {
        $installer = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\msiexec.exe') -ArgumentList $arguments -Verb RunAs -WindowStyle Hidden -Wait -PassThru
    } else {
        $installer = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\msiexec.exe') -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru
    }
    $state = if ($installer.ExitCode -in @(0, 3010)) { 'installed' } else { 'install_failed' }
    @{ checkedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); state = $state; version = $ExpectedVersion; exitCode = $installer.ExitCode } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $cacheRoot 'status.json') -Encoding UTF8
} catch {
    @{ checkedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); state = 'install_failed' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $cacheRoot 'status.json') -Encoding UTF8
} finally {
    if ($acquired) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
