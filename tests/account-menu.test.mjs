import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../extension/account-menu.js', import.meta.url), 'utf8');
function fixture() {
  const callbacks = {}, menu = {}, saved = { autoTagAccounts: { a: 123 } };
  const messenger = {
    accounts: { get: async id => id === 'missing' ? null : ({ id, type: id === 'local' ? 'local' : 'imap' }) },
    storage: { local: { get: async () => structuredClone(saved), set: async value => Object.assign(saved, value) } },
    menus: {
      onShown: { addListener(fn) { callbacks.show = fn; } }, onHidden: { addListener(fn) { callbacks.hide = fn; } }, onClicked: { addListener(fn) { callbacks.click = fn; } },
      update: async (id, value) => { menu[id] = { ...menu[id], ...value }; }, refresh: async () => {}
    }
  };
  vm.runInNewContext(source, { messenger });
  const root = id => ({ selectedFolders: [{ accountId: id, isRoot: true }] });
  return { callbacks, menu, saved, root };
}
test('account menu reflects existing state and new accounts default off', async () => {
  const h = fixture();
  await h.callbacks.show(h.root('a')); assert.equal(h.menu['account-ai'].visible, true); assert.equal(h.menu['account-ai-auto-tags'].checked, true);
  await h.callbacks.show(h.root('b')); assert.equal(h.menu['account-ai-auto-tags'].checked, false);
  assert.equal(h.saved.autoTagAccounts.a, 123);
});
test('click uses clicked account and preserves other accounts', async () => {
  const h = fixture(); await h.callbacks.show(h.root('a'));
  await h.callbacks.click({ ...h.root('b'), menuItemId: 'account-ai-auto-tags', checked: true });
  assert.ok(Number.isFinite(h.saved.autoTagAccounts.b)); assert.equal(h.saved.autoTagAccounts.a, 123);
  await h.callbacks.click({ ...h.root('a'), menuItemId: 'account-ai-auto-tags', checked: false });
  assert.equal(h.saved.autoTagAccounts.a, undefined); assert.ok(h.saved.autoTagAccounts.b);
});
test('ordinary folders, multiple roots, local folders and missing accounts cannot toggle', async () => {
  const h = fixture();
  for (const info of [{ selectedFolders: [{ accountId: 'a', isRoot: false }] }, { selectedFolders: [...h.root('a').selectedFolders, ...h.root('b').selectedFolders] }, h.root('local'), h.root('missing'), {}]) {
    await h.callbacks.show(info); assert.equal(h.menu['account-ai'].visible, false);
    await h.callbacks.click({ ...info, menuItemId: 'account-ai-auto-tags', checked: false });
    assert.equal(h.saved.autoTagAccounts.a, 123);
  }
});
test('legacy MV2 account context is supported', async () => {
  const h = fixture(); await h.callbacks.show({ selectedAccount: { id: 'a' } });
  assert.equal(h.menu['account-ai-auto-tags'].checked, true);
});

test('automatic summary toggle is independent and defaults off', async () => {
 const h = fixture(); await h.callbacks.show(h.root('a'));
 assert.equal(h.menu['account-ai-auto-summary'].checked, false);
 await h.callbacks.click({ ...h.root('a'), menuItemId: 'account-ai-auto-summary', checked: true });
 assert.ok(Number.isFinite(h.saved.autoSummaryAccounts.a)); assert.equal(h.saved.autoTagAccounts.a, 123);
 await h.callbacks.show(h.root('a')); assert.equal(h.menu['account-ai-auto-summary'].checked, true);
 await h.callbacks.click({ ...h.root('a'), menuItemId: 'account-ai-auto-summary', checked: false });
 assert.equal(h.saved.autoSummaryAccounts.a, undefined);
});
