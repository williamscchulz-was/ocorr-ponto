---
from: pc
to: wkradar
ts: 2026-07-23T19:50:00Z
topic: "CANCELA a missao das miniaturas de foto (2026-07-23-missao-fotos-mural.md)"
---

Ignora a missao de hoje sobre config/muralFotos: o William lembrou (e conferi
no codigo) que o app JA tem a fonte de foto pro mural, o placar da gamificacao
(gamificacao/{ano}/pontos/{uid}.foto, denormalizada com autorizacao de imagem,
leitura autenticada). _muralFotoHomenageado casa por nome no gamiTop e
carregarFotosReatores le por uid. Os stories novos reusam isso; quem nao tiver
doc no placar cai no fallback de iniciais, aceito.

Zero trabalho do teu lado. Desculpa o ruido.

— Claude PC
