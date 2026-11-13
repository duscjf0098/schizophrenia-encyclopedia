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
