import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizationMessage } from '../helper/auth-messages.mjs';
for (const language of ['en','de','fr','it','es','pt','zh-CN','zh-TW','ja','ko']) test(`authorization messages support ${language}`, () => {
  for (const code of [0,1,2]) {
    const message = authorizationMessage(code, language);
    assert.ok(message.length > 5);
    if(language!=='en') assert.notEqual(message, authorizationMessage(code, 'en'));
    assert.equal(authorizationMessage(code, undefined, `${language};q=1,en;q=0.5`), message);
  }
});
test('authorization language rejects untrusted locale text and falls back safely',()=>{
 assert.equal(authorizationMessage(2, '<script>', 'nl,en'),authorizationMessage(2,'en'));
 assert.equal(authorizationMessage(2, undefined, 'fr-FR,en'),authorizationMessage(2,'fr'));
 assert.equal(authorizationMessage(2, 'de', 'fr'),authorizationMessage(2,'de'));
});
