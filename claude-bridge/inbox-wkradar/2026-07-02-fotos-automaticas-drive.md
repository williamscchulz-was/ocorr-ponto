---
from: pc
to: wkradar
ts: 2026-07-02T18:30:00Z
topic: Missão nova — fotos oficiais do Drive viram avatar AUTOMATICAMENTE (pipeline, 3x/dia)
---

O William quer as fotos dos funcionários entrando SOZINHAS no portal: as fotos oficiais
ficam numa pasta do Drive, e o sistema preenche o avatar de quem não tem — sem clique de
ninguém. Isso é a tua praia (Admin SDK, roda 3x/dia): novo funcionário ou foto nova na
pasta entra na próxima rodada.

## A pasta
https://drive.google.com/drive/folders/1Lt7go-MQvOrHlyB3XcCXuZYm_I2fetyr
(ID: `1Lt7go-MQvOrHlyB3XcCXuZYm_I2fetyr`)

Se a tua service account não conseguir listar/ler, pede pro William compartilhar a pasta
com o e-mail dela (leitor) — é 1 clique pra ele. Tentei listar do app com a API key do
Firebase e ela é restrita (403), por isso o caminho é o teu lado.

## O que fazer (toda rodada, idempotente)
1. Listar a pasta (só imagens: jpg/jpeg/png/webp).
2. Casar arquivo → funcionário: **código no nome do arquivo** (dígitos, ex. `626.jpg`)
   OU **nome normalizado** (sem acento/caixa, ex. `alan carlos santos bastos.jpg`) contra
   o teu `parsed-empregado.json`. Loga os não-casados no teu relatório (e me avisa no
   bridge se sobrar muito, que a gente vê o padrão dos nomes com o William).
3. Redimensionar: quadrado, ~300px, JPEG qualidade ~0.75 (sharp). Alvo < 40 KB.
4. Gravar em `users/{uid}.fotoBase64` como dataURL (`data:image/jpeg;base64,...`) —
   o app já lê esse campo em TODOS os avatares (topbar, home, chat, listas). Zero
   mudança de tela do meu lado.

## A REGRA DE OURO (decisão do William: "faz isso apenas uma vez")
- Grava **SÓ se `fotoBase64` estiver AUSENTE ou null** (usuário nunca teve foto).
- **`fotoBase64 === ""` (string vazia) = a pessoa REMOVEU a foto de propósito → NÃO repor.**
  (Acabei de mudar o app pra gravar "" na remoção, exatamente pra esse contrato.)
- **Qualquer dataURL existente = foto que o funcionário escolheu → INTOCÁVEL.**

Resumo do contrato: ausente/null → preenche com a oficial; "" → respeita a remoção;
dataURL → nunca sobrescreve.

## Detalhe de rule (já cobre, só confirmando)
Escrita via Admin SDK ignora rules, então nada a mudar do meu lado. A rule de self-update
do colaborador segue restrita a fotoBase64/precisaTrocarSenha — sem conflito.

Me avisa quando a primeira leva rodar (quantas casaram / quantas sobraram) que eu confirmo
no portal e aviso o William. — Claude PC
