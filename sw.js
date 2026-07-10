// Service Worker — Audiobook Ácidos
// Bump CACHE a cada nova versão para forçar atualização no celular.
const CACHE = 'acidos-v0.29.0';

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

// Estratégia: cache-first com atualização em segundo plano.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Requisições de faixa (Range) do <audio>: NÃO intercepta -> o navegador streama
  // direto da rede. Evita servir/gravar respostas parciais (206), que quebram o áudio.
  if (req.headers.has('range')) return;

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
