// Service Worker — Audiobook Ácidos
// Bump CACHE a cada nova versão para forçar atualização no celular.
const CACHE = 'acidos-v1.156.0';

// Arquivos essenciais (app shell) — pré-carregados na instalação.
const CORE = [
  './',
  './index.html',
  './Acido_base.html',
  './manifest.json',
  './imagens/icon-192.png',
  './imagens/icon-512.png',
  './imagens/icon-maskable-512.png',
  './imagens/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Requisições de faixa (Range) do <audio>: NÃO intercepta -> o navegador streama
  // direto da rede. Evita servir/gravar respostas parciais (206), que quebram o áudio.
  if (req.headers.has('range')) return;

  // HTML / navegação: NETWORK-FIRST -> sempre pega a versão mais nova quando online
  // (fallback pro cache quando offline). Assim a atualização aparece já no reload.
  const url = new URL(req.url);
  const ehDoc = req.mode === 'navigate' || req.destination === 'document' || /\.html($|\?)/.test(url.pathname);
  if (ehDoc) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('./Acido_base.html')))
    );
    return;
  }

  // Resto (imagens, áudio, etc.): cache-first com atualização em segundo plano.
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        // só guarda respostas COMPLETAS (200); nunca parciais (206) nem erros
        if (res && res.status === 200 && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
