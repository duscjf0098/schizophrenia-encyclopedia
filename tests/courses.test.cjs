/* data/courses.js 테스트: 읽기 코스 데이터 검사 */
const fs = require('fs');
const path = require('path');

function load(file) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8');
  const JHB = {};
  new Function('window', 'JHB', src)({ JHB: JHB }, JHB);
  return JHB;
}
const toc = load('toc.js').toc;
const courses = load('courses.js').courses;
const slugs = new Set(toc.articles.map(function (a) { return a.slug; }));
const CRISIS_COURSES = ['first-diagnosis', 'family-first', 'preventing-relapse'];
const CRISIS_DOCS = ['suicide-warning-signs', 'emergency-response'];

test('코스는 8개', function () {
  ok(Array.isArray(courses), 'JHB.courses 는 배열');
  eq(courses.length, 8);
});

test('id 는 유일하고 비어 있지 않다', function () {
  const ids = courses.map(function (c) { return c.id; });
  ids.forEach(function (id) { ok(typeof id === 'string' && id.length > 0, 'id 비어 있음'); });
  eq(new Set(ids).size, ids.length, 'id 중복');
});

test('title · who · intro 가 채워져 있다', function () {
  courses.forEach(function (c) {
    ok(typeof c.title === 'string' && c.title.trim().length > 0, c.id + ': title 비어 있음');
    ok(['당사자', '가족', '모두'].indexOf(c.who) >= 0, c.id + ': who 값 ' + JSON.stringify(c.who));
    ok(typeof c.intro === 'string' && c.intro.trim().length > 0, c.id + ': intro 비어 있음');
  });
});

test('steps 는 8~12개', function () {
  courses.forEach(function (c) {
    ok(Array.isArray(c.steps), c.id + ': steps 배열 아님');
    ok(c.steps.length >= 8 && c.steps.length <= 12, c.id + ': steps ' + c.steps.length + '개');
  });
});

test('모든 slug 가 toc 에 있다', function () {
  courses.forEach(function (c) {
    c.steps.forEach(function (s) {
      ok(slugs.has(s.slug), c.id + ': 없는 slug ' + JSON.stringify(s.slug));
    });
  });
});

test('한 코스 안에 slug 중복이 없다', function () {
  courses.forEach(function (c) {
    const list = c.steps.map(function (s) { return s.slug; });
    eq(new Set(list).size, list.length, c.id + ': slug 중복');
  });
});

test('why 는 비어 있지 않고 60자 이내', function () {
  courses.forEach(function (c) {
    c.steps.forEach(function (s) {
      ok(typeof s.why === 'string' && s.why.trim().length > 0, c.id + '/' + s.slug + ': why 비어 있음');
      ok(s.why.length <= 60, c.id + '/' + s.slug + ': why ' + s.why.length + '자');
    });
  });
});

test('위기 코스 3개에는 위기 문서가 들어 있다', function () {
  CRISIS_COURSES.forEach(function (id) {
    const c = courses.find(function (x) { return x.id === id; });
    ok(c, id + ' 코스 없음');
    const found = c.steps.some(function (s) { return CRISIS_DOCS.indexOf(s.slug) >= 0; });
    ok(found, id + ': ' + CRISIS_DOCS.join(' 또는 ') + ' 없음');
  });
});
