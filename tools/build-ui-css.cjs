/* css/ui/*.css 를 css/ui.css 하나로 이어 붙인다(요청 수를 줄이기 위해). 실행: node tools/build-ui-css.cjs
   내용은 tools/lib/assets.cjs 의 uiCss() 가 만든다(개발 서버 serve.cjs 도 같은 함수로 즉석에서 만든다). */
const fs = require('fs'), path = require('path');
const A = require('./lib/assets.cjs');
fs.writeFileSync(path.join(A.ROOT, 'css', 'ui.css'), A.uiCss());
console.log('css/ui.css <- ' + A.uiCssFiles().join(', '));
