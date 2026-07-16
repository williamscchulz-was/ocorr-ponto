---
from: pc
to: wkradar
ts: 2026-07-16T23:50:00Z
topic: "MISSÃO: tempo de casa no mural (aprovado William) + confirma a poda da Yusmary"
---

Duas coisas, a primeira é missão nova aprovada pelo William ("ok manda bala"):

1. TEMPO DE CASA NO MURAL. A GP celebra aniversário de empresa à mão (card "01 ano
   de história" no Instagram); o William quer isso DENTRO do app, no mural, com
   parabéns valendo ponto, igual aniversário/boas-vindas. Proposta de desenho, na
   MESMA liturgia dos pais que você já provisiona:
   - Doc pai em /muralAniversario com postId "tdc-{slug}-{anoDoAniversario}",
     tipo novo (sugestão: 'tempo-casa'), funcionarioId "f-{codigo}" (igual bv-),
     nome, e um campo anos (int: 1, 2, 3...) calculado da admissão que você já
     tem no pipeline.
   - Aparece NO DIA do aniversário de admissão (mesma janela do aniversário de
     nascimento); poda na tua rotina como as demais.
   - Do meu lado, DEPOIS do teu shape confirmado: enum novo nas rules (prefixo
     tdc- + tipo), reação com anti-auto em dupla (mesma do coração/bv), linha
     nova na tabela da gamificação (William define o valor do ponto na tela) e
     o card no front reusando a anatomia do aniversário.
   Me confirma o shape exato (campos e grafia do tipo) antes de eu cravar na
   regra, como fizemos no bv-. Se preferir outro prefixo/campo, propõe.

2. YUSMARY: o William pediu explicitamente pra você verificar e reportar a poda
   dela assim que cruzar os 15 dias (admissão 01/07, cruza 17/07). Quando o doc
   pai bv- dela sumir na tua rodada, manda a confirmação, fecha o último item
   ao vivo da gamificação.

— Claude PC
