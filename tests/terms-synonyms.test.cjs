/* data/synonyms.js 보강(2026-11-14) 테스트: 새 묶음의 형식·겹침·위기 안전·새 글로 가는 길
   기존 묶음은 tests/synonyms.test.cjs 가 보고, 여기서는 그 뒤에 더한 묶음만 엄격하게 본다.
   기존 317개 가운데 똑같은 글을 가리키던 4개(영문 신약·QTc·복약 순응·NMS)는 짝 묶음에 합쳐 313개가 됐다. */
const fs = require('fs');
const path = require('path');
const S = require('../js/synonyms.js');
const C = require('../js/crisis.js');

function loadData(file) {
  const w = {}; w.JHB = {};
  new Function('window', 'JHB', fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8'))(w, w.JHB);
  return w.JHB;
}
const SYN = loadData('synonyms.js').synonyms;
const TOC = loadData('toc.js').toc.articles;
const GLOSS = loadData('glossary.js').glossary;
const M = S.build(SYN);

/* 이 보강 전의 묶음 수(합친 4개를 뺀 수). 이 번호부터가 새 묶음이에요 */
const BASE = 313;
const NEW = SYN.slice(BASE);
function norm(s) { return String(s).toLowerCase().replace(/\s+/g, ''); }
function slugsOf(q) { return S.expand(M, q).slugs.map(function (s) { return s.slug; }); }
function first(q) { return slugsOf(q)[0]; }

/* 위기·안전 글: 위기 감지에 걸리는 말은 이 가운데 하나로 이어져야 해요 */
const SAFETY = ['suicide-warning-signs', 'crisis-hotlines', 'emergency-response', 'family-violence-safety',
  'missing-person', 'psychiatric-emergency-system', 'suicide-bereavement'];
/* 이번 판의 새 글 33편(.claude/work/c2-newlinks.md) */
const NEW_ARTICLES = ['psychosis-what-is', 'comorbid-substance-use', 'heat-and-medication', 'polydipsia-hyponatremia',
  'trauma-and-psychosis', 'diagnosis-emotions', 'drug-level-test', 'heart-and-antipsychotics', 'neuroleptic-malignant-syndrome',
  'other-medical-care', 'psychoeducation', 'shared-decision-making', 'womens-health', 'family-grief', 'family-violence-safety',
  'for-coworkers-managers', 'for-friends', 'for-teachers', 'missing-person', 'suicide-bereavement',
  'counseling-voucher-and-screening', 'family-care-leave', 'guardian-duties', 'habeas-corpus-relief', 'justice-system',
  'medical-cost-safety-net', 'psychiatric-emergency-system', 'treatment-cost-support', 'faq-ai-chatbot', 'faq-early-signs',
  'faq-family-talk-doctor', 'faq-hide-meds-in-food', 'faq-memory-meds'];

test('새 일상 말: 묶음이 25개 넘게 더해졌고 say 가 60개 이상이다', function () {
  ok(NEW.length >= 25, '새 묶음 ' + NEW.length);
  const n = NEW.reduce(function (a, e) { return a + e.say.length; }, 0);
  ok(n >= 60, '새 say ' + n);
});

/* 상한의 이유: 묶음이 늘면 질의마다 도는 expand·loose 가 느려지고(팔레트는 글자마다 돎) 같은 글로 가는 묶음이 흩어져 관리가 어렵다.
   M8 에서 정보 질의(자살률·자살 통계)를 위기 묶음과 섞지 않으려고 묶음 하나를 더해 349개가 됐다. 상한은 그만큼만 올린다
   (tests/synonyms.test.cjs 의 전체 상한 400 과 빠르기 테스트 15ms 는 그대로) */
test('묶음 수: 기존 테스트의 상한(350개) 안에서 여유를 남긴다', function () {
  ok(SYN.length <= 349, '전체 묶음 ' + SYN.length);
});

test('새 일상 말: slug 1~3개, 모두 toc 에 있고, terms 는 용어 사전의 term 과 똑같다', function () {
  const slugSet = new Set(TOC.map(function (a) { return a.slug; }));
  const termSet = new Set(GLOSS.map(function (g) { return g.term; }));
  const bad = [];
  NEW.forEach(function (e, i) {
    const at = (BASE + i) + '번';
    if (!Array.isArray(e.say) || !e.say.length) bad.push(at + ' say 없음');
    if (!Array.isArray(e.slugs) || e.slugs.length < 1 || e.slugs.length > 3) bad.push(at + ' slugs 개수 ' + (e.slugs || []).length);
    (e.slugs || []).forEach(function (s) { if (!slugSet.has(s)) bad.push(at + ' toc 에 없는 slug ' + s); });
    if (new Set(e.slugs).size !== (e.slugs || []).length) bad.push(at + ' slug 중복');
    (e.terms || []).forEach(function (t) { if (!termSet.has(t)) bad.push(at + ' 사전에 없는 term ' + t); });
  });
  eq(bad, []);
});

test('새 일상 말: say 는 공백을 빼고 3글자 이상(2글자 이하 금지)', function () {
  const short = [];
  NEW.forEach(function (e) { e.say.forEach(function (s) { if (norm(s).length <= 2) short.push(s); }); });
  eq(short, []);
});

test('새 일상 말: 같은 say 가 다른 묶음(기존 포함)이나 같은 묶음 안에 겹치지 않는다', function () {
  const owner = {};
  SYN.forEach(function (e, i) { e.say.forEach(function (s) { const k = norm(s); (owner[k] = owner[k] || []).push(i); }); });
  const dup = [];
  NEW.forEach(function (e, j) {
    const i = BASE + j;
    e.say.forEach(function (s) { const o = owner[norm(s)]; if (o.length > 1) dup.push(s + ' → ' + o.join(',')); });
    void i;
  });
  eq(dup, []);
});

test('새 일상 말: 이번 판의 새 글 33편이 모두 어느 묶음의 첫 글로 이어진다', function () {
  const firsts = new Set(SYN.map(function (e) { return e.slugs[0]; }));
  eq(NEW_ARTICLES.filter(function (s) { return !firsts.has(s); }), []);
});

test('위기 안전: 위기 감지에 걸리는 새 say 는 위기·안전 글로 이어진다', function () {
  const bad = [];
  NEW.forEach(function (e) {
    e.say.forEach(function (s) {
      if (C.detect(s) && !e.slugs.some(function (x) { return SAFETY.indexOf(x) >= 0; })) bad.push(s + ' → ' + e.slugs.join(','));
    });
  });
  eq(bad, []);
});

test('위기 안전: 위기 감지가 잡는 말은 그대로 잡히고, 일상 말 결과의 1위는 위기·안전 글이다', function () {
  [
    ['죽고 싶어', 'high'], ['자살하고 싶어요', 'high'], ['사라지고 싶어', 'high'],
    ['아들이 때릴 것 같아요', 'harm'], ['남편이 때릴 것 같아', 'harm'],
    ['자살', 'watch'], ['자해', 'watch'], ['자살 유족', 'watch'], ['정신응급', 'watch']
  ].forEach(function (c) {
    const r = C.detect(c[0]);
    ok(r && r.level === c[1], c[0] + ' 위기 감지 ' + JSON.stringify(r));
    const top = first(c[0]);
    ok(SAFETY.indexOf(top) >= 0, c[0] + ' 의 1위가 위기·안전 글이 아님: ' + top);
  });
});

test('위기 안전: 때려요·집 나갔어요·연락이 안 돼요 같은 말은 안전 글이 1위', function () {
  eq(first('아들이 때려요'), 'family-violence-safety');
  eq(first('가족을 때려요'), 'family-violence-safety');
  eq(first('가정폭력'), 'family-violence-safety');
  eq(first('아들이 집 나갔어요'), 'missing-person');
  eq(first('아들이 연락이 안 돼요'), 'missing-person');
  eq(first('가족과 연락이 안 돼요'), 'missing-person');
  eq(first('연락이 끊겼어요'), 'missing-person');
  ok(slugsOf('병원과 연락이 안 돼요').indexOf('missing-person') < 0, '병원·주치의 연락은 실종 글로 가지 않음');
  ok(slugsOf('주치의랑 연락이 안 돼요').indexOf('missing-person') < 0, '주치의 연락은 실종 글로 가지 않음');
  eq(first('가족을 죽이고 싶어요'), 'family-violence-safety');
  ok(C.detect('가족을 죽이고 싶어요').level === 'harm', '가족을 죽이고 싶어요 위기 감지 harm');
  eq(first('누가 나를 해치려 해요'), 'persecutory-delusion');
  eq(first('가출했어요'), 'missing-person');
  ok(slugsOf('엄마를 때려요').slice(0, 3).indexOf('crisis-hotlines') >= 0, '때려요 → 위기 상담 전화도 3위 안');
});

test('새 일상 말 → 새 글: 몸의 응급 신호', function () {
  eq(first('물을 계속 마셔요'), 'polydipsia-hyponatremia');
  eq(first('물을 너무 많이 마셔요'), 'polydipsia-hyponatremia');
  eq(first('너무 더워요'), 'heat-and-medication');
  eq(first('열사병'), 'heat-and-medication');
  eq(first('약 먹고 열이 나요'), 'neuroleptic-malignant-syndrome');
  eq(first('열이 나고 몸이 굳어요'), 'neuroleptic-malignant-syndrome');
  eq(first('맥박이 빨라요'), 'heart-and-antipsychotics');
  eq(first('심장이 두근거려요'), 'heart-and-antipsychotics');
  eq(first('수술 앞두고 약'), 'other-medical-care');
  eq(first('이가 빠져요'), 'other-medical-care');
  eq(slugsOf('이가 썩어요').slice(0, 2), ['other-medical-care', 'sedation-anticholinergic']);
  eq(slugsOf('수술 앞두고 불안해요').indexOf('sedation-anticholinergic'), -1);
  eq(slugsOf('감기약').indexOf('sedation-anticholinergic'), -1);
  eq(first('약 농도 검사'), 'drug-level-test');
});

test('새 일상 말 → 새 글: 주변 사람·가족', function () {
  eq(first('동료가 조현병이래요'), 'for-coworkers-managers');
  eq(first('친구가 조현병이래요'), 'for-friends');
  eq(first('학생이 이상해요'), 'for-teachers');
  eq(first('예전 모습이 그리워요'), 'family-grief');
  eq(first('가족이 자살로 떠났어요'), 'suicide-bereavement');
  eq(first('약을 몰래 음식에 섞어도 되나요'), 'faq-hide-meds-in-food');
  eq(first('가족이 대신 의사와 상담'), 'faq-family-talk-doctor');
  eq(first('가족돌봄휴가'), 'family-care-leave');
});

test('새 일상 말 → 새 글: 제도·권리·돈', function () {
  eq(first('경찰서에 있어요'), 'justice-system');
  eq(first('재판을 받게 됐어요'), 'justice-system');
  eq(first('병원비가 너무 많이 나와요'), 'medical-cost-safety-net');
  eq(first('본인부담상한제'), 'medical-cost-safety-net');
  eq(first('치료비 지원사업'), 'treatment-cost-support');
  eq(first('보호의무자가 누구'), 'guardian-duties');
  eq(first('인신보호 구제청구'), 'habeas-corpus-relief');
  eq(first('권역정신응급의료센터'), 'psychiatric-emergency-system');
  eq(first('심리상담 바우처'), 'counseling-voucher-and-screening');
});

test('새 일상 말 → 새 글: 치료·진단·생활', function () {
  eq(first('정신증이 뭐예요'), 'psychosis-what-is');
  eq(first('조현병 초기 증상'), 'faq-early-signs');
  eq(first('진단을 받아들이기 힘들어요'), 'diagnosis-emotions');
  eq(first('정신교육'), 'psychoeducation');
  eq(first('치료를 같이 정하고 싶어요'), 'shared-decision-making');
  eq(first('피임약'), 'womens-health');
  eq(first('밤에 실수해요'), 'womens-health');
  eq(S.expand(M, '요실금').terms, []);
  eq(slugsOf('오줌을 싸요'), ['womens-health']);
  eq(slugsOf('피임약').slice(0, 2), ['womens-health', 'hyperprolactinemia']);
  eq(first('약 먹으면 머리가 나빠지나요'), 'faq-memory-meds');
  eq(first('약을 오래 먹으면 머리가 나빠지나요'), 'faq-memory-meds');
  eq(first('약 오래 먹으면 살쪄요'), 'faq-weight-gain');
  eq(slugsOf('약 오래 먹으면 내성').indexOf('faq-memory-meds'), -1);
  eq(first('챗봇이랑 이야기'), 'faq-ai-chatbot');
  eq(first('알코올 중독'), 'comorbid-substance-use');
  eq(first('마약 중독'), 'comorbid-substance-use');
  eq(slugsOf('약물 중독'), ['comorbid-substance-use']);
  eq(slugsOf('약물중독 치료').indexOf('polydipsia-hyponatremia'), -1);
  eq(first('조현병 교육 프로그램'), 'psychoeducation');
  eq(slugsOf('직업 교육 프로그램').indexOf('psychoeducation'), -1);
  eq(first('조현병 전조 증상'), 'faq-early-signs');
  eq(first('재발 전조 증상'), 'relapse-signs');
  eq(first('입원 트라우마'), 'trauma-and-psychosis');
});

test('고친 기존 묶음: 새 글로 먼저 가고, 합친 묶음도 예전 글을 그대로 낸다', function () {
  eq(first('nms'), 'neuroleptic-malignant-syndrome');
  eq(first('고열'), 'neuroleptic-malignant-syndrome');
  eq(first('qtc'), 'heart-and-antipsychotics');
  eq(first('심전도'), 'heart-and-antipsychotics');
  eq(slugsOf('심전도 검사').slice(0, 2), ['heart-and-antipsychotics', 'ziprasidone']);
  eq(first('부정맥'), 'heart-and-antipsychotics');
  eq(first('정신병'), 'psychosis-what-is');
  eq(first('psychosis'), 'psychosis-what-is');
  eq(first('psychoeducation'), 'psychoeducation');
  eq(first('가족교육'), 'family-intervention');
  eq(slugsOf('cobenfy').slice(0, 2), ['new-drugs', 'drug-pipeline']);
  eq(slugsOf('adherence').slice(0, 2), ['medication-adherence', 'lai']);
});

test('보강 뒤에도 기존 길은 그대로: 목소리·살·멍함·가족 거부·상품명', function () {
  eq(first('목소리가 들려요'), 'auditory-hallucination');
  eq(first('살이 쪄요'), 'faq-weight-gain');
  eq(first('약 먹으면 멍해요'), 'faq-dull-feeling');
  eq(first('가족이 병원을 안 가요'), 'faq-family-refuses');
  eq(first('세로켈'), 'quetiapine');
  eq(first('주사 맞았어요'), 'lai');
  eq(S.expand(M, '김치찌개 레시피'), { slugs: [], terms: [] });
});
