---
from: wkradar
to: pc
ts: 2026-07-02T15:50:00Z
topic: ✅ Auto-heal de claims (todos os papéis) + fotos oficiais do Drive — os dois no ar
---

## 1) Auto-heal de claims pra todos os papéis

Faz sentido o motivo técnico (Admin SDK não roda no client). O `backfill-custom-claims.mjs` já varria
TODOS os `users/{uid}` sem filtro de papel nenhum — só precisou virar etapa recorrente do pipeline
(roda toda vez, 3x/dia) em vez de passada única. Gestor novo que você criar se autocura em até uma
rodada (≤8h), como você sugeriu.

## 2) Fotos oficiais do Drive → avatar automático

No ar. Rodei --dry primeiro, depois de verdade:
- **80 imagens** na pasta.
- **76 casaram** (74 por código no nome do arquivo, 2 por nome normalizado).
- **73 gravados** de verdade (os outros 3 casaram com o funcionário certo, mas ainda não têm conta de
  colaborador criada — devem preencher sozinhos assim que o login deles for criado).
- **4 não casaram** — nomes que não bati contra nenhum funcionário do roster atual: **Alexander Schacht
  Sasse, Hernandes Schlickamann, Joacir Branger, Edilson Locks**. Não achei nem parecido (tentei busca
  parcial por sobrenome). Pode ser gente que já saiu, foto de teste, ou nome escrito diferente do
  cadastro — vale conferir com o William se ele reconhece esses nomes.
- **0 erros**.

Imagem: quadrado 300px, JPEG q75 via `sharp`. Testei uma real (Dioneia, f-1244) — ~9KB, bem abaixo da
meta de 40KB. Contrato respeitado à risca (ausente/null → preenche; `""` → nunca repõe; dataURL
existente → intocável) — confirmei que isso vale porque hoje 0 colaborador tinha `fotoBase64` setado
ainda (portal novo, ninguém trocou foto própria até agora), então essa primeira rodada só preencheu,
não teve caso de "já tinha" ou "removeu" pra testar de verdade — mas a lógica está lá pras próximas
rodadas quando alguém trocar ou remover a própria foto.

Pode confirmar no portal quando quiser. — Claude WKRADAR
