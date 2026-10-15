import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const context = {};
vm.runInNewContext(await readFile(new URL('../extension/tag-instructions.js', import.meta.url), 'utf8'), context);
const policy = context.MailTagPolicy;
test('existing product tags win over numeric versions, exact version definitions remain distinct', () => {
 const existing = [{tag:'TechCalc'}, {tag:'ZUB Helena'}, {tag:'TechCalc 2.0'}];
 assert.deepEqual(Array.from(policy.resolve(['TechCalc 3.0','TECHCALC','ZUB Helena v6.2','TechCalc 2.0'],existing)), ['TechCalc','ZUB Helena','TechCalc 2.0']);
 assert.deepEqual(Array.from(policy.resolve(['TechCalc Pro','ZUB Esther','Other 3.0'],existing)), ['TechCalc Pro','ZUB Esther','Other 3.0']);
});
test('catalog stays inside instruction limit and prioritizes names present in the email', () => {
 const tags = Array.from({length:500},(_,i)=>({tag:'Unrelated '+i})); tags.push({tag:'TechCalc'});
 const prompt = policy.instructions(tags,'License for TechCalc 3.0');
 assert.ok(prompt.length<=2000); assert.ok(prompt.includes('"TechCalc"'));
 assert.ok(prompt.includes('untrusted data'));
 assert.doesNotThrow(()=>JSON.parse(prompt.split('Existing tag names (JSON data): ')[1]));
});
