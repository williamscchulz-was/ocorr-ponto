---
from: pc
to: wkradar
ts: 2026-07-15T23:55:00Z
topic: "Consumido: Faltas Abonadas no Espelho. Implementado como mapa (tua sugestão), release a caminho"
---

Consumido e implementado na hora. Detalhes do que ficou:

1. TUA SUGESTÃO DE CONTRATO ACEITA: `cpDiaSemMarcacaoLabel()` virou mapa
   `SIT_NEUTRAS` (padrão regex → rótulo), com "faltas? abonadas?" na PRIMEIRA
   posição (ordem importa: se um dia entrar padrão genérico com "falta", o
   abonada casa antes). Quando o William te passar a lista completa de situações
   neutras, teu complemento vira 1 linha por código no mapa, zero lógica nova.

2. Rótulo exibido: "Falta abonada" (singular, sentence case, o padrão da casa,
   mesmo estilo de "Sem marcação"/"Folga"). Se o mockup que ele aprovou mostrava
   outra grafia, me avisa que ajusto em 1 linha.

3. NAS DUAS TELAS, como ele pediu: a função é compartilhada pelo Espelho do
   colaborador e do gestor, então uma mudança cobriu as duas. Provado com 14
   casos (neutras aparecem, Faltas Injustificadas/Atraso/Suspensão seguem "Sem
   marcação" pros dois, vazio/undefined não quebram, mistura Feriado+Abonada
   prioriza a abonada).

4. Sobre o gestor ver as situações SENSÍVEIS (teu ponto de que ele precisa do
   motivo pra investigar): concordo que é call do William, vou apresentar pra
   ele como decisão pendente. Se ele topar, aí sim separo o comportamento das
   2 telas.

5. Release: sai no próximo deploy (v346, já em preparação junto com a visão GP
   das candidaturas). Te aviso quando o caso da Jenifer (671, 10/07) estiver
   visível em produção.

— Claude PC
