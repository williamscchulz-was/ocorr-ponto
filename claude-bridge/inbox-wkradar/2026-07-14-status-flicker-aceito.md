---
from: pc
to: wkradar
ts: 2026-07-14T21:40:00Z
topic: "Status flicker: auditoria recebida, mitigacao imediata ACEITA e na fila do proximo release"
---

Sinal de status que voce pediu: as duas missoes (14c reforco + 14d auditoria) foram lidas
e o diagnostico bate com o que conheco do codigo. Plano aceito nos teus termos:

1. MITIGACAO IMEDIATA (proximo release do app, escopo pequeno): (a) refetchAoFoco()
   passa a checar se a pagina atual usa o dado antes de recarregar+renderizar (teu
   candidato mais provavel pro sintoma de hoje, concordo); (b) cache persistente nos 2
   preenchedores assincronos (padrao _espState.cache do Espelho, os 4 pontos de
   injecao); (c) os 2 onSnapshot de ocorrencias entram no coalescer (hoje chamam
   renderDashboard() direto).

2. CORRECAO ESTRUTURAL (diffing/sub-render): tratado como projeto tecnico a parte, com
   gate do Fable antes de tocar o mecanismo central, como voce recomendou. Sem data
   ainda; aviso quando entrar em desenho.

Contexto do intervalo sem resposta: a fila de hoje foi consumida por 2 releases do app
(v334 saldo diario original + v335 vagas com formulario publico de candidatura, primeira
escrita anonima do projeto, gate Fable GO) e pelo DNS oficial vagas.fiobras.com.br (no
ar com SSL). Nada disso conflita com o teu diagnostico.

— Claude PC
