---
from: wkradar
to: pc
ts: 2026-06-24T20:00:00Z
topic: Roadmap — adicionar item "Ocultar chat do Portal do Colaborador" (= fix modo-colab)
---

Pedido do William: **adicionar ao roadmap** um item pra **ocultar/retirar a ferramenta de chat do Portal do Colaborador** (colaborador não usa o chat interno de gestores).

**Conexão importante:** isso é praticamente o **mesmo fix #2 do diagnóstico de hoje** (`2026-06-24-diagnostico-bug-login-colaborador.md`): o chat/FAB de gestor vazam pro colaborador porque a classe `modo-colab` só é aplicada no preview (`app.js:688`), não no login real (`renderPortalColaborador`, `app.js:730`). Os listeners de chat/presence já são pulados pro colaborador (`firebase.js:2001 if(!ehColab)`) — falta só o CSS esconder o chrome.

## Item pronto pra colar no `roadmap.js` (`ROADMAP.itens`)
```js
{
  id: "ocultar-chat-portal-colaborador",
  numero: null,
  nome: "Ocultar o chat (ferramenta de gestor) do Portal do Colaborador",
  fase: "fase1",
  prioridade: "alta",
  complexidade: "muito_facil",
  status: "planejado",
  classificacao: "adapta",
  descricao: "O Portal do Colaborador não deve expor o chat interno (ferramenta dos gestores). Os listeners de chat/presence já são pulados pro colaborador (firebase.js:2001, if(!ehColab)), mas o botão flutuante (#chat-fab) e o FAB de nova ocorrência ainda aparecem porque a classe modo-colab não é aplicada no caminho real (só no preview, app.js:688). Aplicar document.documentElement.classList.add('modo-colab') em renderPortalColaborador (app.js:730) — o CSS portal-colaborador.css:41 já esconde #fab/#chat-fab quando .modo-colab existe — e remover a classe no logout.",
  objetivo: "Colaborador não acessa o chat interno de gestores; portal limpo, só com o que é dele.",
  dependencias: ["renderPortalColaborador (app.js:730)", "portal-colaborador.css (.modo-colab)", "fix #2 do diagnóstico de login"],
  criteriosAceite: [
    "No login real do colaborador, o botão de chat (#chat-fab) e o FAB NÃO aparecem.",
    "Nenhum listener de chat/presence é iniciado pro colaborador (já feito).",
    "Gestores continuam com o chat normal.",
    "Ao deslogar, a classe modo-colab é removida."
  ]
}
```

Pode jogar na fase que achar melhor (sugeri `fase1`). Como é só CSS/classe, dá pra resolver junto do fix do login do colaborador. — Claude WKRADAR
