# FioPulse · Gamificação do Portal do Colaborador

Documento vivo do projeto. Criado 2026-07-10 (decisões do William na mesma data).

## Objetivo

Tudo que o colaborador FAZ de valor dentro do portal gera pontos. Ao cruzar marcos
(50, 100, 200, 500, 1000) ele ganha premiações definidas pela GP. Meta: engajamento
real com o portal (ciência de comunicados, assinaturas em dia, pesquisas respondidas),
não presença vazia.

## Decisões tomadas (William, 2026-07-10)

1. **Temporada ANUAL**: os pontos contam dentro do ano e zeram na virada; nova rodada
   de prêmios por ano. Custo de premiação previsível.
2. **Marcos cumulativos**: cruzou 50 = ganha o prêmio dos 50 e SEGUE acumulando rumo
   aos 100. Cada marco é conquistado uma vez por temporada. Pontos não são gastos.
3. **Ranking PÚBLICO top 10**: todo colaborador vê o pódio com nomes e pontos.
   (Mitigação combinada: só o top 10 e só o total; o extrato detalhado é self-only.)
4. **Gestão**: cap nova `gamificacao.gerenciar` (GLOBAL, GP/admin, mesmo padrão de
   pesquisas/desempenho). GP define valores das ações, prêmios dos marcos e registra
   as entregas.

## Catálogo de ações pontuáveis (CALIBRADO com William 2026-07-10; GP edita)

Filosofia: ROTINA vale 1 (fácil de explicar: 1 ação = 1 ponto), ações RARAS e valiosas
valem 5. Teto realista de um colaborador engajado: ~130 pts/ano.

| Ação | Pontos | Dedup (anti-farm) |
|---|---|---|
| Assinar cartão ponto do mês | 1 | 1x por cartão |
| Assinar folha de pagamento (recibo) | 1 | 1x por recibo |
| Ciência / visualização de comunicado | 1 | 1x por comunicado |
| Confirmar leitura de documento (aceite) | 1 | 1x por documento |
| Parabenizar colega de aniversário | 1 | 1x por post (retirar/redar não repontua) |
| Dar boas-vindas a recém-chegado | 1 | 1x por pessoa |
| Assinar documento (assinatura eletrônica) | 5 | 1x por doc/versão |
| Responder pesquisa de clima | 5 | 1x por pesquisa |
| Concluir autoavaliação de desempenho | 5 | 1x por ciclo |
| Primeira entrada + Termo de Adesão | 5 | 1x na vida |

**Fora do v1, de propósito:**
- "Abrir o app / login diário" — vira vigilância de presença (LGPD) e é farmável.
- Assiduidade/ponto ("mês sem ocorrência") — pune indiretamente atestado/licença e
  pode gerar discussão trabalhista; SÓ com aval jurídico explícito, como fase futura.

## Marcos e premiações (recalibrados 2026-07-10)

**25 → 50 → 100 → 150 → 200**, cada um com prêmio, e os prêmios são **SURPRESA**
(decisão William): a GP cadastra o prêmio de cada marco, mas o colaborador só descobre
ao cruzar. Na UI do colab os marcos aparecem como "Surpresa" até a conquista. O 200 é
o pé do ano, só pra quem faz tudo. A lista dos prêmios é do William/GP (pendência
aberta, oculta do colaborador). Alerta registrado: validar com a contabilidade a
natureza dos prêmios ANTES do go-live.

## Arquitetura (anti-fraude sem Cloud Functions, padrão da casa)

Problema: ponto auto-declarado é forjável via console. Solução: a MESMA liturgia do
contador da pesquisa de clima (batch + existsAfter + valor cravado), já auditada.

```
/gamificacao/{ano}                    config da temporada: { tabela: {acao: pts},
                                      marcos: [{pts, premio}], ativa }
                                      write: cap gamificacao.gerenciar · read: authed
/gamificacao/{ano}/pontos/{uid}       { total, nome }  nome == userDoc().nome
                                      (anti-spoof, mesmo padrão do mural; necessário
                                      pro ranking, o colab não lê /funcionarios)
                                      read: authed (ranking público) · update: só
                                      total == resource.total + pontos do evento
                                      criado no MESMO batch (padrão contador clima)
/gamificacao/{ano}/pontos/{uid}/eventos/{tipo_refId}
                                      { pontos, em }  create-only, id DETERMINÍSTICO
                                      (ex.: comunicado_abc123 = dedup estrutural);
                                      pontos == tabela da config; a regra exige a
                                      PROVA da ação (exists/existsAfter do doc de
                                      ciência/assinatura/recibo/auto correspondente)
/gamificacao/{ano}/entregas/{uid_marco}
                                      { marco, em, porUid }  create: só cap (GP
                                      registra a entrega do prêmio), imutável
```

- Ranking top 10: query `orderBy(total, desc).limit(10)` (provável pela regra de read
  amplo em /pontos, que expõe SÓ total+nome).
- Extrato (eventos): self-only + GP.
- Fila de entrega da GP: derivada (totais × marcos − entregas registradas).
- Temporada = path por ano; a virada é criar /gamificacao/2027 (sem migração).
- PII: nenhum CPF/foto denormalizados; só nome (mesmo residual aceito no mural).

## Ganchos (onde o ponto nasce, no MESMO batch da ação)

Cada função existente do cliente ganha o par no batch: ciência de comunicado,
confirmação/assinatura de documento, assinatura de recibo, responder clima (o recibo
da pesquisa é a prova; o EVENTO de ponto NÃO revela conteúdo nem quebra o anonimato,
só "participou", que o recibo já registra), concluir auto de desempenho, coração,
boas-vindas, termo de adesão. Falha do ponto NUNCA pode derrubar a ação principal
(ponto é acessório: batch separado com retry? NÃO — mesmo batch pra prova; se a regra
do ponto negar por config ausente, o cliente refaz a ação SEM o ponto). Detalhe fino
na fase de backend, caso a caso, com gate Fable.

## Recompensas digitais (William, 2026-07-10): avatar decorations + badges

Além dos prêmios físicos dos marcos, recompensas DIGITAIS de entrega automática e custo zero.
Ponto forte arquitetural: quase tudo é DERIVADO de dados que já existem (pontos, ranking,
diasNaEmpresa) — a única escrita nova é a preferência de decoração equipada.

**Avatar decorations (aro/moldura no avatar, escolhida pelo colaborador entre as desbloqueadas):**
| Decoração | Como desbloqueia |
|---|---|
| Aro bronze | cruzou 25 pts na temporada |
| Aro prata | cruzou 50 pts |
| Aro ouro | cruzou 100 pts |
| Aro FioPulse (gradiente da marca) | cruzou 200 pts |
| Coroa · Rei dos pontos | é o nº 1 do ranking AGORA (posse rotativa, só um por vez) |
| Aro veterano | 5+ anos de casa |
Aparece em TODO avatar (home do colab, mural de aniversário, boas-vindas e nos avatares do
gestor via avatarFuncHtml, que é o helper central — 1 ponto de implementação).

**Badges (colecionáveis, com data de conquista, na tela Conquistas):**
| Badge | Critério (derivado) |
|---|---|
| 1 ano / 5 anos / 10 anos de Fiobras | diasNaEmpresa (automático, nada a fazer) |
| Rei dos pontos | nº 1 do ranking atual (rotativo) |
| Campeão da temporada YYYY | nº 1 no fechamento do ano (permanente) |
| Primeira pontuação | 1º evento de ponto da temporada |
| Voz da firma | respondeu todas as pesquisas de clima do ano |
| Coração de ouro | parabenizou 20+ colegas |
| Comitê de boas-vindas | deu boas-vindas a 10+ recém-chegados |
| Tudo em dia | assinou todos os documentos/recibos do ano no prazo |
Derivação no CLIENTE a partir do extrato de eventos + dados existentes; badges rotativos (rei)
nunca são gravados, sempre calculados. A GP pode ver as conquistas de qualquer um no perfil.

**Escrita nova (única):** `users/{uid}.decoracao` (string da decoração equipada, self-write com
validação de desbloqueio no cliente; a regra valida só o shape — forjar decoração não dá acesso
a nada, é cosmético, mesmo residual aceito do guard de auto-toque do mural).

## Telas

**Colaborador:** card na home (total + barra até o próximo marco + "faltam X pts") ·
tela "Meus pontos" (extrato por ação, marcos conquistados/pendentes, prêmios, top 10) ·
tela "Conquistas" (badges com data + escolher a decoração do avatar entre as desbloqueadas).
**Gestor (cap):** tela "Gamificação" — config (tabela de valores + prêmios por marco +
ativar temporada), fila de entrega (quem cruzou marco sem prêmio entregue, botão
"Marcar como entregue" com trilha), ranking completo.

## Fases

1. **Mock** (localhost, aprovação do William ANTES de tocar o app) — telas colab+gestor.
2. **Backend**: rules /gamificacao + suíte no emulador 100% + gate Fable (obrigatório:
   regra nova + dado de pessoa) + deploy.
3. **Camada de dados + ganchos** nas ~9 ações (batch a batch, com teste de cada prova).
4. **Front** colab + gestor (portando o mock aprovado) + harness Playwright.
5. **Release** + smoke ao vivo + WKRADAR ciente (zero mudança de pipeline no v1).

## Pendências do William

- [ ] Lista dos prêmios de cada marco (50/100/200/500/1000).
- [ ] Validar natureza jurídica dos prêmios com a contabilidade.
- [ ] Aprovar os valores default do catálogo (tabela acima).
- [ ] Aprovar o mock (fase 1).
