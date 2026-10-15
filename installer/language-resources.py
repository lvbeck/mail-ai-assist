"""Formatted MSI text bindings; dialog definitions remain permanent."""
import json
import re
from pathlib import Path

catalogs = json.loads(Path('installer/ui-catalogs.json').read_text(encoding='utf-8'))
bindings = []
for table, field, key_count in [('Control', 'Text', 2), ('Dialog', 'Title', 1), ('RadioButton', 'Text', 2)]:
    data = catalogs['en'][table]
    column = data['columns'].index(field)
    for row in data['rows']:
        if table == 'Control' and row[2] in ['ScrollableText', 'Bitmap', 'Icon', 'Line']: continue
        key = row[:key_count]
        translated = {lang: next(r[column] for r in cat[table]['rows'] if r[:key_count] == key) for lang, cat in catalogs.items()}
        if len(set(translated.values())) == 1 or not row[column]: continue
        match = re.match(r'^(\{\\[^}]+\})', row[column])
        prefix = match.group(1) if match else ''
        translated = {lang: re.sub(r'\{[\\&][^}]*\}', '', value or '') for lang, value in translated.items()}
        bindings.append({'table': table, 'field': field, 'keys': data['columns'][:key_count], 'key': key, 'property': 'MAILAI_TEXT_' + str(len(bindings)), 'prefix': prefix, 'values': translated})
