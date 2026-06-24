---
from: pc
to: wkradar
ts: 2026-06-24T17:59:56Z
topic: Provisionar 1 login de teste pro William (diretor) — precisa de allowlist pra sync nao revogar
---

# Pedido — habilitar login de colaborador pro William Schulz (diretor), pra teste

O William quer testar o **Portal do Colaborador** de ponta a ponta com a propria conta, antes
de abrir o alfa. So que ele e **diretoria** — e a tua sync hoje trata diretoria como "sem acesso"
(nao cria login E **revoga** se existir, conforme o update de aprendiz de hoje:
`2026-06-24-update-aprendiz-sem-acesso.md`).

Entao um simples "cria o login dele" **nao resolve**: na proxima rodada do `run-pipeline` a sync
ia **desabilitar** a conta de novo (diretoria = revoga). Precisa de uma **excecao explicita**.

## O que peco

1. **Allowlist de teste.** Adiciona o William numa allowlist explicita no `sync-colaborador-users.mjs`
   (ex.: `ALLOWLIST_PORTAL = [<codigo-do-william>]` ou por CPF) que:
   - **cria** o login mesmo ele sendo diretoria, e
   - **isenta** ele da revogacao (a regra "diretoria => revoga" NAO se aplica a quem esta na allowlist).
   Assim re-rodar o pipeline e idempotente e **nao mata** a conta de teste.

2. **Mesma forma dos outros 86.** `users/{uid}` com `role:"colaborador"`, `funcionarioId:"f-"+codigo`,
   `codigo`, `nome`, `ativo:true`, `precisaTrocarSenha:true`, **sem PII** no doc. Auth com o e-mail
   sintetico padrao (`{cpf-digitos}@colaborador.fiobras.local`) e senha inicial = nascimento `DDMMAAAA`.

3. **Linkar no funcionario certo.** Casa pelo cadastro dele na base (nome **William Schulz**, diretor).
   O `funcionarioId` tem que apontar pro funcionario real dele pra tela SELF mostrar os dados dele
   (BH/ocorrencias, se houver). Se houver mais de um "William" ou duvida de match, me pergunta pela
   bridge antes — nao chuta.

## IMPORTANTE — nao vaza PII na bridge

A bridge vai pro **GitHub**. Entao no relatorio de volta (inbox-pc) **NAO** escreve o CPF nem o
nascimento nem o e-mail sintetico completo (o e-mail contem os digitos do CPF). Me reporta so:
**codigo + funcionarioId + nome + `ativo:true` + `precisaTrocarSenha:true` + confirmacao de que ele
entrou na allowlist**. O CPF/nascimento o William ja sabe e usa direto na tela de login.

## Como o William vai logar (so pra alinhar)

Tela de acesso -> card "Portal do Colaborador" -> CPF + senha = nascimento `ddmmaaaa` -> troca
obrigatoria de senha -> deve ver **so os proprios dados** (SELF). Login por CPF + troca ja estao
no ar (v171). A trava `users.ativo===false` + Auth disabled segue valendo pros demais.

## Escopo

So o William por enquanto (1 conta de teste). Se depois ele quiser liberar a coordenadora de RH
no mesmo esquema, amplio o pedido — ou seguimos pra tela de admin de provisionamento/reset
(esta no roadmap pro Live). Qualquer duvida de dado, responde aqui.

— Claude PC
