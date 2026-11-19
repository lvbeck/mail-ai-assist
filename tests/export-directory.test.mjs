import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,stat,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {desktopExportDirectory,saveDesktopExportDirectory,beginEml,appendEml,finishEml,prepareDesktop,cleanupDesktop,cleanupAllDesktop} from '../helper/desktop-export.mjs';
import {storageFixture,nativeLockOptions} from './storage-fixture.mjs';
test('custom directory persists; TXT and EML sessions retain their paths across changes',nativeLockOptions,async t=>{
 const {root:sandbox,dataRoot}=await storageFixture(t,'mail-export-directory-test-',cleanupAllDesktop);
 const first=join(sandbox,'第一 Folder'),second=join(sandbox,'Second Folder');await mkdir(first);await mkdir(second);
 try {
  assert.equal(await desktopExportDirectory(),join(dataRoot,'Exports'));
  await saveDesktopExportDirectory(first);assert.equal(await desktopExportDirectory(),first);
  const bytes=Buffer.from('Subject: Test\r\n\r\nBody');
  const eml=await beginEml({target:'chatgpt',size:bytes.length});assert.ok(eml.path.startsWith(first));
  await saveDesktopExportDirectory(second);
  assert.equal(JSON.parse(await readFile(join(dataRoot,'export-settings.json'),'utf8')).path,second);
  await appendEml({token:eml.token,offset:0,base64:bytes.toString('base64')});
  const finished=await finishEml({token:eml.token},AbortSignal.abort());assert.equal(finished.path,eml.path);assert.deepEqual(await readFile(eml.path),bytes);
  const txt=await prepareDesktop({target:'chatgpt',format:'txt',mail:{body:'Local body'}},AbortSignal.abort());assert.ok(txt.path.startsWith(second));
  await saveDesktopExportDirectory(first);await cleanupDesktop({token:txt.token});await assert.rejects(stat(txt.path),{code:'ENOENT'});
  await cleanupDesktop({token:eml.token});await assert.rejects(stat(eml.path),{code:'ENOENT'});
  const file=join(sandbox,'not-directory');await writeFile(file,'keep');await assert.rejects(saveDesktopExportDirectory(file));await assert.rejects(saveDesktopExportDirectory('relative'));assert.equal(await desktopExportDirectory(),first);await unlink(file);
 } finally {
  await cleanupAllDesktop();
 }
});
