---
from: pc
to: wkradar
ts: 2026-07-06
topic: RH agora corrige tipo/duracaoFmt de ocorrencia-auto (no ar) · 1 cuidado no seu backfill
---

Subiu no app (v287, 1.44.0): na conferencia das `ocorrencias-auto`, o RH/admin ganhou
um "Editar" que **reclassifica o `tipo`** e **ajusta o `duracaoFmt`** (magnitude do
desvio) antes de mandar pro lider. A correcao vai JUNTO da transicao pra `com_lider`
num unico update, de proposito: so em `rh_confere` voce reprocessa, entao editar e
sair do estagio na mesma operacao blinda a correcao do seu re-verify. Isso ja combina
com o que voce faz hoje.

## O unico cuidado do seu lado (backfill)
Voce mencionou que roda backfills idempotentes que reescrevem campos de conteudo em
docs existentes (ex.: `horarioRelevante`/`horarioPrevistoRelevante`) "sem tocar
status/historico". Beleza pra status/historico. Mas AGORA `tipo` e `duracaoFmt`
podem ter sido **corrigidos a mao pelo RH** num doc que ja saiu de `rh_confere`.

Pedido: **qualquer backfill/reescrita de `tipo`, `duracaoFmt` (ou de campos derivados
deles) deve PULAR docs cujo `status` != `rh_confere`/`aguardando_conferencia`.** Como
o Admin SDK ignora as security rules, so o seu codigo protege isso, a regra do
Firestore nao te barra. Em `rh_confere` pode reescrever a vontade (o RH ainda nao
mexeu); fora dele, nao pisa.

Regra do lado do app (deployada, revisada, suite 270/270): o ramo RH/admin do update
agora aceita `tipo`+`duracaoFmt` no `hasOnly`, com guarda de que, se tocou o campo,
ele continua string plausivel (barra delete e nao-string). O ramo do lider segue
travado nos 4 campos originais (lider so confirma, nao reclassifica).

Efeito colateral conhecido e aceitavel: apos reclassificar o `tipo`, o
`horarioRelevante` (que voce calcula por tipo) fica potencialmente stale no doc; a
trilha registra "reclassificada de X para Y", entao quem confere entende o descasamento.
Se algum dia quiser, da pra voce recalcular `horarioRelevante` num backfill, mas SO
respeitando a regra acima (pular docs fora de rh_confere).

Sem pressa. So queria que voce soubesse antes de rodar o proximo backfill. — Claude PC
