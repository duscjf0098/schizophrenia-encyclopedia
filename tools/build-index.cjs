/* content/<섹션>/<slug>.md 를 읽어 data/toc.js(글 목록), data/search-index.json(검색), data/precache.json(오프라인 목록)을 만든다.
   실행: node tools/build-index.cjs (data/pages.js 를 프리캐시에 넣으므로 build-kb 다음에. 보통은 node tools/build-all.cjs)
   require 로 불러오면 파일을 쓰지 않고 글 항목 도우미(tocEntry)만 내보낸다(tests/pages.test.cjs). */
const fs = require('fs');
const path = require('path');
const md = require('../js/md.js');
const A = require('./lib/assets.cjs');

const root = path.join(__dirname, '..');
/* 실제 있는 날짜인 YYYY-MM-DD 만(js/md.js 의 realDay·js/ui/trust.js 의 reviewedOf 와 같은 기준: 달 01~12, 그 달에 있는 날).
   2026-13-40·2026-02-30 같은 값은 toc 에 넣지 않아요(화면은 어차피 보여 주지 않으니 toc 와 보이는 값이 어긋나지 않게) */
function isRealDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/* data/toc.js 의 글 항목 하나. reviewed(출처를 다시 확인한 날, YYYY-MM-DD)는 frontmatter 에 있을 때만 넣는다
   (js/md.js 의 docMetaText·docMetaHtml 이 "출처 확인 YYYY.MM.DD" 로 보여 줌. 없는 글의 항목 모양은 그대로) */
function tocEntry(slug, sectionId, meta, body) {
  const m = meta || {};
  const a = {
    slug: slug, section: sectionId, title: m.title || slug, summary: m.summary || '', tags: m.tags || [],
    updated: m.updated || '', evidence: m.evidence || '', minutes: md.readingMinutes(body || ''), order: Number(m.order) || 999
  };
  const rv = m.reviewed == null ? '' : String(m.reviewed).trim();
  if (isRealDay(rv)) a.reviewed = rv;
  return a;
}

/* 오프라인 목록(글 원문 .md 는 main 이 뒤에 더함): 정적 페이지가 싣는 것(묶음 js/core.js·js/ui.js, css) + 앱이 필요할 때 받는 자료(data/about.js·data/links.js)
   + 특집 화면 코드·스타일 + 지식 데이터 + 아이콘. 묶음 안에 든 낱개 파일(코어·모듈·자료)은 넣지 않는다(정적 페이지·app-shell 은 묶음만 실음).
   개발 서버(serve.cjs, 낱개를 실음)는 이 목록에 낱개 파일을 더해 보낸다(오프라인 시험이 개발 서버에서도 되게). 본문 검색 색인(data/search-index.json)은 크기 때문에 넣지 않는다. */
function precacheShell() {
  const core = ['./', 'index.html', 'app-shell.html', 'css/style.css', 'css/ui.css', A.BUNDLES.core, A.BUNDLES.ui].concat(A.LAZY_DATA,
    ['manifest.webmanifest', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'og.png']);
  return core.concat(A.pageAssetFiles(), A.kbFiles()).filter(function (f, i, all) { return all.indexOf(f) === i; });
}

function loadSections() {
  const src = fs.readFileSync(path.join(root, 'data/sections.js'), 'utf8');
  const win = { JHB: {} };
  new Function('window', 'JHB', src)(win, win.JHB);
  return win.JHB.sections;
}

function main() {
  const sections = loadSections();
  const dirToId = {}; sections.forEach(function (s) { dirToId[s.dir] = s.id; });
  const contentDir = path.join(root, 'content');
  const articles = [], index = [], files = [];
  const slugs = {};
  const sourceUrls = new Set();
  let errors = 0;
  fs.readdirSync(contentDir).sort().forEach(function (dir) {
    const full = path.join(contentDir, dir);
    if (!fs.statSync(full).isDirectory()) return;
    const id = dirToId[dir];
    if (!id) { console.error('섹션에 없는 폴더: content/' + dir + ' (data/sections.js 에 추가하세요)'); errors++; return; }
    fs.readdirSync(full).sort().forEach(function (f) {
      if (!/\.md$/.test(f)) return;
      const slug = f.replace(/\.md$/, '');
      const rel = 'content/' + dir + '/' + f;
      if (slugs[slug]) { console.error('slug 중복: ' + slug + ' (' + slugs[slug] + ', ' + rel + ')'); errors++; }
      slugs[slug] = rel;
      const doc = md.parse(fs.readFileSync(path.join(full, f), 'utf8'));
      const m = doc.meta;
      const body = md.plain(doc.body);
      (m.sources || []).forEach(function (x) { if (x.url) sourceUrls.add(x.url); });
      articles.push(tocEntry(slug, id, m, doc.body));
      index.push({ id: slug, section: id, title: m.title || slug, summary: m.summary || '', tags: m.tags || [], body: body });
      files.push(rel);
    });
  });

  articles.sort(function (a, b) { return Number(a.section) - Number(b.section) || a.order - b.order || a.title.localeCompare(b.title, 'ko'); });
  const stamp = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(root, 'data/toc.js'), '/* 자동 생성: node tools/build-index.cjs (' + stamp + ') — 직접 고치지 마세요 */\nwindow.JHB = window.JHB || {};\nJHB.toc = ' + JSON.stringify({ generated: stamp, sources: sourceUrls.size, articles: articles }, null, 1) + ';\n');
  fs.writeFileSync(path.join(root, 'data/search-index.json'), JSON.stringify(index));
  const shell = precacheShell();
  const version = stamp + '-' + files.length + '-' + Date.now().toString(36);
  fs.writeFileSync(path.join(root, 'data/precache.json'), JSON.stringify({ version: version, files: shell.concat(files) }, null, 1));
  const swPath = path.join(root, 'sw.js');
  fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace(/const BUILD = '[^']*';/, "const BUILD = '" + version + "';"));
  const reviewed = articles.filter(function (a) { return a.reviewed; }).length;
  console.log('글 ' + articles.length + '편(출처 확인일 ' + reviewed + '편), 섹션 ' + Object.keys(dirToId).length + '개 → data/toc.js, data/search-index.json, data/precache.json');
  process.exit(errors ? 1 : 0);
}

if (require.main === module) main();
module.exports = { tocEntry: tocEntry, precacheShell: precacheShell };
