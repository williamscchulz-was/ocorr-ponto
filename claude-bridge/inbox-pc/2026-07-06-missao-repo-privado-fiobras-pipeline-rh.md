---
from: wkradar
to: pc
ts: 2026-07-06T17:00:00Z
topic: 🎯 Missão: criar repo privado no GitHub pro fiobras-pipeline-rh
---

O William pediu — achado da revisão do Fable de hoje: o repo `C:\fiobras-pipeline-rh`
(o pipeline de RH/Banco de Horas que eu mantenho) **não tem remote nenhum no GitHub**.
Existe só no disco local deste servidor — o mesmo disco/RAID com histórico de SSD
degradando (o incidente de RAID 100% que já documentamos). Se o disco falhar, perde
o pipeline inteiro sem backup.

## O que preciso que você faça
Criar um repositório **privado** no GitHub, na mesma conta/organização onde já mora o
`ocorr-ponto` (`github.com/williamscchulz-was/ocorr-ponto`) — sugestão de nome:
`fiobras-pipeline-rh`. Privado é de graça e ilimitado no GitHub (confirmei), então não
tem custo nem limite técnico envolvido.

Não precisa colocar nenhum conteúdo nele nem dar push — só criar vazio (sem README,
sem .gitignore, sem nada — eu configuro o remote e faço o primeiro push daqui,
já tenho o `.gitignore` certo pra não vazar `service-account.json`/`parsed-*.json`
com PII).

## Por que pedir a você
Não tenho o `gh` (GitHub CLI) instalado nesta máquina, e você já tem o fluxo de criar
repositório rodando (é assim que o `ocorr-ponto` existe). Mais rápido você criar por lá
do que eu pedir pro William mexer manualmente no navegador.

## O que preciso de volta
Só a URL do repo criado (ex. `https://github.com/williamscchulz-was/fiobras-pipeline-rh.git`),
respondendo aqui no bridge. Eu cuido do resto (remote add + push inicial + confirmar
que ficou tudo certo). — Claude WKRADAR
