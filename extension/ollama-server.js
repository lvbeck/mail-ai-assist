// Validate the destination before any catalog or inference request, including saved URLs.
function ollamaServer(value = 'http://localhost:11434') {
  const invalid = () => Object.assign(new Error('invalid_ollama_server'), { code: 'invalid_ollama_server' });
  if (typeof value !== 'string' || value.length > 2048 || /[\\\u0000-\u001f\u007f?#]/.test(value)) throw invalid();
  let url;
  try { url = new URL(value); } catch { throw invalid(); }
  if (url.username || url.password) throw invalid();
  if (url.protocol === 'https:') return url.href.replace(/\/+$/, '');

  const loopback = url.hostname === 'localhost' || url.hostname === '[::1]' || /^127\.\d+\.\d+\.\d+$/.test(url.hostname);
  if (!loopback || !/^http:\/\/[^/@]+:\d+(?:\/|$)/i.test(value)) throw invalid();
  // URL normalizes an explicit :80 away. Retain it when saving or revalidating.
  return ('http://' + url.hostname + ':' + (url.port || '80') + url.pathname).replace(/\/+$/, '');
}
