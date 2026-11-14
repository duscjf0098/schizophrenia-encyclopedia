/* 정적 본문 살리기(하이드레이션, F1) 시험: node 로 할 수 있는 범위
   - 빌드한 a/<slug>/index.html 의 본문(.body)이 지금 글을 js/md.js 로 그린 것과 같은지(모든 글)
   - 머리의 #doc-meta(JSON)가 그 글의 frontmatter·차례와 같은지(모든 글)
   - 정적 문서 전체가 앱과 같은 마크업 함수(js/app.js 의 docKit.docHtml)로 지금 그린 것과 같은지(모든 글) → 앱이 새로 그린 화면과 같은 DOM
   - docHtml 의 약속(확장 자리 4개, 핵심 3가지 순서 값, 위기·응급 줄, 저장·공유 단추, 차례 3개 이상일 때만)
   - 저장소가 막힌 브라우저의 검색어 넘기기(js/app.js 의 handoffKit: window.name 한 번, 위기 말은 문장 없이 카드 종류만)
   브라우저 비교(정적으로 연 것 ↔ 앱이 새로 그린 것의 DOM·밑줄·여백 주석·출처 번호·자리)는 D:/.playwright-mcp/jhb-hydrate-compare.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const md = require('../js/md.js');
const P = require('../js/paths.js');
const DK = require('../js/app.js');
const B = require('../tools/build-pages.cjs');

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
const secById = {}; B.sections.forEach(function (s) { secById[s.id] = s; });
function built(slug) {
  const f = path.join(ROOT, 'a', slug, 'index.html');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
}
function mainOf(html) {
  const a = html.indexOf('<main id="app" tabindex="-1">'), b = html.lastIndexOf('</main>');
  return a >= 0 && b > a ? html.slice(a + '<main id="app" tabindex="-1">'.length, b) : null;
}
/* .body 의 안쪽(정적 HTML 은 docHtml 이 '<div class="body">' + html + '</div>' 로 넣고, 그 뒤에 after-body 자리가 바로 온다) */
function bodyOf(main) {
  const a = main.indexOf('<div class="body">'), b = main.indexOf('</div><div class="doc-slot" data-slot="after-body">');
  return a >= 0 && b > a ? main.slice(a + '<div class="body">'.length, b) : null;
}
function metaJsonOf(html) {
  const m = /<script type="application\/json" id="doc-meta">([\s\S]*?)<\/script>/.exec(html);
  return m ? JSON.parse(m[1]) : null;
}
function docOf(a) { return md.parse(read(path.join('content', secById[a.section].dir, a.slug + '.md'))); }

test('하이드레이션: 빌드한 모든 문서의 본문(.body)이 지금 글을 md.js 로 그린 것과 같다(실제 경로로 바꾼 링크까지)', function () {
  let n = 0;
  const bad = [];
  B.articles.forEach(function (a) {
    const html = built(a.slug);
    if (!html) { bad.push(a.slug + ' (빌드한 파일 없음: node tools/build-all.cjs)'); return; }
    const body = bodyOf(mainOf(html) || '');
    const want = P.rewriteHtml(md.render(docOf(a).body).html, '../../');
    if (body !== want) bad.push(a.slug);
    n++;
  });
  eq(bad, [], '본문이 다른 글');
  ok(n >= 284, '글 ' + n + '편');
});

test('하이드레이션: #doc-meta(JSON)는 그 글의 slug·frontmatter 전부·차례와 같고 "</script>" 가 끼어들 수 없다', function () {
  const bad = [];
  B.articles.forEach(function (a) {
    const html = built(a.slug);
    const j = html && metaJsonOf(html);
    const doc = docOf(a);
    if (!j) { bad.push(a.slug + ' (#doc-meta 없음)'); return; }
    if (j.slug !== a.slug) bad.push(a.slug + ' slug');
    if (JSON.stringify(j.meta) !== JSON.stringify(doc.meta)) bad.push(a.slug + ' meta');
    if (JSON.stringify(j.toc) !== JSON.stringify(md.render(doc.body).toc)) bad.push(a.slug + ' toc');
  });
  eq(bad, []);
  /* frontmatter 에 '</script>' 가 있어도 JSON 이 스크립트를 끊지 않음 */
  const s = DK.metaJson('x', { title: '</script><b>' }, []);
  not(s, '</script>');
  eq(JSON.parse(s).meta.title, '</script><b>');
});

test('하이드레이션: 빌드한 정적 문서 전체가 앱의 docHtml(지금 자료)로 그린 것과 같다(앱이 새로 그린 화면과 같은 마크업)', function () {
  const bad = [];
  B.articles.forEach(function (a) {
    const html = built(a.slug);
    if (!html) { bad.push(a.slug); return; }
    const dp = B.docPage(a, docOf(a));
    const want = P.rewriteHtml(B.prtStaticHtml(a.slug) + dp.main, '../../');
    if (mainOf(html) !== want) bad.push(a.slug);
  });
  eq(bad, [], '다시 빌드해야 하거나 마크업이 어긋난 글');
});

test('하이드레이션: 정적 문서는 문서 화면 자료(data/links.js)를 앱 뒤에 싣고, 다른 화면은 싣지 않는다', function () {
  const doc = built('auditory-hallucination');
  ok(doc, '빌드한 문서');
  const scripts = (doc.match(/<script src="[^"]+"><\/script>/g) || []).join('\n');
  ok(scripts.indexOf('js/core.js') < scripts.indexOf('data/links.js') && scripts.indexOf('data/links.js') < scripts.indexOf('js/ui.js'), scripts);
  not(read('index.html'), 'data/links.js', '첫 화면');
  not(read('index.html'), 'data/about.js', '첫 화면에 소개 본문 없음');
  not(read('about/index.html'), 'data/about.js', '소개 화면도 본문을 정적으로 가져서 받지 않음');
  has(read('about/index.html'), '<nav class="crumb" aria-label="위치">', '소개 정적 본문은 앱과 같은 빵부스러기');
});

/* ---------- docHtml 약속 ---------- */
function sample(over) {
  const a = B.articles.filter(function (x) { return x.slug === 'suicide-warning-signs'; })[0];
  const meta = Object.assign({}, a, { title: '제목', summary: '요약', tags: ['위기', '응급'], points: ['하나', '둘', '셋'], sources: [{ org: '기관', title: '자료', year: '2025', url: 'https://example.org/x' }] }, over || {});
  return DK.docHtml({ slug: a.slug, meta: meta, html: '<h2 id="h-1">가</h2><p>본문</p>', toc: [{ id: 'h-1', text: '가', level: 2 }, { id: 'h-2', text: '**나**', level: 3 }, { id: 'h-3', text: '다', level: 2 }],
    minutes: 3, sec: secById[a.section], secById: secById, list: B.sectionArticles(a.section), articles: B.articles, bySlug: B.bySlug, links: { in: {} }, EV: {} });
}
test('docHtml: 확장 자리 4개(lead·after-body·end·margin), 핵심 3가지는 lead 맨 앞(data-order=-1000000), 위기·응급 줄, 고지', function () {
  const h = sample();
  ['lead', 'after-body', 'end', 'margin'].forEach(function (s) { eq((h.match(new RegExp('data-slot="' + s + '"', 'g')) || []).length, 1, s); });
  has(h, '<div class="doc-slot" data-slot="lead"><section class="keypoints" data-order="-1000000">');
  has(h, md.crisisHtml());
  has(h, md.emergencyHtml());
  has(h, md.DISCLAIMER);
  ok(h.indexOf(md.crisisHtml()) < h.indexOf('data-slot="lead"'), '위기 배너는 lead 자리 앞');
  /* 저장·공유는 두 곳(휴대폰 머리 줄·문서 정보 상자). 상태는 기기 기록이라 정적 HTML 은 늘 "저장" */
  eq((h.match(/class="btn js-fav" aria-pressed="false">저장</g) || []).length, 2);
  eq((h.match(/class="btn js-share">공유</g) || []).length, 2);
  /* 차례 글자는 이스케이프한 그대로(마크다운 기호 포함 — 앱도 글자 마디로 넣던 것과 같음) */
  has(h, '<li class="l3"><a href="#h-2">**나**</a></li>');
  /* 출처는 새 창 + 안내 */
  has(h, 'target="_blank" rel="noopener" aria-label="자료 (새 창에서 열림)"');
  /* 차례가 3개 미만이면 휴대폰 차례 없음, 위기·응급이 아니면 줄 없음 */
  const plain = DK.docHtml({ slug: 'x', meta: { title: 't', tags: [] }, html: '', toc: [{ id: 'h-1', text: '가', level: 2 }], minutes: 1, sec: {}, list: [], articles: [], links: null, EV: {} });
  not(plain, 'toc-m'); not(plain, 'class="crisis"'); not(plain, 'class="emergency"'); not(plain, 'keypoints');
  has(plain, '<div class="doc-slot" data-slot="lead"></div>', '빈 lead 자리(css 가 :empty 로 숨김)');
});

test('docHtml: 함께 읽기(태그가 겹치는 글 6편)·앞뒤 문서·역링크(10편 + "그 밖에")는 앱이 그리던 규칙 그대로', function () {
  const list = [{ slug: 'p', title: 'P', section: '1', tags: [] }, { slug: 'x', title: 'X', section: '1', tags: ['t'] }, { slug: 'n', title: 'N', section: '1', tags: [] }];
  eq(DK.prevNext(list, 'x'), { prev: list[0], next: list[2] });
  eq(DK.prevNext(list, 'p').prev, null);
  const arts = [{ slug: 'a', tags: ['t'] }, { slug: 'b', tags: ['t', 'u'] }, { slug: 'c', tags: [] }, { slug: 'x', tags: ['t', 'u'] }];
  eq(DK.related(arts, 'x', ['t', 'u']).map(function (a) { return a.slug; }), ['b', 'a'], '겹친 수가 많은 순, 자기 자신은 빼기');
  const by = {}; for (let i = 0; i < 12; i++) by['s' + i] = { slug: 's' + i, title: 'S' + i, section: '1' };
  const links = { in: { x: Object.keys(by).concat(['없는글']) } };
  eq(DK.backlinkList(links, 'x', by).length, 12, '없는 글은 빼기');
  eq(DK.backlinkList(null, 'x', by), []);
  eq(DK.backlinkList({ in: { __proto__: ['s1'] } }, '__proto__', by), [], '원형 이름');
  const h = DK.docHtml({ slug: 'x', meta: { title: 'X', tags: [] }, html: '', toc: [], minutes: 1, sec: { id: '1', title: '분류' }, list: list, articles: [], bySlug: by, links: links, EV: {} });
  has(h, '이 문서를 가리키는 문서 12개');
  has(h, '그 밖에 2개 문서가 더 있어요.');
  has(h, '<a class="prev" href="#/a/p"><small>앞 문서</small>P</a>');
});

/* ---------- 저장소가 막힌 브라우저의 검색어 넘기기(F1 9번) ---------- */
test('검색어 넘기기: sessionStorage 를 못 쓰면 window.name 에 한 번(위기 말은 문장 없이 카드 종류만), 받는 쪽은 history.state 꼴로', function () {
  const H = DK.handoff();
  const detect = function (v) { return /죽고/.test(v) ? { level: 'high' } : /때리/.test(v) ? { level: 'harm' } : /자살률/.test(v) ? { level: 'watch' } : null; };
  const n1 = H.pack('환청', '2', detect);
  eq(n1.indexOf(H.PREFIX), 0);
  eq(H.unpack(n1, 5), { q: '환청', s: '2', at: 5 });
  /* 위기 말: 글자는 싣지 않음 */
  const n2 = H.pack('죽고 싶어', '', detect);
  not(n2, '죽고');
  eq(H.unpack(n2, 7), { q: '', s: '', at: 7, crisis: ['high'] });
  eq(H.unpack(H.pack('때리고 싶어', '', detect), 1).crisis, ['harm']);
  eq(H.unpack(H.pack('자살률 통계', '', detect), 1).crisis, ['watch']);
  eq(H.unpack(H.pack('x', '', function () { return { level: 'high', harm: true }; }), 1).crisis, ['high', 'harm']);
  /* 감지기가 없거나 던져도 그대로 검색어만 */
  eq(H.unpack(H.pack('망상', '', null), 1), { q: '망상', s: '', at: 1 });
  eq(H.unpack(H.pack('망상', '', function () { throw new Error('x'); }), 1).q, '망상');
  /* 우리 꼴이 아니면 무시(다른 사이트·옛 값), 깨진 JSON·모르는 카드 종류 */
  eq(H.unpack('', 1), null);
  eq(H.unpack('something', 1), null);
  eq(H.unpack(H.PREFIX + '{', 1), null);
  eq(H.unpack(H.PREFIX + '[1]', 1), null);
  eq(H.unpack(H.PREFIX + JSON.stringify({ q: '', s: '', crisis: ['evil', 'high', 'high'] }), 1).crisis, ['high']);
  eq(H.unpack(H.PREFIX + JSON.stringify({ q: 3, s: {} }), 1), { q: '', s: '', at: 1 });
});

test('검색어 넘기기: app.js 는 저장소가 예외일 때만 window.name 을 쓰고, 어느 화면이든 열리면 지우며 찾기 화면에서만 history.state 로 옮긴다(주소에는 싣지 않음)', function () {
  const src = read('js/app.js');
  const gs = src.slice(src.indexOf('function goSearch('), src.indexOf('function takeNameHandoff('));
  ok(/if \(!saved && \(v \|\| s\)\) \{ try \{ window\.name = HO\.pack\(v, s, JHB\.crisis && JHB\.crisis\.detect\); \}/.test(gs), 'sessionStorage 실패 때만');
  has(gs, "location.href = L('#/search');", '주소는 쿼리 없는 search/');
  not(gs, '?q=');
  const tk = src.slice(src.indexOf('function takeNameHandoff('), src.indexOf('/* ---------- 상단 검색창 #q'));
  has(tk, "window.name = ''", '읽으면 지움');
  has(tk, 'isSearch ? HO.unpack(name, Date.now()) : null');
  const rt = src.slice(src.indexOf('function route()'), src.indexOf('function staticFeatureBody('));
  has(rt, "takeNameHandoff(p[0] === 'search')");
  has(rt, 'history.replaceState(ho, \'\', location.pathname + location.hash)');
});

/* ---------- 앱의 살리기 길(소스 약속) ---------- */
test('app.js: 그 글의 #doc-meta 가 있으면 #app 을 비우지 않고 원문을 받지 않으며, 이벤트는 모듈이 다 실린 뒤 한 번씩', function () {
  const src = read('js/app.js');
  const art = src.slice(src.indexOf('  function article(slug) {'), src.indexOf('  function staticDoc(slug) {'));
  ok(art.indexOf('const pre = staticDoc(slug);') >= 0 && art.indexOf('const pre = staticDoc(slug);') < art.indexOf("show([el('p.empty', null, ['문서를 불러오고 있어요.'])]"), '정적 본문을 먼저 봄');
  ok(/if \(pre\) \{[\s\S]*?afterModules\(function \(\) \{[\s\S]*?finishDoc\(d, h, true\);[\s\S]*?return;\s*\}/.test(art), '살리기 길은 afterModules 뒤 finishDoc(정적)');
  const sd = src.slice(src.indexOf('  function staticDoc(slug) {'), src.indexOf('  function docSlots(art) {'));
  has(sd, 'j.slug !== slug', '다른 글의 메타는 쓰지 않음');
  has(sd, "SLOT_NAMES.some(function (n) { return !slots[n]; })", '자리 4개가 다 있어야 살림(옛 정적 HTML 은 새로 그림)');
  const fd = src.slice(src.indexOf('  function finishDoc(d, h, fromStatic) {'), src.indexOf('/* ---------- 문서 마크업'));
  ok(fd.indexOf('if (fromStatic) pageEvent();') < fd.indexOf("new CustomEvent('jhb:article'"), 'jhb:page 다음 jhb:article');
});

/* ---------- 움직임 줄이기(F3 코어 요청) ---------- */
test('움직임 줄이기: 차례 이동은 reducedMotion(), 붙는 머리 줄은 JHB.app.reducedMotion 을 먼저, 머리 스크립트는 저장된 motion 을 첫 그리기 전에', function () {
  const app = read('js/app.js');
  const jt = app.slice(app.indexOf('  function jumpTo(id) {'), app.indexOf('  function jumpTo(id) {') + 700);
  has(jt, "behavior: reducedMotion() ? 'auto' : 'smooth'");
  not(jt, "matchMedia('(prefers-reduced-motion");
  has(app, "document.documentElement.getAttribute('data-motion') === 'reduce'", 'reducedMotion 은 보기 설정도 봄');
  const st = read('js/ui/sticky.js');
  const rd = st.slice(st.indexOf('function reduce()'), st.indexOf('function topH()'));
  ok(rd.indexOf('A.reducedMotion') >= 0 && rd.indexOf('A.reducedMotion') < rd.indexOf('matchMedia'), 'JHB.app.reducedMotion 먼저, 없으면 matchMedia');
  const sh = read('tools/shell.html');
  has(sh, "if (s.motion === 'reduce') r.setAttribute('data-motion', 'reduce');");
  ok(sh.indexOf("data-motion") < sh.indexOf('</head>'), '머리(첫 그리기 전)');
});
