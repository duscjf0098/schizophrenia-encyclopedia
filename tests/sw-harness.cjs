/* tests/privacy.test.cjs 가 따로 띄우는 서비스 워커 시험대(비동기라 자식 프로세스로 돌려 결과 JSON 을 찍는다). 단독 실행: node tests/sw-harness.cjs */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

function swHarness() {
  const handlers = {};
  const store = new Map(); // cache name → Map(url → response)
  function keyOf(r) { return typeof r === 'string' ? r : r.url; }
  function bare(u) { return u.split('?')[0]; }
  function cacheObj(name) {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      put: function (req, res) { m.set(keyOf(req), res); return Promise.resolve(); },
      add: function (req) { m.set(keyOf(req), { ok: true, body: 'pre' }); return Promise.resolve(); },
      keys: function () { return Promise.resolve(Array.from(m.keys()).map(function (u) { return { url: u }; })); },
      delete: function (req) { return Promise.resolve(m.delete(keyOf(req))); },
      match: function (req, o) {
        const k = keyOf(req);
        if (m.has(k)) return Promise.resolve(m.get(k));
        if (o && o.ignoreSearch) { for (const [u, v] of m) if (bare(u) === bare(k)) return Promise.resolve(v); }
        return Promise.resolve(undefined);
      }
    };
  }
  let online = true;
  const sandbox = {
    URL: URL, Promise: Promise, console: console,
    location: { origin: 'https://x.test' },
    self: {
      addEventListener: function (t, f) { handlers[t] = f; },
      registration: { scope: 'https://x.test/site/' },
      skipWaiting: function () { return Promise.resolve(); },
      clients: { claim: function () { return Promise.resolve(); } }
    },
    caches: {
      open: function (n) { return Promise.resolve(cacheObj(n)); },
      keys: function () { return Promise.resolve(Array.from(store.keys())); },
      delete: function (n) { return Promise.resolve(store.delete(n)); },
      match: function (req, o) {
        const names = Array.from(store.keys());
        return names.reduce(function (p, n) { return p.then(function (hit) { return hit || cacheObj(n).match(req, o); }); }, Promise.resolve(undefined));
      }
    },
    fetch: function (req) {
      if (!online) return Promise.reject(new TypeError('Failed to fetch'));
      const res = { ok: true, url: keyOf(req), clone: function () { return { ok: true, url: res.url, copy: true }; } };
      return Promise.resolve(res);
    },
    Response: function () { }
  };
  sandbox.Response.error = function () { return { error: true }; };
  vm.runInNewContext(read('sw.js'), sandbox);
  const BUILD = /const BUILD = '([^']*)';/.exec(read('sw.js'))[1];
  function settle() { return new Promise(function (r) { setTimeout(r, 0); }); }
  return {
    handlers: handlers, store: store, BUILD: BUILD, settle: settle, setOnline: function (v) { online = v; },
    navigate: function (url) {
      let p = null;
      handlers.fetch({ request: { method: 'GET', url: url, mode: 'navigate' }, respondWith: function (x) { p = x; } });
      return p.then(function (r) { return settle().then(function () { return r; }); });
    }
  };
}
const swResults = {};
const swDone = (function () {
  const h = swHarness();
  const CACHE = 'jhb-' + h.BUILD;
  /* 지난 판이 저장한 검색 주소(쿼리 포함)와 다른 판의 캐시 */
  h.store.set(CACHE, new Map([['https://x.test/site/search/?q=%EC%A3%BD', { ok: true }], ['https://x.test/site/a/x/', { ok: true }]]));
  h.store.set('jhb-old', new Map([['https://x.test/site/', { ok: true }]]));
  h.store.set('other-app', new Map([['https://x.test/z?q=1', { ok: true }]]));
  let act = null;
  h.handlers.activate({ waitUntil: function (p) { act = p; } });
  return act.then(function () {
    swResults.afterActivate = { names: Array.from(h.store.keys()).sort(), ours: Array.from(h.store.get(CACHE).keys()), other: Array.from(h.store.get('other-app').keys()) };
    return h.navigate('https://x.test/site/search/?q=%EC%82%AC%EB%9D%BC%EC%A7%80%EA%B3%A0');
  }).then(function () {
    return h.navigate('https://x.test/site/a/visual-hallucination/?course=%25');
  }).then(function () {
    swResults.afterNav = Array.from(h.store.get(CACHE).keys()).sort();
    h.setOnline(false);
    return h.navigate('https://x.test/site/search/?q=other');
  }).then(function (r) {
    swResults.offlineHit = r && r.copy === true;
  }).catch(function (e) { swResults.error = String(e && e.stack || e); });
})();

swDone.then(function () { process.stdout.write(JSON.stringify(Object.assign({ build: /const BUILD = '([^']*)';/.exec(read('sw.js'))[1] }, swResults))); });
