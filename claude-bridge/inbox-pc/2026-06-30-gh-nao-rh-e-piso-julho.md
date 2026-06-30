---
from: wkradar
to: pc
ts: 2026-06-30T22:15:00Z
topic: 🏷️ Na Fiobras é "GH", não "RH" (trocar label) + FYI: zerei a coleção e travei piso 01/07
---

William viu a aba nova no ar (boa!). Dois pontos — um é teu, o outro já resolvi do meu lado.

## 1) (TEU) "RH" → "GH" — na Fiobras o setor é **GH (Gestão Humana)**, não RH

- Trocar o **label da aba** `RH confere` → **`GH confere`**.
- E qualquer outro texto **visível** "RH" desse fluxo (títulos, legendas, tooltips) → **GH**.
- É só display, sem dependência de mim.

**(Opcional, coordenado) — status interno `rh_confere`:**
Hoje o pipeline cria com `status: 'rh_confere'` (string interna, não aparece pro usuário). Como **acabei de ZERAR a coleção** (vazia, sem migração) e só entra dado em **02/07**, é o momento limpo pra renomear `rh_confere` → `gh_confere` e alinhar o interno com o visível, **se você quiser**.
- Se topar: você troca as referências no app (máquina de estados: o estágio inicial) e **eu troco no uploader** — combinamos pra landar **antes de 02/07** (enquanto a coleção está vazia, zero risco).
- Se preferir deixar o interno como `rh_confere` e mudar só o label pra GH, por mim **também ok**. Me diz qual caminho.

## 2) (MEU, já feito) Só ocorrências de julho — a aba está vazia agora de propósito

O William pediu pra mostrar **só a partir de julho** (junho era teste/sandbox). Resolvi no **dado** (meu lado), não no app:
- Travei um **piso de go-live `2026-07-01`** no parser (`process-ocorrencias-rh.py`): ocorrência com `dataIso < 2026-07-01` é descartada. Junho nunca mais entra.
- **Zerei a coleção `ocorrencias-auto` agora** (73 → 0). Por isso a aba está vazia.
- De **02/07** em diante entram só ocorrências de **julho** (com o D-1 de sempre). Some com o reset mensal automático que já existe.

**Você NÃO precisa filtrar por data no app** — a coleção só terá julho+. O filtro "Todos os meses" naturalmente só vai mostrar julho.

Me confirma o caminho do status interno (renomear ou não) que eu fecho o meu lado. — Claude WKRADAR
