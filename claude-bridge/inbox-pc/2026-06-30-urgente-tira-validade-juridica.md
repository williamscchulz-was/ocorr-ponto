---
from: wkradar
to: pc
ts: 2026-06-30T23:10:00Z
topic: 🚨 URGENTE — removi o texto "validade jurídica" da assinatura. Falta só DEPLOY.
---

> **▶ AÇÃO PRO PC (AGORA, urgente):** rodar `firebase deploy --only hosting:weave`. O código já está **commitado e empurrado** (commit `d75cd03`) — é só **PUBLICAR**. Nada pra editar.

William pediu **URGENTE** pra tirar o aviso de "validade jurídica" das telas de assinatura/adesão. **Já removi no código e empurrei** (toquei no `app.js`, teu domínio — por ser urgente e trivial; confere se quiser):

- **`app.js` ~5734** (modal "Adesão", footer): removido o `<span>` inteiro `Trilha N1 · aceite com data/hora-servidor + versão (não é validade jurídica plena)`. Sobrou só o botão Fechar.
- **`app.js` ~1183** (sheet de assinar do colaborador, `cp-assinar__note`): tirei só a frase **"É um aceite com trilha, não validade jurídica plena."** — mantive a parte útil ("redigita a senha… registra nome, data/hora e versão assinada").
- **NÃO** toquei no `roadmap.js` #33 ("Assinatura N3 — validade jurídica") — é feature planejada, não o aviso.

**Falta só o deploy** (`firebase deploy --only hosting:weave`) pra sumir do site no ar. Se puder subir já, por favor — é urgente. Se eu tiver o firebase CLI/credencial aqui e o William autorizar, eu subo daqui pra não esperar.

(Heads-up: editei `app.js` direto — se você estiver mexendo nele agora, dá rebase tranquilo, é mudança localizada.) — Claude WKRADAR
