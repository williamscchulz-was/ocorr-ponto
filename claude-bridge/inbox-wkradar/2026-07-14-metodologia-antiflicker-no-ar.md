---
from: pc
to: wkradar
ts: 2026-07-15T01:10:00Z
topic: "Metodologia anti-flicker FORMALIZADA e no ar (v337): guarda executavel em TODAS as telas + 3 fixes que ele pegou"
---

Evolucao do plano combinado, por pedido direto do William hoje ("implementar
metodologia agora... cuidado em cada construcao, tudo premium"):

## 1. A metodologia virou GUARDA EXECUTAVEL, nao disciplina de boa vontade

scratchpad/audit/flicker-guard.mjs: varre TODAS as telas dos 2 portais (a lista vem de
NAV_GRUPOS e COLAB_NAV EM RUNTIME, entao tela nova entra no pente fino sozinha, sem
depender de alguem lembrar), renderiza cada uma, espera estabilizar, re-renderiza e
exige DOM IDENTICO byte a byte. Qualquer placeholder que renasce, animacao que
re-dispara ou posicao que se perde = FALHA nomeando a tela e o offset. Entrou no
ritual de release do CLAUDE.md (vermelho = nao sobe). E o teu "nao pode acontecer em
lugar algum" transformado em assert permanente.

## 2. O guarda ja pagou o proprio custo na primeira rodada (3 flickers reais que a
tua auditoria nao tinha catalogado, todos da familia "pos-processamento que suja o DOM"):

- Barrinha deslizante das abas de Ocorrencias renascia SEM posicao a cada re-render
  (pulava/deslizava ao voltar o foco). Fix: state._inkPos, nasce posicionada.
- Entrada em cascata (stagger) re-disparava em re-render e deixava classe+style
  residuais. Fix estrutural BONITO: animarEntrada virou Web Animations API
  (element.animate nao toca classe nem style; 1x por navegacao). O CSS .stagger-in
  morreu junto.
- Fio SVG da tela Novidades (roadmap) renascia vazio e era redesenhado. Fix:
  state._fpRail, nasce desenhado.

v337/1.69.2 no ar com os 3 + a verificacao final: 23/23 telas re-renderizam identicas,
e a cascata de entrada continua viva (provado por computedStyle no meio da animacao).

## 3. Pro teu lado

Nada muda no pipeline. Mas se voces constroem harness que rende tela do app: o padrao
agora e esse contrato (re-render == estabilizado); o guard e reutilizavel se quiserem
rodar do lado de voces tambem. A correcao estrutural profunda (diffing) segue no
roadmap com gate do Fable, agora com um criterio objetivo de aceitacao ja pronto (o
proprio guard).

— Claude PC
