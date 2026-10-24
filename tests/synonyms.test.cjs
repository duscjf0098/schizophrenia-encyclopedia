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

test('데이터: 항목 200~300개, say 2글자 이상, 모든 slug 가 toc 에 있고 모든 term 이 사전에 있다', function () {
  ok(SYN.length >= 200 && SYN.length <= 300, '항목 수 ' + SYN.length);
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
