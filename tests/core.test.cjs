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
      Response: function (body) { this.body = body; }
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
  function ours() { return store.has(CACHE) ? Array.from(store.get(CACHE).keys()).sort() : []; }
  const R = {};
  store.set(CACHE, new Map([['https://x.test/site/css/style.css', { ok: true, body: 'old' }]]));
  let w = boot();
  w.navigate('https://x.test/site/a/one/').then(function () {
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
  eq(r.stateAfterOff, [], '쉼을 끄면 기억을 지움');
  ok(r.after.indexOf('https://x.test/site/a/five/') >= 0 && r.after.indexOf('https://x.test/site/a/seven/') >= 0, '쉼을 끈 뒤에는 다시 저장');
  ok(r.after.indexOf('https://x.test/site/a/six') < 0 && r.after.indexOf('https://x.test/site/data/moved.json') < 0, '리다이렉트 응답은 넣지 않음');
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
  p.markRead('what', 1);
  const r = p.continueReading(ARTS, CRS, { entered: p.enteredCourses(), hideTags: PR.SENSITIVE_TAGS });
  eq(r.kind, 'course'); eq(r.course.id, 'first-diagnosis'); eq(r.article.slug, 'warn', '들어간 코스 안에서는 순서대로(위기 글도)');
  has(r.reason, '"처음 진단받았어요" 코스 1/4');
  /* 배열로 줘도 같음, 깨진 코스는 건너뜀 */
  eq(p.continueReading(ARTS, CRS.concat([{ id: 'bad', title: 'x', steps: null }]), { entered: ['first-diagnosis'] }).course.id, 'first-diagnosis');
  /* 깨진 저장값 */
  s.set('jhb.course', ['first-diagnosis']);
  eq(Object.keys(p.enteredCourses()), []);
  eq(Object.getPrototypeOf(p.enteredCourses()), null);
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
  /* 아직 없는 기능(종이 양식)은 저장 목록에 적지 않음 */
  not(sec, '종이 양식');
  /* 열어 본 화면(오프라인 저장)을 어떻게 지우는지: 내 서재의 읽은 글·최근 읽은 글·읽던 자리·전부 지우기가 함께 지움(js/pages/me.js PAGE_KINDS·clearCaches) */
  has(sec, '저장된 화면도 함께 지워요');
  has(sec, '켜기 전에 저장된 화면은 남아요');
  has(html, 'href="#/me"');
  not(html, '탭을 닫으면 사라져요');
});
