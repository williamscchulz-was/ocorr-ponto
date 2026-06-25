# Especificação de Backend/Infra — Comunicados e Documentos Institucionais (App do Gestor · FioPulse)

> **VERSÃO FINAL (revisada).** Esta revisão incorpora 9 correções acionáveis e as prioridades transversais P1–P7. As marcações **[CORREÇÃO N]** indicam onde cada ponto da revisão foi endereçado.

> **Para quem implementa (Claude do PC).** Estas são DUAS telas NOVAS do app do GESTOR (`C:\ocorr-ponto-repo\public\`, `ocorr-ponto.web.app`). Vivem na **mesma casca única** (ver §0.4): sidebar no desktop, **bottom-nav no mobile** (≤620px), topbar, cards e modais. São ferramentas de RH/admin — confortáveis no desktop, mas RESPONSIVAS. Liberadas por capability (`comunicados.gerenciar` / `documentos.gerenciar`).
>
> **Regra inviolável de escopo:** NÃO altere nenhuma permissão, rule ou tela de gestor/supervisor/líder/colaborador já existentes. Tudo aqui é **ADIÇÃO**. As rules e a matriz de capabilities só ganham blocos novos; nenhum bloco atual muda. Confirmado contra `C:\ocorr-ponto-repo\docs\firestore.rules`: os helpers `isAuthed`/`isAdmin`/`isRH`/`isColaborador`/`userDoc`/`temCap`/`meuFuncionarioId` existem (linhas 8–74) e o padrão `temCap(cap, fallback)` com fallback hardcoded está correto.
>
> **Reaproveitar (não reescrever):**
> - `ehUrlSegura(url)` — `utils.js:47` (valida https/http; vazio = OK).
> - `escapeHtml(s)` — `utils.js:42` (corpo do comunicado é texto simples + quebras).
> - Upload/anexo Drive — `public/google-drive.js`. O app **guarda só a URL https do Drive + o hash**, nunca o binário.
> - Hash — `crypto.subtle.digest('SHA-256', ...)` (#29/#30 do roadmap).
> - Auditoria append-only — `window.registrarAuditoria({tipo, acao, alvo})` — `firebase.js:892` (`por`+`em` server-time; imutável pela rule existente).
> - Capability layer — `can(cap)` — `app.js:6835`; matriz `PERM_DEFAULT`/`PERM_CAPS` — `app.js:6786`/`6755`; rule `temCap(cap, fallback)` — `firestore.rules:66`.
> - Segmentação — turnos `TURNOS = {1,2,3,'geral'}` (`data.js:36`); setores via `getSetores()` (`app.js:2841`). Hora-servidor: `firebase.firestore.FieldValue.serverTimestamp()`.
> - Painel "X de Y leram" — mesmo padrão `conclusoes{}` das obrigações.

---

## 0. Conceitos transversais

### 0.1 Modelo de segmentação (`segmento`)
Objeto reutilizado em comunicados E documentos institucionais:

```
segmento: {
  tipo: 'todos' | 'turno' | 'setor',
  valores: array   // [] quando 'todos'; [1|2|3|'geral'] quando 'turno'; ['Produção', ...] quando 'setor'
}
```

- `tipo:'todos'` → todo colaborador autenticado vê.
- `tipo:'turno'` → vê quem tem `users/{uid}.turno` em `valores`.
- `tipo:'setor'` → vê quem tem `users/{uid}.setor` em `valores`.

### 0.1.1 **[CORREÇÃO 1 · P1 — BLOQUEANTE] Vocabulário canônico de TURNO**
Há descasamento entre o vocabulário de turno da UI (Matutino/Vespertino/Noturno, strings) e o do schema/dados. **Verificado no pipeline-rh:** `_scratch/fix-popular-turno.mjs` grava `turno` em `funcionarios` como **número `1|2|3` ou a string `'geral'`** (ex.: `f-122 → 1`, `f-212 → 'geral'`). O schema `TURNOS={1,2,3,'geral'}` (`data.js:36`) é, portanto, a **fonte canônica**.

**Decisão — UM mapa canônico único, usado nos 3 lugares (composer, schema, `casaSegmento`):**

| Valor canônico (gravado em `segmento.valores` e `users.turno`) | Rótulo de UI (apenas exibição) |
|---|---|
| `1` (número) | Matutino / 1º turno |
| `2` (número) | Vespertino / 2º turno |
| `3` (número) | Noturno / 3º turno |
| `'geral'` (string) | Geral / Administrativo |

Regras de implementação obrigatórias:
1. `segmento.valores` para `tipo:'turno'` SEMPRE armazena os valores canônicos (`1|2|3` numéricos, `'geral'` string) — **nunca** "Matutino"/"Noturno".
2. O composer (UI) exibe os rótulos mas grava o canônico. Conversão UI→schema centralizada num único helper (`turnoCanonico(rotulo)` / `rotuloTurno(valor)`), reusando `TURNOS` de `data.js`.
3. `users/{uid}.turno` é denormalizado **com o mesmo tipo** que `funcionarios.turno` (número ou `'geral'`). Sem coerção de tipo no caminho — número casa com número.
4. Documentar a conversão no `WKRADAR-PLAYBOOK.md`. Sem este mapa único, a rule de segmentação por turno **nunca casa**.

### 0.2 "X de Y leram" / confirmações
- **X** = `count` da subcoleção `leituras` (ou `assinaturas`).
- **Y** = nº de funcionários ativos que casam com o `segmento` (calculado no cliente a partir de `state.funcionarios`). Guardar também `alcanceEstimado:number` no doc no momento da publicação (snapshot do Y).
- Espelho do `conclusoes{}` das obrigações: listar quem leu/assinou e quem falta.
- **[CORREÇÃO 8 · PII]** O painel cruza **nome via `state` no cliente** a partir de `funcionarioId`. NUNCA gravar nome/CPF na subcoleção. Regra-mestra do projeto respeitada (PII só em `banco-horas-saldos`).

### 0.3 Hash de anexo (reuso #29/#30)
```js
async function hashArquivo(bytes) {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
}
```
Gravar em `anexo.hashSha256`. Hash é **trilha de integridade**, não validade jurídica (ressalva N1, §B + Checklist).

### 0.4 **[P3 — casca compartilhada]** Casca única + bottom-nav
As telas Documentos e Comunicados DEVEM usar a **mesma casca** (a casca de Comunicados, mais próxima do alvo, é a base canônica). Padronizar:
- Sidebar única no desktop; **bottom-nav obrigatória no mobile (≤620px)** — nenhuma das telas implementa isso hoje e a spec a promete.
- Item de menu de cada tela gated por `can('comunicados.gerenciar')` / `can('documentos.gerenciar')`.

### 0.5 **[P4/P5/P6 — identidade e a11y]**
- **P4 (paleta):** remover o azul `#9CC4FF`/`#1F5FA5` do selo "privacidade" em Documentos (única cor fora da identidade FioPulse). Usar tokens FioPulse existentes.
- **P5 (a11y, comum às 3 telas):** overlays fecham com **ESC**; aplicar `:focus-visible`; switches padronizados como `<button role="switch" aria-checked>` (Documentos já faz; Comunicados usa `<div>` sem teclado — corrigir).
- **P6 (marca):** unificar numeração das propostas (remover o "C") e o ícone da marca entre os artefatos — adotar a Proposta recomendada (pulso) também unifica o ícone da casca.

---

## A) COMUNICADOS

Canal oficial 1→N originado no gestor (RH/admin). Roadmap #21/#22.

### A.1 Coleção `comunicados/{id}`

| Campo | Tipo | Notas |
|---|---|---|
| `titulo` | string | obrigatório, ≤ 140 chars |
| `corpo` | string | texto simples + quebras; renderizar com `escapeHtml` |
| `segmento` | map | ver §0.1 / §0.1.1 |
| `requerConfirmacao` | bool | se `true`, colaborador marca "Li e estou ciente" (gera doc em `leituras`) |
| `fixado` | bool | fixa no topo |
| `ativo` | bool | soft-delete (despublicar sem apagar histórico) |
| `anexo` | map \| null | `{ url, nome, hashSha256 }`; opcional; valida `ehUrlSegura` |
| `alcanceEstimado` | number | snapshot do Y no publicar (§0.2) |
| `autorUid` | string | `request.auth.uid` (== quem cria) |
| `autorNome` | string | denormalizado para exibição (não PII sensível) |
| `publicadoEm` | timestamp | **server**; imutável após criação |
| `editadoEm` | timestamp \| null | **server**; setado a cada edição |
| `editadoPor` | string \| null | uid |

### A.2 Subcoleção `comunicados/{id}/leituras/{uid}`
Id = uid do colaborador (1 por pessoa, self-write).

| Campo | Tipo | Notas |
|---|---|---|
| `uid` | string | == id do doc == `request.auth.uid` |
| `funcionarioId` | string | denormalizado de `users/{uid}.funcionarioId` (painel cruza nome no cliente) |
| `confirmado` | bool | `true` quando marcou ciência; senão registra visualização |
| `em` | timestamp | **server**; imutável |
| `userAgent` | string | trilha |

**[CORREÇÃO 8]** Nenhum campo de PII (nome/CPF) é denormalizado aqui.

### A.3 Funções (camada JS — `firebase.js`, expor em `window.*`)

- **`criarComunicado(dados)`** — valida `titulo`/`corpo`/`segmento`; `ehUrlSegura(anexo.url)`; computa `alcanceEstimado`; grava com `publicadoEm: serverTimestamp()`, `ativo:true` explícito, `autorUid/autorNome`. `registrarAuditoria({tipo:'comunicado', acao:'Publicou comunicado', alvo:titulo})`.
- **`editarComunicado(id, patch)`** — só `titulo`/`corpo`/`segmento`/`requerConfirmacao`/`anexo`; seta `editadoEm`/`editadoPor`. `publicadoEm`/`autorUid` não mudam. Auditoria.
- **`fixarComunicado(id, fixado)`** — flip `fixado`. Auditoria.
- **`despublicarComunicado(id)`** — `ativo=false`. Auditoria.
- **`escutarComunicados(cb)`** — `onSnapshot` ordenado `fixado desc, publicadoEm desc` (gestor vê todos; colaborador filtrado por segmento + `ativo==true`). Retorna unsubscribe.
- **`registrarLeitura(comunicadoId, {confirmar})`** — app do colaborador; `set` em `leituras/{uid}` só na 1ª vez (não sobrescreve `em`). Server-time + `userAgent`.

### A.4 Tela (casca única — §0.4)
- Item de menu gated por `can('comunicados.gerenciar')`.
- `renderComunicados`: lista cronológica reversa, **fixados no topo** com destaque; cada card mostra título, trecho, chip de segmento, e painel **"X de Y leram"** (modal com leitores/faltantes).
- Modal de composição: título, corpo (textarea), seletor de segmento (todos/turno/setor — reusa `TURNOS`/`getSetores()` com o mapa canônico de §0.1.1), toggles `fixado` e `requerConfirmacao` (como `<button role="switch">`), anexo Drive opcional.

### A.5 Critérios de aceite — Comunicados
1. Admin/RH publica em ≤ 5 cliques e aparece na lista do segmento em < 2s (onSnapshot).
2. Líder/supervisor/colaborador **não** criam/editam (sem a cap → write negado pela rule).
3. `segmento turno:[1]` (número) NÃO chega a usuário com `turno:2` — verificado pela rule de read com o vocabulário canônico de §0.1.1.
4. Fixado renderiza diferenciado e no topo.
5. Criar, editar, fixar e despublicar geram evento na Auditoria.
6. Colaborador com `requerConfirmacao` só conta no "X leram" após marcar ciência; `leituras/{uid}` tem `em` server-time e é imutável.
7. Editar não altera `publicadoEm` nem `autorUid`.
8. `publicadoEm` é server-time não falsificável (validado no create — §rules).

---

## B) DOCUMENTOS INSTITUCIONAIS

Documento publicado pelo gestor para um segmento, com assinatura/aceite N1 opcional. Espelha #29/#30, com `escopo` para conviver com o documento **pessoal** (1 funcionário, #18).

### B.1 Coleção `documentos/{id}`

| Campo | Tipo | Notas |
|---|---|---|
| `escopo` | `'institucional'` \| `'pessoal'` | institucional = sem `funcionarioId`, com `segmento`; pessoal = com `funcionarioId`, sem `segmento` |
| `funcionarioId` | string \| null | obrigatório quando `'pessoal'`; ausente quando `'institucional'` |
| `segmento` | map \| null | obrigatório quando `'institucional'`; `null` quando `'pessoal'` |
| `titulo` | string | obrigatório, ≤ 140 |
| `descricao` | string | opcional, `escapeHtml` |
| `anexo` | map | `{ url, nome, hashSha256 }`; obrigatório; valida `ehUrlSegura` |
| `versao` | number | inicia 1; incrementa em `novaVersao` |
| `exigeAssinatura` | bool | se `true`, aceite N1 obrigatório |
| `status` | `'rascunho'` \| `'publicado'` | rascunho não visível ao colaborador |
| `alcanceEstimado` | number | snapshot do Y no publicar (institucional) |
| `criadoPor` / `autorNome` | string | uid + nome |
| `criadoEm` | timestamp | **server**; imutável |
| `publicadoEm` | timestamp \| null | **server**; setado em `publicar` |
| `versaoEm` / `versaoPor` | timestamp/string | última `novaVersao` |

> Esta spec cobre o ramo `institucional`. O ramo `pessoal` reusa coleção/funções; a rule trata os dois sem mexer nas rules `self.*`.

### B.2 `documentos/{id}/assinaturas/{uid}` (aceite N1 — #30)
Id = uid do signatário. Imutável após criada.

| Campo | Tipo | Notas |
|---|---|---|
| `uid` | string | == id == `request.auth.uid` |
| `funcionarioId` | string | denormalizado (sem PII) |
| `versaoAssinada` | number | versão do doc no aceite — **deve == `documentos/{id}.versao` atual** (validado na rule, §rules) |
| `hashSha256` | string | hash do anexo assinado |
| `aceiteTexto` | string | ex.: "Li e estou de acordo" |
| `em` | timestamp | **server**; imutável |
| `userAgent` | string | trilha |

### B.3 `documentos/{id}/leituras/{uid}`
Mesma forma do §A.2 (visualização sem assinatura, para docs `exigeAssinatura=false`).

### B.4 Funções (camada JS)
- **`criarDocumentoInstitucional(dados)`** — força `escopo:'institucional'`, sem `funcionarioId`, exige `segmento` válido e `anexo` https; calcula `hashSha256`; `status:'rascunho'`, `versao:1`, `criadoEm:serverTimestamp()`. Auditoria.
- **`publicar(id)`** — `'rascunho'→'publicado'`, seta `publicadoEm`, snapshot `alcanceEstimado`. Auditoria.
- **`novaVersao(id, {url, nome, hashSha256, motivo})`** — incrementa `versao`, troca `anexo`, seta `versaoEm/versaoPor`. **Reabre assinatura pendente** (§B.5). Auditoria.
- **`registrarLeitura(docId, {confirmar})`** — igual §A.3 (subcoleção `leituras`).
- **`registrarAssinatura(docId)`** — só habilita quando a caixa "Li e estou de acordo" marcada (UI). `set` em `assinaturas/{uid}` com `versaoAssinada = doc.versao` atual, `hashSha256` do anexo atual, `em: serverTimestamp()`, `userAgent`. Dupla trilha: também `registrarAuditoria({tipo:'documento', acao:'Assinou documento (N1)', alvo:titulo+' v'+versao})`. Idempotente por versão.

### B.5 Versionamento que reabre assinatura pendente
- "Assinado" é por **versão**: em dia se existe `assinaturas/{uid}` com `versaoAssinada == documentos/{id}.versao` atual.
- `novaVersao` incrementa `versao` → assinatura antiga deixa de cobrir → colaborador volta a **pendente**. Não apagar a antiga (append-only).
- Painel "X de Y assinaram" conta só `versaoAssinada == versao`.

### B.6 Imutabilidade
- `criadoEm`, `publicadoEm`, `criadoPor`, `escopo` nunca mudam por update.
- `assinaturas/{uid}` e `leituras/{uid}`: **create-only**, sem update/delete.
- **[CORREÇÃO 4 — agora na RULE, não só JS]** Documento `publicado` com `exigeAssinatura`: `segmento` e `anexo` imutáveis por update direto. A única forma de trocar o anexo é `novaVersao`. Editar `descricao` é permitido. Esta guarda passa a viver na própria rule (§rules), não só na camada JS.

### B.7 Critérios de aceite — Documentos Institucionais
1. Admin/RH cria documento institucional com link Drive (https) e hash; rascunho não aparece para colaborador.
2. URL não-https bloqueada (`ehUrlSegura`).
3. Após `publicar`, o segmento correto vê; fora do segmento não vê (rule de read).
4. Com `exigeAssinatura`, "Assinar" só habilita após marcar a caixa; aceite cria `assinaturas/{uid}` com `versaoAssinada` (== versão atual, validado na rule) + `em` server-time, gera Auditoria, e não é editável.
5. `novaVersao` incrementa `versao` e reabre a pendência.
6. Painel "X de Y assinaram" conta só assinaturas da versão atual.
7. `escopo:'institucional'` nunca grava `funcionarioId`; tentativa com `funcionarioId` é negada pela rule.
8. **[CORREÇÃO 4]** Documento publicado com assinatura: tentar trocar `segmento`/`anexo` por update direto é negado pela rule (só `novaVersao`).
9. **[CORREÇÃO 7]** Tentar gravar `versaoAssinada` diferente da versão atual do doc pai é negado pela rule.
10. Nenhuma rule/cap de gestor/supervisor/colaborador existente regrediu.

---

## CAPABILITIES

Adicionar à matriz `PERM_CAPS` (`app.js:6755`) e às linhas de `PERM_DEFAULT` (`app.js:6786`):

```js
// PERM_CAPS — área nova
{ area: "Comunicação", caps: [
  { k: "comunicados.gerenciar", n: "Criar e gerenciar comunicados" },
  { k: "documentos.gerenciar",  n: "Publicar e gerenciar documentos institucionais" },
]},
```

`PERM_DEFAULT` (somente **adições**, mesma posição de `obrigacoes.gerenciar`):
- `rh`: `"comunicados.gerenciar": true, "documentos.gerenciar": true`
- `lider`: ambas `false`
- `supervisor`: ambas `false`
- `colaborador`: ambas `false`
- `admin` — não entra na matriz (`can()` retorna `true` sempre).

**EXPLÍCITO:** estas são as únicas mudanças na matriz. Nenhuma capability existente muda de valor. Gestor/supervisor/líder só ganham `false` nas duas caps novas (documentado, não funcional). `can()`/`permEfetivo()` não mudam de lógica — só leem as chaves novas.

---

## REGRAS FIRESTORE (apenas ADIÇÕES)

Inserir **novos blocos `match`**, sem tocar nos existentes. Helpers reutilizados: `isAuthed()`, `isAdmin()`, `isRH()`, `isColaborador()`, `userDoc()`, `temCap(cap, fallback)`, `meuFuncionarioId()`.

### Helper de segmentação (novo)
**[CORREÇÃO 2]** `userDoc()` cacheado com `let` (a sintaxe de rules permite) — reduz de até 2 `get()` por avaliação para 1. **[CORREÇÃO 3]** Endurecer checagem de tipo (`is string`/`is number`), espelhando o cuidado de `meuFuncionarioId` com `funcionarioId is string` (linha 33) — evita `hasAny([null])` com comportamento inesperado quando o campo existe mas é `null`.

```
// Colaborador casa com o segmento? 'todos' sempre; 'turno' por users.turno;
// 'setor' por users.setor denormalizado (ausente/null/tipo errado => false, fail-safe).
function casaSegmento(seg) {
  // cache de userDoc() — 1 get por avaliação
  return seg.tipo == 'todos'
    || (seg.tipo == 'turno'
        && casaTurno(seg, userDoc()))
    || (seg.tipo == 'setor'
        && casaSetor(seg, userDoc()));
}
function casaTurno(seg, u) {
  // turno canônico: number 1|2|3 OU string 'geral' (ver §0.1.1)
  return ('turno' in u)
      && (u.turno is number || u.turno is string)
      && seg.valores.hasAny([u.turno]);
}
function casaSetor(seg, u) {
  return ('setor' in u)
      && u.setor is string
      && seg.valores.hasAny([u.setor]);
}
```
> Observação sobre cache: rules não permitem `let` no corpo de uma `function` que faz `return` direto; por isso o padrão é extrair `casaTurno`/`casaSetor` recebendo `u = userDoc()` como argumento — `userDoc()` é avaliado uma vez na chamada e reusado no helper. Isso atende ao objetivo da CORREÇÃO 2 (1 get por avaliação) dentro da semântica da CEL.

### Comunicados
```
match /comunicados/{id} {
  allow read: if isAdmin() || temCap('comunicados.gerenciar', isRH())
              || (isColaborador()
                  && resource.data.ativo == true
                  && casaSegmento(resource.data.segmento));

  // [CORREÇÃO 5] publicadoEm forçado a server-time no create; ativo definido.
  allow create: if (isAdmin() || temCap('comunicados.gerenciar', isRH()))
                && request.resource.data.autorUid == request.auth.uid
                && request.resource.data.publicadoEm == request.time
                && request.resource.data.ativo is bool;

  allow update: if (isAdmin() || temCap('comunicados.gerenciar', isRH()))
                && request.resource.data.publicadoEm == resource.data.publicadoEm
                && request.resource.data.autorUid == resource.data.autorUid;

  allow delete: if isAdmin();  // soft-delete (ativo=false) é o caminho normal

  match /leituras/{uid} {
    allow read: if isAdmin() || temCap('comunicados.gerenciar', isRH())
                || (isAuthed() && request.auth.uid == uid);
    // [CORREÇÃO 6] amarra a leitura ao segmento do pai (não infla X/Y com quem não vê o doc).
    allow create: if isAuthed()
                && request.auth.uid == uid
                && request.resource.data.uid == uid
                && (isAdmin() || temCap('comunicados.gerenciar', isRH())
                    || casaSegmento(get(/databases/$(database)/documents/comunicados/$(id)).data.segmento));
    allow update, delete: if false;
  }
}
```

### Documentos (institucional + pessoal coexistindo)
```
match /documentos/{id} {
  allow read: if isAdmin() || temCap('documentos.gerenciar', isRH())
    || (isColaborador() && resource.data.status == 'publicado' && (
         (resource.data.escopo == 'institucional' && casaSegmento(resource.data.segmento))
         || (resource.data.escopo == 'pessoal' && resource.data.funcionarioId == meuFuncionarioId())
       ));

  allow create: if (isAdmin() || temCap('documentos.gerenciar', isRH()))
    && request.resource.data.criadoPor == request.auth.uid
    && request.resource.data.criadoEm == request.time   // server-time no create
    && (
      (request.resource.data.escopo == 'institucional'
        && !('funcionarioId' in request.resource.data))
      || (request.resource.data.escopo == 'pessoal'
        && request.resource.data.funcionarioId is string)
    );

  // [CORREÇÃO 4] segmento/anexo imutáveis em doc publicado com assinatura — na própria rule.
  allow update: if (isAdmin() || temCap('documentos.gerenciar', isRH()))
    && request.resource.data.criadoEm == resource.data.criadoEm
    && request.resource.data.criadoPor == resource.data.criadoPor
    && request.resource.data.escopo == resource.data.escopo
    && (
      // só trava quando já publicado E exige assinatura; novaVersao usa essa mesma rule
      // e SÓ é permitida porque troca anexo junto com incremento de versao (ver guarda abaixo)
      !(resource.data.status == 'publicado' && resource.data.exigeAssinatura == true)
      || (
        request.resource.data.segmento == resource.data.segmento
        && (
          // anexo imutável, EXCETO quando é uma novaVersao (versao incrementa)
          request.resource.data.anexo == resource.data.anexo
          || request.resource.data.versao == resource.data.versao + 1
        )
      )
    );

  allow delete: if isAdmin();

  match /assinaturas/{uid} {
    allow read: if isAdmin() || temCap('documentos.gerenciar', isRH())
                || (isAuthed() && request.auth.uid == uid);
    // [CORREÇÃO 7] versaoAssinada == versao atual do doc pai (idempotência/reabrir na rule).
    // [CORREÇÃO 6] amarra ao segmento/dono do pai.
    allow create: if isAuthed()
                && request.auth.uid == uid
                && request.resource.data.uid == uid
                && request.resource.data.versaoAssinada is number
                && request.resource.data.versaoAssinada
                     == get(/databases/$(database)/documents/documentos/$(id)).data.versao
                && (isAdmin() || temCap('documentos.gerenciar', isRH())
                    || podeVerDoc(get(/databases/$(database)/documents/documentos/$(id)).data));
    allow update, delete: if false;
  }

  match /leituras/{uid} {
    allow read: if isAdmin() || temCap('documentos.gerenciar', isRH())
                || (isAuthed() && request.auth.uid == uid);
    allow create: if isAuthed() && request.auth.uid == uid
                && request.resource.data.uid == uid
                && (isAdmin() || temCap('documentos.gerenciar', isRH())
                    || podeVerDoc(get(/databases/$(database)/documents/documentos/$(id)).data));
    allow update, delete: if false;
  }
}

// helper auxiliar para subcoleções (institucional por segmento OU pessoal por dono)
function podeVerDoc(d) {
  return (d.escopo == 'institucional' && casaSegmento(d.segmento))
      || (d.escopo == 'pessoal' && d.funcionarioId == meuFuncionarioId());
}
```

> **Custo:** as guardas de `get()` em subcoleção (CORREÇÕES 6/7) adicionam 1 read por create de leitura/assinatura. É aceitável porque create é evento raro (1 por colaborador por doc), ao contrário do read de `comunicados` que roda por documento em list — por isso o cache de `userDoc()` (CORREÇÃO 2) é o que importa para custo de list.

### Nota de segurança da rule de read
- Colaborador fora do segmento → read negado (`turno:[1]` não chega a `turno:2`).
- `setor`/`turno` dependem de `users/{uid}.setor`/`.turno` denormalizados (ausência/null/tipo errado = nega, fail-safe — CORREÇÃO 3).
- **[CORREÇÃO 6]** Subcoleções `leituras`/`assinaturas` só aceitam create de quem realmente vê o doc pai → não infla X/Y.
- Auditoria permanece na coleção `/auditoria` existente (imutável), sem alteração.

### Resumo do que muda em `firestore.rules`
- **Novos helpers** `casaSegmento`/`casaTurno`/`casaSetor`/`podeVerDoc`. Nenhum helper existente alterado.
- **Novo `match /comunicados/{id}`** + `leituras/{uid}` (read segmentado; write gated; `publicadoEm` server-time no create e imutável no update; create de leitura amarrado ao segmento; append-only).
- **Novo `match /documentos/{id}`** + `assinaturas/{uid}` e `leituras/{uid}` (read institucional segmentado / pessoal por dono SELF; write gated; `escopo`/`criadoEm`/`criadoPor` imutáveis; `segmento`/`anexo` imutáveis em doc publicado com assinatura exceto via `novaVersao`; `versaoAssinada == versao` atual; subcoleções amarradas ao pai; append-only).
- **Pré-requisito de dados (CORREÇÃO 9 · P7):** ver §"Pré-requisito de dados" abaixo.
- **Nada mais muda.** Todos os blocos atuais permanecem byte-idênticos.

---

## PRÉ-REQUISITO DE DADOS — **[CORREÇÃO 9 · P7] (verificado no pipeline)**

**Achado verificado neste repo (`C:\fiobras-pipeline-rh`):**
- `upload-to-firestore.mjs` escreve `setor` apenas em `funcionarios` (linha 149: `setor: primary.departamento || null`) e em `banco-horas` (linha 305). **Não escreve em `users`.**
- `sync-colaborador-users.mjs` é quem cria/atualiza `users/{uid}` (linhas 166–169) e grava **somente**: `role, funcionarioId, codigo, nome, ativo, precisaTrocarSenha, criadoEm, criadoPor`. **NÃO grava `setor` nem `turno`.**
- `turno` (canônico `1|2|3|'geral'`) vive em `funcionarios` (`_scratch/fix-popular-turno.mjs`), **não em `users`**.

**Conclusão:** hoje a segmentação por `setor` E por `turno` nasce quebrada na rule — `users/{uid}` não tem nenhum dos dois campos. Antes de prometer a segmentação:

1. **Alterar `sync-colaborador-users.mjs`** para denormalizar, no `set` de `users/{uid}` (criação E nos `set({merge:true})` de reativação), os campos espelhados de `funcionarios`:
   - `setor: f.departamento || null`
   - `turno: f.turno ?? null` (preservando o tipo canônico — número ou `'geral'`, §0.1.1)
   - Manter a regra LGPD: **só esses dois campos não-PII**; nada de CPF/PIS/nascimento em `users` (já é a política do script, linha 24).
2. Backfill único (script scratch, lê só `funcionarios` + `users` por id — sem varredura de disco) para popular os `users` já existentes.
3. **Registrar no `HISTORICO-DECISOES.md`** (o quê + porquê: segmentação por setor/turno exige denormalização em `users`) e **no `WKRADAR-PLAYBOOK.md`** a nova dependência `users/{uid}.setor`/`.turno` e o mapa canônico de turno (§0.1.1) — conforme diretrizes permanentes do projeto.

Sem o passo 1+2, os critérios A.5.3, B.7.3 e qualquer segmento ≠ `'todos'` falham (fail-safe nega tudo).

---

## Checklist de implementação (ordem sugerida)
1. **[P7/CORREÇÃO 9]** Pré-req de dados PRIMEIRO: alterar `sync-colaborador-users.mjs` para gravar `users/{uid}.setor` e `.turno` (canônico); backfill; registrar no PLAYBOOK + HISTÓRICO. Sem isso, segmento ≠ 'todos' nega.
2. **[P1]** Fixar o mapa canônico de turno (§0.1.1) e o helper único de conversão UI↔schema; usar em composer, schema e `casaSegmento`.
3. **Rules:** adicionar helpers (`casaSegmento`/`casaTurno`/`casaSetor`/`podeVerDoc`) + os 2 blocos `match` com as guardas das CORREÇÕES 4/5/6/7. Deploy e testar leitura cruzada de turno e tentativa de troca de segmento em doc assinado.
4. **Capabilities:** 2 chaves novas em `PERM_CAPS` + `PERM_DEFAULT` (rh=true, demais=false).
5. **Camada JS (`firebase.js`):** funções de §A.3 e §B.4, todas chamando `registrarAuditoria` e usando `serverTimestamp()`/`ehUrlSegura`/`crypto.subtle`. Painel cruza nome via `state` (nunca grava PII na subcoleção — CORREÇÃO 8).
6. **Telas (`app.js`):** casca única + bottom-nav (P3); `renderComunicados` + `renderDocumentosInstitucionais`; a11y ESC/`:focus-visible`/switches `role="switch"` (P5); remover azul fora-de-paleta (P4); unificar marca/ícone (P6); painel "X de Y".

> **Ressalva N1 (manter no texto da tela e no PLAYBOOK):** a assinatura é "aceite com trilha" (uid + data/hora-servidor + userAgent + hash do anexo + log imutável), **não validade jurídica plena**; IP confiável não vem do cliente.