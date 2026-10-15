import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/preview.js';
const { normalize } = globalThis.ComposePreview;
test('preview removes outer padding, trailing whitespace and excess blank lines', () => {
  assert.equal(normalize('\r\n  Hi,  \r\n\r\n\r\n  Test\t\r\n'), 'Hi,\n\nTest');
});
test('preview preserves internal alignment, relative indentation and single newlines', () => {
  assert.equal(normalize('  Items\n    - One\n    - Two\n  Name    Value\n  A       1'), 'Items\n  - One\n  - Two\nName    Value\nA       1');
});
test('preview preserves language content and handles empty input', () => {
  assert.equal(normalize('中文\nGrüße\n繁體中文'), '中文\nGrüße\n繁體中文');
  assert.equal(normalize(' \n\t\n'), '');
});
test('preview normalization is idempotent', () => {
  const text = '\n  Hi\u00a0Jin,  \n\n\n  Thanks\n';
  assert.equal(normalize(normalize(text)), normalize(text));
});
