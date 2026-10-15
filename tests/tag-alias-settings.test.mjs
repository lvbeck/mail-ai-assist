import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const root = new URL('../extension/', import.meta.url);
test('settings save, reload, conflict detection, removal and errors use persistent rules', async () => {
 const elements = new Map();
 function node() { return {value:'', textContent:'', children:[], get options(){return this.children;}, listeners:{}, addEventListener(type,fn){this.listeners[type]=fn;}, replaceChildren(){this.children=[];this.value='';},append(child){this.children.push(child);if(!this.value)this.value=child.value;}}; }
 const el=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};
 const saved={}; let tags=[{key:'h',tag:'Helena'},{key:'tc',tag:'TechCalc'}]; let fail=false;
 const context=vm.createContext({document:{getElementById:el,createElement:node},window:{addEventListener(){}},ComposeI18n:{initialize:async()=>{},t:key=>key},messenger:{messages:{listTags:async()=>tags},storage:{local:{get:async()=>saved,set:async values=>{if(fail)throw Error('storage');Object.assign(saved,values);}}}}});
 vm.runInContext(await readFile(new URL('tag-instructions.js',root),'utf8'),context);
 vm.runInContext(await readFile(new URL('tag-alias-settings.js',root),'utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));
 el('aliasNames').value='ZUB Helena\nHelena Ultra';await el('aliasSave').listeners.click();
 assert.equal(saved.tagAliases[0].tagKey,'h');assert.equal(saved.tagAliases[0].aliases.length,2);
 el('aliasTarget').value='tc';el('aliasTarget').listeners.change();el('aliasNames').value='zub helena';await el('aliasSave').listeners.click();
 assert.equal(saved.tagAliases.length,1);assert.match(el('aliasStatus').textContent,/冲突/);
 tags=[{key:'h',tag:'Renamed Helena'}];await el('aliasRefresh').listeners.click();assert.equal(el('aliasTarget').children[0].textContent,'Renamed Helena');assert.equal(el('aliasNames').value,'ZUB Helena\nHelena Ultra');
 fail=true;await el('aliasRemove').listeners.click();assert.equal(saved.tagAliases.length,1);assert.match(el('aliasStatus').textContent,/失败/);
 fail=false;tags=[];await el('aliasRefresh').listeners.click();assert.equal(el('aliasRemove').disabled,false);await el('aliasRemove').listeners.click();assert.equal(saved.tagAliases.length,0);
});
test('alias UI strings have translations in all ten languages', async()=>{
 const context={};vm.runInNewContext(await readFile(new URL('translations.js',root),'utf8'),context);
 const html=await readFile(new URL('settings.html',root),'utf8');
 const section=html.match(/<section class="tag-alias-settings">([\s\S]*?)<\/section>/)[1];
 const texts=[...section.matchAll(/>([^<>]+)</g)].map(match=>match[1].trim()).filter(Boolean);
 for(const locale of ['en','de','fr','it','es','pt','zh-CN','zh-TW','ja','ko'])for(const key of texts)assert.ok(context.ComposeTranslations[locale][key],`${locale}: ${key}`);
});
