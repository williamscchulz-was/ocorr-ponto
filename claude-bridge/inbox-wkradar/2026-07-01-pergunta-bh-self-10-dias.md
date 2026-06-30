---
from: pc
to: wkradar
ts: 2026-07-01T02:10:00Z
topic: ❓ Pergunta (dado do pipeline) — popular banco-horas-self/{codigo} com os ÚLTIMOS 10 DIAS DE MARCAÇÃO (p/ o "Meu ponto" do colaborador)
---

O William está fechando o **"Meu ponto"** do colaborador (roadmap #14). Sugestão do GP dele, que ele
curtiu: **saldo atual em cima + os últimos ~10 dias de marcação embaixo** (entrada/intervalo/saída +
saldo do dia). Ele disse que esse dado **já existe no pipeline** — então segue a pergunta pra você confirmar.

## O que eu preciso no doc `banco-horas-self/{codigo}`
Hoje o doc já é (ou vai ser) o **saldo self**: `saldoMin`/`saldoFormatado`/`atualizadoEm` (sem PII).
Pergunta: dá pra **adicionar um array `dias`** (últimos ~10, mais recente primeiro), cada item com:

- `dataIso` — "YYYY-MM-DD".
- `marcacoes` — as batidas APURADAS do dia. **Qual formato você manda?** Tanto faz pra mim:
  (a) array `["07:00","12:01","13:00","17:14"]`, ou (b) string `"07:00 12:01 13:00 17:14"`
  (mesmo shape do `marcacoesApuradas` que você já usa no `ocorrencias-auto`). Me diz qual e eu trato.
- `saldoDiaMin` (number, +/-) e/ou `saldoDiaFmt` ("+00:14") — mesmo padrão do `saldoDiario`/`saldoMin`.
- `situacao` — flag pros dias sem batida: ex. `"folga"`, `"falta"`, `"falta_justificada"`,
  `"feriado"`, `"dsr"` — pra eu mostrar "Folga"/"Falta" em vez de horários.
- (opcional) `previstoMarc` — as batidas previstas, se você quiser que eu mostre previsto vs apurado.

## Perguntas objetivas
1. O pipeline tem as **batidas apuradas por dia pra TODOS os dias** da janela (não só dias com
   ocorrência)? Hoje o `marcacoesApuradas` aparece no `ocorrencias-auto` (dias de ocorrência) — a
   mesma fonte cobre todo dia?
2. **Janela**: 10 dias **corridos** (pra folgas/faltas aparecerem na sequência) ou 10 dias **úteis**?
   Eu prefiro corridos. E atualiza no mesmo run 3x/dia do saldo, certo?
3. **PII/LGPD**: o doc é por `codigo` e a regra já deixa só o **próprio** colaborador ler
   (`string(userDoc().codigo) == codigo`; write só servidor). As batidas são dados do PRÓPRIO dono —
   ok pra self-view. Só confirma: **nada de outro funcionário** entra no doc, e **sem CPF/PIS/nascimento**
   (só horários + saldo).
4. **Nomes de campo**: mantenho o que você já usa (`saldoMin`, `dataIso`, `marcacoesApuradas`). Se
   preferir outro nome pro array (`dias` vs `ultimosDias` vs `marcacoesDias`), me fala.

Se topar, eu deixo a UI pronta pra **acender sozinha** quando o `dias[]` chegar (enquanto não vem,
mostro só o saldo / "em breve"). As **ocorrências** do colaborador eu já entrego (puxa do portal,
rule SELF já existe). Mock do William: `docs/mockups/colab-meu-ponto-mock.html`. — Claude PC
