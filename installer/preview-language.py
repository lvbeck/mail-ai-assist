"""Read-only MSI dialog preview: no installation sequence or product actions."""
import ctypes as c
from ctypes import wintypes
import importlib.util
import json
from pathlib import Path
import sys
import time

spec = importlib.util.spec_from_file_location('database', 'installer/msi-database.py')
db = importlib.util.module_from_spec(spec)
spec.loader.exec_module(db)
version = json.loads(Path('installer/release-config.json').read_text())['version']
preview = c.c_uint()
database = db.open_db(f'dist/Mail-AI-Assist-{version}-x64.msi', True)
try:
    catalog = json.loads(Path('installer/ui-catalogs.json').read_text(encoding='utf-8'))[sys.argv[1]]
    for table, data in catalog.items():
        view = db.view(database, f'SELECT * FROM `{table}`')
        for values in data['rows']:
            record = db.msi.MsiCreateRecord(len(values))
            for i, value in enumerate(values):
                if value is None: continue
                if data['types'][i][0].lower() == 'i': db.check(db.msi.MsiRecordSetInteger(record, i + 1, int(value)))
                else: db.check(db.msi.MsiRecordSetStringW(record, i + 1, value))
            db.check(db.msi.MsiViewModify(view, 7, record))
            db.msi.MsiCloseHandle(record)
        db.msi.MsiCloseHandle(view)
    if sys.argv[2] == 'MailAISelectorDlg':
        locale = json.loads(Path('installer/locales.json').read_text(encoding='utf-8'))[sys.argv[1]]['strings']
        for name, value in {'MAILAI_SELECTOR_TITLE': '选择安装语言', 'MAILAI_SELECTOR_NEXT': locale['Next'], 'MAILAI_SELECTOR_CANCEL': locale['Cancel'], 'MAILAILANGUAGE': sys.argv[1]}.items():
            view = db.view(database, 'SELECT `Property`,`Value` FROM `Property`')
            record = db.msi.MsiCreateRecord(2)
            db.check(db.msi.MsiRecordSetStringW(record, 1, name)); db.check(db.msi.MsiRecordSetStringW(record, 2, value))
            db.check(db.msi.MsiViewModify(view, 7, record))
            db.msi.MsiCloseHandle(record); db.msi.MsiCloseHandle(view)
        view = db.view(database, 'SELECT * FROM `ComboBox`')
        for i, (language, name) in enumerate(zip(['de','fr','it','es','pt','zh-CN','zh-TW'],['Deutsch','Français','Italiano','Español','Português (Portugal)','简体中文','繁體中文'])):
            record = db.msi.MsiCreateRecord(4)
            db.check(db.msi.MsiRecordSetStringW(record, 1, 'MAILAILANGUAGE')); db.check(db.msi.MsiRecordSetInteger(record, 2, i + 2))
            db.check(db.msi.MsiRecordSetStringW(record, 3, language)); db.check(db.msi.MsiRecordSetStringW(record, 4, name))
            db.check(db.msi.MsiViewModify(view, 7, record)); db.msi.MsiCloseHandle(record)
        db.msi.MsiCloseHandle(view)
    db.check(db.msi.MsiEnableUIPreview(database, c.byref(preview)))
    db.check(db.msi.MsiPreviewDialogW(preview, sys.argv[2]))
    print('Read-only MSI preview; installation actions are not executed.', flush=True)
    until = time.monotonic() + 180
    message = wintypes.MSG()
    while time.monotonic() < until:
        while c.windll.user32.PeekMessageW(c.byref(message), None, 0, 0, 1):
            c.windll.user32.TranslateMessage(c.byref(message))
            c.windll.user32.DispatchMessageW(c.byref(message))
        time.sleep(0.05)
finally:
    if preview.value: db.msi.MsiPreviewDialogW(preview, None)
    # No commit: the original package is never modified.
    for item in [preview, database]: db.msi.MsiCloseHandle(item)
