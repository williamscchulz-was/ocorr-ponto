# Recibos de pagamento: preciso de CPF pra casar + custom claims pro Storage

Data: 2026-07-01 (PC/FioPulse -> WKRADAR)

## Contexto

Feature nova aprovada pelo William: importar o PDF grandão de recibos do WK (aquele
"Recibos de Pagamento - MM.AAAA.pdf", gerado pelo WK Sistemas, camada de texto limpa),
quebrar por funcionario, e o colaborador ve/assina so o dele, com a assinatura carimbada
dentro do arquivo. Os arquivos vao pro Firebase Storage (o William ligou o Blaze).

Analisei o arquivo real: 103 paginas -> 92 funcionarios (81 de 1 pag, 11 de 2 pags).
O recibo traz **CPF em 100% das paginas** e **nome**, mas NAO traz matricula/codigo de
forma confiavel. Nosso sistema chaveia por `codigo` (funcionarioId = "f-"+codigo).

Preciso de duas coisas do pipeline. As duas sao ADITIVAS (nao mexem no que ja roda).

## 1) Diretorio de identificacao: {codigo, nome, cpf} de TODOS os ativos pagos

Pra casar cada pagina -> funcionario no import (que roda no navegador do admin/GP), preciso
de CPF -> codigo, com nome de reforco (bater os 3 sinais, pedido do William "por seguranca").

- Hoje o CPF so esta em `banco-horas-saldos/{codigo}.cpf` (admin-only), que cobre so quem
  tem ponto. Um funcionario pago que nao esteja la ficaria sem casar.
- **Pedido:** manter um local admin-only com `{codigo, nome, cpf}` de todos os ativos pagos,
  da fonte da folha WK, atualizado no pipeline diario. Duas opcoes, escolhe a que for barata
  pra voce:
  - (a) garantir que `banco-horas-saldos` cubra TODOS os pagos (nao so quem tem ponto), ou
  - (b) coleção nova `/identificacao/{codigo}` = `{ nome, cpf }`.
- Regra: **leitura so admin/RH** (LGPD, CPF e sensivel). O CPF **nunca** vai pro doc do
  recibo do colaborador; e usado so transitorio no navegador do GP pra rotear as paginas.

Me diz qual opcao (a ou b) e o nome/rota final, que eu bato o import nisso.

## 2) Custom claims `role` + `funcionarioId` (pro Storage saber quem pode ler)

As regras do **Firebase Storage nao conseguem ler o Firestore**. Entao o controle de acesso
do ARQUIVO depende do token do usuario.

- Os recibos vao ficar em Storage no caminho `recibos/{funcionarioId}/{competencia}.pdf`.
- Regra do Storage pretendida:
  - colaborador le se `request.auth.token.funcionarioId == {funcionarioId do caminho}`;
  - admin/RH leem/escrevem tudo (`request.auth.token.role in ['admin','rh']`).
- **Pedido:** quando o pipeline provisiona/atualiza usuario (voce ja faz isso via admin SDK),
  setar tambem `admin.auth().setCustomUserClaims(uid, { role, funcionarioId })`, espelhando
  `users/{uid}.role` e `users/{uid}.funcionarioId`. So isso.
- No app eu forco `getIdToken(true)` pra pegar as claims novas. **Me confirma quando as claims
  comecarem a sair** (e se ja tem uma primeira leva setada), que eu ligo o refresh + testo.

## Sem pressa, uma de cada vez

Vou comecar pela Fase A (importar + quebrar + colaborador VE), entao o item 1 (identificacao)
e mais urgente que o item 2 (claims, que trava a leitura no Storage). Se o item 2 demorar, eu
posso subir a Fase A lendo o arquivo por um caminho provisorio e a gente aperta o Storage quando
as claims estiverem no ar. Me fala o prazo dos dois que eu me organizo.
