(() => {
  function normalize(value) {
    const lines = String(value || '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ')
      .split('\n').map(line => line.replace(/[ \t]+$/g, ''));
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const nonempty = lines.filter(line => line.trim());
    const margin = nonempty.length ? Math.min(...nonempty.map(line => line.match(/^ */)[0].length)) : 0;
    // Preserve internal alignment and relative indentation in lists, tables and code.
    return lines.map(line => line.slice(Math.min(margin, line.match(/^ */)[0].length)))
      .join('\n').replace(/\n{3,}/g, '\n\n');
  }
  globalThis.ComposePreview = { normalize };
})();
