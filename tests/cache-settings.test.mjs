import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../extension/cache-settings.js', import.meta.url), 'utf8');
test('cache settings retain the host, recover from disconnect and release it on close', async () => {
  const elements = new Map(), ports = [], events = {}, requests = [];
  let fail = false, stall = false, timeout;
  const el = id => {
    if (!elements.has(id)) elements.set(id, { id, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } });
    return elements.get(id);
  };
  vm.runInNewContext(source, {
    setTimeout(fn) { timeout = fn; return 1; }, clearTimeout() {},
    document: { getElementById: el }, window: { addEventListener(name, fn) { events[name] = fn; } },
    ComposeI18n: { initialize: async () => {}, t: text => text },
    messenger: { runtime: { connectNative() {
      const port = { disconnected: false, onMessage: { addListener(fn) { port.reply = fn; } },
        onDisconnect: { addListener(fn) { port.lost = fn; } },
        disconnect() { port.disconnected = true; },
        postMessage(message) {
          requests.push(message.action);
          if (!stall) queueMicrotask(() => port.reply({ id: message.id, ok: !fail, result: { count: 2, bytes: 1024, path: 'test-cache' } }));
        }
      };
      ports.push(port); return port;
    } } }
  });
  await new Promise(resolve => setImmediate(resolve));
  await el('cacheOpen').listeners.click();
  assert.deepEqual(requests, ['cacheStats', 'cacheOpen', 'cacheStats']);
  assert.equal(ports.length, 1); assert.equal(ports[0].disconnected, false);
  fail = true; await el('cacheOpen').listeners.click();
  assert.match(el('cacheStatus').textContent, /失败/); assert.equal(el('cacheOpen').disabled, false);
  fail = false; ports[0].lost(); await el('cacheRefresh').listeners.click();
  assert.equal(ports.length, 2); assert.equal(el('cachePath').textContent, 'test-cache');
  stall = true; const operation = el('cacheOpen').listeners.click(); timeout(); await operation;
  assert.equal(el('cacheOpen').disabled, false); assert.equal(ports[1].disconnected, true);
  stall = false; await el('cacheRefresh').listeners.click();
  assert.equal(ports.length, 3); events.pagehide(); assert.equal(ports[2].disconnected, true);
});
