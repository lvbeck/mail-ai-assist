param([Parameter(Mandatory=$true)][string]$InstallRoot)
$ErrorActionPreference = 'Stop'
$expected = Join-Path ([IO.Path]::GetFullPath($InstallRoot)) 'native-host.json'
foreach ($scope in @('user', 'machine')) {
    $hive = if ($scope -eq 'user') { 'HKCU:' } else { 'HKLM:' }
    $key = $hive + '\Software\Mozilla\NativeMessagingHosts\local.mail_ai_assist'
    if (Test-Path -LiteralPath $key) {
        $registered = (Get-Item -LiteralPath $key).GetValue('')
        if ($registered -and [IO.Path]::GetFullPath($registered) -eq $expected) {
            @{ root = [IO.Path]::GetFullPath($InstallRoot); scope = $scope } | ConvertTo-Json -Compress
        }
        # A user registration shadows the machine registration.
        exit 0
    }
}
