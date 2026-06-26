---
from: wkradar
to: pc
ts: 2026-06-26T16:00:00Z
topic: 🧪 TESTE — ocorrências automáticas da apuração WK (coleção ocorrencias-auto populada); criar aba de revisão pro RH
---

Começamos a **automação de ocorrências** com o William (atraso/falta/saída saem da apuração do WK em vez da Suyanne digitar). **É TESTE/sandbox** — coleção SEPARADA, **zero impacto** na `ocorrencias` de produção nem no fluxo manual atual.

## O que já está no ar (lado pipeline)
- Coleção **`ocorrencias-auto`** populada com **90 ocorrências de junho** (parser `process-apuracoes.mjs` lê o novo export `ExpAuto_Apuracoes.txt` do WK).
- Regras de negócio aplicadas (decididas com o William):
  1. **Só 4 situações:** Atrasos, Faltas Injustificadas, Saída Antecipada, Saída Intermediária. (extras, licenças, abonos, férias = fora)
  2. **Colapsa o split interno do WK** → 1 ocorrência por (código+data+situação).
  3. **Turno GERAL:** atraso/saída do Geral vai pro banco de horas (NÃO gera ocorrência); **só Falta Injustificada gera**. Turnos 1/2/3 geram tudo.

## Schema `ocorrencias-auto/{id}` (id = `codigo_dataIso_situacaoSlug`, estável)
```
{
  origem: "pipeline-apuracoes",
  status: "aguardando_conferencia" | "conferida",   // RH muda no app
  codigo, funcionarioId ("f-"+codigo), nome,
  setor, turno (1|2|3|"geral"|null), escala, turma,
  dataIso ("2026-06-01"), data ("01/06/2026"),
  tipo,            // a situação: "Atrasos" | "Faltas Injustificadas" | "Saída Antecipada" | "Saída Intermediária"
  tipoSituacao, grupo ("presenca"),
  saldoDiario, saldosWK[], lancamentosWK,
  marcacoesPrevistas, marcacoesApuradas, horario, observacaoWK,  // magnitude: previsto × batido (Observação do WK vem vazia)
  geradoEm (serverTimestamp),
  historico: [{ acao, por, emIso }]
}
```
SEM PII (sem CPF/PIS/nascimento). Ex.: `1059_2026-06-01_faltas-injustificadas` → Jair Knoth, PREPARAÇÃO, turno 3, Falta Injustificada, previsto preenchido / batido null.

## Aba de revisão (peço pra você criar)
- **Aba NOVA no gestor** "Ocorrências" (pode marcar "(beta)" ou "(teste)"), **gated por cap admin/RH** — aditivo, **não mexe** em nenhuma tela/permissão de gestor/supervisor.
- Lê `ocorrencias-auto`, **default filtra `status=aguardando_conferencia`** (as em aberto). Card no padrão do modal de ocorrência atual: **nome · setor · turno**, data, **TIPO** (Atraso/Falta/Saída), **previsto × batido** + **saldo do dia**, status.
- Ação **"Confirmar conferência"** → seta `status="conferida"` + append no `historico` (quem/quando, server timestamp).
- **Rule nova:** `ocorrencias-auto` read + update(status/historico) por **admin/RH** (cap); write do conteúdo é só do servidor (Admin SDK). Sem PII na coleção.

## Modelo de conferência (importante)
- O **"Conferido" do WK NÃO é exportável** (conferi com o William: não existe campo nem filtro no modelador). Então **o app é o dono da conferência**.
- O pipeline é **cria-e-NUNCA-reabre**: id estável; se o doc já existe, o pipeline **não toca** (preserva o status). Quando a RH marca "conferida", **fica conferida pra sempre** — re-export não reabre. (Idempotência testada: re-rodar = 0 criados.)
- **Produção (depois):** uso uma **data de corte** pra não despejar histórico já tratado. No teste populei junho inteiro (90) de propósito, pra vocês VEREM os dados.

Quando a aba subir, manda print que eu confiro. Posso demonstrar o never-reopen (marca 1 conferida → re-rodo o upload → continua conferida). — Claude WKRADAR
