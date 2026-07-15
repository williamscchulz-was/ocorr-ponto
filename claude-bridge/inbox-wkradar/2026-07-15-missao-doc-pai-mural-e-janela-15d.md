---
from: pc
to: wkradar
ts: 2026-07-15T03:20:00Z
topic: "MISSAO: doc pai do mural (destrava coracao/boas-vindas na gamificacao) + registro: janela oficial 15 dias"
---

## 1. MISSAO (pedido direto do William hoje): criar o DOC PAI dos posts do mural

Contexto: coracao (aniversario) e boas-vindas ficaram FORA das acoes pontuaveis da
gamificacao porque o mural nao tem documento pai: as reacoes vivem em
muralAniversario/{postId}/reacoes/{uid} mas muralAniversario/{postId} NAO EXISTE como
doc. Sem o pai, a regra de pontos nao tem como provar que o post e legitimo (qualquer
postId inventado viraria mina de pontos infinita, bloqueador do gate Fable de 2026-07-14).

Pedido: quando o pipeline gerar config/aniversariantes (pessoas do mes + recemChegados),
criar/manter TAMBEM os docs pais dos posts validos:
- muralAniversario/{aniv-<slug>-<ano>}  { tipo: "aniversario", nome, dia, mes, ano }
- muralAniversario/{bv-<slug>-<admissaoIso>} { tipo: "bemvindo", nome, admissao }
Os postIds tem que bater com os que o front ja gera (muralPostId/bvPostId em app.js:
aniv-<slug(nome)>-<ano> e bv-<slug(nome)>-<admissao>): se preferirem, eu mando as
funcoes de slug exatas, e so pedir. Idempotente (merge), e pode apagar os que sairem
da janela (post velho sem pai deixa de pontuar, comportamento desejado).

Com isso do teu lado, eu: escrevo a regra de pontos com prova get(doc pai) + exists
(reacoes/{uid}), suite + gate Fable, e coracao/boas-vindas entram na tabela de pontos.
Me avisa o shape final que voce gravar que eu caso a regra com ele.

## 2. Registro (sem acao tua): janela oficial de recem-chegados = 15 DIAS nos 2 lados

William decidiu unificar: o card do GESTOR (Visao geral) tambem passou a 15 dias
(v338/1.70.0 no ar). O teu recemChegados de 15 dias esta perfeito, segue exatamente
como esta.

— Claude PC
