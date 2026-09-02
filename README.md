# Leitor de resultados JSON

Aplicação estática para abrir o ZIP de resultado de uma execução Betha e visualizar seus arquivos JSON. Não exige instalação, servidor de aplicação ou etapa de build. A leitura automática pela URL depende da disponibilidade e das permissões de download na Betha.

## Usar

Abra `index.html` no navegador e selecione ou arraste o ZIP baixado. Escolha o JSON na lista lateral. Alterne entre árvore e JSON formatado, ou pesquise campos e valores. A busca mostra caminhos e considera também campos recolhidos. Limpar a busca restaura a visualização escolhida.

O ZIP de demonstração em `exemplos/resultado-exemplo.zip` contém somente os dados fictícios usados no script de exemplo. Nenhum resultado real acompanha a aplicação.

Os arquivos permanecem em memória no navegador: não são enviados para o visualizador, salvos em armazenamento local ou alterados. Fechar o arquivo remove a visualização. Ao abrir um link com protocolo, o navegador consulta a Betha diretamente; recarregar esse link inicia um novo download. A URL e o protocolo podem aparecer no histórico normal do navegador e nos registros de acesso dos serviços envolvidos.

## Abrir por link

Depois de publicar, acrescente `?protocolo=UUID` à URL da página:

```text
https://seu-usuario.github.io/visualizador/?protocolo=6b4bec10-8f6f-47cd-b587-8b8958d5e25b
```

Também funciona com domínio próprio: `https://seu-dominio.com/?protocolo=UUID`. Não é necessário configurar rotas ou uma página 404. O caminho `/UUID` não é utilizado.

A página valida o protocolo, monta o endpoint fixo da Betha, baixa o ZIP e abre o JSON automaticamente. Você também pode preencher o campo **Protocolo da execução**, clicar em **Abrir resultado** e usar **Copiar link**. O download direto fica disponível no mesmo painel.

O endpoint usado é `https://plataforma-execucoes.betha.cloud/v1/download/api/execucoes/{protocolo}/resultado`. A primeira tentativa não envia cookies; se a Betha responder com HTTP 401 ou 403, há uma segunda tentativa com a sessão Betha que o navegador permitir enviar. Isso não garante autenticação: as regras de cookies entre sites e de CORS continuam sendo aplicadas. Não coloque tokens ou senhas no HTML ou no repositório.

Se o navegador não conseguir ler a resposta, a página explica que pode ser uma falha de conexão, sessão ou CORS, sem afirmar uma causa que o navegador não informa. Use **Abrir download direto na Betha** e selecione o ZIP baixado. HTTP 202, 404, 410, 401, 403 e 429 têm mensagens específicas. A tentativa termina após 30 segundos; o limite de 25 MB também é verificado durante o recebimento. A implementação não usa proxy e não contorna restrições de acesso.

Para gerar a notificação no script Betha, substitua a URL de exemplo pela URL publicada:

```groovy
def linkVisualizador = "https://seu-usuario.github.io/visualizador/?protocolo=${Execucao.atual.protocolo}"

Notificacao.nova('Consulte o resultado após a conclusão da execução.')
    .para(contextoExecucao.usuario.id)
    .link(linkVisualizador, 'Resultado', 'Visualizar dados', 'blank')
    .enviar()
```

## Publicar no GitHub Pages

1. Crie um repositório e coloque **o conteúdo desta pasta na raiz** dele, incluindo `vendor`, `exemplos` e `.nojekyll`.
2. Em **Settings → Pages → Build and deployment**, escolha **Deploy from a branch**.
3. Selecione a branch que contém os arquivos (por exemplo, `main`) e a pasta **/(root)**. Salve.
4. Aguarde o GitHub informar a URL publicada.

Alternativa: copie o conteúdo para a pasta `docs` de um repositório e selecione `/docs` como origem. Os caminhos são relativos e funcionam em sites de projeto (`usuario.github.io/repositorio/`).

O Pages não permite selecionar uma pasta arbitrária no modo de publicação por branch: use a raiz ou `docs`. Não publique seus ZIPs reais junto com a aplicação.

Documentação: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Arquivos e limites

- `index.html`, `styles.css`, `app.js`: interface, estilos e interação.
- `reader.js`: leitura do ZIP e validação de JSON UTF-8.
- `download.js`: validação de protocolo e download direto da Betha.
- `protocol.css`: estilos do formulário de protocolo e dos links.
- `vendor/fflate.js`: fflate 0.8.2, incluída localmente; nenhuma dependência de CDN em execução.
- `vendor/LICENSE-fflate.txt`: licença MIT da biblioteca.
- `tests/reader.test.cjs`: testes do leitor; não são necessários para usar o site.
- ZIP de até 25 MB; até 500 JSONs, com tamanho descompactado combinado de até 10 MB.
- Arquivos em subpastas e extensão `.JSON` são aceitos. Outros arquivos e metadados `__MACOSX` são ignorados.
- ZIP com senha não é suportado. Um JSON inválido é sinalizado sem impedir a leitura dos demais.
- A árvore mostra 100 filhos por vez. A busca limita a 200 resultados ou 100 mil campos visitados e informa quando for parcial.
- Números JSON seguem a precisão numérica do JavaScript. Identificadores longos devem ser exportados como texto.

Fonte da biblioteca: https://github.com/101arrowz/fflate/tree/v0.8.2

## Verificação

Com Node.js instalado, execute a partir desta pasta:

```sh
node --test tests/reader.test.cjs
node --check app.js
```

Para executar também os testes de interação no DOM, instale a dependência de desenvolvimento e execute:

```sh
npm install
npm test
```

A instalação acima é apenas para testes. Não é necessária para abrir ou hospedar o site. Os testes de interação verificam seleção de arquivos, árvore, busca, visualização formatada, fechamento, recuperação após erro e exibição de conteúdo HTML como texto.

Os testes cobrem arquivos compactados e sem compressão, múltiplos JSONs, subpastas, BOM UTF-8, valores primitivos, JSON inválido, ZIP inválido, ausência de JSON e limite de expansão. Os testes de download usam respostas HTTP simuladas para verificar o fluxo automático, autenticação, falhas e limite de transferência. Eles não comprovam a política CORS nem a autenticação do endpoint real da Betha, que precisam ser verificadas na URL publicada e com uma execução acessível.
