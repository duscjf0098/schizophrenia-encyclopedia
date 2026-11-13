/* M6 "다음 걸음과 관련 질문" 테스트: data/kb/nextsteps.json 검사 + js/ui/nextsteps.js 의 고르기 함수(pick)
   고르는 근거는 글 사이 링크·읽기 코스·분류·손으로 정한 표뿐(읽은 기록 없음). 같은 입력이면 같은 결과. */
const fs = require('fs');
const path = require('path');

function load(file) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8');
  const JHB = {};
  new Function('window', 'JHB', src)({ JHB: JHB }, JHB);
  return JHB;
}
function readJson(rel) {
  const raw0 = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  const raw = raw0.charCodeAt(0) === 0xFEFF ? raw0.slice(1) : raw0;
  return JSON.parse(raw);
}
const toc = load('toc.js').toc;
const courses = load('courses.js').courses;
const links = load('links.js').links;
const hand = readJson('data/kb/nextsteps.json');
const NS = require('../js/ui/nextsteps.js');
const articles = toc.articles;
const bySlug = {};
articles.forEach(function (a) { bySlug[a.slug] = a; });

/* plan-final 3-5 의 새 글 slug 33편(아직 글이 없어도 표에 쓸 수 있어요. 화면은 실제로 있는 글만 보여요) */
const NEW_SLUGS = [
  'psychosis-what-is', 'polydipsia-hyponatremia', 'heat-and-medication', 'trauma-and-psychosis', 'comorbid-substance-use',
  'diagnosis-emotions', 'neuroleptic-malignant-syndrome', 'heart-and-antipsychotics', 'other-medical-care', 'drug-level-test',
  'psychoeducation', 'shared-decision-making', 'womens-health', 'family-violence-safety', 'missing-person', 'suicide-bereavement',
  'for-friends', 'for-teachers', 'for-coworkers-managers', 'family-grief', 'psychiatric-emergency-system', 'guardian-duties',
  'treatment-cost-support', 'medical-cost-safety-net', 'habeas-corpus-relief', 'family-care-leave', 'counseling-voucher-and-screening',
  'justice-system', 'faq-ai-chatbot', 'faq-early-signs', 'faq-hide-meds-in-food', 'faq-family-talk-doctor', 'faq-memory-meds'
];
const KNOWN = new Set(articles.map(function (a) { return a.slug; }).concat(NEW_SLUGS));
const ROLE_KEYS = ['self', 'family', 'near', 'any'];
const ROLES = [null, 'self', 'family', 'near', 'curious'];
function isFaqSlug(s) { return bySlug[s] ? String(bySlug[s].section) === '15' : /^faq-/.test(s); }
function isCrisis(s) { return !!bySlug[s] && (bySlug[s].tags || []).indexOf('위기') >= 0; }
function run(slug, role, extra) {
  return NS.pick(Object.assign({ slug: slug, role: role, articles: articles, courses: courses, links: links, hand: hand }, extra || {}));
}
function slugs(r) { return r.steps.map(function (s) { return s.slug; }); }

/* ---------- 데이터: data/kb/nextsteps.json ---------- */
test('nextsteps.json: 손 지정 30~40편, 모양이 { slug: { self|family|near|any: [slug…] } }', function () {
  ok(hand && typeof hand === 'object' && !Array.isArray(hand), '객체여야 해요');
  const keys = Object.keys(hand);
  ok(keys.length >= 30 && keys.length <= 40, '손 지정 글 수 ' + keys.length);
  keys.forEach(function (k) {
    const v = hand[k];
    ok(v && typeof v === 'object' && !Array.isArray(v), k + ': 값이 객체가 아니에요');
    Object.keys(v).forEach(function (r) {
      ok(ROLE_KEYS.indexOf(r) >= 0, k + ': 모르는 역할 키 ' + r);
      ok(Array.isArray(v[r]) && v[r].length > 0, k + '.' + r + ': 비어 있지 않은 배열이어야 해요');
      v[r].forEach(function (s) { ok(typeof s === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(s), k + '.' + r + ': slug 모양 ' + JSON.stringify(s)); });
    });
    ok(Array.isArray(v.any) && v.any.length > 0, k + ': any(역할을 정하지 않았을 때) 목록이 있어야 해요');
  });
});

test('nextsteps.json: 모든 slug 가 toc 나 새 slug 목록에 있다(키와 값 모두)', function () {
  Object.keys(hand).forEach(function (k) {
    ok(KNOWN.has(k), '모르는 글(키): ' + k);
    Object.keys(hand[k]).forEach(function (r) {
      hand[k][r].forEach(function (s) { ok(KNOWN.has(s), k + '.' + r + ': 모르는 글 ' + s); });
    });
  });
});

test('nextsteps.json: 자기 자신·목록 안 중복 없음, 자주 묻는 질문을 빼면 목록마다 3편 이하', function () {
  Object.keys(hand).forEach(function (k) {
    ok(!isFaqSlug(k), k + ': 손 지정 키는 자주 묻는 질문 글이 아니어야 해요(질문 글은 본문 링크로 충분)');
    Object.keys(hand[k]).forEach(function (r) {
      const list = hand[k][r];
      ok(list.indexOf(k) < 0, k + '.' + r + ': 자기 자신을 가리켜요');
      eq(new Set(list).size, list.length, k + '.' + r + ': 중복');
      const steps = list.filter(function (s) { return !isFaqSlug(s); });
      ok(steps.length <= 3, k + '.' + r + ': 다음 걸음 후보가 ' + steps.length + '편(3편까지)');
      ok(list.length <= 5, k + '.' + r + ': 목록이 너무 길어요(' + list.length + ')');
    });
  });
});

test('nextsteps.json: 위기 글의 손 지정은 역할마다 위기 아닌 글(회복·도움)을 섞는다', function () {
  Object.keys(hand).filter(isCrisis).forEach(function (k) {
    ROLES.forEach(function (role) {
      const r = run(k, role);
      ok(r.steps.length > 0, k + '/' + role + ': 다음 걸음이 비었어요');
      ok(r.steps.some(function (s) { return !isCrisis(s.slug); }), k + '/' + role + ': 위기 글만 이어져요 ' + JSON.stringify(slugs(r)));
    });
  });
});

/* ---------- 고르기 함수: 모든 글 × 모든 역할 ---------- */
test('pick: 284편 × 역할 5가지 — 결정적, 3편·4개 이하, 자기 자신·중복·없는 글 없음, 질문 글은 관련 질문으로만', function () {
  let n = 0;
  articles.forEach(function (a) {
    ROLES.forEach(function (role) {
      const r1 = run(a.slug, role), r2 = run(a.slug, role);
      eq(r1, r2, a.slug + '/' + role + ': 같은 입력에 다른 결과');
      ok(r1.steps.length <= 3, a.slug + ': 다음 걸음 ' + r1.steps.length + '편');
      ok(r1.faqs.length <= 4, a.slug + ': 관련 질문 ' + r1.faqs.length + '개');
      const all = slugs(r1).concat(r1.faqs);
      ok(all.indexOf(a.slug) < 0, a.slug + '/' + role + ': 자기 자신이 나와요');
      eq(new Set(all).size, all.length, a.slug + '/' + role + ': 중복 ' + JSON.stringify(all));
      all.forEach(function (s) { ok(bySlug[s], a.slug + ': 없는 글 ' + s); });
      slugs(r1).forEach(function (s) { ok(String(bySlug[s].section) !== '15', a.slug + ': 다음 걸음에 질문 글 ' + s); });
      r1.faqs.forEach(function (s) { ok(String(bySlug[s].section) === '15', a.slug + ': 관련 질문에 질문 아닌 글 ' + s); });
      n++;
    });
  });
  eq(n, articles.length * ROLES.length);
});

test('pick: 거의 모든 글에 다음 걸음이 1편 이상(질문 글 포함)', function () {
  const empty = articles.filter(function (a) { return run(a.slug, null).steps.length === 0; }).map(function (a) { return a.slug; });
  eq(empty, [], '다음 걸음이 빈 글');
});

test('pick: 위기 글 뒤에는 위기 글만 오지 않는다(모든 위기 글 × 역할)', function () {
  articles.filter(function (a) { return isCrisis(a.slug); }).forEach(function (a) {
    ROLES.forEach(function (role) {
      const r = run(a.slug, role);
      if (!r.steps.length) return;
      ok(r.steps.some(function (s) { return !isCrisis(s.slug); }), a.slug + '/' + role + ': ' + JSON.stringify(slugs(r)));
    });
  });
});

test('pick: 입력 배열·표를 바꾸지 않는다', function () {
  const before = JSON.stringify([hand, links.out['auditory-hallucination'], courses[0].steps]);
  run('auditory-hallucination', 'family', { courseId: 'living-with-positive' });
  run('suicide-warning-signs', null);
  eq(JSON.stringify([hand, links.out['auditory-hallucination'], courses[0].steps]), before);
});

/* ---------- 규칙별 ---------- */
test('환청: 역할에 따라 손 지정 표를 따른다(가족 → 가족용 다음 걸음)', function () {
  const fam = slugs(run('auditory-hallucination', 'family'));
  eq(fam, hand['auditory-hallucination'].family.filter(function (s) { return !isFaqSlug(s) && bySlug[s]; }).slice(0, 3));
  ok(fam.indexOf('family-during-symptoms') >= 0 && fam.indexOf('leap-communication') >= 0, '가족 대응·대화법: ' + JSON.stringify(fam));
  ok(run('auditory-hallucination', 'family').byRole, '가족 목록을 썼으면 byRole');
  eq(slugs(run('auditory-hallucination', 'self'))[0], 'living-with-voices');
  const any = slugs(run('auditory-hallucination', null));
  eq(any, hand['auditory-hallucination'].any.filter(function (s) { return !isFaqSlug(s) && bySlug[s]; }).slice(0, 3));
  eq(slugs(run('auditory-hallucination', 'curious')), any, '궁금해서 왔어요 = 역할 없음과 같은 표(any)');
  ok(run('auditory-hallucination', null).faqs.indexOf('faq-voices-persist') >= 0, '손 지정의 질문 글은 관련 질문으로');
});

test('역할 값: self·family·near·curious 만 받고 나머지는 역할 없음으로', function () {
  eq(NS.normRole('near'), 'near');
  eq(NS.normRole('curious'), 'curious');
  eq(NS.normRole('admin'), null);
  eq(NS.normRole(undefined), null);
  eq(run('auditory-hallucination', 'zz'), run('auditory-hallucination', null));
});

test('손 지정의 역할 목록이 짧으면 any 와 자동 규칙으로 3편까지 채운다', function () {
  const fake = { 'auditory-hallucination': { family: ['family-during-symptoms'], any: ['hallucination-overview'] } };
  const s = slugs(run('auditory-hallucination', 'family', { hand: fake }));
  eq(s.slice(0, 2), ['family-during-symptoms', 'hallucination-overview']);
  eq(s.length, 3);
});

test('손 지정이 없으면: 코스 다음 글 → 본문 링크 → 같은 묶음(없으면 같은 분류)의 다음 글', function () {
  /* 손 지정을 비우고 자동 규칙만 본다 */
  const c = courses.filter(function (x) { return x.id === 'first-diagnosis'; })[0];
  const i = c.steps.findIndex(function (st) { return st.slug === 'first-episode'; });
  ok(i >= 0, 'first-diagnosis 코스에 first-episode 가 있어야 해요');
  const nextInCourse = c.steps.slice(i + 1).map(function (st) { return st.slug; }).filter(function (s) { return bySlug[s] && !isFaqSlug(s); })[0];
  const r = run('first-episode', null, { hand: {} });
  eq(r.steps[0].slug, nextInCourse, '코스 다음 글이 맨 앞');
  eq(r.steps[0].from, 'course');
  /* 코스에 없고 본문 링크가 있는 글 */
  const lone = articles.filter(function (a) {
    const inCourse = courses.some(function (x) { return x.steps.some(function (st) { return st.slug === a.slug; }); });
    const outs = (links.out[a.slug] || []).filter(function (s) { return bySlug[s] && !isFaqSlug(s); });
    return !inCourse && outs.length >= 1 && String(a.section) !== '15';
  })[0];
  ok(lone, '코스에 없고 본문 링크가 있는 글이 하나는 있어야 해요');
  const r2 = run(lone.slug, null, { hand: {} });
  eq(r2.steps[0].slug, links.out[lone.slug].filter(function (s) { return bySlug[s] && !isFaqSlug(s); })[0], lone.slug + ': 본문 링크가 먼저');
  eq(r2.steps[0].from, 'link');
});

test('본문 링크: 역할이 가족·주변 사람이면 10·11 분류 글을 앞에', function () {
  const fakeLinks = { out: { 'positive-overview': ['cbtp', 'sleep', 'emergency-response', 'mental-health-center'] }, in: {} };
  const self = slugs(run('positive-overview', 'self', { hand: {}, courses: [], links: fakeLinks }));
  eq(self, ['cbtp', 'sleep', 'emergency-response']);
  const fam = slugs(run('positive-overview', 'family', { hand: {}, courses: [], links: fakeLinks }));
  eq(fam, ['emergency-response', 'mental-health-center', 'cbtp']);
  eq(slugs(run('positive-overview', 'near', { hand: {}, courses: [], links: fakeLinks })), fam);
});

test('같은 묶음의 다음 글: groups 가 있으면 묶음 순서(끝이면 앞으로 돌아감), 없으면 분류 순서', function () {
  const groups = [{ section: '2', first: [], groups: [{ title: '환각', slugs: ['hallucination-overview', 'auditory-hallucination', 'visual-hallucination', 'other-hallucinations'] }] }];
  const noLinks = { out: {}, in: {} };
  eq(slugs(run('visual-hallucination', null, { hand: {}, courses: [], links: noLinks, groups: groups })), ['other-hallucinations', 'hallucination-overview', 'auditory-hallucination']);
  /* 객체 모양(분류 id → 항목)도 받는다 */
  eq(slugs(run('visual-hallucination', null, { hand: {}, courses: [], links: noLinks, groups: { 2: groups[0] } })), ['other-hallucinations', 'hallucination-overview', 'auditory-hallucination']);
  /* groups 없음 → 분류 순서의 다음 글 */
  const sec = articles.filter(function (a) { return String(a.section) === '2'; }).map(function (a) { return a.slug; });
  const at = sec.indexOf('visual-hallucination');
  eq(slugs(run('visual-hallucination', null, { hand: {}, courses: [], links: noLinks }))[0], sec[at + 1]);
});

test('실제 groups.json(분류 소묶음, 있을 때만)을 넣어도 규칙이 지켜지고 묶음에서 고른 글이 나온다', function () {
  const file = path.join(__dirname, '..', 'data', 'kb', 'groups.json');
  if (!fs.existsSync(file)) return; /* 분류 소묶음 작업 전에는 건너뜀 */
  const groups = readJson('data/kb/groups.json');
  let fromGroup = 0;
  articles.forEach(function (a) {
    ROLES.forEach(function (role) {
      const r = run(a.slug, role, { groups: groups });
      eq(r, run(a.slug, role, { groups: groups }), a.slug + ': 결정적');
      const all = slugs(r).concat(r.faqs);
      ok(all.indexOf(a.slug) < 0 && new Set(all).size === all.length && r.steps.length <= 3, a.slug + '/' + role + ': ' + JSON.stringify(all));
      slugs(r).forEach(function (s) { ok(bySlug[s] && String(bySlug[s].section) !== '15', a.slug + ': ' + s); });
      if (isCrisis(a.slug) && r.steps.length) ok(r.steps.some(function (s) { return !isCrisis(s.slug); }), a.slug + '/' + role + ': 위기 글만');
      fromGroup += r.steps.filter(function (s) { return s.from === 'group'; }).length;
    });
  });
  ok(fromGroup > 0, '묶음에서 고른 글이 하나도 없어요');
});

test('코스로 왔으면(?course=) 손 지정이 먼저이고, 코스 다음 글은 코어의 코스 안내에 맡겨 여기서 빼요(같은 링크 두 번 방지)', function () {
  const c = courses.filter(function (x) { return x.steps.some(function (st) { return st.slug === 'auditory-hallucination'; }); })[0];
  ok(c, '환청이 든 코스');
  const i = c.steps.findIndex(function (st) { return st.slug === 'auditory-hallucination'; });
  const nx = c.steps.slice(i + 1).map(function (st) { return st.slug; }).filter(function (s) { return bySlug[s]; })[0];
  const r = run('auditory-hallucination', 'family', { courseId: c.id });
  eq(r.steps[0].slug, hand['auditory-hallucination'].family[0], '손 지정이 맨 앞');
  ok(slugs(r).concat(r.faqs).indexOf(nx) < 0, '코스 다음 글(' + nx + ')은 코어 .course-nav 가 보여 주니 빼요');
  /* 손 지정이 없어도 코스 다음 글은 빼요(자동 규칙의 나머지는 그대로) */
  const fakeCourses = [{ id: 'zz', who: '모두', steps: [{ slug: 'cbtp' }, { slug: 'sleep' }, { slug: 'exercise' }] }];
  const noLinks = { out: { cbtp: ['sleep', 'positive-self-help'] }, in: {} };
  const e = run('cbtp', null, { courseId: 'zz', courses: fakeCourses, hand: {}, links: noLinks });
  ok(slugs(e).indexOf('sleep') < 0, '코스로 왔을 때 코스 다음 글이 본문 링크로 되돌아오지 않아요: ' + JSON.stringify(slugs(e)));
  eq(slugs(e)[0], 'positive-self-help');
  const n = run('cbtp', null, { courses: fakeCourses, hand: {}, links: noLinks });
  eq(n.steps[0], { slug: 'sleep', from: 'course', course: 'zz' }, '?course= 가 없으면 코스 다음 글을 2단계에 써요');
  /* 모르는 코스 id 는 무시 */
  eq(run('auditory-hallucination', 'family', { courseId: 'zz-none' }), run('auditory-hallucination', 'family'));
});

test('코스 다음 글이 질문 글이면 다음 걸음에는 넣지 않고 관련 질문 후보로(코스로 왔으면 코어 안내에 맡김)', function () {
  const fakeCourses = [{ id: 'zz', who: '모두', steps: [{ slug: 'myths' }, { slug: 'faq-whose-fault' }, { slug: 'genetics' }] }];
  const r = run('myths', null, { courses: fakeCourses, hand: {}, links: { out: {}, in: {} } });
  eq(r.faqs[0], 'faq-whose-fault');
  ok(slugs(r).indexOf('faq-whose-fault') < 0);
  const e = run('myths', null, { courseId: 'zz', courses: fakeCourses, hand: {}, links: { out: {}, in: {} } });
  ok(e.faqs.indexOf('faq-whose-fault') < 0 && slugs(e).indexOf('faq-whose-fault') < 0);
});

test('skip: 글 끝의 다른 안내(.course-nav)가 이미 보여 주는 글은 어디에도 내지 않아요', function () {
  const base = run('auditory-hallucination', 'family');
  const s0 = base.steps[0].slug;
  const r = run('auditory-hallucination', 'family', { skip: [s0, 'faq-voices-persist'] });
  ok(slugs(r).concat(r.faqs).indexOf(s0) < 0 && r.faqs.indexOf('faq-voices-persist') < 0, JSON.stringify(r));
  eq(r.steps.length, 3);
});

test('seen: 본문 끝 "더 읽을 글"에 이미 있는 글은 뒤로 미루고, 빈자리는 다른 후보로 채워요', function () {
  const readMore = ['living-with-voices', 'cbtp', 'faq-voices-persist', 'voices-across-cultures', 'family-during-symptoms'];
  const r = run('auditory-hallucination', 'family', { seen: readMore });
  eq(r.steps.length, 3);
  slugs(r).forEach(function (s) { ok(readMore.indexOf(s) < 0, '더 읽을 글과 겹쳐요: ' + s + ' ' + JSON.stringify(slugs(r))); });
  eq(slugs(r).slice(0, 2), ['leap-communication', 'mental-health-center'], '손 지정 가족 목록 가운데 겹치지 않는 것이 먼저');
  ok(r.byRole);
  /* 질문 글도 겹치면 뒤로(자리가 남으면 그대로 보여요) */
  const fake = { out: {}, in: { 'auditory-hallucination': ['faq-voices-persist', 'faq-cure'] } };
  eq(run('auditory-hallucination', null, { seen: ['faq-voices-persist'], links: fake, hand: {} }).faqs.slice(0, 2), ['faq-cure', 'faq-voices-persist']);
  /* 후보가 모두 겹치면 겹치는 것으로라도 채워요 */
  const only = run('cbtp', null, { hand: {}, courses: [], links: { out: { cbtp: ['sleep'] }, in: {} }, seen: ['sleep'], articles: articles.filter(function (a) { return a.slug === 'cbtp' || a.slug === 'sleep'; }) });
  eq(slugs(only), ['sleep']);
  /* 결정적 */
  eq(run('auditory-hallucination', 'family', { seen: readMore }), r);
});

test('byRole: 역할이 결과를 실제로 바꿨을 때만 true(손 지정·10·11 분류 앞세우기·역할 코스)', function () {
  eq(run('auditory-hallucination', null).byRole, false);
  eq(run('auditory-hallucination', 'curious').byRole, false, '궁금해서 왔어요는 any 와 같아요');
  /* 손 지정에 가족 목록이 없고 본문 링크에도 10·11 분류가 없으면 역할과 무관 */
  const fakeHand = { cbtp: { any: ['sleep', 'exercise'] } };
  const fl = { out: { cbtp: ['positive-self-help'] }, in: {} };
  eq(run('cbtp', 'family', { hand: fakeHand, courses: [], links: fl }).byRole, false);
  /* 10·11 분류 글을 앞세워 순서가 달라지면 true */
  const fl2 = { out: { cbtp: ['sleep', 'exercise', 'positive-self-help', 'emergency-response'] }, in: {} };
  eq(run('cbtp', 'family', { hand: {}, courses: [], links: fl2 }).byRole, true);
  /* 실제 자료: 모든 글 × 역할에서 byRole 은 불리언 */
  articles.forEach(function (a) { ROLES.forEach(function (role) { eq(typeof run(a.slug, role).byRole, 'boolean'); }); });
});

test('관련 질문: 위기 글 끝에서는 입원 질문을 뒤로 보내요', function () {
  const crisisSlugs = articles.filter(function (a) { return isCrisis(a.slug) && String(a.section) !== '15'; }).map(function (a) { return a.slug; });
  ok(crisisSlugs.indexOf('crisis-hotlines') >= 0);
  function admit(s) { return (bySlug[s].tags || []).some(function (t) { return t === '입원' || t === '강제입원'; }); }
  ROLES.forEach(function (role) {
    const f = run('crisis-hotlines', role).faqs;
    if (f.length) ok(!admit(f[0]), 'crisis-hotlines/' + role + ': 첫 질문이 입원 질문 ' + JSON.stringify(f));
  });
  crisisSlugs.forEach(function (s) {
    const f = run(s, 'self').faqs;
    const firstAdmit = f.findIndex(admit);
    if (firstAdmit >= 0) ok(f.slice(firstAdmit).every(admit), s + ': 입원 질문 뒤에 다른 질문 ' + JSON.stringify(f));
  });
  /* 위기 글이 아니면 순서를 바꾸지 않아요 */
  const fl = { out: {}, in: { 'admission-types': ['faq-forced-admission', 'faq-cure'] } };
  eq(run('admission-types', null, { hand: {}, links: fl }).faqs.slice(0, 2), ['faq-forced-admission', 'faq-cure']);
});

test('firstSentence: 질문 아래에 붙이는 답의 첫 문장', function () {
  eq(NS.firstSentence('권하지 않아요. 알게 되면 믿음이 무너질 수 있어요.'), '권하지 않아요.');
  eq(NS.firstSentence('대부분은 폭력과 관계없어요.'), '대부분은 폭력과 관계없어요.');
  eq(NS.firstSentence('마침표 없는 요약'), '마침표 없는 요약');
  eq(NS.firstSentence('2.5배 높아요. 다음'), '2.5배 높아요.', '숫자 안의 점에서 자르지 않아요');
  eq(NS.firstSentence(''), '');
  eq(NS.firstSentence(null), '');
  eq(NS.firstSentence('네. 할 수 있어요. 다만 준비가 필요해요.'), '네. 할 수 있어요.', '아주 짧은 첫 문장은 다음 문장까지');
  /* 실제 질문 글은 모두 첫 문장이 있어요 */
  articles.filter(function (a) { return String(a.section) === '15'; }).forEach(function (a) {
    const s = NS.firstSentence(a.summary);
    ok(s.length >= 4 && s.length <= 200, a.slug + ': ' + JSON.stringify(s));
  });
});

test('nextsteps.json 안전: 환청·망상 글의 가족 목록은 응급 대처로 바로 잇지 않고, 몰래 약 섞기 질문은 손 지정하지 않아요', function () {
  ['auditory-hallucination', 'persecutory-delusion'].forEach(function (k) {
    ok(hand[k].family.indexOf('emergency-response') < 0, k + '.family: ' + JSON.stringify(hand[k].family));
  });
  Object.keys(hand).forEach(function (k) {
    Object.keys(hand[k]).forEach(function (r) { ok(hand[k][r].indexOf('faq-hide-meds-in-food') < 0, k + '.' + r); });
  });
});

test('코스 고르기: ?course= 가 없으면 역할에 맞는 코스(당사자·가족), 그다음 코스 순서', function () {
  const cs = [
    { id: 'c1', who: '모두', steps: [{ slug: 'cbtp' }, { slug: 'sleep' }] },
    { id: 'c2', who: '가족', steps: [{ slug: 'cbtp' }, { slug: 'emergency-response' }] },
    { id: 'c3', who: '당사자', steps: [{ slug: 'cbtp' }, { slug: 'exercise' }] }
  ];
  eq(NS.courseFor('cbtp', cs, null, null).course.id, 'c1');
  eq(NS.courseFor('cbtp', cs, null, 'family').course.id, 'c2');
  eq(NS.courseFor('cbtp', cs, null, 'near').course.id, 'c2');
  eq(NS.courseFor('cbtp', cs, null, 'self').course.id, 'c3');
  eq(NS.courseFor('cbtp', cs, 'c3', 'family').course.id, 'c3');
  eq(NS.courseFor('cbtp', cs, 'c3', 'family').explicit, true);
  eq(NS.courseFor('sleep', cs, 'c2', null).course.id, 'c1', '그 글이 없는 코스 id 는 무시');
  eq(NS.courseFor('ziprasidone', cs, null, null), null);
});

test('관련 질문: 이 글을 링크한 질문 글(links.in ∩ 15분류)이 먼저, 4개까지', function () {
  const fakeLinks = { out: {}, in: { 'metabolic-side-effects': ['physical-health', 'faq-weight-gain', 'olanzapine', 'faq-exercise', 'faq-cost', 'faq-alcohol', 'faq-cure'] } };
  const r = run('metabolic-side-effects', null, { hand: {}, courses: [], links: fakeLinks });
  eq(r.faqs, ['faq-weight-gain', 'faq-exercise', 'faq-cost', 'faq-alcohol']);
  /* 실제 자료: 체중 질문은 대사 부작용 글 끝에 보여요 */
  ok(run('metabolic-side-effects', null).faqs.indexOf('faq-weight-gain') >= 0, '실제 links.js: 대사 부작용 → 약 먹고 살이 쪘어요');
});

test('관련 질문: 링크가 있는 질문 글은 거의 모두 어느 글 끝엔가 나타난다(고아 질문 줄이기)', function () {
  const shown = new Set();
  articles.forEach(function (a) { run(a.slug, null).faqs.forEach(function (s) { shown.add(s); }); });
  const faqs = articles.filter(function (a) { return String(a.section) === '15'; });
  const linked = faqs.filter(function (a) { return (links.out[a.slug] || []).some(function (s) { return bySlug[s] && String(bySlug[s].section) !== '15'; }); });
  const missing = linked.filter(function (a) { return !shown.has(a.slug); }).map(function (a) { return a.slug; });
  ok(missing.length <= Math.floor(linked.length * 0.1), '어디에도 안 나오는 질문 글 ' + missing.length + '/' + linked.length + ': ' + missing.join(', '));
});

test('위기 글 섞기: 후보가 모두 위기 글이면 회복·도움 글을 넣는다', function () {
  const fakeHand = { 'suicide-warning-signs': { any: ['crisis-hotlines', 'emergency-response', 'relapse-prevention-plan'] } };
  const r = run('suicide-warning-signs', null, { hand: fakeHand, links: { out: {}, in: {} }, courses: [] });
  eq(r.steps.length, 3);
  eq(slugs(r).slice(0, 2), ['crisis-hotlines', 'emergency-response']);
  ok(!isCrisis(r.steps[2].slug), '마지막 자리가 회복·도움 글: ' + r.steps[2].slug);
  eq(r.steps[2].from, 'help');
  ok(NS.HELP.indexOf(r.steps[2].slug) >= 0);
  /* 후보가 1편뿐이면 바꾸지 않고 더해요 */
  const r1 = run('suicide-warning-signs', null, { hand: { 'suicide-warning-signs': { any: ['crisis-hotlines'] } }, links: { out: {}, in: {} }, courses: [], articles: articles.filter(function (a) { return a.slug === 'suicide-warning-signs' || a.slug === 'crisis-hotlines' || NS.HELP.indexOf(a.slug) >= 0; }) });
  eq(r1.steps[0].slug, 'crisis-hotlines');
  ok(r1.steps.some(function (s) { return !isCrisis(s.slug); }));
});

test('없는 글·빈 자료에도 던지지 않는다', function () {
  eq(NS.pick({ slug: 'no-such', articles: articles }), { steps: [], faqs: [], byRole: false });
  eq(NS.pick({}), { steps: [], faqs: [], byRole: false });
  const r = NS.pick({ slug: 'cbtp', articles: articles, links: null, hand: null, courses: null, groups: null });
  ok(r.steps.length >= 1, '분류 순서만으로도 고름');
  /* 아직 글이 없는 slug 는 화면에서 건너뛴다 */
  const r2 = run('auditory-hallucination', 'family', { hand: { 'auditory-hallucination': { family: ['zz-not-yet', 'emergency-response'], any: ['zz-also-not'] } } });
  eq(r2.steps[0].slug, 'emergency-response');
});
