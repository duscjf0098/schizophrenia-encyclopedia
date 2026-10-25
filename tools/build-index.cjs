/* content/<섹션>/<slug>.md 를 읽어 data/toc.js(글 목록), data/search-index.json(검색), data/precache.json(오프라인 목록)을 만든다.
   실행: node tools/build-index.cjs */
const fs = require('fs');
const path = require('path');
const md = require('../js/md.js');

const root = path.join(__dirname, '..');
const sections = loadSections();
const dirToId = {}; sections.forEach(function (s) { dirToId[s.dir] = s.id; });

function loadSections() {
  const src = fs.readFileSync(path.join(root, 'data/sections.js'), 'utf8');
  const win = { JHB: {} };
  new Function('window', 'JHB', src)(win, win.JHB);
  return win.JHB.sections;
}

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
    articles.push({
      slug: slug, section: id, title: m.title || slug, summary: m.summary || '', tags: m.tags || [],
      updated: m.updated || '', evidence: m.evidence || '', minutes: md.readingMinutes(doc.body), order: Number(m.order) || 999
    });
    index.push({ id: slug, section: id, title: m.title || slug, summary: m.summary || '', tags: m.tags || [], body: body });
    files.push(rel);
  });
});

articles.sort(function (a, b) { return Number(a.section) - Number(b.section) || a.order - b.order || a.title.localeCompare(b.title, 'ko'); });
const stamp = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(root, 'data/toc.js'), '/* 자동 생성: node tools/build-index.cjs (' + stamp + ') — 직접 고치지 마세요 */\nwindow.JHB = window.JHB || {};\nJHB.toc = ' + JSON.stringify({ generated: stamp, sources: sourceUrls.size, articles: articles }, null, 1) + ';\n');
fs.writeFileSync(path.join(root, 'data/search-index.json'), JSON.stringify(index));
const shell = ['./', 'index.html', 'app-shell.html', 'css/style.css', 'js/util.js', 'js/paths.js', 'js/md.js', 'js/search.js', 'js/gloss.js', 'js/synonyms.js', 'js/crisis.js', 'js/progress.js', 'js/app.js', 'css/ui.css', 'js/ui/palette.js', 'js/ui/preview.js', 'js/ui/mobile.js', 'js/ui/sticky.js', 'js/ui/reading.js', 'js/ui/settings.js', 'js/ui/polish.js', 'js/ui/home.js', 'data/sections.js', 'data/toc.js', 'data/glossary.js', 'data/about.js', 'data/synonyms.js', 'data/crisis-card.js', 'data/courses.js', 'data/links.js', 'manifest.webmanifest', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'og.png'];
const version = stamp + '-' + files.length + '-' + Date.now().toString(36);
fs.writeFileSync(path.join(root, 'data/precache.json'), JSON.stringify({ version: version, files: shell.concat(files) }, null, 1));
const swPath = path.join(root, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace(/const BUILD = '[^']*';/, "const BUILD = '" + version + "';"));
console.log('글 ' + articles.length + '편, 섹션 ' + Object.keys(dirToId).length + '개 → data/toc.js, data/search-index.json, data/precache.json');
process.exit(errors ? 1 : 0);
