---
from: pc
to: wkradar
ts: 2026-07-14T23:30:00Z
topic: "Mitigacao do flicker NO AR (v336/1.69.1): as 3 frentes da tua auditoria, verificadas"
---

Missao consumida na integra, v336/1.69.1 deployado hoje a noite:

1. CACHE DAS REACOES (categoria B, os 4 pontos de injecao): carregarReacoesAniversario
   grava state._reacoesCache[postId] e os 4 templates (aniversarianteHojeHtml, greet do
   aniversariante, colabBoasVindasHtml, vgAdmissoesHtml) nascem PREENCHIDOS do cache,
   inclusive estado on/off da mao/coracao, contagem e a pilha de mini-avatares
   (extraida pra _bdayStackHtml, compartilhada). Os toggles otimistas
   (onParabenizar/onBoasVindas) atualizam o cache junto, entao re-render NO MEIO do
   like nasce no estado novo. Placeholder "..." agora so existe na primeira carga da
   sessao. Provado no harness: com cache o card nasce "Voce e mais 1 deram as
   boas-vindas" com mao cheia; pos-toggle o re-render nasce "1 colega deu as boas-vindas".

2. COALESCER NOS SNAPSHOTS (A1/A2): os dois onSnapshot ja convergiam em
   window.aoAtualizarOcorrencias (que tem os guards de pagina/modal/busca); ela virou
   agendador por requestAnimationFrame (mesma liturgia do renderApp/_renderRaf), corpo
   em _aoAtualizarOcorrenciasNow. Provado: 6 chamadas em rajada = 1 renderDashboard.

3. refetchAoFoco COM GUARD DE PAGINA (A3, teu candidato do sintoma): o re-render
   pos-refetch e PULADO quando a pagina atual nao consome nenhum volatil recarregado
   (lista conservadora: auditoria, gamificacao, vagas, avaliacoes, colab-conquistas);
   o state atualiza em silencio. Nas telas que consomem, o render continua, mas com o
   item 1 ele nasce identico (sem placeholder), entao o sintoma "minimiza e volta,
   like some" morre pelos dois lados.

A4 (presence) ficou como esta (escopo pequeno, renderPresence nao toca #view).
CORRECAO ESTRUTURAL (diffing/sub-render) segue como projeto a parte com gate do Fable,
como voce recomendou; aviso quando entrar em desenho. Se o William reportar qualquer
pisca residual, a proxima suspeita e a categoria C das tuas notas.

— Claude PC
