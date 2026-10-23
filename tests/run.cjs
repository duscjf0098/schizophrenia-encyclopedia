/* 단위 테스트 실행기: node tests/run.cjs */
const path = require('path');
const files = ['md.test.cjs', 'search.test.cjs'];
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
for (const f of files) {
  console.log(f);
  require(path.join(__dirname, f));
}
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
