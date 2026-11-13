/* 검색엔진용 정적 페이지 생성: 문서·분류·용어 사전·소개마다 실제 HTML 파일을 만든다.
   tools/build-index.cjs 다음에 실행한다(data/toc.js 를 읽음). 실행: node tools/build-pages.cjs
   만드는 것: index.html, a/<slug>/index.html, s/<id>/index.html, glossary/ about/ search/ fav/ random/ index.html,
   특집 화면 <id>/index.html(data/pages/<id>.json 선언마다, 본문은 js/pages/<id>.js 의 staticHtml),
   404.html, app-shell.html(서비스 워커가 오프라인에서 채워 쓰는 틀), sitemap.xml
   화면 확장 모듈 스크립트 줄(<!--ui:start-->…)과 상단 도구 링크(<!--top:start-->…)는 tools/lib/assets.cjs 가 만든다. */
const fs = require('fs');
const path = require('path');
const md = require('../js/md.js');
const P = require('../js/paths.js');
const A = require('./lib/assets.cjs');

const root = path.join(__dirname, '..');
const SITE = 'https://duscjf0098.github.io/schizophrenia-encyclopedia/';
const SITE_PATH = '/schizophrenia-encyclopedia/';
const SITE_DESC = '조현병을 출처와 함께 정리한 한국어 백과. 증상, 진단, 약과 치료, 함께 살아가기, 제도, 최신 연구까지 문서와 용어 풀이를 담았어요.';

function load(file) {
  const win = { JHB: {} };
  new Function('window', 'JHB', fs.readFileSync(path.join(root, file), 'utf8'))(win, win.JHB);
  return win.JHB;
}
const J = Object.assign({}, load('data/sections.js'), load('data/toc.js'), load('data/glossary.js'), load('data/about.js'), fs.existsSync(path.join(root, 'data/courses.js')) ? load('data/courses.js') : {});
const courses = J.courses || [];
const sections = J.sections, articles = J.toc.articles, glossary = J.glossary;
const secById = {}; sections.forEach(function (s) { secById[s.id] = s; });
const bySlug = {}; articles.forEach(function (a) { bySlug[a.slug] = a; });
const template = fs.readFileSync(path.join(__dirname, 'shell.html'), 'utf8');
/* 특집 화면 선언(검사는 build-kb 와 같은 함수) */
const declResult = A.pageDecls({ root: root });
declResult.warnings.forEach(function (w) { console.warn('주의: ' + w); });
if (declResult.errors.length) {
  declResult.errors.forEach(function (e) { console.error('오류: ' + e); });
  console.error('특집 화면 선언 오류 때문에 정적 페이지를 만들지 않았어요');
  process.exit(1);
}
const decls = declResult.pages;
const declIds = new Set(decls.map(function (d) { return d.id; }));
const today = new Date().toISOString().slice(0, 10);
/* 검색엔진 소유 확인 코드(구글 서치 콘솔·네이버 서치어드바이저의 HTML 태그 content 값). 첫 화면에만 넣는다 */
const verify = JSON.parse(fs.readFileSync(path.join(__dirname, 'site-verify.json'), 'utf8'));
const VERIFY_TAGS = (verify.google ? '<meta name="google-site-verification" content="' + esc(verify.google) + '">' + String.fromCharCode(10) : '') +(verify.naver ? '<meta name="naver-site-verification" content="' + esc(verify.naver) + '">' : '');

function esc(s) { return md.esc(s); }
function secArticles(id) { return articles.filter(function (a) { return a.section === id; }).sort(function (a, b) { return (a.order || 999) - (b.order || 999); }); }

function fill(t, v) {
  return t.replace(/\{\{(\w+)\}\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(v, k) ? v[k] : m; });
}
function page(route, o) {
  const base = o.base != null ? o.base : P.baseFor(route);
  const url = o.noCanonical ? '' : SITE + (route ? route + '/' : '');
  const html = fill(template, {
    BASE: base, ROUTE: route, HOME: base || './',
    TITLE: esc(o.title), OGTITLE: esc(o.ogTitle || o.title), DESC: esc(o.desc || SITE_DESC),
    ROBOTS: o.robots || 'index,follow', OGTYPE: o.ogType || 'website',
    CANONICAL: url ? '<link rel="canonical" href="' + url + '">' : '',
    OGURL: url ? '<meta property="og:url" content="' + url + '">' : '',
    JSONLD: o.jsonld ? '<script type="application/ld+json">' + JSON.stringify(o.jsonld).replace(/</g, '\\u003c') + '</script>' : '',
    VERIFY: route === '' ? VERIFY_TAGS : '',
    PAGE_CSS: o.pageCss ? '<link rel="stylesheet" href="' + base + o.pageCss + '">' : '',
    UI_SCRIPTS: A.uiScriptsHtml(base),
    TOP_LINKS: A.topLinksHtml(decls, base),
    MAIN: P.rewriteHtml(o.main || '', base)
  });
  return { route: route, html: html, url: url, lastmod: o.lastmod || today, index: !o.robots || o.robots.indexOf('noindex') < 0 };
}
function crumb(parts) {
  return '<nav class="crumb" aria-label="위치">' + parts.map(function (p) { return p.href ? '<a href="' + p.href + '">' + esc(p.text) + '</a>' : esc(p.text); }).join('<span class="sep">/</span>') + '</nav>';
}
function rows(list) {
  return '<ul class="rows">' + list.map(function (a) {
    return '<li class="row"><a href="#/a/' + a.slug + '"><span class="row-t">' + esc(a.title) + '</span><span class="row-s">' + esc(a.summary || '') + '</span></a></li>';
  }).join('') + '</ul>';
}

const pages = [];

/* 첫 화면 */
pages.push(page('', {
  title: '조현병 백과 - 출처와 함께 읽는 조현병 백과사전', ogTitle: '조현병 백과', desc: SITE_DESC,
  jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: '조현병 백과', url: SITE, inLanguage: 'ko', description: SITE_DESC },
  main: '<div class="portal"><header class="portal-head"><h1 class="portal-title">조현병 백과</h1><p class="portal-sub">' + esc(SITE_DESC) + '</p></header>' +
    sections.map(function (s) {
      if (s.glossary) return '<section><h2 class="h-sec"><a href="#/glossary">' + esc(s.title) + '</a></h2><p>' + esc(s.desc) + '</p></section>';
      return '<section><h2 class="h-sec"><a href="#/s/' + s.id + '">' + esc(s.title) + '</a></h2><p>' + esc(s.desc) + '</p><ul>' +
        secArticles(s.id).map(function (a) { return '<li><a href="#/a/' + a.slug + '">' + esc(a.title) + '</a></li>'; }).join('') + '</ul></section>';
    }).join('') + '</div>'
}));

/* 분류 */
sections.forEach(function (s) {
  if (s.glossary) return;
  const list = secArticles(s.id);
  pages.push(page('s/' + s.id, {
    title: s.title + ' - 조현병 백과', desc: s.desc + '. 조현병 백과의 ' + s.title + ' 분류 문서 ' + list.length + '개.',
    main: crumb([{ href: '#/', text: '첫 화면' }, { text: '분류' }]) + '<h1 class="page-title">' + esc(s.title) + '</h1><p class="page-lead">' + esc(s.desc) + '</p>' + rows(list)
  }));
});

/* 문서 */
articles.forEach(function (a) {
  const s = secById[a.section];
  const doc = md.parse(fs.readFileSync(path.join(root, 'content', s.dir, a.slug + '.md'), 'utf8'));
  const r = md.render(doc.body);
  const srcs = doc.meta.sources || [];
  const list = secArticles(a.section);
  const desc = (a.summary || '').slice(0, 155);
  /* 자바스크립트 없이 보는 사람·검색엔진용: 근거·고친 날, 위기 배너, 응급 줄, 핵심 3가지, 문서 고지(문구는 앱과 같음) */
  const tags = a.tags || [];
  const isCrisis = tags.indexOf('위기') >= 0;
  const points = md.pointList(doc.meta.points);
  /* 근거 칩·읽는 시간·고친 날: 앱이 다시 그리는 휴대폰 머리 줄(.doc-meta-m)과 같은 값·문구(js/md.js 의 docMetaHtml) */
  const meta = Object.assign({}, a, doc.meta);
  const metaHtml = md.docMetaHtml({ evidence: meta.evidence, ev: (J.EVIDENCE || {})[meta.evidence], minutes: meta.minutes || md.readingMinutes(doc.body), updated: meta.updated });
  pages.push(page('a/' + a.slug, {
    title: a.title + ' - 조현병 백과', ogTitle: a.title, desc: desc, ogType: 'article', lastmod: a.updated || today,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: desc, inLanguage: 'ko',
      dateModified: a.updated || today, mainEntityOfPage: SITE + 'a/' + a.slug + '/',
      isPartOf: { '@type': 'WebSite', name: '조현병 백과', url: SITE },
      author: { '@type': 'Organization', name: '조현병 백과' },
      citation: srcs.filter(function (x) { return x.url; }).map(function (x) { return x.url; })
    },
    main: crumb([{ href: '#/', text: '첫 화면' }, { href: '#/s/' + s.id, text: s.title }]) +
      '<article class="doc"><div class="doc-main"><header class="doc-head"><h1 class="page-title">' + esc(a.title) + '</h1>' +
      (a.summary ? '<p class="doc-summary">' + esc(a.summary) + '</p>' : '') +
      metaHtml + '</header>' +
      (isCrisis ? md.crisisHtml() : '') +
      (tags.indexOf('응급') >= 0 ? md.emergencyHtml() : '') +
      (points.length ? '<div class="doc-slot" data-slot="lead">' + md.keypointsHtml(points, isCrisis) + '</div>' : '') +
      '<div class="body">' + r.html + '</div>' +
      (srcs.length ? '<section class="sources" id="sources"><h2>출처</h2><ol>' + srcs.map(function (x, i) {
        return '<li id="src-' + (i + 1) + '">' + (x.org ? esc(x.org) + '. ' : '') + (x.url ? '<a href="' + esc(x.url) + '" rel="noopener">' + esc(x.title || x.url) + '</a>' : esc(x.title)) + (x.year ? ' (' + esc(x.year) + ')' : '') + '</li>';
      }).join('') + '</ol></section>' : '') +
      '<p class="disclaimer">' + esc(md.DISCLAIMER) + '</p>' +
      '<section class="see-also"><h2>같은 분류의 문서</h2><ul>' + list.filter(function (x) { return x.slug !== a.slug; }).map(function (x) {
        return '<li><a href="#/a/' + x.slug + '">' + esc(x.title) + '</a></li>';
      }).join('') + '</ul></section></div></article>'
  }));
});

/* 용어 사전 */
pages.push(page('glossary', {
  title: '용어 사전 - 조현병 백과', desc: '조현병 백과에 나오는 용어 ' + glossary.length + '개를 가나다순으로 풀이했어요. 증상, 진단, 약, 제도, 연구 용어.',
  main: crumb([{ href: '#/', text: '첫 화면' }, { text: '용어 사전' }]) + '<h1 class="page-title">용어 사전</h1><dl class="gl-list">' +
    glossary.slice().sort(function (x, y) { return x.term.localeCompare(y.term, 'ko'); }).map(function (g) {
      const rel = (g.related || []).filter(function (x) { return bySlug[x]; });
      return '<div class="gl-item"><dt>' + esc(g.term) + (g.en ? ' <span class="gl-en">' + esc(g.en) + '</span>' : '') + '</dt><dd>' + esc(g.def) +
        (rel.length ? ' <span class="gl-rel">' + rel.map(function (x) { return '<a href="#/a/' + x + '">' + esc(bySlug[x].title) + '</a>'; }).join(' ') + '</span>' : '') + '</dd></div>';
    }).join('') + '</dl>'
}));

/* 읽기 코스 */
if (courses.length) {
  pages.push(page('courses', {
    title: '읽기 코스 - 조현병 백과', desc: '처음 진단받았을 때, 가족이 진단받았을 때, 약을 시작했을 때처럼 상황별로 읽을 순서를 안내하는 코스 ' + courses.length + '개.',
    main: crumb([{ href: '#/', text: '첫 화면' }, { text: '읽기 코스' }]) + '<h1 class="page-title">읽기 코스</h1><ul>' +
      courses.map(function (c) { return '<li><a href="#/course/' + c.id + '">' + esc(c.title) + '</a> ' + esc(c.intro) + '</li>'; }).join('') + '</ul>'
  }));
  courses.forEach(function (c) {
    pages.push(page('course/' + c.id, {
      title: c.title + ' - 읽기 코스 - 조현병 백과', desc: c.intro.slice(0, 155),
      main: crumb([{ href: '#/', text: '첫 화면' }, { href: '#/courses', text: '읽기 코스' }]) + '<h1 class="page-title">' + esc(c.title) + '</h1><p class="page-lead">' + esc(c.intro) + '</p><ol class="steps">' +
        c.steps.map(function (st) { const a = bySlug[st.slug]; return a ? '<li class="step"><a href="#/a/' + a.slug + '">' + esc(a.title) + '</a><span class="why">' + esc(st.why || '') + '</span></li>' : ''; }).join('') + '</ol>'
    }));
  });
}

/* 소개·검색·저장·무작위 */
pages.push(page('about', { title: '이 백과에 대해 - 조현병 백과', desc: '조현병 백과가 글을 쓰는 원칙, AI 작성과 전문가 미감수 고지, 읽는 법.', main: '<h1 class="page-title">이 백과에 대해</h1><div class="prose">' + J.aboutHtml + '</div>' }));
/* 찾기는 등록 화면(data/pages/search.json)이 생기면 그쪽이 만든다 */
if (!declIds.has('search')) pages.push(page('search', { title: '찾기 - 조현병 백과', robots: 'noindex,follow', noCanonical: true, main: '<h1 class="page-title">본문 찾기</h1>' }));
pages.push(page('fav', { title: '저장한 문서 - 조현병 백과', robots: 'noindex,follow', noCanonical: true, main: '<h1 class="page-title">저장한 문서</h1>' }));
pages.push(page('random', { title: '아무 문서 - 조현병 백과', robots: 'noindex,follow', noCanonical: true, main: '<p class="empty">아무 문서나 고르고 있어요.</p>' }));

/* 특집 화면: 선언마다 <id>/index.html. 본문은 js/pages/<id>.js 의 staticHtml(ctx) — 자바스크립트 없이도 보이는 내용 */
const kbData = {};
function kb(name) {
  if (!Object.prototype.hasOwnProperty.call(kbData, name)) kbData[name] = JSON.parse(A.stripBom(fs.readFileSync(path.join(root, 'data', 'kb', name + '.json'), 'utf8')));
  return kbData[name];
}
/* 앱(js/app.js 의 featureNotices)과 같은 순서·문구: 선언의 notice 종류마다 한 줄, 그리고 위기 줄(한 번만. crisisLine 이 맡음) */
function featureNoticesHtml(d) {
  const kinds = ['general'].concat(d.notice.filter(function (k) { return k !== 'general' && k !== 'crisis'; }));
  return '<div class="fp-notices">' + kinds.map(function (k) { return md.noticeHtml(k, k === 'dated' ? d.updated : undefined); }).join('') +
    (d.crisisLine !== false ? md.noticeHtml('crisis') : '') + '</div>';
}
function stop(msg) { console.error(msg); process.exit(1); }
decls.forEach(function (d) {
  let body = '';
  if (d.hasJs) {
    const file = path.join(root, 'js', 'pages', d.id + '.js');
    let mod;
    try { delete require.cache[require.resolve(file)]; mod = require(file); }
    catch (e) { stop('특집 화면 "' + d.id + '": js/pages/' + d.id + '.js 를 node 에서 읽지 못했어요 — ' + (e && e.stack || e)); }
    if (!mod || mod.id !== d.id) stop('특집 화면 "' + d.id + '": js/pages/' + d.id + '.js 가 내보낸 id 가 ' + JSON.stringify(mod && mod.id) + ' 예요(파일 이름과 같아야 해요)');
    if (typeof mod.staticHtml === 'function') {
      const data = {};
      d.data.forEach(function (n) { data[n] = kb(n); });
      try { body = mod.staticHtml({ data: data, esc: esc, articles: bySlug, sections: sections, page: d }); }
      catch (e) { stop('특집 화면 "' + d.id + '": staticHtml 에서 오류 — ' + (e && e.stack || e)); }
      if (typeof body !== 'string') stop('특집 화면 "' + d.id + '": staticHtml 은 글자(HTML)를 돌려줘야 해요');
    }
  }
  const noindex = d.robots === 'noindex';
  pages.push(page(d.id, {
    title: d.title + ' - 조현병 백과', ogTitle: d.title, desc: d.summary,
    robots: noindex ? 'noindex,follow' : 'index,follow', noCanonical: noindex, lastmod: d.updated || today,
    pageCss: d.hasCss ? 'css/pages/' + d.id + '.css' : '',
    main: crumb([{ href: '#/', text: '첫 화면' }, { text: d.title }]) + '<h1 class="page-title">' + esc(d.title) + '</h1>' +
      (d.lead ? '<p class="page-lead">' + esc(d.lead) + '</p>' : '') +
      '<div class="fp-body" data-page="' + d.id + '">' + body + '</div>' + featureNoticesHtml(d)
  }));
});

/* 쓰기 (채우지 못한 자리표시가 남은 페이지가 있으면 멈춘다. app-shell 의 BASE·ROUTE·HOME 은 서비스 워커 몫이라 따로 씀) */
const leftover = pages.filter(function (p) { return /\{\{[A-Z_]+\}\}/.test(p.html); }).map(function (p) { return p.route || '(첫 화면)'; });
if (leftover.length) stop('자리표시({{…}})가 남은 페이지: ' + leftover.slice(0, 10).join(', '));
let written = 0;
pages.forEach(function (p) {
  const out = p.route ? path.join(root, p.route, 'index.html') : path.join(root, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, p.html);
  written++;
});
/* 지금 없는 문서의 옛 폴더 정리 (a/, s/ 아래만) */
['a', 's', 'course'].forEach(function (dir) {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) return;
  const keep = new Set(pages.filter(function (p) { return p.route.indexOf(dir + '/') === 0; }).map(function (p) { return p.route.split('/')[1]; }));
  fs.readdirSync(d).forEach(function (name) { if (!keep.has(name)) fs.rmSync(path.join(d, name), { recursive: true, force: true }); });
});
/* 선언이 사라진 특집 화면의 옛 폴더 정리: 이 스크립트가 만든 index.html 하나만 든 최상위 폴더만 지운다 */
const KEEP_DIRS = new Set(['a', 's', 'course', 'courses', 'glossary', 'about', 'search', 'fav', 'random', 'notfound', 'css', 'js', 'data', 'content', 'docs', 'tools', 'tests', 'node_modules', 'fonts', 'figures']);
fs.readdirSync(root, { withFileTypes: true }).forEach(function (ent) {
  const name = ent.name;
  if (!ent.isDirectory() || name.charAt(0) === '.' || KEEP_DIRS.has(name) || declIds.has(name) || !A.ID_RE.test(name)) return;
  const dir = path.join(root, name);
  const items = fs.readdirSync(dir);
  if (items.length !== 1 || items[0] !== 'index.html') return;
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  if (html.indexOf('data-route="' + name + '"') < 0 || html.indexOf('<main id="app"') < 0 || html.indexOf('<!--ui:start-->') < 0) return;
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('선언이 없어진 특집 화면 폴더를 지웠어요: ' + name + '/');
});
/* 404: GitHub Pages가 아무 깊이에서나 보여 주므로 절대 경로 기준 */
fs.writeFileSync(path.join(root, '404.html'), page('notfound', { base: SITE_PATH, title: '없는 페이지 - 조현병 백과', robots: 'noindex', noCanonical: true, main: '<h1 class="page-title">그런 문서가 없어요</h1>' }).html);
/* 오프라인용 틀: BASE·ROUTE·HOME 은 서비스 워커가 채운다 */
fs.writeFileSync(path.join(root, 'app-shell.html'), fill(template, {
  TITLE: '조현병 백과', OGTITLE: '조현병 백과', DESC: esc(SITE_DESC), ROBOTS: 'noindex', OGTYPE: 'website', CANONICAL: '', OGURL: '', JSONLD: '', VERIFY: '', MAIN: '',
  /* fill() 은 한 번만 훑으므로 아래 값 속 '{{BASE}}' 는 그대로 남고, 서비스 워커가 채운다 */
  PAGE_CSS: '', UI_SCRIPTS: A.uiScriptsHtml('{{BASE}}'), TOP_LINKS: A.topLinksHtml(decls, '{{BASE}}')
}));
/* sitemap */
const sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages.filter(function (p) { return p.index && p.url; }).map(function (p) { return '  <url><loc>' + p.url + '</loc><lastmod>' + p.lastmod + '</lastmod></url>'; }).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(root, 'sitemap.xml'), sm);
console.log('특집 화면 ' + decls.length + '개' + (decls.length ? '(' + decls.map(function (d) { return d.id; }).join(', ') + ')' : ''));
console.log('정적 페이지 ' + written + '개, sitemap ' + pages.filter(function (p) { return p.index && p.url; }).length + '개 주소, 404.html, app-shell.html');
