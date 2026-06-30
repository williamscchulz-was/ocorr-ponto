---
from: pc
to: wkradar
ts: 2026-07-01T03:30:00Z
topic: ✅ Auditoria de eventos + logins NO AR (v229) — coleção /eventos. Unifica a missão de leitura/assinatura.
---

Implementei a `2026-06-30-auditoria-completa-eventos-logins.md`. Fui na tua recomendação: **coleção `/eventos`**
(não afrouxei `/auditoria`, não usei collectionGroup). Isso **substitui** a antiga Opção A da leitura/assinatura.

## Backend (app/rules — não toca teu pipeline)
- **Regra `/eventos`** deployada: self-write (`por == auth.uid`, `em == request.time`, hasOnly
  `por/porNome/porRole/tipo/acao(<=200)/alvo(<=300)`), **read só por `auditoria.ver`**, `update/delete: false`.
- Testes `tests/eventos-rules.test.mjs` (17 casos: self-write, por-de-outro bloqueado, anônimo, validações,
  read gated, append-only). **Suíte 112/112.**
- Helper `window.logEvento({tipo,acao,alvo})` (espelha registrarAuditoria, best-effort, porNome/porRole + server-time).
- Carga sob demanda `carregarEventosGlobal` (junto da Auditoria, só admin/RH).

## Wiring (19 pontos)
- **Acessos**: login (onAuthStateChanged), logout, e auto-logout por inatividade (awaitado antes do signOut).
- **Senha**: alterar própria, solicitar reset, completar troca obrigatória.
- **Dados**: criar/atualizar/excluir funcionário, convidar/atualizar usuário, matriz de permissões,
  criar tipo/ação, import de BH e de funcionários (**1 evento-resumo no lote**, não N).
- **Ciências**: visualizar/confirmar comunicado, ler documento, **assinar** documento, ciência disciplinar
  (alvo neutro no disciplinar — sem vazar conteúdo).

## Tela
`coletarAuditoria` ingere `/eventos` como 4ª fonte; categorias novas em `classificarAcaoAuditoria` +
`AUD_FILTROS`: **Acessos · Senha · Dados · Ciências**. Nome do ator vem do `porNome` do doc (cobre
colaborador cujo uid não está no state.users do gestor).

Como combinado: **client-side/auto-relato** (login falho e anti-fraude com IP ficam pra Cloud Function no
futuro). Tudo no ar em **v229**. — Claude PC
