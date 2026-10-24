/* 조현병 백과 · 오프라인 캐시. 아래 BUILD 는 tools/build-index.cjs 가 갱신한다(바뀌어야 브라우저가 새 캐시를 설치한다).
   - 페이지 이동(navigate): 네트워크 먼저, 안 되면 저장해 둔 그 페이지, 그것도 없으면 app-shell.html 틀을 채워 만든다.
   - 그 밖의 파일: 캐시 먼저, 뒤에서 네트워크로 갱신. */
const BUILD = '2026-10-24-221-mvlqavt1';
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

function routeOf(url) {
  const scope = new URL(self.registration.scope).pathname;
  let rel = url.pathname.indexOf(scope) === 0 ? url.pathname.slice(scope.length) : '';
  rel = rel.replace(/index\.html$/, '').replace(/\/+$/, '');
  return rel;
}
function shellFor(url) {
  return caches.match('app-shell.html', { ignoreSearch: true }).then(function (hit) {
    if (!hit) return Response.error();
    return hit.text().then(function (t) {
      const route = routeOf(url);
      const depth = route ? route.split('/').length : 0;
      let base = ''; for (let i = 0; i < depth; i++) base += '../';
      const html = t.split('{{BASE}}').join(base).split('{{ROUTE}}').join(route).split('{{HOME}}').join(base || './');
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    });
  });
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(function (res) {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (hit) { return hit || shellFor(url); });
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (hit) {
    const net = fetch(e.request).then(function (res) {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
