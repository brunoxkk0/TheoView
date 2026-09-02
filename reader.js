(function (root) {
  const library = typeof module === 'object' && module.exports
    ? require('./vendor/fflate.js') : root.fflate;
  const MAX_ZIP = 25 * 1024 * 1024;
  const MAX_JSON = 10 * 1024 * 1024;

  function readZip(bytes) {
    if (bytes.byteLength > MAX_ZIP) throw new Error('O ZIP ultrapassa o limite de 25 MB.');
    let total = 0;
    let count = 0;
    let files;
    try {
      files = library.unzipSync(bytes, {
        filter(entry) {
          if (!/\.json$/i.test(entry.name) || entry.name.startsWith('__MACOSX/')) return false;
          total += entry.originalSize;
          count++;
          if (total > MAX_JSON || count > 500) {
            throw new Error('O conteúdo ultrapassa o limite de 10 MB de JSON ou 500 arquivos.');
          }
          return true;
        }
      });
    } catch (error) {
      if (/limite/.test(error.message)) throw error;
      throw new Error('Não foi possível abrir o ZIP. Verifique se está completo e sem senha.');
    }
    const names = Object.keys(files).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (!names.length) throw new Error('Nenhum arquivo JSON encontrado dentro do ZIP.');
    return names.map(name => {
      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(files[name]).replace(/^\uFEFF/, '');
        return { name, size: files[name].byteLength, text, data: JSON.parse(text) };
      } catch (error) {
        return { name, size: files[name].byteLength, text, error: 'JSON inválido ou conteúdo fora da codificação UTF-8. ' + error.message };
      }
    });
  }

  const api = { readZip, MAX_ZIP };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZipReader = api;
})(globalThis);
