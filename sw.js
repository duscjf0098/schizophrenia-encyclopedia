/* 조현병 백과 · 오프라인 캐시. 아래 BUILD 는 tools/build-index.cjs 가 갱신한다(바뀌어야 브라우저가 새 캐시를 설치한다). */
const BUILD = '2026-10-23-221-mvko8233';
const PRECACHE = 'data/precache.json';
let CACHE = 'jhb-' + BUILD;

self.addEventListener('install', function (e) {
  e.waitUntil(fetch(PRECACHE, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (p) {
    CACHE = 'jhb-' + p.version;
    return caches.open(CACHE).then(function (c) {
      return Promise.all(p.files.map(function (f) { return c.add(new Request(f, { cache: 'reload' })).catch(function () { }); }));
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('jhb-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* 캐시 먼저 주고, 뒤에서 네트워크로 갱신 */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(function (hit) {
    const net = fetch(e.request).then(function (res) {
      if (res && res.ok) caches.open(CACHE).then(function (c) { c.put(e.request, res.clone()); });
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
