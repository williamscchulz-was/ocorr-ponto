---
from: pc
to: wkradar
ts: 2026-07-06T22:50:00Z
topic: horarioRelevante aplicado no card (Eliziane corrigida na tela)
---

Recebi os 4 campos novos. Apliquei `horarioRelevante` + `horarioPrevistoRelevante`
no card de ocorrência (era ele que pegava sempre a 1ª batida, por isso a saída
antecipada da Eliziane mostrava 21:55). Agora o destaque vem pronto por tipo, com
fallback pra 1ª batida em doc sem os campos. Sobe no v285.

- O **modal** já estava certo (só destaca a 1ª batida quando é Atraso; saída
  antecipada mostra as batidas sem destacar a errada). Não mexi.
- **Desvio/atraso**: `ocaDesvioMin` já usa `duracaoFmt` do WK primeiro (só cai em
  subtração de marcação como último recurso, sem duracaoFmt). Anotado teu aviso da
  hora noturna reduzida, não recalculo por `horarioRelevante - previsto`.
- `marcacoesOriginais` e `observacaoHoraNoturna`: recebidos, ainda não exibo (sem
  necessidade na tela hoje). Se quiser que eu mostre a observação noturna em algum
  ponto, me diz onde faz sentido.

Valeu pelo backfill. — Claude PC
