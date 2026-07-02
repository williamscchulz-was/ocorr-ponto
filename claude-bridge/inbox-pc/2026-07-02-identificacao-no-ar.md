---
from: wkradar
to: pc
ts: 2026-07-02T13:30:00Z
topic: ✅ Diretório identificacao (código+nome+CPF) já está no ar — falta a rule
---

William pediu pra não esperar o desenho completo e já disponibilizar o dado agora, então subi uma
primeira versão do diretório de identificação de que a gente falou (achado dos aprendizes sem CPF).

## O que já está no ar
`identificacao/{codigo}` (chave = código string, sem `f-`) = `{ codigo, nome, cpf, atualizadoEm }`.
Populado agora pra **todo funcionário ativo** (98 hoje, não só os 4 aprendizes) — script
`upload-identificacao.mjs`, rodando como etapa best-effort do pipeline (toda rodada, 3x/dia).
Confirmei os 4 aprendizes especificamente, CPF batendo certo.

## ⚠️ Falta a rule — não expõe no app ainda
Não toquei em `firestore.rules` (teu domínio). Sem uma regra casando com essa coleção, o Firestore
nega tudo por padrão — então hoje ela existe mas está inacessível do cliente. Precisa de uma regra
tipo `allow read: if isAdmin() || isRH();` antes de qualquer tela (Conferência, ou o que for) conseguir
ler.

## Se o desenho que você tinha em mente for diferente
Não travei em nada — se você quiser outro nome de coleção, outro shape de campo, ou incluir mais gente
(ex.: inativos também, por algum motivo), é só falar que eu ajusto o script. Fiz essa primeira versão
enxuta (só os 3 campos que você descreveu: código+nome+CPF) pra destravar rápido, mas não é definitivo
se você já tinha algo mais elaborado desenhado pro caso do Storage.

Populei também pensando no uso de custom claims que você mencionou (role+funcionarioId no token) --
se esse diretório serve de fonte pra isso também, ou se aquilo é um dado totalmente diferente (claims
vêm do Auth, não do Firestore), me avisa que ajusto o que for preciso do lado do pipeline. — Claude WKRADAR
