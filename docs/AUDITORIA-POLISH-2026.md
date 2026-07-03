# Auditoria de polimento FioPulse (julho/2026)

Documento vivo da auditoria completa de design, interação e performance pedida pelo
William em 2026-07-02, mirando nível "top 1%" de acabamento. Sobrevive à compactação
de contexto: registra o que foi auditado, o que foi proposto, o que o William aprovou
e o que foi mudado (e por quê).

## Regras do jogo (combinadas com o William)

1. Auditar TUDO nos dois breakpoints (desktop 1440px e mobile 390px), tela a tela,
   fluxo a fluxo, ao vivo, com interações simuladas de verdade.
2. Gravar vídeo das transições, extrair frames e inspecionar (diff por pixel) atrás
   de travadas, pulos e desalinhamentos.
3. Auditar performance como cidadã de primeira classe: boot, fps de scroll, latência
   de input, layout shift. Lento = bug com a mesma prioridade de visual.
4. NÃO mexer em código de produção antes da aprovação. A proposta inteira vira UM
   mockup consolidado + resumo de performance; o William autoriza; só então implementa.
5. Depois de implementar, re-rodar a MESMA verificação pra provar que ficou igual ao
   aprovado e que nada quebrou.

## Ferramental (montado em 2026-07-02)

- **Harness Playwright** (`scratchpad/audit/harness.mjs`): renderiza o app LOGADO sem
  produção. Receita: semeia `state` direto (currentUser = state.currentUserId →
  state.users), abre os portões de tela (#acesso/#login/#login-colab → #app), remove
  o splash, neutraliza `mostrarAcesso` (o onAuthStateChanged nulo do Firebase dispara
  tarde e reabriria o portão), silencia `_changelogChecado` (sem popup de Novidades) e
  anula os loaders/writers de rede (`recarregarOcorrenciasAuto`, `registrarAuditoria`,
  `logEvento`...). Zero leitura/escrita em produção.
- Dados semeados realistas: 10 funcionários (com todos os estados: sem turno, diretor,
  aprendiz, afastado, inativo), 4 ocorrências automáticas (uma por estágio do fluxo
  RH→Líder), 4 manuais, aniversariantes.
- Browsers: Chrome do sistema via Playwright 1.61 (canal chrome), desktop 1440x900 e
  iPhone 390x844 (touch + DPR 2). Vídeo via recordVideo (webm) + análise de frames em
  Python/PIL.
- Métricas: `medirBoot` (Navigation Timing/FCP), `medirFpsScroll` (rAF em scroll
  programático de 2s), `medirLatenciaClique` (clique → primeira mutação de DOM via
  MutationObserver), CLS via PerformanceObserver.
- App servido em `http://localhost:8081/public/index.html` (mockserver do scratchpad,
  arquivos locais do repo, sem cache).

## Execução

- **2026-07-02**: harness validado (gestor desktop + colab mobile renderizando com
  zero erros de console). Esquadrão lançado: 9 auditores de tela (gestor desktop
  núcleo/pessoas/conteúdo; gestor mobile núcleo/secundárias; colab mobile núcleo/
  secundárias; colab desktop; acesso/login/splash) + 1 auditor de performance, em
  paralelo, seguidos de verificação adversarial dos achados de gravidade alta
  (verificador cético tenta REFUTAR cada um reproduzindo do zero).

## Achados (varredura de 2026-07-02: 140 brutos · 12 graves, 12/12 confirmados)

Fonte completa (JSON com os 140 + evidências): saída do workflow `wf_d0982d15-450`
(cópia dos screenshots em `scratchpad/audit/out/`). Estatística: 22 agentes, 967
chamadas de ferramenta, ~35 min de varredura ao vivo.

### Graves confirmados por verificação adversarial (12/12)

1. **Cards de ocorrência automática inacessíveis por teclado** (desktop+mobile): sem
   role/tabindex; dispensada/confirmada não têm nenhum botão interno, trilha só abre
   com mouse. Manuais têm role=button (app.js:3514), automáticas não (ocaDashCardHtml).
2. **Faixa de debug visível ao usuário no Banco de Horas**: "diag BH · doc existe: ? ·
   carregados: 0 · erro: nenhum" pra admin/RH sem saldo importado (app.js ~8160).
3. **Cartão de arquivo fantasma no modal Importar recibos**: `#rcb-filecard[hidden]`
   perde de `.rcb-filecard{display:flex}` (styles.css:4499) e aparece vazio com X.
4. **Ink da aba ativa embaixo da aba ERRADA no mobile**: 6 abas quebram em 2 linhas
   (flex-wrap) e o indicador absoluto fica 53px abaixo da aba ativa, sublinhando outra.
5. **Card manual quebra a grade no mobile**: grade vira 3 colunas (styles.css:1352),
   .occ__time some e o restante desalinha.
6. **Aba "Todas" fora de ordem cronológica**: autoList concatenada antes das manuais
   (app.js:3483), datas saem 01/07, 28/06, 02/07, 01/07...
7. **Pilha de FABs cobre ações no fim do scroll (gestor mobile)**: chat 172px + FAB
   104px, mas padding-bottom do conteúdo é 104px; em telas curtas botões ficam
   permanentemente cobertos. (Regressão introduzida na v266.)
8. **Truncamento agressivo em Funcionários mobile**: nome com 36px visíveis
   ("Ga...") por causa dos badges na mesma linha.
9. **Espelho de ponto mobile sem feedback ao tocar pessoa**: o detalhe renderiza
   fora da viewport (embaixo da ilha), parece que o toque não fez nada.
10. **Folha de pagamento: nota contradiz o selo**: "assinatura eletrônica chega em
    breve" ao lado de "Assinatura pendente" (assinatura está NO AR desde a v257).
11. **Selo "Pendente" quase ilegível no colab-ponto**: contraste reprovado nos dois
    temas (âmbar sobre âmbar).
12. **Diagnóstico interno com erro cru no colab**: "diag avisos: 0 carregados ·
    permission-denied" visível no estado vazio de Avisos e Documentos.

### Destaques de gravidade média (recorrentes)

- Saldo negativo VERDE no modal premium (.detail-cell strong vence .esp-neg).
- Badge "Atraso de 45 min" com contraste 3.1:1 (o token --warning-ink existe e não é
  usado ali).
- Três contagens diferentes de "pendente" na mesma tela (KPI 2 · sidebar 2 · aba 3);
  líder com pendência automática vê KPI 0.
- "Todas 6" que não bate com a soma das abas vizinhas (8).
- Mesmo tipo com capitalização e cor diferentes entre manual e automática.
- Colunas de horário/status "dançando" x=1112..1234 entre linhas da mesma lista.
- Travessão verde bold como placeholder de horário; automática mostra horário
  PREVISTO como se fosse batida.
- Foco de teclado deforma geometria (border-radius:4px global no :focus-visible).
- Roadmap do colaborador: colisão da classe global .empty quebra 29/72 itens.

### Performance (medida, não estimada)

- Boot localhost: DCL ~201ms, FCP ~212ms (bom).
- **904KB de JS em 11 scripts síncronos** (app.js sozinho 621KB) parseados a cada
  abertura; total 1.134KB em 15 recursos. Gravidade média (campo real: 3G/celular).
- FPS de scroll e latência de input dentro do budget premium com dados em escala de
  produção (90 funcionários + 120 ocorrências): sem achados graves.

## Proposta consolidada

**`docs/mockups/polish-consolidado-mock.html`** (2026-07-02). Estrutura: capa com o
placar (140 achados: 18 altas com 12/12 confirmadas na verificação adversarial, 73
médias, 49 baixas), cartão de performance (números medidos + 2 propostas: minificar
os bundles no deploy 621KB→~200KB e carga sob demanda de changelog/roadmap), nove
seções de correções demonstradas em pares hoje/proposto (contagens unificadas, lista
desktop alinhada, modal com semântica de cor certa e contraste AA, abas mobile
roláveis com ink correto, cards re-gradeados no mobile, zonas do chrome mobile com
medidas + espelho em sheet, textos de debug removidos, foco sem deformação, selo
legível nos 2 temas, grade de 8 miudezas) e tabela final com os 109 achados restantes.
Mockup verificado headless nos dois breakpoints (zero erros, sem overflow).

## Aprovação do William

**2026-07-03: "pode aplicar aquele teu mockup!"** — proposta consolidada aprovada
integralmente, sem cortes.

## Implementação e re-verificação

### Onda 1 (v268, 2026-07-03) — os 12 graves + seções demonstradas + performance

Implementado: números de pendência unificados (badge = KPI = aba, uma função só);
aba Todas com os 4 estágios e fluxo único em ordem cronológica (autos e manuais
intercaladas); tipos com grafia/tone único nas duas origens (OCA_TIPOS espelha
data.js); lista com colunas alinhadas, "sem batida" discreto no lugar do travessão
verde e horário previsto ROTULADO ("prev. 22:00"); modal premium com saldo negativo
em --danger e badge de atraso em --warning-ink (AA 6.0:1); abas mobile em 1 linha
rolável com ink correto + fade (só na faixa de ocorrências) + scrollIntoView da
ativa; cards re-gradeados no mobile (grid-areas, horário visível); nomes de
Funcionários em até 2 linhas com badges quebrando (specificity 2 classes vencendo
as regras base + .func-nome removido do grupo de truncamento global); padding do
gestor mobile 248px (nada coberto pela pilha chat+FAB; colab mantém 104px); espelho
mobile em FOLHA (#esp-sheet, nó movido e devolvido) aberta só em seleção
intencional; textos de debug removidos (diag BH/avisos/docs) com estados vazios
decentes e nota da Folha atualizada; foco sem border-radius forçado; cards
automáticos com role/tabindex/aria-label (Enter/Espaço abrem o detalhe); selos do
colab com contraste AA nos 2 temas; .rcb-filecard[hidden] de verdade; roadmap
fp-lnum--vazio (colisão com .empty global); ícone pulso adicionado ao icon() do
utils.js (dois mapas de ícones: o global vive em utils, o do app.js é o cpIcon).
**Performance**: build de deploy `scripts/build-dist.mjs` (esbuild, whitespace+
syntax, identificadores preservados porque os globals entre arquivos são API):
931KB → 669KB de JS (-28%); hosting weave agora serve `dist/` com predeploy
automático; fontes seguem legíveis em `public/`.

### Re-verificação (mesma bateria, 13 verificadores independentes)

11/13 confirmados de primeira; 2 refutados e corrigidos na hora com nova prova:
truncamento de Funcionários (a cascata anulava o bloco: regras base vinham depois
no arquivo; corrigido com seletores de 2 classes; re-medido: nome 244px/2 linhas
nos 3 casos críticos) e folha do espelho abrindo sozinha ao entrar na página
(agora só em toque/atalho; re-provado). Smoke geral: 11 blocos, ZERO erros de
console/pageerror, dist minificada renderiza idêntica à fonte (viewLen iguais),
sem overflow horizontal em nenhuma tela. Observações pré-existentes registradas
pelos verificadores (não regressões): ink 4.8px à esquerda no 1º render a frio
até o swap da Poppins (se corrige sozinho); busca da aba Todas casa o tipo BRUTO
da automática, não o rótulo exibido.

### Pendente (Onda 2)

Os ~106 achados médios/baixos da tabela do mockup que não entraram na Onda 1.
