/* 특집 화면 선언(data/pages/<id>.json)과 지식 데이터(data/kb/*.json)를 검사하고 data/pages.js 를 만든다.
   실행: node tools/build-kb.cjs   (규칙 위반·중복·summary 155자 초과·깨진 JSON 이면 종료 코드 1)
   규칙은 tools/lib/assets.cjs 의 validateDecl(), 형식 요약은 data/pages/README.md */
const fs = require('fs'), path = require('path');
const A = require('./lib/assets.cjs');

const r = A.pageDecls();
const kbErrors = A.kbCheck();
r.warnings.forEach(function (w) { console.warn('주의: ' + w); });
const errors = r.errors.concat(kbErrors);
if (errors.length) {
  errors.forEach(function (e) { console.error('오류: ' + e); });
  console.error('특집 화면 선언 오류 ' + errors.length + '건 — data/pages.js 를 쓰지 않았어요');
  process.exit(1);
}
fs.writeFileSync(path.join(A.ROOT, 'data', 'pages.js'), A.pagesJs(r.pages));
console.log('특집 화면 ' + r.pages.length + '개' + (r.pages.length ? '(' + r.pages.map(function (p) { return p.id; }).join(', ') + ')' : '') + ', 지식 데이터 ' + A.kbFiles().length + '개 → data/pages.js');
