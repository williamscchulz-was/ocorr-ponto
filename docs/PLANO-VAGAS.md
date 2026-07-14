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
