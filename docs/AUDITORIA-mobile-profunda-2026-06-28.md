# Auditoria mobile profunda — Portal do Colaborador (lente Nubank / Apple)
**Data:** 2026-06-28 · Base no ar: v205 · Telas: `public/app.js` (render*) + `public/portal-colaborador.css` (cp-*)

Síntese de uma auditoria multi-lente. As lentes **visual** e **movimento** vieram completas (24 achados); as de navegação/toque/tela-a-tela falharam no schema e ficam pra refazer. Nada foi editado ainda — este é o plano pra executar (com aprovação de mock onde for visual).

## A grande jogada
**Portar os mocks de redesign que já existem mas nunca chegaram ao app.** `docs/mockups/colaborador-{home,conta,comunicados,documentos}-redesign.html` codificam um sistema bem superior (herói por tela, 3 níveis de sombra `--sh-flat/--sh-card/--sh-hero`, overline com contagem em chip, segmented com pill deslizante, switch iOS, avatar 84px com brilho especular, topbar com voltar, nav em vidro). O que renderiza hoje é a versão antiga. Fechar esse gap é o maior ganho. Estratégia: tokenizar (sombras + raios) no `portal-colaborador.css`, reescrever um `render*` como prova (Conta ou Avisos), aprovar no navegador, replicar.

## Quick wins (alto impacto, baixo esforço) — fazer primeiro
1. **Press-state `:active` em TODOS os cp-* tocáveis** (cp-atalho, cp-bh, cp-com, cp-pend__row, cp-conta-row, cp-tab, cp-av, cp-doc, cp-aniv__row, bottom-nav). Hoje só têm `:hover` (gruda no toque). Add `:active{transform:scale(.97/.94)}` + transition .12s, sob `prefers-reduced-motion`. (motion #1)
2. **Haptic na navegação e confirmações.** `vibrar()` já existe (app.js:110) mas não é chamado em `bindColabNav`/bottom-nav nem em ciência/assinar. Add `vibrar(8)` na troca de aba, `vibrar(12)` nas confirmações. (motion #2)
3. **Fade-up de entrada nas telas.** `animarEntrada` só roda em Home/Ponto/Conta; ligar em Avisos/Documentos/Roadmap (ou `.cp-view-enter` global no #view). (motion #3)
4. **Unificar os overlines de seção.** Home mistura `.cp-seclabel` (uppercase) e `.cp-sec h2` (sem caixa alta) + há duplicação de `.cp-seclabel`/`.cp-pend` no CSS. Um só componente. (visual #5)
5. **Tokenizar raios** (--cp-r-item 14, --cp-r-card 16, --cp-r-hero 18, --cp-r-sheet 28) e trocar os avulsos (hoje 11/12/14/15/16/18/20). (visual #6)
6. **Animar barras/anéis de progresso** entrando de 0 (render com 0, `requestAnimationFrame` seta o valor real → a transition CSS dispara). (motion #10)

## Alta severidade
- **3 níveis reais de elevação.** Hoje quase tudo no mesmo plano (cards com sombra .05 invisível). Introduzir `--sh-card`/`--sh-hero` e aplicar por papel (repouso sem sombra, card médio, herói alto); subir opacidade no light pra descolar do #EEF3EC. (visual #2)
- **Large title.** Título de tela é 21/18px (menor que o saldo). Criar título de portal 26-30px peso 700-800 + escala explícita (título 28 / overline 10.5 caixa-alta / card 15 / corpo 13 / meta 11). (visual #3)
- **Pull-to-refresh.** `cpRefreshAoAbrir`/`recarregarVolateis` já existem; falta o gesto (touchstart/move no #view com scrollTop===0 → spinner verde → solta → refresh + `vibrar(10)` + toast "Atualizado"). (motion #4)

## Média severidade
- **Topbar dedicado do portal** (voltar + título + tema, sticky, flat) no lugar do `.page-header` do gestor nas telas internas. (visual #4)
- **Avatar de identidade** maior (84px soft-square + anel + brilho especular) reusado em Home e Conta. (visual #7)
- **Skeleton shimmer** no 1º load (reusar sk-occ/skShimmer) no formato do herói/linhas. (motion #5)
- **Herói de BH com count-up** (estender `animarNumeros` pra HH:MM) + flash ao atualizar. (motion #6)
- **Avisos:** herói de resumo ("N não lidos · M exigem confirmação") + filtro em chips (não abas) + bloco de ciência destacado. (visual #10)
- **Documentos:** promover a assinatura pendente a card-herói (borda âmbar + botão Assinar 48px). (visual #11)
- **Meu Ponto:** enriquecer (subtítulo de contexto no herói + extrato, mesmo "em breve") pra não parecer stub. (visual #8)
- **Ciência/assinatura com animação de saída/sucesso** (slide-out reusando `.occ--saindo`, check que desenha, `vibrar(12)`). (motion #7,#8)
- **Bottom-nav:** animar o círculo ativo + atualizar só classes (não re-renderizar a barra). (motion #11)

## Baixa severidade
- Conta: segmented com pill deslizante + switch de notificações + "Somente leitura" nos dados. (visual #9)
- Conta: expandir "Dados pessoais" com transição de altura (grid-template-rows, padrão `.fp-leaves`) + chevron girando. (motion #9)
- Toast subutilizado (atualizar/erro/sucesso). (motion #12)

## Pendente da auditoria
Refazer as lentes **navegação**, **ergonomia de toque** e **tela-a-tela** (falharam no schema do workflow). E os **super mockups** de todas as telas (Nubank/Apple), que o William vai finalizar.
