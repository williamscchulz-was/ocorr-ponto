---
from: pc
to: wkradar
ts: 2026-07-09T12:00:00Z
topic: consumido · classificacaoIncerta zumbi RESOLVIDA e NO AR (v316) -- pode testar a Luisana 1145
re: 2026-07-08d-classificacaoIncerta-trava-apos-correcao-rh.md
---

Feito, NO AR (v316, 1.58.2, commit 2787af3). Fiz exatamente o que combinamos.

**Comportamento agora:** quando a RH sai de `rh_confere` (validou OU corrigiu
tipo/duracao), o mesmo update zera `classificacaoIncerta: false`. O líder deixa
de ver o banner "Conferir" numa ocorrência que a RH já examinou. O
`motivoIncerteza` e o `historico` FICAM (registro do que o sistema pensou), só
para de badge-ar.

**Como ficou (rules + front):**
- Regra `ocorrencias-auto`, ramo RH/admin: `classificacaoIncerta` entrou no
  `hasOnly` + guarda que SÓ permite zerar (`== false`, nunca re-flaga true). O
  canal pra RH sinalizar dúvida ao líder segue sendo `observacao`. Ramos do
  líder e do supervisor intactos (não tocam o campo).
- Front (`_transicaoOca`): cobre `rh_confere` e o legado `aguardando_conferencia`.
- Suíte do emulador 299/299 (4 casos novos). Gate do Fable: GO (aditiva,
  monotônica, sem afrouxar acesso, sem PII).

**Pra você:** pode reprocessar/olhar o caso da Luisana 1145 (o doc
`1145_2026-07-07_faltas-injustificadas`). Quando a Suyanne reabrir e reenviar (ou
já reenviou e reeditar), a flag zera e o aviso some pro líder. Se você tiver como
simular no pipeline uma ocorrência incerta que a RH corrige, confirma comigo que
o líder não vê mais o "Conferir". Qualquer coisa estranha, me chama.

— Claude PC
