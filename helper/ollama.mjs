import { AppError, boundedJson, buildRequest, validateResultText } from './core.mjs';

// Validate the destination before any catalog or inference request, including saved URLs.
export function ollamaServer(value = 'http://localhost:11434') {
  const invalid = () => new AppError('invalid_ollama_server');
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

// Send only the Ollama payload to the selected server and reject redirects.
async function callOllama(server, path, signal, body) {
  const url = ollamaServer(server) + path;
  let response;
  try {
    response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      signal,
      ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    });
  } catch {
    signal?.throwIfAborted();
    throw new AppError('api_network_error');
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError(response.status === 404 && body ? 'api_model_unavailable' : 'api_service_error');
  }
  return boundedJson(response);
}

// Ollama names can include registry ports, namespaces and model tags.
function validModel(name) {
  return typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9./_:-]{0,149}$/.test(name);
}

export async function listOllamaModels(server, signal) {
  const catalog = await callOllama(server, '/api/tags', signal);
  if (!Array.isArray(catalog?.models)) throw new AppError('invalid_model_catalog');
  const names = new Set(catalog.models.map(item => item?.name).filter(validModel));
  return Array.from(names, slug => ({ slug, displayName: slug }));
}

// Preserve the same instruction and untrusted-mail boundaries as other providers.
export async function rewriteOllama(data, signal) {
  const request = buildRequest(data);
  if (!validModel(request.model)) throw new AppError('invalid_model');
  const result = await callOllama(data.ollamaServer, '/api/chat', signal, {
    model: request.model,
    stream: false,
    messages: [
      { role: 'system', content: request.instructions + '\n\n' + request.input[0].content },
      request.input[1]
    ]
  });
  if (result?.done !== true || result.done_reason !== 'stop') throw new AppError('incomplete_response');
  if (result.message?.role !== 'assistant') throw new AppError('invalid_server_response');
  return { text: validateResultText(result.message.content) };
}
