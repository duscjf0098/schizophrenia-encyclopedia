/* 특집 화면 선언 검사(tools/lib/assets.cjs)와 실제 js/pages/*.js 테스트 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const A = require('../tools/lib/assets.cjs');

function good(over) {
  return Object.assign({ id: 'guide', title: '상황별 길잡이', summary: '상황에 맞는 연락처와 글을 찾아요.', group: '안내' }, over || {});
}
function errs(d, fileId) { return A.validateDecl(d, fileId || d.id).errors; }

test('선언 검사: 올바른 선언은 오류 없음', function () {
  eq(errs(good()), []);
  eq(errs(good({ nav: ['top', 'side'], notice: ['general', 'device'], robots: 'noindex', order: 3, crisisLine: true, keywords: ['연락'], updated: '2026-11-13', lead: '소개' })), []);
});

test('선언 검사: 예약어는 막고 search 는 허용', function () {
  ['a', 's'].forEach(function (id) { ok(errs(good({ id: id })).length > 0, id + ' 는 막혀야 해요(한 글자)'); });
  ['fav', 'glossary', 'about', 'courses', 'course', 'random', 'css', 'js', 'data', 'content', 'docs', 'tools', 'tests', 'notfound'].forEach(function (id) {
    ok(errs(good({ id: id })).some(function (e) { return e.indexOf('예약어') >= 0; }), id + ' 가 예약어로 걸려야 해요');
  });
  eq(errs(good({ id: 'search' })), []);
});

test('선언 검사: id 는 파일 이름과 같고 형식을 지켜야 함', function () {
  ok(errs(good({ id: 'guide' }), 'guides').some(function (e) { return e.indexOf('파일 이름') >= 0; }));
  ['Guide', '1guide', 'g', 'guide_x', 'a-very-long-page-name-over-20'].forEach(function (id) {
    ok(errs(good({ id: id })).length > 0, id + ' 는 잘못된 id');
  });
  eq(errs(good({ id: 'red-flags' })), []);
});

test('선언 검사: summary 155자, group 값, nav·notice·robots 값', function () {
  eq(errs(good({ summary: '가'.repeat(155) })), []);
  ok(errs(good({ summary: '가'.repeat(156) })).some(function (e) { return e.indexOf('156자') >= 0; }));
  ok(errs(good({ summary: '' })).length > 0);
  ok(errs(good({ group: '기타' })).some(function (e) { return e.indexOf('group') >= 0; }));
  eq(errs(good({ group: '기록' })), []);
  ok(errs(good({ nav: ['footer'] })).length > 0);
  ok(errs(good({ notice: ['legal'] })).length > 0);
  ok(errs(good({ notice: ['dated'] })).some(function (e) { return e.indexOf('updated') >= 0; }), 'dated 는 updated 가 있어야');
  ok(errs(good({ robots: 'nofollow' })).length > 0);
  ok(errs(good({ data: ['Bad Name'] })).length > 0);
  ok(A.validateDecl(good({ extra: 1 }), 'guide').warnings.length === 1, '모르는 항목은 경고');
});

test('위기 줄: crisisLine:false 는 허락 목록 밖이면 오류, notice 의 crisis 는 crisisLine 으로 한 번만', function () {
  ok(errs(good({ crisisLine: false })).some(function (e) { return e.indexOf('crisisLine') >= 0; }), 'crisisLine:false 는 오류');
  eq(A.CRISIS_LINE_OFF_OK, []);
  eq(errs(good({ notice: ['general', 'crisis'] })), []);
  const n = A.normalizeDecl(good({ notice: ['crisis', 'device', 'crisis'] }));
  eq(n.notice, ['general', 'device']);
  eq(n.crisisLine, true);
});

test('정리: 기본값, 일반 고지는 늘 맨 앞, 정렬은 묶음→order→id', function () {
  const n = A.normalizeDecl(good({ notice: ['device'] }));
  eq(n.nav, ['side', 'palette']);
  eq(n.notice, ['general', 'device']);
  eq(n.robots, 'index');
  eq(n.crisisLine, true);
  eq(n.label, '상황별 길잡이');
  eq(typeof n.hasJs, 'boolean');
  const sorted = A.sortPages([
    { id: 'z', group: '기록', order: 1 }, { id: 'b', group: '안내', order: 20 }, { id: 'a', group: '안내', order: 20 }, { id: 'c', group: '지식', order: 1 }, { id: 'd', group: '안내', order: 5 }
  ]).map(function (x) { return x.id; });
  eq(sorted, ['d', 'a', 'b', 'c', 'z']);
});

test('pageDecls(): 폴더를 읽어 오류·중복을 모으고 pagesJs() 는 JHB.pages 배열을 만든다', function () {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jhb-pages-'));
  try {
    fs.mkdirSync(path.join(tmp, 'data', 'pages'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'data', 'kb'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'js', 'pages'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'data', 'pages', 'guide.json'), JSON.stringify(good({ data: ['contacts'], order: 2 })));
    fs.writeFileSync(path.join(tmp, 'data', 'pages', 'meds.json'), JSON.stringify(good({ id: 'meds', title: '약 한눈에', group: '지식' })));
    fs.writeFileSync(path.join(tmp, 'data', 'pages', 'broken.json'), '{ 이건 JSON 이 아님');
    fs.writeFileSync(path.join(tmp, 'data', 'pages', 'fav.json'), JSON.stringify(good({ id: 'fav' })));
    fs.writeFileSync(path.join(tmp, 'data', 'kb', 'contacts.json'), '{"a":1}');
    fs.writeFileSync(path.join(tmp, 'js', 'pages', 'guide.js'), '/* */');
    const r = A.pageDecls({ root: tmp });
    eq(r.pages.map(function (p) { return p.id; }), ['guide', 'meds']);
    eq(r.errors.length, 2, 'broken.json 과 예약어 fav');
    eq(r.pages[0].hasJs, true);
    eq(r.pages[1].hasJs, false);
    fs.writeFileSync(path.join(tmp, 'data', 'pages', 'meds.json'), JSON.stringify(good({ id: 'meds', title: '약', group: '지식', data: ['nope'] })));
    ok(A.pageDecls({ root: tmp }).errors.some(function (e) { return e.indexOf('data/kb/nope.json') >= 0; }), '없는 데이터 파일');
    const win = { JHB: {} };
    new Function('window', 'JHB', A.pagesJs(r.pages))(win, win.JHB);
    ok(Array.isArray(win.JHB.pages));
    eq(win.JHB.pages.length, 2);
    eq(Object.keys(win.JHB.pages[0]).sort(), ['crisisLine', 'data', 'group', 'hasCss', 'hasJs', 'id', 'keywords', 'label', 'lastmod', 'lead', 'nav', 'notice', 'order', 'robots', 'summary', 'title', 'updated']);
    const empty = { JHB: {} };
    new Function('window', 'JHB', A.pagesJs([]))(empty, empty.JHB);
    eq(empty.JHB.pages, []);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('상단 링크: me·browse 가 없으면 저장한 문서·아무 문서를 남긴다', function () {
  const none = A.topLinksHtml([], '../');
  has(none, 'href="../glossary/"');
  has(none, 'href="../random/"');
  has(none, 'href="../fav/"');
  const some = A.topLinksHtml([{ id: 'me', label: '내 서재', nav: ['top'] }, { id: 'browse', label: '둘러보기', nav: ['side'] }, { id: 'ask', label: '질문', nav: ['top'], robots: 'noindex' }], '');
  not(some, 'random/');
  not(some, 'fav/');
  has(some, '<a href="me/" class="tool-link" data-r="me">내 서재</a>');
  has(some, 'data-r="ask" rel="nofollow"');
  not(some, 'browse/');
});

test('실제 data/pages/*.json 은 모두 규칙을 지킨다', function () {
  const r = A.pageDecls();
  eq(r.errors, []);
});

test('실제 js/pages/*.js 는 node 에서 읽히고 id 가 파일 이름과 같으며 staticHtml 은 글자를 돌려준다', function () {
  const dir = path.join(__dirname, '..', 'js', 'pages');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(function (f) { return /\.js$/.test(f); }) : [];
  const decls = {}; A.pageDecls().pages.forEach(function (d) { decls[d.id] = d; });
  files.forEach(function (f) {
    const id = f.replace(/\.js$/, '');
    const mod = require(path.join(dir, f));
    eq(mod && mod.id, id, f + ' 의 id');
    ok(decls[id], f + ' 에 맞는 data/pages/' + id + '.json 이 있어야 해요');
    if (typeof mod.staticHtml === 'function') {
      const data = {};
      (decls[id].data || []).forEach(function (n) { data[n] = JSON.parse(A.stripBom(fs.readFileSync(path.join(__dirname, '..', 'data', 'kb', n + '.json'), 'utf8'))); });
      const html = mod.staticHtml({ data: data, esc: require('../js/md.js').esc, articles: {}, sections: [], page: decls[id] });
      eq(typeof html, 'string', f + ' staticHtml');
    }
    if (mod.render != null) eq(typeof mod.render, 'function', f + ' render');
  });
});

/* ---------- 사이트맵 lastmod: 선언의 "lastmod": "kb:<자료>:<날짜 항목>" ---------- */
function tmpRoot(files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jhb-lastmod-'));
  fs.mkdirSync(path.join(tmp, 'data', 'pages'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'data', 'kb'), { recursive: true });
  Object.keys(files || {}).forEach(function (rel) { fs.writeFileSync(path.join(tmp, rel), files[rel]); });
  return tmp;
}

test('선언 검사: lastmod 는 "kb:<이름>:<항목>" 꼴만(항목은 점 경로도), 가리키는 자료는 배열이나 객체여야 함', function () {
  eq(errs(good({ lastmod: 'kb:changes:date' })), [], '형식만 보면 통과(root 없음)');
  eq(errs(good({ lastmod: 'kb:red-flags:source.updated' })), [], '점 경로(K5-3)');
  ['2026-11-14', 'kb:changes', 'kb::date', 'kb:Changes:date', 'kb:changes:da-te', 'changes:date', 7, 'kb:x:.a', 'kb:x:a.', 'kb:x:a..b'].forEach(function (v) {
    ok(errs(good({ lastmod: v })).some(function (e) { return e.indexOf('lastmod') >= 0; }), JSON.stringify(v) + ' 는 잘못된 lastmod');
  });
  const tmp = tmpRoot({
    'data/kb/log.json': JSON.stringify([{ date: '2026-10-25' }, { date: '2026-11-12' }, { date: 'x' }]),
    'data/kb/obj.json': '{"date":"2026-11-12","source":{"updated":"2026-11-13"}}',
    'data/kb/num.json': '7',
    'data/kb/empty.json': '[]',
    'data/kb/broken.json': '[{'
  });
  try {
    const at = function (v) { return A.validateDecl(good({ lastmod: v }), 'guide', { root: tmp }); };
    eq(at('kb:log:date').errors, []);
    ok(at('kb:nope:date').errors.some(function (e) { return e.indexOf('data/kb/nope.json') >= 0; }), '없는 자료');
    eq(at('kb:obj:date').errors, [], '배열이 아닌 자료도 읽어요(K5-3)');
    eq(at('kb:obj:source.updated').warnings, [], '점 경로로 날짜를 찾음');
    ok(at('kb:obj:source.nope').warnings.some(function (w) { return w.indexOf('source.nope') >= 0; }), '없는 경로는 경고(updated 로 대신)');
    ok(at('kb:num:date').errors.some(function (e) { return e.indexOf('배열') >= 0; }), '배열·객체가 아닌 자료는 오류');
    ok(at('kb:broken:date').errors.length > 0, '깨진 JSON');
    eq(at('kb:empty:date').errors, [], '빈 배열은 오류가 아님');
    ok(at('kb:empty:date').warnings.some(function (w) { return w.indexOf('날짜') >= 0; }), '빈 배열은 경고(updated 로 대신)');
    ok(at('kb:log:when').warnings.some(function (w) { return w.indexOf('when') >= 0; }), '날짜 항목이 하나도 없으면 경고');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('lastmod 풀기: kb 자료의 가장 최근 날짜, 없으면 updated, 둘 다 없으면 빈 글자', function () {
  const tmp = tmpRoot({ 'data/kb/log.json': JSON.stringify([{ date: '2026-10-25' }, { date: '2026-11-12' }, { date: '2026-11-03' }, { date: '2026-13-99x' }, null, { date: 20261231 }]), 'data/kb/empty.json': '[]' });
  try {
    const o = { root: tmp };
    eq(A.resolveLastmod(A.normalizeDecl(good({ lastmod: 'kb:log:date', updated: '2026-11-14' }), o), o), '2026-11-12', 'updated 보다 자료 날짜가 앞섬');
    eq(A.resolveLastmod(A.normalizeDecl(good({ lastmod: 'kb:empty:date', updated: '2026-11-14' }), o), o), '2026-11-14', '자료에 날짜가 없으면 updated');
    eq(A.resolveLastmod(A.normalizeDecl(good({ updated: '2026-11-01' }), o), o), '2026-11-01', 'lastmod 가 없으면 updated');
    eq(A.resolveLastmod(A.normalizeDecl(good(), o), o), '', '둘 다 없으면 빈 글자(빌드가 오늘 날짜로)');
    eq(A.normalizeDecl(good({ lastmod: 'kb:log:date' }), o).lastmod, 'kb:log:date');
    eq(A.normalizeDecl(good(), o).lastmod, '');
    /* 폴더 전체 읽기에서도 같은 검사 */
    fs.writeFileSync(path.join(tmp, 'data', 'pages', 'guide.json'), JSON.stringify(good({ lastmod: 'kb:none:date' })));
    ok(A.pageDecls(o).errors.some(function (e) { return e.indexOf('data/kb/none.json') >= 0; }));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('실제 고침 기록: kb:changes:date 는 data/kb/changes.json 의 가장 최근 date', function () {
  const list = JSON.parse(A.stripBom(fs.readFileSync(path.join(__dirname, '..', 'data', 'kb', 'changes.json'), 'utf8')));
  const max = list.map(function (x) { return x && x.date; }).filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }).sort().pop();
  const d = A.normalizeDecl(good({ id: 'changes', lastmod: 'kb:changes:date', updated: '2000-01-01' }));
  eq(A.resolveLastmod(d), max);
});

/* ---------- 정적 페이지 만들기(tools/build-pages.cjs 의 순수 도우미. require 만으로는 파일을 쓰지 않음) ---------- */
const B = require('../tools/build-pages.cjs');
const hub = require('../js/ui/hub.js');
const md = require('../js/md.js');
function slugsIn(html) {
  const out = []; const re = /<li class="row" data-slug="([a-z0-9-]+)"/g; let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

test('build-pages 를 require 해도 파일을 쓰지 않고 도우미만 내보낸다', function () {
  ['sectionMainHtml', 'sectionArticles', 'staticCtx', 'prtStaticHtml', 'docMetaInput', 'coursesDesc', 'featureLastmod'].forEach(function (k) {
    eq(typeof B[k], 'function', k);
  });
});

test('특집 화면 staticHtml 문맥: data·esc·articles·sections·glossary·courses·page', function () {
  const d = { id: 'browse' };
  const ctx = B.staticCtx(d, { groups: [] });
  eq(Object.keys(ctx).sort(), ['articles', 'courses', 'data', 'esc', 'glossary', 'page', 'sections']);
  ok(Array.isArray(ctx.glossary) && ctx.glossary.length > 0, '용어 사전');
  ok(Array.isArray(ctx.courses) && ctx.courses.length > 0, '읽기 코스');
  ok(ctx.articles['what-is-schizophrenia'], 'articles 는 slug 색인');
  eq(ctx.page, d);
  eq(ctx.esc('<a>'), '&lt;a&gt;');
});

test('분류 정적 HTML: 묶음 자료가 있으면 hub.arrange 와 같은 순서·제목, 없으면 평평한 목록', function () {
  const s = { id: '7', title: '약물 치료', desc: '약' };
  const list = [{ slug: 'a1', title: '가', summary: '요약 <1>' }, { slug: 'a2', title: '나' }, { slug: 'a3', title: '다', evidence: 'A' }, { slug: 'a4', title: '라' }];
  const entry = { section: '7', first: ['a3', 'zz', 'a1'], groups: [{ title: '시작 & 기본', slugs: ['a3', 'zz', 'a2'] }, { title: '빈 묶음', slugs: ['zz'] }] };
  const html = B.sectionMainHtml(s, list, entry);
  has(html, '<h2 class="hb-first-h" id="hb-first-h">먼저 읽을 글</h2>');
  has(html, '<span class="hb-gt">시작 &amp; 기본</span><span class="hb-gn">2편</span>');
  has(html, '<span class="hb-gt">그 밖의 글</span><span class="hb-gn">2편</span>');
  not(html, '빈 묶음');
  has(html, 'href="#hb-g-1"');
  has(html, 'section class="hb-group hb-extra" id="hb-g-2"');
  has(html, '요약 &lt;1&gt;');
  const plan = hub.arrange(entry, list);
  const flat = []; plan.groups.forEach(function (g) { g.items.forEach(function (a) { flat.push(a.slug); }); });
  eq(slugsIn(html), flat, '묶음 안 글 순서');
  eq(slugsIn(html), ['a3', 'a2', 'a1', 'a4']);
  const first = []; const re = /<li data-slug="([a-z0-9-]+)"><a href="#\/a\//g; let m;
  while ((m = re.exec(html))) first.push(m[1]);
  eq(first, ['a3', 'a1'], '먼저 읽을 글(없는 slug 건너뜀)');
  /* 묶음 자료 없음 → 지금처럼 평평한 목록(묶음 제목 없음) */
  const plain = B.sectionMainHtml(s, list, null);
  not(plain, 'hb-');
  eq(slugsIn(plain), ['a1', 'a2', 'a3', 'a4']);
  has(plain, '<p class="page-lead">약. 문서 4개.</p>', '앱의 분류 머리와 같은 문장');
  /* 4·5·10·11 분류는 "힘들 때 바로" 한 줄(위기 상담 전화 글이 있을 때) */
  has(B.sectionMainHtml({ id: '10', title: '가족', desc: '가족' }, list, entry), '힘들 때 바로: <a href="#/a/crisis-hotlines">위기 상담 전화</a>');
  not(html, 'hb-help');
});

test('분류 정적 HTML: js/ui/hub.js 가 없어도 빌드가 멈추지 않고 평평한 목록', function () {
  eq(B.loadHub('../js/ui/no-such-hub-module.js'), null, '없는 모듈은 null');
  ok(B.loadHub('../js/ui/hub.js') && typeof B.loadHub('../js/ui/hub.js').arrange === 'function', '있으면 그대로');
  const s = { id: '7', title: '약물 치료', desc: '약' };
  const list = [{ slug: 'a1', title: '가' }, { slug: 'a2', title: '나' }];
  const entry = { section: '7', first: ['a2'], groups: [{ title: '묶음', slugs: ['a2'] }] };
  const old = B.setHub(null);
  try {
    const html = B.sectionMainHtml(s, list, entry);
    not(html, 'hb-');
    eq(slugsIn(html), ['a1', 'a2']);
    has(html, '<p class="page-lead">약. 문서 2개.</p>');
  } finally { B.setHub(old); }
  has(B.sectionMainHtml(s, list, entry), 'hb-first', '원래 hub 로 돌아옴');
});

test('실제 분류마다 정적 HTML 의 글 순서가 앱(hub.arrange)과 같고 글이 빠지지 않는다', function () {
  const groups = JSON.parse(A.stripBom(fs.readFileSync(path.join(__dirname, '..', 'data', 'kb', 'groups.json'), 'utf8')));
  const secs = B.sections.filter(function (s) { return !s.glossary; });
  ok(secs.length >= 10);
  secs.forEach(function (s) {
    const list = B.sectionArticles(s.id);
    const entry = groups.filter(function (g) { return g.section === s.id; })[0] || null;
    const html = B.sectionMainHtml(s, list, entry);
    const plan = hub.arrange(entry, list);
    const want = plan ? [].concat.apply([], plan.groups.map(function (g) { return g.items.map(function (a) { return a.slug; }); })) : list.map(function (a) { return a.slug; });
    eq(slugsIn(html), want, '분류 ' + s.id);
    eq(slugsIn(html).slice().sort(), list.map(function (a) { return a.slug; }).sort(), '분류 ' + s.id + ' 의 모든 글이 한 번씩');
  });
});

test('분류 글 순서는 앱의 sectionArticles 와 같은 규칙(order → 제목 가나다)', function () {
  const list = B.sectionArticles('7');
  ok(list.length > 5);
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    const oa = a.order || 999, ob = b.order || 999;
    ok(oa < ob || (oa === ob && a.title.localeCompare(b.title, 'ko') <= 0), a.slug + ' → ' + b.slug);
  }
});

test('정적 문서: 인쇄용 한 줄(.prt-static)은 사이트 이름과 정식 글 주소, 근거 줄에 reviewed 를 넘긴다', function () {
  const h = B.prtStaticHtml('crisis-hotlines');
  has(h, 'class="prt-static"');
  has(h, '조현병 백과');
  has(h, B.SITE + 'a/crisis-hotlines/');
  ok(/^https:\/\/[^/]+\/[^/]+\/$/.test(B.SITE), '정식 주소(canonical 과 같은 사이트 주소)');
  not(h, 'prt-head');
  const o = B.docMetaInput({ slug: 'x', evidence: 'A', minutes: 4, updated: '2026-11-01' }, { reviewed: '2026-11-14', updated: '2026-11-02' }, '');
  eq(o.reviewed, '2026-11-14');
  eq(o.updated, '2026-11-02');
  eq(o.minutes, 4);
  eq(o.evidence, 'A');
  eq(B.docMetaInput({ slug: 'x', minutes: 2 }, {}, '').reviewed, undefined, 'reviewed 가 없으면 넘기지 않음');
});

test('build-index 의 글 항목: reviewed(YYYY-MM-DD)는 frontmatter 에 있을 때만, 나머지 모양은 그대로', function () {
  const I = require('../tools/build-index.cjs');
  const base = { title: '제목', summary: '요약', tags: ['위기'], updated: '2026-11-01', evidence: 'A', order: '3' };
  const a = I.tocEntry('s1', '7', Object.assign({ reviewed: '2026-11-14' }, base), '본문');
  eq(a.reviewed, '2026-11-14');
  eq(Object.keys(a), ['slug', 'section', 'title', 'summary', 'tags', 'updated', 'evidence', 'minutes', 'order', 'reviewed']);
  eq(a.order, 3);
  const b = I.tocEntry('s2', '7', base, '본문');
  eq(Object.keys(b), ['slug', 'section', 'title', 'summary', 'tags', 'updated', 'evidence', 'minutes', 'order'], 'reviewed 없는 글의 모양은 예전과 같음');
  eq(I.tocEntry('s3', '7', Object.assign({ reviewed: '언젠가' }, base), '').reviewed, undefined, '날짜가 아니면 넣지 않음');
  /* 없는 날짜는 넣지 않음: 화면(md.docMetaText 의 realDay)과 같은 기준 */
  ['2026-13-40', '2026-02-30', '2026-00-10', '2025-02-29', '2026-11-14x'].forEach(function (v) {
    eq(I.tocEntry('s5', '7', { reviewed: v }, '').reviewed, undefined, v);
    eq(md.docMetaText(1, '', v).reviewed, '', '화면도 ' + v + ' 를 안 보임');
  });
  ['2024-02-29', '2026-12-31', ' 2026-01-01 '].forEach(function (v) {
    eq(I.tocEntry('s6', '7', { reviewed: v }, '').reviewed, v.trim(), v);
    ok(md.docMetaText(1, '', v.trim()).reviewed !== '', '화면도 ' + v + ' 를 보임');
  });
  eq(I.tocEntry('s4', '7', {}, '').title, 's4', '제목이 없으면 slug');
});

test('읽기 코스 설명의 코스 수는 data/courses.js 에서', function () {
  const w = { JHB: {} };
  new Function('window', 'JHB', fs.readFileSync(path.join(__dirname, '..', 'data', 'courses.js'), 'utf8'))(w, w.JHB);
  has(B.coursesDesc(w.JHB.courses), '코스 ' + w.JHB.courses.length + '개');
  has(B.coursesDesc([{}, {}, {}]), '코스 3개');
});

test('읽기 코스 머리 문장은 앱(js/app.js 의 coursesPage)과 같은 글자, 코스 수는 설명에만', function () {
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  const i = app.indexOf('function coursesPage(');
  ok(i >= 0, 'coursesPage');
  const body = app.slice(i, app.indexOf('function coursePage(', i));
  const m = /el\('p\.page-lead', null, \['([^']+)'\]\)/.exec(body);
  ok(m, '앱의 코스 머리 문장');
  eq(B.COURSES_LEAD, m[1]);
  not(B.COURSES_LEAD, '코스 ');
});

test('특집 화면 사이트맵 날짜: lastmod 를 풀고, 없으면 updated, 그것도 없으면 오늘', function () {
  eq(B.featureLastmod({ updated: '2026-11-01', lastmod: '' }, '2026-11-14'), '2026-11-01');
  eq(B.featureLastmod({ updated: '', lastmod: '' }, '2026-11-14'), '2026-11-14');
  const d = A.normalizeDecl(good({ id: 'changes', lastmod: 'kb:changes:date', updated: '2000-01-01' }));
  const v = B.featureLastmod(d, '2099-01-01');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(v) && v !== '2000-01-01' && v !== '2099-01-01', v);
});

/* K5-3: "○○에 확인한 내용" 고지(dated)는 사이트맵 날짜와 같은 규칙(lastmod 가 있으면 자료에서 구한 날짜) */
test('K5-3 정적 고지: dated 날짜는 사이트맵 날짜와 같고(lastmod 가 있으면 자료 날짜), 없으면 선언의 updated', function () {
  eq(typeof B.featureNoticesHtml, 'function', 'build-pages 가 고지 함수를 내보냄');
  const lm = A.normalizeDecl(good({ id: 'changes', notice: ['general', 'dated'], lastmod: 'kb:changes:date', updated: '2000-01-01' }));
  const day = A.resolveLastmod(lm);
  const html = B.featureNoticesHtml(lm);
  has(html, md.noticeHtml('dated', day), '자료 날짜로 그린 고지');
  not(html, '2000년 1월 1일', '선언의 updated 가 아님');
  eq(B.featureLastmod(lm, '2099-01-01'), day, '사이트맵과 같은 날짜');
  const plain = A.normalizeDecl(good({ notice: ['general', 'dated'], updated: '2026-11-03' }));
  has(B.featureNoticesHtml(plain), md.noticeHtml('dated', '2026-11-03'));
  /* 고지 순서: 일반 → 선언 순서 → 위기 줄 한 번 */
  const parts = B.featureNoticesHtml(plain).match(/notice-[a-z]+/g);
  eq(parts, ['notice-general', 'notice-dated', 'notice-crisis']);
});

test('K5-3 앱: dated 고지는 progress.pageDate(선언, 자료)로 그리고, lastmod 자료를 그리기 전에 함께 받는다', function () {
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  const fn = app.slice(app.indexOf('function featureNotices('), app.indexOf('function featureHead('));
  has(fn, "k === 'dated' ? datedDay(d)", 'dated 고지의 날짜');
  not(fn, "k === 'dated' ? d.updated", '선언 updated 를 바로 쓰지 않음');
  has(app, 'PRG.pageDate(d, ');
  has(app, 'PRG.lastmodRef(d.lastmod)');
  const fp = app.slice(app.indexOf('function featurePage('), app.indexOf('function drawFeature('));
  has(fp, 'datedJob(d)', '그리기 전에 lastmod 자료를 받음(그린 뒤 날짜가 바뀌지 않게)');
});

/* ---------- 틀(tools/shell.html): 바닥글 위기 줄·인쇄용 한 줄 스타일·첫 화면 자리 표시 ---------- */
const SHELL = fs.readFileSync(path.join(__dirname, '..', 'tools', 'shell.html'), 'utf8');

test('바닥글 위기 줄: 109·1577-0199·119 세 번호가 모두 전화 링크', function () {
  const foot = SHELL.slice(SHELL.indexOf('<footer class="sitefoot">'), SHELL.indexOf('</footer>'));
  ok(foot.length > 0, '바닥글');
  has(foot, '<a href="tel:109">109</a>');
  has(foot, '<a href="tel:1577-0199">1577-0199</a>');
  has(foot, '<a href="tel:119">119</a>');
  has(foot, '생명이 위급하면');
  has(foot, '<p class="foot-links"><!--foot:start-->{{FOOT_LINKS}}<!--foot:end--></p>');
});

test('바닥글 위기 줄: 문자 안내 한 줄은 앱의 위기 고지(md.noticeHtml crisis·crisisHtml)와 같은 문장', function () {
  const foot = SHELL.slice(SHELL.indexOf('<footer class="sitefoot">'), SHELL.indexOf('</footer>'));
  const SMS = '전화가 어렵다면 109로 문자를 보낼 수 있어요.';
  /* 앱 고지에 문자 안내가 있으면 바닥글에도, 없으면 바닥글에도 없어야 해요(화면·정적 HTML·인쇄가 같은 한 줄) */
  const inApp = md.noticeHtml('crisis').indexOf(SMS) >= 0;
  eq(md.crisisHtml().indexOf(SMS) >= 0, inApp, '배너와 고지가 같음');
  eq(foot.indexOf(SMS) >= 0, inApp, '바닥글과 앱 고지가 같음');
  ok(inApp, 'K1-9 확인(마들랜 공식 안내) 뒤 문자 안내가 들어가 있음');
});

test('바닥글 링크 줄: 화면에서 누르는 높이 44px(글자 크기는 그대로), 인쇄에는 적용하지 않음', function () {
  const css = /<style>([\s\S]*?)<\/style>/.exec(SHELL)[1].replace(/\s+/g, ' ');
  ok(/@media screen \{ \.sitefoot \.foot-links a \{[^}]*min-height: 44px/.test(css), css);
  ok(!/\.foot-links a \{[^}]*font-size/.test(css), '글자 크기는 바꾸지 않음');
});

test('자바스크립트가 꺼진 화면: 머리 스크립트가 html.js 를 달고, 없으면 죽은 버튼(목차·글자 크기·테마)을 감춤', function () {
  const css = /<style>([\s\S]*?)<\/style>/.exec(SHELL)[1].replace(/\s+/g, ' ');
  ['#btn-nav', '#btn-fs', '#btn-theme'].forEach(function (sel) {
    has(css, 'html:not(.js) ' + sel, sel);
    has(SHELL, 'id="' + sel.slice(1) + '"', sel + ' 가 틀에 있음');
  });
  not(css, 'html:not(.js) #btn-help', '"지금 도움"은 링크라 그대로');
  ok(runHead({}, {}).classes.indexOf('js') >= 0, 'html.js');
  ok(runHead({}, {}, { throws: 'localStorage' }).classes.indexOf('js') >= 0, '저장소가 막혀도 html.js');
});

test('인쇄용 한 줄(.prt-static): 화면에서는 숨고 인쇄에서만, 인쇄 모듈 머리가 있으면 인쇄에서도 숨음', function () {
  const m = /<style>([\s\S]*?)<\/style>/.exec(SHELL);
  ok(m, 'shell 의 <style>');
  const css = m[1].replace(/\s+/g, ' ');
  ok(/(^|[^-\w])\.prt-static\s*\{\s*display:\s*none/.test(css), '화면에서 숨김');
  ok(/@media print\s*\{[^@]*\.prt-static\s*\{\s*display:\s*block/.test(css), '인쇄에서 보임');
  has(css, '.prt-head ~ .prt-static', 'print.js 의 머리가 있으면 숨김');
});

/* 머리의 인라인 스크립트를 가짜 저장소로 돌린다 */
function runHead(ls, ss, opt) {
  const src = /<script>([\s\S]*?)<\/script>/.exec(SHELL)[1];
  const attrs = {};
  const classes = [];
  Object.defineProperty(attrs, 'classes', { value: classes, enumerable: false });
  const root = { classList: { add: function (c) { classes.push(c); } }, getAttribute: function (k) { return k === 'data-base' ? '' : (attrs[k] != null ? attrs[k] : null); }, setAttribute: function (k, v) { attrs[k] = String(v); } };
  const area = function (o) { return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null; } }; };
  const win = {};
  ['localStorage', 'sessionStorage'].forEach(function (name, i) {
    const o = i ? ss : ls;
    if (opt && opt.throws === name) Object.defineProperty(win, name, { get: function () { throw new Error('SecurityError'); } });
    else win[name] = area(o || {});
  });
  const loc = { hash: '', replace: function () { throw new Error('옮기면 안 됨'); } };
  new Function('window', 'document', 'location', 'localStorage', 'sessionStorage', src)(win, { documentElement: root }, loc,
    opt && opt.throws === 'localStorage' ? undefined : win.localStorage, opt && opt.throws === 'sessionStorage' ? undefined : win.sessionStorage);
  return attrs;
}

/* data-hm-start 는 쓰지 않기로 했어요(K2-5 보류 → K4 에서 끝냄). 머리 스크립트는 이 속성을 달지 않고,
   그 속성을 읽던 css/ui/home.css 의 html[data-hm-start="line"] 규칙(72px 예약)도 K4 가 지웠어요. 그래서 다시 달아도 효과가 없어요.
   까닭(잰 값): K3 부터 코어가 다시 온 사람의 첫 화면을 처음부터 이어서 읽기·코스·오늘의 문서 순으로 그려서, 속성 없이도
   다시 온 사람 CLS 가 1280 0.014~0.017, 390 0.002~0.003 이에요(속성을 달아 본 비교: 1280 0.0148~0.0294, 390 0.003 — 줄지 않음).
   (그 전, K2 때는 속성을 달면 390px 0.10 → 0.35, 1280px 0.18~0.21 → 0.25~0.28 로 오히려 커졌어요.)
   이 테스트는 머리 스크립트가 그 속성을 달지 않는지만 지켜요 */
test('머리 스크립트: 테마·글자 크기만 적용하고(첫 화면 자리 표시 data-hm-start 는 쓰지 않음), 저장소에 닿을 수 없어도 던지지 않는다', function () {
  const a = runHead({ 'jhb.theme': '"dark"', 'jhb.fs': '"l"', 'jhb.ui.home.role': '"family"', 'jhb.recent': '["a"]' }, {});
  eq(a['data-theme'], 'dark');
  eq(a['data-fs'], 'l');
  eq(a['data-hm-start'], undefined);
  eq(runHead({ 'jhb.theme': '"blue"' }, {})['data-theme'], undefined, '모르는 테마');
  eq(runHead({}, {}, { throws: 'localStorage' })['data-theme'], undefined);
});
