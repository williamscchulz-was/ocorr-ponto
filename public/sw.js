// Service Worker do FioPulse
//
// Estratégia (anti cache velho + boot rápido com cache quente):
//  - HTML/navegação: NETWORK-FIRST. Online sempre pega o index novo (que é
//    quem troca o ?v= dos assets); cache só serve de fallback offline.
//  - JS/CSS com ?v=N: CACHE-FIRST. A URL versionada já garante frescor (o
//    index novo aponta pro ?v novo), então servir do cache sem esperar a
//    rede acelera o boot com cache quente. JS/CSS SEM ?v cai no network-first.
//  - Imagens/ícones: cache-first (mudam raramente, ganho de perf).
//  - FONTES: cache PRÓPRIO e PERSISTENTE (FONT_CACHE), que o activate NUNCA purga.
//    As fontes não mudam entre releases (o arquivo é imutável), então mantê-las
//    quentes faz a fonte da marca (Michroma do wordmark) já vir do cache logo após
//    uma atualização — o wordmark "FioPulse" nasce no tamanho final, sem o pulo
//    fallback->Michroma que aparecia quando o activate limpava o cache versionado.
//  - activate purga TODO cache com nome != CACHE atual E != FONT_CACHE. Bumpar CACHE
//    a cada deploy que mexa em SW/estratégia (segue o ?v= do index.html). FONT_CACHE
//    só muda se um dia os BYTES de uma fonte mudarem (bump manual do nome, raro).

const CACHE = "fiopulse-v402";
const FONT_CACHE = "fiopulse-fontes-v1";

self.addEventListener("install", () => {
  // NÃO faz skipWaiting automático: um SW novo ESPERA. Quem decide ativar é o app,
  // no boot, mandando SKIP_WAITING (aí ele mostra a tela de atualização e recarrega
  // 1x). Assim uma atualização achada NO MEIO da sessão não interrompe nada — fica
  // pro próximo open. No 1º install (sem controller) o SW ativa sozinho, pois não há
  // worker ativo pra substituir (skipWaiting só importa quando existe um).
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      // Preserva o cache atual E o cache persistente de fontes (nunca purgado).
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// O app manda SKIP_WAITING no boot quando detecta um SW novo esperando: ativa na
// hora (→ controllerchange → o app recarrega UMA vez pra pegar o código novo).
self.addEventListener("message", (e) => {
  const d = e && e.data;
  if (d === "SKIP_WAITING" || (d && d.type === "SKIP_WAITING")) self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Só intercepta same-origin (não cacheia Firebase, Google Fonts, CDNs)
  if (url.origin !== self.location.origin) return;

  const p = url.pathname;
  const ehFonte = /\.(woff2?|ttf)$/i.test(p);
  const ehImagem = /\.(png|jpg|jpeg|svg|webp|ico|gif)$/i.test(p);
  const ehAssetVersionado = url.searchParams.has("v") && /\.(js|css)$/i.test(p);

  if (ehFonte) {
    // Fontes: cache-first no cache PERSISTENTE (nunca purgado no activate). Mantém a
    // fonte da marca quente entre releases, então o wordmark não pula de tamanho pós-
    // atualização. Miss → busca na rede e semeia o cache de fontes.
    e.respondWith(
      caches.open(FONT_CACHE).then((c) =>
        c.match(e.request).then((cached) =>
          cached || fetch(e.request).then((resp) => {
            if (resp.ok) c.put(e.request, resp.clone());
            return resp;
          })
        )
      )
    );
    return;
  }

  if (ehImagem || ehAssetVersionado) {
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
