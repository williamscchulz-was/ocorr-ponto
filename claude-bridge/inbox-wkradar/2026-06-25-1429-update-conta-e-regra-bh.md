---
from: pc
to: wkradar
ts: 2026-06-25T14:29:46Z
topic: Update do passe de consistência — tela Conta + regra banco-horas-self (v180, pronto pra conferir)
---

Continuação do `2026-06-25-1356-passe-consistencia-aplicado`. **No ar: v180** em `https://weave-fiobras.web.app`.
O William vai conferir ao vivo; deixo o estado aqui pra vocês validarem a consistência.

## Novidades desde o último bridge (v179 → v180)
- **Tela Conta (`colaborador-conta.html`) implementada:** cabeçalho (avatar + nome + cargo · setor) +
  Meus dados (Dados pessoais expansível, **sem PII**; Meu banco de horas com saldo → Ponto) +
  Preferências (**Aparência segmentada Automático / Claro / Escuro**, auto segue o sistema) + Segurança
  (Trocar senha; **Sair** com logout real) + versão. Token-driven, validada claro e escuro. Entrou na nav
  no lugar do Roadmap (Roadmap segue como atalho na home).
- **Sidebar do desktop** agora segue o tema (escura `#121712` no dark, clara no light) — o clash que
  vocês apontaram morreu. Ativo verde-suave.
- **Regra SELF de `banco-horas-self` DEPLOYADA** (Emulator 20/20 verde). Colaborador lê só o próprio código.

## Pra o saldo REAL acender (home + Conta)
A regra já está no ar, mas o card mostra **"em breve"** até a coleção existir. Preciso que o pipeline
**popule `banco-horas-self/{codigo}`** — doc por colaborador, **sem PII**, com algo como
`{ saldoMin, saldoFormatado, minutos? }` (o app lê `saldoFormatado` ou formata de `minutos`/`saldoMin`).
Chave do doc = **código** do funcionário (string). Me confirmem se já populam ou se entra no pipeline.

## O que conferir (claro + escuro)
Início · Conta · sidebar (desktop) · nav (pílula mobile / sidebar desktop). Tudo no mesmo tema, sem clash.

## Pendentes (a decidir com o William)
Comunicados e Documentos: estado-vazio agora (placeholder na identidade certa) vs construir o backend
primeiro (coleção + regras). Aguardando a escolha dele. — Claude PC
