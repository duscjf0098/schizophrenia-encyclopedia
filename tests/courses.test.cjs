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
const WHO = ['당사자', '가족', '모두', '주변 사람'];
// 다른 모듈(첫 화면 역할·길잡이 등)이 쓰는 id. 바꾸지 않아요.
const OLD_IDS = ['first-diagnosis', 'family-first', 'starting-medication', 'negative-symptoms', 'living-with-positive',
  'preventing-relapse', 'system-support', 'research-curious'];
const NEW_WHO = {
  'near-first': '주변 사람', 'confusing-diagnosis': '모두', 'symptoms-remain': '당사자',
  'body-health': '당사자', 'work-school': '당사자', 'teens-twenties': '모두', 'hospital-stay': '모두',
  'partners-parents': '당사자', 'after-parents': '가족', 'money-rights': '모두'
};
const NEW_IDS = Object.keys(NEW_WHO);
// 지시서 T3 표의 제목. 제목을 바꾸기로 하면 여기도 함께 고쳐요.
const NEW_TITLE = {
  'near-first': '주변 사람이 조현병일 때', 'confusing-diagnosis': '진단이 헷갈릴 때',
  'symptoms-remain': '약을 먹어도 증상이 남을 때', 'body-health': '몸 건강 챙기기',
  'work-school': '일과 학업으로 돌아가기', 'teens-twenties': '10대·20대에 시작됐을 때',
  'hospital-stay': '입원 전후', 'partners-parents': '연인·배우자·부모로 살기',
  'after-parents': '부모가 떠난 뒤를 준비하기', 'money-rights': '돈과 권리'
};
const crisisTagged = new Set(toc.articles.filter(function (a) {
  return (Array.isArray(a.tags) ? a.tags : String(a.tags || '').split(/\s*,\s*/)).indexOf('위기') >= 0;
}).map(function (a) { return a.slug; }));
function byId(id) { return courses.find(function (x) { return x.id === id; }); }

test('코스는 18개', function () {
  ok(Array.isArray(courses), 'JHB.courses 는 배열');
  eq(courses.length, 18);
});

test('기존 코스 8개가 앞자리 순서 그대로 남아 있다', function () {
  eq(courses.slice(0, 8).map(function (c) { return c.id; }), OLD_IDS);
});

test('새 코스 10개가 정해진 id 와 who 로 있다', function () {
  NEW_IDS.forEach(function (id) {
    const c = byId(id);
    ok(c, id + ' 코스 없음');
    eq(c.who, NEW_WHO[id], id + ': who');
    eq(c.title, NEW_TITLE[id], id + ': title');
  });
});

test('id 는 유일하고 비어 있지 않다', function () {
  const ids = courses.map(function (c) { return c.id; });
  ids.forEach(function (id) { ok(typeof id === 'string' && id.length > 0, 'id 비어 있음'); });
  eq(new Set(ids).size, ids.length, 'id 중복');
});

test('title · who · intro 가 채워져 있다', function () {
  courses.forEach(function (c) {
    ok(typeof c.title === 'string' && c.title.trim().length > 0, c.id + ': title 비어 있음');
    ok(WHO.indexOf(c.who) >= 0, c.id + ': who 값 ' + JSON.stringify(c.who));
    ok(typeof c.intro === 'string' && c.intro.trim().length > 0, c.id + ': intro 비어 있음');
  });
});

test('intro 는 1~3문장', function () {
  courses.forEach(function (c) {
    const n = (c.intro.match(/[.!?](\s|$)/g) || []).length;
    ok(n >= 1 && n <= 3, c.id + ': intro 문장 ' + n + '개');
    // 마침표 없이 끝나는 문장이 세지 않고 빠지지 않도록 끝 글자도 봐요.
    ok(/[.!?]$/.test(c.intro.trim()), c.id + ': intro 가 문장 부호로 끝나지 않음');
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
    const c = byId(id);
    ok(c, id + ' 코스 없음');
    const found = c.steps.some(function (s) { return CRISIS_DOCS.indexOf(s.slug) >= 0; });
    ok(found, id + ': ' + CRISIS_DOCS.join(' 또는 ') + ' 없음');
  });
});

test('새 코스는 위기 태그 글이 절반을 넘지 않는다', function () {
  ok(crisisTagged.size > 0, '위기 태그 글을 하나도 못 찾음(태그 형식 확인)');
  NEW_IDS.forEach(function (id) {
    const c = byId(id);
    const n = c.steps.filter(function (s) { return crisisTagged.has(s.slug); }).length;
    ok(n * 2 <= c.steps.length, id + ': 위기 글 ' + n + '/' + c.steps.length);
  });
});

test('주변 사람·몸 건강·돈과 권리 코스에 지정한 새 글이 들어 있다', function () {
  const need = {
    'near-first': ['for-friends', 'for-teachers', 'for-coworkers-managers'],
    'body-health': ['heat-and-medication', 'heart-and-antipsychotics', 'polydipsia-hyponatremia'],
    'money-rights': ['treatment-cost-support', 'medical-cost-safety-net', 'habeas-corpus-relief']
  };
  Object.keys(need).forEach(function (id) {
    const list = byId(id).steps.map(function (s) { return s.slug; });
    need[id].forEach(function (slug) {
      ok(slugs.has(slug), slug + ' 글이 toc 에 없음');
      ok(list.indexOf(slug) >= 0, id + ': ' + slug + ' 빠짐');
    });
  });
});

test('주변 사람 코스에는 위기 연락처 글이 있다', function () {
  const list = byId('near-first').steps.map(function (s) { return s.slug; });
  ok(list.indexOf('crisis-hotlines') >= 0 || list.indexOf('emergency-response') >= 0, 'near-first: 위기 연락처 글 없음');
});

test('진단 분류 글은 코스 밖에 3편 이하만 남는다', function () {
  const inCourse = new Set();
  courses.forEach(function (c) { c.steps.forEach(function (s) { inCourse.add(s.slug); }); });
  const diag = toc.articles.filter(function (a) { return String(a.section) === '6'; });
  ok(diag.length >= 10, '진단 분류 글을 못 찾음');
  const out = diag.filter(function (a) { return !inCourse.has(a.slug); }).map(function (a) { return a.slug; });
  ok(out.length <= 3, '코스 밖 진단 글 ' + out.length + '편: ' + out.join(', '));
});
