# Plano — modularizar o `app.js`

> **Status:** Fase 1 EXECUTADA em 10/jun/2026 (commit `37235b8`, v1.6.2) —
> 26 helpers puros movidos pra `public/utils.js`. Fases 2 e 3 seguem como abaixo.

**Problema:** `public/app.js` tem ~7.000 linhas e mistura três responsabilidades
num arquivo só: UI/render, regra de negócio e fiação de eventos. Funciona (e é
bem comentado), mas fere "sem arquivos gigantes / separação de responsabilidades"
e dificulta achar coisas.

**Restrições do projeto (o que torna isto delicado):**
- Vanilla, **sem build step**. Scripts entram via `<script defer>` no `index.html`, em ordem.
- Tudo roda no **escopo global compartilhado** — `app.js` e `firebase.js` enxergam as mesmas funções/`state`. Quebrar isso sem cuidado quebra o app.
- A camada de **dados já está isolada** em `firebase.js` (bom) — a UI chama `window.*`.

## Estratégia faseada (risco crescente, valor decrescente)

### Fase 1 — extrair os PUROS (risco baixo, ganho alto) — recomendada
Mover funções sem estado pra um `public/utils.js` carregado **antes** do `app.js`:
- formatação: `formatDate`, `formatMoeda`, `formatDay`, `formatMonth`, `tsToDateStr`…
- validação: `ehCNPJValido`, `ehCPFValido`, `ehUrlSegura`, `escapeHtml`…
- ícones: `icon()`.
Continuam funções globais → **zero mudança nas chamadas**. Só recortar e colar + um `<script defer src="utils.js?v=...">` antes do `app.js`. Tira ~600–900 linhas do `app.js`.

### Fase 2 — separar por DOMÍNIO (risco médio) — quando incomodar
Quebrar o restante em arquivos por área, ainda com funções globais (sem ES modules):
- `occ.js` (ocorrências: render/list/detail/lançar), `pj.js`, `func.js`, `bh.js`, `chat.js`, `permissoes.js`, `config.js`.
- `app.js` vira só o "shell": boot, roteamento (`renderApp`/`renderView`), `state`, helpers de UI comuns (`openModal`, `toast`, `confirmar`).
- Cuidado com **ordem dos `<script>`** e funções que se chamam entre arquivos (todas globais, então ok, mas a ordem de definição no load importa pra constantes).

### Fase 3 — ES modules (risco alto) — provavelmente desnecessária
`type="module"` + `import/export` elimina o escopo global, mas obriga reescrever
todas as exposições `window.*` (o `firebase.js` chama `window.aoAtualizarOcorrencias`
etc.) e a sequência de carga. Só vale se o projeto crescer muito ou virar multi-app.
Pra single-tenant, **não recomendo agora**.

## Camada de dados (reforço, não recorte)
`firebase.js` é a camada de acesso — manter a UI chamando `window.*` dele. Regra:
**nenhuma regra de negócio nova** deve entrar no `firebase.js`; ele só lê/grava.

## Riscos e mitigação
- Ordem de `<script>` / hoisting de `const` entre arquivos → extrair **puros primeiro** (Fase 1) minimiza dependências.
- Regressão silenciosa → a cada fase: `node -c` em cada arquivo + smoke test logado no incógnito (abrir cada tela, criar/conferir/lançar, F12 sem erro) + bump de versão.
- Fazer **uma fase por PR/commit**, nunca tudo de uma vez.

## Recomendação
Fazer só a **Fase 1** quando houver apetite — entrega ~80% do ganho de
legibilidade com risco mínimo. Fase 2 sob demanda. Fase 3 fica no radar, sem urgência.
Não é um incêndio: é dívida organizada, e o app está estável.
