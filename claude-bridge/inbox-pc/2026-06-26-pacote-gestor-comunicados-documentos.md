---
from: wkradar
to: pc
ts: 2026-06-26T00:35:00Z
topic: ✅ PACOTE liberado — 2 telas do PORTAL DO GESTOR (Comunicados + Documentos institucionais) + spec de backend
prioridade: alta
---

William aprovou o design e liberou pra implementar. **As 2 telas vivem no PORTAL DO GESTOR/SUPERVISOR** (o app que já existe), **NÃO no portal do colaborador**. O colaborador só consome (lê/assina); quem compõe/publica é o gestor. **É aditivo: não altera nenhuma tela/permissão atual de gestor/supervisor.**

## Mockups (abríveis, fragmentos auto-contidos)
- **Comunicados (composição):** `docs/mockups/gestor-comunicados.html`
- **Documentos institucionais:** `docs/mockups/gestor-documentos-institucionais.html`
- **Spec de backend (as duas):** `docs/mockups/BACKEND-comunicados-documentos.md` — coleções, schemas, capabilities, regras (só adições), funções, versionamento, auditoria, critérios de aceite.

## Regras de escopo (firmes)
- **Liberadas por capability de admin/RH** (`comunicados.gerenciar` / `documentos.gerenciar`). **Supervisor comum NÃO ganha o botão de publicar** por padrão (as permissões dele ficam intactas). Se o William quiser dar publish a supervisor depois, é só ampliar a cap — mas o default é admin/RH.
- **Zero mudança** nas telas/regras de gestor/supervisor existentes. Apenas 2 abas novas no shell do gestor + caps novas.
- Identidade: usar o **set de ícones SVG do app** (não o Tabler do mock) e os **tokens semânticos** (não os hex do mock); chips **dark-aware** desde o início. Aplicar o novo mark de pulso (ver `2026-06-26-marca-proposta-C-aprovada.md`).

## Comunicados (origem no gestor) — = roadmap #21/#22/#23
- Lista (cronológica, fixado no topo) + "X de Y leram/confirmaram" + modal compositor (título, corpo, **segmento todos/turno/setor**, toggle fixar, toggle requer confirmação, pré-visualização) + painel de leituras (abas confirmaram/pendentes).
- Schema `comunicados/{id}` `{titulo, corpo, segmento{tipo,valores}, autorUid, autorNome, publicadoEm(server), fixado, ativo, requerConfirmacao}` + `comunicados/{id}/leituras/{uid}`.
- **Segmentação canônica de turno: 1=Matutino, 2=Vespertino, 3=Noturno, 'geral'=Todos** (o composer emite os códigos, não as strings de UI). Alcance (Y) e leituras derivam de `casaSegmento` no server, não da UI.

## Documentos institucionais — NOVO (estende #29/#30)
- Lista por tipo (regras/conduta/cultura/privacidade/termo/outro) + métricas + % de adesão + modal compositor (texto OU anexo Drive https + hash SHA-256; segmento; **exige assinatura/ciência** com aviso de que trocar **versão reabre** a assinatura) + painel de pendentes.
- Reusar `documentos/{id}` com `escopo:'institucional'` (sem `funcionarioId`, com `segmento`) + assinatura N1 (#30) + `documentos/{id}/assinaturas|leituras/{uid}`.

## Pendência ligada
Amarra esses dois itens na reconciliação do `roadmap.js` que pedi em `2026-06-25-atualizar-roadmap-meio-do-caminho.md` (Documentos institucionais = item novo; #22 = origem gestor confirmada).

Quando subir cada tela, manda print que eu confiro contra o mock. — Claude WKRADAR
