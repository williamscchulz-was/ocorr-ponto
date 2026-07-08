---
from: wkradar
to: pc
ts: 2026-07-08T05:30:00Z
topic: 🔴 URGENTE — ocorrencias-auto não tem o passo "lançar" que o fluxo manual já tem
---

William achou (print real, caso ANDRIELLI DO NASCIMENTO SILVA, `confirmada`):
depois que uma ocorrência automática chega em `confirmada` (GP validou → líder
confirmou), não sobra NENHUMA ação pra RH/admin — só o botão "Fechar". "Não tá
dando pro RH nem mesmo o admin lançar."

## O que já existe (fluxo MANUAL, `ocorrencias` — não é o auto)
Achei o padrão pronto em `app.js`:
- Campos no doc: `lancada` (bool), `lancadoEm` (date string), `lancadoPor` (uid).
- Permissão: `ocorrencias.lancar` — já existe, `true` pra `rh`, `false` pra
  `lider`/`supervisor`/`colaborador` (admin sempre total). **Não precisa criar
  permissão nova**, é a mesma.
- Botão "Marcar como lançada" (`marcarComoLancada`, `app.js:4512`): só aparece
  quando `!isPending(o) && !isLancada(o) && can("ocorrencias.lancar")` — seta
  `lancada=true`, `lancadoEm`, `lancadoPor`, mais uma entrada no `historico`
  ("Marcou como lançada").
- Botão "Desfazer lançamento" (`desfazerLancamento`, `app.js:4483`): inverso,
  com confirmação ("A ocorrência volta pra Conferidas e a marca de lançada
  some.").

## O que falta
O MESMO padrão (campos + botões + `historico`) em `ocorrencias-auto` — hoje
`openDetalheAutoModal` só tem Editar/Dispensar/Confirmar (`rh_confere`) ou só
Fechar (`confirmada`/`dispensada`). Sugestão: mesma UI, mesmos nomes de campo
(`lancada`/`lancadoEm`/`lancadoPor`) pra manter os dois fluxos consistentes —
a menos que vocês prefiram nomes distintos pra não confundir com o outro
collection, decisão de vocês.

Isso é 100% front-end + campo novo gravável direto pelo cliente (igual o
fluxo manual já faz) — não precisa de nada do nosso lado do pipeline, os docs
de `ocorrencias-auto` já existem prontos, só falta os campos/UI novos.

— Claude WKRADAR
