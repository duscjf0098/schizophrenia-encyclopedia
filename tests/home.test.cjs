/* 첫 화면(home) 모듈의 순수 함수: 역할 값·목적지·상태, 코스 앞세우기, 새로 올라온 글, 살펴보기, 회복 글 고르기.
   js/ui/home.js 는 브라우저에서는 화면을 고치고, node 에서는 순수 함수만 내보낸다. */
const H = require('../js/ui/home.js');

/* 있는 것만 true 를 돌려주는 가짜 조회 */
function has(courses, articles) {
  return {
    course: function (id) { return courses.indexOf(id) >= 0; },
    article: function (slug) { return articles.indexOf(slug) >= 0; }
  };
}

test('home: 역할 값은 네 갈래(self·family·near·curious)만 받아요', function () {
  eq(H.ROLES, ['self', 'family', 'near', 'curious']);
  eq(H.normRole('near'), 'near');
  eq(H.normRole('self'), 'self');
  eq(H.normRole('friend'), null);
  eq(H.normRole(''), null);
  eq(H.normRole(null), null);
  eq(H.normRole(undefined), null);
  eq(H.normRole({}), null);
  eq(H.normRole('__proto__'), null);
});

test('home: 역할 이름과 "○○으로 보고 있어요" 조사', function () {
  eq(H.roleAs('self'), '당사자로');
  eq(H.roleAs('family'), '가족으로');
  eq(H.roleAs('near'), '주변 사람으로');
  eq(H.roleAs('curious'), '궁금해서 온 사람으로');
  eq(H.roleAs('x'), '');
});

test('home: 주변 사람(near) 목적지 = near-first 코스 → for-friends 글 → 분류 10', function () {
  eq(H.roleDest('near', has(['near-first', 'family-first'], ['for-friends'])), '#/course/near-first');
  eq(H.roleDest('near', has(['family-first'], ['for-friends'])), '#/a/for-friends');
  eq(H.roleDest('near', has([], [])), '#/s/10');
});

test('home: 다른 역할의 목적지(코스가 있으면 코스)', function () {
  const all = has(['first-diagnosis', 'family-first'], ['what-is-schizophrenia']);
  eq(H.roleDest('self', all), '#/course/first-diagnosis');
  eq(H.roleDest('family', all), '#/course/family-first');
  eq(H.roleDest('curious', all), '#/a/what-is-schizophrenia');
  const none = has([], []);
  eq(H.roleDest('self', none), '#/courses');
  eq(H.roleDest('family', none), '#/courses');
  eq(H.roleDest('curious', none), '#/s/1');
  eq(H.roleDest('nope', all), null);
});

test('home: 역할 자리 상태(처음·고름·접힘)', function () {
  eq(H.startState({ role: null, readCount: 0, recentCount: 0 }), 'first');
  eq(H.startState({ role: 'family', readCount: 0, recentCount: 0 }), 'chosen');
  eq(H.startState({ role: 'near', readCount: 5, recentCount: 3 }), 'chosen');
  eq(H.startState({ role: null, readCount: 1, recentCount: 0 }), 'collapsed', '글 한 편 읽은 뒤에도 접힌 줄로 남아요');
  eq(H.startState({ role: null, readCount: 0, recentCount: 2 }), 'collapsed');
  eq(H.startState({ role: 'bogus', readCount: 0, recentCount: 0 }), 'first', '모르는 값은 역할 없음으로');
  eq(H.startState({}), 'first');
});

test('home: 역할별 앞세울 코스에 near 가 있어요', function () {
  ok(H.roleCourses('near').indexOf('near-first') === 0, 'near 는 near-first 가 맨 앞');
  eq(H.roleCourses('family')[0], 'family-first');
  eq(H.roleCourses('self')[0], 'first-diagnosis');
  eq(H.roleCourses(null), []);
  eq(H.roleCourses('x'), []);
});

test('home: 첫 화면 코스 카드 고르기(역할 코스를 앞에, 개수는 그대로)', function () {
  const all = ['first-diagnosis', 'family-first', 'starting-medication', 'negative-symptoms', 'living-with-positive', 'preventing-relapse', 'system-support', 'research-curious', 'near-first'];
  const shown = all.slice(0, 4);
  eq(H.planCourses(all, shown, H.roleCourses(null)), shown, '역할이 없으면 그대로');
  eq(H.planCourses(all, shown, ['near-first', 'negative-symptoms', 'family-first']),
    ['near-first', 'negative-symptoms', 'family-first', 'first-diagnosis'], '보이지 않던 near-first 를 앞으로 데려와요');
  eq(H.planCourses(all, shown, ['family-first', 'preventing-relapse', 'system-support']),
    ['family-first', 'preventing-relapse', 'system-support', 'first-diagnosis']);
  eq(H.planCourses(all.slice(0, 8), shown, ['near-first', 'negative-symptoms', 'family-first']),
    ['negative-symptoms', 'family-first', 'first-diagnosis', 'starting-medication'], '아직 없는 코스는 건너뛰어요');
  eq(H.planCourses(all, shown, ['first-diagnosis', 'first-diagnosis']), shown, '중복 없음');
  eq(H.planCourses(all, [], ['near-first']), [], '보이던 카드가 없으면 만들지 않아요');
  const a1 = H.planCourses(all, shown, H.roleCourses('near')), a2 = H.planCourses(all, shown, H.roleCourses('near'));
  eq(a1, a2, '같은 입력이면 같은 결과');
});

test('home: 코스 링크에서 id 뽑기', function () {
  eq(H.courseIdOf('course/family-first/'), 'family-first');
  eq(H.courseIdOf('../course/near-first/?x=1'), 'near-first');
  eq(H.courseIdOf('#/course/first-diagnosis'), 'first-diagnosis');
  eq(H.courseIdOf('a/recovery/'), '');
  eq(H.courseIdOf(null), '');
});

test('home: 새로 올라온 글은 가장 최근 날짜, 위기·응급 글은 빼요', function () {
  const arts = [
    { slug: 'old', section: '1', order: 1, updated: '2026-10-23', tags: [] },
    { slug: 'n3', section: '10', order: 2, updated: '2026-11-14', tags: ['가족'] },
    { slug: 'n1', section: '7', order: 5, updated: '2026-11-14T09:00', tags: [] },
    { slug: 'n2', section: '10', order: 1, updated: '2026-11-14', tags: ['위기'] },
    { slug: 'n4', section: '4', order: 1, updated: '2026-11-14', tags: ['응급'] },
    { slug: 'n5', section: '15', order: 1, updated: '2026-11-14' }
  ];
  const r = H.pickNew(arts, 6);
  eq(r.date, '2026-11-14');
  eq(r.list.map(function (a) { return a.slug; }), ['n1', 'n3', 'n5']);
  eq(H.pickNew(arts, 2).list.length, 2);
  eq(H.pickNew([{ slug: 'a', updated: '2026-10-23' }, { slug: 'b', updated: '2026-10-23' }], 6), null, '모두 같은 날이면 만들지 않아요');
  eq(H.pickNew([{ slug: 'a', updated: '2026-10-23' }, { slug: 'b', updated: '2026-11-14', tags: ['위기'] }], 6), null, '남는 글이 없으면 만들지 않아요');
  eq(H.pickNew([], 6), null);
});

test('home: 살펴보기는 nav 에 home 이 있는 특집 화면만(순서 그대로)', function () {
  const pages = [
    { id: 'search', nav: [] },
    { id: 'guide', label: '길잡이', title: '상황별 길잡이', lead: '지금 상황에서', nav: ['top', 'home'] },
    { id: 'me', title: '내 서재', nav: ['top', 'side'] },
    { id: 'browse', title: '둘러보기', summary: '분류 지도', nav: ['home', 'palette'] },
    { id: 'bad' },
    null
  ];
  const r = H.homePages(pages);
  eq(r.map(function (p) { return p.id; }), ['guide', 'browse']);
  eq(r[0].name, '길잡이');
  eq(r[0].text, '지금 상황에서');
  eq(r[1].name, '둘러보기');
  eq(r[1].text, '분류 지도', 'lead 가 없으면 summary');
  eq(H.homePages([]), []);
  eq(H.homePages(null), []);
});

test('home: 회복 입구는 recovery 글, 없으면 비슷한 글', function () {
  eq(H.recoverySlug(function (s) { return ['recovery', 'faq-recovery-real'].indexOf(s) >= 0; }), 'recovery');
  eq(H.recoverySlug(function (s) { return s === 'faq-recovery-real'; }), 'faq-recovery-real');
  eq(H.recoverySlug(function () { return false; }), null);
});

test('home: 홈 화면에 추가 안내 숨김은 30일', function () {
  const day = 86400000, now = Date.UTC(2026, 10, 14);
  eq(H.installHiddenAt(0, now, 30), false);
  eq(H.installHiddenAt(now - 29 * day, now, 30), true);
  eq(H.installHiddenAt(now - 31 * day, now, 30), false);
  eq(H.installHiddenAt('abc', now, 30), false);
});

test('home: 당사자 카드는 진단받은 사람의 코스로 가니 설명도 진단받은 사람으로 좁혀요', function () {
  ok(H.ROLE_TEXT.self.d.indexOf('증상이 걱정') < 0, '증상만 걱정되는 사람을 진단 전제 코스로 보내지 않아요');
  eq(H.beforeDxSlug(function (s) { return s === 'diagnostic-process'; }), 'diagnostic-process');
  eq(H.beforeDxSlug(function (s) { return s === 'faq-early-signs'; }), 'faq-early-signs');
  eq(H.beforeDxSlug(function () { return false; }), null);
});

test('home: 새 탭·새 창으로 연 클릭은 역할 고르기가 아니에요', function () {
  eq(H.isPlainClick({ button: 0 }), true);
  eq(H.isPlainClick({ button: 0, ctrlKey: true }), false);
  eq(H.isPlainClick({ button: 0, metaKey: true }), false);
  eq(H.isPlainClick({ button: 0, shiftKey: true }), false);
  eq(H.isPlainClick({ button: 1 }), false);
  eq(H.isPlainClick({ button: 0, defaultPrevented: true }), false);
  eq(H.isPlainClick(null), false);
});

test('home: 위기·응급 글 가리기 기준(새로 올라온 글에서 빼는 기준, 오늘의 문서와 같음)', function () {
  eq(H.isSensitive({ tags: ['위기'] }), true);
  eq(H.isSensitive({ tags: ['응급', '약'] }), true);
  eq(H.isSensitive({ tags: ['가족'] }), false);
  eq(H.isSensitive({}), false);
  eq(H.isSensitive(null), false);
});

/* 코어가 맡게 된 일의 임시 처리는 지웠어요: 코스 카드는 JHB.app.courseCard, 첫 화면 최근 목록의 위기·응급 글은
   코어가 빼고(js/progress.js visibleRecent), 가린 최근 목록 키(jhb.ui.home.recentHidden)는 코어 settings 의 기본 키 */
test('home.js: 코어가 맡은 일의 복사본·빈 등록이 없다(코스 카드·위기 글 접기·recentHidden 등록)', function () {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'ui', 'home.js'), 'utf8');
  has(src, 'A.courseCard(c)', '데려오는 코스 카드는 코어 courseCard');
  not(src, '당사자와 가족에게', '코어 whoText 와 다른 옛 문구');
  not(src, 'foldSensitive');
  not(src, 'hm-sens');
  not(src, "'home-view'");
  ok(!/register\(\{[^}]*K_RECENT_HIDE/.test(src), 'recentHidden 을 다시 등록하지 않음');
  /* 기록 쉼 중 이 탭에서만 고른 역할(sessionStorage)은 코어 기본 종류에 없어서 모듈이 더해요 */
  has(src, 'session: r.session.concat([K_ROLE])');
  eq(typeof H.slugOfHref, 'undefined', '쓰는 곳이 없어진 slugOfHref 는 내보내지 않음');
});
