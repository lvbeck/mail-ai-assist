import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const context = {};
vm.runInNewContext(await readFile(new URL('../extension/tag-instructions.js', import.meta.url), 'utf8'), context);
const policy = context.MailTagPolicy;
const tags = [{key:'helena',tag:'Helena'}, {key:'ultra',tag:'Helena Ultra'}, {key:'tc',tag:'TechCalc'}];
const rules = [{tagKey:'helena',aliases:['ZUB Helena','Helena Ultra','Helena Pro']}];
test('explicit aliases precede exact names, normalize whitespace and case, and deduplicate', () => {
 assert.deepEqual(Array.from(policy.resolve(['ZUB  HELENA','Helena Ultra','Helena Pro','TechCalc 3.0','Unrelated'],tags,rules)),['Helena','TechCalc','Unrelated']);
 assert.deepEqual(Array.from(policy.resolve(['New ZUB Helena','Helena Ultra Support'],tags,rules)),['New ZUB Helena','Helena Ultra Support']);
});
test('stable keys follow renamed targets and skip deleted targets without recreating them', () => {
 assert.deepEqual(Array.from(policy.resolve(['ZUB Helena'],[{key:'helena',tag:'New Helena'}],rules)),['New Helena']);
 assert.deepEqual(Array.from(policy.resolve(['ZUB Helena'],[{key:'new-key',tag:'Helena'}],rules)),['ZUB Helena']);
});
test('rule validation deduplicates, rejects conflicts and invalid names, supports clearing', () => {
 const saved = policy.saveRule([],tags,'helena',' ZUB Helena \nZUB  HELENA\nHelena Ultra');
 assert.equal(saved[0].aliases.length,2);
 assert.throws(()=>policy.saveRule(saved,tags,'tc','zub helena'),/alias_conflict/);
 assert.throws(()=>policy.saveRule([],tags,'missing','x'),/alias_target/);
 for(const text of ['<bad>','x'.repeat(33),Array.from({length:101},(_,i)=>'Alias'+i).join('\n')]) assert.throws(()=>policy.saveRule([],tags,'helena',text),/alias_invalid/);
 assert.equal(policy.saveRule(saved,tags,'helena','').length,0);
});
test('ambiguous imported aliases are not arbitrarily assigned and mappings never recurse', () => {
 const bad = [...rules,{tagKey:'tc',aliases:['ZUB Helena']}];
 assert.deepEqual(Array.from(policy.resolve(['ZUB Helena'],tags,bad)),['ZUB Helena']);
 const chain = [...rules,{tagKey:'tc',aliases:['Helena']}];
 assert.deepEqual(Array.from(policy.resolve(['ZUB Helena'],tags,chain)),['Helena']);
 assert.doesNotThrow(()=>policy.resolve(['ZUB Helena'],tags,[null,{}, {tagKey:'helena',aliases:[null]}]));
});
test('prompt includes relevant alias mappings as data and stays bounded', () => {
 const prompt=policy.instructions(tags,'ZUB Helena and Helena Ultra',rules);
 assert.ok(prompt.includes('["zub helena","Helena"]')); assert.ok(prompt.length<=2000);
});
