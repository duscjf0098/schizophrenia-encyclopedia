/* js/progress.js 테스트: 읽은 문서 기록·진행률·이어서 읽기 */
const P = require('../js/progress.js');

function fakeStore() {
  const mem = {};
  return {
    mem: mem,
    get: function (k, fb) { return k in mem ? JSON.parse(mem[k]) : fb; },
    set: function (k, v) { mem[k] = JSON.stringify(v); return true; }
  };
}
function fresh() { const s = fakeStore(); return { s: s, p: P.create(s) }; }

const A = [
  { slug: 's1a', section: '1', order: 1, title: '1-1' },
  { slug: 's1b', section: '1', order: 2, title: '1-2' },
  { slug: 's1c', section: '1', order: 3, title: '1-3' },
  { slug: 's2a', section: '2', order: 1, title: '2-1' },
  { slug: 's2b', section: '2', order: 2, title: '2-2' }
];
const COURSES = [
  { id: 'c1', title: '처음 진단받았어요', steps: [{ slug: 's1a' }, { slug: 's1b' }, { slug: 's2a' }] },
  { id: 'c2', title: '가족을 위해', steps: [{ slug: 's2a' }, { slug: 's2b' }, { slug: 's1c' }, { slug: 's1a' }] }
];

test('markRead 기록·갱신: 같은 slug 는 시간만 바뀌고 개수는 그대로', function () {
  const t = fresh();
  ok(!t.p.isRead('s1a'));
  t.p.markRead('s1a', 100);
  ok(t.p.isRead('s1a'));
  eq(t.p.count(), 1);
  t.p.markRead('s1a', 200);
  eq(t.p.count(), 1);
  eq(t.s.get('jhb.read'), { s1a: 200 });
});

test('readSlugs 는 최근순(최신이 앞)', function () {
  const t = fresh();
  t.p.markRead('s1a', 10); t.p.markRead('s2a', 30); t.p.markRead('s1b', 20);
  eq(t.p.readSlugs(), ['s2a', 's1b', 's1a']);
  t.p.markRead('s1a', 40);
  eq(t.p.readSlugs(), ['s1a', 's2a', 's1b']);
});

test('sectionProgress: 섹션별 read/total/pct (섹션 id 는 문자열·숫자 모두)', function () {
  const t = fresh();
  t.p.markRead('s1a', 1);
  eq(t.p.sectionProgress(A, '1'), { read: 1, total: 3, pct: 33 });
  eq(t.p.sectionProgress(A, 1), { read: 1, total: 3, pct: 33 });
  eq(t.p.sectionProgress(A, '2'), { read: 0, total: 2, pct: 0 });
  eq(t.p.sectionProgress(A, '9'), { read: 0, total: 0, pct: 0 });
});

test('overall: 전체 진행률, 목록에 없는 slug 는 세지 않음', function () {
  const t = fresh();
  eq(t.p.overall(A), { read: 0, total: 5, pct: 0 });
  t.p.markRead('s1a', 1); t.p.markRead('s2b', 2); t.p.markRead('ghost', 3);
  eq(t.p.overall(A), { read: 2, total: 5, pct: 40 });
});

test('nextInSection ①: 뒤쪽 첫 안 읽은 문서', function () {
  const t = fresh();
  t.p.markRead('s1a', 1);
  eq(t.p.nextInSection(A, 's1a').slug, 's1b');
  t.p.markRead('s1b', 2);
  eq(t.p.nextInSection(A, 's1a').slug, 's1c');
});

test('nextInSection ②: 뒤가 다 읽혔으면 앞쪽 첫 안 읽은 문서', function () {
  const t = fresh();
  t.p.markRead('s1c', 1);
  eq(t.p.nextInSection(A, 's1c').slug, 's1a');
  t.p.markRead('s1a', 2);
  eq(t.p.nextInSection(A, 's1c').slug, 's1b');
});

test('nextInSection ③: 섹션을 다 읽었거나 slug 가 없으면 null', function () {
  const t = fresh();
  t.p.markRead('s1a', 1); t.p.markRead('s1b', 2); t.p.markRead('s1c', 3);
  eq(t.p.nextInSection(A, 's1b'), null);
  eq(t.p.nextInSection(A, 'nope'), null);
});

test('continueReading 규칙③: 아무것도 안 읽었으면 null', function () {
  const t = fresh();
  eq(t.p.continueReading(A, COURSES), null);
  eq(t.p.continueReading(A, []), null);
});

test('continueReading 규칙①: 진행률 가장 높은 미완 코스의 다음 step', function () {
  const t = fresh();
  t.p.markRead('s2a', 1); t.p.markRead('s2b', 2);
  // c1: 1/3(33%), c2: 2/4(50%) → c2, 다음 안 읽은 step 은 s1c
  const r = t.p.continueReading(A, COURSES);
  eq(r.kind, 'course');
  eq(r.course.id, 'c2');
  eq(r.article.slug, 's1c');
  eq(r.reason, '"가족을 위해" 코스 2/4. 다음 문서예요.');
});

test('continueReading 규칙①: 다 읽은 코스는 건너뛰고, 읽은 게 없는 코스는 제안하지 않음', function () {
  const t = fresh();
  t.p.markRead('s1a', 1); t.p.markRead('s1b', 2); t.p.markRead('s2a', 3);
  // c1 완료(3/3) → 제외, c2 는 2/4 로 진행 중 → c2 의 s2b
  const r = t.p.continueReading(A, COURSES);
  eq(r.kind, 'course');
  eq(r.course.id, 'c2');
  eq(r.article.slug, 's2b');
  // 코스에 포함되지 않은 문서만 읽었으면 코스 제안 없이 섹션 규칙으로
  const u = fresh();
  u.p.markRead('s1c', 1);
  const only = [{ id: 'x', title: 'x', steps: [{ slug: 's2a' }, { slug: 's2b' }] }];
  eq(u.p.continueReading(A, only).kind, 'section');
});

test('continueReading 규칙②: 코스가 없으면 가장 최근 읽은 문서의 nextInSection', function () {
  const t = fresh();
  t.p.markRead('s2a', 10); t.p.markRead('s1a', 20);
  const r = t.p.continueReading(A);
  eq(r.kind, 'section');
  eq(r.course, undefined);
  eq(r.article.slug, 's1b');
  has(r.reason, '"1-1"');
  has(r.reason, '예요.');
  // 섹션을 모두 읽어 다음이 없으면 null
  const u = fresh();
  u.p.markRead('s2a', 1); u.p.markRead('s2b', 2);
  eq(u.p.continueReading(A, []), null);
});

test('courseProgress: read/total/pct/next', function () {
  const t = fresh();
  eq(t.p.courseProgress(COURSES[0]), { read: 0, total: 3, pct: 0, next: { slug: 's1a' } });
  t.p.markRead('s1a', 1); t.p.markRead('s2a', 2);
  eq(t.p.courseProgress(COURSES[0]), { read: 2, total: 3, pct: 67, next: { slug: 's1b' } });
  t.p.markRead('s1b', 3);
  eq(t.p.courseProgress(COURSES[0]), { read: 3, total: 3, pct: 100, next: null });
});

test('clear: 기록을 모두 지움', function () {
  const t = fresh();
  t.p.markRead('s1a', 1); t.p.markRead('s1b', 2);
  eq(t.p.count(), 2);
  t.p.clear();
  eq(t.p.count(), 0);
  eq(t.p.readSlugs(), []);
  eq(t.s.get('jhb.read'), {});
});

test('깨진 저장값(배열·문자열)은 빈 기록으로 취급', function () {
  const s = fakeStore();
  s.set('jhb.read', ['s1a']);
  const p = P.create(s);
  eq(p.count(), 0);
  p.markRead('s1a', 1);
  eq(s.get('jhb.read'), { s1a: 1 });
});
