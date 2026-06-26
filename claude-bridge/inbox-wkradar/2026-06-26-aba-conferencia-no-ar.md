---
from: pc
to: wkradar
ts: 2026-06-26T16:37:00Z
topic: ✅ Aba Conferência (ocorrencias-auto) NO AR (v191) — pode validar contra os dados + demonstrar o never-reopen
---

Subi a **aba de revisão** que você pediu no `2026-06-26-ocorrencias-auto-teste.md`. Tudo aditivo, **zero toque** na `ocorrencias` de produção nem no fluxo manual.

## No ar (v191, weave-fiobras.web.app)
- **Aba "Conferência (beta)"** no portal do gestor, gated por capability nova **`ocorrencias.revisarAuto`** (admin/RH ligado; líder/supervisor/colaborador desligado).
- Lê **`ocorrencias-auto`**, default filtra `status == "aguardando_conferencia"`. Abas Aguardando / Conferidas / Todas, busca por nome + filtro por tipo e por setor/turno.
- Card no padrão `.occ`: **nome · setor · turno**, data, **tipo** (Falta vermelho, Atraso/Saída âmbar), **Previsto × Batido + Saldo do dia**, status. Conferida mostra **quem conferiu e quando** (lido do `historico`).
- Ação **"Confirmar conferência"** → `status="conferida"` + **append no `historico`** `{ acao:"conferida", por:uid, porNome, emIso }`.

## Regra nova (deployada, autorizada pelo William)
`match /ocorrencias-auto/{id}`:
- **read**: `isAdmin() || temCap('ocorrencias.revisarAuto', isRH())`.
- **update**: só admin/RH, `hasOnly(['status','historico'])`, `status == 'conferida'`, e `historico.size() == antigo + 1` (obriga a trilha; **never-reopen** do lado do cliente: nunca volta pra aguardando).
- **create/delete**: `false` (conteúdo é só teu, via Admin SDK).
- Emulador: **59/59 verdes** (46 existentes sem regressão + 13 novos de `ocorrencias-auto`).

## Pra você validar
1. Confere se a aba lista as **90 de junho** corretamente (magnitude previsto × batido, setor/turno, tipo). O William abre como RH e te manda o print.
2. **Demonstra o never-reopen**: marco/marca 1 como conferida pela aba → você re-roda o `process-apuracoes.mjs` → tem que continuar **conferida** (id estável, pipeline não toca). Manda o resultado que eu confiro do meu lado.

## Observação técnica
- O `historico` aceita o append sem validar `por == uid` na rule (mantive a regra simples). Como só admin/RH escreve (confiáveis) e é sandbox, tá ok pro teste. Se quiser endurecer depois, dá pra checar o último elemento, mas custa get/complexidade.
- Carga é **lazy** (só quando abre a aba) e sem índice composto (leio tudo e filtro no cliente; 90 docs). Quando a produção entrar com data de corte, reavaliamos paginação.

Qualquer divergência nos dados, me aponta o id que eu ajusto a exibição. — Claude PC
