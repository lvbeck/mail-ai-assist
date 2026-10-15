"""Validate permanent MSI UI and property localization without starting the wizard."""
import ctypes as c
import importlib.util
import json
import hashlib
import runpy
from pathlib import Path

spec = importlib.util.spec_from_file_location('database', 'installer/msi-database.py')
database = importlib.util.module_from_spec(spec); spec.loader.exec_module(database)
msi = database.msi
dll = c.WinDLL(str(Path('work/language-action.dll').resolve()))
config = json.loads(Path('installer/release-config.json').read_text())
locales = json.loads(Path('installer/locales.json').read_text(encoding='utf-8'))
path = str(Path(f'dist/Mail-AI-Assist-{config["version"]}-x64.msi').resolve())
original_hash = hashlib.sha256(Path(path).read_bytes()).hexdigest()
measure = runpy.run_path('installer/ui-metrics.py')['button_width']
def formatted(session, text):
    record = msi.MsiCreateRecord(0); database.check(msi.MsiRecordSetStringW(record, 0, text))
    size = c.c_uint(0); msi.MsiFormatRecordW(session, record, None, c.byref(size))
    buffer = c.create_unicode_buffer(size.value + 1); size.value += 1
    database.check(msi.MsiFormatRecordW(session, record, buffer, c.byref(size))); msi.MsiCloseHandle(record)
    return buffer.value
for language in locales:
    session = c.c_uint(); database.check(msi.MsiOpenPackageExW(path, 1, c.byref(session)))
    db = msi.MsiGetActiveDatabase(session)
    try:
        controls = database.rows(db, 'Control')['rows']
        # MSI error 2870 is raised when nonempty Help lacks its required separator.
        assert all(not row[11] or '|' in row[11] for row in controls)
        progress = {row[1]: row for row in controls if row[0] == 'ProgressDlg'}
        for upper, lower in [('StatusLabel', 'ActionText'), ('ActionText', 'ProgressBar')]:
            assert int(progress[upper][4]) + int(progress[upper][6]) + 6 <= int(progress[lower][4])
        assert int(progress['StatusLabel'][6]) >= 18
        dialogs = database.rows(db, 'Dialog')['rows']
        styles = database.rows(db, 'TextStyle')['rows']
        assert any(row[0]=='WixUI_Font_Normal' and row[1]=='Segoe UI' and row[2]=='10' for row in styles)
        assert {'WelcomeDlg','FatalError','MailAISelectorDlg','MailAIScopeDlg'}.issubset({row[0] for row in dialogs})
        radio = [row for row in database.rows(db, 'ListBox')['rows'] if row[0]=='MAILAILANGUAGE']
        assert len(radio)==len(locales)
        assert len([row for row in controls if row[0]=='LicenseAgreementDlg' and row[2]=='ScrollableText'])==len(locales)
        database.check(msi.MsiSetPropertyW(session, 'MAILAILANGUAGE', language))
        database.check(dll.InitializeLanguage(session))
        for target in ['en', language, 'zh-TW', language]:
            database.check(msi.MsiSetPropertyW(session, 'MAILAILANGUAGE', target))
            database.check(dll.ApplyLanguage(session))
            expected_font = {'zh-CN': 'MailAI_Font_SC', 'zh-TW': 'MailAI_Font_TC', 'ja': 'MailAI_Font_JA', 'ko': 'MailAI_Font_KO'}.get(target, 'WixUI_Font_Normal')
            assert formatted(session, '[DefaultUIFont]') == expected_font
            for row in controls:
                if row[2] == 'PushButton' and int(row[4]) >= 230 and not int(row[7]) & (0x40000 | 0x80000):
                    assert int(row[5]) >= measure(formatted(session, row[9]), target), row[:2]
            next_text = next(row[9] for row in controls if row[:2]==['MailAIScopeDlg','Next'])
            assert formatted(session,next_text).strip()==locales[target]['strings']['Next']
            title = next(row[9] for row in controls if row[:2]==['MailAIScopeDlg','Title'])
            assert locales[target]['strings']['ScopeTitle'] in formatted(session,title)
            assert formatted(session,'[MAILAI_LANG_NAME_6]')=='简体中文'
            assert formatted(session,'[MAILAI_LANG_NAME_7]')=='繁體中文'
            assert formatted(session,'[MAILAI_LANG_NAME_8]')=='日本語'
            assert formatted(session,'[MAILAI_LANG_NAME_9]')=='한국어'
            assert database.rows(db,'Control')['rows']==controls
            assert database.rows(db,'Dialog')['rows']==dialogs
            assert database.rows(db,'TextStyle')['rows']==styles
        print('PASS: permanent dialogs/fonts and localized display properties:',language)
        database.check(msi.MsiSetPropertyW(session, 'MAILAILANGUAGE', ''))
        database.check(msi.MsiSetPropertyW(session, 'REMOVE', 'ALL'))
        database.check(dll.InitializeLanguage(session))
        database.check(dll.ApplyLanguage(session))
        assert formatted(session, '[MAILAILANGUAGE]') == ''
        database.check(msi.MsiSetPropertyW(session, 'REMOVE', ''))
        database.check(msi.MsiSetPropertyW(session, 'MACHINE_LANGUAGE', language))
        database.check(msi.MsiSetPropertyW(session, 'USER_LANGUAGE', language))
        database.check(dll.ApplyLanguage(session))
        assert formatted(session, '[MAILAILANGUAGE]') == language
    finally:
        msi.MsiCloseHandle(db); msi.MsiCloseHandle(session)
assert hashlib.sha256(Path(path).read_bytes()).hexdigest()==original_hash
