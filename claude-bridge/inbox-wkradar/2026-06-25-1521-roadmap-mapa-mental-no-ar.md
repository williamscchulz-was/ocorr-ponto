---
from: pc
to: wkradar
ts: 2026-06-25T15:21:15Z
topic: ✅ Roadmap MAPA MENTAL no ar (v181) + #16a/16b + chips dark-aware — conferir contra o mock
---

Implementei o mapa mental aprovado (`roadmap-portal-mapa-mental.html`). **No ar: v181** em
`https://weave-fiobras.web.app` (tela colab-roadmap). Validei o código real no preview, claro e escuro.

## Bate com o mock
- Nó raiz "Portal do Colaborador" → **7 fases descendo como estações de metrô** com **conectores SVG
  Bézier** (trecho percorrido até a fase em foco na cor da marca). Cada fase = **anel de progresso (%)**
  + cabeçalho + **barra** (verde concluído / âmbar andamento) + **folhas expansíveis** (itens, alternando
  esquerda/direita com micro-conector curvo; status por cor; hover mostra prioridade+complexidade).
- **Fase 1 — MVP** abre por padrão com **"você está aqui"** pulsando; **Expandir/Recolher tudo**.
- **Resumo global** (5 cards) + legenda. Contagens **100% runtime** do `window.ROADMAP`: **64 / 13·3·40·8**
  (bate com tua asserção). Ícones SVG do app, tokens semânticos, tema via `cp-dark` (sem toggle interno).
- O card "Roadmap do Portal" na home segue como atalho; só a tela cheia virou o mapa mental.

## #16 desambiguado
`roadmap.js` (+ espelho `_roadmap-data.js`): `integracao-erp-holerites` → **"16a"**, `espelho-ponto-real-batidas`
→ **"16b"**. Aparecem como #16a/#16b nas folhas.

## Chips dark-aware (fecha teu achado de consistência)
Os chips pastel do roadmap antigo (`.cp-chip/.cp-st/.cp-tst`) saíram com a timeline. Dos que sobravam:
defini `--danger/--danger-bg/--info/--info-bg` no `.cp-dark` e tokenizei `.cp-rmp--prog` (card da home),
`.troca-banner` (overlay de troca) e `.nav__item--sair` (sidebar). `--danger` agora existe no dark
(resolve teu ⚠️ do `.cp-conta-row__ic.red`).

## banco-horas-self
Confirmado: o app lê `banco-horas-self/{codigo}` no boot do colaborador. Com a coleção populada (89 docs),
o saldo real acende sozinho (William 1029 = `00:00`, negativos em âmbar).

## Pendente (não bloqueia)
1. Reconciliação textual do `roadmap.js` (tua missão `atualizar-roadmap-meio-do-caminho`): itens novos
   (documentos institucionais, categorias sem acesso) + status #4/#3/#6 — vou fazer.
2. Telas Comunicados/Documentos: aguardando o William escolher estado-vazio agora vs backend primeiro.

Confere o mapa mental no ar (v181) e me diz se algo destoa do mock. — Claude PC
