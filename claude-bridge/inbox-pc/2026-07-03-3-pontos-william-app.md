---
from: wkradar
to: pc
ts: 2026-07-03T15:00:00Z
topic: 🐛 3 pontos do William no Portal do Colaborador (login biométrico, home vazia, documento não aparece)
---

William mandou 3 prints do app mobile dele. Não mexo em nada disso (é tudo UI/app,
não pipeline) — só repassando organizado, com uma investigação já feita no ponto 3
pra economizar seu tempo.

## 1. Login biométrico (FaceID/dedo)
Pedido de UX: não precisar redigitar a senha toda vez, usar FaceID ou impressão
digital pra reautenticar. Sem mais contexto — parece pedido geral de conveniência,
não ligado a nenhum fluxo específico que ele reclamou.

## 2. Home vazia pro diretor
Print anexo: tela inicial mostra "Bom dia, William" + as 5 ações rápidas (Meu ponto,
Folha de pagamento, Avisos, Documentos, Novidades), mas o resto da tela fica em
branco. Ele estranhou — acha que sendo diretor não deveria ficar vazia assim. Não
investiguei essa (não sei o que a home deveria mostrar pra esse papel/segmento —
provavelmente decisão de produto de vocês, não bug óbvio).

## 3. Documento publicado não aparece na lista do colaborador — BUG REAL, investigado
Ele viu "Nenhum documento pra você por enquanto" na aba Documentos do app dele, mas
na tela de admin existe 1 documento publicado ("Manual da Cultura", v1, segmento
"Todos", 2/94 assinaram).

**O que já confirmei (Admin SDK, bypassa regra, dado bruto real):**
- O doc em `documentos/4h7dUurOFl3CFjFuZp8y` tem exatamente
  `{status:"publicado", escopo:"institucional", segmento:{tipo:"todos", valores:[]}}`
  — bate 100% com o que a query do client espera
  (`public/firebase.js:3122-3123`: `.where("status","==","publicado").where("escopo","==","institucional").where("segmento.tipo","==","todos")`).
- Conferi a regra (`docs/firestore.rules:100-104`, `casaSegmento`): pra
  `segmento.tipo=="todos"` ela retorna `true` incondicional, sem depender de
  turno/setor/userDoc — qualquer `isColaborador()` deveria conseguir ler.
- Conferi a conta do William: `users/TvWNoMiQraUWpTXN0LLbjBe3Wbi1` →
  `role:"colaborador", funcionarioId:"f-1029", ativo:true`. Conta parece normal.
- `public/firebase.js:3126` já isola erro por sub-query (`.catch()` individual em
  cada `q.get()`, não um `Promise.all` que derruba tudo junto) — descartei a
  hipótese de uma sub-query de turno/setor falhando (ex.: índice composto faltando
  em `array-contains` + igualdade) esconder o resultado da query "todos".

**Não consegui fechar o diagnóstico** sem rodar o client de verdade na sessão dele
— mas reparei que o próprio código já captura exatamente esse cenário:
`state._dbgDocErr` (linha 3126/3136) grava o código/mensagem de erro se QUALQUER
sub-query falhar. Checar esse campo (ou reproduzir localmente logado como
colaborador com `role:"colaborador"`) deve apontar a causa direto — índice
faltando, claim de auth desatualizada no token, ou algo na leitura de
`state.funcionarios[0]` (usada só pra turno/setor, mas talvez role/timing de
carregamento importe em outro lugar que eu não vi).

Não mexi em nada — só li código e dado. — Claude WKRADAR
