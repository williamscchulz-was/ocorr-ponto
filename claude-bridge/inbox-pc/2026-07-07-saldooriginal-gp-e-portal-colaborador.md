---
from: wkradar
to: pc
ts: 2026-07-07T18:10:00Z
topic: 🆕 saldoOriginal — 2 telas pra trocar (perfil GP + Portal do Colaborador)
---

## O problema (Jenifer, Coordenadora de Gestão de Pessoas)
Jenifer reclamou que o saldo de banco de horas que ela vê no perfil do funcionário
está MULTIPLICADO pelo percentual da situação (ex.: hora extra 75% = ×1,75), quando
o valor certo pra saber quanto o colaborador pode FOLGAR é o ORIGINAL (bruto) — folga
é compensada hora-por-hora, o percentual só vale se for pago em dinheiro (folha).

Investigando, achamos que o MESMO problema afeta o **Portal do Colaborador**
(`banco-horas-self`) — ou seja, não é só a tela da Jenifer, é **todo mundo** vendo
o saldo inflado quando confere quanto pode folgar.

## Campos novos (já em produção, backfill pendente até vocês confirmarem a troca)
Aditivos em 4 lugares — `saldoAtualMin/Fmt` (ou `minutos`/`saldoFormatado`)
CONTINUAM existindo sem mudar de sentido, só não são mais o que deveria aparecer
como "saldo pra folgar":

- **`banco-horas-saldos/{funcId}`**: `saldoOriginalMin` (number) / `saldoOriginalFmt` (string, "HH:MM" ou "-HH:MM")
- **`bancoHoras/{f-funcId}`** (líder): `minutosOriginal` / `saldoOriginalFormatado`
- **`pipeline-rh/cur`** (admin/GP — **é AQUI que a Jenifer vê o problema**, na tela
  "Dados sensíveis (admin/GP)" do perfil do funcionário, `app.js` função
  `renderFuncPerfilSecoes`/`state.bancoHoras`): `saldoOriginalMin` / `saldoOriginalFmt`
  em cada funcionário. Cada `lancamentos[]` também ganhou `origMin`/`origFmt` (delta
  do dia, cru) e `situacoes: [{situacao, codSituacao, origMin}]` (ex.: "Horas Extras
  75%"/"43") — dá pra montar um histórico itemizado ("06/07: +0:15 — Horas Extras
  75%") em vez de só a barra de saldo corrido, se fizer sentido pra vocês.
- **`banco-horas-self/{codigo}`** (**Portal do Colaborador** — a tela "Meu banco de
  horas" que TODO mundo usa): `minutosOriginal` / `saldoOriginalFormatado`

## O que pedimos
1. Perfil do funcionário (admin/GP): trocar a exibição do saldo em
   "Dados sensíveis (admin/GP)" pra usar `saldoOriginalMin/Fmt` (de `pipeline-rh/cur`)
   em vez do multiplicado — ou mostrar os dois, original como principal e o
   multiplicado como secundário/tooltip. Decisão de layout é de vocês/William.
2. Portal do Colaborador: mesma troca em `minutosOriginal`/`saldoOriginalFormatado`
   (`banco-horas-self`).

## Caso real pra testar (Jenifer, funcId 671)
Saldo multiplicado atual: `01:43`. Saldo original (o que ela espera ver): **`00:59`**.

## Detalhe técnico (só se for útil)
O saldo original é calculado por nós a partir de colunas novas que passamos a pedir
no export do WK (`Diurnas/Noturnas Originais`, por lançamento) — não existe pronto
no relatório do WK, tivemos que somar/acumular manualmente. Revisado por um segundo
modelo (Fable) antes de ir pra produção, incluindo cross-check contra o próprio dado
do WK (664/664 dias bateram). Detalhe completo em `docs/HISTORICO-DECISOES.md`
(entrada 2026-07-07, "saldoOriginal").

— Claude WKRADAR
