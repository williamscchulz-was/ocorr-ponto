---
from: wkradar
to: pc
ts: 2026-07-01T16:00:00Z
topic: 🎨 Mega auditoria de UI/UX do Portal do Colaborador (inspirada na Apple) — roteiro completo + 4 decisões do William já tomadas
---

William pediu uma auditoria completa de design (mobile+desktop) do Portal do Colaborador, "inspirada na Apple". Rodei um workflow com 9 agentes em paralelo (tipografia, espaçamento, cor/profundidade/dark mode, movimento, navegação, ergonomia mobile, ergonomia desktop, consistência de componentes, acessibilidade) + uma síntese que **voltou e conferiu tudo contra o código real** antes de fechar o relatório. É auditoria de LEITURA — não toquei em nada, é tudo teu pra implementar.

**Sobre "inspirar-se na Apple":** significa aplicar princípios (clareza, hierarquia, espaço generoso, profundidade sutil, movimento com propósito, consistência) — **NÃO** trocar a identidade Fiobras. Verde (#008835/#1AA34F) e Poppins ficam.

## ⚠️ Achado que muda o tamanho do problema

A síntese cruzou `portal-colaborador.css` com `app.js`/`roadmap.js`/`index.html` e confirmou por grep: **~200 das 754 linhas de CSS do portal + 2 funções JS inteiras (`cpTileHtml`, `cpStationHtml` em `app.js:1614-1637`) são código morto** — a versão antiga de Home/Conta/Avisos/Documentos-card/Roadmap-horizontal, já substituída pela família `.pp-*` e pelo mapa mental `.fp-*`. Boa parte dos achados brutos (tipografia, contraste, espaçamento) citava classes que **não renderizam mais** (`.cp-hi`, `.cp-idc*`, `.cp-kpi*`, `.cp-atalho`, `.cp-com`, `.cp-aniv` antigo, `.cp-pend` antigo, `.cp-tabs`, `.cp-rmcard`, `.cp-prof`, `.cp-glab`, `.cp-grp`, `.cp-conta-row`, `.cp-seg` antigo, `.cp-dados` antigo, `.cp-foot`, `.cp-bh`/`.cp-bh__*`/`.cp-bh-note`, `.cp-rm-gp`/`.cp-road`/`.cp-col`/`.cp-tile`/`.cp-meter`, `.cp-av`/`.cp-doc` como cards). Os achados abaixo já foram filtrados pra citar só o que renderiza de verdade.

**Bônus:** recalculei 2 alegações de contraste WCAG que a auditoria bruta marcou como insuficientes (`--text-body`/`--text-muted` sobre `--bg`/`--surface`, luz e escuro) — as duas passam (~6:1, acima do mínimo AA 4.5:1). Vale conferir com uma ferramenta de contraste de verdade antes de mexer nessas cores, mas não é urgente.

---

## PASSO 0 (fazer primeiro, risco zero): apagar o código morto

Confirma com grep em `app.js`/`roadmap.js`/`index.html` antes de cada remoção (mesma checagem que já fiz), depois apaga:
- `portal-colaborador.css` (~260-397, ~443-478, ~91-155 e blocos das classes listadas acima)
- `app.js:1614-1637` (`cpTileHtml`, `cpStationHtml`)

Isso não muda nada visualmente (código inerte) e reduz o arquivo em ~25%. **Faz os próximos passos ficarem mais simples de revisar** porque metade do "ruído" desaparece.

---

## GANHOS RÁPIDOS (baixo esforço, dá pra fazer numa sessão)

1. **Alvos de toque abaixo do mínimo (44px)** — `portal-colaborador.css:665` `.pp-chip-f{height:34px}` e `:124` `.modo-colab .bottom-nav__item{padding:6px 4px}` com ícone 23px (`:128`). Subir `.pp-chip-f` pra `height:38-40px`; no bottom-nav, `padding:8-10px 4px` e/ou `min-height:48px`.

2. **Cards clicáveis sem `:active`** — o padrão certo já existe em `.pp-rw:active{background:var(--surface-warm)}` (`:555`) e `.pp-atalho:active` (`:626`), mas `.pp-hero` (`:575`), `.pp-card` (`:633`) e `.pp-pend` (`:617`) — todos `<button>` — não têm. Replicar: `.pp-hero:active, .pp-card:active, .pp-pend:active { filter:brightness(.97) }`.

3. **Chips de filtro sem transição** — `:665-667` `.pp-chip-f`/`.pp-chip-f.on` trocam cor instantaneamente. O segmented de Tema (`.pp-seg`, `:592`) e o switch de notificações (`.pp-switch`, `:599`) já têm transição — só falta aqui: `.pp-chip-f{transition:background .18s var(--ease),color .18s var(--ease),border-color .18s var(--ease)}` (`--ease` já existe em `styles.css:68`).

4. **Padding de card sem grid comum** — hoje: `.cp-occ` (`:698`) = `12px 13px`; `.cp-dia` (`:710`) = `10px 13px`; `.pp-grp .pp-rw` (`:553`) = `13px 14px`; `.pp-atalho` (`:625`) = `14px`; `.pp-card__bd` (`:635`) = `14px`; `.pp-hero` (`:575`) = `16px 18px` (já ok). Padronizar em 3 níveis: compacto `12px 14px`, padrão `14px 16px`, hero `16px 18px` — usar as vars `--pp-ri`/`--pp-rc`/`--pp-rh` que já existem em `.modo-colab` (`:527`).

5. **Input de login com 15px** — `styles.css:335` `.field input{font-size:15px}`. Subir pra `16px` (evita zoom automático do Safari iOS). `inputmode`/`autocomplete` já estão certos (`index.html:147,151-152`), é só esse valor.

6. **Safe-area não tratada na troca de senha** — `portal-colaborador.css:422` `.troca-ov{position:fixed;inset:0}` sem padding pra área segura. `.cp-post__foot` (`:735`) já usa `padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))` corretamente — replicar em `.troca-card`/`.troca-ov`.

7. **Peso 800 pesado demais no título da Home** — `:613` `.pp-hi h1{font-size:26px;font-weight:800}` (o "Olá, Nome"). Trocar pra `700`. Manter `800` só no valor numérico (`.pp-hero__val`, `:584`, saldo do BH) e no wordmark FioPulse.

---

## MELHORIAS ESTRUTURAIS (esforço maior, vira roadmap de várias sessões)

1. **Roadmap com 3ª escala hardcoded** — `styles.css:53-64` define a escala global (`--radius`/`--shadow-*`, lado gestor); o portal define a própria em `.modo-colab` (`:526-534`: `--pp-ri`/`--pp-rc`/`--pp-rh`, `--pp-sh-card`/`--pp-sh-hero`, já com variante dark mode certa) — usada consistentemente por `pp-grp`/`pp-card`/`pp-atalho`/`pp-hero`. O Roadmap (`.fp-*`) tem uma **terceira** variante hardcoded sem variável (`border-radius:15px/13px` direto em `:170,177,209`, `--sh1`/`--sh2` locais em `:170`). Fazer `fp-*` consumir `--pp-rc`/`--pp-sh-card` em vez de valores soltos.

2. **Botão primário com 2 receitas no MESMO fluxo** — no fluxo de assinatura de documento: o botão que abre a ação usa `.pp-btn.pp-btn--primary` (`app.js:1072,1120`, `portal-colaborador.css:678-680`, `height:44px`), mas o botão de confirmação DENTRO do modal usa `.btn.btn--primary` (`app.js:1186`, `styles.css:421`, `padding:12px 18px`). Unificar em `.pp-btn--primary` nos dois.

3. **Badges/chips/pills sem padrão** — `.pp-chip` (`:543`, 30px), `.pp-badge` (`:670`, 26px), `.pp-atalho__n` (`:630`), `.cp-chip`/`.cp-st` no modal do roadmap (`app.js:1788`, `:388/402`) — cada um com altura/padding/font-size próprios (9.5-11.5px). Consolidar num componente `.badge` com 2-3 variantes semânticas.

4. **Empty states reinventados** — `.cp-stub` (`:349-353`) montado à mão em pelo menos 3 lugares (`app.js:903,914` + Documentos). Já existe `.empty`/`.empty__icon` genérico no lado gestor (`styles.css:2076-2093`), não reaproveitado. Criar helper (`cpEmptyHtml(icon, titulo, desc)`) e escolher UM padrão.

5. **Escala tipográfica dos componentes vivos não formalizada** — `.pp-hi h1` 26px/800, `.pp-name` 20px/700 (`:540`), `.pp-card__t` 15px/600 (`:638`), `.cp-post__t` 20px/700 (`:731`), `.cp-occ__t` 14.5px/600 (`:703`), `.fp-pname h3` 13.5px/700 (`:215`), `.fp-stat .n` clamp(18-22px)/700 (`:178`) — 7+ tamanhos de "título" sem escala nomeada. Definir dentro de `.modo-colab`: `--cp-fs-display:26px`, `--cp-fs-title:20px`, `--cp-fs-subtitle:15px`, `--cp-fs-body:13-14px` e remapear (valores atuais já servem de ponto de partida, não precisa mudar números).

---

## 4 DECISÕES DO WILLIAM (já resolvidas — aplica direto)

**1) Atalhos da Home:** remover os 3 redundantes (Meu Ponto/Comunicados/Documentos — já estão na navegação principal) e manter **só "Novidades"** como atalho de destaque (é o único caminho pro Roadmap hoje — não está na sidebar nem no bottom-nav, confirmado `app.js:802-808` e `829-836`).

**2) Roadmap:** manter o mapa mental (é o maior diferencial visual e já funciona), mas **reduzir a paleta de cor pra no máximo 4 estados** (concluído=verde, em andamento=âmbar, planejado=neutro/outline, bloqueado=vermelho só quando crítico) — hoje `portal-colaborador.css:164-172` define 12 variáveis de cor pro `.fp-root`, cada card combina até 3-4 dimensões de cor simultâneas. Remover cor de elementos puramente decorativos (ex.: contadores do resumo).

**3) Prefixos CSS (cp-/pp-/fp-):** **NÃO unificar agora.** Deixar conviver com papel definido — documentar a convenção (pode ser um comentário no topo de `portal-colaborador.css`): `pp-` = padrão geral vivo do portal; `cp-` = só os widgets que sobraram com papel próprio (visualizador de imagem, assinatura, cards de ocorrência/dia — `cp-occ`/`cp-dia`/`cp-post`/`cp-assinar`/`cp-mod-*`); `fp-` = só o Roadmap, isolado de propósito. Depois do Passo 0 (limpar código morto), essa convivência já resolve a maior parte da confusão.

**4) Layout desktop:** **vale investir.** Hoje (`styles.css:753` `.app__main{padding:32px 40px}`) não tem grid de desktop no lado colaborador — `.app--rail` (sidebar recolhida, `:499`) só existe pro gestor. Definir `@media(min-width:901px)` por tela: Home em 2 colunas (hero+atalhos à esquerda, comunicados+aniversariantes à direita), Conta em 2 colunas (dados à esquerda, preferências/segurança à direita). Avaliar se `.app--rail` também deveria valer pro colaborador em telas grandes.

---

Isso é bastante coisa — não precisa fazer tudo de uma vez. Sugestão de ordem: **Passo 0 → ganhos rápidos → as 4 decisões → melhorias estruturais** conforme a agenda permitir. Qualquer dúvida sobre um achado específico, me chama que eu confiro de novo no código. — Claude WKRADAR
