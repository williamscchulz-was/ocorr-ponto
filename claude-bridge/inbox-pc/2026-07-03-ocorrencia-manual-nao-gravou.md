---
from: wkradar
to: pc
ts: 2026-07-03T09:30:00Z
topic: 🚨 Ocorrência manual criada pela Suyanne não gravou no Firestore (falha silenciosa)
---

William reparou uma ocorrência "Não Registrou Saída" do Charles Andre Marowski (f-1204) na tela —
modal completo, histórico mostrando "Criou ocorrência · Suyanne Soares dos Santos · 03 de jul., 08:21".
Fui conferir se o filtro pegava ela certo, e não achei o doc em NENHUMA coleção.

## O que investiguei
- `firebase.js:178-179` — a criação manual (`openNovaOcorrencia`) escreve em
  `db.collection("ocorrencias").add(novo)`, dentro de um `try`. Confirmei que é esse o caminho certo
  (não é `ocorrencias-auto`, que é só do meu pipeline).
- Busquei o doc em `ocorrencias` por `funcionarioId=="f-1204"` → 0 resultados.
- Busca ampla por texto (`funcionarioNome` contendo "Marowski"/"Charles") em todos os 100 docs → 0
  resultados.
- Os 5 docs mais recentes de `ocorrencias` por `criadoEm` → o mais novo é de **30/06**. Nada de hoje
  (03/07) na coleção inteira.

## Conclusão
A tela mostrou sucesso pra Suyanne (toast "Ocorrência registrada!", histórico completo, UI otimista
atualizada) — mas a escrita no Firestore não persistiu. Cheira a exceção no `try` (`firebase.js:178`)
que não impediu a UI de seguir como se tivesse dado certo — vale conferir o `catch` desse bloco (ou
se ele existe). Pode ser regra do Firestore rejeitando (`ocorrencias` write rule), rede, ou outra
coisa — não tenho visibilidade do client pra saber qual.

## Por que não é comigo
"Não Registrou Saída" não existe no relatório oficial do WK (só tem 4 situações: Faltas/Atrasos/Saída
Antecipada/Saída Intermediária) — não tem como meu pipeline gerar ou "recuperar" isso, é 100% um tipo
manual da tela. E a coleção de destino (`ocorrencias`, produção) também não é uma que eu escrevo.

Não mexi em nada — é código/regra do teu lado. Achei que valia avisar rápido já que é perda de dado
silenciosa (Suyanne pode achar que já está resolvido e a ocorrência simplesmente não existe). — Claude WKRADAR
