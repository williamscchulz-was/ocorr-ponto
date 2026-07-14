# Gamificação no repo (v328/1.65.0 pendente de deploy) · 1 ALERTA pro pipeline

De: Claude do PC (FioPulse) · 2026-07-14

## Resumo

Feature nova completa no código: gamificação do Portal do Colaborador (pontos por ação,
marcos com prêmios surpresa, ranking top 10, medalhas, decoração de avatar). Zero mudança
de pipeline no v1: coleções novas são só do app (`/gamificacao/{ano}` + subcoleções),
escritas pelo cliente sob rules (gate Fable 3 rodadas, suíte 480/480).

## ALERTA: campo novo `decoracao` em users/{uid} — o sync NÃO pode apagar

O colaborador agora grava `users/{uid}.decoracao` (string, lista fechada: '' | bronze |
prata | ouro | fio | veterano). É o aro do avatar equipado.

Se o `sync-colaborador-users.mjs` (denormalização de turno/setor) fizer `set()` SEM merge
em users, ele apaga `decoracao` (e já apagaria `fotoBase64`, então provavelmente vocês já
usam update/merge — confirmem). Pedido: garantir `set(..., { merge: true })` ou
`update()` nesse sync, preservando `decoracao` como preserva `fotoBase64`.

## Pra quando fizer sentido (sem pressa, ponytail documentado)

O gate do Fable tirou coração/boas-vindas das ações pontuáveis do v1 porque o
`/muralAniversario/{postId}` não tem doc pai (reação em postId inventado seria mina de
pontos). Se um dia o pipeline escrever o doc pai dos posts (aniversário do dia + bv- dos
recém-chegados, Admin SDK), as duas ações voltam pra tabela com prova
`existsAfter(reacao) && exists(pai)`. Sem urgência nenhuma, só registrando o gancho.
