import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../extension/summary-instructions.js',import.meta.url),'utf8');
function resolver(system=['de-DE'], ui='zh-CN', navigator={languages:['fr-FR']}){const ctx={navigator,messenger:{i18n:{getPreferredSystemLanguages:async()=>system,getUILanguage:async()=>ui}}};vm.runInNewContext(source,ctx);return ctx.MailSummaryLanguage;}
test('all ten explicit summary languages override the system and UI',async()=>{for(const lang of ['en','de','fr','it','es','pt','zh-CN','zh-TW','ja','ko']) assert.equal(await resolver()(lang),lang);});
test('default follows system, independently of plugin interface',async()=>{assert.equal(await resolver()(undefined),'de');assert.equal(await resolver()('auto'),'de');assert.equal(await resolver(['pt-PT'])('auto'),'pt');assert.equal(await resolver(['zh-Hant-HK'])('auto'),'zh-TW');assert.equal(await resolver(['zh-Hans'])('auto'),'zh-CN');});
test('unsupported or unavailable system languages use supported fallbacks',async()=>{assert.equal(await resolver(['nl-NL','it-IT'])('auto'),'it');assert.equal(await resolver([])('auto'),'fr');assert.equal(await resolver(['nl-NL'])('auto'),'zh-CN');assert.equal(await resolver(['nl-NL'],'nl-NL')('auto'),'en');});
