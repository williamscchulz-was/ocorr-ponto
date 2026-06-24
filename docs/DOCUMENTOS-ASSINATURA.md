# Documentos & Assinatura — Especificação de Backend (Fase 1)

Módulo do **Portal do Colaborador** do FioPulse. Este documento é **especificação**, não
implementação. O objetivo é deixar o backend pronto para o William implementar em fatias
pequenas, **reaproveitando ao máximo** o que o FioPulse já tem (auditoria append-only, anexo do
Controle PJ, `conclusoes{}` das Obrigações, `google-drive.js`, vínculo `uid ↔ funcionarioId`).

Premissa de produto governante: **assinatura interna = prova de CIÊNCIA, não de concordância
jurídica.** É robusta para defesa trabalhista e compliance interno (N1/N2), **não** é assinatura
qualificada ICP-Brasil (N3). Tudo que exigiria N3 ou Cloud Function (Blaze) está sinalizado na
seção 7, sem maquiagem.

---

## 1. Princípios

1. **Prova de ciência, não de concordância.** O ato registra que a pessoa *leu e tomou ciência*
   de um conteúdo exato, num instante exato, autenticada como ela mesma. Recusa e ressalva são
   provas de ciência **válidas** — não são buracos na trilha. "Aceitei" não significa "concordo";
   significa "li e estou ciente".

2. **Aceite é por VERSÃO.** Toda nova versão de um documento **reabre a pendência de aceite para
   todo o público-alvo**. O aceite da versão anterior fica **congelado** como prova daquela
   versão (daquele `hashSha256`), nunca é migrado nem sobrescrito. A pessoa precisa aceitar de
   novo a cada nova versão. O pivô técnico é o ponteiro `documentos/{id}.versaoVigenteId`: trocá-lo
   = reabrir tudo, sem reescrever N registros (estado do colaborador é **derivado**, não armazenado).

3. **Trilha imutável e íntegra.** Todo aceite/recusa/ressalva/visualização/publicação gera um
   evento append-only. `update` e `delete` são `false` para ninguém pelo cliente — nem admin.
   Corrigir um erro **não é editar**: é gravar um novo evento (uma recusa seguida de ciência
   ficam como dois eventos, contando a história real). A hora é sempre `serverTimestamp`; o
   conteúdo é amarrado por SHA-256. É um sistema de empresa: a trilha é a espinha dorsal de
   confiança.

4. **Reaproveitar o FioPulse, não recriar.** Cada peça nova tem um precedente no código:
   `registrarAuditoria` (trilha), `contratoUrl`+`ehUrlSegura`+`google-drive.js` (anexo do PDF),
   `aditivos[]` do PJ (histórico versionado — vira subcoleção aqui), `conclusoes{}` das Obrigações
   (campanha de aceite), `funcionarioId='f-'+codigo` (chave de identidade de negócio).

---

## 2. Modelo de dados

Três níveis: o **documento** (cabeçalho lógico), suas **versões** (PDF imutável + hash) e os
**aceites** por versão (registro rico e consultável). A trilha **auditoria** (já existente) é a
prova crua imutável que espelha cada ato.

```
documentos/{documentoId}
documentos/{documentoId}/versoes/{versaoId}
documentos/{documentoId}/versoes/{versaoId}/aceites/{funcionarioId}
auditoria/{id}                 ← reusa coleção existente (prova-mestre)
```

> **Decisão de aninhamento.** Aceite é **subcoleção aninhada por versão** (não coleção raiz com
> chave composta) por três motivos: (a) a chave do doc de aceite ser `funcionarioId` garante
> nativamente **1 aceite por pessoa por versão** (idempotente, sem transação) e dá leitura O(1)
> de "eu já aceitei?"; (b) aninhar sob a versão **materializa fisicamente** a regra "aceite é por
> versão" — congela a prova colada à versão; (c) rules limpas (read self por `euSouODono`, read
> agregado por RH). Query cross-documento ("tudo que f-1042 já assinou") se resolve pela
> `/auditoria`, que já é a trilha global por pessoa.
>
> **Versões como subcoleção, não array** (diferente do `aditivos[]` do PJ): cada versão tem sua
> própria subcoleção de aceites (potencialmente centenas), então versão **precisa** ser documento
> próprio. O `aditivos[]` é o precedente *conceitual* ("histórico que não se sobrescreve"), não a
> implementação literal.

### 2.1 `documentos/{documentoId}`

A "pasta" do documento: metadados estáveis, NÍVEL, público-alvo, estado agregado e o ponteiro
para a versão vigente. **Não** guarda o PDF nem o aceite.

| Campo | Tipo | Descrição |
|---|---|---|
| `documentoId` | string | id auto do Firestore (estável; âncora de todas as subcoleções) |
| `titulo` | string ≤200 | ex.: "Política de Ética e Conduta 2026" |
| `descricao` | string | 1–2 frases |
| `tipo` | enum | `politica` \| `comunicado_formal` \| `advertencia` \| `contrato` \| `aditivo` \| `termo_lgpd` \| `conduta` \| `outro` (orienta UI e retenção) |
| `nivel` | enum | `informativo` (N0, só leitura, registra visualização opcional) \| `ciencia` (N1, "Li e estou ciente") \| `assinatura` (N1+, "Li e aceito"). RH escolhe ao publicar. Fica no documento, não na versão, pois define o **ritual** de aceite |
| `publico` | map | `{ tipo: 'todos'\|'turno'\|'setor'\|'cargo'\|'lista', valores: string[] }`. Espelha o `segmento{tipo,valores}` dos Comunicados. `lista` = array de `funcionarioId` |
| `critico` | bool | `true` = campanha com meta 100% (ex.: ética anual); muda UI de cobrança e painel |
| `versaoVigenteId` | string\|null | aponta para `versoes/{versaoId}` vigente. **Pivô do "aceite por versão"** |
| `versaoVigenteNumero` | number | denormalizado (1,2,3…) só para exibição rápida |
| `prazoRespostaDias` | number\|null | janela a partir de `publicadoEm` da versão vigente; estourou = "Atrasado" (não bloqueia o portal) |
| `estado` | enum | `rascunho` \| `publicado` \| `arquivado`. **Não** confundir com aceite (que é por pessoa+versão) |
| `criadoPor` | string (uid) | autor RH |
| `criadoEm` | timestamp | `serverTimestamp` |
| `atualizadoEm` | timestamp | `serverTimestamp` (toque ao publicar nova versão) |
| `retencaoAteAaaaMm` | string\|null | marcador LGPD de expurgo (ex.: `'2031-12'`); orienta política, não apaga sozinho |
| `campanha` | map\|null | denormalização de leitura: `{ 'v'+N: { meta, total, aceitos, atualizadoEm } }` mantida **só pela rotina RH**. Fonte de verdade continua sendo `/aceites` |

```json
// documentos/{docId} — Política de Ética anual, nível assinatura, crítico (meta 100%)
{
  "titulo": "Política de Ética e Conduta 2026",
  "descricao": "Leitura e aceite obrigatórios de toda a empresa.",
  "tipo": "conduta",
  "nivel": "assinatura",
  "publico": { "tipo": "todos", "valores": [] },
  "critico": true,
  "versaoVigenteId": "v_ab12",
  "versaoVigenteNumero": 2,
  "prazoRespostaDias": 15,
  "estado": "publicado",
  "criadoPor": "uid_rh_maria",
  "criadoEm": "<serverTimestamp>",
  "atualizadoEm": "<serverTimestamp>",
  "retencaoAteAaaaMm": null
}
```

### 2.2 `documentos/{documentoId}/versoes/{versaoId}`

Cada versão **imutável** (o PDF concreto + seu hash). É a unidade contra a qual o aceite é dado.
Uma vez publicada, **nunca muda**: nova revisão = nova versão (`numero+1`), não edição.

| Campo | Tipo | Descrição |
|---|---|---|
| `versaoId` | string | id auto (pode ser determinístico legível, ex.: `docId__v2`) |
| `numero` | number | sequencial 1,2,3… (exibição "#N" e ordenação) |
| `url` | string (https) | link no Google Drive. Reusa `uploadContratoToDrive` + `ehUrlSegura` (só http/https) |
| `driveFileId` | string\|null | id do arquivo no Drive (retorno de `uploadContratoToDrive`; organiza em subpasta via `findOrCreateFolderForPJ`) |
| `hashSha256` | string (hex 64) | SHA-256 do PDF calculado no cliente (`crypto.subtle.digest`) ao subir. **Congela o conteúdo** — o aceite referencia este hash |
| `tamanhoBytes` | number\|null | metadado do arquivo |
| `notaVersao` | string\|null | changelog curto ("Atualizado item 4 — jornada") |
| `textoLei` | string | o texto exato que a UI mostra e a pessoa aceita ("Li e aceito" / "Li e estou ciente"). Versionado junto, pois pode mudar |
| `vigente` | bool | `true` só na versão atual. Ao publicar nova versão, a anterior vira `false`. Coerente com `documento.versaoVigenteId` |
| `estado` | enum | `vigente` \| `superada`. `superada` = congelada como prova quando N+1 é publicada |
| `publicadoEm` | timestamp | `serverTimestamp`; marco de início do prazo |
| `publicadoPor` | string (uid) | RH que publicou (== `auth.uid`, exigido na rule) |
| `alvoSnapshotTotal` | number\|null | tamanho do público congelado na publicação (denominador "Y" do "faltam X de Y") |
| `publicoAlvoSnapshot` | string[]\|null | lista de `funcionarioId` resolvida no ato da publicação. Congela QUEM era o público. Única adição permitida: anexar recém-admitido (nunca remover) |

```json
// documentos/{docId}/versoes/v_ab12 — versão 2, VIGENTE (reabriu o aceite de todos)
{
  "numero": 2,
  "url": "https://drive.google.com/file/d/XYZ/view",
  "driveFileId": "XYZ",
  "hashSha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "tamanhoBytes": 384210,
  "notaVersao": "Atualizado item 4 — uso de redes sociais.",
  "textoLei": "Li e aceito a Política de Ética e Conduta 2026.",
  "vigente": true,
  "estado": "vigente",
  "publicadoEm": "<serverTimestamp>",
  "publicadoPor": "uid_rh_maria",
  "alvoSnapshotTotal": 312
}
// versoes/v_77aa (numero 1) fica com vigente:false, estado:'superada' — CONGELADA como prova da v1
```

### 2.3 `documentos/{documentoId}/versoes/{versaoId}/aceites/{funcionarioId}`

O registro de ciência/aceite de **um** colaborador para **uma** versão. Chave = `funcionarioId`
(= `'f-'+codigo`), garantindo 1 aceite por pessoa por versão. Recusa e ressalva são registros
**válidos** aqui. A prova fica congelada sob a versão.

| Campo | Tipo | Descrição |
|---|---|---|
| `funcionarioId` | string | id do doc (= `'f-'+codigo`); é o próprio dono do aceite |
| `uid` | string | `request.auth.uid` de quem gravou. Em `portal`/`quiosque` == o próprio colaborador. Em `presencial_papel` == uid do RH |
| `acao` | enum | `aceite` ("Li e aceito") \| `ciencia` ("Li e estou ciente") \| `ciencia_ressalva` \| `recusa` \| `visualizacao` (só abriu, nível informativo). As 4 primeiras são prova de ciência |
| `status` | enum | `respondido` (qualquer ação acima) vs ausência do doc = `pendente`. Denormalizado p/ filtrar |
| `texto` | string\|null | **obrigatório** quando `acao='ciencia_ressalva'` (a ressalva) ou `acao='recusa'` (o motivo); senão null |
| `hashSha256` | string | cópia do hash da versão aceita (redundância proposital: o comprovante é autossuficiente) |
| `versaoNumero` | number | denormalizado (qual "#N" foi aceito) |
| `em` | timestamp | `serverTimestamp` (hora-de-servidor, **NÃO** hora do cliente) |
| `userAgent` | string\|null | `navigator.userAgent` (indício, **não** prova forte; não é IP) |
| `plataforma` | string\|null | `navigator.platform` / hint de SO |
| `canal` | enum | `portal` (autoatendimento) \| `quiosque` (totem por CPF) \| `presencial_papel` (RH registrou ciência colhida em papel) |
| `registradoPor` | string\|null | uid de QUEM gravou quando `canal != 'portal'` (RH no presencial); no portal == `uid` |
| `comprovanteFisicoUrl` | string\|null | quando `canal='presencial_papel'`: link https (Drive) do físico digitalizado |
| `auditoriaRef` | string\|null | id do evento espelhado em `/auditoria` (ponte para a trilha imutável) |

```json
// .../aceites/f-1042 — aceite no portal, pelo celular
{
  "funcionarioId": "f-1042",
  "uid": "uid_colab_joao",
  "acao": "aceite",
  "status": "respondido",
  "texto": null,
  "hashSha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "versaoNumero": 2,
  "em": "<serverTimestamp>",
  "userAgent": "Mozilla/5.0 (Linux; Android 13) ... Chrome/124",
  "plataforma": "Android",
  "canal": "portal",
  "registradoPor": "uid_colab_joao",
  "comprovanteFisicoUrl": null,
  "auditoriaRef": "aud_5f3e"
}
```

```json
// .../aceites/f-2087 — RECUSA com motivo (registro VÁLIDO, prova de ciência)
{
  "funcionarioId": "f-2087", "uid": "uid_colab_ana",
  "acao": "recusa", "status": "respondido",
  "texto": "Discordo da cláusula de exclusividade do item 7.",
  "hashSha256": "9f86d0...a08", "versaoNumero": 2,
  "em": "<serverTimestamp>",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0) ... Chrome/124",
  "plataforma": "Win32", "canal": "portal",
  "registradoPor": "uid_colab_ana", "comprovanteFisicoUrl": null,
  "auditoriaRef": "aud_5f40"
}
```

```json
// .../aceites/f-3301 — sem celular: ciência colhida em PAPEL pelo RH
{
  "funcionarioId": "f-3301", "uid": "uid_rh_maria",
  "acao": "ciencia", "status": "respondido", "texto": null,
  "hashSha256": "9f86d0...a08", "versaoNumero": 2,
  "em": "<serverTimestamp>",
  "userAgent": null, "plataforma": null,
  "canal": "presencial_papel", "registradoPor": "uid_rh_maria",
  "comprovanteFisicoUrl": "https://drive.google.com/file/d/PAPEL3301/view",
  "auditoriaRef": "aud_5f55"
}
```

---

## 3. Versionamento e ciclo de aceite

### 3.1 Ciclo de vida do DOCUMENTO (não do colaborador)

```
rascunho ──► publicado (versão vigente) ──► nova versão publicada (a anterior vira "superada") ──► arquivado
```

- **`rascunho`** — RH montou, ainda não expôs. PDF pode trocar livremente; nenhuma pendência
  gerada; não aparece ao público. Só o autor/RH vê.
- **`publicado`** — RH publicou a versão vigente. Hash, nível, público e prazo ficam **travados
  para aquela versão**. Gera/reabre pendência para todo o público. Só existe **uma** versão
  vigente por vez.
- **`superada`** (estado da VERSÃO, não do documento) — efeito automático de publicar N+1: a
  versão N vira `superada` no instante em que N+1 é publicada. **Não some**: vira prova histórica
  congelada (hash + aceites intactos). O documento segue `publicado` no agregado.
- **`arquivado`** — RH tira de circulação (política obsoleta, contrato encerrado). Para de cobrar;
  não reabre nada; aceites/recusas já registrados permanecem. Reativar = publicar nova versão
  (volta a `publicado`). Distingue-se de `superada` porque não há sucessora.

### 3.2 Estados do COLABORADOR (derivados, não armazenados)

> Invariante: o estado de cada pessoa **não é um campo gravado**, é derivado de *"existe meu doc
> em `aceites` da versão vigente?"* cruzado com o prazo e o afastamento. É isso que permite
> reabrir tudo trocando só o ponteiro.

- **`pendente`** — versão vigente exige resposta e ele ainda não respondeu, dentro do prazo.
  Estado inicial de TODO o público no instante da publicação. Nível `informativo` não gera
  `pendente`.
- **`visualizado`** — abriu o documento (registro opcional). Não conta como ciência. Em
  ciência/assinatura, coexiste com `pendente` até haver resposta.
- **`aceito`** — deu ciência (`ciencia`) ou assinou (`aceite`). Carimbo completo.
- **`ressalva`** — ciência COM ressalva (texto). Registro **válido** de ciência. Conta como
  respondido; o painel destaca quantos têm ressalva.
- **`recusado`** — recusou, com motivo obrigatório. Registro **válido** e carimbado (prova de que
  houve ciência e decisão de recusar). Conta como respondido; em documento crítico, recusa **não**
  conta para a meta de aceite — vira "pendência de tratamento do RH".
- **`atrasado`** — passou `prazoRespostaDias` da versão vigente e segue sem responder. Transição
  automática `pendente → atrasado` por data (`agora > publicadoEm + prazo`, calculada na leitura).
  **Não bloqueia o portal**; dispara cobrança in-app + painel. Responder a qualquer hora tira de
  atrasado.
- **`isento/sem-cobrança` (afastado)** — colaborador do público que está afastado. **Entra** no
  público e **recebe** a pendência, mas a virada para `atrasado` e a cobrança ficam **suspensas**
  enquanto `funcionarios/{codigo}` indicar afastamento. Ao voltar, o prazo passa a correr
  (política do documento define se reinicia ou conta o restante).

### 3.3 Regras de versão (numeradas)

1. **Estrutura.** Cabeçalho em `documentos/{docId}`; cada versão é doc imutável em
   `documentos/{docId}/versoes/{versaoId}`. Subcoleção (não array) para casar com append-only e
   carregar a própria subcoleção de aceites.
2. **Hash = identidade da versão.** SHA-256 do PDF calculado no navegador (`crypto.subtle.digest`)
   **antes** de subir, gravado em `versoes/{id}.hashSha256`. Prova "a pessoa aceitou exatamente
   este arquivo". Trocar o PDF de uma versão publicada é **proibido pela rule** (create-only). A
   única forma de trocar conteúdo é publicar versão nova → `hash != entre versões` garante que
   ninguém reescreve a história.
3. **Congelamento.** No instante da publicação viram imutáveis: `numero`, `nivel`/`textoLei`,
   `hashSha256`, `url`/`driveFileId`, prazo, `publicoAlvoSnapshot`, `publicadoPor`/`publicadoEm`.
   Os aceites daquela versão já são imutáveis por natureza. Editar o **cabeçalho** (corrigir nome
   de exibição) é permitido ao RH e **não** afeta versões nem aceites.
4. **Uma vigente.** `documento.versaoVigenteId` aponta sempre para o maior N publicado e
   não-arquivado. O colaborador só pode aceitar a vigente; aceitar uma superada é bloqueado (a UI
   não oferece e a rule valida).
5. **Publicar nova versão (atômico).** Ao publicar v(N+1), idealmente num `writeBatch`:
   (a) cria `versoes/{N+1}` com novo hash/PDF/prazo/`publicoAlvoSnapshot` e `conclusoes/aceites`
   vazios; (b) marca `versoes/{N}.estado='superada'` e `vigente=false` (**único** update permitido
   a uma versão); (c) atualiza `documento.versaoVigenteId/Numero`; (d) chama `registrarAuditoria`
   (`tipo:'documento'`, `acao:'Publicou versão N+1 / reabriu aceite'`, `alvo:docId+'@v'+(N+1)`).
   Cloud Function só seria necessária se exigíssemos IP/carimbo qualificado (ver seção 7).

### 3.4 O que a publicação de nova versão dispara (reabertura)

1. **Cria** `versoes/{N+1}` (novo PDF, novo hash, novo prazo, novo `publicoAlvoSnapshot` resolvido
   AGORA, aceites vazios). `versaoVigenteId → N+1`.
2. **Reabre a pendência para todo o público.** Como o estado é derivado de "existe entrada minha
   na versão vigente?", apontar a vigência para N+1 (aceites vazios) joga TODOS de volta a
   `pendente` automaticamente — **sem reescrever N registros**. Quem aceitou a v(N) não tem entrada
   na v(N+1), logo volta a pendente.
3. **Congela** a versão anterior como prova: `versoes/{N}.estado='superada'`; seus aceites e hash
   ficam intactos e imutáveis. O aceite da v(N) continua valendo como prova daquela versão. Nunca
   some, nunca é migrado.
4. **Prazo novo.** O prazo de N+1 conta de `publicadoEm(N+1)`. Afastados entram sem cobrança.
5. **Notifica + audita.** Cobrança in-app ("Nova versão de <doc> — sua ciência anterior não vale
   mais para esta versão") + evento append-only.
6. **Invariante-resumo:** estado na versão vigente = `pendente`, salvo se existe
   `aceites/{funcionarioId}` (→ aceito/ressalva/recusado), ou prazo estourado (→ atrasado), ou
   afastado (→ isento). Publicar nova versão = trocar o ponteiro ⇒ o conjunto relevante esvazia
   ⇒ todos pendentes de novo, sem tocar o histórico.

### 3.5 Campanha de aceite (% da versão vigente)

Molde direto do `conclusoes{periodo}` das Obrigações — aqui `periodo = versaoId`.

- **Denominador Y** = `alvoSnapshotTotal` (congelado na publicação; evita recontagem retroativa).
- **Numerador X** = aceites com `acao in ('aceite','ciencia','ciencia_ressalva')` [ciência obtida].
- Painel RH para a versão vigente: **X de Y deram ciência (%)**, quebrado em aceitos puros, com
  ressalva, recusados, pendentes, atrasados, afastados; + lista de quem falta com botão de
  cobrança. Reaproveita 1:1 o widget de progresso das Obrigações (barra + pills ok/pend/atras).
- **Documento crítico** = meta 100%: só "zera a pendência" quando todo o público respondeu;
  recusas **não** contam para a meta de aceite e viram pendência de tratamento do RH.
- **Por versão.** O % é sempre da vigente. Versões superadas guardam seu próprio agregado
  congelado ("na v1, 87% deram ciência") — nunca recalculado.
- O campo `documento.campanha{'v'+N:{...}}` é **denormalização de leitura** mantida só pela rotina
  RH; a fonte de verdade é a subcoleção `/aceites` imutável.

### 3.6 "Quem ainda NÃO aceitou" — anti-join no cliente

Firestore não faz anti-join no servidor sem custo. Como o alvo já está em memória:
1. Resolver o conjunto-alvo de `documento.publico` cruzando `state.funcionarios` (mesma fonte do
   segmento de Comunicados) → lista de `funcionarioId` esperados.
2. Ler `versoes/{vigenteId}/aceites` (uma query de subcoleção; cada doc tem id = `funcionarioId`).
3. **Pendentes** = alvo − (ids presentes em aceites). **Atrasado** = pendente E
   `(now − publicadoEm) > prazoRespostaDias`.

Como o alvo está em memória e os aceites são poucos por versão, o anti-join client-side é barato e
dispensa Cloud Function. Para crítico com público enorme, a **contagem** agregada pode usar
`count()` do Firestore; o **detalhamento** de pendentes continua client-side.

### 3.7 Recém-admitido e afastado

- **Recém-admitido.** O `publicoAlvoSnapshot` é congelado na publicação, então um admitido depois
  não estaria nele. Tratamento: o pipeline diário (WKRADAR / atualização de usuários da Fase 1)
  reconcilia o alvo das versões vigentes não-arquivadas — ao detectar funcionário novo que casa
  com `publico`, **anexa** o `funcionarioId` ao `publicoAlvoSnapshot` da vigente (**única adição
  permitida**: incluir novo alvo, nunca remover), gera a pendência derivada e o prazo conta da
  admissão. Recém-admitido entra e recebe pendência **sem reabrir nada** para quem já estava.
- **Afastado.** Entra no público (recebe pendência), mas `atrasado`/cobrança ficam **suspensos**
  enquanto `funcionarios/{codigo}` indicar afastamento (estado `isento/sem-cobrança`). Ao voltar,
  o prazo passa a correr. Ninguém fica de fora; ninguém é cobrado indevidamente.

---

## 4. Trilha de auditoria / logs

Reaproveita a coleção **`auditoria`** existente (`window.registrarAuditoria`, `firebase.js:892`;
rule em `docs/firestore.rules:135-142`, já append-only). A trilha é a **prova-mestre crua**; o doc
em `/aceites` é o registro **rico e consultável**. `auditoriaRef` no aceite cruza os dois.

> **Bloqueio real a resolver (Fase 1).** Hoje a rule de `/auditoria` só permite `create` para
> `isAdmin() || temCap('auditoria.ver', isRH())`. Um **colaborador não consegue** gravar a própria
> ciência. Decisão de design: **ampliar o `create` de `/auditoria`** para aceitar
> `tipo=='documento'` quando `por == auth.uid` (sem exigir `auditoria.ver`), mantendo
> `update,delete: if false`. É **ajuste de rule, não Cloud Function**. (Alternativa equivalente:
> subcoleção dedicada `assinaturas/{autoId}` com `create` self — mas reusar `/auditoria` mantém
> uma trilha única e evita fragmentação.)

### 4.1 Schema do evento (campo a campo)

| Campo | Tipo | Descrição |
|---|---|---|
| `por` | string (uid) | QUEM gravou. `== auth.uid` (exigido pela rule). Em presencial é o uid do RH |
| `tipo` | string | `'documento'` para este módulo (filtro e rule) |
| `acao` | enum/string ≤200 | `emissao` \| `nova_versao` \| `visualizacao` \| `ciencia` \| `assinatura` \| `ressalva` \| `recusa` \| `expurgo`. **ressalva e recusa são eventos de primeira classe** |
| `alvo` | string | âncora legível, ex.: `doc:<docId> · v:<versaoId> · func:<funcId> · sha:<hash8>` |
| `em` | timestamp | QUANDO, `serverTimestamp` (`request.time`). **Nunca** `Date` do cliente |
| `documentoId` | string | id do documento (sem ele a prova não diz O QUÊ) |
| `versaoId` | string | id imutável da VERSÃO. Peça central do "aceite por versão" |
| `versaoNumero` | number | número humano (redundante de propósito, comprovante legível) |
| `hashDocumento` | string (hex 64) | SHA-256 do PDF exato daquela versão. Integridade byte-a-byte |
| `hashAlg` | string | fixo `'SHA-256'` (auditável no futuro se trocar de algoritmo) |
| `funcionarioId` | string | QUEM no domínio de negócio (`'f-'+codigo`); estável mesmo se o uid mudar |
| `codigo` | string | matrícula, snapshot (redundância legível) |
| `nomeSnapshot` | string | nome **congelado** no instante. Nunca derivar "ao vivo" de `funcionarios/` |
| `cargoSnapshot`, `setorSnapshot` | string opc. | contexto p/ defesa trabalhista |
| `nivelDocumento` | enum | `informativo`\|`ciencia`\|`assinatura` congelado quando o evento ocorreu |
| `textoAceiteExibido` | string | o texto EXATO que a pessoa leu e aceitou. Prova do que foi consentido (não um booleano) |
| `observacao` | string ≤1000 opc. | texto da ressalva / motivo da recusa. Obrigatório quando `acao in ('ressalva','recusa')` |
| `origem` | enum | `app` \| `quiosque` \| `presencial` |
| `userAgent` | string ≤300 | `navigator.userAgent`. Indício fraco isolado |
| `plataforma` | string | `navigator.platform` / hint (mobile\|desktop\|tablet) |
| `appVersao` | string | versão do FioPulse no deploy (reconstrói QUE software apresentou o texto/hash) |
| `ipServidor` | string opc. | **SÓ Cloud Function**. Nulo em eventos client-side; cliente não preenche IP confiável |
| `anexoFisicoUrl` | string https opc. | link Drive do físico digitalizado. **Obrigatório** quando `origem='presencial'` (validado por `ehUrlSegura`) |
| `eventoAnteriorHash` | string opc. | hash do evento anterior (tamper-evidence). **Só forte se selado no servidor** (ver 4.3) |
| `schemaVersao` | number | versão do schema do evento, para evoluir o formato sem ambiguidade |

```json
// evento espelhado em /auditoria (prova CRUA imutável; por==auth.uid)
{
  "por": "uid_colab_joao",
  "tipo": "documento",
  "acao": "assinatura",
  "alvo": "doc:docId · v:v_ab12 · func:f-1042 · sha:9f86d0...",
  "em": "<serverTimestamp>",
  "documentoId": "docId", "versaoId": "v_ab12", "versaoNumero": 2,
  "hashDocumento": "9f86d081...a08", "hashAlg": "SHA-256",
  "funcionarioId": "f-1042", "codigo": "1042", "nomeSnapshot": "João da Silva",
  "nivelDocumento": "assinatura",
  "textoAceiteExibido": "Li e aceito a Política de Ética e Conduta 2026.",
  "origem": "app",
  "userAgent": "Mozilla/5.0 (Linux; Android 13) ... Chrome/124",
  "plataforma": "Android", "appVersao": "1.11.0",
  "ipServidor": null, "anexoFisicoUrl": null, "schemaVersao": 1
}
```

### 4.2 Imutabilidade

- **Append-only.** `allow update, delete: if false` para todos pelo cliente — nem admin. É a
  espinha dorsal e deve ser mantida.
- **Reforços no design (não só na rule):** (1) id do doc gerado por `autoId`, nunca regravável;
  (2) `em` SEMPRE `serverTimestamp` — a rule exige `request.resource.data.em == request.time`;
  (3) a rule trava o conjunto de chaves obrigatórias (`hasAll`) e tipos/tamanhos para não injetar
  lixo; (4) **não se corrige** evento errado — corrige-se com um novo evento.
- **Limite honesto:** rules barram o **cliente**; quem tem credencial **Admin SDK**
  (console/Functions) pode tecnicamente sobrescrever. A defesa é **organizacional** (acesso restrito
  ao projeto) + (futuro) cadeia de hash selada no servidor.

### 4.3 Integridade / hash (dois níveis, honesto)

1. **Integridade do DOCUMENTO — dá no cliente, sem billing.** Ao subir o PDF: SHA-256 via
   `crypto.subtle.digest('SHA-256', arrayBuffer)`, gravado na versão E em cada evento de aceite.
   Verificação: baixar o PDF guardado, re-hashear, comparar. Bateu = a pessoa aceitou exatamente
   aquele arquivo; não bateu = o documento foi trocado (detectável). Isso é tamper-**evident** do
   conteúdo, e é **robusto**.
2. **Integridade/ordem da TRILHA (encadeamento) — só forte com Cloud Function.** Cada evento
   guarda o hash do anterior, formando cadeia. Feito 100% no cliente é **fraco** (o cliente
   escolhe o que encadear e pode reconstruir a cadeia). `serverTimestamp` dá **ordem** confiável,
   não imutabilidade do elo. Encadeamento com valor probatório precisa ser selado no **servidor**
   (Function que busca o último, calcula e grava) — Blaze. Sinalizado como evolução.
3. **IP confiável e carimbo qualificado — NÃO existem no cliente.** O Firestore client não expõe
   IP; qualquer IP enviado pelo cliente é forjável. `serverTimestamp` é hora do servidor Google
   (boa para ordenar/datar), **não** carimbo qualificado ICP-Brasil.

**Resumo honesto do que temos no cliente:** prova **forte** de integridade do documento (hash) +
data/hora de servidor + autor autenticado (`uid==auth.uid`) + texto exato aceito + userAgent/
plataforma/appVersao. Encadeamento selado, IP e carimbo qualificado = só com Function/terceiro.

### 4.4 Comprovante exportável

A "certidão de ciência/assinatura" de UMA pessoa sobre UMA versão. Gerado no cliente (HTML
imprimível → PDF via print, ou enviado ao Drive). É uma **renderização** legível do evento
imutável — a fonte da verdade é o doc na trilha append-only. Cada doc de `/aceites` é
**autossuficiente** (carrega `hashSha256`+`versaoNumero`+`em`+`userAgent`+`canal`), permitindo
gerar o comprovante sem recompor de várias coleções. Conteúdo mínimo:

- **(a) Documento:** título, `documentoId`, `versaoNumero`+`versaoId`, nível, `hashDocumento`+
  algoritmo, link do PDF. Declarar "a íntegra do documento aceito tem este hash" para reverificação.
- **(b) Quem:** `nomeSnapshot` (o nome de então), `codigo`/`funcionarioId`, cargo/setor snapshot;
  e, separadamente, o `uid` autenticado e SE foi o próprio (`app`/`quiosque`) ou registrado pelo
  RH (`presencial`, com o nome de quem registrou).
- **(c) Quando:** `em` formatado com fuso, rotulado como **hora de servidor** (não do dispositivo).
- **(d) Ação e texto:** a `acao` e o `textoAceiteExibido` EXATO, citado literalmente.
- **(e) Observação:** se houver, o texto integral da ressalva/recusa.
- **(f) Contexto técnico:** userAgent, plataforma, appVersao, e (se houver) `ipServidor`,
  rotulado como "capturado no servidor" apenas quando presente.
- **(g) Rastro:** id do evento na trilha e, se aplicável, `eventoAnteriorHash`.
- **(h) Presencial:** link/miniatura do `anexoFisicoUrl` (o papel assinado à mão).

Também ofertar **comprovante de campanha** agregado para o RH (quem aceitou a v3, quem recusou,
quem está pendente), reusando o molde `conclusoes{}` ("faltam X de Y").

### 4.5 Captura: app / quiosque / presencial (ninguém fica de fora)

1. **`app`** — o caminho normal: colaborador logado dá ciência/assina/ressalva/recusa pelo PWA.
   Cliente captura: `uid`(==auth.uid), `em`=serverTimestamp, userAgent, plataforma, appVersao,
   `hashDocumento` (já calculado no upload), `textoAceiteExibido` (o que a UI mostrou naquele
   clique), `nomeSnapshot`. **Não** captura IP confiável.
2. **`quiosque`** — para quem não tem celular: tablet/PC compartilhado da fábrica, login por CPF
   (e-mail sintético), assina, desloga. `uid` = o do próprio colaborador (foi ele quem logou),
   `origem='quiosque'`; userAgent é do dispositivo compartilhado. Mesma força que `app`, com a
   ressalva de ambiente compartilhado.
3. **`presencial`** — RH colhe ciência em **papel**, assinada à mão, digitaliza e registra por
   ele. O autor logado (`uid`) é o RH, `funcionarioId` aponta para o colaborador. A rule **exige**
   `anexoFisicoUrl` (https, `ehUrlSegura`, Drive) e só permite a admin/RH com cap
   `documentos.assinaturas.colher`. O comprovante deixa explícito "ciência colhida em papel e
   registrada por [RH]".

**Limite do IP (honesto):** em **nenhuma** das três o IP é confiável pelo cliente. IP real (e geo)
só com Cloud Function lendo o request no servidor (Blaze). Até lá, autor autenticado +
serverTimestamp + hash + texto + userAgent sustentam a prova — dito sem maquiagem no comprovante.

---

## 5. Regras Firestore

> **Pré-requisito HARD:** o vínculo `uid ↔ funcionarioId` em `users/{uid}`
> (`funcionarioId='f-'+codigo` + `codigo` + `turno`) precisa existir **antes** destas rules. Sem
> ele, `meuFuncionarioId()`/`euSouODono()` **falham-fecham** (negam) — nunca caem em "todos".
> **Atenção** ao endurecimento de `funcionarios`/`users` (#2/#12): hoje qualquer autenticado lê
> tudo; com colaboradores logados isso vaza PII. Fechar isso é pré-condição.

### 5.1 Helpers novos

```
function userDoc()          { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
function meuFuncionarioId() { return userDoc().funcionarioId; }
function isColaborador()    { return isAuthed() && userDoc().role == 'colaborador'; }
function euSouODono(fid)    { return isAuthed() && userDoc().funcionarioId == fid; }

function publicoContem(pub, u) {
  return pub.tipo == 'todos'
      || (pub.tipo == 'turno' && pub.valores.hasAny([u.turno]))
      || (pub.tipo == 'setor' && pub.valores.hasAny([u.setor]))
      || (pub.tipo == 'cargo' && pub.valores.hasAny([u.cargo]))
      || (pub.tipo == 'lista' && pub.valores.hasAny([u.funcionarioId]));
}
function documentoVisivelPara(doc) {
  return isAdmin()
      || temCap('documentos.gerenciar', isRH())
      || (isColaborador() && publicoContem(doc.publico, userDoc()));
}
// Sem vínculo (funcionarioId ausente) → fail-safe NEGA (não cai em 'todos').
```

**Novas caps** (área "Documentos" em `PERM_CAPS`, fallback `isRH()`):
`documentos.gerenciar` (publicar/editar doc e versão), `documentos.assinaturas.ver` (RH/comitê vê
o agregado), `documentos.assinaturas.colher` (RH registra presencial/quiosque/papel).

### 5.2 `/documentos/{docId}`

```
allow read:          if isAdmin() || temCap('documentos.gerenciar', isRH())
                        || documentoVisivelPara(resource.data);
allow create, update: if (isAdmin() || temCap('documentos.gerenciar', isRH()))
                        && request.resource.data.criadoPor == request.auth.uid   // no create
                        && request.resource.data.nivel in ['informativo','ciencia','assinatura']
                        && request.resource.data.titulo is string
                        && request.resource.data.titulo.size() <= 200;
allow delete:        if isAdmin();   // RH NÃO apaga: documento publicado é registro
```
O mapa `campanha{}` faz parte do `update` de `/documentos`, já gated — colaborador **nunca** escreve.

### 5.3 `/documentos/{docId}/versoes/{versaoId}` — APPEND-ONLY

```
allow read:   if isAdmin() || temCap('documentos.gerenciar', isRH())
                 || documentoVisivelPara(get(/.../documentos/$(docId)).data);
allow create: if (isAdmin() || temCap('documentos.gerenciar', isRH()))
                 && request.resource.data.publicadoPor == request.auth.uid
                 && request.resource.data.hashSha256 is string
                 && request.resource.data.url.matches('https://.*');   // padrão https; ehUrlSegura no cliente
// ÚNICA exceção a update: marcar estado='superada' (e vigente=false), feito por RH/admin.
allow update: if (isAdmin() || temCap('documentos.gerenciar', isRH()))
                 && request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(['estado','vigente'])
                 && request.resource.data.estado == 'superada';
allow delete: if false;   // versão publicada é IMUTÁVEL — prova congelada
```

### 5.4 `/documentos/{docId}/versoes/{versaoId}/aceites/{funcionarioId}` — IMUTÁVEL

```
function selfAceite() {
  return request.resource.data.uid == request.auth.uid
      && request.auth.uid == ...                          // (uid bate)
      && funcionarioId == meuFuncionarioId()              // chave do path == meu vínculo
      && request.resource.data.funcionarioId == funcionarioId
      && request.resource.data.acao in ['aceite','ciencia','ciencia_ressalva','recusa','visualizacao']
      && request.resource.data.em == request.time         // serverTimestamp, sem antedatar
      && request.resource.data.canal == 'portal';
}
function presencial() {
  return request.resource.data.canal in ['quiosque','presencial_papel']
      && (request.resource.data.canal != 'presencial_papel'
          || request.resource.data.comprovanteFisicoUrl.matches('https://.*'));
}

allow read:   if euSouODono(resource.data.funcionarioId)
                 || resource.data.uid == request.auth.uid
                 || isAdmin()
                 || temCap('documentos.assinaturas.ver', isRH());
allow create: if selfAceite()
                 || ((isAdmin() || temCap('documentos.assinaturas.colher', isRH())) && presencial());
allow update, delete: if false;   // aceite — inclusive RECUSA — é imutável
```

A chave do doc **ser** `funcionarioId` impede 2 aceites da mesma pessoa por versão. O aceite da v1
fica congelado quando a v2 reabre — fisicamente impossível um aceite novo apagar o antigo (vive em
outra subcoleção + `update/delete:false`).

### 5.5 `/auditoria/{id}` — reusa e amplia

```
// AJUSTE: hoje create só admin/RH. Ampliar para o colaborador gravar a própria ciência:
allow create: if request.resource.data.por == request.auth.uid
                 && request.resource.data.acao is string
                 && request.resource.data.acao.size() <= 200
                 && request.resource.data.em == request.time
                 && (isAdmin()
                     || temCap('auditoria.ver', isRH())
                     || request.resource.data.tipo == 'documento');
allow update, delete: if false;   // NÃO mexer — manter imutável
```

### 5.6 Escopo SELF (defense-in-depth)

Duas camadas que se reforçam: (1) **filtro de query no cliente** — toda consulta de aceites/docs é
`where('funcionarioId','==', currentUser().funcionarioId)`; o colaborador nunca roda `.get()`
amplo (`carregarDadosCompletos` ramifica por role). (2) **Rule como rede de segurança real** —
read de `/aceites` exige `euSouODono` ou `uid==auth.uid`; read de `/documentos` e `/versoes` exige
`documentoVisivelPara()`. Sem o vínculo a rule **falha-fecha**, nunca cai em "todos". O RH é o
oposto: vê o **agregado** via `documentos.assinaturas.ver`.

### 5.7 PII nas rules

A trilha de aceites **é** dado pessoal LGPD (quem assinou o quê, quando, com qual hash, e o motivo
da recusa = possível dado sensível). (1) **Acesso restrito por rule** — colaborador só os próprios;
RH por cap dedicada; **nunca** "qualquer autenticado". `/aceites` e `/versoes` **nascem fechados**
(não repetir o erro atual de `funcionarios`/`users`). (2) **Minimização** — o aceite guarda
`hashSha256` (não o PDF); o PDF vive no Drive (`url` https + `ehUrlSegura`); **CPF/PIS continuam só
em `banco-horas-saldos`**, jamais copiados pro aceite. (3) `userAgent`/`plataforma` são metadados
proporcionais; `texto` pode conter dado sensível → mesmo escopo restrito.

### 5.8 Anti-adulteração (resumo das travas)

1. **Imutabilidade** — `/versoes`, `/aceites`, `/auditoria` com `update,delete:false`. Correção =
   nova versão / novo evento, nunca sobrescrever.
2. **Autoria não-forjável** — `create` de `/aceites` exige `uid==auth.uid` E
   `funcionarioId==meuFuncionarioId()` (vínculo lido por `get()` na rule, não campo que o cliente
   escolhe). Quem está logado só assina por si.
3. **Hora confiável** — `em == request.time` força serverTimestamp; o cliente não antedata.
4. **Prova do conteúdo** — o aceite copia o hash da versão; trocar o PDF no Drive não muda o hash
   gravado (que prova quais bytes a pessoa aceitou).
5. **Aceite por versão sem sobrescrita** — chave = `funcionarioId` em subcoleção da versão; ao
   reabrir, o aceite antigo vive em outra subcoleção e é imutável.

**Testar no Emulator Suite** antes do deploy: próprio-aceita-OK; terceiro-aceita-NEGADO
(uid/funcionarioId mismatch); editar-aceite-NEGADO; apagar-versão-NEGADO; antedatar
(`em != request.time`)-NEGADO; segunda-versão-reabre-e-congela-a-primeira.

---

## 6. LGPD e retenção

A trilha É dado pessoal (às vezes sensível, no motivo de recusa). Princípios aplicados:

- **Minimização** — gravar só o necessário à prova. CPF/PIS **não** entram na trilha; o vínculo é
  por `funcionarioId`/`codigo`. A UI orienta a **não** coletar dado sensível desnecessário no
  campo de ressalva/motivo.
- **Acesso restrito (need-to-know)** — colaborador vê só os próprios comprovantes; RH/admin/comitê
  de ética veem o agregado e os individuais por necessidade; **líderes/supervisores não veem**
  assinaturas alheias por padrão.
- **Retenção por finalidade** — documentos de prova trabalhista/disciplinar guardam-se pelo prazo
  prescricional aplicável (definido com o jurídico — ordem de anos), não "para sempre por inércia".
  Informativos/visualizações podem ter retenção menor. `retencaoAteAaaaMm` marca o horizonte.
- **Expurgo controlado e registrado** — ao fim da retenção, expurgo gera um evento de auditoria
  `expurgo` (o quê e por quê). Expurgo **não** é o colaborador apagando — é processo de
  RH/jurídico, e como tudo é append-only só roda via Admin SDK (Function — ver seção 7).
- **Tensão honesta** — imutabilidade (delete:false) × direito ao apagamento: resolve-se por
  **política de retenção com base legal** (cumprimento de obrigação legal / exercício regular de
  direito) e expurgo programado, **não** por delete ad-hoc. Enquanto a finalidade probatória
  vigora, a base legal sustenta a guarda. Recusa/ressalva nunca são apagadas enquanto a versão for
  prova viva.
- **Inativação do funcionário** não apaga a trilha (conformidade), mas **tira o acesso self**.

---

## 7. O que exige Cloud Function / Blaze (Futuro)

Tudo abaixo está **fora do MVP** e sinalizado sem fingir que já temos:

1. **IP de origem confiável** — não vem do cliente Firestore; exige Function (callable/HTTPS) que
   lê `request.ip` no servidor e grava `ipServidor`. Pelo cliente só userAgent/plataforma/
   serverTimestamp — já cobrem prova de ciência razoável N1/N2 internos.
2. **Carimbo de tempo qualificado (ICP-Brasil)** — `serverTimestamp` prova a hora do relógio do
   Firestore, mas não é carimbo qualificado. Validade jurídica forte (N3) exige Function +
   provedor externo (Clicksign/D4Sign/gov.br).
3. **Tamper-evidence forte (encadeamento selado)** — a cadeia `eventoAnteriorHash` só tem valor
   probatório se selada no servidor (Function busca o último, calcula e grava). Client-side é
   meramente indicativo.
4. **Expurgo e anonimização LGPD** — como tudo é append-only (`delete:false`), apagar/anonimizar
   após o prazo só via Admin SDK numa Function (que bypassa as rules).
5. **Validade jurídica plena (N3)** — assinatura qualificada ICP é provedor externo + Blaze.
   Item de roadmap, Pendente.
6. **Revogação de credencial** — inativar `users/{uid}.ativo` não desliga a credencial no Firebase
   Auth; revogação real exige Admin SDK (correlato #10/#5).

**Nenhuma Cloud Function nova é obrigatória na Fase 1.** Só nos pontos acima, todos opcionais.

---

## 8. Reaproveitamento do FioPulse

| O que existe | Onde | Como entra no módulo |
|---|---|---|
| **Auditoria append-only** | `window.registrarAuditoria` (`firebase.js:892`); rule `firestore.rules:135-142` | Prova-mestre de todo ato. Criar análogo `registrarAssinatura` que injeta `serverTimestamp` + snapshots. **Único ajuste:** ampliar `create` p/ `tipo=='documento'` do colaborador |
| **Anexo do Controle PJ** | `contratoUrl` + `ehUrlSegura` (`utils.js:47`) + `google-drive.js` (`uploadContratoToDrive`, `findOrCreateFolderForPJ`) | `url`/`driveFileId` de cada versão; subpasta por documento no Drive; validação https/anti-XSS |
| **Histórico versionado do PJ** | `aditivos[]` via `arrayUnion` (`firebase.js:786`) | Precedente **conceitual** de "versões que não se sobrescrevem". Aqui vira **subcoleção** `/versoes` (cada versão tem aceites próprios) |
| **`conclusoes{periodo}`** | Obrigações (`firebase.js:1247`, `app.js:3676`); `FieldPath('conclusoes', chave)` em `marcarObrigacao` (`firebase.js:1243`) | Molde 1:1 da campanha de aceite (`periodo → versaoId`); widget de progresso (barra + pills) do painel RH |
| **Vínculo `uid ↔ funcionarioId`** | `funcionarios/{codigo}`, `funcionarioId='f-'+codigo`; `users/{uid}` ganha o vínculo (Fase 1) | Chave do aceite; resolução de público cruzando `state.funcionarios`; helpers de rule |
| **Segmento de Comunicados** | `{tipo,valores}` (roadmap #21) | Shape de `documento.publico` — coesão entre comunicado (leitura) e documento (assinatura) |
| **Matriz `temCap`/`permDoc`** | `firestore.rules:48-61` | Novas caps `documentos.gerenciar`, `documentos.assinaturas.ver`, `documentos.assinaturas.colher` |

---

## 9. Mapa de implementação (fatias pequenas, ordem sugerida)

Cada fatia é entregável e testável isoladamente. Aprovar e implementar **uma por vez**.

1. **Pré-requisito — vínculo `uid ↔ funcionarioId`** em `users/{uid}` (`funcionarioId`+`codigo`+
   `turno`/`setor`/`cargo`). Endurecer leitura de `funcionarios`/`users` (#2/#12). Sem isto, nada
   de SELF funciona. *(Já no plano da Fase 1.)*
2. **Caps e helpers de rule** — adicionar `documentos.*` em `PERM_CAPS`; helpers
   `meuFuncionarioId`/`isColaborador`/`euSouODono`/`publicoContem`/`documentoVisivelPara`. Testar
   no Emulator com role colaborador vs RH.
3. **Coleção `/documentos` + rules** (sem versões ainda) — CRUD de cabeçalho pelo RH; read por
   público. Tela RH de rascunho.
4. **Subcoleção `/versoes` + upload + hash** — reusar `google-drive.js` + `ehUrlSegura`; calcular
   SHA-256 no cliente; rule create-only (+ exceção `superada`). Publicar v1.
5. **Ampliar `create` de `/auditoria`** para `tipo=='documento'` do colaborador; helper
   `registrarAssinatura`. Testar próprio-OK / terceiro-NEGADO / antedatar-NEGADO.
6. **Subcoleção `/aceites` + rule self/presencial** — fluxo do colaborador (aceite/ciência/
   ressalva/recusa) com dupla escrita (`/aceites` + `/auditoria`) idealmente em `writeBatch`.
   Visualização (informativo) opcional.
7. **Anti-join "quem falta" + campanha** — resolver alvo de `state.funcionarios`; painel RH
   "faltam X de Y" reusando o widget das Obrigações; mapa `campanha{}` mantido pela rotina RH.
8. **Publicar nova versão (reabertura)** — `writeBatch`: cria v(N+1), `superada` na anterior, move
   ponteiro, audita + notifica. Testar "segunda-versão-reabre-e-congela-a-primeira".
9. **Estados derivados completos** — `pendente`/`visualizado`/`aceito`/`ressalva`/`recusado`/
   `atrasado`/`isento`; cálculo de atraso na leitura; suspensão para afastados.
10. **Captura presencial / quiosque** — cap `documentos.assinaturas.colher`; exigir
    `comprovanteFisicoUrl` no papel; modo quiosque por CPF.
11. **Comprovante exportável** — HTML imprimível por aceite (autossuficiente) + comprovante de
    campanha agregado para o RH.
12. **Reconciliação de recém-admitido** — pipeline diário anexa `funcionarioId` ao
    `publicoAlvoSnapshot` das vigentes não-arquivadas (única adição permitida).
13. **Política de retenção** — `retencaoAteAaaaMm`; documentar prazos com o jurídico. Expurgo/
    anonimização ficam para Function (seção 7), não bloqueiam o MVP.

---

*Fim da especificação. Implementação não iniciada — aprovar fatia a fatia.*
