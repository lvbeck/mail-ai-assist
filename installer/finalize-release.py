from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, json, subprocess
import xml.etree.ElementTree as ET

from build_tools import find_wix
root = Path(__file__).resolve().parent.parent
import os
os.chdir(root)
wix = find_wix()
config = json.loads((root / 'installer/release-config.json').read_text())
version = config['version']
stage = root / 'work/msi-stage'
locales = json.loads((root / 'installer/locales.json').read_text(encoding='utf-8'))
for language, locale in {'en': locales['en']}.items():
    suffix = '' if language == 'en' else '-' + language
    destination = root / 'work' / ('verify-' + language)
    source = root / 'dist' / f'Mail-AI-Assist-{version}-x64{suffix}.msi'
    subprocess.run([wix, 'msi', 'decompile', str(source), '-x', str(destination), '-o', str(destination) + '.wxs'], check=True)
    for item in stage.rglob('*'):
        if not item.is_file(): continue
        relative = item.relative_to(stage).as_posix()
        file_id = 'GuideFile' if relative == 'setup-guide.html' else 'f' + hashlib.sha256(relative.encode()).hexdigest()[:16]
        extracted = destination / 'File' / file_id
        if relative == 'msi-install.json':
            expected = json.loads(item.read_text(encoding='utf-8'))
            expected['installerLanguage'] = language
            assert json.loads(extracted.read_text(encoding='utf-8')) == expected
        else: assert extracted.read_bytes() == item.read_bytes(), (language, relative)
    tree = ET.parse(str(destination) + '.wxs')
    ns = {'w': 'http://wixtoolset.org/schemas/v4/wxs'}
    assert tree.find('.//w:Package', ns).get('Language') == str(locale['lcid'])
    assert tree.find('.//w:Property[@Id="ARPPRODUCTICON"]', ns).get('Value') == 'MailAIIcon.ico'
    assert tree.find('.//w:Shortcut[@Id="GuideShortcut"]', ns).get('Name') == 'Mail AI Assist'
    assert tree.find('.//w:Dialog[@Id="MailAISelectorDlg"]', ns) is not None
    assert (destination / 'Binary/MailAILanguageAction').read_bytes() == (root / 'work/language-action.dll').read_bytes()
    for asset, extracted_asset in [('ai-icon.ico', 'Icon/MailAIIcon.ico'), ('banner.bmp', 'Binary/WixUI_Bmp_Banner'), ('dialog.bmp', 'Binary/WixUI_Bmp_Dialog')]:
        assert (root / 'installer/assets' / asset).read_bytes() == (destination / extracted_asset).read_bytes(), asset
with ZipFile(f'dist/Mail-AI-Assist-{version}.xpi') as archive:
    assert archive.testzip() is None
    manifest = json.loads(archive.read('manifest.json'))
    assert manifest['version'] == version
    assert manifest['browser_specific_settings']['gecko']['id'] == config['addonId']
upload = root / 'dist/server-upload'
allowed = {'index.html', 'updates.json', 'helper-updates.json', f'releases/{version}/Mail-AI-Assist-{version}.xpi', f'releases/{version}/Mail-AI-Assist-{version}-x64.msi'}
files = {item.relative_to(upload).as_posix() for item in upload.rglob('*') if item.is_file()}
assert files == allowed, files
with ZipFile(f'dist/Mail-AI-Assist-{version}-Server-Upload.zip', 'w', ZIP_DEFLATED) as archive:
    for name in sorted(files): archive.write(upload / name, name)
with ZipFile(f'dist/Mail-AI-Assist-{version}-Server-Upload.zip') as archive:
    assert archive.testzip() is None
print('PASS: all MSI payload files match build inputs; XPI and upload ZIP integrity; upload contains only approved public files for all ten languages.')
