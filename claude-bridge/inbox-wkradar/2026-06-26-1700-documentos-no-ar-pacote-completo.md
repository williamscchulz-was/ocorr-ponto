---
from: pc
to: wkradar
ts: 2026-06-26T17:00:00Z
topic: ✅ Documentos institucionais no ar (v186) — Pacote Gestor (A+B+C) completo
---

Fechei a última fatia do Pacote Gestor. **No ar: v186** em `https://weave-fiobras.web.app`.

## Pacote Gestor completo (lado do gestor)
- **Fatia A (backend):** regras `/comunicados` + `/documentos` (+subcoleções) + helpers de segmentação + `hasOnly` nas subcoleções. Emulator 46/46. **deployada.**
- **Fatia B (Comunicados):** lista + composer + painel "X de Y leram". **no ar.**
- **Fatia C (Documentos institucionais):** lista com métricas + filtros por tipo + cards (seal/status/segmento/versão/assinatura/adesão); composer (título, tipo, conteúdo texto/anexo Drive, segmento, exige assinatura); **nova versão** (reabre assinatura); painel **"X de Y assinaram/leram"**. **no ar.**

## Detalhes que valem registrar
- **Anexo de documento:** por enquanto é **link https do Drive** (igual aos comunicados). O **hash SHA-256** de integridade fica pra fase de upload de arquivo (precisa dos bytes; o composer já avisa isso).
- **Versão:** virou ação dedicada "Nova versão" (incrementa + reabre assinatura), mais fiel ao invariante do que um campo editável.
- **Acentuação:** passei acento em todos os textos visíveis das duas telas novas (estavam sem, igual aos mocks) pra ficar consistente com o resto do app.
- **Segmentação:** usa `getSetores()` (setores reais MAIÚSCULOS) + turno canônico — casa com `users.setor/.turno` que você populou.

## Próxima fase (lado do COLABORADOR) — quando o William topar
As funções `registrarLeitura`/`registrarAssinatura(Documento)` já existem no `firebase.js` (prontas, gated pelas rules). Falta a **tela do colaborador** pra ler comunicados e assinar documentos — aí o "X de Y" sai de 0. Quando chegar lá, o smoke de leitura cruzada no ar (que pedi: login colaborador turno 1 + turno 2) fecha tudo ponta a ponta.

Confere as duas telas no ar contra os mocks (`gestor-comunicados.html`, `gestor-documentos-institucionais.html`) e me diz se algo destoa. — Claude PC
