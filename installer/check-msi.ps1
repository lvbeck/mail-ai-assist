param([string]$MsiPath)
$ErrorActionPreference = 'Stop'
$engine = New-Object -ComObject WindowsInstaller.Installer
$database = $engine.OpenDatabase([IO.Path]::GetFullPath($MsiPath), 0)
function Rows([string]$Query) {
    try { $view = $database.OpenView($Query) } catch { throw "Invalid MSI query: $Query" }; $view.Execute() | Out-Null
    while ($record = $view.Fetch()) { Write-Output -NoEnumerate $record }
    $view.Close() | Out-Null
}
$properties = @{}
foreach ($record in (Rows 'SELECT `Property`, `Value` FROM `Property`')) { $properties[$record.StringData(1)] = $record.StringData(2) }
foreach ($record in (Rows 'SELECT `Language` FROM `Upgrade`')) {
    if ($record.StringData(1)) { throw 'Related-product detection must allow upgrades across installer languages.' }
}
if ($properties.ALLUSERS -ne '2' -or $properties.MSIINSTALLPERUSER -ne '1') { throw 'MSI is not dual-scope with current-user default.' }
# Localized display properties are tested in isolated sessions; UI rows stay permanent.
$registry = @(Rows 'SELECT `Root`, `Key` FROM `Registry`')
foreach ($record in $registry) { if ($record.IntegerData(1) -ne -1) { throw 'A registry entry does not follow installation scope.' } }
foreach ($table in @('InstallUISequence', 'InstallExecuteSequence')) {
    $sequence = @{}
    foreach ($record in (Rows ('SELECT `Action`, `Sequence` FROM `{0}`' -f $table))) { $sequence[$record.StringData(1)] = $record.IntegerData(2) }
    if (-not ($sequence.SetALLUSERS -gt $sequence.AppSearch -and $sequence.SetMSIINSTALLPERUSER -gt $sequence.SetALLUSERS -and $sequence.FindRelatedProducts -gt $sequence.CostFinalize -and $sequence.LaunchConditions -gt $sequence.FindRelatedProducts -and $sequence.FindRelatedProducts -lt $sequence.MigrateFeatureStates)) { throw "Incorrect upgrade detection sequence: $table" }
    if ($table -eq 'InstallUISequence' -and -not ($sequence.InitializeLanguage -lt $sequence.MailAISelectorDlg -and $sequence.MailAISelectorDlg -lt $sequence.ApplyLanguage -and $sequence.ApplyLanguage -lt $sequence.PrepareDlg -and $sequence.PrepareDlg -lt $sequence.WelcomeDlg)) { throw 'Language selection must precede all setup dialogs.' }
}
# OpenPackage creates an in-memory installer session. Only costing and property
# actions run below; InstallInitialize/InstallExecute are never invoked.
foreach ($scope in @('user','machine')) {
    $session = $engine.OpenPackage([IO.Path]::GetFullPath($MsiPath), 1)
    $session.Property('ALLUSERS') = '2'
    $session.Property('MSIINSTALLPERUSER') = if ($scope -eq 'user') { '1' } else { '' }
    $session.Property('INSTALLFOLDER') = ''
    $session.Property('USER_FOLDER') = ''
    $session.Property('MACHINE_FOLDER') = ''
    $session.DoAction('CostInitialize') | Out-Null
    $session.DoAction('FileCost') | Out-Null
    $action = if ($scope -eq 'user') { 'SetINSTALLFOLDERUserDefault' } else { 'SetINSTALLFOLDERMachineDefault' }
    if ($session.DoAction($action) -ne 1) { throw 'Folder initialization failed.' }
    if ($session.DoAction('CostFinalize') -ne 1) { throw 'Costing failed.' }
    $folder = $session.Property('INSTALLFOLDER')
    if ($scope -eq 'user' -and $folder -notlike '*MailAiAssist\app-msi*') { throw 'Wrong user default.' }
    if ($scope -eq 'machine' -and $folder.TrimEnd('\') -ne (Join-Path $session.Property('ProgramFiles64Folder') 'MailAiAssist')) { throw "Wrong machine default: $folder" }
    $session.Property('INSTALLFOLDER') = 'C:\Custom Mail AI\'
    $session.DoAction('CostFinalize') | Out-Null
    if ($session.Property('INSTALLFOLDER') -ne 'C:\Custom Mail AI\') { throw 'Custom location was lost.' }
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($session) | Out-Null
}
Write-Output 'PASS: both scope choices, user default, scope-aware registry, dialog sequence, default folders and custom folder costing. No installation executed.'
