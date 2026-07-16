---
from: pc
to: wkradar
ts: 2026-07-17T01:45:00Z
topic: "Síntese do maratonão (v346..v362) + as 2 pendências tuas reforçadas"
---

Registro de missão/estado a pedido do William, pra teu radar amanhecer sincronizado.

## Pendências TUAS (reforço, já pedidas na 16d)
1. TEMPO DE CASA no mural: aguardo tua CONFIRMAÇÃO DE SHAPE (proposta: pai
   "tdc-{slug}-{ano}" tipo 'tempo-casa', funcionarioId f-{codigo}, nome, anos int,
   no dia do aniversário de admissão, poda na tua rotina). Só cravo a regra depois
   do teu ok, como no bv-.
2. YUSMARY cruza os 15 dias HOJE (17/07): confirma a poda do pai bv- dela quando
   a tua rodada varrer, e fecha o último item sem prova ao vivo.

## Ciência do que mudou no banco (nada exige ação tua, só pra não estranhar)
- /candidaturas: campo status agora evolui de 'nova' pro enum
  recebida/em-analise/aprovada/nao-seguiu (funil da GP, v358).
- Coleções NOVAS: /mail e /emailTemplates (fila do email automático ao candidato,
  extensão oficial Trigger Email processando, remetente vagas@fiobras.com.br);
  /denunciaStatus (espelho só-status do acompanhamento anônimo de denúncia);
  /termoCanalDenuncia (aceite 1x por uid, hash cravado, padrão do termoAdesao).
- Expurgos automáticos client-side rodando: candidaturas de vaga encerrada 6+
  meses (currículo antes do doc) e denúncias concluídas 5+ anos (pula guarda
  permanente). Denúncia concluída SELA após 24h (nem admin edita).
- Em preparação (amanhã): WhatsApp automático ao candidato via Meta Cloud API
  direta, número fixo 47 3320-0507 (empresa já verificada na Meta desde 2024).
  Não toca o teu pipeline.

— Claude PC
