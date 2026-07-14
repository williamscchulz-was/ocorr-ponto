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
| Assinar documento (assinatura eletrônica) | 5 | 1x por doc/versão |
| Responder pesquisa de clima | 5 | 1x por pesquisa |
| Concluir autoavaliação de desempenho | 5 | 1x por ciclo |
| Primeira entrada + Termo de Adesão | 5 | 1x na vida |

**Fora do v1, de propósito:**
- "Abrir o app / login diário" — vira vigilância de presença (LGPD) e é farmável.
- Assiduidade/ponto ("mês sem ocorrência") — pune indiretamente atestado/licença e
  pode gerar discussão trabalhista; SÓ com aval jurídico explícito, como fase futura.
- **Coração e boas-vindas (gate Fable 2026-07-14, bloqueador 1)**: o mural não tem doc
  pai (posts são implícitos), então reação em postId INVENTADO via console seria mina
  de pontos infinita. ponytail: quando o pipeline (WKRADAR, Admin SDK) escrever
  /muralAniversario/{postId} como doc pai, a prova vira existsAfter(reacao) &&
  exists(pai) e as duas ações voltam pra tabela.

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
                                      marcos: [25, 50, ...] (SO INTS: premio aqui
                                      vazaria a surpresa na config publica; a tela
                                      da GP valida), ativa }
                                      write: cap gamificacao.gerenciar · read: authed
/gamificacao/{ano}/privado/premios    os premios por marco (SURPRESA): read/write SO cap
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
confirmação/assinatura de documento, assinatura de recibo, concluir auto de
desempenho, termo de adesão. Falha do ponto NUNCA pode derrubar a ação principal
(o cliente tenta o batch COM o ponto; se negar, refaz a ação SEM o ponto).

**EXCEÇÃO estrutural, pesquisa de clima (gate Fable 2026-07-14, bloqueador 2): o ponto
NUNCA nasce no mesmo batch da resposta.** A regra exige recibo PRÉ-existente (exists,
não existsAfter): se nascessem juntos, o `em` do evento (GP-readable) e o createTime
da resposta anônima seriam o MESMO commit time e a resposta seria desanonimizada por
join exato. O cliente reivindica o ponto DEPOIS (na próxima abertura do app, junto do
catch-up). Obrigação de transparência no fluxo de resposta: "responder vale 5 pontos;
sua participação (nunca o conteúdo) aparece no seu extrato e no ranking". Revelar
PARTICIPAÇÃO é decisão informada do William; o conteúdo segue estruturalmente anônimo.

**Year-gate (bloqueador 3):** toda prova carrega server-time e a regra exige
prova.em.year() == ano corrente: retroativo vale DENTRO do ano da prova (ligar a
feature credita o que já foi feito NO ANO), e a virada de temporada NÃO recredita a
vida pregressa. Residual aceito: ação de ~31/12 avaliada em UTC pode cair no ano
seguinte e perder o ponto (1 dia por ano).

**Correção administrativa de placar:** delete de placar é só admin e os eventos não
renascem (ids determinísticos falham no !exists) — logo, zerar um placar é
IRREVERSÍVEL pelo app; reconstrução só via Admin SDK (comportamento intencional).

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

**Badges (colecionáveis, na tela Conquistas). Refinado com William 2026-07-10: badges NÃO
são sobre pontos — o eixo é HISTÓRIA (tempo de casa) e COMPANHEIRISMO (likes), com
progressão em níveis. Só 2 badges tocam o ranking (o tempero competitivo).**

| Categoria | Badges (níveis) | Critério (derivado de) |
|---|---|---|
| Tempo de casa | 1 ano · 3 anos · 5 anos · 10 anos de Fiobras | diasNaEmpresa (automático, lifetime) |
| Coração (aniversários) | Coração aberto (5) · Coração de ouro (20) · Coração gigante (50) | nº de corações dados na temporada (extrato de eventos) |
| Boas-vindas | Recepcionista (3) · Comitê de boas-vindas (10) · Porta aberta (25) | nº de boas-vindas dadas na temporada (extrato) |
| Participação | Voz da firma (todas as pesquisas do ano) · Tudo em dia (todas as assinaturas no prazo) | extrato × publicados no ano |
| Ranking | Rei dos pontos (nº 1 atual, rotativo) · Campeão da temporada (1º no fechamento, permanente) | ranking |

**Arte dos badges (William 2026-07-14, "algo que faça a pessoa querer"):** medalhas SVG
inline desenhadas no próprio app (zero asset externo): medalhão com anel duplo, brilho e
fita verde da marca; material progride com o nível (bronze, prata, ouro, e gradiente da
marca no topo da família); coroa e troféu são peças próprias; bloqueado = grayscale com a
silhueta visível (alimenta o desejo sem revelar conquista). Referência visual aprovada no
mock (tela Conquistas).

Derivação no CLIENTE a partir do extrato de eventos + dados existentes (zero doc novo);
os contadores de coração/boas-vindas derivam DOS PRÓPRIOS eventos de ponto (cada like é um
evento), então o badge conta a temporada corrente. Tempo de casa é lifetime. Badges
rotativos (rei) nunca são gravados, sempre calculados. GP vê as conquistas de qualquer um.

**Escrita nova (única):** `users/{uid}.decoracao` (string da decoração equipada, self-write com
validação de desbloqueio no cliente; a regra valida só o shape — forjar decoração não dá acesso
a nada, é cosmético, mesmo residual aceito do guard de auto-toque do mural).

## Telas e navegação (proposta mostrada in-app 2026-07-14, prints no harness gm-inapp2)

**Colaborador — 1 item de menu novo, home só com o card:**
- Menu "Conquistas" (ícone medalha, sidebar desktop entre Documentos e Novidades):
  tela única com abas **Pontos** (hero da temporada, marcos, top 10, extrato) e
  **Badges** (hero do perfil, decoração do avatar, medalhas por categoria).
- Home: card compacto "Seus pontos" (total + barra + faltam X + selos dos marcos),
  clique abre Conquistas·Pontos. Nada mais entra na home.
- Barra de baixo do mobile GANHA o item (decisão William 2026-07-14): Início, Avisos,
  Conquistas, Conta. O .bn-pill passa de 1/3 pra 1/4 de largura; a rota NÃO entra em
  filhasDoHub (tem item próprio, acende ele). O hub (pp-atl) mantém o atalho, mesmo
  padrão de Avisos/Conta que também vivem nos dois lugares.

**Gestor — 1 item com cap:**
- Menu "Gamificação" (ícone troféu, vizinho de Avaliações), só com
  `gamificacao.gerenciar` (GP/admin): tela com abas **Configuração** (tabela de
  valores + prêmios por marco + ativar temporada) e **Entregas e ranking** (fila de
  quem cruzou marco sem prêmio entregue com "Marcar como entregue" + ranking completo).
- Hub mobile do gestor (ghub): ganha o atalho quando a cap permite.

## Fases

1. **Mock** (localhost, aprovação do William ANTES de tocar o app) — telas colab+gestor.
2. **Backend**: rules /gamificacao + suíte no emulador 100% + gate Fable (obrigatório:
   regra nova + dado de pessoa) + deploy.
3. **Camada de dados + ganchos** nas ~9 ações (batch a batch, com teste de cada prova).
4. **Front** colab + gestor (portando o mock aprovado) + harness Playwright.
5. **Release** + smoke ao vivo + WKRADAR ciente (zero mudança de pipeline no v1).

## Prêmios: decisão NA HORA, sem lista prévia (William, 2026-07-14)

"É premiação surpresa por ora, não vamos nos prender": a GP NÃO precisa cadastrar a
lista de prêmios pra ativar a temporada. Os campos de prêmio da Configuração podem
ficar vazios; o colaborador só vê "surpresa" nos marcos. Quando alguém cruzar um
marco, a GP decide o prêmio daquele caso, digita na Configuração e registra a
entrega (a regra exige o texto do prêmio SÓ no registro da entrega, que é o que o
revela ao colaborador). Zero travas antecipadas.

## Pendências do William

- [x] Lista de prêmios: SEM lista prévia, decide na hora da entrega (2026-07-14).
- [ ] Validar natureza jurídica dos prêmios com a contabilidade.
- [ ] Aprovar os valores default do catálogo (tabela acima).
- [ ] Aprovar o mock (fase 1).
