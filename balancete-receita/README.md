# Dashboard do Balancete da Receita

Copie esta pasta `balancete-receita` para a raiz do repositório
[`brunoxkk0/TheoView`](https://github.com/brunoxkk0/TheoView), sem substituir os
arquivos que já existem na raiz.

Após o commit na branch publicada pelo GitHub Pages, abra:

```text
https://brunoxkk0.github.io/TheoView/balancete-receita/?protocolo=UUID-DA-EXECUCAO
```

Exemplo validado:

```text
https://brunoxkk0.github.io/TheoView/balancete-receita/?protocolo=d0af190e-aa01-4e84-9f14-65a308bf293e
```

O dashboard é autocontido. Não publique os arquivos CSV, o ZIP de inspeção, a
pasta `tests` ou o script de preparação.

Para atualizar o pacote após alterar o dashboard, execute na pasta `dash`:

```powershell
pwsh -File .\scripts\prepare-github-pages.ps1
```
