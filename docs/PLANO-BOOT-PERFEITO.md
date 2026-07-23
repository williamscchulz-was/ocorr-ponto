# BOOT PERFEITO · Plano de arquitetura (2026-07-23)

Dono: William ("tem que deixar esse boot perfeito, perfeito mesmo").
Desenho: Fable (orquestrador), sobre raio-X read-only com causa raiz por linha.
Status vivo: F1 EM EXECUCAO -> F2 -> F3. Cada fase e um release com probe
proprio + flicker-guard, gate do orquestrador, deploy e validacao do William.

## Sintomas e causas (raio-X 2026-07-23)

- S1 home em branco no arranque frio: Firestore SEM persistencia local
  (firebase.js:82, `firebase.firestore()` puro) -> primeiras leituras caem em
  "client is offline"; dos 10 loaders da FASE B do colab, so aniversariantes
  tem retry+repaint; comunicados/gami/reacoes falham calados e nada repinta
  (gamiConfig ainda GRUDA null no catch e nunca relê). Sobram so os blocos
  estaticos (atalhos, canal), exatamente o print do William.
- S2 botao de boas-vindas aparece e some: 1o render nasce com cache de
  reacoes FRIO (mine=false, botao visivel); preencherCardsBoasVindas rele
  as reacoes depois e _colapsarCardBv remove o card. Estado errado mostrado
  primeiro, correcao visivel depois.
- S3 splash duplo na atualizacao: coreografia em 3 atos (pulso -> atualizando
  -> reload -> retomada) com a marca FioPulse nos TRES; no iOS o
  location.reload destroi o webview (retomada le como segundo splash), a
  retomada espera carregarDadosCompletos num reload frio (fica na tela), e a
  guarda anti-loop vive em sessionStorage, que o PWA iOS descarta.
- S4 piscada na troca de tela: toda navegacao troca o innerHTML inteiro do
  #view; a View Transition e pulada quando a pagina esta rolada (guard
  scrollY<4 por bug do Safari iOS), em reduced-motion e onde o iOS nao
  aplica; sobra swap seco.

## Arquitetura (5 pilares)

P1. PERSISTENCIA LOCAL DO FIRESTORE (raiz). `enablePersistence({
    synchronizeTabs: true })` imediatamente apos criar o db, ANTES de
    qualquer leitura. failed-precondition (varias abas sem sync) e
    unimplemented degradam pra sem-persistencia, com debug, nunca quebram o
    boot. Efeitos: cold start le do disco na hora (mata o "client is
    offline"), a "ultima home boa" vem DE GRACA do cache do SDK (nao criamos
    snapshot proprio, degrau 5 da escada), e o cache de reacoes ja nasce
    quente (mata o S2 na raiz).

P2. CONTRATO UNIFORME DE LOADER (fase B do colab inteira): toda leitura da
    home passa a ter (a) retry 3x/1200ms no molde de carregarAniversariantes,
    (b) detector de mudanca barato (ids+tamanho+updatedAt, nao stringify de
    payload grande), (c) renderApp() coalescido quando mudou E a tela
    afetada esta ativa. Correcoes pontuais: gamiConfig NAO cacheia falha
    (null gruda hoje em firebase.js:1724-1731); recarregarVolateis do colab
    reusa esses loaders com o mesmo contrato (hoje re-chama o boot inteiro
    sem retry).

P3. NUNCA MOSTRAR ESTADO DESCONHECIDO (S2): card de boas-vindas so nasce
    quando o estado de reacao daquele post e CONHECIDO (cache quente via P1
    ou leitura concluida); chegada tardia vira re-render pelo contrato P2,
    nao colapso animado de um card que o usuario ja viu. (A semantica final,
    esmaecer em vez de sumir, chega com o redesign stories aprovado a parte.)

P4. ATUALIZACAO EM ATO UNICO (S3): a cortina pos-reload CONTINUA a tela de
    atualizacao (barra ~90% -> completa -> revela), sem o terceiro ato
    "FioPulse quieto"; flags de coreografia migram de sessionStorage pra
    localStorage com timestamp (anti-loop por janela de 60s, iOS nao pode
    resetar a guarda); update detectado DEPOIS do reveal nao re-assume a
    cortina, vira fluxo de meio de sessao (updatePendente na proxima
    abertura). splash-retomada (ato FioPulse) morre.

P5. TROCA DE TELA SEM PISCA (S4): onde a View Transition e pulada, fallback
    de fade-in curto (~90ms, WAAPI, reduced-motion = instantaneo) no #view
    novo; swap nunca mais e seco. (O diffing estrutural entre paginas segue
    projeto separado, nao entra aqui.)

## Fases de release

- F1 (P1+P2+P3): persistencia + contrato de loaders + bv- sem estado
  desconhecido. Probe novo: boot com rede negada no 1o render nasce do
  cache; falha -> retry -> repaint; gamiConfig nao gruda. E o assassino do
  S1/S2.
- F2 (P4): coreografia de atualizacao. Reusa o harness de boot do v366
  (boot-refactor-verify) + casos novos (retomada continua, anti-loop por
  timestamp, update tardio nao re-assume).
- F3 (P5): fallback de fade na navegacao. Guard + olho do orquestrador.

Validacao final de cada fase no aparelho REAL do William (iOS), que e onde
os sintomas vivem.
