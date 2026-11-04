// Run in a browser with the native Sanitizer API, never a polyfill.
(() => {
  const results = [];
  function test(name, run) {
    try { run(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  }
  function equal(actual, expected) {
    if (actual !== expected) throw new Error(JSON.stringify({ actual, expected }));
  }
  const extract = html => MailContent.fragmentText(MailContent.htmlFragment(html));
  test('native API is available', () => equal(typeof Element.prototype.setHTML, 'function'));
  test('paragraphs and entities', () => equal(extract('<p>Hello &amp; welcome</p><p>Next&nbsp;line</p>'), 'Hello & welcome\nNext line'));
  for (const attribute of ['hidden', 'aria-hidden="true"', 'aria-hidden=" TRUE "', 'style="display:none"', 'style="visibility:hidden"', 'style="opacity:0"', 'style="font-size:0"', 'style="content-visibility:hidden"', 'style="mso-hide:all"', 'style="height:0;overflow:hidden"']) {
    test('removes entire subtree: ' + attribute, () => equal(extract('<div ' + attribute + '>SECRET<span style="display:block">NESTED</span></div><p>Visible</p>'), 'Visible'));
  }
  test('embedded stylesheet preserves selectors before deleting subtree', () => equal(extract('<style>.private {display:none !important} [data-hide] {opacity:0}</style><div class="private">SECRET<b>CHILD</b></div><span data-hide>SECRET</span><p>Visible</p>'), 'Visible'));
  test('conditional hidden rules are conservatively removed', () => equal(extract('<style>@media print {.private {visibility:hidden}}</style><div class="private">SECRET</div><p>Visible</p>'), 'Visible'));
  test('hidden-only HTML does not expose a different plain alternative', () => equal(MailContent.extract({contentType:'multipart/alternative',parts:[{contentType:'text/plain',body:'SECRET'},{contentType:'text/html',body:'<div hidden>SECRET</div>'}]},extract), ''));
  test('unsafe and resource nodes removed before use', () => {
    const fragment = MailContent.htmlFragment('<script>globalThis.mailInjected=true;</' + 'script><img src="http://127.0.0.1:38491/pixel"><iframe src="http://127.0.0.1:38491/frame"></iframe><svg><text>SECRET</text></svg><p onclick="globalThis.mailInjected=true">Visible</p>');
    equal(fragment.querySelectorAll('script,img,iframe,svg,[onclick]').length, 0);
    equal(MailContent.fragmentText(fragment), 'Visible');
    equal(globalThis.mailInjected, undefined);
  });
  test('style resources are inert and removed', () => equal(extract('<style>@import url(http://127.0.0.1:38491/css); .x{background:url(http://127.0.0.1:38491/bg)}</style><div class="x" style="background:url(http://127.0.0.1:38491/inline)">Visible</div>'), 'Visible'));
  test('quote selectors survive native sanitization', () => {
    const fragment=MailContent.htmlFragment('<p>Current</p><blockquote type="cite">Quoted</blockquote><div class="gmail_quote">Gmail</div><div class="moz-forward-container">Forward</div><div class="moz-cite-prefix">Prefix</div><div id="divRplyFwdMsg">Header</div><p>History</p>');
    equal(fragment.querySelectorAll('blockquote[type="cite"],.gmail_quote,.moz-forward-container,.moz-cite-prefix,#divRplyFwdMsg').length,5);
    fragment.querySelectorAll('blockquote[type="cite"],.gmail_quote,.moz-forward-container,.moz-cite-prefix,#divRplyFwdMsg').forEach(node=>{if(node.id==='divRplyFwdMsg'){while(node.nextSibling)node.nextSibling.remove();}node.remove();});
    equal(MailContent.fragmentText(fragment),'Current');
  });
  test('included quotes are retained',()=>equal(extract('<p>Current</p><blockquote type="cite">Quoted</blockquote>'),'Current\nQuoted'));
  for (const html of [
    '<html hidden><body>SECRET</body></html>',
    '<html style="display:none"><body>SECRET</body></html>',
    '<html><body hidden>SECRET</body></html>',
    '<html><head><style>body {display:none}</style></head><body>SECRET</body></html>',
    '<html class="private"><head><style>.private {display:none}</style></head><body>SECRET</body></html>'
  ]) test('document-level hidden subtree: ' + html, () => equal(extract(html), ''));
  test('size limit',()=>{let rejected=false;try{extract('x'.repeat(1048577));}catch{rejected=true;}equal(rejected,true);});
  test('node limit',()=>{let rejected=false;try{extract('<span>x</span>'.repeat(20001));}catch{rejected=true;}equal(rejected,true);});
  globalThis.mailHtmlResults={userAgent:navigator.userAgent,results};
  document.getElementById('results').textContent=JSON.stringify(globalThis.mailHtmlResults,null,2);
})();
