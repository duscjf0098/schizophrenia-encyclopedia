/* 화면 확장 모듈 자동 포함(tools/lib/assets.cjs) 테스트 */
const fs = require('fs');
const path = require('path');
const A = require('../tools/lib/assets.cjs');
const OLD = ['palette', 'preview', 'mobile', 'sticky', 'reading', 'settings', 'polish', 'home', 'shelf'];

test('uiModules(): 기존 9개를 지금 순서로 맨 앞에 둔다', function () {
  const list = A.uiModules();
  eq(list.slice(0, 9), OLD.map(function (n) { return 'js/ui/' + n + '.js'; }));
});

test('uiModules(): js/ui 의 모든 파일이 한 번씩, 새 모듈은 이름순으로 뒤에', function () {
  const list = A.uiModules();
  const files = fs.readdirSync(path.join(__dirname, '..', 'js', 'ui')).filter(function (f) { return /\.js$/.test(f); });
  eq(list.length, files.length);
  eq(new Set(list).size, list.length);
  const rest = list.slice(9);
  eq(rest, rest.slice().sort());
});

test('tools/ui-order.json 은 지금 순서 그대로', function () {
  eq(A.uiOrder(), OLD);
});

test('uiScriptsHtml(): 기준 경로를 붙이고 {{BASE}} 글자도 그대로 받는다', function () {
  has(A.uiScriptsHtml('../../'), '<script src="../../js/ui/palette.js"></script>');
  has(A.uiScriptsHtml('{{BASE}}'), '<script src="{{BASE}}js/ui/shelf.js"></script>');
});

test('applyShellMarkers(): 표식 사이만 바꾼다', function () {
  const html = '<a>앞</a><!--ui:start--><script src="옛.js"></script><!--ui:end--><!--top:start-->옛 링크<!--top:end--><b>뒤</b>';
  const out = A.applyShellMarkers(html, '', []);
  has(out, '<a>앞</a><!--ui:start-->');
  has(out, '<script src="js/ui/palette.js"></script>');
  not(out, '옛.js');
  not(out, '옛 링크');
  has(out, 'data-r="glossary"');
  has(out, '<!--top:end--><b>뒤</b>');
});

test('footLinksHtml(): 이 백과에 대해 + (고침 기록 화면이 있을 때만) 고침 기록', function () {
  const none = A.footLinksHtml([], '../');
  has(none, '<a href="../about/">이 백과에 대해</a>');
  not(none, 'changes/');
  const some = A.footLinksHtml([{ id: 'changes', title: '고침 기록', label: '고침 기록' }], '');
  has(some, '<a href="about/">이 백과에 대해</a>');
  has(some, '<a href="changes/">고침 기록</a>');
  ok(some.indexOf('about/') < some.indexOf('changes/'), '이 백과에 대해 옆(뒤)에');
});

test('applyShellMarkers(): 바닥 링크 표식도 지금 선언 기준으로 바꾼다', function () {
  const html = '<p><!--foot:start--><a href="about/">옛</a><!--foot:end--></p>';
  const out = A.applyShellMarkers(html, '../', [{ id: 'changes', title: '고침 기록' }]);
  has(out, '<!--foot:start--><a href="../about/">이 백과에 대해</a>');
  has(out, '<a href="../changes/">고침 기록</a><!--foot:end-->');
  not(out, '>옛<');
  eq(A.applyShellMarkers('<p>표식 없음</p>', '', []), '<p>표식 없음</p>', '표식이 없는 옛 HTML 은 그대로');
});

test('uiCss(): css/ui/*.css 를 모두 담는다', function () {
  const css = A.uiCss();
  A.uiCssFiles().forEach(function (f) { has(css, '/* ===== ' + f + ' ===== */'); });
});

/* ---------- K5-3 사이트맵 날짜·"확인한 내용" 고지 날짜(한 규칙: js/progress.js 의 latestDate·pageDate) ---------- */
const os = require('os');
const PR = require('../js/progress.js');
function kbRoot(files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jhb-k5-'));
  fs.mkdirSync(path.join(tmp, 'data', 'kb'), { recursive: true });
  Object.keys(files).forEach(function (n) { fs.writeFileSync(path.join(tmp, 'data', 'kb', n + '.json'), files[n]); });
  return tmp;
}
function decl(lastmod, updated) { return A.normalizeDecl({ id: 'guide', title: '길잡이', summary: '요약', group: '안내', lastmod: lastmod, updated: updated }, { root: path.join(__dirname, '..') }); }

test('K5-3 latestDate: 배열이면 항목마다 경로를 따라가 가장 최근 날짜', function () {
  eq(PR.latestDate([{ date: '2026-10-25' }, { date: '2026-11-12' }, { date: '2026-11-03' }], 'date'), '2026-11-12');
  eq(PR.latestDate([null, 7, 'x', { date: '2026-01-02' }, {}], 'date'), '2026-01-02', '항목이 깨져도 던지지 않음');
  eq(PR.latestDate([], 'date'), '');
});

test('K5-3 latestDate: 배열이 아닌 자료의 점 경로(source.updated), 중간의 배열은 펼쳐 봄', function () {
  eq(PR.latestDate({ source: { updated: '2026-11-14' }, rows: [] }, 'source.updated'), '2026-11-14');
  eq(PR.latestDate({ rows: [{ at: { d: '2026-03-01' } }, { at: { d: '2026-05-01' } }] }, 'rows.at.d'), '2026-05-01');
  eq(PR.latestDate({ date: '2026-11-12' }, 'date'), '2026-11-12');
  eq(PR.latestDate([{ a: { b: '2025-12-31' } }, { a: { b: '2026-01-01' } }], 'a.b'), '2026-01-01');
});

test('K5-3 latestDate: 없는 경로·원형 이름·틀린 경로는 빈 글자', function () {
  eq(PR.latestDate({ source: {} }, 'source.updated'), '');
  eq(PR.latestDate({ source: { updated: '2026-11-14' } }, 'nope.updated'), '');
  eq(PR.latestDate({ source: { updated: '2026-11-14' } }, 'source'), '', '날짜가 아닌 객체');
  eq(PR.latestDate({}, '__proto__'), '');
  eq(PR.latestDate({}, 'constructor.name'), '', '원형의 값을 집지 않음');
  eq(PR.latestDate(null, 'date'), '');
  eq(PR.latestDate('2026-11-14', 'date'), '');
  eq(PR.latestDate({ date: '2026-11-14' }, ''), '');
  eq(PR.latestDate({ date: '2026-11-14' }, 'date.'), '');
});

test('K5-3 latestDate: 형식이 틀린 날짜·없는 날짜는 건너뜀', function () {
  ['2026-13-01', '2026-02-30', '2026-1-01', '2026-11-14T00:00', ' 2026-11-14', '2026.11.14', 20261114, true].forEach(function (v) {
    eq(PR.latestDate([{ date: v }], 'date'), '', JSON.stringify(v));
  });
  eq(PR.latestDate([{ date: '2026-02-30' }, { date: '2026-02-28' }], 'date'), '2026-02-28', '틀린 날짜가 더 커 보여도 고르지 않음');
  eq(PR.latestDate([{ date: '2024-02-29' }], 'date'), '2024-02-29', '윤년');
});

test('K5-3 lastmodRef·pageDate: 자료에서 구한 날짜 → 없으면 선언의 updated(자료를 아직 못 받았을 때도)', function () {
  eq(PR.lastmodRef('kb:red-flags:source.updated'), { name: 'red-flags', path: 'source.updated' });
  eq(PR.lastmodRef('kb:changes:date'), { name: 'changes', path: 'date' });
  ['', null, 'kb:x', 'kb:X:date', 'kb:x:.a', 'kb:x:a.', 'kb:x:a..b', 'kb:x:a-b', 'x:y:z', 7].forEach(function (v) { eq(PR.lastmodRef(v), null, JSON.stringify(v)); });
  const d = { lastmod: 'kb:meds:updated', updated: '2026-11-14' };
  eq(PR.pageDate(d, [{ updated: '2026-11-10' }, { updated: '2026-11-12' }]), '2026-11-12');
  eq(PR.pageDate(d, undefined), '2026-11-14', '자료를 아직 못 받음');
  eq(PR.pageDate(d, [{ updated: 'x' }]), '2026-11-14', '자료에 날짜가 없음');
  eq(PR.pageDate({ lastmod: '', updated: '2026-11-01' }, [{ updated: '2026-12-01' }]), '2026-11-01', 'lastmod 가 없으면 자료를 보지 않음');
  eq(PR.pageDate({}, undefined), '');
  eq(PR.pageDate(null, undefined), '');
});

test('K5-3 assets: 빌드(resolveLastmod)도 같은 함수를 쓰고, 배열이 아닌 자료의 점 경로를 읽는다', function () {
  eq(A.LASTMOD_RE, PR.LASTMOD_RE, '형식 규칙이 한 곳');
  const tmp = kbRoot({
    rf: JSON.stringify({ source: { updated: '2026-11-13' }, rows: [] }),
    log: JSON.stringify([{ date: '2026-10-25' }, { date: '2026-11-12' }, { date: '2026-02-30' }]),
    num: '7', broken: '[{', bad: JSON.stringify({ source: { updated: '2026-02-30' } })
  });
  try {
    const o = { root: tmp };
    eq(A.kbLastmod('rf', 'source.updated', o), { date: '2026-11-13' });
    eq(A.kbLastmod('log', 'date', o), { date: '2026-11-12' }, '배열 최댓값(없는 날짜 빼고)');
    eq(A.kbLastmod('rf', 'source.nope', o), { date: '' }, '없는 경로');
    ok(A.kbLastmod('num', 'date', o).error, '객체·배열이 아닌 자료는 오류');
    ok(A.kbLastmod('broken', 'date', o).error, '깨진 JSON');
    ok(A.kbLastmod('nope', 'date', o).error, '없는 파일');
    eq(A.resolveLastmod(decl('kb:rf:source.updated', '2026-11-01'), o), '2026-11-13');
    eq(A.resolveLastmod(decl('kb:rf:source.nope', '2026-11-01'), o), '2026-11-01', '없는 경로면 updated');
    eq(A.resolveLastmod(decl('kb:bad:source.updated', '2026-11-01'), o), '2026-11-01', '틀린 날짜면 updated');
    eq(A.resolveLastmod(decl('kb:nope:date', '2026-11-01'), o), '2026-11-01', '자료가 없으면 updated');
    eq(A.resolveLastmod(decl('kb:broken:date', '2026-11-01'), o), '2026-11-01', '깨진 자료면 updated');
    eq(A.validateDecl({ id: 'guide', title: 't', summary: 's', group: '안내', lastmod: 'kb:rf:source.updated' }, 'guide', o).errors, [], '점 경로 선언은 통과');
    ok(A.validateDecl({ id: 'guide', title: 't', summary: 's', group: '안내', lastmod: 'kb:num:date' }, 'guide', o).errors.length > 0, '숫자 자료는 선언 오류');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('K5-3 실제 자료: meds 의 사이트맵 날짜는 약 글 최신 updated, red-flags 의 source.updated 도 읽힌다', function () {
  const root = path.join(__dirname, '..');
  const meds = JSON.parse(A.stripBom(fs.readFileSync(path.join(root, 'data/kb/meds.json'), 'utf8')));
  const max = meds.map(function (m) { return m.updated; }).sort().pop();
  const md = JSON.parse(A.stripBom(fs.readFileSync(path.join(root, 'data/pages/meds.json'), 'utf8')));
  eq(A.resolveLastmod(A.normalizeDecl(md, { root: root }), { root: root }), max);
  const rf = JSON.parse(A.stripBom(fs.readFileSync(path.join(root, 'data/kb/red-flags.json'), 'utf8')));
  eq(A.kbLastmod('red-flags', 'source.updated', { root: root }), { date: rf.source.updated });
});
