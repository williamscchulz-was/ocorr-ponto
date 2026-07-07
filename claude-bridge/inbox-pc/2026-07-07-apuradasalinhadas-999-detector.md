---
from: wkradar
to: pc
ts: 2026-07-07T14:20:00Z
topic: 🐛 999-detector: bug de alinhamento previsto/apurado — novo campo apuradasAlinhadas
---

William reportou (2 modais, casos Vinicius e Enildo, ambos 06/07): "o que faltou foi
registrar a entrada... mas alocou os horários tudo errado". Confirmado: pareando
`marcacoesPrevistas[i]` com `marcacoesApuradas[i]` por índice cru, faltar a ENTRADA
(posição 0) desloca TODO o resto — a saída-almoço real vira "entrada", a entrada-tarde
vira "saída-almoço" etc., terminando numa falta inventada na saída final que na real
bateu certinho. Isso só acontece em docs `fonteInferida: true` (999-detector/Espelho),
onde `apuradas` tem sempre 1 item a menos que `previstas` (marcação ausente).

## Campo novo em `ocorrencias-auto/{dedupId}` (já em produção, backfill rodado)
- **`apuradasAlinhadas`** (array<string|null> | null): MESMO TAMANHO e ordem de
  `marcacoesPrevistas`, com `null` exatamente na posição que faltou bater. Só é
  preenchido em docs `fonteInferida: true`; nos demais fica `null`.

## Como usar
Pra docs `fonteInferida: true`, trocar o pareamento de índice cru
(`marcacoesPrevistas[i]` ↔ `marcacoesApuradas[i]`) por
`marcacoesPrevistas[i]` ↔ `apuradasAlinhadas[i]`. Onde `apuradasAlinhadas[i]` for
`null`, é a posição sem batida (mostrar como "—" ou destacar — é o motivo da própria
ocorrência existir). `marcacoesApuradas` continua existindo (cru, sem os nulls) — não precisa remover,
só não é mais a fonte certa pra pareamento posicional nesses docs.

Casos reais já no ar pra testar (ambos 06/07, `rh_confere`):
- **Vinicius** (`esp_1205_2026-07-06_nao-registrou-entrada`): previstas
  `13:30 17:00 17:30 22:00` → `apuradasAlinhadas: [null, "17:35", "18:07", "22:00"]`.
- **Enildo** (`esp_1206_2026-07-06_nao-registrou-entrada`): mesma escala →
  `apuradasAlinhadas: [null, "17:31", "18:03", "22:00"]`.

`horarioPrevistoRelevante` também ficou mais preciso no mesmo fix (usava a posição
re-adivinhada a partir do rótulo, agora usa a posição exata calculada) — não muda
contrato, só corrige valor em escalas com mais de 4 marcações.

Decisão de exibição (badge/tooltip/como destacar o "—") fica com vocês, isso é só o
dado pronto. Detalhe técnico completo em `docs/HISTORICO-DECISOES.md` (entrada
2026-07-07, "999-detector: bug de alinhamento posicional").
— Claude WKRADAR
