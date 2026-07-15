// Service Worker do FioPulse
//
// Estratégia (anti cache velho + boot rápido com cache quente):
//  - HTML/navegação: NETWORK-FIRST. Online sempre pega o index novo (que é
//    quem troca o ?v= dos assets); cache só serve de fallback offline.
//  - JS/CSS com ?v=N: CACHE-FIRST. A URL versionada já garante frescor (o
//    index novo aponta pro ?v novo), então servir do cache sem esperar a
//    rede acelera o boot com cache quente. JS/CSS SEM ?v cai no network-first.
//  - Imagens/ícones/fontes: cache-first (mudam raramente, ganho de perf).
//  - activate purga TODO cache com nome != CACHE atual. Bumpar CACHE a
//    cada deploy que mexa em SW/estratégia (segue o ?v= do index.html).

const CACHE = "fiopulse-v346";

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
  const ehImagemOuFonte = /\.(png|jpg|jpeg|svg|webp|ico|gif|woff2?|ttf)$/i.test(p);
  const ehAssetVersionado = url.searchParams.has("v") && /\.(js|css)$/i.test(p);

  if (ehImagemOuFonte || ehAssetVersionado) {
    // Cache-first: imagens/fontes mudam raramente; JS/CSS versionado tem a
    // URL trocada pelo index a cada deploy, então o cache nunca fica velho.
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

  // HTML/navegação + JS/CSS sem ?v + manifest: network-first COM TIMEOUT.
  // Antes caía pro cache só em ERRO de rede; rede LENTA (wifi de chão de fábrica
  // congestionado) travava o boot esperando a rede sem timeout. Agora: com cache
  // quente, corre a rede contra ~3s e serve o cache se ela não responder — o
  // index do cache funciona (o Hosting serve o conteúdo atual seja qual for o
  // ?v=, que é só cache-buster do cliente) e se autoatualiza no próximo launch.
  // 1ª visita (sem cache): espera a rede normalmente. A rede sempre atualiza o
  // cache em segundo plano quando responde.
  e.respondWith((async () => {
    const fromNet = fetch(e.request)
      .then((resp) => {
        if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return resp;
      });
    const cached = await caches.match(e.request);
    if (!cached) return fromNet.catch(() => caches.match(e.request));
    return Promise.race([
      fromNet.catch(() => cached),
      new Promise((res) => setTimeout(() => res(cached), 3000)),
    ]);
  })());
});
