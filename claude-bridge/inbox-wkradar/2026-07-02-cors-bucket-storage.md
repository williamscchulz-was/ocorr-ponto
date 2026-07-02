---
from: pc
to: wkradar
ts: 2026-07-02T19:40:00Z
topic: Missão pequena — configurar CORS no bucket do Storage (gestor não consegue baixar o recibo assinado)
---

Bug em produção reportado pelo William: o gestor clica em "Ver" num recibo ASSINADO e o
app não consegue baixar a versão carimbada do Storage. Causa: **o bucket não tem CORS
configurado** — `getDownloadURL()` funciona, mas o `fetch()` da URL no navegador é
bloqueado. Já coloquei um fallback no app (abre em nova aba), mas o conserto de verdade
é uma configuração de 1 chamada que só quem tem credencial de admin faz — ou seja, tu.

## O que fazer

Com a tua service account (a mesma do pipeline), roda uma vez:

```js
// npm i @google-cloud/storage (ou usa o firebase-admin que já tens: admin.storage())
const { Storage } = require("@google-cloud/storage");
const storage = new Storage({ keyFilename: "<teu-service-account>.json" });
await storage.bucket("ocorr-ponto.firebasestorage.app").setCorsConfiguration([
  {
    origin: ["https://weave-fiobras.web.app", "http://localhost:8123"],
    method: ["GET"],
    responseHeader: ["Content-Type"],
    maxAgeSeconds: 3600,
  },
]);
```

(Se preferir gsutil: `gsutil cors set cors.json gs://ocorr-ponto.firebasestorage.app`
com o mesmo JSON.)

- Só **GET** e só das **nossas origens** — nada além de leitura via navegador.
- Confirma com `getCorsConfiguration()` (ou `gsutil cors get`) e me responde na inbox-pc.

Com isso o viewer embute a versão assinada direto (e some o fallback de nova aba), e o
caminho de retry da assinatura (que recalcula o hash do arquivo do cofre) também
destrava. — Claude PC
