(() => {
  function hiddenStyle(style) {
    const value = name => style.getPropertyValue(name).trim().toLowerCase();
    const zero = name => /^0(?:px|pt|em|rem|%)?$/.test(value(name));
    return value('display') === 'none' || value('content-visibility') === 'hidden' || ['hidden', 'collapse'].includes(value('visibility')) ||
      zero('opacity') || zero('font-size') || value('mso-hide') === 'all' ||
      ((zero('height') || zero('max-height')) && ['hidden', 'clip'].includes(value('overflow')));
  }
  function htmlFragment(html) {
    if (typeof html !== 'string' || html.length > 1048576) throw new Error('mail_too_long');
    // Keep the working tree in an inert template document, never in the live DOM.
    // Preserve visibility and quote metadata until hidden subtrees are removed.
    const sanitizer = {
      removeElements: ['script', 'link', 'meta', 'base', 'title', 'iframe', 'object', 'embed',
        'img', 'picture', 'video', 'audio', 'source', 'track', 'svg', 'math', 'template', 'noscript']
    };
    const template = document.createElement('template');
    const fragment = template.content;
    const root = fragment.ownerDocument.createElement('html');
    // An HTML-context fragment retains body/head, but ignores attributes on the
    // outer html tag. Read those using the same native safe document sanitizer.
    const metadata = Document.parseHTML(html, { sanitizer });
    for (const attribute of metadata.documentElement.attributes) root.setAttribute(attribute.name, attribute.value);
    root.setHTML(html, { sanitizer });
    fragment.append(root);
    const nodes = fragment.querySelectorAll('*');
    if (nodes.length > 20000) throw new Error('mail_too_long');
    const hidden = new Set();
    for (const node of nodes) {
      if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true' || (node.style && hiddenStyle(node.style)) || /(?:^|;)\s*mso-hide\s*:\s*all\s*(?:!important\s*)?(?:;|$)/i.test(node.getAttribute('style') || '')) hidden.add(node);
    }
    let ruleCount = 0;
    function visit(rules, depth = 0) {
      if (depth > 20) throw new Error('mail_too_long');
      for (const rule of rules) {
        if (++ruleCount > 2000) throw new Error('mail_too_long');
        if (rule.selectorText && rule.style && hiddenStyle(rule.style)) {
          // Conservatively exclude content hidden by embedded rules, including media rules.
          fragment.querySelectorAll(rule.selectorText).forEach(node => hidden.add(node));
        }
        if (rule.cssRules) visit(rule.cssRules, depth + 1);
      }
    }
    for (const style of fragment.querySelectorAll('style')) {
      // A constructed sheet is never adopted; replaceSync discards external @import rules.
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(style.textContent);
      visit(sheet.cssRules);
    }
    hidden.forEach(node => node.remove());
    fragment.querySelectorAll('script,style,link,meta,base,title,iframe,object,embed,img,picture,video,audio,source,track,svg,math,template,noscript').forEach(node => node.remove());
    return fragment;
  }
  function fragmentText(fragment) {
    fragment.querySelectorAll('br,p,div,li,tr,blockquote,h1,h2,h3,h4,h5,h6,section,article,header,footer').forEach(node => node.append('\n'));
    return fragment.textContent.replace(/\u00a0/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  const typeOf = part => (part.contentType || '').toLowerCase().split(';')[0].trim();
  const attachment = part => part.name || /^attachment\b/i.test((part.headers?.['content-disposition'] || []).join(' '));
  function hasHtml(part, depth = 0) {
    if (!part || attachment(part) || typeOf(part) === 'message/rfc822') return false;
    if (depth > 30) throw new Error('mail_too_long');
    return typeOf(part) === 'text/html' || (part.parts || []).some(child => hasHtml(child, depth + 1));
  }
  function extract(part, htmlToText, depth = 0) {
    if (!part || attachment(part)) return '';
    if (depth > 30) throw new Error('mail_too_long');
    const type = typeOf(part);
    if (type === 'message/rfc822' && depth > 0) return '';
    if (type === 'text/plain') return part.body || '';
    if (type === 'text/html') return htmlToText(part.body || '');
    const children = part.parts || [];
    if (type === 'multipart/alternative') {
      // Prefer the representation normally shown to the reader. Do not fall back to
      // a different plain-text payload when the HTML contains only hidden content.
      const html = children.find(child => hasHtml(child));
      if (html) return extract(html, htmlToText, depth + 1);
      return children.map(child => extract(child, htmlToText, depth + 1)).find(text => text.trim()) || '';
    }
    return children.map(child => extract(child, htmlToText, depth + 1)).filter(Boolean).join('\n\n');
  }
  function parseTags(text) {
    let values;
    try { values = JSON.parse(text); } catch { throw new Error('invalid_tags'); }
    if (!Array.isArray(values) || !values.length || values.length > 5 || values.some(value =>
      typeof value !== 'string' || !value.trim() || value.trim().length > 32 || /[\u0000-\u001f\u007f<>]/.test(value))) throw new Error('invalid_tags');
    return [...new Set(values.map(value => value.trim()))];
  }
  globalThis.MailContent = { extract, parseTags, htmlFragment, fragmentText };
})();
