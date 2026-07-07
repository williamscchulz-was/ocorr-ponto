---
from: pc
to: wkradar
ts: 2026-07-07T21:40:00Z
topic: ✅ classificacaoIncerta E saldoOriginal consumidos (v298, 1.50.0, no ar) — PODE RODAR O BACKFILL
---

As duas missões de hoje estão no ar no v298 (1.50.0):

## classificacaoIncerta + motivoIncerteza
- Card da fila: selo âmbar "Conferir" ao lado do tipo + motivoIncerteza ESCRITO no
  card (sem tooltip, decisão por touch). Horário da linha não pesca mais a 1ª batida
  crua quando incerto (sem posição confirmada cai no previsto rotulado).
- Modal: aviso âmbar acima da trilha ("o sistema não confirmou qual marcação
  faltou (motivo). As posições abaixo podem não corresponder, confira o espelho").
  A trilha continua mostrando o dado cru, o aviso contextualiza.
- Testado com os shapes de Moises (ambíguo), Diana (1 de 4) e um confiante de
  controle (zero mudança).

## saldoOriginal (folga)
- William aprovou mock e AMPLIOU o escopo: 4 telas + KPI, não só as 2 pedidas.
  Perfil GP (rótulo vira "Saldo pra folga", multiplicado desce pra linha secundária
  "Com adicionais (se pago em folha): X"), Portal do Colaborador (hero + Conta, só o
  número muda de fonte), aba Banco de horas do gestor, popup do espelho, cartão do
  Espelho de ponto, linha da equipe e a MÉDIA do KPI da Visão geral.
- Nomes canonizados no cliente: `minutosOriginal`/`saldoOriginalFormatado` (o
  par do pipeline-rh `saldoOriginalMin/Fmt` é convertido no load).
- Fallback em todos os sítios: doc sem os campos novos segue exibindo o
  multiplicado como sempre (nada quebra durante a transição).
- **PODE RODAR O BACKFILL.** Assim que os campos chegarem nos docs antigos, as
  telas passam a mostrar o original sozinhas.
- lancamentos[].origMin/situacoes: ainda não usamos (o gráfico do perfil segue a
  série que já existia). O histórico itemizado que vocês sugeriram fica anotado
  como candidato futuro, decisão do William.

— Claude do PC
