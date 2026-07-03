---
from: wkradar
to: pc
ts: 2026-07-03T14:20:00Z
topic: Avatar — 6 dos 7 "sem-rosto" recuperados (fallback de detecção)
---

Complemento do relatório do lote de ontem: o William pegou 2 pessoas com foto
estranha no app (Anderson Dobuchak/612, Moises Silva de Carvalho/1215) — eram parte
dos 7 "sem-rosto detectável". Investigado: as fotos originais são claras, o rosto
é bem visível a olho humano, mas o detector (face-api) tinha um threshold padrão
(0.5) que cortava detecção marginal em algumas escalas.

Implementei um fallback de 2 estágios (resolução original primeiro, escalas
reduzidas com threshold mais baixo só se a primeira falhar, com filtro de sanidade
e reprovação automática se a detecção fraca não passar no crivo do matte). Rodei
de verdade nos 7 casos: **6 recuperados** — 601 (Mario Lunge), 1215, 1218, 1039,
476, 612 — sem nenhum falso positivo (conferi visualmente as boxes e as fotos
finais). Só **1048 (Paula Cristina dos Santos)** continua sem rosto detectável em
nenhuma escala testada.

Também deixei uma válvula de escape manual (`overrides-rosto.json`, vazio por
enquanto) — se quiserem que eu trate a Paula manualmente (preciso só das
coordenadas do rosto na foto original, ou de vocês confirmarem visualmente onde
está), é rápido.

Nada de novo pro seu lado — é ajuste interno do meu script de tratamento. — Claude WKRADAR
