/* 단위 테스트 실행기: node tests/run.cjs
   테스트 파일을 불러오다(require) 예외가 나면(모듈 없음·문법 오류·최상위에서 던짐) 그 파일을 FAIL 1건으로 세고
   파일 이름과 예외 글을 보여 준 뒤 다음 파일로 넘어가요(한 파일 때문에 뒤 테스트가 돌지 않던 문제, K5-5).
   JHB_TESTS_DIR: 다른 폴더의 *.test.cjs 를 돌려요(실행기 자체의 시험용, tests/core.test.cjs) */
const path = require('path');
const fs = require('fs');
const dir = process.env.JHB_TESTS_DIR ? path.resolve(process.env.JHB_TESTS_DIR) : __dirname;
const files = fs.readdirSync(dir).filter(function (f) { return /\.test\.cjs$/.test(f); }).sort();
let pass = 0, fail = 0;
global.test = function (name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + (e && e.message ? e.message : e)); }
};
global.eq = function (a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error((msg ? msg + ': ' : '') + 'expected ' + sb + '\n       got      ' + sa);
};
global.ok = function (v, msg) { if (!v) throw new Error(msg || 'expected truthy, got ' + JSON.stringify(v)); };
global.has = function (s, sub, msg) { if (String(s).indexOf(sub) < 0) throw new Error((msg ? msg + ': ' : '') + 'expected to contain ' + JSON.stringify(sub) + '\n       in ' + JSON.stringify(String(s).slice(0, 300))); };
global.not = function (s, sub, msg) { if (String(s).indexOf(sub) >= 0) throw new Error((msg ? msg + ': ' : '') + 'expected NOT to contain ' + JSON.stringify(sub)); };
const broken = [];
for (const f of files) {
  console.log(f);
  try { require(path.join(dir, f)); }
  catch (e) {
    fail++; broken.push(f);
    /* 예외 글은 첫 몇 줄만(모듈 없음이면 찾던 이름과 부른 파일이 보여요) */
    const msg = String(e && e.message ? e.message : e).split('\n').slice(0, 4).join('\n       ');
    console.log('  FAIL ' + f + ' (파일을 불러오다 멈춤)\n       ' + msg);
  }
}
console.log('\n' + pass + ' passed, ' + fail + ' failed' + (broken.length ? ' (불러오지 못한 파일 ' + broken.length + '개: ' + broken.join(', ') + ')' : ''));
process.exit(fail ? 1 : 0);
