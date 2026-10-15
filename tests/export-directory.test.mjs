import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat,unlink,rmdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {desktopExportDirectory,saveDesktopExportDirectory,beginEml,appendEml,finishEml,prepareDesktop,cleanupDesktop} from '../helper/desktop-export.mjs';
test('custom directory persists; TXT and EML sessions retain their paths across changes',async()=>{
 const sandbox=await mkdtemp(resolve('work/export-directory-test-'));const previous=process.env.LOCALAPPDATA;process.env.LOCALAPPDATA=sandbox;
 const first=join(sandbox,'第一 Folder'),second=join(sandbox,'Second Folder');await mkdir(first);await mkdir(second);
 try {
  assert.equal(await desktopExportDirectory(),join(sandbox,'MailAiAssist','Exports'));
  await saveDesktopExportDirectory(first);assert.equal(await desktopExportDirectory(),first);
  const bytes=Buffer.from('Subject: Test\r\n\r\nBody');
  const eml=await beginEml({target:'chatgpt',size:bytes.length});assert.ok(eml.path.startsWith(first));
  await saveDesktopExportDirectory(second);
  assert.equal(JSON.parse(await readFile(join(sandbox,'MailAiAssist','export-settings.json'),'utf8')).path,second);
  await appendEml({token:eml.token,offset:0,base64:bytes.toString('base64')});
  const finished=await finishEml({token:eml.token},AbortSignal.abort());assert.equal(finished.path,eml.path);assert.deepEqual(await readFile(eml.path),bytes);
  const txt=await prepareDesktop({target:'chatgpt',format:'txt',mail:{body:'Local body'}},AbortSignal.abort());assert.ok(txt.path.startsWith(second));
  await saveDesktopExportDirectory(first);await cleanupDesktop({token:txt.token});await assert.rejects(stat(txt.path),{code:'ENOENT'});
  await cleanupDesktop({token:eml.token});await assert.rejects(stat(eml.path),{code:'ENOENT'});
  const file=join(sandbox,'not-directory');await writeFile(file,'keep');await assert.rejects(saveDesktopExportDirectory(file));await assert.rejects(saveDesktopExportDirectory('relative'));assert.equal(await desktopExportDirectory(),first);await unlink(file);
 } finally {
  process.env.LOCALAPPDATA=previous;
  await unlink(join(sandbox,'MailAiAssist','export-settings.json'));await rmdir(join(sandbox,'MailAiAssist'));await rmdir(first);await rmdir(second);await rmdir(sandbox);
 }
});
