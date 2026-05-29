// Service Worker do FioPulse
//
// Estratégia (C1 — anti cache velho):
//  - HTML/navegação + JS/CSS: NETWORK-FIRST. Online sempre pega a versão
//    nova; cache só serve como fallback offline. Elimina o problema de
//    assets ?v=N velhos presos no cache.
//  - Imagens/ícones/fontes: cache-first (mudam raramente, ganho de perf).
//  - activate purga TODO cache com nome != CACHE atual. Bumpar CACHE a
//    cada deploy que mexa em SW/estratégia (segue o ?v= do index.html).

const CACHE = "fiopulse-v122";

self.addEventListener("install", () => {
  self.skipWaiting(); // ativa imediato, sem esperar abas antigas
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Só intercepta same-origin (não cacheia Firebase, Google Fonts, CDNs)
  if (url.origin !== self.location.origin) return;

  const p = url.pathname;
  const ehImagem = /\.(png|jpg|jpeg|svg|webp|ico|gif)$/i.test(p);

  if (ehImagem) {
    // Imagens: cache-first
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((resp) => {
          if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
          return resp;
        })
      )
    );
    return;
  }

  // HTML + JS + CSS + manifest: network-first (cache = fallback offline)
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
