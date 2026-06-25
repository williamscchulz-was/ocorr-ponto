---
from: wkradar
to: pc
ts: 2026-06-26T00:05:00Z
topic: ✅ APROVADO — reimplementar a tela colab-roadmap como MAPA MENTAL (trilho de metrô vertical)
prioridade: media
---

O William **aprovou totalmente** o mapa mental do roadmap. Substitui a timeline horizontal atual (`.cp-rm-*` / `renderColabRoadmap`) por um **mapa mental vertical estilo trilho de metrô**. Mockup completo e funcional salvo em **`docs/mockups/roadmap-portal-mapa-mental.html`** (abre no navegador; é fragmento auto-contido, HTML+CSS+JS puro, sem libs).

## O conceito (o que reimplementar)
- **Nó raiz "Portal do Colaborador"** no topo; as **7 fases descem como estações** de um trilho de metrô, com **conectores SVG Bézier curvos** (não retas). O trecho "percorrido" do trilho vai na cor da marca até a fase em foco.
- Cada fase = **estação com anel de progresso** (% no centro) + cabeçalho (nome, subtítulo, contagem) + **barra de progresso** (concluído verde / em andamento âmbar).
- **Fase 1 — MVP** já abre por padrão (marcador **"você está aqui"** pulsando); demais recolhidas mostrando só a contagem; **clicar expande/recolhe** as folhas (itens) — com botões "Expandir tudo / Recolher tudo".
- **Folhas = itens**, alternando esquerda/direita com micro-conector curvo; status por cor (concluído=verde, em andamento=âmbar pulsa, planejado=contorno cinza, pendente=tracejado); hover/clique revela prioridade+complexidade.
- **Resumo global** no topo (cards: 13 concluídas · 3 em andamento · 40 planejadas · 8 pendentes · 64 total) + legenda.

## Importante (dados + identidade)
- **Fonte = `public/roadmap.js`** (o mesmo array de hoje). No mock as contagens são **derivadas em runtime** dos itens (zero hardcode) e validadas por asserção — replique isso: mudar status no `roadmap.js` reflete sozinho.
- **Identidade FioPulse** tokens exatos (já bate com o `portal-colaborador.css`): dark padrão + light coerente, Poppins, **sem emoji**. Como é tela in-app, use o set de ícones SVG do app no lugar do Tabler do mock, e os tokens semânticos (`--surface`/`--plum`/`--success`/`--warning`) em vez dos hex do mock.
- **Bônus:** ao reimplementar, os chips de status/prioridade já nascem **dark-aware** — resolve de quebra parte do achado do bridge `2026-06-25-consistencia-dark-chips.md` (os `.cp-chip--*`/`.cp-st--*` pastel da timeline antiga somem).
- O **card "Roadmap do Portal" na home** (`.cp-rmcard`) continua como atalho; só a tela cheia (`colab-roadmap`) muda pro mapa mental.

## Detalhe que o mock trata e a versão atual não
A Fase **Futuro** tem o número **#16 repetido** em 2 itens distintos (Integração ERP de holerites e Espelho de ponto REAL). O mock desambígua como **#16a / #16b** com title no hover. Sugiro corrigir/clarificar isso no `roadmap.js` também.

Sem pressa — é um upgrade de UI, não bloqueia MVP. Quando subir, manda print que eu confiro contra o mock. — Claude WKRADAR
