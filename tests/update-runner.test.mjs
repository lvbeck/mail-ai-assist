import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';

for (const [scope, language] of [['user', 'en'], ['machine', 'en'], ['user', 'fr'], ['machine', 'zh-CN']]) test(`${scope}/${language}: custom paths, verified downloads and scope-appropriate installation`, async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'mail-ai-update-test-'));
  try {
    const installed = join(temporary, 'Custom app folder');
    const cache = join(temporary, 'MailAiAssist', 'updates');
    await mkdir(join(installed, 'helper'), { recursive: true });
    for (const name of ['updater.mjs', 'update-core.mjs', 'installation.mjs', 'update-actions.mjs']) await cp(new URL('../helper/' + name, import.meta.url), join(installed, 'helper', name));
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const baseUrl = 'https://example.invalid/releases/';
    const suffix = language === 'en' ? '' : '-' + language;
    await writeFile(join(installed, 'msi-install.json'), JSON.stringify({ version: '0.9.0', baseUrl, ...(language === 'en' ? {} : { installerLanguage: language }), publicKey: publicKey.export({ type: 'spki', format: 'pem' }) }));
    const bytes = Buffer.from('test MSI; must never be executed');
    const release = { schema: 1, product: 'mail-ai-assist-helper', platform: 'windows-x64', version: '0.9.1', url: baseUrl + `releases/0.9.1/Mail-AI-Assist-0.9.1-x64${suffix}.msi`, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    const payload = Buffer.from(JSON.stringify(release));
    const envelope = { algorithm: 'RSA-SHA256', payload: payload.toString('base64'), signature: sign('RSA-SHA256', payload, privateKey).toString('base64') };
    const shim = join(temporary, 'mock.mjs');
    await writeFile(shim, `import child from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module'; import {writeFileSync} from 'node:fs';
child.execFile=(file,args,options,callback)=>{callback(null,JSON.stringify(${JSON.stringify({root: installed, scope})}));};
child.spawn=(...args)=>{writeFileSync(${JSON.stringify(join(temporary, 'spawn.json'))},JSON.stringify(args));return {on(){},once(event,fn){if(event==='spawn')queueMicrotask(fn);},unref(){}}};syncBuiltinESMExports();
globalThis.fetch=async url=>{writeFileSync(${JSON.stringify(join(temporary, 'fetched.txt'))},url); return url.endsWith('helper-updates${suffix}.json') ? new Response(JSON.stringify(${JSON.stringify(envelope)})) : new Response(Buffer.from(${JSON.stringify(bytes.toString('base64'))},'base64'));};`);
    function run() { const result = spawnSync(process.execPath, ['--import', pathToFileURL(shim).href, join(installed, 'helper', 'updater.mjs')], { env: { ...process.env, LOCALAPPDATA: temporary }, encoding: 'utf8', windowsHide: true, timeout: 15000 }); assert.equal(result.status, 0, result.stderr); }
    run();
    const status = JSON.parse(await readFile(join(cache, 'status.json'), 'utf8'));
    assert.equal(status.state, scope === 'user' ? 'waiting_for_thunderbird_exit' : 'awaiting_admin');
    assert.deepEqual(await readFile(join(cache, 'Mail-AI-Assist-0.9.1-x64.msi')), bytes);
    if (scope === 'user') {
      const command = JSON.parse(await readFile(join(temporary, 'spawn.json'), 'utf8'));
      assert.ok(command[1].includes('-ExpectedHash')); assert.equal(command[2].windowsHide, true);
      await rm(join(temporary, 'spawn.json'));
    } else { await assert.rejects(readFile(join(temporary, 'spawn.json')), { code: 'ENOENT' }); }
    await rm(join(temporary, 'fetched.txt'));
    run();
    await assert.rejects(readFile(join(temporary, 'fetched.txt')), { code: 'ENOENT' });
    await assert.rejects(readFile(join(temporary, 'spawn.json')), { code: 'ENOENT' });
    // Windows PowerShell writes UTF-8 with BOM; the next checker must tolerate it.
    await writeFile(join(cache, 'status.json'), '\uFEFF' + JSON.stringify(status));
    run();
    assert.equal(JSON.parse((await readFile(join(cache, 'status.json'), 'utf8')).replace(/^\uFEFF/, '')).state, status.state);
    if (scope === 'machine') {
      const action = join(installed, 'helper', 'test-action.mjs');
      await writeFile(action, "import {helperUpdateStatus,installHelperUpdate} from './update-actions.mjs'; if (!(await helperUpdateStatus()).available) throw new Error('missing update'); await installHelperUpdate();");
      const invoke = () => spawnSync(process.execPath, ['--import', pathToFileURL(shim).href, action], { env: { ...process.env, LOCALAPPDATA: temporary }, windowsHide: true, encoding: 'utf8' });
      assert.equal(invoke().status, 0);
      const command = JSON.parse(await readFile(join(temporary, 'spawn.json'), 'utf8'));
      assert.ok(command[1].includes('-MachineApproved'));
      await rm(join(temporary, 'spawn.json'));
      await writeFile(join(cache, 'status.json'), JSON.stringify(status));
      await writeFile(join(cache, 'Mail-AI-Assist-0.9.1-x64.msi'), 'tampered installer');
      assert.notEqual(invoke().status, 0);
      await assert.rejects(readFile(join(temporary, 'spawn.json')), { code: 'ENOENT' });
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
