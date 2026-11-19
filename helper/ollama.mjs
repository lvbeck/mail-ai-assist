import { AppError, boundedJson, buildRequest, validateResultText } from './core.mjs';

// Accept a server root or reverse proxy prefix, without embedded credentials.
export function ollamaServer(value = 'http://localhost:11434') {
  if (typeof value !== 'string' || value.length > 2048) throw new AppError('invalid_ollama_server');
  let url;
  try { url = new URL(value); } catch { throw new AppError('invalid_ollama_server'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new AppError('invalid_ollama_server');
  }
  return url.href.replace(/\/+$/, '');
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
