# MISSÃO: Deploy do app — SETORES dinâmicos vindos do ERP

**Solicitante:** Claude WKRADAR (commit pendente no main)
**Criado em:** 2026-05-26 13:20 BRT
**Prioridade:** média
**Contexto:** William reportou que o setor não tá puxando no FioPulse. Investigação:

- Pipeline RH grava `setor` em `funcionarios/{f-codigo}` corretamente (vem do campo "Departamento" do CSV WK Radar, 11 setores: REPASSE, PREPARAÇÃO, RETORCEDEIRAS, etc.).
- App tinha `const SETORES = ["Produção", "Qualidade", ...]` hardcoded (7 valores Title Case) — **zero overlap** com o que vem do ERP.
- Consequência: dropdown de editar funcionário não pré-selecionava nada porque o valor real não estava na lista. Visualização (`f.setor || "—"`) funcionava, mas confundia o usuário.

## Tarefa

Já fiz o code change e pushei pro main. Vocês precisa fazer deploy.

## O que foi mudado em `public/app.js`

Linha 1448 (era `const SETORES = [...]` com 7 valores hardcoded) virou:

```js
const SETORES_FALLBACK = [
  "ADMINISTRAÇÃO", "ADMINISTRAÇÃO PRODUÇÃO", "COMERCIAL",
  "DIRETOS BENEFICIAMENTO", "EXPEDIÇÃO", "LABORATÓRIO",
  "MANUTENÇÃO BENEFICIAMENTO", "MANUTENÇÃO DA PRODUÇÃO",
  "PREPARAÇÃO", "REPASSE", "RETORCEDEIRAS",
];
function getSetores() {
  const fromFuncs = new Set();
  for (const f of (state.funcionarios || [])) {
    if (f.setor) fromFuncs.add(f.setor);
  }
  return fromFuncs.size > 0 ? [...fromFuncs].sort() : SETORES_FALLBACK;
}
const SETORES = SETORES_FALLBACK;  // compat com código legado
```

E o `openFuncionarioModal` agora usa `getSetores()` no lugar de `SETORES`. Mantém o `selected` correto + adiciona opção "(legado)" se `f.setor` não estiver na lista atual (defensivo pra setores antigos importados via XLSX).

**Filosofia:** ERP é fonte canônica. Setores são derivados dos funcionarios reais. Lista hardcoded é só fallback pra modo demo / cold start.

## Comandos pra deploy

```powershell
cd <caminho do worktree do ocorr-ponto>
git pull origin main          # pega meu commit + outros
# (opcional) bump cache-buster no index.html: v=N → v=N+1
firebase deploy --only hosting
```

## Critério de sucesso

- [ ] Site `weave-fiobras.web.app` no ar com a versão nova
- [ ] Abrir edição de um funcionário e ver o setor real (ex "RETORCEDEIRAS") pré-selecionado no dropdown
- [ ] Dropdown lista os 11 setores do ERP, não os 7 antigos
- [ ] Filtros/searches por setor (se houver) funcionam com os valores corretos

## Output esperado

Move pra:
```
docs/wkradar-missions/done/2026-05-26-1320-deploy-setores-dinamicos-DONE.md
```

Append:
```markdown
## OUTPUT (executado em YYYY-MM-DD HH:MM)

- Cache-buster bumped: v=N → v=N+1
- Deploy hash: <hash do firebase deploy>
- Verificação: <screenshot ou descrição do que viu na UI>
```

## Por que peço isso

Eu não tenho `firebase login` no WKRADAR (William adiou a autenticação). Você tem o setup do deploy no PC. Você pode também aproveitar a passada pra fazer:

- Bump do cache-buster `v=` em `public/index.html` se quiser
- Verificar se o `Funcionario` ainda tem campos legados (ex `funcionarios[i].setor === "Produção"`) que precisam migrar pros 11 do ERP — mas como o pipeline RH roda diariamente e sobrescreve, isso se auto-corrige na próxima execução das 08:00 BRT
