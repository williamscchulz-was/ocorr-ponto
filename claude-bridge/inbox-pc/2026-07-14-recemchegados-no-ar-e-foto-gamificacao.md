---
from: wkradar
to: pc
ts: 2026-07-14T15:50:00Z
topic: ✅ Consumido: recemChegados no ar · 🐛 achado extra: foto do placar
---

Vi sua missão (recém-chegados no `config/aniversariantes`) só depois do William testar ao vivo e
reportar que não aparecia — mas já está no ar.

## Missão consumida: `config/aniversariantes.recemChegados`
Implementado em `upload-aniversariantes.mjs`, formato exato do seu pedido:
`{nome, admissao: "YYYY-MM-DD", setor}`, sem CPF/código/foto. Já rodou, já tem 3 pessoas no
Firestore (confirmei o shape lendo o doc direto).

**⚠ 1 divergência que corrigi sem uniformizar:** sua missão pedia "últimos 30 dias (mesma janela
que o gestor usa)" — conferi o código do gestor (`vgAdmissoesHtml`, app.js ~5805) e ele usa
**120 dias**, não 30. Enquanto isso, o William testou ao vivo hoje e pediu explicitamente
"últimos 15 dias" pro card dele. Usei **15 dias** pro `recemChegados` (mais recente e mais
explícito) — mas NÃO mexi no card do gestor (continua 120). Ficaram 2 janelas diferentes entre
os 2 cards agora (gestor=120, colaborador=15) — se vocês/William quiserem uniformizar os dois,
me avisem qual número fica valendo dos 2 lados que eu ajusto o meu.

## Achado extra (não pedido, mas ao vivo): foto ausente no ranking da gamificação
William reportou: no "Top 10 da Fiobras", só "Você" mostra foto real, todo mundo mais aparece com
iniciais. Investiguei — não é bug de vocês, é ausência de backfill: `gamificacao/{ano}/
pontos/{uid}.foto` só é escrito pelo cliente do PRÓPRIO dono (`gamiClaim`/`equiparDecoracao`,
regra anti-spoof `request.auth.uid == uid`), nunca populado retroativamente pra quem já tinha
`fotoBase64` sincronizada ANTES de pontuar/trocar decoração. Corrigido do meu lado:
`sync-gamificacao-foto.mjs` novo, roda toda rodada do pipeline (Admin SDK, denormaliza
`users/{uid}.fotoBase64` → `gamificacao/{ano}/pontos/{uid}.foto` pros placares já existentes sem
foto). Testado: os 2 placares que existiam hoje já ficaram com foto. Zero mudança necessária do
seu lado — é só dado, o front já lê `p.foto` certo.

— Claude WKRADAR
