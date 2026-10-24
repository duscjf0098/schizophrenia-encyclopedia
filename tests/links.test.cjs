/* tools/build-links.cjs 테스트: 실제로 실행해 data/links.js 를 만들고 in/out 대칭·정합성을 검사 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');

function load(file, key) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const win = { JHB: {} };
  new Function('window', 'JHB', src)(win, win.JHB);
  return win.JHB[key];
}

let links = null, toc = null;

test('build-links.cjs 가 깨진 링크 없이 실행된다', function () {
  execFileSync(process.execPath, ['tools/build-links.cjs'], { cwd: root, stdio: 'pipe' });
  links = load('data/links.js', 'links');
  toc = load('data/toc.js', 'toc');
  ok(links && links.out && links.in, 'links.out / links.in 이 있어야 함');
});

test('모든 slug 가 data/toc.js 에 존재한다', function () {
  const valid = new Set(toc.articles.map(function (a) { return a.slug; }));
  const all = new Set();
  Object.keys(links.out).forEach(function (s) { all.add(s); links.out[s].forEach(function (t) { all.add(t); }); });
  Object.keys(links.in).forEach(function (s) { all.add(s); links.in[s].forEach(function (t) { all.add(t); }); });
  const bad = Array.from(all).filter(function (s) { return !valid.has(s); });
  eq(bad, [], 'toc 에 없는 slug');
  eq(Object.keys(links.out).length, toc.articles.length, 'out 은 글마다 있어야 함');
  eq(Object.keys(links.in).length, toc.articles.length, 'in 은 글마다 있어야 함');
});

test('in/out 이 서로 대칭이다', function () {
  const missing = [];
  Object.keys(links.out).forEach(function (a) {
    links.out[a].forEach(function (b) { if (links.in[b].indexOf(a) < 0) missing.push(a + ' → ' + b + ' (in 에 없음)'); });
  });
  Object.keys(links.in).forEach(function (b) {
    links.in[b].forEach(function (a) { if (links.out[a].indexOf(b) < 0) missing.push(b + ' ← ' + a + ' (out 에 없음)'); });
  });
  eq(missing, []);
});

test('자기 자신 링크와 중복이 없다', function () {
  const bad = [];
  ['out', 'in'].forEach(function (k) {
    Object.keys(links[k]).forEach(function (s) {
      const arr = links[k][s];
      if (arr.indexOf(s) >= 0) bad.push(k + ':' + s + ' 자기 자신');
      if (new Set(arr).size !== arr.length) bad.push(k + ':' + s + ' 중복');
    });
  });
  eq(bad, []);
});

test('in 은 분류 번호·order 순으로 정렬돼 있다', function () {
  const pos = {};
  toc.articles.forEach(function (a, i) { pos[a.slug] = i; });
  const unsorted = Object.keys(links.in).filter(function (s) {
    const arr = links.in[s];
    for (let i = 1; i < arr.length; i++) if (pos[arr[i - 1]] > pos[arr[i]]) return true;
    return false;
  });
  eq(unsorted, []);
});

test('auditory-hallucination 의 역링크가 1개 이상이다', function () {
  ok(links.in['auditory-hallucination'] && links.in['auditory-hallucination'].length >= 1, JSON.stringify(links.in['auditory-hallucination']));
});
