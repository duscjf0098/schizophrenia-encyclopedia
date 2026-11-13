/* 0B 안전·개인정보 테스트
   - 검색어가 주소·캐시에 남지 않음: 코드에 '#/search?q=' 이동이 없음, 서비스 워커는 쿼리 없는 키로 저장하고 activate 때 쿼리 항목을 지움
   - 찾기 화면(js/pages/search.js, data/pages/search.json)
   - 명령 팔레트(js/ui/palette.js): Enter 가 전화로 가지 않음, 위기 줄은 기본 선택이 아님, 코스·등록 화면 주소, 최근 검색 규칙
     (팔레트는 아주 작은 가짜 DOM 위에서 돌린다) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const A = require('../tools/lib/assets.cjs');
const C = require('../js/crisis.js');

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function walkJs(dir, out) {
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(function (e) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) walkJs(rel, out);
    else if (/\.js$/.test(e.name)) out.push(rel);
  });
  return out;
}

/* ---------- 검색어가 주소에 실리는 코드가 없다 ---------- */
test("검색 이동에 '#/search?q=' 를 쓰는 코드가 없다(js/**, tools/shell.html)", function () {
  const files = walkJs('js', []).concat(['tools/shell.html', 'sw.js']);
  files.forEach(function (f) {
    const src = read(f);
    not(src, "#/search?q=", f);
    not(src, "search/?q=' +", f);
    ok(!/['"]\?q=['"]\s*\+/.test(src), f + ' 에 ?q= 를 이어 붙이는 코드');
  });
});

test('상단 검색창 #q 는 콤보박스가 아니고 옛 #qs-list 가 없다', function () {
  const shell = read('tools/shell.html');
  const m = /<input id="q"[^>]*>/.exec(shell);
  ok(m, '#q 없음');
  not(m[0], 'role="combobox"'); not(m[0], 'aria-controls'); has(m[0], 'aria-haspopup="dialog"');
  not(shell, 'qs-list');
});

/* ---------- 찾기 화면 ---------- */
test('찾기 화면 선언: noindex, nav 없음, 위기 줄, 규칙 통과', function () {
  const d = JSON.parse(A.stripBom(read('data/pages/search.json')));
  eq(A.validateDecl(d, 'search', { root: ROOT }).errors, []);
  eq(d.robots, 'noindex'); eq(d.nav, []); eq(d.crisisLine, true); eq(d.title, '찾기');
  const n = A.normalizeDecl(d, { root: ROOT });
  ok(n.hasJs, 'js/pages/search.js 있음');
  ok(n.notice[0] === 'general', '일반 고지가 맨 앞');
});

test('찾기 화면 코드: node 에서 읽히고, 정적 내용에 검색 양식(주소에 검색어를 싣는 GET 폼)이 없다', function () {
  const file = path.join(ROOT, 'js', 'pages', 'search.js');
  delete require.cache[require.resolve(file)];
  const pg = require(file);
  eq(pg.id, 'search');
  eq(typeof pg.render, 'function');
  const html = pg.staticHtml({ data: {}, esc: function (s) { return s; }, articles: {}, sections: [], page: {} });
  has(html, '<noscript>');
  not(html, '<form'); not(html, 'name="q"');
  const src = read('js/pages/search.js');
  has(src, "sessionStorage.removeItem(Q_KEY)", '넘겨받은 검색어는 읽자마자 지움');
  has(src, "history.replaceState({ q: q, s: s, at: Date.now() }, '', location.pathname)", '상태는 쿼리 없는 주소로만(지운 시각과 견줄 at 포함)');
  not(src, 'setTitle(', '탭 제목에 검색어를 넣지 않음');
});

test('찾기 화면: 최근 검색을 지운 시각보다 오래된 history.state 의 검색어는 되살리지 않는다', function () {
  const page = require('../js/pages/search.js');
  ok(page && page.render, 'search.js');
  const src = read('js/pages/search.js'), app = read('js/app.js');
  has(app, "if (all || done.indexOf('recentq') >= 0) { try { sessionStorage.setItem(Q_CLEARED_KEY, String(Date.now())); }", 'app.js privClear 가 지운 시각을 남김');
  has(app, "const Q_CLEARED_KEY = 'jhb.q.cleared';");
  has(src, "var CLEARED_KEY = 'jhb.q.cleared';");
  /* 브라우저처럼 돌려 등록된 화면의 stateQuery(시험용으로 노출)를 쓴다 */
  const ss = {};
  const sb = { sessionStorage: { getItem: function (k) { return k in ss ? ss[k] : null; }, setItem: function (k, v) { ss[k] = String(v); }, removeItem: function (k) { delete ss[k]; } }, JHB: { app: { registerPage: function (pg) { sb.page = pg; } } } };
  sb.window = sb;
  vm.runInNewContext(src, sb);
  ok(sb.page && typeof sb.page.stateQuery === 'function', 'page.stateQuery');
  const sq = sb.page.stateQuery;
  eq(sq({ q: '환청', s: '2', at: 100 }), { q: '환청', s: '2' }, '지운 적 없으면 그대로');
  ss['jhb.q.cleared'] = '200';
  eq(sq({ q: '환청', s: '2', at: 100 }), { q: '', s: '' }, '지운 뒤라면 버림');
  eq(sq({ q: '환청', s: '' }), { q: '', s: '' }, 'at 없는 옛 state 도 버림');
  eq(sq({ q: '망상', s: '', at: 300 }), { q: '망상', s: '' }, '지운 뒤 새로 찾은 것은 그대로');
  eq(sq(null), null);
  /* 지우기 이벤트·bfcache 복귀 처리 */
  has(src, "d.ids === 'all' || (Array.isArray(d.ids) && d.ids.indexOf('recentq') >= 0)");
  has(src, "window.addEventListener('pageshow', onShow);");
});

test("옛 주소 search/?q= 의 깨진 % 값은 검색어로 쓰지 않는다(app.js route 는 strict 해석)", function () {
  const app = read('js/app.js');
  has(app, "P.parseQuery(location.search, { strict: true })");
});

/* ---------- 팔레트(가짜 DOM) ---------- */
function makeDom() {
  const doc = { activeElement: null, _ls: {} };
  function parseSel(s) {
    const m = /^([a-z0-9]*)((?:\.[\w-]+)*)(?:\[([\w-]+)(?:\^?="?([^"\]]*)"?)?\])?$/i.exec(s.trim());
    if (!m) throw new Error('지원하지 않는 선택자: ' + s);
    return { tag: m[1].toUpperCase(), cls: m[2] ? m[2].split('.').filter(Boolean) : [], attr: m[3] || null, val: m[4] };
  }
  function Node(tag) {
    this.tagName = String(tag).toUpperCase(); this.children = []; this.attrs = {}; this.parentNode = null;
    this.style = {}; this._ls = {}; this._text = ''; this.value = '';
    const self = this;
    this.classList = {
      add: function () { const c = self.className.split(' ').filter(Boolean); Array.prototype.forEach.call(arguments, function (x) { if (c.indexOf(x) < 0) c.push(x); }); self.className = c.join(' '); },
      remove: function () { const rm = Array.prototype.slice.call(arguments); self.className = self.className.split(' ').filter(function (x) { return x && rm.indexOf(x) < 0; }).join(' '); },
      contains: function (x) { return self.className.split(' ').indexOf(x) >= 0; },
      toggle: function (x, on) { if (on === undefined) on = !this.contains(x); if (on) this.add(x); else this.remove(x); return on; }
    };
  }
  Node.prototype = {
    get className() { return this.attrs['class'] || ''; }, set className(v) { this.attrs['class'] = String(v); },
    get id() { return this.attrs.id || ''; }, set id(v) { this.attrs.id = String(v); },
    get hidden() { return 'hidden' in this.attrs; }, set hidden(v) { if (v) this.attrs.hidden = ''; else delete this.attrs.hidden; },
    get tabIndex() { return this.attrs.tabindex != null ? Number(this.attrs.tabindex) : (/^(A|BUTTON|INPUT)$/.test(this.tagName) ? 0 : -1); },
    get offsetParent() { let n = this; while (n) { if (n.hidden) return null; n = n.parentNode; } return {}; },
    get offsetWidth() { return 0; },
    get textContent() { return this.tagName === '#TEXT' ? this._text : this.children.map(function (c) { return c.textContent; }).join(''); },
    set textContent(v) { this.children = []; const t = new Node('#text'); t._text = String(v); this.appendChild(t); },
    get innerHTML() { return this._html || ''; }, set innerHTML(v) { this.children.forEach(function (c) { c.parentNode = null; }); this.children = []; this._html = String(v); },
    setAttribute: function (k, v) { this.attrs[k] = String(v); }, getAttribute: function (k) { return k in this.attrs ? this.attrs[k] : null; },
    removeAttribute: function (k) { delete this.attrs[k]; }, hasAttribute: function (k) { return k in this.attrs; },
    appendChild: function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; },
    removeChild: function (c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; },
    replaceChild: function (n, o) { const i = this.children.indexOf(o); if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.children[i] = n; o.parentNode = null; return o; },
    remove: function () { if (this.parentNode) this.parentNode.removeChild(this); },
    contains: function (n) { while (n) { if (n === this) return true; n = n.parentNode; } return false; },
    matches: function (sel) {
      const self = this;
      return sel.split(',').some(function (one) {
        const s = parseSel(one);
        if (s.tag && s.tag !== self.tagName) return false;
        if (s.cls.some(function (c) { return !self.classList.contains(c); })) return false;
        if (s.attr && !(s.attr in self.attrs)) return false;
        return true;
      });
    },
    closest: function (sel) { let n = this; while (n && n.matches) { if (n.matches(sel)) return n; n = n.parentNode; } return null; },
    querySelectorAll: function (sel) { const out = []; (function walk(n) { n.children.forEach(function (c) { if (c.tagName !== '#TEXT' && c.matches(sel)) out.push(c); walk(c); }); })(this); return out; },
    querySelector: function (sel) { return this.querySelectorAll(sel)[0] || null; },
    addEventListener: function (t, f, cap) { (this._ls[t] = this._ls[t] || []).push({ f: f, cap: !!cap }); },
    focus: function () { doc.activeElement = this; }, blur: function () { if (doc.activeElement === this) doc.activeElement = doc.body; },
    scrollIntoView: function () { }, setSelectionRange: function () { }
  };
  doc.body = new Node('body'); doc.documentElement = new Node('html'); doc.documentElement.appendChild(doc.body);
  doc.activeElement = doc.body;
  doc.createElement = function (t) { return new Node(t); };
  doc.createElementNS = function (ns, t) { return new Node(t); };
  doc.createTextNode = function (t) { const n = new Node('#text'); n._text = String(t); return n; };
  doc.contains = function (n) { return doc.documentElement.contains(n); };
  doc.addEventListener = function (t, f, cap) { (doc._ls[t] = doc._ls[t] || []).push({ f: f, cap: !!cap }); };
  /* 이벤트: 문서 capture → 대상 → 부모로 거품 → 문서 bubble */
  doc.fire = function (target, type, props) {
    const ev = Object.assign({ type: type, target: target, defaultPrevented: false, _stop: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
      preventDefault: function () { this.defaultPrevented = true; }, stopPropagation: function () { this._stop = true; } }, props || {});
    (doc._ls[type] || []).filter(function (x) { return x.cap; }).forEach(function (x) { if (!ev._stop) x.f(ev); });
    let n = target;
    while (n && !ev._stop) { (n._ls[type] || []).forEach(function (x) { if (!ev._stop) x.f(ev); }); n = n.parentNode; }
    if (!ev._stop) (doc._ls[type] || []).filter(function (x) { return !x.cap; }).forEach(function (x) { if (!ev._stop) x.f(ev); });
    return ev;
  };
  function find(id) { let hit = null; (function walk(n) { n.children.forEach(function (c) { if (!hit && c.attrs && c.attrs.id === id) hit = c; if (!hit) walk(c); }); })(doc.documentElement); return hit; }
  doc.getElementById = find;
  function el(spec, attrs, children) {
    const parts = spec.split('.');
    const node = new Node(parts[0] || 'div');
    if (parts.length > 1) node.className = parts.slice(1).join(' ');
    if (attrs) Object.keys(attrs).forEach(function (k) {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'html') node.innerHTML = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'class') node.className += (node.className ? ' ' : '') + v;
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) { if (c == null || c === false) return; node.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return node;
  }
  return { doc: doc, el: el };
}
function loadPalette(opts) {
  opts = opts || {};
  const D = makeDom(), doc = D.doc;
  const q = D.el('input', { id: 'q', type: 'search' }); doc.body.appendChild(q);
  const ls = Object.assign({}, opts.store || {});
  const calls = [];
  const store = {
    get: function (k, f) { return k in ls ? JSON.parse(ls[k]) : f; },
    set: function (k, v) { ls[k] = JSON.stringify(v); return true; },
    remove: function (k) { delete ls[k]; }
  };
  const articles = [
    { slug: 'suicide-warning-signs', section: '5', title: '자살 위험 신호와 대처', summary: '신호와 대처', tags: ['위기'] },
    { slug: 'auditory-hallucination', section: '2', title: '환청', summary: '들리는 경험', tags: [] },
    { slug: 'twin-research', section: '1', title: '쌍둥이 연구', summary: 'twin studies', tags: [] }
  ];
  const bySlug = {}; articles.forEach(function (a) { bySlug[a.slug] = a; });
  const app = {
    el: D.el, store: store, articles: articles, bySlug: bySlug, secById: { '1': { title: '이해하기' }, '2': { title: '양성 증상' }, '5': { title: '경과' } },
    glossary: [{ term: '환청', en: 'auditory hallucination', def: '없는 소리를 듣는 경험' }],
    courses: [{ id: 'family-first', title: '가족이 진단받았어요', intro: '가족을 위한 순서', steps: [{ slug: 'auditory-hallucination' }] }],
    pages: [
      { id: 'guide', title: '상황별 길잡이', label: '길잡이', summary: '어디에 연락할지', nav: ['top', 'side', 'palette'], keywords: ['어디에 연락'] },
      { id: 'me', title: '내 서재', label: '내 서재', summary: '기기 기록', nav: ['side'], keywords: ['기록'] }
    ],
    spine: function () { return D.el('span.spine'); },
    effectiveTheme: function () { return 'light'; },
    go: function (h) { calls.push(['go', h]); },
    goSearch: function (v) { calls.push(['search', v]); },
    privacy: {
      recentq: function () { return !!opts.recentq; },
      paused: function () { return !!opts.paused; }
    }
  };
  const location = {};
  Object.defineProperty(location, 'href', { set: function (v) { calls.push(['href', v]); }, get: function () { return 'https://x.test/'; } });
  /* 시간: 가짜 타이머(tick(ms) 로 흘려보냄)와 가짜 Date.now */
  const timers = []; let now = 1000000;
  const FakeDate = { now: function () { return now; } };
  function tick(ms) { now += ms; timers.filter(function (t) { return !t.done && t.at <= now; }).forEach(function (t) { t.done = true; t.fn(); }); }
  const sandbox = { document: doc, location: location, JHB: { app: app, crisis: C }, matchMedia: function () { return { matches: true }; }, console: console, Date: FakeDate,
    setTimeout: function (fn, ms) { timers.push({ fn: fn, at: now + (ms || 0), done: false }); return timers.length; }, clearTimeout: function (id) { if (id && timers[id - 1]) timers[id - 1].done = true; } };
  sandbox.window = sandbox;
  vm.runInNewContext(read('js/ui/palette.js'), sandbox);
  const P = sandbox.JHB.ui.palette;
  function input() { return doc.body.querySelector('input.pal-input'); }
  function items() { return doc.body.querySelectorAll('div.pal-item'); }
  function selected() { return items().filter(function (n) { return n.getAttribute('aria-selected') === 'true'; })[0] || null; }
  function type(v) { P.open(v); }
  function key(k, target) { return doc.fire(target || input(), 'keydown', { key: k }); }
  return { doc: doc, P: P, calls: calls, ls: ls, input: input, items: items, selected: selected, type: type, key: key, q: q, tick: tick, close: function () { P.close(); } };
}

test('팔레트: 위기·타해·정보 검색어 모두 Enter 가 전화(tel:)로 가지 않는다', function () {
  ['자살률', '자살 예방', 'twin studies', '죽고 싶어', '죽이고 싶어', '자해하고 싶어'].forEach(function (v) {
    const t = loadPalette();
    t.type(v);
    const sel = t.selected();
    ok(sel, v + ': 선택된 항목이 있어야 해요');
    ok(!sel.classList.contains('pal-crisis'), v + ': 위기 줄이 기본 선택이면 안 돼요');
    t.key('Enter');
    ok(t.calls.length === 1, v + ': 한 번 이동 ' + JSON.stringify(t.calls));
    ok(t.calls.every(function (c) { return c[0] !== 'href' && !/^tel:/.test(c[1]); }), v + ': tel 이동 ' + JSON.stringify(t.calls));
  });
});

test('팔레트: 본인 위기(high)·타해(harm) Enter → 찾기 화면(goSearch), 위기 줄 클릭도 찾기 화면', function () {
  ['죽고 싶어', '죽이고 싶어'].forEach(function (v) {
    const t = loadPalette();
    t.type(v);
    ok(t.selected().classList.contains('pal-all'), v + ': 본문까지 찾기가 기본');
    t.key('Enter');
    eq(t.calls, [['search', v]], v);
    const t2 = loadPalette();
    t2.type(v);
    const row = t2.items().filter(function (n) { return n.classList.contains('pal-crisis'); })[0];
    ok(row, v + ': 위기 줄');
    t2.doc.fire(row, 'click');
    eq(t2.calls, [['search', v]], v + ' 위기 줄 클릭');
  });
});

test('팔레트: 위기 줄의 전화는 줄 안 버튼(a[href^=tel:])으로만, 등급별 번호·문구', function () {
  function line(v) {
    const t = loadPalette(); t.type(v);
    const row = t.items().filter(function (n) { return n.classList.contains('pal-crisis'); })[0];
    return row ? { text: row.textContent, tels: row.querySelectorAll('a.pal-tel').map(function (a) { return a.getAttribute('href'); }), watch: row.classList.contains('pal-watch'), tab: row.querySelectorAll('a.pal-tel').every(function (a) { return a.tabIndex === 0; }) } : null;
  }
  const hi = line('죽고 싶어'), hm = line('죽이고 싶어'), w = line('자살률');
  eq(hi.tels, ['tel:109']); has(hi.text, '109'); ok(!hi.watch); ok(hi.tab, 'Tab 으로 닿는 전화 버튼');
  eq(hm.tels, ['tel:112', 'tel:119']); has(hm.text, '지금 위험하면 112 · 119');
  eq(w.tels, ['tel:109']); ok(w.watch, 'watch 는 차분한 줄'); has(w.text, '도움이 필요하면 109 · 1577-0199');
  eq(line('twin studies'), null);
  eq(line('환청'), null);
});

test('팔레트: 코스는 course/<id>, 등록 화면(nav 에 palette)은 동작으로 찾힌다', function () {
  let t = loadPalette();
  t.type('가족');
  const c = t.items().filter(function (n) { return /가족이 진단받았어요/.test(n.textContent); })[0];
  ok(c, '코스 항목'); t.doc.fire(c, 'click');
  eq(t.calls, [['go', '#/course/family-first']]);
  t = loadPalette();
  t.type('어디에 연락');
  const g = t.items().filter(function (n) { return /길잡이/.test(n.textContent); })[0];
  ok(g, '등록 화면 항목'); t.doc.fire(g, 'click');
  eq(t.calls, [['go', '#/guide']]);
  t = loadPalette();
  t.type('내 서재');
  ok(!t.items().some(function (n) { return !n.classList.contains('pal-all') && /내 서재/.test(n.textContent); }), 'nav 에 palette 가 없는 화면은 안 보임');
  t = loadPalette();
  t.type('');
  ok(t.items().some(function (n) { return /길잡이/.test(n.textContent); }), '입력 전 동작 목록에도 보임');
});

test('팔레트 최근 검색: 기본 꺼짐(옛 값도 지움), 켰을 때만 저장, 감지된 말·기록 쉼이면 저장 안 함', function () {
  let t = loadPalette({ store: { 'jhb.ui.palette.recentq': JSON.stringify(['예전 검색']) } });
  ok(!('jhb.ui.palette.recentq' in t.ls), '꺼져 있으면 시작할 때 옛 값을 지움');
  t.type('환청'); t.key('Enter');
  ok(!('jhb.ui.palette.recentq' in t.ls), '꺼져 있으면 저장 안 함');
  t.type(''); ok(!t.doc.body.querySelectorAll('div.pal-group').some(function (g) { return g.textContent === '최근 검색'; }), '최근 검색 묶음 없음');

  t = loadPalette({ recentq: true });
  ['환청', '자살률', '죽고 싶어', '죽이고 싶어', 'twin studies'].forEach(function (v) {
    t.type(v); const all = t.items().filter(function (n) { return n.classList.contains('pal-all'); })[0]; t.doc.fire(all, 'click');
  });
  eq(JSON.parse(t.ls['jhb.ui.palette.recentq']), ['twin studies', '환청'], '감지된 말은 빠짐');
  t.type('');
  ok(t.doc.body.querySelectorAll('div.pal-group').some(function (g) { return g.textContent === '최근 검색'; }), '켰을 때는 최근 검색 묶음');

  t = loadPalette({ recentq: true, paused: true });
  t.type('환청'); t.key('Enter');
  ok(!('jhb.ui.palette.recentq' in t.ls), '기록 쉼이면 저장 안 함');
});

test('팔레트: #q 에 포커스만으로는 열지 않고, 글자·클릭·Enter·아래 화살표·/·Ctrl+K 로 연다', function () {
  let t = loadPalette();
  t.doc.fire(t.q, 'focusin'); t.q.focus();
  ok(!t.P.isOpen(), '포커스만으로 열림');
  t.q.value = '환'; t.doc.fire(t.q, 'input');
  ok(t.P.isOpen(), '글자 입력'); eq(t.input().value, '환'); eq(t.q.value, '');
  t.key('Escape', t.input());
  ok(!t.P.isOpen(), 'Esc 로 닫힘'); ok(t.doc.activeElement === t.q, '닫으면 #q 로 돌아옴');
  ok(!t.P.isOpen(), '돌아온 포커스로 다시 열리지 않음');
  t.doc.fire(t.q, 'keydown', { key: 'Tab' });
  ok(!t.P.isOpen(), 'Tab 으로 열리지 않음');
  [['click'], ['keydown', { key: 'Enter' }], ['keydown', { key: 'ArrowDown' }]].forEach(function (x) {
    const u = loadPalette();
    u.doc.fire(u.q, x[0], x[1]);
    ok(u.P.isOpen(), JSON.stringify(x) + ' 로 열려야 해요');
  });
  t = loadPalette();
  t.doc.fire(t.doc.body, 'keydown', { key: '/' });
  ok(t.P.isOpen(), "'/' 로 열림");
  t = loadPalette();
  t.doc.fire(t.doc.body, 'keydown', { key: 'k', ctrlKey: true });
  ok(t.P.isOpen(), 'Ctrl+K 로 열림');
});

test('팔레트: #q 에서 한글을 조합하는 동안에는 포커스를 옮기지 않고, 멈추면 조합한 값 그대로 넘긴다(ㅎ환청 방지)', function () {
  const t = loadPalette();
  t.q.focus();
  /* 조합 시작: 첫 자모가 들어와도 열지 않는다 */
  t.doc.fire(t.q, 'keydown', { key: 'Process', keyCode: 229 });
  t.doc.fire(t.q, 'compositionstart');
  t.q.value = 'ㅎ'; t.doc.fire(t.q, 'input', { isComposing: true });
  ok(!t.P.isOpen(), '조합 중 첫 자모에서 열림');
  ok(t.doc.activeElement === t.q, '조합 중 포커스가 옮겨짐');
  t.q.value = '환'; t.doc.fire(t.q, 'input', { isComposing: true });
  t.doc.fire(t.q, 'compositionend');
  t.doc.fire(t.q, 'compositionstart');
  t.q.value = '환ㅊ'; t.doc.fire(t.q, 'input', { isComposing: true });
  t.tick(200);
  t.q.value = '환청'; t.doc.fire(t.q, 'input', { isComposing: true });
  t.tick(300);
  ok(!t.P.isOpen(), '치는 중(500ms 안)에는 열지 않음');
  t.tick(300);
  ok(t.P.isOpen(), '멈추면 연다'); eq(t.input().value, '환청'); eq(t.q.value, '');
  /* 조합 직후의 조합 아닌 input 도 IME 로 본다 */
  const u = loadPalette(); u.q.focus();
  u.doc.fire(u.q, 'compositionstart'); u.q.value = '약'; u.doc.fire(u.q, 'compositionend');
  u.doc.fire(u.q, 'input', { isComposing: false });
  ok(!u.P.isOpen(), 'compositionend 직후 input 으로 바로 열림');
  u.tick(600); ok(u.P.isOpen()); eq(u.input().value, '약');
  /* 조합 중 Enter(229)는 무시, 그 뒤 Enter 는 연다 */
  const w = loadPalette(); w.q.focus();
  w.doc.fire(w.q, 'compositionstart'); w.q.value = '망상'; w.doc.fire(w.q, 'input', { isComposing: true });
  w.doc.fire(w.q, 'keydown', { key: 'Enter', keyCode: 229, isComposing: true });
  ok(!w.P.isOpen(), '조합 중 Enter 로 열림');
  w.doc.fire(w.q, 'compositionend');
  w.doc.fire(w.q, 'keydown', { key: 'Enter', keyCode: 13 });
  ok(w.P.isOpen(), '조합 뒤 Enter 로 열림'); eq(w.input().value, '망상');
  /* 넘기기 전에 다른 곳으로 가면(Tab) 열지 않는다 */
  const x = loadPalette(); x.q.focus();
  x.doc.fire(x.q, 'compositionstart'); x.q.value = '환'; x.doc.fire(x.q, 'input', { isComposing: true }); x.doc.fire(x.q, 'compositionend');
  x.doc.fire(x.q, 'blur'); x.doc.activeElement = x.doc.body;
  x.tick(800);
  ok(!x.P.isOpen(), '포커스가 떠난 뒤 열림');
  /* 영문은 바로 연다(조합 아님) */
  const y = loadPalette(); y.q.focus();
  y.q.value = 'c'; y.doc.fire(y.q, 'input', { isComposing: false });
  ok(y.P.isOpen()); eq(y.input().value, 'c');
});

test('서비스 워커: 페이지 이동은 쿼리 없는 주소로 저장, activate 때 쿼리 항목·지난 캐시를 지움, 오프라인은 쿼리 없는 키로 찾음', function () {
  const r = JSON.parse(cp.execFileSync(process.execPath, [path.join(__dirname, 'sw-harness.cjs')], { encoding: 'utf8', timeout: 20000 }));
  ok(!r.error, r.error);
  const CACHE = 'jhb-' + r.build;
  const a = r.afterActivate;
  eq(a.names, [CACHE, 'other-app'].sort(), 'activate 뒤 캐시 이름(지난 판 jhb-old 는 지움, 다른 앱 캐시는 그대로)');
  ok(!a.ours.some(function (u) { return u.indexOf('?') >= 0; }), '쿼리 항목이 남음 ' + JSON.stringify(a.ours));
  ok(a.ours.indexOf('https://x.test/site/a/x/') >= 0, '쿼리 없는 항목까지 지움');
  eq(a.other, ['https://x.test/z?q=1'], '다른 앱 캐시는 건드리지 않음');
  ok(!r.afterNav.some(function (u) { return u.indexOf('?') >= 0; }), '이동 저장 키에 쿼리 ' + JSON.stringify(r.afterNav));
  ['https://x.test/site/search/', 'https://x.test/site/a/visual-hallucination/'].forEach(function (u) { ok(r.afterNav.indexOf(u) >= 0, u + ' 저장 안 됨'); });
  ok(r.offlineHit, '오프라인에서 쿼리 없는 키로 찾지 못함');
});
