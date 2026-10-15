"""Read installer UI catalogs and prepare the single multilingual package."""
import ctypes as c
import json
import sys
from pathlib import Path

msi = c.WinDLL('msi')
handle = c.c_uint
def check(result):
    if result: raise RuntimeError(f'Windows Installer error {result}')
def open_db(path, writable=False):
    value = handle()
    check(msi.MsiOpenDatabaseW(str(Path(path).resolve()), c.c_void_p(1 if writable else 0), c.byref(value)))
    return value
def view(db, query):
    value = handle()
    check(msi.MsiDatabaseOpenViewW(db, query, c.byref(value)))
    check(msi.MsiViewExecute(value, 0))
    return value
def string(record, column):
    size = c.c_uint(0)
    msi.MsiRecordGetStringW(record, column, None, c.byref(size))
    buffer = c.create_unicode_buffer(size.value + 1)
    size.value += 1
    check(msi.MsiRecordGetStringW(record, column, buffer, c.byref(size)))
    return buffer.value
def rows(db, table):
    v = view(db, f'SELECT * FROM `{table}`')
    info = handle()
    check(msi.MsiViewGetColumnInfo(v, 0, c.byref(info)))
    count = msi.MsiRecordGetFieldCount(info)
    columns = [string(info, i) for i in range(1, count + 1)]
    msi.MsiCloseHandle(info)
    check(msi.MsiViewGetColumnInfo(v, 1, c.byref(info)))
    types = [string(info, i) for i in range(1, count + 1)]
    msi.MsiCloseHandle(info)
    result = []
    while True:
        record = handle()
        status = msi.MsiViewFetch(v, c.byref(record))
        if status == 259: break
        check(status)
        result.append([None if msi.MsiRecordIsNull(record, i) else string(record, i) for i in range(1, count + 1)])
        msi.MsiCloseHandle(record)
    msi.MsiCloseHandle(v)
    return {'columns': columns, 'types': types, 'rows': result}

tables = ['Dialog', 'Control', 'ControlCondition', 'ControlEvent', 'EventMapping', 'RadioButton', 'TextStyle', 'UIText', 'ListBox', 'CheckBox']
if __name__ == '__main__' and sys.argv[1] == 'extract':
    if len(sys.argv) != 4:
        raise SystemExit('Usage: msi-database.py extract BASELINE_DIRECTORY BASELINE_VERSION')
    baseline = Path(sys.argv[2]).resolve()
    baseline_version = sys.argv[3]
    result = {}
    for language in json.loads(Path('installer/locales.json').read_text(encoding='utf-8')):
        suffix = '' if language == 'en' else '-' + language
        db = open_db(baseline / f'Mail-AI-Assist-{baseline_version}-x64{suffix}.msi')
        result[language] = {table: rows(db, table) for table in tables}
        msi.MsiCloseHandle(db)
    Path('installer/ui-catalogs.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
elif __name__ == '__main__' and sys.argv[1] == 'prepare':
    db = open_db(sys.argv[2], True)
    import runpy
    resources = runpy.run_path('installer/language-resources.py')
    def execute(query, values):
        v = handle()
        check(msi.MsiDatabaseOpenViewW(db, query, c.byref(v)))
        record = msi.MsiCreateRecord(len(values))
        for i, value in enumerate(values): check(msi.MsiRecordSetStringW(record, i + 1, value))
        check(msi.MsiViewExecute(v, record))
        msi.MsiCloseHandle(record); msi.MsiCloseHandle(v)
    def insert(table, values, types):
        v = view(db, f'SELECT * FROM `{table}`')
        record = msi.MsiCreateRecord(len(values))
        for i, value in enumerate(values):
            if value is None: continue
            if types[i][0].lower() == 'i': check(msi.MsiRecordSetInteger(record, i + 1, int(value)))
            else: check(msi.MsiRecordSetStringW(record, i + 1, value))
        check(msi.MsiViewModify(v, 1, record))
        msi.MsiCloseHandle(record); msi.MsiCloseHandle(v)
    for binding in resources['bindings']:
        where = ' AND '.join('`' + key + '` = ' + (value if key == 'Order' else "'" + value.replace("'", "''") + "'") for key, value in zip(binding['keys'], binding['key']))
        execute(f"UPDATE `{binding['table']}` SET `{binding['field']}` = ? WHERE {where}", [binding['prefix'] + '[' + binding['property'] + '] '])
        execute('INSERT INTO `Property` (`Property`,`Value`) VALUES (?,?)', [binding['property'], binding['values']['en']])
    # Fonts must exist before Windows Installer creates any UI window.
    execute('UPDATE `TextStyle` SET `FaceName` = ?', ['Segoe UI'])
    v = view(db, "UPDATE `TextStyle` SET `Size` = 10 WHERE `TextStyle` = 'WixUI_Font_Normal'"); msi.MsiCloseHandle(v)
    for name, face in [('MailAI_Font_SC', 'Microsoft YaHei UI'), ('MailAI_Font_TC', 'Microsoft JhengHei UI'), ('MailAI_Font_JA', 'Yu Gothic UI'), ('MailAI_Font_KO', 'Malgun Gothic')]:
        insert('TextStyle', [name, face, '10', None, None], rows(db, 'TextStyle')['types'])
    execute("UPDATE `TextStyle` SET `FaceName` = ? WHERE `TextStyle` = 'WixUI_Font_Bigger'", ['Microsoft YaHei UI'])
    execute("UPDATE `TextStyle` SET `FaceName` = ? WHERE `TextStyle` = 'WixUI_Font_Title'", ['Microsoft YaHei UI'])
    # Size buttons for the widest supported translation, keeping alternate actions aligned.
    measure = runpy.run_path('installer/ui-metrics.py')['button_width']
    controls = rows(db, 'Control')['rows']
    localized = {tuple(b['key']): b['values'] for b in resources['bindings'] if b['table'] == 'Control'}
    dialogs = {r[0]: int(r[3]) for r in rows(db, 'Dialog')['rows']}
    groups = {}
    for row in controls:
        if row[2] != 'PushButton' or int(row[7]) & (0x40000 | 0x80000): continue
        labels = localized.get(tuple(row[:2]), {'en': row[9] or ''})
        if row[0] == 'MailAISelectorDlg':
            locales = json.loads(Path('installer/locales.json').read_text(encoding='utf-8'))
            labels = {lang: entry['strings'][row[1]] for lang, entry in locales.items()}
        width = max(measure(text, lang) for lang, text in labels.items())
        if int(row[4]) >= 230:
            groups.setdefault(row[0], {}).setdefault(int(row[3]), []).append((row, width))
        elif row[0] != 'ErrorDlg':
            v = view(db, f"UPDATE `Control` SET `Width` = {width}, `Height` = 22 WHERE `Dialog_` = '{row[0]}' AND `Control` = '{row[1]}'")
            msi.MsiCloseHandle(v)
    for dialog, slots in groups.items():
        right = dialogs[dialog] - 12
        for old_x, items in sorted(slots.items(), reverse=True):
            width = max(item[1] for item in items)
            left = right - width
            if left < 8: raise RuntimeError(f'Localized buttons exceed dialog width: {dialog}')
            for row, _ in items:
                v = view(db, f"UPDATE `Control` SET `X` = {left}, `Width` = {width}, `Height` = 22 WHERE `Dialog_` = '{dialog}' AND `Control` = '{row[1]}'")
                msi.MsiCloseHandle(v)
            right = left - 6
    for dialog in ['FatalError', 'UserExit']:
        v = view(db, f"UPDATE `Control` SET `Y` = 85, `Height` = 135 WHERE `Dialog_` = '{dialog}' AND `Control` = 'Description'")
        msi.MsiCloseHandle(v)
    # Native checkboxes cannot paint transparently. Limit the button to its glyph
    # and render its caption using a separate transparent text control.
    checkbox = next(r for r in rows(db, 'Control')['rows'] if r[:2] == ['ExitDialog', 'OptionalCheckBox'])
    caption = checkbox.copy()
    caption[1:10] = ['GuideCaption', 'Text', '150', '200', '205', '28', '65538', None, checkbox[9]]
    caption[10] = None
    insert('Control', caption, rows(db, 'Control')['types'])
    execute("UPDATE `Control` SET `Text` = ?, `Help` = ? WHERE `Dialog_` = 'ExitDialog' AND `Control` = 'OptionalCheckBox'", ['', ''])
    v = view(db, "UPDATE `Control` SET `Y` = 202, `Width` = 12, `Height` = 12 WHERE `Dialog_` = 'ExitDialog' AND `Control` = 'OptionalCheckBox'"); msi.MsiCloseHandle(v)
    for condition in rows(db, 'ControlCondition')['rows']:
        if condition[:2] == ['ExitDialog', 'OptionalCheckBox']:
            condition[1] = 'GuideCaption'
            insert('ControlCondition', condition, rows(db, 'ControlCondition')['types'])
    # Give enlarged status text its own rows above the progress bar.
    for control, y, height in [('StatusLabel', 104, 18), ('ActionText', 128, 36), ('ProgressBar', 174, 12)]:
        v = view(db, f"UPDATE `Control` SET `X` = 20, `Y` = {y}, `Width` = 330, `Height` = {height} WHERE `Dialog_` = 'ProgressDlg' AND `Control` = '{control}'")
        msi.MsiCloseHandle(v)
    # ScrollableText does not expand properties, so keep permanent language variants.
    original = next(row for row in rows(db, 'Control')['rows'] if row[0] == 'LicenseAgreementDlg' and row[2] == 'ScrollableText')
    control_types = rows(db, 'Control')['types']
    condition_types = rows(db, 'ControlCondition')['types']
    for language, catalog in resources['catalogs'].items():
        control_id = original[1] if language == 'en' else original[1] + '_' + language.replace('-', '_')
        if language != 'en':
            row = original.copy(); row[1] = control_id
            row[9] = next(r[9] for r in catalog['Control']['rows'] if r[:2] == original[:2])
            row[10] = None
            insert('Control', row, control_types)
        condition = 'MAILAILANGUAGE = "' + language + '"'
        insert('ControlCondition', ['LicenseAgreementDlg', control_id, 'Show', condition], condition_types)
        insert('ControlCondition', ['LicenseAgreementDlg', control_id, 'Hide', 'NOT (' + condition + ')'], condition_types)
    check(msi.MsiDatabaseCommit(db))
    msi.MsiCloseHandle(db)
