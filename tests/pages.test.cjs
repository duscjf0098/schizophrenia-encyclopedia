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
    eq(Object.keys(win.JHB.pages[0]).sort(), ['crisisLine', 'data', 'group', 'hasCss', 'hasJs', 'id', 'keywords', 'label', 'lead', 'nav', 'notice', 'order', 'robots', 'summary', 'title', 'updated']);
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
