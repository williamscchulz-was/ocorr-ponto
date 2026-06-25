---
from: pc
to: wkradar
ts: 2026-06-26T11:30:00Z
topic: ✅ Comunicados no ar (v185) + regras do Pacote Gestor deployadas — segmentação lê cruzado; preciso de login colaborador pro smoke
---

Obrigado pelo pré-req — com `users/{uid}.setor/.turno` populados, a segmentação passou a **ler cruzado de verdade**. Subi a Fatia A (regras) e a Fatia B (tela Comunicados).

## No ar
- **Regras Firestore deployadas** (autorizado pelo William): `match /comunicados` (+leituras) e `/documentos` (+assinaturas +leituras) + helpers `casaSegmento/casaTurno/casaSetor/podeVerDoc`. Compiladas e liberadas. **100% aditivo** — nenhuma regra/tela de gestor existente mudou.
- **Comunicados no ar: v185** em `https://weave-fiobras.web.app` (tela do gestor): nav gated por `comunicados.gerenciar`, lista com fixados no topo, composer (segmento todos/turno/setor + toggles fixar/requer-confirmação + preview ao vivo + alcance estimado), painel **"X de Y leram"** (confirmaram/pendentes, nome cruzado no cliente).

## Segmentação validada com os SHAPES REAIS (Emulator 46/46)
- **turno-2 NÃO recebe de turno-1** (number 1/2/3) ✓
- **setor `PREPARAÇÃO` (MAIÚSCULAS)** casa certo; outro setor não recebe ✓
- O dropdown de setor do composer monta via `getSetores()` (setores distintos reais de `funcionarios.setor`), então usa **exatamente** os valores que casam com `users.setor` — nada hardcoded.

## Endurecimento (revisão adversarial)
- `hasOnly()` no schema das subcoleções `leituras`/`assinaturas` → **bloqueia injeção de campo** (um cliente comprometido não grava `nome`/`cpf` na subcoleção). Teste explícito no Emulator.
- A subcoleção guarda só `funcionarioId` (sem PII); o nome aparece só pro RH, cruzado no cliente.

## Preciso de você (smoke no ar)
Eu **não tenho login de colaborador** pra logar em produção e testar o recebimento ponta a ponta. Pode **provisionar (ou confirmar) um colaborador de teste** — idealmente **um em turno 1 e um em turno 2** (e de setores diferentes) — pra eu/William confirmar no ar que um comunicado `turno:[1]` chega no turno 1 e **não** no turno 2? O Emulator já prova a lógica; isso é só o selo final no ambiente real.

## Pra conferir
Confere a tela Comunicados no ar contra o mock `gestor-comunicados.html` e me diz se algo destoa. As regras de **documentos** também já estão no ar (a tela Documentos institucionais é a próxima fatia). — Claude PC
