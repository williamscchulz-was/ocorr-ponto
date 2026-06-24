# Fase 1 — Fundação SELF (Portal do Colaborador)

> Plano de implementação para aprovação do dono. NÃO implementar antes do OK.
> Regra inviolável: **zero regressão para o gestor** (admin / RH / líder / supervisor).
> Deploy de Firestore rules **só com autorização explícita do dono** e **só com Emulator verde**.
>
> Itens do roadmap cobertos: #1 (papel `colaborador` + escopo SELF), #11 (vínculo
> uid↔funcionarioId), #2/#12 (endurecer rules de `funcionarios` e `users`).

---

## 1. Objetivo e risco

**Objetivo.** Trazer o 4º papel (`colaborador`) "de verdade" para o motor data-driven de
permissões e fechar o vazamento de PII que se abriria no instante em que o primeiro
colaborador REAL autenticar. Três peças acopladas:

1. **#1 — Papel `colaborador` + escopo SELF.** Adicionar o papel ao `PERM_CAPS` /
   `PERM_DEFAULT` / `can()` e dar a ele a noção de "só os próprios dados".
2. **#11 — Vínculo uid↔funcionarioId.** Ler `funcionarioId` (= `'f-'+codigo`) e `codigo`
   de `users/{uid}` no `onAuthStateChanged`. É o elo que responde "qual funcionário sou eu".
3. **#2/#12 — Endurecer as rules de `funcionarios` e `users`.** Hoje QUALQUER autenticado
   lê as duas coleções inteiras (necessário ao chat/diretório dos gestores). Com colaborador
   logado isso vaza dados de todos.

**Risco nº 1 (o coração deste plano).** Endurecer as rules de `funcionarios`/`users` é a
mudança mais arriscada e menos visível, e mexe num app **já em produção** (RH + 3 líderes).
O dado mais crítico é `nascimento` em `funcionarios`: é a **semente da senha inicial
(DDMMAAAA)** de toda a base no plano de login por CPF. Um colaborador logado, com as rules de
hoje, leria a base inteira de nascimentos e derivaria a senha de qualquer colega.

**Estado atual = nada vaza HOJE.** O papel `colaborador` só existe em **modo prévia sintético**
(usuário em memória, sem Firebase Auth) e `renderApp` faz **early-return** em `app.js:896`
(`if (u.role === "colaborador") return renderPortalColaborador(u)`) antes de qualquer leitura
ampla. O vazamento é **potencial**: materializa-se no 1º colaborador REAL autenticar (login
CPF, fatia posterior). Isso nos dá uma **janela operacional segura** — dá para deployar código
e até as rules endurecidas ANTES de existir qualquer colaborador logado.

---

## 2. Diagnóstico

### 2.1 O que vaza (no instante em que um colaborador real logar)

- **`funcionarios` INTEIRA** — `firestore.rules:88-89` `allow read: if isAuthed();`. Campos
  sensíveis no doc: `nascimento` (semente da senha), `aniversarioDia/Mes`, `admissao`,
  `demissao`, `turno`, `setor`, `cargo`, `sexo`, `escolaridade`, `naturalidade`, `ativo`.
- **`users` INTEIRA** — `firestore.rules:76-79` `allow read: if isAuthed();`. Expõe o
  organograma de papéis/turnos, e-mails dos gestores, `funcionariosVisiveis` (o escopo de cada
  supervisor — quem-vê-quem), `fotoBase64`, e na Fase 1 `funcionarioId/codigo/precisaTrocarSenha/ativo`.
- **Carga que materializa o vazamento** — `firebase.js:1973-1974`
  (`db.collection("funcionarios").get()` → `state.funcionarios` inteiro) e
  `firebase.js:2193-2195` (`db.collection("users").get()` → `state.users` inteiro). Ambos
  rodam em `carregarDadosCompletos` para QUALQUER role autenticado, **sem ramificação**.
- **Vazamento lateral em `config`** — `firestore.rules:66-67` `match /config/{doc}
  { allow read: if isAuthed(); }`. Curinga: qualquer autenticado lê TODO doc de config,
  inclusive `/config/permissoes` (matriz inteira) e qualquer futuro doc com PII.

### 2.2 O que NÃO vaza hoje a colaborador (manter assim)

- `banco-horas-saldos` (CPF/PIS) — `firestore.rules:215-217` read só admin/RH.
- `banco-horas` / `pipeline-rh` — `firestore.rules:221-230` read só admin/RH.
- `pj` (`:127-131`), `auditoria` (`:135-142`) — gated por cap, fallback RH; colaborador cai em false.
- `ocorrencias` (`:181` via `podeVerOcorrencia`) — admin/RH/líder-do-turno/supervisor;
  colaborador NÃO se encaixa → hoje receberia **permission-denied**, o que travaria a tela
  "Minhas Ocorrências" se não houver ramo self (por isso a rule de ocorrencias ganha OR self).

### 2.3 O que DEPENDE de leitura ampla (não pode quebrar)

- **CHAT / diretório (motivo nº1 da leitura ampla de `users`)** — `firebase.js:2189-2195`
  carrega `state.users` completo; `renderChatLista` (`app.js:7334-7345`) e `getUser`
  (`app.js:55`) resolvem nome/foto de contatos e remetentes. Restringir `users` sem manter o
  gestor lendo amplo **quebra o chat dos 4 papéis de gestor**.
- **Aniversariantes** — `renderAniversariantesWidget` (`app.js:1545-1573`) e toast
  (`app.js:916-919`) varrem `state.funcionarios` inteiro. Só gestor (early-return protege colab).
- **Demografia / ranking (admin)** — `app.js:1579-1616` agregam idade/sexo/etc. de
  `state.funcionarios` inteiro.
- **Diretório de funcionários** — `renderFuncionarios` (`app.js:2491`) e
  `funcionariosVisiveisPara` (`app.js:1528`); o filtro por papel é **client-side** hoje (a rule
  não restringe). Gestor precisa continuar lendo amplo.
- **Banco de horas JÁ ramificado por role** — `firebase.js:2008-2064`: admin/RH lê
  `pipeline-rh/cur`; líder lê `bancoHoras .where(funcionarioTurno==turno)`; supervisor lê amplo.
  **É o molde exato do ramo `colaborador`** em `carregarDadosCompletos`.

### 2.4 Helpers de rule atuais (e o que falta)

Existem: `userDoc()`, `isAuthed()`, `isAdmin()`, `isRH()`, `isLider()`, `isSupervisor()`,
`supervisorVe(funcId)` (`:26-30` — único precedente de escopo por funcionário; molde direto de
`euSouODono`), `liderDoMesmoTurno()`, `podeVerOcorrencia()`, `permDoc()`, `temCap()`.
**Faltam (a criar):** `isColaborador()`, `meuFuncionarioId()`, `euSouODono(funcId)`.

---

## 3. Mudanças por arquivo (pseudodiff)

> Convenção: `// ANTES` mostra o código de produção; `// DEPOIS` a mudança proposta.
> Toda mudança de RULES é a parte arriscada e só vai a produção no Passo 3 (seção 7).

### 3.1 `docs/firestore.rules`

**(a) Novos helpers** (após `liderDoMesmoTurno`, ~`:33`). Custo: todo helper começa por
`isColaborador()`, que curto-circuita — para gestor o ramo colaborador para no 1º termo, zero
`get()` novo no caminho do gestor.

```
// DEPOIS (adicionar):
function isColaborador() {
  return isAuthed() && userDoc().role == 'colaborador';
}
function meuFuncionarioId() {
  // funcionarioId == 'f-'+codigo, gravado na criação da conta (#5/#11).
  // Sem vínculo => '' (nunca casa com id real => leitura negada = fail-safe).
  return isColaborador() && 'funcionarioId' in userDoc()
    ? userDoc().funcionarioId
    : '';
}
function euSouODono(funcId) {
  // Molde EXATO de supervisorVe: troca 'na lista' por 'é o meu id'.
  return isColaborador()
    && funcId is string
    && meuFuncionarioId() != ''
    && meuFuncionarioId() == funcId;
}
```

**(b) `funcionarios` read** (`:88-89`) — gestor INALTERADO; só ADICIONA OR self.

```
// ANTES:
match /funcionarios/{id} {
  allow read: if isAuthed();   // qualquer autenticado lia TODOS — vaza nascimento
  ...
}
// DEPOIS:
match /funcionarios/{id} {
  allow read: if isAdmin() || isRH() || isLider() || isSupervisor()  // gestor: amplo, byte-a-byte
             || euSouODono(id);                                       // colaborador: SÓ o próprio
  allow create, update, delete: if isAdmin() || temCap('func.editar', isRH());  // inalterado
}
```

Por que NÃO `isAuthed() || euSouODono(id)`: manter `isAuthed()` no read deixaria o colaborador
lendo tudo (não fecha o leak). Por isso TROCAMOS `isAuthed()` pela enumeração explícita dos 4
papéis de gestor + `euSouODono`.

**(c) `users` read + self-update ampliado** (`:76-85`).

```
// ANTES:
match /users/{uid} {
  allow read: if isAuthed();   // qualquer autenticado lia TODOS — vaza organograma/e-mails
  allow create, delete: if isAdmin() || temCap('sistema.usuarios', false);
  allow update: if isAdmin() || temCap('sistema.usuarios', false) || (
    request.auth.uid == uid &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['fotoBase64'])
  );
}
// DEPOIS:
match /users/{uid} {
  allow read: if isAdmin() || isRH() || isLider() || isSupervisor()  // gestor: diretório do chat
             || request.auth.uid == uid;                              // qualquer um: só o PRÓPRIO
  allow create, delete: if isAdmin() || temCap('sistema.usuarios', false);  // inalterado
  allow update: if isAdmin() || temCap('sistema.usuarios', false) || (
    request.auth.uid == uid &&
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['fotoBase64', 'precisaTrocarSenha'])                  // #7: amplia allowlist self
    && (
      !('precisaTrocarSenha' in request.resource.data.diff(resource.data).affectedKeys())
      || request.resource.data.precisaTrocarSenha == false           // colaborador só DESLIGA a flag
    )
  );
}
```

Nota crítica de não-regressão: `request.auth.uid == uid` cobre TODO usuário lendo o **próprio**
doc — é o que sustenta `userDoc()`/`isAdmin()`/`isRH()`/`supervisorVe()`/`liderDoMesmoTurno()`
(todos dependem de `get(users/{uid})` do próprio). Não há recursão: ler o próprio doc não exige
outro `userDoc()`. Logo restringir `users` NÃO quebra a resolução de papel nem o
`funcionariosVisiveis` do supervisor. O self-update de `fotoBase64` do gestor segue idêntico;
`hasOnly` barra qualquer tentativa de tocar `role/turno/ativo/funcionarioId/codigo`.

**(d) `ocorrencias` read — OR self** (`podeVerOcorrencia`, `:36-40`). Mínimo necessário para a
tela "Minhas Ocorrências" (fatia #13) não tomar permission-denied; read self é inócuo sem
consumidor, então entra já para evitar 2º deploy de rules.

```
// ANTES:
function podeVerOcorrencia(doc) {
  return isAdmin() || isRH()
    || liderDoMesmoTurno(doc.funcionarioTurno)
    || isSupervisor();
}
// DEPOIS:
function podeVerOcorrencia(doc) {
  return isAdmin() || isRH()
    || liderDoMesmoTurno(doc.funcionarioTurno)
    || isSupervisor()
    || euSouODono(doc.funcionarioId);   // colaborador: só as próprias
}
```

`allow update/delete` de ocorrencias e os helpers `rhEditaObs`/`rhLanca`/
`podeConferirOuAtualizarObs` **NÃO mudam** (colaborador é read-only nesta fatia e na próxima).

**(e) `config/{doc}` — opcional no mesmo deploy (decisão do dono).** Fecha o leak da matriz
`/config/permissoes` ao colaborador. Baixo risco (colaborador cai no `PERM_DEFAULT`, não
precisa ler a matriz). Match específico ANTES do curinga; curinga deixa de ser `isAuthed()`:

```
// DEPOIS (opcional):
match /config/permissoes {
  allow read: if isAdmin() || isRH() || isLider() || isSupervisor();
  allow write: if isAdmin();
}
match /config/{doc} {
  allow read: if isAdmin() || isRH() || isLider() || isSupervisor();
  allow write: if isAdmin();
}
```

`/config/diretorioGH` (sem PII) é **DISPENSÁVEL nesta fatia** (ver §8 / dívidas): o colaborador
não tem chat aqui e o gestor continua lendo `users` amplo. Criar diretorioGH agora seria
superfície de risco sem consumidor. Desenho pronto registrado como dívida da fatia "Chat do
colaborador".

**Não mudam nesta fatia:** `presence` (`:144-152` — `role in ['admin','rh','lider','supervisor']`
já nega colaborador no write; read endurecido fica como dívida menor), `auditoria`,
`banco-horas-*`, `pipeline-rh`, `tipos`, `acoes`, `obrigacoes`, `pj`, `mensagens`.

### 3.2 `public/firebase.js`

**(a) `onAuthStateChanged` (`:1925-1942`)** — LER (nunca escrever) os campos novos + checar `ativo`.

```
// DEPOIS — logo após obter userData (~:1925), ANTES de montar userInState:
if (userData.ativo === false) {                 // ausência = ativo (regressão zero p/ gestor)
  $("#login-error").textContent = "Acesso desativado. Procure o GH.";
  $("#login-error").classList.remove("hidden");
  window.__forcarLoginGestor = true;
  await auth.signOut();
  return;                                        // espelha o tratamento de perfil inexistente (:1915-1923)
}
const userInState = {
  id: fbUser.uid, nome: userData.nome, email: fbUser.email,
  role: userData.role, turno: userData.turno || null,
  funcionariosVisiveis: userData.funcionariosVisiveis || [],
  fotoBase64: userData.fotoBase64 || null,
  funcionarioId: userData.funcionarioId || null,         // #11 (novo)
  codigo: userData.codigo || null,                       // #11 (novo)
  precisaTrocarSenha: userData.precisaTrocarSenha === true, // entra p/ #6/#7
};
```

**(b) Não ligar presence/chat para colaborador** (`:1952-1957`):

```
// DEPOIS:
if (userInState.role !== "colaborador") {
  iniciarPresenca().catch((e) => debug?.("[Presence] init falhou:", e));
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  try { chatUnsub = window.escutarMinhasMensagens(); } catch (e) { debug?.("[chat] init falhou:", e); }
}
```

**(c) `carregarDadosCompletos` (`:1969`) — ramo self ANTES dos `.get()` amplos.** Molde exato:
o bloco de banco de horas (`:2008-2064`). O colaborador carrega APENAS o próprio doc de
funcionário, com fail-safe que NÃO trava a tela; nunca roda `.collection().get()` amplo de
`funcionarios` (`:1973`) nem de `users` (`:2194`); não carrega pj/pipeline-rh/bancoHoras de
gestor; não abre o onSnapshot amplo de ocorrencias (`:2091` — o listener self é fatia #13).

```
// DEPOIS — no TOPO de carregarDadosCompletos, logo após `const u = currentUser();`:
if (u.role === "colaborador") {
  state.funcionarios = [];
  try {
    if (u.funcionarioId) {
      const meu = await db.collection("funcionarios").doc(u.funcionarioId).get();
      if (meu.exists) state.funcionarios = [{ id: meu.id, ...meu.data() }];
    }
  } catch (e) { debug?.("[self] func próprio:", e?.message || e); /* fail-safe: tela não trava */ }
  state.tiposCustom = []; state.acoesCustom = []; state.obrigacoes = [];
  state.bancoHoras = {}; state.pjs = []; state.ocorrencias = [];
  state.ocorrenciasProntas = true;            // sem skeleton preso (listener self vem em #13)
  state.users = [currentUser()];              // só o próprio (já populado no onAuth)
  state.permissoes = state.permissoes || null; // cai no PERM_DEFAULT
  return;                                      // NÃO segue para os .get() amplos
}
// ... daqui pra baixo, fluxo do gestor INALTERADO ...
```

### 3.3 `public/app.js`

**(a) `PERM_CAPS` (`:6577-6611`)** — nova área "Portal" após "Sistema":

```
{ area: "Portal", caps: [
  { k: "self.ver", n: "Ver os próprios dados (ponto, banco de horas, documentos)" },
  { k: "self.assinar", n: "Assinar documentos próprios (aceite N1)" },
  { k: "etica.enviar", n: "Abrir o canal de ética/denúncia" },
]},
```

São caps NOVAS e exclusivas do colaborador (sem `scoped`; o escopo SELF é resolvido por
query+rule, não é "turno"/"atrib"). Para os 4 papéis de gestor aparecem desligadas e inofensivas.

**(b) `PERM_DEFAULT` (`:6615-6640`)** — 4º bloco após `supervisor` (todas as caps de gestor
explicitamente `false`, as 3 caps self `true`):

```
colaborador: {
  "ocorrencias.ver": false, "ocorrencias.criar": false, "ocorrencias.conferir": false,
  "ocorrencias.lancar": false, "ocorrencias.editarTudo": false, "ocorrencias.excluir": false,
  "bancoHoras.ver": false, "bancoHoras.importar": false,
  "pj.ver": false, "pj.editar": false, "pj.reajuste": false, "pj.excluir": false,
  "func.ver": false, "func.editar": false, "func.dadosSensiveis": false,
  "auditoria.ver": false, "obrigacoes.gerenciar": false,
  "sistema.config": false, "sistema.usuarios": false,
  "self.ver": true, "self.assinar": true, "etica.enviar": true,
},
```

Por que listar tudo `false` em vez de confiar no fallback: documenta a intenção, deixa a matriz
coerente e impede que um override acidental ligue cap de gestor. (Sem bloco, `can()` já
retornaria `false` — seguro —, mas explícito é melhor.)

**(c) `ACCESS_PREVIEW` (`:6673-6678`)** — senão a tela de permissões mostra preview vazio:

```
colaborador: ["Vê só os próprios dados", "Assina documentos próprios", "Sem acesso a dados de colegas"],
```

**(d) `podeVerFuncionario` (`:1496-1502`)** — ramo self ANTES do `return false`:

```
// DEPOIS (antes do return false final):
if (u.role === "colaborador") return f.id === u.funcionarioId;
return false;
```

**(e) `podeVerOcorrenciaUI` (`:1504-1514`)** — ramo self LOGO NO INÍCIO, **antes** do
`can("ocorrencias.ver")` (linha 1506): como `colaborador` tem `ocorrencias.ver = false`, o
`can()` barraria antes de qualquer ramo self.

```
// DEPOIS (1ª linha útil da função, antes do can()):
if (u.role === "colaborador") return o.funcionarioId === u.funcionarioId;
if (!can("ocorrencias.ver", u)) return false;
...
```

**Já prontos (reaproveitar, NÃO recriar):** `roleLabel` já trata `colaborador` (`:386`);
`renderApp` já faz early-return (`:896`); `can()` já retorna `false` para role sem caps
(`:6654`); `getUser`/`currentUser` (`:55-57`) passam a carregar `funcionarioId/codigo`
automaticamente (vêm em `state.users[0]`). Opcional cosmético: registrar rotas `colab-*` em
`_SKEL_PAGES` (`:1442`) e dar `funcionarioId` ao preview user (`:641-657`).

### 3.4 `users/{uid}` (modelo do doc — schema do vínculo)

> Nenhum desses campos é **gravado pelo app nesta fatia** (o onboarding em lote é #5). Aqui só
> se LÊ `funcionarioId/codigo/ativo` no `onAuthStateChanged`. `role/turno` já existem;
> `setor/cargo` vivem em `funcionarios` — não duplicar.

| Campo | Tipo | Quem grava | Quem lê / efeito |
|---|---|---|---|
| `funcionarioId` | string `'f-'+codigo` | onboarding em lote (#5) | `onAuthStateChanged` (#11). Único ponto de verdade do escopo SELF. |
| `codigo` | string (matrícula) | onboarding (#5) | deriva `banco-horas-self/{codigo}` numa fatia futura (#14). |
| `ativo` | boolean | onboarding / pipeline diário | `onAuthStateChanged` bloqueia entrada de inativo. **Ausência = ativo** (`ativo !== false`) → regressão zero p/ gestores atuais. |
| `precisaTrocarSenha` | boolean (opcional) | onboarding (true) / reset admin | lido no boot; o colaborador zera (false) via self-update. Liga modal em #6/#7. |

---

## 4. Modelo de dados do vínculo + papel

**Vínculo (escopo SELF).** O `funcionarioId` em `users/{uid}` é o ÚNICO ponto de verdade de
"qual funcionário sou eu" — espelha o `funcionariosVisiveis` do supervisor, mas singular. A rule
`euSouODono(funcId)` compara `funcId == userDoc().funcionarioId` (molde de `supervisorVe`, que
faz `hasAny` numa lista). Fail-safe: vínculo ausente ⇒ `meuFuncionarioId() == ''` ⇒ nunca casa
com id real ⇒ leitura negada (defesa em profundidade).

**`can()` NÃO ganha lógica nova.** Continua respondendo só "o papel TEM a cap?" via
`permEfetivo`. Com o bloco `colaborador` no `PERM_DEFAULT`: `can('self.ver') == true`,
`can('ocorrencias.*') == false` automaticamente; role desconhecido segue `false` (`:6654`).

**O escopo SELF ("sobre quem") é resolvido em DOIS lugares, NUNCA dentro do `can()`:**
1. **Filtro de query** em `carregarDadosCompletos` — colaborador carrega só
   `funcionarios/{u.funcionarioId}` (e, em #13, `ocorrencias.where('funcionarioId','==',...)`).
2. **Firestore rules** — `funcionarios` read gestor-amplo OR `euSouODono(id)`; `ocorrencias`
   read `podeVerOcorrencia` OR self.

Regra de ouro: `can()` = "tem a capacidade"; o "sobre quem" fica em **query + rule + podeVer\***.

---

## 5. PII e LGPD

**Dado mais crítico = `nascimento` em `funcionarios`** — semente da senha inicial DDMMAAAA de
toda a base no plano de login por CPF. A rule nova (read self via `euSouODono`) elimina o leak:
o colaborador só lê o **próprio** doc (vê o próprio nascimento, que já sabe), nunca o de
terceiros. Minimização adicional: o colaborador nem trafega a base (carga ramificada).

**O que o colaborador NUNCA lê:** nascimento/admissão/demissão/turno/setor/cargo/sexo/
escolaridade/naturalidade de **terceiros** (rule `funcionarios` self); **CPF/PIS de ninguém**
(`banco-horas-saldos` read admin/RH fixo — nem o próprio CPF, decisão explícita do dono);
organograma de papéis/turnos e e-mails dos gestores (rule `users` self); a matriz
`/config/permissoes` (fechar junto, opcional).

**Princípios LGPD atendidos:** (1) **minimização** — colaborador só acessa o próprio doc;
(2) **finalidade** — leitura ampla permanece só para os 4 papéis de gestor, que têm base legal
de gestão de pessoas; (3) **defesa em profundidade** — vínculo ausente ⇒ leitura negada, então
uma conta mal-provisionada não vaza por engano.

**Limite honesto (dívida de LGPD).** Inativar `users/{uid}.ativo` **NÃO revoga a credencial no
Auth**: o check de `ativo` no `onAuthStateChanged` barra a ENTRADA, mas um token já emitido
sobrevive até expirar (~1h). Revogação real exige Admin SDK (Futuro — sem Blaze nesta fatia).

---

## 6. Matriz de teste no Emulator

Suíte com `@firebase/rules-unit-testing` contra a versão NOVA das rules. Verde em
**próprio-OK / terceiro-NEGADO / gestor-sem-regressão** é gate obrigatório. Seeds devem
refletir produção (senão "gestor-sem-regressão" passa por vacuidade): `users/{uid}` com `role`
e `funcionarioId` reais; `funcionarios` com `nascimento`; 4 papéis de gestor com
`turno`/`funcionariosVisiveis`. Confirmar que cada caso NEGADO nega pelo motivo certo (não por
doc ausente).

| # | Cenário | Ator | Operação | Esperado |
|---|---|---|---|---|
| 1 | funcionarios próprio-OK | colaborador `f-123` | get `/funcionarios/f-123` | OK |
| 2 | funcionarios terceiro-NEGADO | colaborador `f-123` | get `/funcionarios/f-999` | NEGADO (caso central do leak de nascimento) |
| 3 | funcionarios list amplo colab | colaborador | list `/funcionarios` (sem filtro) | NEGADO (rede de segurança; código já ramifica) |
| 4 | funcionarios gestor-sem-regressão | admin / RH / líder / supervisor | list `/funcionarios` inteira | OK (byte-a-byte como hoje) |
| 5 | users próprio-OK | colaborador | get `/users/{próprioUid}` | OK (sustenta role/funcionarioId no boot) |
| 6 | users terceiro-NEGADO | colaborador | get `/users/{outroUid}` e `/users/{gestorUid}` | NEGADO |
| 7 | users list amplo colab | colaborador | list `/users` | NEGADO |
| 8 | users gestor-sem-regressão (chat) | admin/RH/líder/supervisor | list `/users` inteira | OK (alimenta renderChatLista) |
| 9 | users self-update fotoBase64 | qualquer | update próprio só `fotoBase64` | OK (não regredir) |
| 10 | users self-update precisaTrocarSenha | colaborador | update próprio só `precisaTrocarSenha=false` | OK |
| 11 | users self-update escalar privilégio | colaborador | update próprio `role='admin'` (só ou junto) | NEGADO (hasOnly barra) |
| 12 | ocorrencias self-OK | colaborador `f-123` | get ocorrência com `funcionarioId=='f-123'` | OK |
| 13 | ocorrencias terceiro-NEGADO | colaborador | get ocorrência `funcionarioId=='f-999'` | NEGADO |
| 14 | ocorrencias list filtrado self | colaborador | list `where funcionarioId=='f-123'` | OK; list sem filtro NEGADO |
| 15 | ocorrencias gestor-sem-regressão | admin/RH/líder/supervisor | leituras de hoje | idêntico a hoje |
| 16 | banco-horas-saldos colab | colaborador | get `/banco-horas-saldos/f-123` (o PRÓPRIO) | NEGADO (nem o próprio CPF) |
| 17 | banco-horas / pipeline-rh colab | colaborador | get `/banco-horas/*`, `/pipeline-rh/cur` | NEGADO; admin/RH OK |
| 18 | config/permissoes leak check | colaborador | get `/config/permissoes` | NEGADO (se o opcional 3.1e entrar) |
| 19 | presence colaborador | colaborador | create `/presence/{uid}` | NEGADO (role fora da allowlist) + app não chama iniciarPresenca |
| 20 | mensagens fora-de-escopo | colaborador | read `/mensagens` de/para != ele | NEGADO (regra inalterada) |
| 21 | regressão global can() | gestores | suíte de read/write de hoje (ocorrencias/bancoHoras/pj/auditoria/obrigacoes/tipos/acoes) | nenhum resultado de gestor muda |

---

## 7. Ordem de deploy segura + rollback

**Regra de ouro:** o código que RAMIFICA os reads (Passo 1) tem de estar em produção ANTES de
apertar a rule (Passo 3). Nunca o inverso — apertar a rule com `carregarDadosCompletos` ainda
fazendo `.get()` amplo daria **permission-denied no boot** do colaborador (a coleção `.get()`
falha se UM doc não for legível). Código e rules são desenhados **aditivos** (código compatível
com a rule antiga; rule nova compatível com o código novo), então há uma janela segura entre eles.

- **PASSO 0 (sem deploy de rules).** Escrever a suíte do Emulator cobrindo TODA a §6 e rodar
  contra as rules NOVAS. Verde obrigatório. Nada vai a produção sem isso.
- **PASSO 1 — CÓDIGO PRIMEIRO (aditivo).** `firebase deploy` (hosting) de: (a) ramo
  `colaborador` em `carregarDadosCompletos`; (b) `onAuthStateChanged` lê
  `funcionarioId/codigo/ativo/precisaTrocarSenha` e bloqueia inativo; (c) `PERM_CAPS`/
  `PERM_DEFAULT`/`ACCESS_PREVIEW` + ramos self em `podeVerFuncionario`/`podeVerOcorrenciaUI`.
  Roda perfeitamente sob as rules permissivas de HOJE (gestor lê amplo; nenhum colaborador real
  loga ainda). Zero efeito sobre o gestor.
- **PASSO 2 — VALIDAR EM PRODUÇÃO com rules ANTIGAS.** Sessões reais de admin/RH/líder/
  supervisor: chat/diretório, aniversariantes, ocorrências, banco de horas, PJ idênticos. Sem
  colaborador real autenticado (login CPF é #4), não há superfície de vazamento aberta — janela
  segura por design.
- **PASSO 3 — RULES POR ÚLTIMO, SÓ COM OK EXPLÍCITO DO DONO.**
  `firebase deploy --only firestore:rules` da versão já verde no Emulator. As rules novas são um
  SUPERSET das permissões de gestor de hoje + restrição nova só no ramo colaborador → apertar
  não muda nada para o gestor.
- **PASSO 4 — só DEPOIS de rules reconfirmadas em produção** (smoke test dos 4 papéis de gestor
  + 1 colaborador de teste), liberar o login real de colaborador (#4 CPF).

**Rollback (assimétrico por camada).**
- **Rules (passo crítico):** versão anterior de `docs/firestore.rules` está no git (HEAD atual).
  Qualquer sinal de regressão no gestor (chat vazio, nomes `?`, aniversariantes sumindo,
  permission-denied em tela de gestor) ⇒ **reverter PRIMEIRO**:
  `git checkout <rules-antigas> -- docs/firestore.rules && firebase deploy --only firestore:rules`
  (propaga em segundos, restaura o read amplo). Não tentar hotfix sob pressão.
- **Código:** `firebase hosting:rollback` (ou redeploy do commit anterior).
- **Segurança do rollback:** como nenhum colaborador real loga até o Passo 4, reverter as rules
  para a versão permissiva NÃO reabre vazamento (não há colaborador para explorá-lo).
- **deploy ≠ push:** `git push` após cada deploy, e confirmar que `docs/firestore.rules` em
  produção == HEAD do git.

**Riscos de execução:** `userDoc()` é lido a cada avaliação (consolidar em `let`, cobrir
contagem de reads no Emulator); armadilha de boot (ordem código→rules); `euSouODono` depende de
`funcionarioId` populado (sequenciar antes do login colaborador, #4); `temCap` só reconhece
`true/'turno'/'atrib'` — caps self não devem usar esses valores em chaves de gestor; inativação
não revoga token (~1h).

---

## 8. Fatiamento (micro-fatias entregáveis uma a uma)

Ordem deliberada: tudo que é **puro client e compatível com as rules antigas** vem antes; a
rule (a parte arriscada) vem por último, atrás de gate de Emulator + OK do dono.

1. **F1 — Papel no motor de permissões (client puro, zero rede).** `PERM_CAPS` área "Portal" +
   bloco `colaborador` em `PERM_DEFAULT` + `ACCESS_PREVIEW` + ramos self em
   `podeVerFuncionario`/`podeVerOcorrenciaUI`. Não toca Firestore, não toca rules. Regressão
   zero por construção (`can()` já dá `false` a role desconhecido).
2. **F2 — Vínculo no boot.** `onAuthStateChanged` lê `funcionarioId/codigo/precisaTrocarSenha` e
   bloqueia `ativo === false`. Apenas LÊ campos novos (gestor não os tem ⇒ `null`, sem efeito).
3. **F3 — Carga ramificada por role.** Ramo `colaborador` no topo de `carregarDadosCompletos`
   (molde: bloco de banco de horas) + não ligar presence/chat para colaborador. Roda sob as
   rules de hoje; é a "rede de baixo" obrigatória antes de apertar a rule.
4. **F4 — Suíte do Emulator (Passo 0).** Toda a §6 verde contra as rules novas. Gate.
5. **F5 — Endurecer rules (Passo 3, atrás do OK do dono).** `funcionarios`/`users` gestor-OR-self,
   self-update ampliado, OR self em `ocorrencias`, e opcionalmente segregar `config/{doc}`.

**Primeira fatia = F1 (papel no motor de permissões).** É a mais segura porque é 100%
client-side, não faz nenhuma chamada de rede, não toca as rules de produção e não muda nada para
os gestores (o bloco `colaborador` não altera `rh/lider/supervisor`; `permEfetivo`/`can()`
resolvem por role e role desconhecido já era `false`). É reversível por um simples redeploy de
hosting e estabelece o vocabulário (`self.ver` etc.) de que as fatias seguintes dependem, sem
abrir nenhuma superfície de risco.

**Fora desta fatia (dívidas registradas):** `/config/diretorioGH` (sem consumidor aqui — só na
fatia de Chat do colaborador; desenho pronto: doc único `{ contatos: [{uid,nome,papel,turno}] }`
sem PII, com match próprio antes do curinga); endurecer read de `presence`; `banco-horas-self`
(#14); login CPF (#4); modal de troca de senha (#6/#7); revogação real de credencial via Admin
SDK; tela "Minhas Ocorrências" (#13).
