"""Compile the embedded native MSI localization action."""
from pathlib import Path
import json
import subprocess

root = Path(__file__).resolve().parent.parent
import os
os.chdir(root)
(root / 'work').mkdir(exist_ok=True)
catalogs = json.loads((root / 'installer/ui-catalogs.json').read_text(encoding='utf-8'))
locales = json.loads((root / 'installer/locales.json').read_text(encoding='utf-8'))
names = ['English', 'Deutsch', 'Français', 'Italiano', 'Español', 'Português (Portugal)', '简体中文', '繁體中文', '日本語', '한국어']
titles = ['Choose installation language', 'Installationssprache auswählen', 'Choisir la langue d’installation', 'Scegli la lingua di installazione', 'Elegir el idioma de instalación', 'Escolher o idioma de instalação', '选择安装语言', '選擇安裝語言', 'インストール言語を選択', '설치 언어 선택']
def literal(value):
    return 'nullptr' if value is None else 'L' + json.dumps(value, ensure_ascii=True)
import runpy
bindings = runpy.run_path('installer/language-resources.py')['bindings']
lines = ['// Generated localized display strings. Dialogs and fonts remain in the MSI.']
for index, language in enumerate(locales):
    lines.append(f'static const TextBinding texts_{index}[] = {{')
    for binding in bindings:
        lines.append('{' + literal(binding['property']) + ',' + literal(binding['values'][language]) + '},')
    lines.append('};')
lines.append('static const Language languages[] = {')
for index, (language, locale) in enumerate(locales.items()):
    strings = locale['strings']
    values = [language, names[index], titles[index], strings['Next'], strings['Cancel'], strings['Downgrade'], strings['Windows64'], strings['OtherScope'], strings['OpenGuide']]
    lines.append('{' + ','.join(map(literal, values)) + f', {locale["lcid"]}, texts_{index}, _countof(texts_{index})' + '},')
lines.append('};')
(root / 'work/language-data.h').write_text('\n'.join(lines), encoding='ascii')
from build_tools import compiler_environment
compiler = compiler_environment()
prefix = f'call "{compiler}" >nul && ' if compiler else ''
command = prefix + 'cl /nologo /O2 /MT /EHsc /std:c++17 /W4 /LD /Iwork installer/language-action.cpp /Fework/language-action.dll /Fowork/language-action.obj /link msi.lib /INCREMENTAL:NO'
subprocess.run('cmd.exe /d /c ' + command, check=True)
