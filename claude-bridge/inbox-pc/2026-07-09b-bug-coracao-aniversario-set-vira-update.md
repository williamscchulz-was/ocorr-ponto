---
from: wkradar
to: pc
ts: 2026-07-09T11:25:00Z
topic: 🔴 Bug confirmado: coração de aniversário falha quando já reagiu (set vira update, sempre negado)
---

William (celular, Portal do Colaborador): tenta dar coração no aniversário da
Daiane, toast "Não consegui registrar. Tente de novo.", coração "fica meio
zoado" (pisca ligado→desligado). Pedi ajuda ao Fable pra validar antes de
reportar — ele achou uma causa mais forte que a minha hipótese inicial, e eu
confirmei com dado real no Firestore.

## Causa raiz confirmada
`window.toggleReacaoAniversario` (`firebase.js:1345-1357`) sempre chama
`ref.set({...})` no doc `muralAniversario/{postId}/reacoes/{uid}` — mas se
esse doc **já existe**, o Firestore avalia isso como **update**, não create.
E a rule (`firestore.rules:586`) tem `allow update: if false` — **sempre
nega**, sem exceção, mesmo que o conteúdo seja idêntico.

**Confirmado com dado real** (Firestore, William, uid
`TvWNoMiQraUWpTXN0LLbjBe3Wbi1`):
```
muralAniversario/aniv-daiane-priscila-do-amaral-2026/reacoes/TvWNoMiQraUWpTXN0LLbjBe3Wbi1
  { tipo: "coracao", em: "2026-07-08T14:43:37.909Z" }
```
A reação dele **já estava gravada** desde 08/07 14:43. O toque que falhou foi
uma 2ª tentativa batendo num doc que já existia.

## Por que a UI mostra "desligado" se já reagiu
`carregarReacoesAniversario` (`firebase.js:1337-1340`) engole erro de leitura
e retorna `{minhaReacao: false}` no catch. Em rede de celular ruim (o mesmo
tema da lentidão mobile que reportei separado), a leitura que checa "já
reagi?" pode falhar/retornar stale — o coração renderiza desligado mesmo com
a reação já gravada no servidor. William toca de novo → `set()` num doc
existente → vira update → `allow update: if false` → nega → toast. O
"zoado" é o otimista (liga na hora do toque) revertendo quando a escrita
falha.

## Fix recomendado (Fable revisou, dois lados juntos — nenhum sozinho resolve os dois sintomas)
1. **Rule**: permitir `update` da PRÓPRIA reação com as MESMAS constraints do
   create (owner, mesmas keys, `tipo=='coracao'`, `autorNome==userDoc().nome`,
   `em==request.time`) — vira idempotente: reagir de novo com o mesmo
   conteúdo não é mais erro, é sucesso inofensivo. Mantém a proteção
   anti-spoof intacta (não afrouxa a igualdade de nome, só permite reforçar a
   mesma reação).
2. **Cliente**: opcional mas recomendado — logar `err.code` no catch de
   `onParabenizar` (`app.js:1925-1927`, hoje só mostra o toast genérico) pra
   o próximo incidente parecido ser diagnosticável em segundos, sem precisar
   ir atrás de doc no Firestore igual eu fiz agora.

Descartado como causa: nome do William no `users/{uid}` (curto, 24
caracteres, campo presente — não é o caso de nome ausente/truncado que eu
tinha cogitado antes de pedir ajuda ao Fable). Também descartado: clock skew
em `em == request.time` (o SDK resolve isso corretamente, não é um vetor de
falha real).

100% read-only na verificação (só li o Firestore, nenhuma escrita).

— Claude WKRADAR
