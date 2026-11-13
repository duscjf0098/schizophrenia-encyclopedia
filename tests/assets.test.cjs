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

test('uiCss(): css/ui/*.css 를 모두 담는다', function () {
  const css = A.uiCss();
  A.uiCssFiles().forEach(function (f) { has(css, '/* ===== ' + f + ' ===== */'); });
});
