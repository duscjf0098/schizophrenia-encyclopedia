/* 진료 질문 바구니(ask) 테스트
   - 선언(data/pages/ask.json)
   - 저장 함수(js/ui/ask.js 의 순수 함수): 더하기·빼기·순서·묶음 순서·중복 막기·세션↔기기 전환·전부 지우기·깨진 값 거르기
   - 금지: 소스에 fetch(·XMLHttpRequest·speechSynthesis·location.search·주소 바꾸기·위기어 분석이 없음
   - 글 데이터: '## 담당 의사에게 물어볼 것' 바로 다음이 목록(화면 모듈이 기대는 모양), 첫 진료 준비 문장은 바탕 글에 그대로 있음 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const A = require('../tools/lib/assets.cjs');
const md = require('../js/md.js');
const core = require('../js/ui/ask.js');
const page = require('../js/pages/ask.js');

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
/* 글 slug → { meta, body } (content/<분류 폴더>/<slug>.md) */
const ART = {};
fs.readdirSync(path.join(ROOT, 'content'), { withFileTypes: true }).forEach(function (d) {
  if (!d.isDirectory()) return;
  fs.readdirSync(path.join(ROOT, 'content', d.name)).forEach(function (f) {
    if (!/\.md$/.test(f)) return;
    ART[f.replace(/\.md$/, '')] = path.join(ROOT, 'content', d.name, f);
  });
});
function article(slug) { ok(ART[slug], '글이 없어요: ' + slug); return md.parse(A.stripBom(fs.readFileSync(ART[slug], 'utf8'))); }
/* JSON 단위로 읽고 쓰는 가짜 저장소(앱의 store 와 같은 모양: get(key) 없으면 null, set → true, remove) */
function mem() {
  const m = {};
  return { m: m, get: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? JSON.parse(m[k]) : null; }, set: function (k, v) { m[k] = JSON.stringify(v); return true; }, remove: function (k) { delete m[k]; } };
}
function env() { return { local: mem(), session: mem() }; }
function keysOf(e) { return Object.keys(e.local.m).concat(Object.keys(e.session.m)).sort(); }
function q(slug, text, title) { return core.makeItem({ slug: slug, title: title || slug, text: text }); }
function texts(list) { return list.map(function (x) { return x.text; }); }

/* ---------- 선언 ---------- */
test('ask 선언: 규칙 통과, noindex, 도구 묶음, side·palette, 일반·기기 고지, 위기 줄', function () {
  const d = JSON.parse(A.stripBom(read('data/pages/ask.json')));
  eq(A.validateDecl(d, 'ask', { root: ROOT }).errors, []);
  eq(A.validateDecl(d, 'ask', { root: ROOT }).warnings, []);
  eq(d.robots, 'noindex'); eq(d.group, '도구'); eq(d.nav, ['side', 'palette']);
  eq(d.notice, ['general', 'device']); ok(d.crisisLine !== false, '위기 줄');
  eq(d.title, '진료 질문 바구니');
  const n = A.normalizeDecl(d, { root: ROOT });
  ok(n.hasJs && n.hasCss, 'js/pages/ask.js·css/pages/ask.css 있음');
});

/* ---------- 저장 키 ---------- */
test('저장 키는 plan-final 이름표 그대로(jhb.ui.ask.session·keep·items)', function () {
  eq(core.KEYS, { session: 'jhb.ui.ask.session', keep: 'jhb.ui.ask.keep', items: 'jhb.ui.ask.items' });
  const src = read('js/ui/ask.js');
  has(src, "id: 'ask'"); has(src, "label: '진료 질문 바구니'");
  has(src, 'keys: [KEYS.keep, KEYS.items], session: [KEYS.session]', 'privacy.register 로 세 키를 등록');
});

/* ---------- 질문 한 줄 ---------- */
test('makeItem: 글자는 공백만 정리하고 그대로 둔다(지시형으로 바꾸지 않음), 빈 값·잘못된 slug 는 거절', function () {
  const a = q('clozapine', '  혈액검사는 어디서,\n 얼마나 자주 하게 되나요?  ');
  eq(a.text, '혈액검사는 어디서, 얼마나 자주 하게 되나요?');
  eq(a.slug, 'clozapine');
  ok(/^[a-z0-9-]+$/.test(a.id), 'id 는 소문자·숫자·- 만: ' + a.id);
  eq(core.makeItem({ slug: 'clozapine', text: '   ' }), null);
  eq(core.makeItem({ slug: '../x', text: '질문' }), null);
  eq(core.makeItem({ slug: 'Clozapine', text: '질문' }), null);
  const mine = core.makeItem({ text: '다음 진료는 언제인가요?' });
  eq(mine.slug, null); ok(mine.id.indexOf('m-') === 0, '내 질문 id: ' + mine.id);
  eq(core.makeItem({ text: 'ㄱ'.repeat(core.MAX_LEN + 1) }), null, '너무 긴 글은 거절');
  ok(core.makeItem({ text: 'ㄱ'.repeat(core.MAX_LEN) }), '최대 길이까지는 받음');
  /* 같은 글·같은 문장이면 같은 id, 글이 다르면 다른 id */
  eq(q('clozapine', '같은 질문').id, q('clozapine', '같은  질문').id);
  ok(q('clozapine', '같은 질문').id !== q('olanzapine', '같은 질문').id);
});

/* ---------- 더하기·중복·한도 ---------- */
test('add: 담기·중복 막기·한도, 같은 글의 질문은 그 묶음 끝에 붙는다', function () {
  let r = core.add([], q('clozapine', 'A1'));
  ok(r.added); eq(r.list.length, 1);
  const before = r.list;
  r = core.add(r.list, q('metabolic-side-effects', 'B1'));
  ok(r.added); eq(texts(r.list), ['A1', 'B1']);
  eq(before.length, 1, '원래 배열은 바꾸지 않음(순수 함수)');
  r = core.add(r.list, q('clozapine', 'A2'));
  eq(texts(r.list), ['A1', 'A2', 'B1'], '같은 글 묶음 끝에');
  const dup = core.add(r.list, q('clozapine', ' A2 '));
  ok(!dup.added); eq(dup.reason, 'dup'); eq(dup.list.length, 3);
  ok(core.add(r.list, q('olanzapine', 'A2')).added, '다른 글의 같은 문장은 따로 담김');
  ok(!core.add(r.list, null).added, '빈 항목');
  eq(core.add(r.list, null).reason, 'bad');
  let big = [];
  for (let i = 0; i < core.MAX_ITEMS; i++) big = core.add(big, q('clozapine', '질문 ' + i)).list;
  eq(big.length, core.MAX_ITEMS);
  const full = core.add(big, q('clozapine', '하나 더'));
  ok(!full.added); eq(full.reason, 'full');
});

test('has·remove: 글과 문장으로 찾고, id 로 뺀다', function () {
  const list = core.add(core.add([], q('clozapine', 'A1')).list, q('clozapine', 'A2')).list;
  ok(core.has(list, q('clozapine', 'A1')));
  ok(!core.has(list, q('olanzapine', 'A1')));
  const out = core.remove(list, list[0].id);
  eq(texts(out), ['A2']); eq(list.length, 2, '원래 배열 그대로');
  eq(core.remove(list, 'no-such-id').length, 2);
});

/* ---------- 순서 ---------- */
test('moveItem: 같은 묶음 안에서만 위·아래로, 끝에서는 움직이지 않음', function () {
  let list = [];
  ['A1', 'A2', 'A3'].forEach(function (t) { list = core.add(list, q('clozapine', t)).list; });
  list = core.add(list, q('metabolic-side-effects', 'B1')).list;
  let r = core.moveItem(list, list[2].id, -1);
  ok(r.moved); eq(texts(r.list), ['A1', 'A3', 'A2', 'B1']);
  r = core.moveItem(r.list, r.list[0].id, -1);
  ok(!r.moved, '맨 위에서 위로'); eq(texts(r.list), ['A1', 'A3', 'A2', 'B1']);
  r = core.moveItem(r.list, r.list[2].id, 1);
  ok(!r.moved, '묶음 끝에서 아래로(다른 묶음으로 넘어가지 않음)');
  r = core.moveItem(r.list, r.list[3].id, -1);
  ok(!r.moved, 'B 묶음의 첫 질문은 A 묶음으로 올라가지 않음');
  eq(core.moveItem(list, 'none', 1).moved, false);
});

test('groups·moveGroup: 묶음은 처음 담은 순서, 묶음째 위·아래로', function () {
  let list = [];
  list = core.add(list, q('clozapine', 'A1', '클로자핀')).list;
  list = core.add(list, core.makeItem({ text: '내 질문 1' })).list;
  list = core.add(list, q('metabolic-side-effects', 'B1', '대사 부작용')).list;
  list = core.add(list, q('clozapine', 'A2', '클로자핀')).list;
  const g = core.groups(list);
  eq(g.map(function (x) { return x.key; }), ['a:clozapine', 'mine', 'a:metabolic-side-effects']);
  eq(g[0].title, '클로자핀'); eq(g[0].items.length, 2); eq(g[1].slug, null);
  let r = core.moveGroup(list, 'a:metabolic-side-effects', -1);
  ok(r.moved); eq(texts(r.list), ['A1', 'A2', 'B1', '내 질문 1']);
  r = core.moveGroup(r.list, 'a:clozapine', -1);
  ok(!r.moved, '맨 위 묶음은 위로 못 감');
  r = core.moveGroup(r.list, 'mine', 1);
  ok(!r.moved, '맨 아래 묶음은 아래로 못 감');
  eq(core.groupKey(q('clozapine', 'x')), 'a:clozapine');
});

test('tidy: 섞인 배열도 묶음끼리 붙여 놓는다(처음 나온 순서)', function () {
  const a1 = q('clozapine', 'A1'), b1 = q('olanzapine', 'B1'), a2 = q('clozapine', 'A2');
  eq(texts(core.tidy([a1, b1, a2])), ['A1', 'A2', 'B1']);
});

/* ---------- 깨진 저장 값 ---------- */
test('sanitize: 배열이 아니거나 모양이 틀린 값·중복·한도 초과를 거른다', function () {
  eq(core.sanitize(null), []); eq(core.sanitize('x'), []); eq(core.sanitize({ length: 3 }), []);
  const good = q('clozapine', '좋은 질문');
  const list = core.sanitize([
    good, good, { text: 5 }, { slug: 'x y', text: '글이 이상해요' }, null, 'str',
    { slug: 'clozapine', text: '', title: 't' },
    JSON.parse('{"__proto__": {"polluted": 1}, "text": "프로토"}'),
    { slug: null, text: '내 질문', id: '<b>bad</b>' },
    { slug: 'olanzapine', text: 'ㄱ'.repeat(core.MAX_LEN + 5) }
  ]);
  eq(texts(list), ['좋은 질문', '프로토', '내 질문']);
  ok(/^[a-z0-9-]+$/.test(list[2].id), '깨진 id 는 다시 만듦');
  ok(({}).polluted === undefined, '프로토타입 오염 없음');
  const many = [];
  for (let i = 0; i < core.MAX_ITEMS + 20; i++) many.push(q('clozapine', 'n' + i));
  eq(core.sanitize(many).length, core.MAX_ITEMS);
  ok(core.sanitize([{ slug: 'clozapine', title: 'ㄱ'.repeat(500), text: 'q' }])[0].title.length <= 200, '제목 길이 제한');
});

/* ---------- 저장: 세션 기본 ↔ 기기 ---------- */
test('기본은 sessionStorage(jhb.ui.ask.session) 하나만, 비면 키도 없다', function () {
  const e = env();
  let st = core.load(e);
  eq(st, { keep: false, items: [] });
  st.items = core.add(st.items, q('clozapine', 'A1')).list;
  ok(core.save(e, st));
  eq(keysOf(e), ['jhb.ui.ask.session']);
  eq(texts(core.load(e).items), ['A1']);
  st.items = [];
  core.save(e, st);
  eq(keysOf(e), [], '다 빼면 키도 지움');
});

test('setKeep: 켜면 localStorage(keep·items)로 옮기고 세션은 지움, 끄면 세션으로 되돌리고 기기에서 지움', function () {
  const e = env();
  let st = core.load(e);
  st.items = core.add(core.add([], q('clozapine', 'A1')).list, q('clozapine', 'A2')).list;
  core.save(e, st);
  st = core.setKeep(e, st, true);
  eq(st.keep, true);
  eq(keysOf(e), ['jhb.ui.ask.items', 'jhb.ui.ask.keep']);
  eq(e.local.get('jhb.ui.ask.keep'), true);
  eq(texts(core.load(e).items), ['A1', 'A2']);
  /* 새 탭(세션 비어 있음)에서도 남는다 */
  const tab2 = { local: e.local, session: mem() };
  eq(texts(core.load(tab2).items), ['A1', 'A2']);
  st = core.setKeep(e, core.load(e), false);
  eq(st.keep, false);
  eq(keysOf(e), ['jhb.ui.ask.session']);
  eq(texts(core.load(e).items), ['A1', 'A2'], '이 탭에는 남음');
  eq(core.load({ local: e.local, session: mem() }).items, [], '새 탭에서는 비어 있음');
  /* 켜 둔 채 다 빼도 keep 은 남고 items 키는 지운다 */
  st = core.setKeep(e, core.load(e), true);
  st.items = []; core.save(e, st);
  eq(keysOf(e), ['jhb.ui.ask.keep']);
});

/* 쓰기를 세는 저장소: 읽기만 하는 함수가 저장소를 고치지 않는지 본다 */
function counted(e) {
  const n = { w: 0 };
  function wrap(s) { return { m: s.m, get: s.get, set: function (k, v) { n.w++; return s.set(k, v); }, remove: function (k) { n.w++; return s.remove(k); } }; }
  return { env: { local: wrap(e.local), session: wrap(e.session) }, n: n };
}

test('load 는 읽기만 한다: 기기 저장 중이고 이 탭에 세션 질문이 있으면 화면에서는 합쳐 보이지만 저장소는 그대로', function () {
  const e = env();
  e.local.set('jhb.ui.ask.keep', true);
  e.local.set('jhb.ui.ask.items', [q('clozapine', 'A1')]);
  e.session.set('jhb.ui.ask.session', [q('clozapine', 'A1'), q('olanzapine', 'B1')]);
  const c = counted(e);
  const st = core.load(c.env);
  eq(st.keep, true); eq(texts(st.items), ['A1', 'B1']);
  eq(c.n.w, 0, '읽기에서 쓰기 0');
  eq(keysOf(e), ['jhb.ui.ask.items', 'jhb.ui.ask.keep', 'jhb.ui.ask.session'], '다른 탭 이벤트만으로 세션 질문이 기기로 옮겨지지 않음');
  eq(texts(e.local.get('jhb.ui.ask.items')), ['A1']);
  /* 이 탭이 쓰기를 하면 그때 합쳐서 기기로 */
  ok(core.save(e, st));
  eq(keysOf(e), ['jhb.ui.ask.items', 'jhb.ui.ask.keep']);
  eq(texts(e.local.get('jhb.ui.ask.items')), ['A1', 'B1']);
  /* keep 이 true 가 아니면 남은 기기 값은 보이지 않고, 읽기만으로는 지우지도 않는다(쓸 때 지움) */
  const e2 = env();
  e2.local.set('jhb.ui.ask.items', [q('clozapine', 'A1')]);
  e2.local.set('jhb.ui.ask.keep', 'yes');
  const c2 = counted(e2);
  eq(core.load(c2.env), { keep: false, items: [] });
  eq(c2.n.w, 0);
  core.save(e2, { keep: false, items: [q('olanzapine', 'B1')] });
  eq(keysOf(e2), ['jhb.ui.ask.session'], '쓸 때 남은 기기 값을 지움');
});

test('기록 쉼(paused) + 기기 저장 켜짐: 새로 담은 질문은 기기에 쓰지 않고 이 탭(세션)에만, 빼기·순서는 기기에도', function () {
  const e = env();
  let st = core.setKeep(e, { keep: false, items: [q('clozapine', 'A1'), q('clozapine', 'A2')] }, true);
  eq(st.keep, true);
  const P = { paused: true };
  /* 쉼 중에 하나 더 담기 */
  st = core.load(e);
  st.items = core.add(st.items, q('metabolic-side-effects', 'B1')).list;
  ok(core.save(e, st, P));
  eq(texts(e.local.get('jhb.ui.ask.items')), ['A1', 'A2'], '기기에는 새 질문이 없음');
  eq(e.local.get('jhb.ui.ask.keep'), true);
  eq(texts(core.load(e).items), ['A1', 'A2', 'B1'], '이 탭 화면에는 셋 다');
  eq(core.load({ local: e.local, session: mem() }).items.length, 2, '새 탭(기기 값만)에는 쉼 전에 저장한 둘만');
  /* 내 질문도 마찬가지 */
  st = core.load(e);
  st.items = core.add(st.items, core.makeItem({ text: '쉼 중 내 질문' })).list;
  ok(core.save(e, st, P));
  not(JSON.stringify(e.local.get('jhb.ui.ask.items')), '쉼 중 내 질문');
  /* 순서 바꾸기는 이 탭 화면에서 그대로 보이고, 기기 쪽도 같은 순서로 */
  st = core.load(e);
  let r = core.moveItem(st.items, st.items[1].id, -1);
  ok(r.moved);
  ok(core.save(e, { keep: true, items: r.list }, P));
  eq(texts(core.load(e).items), ['A2', 'A1', 'B1', '쉼 중 내 질문']);
  eq(texts(e.local.get('jhb.ui.ask.items')), ['A2', 'A1']);
  /* 빼기는 기기에서도 빠짐 */
  st = core.load(e);
  ok(core.save(e, { keep: true, items: core.remove(st.items, st.items[0].id) }, P));
  eq(texts(e.local.get('jhb.ui.ask.items')), ['A1']);
  eq(texts(core.load(e).items), ['A1', 'B1', '쉼 중 내 질문']);
  /* 기기에 있던 것을 모두 빼도 keep 은 그대로(쉼 중에 기기 설정을 바꾸지 않음), 세션에만 남은 것은 그대로 */
  st = core.load(e);
  ok(core.save(e, { keep: true, items: st.items.filter(function (x) { return x.text !== 'A1'; }) }, P));
  eq(e.local.get('jhb.ui.ask.items'), null); eq(e.local.get('jhb.ui.ask.keep'), true);
  eq(texts(core.load(e).items), ['B1', '쉼 중 내 질문']);
  /* 쉼 중에는 기기 쪽에 새 키를 쓰지 않음: keep 을 다시 쓰지도 않는다 */
  const c = counted(e);
  core.save(c.env, { keep: true, items: core.add(core.load(e).items, q('olanzapine', 'C1')).list }, P);
  eq(e.local.get('jhb.ui.ask.items'), null, '기기 items 는 여전히 없음');
  /* 쉼 중에 끄면 이 탭에 다 옮기고 기기에서 지움 */
  st = core.setKeep(e, core.load(e), false);
  eq(st.keep, false); eq(keysOf(e), ['jhb.ui.ask.session']);
  eq(texts(core.load(e).items), ['B1', '쉼 중 내 질문', 'C1']);
});

test('save 순서: 새 값을 쓴 뒤에 옛 키를 지운다(기기 쓰기에 실패하면 이 탭 값은 그대로)', function () {
  const e = env();
  e.session.set('jhb.ui.ask.session', [q('clozapine', 'A1')]);
  const full = { m: {}, get: function () { return null; }, set: function () { return false; }, remove: function () { } };
  const e1 = { local: full, session: e.session };
  eq(core.save(e1, { keep: true, items: [q('clozapine', 'A1'), q('clozapine', 'A2')] }), false);
  eq(texts(e.session.get('jhb.ui.ask.session')), ['A1'], '기기에 못 썼으면 세션 값을 지우지 않음');
  /* 세션에 못 쓰면 기기 값을 지우지 않음(끄기는 setKeep 이 따로 다룸) */
  const e2 = env();
  core.setKeep(e2, { keep: false, items: [q('clozapine', 'A1')] }, true);
  const deadSess = { m: {}, get: function () { return null; }, set: function () { return false; }, remove: function () { } };
  eq(core.save({ local: e2.local, session: deadSess }, { keep: false, items: [q('clozapine', 'A1')] }), false);
  eq(e2.local.get('jhb.ui.ask.keep'), true);
  /* 켜기에서 keep 쓰기만 실패하면 items 도 남기지 않음 */
  const e3 = env();
  const half = mem(); const orig = half.set;
  half.set = function (k, v) { return k === 'jhb.ui.ask.keep' ? false : orig(k, v); };
  const r3 = core.setKeep({ local: half, session: e3.session }, { keep: false, items: [q('clozapine', 'A1')] }, true);
  ok(r3.failed); eq(r3.keep, false); eq(Object.keys(half.m), [], '반쯤 쓴 기기 값 없음');
});

test('setKeep 끄기: 이 탭(세션)에 못 옮겨도 기기 값은 지운다(끄기가 먼저)', function () {
  const e = env();
  core.setKeep(e, { keep: false, items: [q('clozapine', 'A1')] }, true);
  const deadSess = { m: {}, get: function () { return null; }, set: function () { return false; }, remove: function () { } };
  const st = core.setKeep({ local: e.local, session: deadSess }, core.load(e), false);
  eq(st.keep, false); ok(st.failed); ok(st.lost);
  eq(Object.keys(e.local.m), [], '기기 키 0');
});

test('clearAll: 세 키를 모두 지운다(키 0), 저장에 실패하면 false', function () {
  const e = env();
  const st = core.setKeep(e, { keep: false, items: [q('clozapine', 'A1')] }, true);
  e.session.set('jhb.ui.ask.session', [q('x', 'y')]);
  eq(core.clearAll(e), { keep: false, items: [] });
  eq(keysOf(e), []);
  ok(st.keep);
  const broken = { local: mem(), session: { get: function () { return null; }, set: function () { return false; }, remove: function () { } } };
  eq(core.save(broken, { keep: false, items: [q('clozapine', 'A1')] }), false);
});

/* ---------- 금지 ---------- */
test('소스 금지: 바깥으로 보내기·음성·주소 바꾸기·입력 분석이 없다', function () {
  ['js/ui/ask.js', 'js/pages/ask.js'].forEach(function (f) {
    const src = read(f);
    ['fetch(', 'XMLHttpRequest', 'speechSynthesis', 'location.search', 'location.hash', 'pushState', 'replaceState', 'sendBeacon', 'WebSocket', 'navigator.share', 'JHB.crisis', 'innerHTML', 'eval('].forEach(function (bad) { not(src, bad, f); });
    ok(!/location\.href\s*=/.test(src), f + ': location.href 바꾸기');
    ok(!/\.(open)\(/.test(src.replace(/window\.print\(\)/g, '')), f + ': 새 창 열기');
  });
  const pg = read('js/pages/ask.js');
  ok(/autocomplete['"]?\s*[:,]\s*['"]off['"]/.test(pg), '내 질문 칸은 브라우저 자동완성 기록에 남기지 않음');
  ok(/spellcheck['"]?\s*[:,]\s*['"]false['"]/.test(pg), '맞춤법 검사 서비스로 보내지 않음');
});

/* ---------- 글 모양: 화면 모듈이 기대는 구조 ---------- */
test("모든 '## 담당 의사에게 물어볼 것' 소절에는 (같은 소절 안에) 목록이 있고, 항목은 최대 길이 안", function () {
  let n = 0, items = 0;
  Object.keys(ART).forEach(function (slug) {
    const doc = article(slug);
    if (!/^## 담당 의사에게 물어볼 것\s*$/m.test(doc.body)) return;
    n++;
    const html = md.render(doc.body).html;
    /* 화면 모듈처럼: 소절 제목(h2) 다음부터 다음 h2 앞까지에서 ul·ol 을 찾는다(머리 문단이 있어도 됨) */
    const h = /<h2 id="h-\d+">(담당 의사에게 물어볼 것)<\/h2>/.exec(html);
    ok(h && core.isAskHeading(h[1]), slug + ': 소절 제목');
    const rest = html.slice(h.index + h[0].length);
    const sec = rest.split(/<h2[\s>]/)[0];
    const m = /^\n?(?:<p>[\s\S]*?<\/p>\n)*<(ul|ol)>([\s\S]*?)<\/\1>/.exec(sec);
    ok(m, slug + ': 소절 안에 목록이 없거나 목록 앞에 문단이 아닌 것이 있어요');
    const lis = m[2].match(/<li>[\s\S]*?<\/li>/g) || [];
    ok(lis.length >= 1, slug + ': 항목 없음');
    lis.forEach(function (li) { const t = core.norm(li.replace(/<[^>]+>/g, '')); items++; ok(t.length > 0 && t.length <= core.MAX_LEN, slug + ': ' + t); });
  });
  ok(n >= 31, '질문 소절이 있는 글 ' + n + '편(31편 이상)');
  ok(items >= 100, '질문 ' + items + '개');
});

test('isAskHeading: 소절 제목만 알아본다', function () {
  ok(core.isAskHeading('담당 의사에게 물어볼 것'));
  ok(core.isAskHeading('  담당 의사에게 물어볼 것 '));
  ok(!core.isAskHeading('담당 의사에게 말할 것'));
  ok(!core.isAskHeading('더 읽을 글'));
});

test('확인용 글: clozapine 에 2개 이상, metabolic-side-effects 에 1개 이상의 질문', function () {
  ['clozapine', 'metabolic-side-effects'].forEach(function (slug) {
    const body = article(slug).body;
    const sec = body.split(/^## /m).filter(function (s) { return s.indexOf('담당 의사에게 물어볼 것') === 0; })[0];
    ok(sec, slug);
    ok((sec.match(/^- /gm) || []).length >= (slug === 'clozapine' ? 2 : 1), slug);
  });
});

/* ---------- 화면 코드 ---------- */
test('화면 코드: node 에서 읽히고 id·render·staticHtml 이 있다', function () {
  eq(page.id, 'ask'); eq(typeof page.render, 'function'); eq(typeof page.staticHtml, 'function');
});

test('첫 진료 준비: 문장은 diagnostic-process 의 "진단받는 날 준비할 것" 목록에 그대로 있고, 입력칸이 아니라 인쇄용 빈 줄 수만 있다', function () {
  ok(Array.isArray(page.PREP) && page.PREP.length >= 4, 'PREP');
  const body = article('diagnostic-process').body.replace(/\*\*/g, '');
  const sec = body.split(/^## /m).filter(function (s) { return s.indexOf('진단받는 날 준비할 것') === 0; })[0];
  ok(sec, '준비 목록 소절');
  page.PREP.forEach(function (p) {
    eq(p.from, 'diagnostic-process', '준비 목록은 diagnostic-process 에서만: ' + p.label);
    ok(typeof p.label === 'string' && p.label, 'label');
    has(sec, '- ' + p.label + '.', '준비 목록에 없는 이름');
    ok(Array.isArray(p.quote) && p.quote.length, '근거 문장 없음: ' + p.label);
    p.quote.forEach(function (s) { has(sec, s, '준비 목록에 없는 문장'); });
    if (p.note != null) has(sec, p.note, '준비 목록에 없는 덧붙임');
    ok(Number.isInteger(p.lines) && p.lines >= 1 && p.lines <= 4, '빈 줄 수');
    Object.keys(p).forEach(function (k) { ok(['from', 'label', 'lines', 'quote', 'note'].indexOf(k) >= 0, '모르는 필드 ' + k); });
  });
  /* 약과 물질에는 원문의 비밀 보장 안심 문장을 그대로 붙인다 */
  const drug = page.PREP.filter(function (p) { return p.label === '약과 물질'; })[0];
  ok(drug && drug.note === '기록과 비밀 보장이 걱정되면 진료 전에 물어봐도 돼요.', '약과 물질의 안심 문장');
  ok(Array.isArray(page.PREP_ASK) && page.PREP_ASK.length === 3, '질문 목록 세 문장');
  page.PREP_ASK.forEach(function (s) { has(sec, s, '질문 목록 문장'); });
});

test('인쇄 종이와 접근성 문구(소스 고정)', function () {
  const pg = read('js/pages/ask.js'), ui = read('js/ui/ask.js');
  has(pg, '이 종이에는 개인 정보가 적혀요. 보관에 주의하세요.', '종이에 보관 안내');
  has(pg, "'aria-label': '담은 질문 전부 지우기'", '맨 위 지우기 버튼 이름');
  has(pg, 'aria-disabled', '기록 쉼 중 스위치는 aria-disabled(포커스는 닿음)');
  not(pg, "sw.setAttribute('disabled'", '스위치에 disabled 속성 안 씀');
  ok(/prepBox\s*=\s*el\('input', \{[^}]*checked: true/.test(pg), '첫 진료 준비는 기본으로 종이에 들어감');
  not(ui, "'담음: '", '담기 버튼 이름은 상태와 무관하게 고정(상태는 aria-pressed)');
  has(ui, "'담기: ' + ", '담기 버튼 이름');
});

test('빈 화면의 추천 글은 실제로 질문 소절이 있는 글', function () {
  ok(Array.isArray(page.SUGGEST) && page.SUGGEST.length >= 2);
  page.SUGGEST.forEach(function (slug) { ok(/^## 담당 의사에게 물어볼 것\s*$/m.test(article(slug).body), slug); });
});

test('staticHtml: 자바스크립트가 필요하다는 안내, 입력 양식 없음, 글자는 esc 를 거침', function () {
  const seen = [];
  const esc = function (s) { seen.push(String(s)); return md.esc(s); };
  const bySlug = {};
  Object.keys(ART).forEach(function (s) { bySlug[s] = { slug: s, title: article(s).meta.title }; });
  const html = page.staticHtml({ data: {}, esc: esc, articles: bySlug, sections: [], page: { id: 'ask' } });
  has(html, '자바스크립트'); has(html, 'href="#/a/diagnostic-process"');
  not(html, '<form'); not(html, '<input'); not(html, '<textarea');
  ok(seen.length >= 5, 'esc 사용');
  page.SUGGEST.forEach(function (s) { has(html, 'href="#/a/' + s + '"'); });
});
