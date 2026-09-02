/* Todo conteúdo importado é inserido como texto, nunca como HTML executável. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let entries = [], selected = 0, mode = 'tree', request = 0, searchTimer;
  let remoteController = null, remoteTimer = null;
  const size = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576
    ? `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`
    : `${(bytes / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  const container = value => value !== null && typeof value === 'object';
  const kind = value => value === null ? 'null' : Array.isArray(value) ? 'lista' : typeof value;
  const describe = value => Array.isArray(value) ? `Lista · ${value.length} itens`
    : container(value) ? `Objeto · ${Object.keys(value).length} campos` : `Valor · ${kind(value)}`;
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function status(message, error = false) {
    $('status').textContent = message;
    $('status').classList.toggle('error', error);
  }
  function valueNode(value) {
    return element('span', JSON.stringify(value), `value type-${kind(value)}`);
  }
  function treeNode(key, value, path, open = false) {
    if (!container(value)) {
      const row = element('div', undefined, 'leaf');
      row.title = path;
      row.append(element('span', `${JSON.stringify(key)}: `, 'key'), valueNode(value));
      return row;
    }
    const node = element('details');
    const summary = element('summary');
    summary.title = path;
    summary.append(element('span', key, 'key'), element('span', describe(value), 'type-label'));
    node.append(summary);
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      const children = element('div', undefined, 'children');
      node.append(children);
      const keys = Object.keys(value);
      let cursor = 0;
      const more = element('button', 'Mostrar próximos 100', 'more');
      more.type = 'button';
      const batch = () => {
        more.remove();
        const end = Math.min(cursor + 100, keys.length);
        for (; cursor < end; cursor++) {
          const childKey = keys[cursor];
          children.append(treeNode(childKey, value[childKey], `${path}[${JSON.stringify(childKey)}]`));
        }
        if (cursor < keys.length) {
          more.textContent = `Mostrar mais (${keys.length - cursor} restantes)`;
          children.append(more);
        }
      };
      more.addEventListener('click', batch);
      batch();
    };
    node.addEventListener('toggle', () => { if (node.open) load(); });
    if (open) { load(); node.open = true; }
    return node;
  }
  function search(data, query) {
    const results = element('div');
    const note = element('p', '', 'search-note');
    results.append(note);
    const pending = [{ value: data, path: '$', key: '$' }];
    let hits = 0, visited = 0;
    while (pending.length && hits < 200 && visited < 100000) {
      const { value, path, key } = pending.pop();
      visited++;
      const valueText = container(value) ? '' : String(value);
      if (key.toLocaleLowerCase('pt-BR').includes(query) || valueText.toLocaleLowerCase('pt-BR').includes(query)) {
        hits++;
        const row = element('div', undefined, 'search-result');
        row.append(element('span', path, 'path'));
        row.append(container(value) ? treeNode(key, value, path) : valueNode(value));
        results.append(row);
      }
      if (container(value)) {
        const keys = Object.keys(value);
        for (let i = keys.length - 1; i >= 0; i--) {
          const childKey = keys[i];
          pending.push({ key: childKey, value: value[childKey], path: `${path}[${JSON.stringify(childKey)}]` });
        }
      }
    }
    note.textContent = `${hits} ocorrência(s).${pending.length ? ' Busca parcial: limite de 200 resultados ou 100 mil campos. Refine o termo.' : ''}`;
    return results;
  }
  function render() {
    clearTimeout(searchTimer);
    const entry = entries[selected];
    if (!entry) return;
    $('content').replaceChildren();
    $('content').scrollTop = 0;
    $('document-name').textContent = entry.name;
    $('document-meta').textContent = `${size(entry.size)} · ${entry.error ? 'Verifique o arquivo' : describe(entry.data)}`;
    $('valid-badge').textContent = entry.error ? 'JSON inválido' : 'JSON válido';
    $('valid-badge').classList.toggle('invalid', Boolean(entry.error));
    $('tree-view').setAttribute('aria-pressed', String(mode === 'tree'));
    $('raw-view').setAttribute('aria-pressed', String(mode === 'raw'));
    const query = $('search').value.trim().toLocaleLowerCase('pt-BR');
    $('view-hint').textContent = query ? 'A busca considera os campos e valores de todo o JSON.'
      : mode === 'tree' ? 'Clique nas setas para explorar os campos.' : 'Conteúdo formatado para leitura.';
    if (entry.error) {
      $('content').append(element('p', entry.error, 'file-error'), element('pre', entry.text));
    } else if (query) {
      $('content').append(search(entry.data, query));
    } else if (mode === 'raw') {
      let formatted;
      try { formatted = JSON.stringify(entry.data, null, 2); }
      catch { formatted = entry.text; }
      $('content').append(element('pre', formatted));
    } else {
      $('content').append(treeNode('$', entry.data, '$', true));
    }
  }
  function select(index) {
    selected = index;
    $('search').value = '';
    [...$('files').children].forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
    render();
  }
  function showArchive(bytes, name) {
    entries = ZipReader.readZip(bytes);
    $('files').replaceChildren();
    entries.forEach((entry, index) => {
      const button = element('button', undefined, 'file-button');
      button.type = 'button';
      const label = element('span', entry.name);
      label.append(element('small', `${size(entry.size)}${entry.error ? ' · JSON inválido' : ''}`));
      button.append(element('span', '{ }', 'file-mark'), label);
      button.addEventListener('click', () => select(index));
      $('files').append(button);
    });
    $('archive-name').textContent = name;
    $('file-count').textContent = entries.length;
    $('empty').hidden = true;
    $('workspace').hidden = false;
    mode = 'tree';
    select(Math.max(0, entries.findIndex(entry => !entry.error)));
    status(`${entries.length} arquivo(s) JSON encontrado(s) em ${name}.`);
  }
  function cancelRemote() {
    remoteController?.abort();
    remoteController = null;
    clearTimeout(remoteTimer);
    $('load-protocol').disabled = false;
    $('load-protocol').textContent = 'Abrir resultado';
  }
  function prepareLinks(protocol) {
    const share = new URL(window.location.href);
    share.search = '';
    share.hash = '';
    share.searchParams.set('protocolo', protocol);
    $('share-url').value = share.href;
    $('direct-download').href = BethaDownload.resultUrl(protocol);
    $('direct-download').hidden = false;
    $('protocol-links').hidden = false;
    if (/^https?:$/.test(share.protocol)) window.history.replaceState(null, '', share.href);
  }
  async function openProtocol() {
    const token = ++request;
    cancelRemote();
    // Uma abertura local anterior também pode estar pendente.
    $('open').disabled = false;
    let protocol;
    try {
      protocol = BethaDownload.normalizeProtocol($('protocol').value);
      $('protocol').value = protocol;
      $('protocol').setAttribute('aria-invalid', 'false');
    } catch (error) {
      $('protocol').setAttribute('aria-invalid', 'true');
      $('protocol-links').hidden = true;
      $('direct-download').hidden = true;
      status(error.message, true);
      return;
    }
    prepareLinks(protocol);
    const controller = new AbortController();
    remoteController = controller;
    let timedOut = false;
    remoteTimer = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
    $('load-protocol').disabled = true;
    $('load-protocol').textContent = 'Baixando…';
    status(`Buscando o resultado do protocolo ${protocol}…`);
    try {
      const bytes = await BethaDownload.download(protocol, { signal: controller.signal });
      if (token !== request) return;
      showArchive(bytes, `resultado-${protocol}.zip`);
    } catch (error) {
      if (token !== request) return;
      status(timedOut ? 'A Betha não respondeu em 30 segundos. Tente novamente ou use o download direto.' : error.message, true);
    } finally {
      if (token === request) cancelRemote();
    }
  }
  async function openFile(file) {
    if (!file) return;
    const token = ++request;
    cancelRemote();
    status(`Abrindo ${file.name}…`);
    $('open').disabled = true;
    try {
      if (!/\.zip$/i.test(file.name)) throw new Error('Selecione o arquivo .zip baixado da execução.');
      if (file.size > ZipReader.MAX_ZIP) throw new Error('O ZIP ultrapassa o limite de 25 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (token !== request) return;
      showArchive(bytes, file.name);
    } catch (error) {
      if (token === request) status(error.message, true);
    } finally {
      if (token === request) { $('open').disabled = false; $('file').value = ''; }
    }
  }
  $('open').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', event => openFile(event.target.files[0]));
  $('dropzone').addEventListener('dragover', event => {
    event.preventDefault(); $('dropzone').classList.add('dragging');
  });
  $('dropzone').addEventListener('dragleave', event => {
    if (!$('dropzone').contains(event.relatedTarget)) $('dropzone').classList.remove('dragging');
  });
  // Impede que um ZIP solto fora da área substitua a página do visualizador.
  document.addEventListener('dragover', event => event.preventDefault());
  document.addEventListener('drop', event => {
    event.preventDefault();
    $('dropzone').classList.remove('dragging');
    const files = event.dataTransfer.files;
    if (files.length > 1) { status('Abra um ZIP por vez.', true); return; }
    openFile(files[0]);
  });
  $('clear').addEventListener('click', () => {
    request++; clearTimeout(searchTimer); entries = [];
    cancelRemote();
    $('files').replaceChildren(); $('content').replaceChildren(); $('search').value = '';
    $('file').value = ''; $('open').disabled = false;
    $('workspace').hidden = true; $('empty').hidden = false; status(''); $('open').focus();
  });
  $('tree-view').addEventListener('click', () => { mode = 'tree'; render(); });
  $('raw-view').addEventListener('click', () => { mode = 'raw'; render(); });
  $('search').addEventListener('input', () => {
    clearTimeout(searchTimer); searchTimer = setTimeout(render, 180);
  });
  $('protocol-form').addEventListener('submit', event => {
    event.preventDefault();
    openProtocol();
  });
  $('copy-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('share-url').value);
      status('Link do visualizador copiado.');
    } catch {
      $('share-url').focus();
      $('share-url').select();
      status('O navegador não permitiu a cópia automática. Copie o link selecionado com Ctrl+C ou o menu do dispositivo.');
    }
  });
  const initialProtocol = new URLSearchParams(window.location.search).get('protocolo');
  if (initialProtocol !== null) {
    $('protocol').value = initialProtocol;
    openProtocol();
  }
})();
