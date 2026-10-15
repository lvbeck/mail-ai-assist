from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape
import json, hashlib, shutil, subprocess, uuid, sys, time

from build_tools import find_wix, runtime_directory
root = Path(__file__).resolve().parent.parent
import os
os.chdir(root)
wix = find_wix()
runtime = runtime_directory(root)
if not (runtime / 'node.exe').is_file() or not (runtime / 'NODE-LICENSE.txt').is_file():
    raise SystemExit('Set MAIL_AI_RUNTIME_DIR to a Windows x64 Node runtime folder containing node.exe and NODE-LICENSE.txt.')
subprocess.run([sys.executable, 'installer/build-pages.py'], check=True)
config = json.loads((root / 'installer/release-config.json').read_text())
version = config['version']
package = root
ext = package / 'extension'
stage = root / 'work/msi-stage'
upload = root / 'dist/server-upload'
# Preserve previous artifacts outside the upload tree so every release contains only five files.
if upload.exists():
    history = root / 'work' / f'server-upload-history-{time.time_ns()}'
    history.parent.mkdir(parents=True, exist_ok=True)
    if not upload.resolve().is_relative_to(root.resolve()) or not history.resolve().is_relative_to(root.resolve()):
        raise RuntimeError('Build directory escaped repository root')
    shutil.move(str(upload), str(history))
release = upload / 'releases' / version
release.mkdir(parents=True, exist_ok=True)
stage.mkdir(parents=True, exist_ok=True)
download_page = (root / 'installer/download-page.html').read_text(encoding='utf-8').replace('0.9.0', version)
(upload / 'index.html').write_text(download_page, encoding='utf-8')
node = runtime / 'node.exe'
manifest = json.loads((ext / 'manifest.json').read_text())
manifest['version'] = version
manifest['browser_specific_settings']['gecko']['id'] = config['addonId']
if config.get('githubRepository'):
    manifest['browser_specific_settings']['gecko'].pop('update_url', None)
else:
    manifest['browser_specific_settings']['gecko']['update_url'] = config['baseUrl'] + 'updates.json'
(ext / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
subprocess.run([str(node), 'installer/sign-release.mjs', '--prepare'], check=True)
xpi_name = f'Mail-AI-Assist-{version}.xpi'
with ZipFile(release / xpi_name, 'w', ZIP_DEFLATED) as archive:
    for item in sorted(ext.rglob('*')):
        if item.is_file(): archive.write(item, item.relative_to(ext).as_posix())
shutil.copy2(release / xpi_name, stage / 'Mail-AI-Assist.xpi')
for directory in ['helper', 'runtime']:
    shutil.copytree(runtime if directory == 'runtime' else package / directory, stage / directory, dirs_exist_ok=True)
shutil.copy2(package / 'LICENSE', stage / 'LICENSE.txt')
shutil.copy2(root / 'installer/setup-guide.html', stage / 'setup-guide.html')
shutil.copy2(ext / 'icon.svg', stage / 'icon.svg')
(stage / 'native-host.json').write_text(json.dumps({'name': 'local.mail_ai_assist', 'description': 'Mail AI Assist local connection', 'path': 'helper\\launch.cmd', 'type': 'stdio', 'allowed_extensions': [config['addonId'], *config.get('legacyAddonIds', [])]}, indent=2), encoding='utf-8')
components = []
directories = []
for folder, directory_id in [('', 'INSTALLFOLDER'), ('helper', 'HelperFolder'), ('runtime', 'RuntimeFolder')]:
    rows = []
    for item in sorted((stage / folder).iterdir()):
        if not item.is_file(): continue
        relative = item.relative_to(stage).as_posix()
        token = hashlib.sha256(relative.encode()).hexdigest()[:16]
        file_id = 'GuideFile' if relative == 'setup-guide.html' else 'f' + token
        cid = 'c' + token
        guid = str(uuid.uuid5(uuid.UUID(config['upgradeCode']), relative))
        rows.append(f'<Component Id="{cid}" Guid="{guid}"><File Id="{file_id}" Source="{escape(str(item))}"/><RegistryValue Root="HKMU" Key="Software\\Jin Lu\\Mail AI Assist\\Components" Name="{token}" Type="integer" Value="1" KeyPath="yes"/></Component>')
        components.append(f'<ComponentRef Id="{cid}"/>')
    directories.append(f'<DirectoryRef Id="{directory_id}">' + ''.join(rows) + '</DirectoryRef>')
product_id = str(uuid.uuid5(uuid.UUID(config['upgradeCode']), version))
wxs = f'''<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs" xmlns:ui="http://wixtoolset.org/schemas/v4/wxs/ui">
<Package Name="Mail AI Assist" Manufacturer="Jin Lu" Version="{version}" UpgradeCode="{config['upgradeCode']}" ProductCode="{product_id}" Scope="perUserOrMachine" Language="1033">
<SummaryInformation Description="Mail AI Assist for Thunderbird (Windows x64)"/>
<MajorUpgrade IgnoreLanguage="yes" DowngradeErrorMessage="[MAILAI_DOWNGRADE]" Schedule="afterInstallInitialize"/>
<MediaTemplate EmbedCab="yes"/>
<Property Id="ARPCONTACT" Value="it@live.cn"/>
<Icon Id="MailAIIcon.ico" SourceFile="{escape(str(root / 'installer/assets/ai-icon.ico'))}"/>
<Property Id="ARPPRODUCTICON" Value="MailAIIcon.ico"/>
<Property Id="ARPURLINFOABOUT" Value="https://github.com/lvbeck/mail-ai-assist"/>
<Property Id="MSIRESTARTMANAGERCONTROL" Value="Disable"/><Property Id="MsiLogging" Value="voicewarmup"/>
<Launch Condition="VersionNT64" Message="[MAILAI_WINDOWS64]"/>
<Property Id="USER_HOST" Secure="yes"><RegistrySearch Id="FindUserHost" Root="HKCU" Key="Software\\Mozilla\\NativeMessagingHosts\\local.mail_ai_assist" Type="raw" Bitness="always64"/></Property>
<Property Id="MACHINE_HOST" Secure="yes"><RegistrySearch Id="FindMachineHost" Root="HKLM" Key="Software\\Mozilla\\NativeMessagingHosts\\local.mail_ai_assist" Type="raw" Bitness="always64"/></Property>
<Property Id="USER_FOLDER" Secure="yes"><RegistrySearch Id="FindUserFolder" Root="HKCU" Key="Software\\Jin Lu\\Mail AI Assist" Name="InstallFolder" Type="raw" Bitness="always64"/></Property>
<Property Id="MACHINE_FOLDER" Secure="yes"><RegistrySearch Id="FindMachineFolder" Root="HKLM" Key="Software\\Jin Lu\\Mail AI Assist" Name="InstallFolder" Type="raw" Bitness="always64"/></Property>
<Property Id="USER_LANGUAGE"><RegistrySearch Id="FindUserLanguage" Root="HKCU" Key="Software\\Jin Lu\\Mail AI Assist" Name="InstallerLanguage" Type="raw" Bitness="always64"/></Property>
<Property Id="MACHINE_LANGUAGE"><RegistrySearch Id="FindMachineLanguage" Root="HKLM" Key="Software\\Jin Lu\\Mail AI Assist" Name="InstallerLanguage" Type="raw" Bitness="always64"/></Property>
<Property Id="INSTALLFOLDER" Secure="yes"/>
<Property Id="INSTALLSCOPE" Value="user" Secure="yes"/>
<SetProperty Id="ALLUSERS" Value="2" After="AppSearch" Sequence="both" Condition="NOT Installed AND (MACHINE_HOST OR MACHINE_FOLDER) AND NOT (USER_HOST OR USER_FOLDER) AND UILevel &gt;= 5"/>
<SetProperty Id="MSIINSTALLPERUSER" Value="" After="SetALLUSERS" Sequence="both" Condition="(MACHINE_HOST OR MACHINE_FOLDER) AND NOT (USER_HOST OR USER_FOLDER) AND UILevel &gt;= 5"/>
<SetProperty Id="INSTALLSCOPE" Value="machine" After="SetMSIINSTALLPERUSER" Sequence="both" Condition="NOT MSIINSTALLPERUSER"/>
<InstallUISequence><Show Dialog="PrepareDlg" After="ApplyLanguage"/><FindRelatedProducts After="CostFinalize"/><LaunchConditions After="FindRelatedProducts"/></InstallUISequence>
<InstallExecuteSequence><Custom Action="InitializeLanguage" After="SetINSTALLSCOPE" Condition="UILevel &lt; 5 AND NOT REMOVE"/><Custom Action="ApplyLanguage" After="InitializeLanguage" Condition="UILevel &gt;= 5 AND NOT REMOVE"/><FindRelatedProducts After="CostFinalize"/><LaunchConditions After="FindRelatedProducts"/></InstallExecuteSequence>
<SetProperty Id="INSTALLFOLDER" Value="[USER_FOLDER]" Before="CostFinalize" Sequence="both" Condition="NOT INSTALLFOLDER AND MSIINSTALLPERUSER AND USER_FOLDER"/>
<SetProperty Id="INSTALLFOLDER" Value="[MACHINE_FOLDER]" Before="SetINSTALLFOLDER" Sequence="both" Condition="NOT INSTALLFOLDER AND NOT MSIINSTALLPERUSER AND MACHINE_FOLDER" Action="SetINSTALLFOLDERMachine"/>
<SetProperty Id="INSTALLFOLDER" Value="[LocalAppDataFolder]MailAiAssist\\app-msi" Before="SetINSTALLFOLDERMachine" Sequence="both" Condition="NOT INSTALLFOLDER AND MSIINSTALLPERUSER AND NOT USER_FOLDER" Action="SetINSTALLFOLDERUserDefault"/>
<SetProperty Id="INSTALLFOLDER" Value="[ProgramFiles64Folder]MailAiAssist" Before="SetINSTALLFOLDERUserDefault" Sequence="both" Condition="NOT INSTALLFOLDER AND NOT MSIINSTALLPERUSER AND NOT MACHINE_FOLDER" Action="SetINSTALLFOLDERMachineDefault"/>
<Launch Condition="Installed OR REMOVE OR ((MSIINSTALLPERUSER OR NOT (USER_HOST OR USER_FOLDER)) AND (NOT MSIINSTALLPERUSER OR NOT (MACHINE_HOST OR MACHINE_FOLDER)))" Message="[MAILAI_OTHER_SCOPE]"/>
<StandardDirectory Id="ProgramFiles64Folder"><Directory Id="INSTALLFOLDER" Name="MailAiAssist"><Directory Id="HelperFolder" Name="helper"/><Directory Id="RuntimeFolder" Name="runtime"/></Directory></StandardDirectory>
<StandardDirectory Id="ProgramMenuFolder"><Directory Id="MenuFolder" Name="Mail AI Assist"/></StandardDirectory>
<DirectoryRef Id="INSTALLFOLDER"><Component Id="Registration" Guid="79175554-BA59-5888-BFD4-77125F576BDF"><RegistryValue Root="HKMU" Key="Software\\Jin Lu\\Mail AI Assist" Name="InstallerLanguage" Type="string" Value="[MAILAILANGUAGE]"/><RegistryValue Root="HKMU" Key="Software\\Mozilla\\NativeMessagingHosts\\local.mail_ai_assist" Type="string" Value="[INSTALLFOLDER]native-host.json" KeyPath="yes"/><RegistryValue Root="HKMU" Key="Software\\Jin Lu\\Mail AI Assist" Name="InstallFolder" Type="string" Value="[INSTALLFOLDER]"/></Component></DirectoryRef>
<DirectoryRef Id="MenuFolder"><Component Id="MenuShortcut" Guid="EEFBF8A4-6819-4139-9866-1C15D48D8F7D"><Shortcut Id="GuideShortcut" Name="Mail AI Assist" Target="[INSTALLFOLDER]setup-guide.html" WorkingDirectory="INSTALLFOLDER" Icon="MailAIIcon.ico" IconIndex="0"/><RemoveFolder Id="RemoveMenuFolder" On="uninstall"/><RegistryValue Root="HKMU" Key="Software\\Jin Lu\\Mail AI Assist" Name="StartMenu" Type="integer" Value="1" KeyPath="yes"/></Component></DirectoryRef>
{''.join(directories)}
<Feature Id="MainFeature" Title="Mail AI Assist" Level="1">{''.join(components)}<ComponentRef Id="Registration"/><ComponentRef Id="MenuShortcut"/></Feature>
<ui:WixUI Id="WixUI_InstallDir" InstallDirectory="INSTALLFOLDER"/>
<UIRef Id="MailAIScopeUI"/><UIRef Id="MailAILanguageUI"/>
<WixVariable Id="WixUILicenseRtf" Value="{escape(str(root / 'installer/license.rtf'))}"/>
<WixVariable Id="WixUIBannerBmp" Value="{escape(str(root / 'installer/assets/banner.bmp'))}"/>
<WixVariable Id="WixUIDialogBmp" Value="{escape(str(root / 'installer/assets/dialog.bmp'))}"/>
<Property Id="WIXUI_EXITDIALOGOPTIONALCHECKBOXTEXT" Value="Open the installation guide"/>
<Property Id="WIXUI_EXITDIALOGOPTIONALCHECKBOX" Value="1"/>
<Property Id="WixShellExecTarget" Value="[#GuideFile]"/>
<CustomAction Id="OpenGuide" BinaryRef="Wix4UtilCA_X64" DllEntry="WixShellExec" Impersonate="yes" Return="ignore"/>
<UI><Publish Dialog="ExitDialog" Control="Finish" Event="DoAction" Value="OpenGuide" Condition="WIXUI_EXITDIALOGOPTIONALCHECKBOX = 1 AND NOT Installed"/></UI>
</Package></Wix>'''
# Native dialogs and fonts remain permanent; only formatted display properties change.
subprocess.run([sys.executable, 'installer/build-language-action.py'], check=True)
(stage / 'msi-install.json').write_text(json.dumps({**json.loads((stage / 'msi-install.json').read_text(encoding='utf-8')), 'installerLanguage': 'en'}, indent=2), encoding='utf-8')
generated = root / 'work/installer-multilingual.wxs'
generated.write_text(wxs, encoding='utf-8')
msi = release / f'Mail-AI-Assist-{version}-x64.msi'
subprocess.run([wix, 'build', str(generated), str(root / 'installer/scope-ui.wxs'), str(root / 'installer/language-ui.wxs'), '-culture', 'en-US', '-arch', 'x64', '-ext', 'WixToolset.UI.wixext/4.0.6', '-ext', 'WixToolset.Util.wixext/4.0.6', '-o', str(msi)], check=True)
subprocess.run([sys.executable, 'installer/msi-database.py', 'prepare', str(msi)], check=True)
subprocess.run([str(node), 'installer/sign-release.mjs'], check=True)
xpi_hash = hashlib.sha256((release / xpi_name).read_bytes()).hexdigest()
(upload / 'updates.json').write_text(json.dumps({'addons': {config['addonId']: {'updates': [{'version': version, 'update_link': (f'https://github.com/{config["githubRepository"]}/releases/download/v{version}/{xpi_name}' if config.get('githubRepository') else config['baseUrl'] + f'releases/{version}/{xpi_name}'), 'update_hash': 'sha256:' + xpi_hash, 'applications': {'gecko': {'strict_min_version': '128.0'}}}]}}}, indent=2), encoding='utf-8')
for item in release.glob('*.wixpdb'): item.unlink()
shutil.copy2(release / xpi_name, root / 'dist' / xpi_name)
shutil.copy2(msi, root / 'dist' / msi.name)
print('Release built:', version)





# Flat assets can be attached directly to a GitHub Release without extracting directories.
github_assets = root / 'dist/github-release' / ('v' + version)
github_assets.mkdir(parents=True, exist_ok=True)
for asset in [msi, release / xpi_name, upload / 'helper-updates.json']:
    shutil.copy2(asset, github_assets / asset.name)
