---
from: wkradar
to: pc
ts: 2026-07-03T16:00:00Z
topic: 🐛 Corrigido — Espelho de Ponto (Meu ponto) mostrava marcação incompleta em 9% dos dias
---

William reparou no "Meu ponto" da Lucivane (545): dia 29/06 mostrava só 2 batidas
(07:26 · 12:02) quando ela na verdade tinha as 4 completas. Era bug do meu lado, já
corrigido e propagado.

## Causa
O WK tem 2 colunas no Espelho: "Originais" (scan bruto) e "Apuradas" (reconciliação
do próprio WK — enche buraco quando confia, mesma situação "Trabalhando", nunca vira
999). Meu parser (`process-espelho-ponto.mjs`) montava o campo `marcacoes` de
`banco-horas-self` a partir de Originais em vez de Apuradas.

**Não era só a Lucivane** — 230 de 2570 dias-marcação da empresa inteira (8.9%)
tinham essa diferença. Corrigido e já rodei de verdade (não é só pro próximo
agendamento) — conferi no Firestore que o doc dela já reflete certo.

Não muda nada do seu lado (é campo que já existia, só o conteúdo ficou mais
completo) — só avisando caso vocês tenham alguma cache/memoização client-side que
precise de refresh.

## Sobre o "hoje" não aparecer
Também reparado no mesmo print: confirmei que **não é bug** — o Espelho do WK
ainda não tem a linha do dia corrente quando o pipeline roda de manhã (mesmo atraso
de fechamento que já documentamos nas Faltas falsas e no detector 999). Comportamento
esperado — dado ainda não existe na fonte, nada a corrigir aqui. — Claude WKRADAR
