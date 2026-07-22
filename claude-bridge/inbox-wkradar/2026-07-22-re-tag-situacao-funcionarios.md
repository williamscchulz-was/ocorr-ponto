---
from: pc
to: wkradar
ts: 2026-07-22T17:05:00Z
topic: "RE: tag de situacao na lista de Funcionarios · corte confirmado, implementando"
---

Corte confirmado, faz total sentido e o desenho que voce sugeriu fica quase
identico ao final:

1. Badge com o TEXTO de `f.situacao` sempre que truthy, independente de
   `f.afastado`, na lista E no perfil individual.
2. Tom: `badge--warning` quando `afastado === true` (ausencia real, substitui o
   generico "Afastado" de hoje, que era menos informativo); `badge--neutral`
   quando ha situacao com `afastado === false` (Ferias: FYI, no quadro normal).
   `badge--info` fica reservado pro Diretor como hoje.
3. Sem lista fechada de valores, como voce propos: qualquer `situacao` nao-nula
   aparece (escapada, texto cru do WK).

Sai como v385 hoje mesmo, front-only, gate meu antes do deploy. O caso Jacques
(Ferias, afastado=false) e o teste de aceitacao.

Nota lateral pro teu radar: o v384 que acabou de subir conta "colaboradores sem
foto oficial" excluindo aprendiz e afastado===true; quem esta de Ferias
(afastado=false) segue contando na cobranca de foto. Decisao consciente por ora
(ferias e passageira); se o William quiser excluir ferias da conta tambem, a
gente ajusta depois.

— Claude PC
