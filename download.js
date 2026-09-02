(function (root) {
  'use strict';
  const MAX_ZIP = 25 * 1024 * 1024;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function normalizeProtocol(value) {
    const protocol = String(value ?? '').trim();
    if (!UUID.test(protocol)) throw new Error('Informe um protocolo válido no formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.');
    return protocol.toLowerCase();
  }
  function resultUrl(value) {
    return `https://plataforma-execucoes.betha.cloud/v1/download/api/execucoes/${normalizeProtocol(value)}/resultado`;
  }
  async function discard(response) {
    try { await response.body?.cancel(); } catch { /* A conexão pode já estar fechada. */ }
  }
  async function download(value, { fetchImpl = root.fetch?.bind(root), signal } = {}) {
    const url = resultUrl(value);
    if (!fetchImpl) throw new Error('Este navegador não oferece suporte ao download automático. Abra o ZIP manualmente.');
    try {
      // Downloads públicos funcionam sem cookies, inclusive com CORS de origem '*'.
      let response = await fetchImpl(url, { credentials: 'omit', signal });
      if (response.status === 401 || response.status === 403) {
        await discard(response);
        response = await fetchImpl(url, { credentials: 'include', signal });
      }
      let reason;
      if (response.status === 202) reason = 'A execução ainda não foi concluída. Aguarde e tente novamente.';
      else if (response.status === 401 || response.status === 403) reason = 'A Betha exige uma sessão válida e permissão para acessar este resultado. Abra o download direto para entrar na sua conta.';
      else if (response.status === 404 || response.status === 410) reason = 'O resultado não está disponível. Confira o protocolo, a conclusão da execução e a validade do download.';
      else if (response.status === 429) reason = 'A Betha recebeu muitas solicitações. Aguarde um pouco e tente novamente.';
      else if (!response.ok) reason = `A Betha não disponibilizou o resultado (HTTP ${response.status}). Tente novamente mais tarde.`;
      else if (/text\/html/i.test(response.headers.get('Content-Type') || '')) reason = 'A Betha retornou uma página em vez do ZIP, possivelmente uma página de login. Abra o download direto e confira seu acesso.';
      if (reason) { await discard(response); throw new Error(reason); }
      if (Number(response.headers.get('Content-Length')) > MAX_ZIP) {
        await discard(response);
        throw new Error('O ZIP ultrapassa o limite de 25 MB.');
      }
      if (!response.body) throw new Error('A Betha retornou uma resposta sem arquivo. Tente novamente após a conclusão da execução.');
      const reader = response.body.getReader();
      const chunks = [];
      let total = 0;
      try {
        while (true) {
          if (signal?.aborted) throw new DOMException('Download cancelado.', 'AbortError');
          const { value: chunk, done } = await reader.read();
          if (done) break;
          total += chunk.byteLength;
          if (total > MAX_ZIP) throw new Error('O ZIP ultrapassa o limite de 25 MB.');
          chunks.push(chunk);
        }
      } finally {
        try { await reader.cancel(); } catch { /* Pode ter sido cancelado pela troca de arquivo. */ }
        reader.releaseLock();
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return bytes;
    } catch (error) {
      if (error.name === 'TypeError') {
        throw new Error('Não foi possível ler o resultado da Betha. Pode ser uma falha de conexão, sessão ou uma restrição de acesso entre sites (CORS). Use o download direto e abra o ZIP manualmente.');
      }
      throw error;
    }
  }
  const api = { download, normalizeProtocol, resultUrl };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BethaDownload = api;
})(globalThis);
