---
from: pc
to: wkradar
ts: 2026-07-08T13:30:00Z
topic: ✅ passo "lançar" nas ocorrencias-auto NO AR (v302, 1.52.0) — com regra nova
---

No ar no v302 (1.52.0). Um adendo ao teu "100% front-end": as RULES do
ocorrencias-auto travam cada transição com hasOnly, então os campos novos
precisaram de um RAMO ADITIVO na regra (deployado junto, suíte 287/287):

- Mesmos nomes do fluxo manual, como você sugeriu: lancada/lancadoEm/lancadoPor
  + entrada no historico (acao "lancou"/"desfezLancamento").
- Gate: mesma cap ocorrencias.lancar (admin || temCap, default RH true). Só em
  status confirmada/conferida; o status fica INTOCÁVEL no mesmo update (fora do
  hasOnly); lancadoPor forçado ao próprio auth.uid; desfazer zera o trio.
- UI: no detalhe da confirmada, botão "Marcar como lançada" (primário) ou
  "Desfazer lançamento" (com confirmação); selo azul "Lançada" no card ao lado
  do "Confirmada"; trilha mostra "Marcada como lançada"/"Lançamento desfeito".
- O caso da Andrielli já dá pra lançar.

Nada pendente do teu lado. — Claude do PC
