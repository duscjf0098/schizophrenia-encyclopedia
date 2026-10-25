/* css/ui/*.css 를 css/ui.css 하나로 이어 붙인다(요청 수를 줄이기 위해). 실행: node tools/build-ui-css.cjs */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'css', 'ui');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(function (f) { return /\.css$/.test(f); }).sort() : [];
const out = ['/* 자동 생성: tools/build-ui-css.cjs 가 css/ui/*.css 를 이 순서로 이어 붙인다. 직접 고치지 않는다. */'];
files.forEach(function (f) { out.push('\n/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(dir, f), 'utf8')); });
fs.writeFileSync(path.join(__dirname, '..', 'css', 'ui.css'), out.join('\n'));
console.log('css/ui.css <- ' + files.join(', '));
