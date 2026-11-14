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

/* ---------- F1 스크립트 묶음(js/core.js·js/ui.js)과 화면별 자료 ---------- */
test('F1 코어 목록: 지금 실행 순서 그대로, 위기 감지·위기 카드는 앱·모듈보다 먼저, 늦게 받는 자료(about·links)는 빠짐', function () {
  const list = A.coreFiles();
  eq(list, ['data/sections.js', 'data/toc.js', 'data/glossary.js', 'data/synonyms.js', 'data/crisis-card.js', 'data/courses.js', 'data/pages.js',
    'js/util.js', 'js/paths.js', 'js/md.js', 'js/search.js', 'js/gloss.js', 'js/synonyms.js', 'js/crisis.js', 'js/progress.js', 'js/app.js']);
  ok(list.indexOf('js/crisis.js') < list.indexOf('js/app.js') && list.indexOf('data/crisis-card.js') < list.indexOf('js/app.js'));
  eq(A.LAZY_DATA, ['data/about.js', 'data/links.js']);
  A.LAZY_DATA.forEach(function (f) { ok(list.indexOf(f) < 0, f); });
  list.forEach(function (f) { ok(fs.existsSync(path.join(__dirname, '..', f)), f + ' 가 있음'); });
});

test('F1 스크립트 줄: 정적 페이지는 묶음 둘(js/core.js → js/ui.js), 개발 서버는 낱개. 문서 화면만 앱 뒤에 data/links.js', function () {
  const b = A.coreScriptsHtml('../../', 'a/x', { bundle: true });
  has(b, '<script src="../../js/core.js"></script>\n<script src="../../data/links.js"></script>');
  not(A.coreScriptsHtml('', '', { bundle: true }), 'links.js', '첫 화면');
  not(A.coreScriptsHtml('../', 's/7', { bundle: true }), 'links.js', '분류');
  not(A.coreScriptsHtml('../../', 'course/x', { bundle: true }), 'links.js');
  const dev = A.coreScriptsHtml('../../', 'a/x');
  ok(dev.indexOf('js/crisis.js') < dev.indexOf('js/app.js') && dev.indexOf('js/app.js') < dev.indexOf('data/links.js'), dev);
  not(dev, 'js/core.js');
  eq(A.uiScriptsHtml('../', { bundle: true }), '\n<script src="../js/ui.js"></script>\n');
  /* 개발 서버: 표식 사이를 낱개로, data-route 에 따라 문서 자료 */
  const html = '<html data-base="../../" data-route="a/x"><!--core:start--><script src="../../js/core.js"></script>\n<script src="../../data/links.js"></script><!--core:end--><!--ui:start--><script src="../../js/ui.js"></script><!--ui:end-->';
  const out = A.applyShellMarkers(html, '../../', []);
  has(out, '<script src="../../js/util.js"></script>');
  has(out, '<script src="../../data/links.js"></script>');
  has(out, '<script src="../../js/ui/palette.js"></script>');
  not(out, 'js/core.js'); not(out, 'js/ui.js"');
  not(A.applyShellMarkers(html.replace('data-route="a/x"', 'data-route=""'), '', []), 'links.js', '문서 화면이 아니면 없음');
  /* 틀(tools/shell.html)에 두 표식이 앱 스크립트 자리에 있고, 낱개 자료·코어 줄은 남지 않음 */
  const shell = fs.readFileSync(path.join(__dirname, '..', 'tools', 'shell.html'), 'utf8');
  has(shell, '<!--core:start-->{{CORE_SCRIPTS}}<!--core:end-->\n<!--ui:start-->{{UI_SCRIPTS}}<!--ui:end-->');
  not(shell, 'data/about.js'); not(shell, 'data/links.js'); not(shell, 'js/app.js');
});

/* 묶음을 vm 에서 돌려 본다(브라우저처럼 window = 전역, setTimeout 으로 다시 던진 예외는 모아 둠) */
function runBundle(text) {
  const vm = require('vm');
  const thrown = [];
  const sb = { setTimeout: function (f) { try { f(); } catch (e) { thrown.push(e.message); } } };
  sb.window = sb;
  vm.runInNewContext(text, sb);
  return { sb: sb, thrown: thrown };
}
function tmpFiles(files) {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'jhb-f1-'));
  Object.keys(files).forEach(function (n) { fs.mkdirSync(path.dirname(path.join(tmp, n)), { recursive: true }); fs.writeFileSync(path.join(tmp, n), files[n]); });
  return tmp;
}
test('F1 묶음: 파일마다 따로 감싸서 앞 파일의 최상위 예외가 뒤 파일을 멈추지 않고, 순서와 전역(JHB.*)은 그대로', function () {
  const root = tmpFiles({
    'a.js': 'window.JHB = window.JHB || {};\nJHB.order = ["a"];',
    'b.js': '(function () { JHB.order.push("b"); throw new Error("b 가 죽음"); })();',
    'c.js': "(function () {\n  'use strict';\n  JHB.order.push('c'); JHB.c = { ok: true };\n})();\n// 마지막 줄 주석"
  });
  const r = A.bundle(['a.js', 'b.js', 'c.js'], { root: root });
  eq(r.errors, []);
  has(r.text, '/* ===== b.js ===== */');
  const run = runBundle(r.text);
  eq(run.sb.JHB.order, ['a', 'b', 'c'], '실행 순서');
  eq(run.sb.JHB.c, { ok: true }, 'b 가 던져도 c 는 실행됨(전역 이름도 그대로)');
  eq(run.thrown, ['b 가 죽음'], '예외는 다시 던져져 콘솔·onerror 에 보임');
});

test('F1 묶음: 문법 오류·최상위 선언(감싸면 전역에서 사라짐)·없는 파일은 어느 파일인지 알리고 묶지 않음', function () {
  const root = tmpFiles({ 'ok.js': 'window.x = 1;', 'bad.js': 'function (', 'top.js': 'var leaked = 1;\nfunction helper() {}' });
  const r = A.bundle(['ok.js', 'bad.js', 'top.js', 'none.js'], { root: root });
  eq(r.errors.length, 3, JSON.stringify(r.errors));
  ok(/^bad\.js: 문법 오류/.test(r.errors[0]), r.errors[0]);
  ok(/^top\.js: 최상위 선언 "leaked"/.test(r.errors[1]), r.errors[1]);
  ok(/^none\.js: 파일을 읽지 못했어요/.test(r.errors[2]), r.errors[2]);
  eq(A.topLevelDecl('(function () {\n  var a = 1;\n  function f() {}\n})();'), null, '즉시 실행 함수 안은 괜찮음');
});

test('F1 묶음: 지금 파일들(코어 16개·모듈 전부)은 모두 묶을 수 있다(문법·최상위 선언 없음)', function () {
  const core = A.bundle(A.coreFiles());
  eq(core.errors, []);
  const ui = A.bundle(A.uiModules());
  eq(ui.errors, []);
  A.uiModules().forEach(function (f) { has(ui.text, '/* ===== ' + f + ' ===== */'); });
  ok(ui.text.indexOf('js/ui/palette.js') < ui.text.indexOf('js/ui/shelf.js'), 'ui-order 순서');
  eq(A.BUNDLES, { core: 'js/core.js', ui: 'js/ui.js' });
});

test('F1 build-all: 묶음 단계(build-ui-js)는 모듈 css 다음, 정적 페이지 앞', function () {
  const src = fs.readFileSync(path.join(__dirname, '..', 'tools', 'build-all.cjs'), 'utf8');
  has(src, "'build-kb', 'build-index', 'build-links', 'build-ui-css', 'build-ui-js', 'build-pages'");
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

/* ---------- K8 고지 날짜: dated = 선언의 updated(사람이 원천과 대조해 확인한 날), revised = 자료에서 구한 마지막으로 고친 날(사이트맵과 같은 날) ---------- */
test('K8 noticeDate: dated 는 lastmod 를 따르지 않고 선언의 updated, revised 는 pageDate(사이트맵과 같은 날)', function () {
  const d = { notice: ['general', 'dated', 'revised'], lastmod: 'kb:meds:updated', updated: '2026-11-01' };
  const data = [{ updated: '2026-11-10' }, { updated: '2026-11-12' }];
  eq(PR.noticeDate('dated', d, data), '2026-11-01', 'dated: 자료가 더 최근이어도 선언의 updated');
  eq(PR.noticeDate('revised', d, data), '2026-11-12', 'revised: 자료에서 구한 가장 최근 날');
  eq(PR.noticeDate('revised', d, data), PR.pageDate(d, data), 'revised = 사이트맵 날짜 규칙');
  eq(PR.noticeDate('revised', d, undefined), '2026-11-01', '자료를 아직 못 받았으면 updated');
  eq(PR.noticeDate('revised', d, [{ updated: 'x' }]), '2026-11-01', '자료에 날짜가 없으면 updated');
  eq(PR.noticeDate('revised', { updated: '2026-11-03' }, data), '2026-11-03', 'lastmod 가 없으면 updated');
  eq(PR.noticeDate('revised', { lastmod: 'kb:meds:updated' }, data), '2026-11-12', 'updated 없이 lastmod 만');
  eq(PR.noticeDate('revised', { lastmod: 'kb:meds:updated' }, undefined), '', '둘 다 없으면 빈 글자(고지가 빠짐)');
  eq(PR.noticeDate('dated', { lastmod: 'kb:meds:updated' }, data), '', 'dated 는 자료 날짜로 채우지 않음');
  ['general', 'crisis', 'emergency', 'device', 'nope', undefined].forEach(function (k) { eq(PR.noticeDate(k, d, data), '', String(k)); });
  eq(PR.noticeDate('dated', null, data), '');
  eq(PR.noticeDate('revised', null, data), '');
});

test('K8 noticeRef: 그리기 전에 받을 자료는 고지에 revised 가 있고 lastmod 가 있을 때만', function () {
  eq(PR.noticeRef({ notice: ['general', 'revised'], lastmod: 'kb:meds:updated' }), { name: 'meds', path: 'updated' });
  eq(PR.noticeRef({ notice: ['general', 'emergency', 'revised'], lastmod: 'kb:red-flags:source.updated' }), { name: 'red-flags', path: 'source.updated' });
  eq(PR.noticeRef({ notice: ['general', 'dated'], lastmod: 'kb:meds:updated' }), null, 'dated 는 자료를 기다리지 않음');
  eq(PR.noticeRef({ notice: ['general'], lastmod: 'kb:changes:date' }), null, '사이트맵만 쓰는 lastmod');
  eq(PR.noticeRef({ notice: ['general', 'revised'], updated: '2026-11-14' }), null, 'lastmod 가 없으면 받을 것 없음');
  eq(PR.noticeRef({ notice: ['revised'], lastmod: 'bad' }), null);
  eq(PR.noticeRef({ lastmod: 'kb:meds:updated' }), null);
  eq(PR.noticeRef(null), null);
});

test('K8 고지 종류 목록: 빌드 검사(assets)와 문구(md)가 같은 종류를 안다', function () {
  const md = require('../js/md.js');
  eq(A.NOTICE_KINDS.slice().sort(), md.NOTICE_KINDS.slice().sort());
  ok(A.NOTICE_KINDS.indexOf('revised') >= 0);
});

test('K8 assets.resolveNoticeDate: 빌드도 같은 규칙(dated = updated, revised = resolveLastmod)', function () {
  const tmp = kbRoot({ log: JSON.stringify([{ date: '2026-10-25' }, { date: '2026-11-12' }]), broken: '[{' });
  try {
    const o = { root: tmp };
    const both = A.normalizeDecl({ id: 'guide', title: 't', summary: 's', group: '안내', notice: ['dated', 'revised'], lastmod: 'kb:log:date', updated: '2026-11-01' }, o);
    eq(A.resolveNoticeDate(both, 'dated', o), '2026-11-01', 'dated 는 선언의 updated');
    eq(A.resolveNoticeDate(both, 'revised', o), '2026-11-12', 'revised 는 자료 날짜');
    eq(A.resolveNoticeDate(both, 'revised', o), A.resolveLastmod(both, o), 'revised = 사이트맵 날짜');
    eq(A.resolveNoticeDate(both, 'general', o), '');
    const gone = A.normalizeDecl({ id: 'guide', title: 't', summary: 's', group: '안내', notice: ['revised'], lastmod: 'kb:nope:date', updated: '2026-11-01' }, o);
    eq(A.resolveNoticeDate(gone, 'revised', o), '2026-11-01', '자료가 없으면 updated');
    const bad = A.normalizeDecl({ id: 'guide', title: 't', summary: 's', group: '안내', notice: ['revised'], lastmod: 'kb:broken:date', updated: '2026-11-02' }, o);
    eq(A.resolveNoticeDate(bad, 'revised', o), '2026-11-02', '깨진 자료면 updated');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('K8 실제 선언: meds·red-flags 는 revised(자료 날짜), guide 는 dated(선언의 updated), 사이트맵 날짜는 그대로', function () {
  const root = path.join(__dirname, '..'), o = { root: root };
  function decl(id) { return A.normalizeDecl(JSON.parse(A.stripBom(fs.readFileSync(path.join(root, 'data/pages/' + id + '.json'), 'utf8'))), o); }
  const meds = decl('meds'), rf = decl('red-flags'), guide = decl('guide');
  eq(meds.notice, ['general', 'revised']);
  eq(rf.notice, ['general', 'emergency', 'revised']);
  eq(guide.notice, ['general', 'dated']);
  const medsData = JSON.parse(A.stripBom(fs.readFileSync(path.join(root, 'data/kb/meds.json'), 'utf8')));
  eq(A.resolveNoticeDate(meds, 'revised', o), medsData.map(function (m) { return m.updated; }).sort().pop(), 'meds: 약 글의 가장 최근 고친 날');
  const rfData = JSON.parse(A.stripBom(fs.readFileSync(path.join(root, 'data/kb/red-flags.json'), 'utf8')));
  eq(rf.lastmod, 'kb:red-flags:source.updated');
  eq(A.resolveNoticeDate(rf, 'revised', o), rfData.source.updated, 'red-flags: 원천 글의 표가 고쳐진 날');
  eq(A.resolveLastmod(rf, o), rfData.source.updated, '사이트맵도 원천 글의 날짜');
  eq(A.resolveNoticeDate(guide, 'dated', o), guide.updated, 'guide: 연락처를 확인한 날(선언)');
  /* 사이트맵 날짜 규칙은 바뀌지 않음: lastmod → updated */
  ['meds', 'red-flags', 'guide', 'changes'].forEach(function (id) {
    const d = decl(id);
    eq(A.resolveLastmod(d, o), PR.pageDate(d, d.lastmod ? JSON.parse(A.stripBom(fs.readFileSync(path.join(root, 'data/kb/' + PR.lastmodRef(d.lastmod).name + '.json'), 'utf8'))) : undefined), id);
  });
});
