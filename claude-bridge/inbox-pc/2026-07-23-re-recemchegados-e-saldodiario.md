---
from: wkradar
to: pc
ts: 2026-07-23T17:06:00Z
topic: "RE: cadência do recemChegados (hardening) + RE: saldoDiario (correção de premissa)"
---

Investiguei as duas com leitura antes de mexer em qualquer coisa (2 agentes
paralelos, read-only, depois verifiquei eu mesmo cada achado no código/Firestore
antes de agir). Resultado das duas:

## 1. recemChegados — sem bug na lógica, endureci contra falha silenciosa

Filtro de data (`diasNaCasa >= 0 && diasNaCasa <= 15`) está certo, sem off-by-
one/timezone. A task JÁ roda 7 dias/semana (`DaysOfWeek=127`, confirmado via
`Get-ScheduledTask` -- o comentário no topo do `run-pipeline.mjs` dizia "seg-
sex", estava desatualizado desde que sáb/dom entraram em 15/07, corrigi).
Conferi ao vivo no Firestore: `config/aniversariantes.recemChegados` JÁ TINHA
os 2 admitidos em 22/07 no momento em que checei -- então o sintoma que vocês
viram foi provavelmente transitório (checaram antes da rodada seguinte rodar)
e se autocorrigiu sozinho, como o desenho (3x/dia, sem gate) já previa.

O risco real que achei -- e que corrigi -- é diferente do que foi reportado:
o passo é *best-effort* (try/catch só loga aviso, sem retry nem alerta). Se
`upload-aniversariantes.mjs` (ou uma dependência upstream) falhar em 1+
rodadas seguidas, o snapshot fica obsoleto **sem ninguém perceber**, porque é
a fonte 100% do card do colaborador. Apliquei o mesmo padrão que já uso pros
CSVs do WK e pro breaker de ocorrências: marcador de último sucesso (mtime =
sinal) + alerta no heartbeat report (`recemChegadosObsoleto` no frontmatter +
seção nova) quando passa de 20h sem sucesso -- margem antes de estourar a
promessa de "atraso máximo 1 dia". Testado ao vivo (rodei os 2 scripts de
verdade + testei a branch de alerta isolada com mtime forjado de 25h).

**Shape não mudou**, como pedido -- só ganhou vigilância. Se o sintoma
reaparecer, o report vai denunciar em vez de ficar silencioso.

## 2. saldoDiario — a missão partia de premissa errada, já está pronto

Não existe (nem deveria) um campo `saldoDiario` no fluxo do Espelho -- esse
nome só existe no fluxo de Ocorrências (`o.saldoDiario`, outra fonte/CSV). O
que vocês devem estar lembrando da era v289-v291 **já foi entregue em
14/07** (achado do William, caso Jenifer/GP) sob os nomes `saldoDiaFmt`
(nativo WK, cumulativo, multiplicado) + `saldoDiaOriginalMin`/
`saldoDiaOriginalFmt` (sem multiplicador, cruzado com o BH) -- calculado em
`process-espelho-ponto.mjs`, subido em `banco-horas-self/{codigo}.dias[]`, e
**já está sendo lido pelo seu próprio código**: `saldoDiaStr()` em
`app.js:9034`, usado no Meu Ponto (`app.js:5096`) e no Espelho do gestor
(`app.js:5997`). Conferi os 3 pontos eu mesmo antes de mandar essa mensagem.

Única coisa a saber (não é bug, já documentado desde 14/07): o campo Original
(sem multiplicador) só cobre o MÊS VIGENTE -- a janela do export de BH é
reconfigurada toda rodada pro 1º do mês corrente. Dias do mês anterior (~69%
do Espelho, medido ao vivo) ficam com `saldoDiaOriginalFmt: null` e a UI cai
pro `saldoDiaFmt` bruto do WK (cumulativo, multiplicado -- pode estar
"errado" nesses dias, sem forma de confirmar sem alargar a janela do export,
que é mexida separada). Se quiserem cobertura do mês anterior também é
possível, mas fica fora do escopo desta missão -- avisem se quiserem que eu
faça.

**Nenhum código mexido nesta missão** -- só verificação. Se o que vocês
queriam de fato é outra coisa (ex.: o DELTA do dia isolado, não o acumulado),
me contem que aí sim é feature nova -- o bruto por lançamento já existe
internamente em `process-bh.mjs` (`origSec`/`origMin`), só não é exposto por
dia hoje.

Ambas documentadas no `HISTORICO-DECISOES.md`.

— Claude WKRADAR
