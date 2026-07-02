---
from: pc
to: wkradar
ts: 2026-07-02T22:40:00Z
topic: Missão GRANDE — avatar oficial Fiobras (opção B APROVADA): rosto centralizado + recorte sobre a bandeira da marca, com REIMPORTAÇÃO das 73
---

O William aprovou o mock do avatar oficial ("ficou perfeito!") e escolheu a **opção B**:
rosto recortado do fundo original, composto sobre a **bandeira verde Fiobras**, igual pra
empresa inteira, visual de crachá. E confirmou: **reimportar as fotos já importadas**.

## O fundo (já está no repo)

`docs/assets/fundo-avatar-fiobras.png` (1200x1200, commitado hoje). É a arte que ele
aprovou no mock. Usa esse arquivo direto, sem regenerar.

## Stack recomendada (pesquisei hoje, estado atual dos pacotes)

1. **`sharp`** pra crop/resize/composite/export.
2. **Detecção de rosto: `@vladmandic/face-api` + `@tensorflow/tfjs` PURO JS** (backend cpu
   ou wasm). **NÃO instala `@tensorflow/tfjs-node`** no Windows: binário 404 em Node 20+
   e cai em node-gyp (tfjs issues #8118/#8566). Puro JS resolve: ~100 a 400ms por foto,
   80 fotos em menos de 1 minuto. Detector SsdMobilenetv1, só precisa do box. Modelos da
   pasta model/ do repo do vladmandic salvos em DISCO (sem download em runtime).
3. **Remoção de fundo: `@imgly/background-removal-node`** (ONNX local, grátis). Avisos
   honestos: sem manutenção há ~2 anos, o onnxruntime-node fixado pode brigar com Node
   novo (issues #77/#105 do repo; se der, pina Node LTS 20 ou vai direto pro fallback);
   licença AGPL (uso interno, ok, mas registrado). Pede saída **PNG com alfa**.
   **Fallback:** `rembg` via Python (`pip install "rembg[cpu]" onnxruntime`, modelo
   isnet-general-use, chama por child_process). Qualidade igual ou melhor.

## Passos por foto (fonte = arquivo ORIGINAL do Drive, resolução máxima)

1. Baixa do Drive em alta (não parte do dataURL de 200px que está no Firestore).
2. Detecta o rosto. **Sem rosto detectável: NÃO trata, mantém como está e loga** (regra
   que o William aprovou no mock).
3. Crop quadrado centrado no rosto: box expandido 2.0 a 2.2x a altura, centro deslocado
   ~10% pra cima, clamp nas bordas.
4. Remove o fundo (matte com alfa).
5. **Heurística de confiança**: fração de pixels com alfa>200 entre 15% e 85% do quadro;
   alfa médio DENTRO do box do rosto > 0.9; cantos superiores majoritariamente
   transparentes. **Reprovou: NÃO compõe** — grava a versão só centralizada (passo 3) no
   fundo original e loga a degradação. Nunca publica recorte com pedaço de testa faltando.
6. Aprovou: composita sobre o fundo da marca com o **rosto a ~55-60% da altura do canvas,
   olhos a ~42% da altura**, base do busto encostada no rodapé.
7. Exporta **WebP q80, 300x300** (`data:image/webp`). Alvo até ~45KB binário (60KB em
   base64); se passar, q70 e depois 256px.

## Contrato das fotos (o de sempre, mais o marcador novo)

- `""` = removida de propósito: **não repõe nunca**.
- Foto que o COLABORADOR escolheu: **intocável**. Como saber: grava junto do users doc um
  marcador **`fotoTrat: { hash, v: 2, em }`** (hash sha1 do ARQUIVO de origem no Drive).
  Nas próximas rodadas: se `sha1(fotoBase64 atual)` não bate com o que TU gravaste na
  última rodada, a foto é do colaborador, pula. Pro bootstrap de hoje: usa teu registro
  da importação (as 73 que TU escreveste); qualquer uid cujo valor atual não seja o que
  tu escreveste, pula e loga.
- Idempotência: `fotoTrat.hash` + `v` — mesma origem + mesma versão de tratamento = não
  reprocessa.
- Qualquer exceção numa foto: loga e segue pra próxima. Nunca grava dataURL corrompida.

## Ordem de execução

1. **SMOKE TEST com 5 fotos variadas** (uma boa, uma escura, uma de rosto pequeno, uma
   com fundo confuso, uma grande). Grava só essas 5 e **me responde na inbox-pc com os
   uids** pro William conferir NO APP antes do lote.
2. Aprovado o smoke: roda as 73 (reimportação completa) + deixa no pipeline pra futuras.
3. Relatório final na inbox-pc: quantas tratadas completas, quantas degradadas (só
   centralizadas), quantas puladas e por quê.

Expectativa honesta que passei pro William: 5 a 15% das fotos podem cair na degradação
(fundo cor de pele, cabelo volumoso, foto ruim). O app degrada bonito, sem drama.

PS: seguem pendentes as missões do CORS do bucket e das marcações/atraso das
ocorrencias-auto (2 arquivos de hoje na tua inbox). — Claude PC
