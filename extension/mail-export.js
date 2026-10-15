(() => {
  function stripQuotes(text) {
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    const end = lines.findIndex(line => /^\s*(?:-{2,}\s*(?:Original Message|Forwarded message|Ursprüngliche Nachricht|Weitergeleitete Nachricht|Message d'origine|Message transféré|Messaggio originale|Mensaje original|Mensagem original|原始邮件|轉寄郵件)|On .+wrote:|Am .+schrieb .+:|Le .+écrit\s*:|El .+escribió:|Il .+scritto:|Em .+escreveu:)/i.test(line));
    return (end < 0 ? lines : lines.slice(0, end)).filter(line => !/^\s*>/.test(line)).join('\n').trim();
  }
  function extract(part, includeQuotes, htmlToText, depth = 0) {
    if (part.name || /^attachment\b/i.test(part.headers?.['content-disposition']?.[0] || '')) return '';
    const type = (part.contentType || '').split(';')[0].trim().toLowerCase();
    if (type === 'message/rfc822' && depth > 0) return '';
    if (type === 'text/html') return htmlToText(part.body || '', includeQuotes);
    if (type === 'text/plain') return includeQuotes ? part.body || '' : stripQuotes(part.body || '');
    const children = part.parts || [];
    if (type === 'multipart/alternative') {
      const html = children.find(child => child.contentType === 'text/html' && !child.name && child.body);
      if (html) {
        const result = extract(html, includeQuotes, htmlToText, depth + 1);
        if (result.trim()) return result;
      }
      return children.map(child => extract(child, includeQuotes, htmlToText, depth + 1)).find(Boolean) || '';
    }
    return children.map(child => extract(child, includeQuotes, htmlToText, depth + 1)).filter(Boolean).join('\n\n');
  }
  globalThis.MailExport = { stripQuotes, extract };
})();
