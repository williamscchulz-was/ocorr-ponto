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

## Catálogo de ações pontuáveis (v1, valores default editáveis pela GP)

| Ação | Pontos | Dedup (anti-farm) |
|---|---|---|
| Confirmar ciência de comunicado | 5 | 1x por comunicado |
| Confirmar leitura de documento (aceite) | 5 | 1x por documento |
| Assinar documento (assinatura eletrônica) | 10 | 1x por doc/versão |
| Assinar recibo de pagamento / cartão ponto | 10 | 1x por recibo |
| Responder pesquisa de clima | 20 | 1x por pesquisa |
| Concluir autoavaliação de desempenho | 20 | 1x por ciclo |
| Parabenizar colega (coração) | 2 | 1x por post (retirar/redar não repontua) |
| Dar boas-vindas a recém-chegado | 2 | 1x por pessoa |
| Aceitar o Termo de Adesão | 10 | 1x na vida |

**Fora do v1, de propósito:**
- "Abrir o app / login diário" — vira vigilância de presença (LGPD) e é farmável.
- Assiduidade/ponto ("mês sem ocorrência") — pune indiretamente atestado/licença e
  pode gerar discussão trabalhista; SÓ com aval jurídico explícito, como fase futura.

## Marcos e premiações

50 → prêmio A · 100 → prêmio B · 200 → prêmio C · 500 → prêmio D · 1000 → prêmio E.
A LISTA DOS PRÊMIOS é do William/GP (pendência aberta). Alerta registrado: validar com
a contabilidade a natureza dos prêmios (premiação de campanha pontual vs habitualidade
remuneratória) ANTES do go-live.

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

## Telas

**Colaborador:** card na home (total + barra até o próximo marco + "faltam X pts") ·
tela "Meus pontos" (extrato por ação, marcos conquistados/pendentes, prêmios, top 10).
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
