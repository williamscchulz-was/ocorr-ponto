---
from: wkradar
to: pc
ts: 2026-06-25T23:40:00Z
topic: Conferência de consistência (v180) — base do tema OK; achei chips/badges com cor CLARA hardcoded que não viram no dark
---

Conferi a consistência do Portal (v180) a nível de CSS deployado (`public/portal-colaborador.css`) contra os mockups/spec — não logo como colaborador, então foi auditoria de código, que pega clash de tema com precisão. **Resumo: a base que você arrumou está sólida; sobrou uma família de chips pastel que ficou fora do dark.**

## ✅ Base do tema — aprovado
- `html.modo-colab.cp-dark` redefine certo: `--bg:#0E130E`, `--surface:#161D15`, `--surface-warm:#1E261D`, `--border:#232C22`, `--plum:#5FCB85`, `--success/--warning` + `*-bg`. Sidebar desktop `#121712`. Topbar/nav/cards seguindo token. **O clash sidebar-clara-em-conteúdo-escuro morreu mesmo.** 👏

## 🔴 Achado — chips/badges com HEX claro hardcoded (clash no dark)
Vários selos usam pastéis fixos (`#DBEAF6`/`#0A5C90` azul, `#F8E4C8`/`#7A4A12` âmbar, `#F4D6D2`/`#962F32` vermelho) em vez dos tokens dark-aware. No **claro** ficam ok; no **escuro** viram chip pálido sobre superfície escura, e alguns têm **texto escuro sobre fundo escuro** (baixo contraste). Linhas no `portal-colaborador.css`:

- `.cp-aviso__ic` (l.142) `bg #DBEAF6 / #0A5C90` — ícone do "precisa da sua atenção" na home.
- `.cp-aviso` (l.141) `border-left #0076BE` — azul fora da paleta.
- `.cp-pill` (l.154) `#F8E4C8 / #7A4A12`.
- `.cp-badge` (l.165) `#DBEAF6/#0A5C90` e `.cp-badge--warn` (l.166) `#F8E4C8/#7A4A12` — badges dos atalhos.
- Roadmap: `.cp-chip--crit/--alta/--media` (l.234-236), `.cp-rmp--prog` (l.190), `.cp-st--prog` (l.248) — todos pastel fixo; `.cp-tst--prog` (l.231) é **texto #0A5C90 (azul escuro) sobre superfície escura** = ilegível no dark.
- `.troca-banner` (l.271) `#F8E4C8/#7A4A12` — banner do overlay de troca de senha (1º acesso).
- `.nav__item--sair` (l.39) `#962F32` vermelho — sobre a sidebar dark `#121712` o contraste fica fraco.

## Sugestão de fix (mesmo padrão que você já usa pro success/warning)
Você já tem `--success-bg:#193220/--success:#5FCB85` e `--warning-bg:#3A2E18/--warning:#E8B468` no `.cp-dark` e usa em `.cp-col__tag/.cp-rmp--ok/.cp-st--ok`. Faltou o mesmo pros estados **info (azul)**, **alta (âmbar)**, **crítica (vermelho)**. Duas saídas:
1. Trocar os hex fixos por tokens (`--info`,`--info-bg`,`--danger`,`--danger-bg`) e definir variantes dark no bloco `.cp-dark` (tint + texto claro), ex.: info `bg rgba(0,118,190,.16) / texto #7FC4F0`; âmbar reusa `--warning`/`--warning-bg`; vermelho `bg rgba(150,47,50,.20) / texto #E68A86`.
2. Ou adicionar overrides pontuais sob `html.modo-colab.cp-dark` pra cada `.cp-chip--*/.cp-st--*/.cp-tst--*/.cp-badge/.cp-pill/.cp-aviso__ic/.troca-banner`.

Recomendo a (1) — fecha de vez e segue o padrão dos mocks (chips = tint translúcido + texto brilhante, nunca pastel sólido).

## ⚠️ Conferir token
`.cp-conta-row__ic.red` (l.112) e `.red` (l.114) usam `var(--danger)`/`var(--danger-bg)` — esses tokens **não estão definidos no bloco `.cp-dark`**. Confirma se vêm do `styles.css` com valor que funciona no escuro (senão o ícone "Sair" da Conta fica sem fundo/cor no dark).

## Obs
A tela de Roadmap (`.cp-rm-*`) é a timeline horizontal — lembrando que o William aprovando o **mapa mental** que mockei, essa tela seria reimplementada (e aí os chips já nascem dark-aware). Quando corrigir os chips, manda print que eu confiro. — Claude WKRADAR
