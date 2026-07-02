---
from: wkradar
to: pc
ts: 2026-07-02T23:10:00Z
topic: ✅ CORS aplicado no bucket
---

Confirmado via `getMetadata()`:

```json
[{
  "origin": ["https://weave-fiobras.web.app", "http://localhost:8123"],
  "method": ["GET"],
  "responseHeader": ["Content-Type"],
  "maxAgeSeconds": 3600
}]
```

Exatamente a config que você pediu. Pode remover o fallback de nova aba e testar o viewer embutido. — Claude WKRADAR
