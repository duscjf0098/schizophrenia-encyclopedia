/* M6·N1 "다음 걸음과 관련 질문" 테스트: data/kb/nextsteps.json 검사 + js/ui/nextsteps.js 의 고르기 함수(pick)
   고르는 근거는 글 사이 링크·읽기 코스·분류·손으로 정한 표뿐(읽은 기록 없음). 같은 입력이면 같은 결과.
   실제 자료 검사는 두 가지로 돌려요.
   - 기본(run): 표·코스·본문 링크만
   - 화면과 같게(runB): 브라우저가 넘기는 것처럼 본문 끝 "더 읽을 글"(content/**.md 에서 뽑음)과 실제 groups.json 까지 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function load(file) {
  const src = fs.readFileSync(path.join(ROOT, 'data', file), 'utf8');
  const JHB = {};
  new Function('window', 'JHB', src)({ JHB: JHB }, JHB);
  return JHB;
}
function readJson(rel) {
  const raw0 = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const raw = raw0.charCodeAt(0) === 0xFEFF ? raw0.slice(1) : raw0;
  return JSON.parse(raw);
}
const toc = load('toc.js').toc;
const courses = load('courses.js').courses;
const links = load('links.js').links;
const hand = readJson('data/kb/nextsteps.json');
const GROUPS = fs.existsSync(path.join(ROOT, 'data', 'kb', 'groups.json')) ? readJson('data/kb/groups.json') : null;
const NS = require('../js/ui/nextsteps.js');
const articles = toc.articles;
const bySlug = {};
articles.forEach(function (a) { bySlug[a.slug] = a; });

/* 본문 끝 "더 읽을 글" 소절의 글 링크(브라우저의 readMoreSlugs 와 같은 뜻). content 가 없으면 null */
function readMoreMap() {
  const dir = path.join(ROOT, 'content');
  if (!fs.existsSync(dir)) return null;
  const map = {};
  (function walk(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach(function (e) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) return walk(p);
      if (!/\.md$/.test(e.name)) return;
      const out = [];
      let on = false;
      fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach(function (ln) {
        if (/^##\s/.test(ln)) { on = /^##\s+더 읽을 글\s*$/.test(ln); return; }
        if (!on) return;
        const re = /\]\((?:\.\.\/)*#?\/?a\/([a-z0-9][a-z0-9-]*)\/?\)/g;
        let m;
        while ((m = re.exec(ln))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
      });
      map[path.basename(e.name, '.md')] = out;
    });
  })(dir);
  return map;
}
const READMORE = readMoreMap();

const ROLE_KEYS = ['self', 'family', 'near', 'any'];
const ROLES = [null, 'self', 'family', 'near', 'curious'];
function isFaqSlug(s) { return bySlug[s] ? String(bySlug[s].section) === '15' : /^faq-/.test(s); }
function tagged(s, t) { return !!bySlug[s] && (bySlug[s].tags || []).indexOf(t) >= 0; }
function isCrisis(s) { return tagged(s, '위기'); }
function isAlarm(s) { return tagged(s, '위기') || tagged(s, '응급'); }
function isHeavy(s) { return NS.HEAVY.indexOf(s) >= 0; }
function isAdmitTopic(s) { return tagged(s, '입원') || tagged(s, '강제입원'); }
function run(slug, role, extra) {
  return NS.pick(Object.assign({ slug: slug, role: role, articles: articles, courses: courses, links: links, hand: hand }, extra || {}));
}
/* 화면과 같은 입력(더 읽을 글 + groups.json) */
function runB(slug, role, extra) {
  return run(slug, role, Object.assign({ seen: READMORE ? (READMORE[slug] || []) : [], groups: GROUPS }, extra || {}));
}
function slugs(r) { return r.steps.map(function (s) { return s.slug; }); }
/* 손 지정 목록을 화면에 나올 다음 걸음 후보로(질문 글·없는 글 빼고) */
function handSteps(k, r) { return (hand[k][r] || []).filter(function (s) { return !isFaqSlug(s) && bySlug[s]; }); }

/* ---------- 데이터: data/kb/nextsteps.json ---------- */
test('nextsteps.json: 손 지정 30~50편, 모양이 { slug: { self|family|near|any: [slug…] } }', function () {
  ok(hand && typeof hand === 'object' && !Array.isArray(hand), '객체여야 해요');
  const keys = Object.keys(hand);
  ok(keys.length >= 30 && keys.length <= 50, '손 지정 글 수 ' + keys.length);
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

test('nextsteps.json: 모든 slug 가 지금 data/toc.js 에 있다(키와 값 모두)', function () {
  Object.keys(hand).forEach(function (k) {
    ok(bySlug[k], '없는 글(키): ' + k);
    Object.keys(hand[k]).forEach(function (r) {
      hand[k][r].forEach(function (s) { ok(bySlug[s], k + '.' + r + ': 없는 글 ' + s); });
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

test('nextsteps.json: 폭력·응급 글이 아닌 글의 목록은 폭력·응급 글(HEAVY)로 시작하지 않고, 목록마다 위기·응급 아닌 글이 있다', function () {
  Object.keys(hand).forEach(function (k) {
    Object.keys(hand[k]).forEach(function (r) {
      const st = handSteps(k, r);
      if (!isHeavy(k) && st.length) ok(!isHeavy(st[0]), k + '.' + r + ': 맨 앞이 ' + st[0]);
      if (st.length) ok(st.some(function (s) { return !isAlarm(s); }), k + '.' + r + ': 위기·응급 글만 ' + JSON.stringify(st));
    });
  });
  /* 가족 안전 계획 글은 앞세우지 않되 알맞은 자리(돌봄 소진의 가족 목록 셋째)에 있어요 */
  Object.keys(hand).forEach(function (k) {
    Object.keys(hand[k]).forEach(function (r) { ok(handSteps(k, r)[0] !== 'family-violence-safety', k + '.' + r); });
  });
  ok(handSteps('caregiver-burnout', 'family').indexOf('family-violence-safety') > 0);
});

test('nextsteps.json: 주변 사람(near) 목록에는 친구·교사·동료 안내 글이 들어가요', function () {
  const NEAR = ['for-friends', 'for-teachers', 'for-coworkers-managers'];
  const keys = Object.keys(hand).filter(function (k) { return hand[k].near && NEAR.indexOf(k) < 0; });
  ok(keys.length >= 10, 'near 목록이 있는 글 ' + keys.length);
  const withNear = keys.filter(function (k) { return hand[k].near.some(function (s) { return NEAR.indexOf(s) >= 0; }); });
  ok(withNear.length >= keys.length - 2, '친구·교사·동료 안내가 없는 near 목록: ' + keys.filter(function (k) { return withNear.indexOf(k) < 0; }).join(', '));
  NEAR.forEach(function (s) { ok(keys.some(function (k) { return hand[k].near.indexOf(s) >= 0; }), s + ' 이 어느 near 목록에도 없어요'); });
});

test('nextsteps.json: 많이 읽힐 새 글(몸의 응급 신호·정신응급 체계·치료비·병원비·진단 받아들이기)에도 손 지정이 있다', function () {
  ['neuroleptic-malignant-syndrome', 'heart-and-antipsychotics', 'polydipsia-hyponatremia', 'heat-and-medication',
    'psychiatric-emergency-system', 'treatment-cost-support', 'medical-cost-safety-net', 'diagnosis-emotions', 'psychosis-what-is']
    .forEach(function (k) { ok(hand[k] && hand[k].any, k); });
});

test('HEAVY·HELP 목록: 모두 있는 글, HEAVY 는 모두 위기·응급 태그 글, HELP 는 위기·응급·질문 글이 아님', function () {
  NS.HEAVY.forEach(function (s) { ok(bySlug[s], 'HEAVY 에 없는 글 ' + s); ok(isAlarm(s), 'HEAVY 인데 위기·응급 태그가 없어요 ' + s); });
  NS.HELP.forEach(function (s) { ok(bySlug[s], 'HELP 에 없는 글 ' + s); ok(!isAlarm(s) && !isFaqSlug(s), 'HELP 에 위기·응급·질문 글 ' + s); });
  eq(new Set(NS.HEAVY).size, NS.HEAVY.length);
});

test('nextsteps.json: 위기·응급 글의 손 지정은 역할마다 위기·응급 아닌 글(회복·도움)을 섞는다', function () {
  Object.keys(hand).filter(isAlarm).forEach(function (k) {
    ROLES.forEach(function (role) {
      [run(k, role), runB(k, role)].forEach(function (r, i) {
        ok(r.steps.length > 0, k + '/' + role + ': 다음 걸음이 비었어요');
        ok(r.steps.some(function (s) { return !isAlarm(s.slug); }), k + '/' + role + (i ? '(화면)' : '') + ': 위기·응급 글만 이어져요 ' + JSON.stringify(slugs(r)));
      });
    });
  });
});

/* ---------- 고르기 함수: 모든 글 × 모든 역할(실제 자료 불변식) ---------- */
[['기본', run], ['화면과 같게(더 읽을 글 + groups.json)', runB]].forEach(function (mode) {
  const name = mode[0], go = mode[1];
  test('전수(' + name + '): 284편 × 역할 5가지 — 결정적, 3편·4개 이하, 자기 자신·중복·없는 글 없음, 질문 글은 관련 질문으로만, 빈 곳 없음', function () {
    let n = 0;
    const empty = [];
    articles.forEach(function (a) {
      ROLES.forEach(function (role) {
        const r1 = go(a.slug, role), r2 = go(a.slug, role);
        eq(r1, r2, a.slug + '/' + role + ': 같은 입력에 다른 결과');
        ok(r1.steps.length <= 3, a.slug + ': 다음 걸음 ' + r1.steps.length + '편');
        ok(r1.faqs.length <= 4, a.slug + ': 관련 질문 ' + r1.faqs.length + '개');
        const all = slugs(r1).concat(r1.faqs);
        ok(all.indexOf(a.slug) < 0, a.slug + '/' + role + ': 자기 자신이 나와요');
        eq(new Set(all).size, all.length, a.slug + '/' + role + ': 중복 ' + JSON.stringify(all));
        all.forEach(function (s) { ok(bySlug[s], a.slug + ': 없는 글 ' + s); });
        slugs(r1).forEach(function (s) { ok(String(bySlug[s].section) !== '15', a.slug + ': 다음 걸음에 질문 글 ' + s); });
        r1.faqs.forEach(function (s) { ok(String(bySlug[s].section) === '15', a.slug + ': 관련 질문에 질문 아닌 글 ' + s); });
        if (!r1.steps.length) empty.push(a.slug + '/' + role);
        n++;
      });
    });
    eq(n, articles.length * ROLES.length);
    eq(empty, [], '다음 걸음이 빈 글');
  });

  test('전수(' + name + '): 세 편이 모두 위기·응급 글인 경우가 없다(모든 글 × 역할)', function () {
    const bad = [];
    articles.forEach(function (a) {
      ROLES.forEach(function (role) {
        const s = slugs(go(a.slug, role));
        if (s.length && s.every(isAlarm)) bad.push(a.slug + '/' + role + ':' + s.join(','));
      });
    });
    eq(bad, []);
  });

  test('전수(' + name + '): 폭력·응급 글이 아닌 글 끝에서 맨 앞 카드는 폭력·응급 글이 아니고(손 지정 제외), 자동으로는 한 편까지만', function () {
    const first = [], two = [];
    let checked = 0;
    articles.filter(function (a) { return !isHeavy(a.slug); }).forEach(function (a) {
      ROLES.forEach(function (role) {
        const r = go(a.slug, role);
        if (r.steps.length && isHeavy(r.steps[0].slug) && r.steps[0].from !== 'hand') first.push(a.slug + '/' + role + '→' + r.steps[0].slug);
        const auto = r.steps.filter(function (s) { return s.from !== 'hand' && s.from !== 'help' && isHeavy(s.slug); });
        if (auto.length > 1) {
          /* 두 편 이상이면 다른 후보가 모자랐을 때뿐이어야 해요: 둘째부터의 폭력·응급 글을 빼고 다시 고르면 3편을 못 채워야 함 */
          checked++;
          const again = go(a.slug, role, { skip: auto.slice(1).map(function (s) { return s.slug; }) });
          if (again.steps.length >= 3) two.push(a.slug + '/' + role + ':' + JSON.stringify(slugs(r)));
        }
      });
    });
    eq(first, [], '맨 앞이 폭력·응급 글');
    eq(two, [], '자동 규칙의 폭력·응급 글이 두 편 이상(다른 후보가 있는데도)');
    /* 지금 자료에서는 자동 규칙의 폭력·응급 글이 두 편 이상인 경우가 없어요(다른 후보가 모자라 채우는 경우는 아래 단위 테스트가 확인) */
    eq(checked, 0, '자동 규칙의 폭력·응급 글이 두 편 이상인 글');
  });

  test('전수(' + name + '): 낙인을 다루는 글 끝의 첫 다음 걸음은 범죄·재판 글(CRIME)이 아니에요(손 지정 제외)', function () {
    const bad = [];
    articles.filter(function (a) { return tagged(a.slug, '낙인') && !isHeavy(a.slug); }).forEach(function (a) {
      ROLES.forEach(function (role) {
        const r = go(a.slug, role);
        if (r.steps.length && NS.CRIME.indexOf(r.steps[0].slug) >= 0 && r.steps[0].from !== 'hand') bad.push(a.slug + '/' + role);
      });
    });
    eq(bad, []);
    /* 질문 글 "위험한가요?"와 "언론 보도와 낙인" 끝: 경찰 조사·재판 글이 맨 앞이 아니에요(뒤에는 남아요) */
    ['faq-dangerous', 'media-reporting-guidelines'].forEach(function (k) {
      ok(tagged(k, '낙인'), k + ' 에 낙인 태그가 없으면 예시를 바꿔야 해요');
      ROLES.forEach(function (role) {
        const s = slugs(go(k, role));
        ok(s.length === 3 && s[0] !== 'justice-system', k + '/' + role + ': ' + JSON.stringify(s));
      });
    });
  });

  test('전수(' + name + '): 폭력·응급 글이 아닌 글 끝에서 관련 질문의 맨 앞은 폭력·분노 질문이 아니에요(다른 질문이 있으면)', function () {
    const bad = [];
    articles.filter(function (a) { return !isHeavy(a.slug); }).forEach(function (a) {
      ROLES.forEach(function (role) {
        const f = go(a.slug, role).faqs;
        if (f.length > 1 && (tagged(f[0], '폭력') || tagged(f[0], '분노'))) bad.push(a.slug + '/' + role + ':' + f[0]);
      });
    });
    eq(bad, []);
    /* 환청 글 끝(목소리를 듣는 당사자): "약을 먹어도 목소리가 계속 들려요"가 "위험한가요?"보다 앞 */
    ['self', null].forEach(function (role) {
      const f = go('auditory-hallucination', role).faqs;
      ok(f.indexOf('faq-voices-persist') >= 0 && f.indexOf('faq-dangerous') > f.indexOf('faq-voices-persist'), role + ': ' + JSON.stringify(f));
    });
  });
});

test('pick: 입력 배열·표를 바꾸지 않는다', function () {
  const before = JSON.stringify([hand, links.out['auditory-hallucination'], courses[0].steps]);
  run('auditory-hallucination', 'family', { courseId: 'living-with-positive' });
  run('suicide-warning-signs', null);
  runB('insight', null);
  eq(JSON.stringify([hand, links.out['auditory-hallucination'], courses[0].steps]), before);
});

/* ---------- 규칙별 ---------- */
test('환청: 역할에 따라 손 지정 표를 따른다(가족 → 가족용, 주변 사람 → 친구 안내, 궁금해서 = 역할 없음)', function () {
  const k = 'auditory-hallucination';
  const fam = slugs(run(k, 'family'));
  eq(fam, handSteps(k, 'family').slice(0, 3));
  ok(fam.some(function (s) { return ['10', '11'].indexOf(String(bySlug[s].section)) >= 0; }), '가족 목록에 가족·제도 분류 글: ' + JSON.stringify(fam));
  ok(run(k, 'family').byRole, '가족 목록을 썼으면 byRole');
  eq(slugs(run(k, 'self')), handSteps(k, 'self').slice(0, 3));
  ok(slugs(run(k, 'near')).indexOf('for-friends') >= 0, '주변 사람에게 친구 안내');
  const any = slugs(run(k, null));
  eq(any, handSteps(k, 'any').slice(0, 3));
  eq(slugs(run(k, 'curious')), any, '궁금해서 왔어요 = 역할 없음과 같은 표(any)');
  ok(run(k, null).faqs.indexOf('faq-voices-persist') >= 0, '손 지정의 질문 글은 관련 질문으로');
  /* 화면에서도(더 읽을 글과 겹치지 않게 고른 표라서) 같은 결과 */
  if (READMORE) eq(slugs(runB(k, 'family')), fam);
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
  ok(!isHeavy(nextInCourse), '예시의 코스 다음 글은 폭력·응급 글이 아니어야 해요');
  const r = run('first-episode', null, { hand: {} });
  eq(r.steps[0].slug, nextInCourse, '코스 다음 글이 맨 앞');
  eq(r.steps[0].from, 'course');
  /* 코스에 없고 본문 링크(폭력·응급 아닌 글)로 시작하는 글 */
  const lone = articles.filter(function (a) {
    const inCourse = courses.some(function (x) { return x.steps.some(function (st) { return st.slug === a.slug; }); });
    const outs = (links.out[a.slug] || []).filter(function (s) { return bySlug[s] && !isFaqSlug(s); });
    return !inCourse && outs.length >= 1 && !isHeavy(outs[0]) && String(a.section) !== '15';
  })[0];
  ok(lone, '코스에 없고 본문 링크가 있는 글이 하나는 있어야 해요');
  const r2 = run(lone.slug, null, { hand: {} });
  eq(r2.steps[0].slug, links.out[lone.slug].filter(function (s) { return bySlug[s] && !isFaqSlug(s); })[0], lone.slug + ': 본문 링크가 먼저');
  eq(r2.steps[0].from, 'link');
});

test('본문 링크: 역할이 가족·주변 사람이면 10·11 분류 글을 앞에', function () {
  const fakeLinks = { out: { 'positive-overview': ['cbtp', 'sleep', 'caregiver-burnout', 'mental-health-center'] }, in: {} };
  const self = slugs(run('positive-overview', 'self', { hand: {}, courses: [], links: fakeLinks }));
  eq(self, ['cbtp', 'sleep', 'caregiver-burnout']);
  const fam = slugs(run('positive-overview', 'family', { hand: {}, courses: [], links: fakeLinks }));
  eq(fam, ['caregiver-burnout', 'mental-health-center', 'cbtp']);
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

test('묶음 후보가 쓰인다: 본문 링크가 모두 "더 읽을 글"에 있으면 같은 묶음의 다음 글이 그 링크들보다 앞에 와요', function () {
  /* 지금 글은 모두 본문 링크가 4편 이상이라, "더 읽을 글"을 넘기지 않는 node 기본 입력에서는 본문 링크가 칸을 다 채워요.
     화면은 "더 읽을 글"을 넘기니, 그 목록과 겹치는 링크가 뒤로 가고 묶음 후보가 그 앞에 쓰여요 */
  const groups = [{ section: '2', first: [], groups: [{ title: '환각', slugs: ['hallucination-overview', 'visual-hallucination', 'other-hallucinations', 'somatic-hallucination'] }] }];
  const fl = { out: { 'visual-hallucination': ['cbtp', 'sleep', 'exercise', 'peer-support'] }, in: {} };
  const o = { hand: {}, courses: [], links: fl, groups: groups };
  eq(slugs(run('visual-hallucination', null, o)), ['cbtp', 'sleep', 'exercise'], '더 읽을 글이 없으면 본문 링크가 먼저');
  const r = run('visual-hallucination', null, Object.assign({ seen: ['cbtp', 'sleep', 'exercise', 'peer-support'] }, o));
  eq(slugs(r), ['other-hallucinations', 'somatic-hallucination', 'hallucination-overview']);
  eq(r.steps.map(function (s) { return s.from; }), ['group', 'group', 'group']);
});

test('실제 groups.json 과 실제 "더 읽을 글"(화면과 같은 입력)에서 규칙이 지켜지고 묶음에서 고른 글이 나온다', function () {
  if (!GROUPS || !READMORE) return; /* 분류 소묶음 자료나 글 원본이 없으면 건너뜀 */
  let fromGroup = 0, fromGroupPlain = 0;
  const usedBy = [];
  articles.forEach(function (a) {
    ROLES.forEach(function (role) {
      const r = runB(a.slug, role);
      const all = slugs(r).concat(r.faqs);
      ok(all.indexOf(a.slug) < 0 && new Set(all).size === all.length && r.steps.length <= 3, a.slug + '/' + role + ': ' + JSON.stringify(all));
      slugs(r).forEach(function (s) { ok(bySlug[s] && String(bySlug[s].section) !== '15', a.slug + ': ' + s); });
      if (isAlarm(a.slug) && r.steps.length) ok(r.steps.some(function (s) { return !isAlarm(s.slug); }), a.slug + '/' + role + ': 위기·응급 글만');
      const g = r.steps.filter(function (s) { return s.from === 'group'; }).length;
      if (g && usedBy.indexOf(a.slug) < 0) usedBy.push(a.slug);
      fromGroup += g;
      fromGroupPlain += run(a.slug, role, { groups: GROUPS }).steps.filter(function (s) { return s.from === 'group'; }).length;
    });
  });
  ok(fromGroup > 0, '묶음에서 고른 글이 하나도 없어요');
  ok(usedBy.length >= 20, '묶음 후보가 쓰인 글 ' + usedBy.length + '편');
  /* 참고: "더 읽을 글"을 넘기지 않으면 본문 링크가 칸을 다 채워 묶음까지 내려가지 않아요(옛 테스트가 실패한 이유) */
  ok(fromGroupPlain <= fromGroup);
});

test('코스로 왔으면(?course=) 손 지정이 먼저이고, 코스 다음 글은 코어의 코스 안내에 맡겨 여기서 빼요(같은 링크 두 번 방지)', function () {
  const c = courses.filter(function (x) { return x.steps.some(function (st) { return st.slug === 'auditory-hallucination'; }); })[0];
  ok(c, '환청이 든 코스');
  const i = c.steps.findIndex(function (st) { return st.slug === 'auditory-hallucination'; });
  const nx = c.steps.slice(i + 1).map(function (st) { return st.slug; }).filter(function (s) { return bySlug[s]; })[0];
  const r = run('auditory-hallucination', 'family', { courseId: c.id });
  eq(r.steps[0].slug, handSteps('auditory-hallucination', 'family').filter(function (s) { return s !== nx; })[0], '손 지정이 맨 앞');
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

test('seen("더 읽을 글"): 자동 규칙에서는 겹치는 글을 뒤로, 손 지정은 겹쳐도 자동 규칙보다 앞(손 지정 안에서만 뒤로)', function () {
  const fl = { out: { cbtp: ['sleep', 'exercise', 'positive-self-help', 'peer-support'] }, in: {} };
  const o = { courses: [], links: fl };
  /* 자동 규칙만: 겹치는 sleep 이 뒤로 */
  eq(slugs(run('cbtp', null, Object.assign({ hand: {}, seen: ['sleep'] }, o))), ['exercise', 'positive-self-help', 'peer-support']);
  /* 손 지정: 겹치는 글(daily-rhythm)도 자동 규칙(본문 링크)보다 앞, 손 지정 안에서는 겹치지 않는 것(recovery) 먼저 */
  const h = { cbtp: { any: ['daily-rhythm', 'recovery'] } };
  const r = run('cbtp', null, Object.assign({ hand: h, seen: ['daily-rhythm'] }, o));
  eq(slugs(r), ['recovery', 'daily-rhythm', 'sleep']);
  eq(r.steps.map(function (s) { return s.from; }), ['hand', 'hand', 'link']);
  /* 질문 글도 겹치면 뒤로(자리가 남으면 그대로 보여요) */
  const fake = { out: {}, in: { 'auditory-hallucination': ['faq-voices-persist', 'faq-cure'] } };
  eq(run('auditory-hallucination', null, { seen: ['faq-voices-persist'], links: fake, hand: {} }).faqs.slice(0, 2), ['faq-cure', 'faq-voices-persist']);
  /* 후보가 모두 겹치면 겹치는 것으로라도 채워요 */
  const only = run('cbtp', null, { hand: {}, courses: [], links: { out: { cbtp: ['sleep'] }, in: {} }, seen: ['sleep'], articles: articles.filter(function (a) { return a.slug === 'cbtp' || a.slug === 'sleep'; }) });
  eq(slugs(only), ['sleep']);
  /* 실제 표: 손 지정 글은 그 글의 "더 읽을 글"과 거의 겹치지 않아요(겹치는 건 자살 위험 신호 → 위기 상담 전화처럼 일부러 둔 것) */
  if (READMORE) {
    const over = [];
    Object.keys(hand).forEach(function (k) {
      Object.keys(hand[k]).forEach(function (rk) { handSteps(k, rk).forEach(function (s) { if ((READMORE[k] || []).indexOf(s) >= 0) over.push(k + '.' + rk + ':' + s); }); });
    });
    ok(over.every(function (x) { return x.indexOf('suicide-warning-signs.') === 0; }), '더 읽을 글과 겹치는 손 지정: ' + over.join(' '));
  }
});

test('폭력·응급 글(HEAVY): 그런 글이 아닌 글 끝에서는 자동 규칙으로 맨 앞에 두지 않고 한 편까지만, 손 지정·폭력·응급 글 끝은 그대로', function () {
  const fl = function (out) { return { out: { cbtp: out }, in: {} }; };
  const o = { hand: {}, courses: [] };
  /* 본문 링크 순서가 응급 대처 → 위기 상담 전화 → 수면 → 운동이어도 */
  const five = articles.filter(function (a) { return ['cbtp', 'sleep', 'exercise', 'emergency-response', 'crisis-hotlines'].indexOf(a.slug) >= 0; });
  eq(slugs(run('cbtp', null, Object.assign({ links: fl(['emergency-response', 'crisis-hotlines', 'sleep', 'exercise']), articles: five }, o))), ['sleep', 'exercise', 'emergency-response']);
  /* 같은 분류·묶음의 다음 글처럼 약한 후보가 있어도 그쪽이 먼저예요(폭력·응급 글은 그 뒤, 자리가 남을 때만) */
  const full = slugs(run('cbtp', null, Object.assign({ links: fl(['emergency-response', 'crisis-hotlines', 'sleep', 'exercise']) }, o)));
  eq(full.slice(0, 2), ['sleep', 'exercise']);
  ok(full.every(function (s) { return !isHeavy(s); }), JSON.stringify(full));
  /* 다른 후보가 "더 읽을 글"에 있는 것뿐이어도 맨 앞은 폭력·응급 글이 아니에요 */
  const three = articles.filter(function (a) { return ['cbtp', 'sleep', 'crisis-hotlines'].indexOf(a.slug) >= 0; });
  eq(slugs(run('cbtp', null, Object.assign({ links: fl(['crisis-hotlines', 'sleep']), seen: ['sleep'], articles: three }, o))), ['sleep', 'crisis-hotlines']);
  /* 다른 후보가 모자라면 두 번째 폭력·응급 글로라도 채워요 */
  const few = articles.filter(function (a) { return ['cbtp', 'sleep', 'emergency-response', 'crisis-hotlines'].indexOf(a.slug) >= 0; });
  eq(slugs(run('cbtp', null, Object.assign({ links: fl(['emergency-response', 'crisis-hotlines', 'sleep']), articles: few }, o))), ['sleep', 'emergency-response', 'crisis-hotlines']);
  /* 손 지정이면 그대로 앞에 */
  eq(slugs(run('cbtp', null, { hand: { cbtp: { any: ['crisis-hotlines', 'sleep'] } }, courses: [], links: fl([]) }))[0], 'crisis-hotlines');
  /* 지금 글이 폭력·응급 글이면 그대로(자살 위험 신호 → 위기 상담 전화) */
  const sl = { out: { 'suicide-warning-signs': ['crisis-hotlines', 'sleep'] }, in: {} };
  eq(slugs(run('suicide-warning-signs', null, { hand: {}, courses: [], links: sl }))[0], 'crisis-hotlines');
  /* 실제 자료: 위기 태그만 있는 일반 글(환청과 함께 지내기)은 폭력·응급 글로 보지 않아요 */
  ok(!NS.isHeavy(bySlug['living-with-voices']) && NS.isAlarm(bySlug['living-with-voices']));
});

test('위기·응급 글 셋만 이어지지 않게: 위기·응급 글 끝은 회복·도움 글, 그 밖의 글 끝은 남은 후보 가운데 위기·응급 아닌 글로 마지막 자리를 바꿔요', function () {
  /* 위기 글 끝: 후보가 모두 위기 글이면 회복·도움 글 */
  const fakeHand = { 'suicide-warning-signs': { any: ['crisis-hotlines', 'emergency-response', 'relapse-prevention-plan'] } };
  const r = run('suicide-warning-signs', null, { hand: fakeHand, links: { out: {}, in: {} }, courses: [] });
  eq(r.steps.length, 3);
  eq(slugs(r).slice(0, 2), ['crisis-hotlines', 'emergency-response']);
  ok(!isAlarm(r.steps[2].slug), '마지막 자리가 회복·도움 글: ' + r.steps[2].slug);
  eq(r.steps[2].from, 'help');
  ok(NS.HELP.indexOf(r.steps[2].slug) >= 0);
  /* 후보가 1편뿐이면 바꾸지 않고 더해요 */
  const r1 = run('suicide-warning-signs', null, { hand: { 'suicide-warning-signs': { any: ['crisis-hotlines'] } }, links: { out: {}, in: {} }, courses: [], articles: articles.filter(function (a) { return a.slug === 'suicide-warning-signs' || a.slug === 'crisis-hotlines' || NS.HELP.indexOf(a.slug) >= 0; }) });
  eq(r1.steps[0].slug, 'crisis-hotlines');
  ok(r1.steps.some(function (s) { return !isAlarm(s.slug); }));
  /* 위기 아닌 글 끝: 본문 링크 셋이 모두 위기 태그 글(환청·환청과 함께 지내기·자가 대처)이면 다음 후보(수면)로 */
  ok(!isAlarm('cbtp') && isAlarm('auditory-hallucination') && isAlarm('living-with-voices') && isAlarm('positive-self-help') && !isAlarm('sleep'));
  const fl = { out: { cbtp: ['auditory-hallucination', 'living-with-voices', 'positive-self-help', 'sleep'] }, in: {} };
  const m = run('cbtp', null, { hand: {}, courses: [], links: fl });
  eq(slugs(m), ['auditory-hallucination', 'living-with-voices', 'sleep']);
  eq(m.steps[2].from, 'link');
});

test('byRole: 역할이 결과를 실제로 바꿨을 때만 true(손 지정·10·11 분류 앞세우기·역할 코스)', function () {
  eq(run('auditory-hallucination', null).byRole, false);
  eq(run('auditory-hallucination', 'curious').byRole, false, '궁금해서 왔어요는 any 와 같아요');
  /* 손 지정에 가족 목록이 없고 본문 링크에도 10·11 분류가 없으면 역할과 무관 */
  const fakeHand = { cbtp: { any: ['sleep', 'exercise'] } };
  const fl = { out: { cbtp: ['positive-self-help'] }, in: {} };
  eq(run('cbtp', 'family', { hand: fakeHand, courses: [], links: fl }).byRole, false);
  /* 10·11 분류 글을 앞세워 순서가 달라지면 true */
  const fl2 = { out: { cbtp: ['sleep', 'exercise', 'positive-self-help', 'caregiver-burnout'] }, in: {} };
  eq(run('cbtp', 'family', { hand: {}, courses: [], links: fl2 }).byRole, true);
  /* 실제 자료: 모든 글 × 역할에서 byRole 은 불리언 */
  articles.forEach(function (a) { ROLES.forEach(function (role) { eq(typeof run(a.slug, role).byRole, 'boolean'); }); });
});

test('관련 질문: 위기 글 끝에서 입원 질문이 맨 앞에 오지 않아요(입원을 다루는 위기 글도)', function () {
  function admit(s) { return tagged(s, '입원') || tagged(s, '강제입원'); }
  /* 지금 힘든 사람이 전화를 걸려다 강제 입원 걱정부터 보지 않게: 위기 상담 전화 글 × 모든 역할 */
  ok(isCrisis('crisis-hotlines') && !isAdmitTopic('crisis-hotlines'));
  ROLES.forEach(function (role) {
    [run('crisis-hotlines', role), runB('crisis-hotlines', role)].forEach(function (r) {
      ok(r.faqs.length > 0 && !admit(r.faqs[0]), 'crisis-hotlines/' + role + ': 첫 질문 ' + JSON.stringify(r.faqs));
      ok(r.faqs.some(admit), 'crisis-hotlines/' + role + ': 입원 질문도 뒤에는 남아요 ' + JSON.stringify(r.faqs));
    });
  });
  /* 모든 위기 글(입원을 다루는 급성기·입원과 낮병원·입원의 종류도): 입원 질문 뒤에만 입원 질문(앞에는 다른 질문) */
  const crisisSlugs = articles.filter(function (a) { return isCrisis(a.slug) && String(a.section) !== '15'; }).map(function (a) { return a.slug; });
  ok(['acute-phase', 'hospital-day-hospital', 'admission-types'].every(function (s) { return crisisSlugs.indexOf(s) >= 0 && isAdmitTopic(s); }), '입원을 다루는 위기 글도 검사에 들어가요');
  ok(crisisSlugs.length >= 20, '위기 글 ' + crisisSlugs.length);
  crisisSlugs.forEach(function (s) {
    ROLES.forEach(function (role) {
      [run(s, role), runB(s, role)].forEach(function (r) {
        const f = r.faqs, firstAdmit = f.findIndex(admit);
        if (firstAdmit >= 0) ok(f.slice(firstAdmit).every(admit), s + '/' + role + ': 입원 질문 뒤에 다른 질문 ' + JSON.stringify(f));
      });
    });
  });
  /* 같은 질문 목록이라도 위기 글(입원을 다루지 않음)이면 입원 질문을 뒤로 */
  const fl = function (k) { const o = { out: {}, in: {} }; o.in[k] = ['faq-forced-admission', 'faq-cure']; return o; };
  eq(run('crisis-hotlines', null, { hand: {}, links: fl('crisis-hotlines') }).faqs, ['faq-cure', 'faq-forced-admission']);
  /* 위기 글이 아니면 순서를 바꾸지 않아요(입원 제도 글, 지금 위기 태그 없음) */
  ok(!isCrisis('mental-health-welfare-act'), '예시 글(mental-health-welfare-act)에 위기 태그가 생기면 다른 예시로 바꿔야 해요');
  eq(run('mental-health-welfare-act', null, { hand: {}, links: fl('mental-health-welfare-act') }).faqs, ['faq-forced-admission', 'faq-cure']);
  /* 입원을 다루는 위기 글이라도(지금 위기에 있는 가족이 읽는 급성기 글, 입원의 종류와 내 권리) 입원 질문은 맨 앞에 오지 않아요 */
  ['acute-phase', 'admission-types'].forEach(function (k) {
    ok(isCrisis(k) && isAdmitTopic(k), '예시 글(' + k + ')의 태그가 바뀌면 예시를 바꿔야 해요');
    eq(run(k, null, { hand: {}, links: fl(k) }).faqs, ['faq-cure', 'faq-forced-admission'], k);
  });
});

test('quiet: 폭력·응급 글이 아닌 글 끝에서는 자살·자해·폭력 같은 말이 든 요약을 감추고 제목만', function () {
  /* 환청(위기 태그) 끝의 응급 상황 대처 카드: 요약("자해·자살·타해…")을 감춰요 */
  ok(NS.quiet(bySlug['emergency-response'], bySlug['auditory-hallucination']));
  /* 자살 위험 신호(폭력·응급 글) 끝에서는 보여요 */
  ok(!NS.quiet(bySlug['emergency-response'], bySlug['suicide-warning-signs']));
  /* 위기 태그만 있는 일반 글의 요약은 그대로(환청과 함께 지내기, 재발 예방 계획) */
  ok(!NS.quiet(bySlug['living-with-voices'], bySlug['auditory-hallucination']));
  ok(!NS.quiet(bySlug['relapse-prevention-plan'], bySlug['relapse-signs']));
  ok(!NS.quiet(null, bySlug['cbtp']) && !NS.quiet({ summary: '' }, null));
  /* 상담 전화 이름("자살예방상담전화")만 든 요약은 보여요(위기 상담 전화 카드는 차분한 안내라서) */
  ok(!NS.quiet({ tags: ['위기'], summary: '자살예방상담전화 109 를 정리했어요.' }, bySlug['cbtp']));
  ok(NS.quiet({ tags: ['위기'], summary: '자살 위험이 높아요.' }, bySlug['cbtp']));
  /* 실제 자료: 감춰지는 요약은 모두 그 말이 든 것 */
  articles.forEach(function (a) { if (NS.quiet(a, bySlug['cbtp'])) ok(/자살|자해|타해|폭력|흉기|위협/.test(a.summary), a.slug); });
  /* 위기·응급 태그가 없는 글의 요약은 감추지 않아요(피해망상, 미디어 속 조현병, 문화와 목소리처럼 낙인을 줄이는 글) */
  ['persecutory-delusion', 'media-portrayals', 'voices-across-cultures'].forEach(function (s) {
    ok(!isAlarm(s), s + ' 에 위기·응급 태그가 생기면 예시를 바꿔야 해요');
    ok(!NS.quiet(bySlug[s], bySlug['cbtp']), s);
  });
  ok(!NS.quiet({ slug: 'x', tags: [], summary: '자살 위험이 높아요.' }, bySlug['cbtp']), '위기·응급 태그가 없으면 말이 있어도 보여요');
  /* "가장 큰 원인은 자살이 아니라…"(기대수명)처럼 부정하는 말은 감추지 않아요 */
  ok(isAlarm('life-expectancy') && !NS.quiet(bySlug['life-expectancy'], bySlug['cbtp']));
  articles.forEach(function (a) { if (NS.quiet(a, bySlug['cbtp'])) ok(isAlarm(a.slug), '위기·응급 태그 없는 글의 요약을 감춰요: ' + a.slug); });
  /* 감추는 글은 사람이 본 목록과 같아요(늘거나 줄면 검토하고 목록을 고쳐요) */
  eq(articles.filter(function (a) { return NS.quiet(a, bySlug['cbtp']); }).map(function (a) { return a.slug; }).sort(),
    ['clozapine', 'diagnosis-emotions', 'emergency-response', 'faq-after-discharge', 'faq-anger', 'faq-dangerous', 'first-month-after-discharge', 'suicide-bereavement', 'suicide-warning-signs']);
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

test('answerOf: 질문 아래 답 줄은 균형·단서 문장을 떨어뜨리지 않아요(한계선 L4: 약은 "의사와 함께"의 틀로)', function () {
  eq(NS.answerOf('있을 수 있어요. 다만 90%는 같아요. 그 밖의 말.'), '있을 수 있어요. 다만 90%는 같아요.');
  eq(NS.answerOf('대부분은 아니에요. 가운데 말. 오히려 반대예요.'), '대부분은 아니에요. 오히려 반대예요.');
  eq(NS.answerOf('흔한 부작용이에요. 그냥 둘 일은 아니에요. 스스로 줄이지 말고 의사와 상의하세요.'), '흔한 부작용이에요. 스스로 줄이지 말고 의사와 상의하세요.');
  eq(NS.answerOf('네. 할 수 있어요. 다른 말.'), '네. 할 수 있어요.', '아주 짧은 첫 문장은 다음 문장까지(firstSentence 와 같음)');
  eq(NS.answerOf(''), '');
  eq(NS.answerOf(null), '');
  const faqs = articles.filter(function (a) { return String(a.section) === '15'; });
  faqs.forEach(function (a) {
    const ans = NS.answerOf(a.summary), ss = a.summary.match(/[\s\S]+?[.!?](?=\s|$)/g) || [];
    /* 약 질문의 답 줄에는 "의사"가 들어 있어요(평생 먹어야 하나요 → "모든 사람이 평생…"만 남지 않게) */
    if (['약물 치료', '중단', '감량', '부작용', '복약'].some(function (t) { return tagged(a.slug, t); })) has(ans, '의사', a.slug);
    /* 요약의 둘째 문장이 "하지만·다만·그러나·오히려"로 시작하면 답 줄이 첫 문장 하나로 끝나지 않아요 */
    if (ss[1] && /^\s*(하지만|다만|그러나|오히려)/.test(ss[1])) ok(ans.length > NS.firstSentence(a.summary).length, a.slug + ': ' + ans);
    ok(ans.length <= 260, a.slug + ': 답 줄이 너무 길어요(' + ans.length + ')');
  });
  ok(faqs.length >= 39, '질문 글 ' + faqs.length);
  /* 사람이 검토한 답 줄만 나가요: 요약이 바뀌어 답 줄이 달라지면 여기서 멈추니, 새 답 줄을 읽어 보고 고쳐요 */
  const SNAP = {
    'faq-cure': '"완치"를 약속할 수는 없어요. 하지만 첫 발병 뒤 절반 이상이 관해(증상이 가라앉은 상태)에 이르고, 3명 중 1명 이상은 일상 기능까지 회복해요.',
    'faq-lifelong-medication': '모든 사람이 평생 먹어야 한다고 정해져 있지는 않아요. 다만 유지 치료는 재발을 크게 줄이고, 의사 감독 아래 천천히 줄여도 첫 1~2년의 재발 위험은 올라갔어요. 언제까지 먹을지는 담당 의사와 함께 정해요.',
    'faq-whose-fault': '아니에요. 조현병은 타고난 취약성과 여러 환경 요인이 겹쳐서 생기고, 어느 한 사람의 잘못이나 양육 방식 때문에 생기지 않아요.',
    'faq-inheritance': '부모가 조현병이면 자녀의 위험은 일반 인구보다 높아지지만, 부모 한 명이 조현병인 자녀의 90% 이상은 조현병에 걸리지 않았어요.',
    'faq-dangerous': '대부분은 폭력과 관계없어요. 오히려 범죄 피해를 당할 위험이 일반 인구보다 훨씬 커요.',
    'faq-work': '네, 일할 수 있어요.',
    'faq-love-marriage': '네. 조현병이 있어도 사랑과 친밀함을 원하는 마음은 다른 사람과 크게 다르지 않고, 연애와 결혼은 회복의 목표가 될 수 있어요.',
    'faq-alcohol': '술은 약의 졸림을 키우고, 잠과 복약을 흐트러뜨리고, 치료 효과를 떨어뜨릴 수 있어요. "조금은 괜찮은지"는 먹는 약과 몸 상태에 따라 달라서 담당 의사에게 직접 물어보는 것이 가장 정확해요.',
    'faq-weight-gain': '의지가 약해서가 아니라 약이 식욕 조절에 작용해서 생기는 흔한 부작용이에요. 약 선택, 보조약, 식사·운동 같은 대응에 근거가 있으니, 약을 스스로 줄이지 말고 담당 의사와 상의하세요.',
    'faq-dull-feeling': '멍함과 무감정은 약의 진정 작용, 약으로 인한 뻣뻣함, 우울, 병 자체의 음성 증상 가운데 하나이거나 여럿이 섞인 것일 수 있어요. 약을 스스로 줄이지 말고 느끼는 그대로 의사에게 말해 주세요.',
    'faq-relapse-or-not': '재발은 보통 갑자기가 아니라 몇 주에 걸쳐 와요. 혼자 판단하기 어려우니 신호가 보이면 일찍 의사에게 연락하세요.',
    'faq-voices-persist': '약이 잘 들어도 목소리가 조금 남는 사람이 많아요. 괴로움이 크다면 약이 몸에 충분히 들어가는지 확인하고, 치료저항성인지 평가받고, 클로자핀이나 인지행동치료(CBTp) 같은 다음 단계를 의사와 이야기할 수 있어요.',
    'faq-family-refuses': '"나는 병이 없다"는 말은 고집보다 병식(아프다는 자각)이 흐려지는 증상인 경우가 많아요.',
    'faq-forced-admission': '본인이 원하지 않는 입원은 치료가 필요한 정신질환과 자신의 건강·안전이나 남에게 해를 끼칠 위험이 함께 있을 때만, 법이 정한 절차로 가능해요.',
    'faq-choosing-doctor': '정신건강의학과 전문의에게, 오래 다닐 수 있는 곳에서 치료받는 것이 기본이에요.',
    'faq-cost': '조현병 진단을 받으면 건강보험 산정특례로 급여 진료비의 10%만 내요. 금액과 기준은 해마다 고시되니 공식 창구에서 확인하세요.',
    'faq-split-personality': '아니에요. 인격이 여러 개로 나뉘는 병은 해리성 정체감 장애라는 별개의 진단이에요.',
    'faq-late-onset': '대부분 10대 후반~30대 초반에 시작하지만, 40세 이후 처음 생기는 "후기 발병"도 있어요.',
    'faq-drugs-cause': '대마, 특히 THC 함량이 높은 대마를 자주 쓰면 정신병 위험이 몇 배로 높아져요.',
    'faq-stress-cause': '스트레스 하나만으로 조현병이 생기지는 않아요.',
    'faq-checking-thoughts': '혼자서 확실히 가리기는 어려워요. 최종 판단은 혼자 하지 말고 담당 의사와 함께 해요.',
    'faq-stop-when-well': '좋아진 것은 약이 증상을 막고 있기 때문인 경우가 많아요. 안정된 사람이 약을 끊으면 1년 안에 64%가 재발했고(유지하면 27%), 의사 감독 아래 천천히 줄여도 첫 1~2년 재발 위험은 올라갔어요. 끊고 싶은 마음은 숨기지 말고 담당 의사와 먼저 이야기하세요.',
    'faq-injection-or-pill': '장기지속형 주사제(LAI)는 먹는 약과 성분은 같지만, 거르는 일이 없어 재발·입원이 조금 적다는 근거가 쌓였어요. 대신 부작용이 생겨도 바로 빼기 어렵고 정해진 날 병원에 가야 해요. 어느 쪽이 맞는지는 담당 의사와 함께 정해요.',
    'faq-wrong-diagnosis': '있을 수 있어요. 다만 첫 삽화에서 조현병 진단을 받은 사람의 약 90%는 몇 년 뒤에도 같은 진단을 유지해요. 오히려 다른 진단에서 조현병으로 바뀌는 경우가 더 흔해요.',
    'faq-tell-employer': '말할 의무는 없고, 정답도 없어요.',
    'faq-military': '조현병 진단이 있다고 자동으로 면제되지 않아요.',
    'faq-insurance': '가입할 수 있는 경우도 있고 거절되는 경우도 있어요.',
    'faq-supplements': '오메가3, N-아세틸시스테인(NAC) 같은 보충제는 연구 중이지만 치료를 대신하거나 표준으로 더할 만큼 근거가 확실하지 않아요. 무엇이든 시작하기 전에 담당 의사·약사와 상의하세요.',
    'faq-exercise': '네, 근거가 꽤 쌓였어요.',
    'faq-recovery-real': '있어요. 첫 발병 뒤 장기 추적 연구에서 58%가 관해에, 38%가 증상과 기능 모두의 회복에 이르렀어요.',
    'faq-record-employment': '진료 기록은 병원과 건강보험 쪽에 남지만, 회사가 들여다볼 수 있는 기록은 아니에요.',
    'faq-anger': '화 뒤에는 증상, 불면, 약 부작용, 술, 좌절이 숨어 있을 수 있어요.',
    'faq-living-alone': '많은 사람이 혼자 살아요. 다만 증상이 안정되고, 약과 돈과 하루 리듬을 스스로 관리할 수 있고, 위기 때 연락할 사람이 있을 때 잘 돼요.',
    'faq-after-discharge': '첫 외래 날짜를 확인하고, 정신건강복지센터 연결에 동의하고, 처방 그대로 약을 먹고, 잠과 식사 리듬을 먼저 잡으세요.',
    'faq-ai-chatbot': '챗봇을 쓸지는 스스로 정할 일이지만, 정신증을 겪고 있거나 겪은 적이 있다면 챗봇이 틀린 믿음에 맞장구치며 망상을 키울 수 있다는 경고가 있어요.',
    'faq-early-signs': '환청·망상이 뚜렷해지기 전에 성적이나 일의 갑작스러운 저하, 의심, 사람 피하기, 잠과 씻기의 변화가 먼저 올 수 있어요. 하지만 이런 변화는 조현병에만 생기지 않아서 스스로 판단할 수 없어요.',
    'faq-hide-meds-in-food': '권하지 않아요. 이미 섞어 왔다면 혼자 갑자기 멈추지 말고 처방한 의사에게 알려 함께 방법을 찾으세요.',
    'faq-family-talk-doctor': '가족이 본 변화를 의사에게 전할 수는 있어요. 하지만 성인 당사자의 진료 기록을 받으려면 원칙적으로 본인의 동의서가 필요하고, 의료인은 진료하며 알게 된 정보를 함부로 알릴 수 없어요.',
    'faq-memory-meds': '기억·집중의 어려움은 병 자체에서 오는 부분이 크고, 항정신병약이 이를 크게 좋아지게 하지는 못한다는 관점이 있어요. 다만 항콜린 작용이 있는 약이 겹치면 인지 점수가 낮았다는 연구가 있어, 약 조합은 의사와 점검할 수 있어요. 어떤 약이든 혼자 끊지 말고 먼저 담당 의사에게 말하세요.'
  };
  const got = {};
  faqs.forEach(function (a) { got[a.slug] = NS.answerOf(a.summary); });
  eq(Object.keys(got).sort(), Object.keys(SNAP).sort(), '질문 글 목록이 바뀌었어요(새 질문의 답 줄을 검토해 SNAP 에 더해요)');
  Object.keys(SNAP).forEach(function (k) { eq(got[k], SNAP[k], k + ' 의 답 줄이 바뀌었어요(검토 뒤 SNAP 을 고쳐요)'); });
});

test('nextsteps.json: 입원 글의 첫 다음 걸음은 법원 구제청구가 아니에요(권리 안내는 뒤 자리에 남아요)', function () {
  ['hospital-day-hospital', 'hospital-stay-life', 'admission-types'].forEach(function (k) {
    ROLES.forEach(function (role) {
      [run(k, role), runB(k, role)].forEach(function (r) { ok(r.steps.length && r.steps[0].slug !== 'habeas-corpus-relief', k + '/' + role + ': ' + JSON.stringify(slugs(r))); });
    });
  });
  ok(slugs(run('hospital-day-hospital', 'self')).indexOf('habeas-corpus-relief') > 0, '입원과 낮병원(당사자): 권리 안내는 뒤에');
  ok(slugs(run('hospital-stay-life', 'self')).indexOf('habeas-corpus-relief') > 0, '입원 생활(당사자): 권리 안내는 뒤에');
});

test('nextsteps.json 안전: 환청·망상 글의 가족 목록은 응급 대처로 바로 잇지 않고, 몰래 약 섞기 질문은 손 지정하지 않아요', function () {
  ['auditory-hallucination', 'persecutory-delusion'].forEach(function (k) {
    Object.keys(hand[k]).forEach(function (r) {
      hand[k][r].forEach(function (s) { ok(!isHeavy(s), k + '.' + r + ': ' + s); });
    });
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

test('없는 글·빈 자료에도 던지지 않는다', function () {
  eq(NS.pick({ slug: 'no-such', articles: articles }), { steps: [], faqs: [], byRole: false });
  eq(NS.pick({}), { steps: [], faqs: [], byRole: false });
  const r = NS.pick({ slug: 'cbtp', articles: articles, links: null, hand: null, courses: null, groups: null });
  ok(r.steps.length >= 1, '분류 순서만으로도 고름');
  /* 아직 글이 없는 slug 는 화면에서 건너뛴다 */
  const r2 = run('auditory-hallucination', 'family', { hand: { 'auditory-hallucination': { family: ['zz-not-yet', 'emergency-response'], any: ['zz-also-not'] } } });
  eq(r2.steps[0].slug, 'emergency-response');
});
