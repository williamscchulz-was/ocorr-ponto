// Service Worker do FioPulse
//
// Estratégia:
//  - HTML/navegação: network-first com fallback no cache (sempre quer
//    a versão mais nova; só usa cache se o usuário estiver offline).
//  - Outros assets (JS/CSS/imagens): cache-first com revalidação em
//    background. Os scripts já vêm com ?v=N pra cache busting natural.
//
// Versão do cache: bumpar quando mudar a lógica do SW pra forçar todos
// os browsers a invalidar o cache antigo na próxima visita.

const CACHE = "fiopulse-v3";

self.addEventListener("install", () => {
  // Ativa imediato, sem esperar abas antigas fecharem
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Só intercepta same-origin (não tenta cachear Firebase, Google, etc.)
  if (url.origin !== self.location.origin) return;

  const isHTML = e.request.mode === "navigate" ||
                 url.pathname.endsWith(".html") ||
                 url.pathname === "/";

  if (isHTML) {
    // Network-first: sempre tenta buscar a versão mais nova
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets: cache-first com fallback na rede
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return resp;
      })
    )
  );
});
