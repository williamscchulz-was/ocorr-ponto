# FioPulse · Portal de Vagas

Documento vivo. Criado 2026-07-14 (decisão do William na mesma data).

## Decisão de escopo (William, 2026-07-14)

**v1 = SOMENTE PÚBLICO**: página aberta (sem login) divulgando as vagas da Fiobras,
com candidatura via WhatsApp da GP. **Vagas internas (colaborador se candidata pelo
portal) ficam no ROADMAP** como fase 2.

## v1: página pública + gestão pela GP

### Página pública `/vagas.html`
- Servida pelo mesmo hosting (aparece em gh.fiobras.com.br/vagas.html), gerada do
  Firestore no navegador, sem login: a regra libera leitura SÓ de vaga com
  status == 'publicada' (rascunho/encerrada negam; query where status == provável).
- Identidade Fiobras (paleta oficial, Poppins), mobile-first, leve (sem o app inteiro:
  HTML próprio + SDK Firestore, nada de app.js).
- Cada vaga: título, setor, turno, cidade, tipo (CLT/PJ), descrição, requisitos,
  publicada em. Botão "Quero me candidatar" abre wa.me/<numero-da-GP> com texto
  pré-preenchido citando a vaga. ZERO escrita pública (nada de spam).

### Gestão (portal do gestor)
- Tela "Vagas" com cap nova `vagas.gerenciar` (GLOBAL, GP/admin, padrão das demais).
- CRUD: criar rascunho, editar, publicar, encerrar (one-way encerrada, padrão clima),
  excluir rascunho. Config: número do WhatsApp que recebe candidaturas (fica no doc
  /config/vagas ou na própria tela; SEM PII de candidato no sistema).

### Modelo
```
/vagas/{id}  { titulo, setor, turno, cidade, tipo, descricao, requisitos,
               status: rascunho|publicada|encerrada, publicadaEm, criadoPor, criadoEm }
             read: publicada -> PUBLICO (sem auth); gestao le tudo (cap)
             write: cap vagas.gerenciar; transicoes one-way; delete so rascunho/admin
/config/vagas { whatsapp: "+55..." }  read publico (a pagina precisa), write cap
```

### LGPD
- A página pública NÃO coleta nada (sem formulário, sem cookie, sem análise).
- Candidato conversa direto com a GP no WhatsApp; nenhum dado de candidato entra no
  Firestore no v1.

## Gate Fable (2026-07-14): GO com ressalvas aplicadas

- Shape-lock no config/vagas (só {whatsapp} string <= 30); residual aceito: admin pelo
  match genérico escreve sem shape (papel confiável).
- Página pública 100% escapada (esc() em todo campo; zero innerHTML interpolado cru).
- App Check = YAGNI no v1 (enforcement é por PROJETO: ligar exigiria instrumentar o PWA
  inteiro); upgrade path registrado se abuso de leitura aparecer. Mitigação real do v1:
  cache sessionStorage com TTL na página + budget alert no GCP (PENDENTE William, 5 min:
  console.cloud.google.com > Billing > Budgets & alerts) + conferir no console do
  Firebase Auth que o signup público por email/senha está DESABILITADO (PENDENTE William).
- vagaShapeOk não tipa publicadaEm/encerradaEm em rascunho (writer confiável, cosmético).

## Roadmap (fase 2, decisão já tomada de POSTERGAR)
- Vagas internas: colaborador vê vagas no portal e se candidata com um toque
  (candidaturas/{uid} create-only self); GP vê fila por vaga. Possível gancho de
  gamificação (indicação premiada) SÓ com desenho anti-farm e consentimento do indicado.
- Formulário público com currículo: SÓ com Cloud Functions (anti-spam de verdade).

## Fases do v1
1. Mock (página pública + tela do gestor) no localhost, aprovação do William.
2. Rules (/vagas + /config/vagas) + testes no emulador + gate Fable (read público é
   novidade no projeto: revisar a fronteira com atenção) + deploy.
3. Página pública (public/vagas.html) + tela do gestor + harness.
4. Release (bump + deploy hosting com ok).

## v2 (2026-07-14, mesma noite): FORMULÁRIO no site (decisão William, WhatsApp sai)
- Candidatura agora é formulário na própria página: coleção /candidaturas, PRIMEIRA
  ESCRITA ANÔNIMA do projeto. Funil: create-only, hasOnly 8 campos com caps, email
  regex, em == request.time, status 'nova', vaga alvo obrigatoriamente 'publicada'
  (get), vagaTitulo == titulo real da vaga (mesmo get, cacheado), doc ID determinístico
  vagaId__email.lower() (1 por email por vaga; repetição vira update, negado).
  Read/list/delete SÓ GP (cap vagas.gerenciar); update fechado no v1. Suíte 538/538.
- Gate Fable GO condicionado, condição CUMPRIDA no mesmo release (A1): excluir vaga
  BLOQUEIA na UI enquanto houver candidaturas dela (senão a PII ficava órfã invisível).
- Excluir vaga ampliado: gpVagas + status rascunho OU encerrada (publicada continua
  exigindo encerrar antes; one-way preservado).
- Campo tipo (CLT) fora da UI (form do gestor, listagem e chip do site); segue opcional
  no shape, dado antigo intacto. Turno virou select (1º/2º/3º turno, Geral).
- WhatsApp: candidatura por WhatsApp REMOVIDA; config/vagas.whatsapp mantido pro
  ROADMAP: botão flutuante de WhatsApp direto pra GP no site (William pediu, "com ctz").
- Residuais ACEITOS (gate, severidade baixa, documentados): (a) oracle de existência
  (dá pra saber se um email se candidatou tentando criar e recebendo negado, a própria
  página confirma na mensagem de duplicada); (b) squatting: dá pra ocupar o slot de um
  email de terceiro, GP resolve excluindo a falsa (dedup por email nunca foi fronteira
  de segurança sem verificação de email); (c) spam variando email: honeypot com
  fake-success + 1 doc/email/vaga + docs ~1,4KB; alarme = budget alert (pendente
  William); upgrade path = App Check/Functions; (d) edição de título de publicada
  dentro do TTL de 5min do cache nega candidatura até o cache virar (auto-resolve).
- OBRIGAÇÃO LGPD criada pelo consentimento ("apenas neste processo seletivo"):
  (a) GP expurga candidaturas quando o processo encerra (a UI já força excluir
  candidaturas antes da vaga); (b) canal do titular pra exclusão = contato com a GP.

## v3 backend (2026-07-15): curriculo + teste de perfil (gate GO)
- Storage /curriculos: create-only ANONIMO (PDF <= 3MB, nome charset fechado,
  segmento unico), read/delete SO gestor por claims; update false. LIST NEGADO
  pra todo mundo pelas rules (match de segmento unico nao casa o prefixo):
  a poda/listagem da GP e VIA CONSOLE do Firebase, o app nao lista.
- Campos novos da candidatura (opcionais, retrocompat): nascimento (YYYY-MM-DD),
  disc {d,i,s,c} ints -8..8 (mapa parcial NEGA por erro de avaliacao, semantica
  testada), discPrimario, curriculoPath (matches proprio; o vinculo real e o campo).
- LGPD (gate): consentimento do form NOMEIA curriculo e teste com finalidade e
  prazo; retencao = DECISAO PENDENTE do William (sugestao 6 meses pos-encerramento);
  ordem do expurgo no front: apagar o ARQUIVO pelo curriculoPath ANTES do doc.
- Guardas pro front (quando implementar): rand do nome via crypto.randomUUID();
  GP abre curriculo SEMPRE no viewer pdf.js interno (nao executa script de PDF),
  download como fallback deliberado.
- Residuais aceitos: bytes nao-PDF com contentType forjado (viewer pdf.js degrada
  com erro), bomba gzip via contentEncoding (alvo GP, neutralizada pelo viewer),
  DISC auto-declarado (indicativo por design), curriculoPath apontando arquivo
  inexistente (404 pra GP, integridade baixa).
