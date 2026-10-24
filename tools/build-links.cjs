/* content/<섹션>/<slug>.md 본문의 문서 링크([글자](#/a/<slug>))를 모아 data/links.js(링크 지도)를 만든다.
   out: 그 문서가 본문에서 링크한 문서(frontmatter·출처 제외, 중복 제거, 자기 자신 제외, 글에 나온 순서)
   in : 그 문서를 링크한 문서(분류 번호·order 순 — data/toc.js 기준)
   존재하지 않는 slug 로 가는 링크(깨진 링크)가 있으면 종료 코드 1.
   실행: node tools/build-index.cjs 뒤에 node tools/build-links.cjs */
const fs = require('fs');
const path = require('path');
const md = require('../js/md.js');

const root = path.join(__dirname, '..');
const toc = loadToc();
const pos = {};  /* slug → toc 정렬 순서(분류 번호·order) */
const titles = {};
toc.articles.forEach(function (a, i) { pos[a.slug] = i; titles[a.slug] = a.title; });

function loadToc() {
  const src = fs.readFileSync(path.join(root, 'data/toc.js'), 'utf8');
  const win = { JHB: {} };
  new Function('window', 'JHB', src)(win, win.JHB);
  return win.JHB.toc;
}

const contentDir = path.join(root, 'content');
const out = {}, inn = {};
const broken = [];
let total = 0;
const LINK = /\[[^\]]*\]\(#\/a\/([^)\s#?]+)[^)]*\)/g;

fs.readdirSync(contentDir).sort().forEach(function (dir) {
  const full = path.join(contentDir, dir);
  if (!fs.statSync(full).isDirectory()) return;
  fs.readdirSync(full).sort().forEach(function (f) {
    if (!/\.md$/.test(f)) return;
    const slug = f.replace(/\.md$/, '');
    const rel = 'content/' + dir + '/' + f;
    if (!(slug in pos)) { console.error('toc 에 없는 글: ' + rel + ' (node tools/build-index.cjs 를 먼저 실행하세요)'); process.exit(1); }
    const body = md.parse(fs.readFileSync(path.join(full, f), 'utf8')).body;
    const seen = {};
    const targets = [];
    let m;
    LINK.lastIndex = 0;
    while ((m = LINK.exec(body))) {
      const to = m[1];
      total++;
      if (!(to in pos)) { broken.push(rel + ' → #/a/' + to); continue; }
      if (to === slug || seen[to]) continue;
      seen[to] = true;
      targets.push(to);
    }
    out[slug] = targets;
    if (!inn[slug]) inn[slug] = [];
    targets.forEach(function (to) { (inn[to] = inn[to] || []).push(slug); });
  });
});

const bySection = function (a, b) { return pos[a] - pos[b]; };
const outSorted = {}, inSorted = {};
toc.articles.forEach(function (a) {
  outSorted[a.slug] = out[a.slug] || [];
  inSorted[a.slug] = (inn[a.slug] || []).sort(bySection);
});

fs.writeFileSync(path.join(root, 'data/links.js'),
  '/* 자동 생성: node tools/build-links.cjs */\nwindow.JHB = window.JHB || {};\nJHB.links = ' + JSON.stringify({ out: outSorted, in: inSorted }) + ';\n');

/* 통계 */
const orphans = toc.articles.filter(function (a) { return inSorted[a.slug].length === 0; });
const top = toc.articles.map(function (a) { return { slug: a.slug, title: a.title, n: inSorted[a.slug].length }; })
  .sort(function (a, b) { return b.n - a.n || pos[a.slug] - pos[b.slug]; }).slice(0, 10);

console.log('글 ' + toc.articles.length + '편, 전체 링크 ' + total + '개 → data/links.js');
console.log('\n역링크 없는 문서(고아) ' + orphans.length + '편:');
orphans.forEach(function (a) { console.log('  ' + a.slug + ' — ' + a.title + ' (섹션 ' + a.section + ')'); });
console.log('\n가장 많이 링크된 문서 상위 10:');
top.forEach(function (t, i) { console.log('  ' + (i + 1) + '. ' + t.slug + ' — ' + t.title + ' (' + t.n + ')'); });
if (broken.length) {
  console.error('\n깨진 링크 ' + broken.length + '개:');
  broken.forEach(function (b) { console.error('  ' + b); });
}
process.exit(broken.length ? 1 : 0);
