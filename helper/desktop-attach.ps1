$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$stage = 'desktop_failed'
try {
    $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
    if ($request.action -eq 'chooseFolder') {
        Add-Type -AssemblyName System.Windows.Forms
        [Windows.Forms.Application]::EnableVisualStyles()
        $picker = New-Object Windows.Forms.FolderBrowserDialog
        $owner = New-Object Windows.Forms.Form
        try {
            $picker.ShowNewFolderButton = $true
            if (Test-Path -LiteralPath $request.path -PathType Container) { $picker.SelectedPath = [string]$request.path }
            $owner.ShowInTaskbar = $false
            $owner.Opacity = 0
            $owner.TopMost = $true
            $owner.Show()
            $result = $picker.ShowDialog($owner)
            if ($result -eq [Windows.Forms.DialogResult]::OK) {
                @{ ok = $true; path = $picker.SelectedPath; cancelled = $false } | ConvertTo-Json -Compress
            } else {
                @{ ok = $true; cancelled = $true } | ConvertTo-Json -Compress
            }
        } finally { $picker.Dispose(); $owner.Dispose() }
        exit 0
    }
    if ($request.action -eq 'folder') {
        if (-not [IO.Path]::IsPathRooted($request.path) -or -not (Test-Path -LiteralPath $request.path -PathType Container)) { throw 'Invalid folder' }
        # Delegate to the desktop shell instead of a child tied to the native host lifetime.
        $desktopShell = New-Object -ComObject Shell.Application
        try { $desktopShell.Explore([string]$request.path) }
        finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($desktopShell) }
        @{ ok = $true } | ConvertTo-Json -Compress
        exit 0
    }
    if ($request.action -eq 'reveal') {
        if (-not [IO.Path]::IsPathRooted($request.path) -or -not (Test-Path -LiteralPath $request.path -PathType Leaf)) { throw 'Invalid export' }
        Start-Process -FilePath explorer.exe -ArgumentList ('/select,"' + $request.path + '"')
        @{ ok = $true } | ConvertTo-Json -Compress
        exit 0
    }
    if ($request.action -eq 'open') {
        if ($request.target -eq 'custom') {
            if (-not [IO.Path]::IsPathRooted($request.executable) -or [IO.Path]::GetExtension($request.executable) -ne '.exe') { throw 'Invalid executable' }
            Start-Process -FilePath $request.executable
        } elseif ($request.target -in @('chatgpt', 'codex')) {
            $appName = if ($request.target -eq 'codex') { 'Codex' } else { 'ChatGPT' }
            $allApps = @(Get-StartApps)
            $apps = @($allApps | Where-Object { $_.Name -eq $appName })
            # Some releases host ChatGPT and Codex in the same packaged application.
            if ($apps.Count -eq 0 -and $request.target -eq 'codex') {
                $apps = @($allApps | Where-Object { $_.Name -eq 'ChatGPT' -and $_.AppID -like 'OpenAI.Codex_*!App' })
            }
            if ($apps.Count -ne 1) { throw 'Application not uniquely identified' }
            Start-Process -FilePath explorer.exe -ArgumentList ('shell:AppsFolder\' + $apps[0].AppID)
        } else { throw 'Unsupported target' }
        @{ ok = $true } | ConvertTo-Json -Compress
        exit 0
    }
    throw 'Unsupported action'
} catch {
    @{ ok = $false } | ConvertTo-Json -Compress
    exit 1
}
