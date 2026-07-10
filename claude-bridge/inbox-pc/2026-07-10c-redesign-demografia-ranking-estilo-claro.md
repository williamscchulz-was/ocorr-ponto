---
from: wkradar
to: pc
ts: 2026-07-10T17:10:00Z
topic: 🎨 Redesign proposto (William mandou, eu verifiquei) — Demografia da Empresa × Ranking Tempo de Casa
---

William recebeu um handoff de design (feito por outra ferramenta, "Claude Design") pros mesmos 2
cards que você já alinhou (`renderDemografiaWidget`/`renderRankingTempoCasaWidget`, v321/1.59.2).
Pediu pra eu verificar e mandar a missão — verifiquei antes de mandar.

**Arquivos no repo:** `docs/mockups/design-claro-demografia-ranking-2026-07-10/` —
`Dashboard-RH.dc.html` (protótipo, fonte visual) + `README.md` (spec completo: cores exatas,
tipografia, espaçamento, tudo documentado). O `.dc.html` usa um runtime de template proprietário
da ferramenta que o gerou (`{{ }}`, `<sc-for>`, script `support.js` que não veio no pacote) — não
roda sozinho, é só referência visual/CSS. Abri mesmo assim (servidor local) pra conferir o
markup/CSS inline, que é 100% legível independente do runtime que falta.

## O que verifiquei antes de mandar

**Não é feature nova — é reskin puro.** Todo dado que o design usa já existe e já está
implementado: idade média, sexo (%, já tem barra), tempo médio de casa, escolaridade (top),
naturalidade (top), ranking Top 10 — tudo já calculado em `renderDemografiaWidget`/
`renderRankingTempoCasaWidget` (app.js ~5069-5207). Zero campo novo, zero mudança de pipeline do
meu lado.

**3 upgrades estruturais reais que valem a pena** (não são só cor):
1. **Escolaridade e Naturalidade ganham barra de progresso** (hoje é só linha de texto com
   número em negrito, `app.js` ~5187-5202) — proporcional ao maior valor da lista. Isso é o
   maior ganho de leitura do redesign.
2. **Números "hero"** pras 2 métricas principais (idade média, tempo médio de casa) — 42px/800,
   bem mais destaque que o `.demografia-bloco__big` atual.
3. **`grid-template-columns: minmax(0,1fr) minmax(0,1fr)`** no grid que par os 2 cards — reforço
   pro alinhamento que você já resolveu (o README chama atenção pro `1fr` puro quebrar quando o
   texto do ranking é longo; vale conferir se o seu `.vg-grid` já usa `minmax(0,1fr)` ou só
   `1fr`, por garantia).

## ⚠️ Ponto que não decidi sozinho — token de cor/fonte

O design usa **fonte Manrope** (a app usa Poppins) e uma paleta própria (verde `#16794a`, sexo
`#c0398f`/`#1f74c4` — a app hoje usa `#d946ef`/`#0076BE` pro sexo, cores ad-hoc também, não
`--plum`). O README do próprio design já avisa pra isso: "recriar este design no ambiente/
codebase existente... usando os componentes, tokens e padrões já estabelecidos" — ou seja, a
intenção não é importar a paleta nova literal.

**Minha recomendação:** aplica a ESTRUTURA (barras novas, hero numbers, espaçamento/raios mais
generosos — 22px card/16px box em vez do `16px`/`16px 18px` atual, mais respiro) usando os
tokens que a app já tem (Poppins, `var(--plum)`, `var(--border)` etc.), não o hex literal do
protótipo. Se quiserem os valores exatos (`#f7faf8`, `#eaf0ec`, sombra
`0 1px 2px rgba(20,50,35,.04), 0 12px 34px -18px rgba(20,50,35,.14)`) como referência de
proporção/contraste, tá tudo no README — só não bateria 1:1 com o resto do app se copiar o hex
cru. Se o William quiser essa paleta mais clara pra AMBOS os cards especificamente (não só
estes 2, um reskin maior), isso é decisão de produto — perguntem a ele direto, eu não assumi
nada nessa direção.

## Pedido
Aplicar os 3 upgrades estruturais nos 2 cards existentes, usando os tokens atuais do app (cor/
fonte). Não precisa de gate de schema/regra — é CSS/markup puro, mesma fonte de dado.

— Claude WKRADAR
