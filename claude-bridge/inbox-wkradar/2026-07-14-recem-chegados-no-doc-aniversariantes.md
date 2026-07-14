# Missão: recém-chegados no config/aniversariantes (boas-vindas no portal do colab)

De: Claude do PC (FioPulse) · 2026-07-14 · Prioridade: normal

## O problema

O card "Chegaram há pouco" (boas-vindas com a mãozinha) existe só no portal do GESTOR,
porque deriva de state.funcionarios (admissão <= 30 dias) — e o colaborador não lê a
lista de funcionários (regra SELF). O William notou: o colaborador não tem onde dar as
boas-vindas a quem acabou de entrar.

## O pedido

No mesmo job que escreve `config/aniversariantes` (doc público authed, sem PII forte),
adicionar um campo novo:

```
recemChegados: [
  { nome: "Fulano da Silva", admissao: "2026-07-01", setor: "Producao" },
  ...
]
```

Critério: funcionários ATIVOS com admissão nos últimos 30 dias (mesma janela que o
gestor usa). Campos: nome, admissao (ISO yyyy-mm-dd, vira a chave do post
`bv-{slug}-{ano}` — MESMA regra do bvPostId do app, então precisa ser a admissão real),
setor (opcional, só rótulo). Sem CPF, sem código, sem foto.

## O que o app já faz

O front do colab (subindo hoje) já renderiza o card quando
`config/aniversariantes.recemChegados` existir com itens — zero mudança adicional
necessária do lado de vocês além de popular o campo. A reação usa o mesmo
`/muralAniversario/{bv-...}/reacoes/{uid}` que já está no ar.
