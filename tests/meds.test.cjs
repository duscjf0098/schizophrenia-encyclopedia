/* 항정신병약 한눈에(meds/) 테스트: 생성기(tools/gen/meds.cjs), 생성물(data/kb/meds.json), 화면(js/pages/meds.js), 선언 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const gen = require('../tools/gen/meds.cjs');
const page = require('../js/pages/meds.js');
const M = page.lib;
const md = require('../js/md.js');
const A = require('../tools/lib/assets.cjs');
const card = require('../tools/checks/drug-card.cjs');

function read(rel) { const t = fs.readFileSync(path.join(ROOT, rel), 'utf8'); return t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t; }
const DATA_TEXT = read('data/kb/meds.json');
const DATA = JSON.parse(DATA_TEXT);
const DECL = JSON.parse(read('data/pages/meds.json'));
/* 글 slug·제목은 content/ 의 실제 파일에서(data/toc.js 는 빌드 전이면 옛것일 수 있어요) */
const ARTS = {};
(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (/\.md$/.test(d.name)) ARTS[d.name.replace(/\.md$/, '')] = { title: md.parse(fs.readFileSync(p, 'utf8')).meta.title };
  });
})(path.join(ROOT, 'content'));
const DRUGS = ['amisulpride', 'aripiprazole', 'brexpiprazole', 'cariprazine', 'clozapine', 'haloperidol', 'lurasidone', 'olanzapine', 'paliperidone', 'quetiapine', 'risperidone', 'ziprasidone'];
const LEVEL_START = /^(적은 편|중간|많은 편|자료 부족)/;
/* 화면·자료 어디에도 없어야 하는 낱말(지시서 P5: dose·mg·price·rank·임신·추천·순위) */
const BANNED_KO = /임신|추천|순위/;
/* 숫자에 붙은 단위("100mg")도 잡아요 */
const BANNED_EN = /(?:^|[^A-Za-z])(dose|doses|dosage|mg|mcg|price|prices|rank|ranks|ranking)(?![A-Za-z])/i;
/* 출처 제목은 원문 그대로 옮겨요(바꾸면 인용이 틀려져요). 금지 낱말이 든 제목은 여기 하나씩 적어 둔 것만 허용하고,
   새로 생기면 테스트가 알려요(글 담당이 출처 표기를 바꿀지 판단). 지금: 클로자핀 글 출처 6(약학정보원 제품 정보 쪽 제목).
   글에서 그 제목이 바뀌거나 빠지면 이 줄은 아무 일도 하지 않으니 지워도 돼요 */
const TITLE_OK = ['클자핀정100mg(클로자핀) 의약품 상세정보 · 허가사항'];
function withoutOkTitles(s) { let t = String(s); TITLE_OK.forEach(function (x) { t = t.split(x).join(''); }); return t; }
function unesc(s) { return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); }
function textOf(html) { return unesc(String(html).replace(/<[^>]+>/g, '')); }
function staticOf(data, arts) {
  return page.staticHtml({ data: { meds: data }, esc: md.esc, articles: arts || ARTS, sections: [], page: DECL });
}

/* 견본 글(값은 형식만 보여 주는 예시예요. 실제 약의 값이 아니에요) */
function sample(over) {
  over = over || {};
  const rows = Object.assign({
    '계열': '2세대 · 부분 작용제',
    '제형': '먹는 약 · 장기지속형 주사 있음[^3]',
    '체중·대사': '적은 편[^2]',
    '추체외로 증상·좌불안석': '중간 (좌불안석이 흔한 편)[^2][^1]',
    '프로락틴': '많은 편[^2]',
    '졸림': '적은 편~중간 (자료마다 달라요)[^2]',
    'QT 연장': '자료 부족',
    '기립성 저혈압': '자료 부족',
    '꼭 알아둘 것': '가만히 있지 못하는 느낌이 들면 담당 의사에게 **말해요**.[^1]'
  }, over.rows || {});
  const order = over.order || gen.ROWS;
  const table = ['| 항목 | 내용 |', '|---|---|'].concat(order.filter(function (k) { return rows[k] != null; }).map(function (k) { return '| ' + k + ' | ' + rows[k] + ' |'; })).join('\n');
  return '---\n' +
    'title: ' + (over.title == null ? '견본약' : over.title) + '\n' +
    'section: 7\norder: 1\nsummary: 견본\ntags: 견본\n' +
    'updated: ' + (over.updated || '2026-11-14') + '\nevidence: 연구\nsources:\n' +
    '  - 기관 | 처방정보 | 2025 | https://example.org/label\n' +
    '  - Stroup TS 외 | 종설 (World Psychiatry) | 2018 | https://doi.org/10.1002/wps.20567\n' +
    '  - 식품의약품안전처 | 의약품 검색 | 2026 | https://nedrug.mfds.go.kr/x\n' +
    '  - 안 쓴 출처 | 제목 | 2020 | https://example.org/unused\n' +
    '---\n## 한 문장으로\n\n견본약(samplezapine)은 견본이에요.[^1]\n\n## 어떤 약인가\n\n설명.[^2]\n\n' +
    (over.noCard ? '' : '## 약 카드\n\n' + table + '\n\n같은 약이라도 사람마다 반응이 달라요. 이 표로 약을 고르거나 바꾸지 말고 담당 의사와 상의하세요.\n\n') +
    (over.twice ? '## 약 카드\n\n' + table + '\n\n' : '') +
    '## 효과\n\n본문.[^4]\n';
}
function throwsWith(fn, word) {
  let msg = '';
  try { fn(); } catch (e) { msg = e.message; }
  ok(msg, '예외가 나야 해요(' + word + ')');
  has(msg, word);
}

/* ---------- 생성기: 견본 글 ---------- */
test('meds 생성기: 행 이름이 검사기(tools/checks/drug-card.cjs)와 같다', function () {
  eq(gen.ROWS, card.ROWS);
  eq(gen.KEYS.length, gen.ROWS.length);
  eq(M.FX_KEYS, gen.FX_KEYS, '화면과 생성기의 부작용 열 열쇠');
});
test('meds 생성기: 견본 글 → 이름·slug·영문·약 카드 소절 id·9행·각주를 출처로 풀기', function () {
  const e = gen.entryFrom(sample(), 'samplezapine', 'content/07-medication/samplezapine.md');
  eq(e.slug, 'samplezapine');
  eq(e.name, '견본약');
  eq(e.en, 'samplezapine');
  eq(e.updated, '2026-11-14');
  eq(e.anchor, 'h-3', '약 카드 소절의 제목 id(md.render 와 같은 번호)');
  eq(e.rows.map(function (r) { return r.key; }), gen.KEYS);
  eq(e.rows.map(function (r) { return r.name; }), gen.ROWS);
  eq(e.rows[1], { key: 'form', name: '제형', text: '먹는 약 · 장기지속형 주사 있음', refs: [3] });
  eq(e.rows[3], { key: 'eps', name: '추체외로 증상·좌불안석', text: '중간 (좌불안석이 흔한 편)', refs: [2, 1] });
  eq(e.rows[6].text, '자료 부족');
  eq(e.rows[6].refs, []);
  eq(e.rows[8].text, '가만히 있지 못하는 느낌이 들면 담당 의사에게 말해요.', '굵게 표시는 글자만');
  eq(e.sources.map(function (s) { return s.n; }), [1, 2, 3], '칸에 쓰인 각주만, 번호 순(4번은 본문에만)');
  eq(e.sources[1], { n: 2, org: 'Stroup TS 외', title: '종설 (World Psychiatry)', year: '2018', url: 'https://doi.org/10.1002/wps.20567' });
});
test('meds 생성기: 행 순서가 달라도 정해진 순서로, 약 카드가 없는 글은 null', function () {
  const rev = gen.ROWS.slice().reverse();
  eq(gen.entryFrom(sample({ order: rev }), 'samplezapine').rows.map(function (r) { return r.name; }), gen.ROWS);
  eq(gen.entryFrom(sample({ noCard: true }), 'samplezapine'), null);
});
test('meds 생성기: 틀린 약 카드는 이유와 함께 실패', function () {
  throwsWith(function () { gen.entryFrom(sample({ rows: { '졸림': null } }), 'x'); }, '"졸림" 행이 없어요');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '졸림': '조금[^2]' } }), 'x'); }, '가운데 하나로 시작');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '졸림': '많은 편' } }), 'x'); }, '출처 각주가 없어요');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '졸림': '많은 편[^9]' } }), 'x'); }, '[^9]');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '꼭 알아둘 것': '보통 10 mg 으로 시작해요.[^1]' } }), 'x'); }, '용량 단위');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '꼭 알아둘 것': '하루 1번 먹어요.[^1]' } }), 'x'); }, '복용 횟수');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '꼭 알아둘 것': '첫 약으로 추천돼요.[^1]' } }), 'x'); }, '권하는 말');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '꼭 알아둘 것': '임신 중에도 괜찮아요.[^1]' } }), 'x'); }, '임부');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '꼭 알아둘 것': '약값이 싸요.[^1]' } }), 'x'); }, '값 비교');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '계열': '' } }), 'x'); }, '비었어요');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '체중·대사': '적은 편 ' + '아주긴글자'.repeat(6) + '[^2]' } }), 'x'); }, '띄어쓰기 없이');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '제형': '먹는 약 ' + '긴 설명 '.repeat(15) + '[^3]' } }), 'x'); }, '너무 길어요');
  throwsWith(function () { gen.entryFrom(sample({ rows: { '꼭 알아둘 것': '말해요 '.repeat(40) + '[^1]' } }), 'x'); }, '너무 길어요');
  throwsWith(function () { gen.entryFrom(sample({ twice: true }), 'x'); }, '2개');
  throwsWith(function () { gen.entryFrom(sample({ title: '' }), 'x'); }, 'title');
  throwsWith(function () { gen.entryFrom(sample({ updated: '2026-13-01' }), 'x'); }, 'updated');
  throwsWith(function () { gen.entryFrom(sample(), 'Bad Slug'); }, 'slug');
  throwsWith(function () { gen.buildFrom([{ slug: 'a', text: sample({ noCard: true }) }]); }, '하나도 없어요');
});
test('meds 생성기: 가나다순, 같은 입력이면 같은 출력', function () {
  const files = [
    { slug: 'zz', text: sample({ title: '할로견본' }) },
    { slug: 'aa', text: sample({ title: '루라견본' }) },
    { slug: 'mm', text: sample({ title: '아리견본' }) },
    { slug: 'nn', text: sample({ title: '아미견본' }) }
  ];
  const a = gen.buildFrom(files), b = gen.buildFrom(files.slice().reverse());
  eq(a.map(function (e) { return e.name; }), ['루라견본', '아리견본', '아미견본', '할로견본']);
  eq(gen.serialize(a), gen.serialize(b));
  eq(JSON.parse(gen.serialize(a)), a, '직렬화한 것을 다시 읽으면 같아요');
  ok(/\n$/.test(gen.serialize(a)), '끝 줄바꿈');
});

/* ---------- 생성기: 실제 글 ---------- */
const BUILT = gen.build();
test('meds 생성기: 실제 약 글에서 12개, slug 는 개별 약 글 12편', function () {
  eq(BUILT.length, 12);
  eq(BUILT.map(function (e) { return e.slug; }).sort(), DRUGS);
});
test('meds 자료: data/kb/meds.json 이 지금 글에서 만든 것과 같다(손으로 고치지 않음 · 글을 고쳤으면 node tools/gen/meds.cjs)', function () {
  ok(DATA_TEXT === gen.serialize(BUILT), 'data/kb/meds.json 이 생성기 출력과 달라요. node tools/gen/meds.cjs 를 다시 돌려요');
});
test('meds 자료: 약 이름(= 글 제목) 가나다순', function () {
  const names = DATA.map(function (e) { return e.name; });
  eq(names, names.slice().sort(function (a, b) { return a.localeCompare(b, 'ko'); }), '한국어 정렬과 같아요');
  eq(names[0], '루라시돈');
  DATA.forEach(function (e) { eq(e.name, ARTS[e.slug].title, e.slug + ' 이름은 글 제목'); });
});
test('meds 자료: 9행 모두, 부작용 6칸은 네 낱말 가운데 하나로 시작, 각주는 그 글의 출처로 풀림', function () {
  DATA.forEach(function (e) {
    eq(e.rows.map(function (r) { return r.name; }), gen.ROWS, e.slug);
    e.rows.forEach(function (r) {
      ok(r.text && r.text === r.text.trim(), e.slug + ' ' + r.name + ' 칸 글자');
      ok(!/\[\^\d+\]/.test(r.text), e.slug + ' 칸 글자에 각주 표시가 남음');
      if (gen.FX_KEYS.indexOf(r.key) >= 0) {
        ok(LEVEL_START.test(r.text), e.slug + ' ' + r.name + ': ' + r.text);
        if (!/^자료 부족/.test(r.text)) ok(r.refs.length > 0, e.slug + ' ' + r.name + ' 근거 각주');
      }
      r.refs.forEach(function (n) {
        const s = e.sources.filter(function (x) { return x.n === n; })[0];
        ok(s && s.title, e.slug + ' 각주 ' + n + ' 출처');
      });
    });
    e.sources.forEach(function (s) { ok(/^https?:\/\//.test(s.url), e.slug + ' 출처 ' + s.n + ' 주소'); });
    ok(/^h-\d+$/.test(e.anchor), e.slug + ' 약 카드 소절 id');
    ok(/^[a-z]+$/.test(e.en), e.slug + ' 영문 이름');
  });
});
test('meds 자료: 칸 길이 상한 안(가로 넘침 막기)', function () {
  DATA.forEach(function (e) { e.rows.forEach(function (r) { eq(gen.tooLong(r.key, r.text), '', e.slug + ' ' + r.name); }); });
  eq(gen.tooLong('weight', '적은 편~중간 (자료마다 달라요, 외국 허가사항에 QT 경고)'), '');
});
test('meds 선언: 고지 날짜(updated)가 약 글의 가장 최근 고친 날보다 앞서지 않는다', function () {
  const latest = DATA.map(function (e) { return e.updated; }).sort().pop();
  ok(DECL.updated >= latest, 'data/pages/meds.json 의 updated(' + DECL.updated + ')가 약 글의 가장 최근 고친 날(' + latest + ')보다 앞서요. 화면 고지 "○○에 확인한 내용"이 옛 날짜로 남으니 약 카드를 다시 확인하고 updated 를 고쳐요');
});
test('meds 자료: 칸 글자가 글의 약 카드 표와 같다(각주 표시만 뺌)', function () {
  DATA.forEach(function (e) {
    const body = md.parse(read('content/07-medication/' + e.slug + '.md')).body;
    e.rows.forEach(function (r) {
      const line = body.split('\n').filter(function (l) { return l.indexOf('| ' + r.name + ' |') === 0; })[0];
      ok(line, e.slug + ' ' + r.name + ' 행');
      eq(line.split('|')[2].replace(/\[\^\d+\]/g, '').trim(), r.text, e.slug + ' ' + r.name);
    });
  });
});
test('meds 자료: 금지 키·낱말(dose·mg·price·rank·임신·추천·순위) 0', function () {
  const keys = [];
  (function walk(v) {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { keys.push(k); walk(v[k]); });
  })(DATA);
  keys.forEach(function (k) { ok(!BANNED_EN.test(k) && !BANNED_KO.test(k) && !/pregnan|recommend|cost/i.test(k), '금지 키: ' + k); });
  ok(!BANNED_KO.test(DATA_TEXT), '금지 낱말(한국어)');
  DATA.forEach(function (e) {
    ['slug', 'name', 'en', 'anchor'].forEach(function (k) { ok(!BANNED_EN.test(String(e[k] || '')), e.slug + ' ' + k); });
    e.rows.forEach(function (r) {
      ok(!BANNED_EN.test(r.text), e.slug + ' ' + r.name + ': ' + r.text);
      eq(gen.forbiddenIn(r.text), [], e.slug + ' ' + r.name);
    });
    e.sources.forEach(function (s) {
      const t = withoutOkTitles([s.org, s.title, s.year].join(' '));
      ok(!BANNED_EN.test(t) && !BANNED_KO.test(t), e.slug + ' 출처 ' + s.n + ' 제목에 금지 낱말 — 출처 표기를 글 담당과 정하고 TITLE_OK 에 적어요: ' + s.title);
    });
  });
});
test('meds 자료: 자료 부족이 절반을 넘는 칸 수(지금 0이면 접는 칸 없음)', function () {
  const clean = M.clean(DATA);
  eq(clean.length, 12);
  const folded = M.foldedKeys(clean);
  ok(folded.length <= 2, '대부분이 자료 부족이면 총괄에게 알려야 해요: ' + folded.join(','));
});

/* ---------- 화면: 순수 함수 ---------- */
test('meds 화면: splitValue 는 글자를 바꾸지 않고 큰 말과 괄호 덧말로 나눈다', function () {
  ['적은 편', '적은 편~중간 (자료마다 달라요)', '중간 (외국 허가사항에 QT 경고)', '자료 부족', '먹는 약(국내 시판 허가 확인 안 됨) · 장기지속형 주사 없음', ''].forEach(function (t) {
    const s = M.splitValue(t);
    eq(s.main + s.rest, t);
  });
  eq(M.splitValue('적은 편~중간 (자료마다 달라요)'), { main: '적은 편~중간 ', rest: '(자료마다 달라요)' });
});
test('meds 화면: 출처가 없는 칸의 풀이(자료 부족 덧말이 있으면 그 덧말이 까닭)', function () {
  eq(M.popNote('자료 부족'), '출처에서 확인하지 못해 자료 부족으로 둔 칸이에요.');
  const t = M.popNote('자료 부족 (자료마다 크게 달라요)');
  has(t, '(자료마다 크게 달라요)');
  not(t, '확인하지 못해');
  eq(M.popNote('먹는 약'), '약 카드의 이 칸에는 따로 단 출처가 없어요.');
});
test('meds 화면: 화살표 이동은 열 자리 기준(빠진 칸이 있어도 옆 열로 밀리지 않음)', function () {
  /* 열: 계열(단추 없음) · 제형 · 부작용 6. 둘째 약은 제형 칸이 빠졌고, 약마다 아래 줄은 여러 열을 차지한 칸 하나 */
  const A1 = {}, N1 = {}, B1 = {}, N2 = {};
  const row = function (tag, miss) { const r = [null]; for (let x = 1; x < 8; x++) r.push(miss === x ? null : tag + x); return r; };
  const fill = function (c) { const r = []; for (let x = 0; x < 8; x++) r.push(c); return r; };
  const grid = [row('a'), fill(N1), row('b', 1), fill(N2)];
  eq(M.gridMove(grid, 3, 0, 'ArrowDown'), { x: 3, y: 1 }, '아래 줄(꼭 알아둘 것)로');
  eq(M.gridMove(grid, 3, 1, 'ArrowDown'), { x: 3, y: 2 }, '같은 열을 지켜 다음 약으로');
  eq(M.gridMove(grid, 3, 2, 'ArrowUp'), { x: 3, y: 1 });
  eq(M.gridMove(grid, 1, 1, 'ArrowDown'), { x: 2, y: 2 }, '빠진 칸이면 가장 가까운 칸');
  eq(M.gridMove(grid, 2, 2, 'ArrowLeft'), null, '빠진 칸과 단추 없는 계열 칸은 건너뛰고, 더 없으면 제자리');
  eq(M.gridMove(grid, 4, 1, 'ArrowRight'), null, '한 칸뿐인 줄에서 옆으로는 제자리');
  eq(M.gridMove(grid, 5, 0, 'Home'), { x: 1, y: 0 });
  eq(M.gridMove(grid, 5, 0, 'End'), { x: 7, y: 0 });
  eq(M.gridMove(grid, 5, 0, 'End', true), { x: 7, y: 3 });
  eq(M.gridMove(grid, 5, 0, 'PageDown'), { x: 5, y: 3 });
  eq(M.gridMove(grid, 5, 3, 'ArrowDown'), null, '맨 아래');
  eq(M.gridMove(grid, 5, 0, 'a'), undefined, '모르는 키는 그냥 지나가요');
  void A1; void B1;
});
test('meds 화면: levelOf 는 네 낱말과 범위만 알아본다', function () {
  eq(M.levelOf('적은 편'), { none: false, lo: 1, hi: 1 });
  eq(M.levelOf('중간 (외국 허가사항에 QT 경고)'), { none: false, lo: 2, hi: 2 });
  eq(M.levelOf('많은 편'), { none: false, lo: 3, hi: 3 });
  eq(M.levelOf('적은 편~중간 (자료마다 달라요)'), { none: false, lo: 1, hi: 2 });
  eq(M.levelOf('중간~많은 편'), { none: false, lo: 2, hi: 3 });
  eq(M.levelOf('자료 부족 (자료마다 크게 달라요)'), { none: true, lo: 0, hi: 0 });
  eq(M.levelOf('조금'), null);
  eq(M.markHtml('조금'), '');
  eq(M.markHtml('적은 편~중간'), '<span class="pg-meds-mk" aria-hidden="true"><i class="f"></i><i class="r"></i><i></i></span>');
  eq(M.markHtml('자료 부족'), '<span class="pg-meds-mk" aria-hidden="true"><i class="n"></i><i class="n"></i><i class="n"></i></span>');
});
function fake(n, noneCount, key) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = JSON.parse(JSON.stringify(DATA[i % DATA.length]));
    e.slug = 'fake-' + i; e.name = '가짜' + String.fromCharCode(0xAC00 + i * 28);
    if (i < noneCount) e.rows.forEach(function (r) { if (r.key === key) { r.text = '자료 부족'; r.refs = []; } });
    out.push(e);
  }
  return out;
}
test('meds 화면: 자료 부족이 절반을 넘는 칸만 접는다', function () {
  eq(M.foldedKeys(M.clean(fake(12, 7, 'qt'))), ['qt']);
  eq(M.foldedKeys(M.clean(fake(12, 6, 'qt'))), [], '딱 절반은 접지 않아요');
  const html = staticOf(fake(12, 7, 'qt'));
  has(html, M.FOLD_TEXT);
  const thead = html.slice(html.indexOf('<thead>'), html.indexOf('</thead>'));
  not(thead, 'QT 연장', '접은 칸은 표 머리에 없어요');
  not(html, 'pg-meds-td-qt', '접은 칸은 표에 없어요');
  not(staticOf(DATA), M.FOLD_TEXT, '지금 자료에는 접는 칸이 없어요');
});
test('meds 화면: clean 은 틀린 항목을 건너뛰고 가나다순으로', function () {
  const list = [
    { slug: 'b', name: '나약', rows: [{ key: 'weight', name: '체중·대사', text: '적은 편', refs: [1] }], sources: [{ n: 1, title: 't', url: 'javascript:alert(1)' }] },
    { slug: 'a', name: '가약', rows: [{ key: 'weight', name: '체중·대사', text: '중간', refs: [1, 'x', -1] }] },
    { slug: 'Bad', name: '다약', rows: [] }, null, { slug: 'c', rows: [] }, { slug: 'a', name: '겹침', rows: [{ key: 'weight', text: '중간' }] }
  ];
  const c = M.clean(list);
  eq(c.map(function (e) { return e.slug; }), ['a', 'b']);
  eq(c[0].rows.weight.refs, [1]);
  eq(c[1].sources[1].url, '', 'http(s) 가 아닌 주소는 버림');
});
test('meds 화면: 표 전체 출처는 주소가 같으면 한 번', function () {
  const list = M.sourceList(M.clean(DATA));
  const urls = list.map(function (s) { return s.url; });
  eq(urls.length, new Set(urls).size);
  ok(urls.indexOf('https://doi.org/10.1002/wps.20567') >= 0, 'Stroup·Gray 2018');
  ok(urls.indexOf('https://doi.org/10.2147/TCRM.S117321') >= 0, 'Solmi 외 2017');
  const meds = M.clean(DATA);
  const fx = M.sourceList(meds, M.FX_KEYS);
  const rest = M.sourceList(meds, ['class', 'form', 'note'], fx);
  eq(fx.length + rest.length, list.length, '부작용 칸 출처 + 나머지 칸 출처 = 전체(겹치지 않게)');
  eq(fx.slice(0, 2).map(function (s) { return s.url; }).sort(), ['https://doi.org/10.1002/wps.20567', 'https://doi.org/10.2147/TCRM.S117321'], '부작용 칸의 첫 출처는 두 종설');
  rest.forEach(function (s) { ok(fx.indexOf(s) < 0); });
});
test('meds 화면: 범위 낱말은 줄 끝에서만 나뉘고 글자는 그대로', function () {
  const h = M.pageHtml(DATA, { esc: md.esc, link: function (x) { return x; }, title: function () { return ''; }, live: false });
  has(h, '<span class="pg-meds-nw">적은 편~</span><wbr><span class="pg-meds-nw">중간</span>');
  has(h, '<span class="pg-meds-nw">중간~</span><wbr><span class="pg-meds-nw">많은 편</span>');
  const long = '적은 편 ' + '아주긴글자'.repeat(80);
  const h2 = M.pageHtml([{ slug: 'x', name: '가약', rows: [{ key: 'weight', name: '체중·대사', text: long, refs: [] }], sources: [] }], { esc: md.esc, link: function (x) { return x; }, title: function () { return ''; }, live: false });
  not(h2, '<span class="pg-meds-nw">적은 편 ' + '아주', '긴 글자는 줄바꿈 금지로 묶지 않아요');
  has(textOf(h2), long, '글자는 그대로');
});

/* ---------- 화면: 정적 HTML ---------- */
const HTML = staticOf(DATA);
test('meds 정적 HTML: 고정 문구·표·카드·꼭 알아둘 것·출처, 단추 없음', function () {
  has(HTML, '같은 약이라도 사람마다 반응이 달라요. 이 표로 약을 고르거나 바꾸지 말고 담당 의사와 상의하세요.');
  has(HTML, '<table class="pg-meds-table">');
  has(HTML, '<ol class="pg-meds-cards">');
  has(HTML, '이 표의 출처');
  has(HTML, '<p class="pg-meds-scope">' + M.SCOPE + '</p>', '표 범위 문장은 접히지 않는 자리에');
  has(M.SCOPE, '여섯 칸 말고도 약마다 다른 부작용이 있어요');
  has(M.SCOPE, '종설의 표에 매겨진 정도');
  const how = HTML.slice(HTML.indexOf('<details class="pg-meds-how">'), HTML.indexOf('</details>', HTML.indexOf('<details class="pg-meds-how">')));
  has(how, '두 자료가 크게 달라 정도를 하나로 정하지 않은 칸도 자료 부족', '읽는 법: 자료 부족의 두 뜻');
  has(HTML, '범위(두 범주에 걸치거나 자료마다 달라요)', '범례: 범위의 두 뜻');
  not(HTML, '<button', '자바스크립트가 꺼진 화면에는 누를 수 없는 단추를 두지 않아요');
  not(HTML, 'pg-meds-jump');
  has(HTML, '정기 혈액 검사가 꼭 필요한 약이에요.', '클로자핀 꼭 알아둘 것(글 그대로)');
  ok((HTML.match(/<th scope="col">/g) || []).length === 9, '표 머리 9칸(약 + 계열·제형·부작용 6)');
  ok(/<th scope="row"/.test(HTML), '행 머리');
});
test('meds 정적 HTML: 표의 행은 가나다순, 칸 글자는 자료와 똑같다', function () {
  const table = HTML.slice(HTML.indexOf('<table class="pg-meds-table">'), HTML.indexOf('</table>'));
  const bodies = table.split('<tbody class="pg-meds-drug">').slice(1);
  eq(bodies.length, 12);
  bodies.forEach(function (tb, i) {
    const e = DATA[i];
    has(tb, 'href="#/a/' + e.slug + '"', '약 글 링크');
    has(tb, '<th scope="row" class="pg-meds-rh" rowspan="2">', '약 이름은 두 줄(칸 줄 + 꼭 알아둘 것 줄)의 머리');
    const tds = {};
    tb.replace(/<td class="pg-meds-td-([a-z]+)"[^>]*>([\s\S]*?)<\/td>/g, function (_, k, inner) { tds[k] = textOf(inner); return _; });
    e.rows.forEach(function (r) { if (r.key !== 'note') eq(tds[r.key], r.text, e.name + ' ' + r.name); });
    eq(tds.note, '꼭 알아둘 것' + e.rows[8].text, e.name + ' 꼭 알아둘 것은 그 약의 줄 안에(글 그대로)');
    has(tb, 'colspan="8"', '꼭 알아둘 것 줄은 표 너비만큼');
  });
  const cloz = bodies[DATA.map(function (e) { return e.slug; }).indexOf('clozapine')];
  has(textOf(cloz), '정기 혈액 검사가 꼭 필요한 약이에요.', '클로자핀 줄 안에 혈액 검사 문장(넓은 표·인쇄)');
});
test('meds 화면(자바스크립트): 표의 칸 단추도 "약 이름 + 칸 이름" 숨김 이름', function () {
  const live = M.pageHtml(DATA, { esc: md.esc, link: function (x) { return x; }, title: function () { return ''; }, live: true });
  const table = live.slice(live.indexOf('<table class="pg-meds-table">'), live.indexOf('</table>'));
  const btns = table.match(/<button type="button" class="pg-meds-cell[^"]*"[^>]*>[\s\S]*?<\/button>/g) || [];
  eq(btns.length, 12 * 8, '약마다 제형·부작용 6·꼭 알아둘 것');
  btns.forEach(function (b) {
    const m = /data-i="(\d+)" data-k="([a-z]+)"/.exec(b);
    const e = DATA[Number(m[1])];
    const r = e.rows.filter(function (x) { return x.key === m[2]; })[0];
    has(b, '<span class="pg-meds-sr">' + md.esc(e.name + ' ' + r.name + ': ') + '</span>', e.name + ' ' + r.name);
  });
  has(table, '<span class="pg-meds-nh" aria-hidden="true">꼭 알아둘 것</span>', '보이는 머리말은 숨김 이름과 겹치지 않게');
  not(live, 'pg-meds-notes', '표 아래 따로 있던 꼭 알아둘 것 목록은 없어요(표 줄 안으로)');
});
test('meds 정적 HTML: 카드도 가나다순, 칸 글자는 자료와 똑같다', function () {
  const cards = HTML.slice(HTML.indexOf('<ol class="pg-meds-cards">'), HTML.indexOf('</ol>', HTML.indexOf('<ol class="pg-meds-cards">'))).split('<li class="pg-meds-card"').slice(1);
  eq(cards.length, 12);
  cards.forEach(function (c, i) {
    const e = DATA[i];
    has(c, 'id="pg-meds-c-' + e.slug + '"');
    const dds = [];
    c.replace(/<dd>([\s\S]*?)<\/dd>/g, function (_, inner) { dds.push(textOf(inner)); return _; });
    eq(dds, e.rows.filter(function (r) { return r.key !== 'class' && r.key !== 'note'; }).map(function (r) { return r.text; }), e.name);
    has(textOf(c), e.rows[8].text, e.name + ' 꼭 알아둘 것');
  });
});
test('meds 정적 HTML: 금지 낱말 0, 칸 이름 길잡이 글은 실제로 있다', function () {
  const t = withoutOkTitles(textOf(HTML));
  ok(!BANNED_KO.test(t), '금지 낱말(한국어): ' + (t.match(BANNED_KO) || [''])[0]);
  ok(!BANNED_EN.test(t), '금지 낱말(영어): ' + (t.match(BANNED_EN) || [''])[0]);
  ok(!/입원해야|위험해요|끊어도|중단해도/.test(t), '판정형·중단 권유 문장 없음');
  Object.keys(M.COL_READ).forEach(function (k) { ok(ARTS[M.COL_READ[k]], '칸 길잡이 글이 있어요: ' + M.COL_READ[k]); has(HTML, 'href="#/a/' + M.COL_READ[k] + '"'); });
});
test('meds 정적 HTML: 글자는 이스케이프, 자료가 없으면 안내만', function () {
  const bad = [{ slug: 'x', name: '<img src=x onerror=1>', rows: [{ key: 'weight', name: '체중·대사', text: '적은 편 <script>', refs: [] }, { key: 'note', name: '꼭 알아둘 것', text: '"따옴표" & 기호', refs: [] }], sources: [] }];
  const h = staticOf(bad, {});
  not(h, '<img'); not(h, '<script');
  has(h, '&lt;img src=x onerror=1&gt;');
  has(h, '&quot;따옴표&quot; &amp; 기호');
  const empty = staticOf([]);
  has(empty, '약 카드를 찾지 못했어요');
  has(empty, '이 표로 약을 고르거나 바꾸지 말고', '자료가 없어도 고정 문구');
  has(staticOf(undefined), '약 카드를 찾지 못했어요');
});

/* ---------- 소스·선언 ---------- */
test('meds 화면 소스: 저장·외부 요청·주소 바꾸기 없음, 금지 낱말 없음', function () {
  const src = read('js/pages/meds.js');
  ['fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'store.set', 'pushState', 'replaceState', 'location.hash =', 'location.search', 'speechSynthesis', 'sendBeacon', '.sort(function (a, b) { return b'].forEach(function (w) { not(src, w, w); });
  [src, read('css/pages/meds.css'), read('data/pages/meds.json')].forEach(function (t, i) {
    ok(!BANNED_KO.test(t), ['js', 'css', 'json'][i] + ' 금지 낱말: ' + (t.match(BANNED_KO) || [''])[0]);
    ok(!BANNED_EN.test(t), ['js', 'css', 'json'][i] + ' 금지 낱말: ' + (t.match(BANNED_EN) || [''])[0]);
  });
  not(read('css/pages/meds.css'), '--bad', '붉은 경고색 토큰을 쓰지 않아요');
  not(read('css/pages/meds.css'), '--warn', '경고색 토큰을 쓰지 않아요');
  ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(read('css/pages/meds.css')), '색은 토큰만');
});
test('meds 화면 CSS: 글자 크기는 보기 설정(--fs-body)을 따라가고(인쇄만 pt), 누르는 단추는 상자 자체가 44px', function () {
  const css = read('css/pages/meds.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const at = css.indexOf('@media print');
  ok(at > 0, '인쇄 규칙');
  const screen = css.slice(0, at);
  const sizes = screen.match(/font-size:\s*[^;}]+/g) || [];
  ok(sizes.length > 20, '글자 크기 규칙');
  sizes.forEach(function (f) { ok(/var\(--fs-body\)|\d(?:\.\d+)?em\b|inherit/.test(f) && !/\dpx/.test(f.replace(/var\(--fs-body\)/g, '')), '화면 글자 크기는 --fs-body 나 em: ' + f); });
  has(screen, '.pg-meds { container-type: inline-size; font-size: var(--fs-body); }');
  ok(/@container \(min-width: [\d.]+em\)/.test(screen) && !/@container \(min-width: [\d.]+px\)/.test(screen), '표↔카드 기준도 em(글자가 크면 카드로)');
  [/\.pg-meds-jump button \{[^}]*min-height: 44px/, /\.pg-meds-srcbtn \{[^}]*min-height: 44px/, /button\.pg-meds-cell \{[^}]*min-height: 44px/].forEach(function (re) { ok(re.test(screen), String(re)); });
  not(screen, '.pg-meds-jump button::before', '누르는 범위를 가짜로 넓혀 이웃과 겹치지 않게');
  not(screen, '.pg-meds-srcbtn::before');
  ok(/\.pg-meds-v \{[^}]*overflow-wrap: anywhere/.test(screen), '긴 글자도 칸 안에서 줄바꿈');
  const print = css.slice(at);
  not(print, '.pg-meds-scope { display: none', '표 범위 문장은 인쇄에도');
  ok(!/\.pg-meds-scope[^{]*\{[^}]*display:\s*none/.test(css), '표 범위 문장을 숨기는 규칙 없음');
});
test('meds 선언: 지시서 P5 그대로, 검사 통과', function () {
  eq(DECL.id, 'meds');
  eq(DECL.title, '항정신병약 한눈에');
  eq(DECL.group, '지식');
  eq(DECL.nav, ['side', 'home', 'palette']);
  eq(DECL.robots, 'index');
  eq(DECL.notice, ['general', 'dated']);
  eq(DECL.data, ['meds']);
  eq(DECL.crisisLine, true);
  const r = A.validateDecl(DECL, 'meds', { root: ROOT });
  eq(r.errors, []);
  eq(r.warnings, []);
  eq(A.resolveLastmod(A.normalizeDecl(DECL, { root: ROOT }), { root: ROOT }), DATA.map(function (e) { return e.updated; }).sort().pop(), '사이트맵 날짜 = 약 글의 가장 최근 고친 날');
});
