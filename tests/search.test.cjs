/* js/search.js(검색 두뇌)와 js/ui/palette.js(팔레트) 테스트
   - 한글 도구, 빠른 찾기 순위, 오타·초성, 질문 꼴, 본문 색인 검색(AND·한 글자·엔티티 안전한 강조), 두 단계 합치기, 짧은 답, 위기 결합
   - 팔레트는 작은 가짜 DOM 에서 진짜 data/*.js 와 js/search.js·js/synonyms.js·js/crisis.js 를 실어 돌린다 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const S = require('../js/search.js');
const SYN = require('../js/synonyms.js');
const C = require('../js/crisis.js');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function loadData(file) { const w = {}; w.JHB = {}; new Function('window', 'JHB', read('data/' + file))(w, w.JHB); return w.JHB; }

const docs = [
  { id: 'auditory', title: '환청', section: '2', tags: ['양성', '환각'], summary: '들리지 않아야 할 소리가 들리는 경험', body: '환청은 가장 흔한 환각이에요. 목소리가 명령하거나 평가하기도 해요.' },
  { id: 'delusion', title: '망상', section: '2', tags: ['양성'], summary: '굳은 잘못된 믿음', body: '피해망상이 가장 흔해요. 환청과 함께 나타나기도 해요.' },
  { id: 'avolition', title: '무의욕', section: '3', tags: ['음성'], summary: '시작하고 이어가는 힘이 줄어드는 것', body: '음성 증상 중 하나예요.' }
];

/* ---------- 본문 색인 검색(기존 동작 유지) ---------- */
test('제목 일치가 본문 일치보다 앞선다', function () {
  const idx = S.build(docs);
  const r = S.query(idx, '환청');
  eq(r.map(function (x) { return x.id; }), ['auditory', 'delusion']);
});

test('대소문자·공백 무시, 여러 단어는 모두 포함한 글이 앞선다', function () {
  const idx = S.build(docs);
  const r = S.query(idx, ' 환청  피해 ');
  eq(r[0].id, 'delusion');
});

test('없는 말은 빈 배열, 빈 질의도 빈 배열', function () {
  const idx = S.build(docs);
  eq(S.query(idx, '토성'), []);
  eq(S.query(idx, '  '), []);
});

test('섹션 필터', function () {
  const idx = S.build(docs);
  eq(S.query(idx, '증상', { section: '3' }).map(function (x) { return x.id; }), ['avolition']);
});

test('스니펫은 일치 부분 주변을 자르고 <mark>로 감싼다', function () {
  const idx = S.build(docs);
  const r = S.query(idx, '명령');
  has(r[0].snippet, '<mark>명령</mark>');
  ok(r[0].snippet.length < 120);
});

test('스니펫도 HTML 이스케이프', function () {
  const idx = S.build([{ id: 'x', title: 't', section: '1', tags: [], summary: '', body: '<b>태그</b> 검색어' }]);
  const r = S.query(idx, '검색어');
  not(r[0].snippet, '<b>');
  has(r[0].snippet, '&lt;b&gt;');
});

test('T27: quot·amp·lt 를 찾아도 강조가 엔티티를 깨뜨리지 않는다', function () {
  const idx = S.build([{ id: 'x', title: 't', section: '1', tags: [], summary: '', body: '그는 "quot" & amp < lt 라고 썼다' }]);
  const r = S.query(idx, 'quot amp lt');
  ok(r.length === 1, '찾음');
  const h = r[0].snippet;
  has(h, '&quot;<mark>quot</mark>&quot;');
  has(h, '&amp; <mark>amp</mark>');
  has(h, '&lt; <mark>lt</mark>');
  not(h, '&<mark>'); not(h, '<mark>quot</mark>;');
  eq(S.markHtml('a&b', ['amp']), 'a&amp;b', '원문에 없는 엔티티 이름은 강조하지 않음');
});

test('본문 검색: 모든 낱말이 맞는 글(AND)이 먼저, 한 글자 낱말은 가볍게, strict 는 AND 만', function () {
  const idx = S.build([
    { id: 'one', title: '약의 원리', section: '7', tags: [], summary: '', body: '병 병 병 병 병 병 병 병 병 병 약 약 약' },
    { id: 'both', title: '조현병 이야기', section: '1', tags: [], summary: '', body: '조현 이라는 말과 병 이라는 말' },
    { id: 'pregnant', title: '신약 동향', section: '7', tags: [], summary: '', body: '새 약이 나와요' },
    { id: 'preg2', title: '임신·출산과 약', section: '9', tags: [], summary: '', body: '임신 중 약' }
  ]);
  eq(S.query(idx, '조현 병')[0].id, 'both');
  eq(S.query(idx, '임신 약')[0].id, 'preg2');
  eq(S.query(idx, '임신 약', { strict: true }).map(function (x) { return x.id; }), ['preg2']);
  ok(S.query(idx, '임신 약').every(function (x, i, a) { return i === 0 || !x.all || a[i - 1].all; }), 'AND 가 앞에 몰려 있음');
});

test('영문 낱말은 낱말 시작에서만: EPS 는 KEPS·episode 에서 맞지 않는다', function () {
  const idx = S.build([
    { id: 'eps', title: '추체외로 증상(EPS)', section: '7', tags: [], summary: '', body: 'EPS 는 …' },
    { id: 'keps', title: '한국 연구', section: '12', tags: ['KEPS'], summary: 'KEPS 코호트', body: 'first-episode KEPS' }
  ]);
  eq(S.query(idx, 'EPS').map(function (x) { return x.id; }), ['eps']);
});

/* ---------- 한글 도구 ---------- */
test('한글: 자모 분해·초성·자모 편집 거리·을/를', function () {
  const H = S.hangul;
  eq(H.jamo('환청'), 'ㅎㅘㄴㅊㅓㅇ');
  eq(H.jamo('A값'), 'aㄱㅏㅄ');
  eq(H.initials('클로자핀'), 'ㅋㄹㅈㅍ');
  eq(H.initials('환청 증상'), 'ㅎㅊㅈㅅ');
  eq(H.distance('환쳥', '환청'), 1);
  eq(H.distance('조현벙', '조현병'), 1);
  eq(H.distance('클로자삔', '클로자핀'), 1);
  eq(H.distance('환청', '환청'), 0);
  ok(H.distance('조현병', '양극성', 2) > 2, 'max 넘으면 일찍 끝냄');
  ok(H.isInitials('ㅎㅊ') && H.isInitials('ㅋㄹ ㅈㅍ'));
  ok(!H.isInitials('ㅎ') && !H.isInitials('환ㅊ') && !H.isInitials('ab'));
  eq([H.josa('환청'), H.josa('주사'), H.josa('클로자핀'), H.josa('LAI')], ['을', '를', '을', '을(를)']);
});

test('질의 다듬기: 조사·어미 떼기, 기능어 빼기, 질문 꼴', function () {
  eq(S.stems('유전되나요'), ['유전되나요', '유전']);
  ok(S.stems('약을').indexOf('약') >= 0, '두 글자 낱말의 한 글자 조사');
  eq(S.stems('아이')[0], '아이', '원래 낱말이 먼저(뗀 꼴은 덜 무겁게)');
  eq(S.stems('환청이에요'), ['환청이에요', '환청'], '가장 긴 꼬리 하나만');
  eq(S.stems('clozapine'), ['clozapine'], '영문은 그대로');
  eq(S.analyze('약 끊어도 되나요').words.map(function (x) { return x.w; }), ['약', '끊어도']);
  ok(S.isQuestion('약 끊어도 되나요') && S.isQuestion('유전되나요') && S.isQuestion('술 마셔도') && S.isQuestion('이거 뭐예요?'));
  ok(!S.isQuestion('환청') && !S.isQuestion('클로자핀 부작용'));
});

/* ---------- 빠른 찾기(작은 자료) ---------- */
const mini = {
  articles: [
    { slug: 'exact', section: '2', order: 1, title: '환청', summary: '소리가 들리는 경험', tags: ['양성'] },
    { slug: 'prefix', section: '9', order: 1, title: '환청과 함께 지내기', summary: '대처', tags: [] },
    { slug: 'contains', section: '13', order: 1, title: '문화권마다 다른 환청', summary: '', tags: [] },
    { slug: 'synonym', section: '15', order: 1, title: '약을 먹어도 소리가 계속 나요', summary: '', tags: [] },
    { slug: 'tag', section: '8', order: 1, title: '인지행동치료', summary: '', tags: ['환청'] },
    { slug: 'summary', section: '8', order: 2, title: '아바타 치료', summary: '환청과 대화하는 치료', tags: [] },
    { slug: 'alone', section: '9', order: 3, title: '혼자 살기와 자립', summary: '', tags: [] },
    { slug: 'suicide', section: '4', order: 1, title: '자살 위험 신호와 대처', summary: '', tags: ['위기'] }
  ],
  glossary: [{ term: '환청', en: 'auditory hallucination', def: '' }, { term: '추체외로 증상', en: 'extrapyramidal symptoms (EPS)', def: '' }, { term: '첫 삽화', en: 'first-episode psychosis', def: '' }],
  courses: [{ id: 'c1', title: '환청·망상과 지내기', steps: [] }],
  synonyms: [{ say: ['환청'], slugs: ['synonym'] }, { say: ['혼자 살'], slugs: ['alone'] }, { say: ['애인'], slugs: ['tag'] }]
};
const MP = S.prepare(Object.assign({ syn: SYN }, mini));
test('빠른 찾기 순위: 제목 완전 > 접두 > 포함 > 일상 말 > 태그 > 요약', function () {
  eq(S.find(MP, '환청').docs.map(function (x) { return x.slug; }), ['exact', 'prefix', 'contains', 'synonym', 'tag', 'summary']);
});
test('빠른 찾기: 낱말 경계 — "자살" 은 "혼자 살기" 를, "장애인" 은 일상 말 "애인" 을 부르지 않는다', function () {
  eq(S.find(MP, '자살').docs.map(function (x) { return x.slug; }), ['suicide']);
  ok(S.find(MP, '장애인 등록').docs.every(function (x) { return x.slug !== 'tag'; }), '장애인 → 애인 아님');
});
test('빠른 찾기: 용어 영문은 낱말 단위(EPS 는 추체외로 증상만, first-episode 아님)', function () {
  eq(S.find(MP, 'EPS').terms.map(function (x) { return x.g.term; }), ['추체외로 증상']);
  eq(S.find(MP, 'auditory').terms.map(function (x) { return x.g.term; }), ['환청']);
});
test('오타·초성: "환쳥"·"ㅎㅊ" → 환청 후보와 그 글, 결과가 튼튼하면 후보를 찾지 않는다', function () {
  const t = S.find(MP, '환쳥');
  ok(t.suggest && t.suggest.text === '환청', JSON.stringify(t.suggest && t.suggest.text));
  eq(t.suggest.docs[0].slug, 'exact');
  const i = S.find(MP, 'ㅎㅊ');
  ok(i.initials && i.suggest.text === '환청');
  eq(i.docs[0].slug, 'exact');
  eq(S.find(MP, '환청').suggest, null);
  eq(S.find(MP, '').docs, []);
});

/* ---------- 두 단계 합치기 ---------- */
test('두 단계 합치기: 앞에 둘 글 → 튼튼한 빠른 결과(순서 그대로) → 본문 AND → 일부 일치, strict 는 일부 일치를 뺀다', function () {
  const quick = [{ slug: 'a', score: 900 }, { slug: 'b', score: 450 }, { slug: 'p', score: 80 }];
  const body = [{ id: 'z', all: true, snippet: 'zz' }, { id: 'b', all: true, snippet: 'bb' }, { id: 'y', all: false, snippet: 'yy' }];
  eq(S.merge(quick, body).map(function (x) { return x.id; }), ['a', 'b', 'z', 'p', 'y']);
  eq(S.merge(quick, body)[1].snippet, 'bb', '본문 조각을 붙인다');
  eq(S.merge(quick, body, { front: ['c', 'a'], strict: true }).map(function (x) { return x.id; }), ['c', 'a', 'b', 'z']);
  eq(S.merge([], []), []);
});

/* ---------- 짧은 답 ---------- */
test('짧은 답: "## 짧은 답" 소절 원문 그대로, 다음 소제목 전까지. 없으면 빈 글', function () {
  const body = '## 짧은 답\n\n혼자 끊는 것은 **위험**해요.[^1]\n\n둘째 문단이에요.\n\n## 조금 더 자세히\n\n본문';
  eq(S.shortAnswer(body), '혼자 끊는 것은 **위험**해요.[^1]\n\n둘째 문단이에요.');
  eq(S.shortAnswer('## 다른 소제목\n글'), '');
  eq(S.shortAnswer(null), '');
  /* 실제 자주 묻는 질문 글은 모두 짧은 답이 있다 */
  const dir = path.join(ROOT, 'content', '15-faq');
  const md = require('../js/md.js');
  const empty = fs.readdirSync(dir).filter(function (f) { return /\.md$/.test(f); }).filter(function (f) { return !S.shortAnswer(md.parse(fs.readFileSync(path.join(dir, f), 'utf8')).body); });
  eq(empty, [], '짧은 답이 없는 FAQ');
});

/* ---------- 위기 결합 ---------- */
test('위기 결합: 원문·고친 질의 가운데 가장 무거운 등급, high+harm 은 harm 표시, 없으면 null', function () {
  function fake(t) { return { '죽고 싶어': { level: 'high' }, '죽이고 싶어': { level: 'harm' }, '자살': { level: 'watch' } }[t] || null; }
  eq(S.crisis(fake, ['환쳥', '자살']), { level: 'watch' });
  eq(S.crisis(fake, ['자살', '죽고 싶어']), { level: 'high' });
  eq(S.crisis(fake, ['죽이고 싶어', '죽고 싶어']), { level: 'high', harm: true });
  eq(S.crisis(fake, ['환청', null]), null);
  eq(S.crisis(null, ['죽고 싶어']), null);
  const card = { high: { actions: [{ href: 'tel:109' }, { href: '#/a/crisis-hotlines' }, { href: '#/a/suicide-warning-signs' }] }, harm: { actions: [{ href: '#/a/emergency-response' }, { href: '#/a/crisis-hotlines' }] } };
  eq(S.cardSlugs(card, ['high', 'harm']), ['crisis-hotlines', 'suicide-warning-signs', 'emergency-response']);
});

/* ---------- 팔레트(가짜 DOM + 진짜 자료) ---------- */
function makeDom() {
  const doc = { activeElement: null, _ls: {} };
  function Node(tag) {
    this.tagName = String(tag).toUpperCase(); this.children = []; this.attrs = {}; this.parentNode = null; this._ls = {}; this._text = ''; this.value = ''; this.style = {};
    const self = this;
    this.classList = {
      add: function () { const c = self.className.split(' ').filter(Boolean); Array.prototype.forEach.call(arguments, function (x) { if (c.indexOf(x) < 0) c.push(x); }); self.className = c.join(' '); },
      remove: function () { const rm = Array.prototype.slice.call(arguments); self.className = self.className.split(' ').filter(function (x) { return x && rm.indexOf(x) < 0; }).join(' '); },
      contains: function (x) { return self.className.split(' ').indexOf(x) >= 0; }
    };
  }
  Node.prototype = {
    get className() { return this.attrs['class'] || ''; }, set className(v) { this.attrs['class'] = String(v); },
    get id() { return this.attrs.id || ''; }, set id(v) { this.attrs.id = String(v); },
    get hidden() { return 'hidden' in this.attrs; }, set hidden(v) { if (v) this.attrs.hidden = ''; else delete this.attrs.hidden; },
    get tabIndex() { return /^(A|BUTTON|INPUT)$/.test(this.tagName) ? 0 : -1; },
    get offsetParent() { let n = this; while (n) { if (n.hidden) return null; n = n.parentNode; } return {}; },
    get offsetWidth() { return 0; },
    get textContent() { return this.tagName === '#TEXT' ? this._text : this.children.map(function (c) { return c.textContent; }).join(''); },
    set textContent(v) { if (this.tagName === '#TEXT') { this._text = String(v); return; } this.innerHTML = ''; if (v !== '' && v != null) this.appendChild(doc.createTextNode(v)); },
    get innerHTML() { return this._html || ''; }, set innerHTML(v) { this.children.forEach(function (c) { c.parentNode = null; }); this.children = []; this._html = String(v || ''); },
    setAttribute: function (k, v) { this.attrs[k] = String(v); }, getAttribute: function (k) { return k in this.attrs ? this.attrs[k] : null; },
    removeAttribute: function (k) { delete this.attrs[k]; },
    appendChild: function (c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; },
    removeChild: function (c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; },
    replaceChild: function (n, o) { const i = this.children.indexOf(o); n.parentNode = this; this.children[i] = n; o.parentNode = null; return o; },
    contains: function (n) { while (n) { if (n === this) return true; n = n.parentNode; } return false; },
    matches: function (sel) { const m = /^([a-z]*)((?:\.[\w-]+)*)$/i.exec(sel.trim()); if (!m) return false; if (m[1] && m[1].toUpperCase() !== this.tagName) return false; const self = this; return (m[2] ? m[2].split('.').filter(Boolean) : []).every(function (c) { return self.classList.contains(c); }); },
    closest: function (sel) { let n = this; while (n && n.matches) { if (n.matches(sel)) return n; n = n.parentNode; } return null; },
    querySelectorAll: function (sel) { const out = [], parts = sel.split(','); (function walk(n) { n.children.forEach(function (c) { if (c.tagName !== '#TEXT' && parts.some(function (p) { return c.matches(p.replace(/\[.*\]$/, '')); })) out.push(c); walk(c); }); })(this); return out; },
    querySelector: function (sel) { return this.querySelectorAll(sel)[0] || null; },
    addEventListener: function (t, f) { (this._ls[t] = this._ls[t] || []).push(f); },
    focus: function () { doc.activeElement = this; }, scrollIntoView: function () { }, setSelectionRange: function () { }
  };
  doc.body = new Node('body'); doc.documentElement = new Node('html'); doc.documentElement.appendChild(doc.body); doc.activeElement = doc.body;
  doc.createElement = function (t) { return new Node(t); };
  doc.createElementNS = function (ns, t) { return new Node(t); };
  doc.createTextNode = function (t) { const n = new Node('#text'); n._text = String(t); return n; };
  doc.contains = function (n) { return doc.documentElement.contains(n); };
  doc.addEventListener = function (t, f, cap) { (doc._ls[t] = doc._ls[t] || []).push({ f: f, cap: !!cap }); };
  doc.fire = function (target, type, props) {
    const ev = Object.assign({ type: type, target: target, defaultPrevented: false, _stop: false, preventDefault: function () { this.defaultPrevented = true; }, stopPropagation: function () { this._stop = true; } }, props || {});
    (doc._ls[type] || []).filter(function (x) { return x.cap; }).forEach(function (x) { if (!ev._stop) x.f(ev); });
    let n = target;
    while (n && !ev._stop) { (n._ls[type] || []).forEach(function (f) { if (!ev._stop) f(ev); }); n = n.parentNode; }
    if (!ev._stop) (doc._ls[type] || []).filter(function (x) { return !x.cap; }).forEach(function (x) { if (!ev._stop) x.f(ev); });
    return ev;
  };
  doc.getElementById = function (id) { let hit = null; (function walk(n) { n.children.forEach(function (c) { if (!hit && c.attrs && c.attrs.id === id) hit = c; if (!hit) walk(c); }); })(doc.documentElement); return hit; };
  function el(spec, attrs, children) {
    const parts = spec.split('.'), node = new Node(parts[0] || 'div');
    if (parts.length > 1) node.className = parts.slice(1).join(' ');
    if (attrs) Object.keys(attrs).forEach(function (k) { const v = attrs[k]; if (v == null || v === false || k === 'html') return; if (k === 'class') node.className += (node.className ? ' ' : '') + v; else node.setAttribute(k, v === true ? '' : v); });
    (children || []).forEach(function (c) { if (c == null || c === false) return; node.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return node;
  }
  return { doc: doc, el: el };
}
const DATA = { toc: loadData('toc.js').toc.articles, gl: loadData('glossary.js').glossary, co: loadData('courses.js').courses, sy: loadData('synonyms.js').synonyms, sec: loadData('sections.js').sections, card: loadData('crisis-card.js').crisisCard };
function loadPalette(opts) {
  opts = opts || {};
  const D = makeDom(), doc = D.doc;
  const q = D.el('input', { id: 'q', type: 'search' }); doc.body.appendChild(q);
  const calls = [], ls = Object.assign({}, opts.ls || {}), cleared = [];
  const bySlug = {}; DATA.toc.forEach(function (a) { bySlug[a.slug] = a; });
  const secById = {}; DATA.sec.forEach(function (s) { secById[s.id] = s; });
  const app = {
    el: D.el, store: { get: function (k, f) { return k in ls ? ls[k] : f; }, set: function (k, v) { ls[k] = v; return true; }, remove: function (k) { delete ls[k]; } },
    articles: DATA.toc, bySlug: bySlug, secById: secById, sections: DATA.sec, glossary: DATA.gl, courses: DATA.co, pages: opts.pages || [],
    spine: function () { return D.el('span.spine'); }, effectiveTheme: function () { return 'light'; },
    go: function (h) { calls.push(['go', h]); }, goSearch: function (v) { calls.push(['search', v]); },
    privacy: { recentq: function () { return !!opts.recentq; }, paused: function () { return false; }, clear: function (ids) { cleared.push(ids); if (ids.indexOf('recentq') >= 0) delete ls['jhb.ui.palette.recentq']; return ids; } }
  };
  const timers = []; let now = 5000000;
  function tick(ms) { now += ms; timers.filter(function (t) { return !t.done && t.at <= now; }).forEach(function (t) { t.done = true; t.fn(); }); }
  const JHB = { app: app, crisis: C, crisisCard: DATA.card, synonyms: DATA.sy };
  if (opts.nowhelp) JHB.ui = { nowhelp: { open: function (from) { calls.push(['nowhelp', from && from.id]); return true; } } };
  const sb = { document: doc, JHB: JHB, matchMedia: function () { return { matches: true }; }, console: console, Date: { now: function () { return now; } },
    setTimeout: function (fn, ms) { timers.push({ fn: fn, at: now + (ms || 0), done: false }); return timers.length; }, clearTimeout: function (id) { if (id && timers[id - 1]) timers[id - 1].done = true; } };
  sb.window = sb;
  vm.runInNewContext(read('js/synonyms.js'), sb);
  vm.runInNewContext(read('js/search.js'), sb);
  vm.runInNewContext(read('js/ui/palette.js'), sb);
  const P = sb.JHB.ui.palette;
  function input() { return doc.body.querySelector('input.pal-input'); }
  function items() { return doc.body.querySelectorAll('div.pal-item'); }
  function selected() { return items().filter(function (n) { return n.getAttribute('aria-selected') === 'true'; })[0] || null; }
  return { sb: sb, ls: ls, cleared: cleared, doc: doc, P: P, q: q, calls: calls, tick: tick, input: input, items: items, selected: selected,
    type: function (v) { P.open(v); }, key: function (k, target, props) { return doc.fire(target || input(), 'keydown', Object.assign({ key: k }, props || {})); },
    texts: function () { return items().map(function (n) { return n.textContent; }); } };
}
function rowsOf(t) { return t.items().filter(function (n) { return n.classList.contains('pal-crisis'); })[0] || null; }

test('팔레트: 위기 줄 전화 버튼은 줄 제목이 말하는 번호 모두(high 109·1577-0199·119(L8), watch 109·1577-0199, harm 112·119)', function () {
  [['죽고 싶어', ['tel:109', 'tel:1577-0199', 'tel:119']], ['자살률', ['tel:109', 'tel:1577-0199']], ['죽이고 싶어', ['tel:112', 'tel:119']]].forEach(function (c) {
    const t = loadPalette(); t.type(c[0]);
    const row = rowsOf(t);
    ok(row, c[0] + ' 위기 줄');
    eq(row.querySelectorAll('a.pal-tel').map(function (a) { return a.getAttribute('href'); }), c[1], c[0]);
    ok(!t.selected().classList.contains('pal-crisis'), '위기 줄은 기본 선택 아님');
    /* 줄 안 전화 버튼은 목록 탐색에서 따로 드러나지 않으므로 줄 설명으로 안내 */
    eq(row.getAttribute('aria-describedby'), 'pal-telnote');
    has(t.doc.getElementById('pal-telnote').textContent, 'Tab');
  });
  has(rowsOf((function () { const t = loadPalette(); t.type('죽고 싶어'); return t; })()).textContent, '당장 위험하면 119');
});

test('팔레트: 돋보기 아이콘은 진짜 svg 요소(원·손잡이가 형제), 타해 줄은 경고색이 아닌 차분한 색', function () {
  const t = loadPalette();
  const ico = t.doc.body.querySelector('svg.pal-ico');
  ok(ico, 'svg');
  eq(ico.children.map(function (c) { return c.tagName; }), ['CIRCLE', 'PATH'], '손잡이가 원 안에 들어가지 않음');
  const css = read('css/ui/palette.css');
  not(css.replace(/\/\*[\s\S]*?\*\//g, ''), '--warn', '팔레트에 경고색 없음');
  not(read('css/pages/search.css').replace(/\/\*[\s\S]*?\*\//g, ''), '--warn', '찾기 화면 타해 카드도 경고색 없음');
  has(css, '.pal-item.pal-help { position: sticky;', '도움 줄은 결과가 길어도 보이게 붙여 둠');
});

test('팔레트: "찾으셨나요" 는 입력칸 설명과 알림(role=status)으로도 읽힌다', function () {
  const t = loadPalette(); t.type('환쳥');
  eq(t.input().getAttribute('aria-describedby'), 'pal-did');
  has(t.doc.getElementById('pal-did').textContent, '찾으셨나요');
  const live = t.doc.body.querySelectorAll('div.pal-sr').filter(function (n) { return n.getAttribute('role') === 'status'; })[0];
  ok(live && /‘환청’을 찾으셨나요/.test(live.textContent), live && live.textContent);
  t.P.open('환청');
  eq(t.input().getAttribute('aria-describedby'), null, '후보가 없으면 설명 없음');
});

test('팔레트: 첫 화면에서 "기록 가리기"를 켰으면 최근 본 문서를 보이지 않고 한 줄만', function () {
  let t = loadPalette({ ls: { 'jhb.recent': ['suicide-warning-signs', 'clozapine'] } }); t.type('');
  has(t.texts().join('|'), '자살 위험 신호');
  t = loadPalette({ ls: { 'jhb.recent': ['suicide-warning-signs', 'clozapine'], 'jhb.ui.home.recentHidden': true } }); t.type('');
  const all = t.texts().join('|');
  not(all, '자살 위험 신호'); not(all, '클로자핀');
  ok(!t.doc.body.querySelectorAll('div.pal-group').some(function (g) { return g.textContent === '최근 본 문서'; }), '최근 본 문서 묶음 없음');
  has(all, '최근 기록은 가려 두었어요');
  ok(!/pal-veil/.test(t.selected().className), '가린 줄은 기본 선택 아님');
});

test('팔레트: 최근 검색 묶음에 "이 기기에만 저장돼요" 와 지우기 — 누르면 그 자리에서 지우고 팔레트는 열린 채', function () {
  const t = loadPalette({ recentq: true, ls: { 'jhb.ui.palette.recentq': ['환청', '클로자핀'] } });
  t.type('');
  const clr = t.items().filter(function (n) { return n.classList.contains('pal-rq-clear'); })[0];
  ok(clr, '지우기 줄');
  has(clr.textContent, '이 기기에만 저장돼요');
  ok(t.selected() !== clr, '기본 선택 아님');
  t.doc.fire(clr, 'click');
  ok(!('jhb.ui.palette.recentq' in t.ls), '지움');
  eq(t.cleared, [['recentq']], '코어의 privacy.clear 로');
  ok(t.P.isOpen(), '팔레트는 열린 채');
  ok(!t.items().some(function (n) { return n.classList.contains('pal-rq-clear'); }), '다시 그림');
});

test('팔레트: 맨 아래 "지금 많이 힘들다면 · 지금 도움" 줄 — 위기 줄이 없을 때만, 기본 선택 아님, Enter 는 시트(전화 아님)', function () {
  let t = loadPalette({ nowhelp: true });
  t.type('환청');
  const all = t.items(), last = all[all.length - 1];
  ok(last.classList.contains('pal-help'), '맨 아래 도움 줄');
  has(last.textContent, '지금 많이 힘들다면 · 지금 도움');
  ok(!last.classList.contains('pal-crisis'), '위기 줄 모양이 아님');
  ok(t.selected() !== last, '기본 선택 아님');
  t.key('ArrowUp'); /* 맨 위에서 위로 → 맨 아래(도움 줄) */
  ok(t.selected() === last, '키보드로 닿음');
  t.key('Enter');
  ok(t.calls.length === 1 && t.calls[0][0] === 'nowhelp', JSON.stringify(t.calls));
  /* 시트가 없으면 위기 상담 전화 글로 */
  t = loadPalette(); t.type('블록체인');
  const l2 = t.items()[t.items().length - 1];
  ok(l2.classList.contains('pal-help'), '0건에도 도움 줄');
  t.doc.fire(l2, 'click');
  eq(t.calls, [['go', '#/a/crisis-hotlines']]);
  /* 위기 줄이 있으면 겹쳐 두지 않음, 입력 전에도 있음 */
  t = loadPalette(); t.type('죽고 싶어');
  ok(!t.items().some(function (n) { return n.classList.contains('pal-help'); }), '위기 줄과 겹치지 않음');
  t = loadPalette(); t.type('');
  ok(t.items().some(function (n) { return n.classList.contains('pal-help'); }), '입력 전에도');
});

test('팔레트: 태그·요약·일상 말에만 있는 글도 찾는다("약을 하루 빠뜨렸다"·"누가 나를 감시해"·"가족 대처")', function () {
  function first(v) { const t = loadPalette(); t.type(v); t.key('Enter'); return t.calls[0]; }
  eq(first('약을 하루 빠뜨렸다'), ['go', '#/a/missed-dose']);
  const t = loadPalette(); t.type('누가 나를 감시해');
  has(t.texts().slice(0, 4).join('|'), '피해망상');
  const f = first('가족 대처');
  eq(f[0], 'go'); eq(DATA.toc.filter(function (a) { return '#/a/' + a.slug === f[1]; })[0].section, '10', '가족 대처 → 10분류 글');
});

test('팔레트: 오타·초성은 "○○을 찾으셨나요?" 와 후보 글, 첫 후보가 기본 선택', function () {
  let t = loadPalette(); t.type('환쳥');
  ok(t.doc.body.querySelectorAll('div.pal-group').some(function (g) { return g.textContent === '‘환청’을 찾으셨나요?'; }), '찾으셨나요 줄');
  t.key('Enter');
  eq(t.calls, [['go', '#/a/auditory-hallucination']]);
  t = loadPalette(); t.type('ㅋㄹㅈㅍ'); t.key('Enter');
  eq(t.calls, [['go', '#/a/clozapine']]);
});

test('팔레트: 위기 감지는 고친 질의(초성 후보)에도 — "ㅈㅅ" 은 차분한 watch 줄, high 는 위기 카드 글이 맨 앞이고 관계 먼 글은 없음', function () {
  let t = loadPalette(); t.type('ㅈㅅ');
  const row = rowsOf(t);
  ok(row && row.classList.contains('pal-watch'), 'ㅈㅅ → watch 줄');
  t = loadPalette(); t.type('그만 살고 싶어');
  ok(rowsOf(t) && !rowsOf(t).classList.contains('pal-watch'), 'high 줄');
  const docRows = t.items().filter(function (n) { return !/pal-crisis|pal-all|pal-help/.test(n.className); }).map(function (n) { return n.textContent; });
  const titles = S.cardSlugs(DATA.card, ['high']).map(function (s) { return DATA.toc.filter(function (a) { return a.slug === s; })[0].title; });
  ok(docRows.length >= 2, '문서 줄 있음');
  ok(docRows.every(function (x) { return !/오픈 다이얼로그|대화법: LEAP|외상과 정신증/.test(x); }), '관계 먼 글 없음: ' + docRows.join(' / '));
  ok(titles.every(function (ti) { return docRows.some(function (x) { return x.indexOf(ti) === 0; }); }), '위기 카드 글이 모두 있음');
});

test('팔레트 최근 검색: 고친 질의에서만 위기로 감지된 말("자쌀" → 자살)도 저장하지 않는다', function () {
  const t = loadPalette({ recentq: true });
  ['환청', '자쌀', 'ㅈㅅ'].forEach(function (v) {
    t.type(v);
    const all = t.items().filter(function (n) { return n.classList.contains('pal-all'); })[0];
    t.doc.fire(all, 'click');
  });
  eq(t.ls['jhb.ui.palette.recentq'], ['환청']);
});

test('팔레트 #q: 한 음절을 조합하는 동안에는 오래 멈춰도 넘기지 않고, compositionend 뒤 멈추면 넘긴다', function () {
  const t = loadPalette(); t.q.focus();
  t.doc.fire(t.q, 'keydown', { key: 'Process', keyCode: 229 });
  t.doc.fire(t.q, 'compositionstart');
  t.q.value = 'ㅎ'; t.doc.fire(t.q, 'input', { isComposing: true });
  t.tick(3000);
  ok(!t.P.isOpen(), "'ㅎ' 조합 중 3초 멈춤에 열림(ㅎ완청 위험)");
  ok(t.doc.activeElement === t.q, '포커스는 #q 그대로');
  t.q.value = '환'; t.doc.fire(t.q, 'input', { isComposing: true });
  t.doc.fire(t.q, 'compositionend');
  t.tick(200);
  ok(!t.P.isOpen(), '조합이 끝나도 바로는 아님');
  t.doc.fire(t.q, 'compositionstart'); /* 다음 음절이 바로 이어지면 기다림 */
  t.q.value = '환ㅊ'; t.doc.fire(t.q, 'input', { isComposing: true });
  t.tick(2000);
  ok(!t.P.isOpen(), '다음 음절 조합 중');
  t.q.value = '환청'; t.doc.fire(t.q, 'input', { isComposing: true });
  t.doc.fire(t.q, 'compositionend');
  t.tick(600);
  ok(t.P.isOpen(), 'compositionend 뒤 멈추면 연다');
  eq(t.input().value, '환청'); eq(t.q.value, '');
});

test('팔레트 #q: 조합이 끝난 뒤 Enter 는 바로 넘겨 실행(Windows: keydown 229 → compositionend → keyup Enter, mac: keydown 13)', function () {
  let t = loadPalette(); t.q.focus();
  t.doc.fire(t.q, 'compositionstart'); t.q.value = '환청'; t.doc.fire(t.q, 'input', { isComposing: true });
  t.doc.fire(t.q, 'keydown', { key: 'Process', keyCode: 229, isComposing: true });
  ok(!t.P.isOpen(), '조합 중 Enter 키다운으로는 열지 않음');
  t.doc.fire(t.q, 'compositionend');
  t.doc.fire(t.q, 'keyup', { key: 'Enter', keyCode: 13 });
  eq(t.calls, [['go', '#/a/auditory-hallucination']], 'Windows');
  ok(!t.P.isOpen(), '실행하고 닫힘');
  t = loadPalette(); t.q.focus();
  t.doc.fire(t.q, 'compositionstart'); t.q.value = '죽고 싶어'; t.doc.fire(t.q, 'input', { isComposing: true });
  t.doc.fire(t.q, 'keydown', { key: 'Enter', keyCode: 229, isComposing: true });
  t.doc.fire(t.q, 'compositionend');
  t.doc.fire(t.q, 'keydown', { key: 'Enter', keyCode: 13 });
  t.doc.fire(t.q, 'keyup', { key: 'Enter', keyCode: 13 });
  eq(t.calls, [['search', '죽고 싶어']], 'mac: 한 번만, 위기 말은 전화가 아니라 찾기 화면');
  /* 빈 #q 의 Enter 는 열기만 */
  t = loadPalette(); t.q.focus(); t.key('Enter', t.q);
  ok(t.P.isOpen() && !t.calls.length, '빈 칸 Enter 는 열기만');
});

test("팔레트 #q: 비어 있을 때 '/' 는 글자로 들어가지 않고 팔레트만 연다(값이 있으면 글자로)", function () {
  let t = loadPalette(); t.q.focus();
  const ev = t.key('/', t.q);
  ok(ev.defaultPrevented, "'/' 기본 동작 막음");
  ok(t.P.isOpen(), '열림'); eq(t.input().value, '');
  t = loadPalette(); t.q.focus(); t.q.value = 'a';
  const ev2 = t.key('/', t.q);
  ok(!ev2.defaultPrevented && !t.P.isOpen(), '값이 있으면 글자');
});

/* ---------- M8: 특집 화면을 이름으로 찾기 ---------- */
const PAGES = fs.readdirSync(path.join(ROOT, 'data', 'pages')).filter(function (f) { return /\.json$/.test(f); }).map(function (f) { return JSON.parse(read('data/pages/' + f)); });
const QP = S.prepare({ articles: DATA.toc, glossary: DATA.gl, courses: DATA.co, synonyms: DATA.sy, sections: DATA.sec, syn: SYN });
test('M8 화면 찾기(순수 함수): 이름과 같으면 3, 여러 낱말 찾기 말·이름 앞부분 2, 글 제목에 쓰이지 않는 한 낱말 찾기 말 1, 흔한 낱말은 0', function () {
  function top(q) { const r = S.screens(QP, PAGES, q); return r.length ? r[0].page.id + ':' + r[0].strength : ''; }
  eq(top('길잡이'), 'guide:3'); eq(top('상황별 길잡이'), 'guide:3'); eq(top('바로 연락할 신호'), 'red-flags:3'); eq(top('내 서재'), 'me:3');
  eq(top('약 비교'), 'meds:2'); eq(top('재발 예방 계획'), 'plan:2'); eq(top('응급 신호'), 'red-flags:2'); eq(top('위험 신호'), 'red-flags:2');
  eq(top('119'), 'red-flags:1');
  ['부작용', '입원', '체중', '환청', '약', '기록'].forEach(function (q) { eq(top(q), '', q + ' 는 화면을 올리지 않음'); });
  /* 검수 뒤: 한 낱말 찾기 말은 119 같은 번호만 올린다(증상·부작용·일반 낱말은 원래 '동작' 묶음 자리 그대로) */
  ['좌불안석', '졸림', '경련', '변비', '생활비', '약어', '지도', '역할', '수정', '분류', '인쇄'].forEach(function (q) { eq(top(q), '', q + ' 는 한 낱말 찾기 말이라 올리지 않음'); });
  /* "이 화면을 찾으셨나요"(exact)는 화면 이름과 같을 때만. 여러 낱말 찾기 말(기립성 저혈압·약 거부·물 중독)은 아님 */
  function exact(q) { return S.screens(QP, PAGES, q).filter(function (x) { return x.exact; }).map(function (x) { return x.page.id; }).join(','); }
  eq([exact('길잡이'), exact('바로 연락할 신호'), exact('내 서재')], ['guide', 'red-flags', 'me']);
  ['기립성 저혈압', '물 중독', '악성 증후군', '약 거부', '치료 거부', '처음 진단', '최근 검색', '저장한 글', '응급 신호'].forEach(function (q) { eq(exact(q), '', q + ' 는 이름이 아님'); });
  /* 찾기 말로만 맞은 화면(kw)은 첫 글 뒤에(Enter 기본 선택이 글이 되게) */
  eq(S.screenSlot([{ score: 459 }, { score: 300 }], 2, true), 1, '찾기 말로 맞으면 첫 글 뒤');
  eq(S.screenSlot([{ why: 'crisis', score: 2000 }, { score: 459 }], 2, true), 2, '위기 글 다음 첫 글 뒤');
  eq(S.screenSlot([], 2, true), 0, '글이 없으면 맨 앞');
  eq(S.screenSlot([{ score: 131, why: 'partial' }, { score: 128 }], 2, true), 0, '첫 글이 일부 낱말만 맞은 글이면 화면 줄이 앞(약 한눈에)');
  eq(S.screens(QP, [{ id: 'x', title: '숨은 화면', nav: ['side'] }], '숨은 화면'), [], '팔레트에 등록되지 않은 화면은 아님');
  /* 자리: 위기 글 뒤, 3 → 제목이 똑같은 글 뒤 · 2 → 제목에 그 말이 낱말 시작으로 있는 글(800 이상) 두 편까지 뒤 · 1 → 글 두 편 뒤 */
  const top4 = [{ why: 'crisis', score: 2000 }, { score: 906 }, { score: 459 }, { score: 300 }];
  eq([S.screenSlot(top4, 3), S.screenSlot(top4, 2), S.screenSlot(top4, 1), S.screenSlot([], 1)], [1, 2, 3, 0]);
});

test('M8 팔레트 화면 찾기: 화면 이름·찾기 말로 찾으면 화면 줄이 위 5개 안(위기 줄·위기 글 다음), 흔한 낱말은 지금 순위 그대로', function () {
  const bad = [];
  function rows(q) { const t = loadPalette({ pages: PAGES }); t.type(q); return t.items(); }
  function screenAt(items) { for (let i = 0; i < items.length; i++) if (items[i].classList.contains('pal-screen')) return i; return -1; }
  ['길잡이', '상황별 길잡이', '약 한눈에', '약 비교', '종이 양식', '안전 계획', '재발 예방 계획', '질문 바구니', '내 서재', '기록 지우기',
    '바로 연락할 신호', '응급 신호', '위험 신호', '고침 기록', '둘러보기', '119'].forEach(function (q) {
    const it = rows(q), at = screenAt(it);
    /* 위기 줄·위기 줄 아래 "본문까지 찾기"·위기 카드 글은 앞에 와도 된다 */
    const lead = it.slice(0, Math.max(at, 0)).filter(function (n) { return /pal-crisis|pal-all-top/.test(n.className); }).length;
    if (at < 0 || at - lead > 4) bad.push(q + ' → ' + at + '번째');
  });
  eq(bad, []);
  /* 재발 예방 계획: 글이 1위, 화면 줄은 그 뒤 위 5개 안 */
  let it = rows('재발 예방 계획');
  has(it[0].textContent, '재발 예방 계획 쓰기');
  /* 119: 위기 상담 전화·응급 상황 대처 글이 앞이고 화면 줄은 그다음 */
  it = rows('119');
  const at = screenAt(it), before = it.slice(0, at).map(function (n) { return n.textContent; }).join('|');
  ok(/위기 상담 전화/.test(before) && /응급 상황 대처/.test(before), '119 앞 줄: ' + before);
  /* 화면 이름이 똑같으면 Enter 한 번에 그 화면으로 */
  const t = loadPalette({ pages: PAGES }); t.type('바로 연락할 신호'); t.key('Enter');
  eq(t.calls, [['go', '#/red-flags']]);
  /* 여러 낱말 찾기 말(약 거부·치료 거부·물 중독)로 맞은 화면 줄은 첫 글 뒤: 첫 줄(Enter 기본 선택)은 글 */
  ['약 거부', '치료 거부', '물 중독'].forEach(function (q) {
    const items = rows(q), at2 = screenAt(items);
    ok(at2 > 0 && !items[0].classList.contains('pal-screen'), q + ' 첫 줄은 글(화면 줄 ' + at2 + '번째)');
    ok(at2 <= 4, q + ' 화면 줄은 위 5개 안');
  });
  /* 한 낱말 찾기 말(좌불안석·경련)은 화면 줄을 문서 사이에 올리지 않는다 */
  ['좌불안석', '경련'].forEach(function (q) { ok(screenAt(rows(q)) < 0, q + ' 화면 줄을 올리지 않음'); });
  /* 흔한 낱말: 화면 줄이 글을 밀어내지 않음(문서 줄 순서가 빠른 찾기 순서 그대로, 화면 줄은 아래 동작 묶음에만) */
  ['부작용', '입원', '체중'].forEach(function (q) {
    const items = rows(q), docs = items.filter(function (n) { return n.querySelector('span.spine'); }).map(function (n) { return n.textContent; });
    ok(screenAt(items) < 0, q + ' 화면 줄을 올리지 않음');
    const want = S.plan(QP, q, { detect: C.detect, card: DATA.card }).top.slice(0, docs.length).map(function (x) { return x.a.title; });
    eq(docs.map(function (s, i) { return s.indexOf(want[i]) === 0; }).every(Boolean), true, q + ' 문서 순서');
  });
});

test('팔레트 소스: 일상 말 사전을 글자마다 새로 만들지 않는다(빠른 찾기 준비물은 한 번)', function () {
  const src = read('js/ui/palette.js');
  not(src, 'JHB.syn.build(', '팔레트가 사전을 직접 만들지 않음');
  has(src, 'quickFor');
  const t = loadPalette();
  let n = 0;
  const b = t.sb.JHB.syn.build;
  t.sb.JHB.syn.build = function (x) { n++; return b(x); };
  ['환', '환청', '환청 증상', '클로자핀', '조현벙', 'ㅎㅊ'].forEach(function (v) { t.type(v); });
  eq(n, 1, '사전 만들기 횟수');
  ok(t.items().length > 0);
});

/* ---------- 찾기 화면(js/pages/search.js, 가짜 DOM + 진짜 자료) ---------- */
/* 동기 실행기라 Promise 대신 손으로 푸는 thenable 을 쓴다(느린 글 받기·본문 색인 실패를 흉내) */
function defer() {
  let state = null, val;
  const oks = [], errs = [];
  const p = { then: function (f) { if (state === 'ok') f(val); else if (!state) oks.push(f); return { catch: function (g) { if (state === 'err') g(val); else if (!state) errs.push(g); } }; } };
  return { promise: p, resolve: function (v) { if (state) return; state = 'ok'; val = v; oks.forEach(function (f) { f(v); }); }, reject: function (e) { if (state) return; state = 'err'; val = e; errs.forEach(function (g) { g(e); }); } };
}
function loadSearchPage(opts) {
  opts = opts || {};
  const D = makeDom(), doc = D.doc;
  const bySlug = {}; DATA.toc.forEach(function (a) { bySlug[a.slug] = a; });
  const loads = [], searches = [], events = [], wls = {};
  const hist = { state: opts.state || null, replaceState: function (st) { this.state = JSON.parse(JSON.stringify(st)); } };
  const ss = Object.assign({}, opts.ss || {});
  const app = {
    el: D.el, articles: DATA.toc, bySlug: bySlug, sections: DATA.sec, pageById: {},
    row: function (a) { return D.el('li.row', { 'data-slug': a.slug }, [a.title]); },
    announce: function () { }, esc: function (s) { return String(s); }, md: { render: function (t) { return { html: t }; } }, pages: opts.pages || [],
    notice: function (k) { return D.el('div.notice.notice-' + k, null, ['자살예방상담 109, 정신건강위기상담 1577-0199 … 당장 위험하면 119']); },
    loadArticle: function (slug) { const d = defer(); loads.push({ slug: slug, d: d }); return d.promise; },
    search: function () { const d = defer(); searches.push(d); if (opts.searchFails) d.reject(new Error('offline')); return d.promise; },
    privacy: { paused: function () { return !!opts.paused; } }
  };
  const timers = []; let now = 1000;
  function tick(ms) { now += ms; timers.filter(function (t) { return !t.done && t.at <= now; }).forEach(function (t) { t.done = true; t.fn(); }); }
  const JHB = { app: app, crisis: C, crisisCard: DATA.card, synonyms: DATA.sy };
  const sb = {
    document: doc, JHB: JHB, console: console, history: hist, location: { pathname: '/search/' },
    sessionStorage: { getItem: function (k) { return k in ss ? ss[k] : null; }, setItem: function (k, v) { ss[k] = String(v); }, removeItem: function (k) { delete ss[k]; } },
    matchMedia: function () { return { matches: true }; }, Date: { now: function () { return now; } },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; this.preventDefault = function () { }; },
    addEventListener: function (t, f) { (wls[t] = wls[t] || []).push(f); }, removeEventListener: function () { },
    dispatchEvent: function (e) { events.push({ type: e.type, detail: e.detail }); (wls[e.type] || []).forEach(function (f) { f(e); }); return true; },
    setTimeout: function (fn, ms) { timers.push({ fn: fn, at: now + (ms || 0), done: false }); return timers.length; }, clearTimeout: function (id) { if (id && timers[id - 1]) timers[id - 1].done = true; }
  };
  sb.window = sb;
  vm.runInNewContext(read('js/synonyms.js'), sb);
  vm.runInNewContext(read('js/search.js'), sb);
  app.registerPage = function (pg) { sb.page = pg; };
  vm.runInNewContext(read('js/pages/search.js'), sb);
  const mount = D.el('div');
  sb.page.render(mount, { app: app, el: D.el, query: {}, onCleanup: function () { } });
  const input = mount.querySelector('input');
  function q(cls) { return mount.querySelector(cls); }
  return {
    sb: sb, mount: mount, input: input, hist: hist, loads: loads, searches: searches, events: events, tick: tick, q: q,
    type: function (v) { input.value = v; doc.fire(input, 'input'); tick(200); },
    answer: function () { return q('section.pg-search-answer'); },
    rows: function () { return mount.querySelectorAll('li.row').map(function (n) { return n.getAttribute('data-slug'); }); },
    lastSearch: function () { return events.filter(function (e) { return e.type === 'jhb:search'; }).pop(); }
  };
}
const PIDX = S.build(JSON.parse(read('data/search-index.json')));
const FAQ_BODY = '## 짧은 답\n\n혼자 갑자기 끊으면 다시 나빠질 수 있어요.[^1]\n\n## 조금 더 자세히\n\n본문';

test('찾기 화면 짧은 답: 글을 받는 동안 같은 1위 글로 다시 찾아도(글자 하나 더 침) 카드가 뜬다', function () {
  const t = loadSearchPage();
  t.type('약 끊어도 되나');
  eq(t.loads.map(function (x) { return x.slug; }), ['faq-stop-when-well'], '첫 받기');
  t.type('약 끊어도 되나요'); /* 받기가 끝나기 전 */
  eq(t.loads.length, 1, '같은 글을 다시 받지 않음');
  t.loads[0].d.resolve({ body: FAQ_BODY });
  const card = t.answer();
  ok(card, '카드가 뜸(전에는 버려진 응답 때문에 끝내 뜨지 않았음)');
  has(card.textContent, '결정은 담당 의사와 상의하세요.');
  has(card.textContent, '자세히 읽기');
  /* 위기 태그 글: 카드 안에 109·1577-0199·119, 각주를 뺐으니 출처 안내 */
  ok(card.querySelector('div.notice-crisis'), '위기 태그 글의 연락처 줄');
  has(card.textContent, '출처는 글에서');
  /* 다른 글로 바뀌었다가 같은 글로 돌아와도 카드는 하나 */
  t.type('유전되나요'); t.type('약 끊어도 되나요');
  t.loads.forEach(function (x) { x.d.resolve({ body: FAQ_BODY }); });
  eq(t.mount.querySelectorAll('section.pg-search-answer').length, 1);
});

test('찾기 화면 짧은 답: 글 받기가 실패하면 다음에 같은 말로 찾을 때 다시 받는다', function () {
  const t = loadSearchPage();
  t.type('약 끊어도 되나요');
  t.loads[0].d.reject(new Error('offline'));
  ok(!t.answer());
  t.type(''); t.type('약 끊어도 되나요');
  eq(t.loads.length, 2, '다시 받기');
  t.loads[1].d.resolve({ body: FAQ_BODY });
  ok(t.answer(), '카드');
});

test('찾기 화면: 위기·타해·정보성 위기 질의는 history.state·이벤트에 문장을 남기지 않고, 돌아오면 카드와 그 글만 다시', function () {
  let t = loadSearchPage();
  t.type('죽고 싶어');
  eq(t.hist.state.q, '', 'history.state 에 문장 없음');
  eq(t.hist.state.crisis, ['high']);
  ok(t.q('section.crisis-card'), '위기 카드');
  t.searches.forEach(function (d) { d.resolve(PIDX); }); /* 본문 색인이 와서 결과를 다 그린 뒤 이벤트 */
  eq(t.lastSearch().detail.query, '', 'jhb:search 에도 문장 없음');
  eq(t.lastSearch().detail.crisis, ['high']);
  eq(t.rows().slice(0, 2).every(function (s) { return S.cardSlugs(DATA.card, ['high']).indexOf(s) >= 0; }), true, '카드 아래 첫 결과는 카드의 글');
  eq(t.loads.length, 0, '위기 질의는 짧은 답을 받지 않음');
  t.type('자살률');
  eq(t.hist.state.q, '', '정보성 위기(watch)도');
  t.type('환청');
  t.searches.forEach(function (d) { d.resolve(PIDX); });
  eq(t.hist.state.q, '환청', '보통 말은 그대로(뒤로·새로 고침 복원)');
  eq(t.lastSearch().detail.query, '환청');
  eq(t.lastSearch().detail.crisis, null);
  /* 뒤로·새로 고침으로 돌아옴 */
  t = loadSearchPage({ state: { q: '', s: '', at: 5, crisis: ['high'] } });
  eq(t.input.value, '', '입력은 비어 있음');
  ok(t.q('section.crisis-card'), '카드는 다시');
  const front = S.cardSlugs(DATA.card, ['high']);
  eq(t.rows(), front, '카드의 글');
  has(t.q('p.status').textContent, '남겨 두지 않았어요');
  /* 팔레트에서 넘겨받은 위기 말도 state 에 남지 않음 */
  t = loadSearchPage({ ss: { 'jhb.q': JSON.stringify({ q: '죽이고 싶어', s: '' }) } });
  eq(t.hist.state.q, ''); eq(t.hist.state.crisis, ['harm']);
});

test('찾기 화면: 기록 쉼 중에는 history.state 에 검색어를 남기지 않는다', function () {
  const t = loadSearchPage({ paused: true });
  t.type('환청');
  eq(t.hist.state.q, '');
  ok(t.rows().length > 0, '결과는 그대로');
});

test('찾기 화면: 안전망 줄은 위기·타해 카드가 없을 때 늘(watch 카드만 있을 때 포함), 위기 질의에는 짧은 답 없음', function () {
  const t = loadSearchPage();
  t.type('환청');
  ok(!t.q('p.pg-search-help').hidden, '보통 말');
  t.type('자살 유전되나요');
  ok(t.q('section.crisis-card'), 'watch 카드');
  ok(!t.q('p.pg-search-help').hidden, 'watch 카드만 있을 때도 안전망 줄');
  eq(t.loads.length, 0, '자살 유전되나요 → 다른 주제의 짧은 답을 받지 않음');
  t.type('죽고 싶어');
  ok(t.q('p.pg-search-help').hidden, '위기 카드가 있으면 겹쳐 두지 않음');
  t.type('');
  ok(t.q('p.pg-search-help').hidden, '빈 칸');
});

test('M8 찾기 화면: 정의 질문·기능어뿐인 질의는 짧은 답을 받지도 않고, 같은 것을 묻는 질문은 그 글의 카드', function () {
  const t = loadSearchPage();
  ['조현병이 뭐예요', '조현병 뭐예요', '되나요', '하니', '이거 뭐야', '약을 먹어야 하나요'].forEach(function (q) { t.type(q); });
  t.searches.forEach(function (d) { d.resolve(PIDX); });
  eq(t.loads.map(function (x) { return x.slug; }).filter(function (s) { return s !== 'faq-lifelong-medication'; }), [], '엉뚱한 FAQ 글(faq-dangerous·faq-cure·faq-alcohol·faq-voices-persist)을 받지 않음');
  t.type('조현병이 뭐예요');
  t.searches.forEach(function (d) { d.resolve(PIDX); });
  eq(t.rows()[0], 'what-is-schizophrenia');
  ok(!t.answer(), '카드 없음');
  t.type('술 마셔도 되나요');
  eq(t.loads[t.loads.length - 1].slug, 'faq-alcohol');
});

test('M8 찾기 화면: 화면 이름과 똑같은 질의에는 "이 화면을 찾으셨나요" 한 줄(위기 카드 아래), 흔한 낱말·위기 말에는 없음', function () {
  const t = loadSearchPage({ pages: PAGES });
  t.type('바로 연락할 신호');
  const line = t.q('p.pg-search-screen');
  ok(!line.hidden, '한 줄이 보임');
  has(line.textContent, '이 화면을 찾으셨나요: 바로 연락할 신호');
  eq(line.querySelector('a').getAttribute('href'), '#/red-flags');
  const kids = t.mount.children;
  ok(kids.indexOf(line) > kids.indexOf(t.q('div.pg-search-cards')), '위기 카드보다 아래 자리');
  t.type('종이 양식');
  has(t.q('p.pg-search-screen').textContent, '종이 양식');
  /* 검수 뒤: 찾기 말(keywords)로만 맞은 질의(재발 예방 계획·기립성 저혈압·약 거부·물 중독)에는 두지 않는다 */
  ['부작용', '입원', '119', '환청', '', '재발 예방 계획', '기립성 저혈압', '약 거부', '물 중독', '저장한 글'].forEach(function (q) { t.type(q); ok(t.q('p.pg-search-screen').hidden, q + ' 에는 없음'); });
});

test('찾기 화면: 본문 색인을 못 받으면 빠른 결과와 오프라인 안내, 고친 말로 찾으면 상태 줄에 알림', function () {
  let t = loadSearchPage({ searchFails: true });
  t.type('환청');
  has(t.q('div.pg-search-hint').textContent, '본문 검색은 인터넷이 필요해요');
  eq(t.rows()[0], 'auditory-hallucination');
  t = loadSearchPage();
  t.type('환쳥');
  has(t.q('p.status').textContent, '고친 말로 찾은 결과예요.');
  has(t.q('p.pg-search-did').textContent, '찾으셨나요?');
  t.type('?');
  eq(t.rows(), [], '문장 부호만');
  ok(!t.answer());
});
