/* 검색 품질(M3): 실제 data/toc.js·glossary.js·synonyms.js·courses.js(+ 본문 색인 data/search-index.json)로
   .claude/work/audit-ux.md 2장의 검색어 40개를 팔레트(빠른 찾기, JHB.search.plan 의 top)와 찾기 화면(본문 색인으로 보강한 JHB.search.results)
   양쪽에서 돌려 기대 결과(1위 또는 3위 안)를 고정한다. 오탐 4종이 사라졌는지, 위기 감지와의 결합(원문·고친 질의)도 본다.
   새 글이 늘어도 버티게 "몇 위 안"으로 적는다. 기대를 바꿀 때는 감사 표의 판정 이유를 함께 적는다. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const S = require('../js/search.js');
const SYN = require('../js/synonyms.js');
const C = require('../js/crisis.js');
function loadData(file) { const w = {}; w.JHB = {}; new Function('window', 'JHB', fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'))(w, w.JHB); return w.JHB; }
const TOC = loadData('toc.js').toc.articles;
const CARD = loadData('crisis-card.js').crisisCard;
const P = S.prepare({ articles: TOC, glossary: loadData('glossary.js').glossary, courses: loadData('courses.js').courses, synonyms: loadData('synonyms.js').synonyms, sections: loadData('sections.js').sections, syn: SYN });
const IDX = S.build(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'search-index.json'), 'utf8')));
const SEC = {}; TOC.forEach(function (a) { SEC[a.slug] = String(a.section); });

function plan(q) { return S.plan(P, q, { detect: C.detect, card: CARD }); }
/* 팔레트에서 먼저 보이는 글(위기 줄·동작 줄 빼고) */
function pal(q) { return plan(q).top.map(function (x) { return x.slug; }); }
/* 찾기 화면의 최종 목록 */
function page(q) { return S.results(plan(q), IDX).list.map(function (x) { return x.id; }); }
function within(list, slugs, n) { return list.slice(0, n).some(function (s) { return slugs.indexOf(s) >= 0; }); }

/* [검색어, 기대 글(하나라도), 몇 위 안, 감사 번호]. 감사 표에서 X·△ 였던 것 포함 */
const CASES = [
  ['환쳥', ['auditory-hallucination'], 1, 1],
  ['조현벙', ['what-is-schizophrenia'], 3, 2],
  ['ㅎㅊ', ['auditory-hallucination'], 1, 3],
  ['ㅋㄹㅈㅍ', ['clozapine'], 1, 4],
  ['클로자 핀', ['clozapine'], 1, 5],
  ['조현 병', ['what-is-schizophrenia', 'spectrum'], 3, 6],
  ['약 끊어도 되나요', ['faq-stop-when-well', 'switching-reducing-stopping'], 1, 7],
  ['약 먹고 살쪘어요', ['faq-weight-gain'], 1, 8],
  ['약을 빠뜨렸어요', ['missed-dose'], 1, 9],
  ['깜빡하고 약', ['missed-dose'], 3, 10],
  ['살이 쪄요', ['faq-weight-gain'], 1, 11],
  ['체중 증가', ['faq-weight-gain', 'metabolic-side-effects'], 3, 12],
  ['LAI', ['lai'], 1, 13],
  ['lai', ['lai'], 1, 14],
  ['EPS', ['eps'], 1, 15],
  ['CBT', ['cbtp'], 1, 16],
  ['PANSS', ['panss'], 1, 17],
  ['인베가', ['paliperidone'], 1, 18],
  ['아빌리파이', ['aripiprazole'], 1, 19],
  ['리스페달', ['risperidone'], 1, 20],
  ['자이프렉사', ['olanzapine'], 1, 21],
  ['clozapine', ['clozapine'], 3, 22],
  ['목소리가 들려', ['auditory-hallucination'], 1, 23],
  ['누가 나를 감시해', ['persecutory-delusion'], 3, 24],
  ['잠을 못 자요', ['sleep'], 1, 25],
  ['죽고 싶어', ['suicide-warning-signs', 'crisis-hotlines'], 1, 26],
  ['자살', ['suicide-warning-signs'], 1, 27],
  ['입원비', ['faq-cost'], 1, 28],
  ['장애인 등록', ['disability-registration'], 1, 29],
  ['회사에 말해야', ['faq-tell-employer', 'disclosure'], 1, 30],
  ['유전되나요', ['faq-inheritance', 'genetics'], 1, 31],
  ['혈액 검사', ['clozapine'], 3, 32],
  ['처음 진단', ['first-episode', 'family-first-steps'], 1, 33],
  ['임신 약', ['pregnancy-parenting'], 1, 35],
  ['술 마셔도', ['faq-alcohol'], 1, 36],
  ['강제 입원', ['admission-types', 'faq-forced-admission'], 1, 37],
  ['재발 신호', ['relapse-signs'], 1, 38],
  ['지연성 운동장애', ['eps'], 1, 39],
  ['정신과 비용', ['faq-cost'], 4, 40]
];

test('감사 검색어 40개 가운데 39개를 팔레트(빠른 찾기)에서 기대 순위 안으로 고정', function () {
  ok(CASES.length >= 30, '고정한 검색어 ' + CASES.length);
  const bad = [];
  CASES.forEach(function (c) { const got = pal(c[0]); if (!within(got, c[1], c[2])) bad.push('#' + c[3] + ' ' + c[0] + ' → ' + got.slice(0, 4).join(',')); });
  eq(bad, []);
});

test('같은 검색어를 찾기 화면(본문 색인으로 보강한 최종 목록)에서도 기대 순위 안', function () {
  const bad = [];
  CASES.forEach(function (c) { const got = page(c[0]); if (!within(got, c[1], c[2])) bad.push('#' + c[3] + ' ' + c[0] + ' → ' + got.slice(0, 4).join(',')); });
  eq(bad, []);
});

test('#34 가족 대처: 1위가 가족과 주변(10분류) 글(전에는 당사자용 "양성 증상 자가 대처")', function () {
  eq(SEC[pal('가족 대처')[0]], '10');
  eq(SEC[page('가족 대처')[0]], '10');
});

test('과업 7: 당사자 말투 "처음 진단받았어요" 는 당사자 글 "첫 삽화" 가 1위(전에는 가족용)', function () {
  eq(pal('처음 진단받았어요')[0], 'first-episode');
});

test('과업 1: "가족이 목소리가 들린다고 해요" 는 환청 글이 1위(약을 이미 먹는 사람용 FAQ 가 아님)', function () {
  eq(pal('가족이 목소리가 들린다고 해요')[0], 'auditory-hallucination');
});

test('오탐 4종이 사라졌다: 자살→혼자 살기, 장애인 등록→연애, 임신 약→신약, 지연성 운동장애→운동(+ EPS→첫 삽화)', function () {
  function none(list, slugs, n, what) { const hit = list.slice(0, n).filter(function (s) { return slugs.indexOf(s) >= 0; }); eq(hit, [], what); }
  none(pal('자살'), ['housing-independent-living', 'faq-living-alone'], 20, '자살(팔레트)');
  none(page('자살'), ['housing-independent-living', 'faq-living-alone'], 10, '자살(찾기 화면)');
  none(pal('장애인 등록'), ['faq-love-marriage', 'dating-marriage'], 20, '장애인 등록(팔레트)');
  none(page('장애인 등록'), ['faq-love-marriage', 'dating-marriage'], 10, '장애인 등록(찾기 화면)');
  none(pal('임신 약'), ['new-drugs', 'drug-pipeline'], 20, '임신 약(팔레트)');
  none(page('임신 약'), ['new-drugs'], 3, '임신 약(찾기 화면)');
  none(pal('지연성 운동장애'), ['exercise', 'faq-exercise', 'diet-exercise'], 20, '지연성 운동장애(팔레트)');
  none(page('지연성 운동장애'), ['exercise', 'faq-exercise', 'diet-exercise'], 3, '지연성 운동장애(찾기 화면)');
  const eps = S.find(P, 'EPS').terms.map(function (x) { return x.g.term; });
  ok(eps.indexOf('첫 삽화') < 0 && !eps.some(function (t) { return /KEPS/.test(t); }), 'EPS 용어: ' + eps.join(','));
  ok(eps.indexOf('추체외로 증상') === 0);
});

test('팔레트에서 0건이던 말이 찾힌다(약을 하루 빠뜨렸다·누가 나를 감시해·가족 대처·약을 빠뜨렸어요·깜빡하고 약)', function () {
  eq(pal('약을 하루 빠뜨렸다')[0], 'missed-dose');
  ['누가 나를 감시해', '가족 대처', '약을 빠뜨렸어요', '깜빡하고 약'].forEach(function (q) { ok(pal(q).length > 0, q); });
});

test('오타·초성은 "찾으셨나요" 후보를 내고, 튼튼한 결과가 있으면 내지 않는다', function () {
  [['환쳥', '환청'], ['조현벙', '조현병'], ['ㅎㅊ', '환청'], ['ㅋㄹㅈㅍ', '클로자핀'], ['환쳥이 들려요', '환청이 들려요'], ['조현벙 약', '조현병 약']].forEach(function (c) {
    const p = plan(c[0]);
    ok(p.sug && p.sug.text === c[1], c[0] + ' → ' + (p.sug && p.sug.text));
  });
  /* '클로자삔' 은 일상 말 사전에 이미 있어(오타 그대로 등록) 후보 없이 바로 찾는다 */
  eq(pal('클로자삔')[0], 'clozapine');
  ['환청', '클로자핀', '약 끊어도 되나요', '목소리가 들려'].forEach(function (q) { eq(plan(q).sug, null, q); });
  eq(plan('블록체인').top, [], '정말 없는 말은 빈 결과(빈 화면이 다른 길을 보여 줌)');
});

test('질문 꼴: 어미·조사를 덜어 내고 찾고, 맨 위가 자주 묻는 질문 글이면 짧은 답을 띄울 수 있다', function () {
  [['약 끊어도 되나요', 'faq-stop-when-well'], ['유전되나요', 'faq-inheritance'], ['술 마셔도', 'faq-alcohol'], ['회사에 말해야 하나', 'faq-tell-employer'], ['조현병이 유전되나요', 'faq-inheritance']].forEach(function (c) {
    const p = plan(c[0]);
    ok(p.question, c[0] + ' 질문 꼴');
    eq(p.top[0].slug, c[1], c[0]);
    eq(SEC[p.top[0].slug], '15');
  });
  ok(!plan('환청').question, '질문 꼴 아님');
});

test('위기 결합: 원문과 고친 질의 모두에 감지 — 감지가 빠지지 않고, high·harm 은 위기 카드 글이 맨 앞', function () {
  const hi = plan('죽고 싶어');
  eq(hi.crisis && hi.crisis.level, 'high');
  ok(hi.urgent && hi.sug === null, 'high 는 찾으셨나요를 내지 않음');
  eq(hi.top.slice(0, hi.front.length).map(function (x) { return x.slug; }), hi.front, '위기 카드 글이 맨 앞');
  ok(hi.front.indexOf('crisis-hotlines') >= 0 && hi.front.indexOf('suicide-warning-signs') >= 0, JSON.stringify(hi.front));
  ok(plan('자살률').crisis !== null, '자살률 은 null 이 아님(정보 검색 watch)');
  /* 고친 질의·초성 후보에서만 감지되는 경우에도 위기 등급이 붙는다(카드가 빠지지 않게) */
  const typo = plan('자쌀');
  ok(typo.sug && typo.sug.text === '자살' && typo.crisis, '자쌀 → 자살 로 고치고 감지: ' + JSON.stringify(typo.crisis));
  ok(plan('ㅈㅅ').crisis !== null, 'ㅈㅅ 의 초성 후보(자살)에도 감지');
  /* 감지 결과는 원문에서 이미 잡히면 고친 질의 때문에 약해지지 않는다 */
  ok(plan('그만 살고 싶어').crisis.level === 'high');
});

test('위기 결과 순서: 카드 아래 첫 결과는 그 등급의 글, 낱말 하나씩 OR 로 찾은 관계 먼 글 수백 개가 뜨지 않는다', function () {
  const harm = page('죽이고 싶어');
  eq(harm.slice(0, 2), ['emergency-response', 'anger-irritability'], '타해: 응급 상황 대처·화와 공격성');
  ok(harm.length < 30, '타해 결과 수 ' + harm.length);
  const quit = page('그만 살고 싶어');
  ok(within(quit, ['crisis-hotlines', 'suicide-warning-signs'], 2), JSON.stringify(quit.slice(0, 3)));
  ok(quit.indexOf('disclosure') < 0 && quit.indexOf('leap-communication') < 0 && quit.indexOf('open-dialogue') < 0, '관계 먼 글: ' + quit.slice(0, 6).join(','));
  ok(quit.length < 30, '결과 수 ' + quit.length);
  const both = page('안 죽고 싶은데 사라지고 싶어');
  ok(both.length < 60, '“안 죽고 싶은데 사라지고 싶어” 결과 수 ' + both.length + '(전에는 240)');
  const en = page("I'm suicidal");
  ok(en.indexOf('suicide-warning-signs') >= 0 && en.indexOf('crisis-hotlines') >= 0, '영어 위기 질의에도 그 글들: ' + en.join(','));
  eq(SEC[en[0]] === '11' || SEC[en[0]] === '4', true);
});

test('문장 부호·기호만 든 질의(?, ..., (, !!, ")는 빈 결과이고 질문 꼴도 아니다(전에는 284건 + 짧은 답)', function () {
  ['?', '...', '(', '!!', '"', ' ? '].forEach(function (q) {
    const p = plan(q);
    eq(p.top, [], q + ' 팔레트');
    eq(page(q), [], q + ' 찾기 화면');
    ok(!p.question && !p.answer, q + ' 질문 꼴 아님');
  });
});

test('정의 질문("환청이 뭐예요"·"망상이 뭔가요")은 기능어를 빼고 제목과 견준다 — 그 개념 글이 1위, 엉뚱한 FAQ 짧은 답 없음', function () {
  eq(pal('환청이 뭐예요')[0], 'auditory-hallucination');
  eq(page('환청이 뭐예요')[0], 'auditory-hallucination');
  eq(plan('환청이 뭐예요').answer, null, '약을 먹는 사람용 FAQ 의 짧은 답이 뜨지 않음');
  ok(SEC[pal('망상이 뭔가요')[0]] !== '15', '망상이 뭔가요 → ' + pal('망상이 뭔가요')[0]);
  ok(within(pal('망상이 뭔가요'), ['delusion-overview'], 3), pal('망상이 뭔가요').slice(0, 3).join(','));
  eq(plan('망상이 뭔가요').answer, null);
});

test('질문 꼴: "누나·언니·어머니·할머니" 같은 명사는 질문이 아니고 일상 말 사전 순서를 지킨다', function () {
  ['누나', '언니', '어머니', '할머니', '하나님'].forEach(function (q) { ok(!S.isQuestion(q), q); });
  ['되나', '약 끊어도 되나', '먹어도 되니', '말할까', '해야 할까', '괜찮냐', '유전되나요?'].forEach(function (q) { ok(S.isQuestion(q), q); });
  eq(pal('어머니')[0], 'late-life', '사전 순서대로(전에는 질문 가산으로 faq-late-onset)');
  eq(plan('누나').answer, null, '짧은 답 없음');
});

test('짧은 답 카드: 위기 감지(watch 포함)가 있거나 맨 위 FAQ 가 질의의 일부 낱말에만 맞으면 띄우지 않는다', function () {
  eq(plan('자살 유전되나요').answer, null, '자살 유전되나요(watch) → 다른 주제의 답을 보이지 않음');
  [['약 끊어도 되나요', 'faq-stop-when-well'], ['유전되나요', 'faq-inheritance'], ['술 마셔도 되나요', 'faq-alcohol'], ['회사에 말해야 하나', 'faq-tell-employer'], ['조현병 유전되나요', 'faq-inheritance']].forEach(function (c) {
    eq(plan(c[0]).answer, c[1], c[0]);
  });
  ['죽고 싶어', '담배 피워도 되나요', '환청', '?'].forEach(function (q) { eq(plan(q).answer, null, q); });
});

test('긴 글을 붙여 넣어도 빨리 끝나고(앞 100글자·12낱말만 찾음), 위기 감지는 자르지 않은 원문에도 돈다', function () {
  const long = '가나다라 마바사 아자차카 '.repeat(100);
  S.find(P, '환쳥');
  let t0 = Date.now(); const p = plan(long); const r = S.results(p, IDX); const ms = Date.now() - t0;
  ok(ms < 60, '긴 글 한 번 ' + ms + 'ms(전에는 400ms 안팎)');
  eq(r.list, []);
  ok(S.analyze(long).raw.length <= 100 && S.analyze(long).words.length <= 12);
  const tail = '요즘 잠도 못 자고 일도 손에 안 잡히고 가족하고도 자꾸 다퉈서 너무 지쳤어요 그냥 다 그만하고 죽고 싶어';
  ok(tail.length > 50 && plan(tail).crisis && plan(tail).crisis.level === 'high', '긴 글 끝의 위기 말');
  const cut = '가나다 '.repeat(30) + '죽고 싶어';
  ok(S.analyze(cut).raw.indexOf('죽고') < 0, '찾는 말에서는 잘림');
  ok(plan(cut).crisis && plan(cut).crisis.level === 'high', '잘린 뒤에 있는 위기 말도 감지');
});

test('빠르기: 빠른 찾기 한 번(오타 고치기 포함)이 느린 기기에서도 버벅이지 않을 만큼 짧다', function () {
  const qs = CASES.map(function (c) { return c[0]; });
  S.find(P, '환쳥'); /* 오타 사전 한 번 만들기 */
  const t0 = Date.now();
  for (let i = 0; i < 3; i++) qs.forEach(function (q) { S.plan(P, q, { detect: C.detect, card: CARD }); });
  const per = (Date.now() - t0) / (qs.length * 3);
  ok(per < 15, '한 번에 ' + per.toFixed(2) + 'ms');
});
