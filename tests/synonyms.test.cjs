/* js/synonyms.js 테스트: 일상 말 → 문서/용어 매칭 */
const fs = require('fs');
const path = require('path');
const S = require('../js/synonyms.js');

function loadData(file) {
  const w = {}; w.JHB = {};
  new Function('window', 'JHB', fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8'))(w, w.JHB);
  return w.JHB;
}
const SYN = loadData('synonyms.js').synonyms;
const TOC = loadData('toc.js').toc.articles;
const GLOSS = loadData('glossary.js').glossary;
const M = S.build(SYN);
function first(q) { return S.expand(M, q).slugs[0] && S.expand(M, q).slugs[0].slug; }
function slugsOf(q) { return S.expand(M, q).slugs.map(function (s) { return s.slug; }); }

test('일상 말: "목소리가 들려요" → 환청', function () {
  const r = S.expand(M, '목소리가 들려요');
  eq(r.slugs[0].slug, 'auditory-hallucination');
  ok(r.terms.indexOf('환청') >= 0, 'terms에 환청');
});

test('일상 말: 살이 쪄요 / 약 먹으면 멍해요 / 가족이 병원을 안 가요 / 죽고 싶어', function () {
  eq(first('살이 쪄요'), 'faq-weight-gain');
  eq(first('약 먹으면 멍해요'), 'faq-dull-feeling');
  eq(first('가족이 병원을 안 가요'), 'faq-family-refuses');
  ok(slugsOf('죽고 싶어').indexOf('suicide-warning-signs') >= 0, '죽고 싶어 → suicide-warning-signs');
});

test('띄어쓰기·대소문자 차이는 무시한다', function () {
  eq(slugsOf('살이쪄요'), slugsOf('살이 쪄요'));
  eq(slugsOf('목소리가들려'), slugsOf('목소리가 들려'));
  eq(slugsOf('LAI 주사'), slugsOf('lai 주사'));
});

test('상품명·오타: 쎄로켈/세로켈 → 쿠에티아핀, 인베가 → 팔리페리돈', function () {
  const r = S.expand(M, '쎄로켈 부작용');
  has(slugsOf('쎄로켈 부작용').join(','), 'quetiapine');
  has(slugsOf('쎄로켈 부작용').join(','), 'side-effects-overview');
  ok(r.terms.indexOf('쿠에티아핀') >= 0, 'terms에 쿠에티아핀');
  eq(first('세로켈'), 'quetiapine');
  eq(first('인베가'), 'paliperidone');
  ok(slugsOf('인베가 주사').indexOf('lai') >= 0, '인베가 주사 → lai 포함');
});

test('영문·약어: clozapine, TRS, 짧은 약어는 단어 경계에서만', function () {
  eq(first('clozapine'), 'treatment-resistant');
  ok(slugsOf('TRS').indexOf('treatment-resistant') >= 0);
  eq(first('LAI'), 'lai');
  ok(slugsOf('exactly').indexOf('case-management-act') < 0, '"exactly" 속 act 는 잡지 않음');
  ok(slugsOf('therapy').indexOf('antipsychotic-basics') < 0, '"therapy" 속 ap 는 잡지 않음');
});

test('옛 병명·낙인 표현은 올바른 문서로', function () {
  eq(first('정신분열증'), 'name-history');
  eq(first('다중인격'), 'faq-split-personality');
  ok(slugsOf('미친 사람').indexOf('myths') >= 0);
});

test('없는 말·한 글자·빈 질의는 빈 결과', function () {
  eq(S.expand(M, '김치찌개 레시피'), { slugs: [], terms: [] });
  eq(S.expand(M, '약'), { slugs: [], terms: [] });
  eq(S.expand(M, ''), { slugs: [], terms: [] });
  eq(S.expand(M, null), { slugs: [], terms: [] });
});

test('점수: 긴 say 일치가 앞, 같은 slug 는 합산, 항목 안 첫 slug 가 우선', function () {
  const m = S.build([
    { say: ['약 먹고 살이 쪄'], slugs: ['long'] },
    { say: ['살이 쪄'], slugs: ['short', 'second'] },
    { say: ['없는 말'], slugs: ['none'] }
  ]);
  const r = S.expand(m, '약 먹고 살이 쪄요');
  eq(r.slugs.map(function (s) { return s.slug; }), ['long', 'short', 'second']);
  ok(r.slugs[0].score > r.slugs[1].score && r.slugs[1].score > r.slugs[2].score);
  const m2 = S.build([
    { say: ['약 먹고 살이 쪄'], slugs: ['long'] },
    { say: ['살이 쪄'], slugs: ['sum'] },
    { say: ['약 먹고'], slugs: ['sum'] }
  ]);
  eq(S.expand(m2, '약 먹고 살이 쪄요').slugs[0].slug, 'sum');
});

test('짧은 질의가 say 안에 들어 있어도 잡힌다(say ⊃ 질의)', function () {
  const r = S.expand(M, '목소리');
  ok(r.slugs.slice(0, 3).map(function (s) { return s.slug; }).indexOf('auditory-hallucination') >= 0, '환청 글이 상위 3위 안');
  ok(r.slugs.length > 3, '여러 항목이 합쳐짐');
});

test('slug 는 최대 8개, terms 는 중복 없음', function () {
  const many = S.build([{ say: ['가나다'], slugs: 'abcdefghij'.split(''), terms: ['x', 'x', 'y'] }]);
  const r = S.expand(many, '가나다');
  eq(r.slugs.length, 8);
  eq(r.terms, ['x', 'y']);
  ok(S.expand(M, '약 부작용 때문에 살이 쪄요').slugs.length <= 8);
});

test('낱말 경계(M3): say 는 질의의 낱말 시작에서만, 두 글자 say 는 질의 낱말 전체(조사·어미를 뗀 꼴 포함)와 같을 때만', function () {
  ok(slugsOf('장애인 등록').indexOf('faq-love-marriage') < 0 && slugsOf('장애인 등록').indexOf('dating-marriage') < 0, "'장애인' 속 '애인' 아님");
  eq(slugsOf('장애인 등록')[0], 'disability-registration');
  ok(slugsOf('임신 약').indexOf('new-drugs') < 0, "'임신 약' 을 붙인 '임신약' 속 '신약' 아님");
  ok(slugsOf('지연성 운동장애').indexOf('exercise') < 0, "'운동장애' 의 '운동' 아님(두 글자 say)");
  ok(slugsOf('자살').indexOf('housing-independent-living') < 0 && slugsOf('자살').indexOf('faq-living-alone') < 0, "'자살' 이 '혼자 살' 속에 들어가지 않음");
  eq(first('운동'), 'exercise', '두 글자 say 는 낱말 전체와 같으면 그대로');
  eq(first('살쪄요'), 'faq-weight-gain', '두 글자 say 에 어미가 붙어도(살쪄 + 요)');
  ok(slugsOf('약값이 걱정').indexOf('drug-costs-coverage') >= 0, '약값 + 이');
  eq(first('EPS'), 'eps');
  eq(first('eps가 뭐야'), 'eps', '영문 약어 뒤에 한글 조사');
  eq(first('장기지속형lai'), 'lai', '영문 약어 앞이 한글');
});

test('느슨한 일치(loose): 낱말 순서·조사가 달라도, 앞 두 낱말 구절도 — expand 결과는 바꾸지 않는다', function () {
  function loose(q) { return S.loose(M, q).slugs.map(function (s) { return s.slug; }); }
  ok(loose('깜빡하고 약').indexOf('missed-dose') >= 0, "'약 깜빡' ↔ '깜빡하고 약'");
  eq(slugsOf('깜빡하고 약'), [], 'expand 는 그대로(빈 결과)');
  ok(loose('누가 나를 감시해').slice(0, 3).indexOf('persecutory-delusion') >= 0, "'누가 나를 해치' 의 앞 구절");
  eq(loose('환청'), [], '한 낱말 질의는 느슨한 일치 없음');
  eq(loose('김치찌개 레시피'), []);
  const m = S.build([{ say: ['가나 다라 마바'], slugs: ['x'] }]);
  eq(S.loose(m, '가나 다라 사아').slugs.map(function (s) { return s.slug; }), ['x'], '앞 두 낱말(4자)');
  eq(S.loose(m, '가 다라').slugs, [], '짧은 구절은 아님');
});

test('데이터: 항목 200~400개, say 2글자 이상, 모든 slug 가 toc 에 있고 모든 term 이 사전에 있다', function () {
  ok(SYN.length >= 200 && SYN.length <= 400, '항목 수 ' + SYN.length);
  const slugSet = new Set(TOC.map(function (a) { return a.slug; }));
  const termSet = new Set(GLOSS.map(function (g) { return g.term; }));
  const badSlug = [], badTerm = [], badSay = [];
  SYN.forEach(function (e, i) {
    ok(Array.isArray(e.say) && e.say.length, i + '번 say 없음');
    ok(Array.isArray(e.slugs) && e.slugs.length, i + '번 slugs 없음');
    e.say.forEach(function (s) { if (String(s).replace(/\s+/g, '').length < 2) badSay.push(s); });
    e.slugs.forEach(function (s) { if (!slugSet.has(s)) badSlug.push(s); });
    (e.terms || []).forEach(function (t) { if (!termSet.has(t)) badTerm.push(t); });
  });
  eq(badSay, [], '2글자 미만 say');
  eq(badSlug, [], 'toc 에 없는 slug');
  eq(badTerm, [], '사전에 없는 term');
});
