/* K1 코어 정리 테스트: 조각 링크(2), 개인정보 지우기 계획(3), 기록 쉼과 서비스 워커(4), 이어서 읽기(5),
   첫 화면 최근 목록(6), 코스 찾기·대상 문구(7). app.js 는 node 에서 불러지지 않아서 논리는 js/paths.js·js/progress.js 의 순수 함수로 뺐어요.
   서비스 워커 시험은 비동기라 이 파일을 자식 프로세스로 한 번 더 띄워(JHB_CORE_SW=1) 결과 JSON 을 받아요. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');
const ROOT = path.join(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

/* ================= 서비스 워커 시험대(자식 프로세스) ================= */
if (process.env.JHB_CORE_SW === '1') {
  const store = new Map();
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
  const net = { online: true, redirected: {} };
  /* 워커 하나 띄우기(같은 store 를 쓰면 "워커가 다시 뜬" 것과 같음) */
  function boot() {
    const handlers = {};
    const sandbox = {
      URL: URL, Promise: Promise, console: console, location: { origin: 'https://x.test' },
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
          const names = (o && o.cacheName) ? (store.has(o.cacheName) ? [o.cacheName] : []) : Array.from(store.keys());
          return names.reduce(function (p, n) { return p.then(function (hit) { return hit || cacheObj(n).match(req, o); }); }, Promise.resolve(undefined));
        }
      },
      fetch: function (req) {
        if (!net.online) return Promise.reject(new TypeError('Failed to fetch'));
        const u = keyOf(req);
        const res = { ok: true, url: u, redirected: !!net.redirected[u], clone: function () { return { ok: true, url: u, copy: true }; } };
        return Promise.resolve(res);
      },
      Response: function (body) { this.body = body; this.text = function () { return Promise.resolve(String(body)); }; }
    };
    sandbox.Response.error = function () { return { error: true }; };
    vm.runInNewContext(read('sw.js'), sandbox);
    function settle() { return new Promise(function (r) { setTimeout(r, 0); }); }
    return {
      navigate: function (url) {
        let p = null;
        handlers.fetch({ request: { method: 'GET', url: url, mode: 'navigate' }, respondWith: function (x) { p = x; } });
        return p.then(function (r) { return settle().then(function () { return r; }); });
      },
      get: function (url) {
        let p = null;
        handlers.fetch({ request: { method: 'GET', url: url, mode: 'cors' }, respondWith: function (x) { p = x; } });
        return p.then(function (r) { return settle().then(function () { return r; }); });
      },
      message: function (data) {
        let job = Promise.resolve();
        handlers.message({ data: data, waitUntil: function (p) { job = p; } });
        return job.then(settle);
      }
    };
  }
  const BUILD = /const BUILD = '([^']*)';/.exec(read('sw.js'))[1];
  const CACHE = 'jhb-' + BUILD;
  /* 이 판 캐시의 항목(워커가 알림을 받았다는 표시 __jhb-state/known 은 빼고) */
  function ours() { return store.has(CACHE) ? Array.from(store.get(CACHE).keys()).filter(function (k) { return k.indexOf('__jhb-state/') < 0; }).sort() : []; }
  function known() { return store.has(CACHE) && store.get(CACHE).has('__jhb-state/known'); }
  const R = {};
  store.set(CACHE, new Map([['https://x.test/site/css/style.css', { ok: true, body: 'old' }]]));
  let w = boot();
  /* 한 번도 알림을 받지 않은 워커(처음 설치 직후)는 예전처럼 저장 */
  w.navigate('https://x.test/site/a/zero/').then(function () {
    R.fresh = ours();
    R.knownFresh = known();
    /* 페이지는 열릴 때마다 쉼 상태를 알려 준다(js/app.js tellWorker) */
    return w.message({ jhb: 'privacy', paused: false });
  }).then(function () {
    R.knownAfterMsg = known();
    store.get(CACHE).delete('https://x.test/site/a/zero/');
    return w.navigate('https://x.test/site/a/one/');
  }).then(function () {
    R.before = ours();
    return w.message({ jhb: 'privacy', paused: true });
  }).then(function () {
    R.stateAfterOn = store.has('jhb.state') ? Array.from(store.get('jhb.state').keys()) : [];
    return w.navigate('https://x.test/site/a/two/');
  }).then(function () {
    return w.navigate('https://x.test/site/a/three/?course=first-diagnosis');
  }).then(function () {
    return w.get('https://x.test/site/content/09-living/new-article.md');
  }).then(function () {
    return w.get('https://x.test/site/css/style.css');
  }).then(function () {
    R.paused = ours();
    R.styleRefreshed = store.get(CACHE).get('https://x.test/site/css/style.css').copy === true;
    /* 워커가 다시 떠도(메모리 비움) 쉼을 기억 */
    w = boot();
    return w.navigate('https://x.test/site/a/four/');
  }).then(function () {
    R.afterRestart = ours();
    /* 오프라인: 이미 저장된 글은 그대로 열림 */
    net.online = false;
    return w.navigate('https://x.test/site/a/one/');
  }).then(function (r) {
    R.offlineHit = !!(r && r.copy === true);
    net.online = true;
    return w.message({ jhb: 'privacy', paused: false });
  }).then(function () {
    R.stateAfterOff = store.has('jhb.state') ? Array.from(store.get('jhb.state').keys()) : [];
    return w.navigate('https://x.test/site/a/five/');
  }).then(function () {
    /* 리다이렉트된 응답은 넣지 않음 */
    net.redirected['https://x.test/site/a/six'] = true;
    net.redirected['https://x.test/site/data/moved.json'] = true;
    return w.navigate('https://x.test/site/a/six');
  }).then(function () {
    return w.get('https://x.test/site/data/moved.json');
  }).then(function () {
    /* 엉뚱한 메시지는 무시 */
    return w.message({ jhb: 'privacy', paused: 'yes' });
  }).then(function () {
    return w.navigate('https://x.test/site/a/seven/');
  }).then(function () {
    R.after = ours();
    R.stateValueOff = store.has('jhb.state') ? Array.from(store.get('jhb.state').values()).map(function (v) { return v.body; }) : [];
    /* K3-6: 쉼 중에 상태 캐시(jhb.state)만 사라지고 워커가 다시 뜨면, 상태를 모르는 동안의 이동은 넣지 않는다 */
    return w.message({ jhb: 'privacy', paused: true });
  }).then(function () {
    store.delete('jhb.state');
    w = boot();
    return w.navigate('https://x.test/site/a/eight/');
  }).then(function () {
    return w.get('https://x.test/site/content/09-living/unknown-state.md');
  }).then(function () {
    R.unknown = ours();
    /* 페이지가 다시 알려 주면(쉼 끔) 그 뒤로는 다시 저장 */
    return w.message({ jhb: 'privacy', paused: false });
  }).then(function () {
    return w.navigate('https://x.test/site/a/nine/');
  }).then(function () {
    /* "쉼 아님"도 기억해 두어서 워커가 다시 떠도 바로 저장 */
    w = boot();
    return w.navigate('https://x.test/site/a/ten/');
  }).then(function () {
    R.afterKnown = ours();
    /* 상태 캐시를 읽다가 실패해도 넣지 않는다 */
    store.delete('jhb.state');
    w = boot();
    return w.navigate('https://x.test/site/a/eleven/');
  }).then(function () {
    R.afterLost = ours();
  }).catch(function (e) { R.error = String(e && e.stack || e); }).then(function () {
    process.stdout.write(JSON.stringify(R));
  });
  return;
}

/* ================= 단위 테스트 ================= */
const P = require('../js/paths.js');
const PR = require('../js/progress.js');
const md = require('../js/md.js');

/* ---------- 2. 조각 링크 ---------- */
test('조각 링크: #/about#privacy → about/#privacy, 쿼리·조각 순서, 빈 조각은 버림', function () {
  eq(P.hashToPath('#/about#privacy'), 'about/#privacy');
  eq(P.hashToPath('#/a/crisis-hotlines#h-3'), 'a/crisis-hotlines/#h-3');
  eq(P.hashToPath('#/a/x?course=first-diagnosis#h-2'), 'a/x/?course=first-diagnosis#h-2');
  eq(P.hashToPath('#/about#'), 'about/');
  eq(P.hashToPath('#/#top'), '#top');
  eq(P.link('#/about#privacy', '../../'), '../../about/#privacy');
  eq(P.link('#/about#privacy', ''), 'about/#privacy');
  eq(P.link('#/#top', ''), './#top', '첫 화면의 조각은 지금 페이지가 아니라 첫 화면');
  eq(P.link('#/?x=1', ''), './?x=1');
  eq(P.link('#/#top', '../'), '../#top');
  eq(P.rewriteHtml('<a href="#/about#privacy">기록과 개인정보</a>', '../'), '<a href="../about/#privacy">기록과 개인정보</a>');
  /* 예전 모양은 그대로 */
  eq(P.link('#/', ''), './'); eq(P.link('#/', '../../'), '../../'); eq(P.link('#h-2', '../../'), '#h-2');
});

test('fragmentId: 화면 안 id 를 가리키는 조각만(옛 해시 주소·빈 조각은 null)', function () {
  eq(P.fragmentId('#privacy'), 'privacy');
  eq(P.fragmentId('#h-3'), 'h-3');
  eq(P.fragmentId('#%ED%99%98'), '환');
  eq(P.fragmentId('#%E0%A4'), '%E0%A4');
  [null, undefined, '', '#', '#/about', '#/', 'privacy'].forEach(function (v) { eq(P.fragmentId(v), null, String(v)); });
});

/* ---------- 3. 개인정보 지우기 계획 ---------- */
const KINDS = [
  { id: 'read', keys: ['jhb.read', 'jhb.course'], session: [] },
  { id: 'recent', keys: ['jhb.recent'], session: [] },
  { id: 'recentq', keys: ['jhb.ui.palette.recentq'], session: ['jhb.q'] },
  { id: 'role', keys: ['jhb.ui.home.role'], session: ['jhb.ui.home.role'] },
  { id: 'settings', keys: ['jhb.theme', 'jhb.fs', 'jhb.ui.settings', 'jhb.ui.reading.mode', 'jhb.ui.home.installHidden', 'jhb.ui.home.recentHidden'], session: [] },
  { id: 'ask', keys: ['jhb.ui.ask.keep', 'jhb.ui.ask.items'], session: ['jhb.ui.ask.session'] }
];
const LS = ['jhb.read', 'jhb.course', 'jhb.theme', 'jhb.privacy.paused', 'jhb.privacy.recentq', 'jhb.privacy.future', 'jhb.fav-other', 'other.app'];

test("planClear('all'): 등록된 키 전부 + jhb.privacy.*(등록 안 된 것도), 기록 쉼은 남김", function () {
  const r = PR.planClear(KINDS, 'all', { paused: true, lsKeys: LS });
  eq(r.all, true);
  eq(r.done, ['read', 'recent', 'recentq', 'role', 'settings', 'ask']);
  ok(r.ls.indexOf('jhb.privacy.recentq') >= 0 && r.ls.indexOf('jhb.privacy.future') >= 0, '등록 안 된 jhb.privacy.* 도 지움');
  ok(r.ls.indexOf('jhb.privacy.paused') < 0, '기록 쉼은 남김');
  ok(r.ls.indexOf('other.app') < 0 && r.ls.indexOf('jhb.fav-other') < 0, 'jhb.privacy.* 밖의 등록 안 된 키는 이 계획이 아님(내 서재가 따로)');
  eq(r.ss, ['jhb.q', 'jhb.ui.home.role', 'jhb.ui.ask.session']);
  /* 쉼이 아니면 paused 키(틀린 값)도 지움 */
  ok(PR.planClear(KINDS, 'all', { paused: false, lsKeys: LS }).ls.indexOf('jhb.privacy.paused') >= 0);
});

test("planClear('all', { keep: ['settings'] }): 남기는 종류의 키와 기록 쉼만 남기고 jhb.privacy.* 는 지움", function () {
  const r = PR.planClear(KINDS, 'all', { keep: ['settings'], paused: true, lsKeys: LS });
  eq(r.done, ['read', 'recent', 'recentq', 'role', 'ask']);
  KINDS[4].keys.forEach(function (k) { ok(r.ls.indexOf(k) < 0, k + ' 는 남겨야 함'); });
  ok(r.ls.indexOf('jhb.privacy.future') >= 0 && r.ls.indexOf('jhb.privacy.recentq') >= 0);
  ok(r.ls.indexOf('jhb.privacy.paused') < 0);
  /* 다른 종류와 같은 키를 쓰면 남기는 쪽이 이긴다 */
  const shared = KINDS.concat([{ id: 'x', keys: ['jhb.theme', 'jhb.x'], session: [] }]);
  const s = PR.planClear(shared, 'all', { keep: 'settings', lsKeys: [] });
  ok(s.ls.indexOf('jhb.theme') < 0 && s.ls.indexOf('jhb.x') >= 0);
});

test('planClear: id 목록은 그 종류만(jhb.privacy.* 는 건드리지 않음), 인자를 빠뜨리면 아무것도 지우지 않음', function () {
  const r = PR.planClear(KINDS, ['recent', 'read', 'nope'], { lsKeys: LS });
  eq(r.done, ['read', 'recent']); eq(r.ls, ['jhb.read', 'jhb.course', 'jhb.recent']); eq(r.all, false);
  eq(PR.planClear(KINDS, 'recentq', {}).ss, ['jhb.q']);
  [undefined, null, '', []].forEach(function (v) { eq(PR.planClear(KINDS, v, { lsKeys: LS }), { all: false, done: [], ls: [], ss: [] }, JSON.stringify(v)); });
});

/* ---------- K5-1 기록 종류 plan: 모든 화면에서(app.js 기본 종류) ---------- */
/* app.js 는 node 에서 불러지지 않아서, 기본 종류 목록(BASE_KINDS) 글자만 떼어 그대로 실행해 봐요 */
function appBaseKinds() {
  const src = read('js/app.js');
  const m = /const BASE_KINDS = (\[[\s\S]*?\n  \]);/.exec(src);
  ok(m, 'app.js 의 const BASE_KINDS = [ … ]');
  ok(/BASE_KINDS\.forEach\(privRegister\)/.test(src), '기본 종류는 화면과 상관없이 바로 등록');
  return vm.runInNewContext(m[1]).map(function (k) { return { id: k.id, label: k.label, keys: k.keys || [], session: k.session || [] }; });
}
test('K5-1 app.js 기본 기록 종류에 plan(미리 써 두는 종이)이 있고, 키는 plan 화면(js/pages/plan.js)의 KEYS 와 같다', function () {
  const kinds = appBaseKinds();
  const plan = kinds.filter(function (k) { return k.id === 'plan'; })[0];
  ok(plan, 'plan 종류');
  eq(plan, { id: 'plan', label: '미리 써 두는 종이', keys: ['jhb.ui.plan.keep', 'jhb.ui.plan.data'], session: [] });
  const PL = require('../js/pages/plan.js').lib;
  eq(plan.keys, [PL.KEYS.keep, PL.KEYS.data], 'plan.js 의 저장 키와 같음');
  eq(kinds.map(function (k) { return k.id; }), ['read', 'recent', 'pos', 'recentq', 'fav', 'role', 'settings', 'plan'], '기존 종류 순서는 그대로, plan 은 뒤에 더함');
  /* plan 화면 안의 등록(배포 직후 옛 app.js 대비)은 같은 값이라 덮어써도 바뀌지 않음 */
  const src = read('js/pages/plan.js');
  has(src, "app.privacy.register({ id: 'plan', label: '미리 써 두는 종이', keys: [KEYS.keep, KEYS.data] })");
});
test("K5-1 지우기: clear('all')·clear('all', { keep: ['settings'] }) 는 종이 두 키를 지우고, clear(['plan']) 은 그것만", function () {
  const kinds = appBaseKinds();
  const LSK = ['jhb.ui.plan.keep', 'jhb.ui.plan.data', 'jhb.read', 'jhb.theme', 'jhb.privacy.recentq'];
  const all = PR.planClear(kinds, 'all', { lsKeys: LSK });
  ok(all.done.indexOf('plan') >= 0 && all.ls.indexOf('jhb.ui.plan.keep') >= 0 && all.ls.indexOf('jhb.ui.plan.data') >= 0, '전부 지우기');
  const keep = PR.planClear(kinds, 'all', { keep: ['settings'], lsKeys: LSK });
  ok(keep.ls.indexOf('jhb.ui.plan.keep') >= 0 && keep.ls.indexOf('jhb.ui.plan.data') >= 0, '보기 설정만 남기는 전부 지우기');
  ok(keep.ls.indexOf('jhb.theme') < 0, '보기 설정은 남음');
  const one = PR.planClear(kinds, ['plan'], { lsKeys: LSK });
  eq(one, { all: false, done: ['plan'], ls: ['jhb.ui.plan.keep', 'jhb.ui.plan.data'], ss: [] });
  const other = PR.planClear(kinds, ['read'], { lsKeys: LSK });
  ok(other.ls.indexOf('jhb.ui.plan.data') < 0, '다른 종류를 지울 때는 종이를 건드리지 않음');
});

test('app.js: 기본 settings 종류에 jhb.ui.home.recentHidden, 읽은 글 종류에 jhb.course, clear 는 planClear 를 쓰고 keep 을 받는다', function () {
  const src = read('js/app.js');
  ok(/id: 'settings'[^\n]*'jhb\.ui\.home\.recentHidden'/.test(src), 'settings 기본 키');
  ok(/id: 'read'[^\n]*'jhb\.course'/.test(src), '읽은 글 종류에 들어간 코스 기록');
  has(src, 'planClear(');
  ok(/function privClear\(ids, opts\)/.test(src), 'clear(ids, opts)');
});

test('settings.js: jhb:privacy 의 clear(all·settings)를 받으면 기억해 둔 값을 기본값으로 되돌린다', function () {
  /* 아주 작은 가짜 DOM 에서 settings.js 를 돌린다(패널은 JHB.app 이 없어 만들지 않음) */
  const attrs = {}, ls = { 'jhb.ui.settings': JSON.stringify({ width: 'wide', font: 'sans', motion: 'reduce' }), 'jhb.theme': JSON.stringify('dark'), 'jhb.fs': JSON.stringify('xl') };
  const listeners = {};
  const docEl = { setAttribute: function (k, v) { attrs[k] = v; }, removeAttribute: function (k) { delete attrs[k]; }, getAttribute: function (k) { return attrs[k] == null ? null : attrs[k]; } };
  const win = {
    localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(ls, k) ? ls[k] : null; }, setItem: function (k, v) { ls[k] = String(v); }, removeItem: function (k) { delete ls[k]; } },
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); },
    dispatchEvent: function (e) { (listeners[e.type] || []).forEach(function (f) { f(e); }); return true; }
  };
  const sandbox = {
    window: win, localStorage: win.localStorage, JSON: JSON, Object: Object, Array: Array,
    Event: function (t) { this.type = t; },
    document: { documentElement: docEl, querySelector: function () { return null; }, addEventListener: function () { }, createElement: function () { return { setAttribute: function () { } }; }, head: { appendChild: function () { } } }
  };
  vm.runInNewContext(read('js/ui/settings.js'), sandbox);
  eq([attrs['data-theme'], attrs['data-fs'], attrs['data-width'], attrs['data-motion']], ['dark', 'xl', 'wide', 'reduce'], '처음 적용');
  /* 보기 설정을 남기는 지우기(ids 에 settings 없음)는 그대로 */
  delete ls['jhb.read'];
  win.dispatchEvent({ type: 'jhb:privacy', detail: { action: 'clear', ids: ['read', 'recent'], all: true, keep: ['settings'] } });
  eq(attrs['data-width'], 'wide', 'keep 이면 그대로');
  /* 키를 지운 뒤 clear 'all' → 기본값 */
  ['jhb.ui.settings', 'jhb.theme', 'jhb.fs'].forEach(function (k) { delete ls[k]; });
  win.dispatchEvent({ type: 'jhb:privacy', detail: { action: 'clear', ids: 'all' } });
  eq([attrs['data-theme'], attrs['data-fs'], attrs['data-width'], attrs['data-motion']], [undefined, undefined, undefined, undefined], '기본값으로');
  eq(Object.keys(ls).filter(function (k) { return k.indexOf('jhb.') === 0; }), [], '되돌리면서 옛 값을 다시 쓰지 않음');
  /* ids 에 settings 만 */
  ls['jhb.fs'] = JSON.stringify('l');
  vm.runInNewContext(read('js/ui/settings.js'), sandbox);
  eq(attrs['data-fs'], 'l');
  delete ls['jhb.fs'];
  win.dispatchEvent({ type: 'jhb:privacy', detail: { action: 'clear', ids: ['settings'] } });
  eq(attrs['data-fs'], undefined);
});

/* ---------- 4. 기록 쉼과 서비스 워커 ---------- */
test('서비스 워커: 기록 쉼이면 새 페이지·새 파일을 캐시에 넣지 않고(워커가 다시 떠도), 이미 있는 항목은 갱신, 리다이렉트 응답은 넣지 않음', function () {
  const out = cp.execFileSync(process.execPath, [__filename], { encoding: 'utf8', timeout: 20000, env: Object.assign({}, process.env, { JHB_CORE_SW: '1' }) });
  const r = JSON.parse(out);
  ok(!r.error, r.error);
  eq(r.before, ['https://x.test/site/a/one/', 'https://x.test/site/css/style.css'], '쉼 전에는 저장');
  eq(r.stateAfterOn.length, 1, '쉼 상태를 jhb.state 캐시에 기억');
  eq(r.paused, ['https://x.test/site/a/one/', 'https://x.test/site/css/style.css'], '쉼 동안 연 글(two·three)·새 파일이 없음');
  ok(r.styleRefreshed, '이미 있는 항목은 갱신');
  eq(r.afterRestart, r.paused, '워커가 다시 떠도 쉼을 기억');
  ok(r.offlineHit, '오프라인에서 이미 저장된 글은 열림');
  eq(r.stateAfterOff.length, 1, '쉼을 끄면 "쉼 아님"을 기억(지우지 않음: 없으면 모르는 상태)');
  eq(r.stateValueOff, ['0'], '쉼 아님 = 0');
  ok(r.after.indexOf('https://x.test/site/a/five/') >= 0 && r.after.indexOf('https://x.test/site/a/seven/') >= 0, '쉼을 끈 뒤에는 다시 저장');
  ok(r.after.indexOf('https://x.test/site/a/six') < 0 && r.after.indexOf('https://x.test/site/data/moved.json') < 0, '리다이렉트 응답은 넣지 않음');
});

test('K3-6 서비스 워커: 쉼 상태를 읽지 못하면(상태 캐시가 사라진 직후) 그 이동은 캐시에 넣지 않고, 페이지가 알려 준 뒤부터 다시 저장', function () {
  const out = cp.execFileSync(process.execPath, [__filename], { encoding: 'utf8', timeout: 20000, env: Object.assign({}, process.env, { JHB_CORE_SW: '1' }) });
  const r = JSON.parse(out);
  ok(!r.error, r.error);
  ok(r.unknown.indexOf('https://x.test/site/a/eight/') < 0, '상태를 모르는 동안 연 글(eight)은 넣지 않음');
  ok(r.unknown.indexOf('https://x.test/site/content/09-living/unknown-state.md') < 0, '상태를 모르는 동안 새 파일도 넣지 않음');
  ok(r.afterKnown.indexOf('https://x.test/site/a/nine/') >= 0, '페이지가 쉼 아님을 알린 뒤에는 저장');
  ok(r.afterKnown.indexOf('https://x.test/site/a/ten/') >= 0, '쉼 아님을 기억해서 워커가 다시 떠도 저장');
  ok(r.afterLost.indexOf('https://x.test/site/a/eleven/') < 0, '쉼이 아니었어도 상태 캐시가 사라진 직후 한 번은 넣지 않음');
  ok(r.fresh.indexOf('https://x.test/site/a/zero/') >= 0 && r.knownFresh === false, '한 번도 알림을 받지 않은 워커(처음 설치)는 예전처럼 저장(tests/sw-harness.cjs 의 가정)');
  ok(r.knownAfterMsg === true, '알림을 받으면 그 판 캐시에 표시를 남김');
  const sw = read('sw.js');
  ok(/^const BUILD = '[^']*';$/m.test(sw), 'BUILD 줄 형식 그대로');
});

test('sw.js: BUILD 줄 형식 그대로, 쉼 메시지 이름이 app.js 와 같음', function () {
  const sw = read('sw.js'), app = read('js/app.js');
  ok(/^const BUILD = '[^']*';$/m.test(sw), 'BUILD 줄');
  has(sw, "d.jhb !== 'privacy'");
  has(app, "jhb: 'privacy'");
});

/* ---------- 5. 이어서 읽기 ---------- */
function fakeStore() {
  const mem = {};
  return { mem: mem, get: function (k, fb) { return k in mem ? JSON.parse(mem[k]) : fb; }, set: function (k, v) { mem[k] = JSON.stringify(v); return true; } };
}
const ARTS = [
  { slug: 'what', section: '1', order: 1, title: '조현병이란', tags: [] },
  { slug: 'dx', section: '1', order: 2, title: '진단 과정', tags: [] },
  { slug: 'warn', section: '1', order: 3, title: '자살 위험 신호', tags: ['위기'] },
  { slug: 'nms', section: '1', order: 4, title: '악성 증후군', tags: ['응급'] },
  { slug: 'life', section: '1', order: 5, title: '생활', tags: [] },
  { slug: 'hot', section: '2', order: 1, title: '위기 상담 전화', tags: ['위기'] },
  { slug: 'fam', section: '2', order: 2, title: '가족', tags: [] }
];
const CRS = [
  { id: 'first-diagnosis', title: '처음 진단받았어요', who: '당사자', steps: [{ slug: 'what' }, { slug: 'warn' }, { slug: 'dx' }, { slug: 'life' }] },
  { id: 'family-first', title: '가족이 진단받았어요', who: '가족', steps: [{ slug: 'hot' }, { slug: 'fam' }] }
];

test('이어서 읽기: 들어간 적 없는 코스는 이름·진도를 붙이지 않고 "읽던 글의 다음 문서"로만', function () {
  const s = fakeStore(), p = PR.create(s);
  p.markRead('what', 1); p.markRead('dx', 2);
  const r = p.continueReading(ARTS, CRS, { entered: p.enteredCourses(), hideTags: PR.SENSITIVE_TAGS });
  eq(r.kind, 'section'); eq(r.course, undefined);
  not(r.reason, '코스'); has(r.reason, '"진단 과정" 다음');
  eq(r.article.slug, 'life', '위기·응급 글은 제안하지 않고 건너뜀');
  /* 예전 방식(opts 없음)은 그대로 코스를 짐작 */
  eq(p.continueReading(ARTS, CRS).kind, 'course');
});

test('이어서 읽기: 위기·응급 글을 기준으로 삼아도 제안 글은 늘 일반 글, 섹션에 일반 글이 다 읽혔으면 없음', function () {
  const s = fakeStore(), p = PR.create(s);
  p.markRead('life', 1); p.markRead('warn', 2);
  /* 가장 최근 기록 warn(위기): 같은 섹션의 안 읽은 일반 글 what 을 그 제목 없이 제안 */
  const r = p.continueReading(ARTS, CRS, { entered: {}, hideTags: PR.SENSITIVE_TAGS });
  eq(r.article.slug, 'what'); not(r.reason, '자살 위험 신호');
  /* 섹션 1의 일반 글을 다 읽으면 위기·응급 글(nms)은 제안하지 않음 */
  p.markRead('what', 3); p.markRead('dx', 4);
  eq(p.continueReading(ARTS, CRS, { entered: {}, hideTags: PR.SENSITIVE_TAGS }), null);
});

test('이어서 읽기: 위기 글 하나만 읽었으면 코스를 짐작하지 않고, 그 글의 제목도 내지 않음(같은 섹션의 다음 일반 글은 제안)', function () {
  const s = fakeStore(), p = PR.create(s);
  p.markRead('hot', 1);
  const r = p.continueReading(ARTS, CRS, { entered: {}, hideTags: PR.SENSITIVE_TAGS });
  eq(r.kind, 'section'); eq(r.course, undefined);
  eq(r.article.slug, 'fam', '위기 글을 읽었어도 같은 섹션의 다음 일반 글은 이어서 읽기로');
  not(r.reason, '위기 상담 전화', '위기 글 제목은 첫 화면에 내지 않음');
  not(r.reason, '코스');
  has(r.reason, '같은 섹션에서 아직 안 읽은 문서예요');
  /* 예전 방식에서는 "가족이 진단받았어요 코스 1/2"가 떴다(회귀 기준) */
  has(p.continueReading(ARTS, CRS).reason, '가족이 진단받았어요');
});

test('이어서 읽기: 코스 화면이나 ?course= 로 들어간 코스면 코스 이름·진도와 다음 글', function () {
  const s = fakeStore(), p = PR.create(s);
  ok(p.markCourse('first-diagnosis', 5));
  ok(!p.markCourse('', 6) && !p.markCourse(null, 6), '빈 id 는 남기지 않음');
  eq(s.get('jhb.course'), { 'first-diagnosis': 5 });
  p.markRead('what', 1); p.markRead('warn', 2);
  const r = p.continueReading(ARTS, CRS, { entered: p.enteredCourses(), hideTags: PR.SENSITIVE_TAGS });
  eq(r.kind, 'course'); eq(r.course.id, 'first-diagnosis'); eq(r.article.slug, 'dx', '들어간 코스 안에서는 순서대로');
  has(r.reason, '"처음 진단받았어요" 코스 2/4');
  ok(!r.hidden, '다음 단계가 일반 글이면 숨기지 않음');
  /* 배열로 줘도 같음, 깨진 코스는 건너뜀 */
  eq(p.continueReading(ARTS, CRS.concat([{ id: 'bad', title: 'x', steps: null }]), { entered: ['first-diagnosis'] }).course.id, 'first-diagnosis');
  /* 깨진 저장값 */
  s.set('jhb.course', ['first-diagnosis']);
  eq(Object.keys(p.enteredCourses()), []);
  eq(Object.getPrototypeOf(p.enteredCourses()), null);
});

test('K3-1 이어서 읽기: 들어간 코스의 다음 단계가 위기·응급 글이면 그 제목을 내지 않고 코스 화면으로(순서는 건너뛰지 않음)', function () {
  const s = fakeStore(), p = PR.create(s);
  p.markCourse('first-diagnosis', 5);
  p.markRead('what', 1);
  const r = p.continueReading(ARTS, CRS, { entered: p.enteredCourses(), hideTags: PR.SENSITIVE_TAGS });
  eq(r.kind, 'course'); eq(r.course.id, 'first-diagnosis');
  eq(r.hidden, true, '숨긴 다음 단계 표시');
  eq(r.article, null, '위기 글(warn)은 결과에 싣지 않음');
  eq([r.read, r.total], [1, 4]);
  /* 코스 정보(course: 코스 자료 그대로)를 뺀 나머지 = 첫 화면이 그리는 것 */
  const all = JSON.stringify(Object.assign({}, r, { course: null }));
  not(all, '자살 위험 신호', '결과 어디에도 위기 글 제목이 없음');
  not(all, 'warn', '위기 글 slug 도 없음');
  has(r.reason, '코스 1/4');
  has(r.reason, '코스 화면에서');
  /* 응급 글도 같음 */
  const s2 = fakeStore(), p2 = PR.create(s2);
  const CR2 = [{ id: 'body', title: '몸', who: '모두', steps: [{ slug: 'life' }, { slug: 'nms' }, { slug: 'fam' }] }];
  p2.markCourse('body', 1); p2.markRead('life', 1);
  const r2 = p2.continueReading(ARTS, CR2, { entered: p2.enteredCourses(), hideTags: PR.SENSITIVE_TAGS });
  eq(r2.hidden, true); eq(r2.article, null); not(JSON.stringify(r2), '악성 증후군');
  /* 그 위기 글을 읽은 뒤에는 다음 일반 글을 제목과 함께 */
  p.markRead('warn', 2);
  const r3 = p.continueReading(ARTS, CRS, { entered: p.enteredCourses(), hideTags: PR.SENSITIVE_TAGS });
  eq(r3.article.slug, 'dx'); ok(!r3.hidden);
  /* hideTags 를 주지 않은 예전 호출은 그대로(위기 글도 다음 글로) */
  const s4 = fakeStore(), p4 = PR.create(s4);
  p4.markCourse('first-diagnosis', 5); p4.markRead('what', 1);
  eq(p4.continueReading(ARTS, CRS, { entered: p4.enteredCourses() }).article.slug, 'warn');
});

test('K3 검수: 숨긴 위기 단계만 남았으면(뒤 일반 단계를 다 읽음) "코스 화면에서 이어 봐요" 대신 안 연 글이 남았다고 알림(제목은 여전히 없음)', function () {
  const s = fakeStore(), p = PR.create(s);
  p.markCourse('first-diagnosis', 5);
  ['what', 'dx', 'life'].forEach(function (x, i) { p.markRead(x, i + 1); });
  const r = p.continueReading(ARTS, CRS, { entered: p.enteredCourses(), hideTags: PR.SENSITIVE_TAGS });
  eq(r.kind, 'course'); eq(r.hidden, true); eq(r.article, null);
  eq([r.read, r.total], [3, 4]);
  eq(r.onlyHidden, true, '남은 단계가 모두 숨긴 글');
  has(r.reason, '코스 3/4');
  has(r.reason, '아직 안 연 글이 1개');
  not(r.reason, '다음 글은');
  not(JSON.stringify(Object.assign({}, r, { course: null })), '자살 위험 신호');
  /* 숨긴 단계 뒤에 일반 단계가 남아 있으면 예전 문구 그대로 */
  const s2 = fakeStore(), p2 = PR.create(s2);
  p2.markCourse('first-diagnosis', 5); p2.markRead('what', 1);
  const r2 = p2.continueReading(ARTS, CRS, { entered: p2.enteredCourses(), hideTags: PR.SENSITIVE_TAGS });
  ok(!r2.onlyHidden); has(r2.reason, '다음 글은 코스 화면에서 이어 봐요');
});

test('K3-1 app.js: 숨긴 코스 단계는 제목 없이 코스 화면 링크로 그린다', function () {
  const src = read('js/app.js');
  const home = src.split('function home()')[1].split('\n  function section(')[0];
  ok(/c\.hidden/.test(home), '숨김 갈래를 따로 그림');
  ok(/'#\/course\/' \+ c\.course\.id/.test(home), '코스 화면으로 가는 링크');
});

test('app.js: 첫 화면 이어서 읽기는 들어간 코스와 위기·응급 숨김을 넘기고, 코스 화면·?course= 로 연 글은 기록 쉼이 아닐 때만 남긴다', function () {
  const src = read('js/app.js');
  ok(/continueReading\(articles, COURSES, \{ entered: PROG\.enteredCourses\(\), hideTags: PRG\.SENSITIVE_TAGS \}\)/.test(src), 'continueReading 옵션');
  ok(/function enterCourse\(id\) \{\s*if \(!PROG \|\| privacy\.paused\(\)/.test(src), '기록 쉼이면 남기지 않음');
});

/* ---------- 6. 첫 화면 최근 목록 ---------- */
test('첫 화면 최근에 읽은 문서: 위기·응급 글은 빼고 5개(기록 자체는 그대로)', function () {
  const by = {}; ARTS.forEach(function (a) { by[a.slug] = a; });
  const slugs = ['hot', 'what', 'warn', 'nms', 'dx', 'gone', 'what', 'life', 'fam', 42];
  const copy = slugs.slice();
  eq(PR.visibleRecent(slugs, by, 5).map(function (a) { return a.slug; }), ['what', 'dx', 'life', 'fam']);
  eq(PR.visibleRecent(slugs, by, 2).map(function (a) { return a.slug; }), ['what', 'dx']);
  eq(slugs, copy, '받은 목록을 바꾸지 않음');
  eq(PR.visibleRecent(['hot', 'warn'], by, 5), []);
  eq(PR.visibleRecent(null, by, 5), []);
  ok(PR.isSensitive(by.nms) && PR.isSensitive(by.hot) && !PR.isSensitive(by.life));
});

/* ---------- 7. 코스 ---------- */
test('코스 찾기: ?course=__proto__·toString·constructor 로 원형 값을 집지 않음, steps 가 배열인 코스만', function () {
  const m = PR.courseMap(CRS.concat([{ id: 'no-steps', title: 'x' }, null, { id: 7, steps: [] }]));
  eq(Object.getPrototypeOf(m), null);
  ['__proto__', 'toString', 'constructor', 'hasOwnProperty', 'valueOf', 'no-steps', '', null, undefined, 7].forEach(function (id) { eq(PR.getCourse(m, id), null, String(id)); });
  eq(PR.getCourse(m, 'family-first').id, 'family-first');
  eq(PR.getCourse({}, 'toString'), null, '보통 객체여도 원형은 집지 않음');
});

test('코스 대상 문구: 모두 → 모두에게, 주변 사람 → 주변 사람에게', function () {
  eq(PR.whoText('모두'), '모두에게');
  eq(PR.whoText('주변 사람'), '주변 사람에게');
  eq(PR.whoText('당사자'), '당사자에게');
  eq(PR.whoText('가족'), '가족에게');
  eq(PR.whoText(''), ''); eq(PR.whoText(undefined), '');
  /* 실제 코스 자료의 who 는 모두 빈 글자가 아닌 문구가 나옴 */
  const sb = {}; sb.window = sb;
  vm.runInNewContext(read('data/courses.js'), sb);
  const cs = sb.JHB.courses;
  ok(cs.length > 0);
  cs.forEach(function (c) { ok(/에게$/.test(PR.whoText(c.who)) && PR.whoText(c.who).length > 2, c.id + ': ' + c.who); });
  ok(cs.some(function (c) { return c.who === '모두'; }) && cs.some(function (c) { return c.who === '주변 사람'; }));
});

test('app.js: courseCard 를 JHB.app.courseCard 로 공개, 코스 찾기는 getCourse, 대상 문구는 whoText', function () {
  const src = read('js/app.js');
  ok(/courseCard: courseCard/.test(src), 'JHB.app.courseCard');
  not(src, "c.who === '모두' ? '당사자와 가족에게'");
  ok((src.match(/whoText\(c\.who\)/g) || []).length >= 2, '카드와 코스 화면');
  ok(/getCourse\(/.test(src));
  not(src, 'const c = courseById[id]'); not(src, 'courseById[wanted]');
  ok(/const courseById = Object\.create\(null\)/.test(src), '원형 없는 색인');
});

/* ---------- 1·2. 문서 소절 주소와 조각: app.js 가 그린 뒤 그 자리로 ---------- */
test('app.js·reading.js: 해시가 화면 안 id 면 맨 위 대신 그 자리로, 읽던 자리 복원은 건너뜀', function () {
  const app = read('js/app.js'), rd = read('js/ui/reading.js');
  ok(/function scrollToHash\(/.test(app), 'scrollToHash');
  ok(/if \(!show\.keepScroll && !scrollToHash\(\)\) window\.scrollTo\(0, 0\);/.test(app), 'show() 는 해시 자리 먼저');
  ok(/jhb:article[\s\S]{0,400}scrollToHash\(/.test(app), '문서를 다 그린 뒤 소절로');
  ok(/function hashInDoc\(/.test(rd) && /if \(hashInDoc\(\)\) return;/.test(rd), 'reading 은 해시가 있으면 복원하지 않음');
});

test('app.js scrollToHash: 숨은 요소면 옮기지 않고(맨 위로), 옮긴 뒤 순차 탐색 시작점(포커스)도 그 자리로', function () {
  const app = read('js/app.js');
  const fn = app.split('function scrollToHash()')[1].split('\n  }\n')[0];
  ok(/getClientRects\(\)\.length/.test(fn), '숨은 요소 검사');
  ok(/n\.setAttribute\('tabindex', '-1'\)/.test(fn), '포커스를 못 받는 요소엔 tabindex=-1');
  ok(/#app section\[tabindex="-1"\]:focus \{ outline: none; \}/.test(read('css/style.css')), '소절을 감싼 section 은 테두리 없이');
  ok(/focus\(\{ preventScroll: true \}\)/.test(fn), '스크롤 없이 포커스');
  ok(fn.indexOf('getClientRects') < fn.indexOf('scrollIntoView'), '보이는지 먼저 본 뒤 옮김');
});

/* ---------- 9. 위기 안내 문자 한 줄 ---------- */
test('위기 안내의 문자 109 한 줄은 지금 위기 상담 전화 글과 같은 뜻', function () {
  const art = read('content/11-system/crisis-hotlines.md');
  ok(/109로 문자를 보내/.test(art), 'crisis-hotlines.md 에 문자 109 문장이 있음');
  has(md.noticeHtml('crisis'), '109로 문자를 보낼 수 있어요');
});

/* ---------- 11. CSS 정리 ---------- */
test('style.css: 쓰이지 않는 .qs-list 계열 규칙이 없고 .qs-hint 는 남음, 인쇄 숨김에 .sitefoot 없음, 휴대폰 머리 줄 버튼 누르는 범위 44px', function () {
  const css = read('css/style.css');
  ['.qs-list', '.qs-group', '.qs-item', '.qs-all', '.qs-empty', '.qs.collapsed'].forEach(function (s) { not(css, s, s); });
  has(css, '.qs-hint');
  const pr = /@media print \{\s*([^{]*)\{ display: none !important; \}/.exec(css);
  ok(pr && pr[1].indexOf('.sitefoot') < 0, 'print 숨김 목록에 .sitefoot');
  ok(/\.doc-meta-m \.acts \.btn::before \{[^}]*top: -5px; bottom: -5px;/.test(css), '::before 로 36 → 44px(테두리 1px 안쪽 기준)');
  ok(/scroll-padding-bottom/.test(read('css/ui/mobile.css')), '하단 바 scroll-padding-bottom');
  /* 지운 클래스를 쓰는 코드가 없음 */
  const used = ['js', 'tools'].map(function (d) {
    const out = [];
    (function walk(dir) {
      fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(function (e) {
        const rel = dir + '/' + e.name;
        if (e.isDirectory()) walk(rel); else if (/\.(js|cjs|html)$/.test(e.name)) out.push(read(rel));
      });
    })(d);
    return out.join('\n');
  }).join('\n');
  ['qs-list', 'qs-group', 'qs-item', 'qs-all', 'qs-empty', 'qs.collapsed', 'qs collapsed'].forEach(function (c) { not(used, c, c + ' 를 쓰는 코드'); });
  ok(!/classList\.(?:add|toggle)\(\s*'collapsed'/.test(used), "collapsed 클래스를 다는 코드");
});

/* ---------- 소개: 기록과 개인정보 ---------- */
test('소개(data/about.js): "기록과 개인정보" 소절에 id="privacy", 저장 목록과 켰을 때만 남는 것, 지우는 곳, 정직한 한계', function () {
  const sb = {}; sb.window = sb;
  vm.runInNewContext(read('data/about.js'), sb);
  const html = sb.JHB.aboutHtml;
  /* id 는 제목을 감싼 section 에(제목 글자 '<h2>기록과 개인정보</h2>' 는 tests/me.test.cjs 가 소절을 찾는 기준이라 그대로) */
  has(html, '<section id="privacy"><h2>기록과 개인정보</h2>');
  const sec = html.split('<section id="privacy">')[1].split('</section>')[0];
  not(sec, '<h2>꼭 알아둘 것'); has(sec, 'GitHub Pages');
  eq((html.match(/id="privacy"/g) || []).length, 1);
  has(html, 'href="#/changes"');
  ['저장한 글', '읽은 글', '최근 읽은 글', '읽던 자리', '보기 설정', '고른 역할', '최근 검색', '진료 질문 바구니', '켰을 때만', '내 서재', '닫은 탭 다시 열기', '오프라인'].forEach(function (w) { has(html, w, w); });
  /* K5-1: 미리 써 두는 종이는 저장을 켰을 때만 이 기기에 남아요(jhb.ui.plan.*). 옛 이름 "종이 양식"은 쓰지 않음 */
  const onItem = sec.split('<li>').filter(function (x) { return x.indexOf('켰을 때만 이 기기에 남는 것') >= 0; })[0] || '';
  has(onItem, '미리 써 두는 종이', '켰을 때만 남는 것에 종이');
  has(onItem, '진료 질문 바구니');
  not(sec, '종이 양식');
  /* 열어 본 화면(오프라인 저장)을 어떻게 지우는지: 내 서재의 읽은 글·최근 읽은 글·읽던 자리·전부 지우기가 함께 지움(js/pages/me.js PAGE_KINDS·clearCaches) */
  has(sec, '저장된 화면도 함께 지워요');
  has(sec, '켜기 전에 저장된 화면은 남아요');
  has(html, 'href="#/me"');
  not(html, '탭을 닫으면 사라져요');
});

/* ================= K3 코어 뒤처리 ================= */

/* ---------- K3-2 소개: 질문 바구니의 탭 저장, 꼭 알아둘 것의 전화 링크·문자 109 ---------- */
test('K3-2 소개: 질문 바구니는 켜지 않아도 이 탭에 남고 "닫은 탭 다시 열기"로 돌아올 수 있다고 사실대로', function () {
  const sb = {}; sb.window = sb;
  vm.runInNewContext(read('data/about.js'), sb);
  const html = sb.JHB.aboutHtml;
  const sec = html.split('<section id="privacy">')[1].split('</section>')[0];
  const items = sec.split('<li>').slice(1).map(function (x) { return x.split('</li>')[0]; });
  const askItem = items.filter(function (x) { return x.indexOf('이 탭이 열려 있는 동안') >= 0; })[0];
  ok(askItem, '"이 탭이 열려 있는 동안" 줄이 있음');
  has(askItem, '진료 질문 바구니');
  const tabItem = items.filter(function (x) { return x.indexOf('닫은 탭 다시 열기') >= 0; })[0];
  ok(tabItem, '"닫은 탭 다시 열기" 줄');
  has(tabItem, '진료 질문 바구니', '탭 기록이 돌아오는 예에 질문 바구니도');
  has(tabItem, '찾기 화면에서 찾은 말');
  /* 글꼴 줄은 이번에 건드리지 않음(마무리 단계에서 글꼴과 함께) */
  has(sec, '<li>글꼴은 지금 외부 서비스(jsDelivr, Google Fonts)에서 받아요. 그래서 글을 열 때 이 서비스들에도 접속해요.</li>');
});

test('K3-2 소개 "꼭 알아둘 것": 1577-0199·109·119 는 전화 링크, 문자 109 한 줄은 공용 위기 고지와 같은 글자', function () {
  const sb = {}; sb.window = sb;
  vm.runInNewContext(read('data/about.js'), sb);
  const html = sb.JHB.aboutHtml;
  const part = html.split('<h2>꼭 알아둘 것</h2>')[1].split('<h2>')[0];
  ['109', '1577-0199', '119'].forEach(function (n) { has(part, '<a href="tel:' + n + '">' + n + '</a>', n); });
  /* md.noticeHtml('crisis') 의 문자 안내 문장을 그대로 */
  const crisis = md.noticeHtml('crisis').replace(/<[^>]+>/g, '');
  const sms = /전화가 어렵다면[^.]*\./.exec(crisis)[0];
  has(part, sms);
  /* 문자 안내의 109 는 전화 링크가 아님(공용 고지와 같음) */
  eq((part.match(/href="tel:/g) || []).length, 3);
});

/* ---------- K3-3 위기 안내의 색: 차분한 전용 토큰, 대비 ---------- */
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join(''); return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
function lum(h) { return hexRgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function tokensIn(block) { const t = {}; (block.match(/--[a-z0-9-]+:\s*#[0-9a-fA-F]{3,6}/g) || []).forEach(function (d) { const m = /(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})/.exec(d); t[m[1]] = m[2]; }); return t; }
function cssThemes() {
  const css = read('css/style.css');
  const light = tokensIn(/^:root \{([^}]*)\}/m.exec(css)[1]);
  const darkMedia = tokensIn(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{([^}]*)\}/.exec(css)[1]);
  const darkAttr = tokensIn(/^:root\[data-theme="dark"\] \{([^}]*)\}/m.exec(css)[1]);
  /* 인쇄: 어두운 화면에서 바뀌는 토큰은 css/ui/print.css 가 모두 밝은 값으로 정해요(--calm 계열 포함, tests/print.test.cjs 가 지킴) */
  const pm = /html:root:not\(\[data-print-tokens="own"\]\) \{([^}]*)\}/.exec(read('css/ui/print.css'));
  return { light: light, darkMedia: darkMedia, darkAttr: darkAttr, print: pm ? Object.assign({}, light, tokensIn(pm[1])) : null };
}
function hueOf(h) {
  const c = hexRgb(h).map(function (v) { return v / 255; });
  const max = Math.max.apply(null, c), min = Math.min.apply(null, c), d = max - min;
  if (!d) return null;
  let x = max === c[0] ? ((c[1] - c[2]) / d) % 6 : max === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
  x *= 60; return x < 0 ? x + 360 : x;
}

test('K3-3 위기 안내 전용 토큰(--calm·--calm-soft·--calm-ink): 밝은·어두운(두 곳 같은 값)·인쇄에 모두 있고 남색·청록 계열', function () {
  const T = cssThemes();
  ['--calm', '--calm-soft', '--calm-ink'].forEach(function (k) {
    ok(T.light[k], '밝은 ' + k); ok(T.darkMedia[k], '어두운(운영체제) ' + k); ok(T.darkAttr[k], '어두운(직접 고름) ' + k);
    eq(T.darkMedia[k], T.darkAttr[k], k + ' 어두운 값 두 곳이 같음');
    ok(T.print && T.print[k], '인쇄 ' + k);
  });
  /* 색상(hue)이 청록~남색 범위(170~250도): 붉은색·주황(0~60, 330~360) 아님 */
  [['밝은', T.light], ['어두운', T.darkAttr], ['인쇄', T.print]].forEach(function (x) {
    ['--calm', '--calm-soft'].forEach(function (k) { const h = hueOf(x[1][k]); ok(h != null && h >= 170 && h <= 250, x[0] + ' ' + k + ' hue ' + h); });
  });
});

test('K3-3 위기 안내 대비: 글자 4.5:1 이상, 전화 버튼 경계 3:1 이상(밝은·어두운·인쇄)', function () {
  const T = cssThemes();
  [['밝은', T.light], ['어두운', T.darkAttr], ['인쇄', T.print]].forEach(function (x) {
    const n = x[0], t = x[1];
    [
      ['제목 글자 --calm / --calm-soft', t['--calm'], t['--calm-soft'], 4.5],
      ['본문 글자 --ink / --calm-soft', t['--ink'], t['--calm-soft'], 4.5],
      ['전화 버튼 글자 --calm-ink / --calm', t['--calm-ink'], t['--calm'], 4.5],
      ['전화 버튼 경계 --calm / --calm-soft', t['--calm'], t['--calm-soft'], 3],
      ['띠 --calm / --paper', t['--calm'], t['--paper'], 3],
      ['카드 안 다른 버튼 글자 --ink / --paper-3', t['--ink'], t['--paper-3'], 4.5]
    ].forEach(function (p) { const c = contrast(p[1], p[2]); ok(c >= p[3], n + ' ' + p[0] + ' = ' + c.toFixed(2)); });
  });
});

test('K3-3 .crisis·.crisis-card(.tel 포함)·.callout-crisis 는 --calm 토큰, --bad 는 style.css 의 규칙에서 쓰지 않음(오류 표시용으로 남김)', function () {
  const css = read('css/style.css');
  const rules = css.split('\n').filter(function (l) { return /^\.(crisis|crisis-card|callout-crisis)\b/.test(l.trim()); });
  ok(rules.length >= 6, '규칙 수 ' + rules.length);
  rules.forEach(function (l) { not(l, '--bad', l.slice(0, 60)); });
  ok(/\.crisis \{[^}]*var\(--calm-soft\)[^}]*var\(--calm\)/.test(css), '.crisis 배경·띠');
  ok(/\.crisis-card \.acts a\.tel \{[^}]*background: var\(--calm\);[^}]*color: var\(--calm-ink\)/.test(css), '.tel 버튼');
  /* 응급 줄(노랑 계열)은 그대로 */
  ok(/\.emergency \{[^}]*var\(--warn-soft\)[^}]*var\(--warn\)/.test(css), '.emergency 는 --warn 그대로');
  eq(css.split('\n').filter(function (l) { return /var\(--bad/.test(l); }), [], 'style.css 안에서 --bad 를 쓰는 규칙');
  ok(/--bad: #/.test(css), '--bad 토큰 자체는 남김(오류 표시)');
});

/* ---------- K3-4 reading.js: 같은 문서 안 #h-N 으로 옮기면 읽던 자리 알림을 감춤 ---------- */
test('K3-4 reading.js: hashchange 가 문서 안 id 를 가리키면 hideResume()', function () {
  const rd = read('js/ui/reading.js');
  ok(/addEventListener\('hashchange', function \(\) \{\s*if \(hashInDoc\(\)\) hideResume\(\);/.test(rd), 'hashchange → hideResume');
});
test('K3 검수: 차례(왼쪽 목차·본문 차례·따라오는 제목 줄)처럼 hashchange 없이 옮기는 문서 안 링크를 눌러도 읽던 자리 알림을 감춤', function () {
  const rd = read('js/ui/reading.js');
  ok(/function idInDoc\(/.test(rd), '문서 안 id 판정을 한 곳에서(hashInDoc 와 같은 규칙)');
  ok(/function hashInDoc\(\) \{[\s\S]*?return idInDoc\(/.test(rd), 'hashInDoc 는 idInDoc 을 씀');
  ok(/closest\('a\[href\^="#"\]:not\(\[href\^="#\/"\]\)'\)[\s\S]{0,200}idInDoc\([\s\S]{0,80}hideResume\(\)/.test(rd), '문서 안 # 링크 클릭 → hideResume');
  /* 앱의 차례 이동(jumpTo)도 소절 주소와 같은 길: 접힌 소절 펴기·포커스 옮기기 */
  const app = read('js/app.js');
  const jt = app.split('function jumpTo(id) {')[1].split('\n  }\n')[0];
  ok(/R\.reveal\(/.test(jt), '요약 보기로 접힌 소절을 먼저 편다');
  ok(/setAttribute\('tabindex', '-1'\)/.test(jt) && /focus\(\{ preventScroll: true \}\)/.test(jt), '대상으로 포커스');
});

/* ---------- K3-7 분류 글 정렬을 한 곳에서(js/paths.js sectionArticles) ---------- */
test('K3-7 paths.sectionArticles: 그 분류 글만, order → 제목 가나다, order 없으면 맨 뒤(999), 받은 배열은 그대로', function () {
  const L = [
    { slug: 'c', section: '2', order: 2, title: '다' },
    { slug: 'x', section: '1', title: '나중' },
    { slug: 'b', section: '2', order: 1, title: '나' },
    { slug: 'a', section: '2', order: 1, title: '가' },
    { slug: 'z', section: '2', title: '하' },
    { slug: 'y', section: '2', order: 0, title: '라' }
  ];
  const copy = JSON.stringify(L);
  eq(P.sectionArticles(L, '2').map(function (a) { return a.slug; }), ['a', 'b', 'c', 'y', 'z'], 'order 0 은 없음과 같이 999(앱 규칙 그대로)');
  eq(P.sectionArticles(L, 2).map(function (a) { return a.slug; }), ['a', 'b', 'c', 'y', 'z'], '숫자 id 도');
  eq(P.sectionArticles(L, '9'), []);
  eq(P.sectionArticles(null, '1'), []);
  eq(JSON.stringify(L), copy, '받은 배열을 바꾸지 않음');
});

test('K3-7 실제 목차: 앱(paths.sectionArticles)과 빌드(tools/build-pages.cjs)의 분류 글 순서가 모든 분류에서 같다', function () {
  const sb = {}; sb.window = sb;
  vm.runInNewContext(read('data/sections.js') + '\n' + read('data/toc.js'), sb);
  const B = require('../tools/build-pages.cjs');
  const arts = sb.JHB.toc.articles;
  let n = 0;
  sb.JHB.sections.forEach(function (s) {
    const a = P.sectionArticles(arts, s.id).map(function (x) { return x.slug; });
    const b = B.sectionArticles(s.id).map(function (x) { return x.slug; });
    eq(a, b, '분류 ' + s.id); n += a.length;
  });
  ok(n > 200, '글 수 ' + n);
});

test('K5-4 build-pages.cjs: 분류 글 정렬도 js/paths.js 의 sectionArticles 한 곳(빌드 안에 정렬 규칙 사본 없음)', function () {
  const src = read('tools/build-pages.cjs');
  const fn = src.split('function sectionArticles(id)')[1].split('\n}\n')[0];
  has(fn, 'P.sectionArticles(articles, id)');
  not(fn, 'localeCompare', '정렬 규칙 사본');
  not(fn, '.sort(', '정렬 규칙 사본');
});

test('K3-7 app.js: 분류 글 정렬은 JHB.paths.sectionArticles 한 곳(앱 안에 정렬 규칙 사본 없음)', function () {
  const src = read('js/app.js');
  const fn = src.split('function sectionArticles(id)')[1].split('\n  }\n')[0];
  has(fn, 'P.sectionArticles(articles, id)');
  not(fn, 'localeCompare', '정렬 규칙 사본');
});

/* ---------- K3-8 첫 화면 순서: 다시 온 사람은 처음부터 이어서 읽기·코스가 오늘의 문서보다 앞 ---------- */
test('K3-8 progress.isReturning: home 모듈의 startState 가 first 가 아닌 것과 같은 기준', function () {
  const H = require('../js/ui/home.js');
  eq(PR.HOME_ROLES, H.ROLES, '역할 목록이 home 모듈과 같음');
  [
    {}, { role: 'family' }, { role: 'self' }, { role: 'near' }, { role: 'curious' }, { role: 'admin' }, { role: '__proto__' }, { role: 7 },
    { readCount: 1 }, { recentCount: 2 }, { readCount: 0, recentCount: 0 }, { role: null, readCount: '3' }, { readCount: NaN }, { role: 'x', recentCount: 1 }
  ].forEach(function (o) { eq(PR.isReturning(o), H.startState(o) !== 'first', JSON.stringify(o)); });
  eq(PR.isReturning(), false);
});

test('K3-8 progress.homeOrder: 다시 온 사람은 이어서 읽기·코스·오늘의 문서 순(home 모듈 rearrange 와 같은 결과), 처음 온 사람은 예전 그대로', function () {
  eq(PR.homeOrder(false), ['today', 'continue', 'courses', 'recent', 'index', 'terms']);
  eq(PR.homeOrder(true), ['continue', 'courses', 'today', 'recent', 'index', 'terms']);
  /* js/ui/home.js rearrange 의 insertBefore 세 번을 배열로 흉내: 새 순서에 다시 적용해도 같음 */
  function rearrange(list) {
    const l = list.slice();
    function before(x, y) { const i = l.indexOf(x); if (i < 0 || l.indexOf(y) < 0) return; l.splice(i, 1); l.splice(l.indexOf(y), 0, x); }
    if (l.indexOf('today') >= 0) { before('continue', 'today'); before('courses', 'today'); }
    before('recent', 'index');
    return l;
  }
  eq(rearrange(PR.homeOrder(true)), PR.homeOrder(true), '다시 옮겨도 같음');
  eq(rearrange(PR.homeOrder(false)), PR.homeOrder(true), '예전 순서에서 옮긴 결과 = 새 첫 그리기 순서');
  ['continue', 'courses', 'today', 'recent'].forEach(function (k) {
    const less = PR.homeOrder(true).filter(function (x) { return x !== k; });
    eq(rearrange(less), less, k + ' 묶음이 없을 때도 같음');
  });
});

test('K3 검수: "기록 가리기"가 켜져 있으면 코어가 첫 화면을 처음 그릴 때부터 가린다(home 모듈이 가리기 전 한 프레임도 제목이 보이지 않게)', function () {
  const src = read('js/app.js');
  const home = src.split('function home()')[1].split('\n  function section(')[0];
  ok(/U\.store\.get\('jhb\.ui\.home\.recentHidden', false\) === true/.test(home), '가리기 설정을 읽음');
  /* home 모듈(enhanceRecent)과 같은 조건·같은 표시: 최근 목록이 있을 때만, 목록 hidden + 첫 화면 .hm-veil */
  ok(/const veil = !!secs\.recent && /.test(home), '최근 목록이 있을 때만(모듈이 가리는 조건과 같음)');
  ok(/querySelector\('ul\.rows'\)\.hidden = true/.test(home), '최근 목록 hidden');
  ok(/el\('div\.portal', veil \? \{ class: 'hm-veil' \} : null/.test(home), '첫 화면에 .hm-veil(이어서 읽기·코스 진도를 home.css 가 가림)');
  ok(/if \(JHB\.ui && JHB\.ui\.home\) return;\s*portal\.classList\.remove\('hm-veil'\)/.test(home), 'home 모듈이 없으면 되돌림(되돌릴 단추가 없어서)');
  /* home.css 가 .hm-veil 로 이어서 읽기 본문을 가리는 규칙이 그대로 있어야 함 */
  ok(/\.hm-veil \[data-sec="continue"\] \.continue \{ display: none; \}/.test(read('css/ui/home.css')), 'home.css 의 가림 규칙');
});

test('K3-8 app.js: 첫 화면은 isReturning·homeOrder 로 처음부터 그 순서로 그린다(역할: 이 기기, 기록 쉼이면 이 탭의 역할도)', function () {
  const src = read('js/app.js');
  const home = src.split('function home()')[1].split('\n  function section(')[0];
  has(home, 'homeOrder(');
  has(home, 'isReturning');
  ok(/'jhb\.ui\.home\.role'/.test(src), '역할 키를 읽음');
  ok(/sessionStorage\.getItem\(HOME_ROLE_KEY\)/.test(src), '기록 쉼 중 이 탭의 역할');
});

/* ================= K5 코어 뒤처리 3 ================= */

/* ---------- K5-5 실행기: 테스트 파일을 불러오다 예외가 나면 그 파일만 FAIL 1건, 다음 파일은 계속 ---------- */
test('K5-5 tests/run.cjs: 깨진 테스트 파일은 FAIL 1건(파일 이름·예외 글), 뒤 파일은 그대로 돈다', function () {
  if (process.env.JHB_TESTS_DIR) return; /* 이 시험이 띄운 실행기 안에서는 다시 띄우지 않음 */
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jhb-run-'));
  try {
    fs.writeFileSync(path.join(tmp, 'a-broken.test.cjs'), "require('./없는-모듈');\n");
    fs.writeFileSync(path.join(tmp, 'b-throws.test.cjs'), "test('앞 시험', function () { ok(true); });\nthrow new Error('최상위에서 던짐');\n");
    fs.writeFileSync(path.join(tmp, 'c-good.test.cjs'), "test('뒤 시험', function () { eq(1, 1); });\n");
    const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'run.cjs')], { env: Object.assign({}, process.env, { JHB_TESTS_DIR: tmp }), encoding: 'utf8', timeout: 60000 });
    const out = r.stdout || '';
    eq(r.status, 1, '실패가 있으면 종료 코드 1');
    has(out, 'FAIL a-broken.test.cjs');
    has(out, '없는-모듈', '예외 글');
    has(out, 'FAIL b-throws.test.cjs');
    has(out, '최상위에서 던짐');
    has(out, '  ok   앞 시험', '던지기 전의 시험은 셈');
    has(out, '  ok   뒤 시험', '깨진 파일 뒤의 파일도 돈다');
    has(out, '2 passed, 2 failed');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

/* ---------- K5-2 공용 팝오버(#pop): 포커스가 밖으로 나가면 닫고 연 요소로, 크기가 바뀌면 다시 자리 잡거나 닫음 ---------- */
/* 판정 자체(첫·마지막·Shift 방향, 열어 둠·닫기만·되돌림)는 순수 함수라 tests/progress.test.cjs 가 값으로 시험해요.
   여기서는 app.js 가 그 함수를 쓰고, 결과대로 닫고 돌려주는지만 봐요. 브라우저 확인: meds/ 1280 표 첫 칸 Enter → Tab 으로 끝까지 → anchor 다음 칸 */
test('K5-2 app.js #pop: Tab·Shift+Tab 판정은 popTabOut, 그 밖의 focusout 은 popLeave 로(되돌리기는 포커스가 옮겨 간 뒤)', function () {
  const src = read('js/app.js');
  const part = src.slice(src.indexOf('/* ---------- 팝오버 ----------'), src.indexOf('function setProgress('));
  ok(part.length > 0, '팝오버 절');
  has(part, "pop.addEventListener('keydown'");
  ok(/e\.key !== 'Tab'/.test(part), 'Tab 키를 봄');
  ok(/PRG\.popTabOut\(f, document\.activeElement, e\.shiftKey, pop\)/.test(part), 'popTabOut 에 목록·포커스·Shift·팝오버 자신을 넘김');
  has(part, 'closePop(true)');
  has(part, "pop.addEventListener('focusout'");
  ok(/relatedTarget/.test(part), 'focusout 은 옮겨 간 곳을 보고');
  ok(/PRG\.popLeave\(\{/.test(part), 'popLeave 로 판정');
  ok(/pointer: popPointer/.test(part), '마우스·터치 여부를 넘김');
  ok(/act === 'back'[^\n]*popFocusBack\(a\)/.test(part), "'back' 이면 연 요소로");
  ok(/addEventListener\('pointerdown'[^\n]*popPointer = true/.test(part), '누르면 표시');
  ok(/addEventListener\('keydown'[^\n]*popPointer = false/.test(part), '키를 누르면 풀림');
});

test('K5-2 app.js: 화면을 바꿀 때(show)는 팝오버를 닫기만 하고 옛 anchor 로 포커스를 돌리지 않음', function () {
  const src = read('js/app.js');
  const showFn = src.slice(src.indexOf('function show(nodes, opts)'), src.indexOf("app.innerHTML = '';", src.indexOf('function show(nodes, opts)')));
  has(showFn, 'closePop(false, { nav: true })');
  const close = src.slice(src.indexOf('function closePop('), src.indexOf("document.addEventListener('click'", src.indexOf('function closePop(')));
  ok(/if \(opts && opts\.nav\) return;\s*\n\s*if \(refocus \|\| inside\) popFocusBack\(a\);/.test(close), 'nav 이면 popFocusBack 앞에서 끝냄');
});

test('K5-3 app.js: dated 의 lastmod 자료가 멈춰도 화면 전체가 시간 초과로 실패하지 않게 짧게만 기다림', function () {
  const src = read('js/app.js');
  const job = src.slice(src.indexOf('function datedJob('), src.indexOf('function featureNotices('));
  ok(/Promise\.race\(\[loadData\(ref\.name\)\.catch\(/.test(job), '받기와 기다림 중 먼저 끝나는 쪽');
  ok(/res\(null\)/.test(job), '기다림이 끝나면 null(선언의 updated 로 그림)');
  const m = /const DATED_WAIT = (\d+);/.exec(src);
  ok(m && +m[1] > 0 && +m[1] < 10000, '전체 시간 초과(10초)보다 짧음');
});

test('K5-2 app.js #pop: 닫을 때 포커스가 팝오버 안이었거나 연 요소가 안 보이면 BODY 대신 보이는 곳(본문 제목·#app)으로', function () {
  const src = read('js/app.js');
  const part = src.slice(src.indexOf('/* ---------- 팝오버 ----------'), src.indexOf('function setProgress('));
  const close = part.slice(part.indexOf('function closePop('));
  ok(/pop\.contains\(document\.activeElement\)/.test(close), '팝오버 안에 포커스가 있었는지');
  has(part, 'function popFocusBack(');
  ok(/getClientRects\(\)\.length/.test(part), '보이는지 확인');
  has(part, "U.qs('h1', app)");
  has(part, "aria-expanded', 'false'");
});

test('K5-2 app.js #pop: 창 너비가 바뀌거나 화면을 돌리면 다시 자리 잡고, 연 요소가 안 보이면 닫음(높이만 바뀌는 휴대폰 주소창은 그대로)', function () {
  const src = read('js/app.js');
  const part = src.slice(src.indexOf('/* ---------- 팝오버 ----------'), src.indexOf('function setProgress('));
  has(part, "window.addEventListener('resize', popResize");
  has(part, "window.addEventListener('orientationchange', popResize");
  has(part, 'function placePop(');
  ok(/innerWidth === popW/.test(part), '너비가 그대로면 아무것도 하지 않음');
});
