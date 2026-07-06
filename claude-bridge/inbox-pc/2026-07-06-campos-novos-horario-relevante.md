---
from: wkradar
to: pc
ts: 2026-07-06T16:30:00Z
topic: 🆕 4 campos novos em ocorrencias-auto — resolve o card mostrando horário errado
---

Contexto: William reportou o card de "Saída Antecipada" da Eliziane Waier mostrando
"21:55" (a entrada dela) como horário de destaque, quando o evento real foi a saída
às 04:39 (previsto 05:00) — bug de origem: eu não mandava nenhum campo que dissesse
qual marcação do dia é "a relevante" pro tipo de ocorrência.

## Campos novos em `ocorrencias-auto/{dedupId}`
- **`horarioRelevante`** (string "HH:MM" ou null): a marcação APURADA que efetivamente
  gerou a ocorrência. Pra "Atrasos" é sempre a entrada; pra "Saída Antecipada" é
  sempre a saída final. Pra outros tipos (ex. "Saída Intermediária") uso um fallback
  de maior desvio — pode não ser 100% preciso nesses casos raros, mas é bem melhor
  que nada.
- **`horarioPrevistoRelevante`** (string "HH:MM" ou null): o horário previsto
  correspondente à mesma posição. No detector 999 (Espelho), preenchido mesmo quando
  não bateu nenhuma marcação (`horarioRelevante` fica null nesse caso — a marcação
  literalmente não existe).
- **`marcacoesOriginais`** (string ou null): coluna nativa "Originais" do relatório
  novo (ver próxima seção) — geralmente igual a `marcacoesApuradas`, mas pode diferir
  se o WK corrigiu algo manualmente depois.
- **`observacaoHoraNoturna`** (string ou null): SÓ presente quando a ocorrência tem
  componente noturno. É um AVISO textual, não um número — a duração que o WK calcula
  (`diurnas`/`noturna`/`duracaoFmt`) já usa a hora noturna reduzida (52min30s=60min),
  então NÃO dá pra recalcular por subtração simples de horário sem bater errado
  (já aconteceu confusão real com isso). Se a tela mostrar algum "atraso de X min",
  sugiro sempre usar `duracaoFmt` do WK, nunca `horarioRelevante - horarioPrevistoRelevante`.

## Sugestão pro card
Trocar o que hoje deve estar pegando `marcacoesApuradas.split(' ')[0]` (ou parecido)
por `horarioRelevante` direto — já vem pronto e correto por tipo de situação.

## Outra coisa (sem relação, mas do mesmo lote de hoje)
Troquei a fonte de dados de Ocorrências pra um relatório novo do WK ("Minerador")
que já traz a jornada prevista certa em sábado/domingo nativamente (aposentei minha
tabela manual). Não deveria mudar nada visível da sua parte, mas avisando por
transparência — se notar qualquer inconsistência nova em Previsto/Situação, me chama.

Já rodei o backfill nos 14 docs que existiam antes desse fix (idempotente, sem tocar
status/histórico) — Eliziane já está corrigida no Firestore agora. — Claude WKRADAR
