/* 스크립트 묶음 만들기: css/ui.css 처럼 여러 파일을 이어 붙인 생성 파일 두 개를 만든다(정적 페이지가 싣는 것). 실행: node tools/build-ui-js.cjs
   - js/core.js : 모든 화면의 자료와 코어 코드(tools/lib/assets.cjs 의 CORE_DATA → CORE_JS, 지금 실행 순서 그대로)
   - js/ui.js   : 화면 확장 모듈 js/ui/*.js(tools/ui-order.json 순서 + 나머지 이름순, 개발 서버가 싣는 낱개 순서와 같음)
   파일마다 따로 감싸서(한 파일의 예외가 뒤 파일을 멈추지 않게) 이어 붙이고, 문법 오류·최상위 선언은 어느 파일인지 알리고 종료 코드 1.
   개발 서버(serve.cjs)는 이 묶음 대신 낱개 파일을 싣는다(빌드 없이 보기). 묶음 그대로 시험하려면 RAW=1 node serve.cjs.
   data/pages.js 를 넣으므로 build-kb 다음에, 정적 페이지(build-pages) 앞에 돈다(tools/build-all.cjs). 두 파일은 손으로 고치지 않는다. */
const fs = require('fs');
const path = require('path');
const A = require('./lib/assets.cjs');

const jobs = [
  { out: A.BUNDLES.core, files: A.coreFiles() },
  { out: A.BUNDLES.ui, files: A.uiModules() }
];
let bad = 0;
const written = [];
jobs.forEach(function (j) {
  const r = A.bundle(j.files);
  if (r.errors.length) { r.errors.forEach(function (e) { console.error('오류: ' + e); }); bad++; return; }
  written.push({ out: j.out, text: r.text, n: j.files.length });
});
if (bad) { console.error('묶음을 만들지 않았어요(위 파일을 고치고 다시 돌려 주세요)'); process.exit(1); }
written.forEach(function (w) {
  fs.writeFileSync(path.join(A.ROOT, w.out), w.text);
  console.log(w.out + ' <- 파일 ' + w.n + '개, ' + Buffer.byteLength(w.text).toLocaleString('en-US') + '바이트');
});
