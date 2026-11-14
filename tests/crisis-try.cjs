/* 위기 감지 시험 도구(테스트가 아니에요. tests/run.cjs 는 *.test.cjs 만 줍기 때문에 이 파일은 돌지 않아요)
   node tests/crisis-try.cjs 문장1 문장2 …      → 줄마다 "등급<탭>문장"(high 에 타해가 함께면 "high+harm")
   node tests/crisis-try.cjs --file 경로.json    → 문장 배열이나 { text } 배열을 같은 꼴로
   node tests/crisis-try.cjs --corpus           → tests/crisis-corpus.json 전체를 돌려 어긋난 것만 보이고 통과 수를 알려 줘요
   판정 기준(--corpus): expect 가 high 이면 반드시 high, 나머지는 expect 나 allow 안이면 통과. harm: true 인 문장은 harm 표시도 있어야 해요.
   아무것도 저장하거나 보내지 않아요. */
const fs = require('fs');
const path = require('path');
const C = require('../js/crisis.js');

function label(r) { return r ? (r.level === 'high' && r.harm ? 'high+harm' : r.level) : 'null'; }
function judge(e) {
  const r = C.detect(e.text), got = r ? r.level : null;
  let pass = e.expect === 'high' ? got === 'high' : (got === e.expect || (e.allow || []).indexOf(got) >= 0);
  if (pass && e.harm && !(r && r.harm)) pass = false;
  return { pass: pass, got: r };
}
function loadCorpus(file) { return JSON.parse(fs.readFileSync(file || path.join(__dirname, 'crisis-corpus.json'), 'utf8')); }

if (require.main === module) {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log('쓰는 법: node tests/crisis-try.cjs 문장… | --file 경로.json | --corpus');
    process.exit(0);
  }
  if (args[0] === '--corpus') {
    const list = loadCorpus(args[1]);
    let ok = 0;
    list.forEach(function (e) {
      const j = judge(e);
      if (j.pass) { ok++; return; }
      const want = (e.expect === null ? 'null' : e.expect) + ((e.allow || []).length ? '(+' + e.allow.map(String).join(',') + ')' : '') + (e.harm ? '+harm' : '');
      console.log(label(j.got) + '\t' + e.text + '\t← 기대 ' + want + (j.got ? '  [' + j.got.matched + ']' : ''));
    });
    console.log('\n' + ok + ' / ' + list.length + ' 통과');
    process.exit(ok === list.length ? 0 : 1);
  }
  let texts = args;
  if (args[0] === '--file') {
    const data = JSON.parse(fs.readFileSync(args[1], 'utf8'));
    texts = data.map(function (x) { return typeof x === 'string' ? x : x.text; });
  }
  texts.forEach(function (s) { console.log(label(C.detect(s)) + '\t' + s); });
}

module.exports = { judge: judge, label: label, loadCorpus: loadCorpus };
