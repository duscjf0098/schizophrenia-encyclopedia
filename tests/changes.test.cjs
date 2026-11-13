/* 고침 기록 화면(js/pages/changes.js, data/kb/changes.json)과 믿음 장치(js/ui/trust.js) 테스트 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const page = require('../js/pages/changes.js');
const C = page.lib;
const trust = require('../js/ui/trust.js');
const CC = require('../tools/check-content.cjs');
const md = require('../js/md.js');

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^﻿/, '')); }
const DATA = readJson('data/kb/changes.json');
/* 글 slug 는 content/ 의 실제 파일에서 (data/toc.js 는 빌드 전이면 옛것일 수 있어요) */
const SLUGS = new Set();
(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (/\.md$/.test(d.name)) SLUGS.add(d.name.replace(/\.md$/, ''));
  });
})(path.join(ROOT, 'content'));
/* 기록 날짜는 한국 날짜로 적어요. 돌리는 기계의 시간대(UTC 등)와 상관없이 서울 날짜를 '오늘'로 봐요 */
function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function seoulToday(now) { return new Date((now == null ? Date.now() : now) + 9 * 3600e3).toISOString().slice(0, 10); }
const TODAY = seoulToday();
test('오늘 날짜는 서울 기준(UTC 자정~09시에도 한국 날짜)', function () {
  eq(seoulToday(Date.UTC(2026, 10, 13, 23, 30)), '2026-11-14', 'UTC 11-13 23:30 = 서울 11-14 08:30');
  eq(seoulToday(Date.UTC(2026, 10, 14, 14, 59)), '2026-11-14', 'UTC 11-14 14:59 = 서울 11-14 23:59');
  eq(seoulToday(Date.UTC(2026, 10, 14, 15, 0)), '2026-11-15');
});
const OPTS = { slugs: SLUGS, today: TODAY };
function errsOf(e, opts) { return C.validateEntry(e, Object.assign({}, OPTS, opts || {})); }
function hasErr(list, word, msg) { ok(list.some(function (x) { return x.indexOf(word) >= 0; }), (msg || '') + ' — 기대한 오류 "' + word + '" 없음: ' + JSON.stringify(list)); }
const OK = { date: '2026-10-25', kind: 'fix', slug: 'treatment-resistant', what: '치료저항성 비율을 원문에 맞게 바로잡았어요.' };

/* ---------- 실제 데이터 ---------- */
test('changes.json: 배열이고 모든 항목이 형식을 지킨다(날짜·종류·slug 존재·what)', function () {
  ok(Array.isArray(DATA), '배열이어야 해요');
  ok(DATA.length >= 30, '씨앗 기록이 있어야 해요: ' + DATA.length);
  eq(C.validate(DATA, OPTS).errors, []);
});

test('changes.json: 날짜 내림차순이고 정렬 함수의 결과와 같다', function () {
  for (let i = 1; i < DATA.length; i++) ok(DATA[i - 1].date >= DATA[i].date, i + '번째 항목이 날짜 내림차순이 아니에요: ' + DATA[i - 1].date + ' → ' + DATA[i].date);
  eq(DATA, C.sortEntries(DATA), '정렬 순서(날짜 내림차순 → 종류 → 글·기능 이름)');
  eq(DATA, C.normalize(DATA), '정리(normalize)해도 그대로여야 해요');
});

test('changes.json: 같은 날 같은 글(같은 기능) 중복 없음', function () {
  eq(C.duplicates(DATA), []);
  const seen = new Set();
  DATA.forEach(function (e) {
    const k = e.date + '|' + (e.slug || e.title);
    ok(!seen.has(k), '중복: ' + k);
    seen.add(k);
  });
});

test('changes.json: what 에 금지 표현 0(글 검사기의 금지 표현 + 믿음 장치 규칙)', function () {
  DATA.forEach(function (e, i) {
    eq(C.forbidden(e.what), [], i + '번째 what');
    eq(CC.findForbidden(e.what), [], i + '번째 what(글 검사기)');
    ok(!CC.EXTREME_CHOICE.test(e.what), i + '번째 what: 에두른 자살 표현');
    ok(!/감수(?!성)|검토\s*예정|확인\s*예정|다음\s*검토/.test(e.what), i + '번째 what: 감수·검토 약속 낱말');
    if (e.title) { eq(C.forbidden(e.title), [], i + '번째 title'); }
  });
});

test('changes.json: 기록은 백과가 생긴 날(2026-10-23) 이후, 글 링크는 모두 실제 글', function () {
  DATA.forEach(function (e) {
    ok(e.date >= '2026-10-23', '너무 이른 날짜: ' + e.date);
    if (e.slug) ok(SLUGS.has(e.slug), '없는 글: ' + e.slug);
  });
  ok(DATA.some(function (e) { return e.kind === 'fix' && e.date === '2026-10-25'; }), '10월 25일 검수 반영 기록');
  ok(DATA.some(function (e) { return e.kind === 'new' && e.slug; }), '새 글 기록');
});

/* ---------- 형식 검사 ---------- */
test('validateEntry: 올바른 항목은 오류 없음', function () {
  eq(errsOf(OK), []);
  eq(errsOf({ date: '2026-10-24', kind: 'feature', title: '읽기 코스', what: '상황에 맞춰 읽을 순서를 코스로 묶었어요.' }), []);
  eq(errsOf({ date: '2026-10-23', kind: 'new', title: '첫 판', what: '글 221편과 용어 158개로 백과를 열었어요.' }), []);
});

test('validateEntry: 날짜·종류·slug·title·what·모르는 항목을 잡는다', function () {
  hasErr(errsOf(Object.assign({}, OK, { date: '2026-1-5' })), 'date');
  hasErr(errsOf(Object.assign({}, OK, { date: '2026-02-30' })), 'date', '달력에 없는 날');
  hasErr(errsOf(Object.assign({}, OK, { date: '2026-10-25T00:00' })), 'date');
  hasErr(errsOf(Object.assign({}, OK, { date: '2099-01-01' })), '오늘');
  hasErr(errsOf(Object.assign({}, OK, { kind: 'update' })), 'kind');
  hasErr(errsOf(Object.assign({}, OK, { slug: 'no-such-article' })), 'slug');
  hasErr(errsOf(Object.assign({}, OK, { slug: 'Bad Slug' })), 'slug');
  hasErr(errsOf({ date: '2026-10-25', kind: 'fix', what: '무엇을 고쳤는지만 있어요.' }), 'slug');
  hasErr(errsOf(Object.assign({}, OK, { title: '화면' })), '하나만');
  hasErr(errsOf({ date: '2026-10-25', kind: 'feature', slug: 'treatment-resistant', what: '기능인데 글 slug 를 썼어요.' }), 'title');
  hasErr(errsOf({ date: '2026-10-25', kind: 'feature', title: ' ', what: '이름이 빈 칸이에요.' }), 'title');
  hasErr(errsOf(Object.assign({}, OK, { what: '' })), 'what');
  hasErr(errsOf(Object.assign({}, OK, { what: '짧아요.' })), 'what');
  hasErr(errsOf(Object.assign({}, OK, { what: '가'.repeat(C.WHAT_MAX) + '요.' })), 'what');
  hasErr(errsOf(Object.assign({}, OK, { what: '해요체로 끝나지 않는 문장입니다.' })), '해요체');
  hasErr(errsOf(Object.assign({}, OK, { what: '여러 줄\n문장이에요.' })), 'what');
  hasErr(errsOf(Object.assign({}, OK, { note: 'x' })), 'note');
  hasErr(errsOf(null), '객체');
  /* slugs 를 주지 않으면 slug 존재는 검사하지 않아요(형식만) */
  eq(C.validateEntry(Object.assign({}, OK, { slug: 'no-such-article' }), { today: TODAY }), []);
});

test('forbidden(): 감수·검토 약속·진단 도구·용량·중단·옛 병명·에두른 자살 표현을 잡는다', function () {
  ['전문가 감수를 받았어요.', '감수를 마쳤어요.', '다음 검토 예정일은 12월이에요.', '정기 검토 예정이에요.',
    '자가 진단을 더했어요.', '자가 검사 화면이에요.', '진단 도구를 더했어요.', '치료 앱처럼 쓰세요.',
    '하루 5mg 씩 드세요.', '약을 끊어도 돼요.', '정신분열병 표기를 썼어요.', '조현병 환자의 수를 고쳤어요.',
    '완치됩니다.', '극단적 선택 관련 내용이에요.', '의학적으로 검증된 내용이에요.', '오류가 없음을 확인했어요.', '입원해야 해요.'
  ].forEach(function (s) { ok(C.forbidden(s).length > 0, '잡아야 해요: ' + s); });
  ['출처 주소를 바로잡았어요.', '사람을 먼저 쓰는 표현으로 바꿨어요.', '약을 빠뜨렸을 때 미리 물어 둘 것을 정리했어요.', '감량 연구의 결과 수치를 바로잡았어요.'].forEach(function (s) {
    eq(C.forbidden(s), [], '잡으면 안 돼요: ' + s);
  });
  /* 백과 자체의 약속(다음 검토·확인 예정·보강 예정)만 잡고, 글 내용을 옮긴 '감수성'·'출산 예정일'·'시행 예정인 법'은 통과 */
  ['검토 예정이에요.', '다음 달에 다시 확인할 예정이에요.', '확인 예정이에요.', '예정일에 다시 볼게요.', '내용을 더 보강할 예정이에요.', '감수자 의견을 반영했어요.'
  ].forEach(function (s) { ok(C.forbidden(s).length > 0, '잡아야 해요: ' + s); });
  ['유전적 감수성 연구를 더했어요.', '스트레스 감수성 설명을 고쳤어요.', '출산 예정일 무렵 약 이야기를 더했어요.', '2027년 시행 예정인 법의 내용을 더했어요.'
  ].forEach(function (s) {
    eq(C.forbidden(s), [], '잡으면 안 돼요: ' + s);
    eq(errsOf(Object.assign({}, OK, { what: s })), [], '형식 검사도 통과: ' + s);
  });
  hasErr(errsOf(Object.assign({}, OK, { what: '전문가 감수를 받았어요.' })), '금지');
});

test('validate(): 배열이 아니거나, 순서가 틀리거나, 중복이면 오류', function () {
  hasErr(C.validate({}, OPTS).errors, '배열');
  const older = { date: '2026-10-24', kind: 'new', slug: 'missed-dose', what: '약을 빠뜨렸을 때 할 일을 정리했어요.' };
  hasErr(C.validate([older, OK], OPTS).errors, '순서');
  eq(C.validate([OK, older], OPTS).errors, []);
  const dup = Object.assign({}, OK, { kind: 'enrich', what: '같은 날 같은 글을 또 적었어요.' });
  hasErr(C.validate([OK, dup], OPTS).errors, '중복');
  const f1 = { date: '2026-10-24', kind: 'feature', title: '읽기 코스', what: '읽을 순서를 코스로 묶었어요.' };
  hasErr(C.validate([f1, Object.assign({}, f1, { what: '같은 기능을 또 적었어요.' })], OPTS).errors, '중복');
  /* 날짜가 다르면 같은 글이어도 괜찮아요 */
  eq(C.validate([OK, Object.assign({}, OK, { date: '2026-10-24' })], OPTS).errors, []);
  /* 오류 문구에 몇 번째 항목인지 들어가요 */
  hasErr(C.validate([OK, { date: 'x', kind: 'fix', slug: 'treatment-resistant', what: '날짜가 틀렸어요.' }], OPTS).errors, '2번째');
});

/* ---------- 정렬·정리 ---------- */
test('sortEntries(): 날짜 내림차순 → 종류(새 글·보강·바로잡음·기능) → 글·기능 이름, 원본은 그대로', function () {
  const list = [
    { date: '2026-10-24', kind: 'fix', slug: 'b-slug', what: 'x' },
    { date: '2026-10-25', kind: 'feature', title: '기능', what: 'x' },
    { date: '2026-10-25', kind: 'fix', slug: 'z-slug', what: 'x' },
    { date: '2026-10-25', kind: 'fix', slug: 'a-slug', what: 'x' },
    { date: '2026-10-25', kind: 'new', slug: 'm-slug', what: 'x' },
    { date: '2026-10-25', kind: 'enrich', slug: 'k-slug', what: 'x' },
    { date: '2026-11-01', kind: 'fix', slug: 'q-slug', what: 'x' }
  ];
  const before = JSON.stringify(list);
  const s = C.sortEntries(list);
  eq(JSON.stringify(list), before, '원본을 바꾸지 않아요');
  eq(s.map(function (e) { return e.date + ' ' + e.kind + ' ' + (e.slug || e.title); }), [
    '2026-11-01 fix q-slug', '2026-10-25 new m-slug', '2026-10-25 enrich k-slug', '2026-10-25 fix a-slug',
    '2026-10-25 fix z-slug', '2026-10-25 feature 기능', '2026-10-24 fix b-slug'
  ]);
  eq(C.sortEntries(s), s, '두 번 정렬해도 같아요');
  eq(C.sortEntries(null), []);
  eq(C.KINDS, ['new', 'enrich', 'fix', 'feature']);
});

test('normalize(): 같은 날 같은 글은 하나로(종류는 새 글 > 보강 > 바로잡음, what 은 이어 붙임), 정렬까지', function () {
  const a = { date: '2026-10-25', kind: 'fix', slug: 'lai', what: '허가 조건을 바로잡았어요.' };
  const b = { date: '2026-10-25', kind: 'enrich', slug: 'lai', what: '급여 시점을 더했어요.' };
  const c = { date: '2026-10-25', kind: 'fix', slug: 'lai', what: '허가 조건을 바로잡았어요.' };
  const d = { date: '2026-11-01', kind: 'fix', slug: 'eps', what: '약 이름을 바로잡았어요.' };
  const out = C.normalize([a, b, d, c]);
  eq(out.length, 2);
  eq(out[0], d);
  eq(out[1], { date: '2026-10-25', kind: 'enrich', slug: 'lai', what: '허가 조건을 바로잡았어요. 급여 시점을 더했어요.' });
  eq(C.duplicates([a, b, d, c]), ['2026-10-25|lai']);
  eq(C.duplicates(out), []);
  ok(a.kind === 'fix' && a.what === '허가 조건을 바로잡았어요.', '원본을 바꾸지 않아요');
});

test('forSlug()·recent()·groupByDate()·날짜 글자', function () {
  const list = C.sortEntries([
    { date: '2026-10-24', kind: 'new', slug: 'lai', what: '1' }, { date: '2026-10-25', kind: 'fix', slug: 'lai', what: '2' },
    { date: '2026-10-25', kind: 'fix', slug: 'eps', what: '3' }, { date: '2026-11-01', kind: 'enrich', slug: 'lai', what: '4' },
    { date: '2026-11-02', kind: 'fix', slug: 'lai', what: '5' }, { date: '2026-11-03', kind: 'fix', slug: 'lai', what: '6' },
    { date: '2026-11-04', kind: 'fix', slug: 'lai', what: '7' }
  ]);
  eq(C.forSlug(list, 'lai', 5).map(function (e) { return e.what; }), ['7', '6', '5', '4', '2']);
  eq(C.forSlug(list, 'eps').map(function (e) { return e.what; }), ['3']);
  eq(C.forSlug(list, 'none'), []);
  eq(C.recent(list, 2).map(function (e) { return e.what; }), ['7', '6']);
  const g = C.groupByDate(C.recent(list, 10));
  eq(g.map(function (x) { return x.date + ':' + x.items.length; }), ['2026-11-04:1', '2026-11-03:1', '2026-11-02:1', '2026-11-01:1', '2026-10-25:2', '2026-10-24:1']);
  eq(C.fmtDay('2026-10-05'), '2026년 10월 5일');
  eq(C.fmtDot('2026-10-05'), '2026.10.05');
  eq(C.KIND_LABEL, { new: '새 글', enrich: '보강', fix: '바로잡음', feature: '기능' });
});

/* ---------- 화면 ---------- */
function fakeCtx(list, articles) {
  return { data: { changes: list }, esc: md.esc, articles: articles || {}, sections: [{ id: '7', hue: 300 }], page: readJson('data/pages/changes.json') };
}
test('staticHtml(): 최근 50개를 날짜 묶음으로, 종류 표시와 글 링크, 더 오래된 기록 안내', function () {
  const list = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(2026, 9, 1 + Math.floor(i / 3));
    list.push({ date: ymd(d), kind: i % 2 ? 'fix' : 'new', slug: 'slug-' + String(i).padStart(2, '0'), what: '항목 ' + i + '을 고쳤어요.' });
  }
  const html = page.staticHtml(fakeCtx(list, { 'slug-59': { slug: 'slug-59', title: '맨 끝 글', section: '7' } }));
  eq((html.match(/<li class="pg-changes-item/g) || []).length, 50);
  has(html, 'href="#/a/slug-59"');
  has(html, '맨 끝 글');
  has(html, 'style="--h:300"', '분류 색 막대');
  has(html, '바로잡음');
  has(html, '새 글');
  has(html, '<noscript>');
  has(html, '2026년 10월 20일');
  /* 가장 최근 날짜가 맨 앞 */
  ok(html.indexOf('2026-10-20') < html.indexOf('2026-10-19'), '날짜 내림차순');
  /* 10월 4일의 세 항목은 새 글(slug-10) → 바로잡음(slug-09, slug-11) 순이라 50번째가 slug-09 예요 */
  has(html, 'href="#/a/slug-09"');
  not(html, 'slug-11"', '50개 밖의 오래된 기록은 정적 HTML 에 없어요');
  not(html, 'slug-00"', '50개 밖의 오래된 기록은 정적 HTML 에 없어요');
});

test('staticHtml(): 글자는 모두 이스케이프하고, 자료가 비거나 이상해도 글자를 돌려준다', function () {
  const bad = [{ date: '2026-10-25', kind: 'fix', slug: 'x"><script>alert(1)</script>', what: '<img src=x onerror=alert(1)>요.' },
    { date: '2026-10-25', kind: 'feature', title: '<b>기능</b>', what: '기능을 더했어요.' }];
  const html = page.staticHtml(fakeCtx(bad));
  not(html, '<script>');
  not(html, '<img');
  not(html, '<b>기능');
  has(html, '&lt;b&gt;기능');
  [undefined, null, {}, 'x', [null, 1, { date: 'nope' }]].forEach(function (v) {
    const h = page.staticHtml({ data: { changes: v }, esc: md.esc, articles: {}, sections: [], page: {} });
    eq(typeof h, 'string');
  });
  has(page.staticHtml({ data: {}, esc: md.esc, articles: {}, sections: [], page: {} }), '아직');
});

test('선언: data/pages/changes.json', function () {
  const d = readJson('data/pages/changes.json');
  eq(d.id, 'changes');
  eq(d.title, '고침 기록');
  eq(d.group, '안내');
  eq(d.nav, ['side', 'palette']);
  eq(d.robots, 'index');
  eq(d.notice, ['general']);
  eq(d.data, ['changes']);
  eq(d.lead, '이 백과는 AI가 초안을 쓰고 출처를 확인한 글이에요. 전문가 감수는 없어요. 고친 내용을 여기에 남겨요.');
  ok(d.crisisLine !== false);
  ok(d.summary.length <= 155);
  eq(page.id, 'changes');
});

/* ---------- 믿음 장치 ---------- */
test('trust: 출처 확인일은 YYYY-MM-DD 이고 달력에 있는 날만, 표시는 "출처 확인 YYYY.MM.DD"', function () {
  eq(trust.reviewedOf({ reviewed: '2026-11-13' }), '2026-11-13');
  eq(trust.reviewedOf({ reviewed: ' 2026-11-13 ' }), '2026-11-13');
  [{}, null, { reviewed: '' }, { reviewed: '2026-02-30' }, { reviewed: '2026.11.13' }, { reviewed: 20261113 }, { reviewed: '2026-11-13 확인' }].forEach(function (m) {
    eq(trust.reviewedOf(m), null, JSON.stringify(m));
  });
  eq(trust.reviewedLine('2026-11-13'), '출처 확인 2026.11.13');
  eq(trust.TEXT.def, 'AI 작업자가 이 글의 출처를 다시 열어 본문과 대조한 날이에요. 전문가 감수가 아니에요.');
});

test('trust: 이 글의 고친 내역은 그 글만, 최신순 5개, 전체 수와 함께', function () {
  const list = [];
  for (let i = 1; i <= 7; i++) list.push({ date: '2026-10-' + String(10 + i), kind: 'fix', slug: 'lai', what: 'w' + i });
  list.push({ date: '2026-10-30', kind: 'fix', slug: 'eps', what: 'other' });
  list.push({ date: '2026-10-30', kind: 'feature', title: '기능', what: 'feat' });
  const h = trust.historyFor(list, 'lai');
  eq(h.total, 7);
  eq(h.items.map(function (e) { return e.what; }), ['w7', 'w6', 'w5', 'w4', 'w3']);
  eq(trust.historyFor(list, 'none'), { total: 0, items: [] });
  eq(trust.historyFor(null, 'lai'), { total: 0, items: [] });
  eq(trust.historyFor([null, 3, { slug: 'lai' }, { slug: 'lai', date: '2026-10-01', kind: 'fix', what: 'ok' }], 'lai').total, 1, '이상한 항목은 건너뛰어요');
  eq(trust.LIMIT, 5);
});

test('trust: 종류 이름·정렬이 고침 기록 화면과 같고, 약속·감수 문구가 없다', function () {
  eq(trust.KIND_LABEL, C.KIND_LABEL);
  const list = C.sortEntries(DATA);
  const slug = (DATA.filter(function (e) { return e.slug; })[0] || {}).slug;
  eq(trust.historyFor(DATA, slug).items, C.forSlug(list, slug, 5));
  const visible = JSON.stringify(trust.TEXT) + JSON.stringify(trust.KIND_LABEL);
  not(visible, '예정');
  not(visible, '감수를 받');
  not(visible, '검토 완료');
  has(trust.TEXT.def, '전문가 감수가 아니에요');
});

test('외부 주소·외부 요청 없음(화면 코드·스타일)', function () {
  ['js/pages/changes.js', 'js/ui/trust.js', 'css/pages/changes.css', 'css/ui/trust.css'].forEach(function (rel) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    not(src, 'http://', rel);
    not(src, 'https://', rel);
    not(src, 'fetch(', rel);
    not(src, 'localStorage', rel);
  });
  /* 스타일 선택자는 자기 접두어만 */
  const css1 = fs.readFileSync(path.join(ROOT, 'css/ui/trust.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{[^}]*\}/g, '{}');
  (css1.match(/\.[a-zA-Z][\w-]*/g) || []).forEach(function (c) { ok(/^\.trust-|^\.doc-slot$|^\.on$/.test(c), 'trust.css 선택자 접두어: ' + c); });
  const css2 = fs.readFileSync(path.join(ROOT, 'css/pages/changes.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{[^}]*\}/g, '{}');
  (css2.match(/\.[a-zA-Z][\w-]*/g) || []).forEach(function (c) { ok(/^\.pg-changes-|^\.spine$|^\.btn$|^\.fp-body$/.test(c), 'changes.css 선택자 접두어: ' + c); });
});
