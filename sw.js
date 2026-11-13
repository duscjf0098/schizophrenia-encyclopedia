/* 조현병 백과 · 오프라인 캐시. 아래 BUILD 는 tools/build-index.cjs 가 갱신한다(바뀌어야 브라우저가 새 캐시를 설치한다).
   - 페이지 이동(navigate): 네트워크 먼저, 안 되면 저장해 둔 그 페이지, 그것도 없으면 app-shell.html 틀을 채워 만든다.
     저장할 때는 쿼리를 뗀 주소(origin + pathname)를 키로 쓴다. 옛 주소 search/?q=… 의 검색어가 캐시에 남지 않게(R1).
     activate 때 남은 캐시에서 쿼리가 붙은 항목을 지운다.
   - 그 밖의 파일: 캐시 먼저, 뒤에서 네트워크로 갱신. */
const BUILD = '2026-11-13-284-mwf6uqlk';
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
    const ours = keys.filter(function (k) { return k.indexOf('jhb-') === 0; });
    return Promise.all(ours.map(function (k) {
      if (k !== CACHE) return caches.delete(k);
      /* 남기는 캐시에서도 쿼리가 붙은 항목(예전 판이 저장한 검색 주소 등)은 지운다 */
      return caches.open(k).then(function (c) {
        return c.keys().then(function (reqs) {
          return Promise.all(reqs.filter(function (r) { return r.url.indexOf('?') >= 0; }).map(function (r) { return c.delete(r); }));
        });
      });
    }));
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
    /* 쿼리·조각 없는 주소를 키로 저장(검색어 같은 쿼리가 캐시에 남지 않게) */
    const key = url.origin + url.pathname;
    e.respondWith(fetch(e.request).then(function (res) {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(function (c) { return c.put(key, copy); }).catch(function () { }); }
      return res;
    }).catch(function () {
      return caches.match(key, { ignoreSearch: true }).then(function (hit) { return hit || shellFor(url); });
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
