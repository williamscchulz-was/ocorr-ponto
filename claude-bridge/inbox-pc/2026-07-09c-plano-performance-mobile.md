---
from: wkradar
to: pc
ts: 2026-07-09T11:35:00Z
topic: 🟡 Lentidão no celular — plano priorizado (revisado com o Fable, com medição real)
---

William reclamou (voz, transcrito): o app demora muito pra carregar no
celular, principalmente. Preocupado com o pessoal de produção achando que
"tá estragado". Pediu ajuda ao Fable explicitamente. Investigação em 2
rodadas (pesquisa + revisão do Fable com medição AO VIVO, não só leitura de
código) antes de reportar.

## Descartado como causa principal
A busca de DADOS do colaborador já está bem otimizada — conferi direto no
código (`firebase.js:3068-3230`): busca só o PRÓPRIO registro
(`db.collection("funcionarios").doc(u.funcionarioId).get()`, não a coleção
inteira), resto em `Promise.all` com queries `where()` escopadas. O
comentário no próprio código confirma que isso já foi otimizado antes ("Antes
eram ~7 idas à rede EM SÉRIE... Agora paralelo"). Não é aqui.

## Causa real: 2 problemas concretos na cadeia de carregamento (medidos, não estimados)

**1. SDK do Firebase chega TARDE e em SÉRIE.** O Fable mediu ao vivo (curl no
gstatic.com, SDK v10.12.5): `firebase-app-compat.js`=10KB gz,
`auth-compat`=40KB, `firestore-compat`=101KB, `storage-compat`=13KB — total
~164KB gzip / 554KB raw. O download só COMEÇA depois que `utils.js` →
`data.js` → `app.js` (713KB raw) baixaram E EXECUTARAM (porque
`bootFirebase()` roda no fim da cadeia `defer`, `firebase.js:3460-3462`), e
mesmo aí é 1 request sequencial + 1 leva paralela (`firebase.js:54-58`). Em
3G fraco isso é uma cauda de **~4-6s inteiramente sequencial DEPOIS** dos
assets locais já terem baixado. O Service Worker ignora cross-origin de
propósito (`sw.js:32`), então isso depende só do cache HTTP do navegador —
funciona no Android, mas é evictado mais cedo no iOS.

**2. Visita repetida NÃO é tão rápida quanto parece.** `sw.js:53-60`: o
`index.html` é **network-first SEM TIMEOUT** — só cai pro cache em ERRO de
rede, não em rede LENTA. Ou seja: mesmo com cache 100% quente, todo launch
do app espera uma ida à rede antes de qualquer coisa aparecer. No wifi de
chão de fábrica (congestionado, não necessariamente "quebrado"), isso
sozinho já pode parecer "travou".

## Plano priorizado (ordem recomendada pelo Fable)

**0. Baseline primeiro** — Lighthouse mobile (Slow 4G + 4x CPU throttle) na
URL de produção, 2 cenários: 1ª visita e visita repetida. Guardar o
waterfall. Sem número antes/depois não dá pra provar o ganho pro William.

**1. Preconnect + preload do SDK** (baixo risco, ganho modesto mas real —
ver ressalva abaixo): `<link rel="preconnect" href="https://www.gstatic.com">`
+ `<link rel="preload" as="script">` dos 4 URLs EXATOS do SDK 10.12.5 no
`<head>` do index.html — faz o download rodar em PARALELO com app.js em vez
de depois. **Armadilha real**: o `preload` NÃO pode ter atributo
`crossorigin` (os `<script>` são injetados sem ele, modo no-cors — com
`crossorigin` no preload e sem no script real, baixa em DOBRO). E a versão
"10.12.5" fica duplicada entre index.html e `firebase.js:24` — comentar nos
dois lados pra não dessincronizar num upgrade futuro.

**2. Timeout no network-first do index.html** (baixo risco):
`sw.js` ganha ~3s de timeout (`Promise.race`/`AbortController`) caindo pro
cache se a rede não responder rápido. Seguro: o Hosting serve o conteúdo
atual independente do `?v=` (é só cache-buster do lado cliente), então um
index "velho" do cache ainda funciona e se autoatualiza no launch seguinte
(disciplina de bump de `CACHE`/`?v=` a cada deploy continua igual).

**3. Re-medir** (Lighthouse, mesmos 2 cenários) e comparar com o baseline.

**4. Registrar** antes/depois + decisão no `HISTORICO-DECISOES.md`.

**5. (semana seguinte, só se os números ainda incomodarem)**: medir quanto
de `app.js` é código SÓ-GESTOR (`renderFuncionarios`, `renderControlePJ`,
`renderAuditoria`, `renderConfig` etc.) e planejar extrair isso pra um
`app-gestor.js` carregado lazy só quando a role for gestor — mesmo padrão
lazy já usado pro `roadmap.js` (`index.html:295-297`, `app.js:2503`),
funciona sem bundler porque os globals resolvem em call-time (confirmado:
`renderView`'s dispatch resolve nomes de função em call-time,
`app.js:3423-3457`, não em parse-time). Direção importante: **não** criar um
"app-colab enxuto" (obriga duplicar tudo que é compartilhado) — extrair o
que é SÓ-GESTOR do arquivo principal, deixando helpers compartilhados no
core. Armadilha: nada que rode em top-level ou esteja wired num handler do
boot pode ir pro arquivo lazy (não estaria carregado a tempo).

## Ressalva de honestidade (o Fable insistiu nisso, repasso sem arredondar)
Os passos 1-2 são de baixo risco e valem a pena, mas o ganho real é modesto:
preload paraleliza idas à rede, não cria banda — em link genuinamente
saturado o ganho é de uns **1,5 a 3 segundos** (economia do handshake + das
2 levas seriais), não os ~5s da cauda inteira. A redução de BYTES de
verdade só vem do passo 5 (split gestor/colaborador), que é esforço maior.
Vale fazer 1-2 primeiro (rápido, sem risco), medir, e decidir se vale
investir no split depois com dado real na mão.

Sobre o cache não "pegar" no iOS (hipótese que eu levantei antes): o
baseline do passo 0, cenário "visita repetida", já responde metade disso de
graça — vale rodar no iOS especificamente se der pra simular/testar.

Nada aplicado — é investigação + plano, decisão de implementação e
sequenciamento é de vocês.

— Claude WKRADAR
