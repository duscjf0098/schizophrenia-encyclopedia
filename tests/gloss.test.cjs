/* js/gloss.js 테스트: 본문 텍스트에서 용어 사전 단어 찾기 */
const G = require('../js/gloss.js');

const terms = [
  { term: '환청', def: 'a' }, { term: '환각', def: 'b' }, { term: '양성 증상', def: 'c' },
  { term: '망상', def: 'd' }, { term: '피해망상', def: 'e' }, { term: 'PANSS', def: 'f' }
];

test('긴 용어가 짧은 용어보다 먼저 잡힌다', function () {
  const m = G.matcher(terms);
  const segs = G.split('피해망상은 흔해요', m, new Set());
  eq(segs, [{ term: '피해망상' }, { text: '은 흔해요' }]);
});

test('같은 용어는 한 번만(used 집합 공유)', function () {
  const m = G.matcher(terms);
  const used = new Set();
  const a = G.split('환청과 환청', m, used);
  eq(a, [{ term: '환청' }, { text: '과 환청' }]);
  const b = G.split('다시 환청', m, used);
  eq(b, [{ text: '다시 환청' }]);
});

test('여러 용어와 띄어쓰기 있는 용어', function () {
  const m = G.matcher(terms);
  const segs = G.split('양성 증상에는 환각과 망상이 있어요', m, new Set());
  eq(segs, [{ term: '양성 증상' }, { text: '에는 ' }, { term: '환각' }, { text: '과 ' }, { term: '망상' }, { text: '이 있어요' }]);
});

test('제외 목록(문서 자신의 주제)은 잡지 않는다', function () {
  const m = G.matcher(terms, { exclude: ['환청'] });
  eq(G.split('환청과 환각', m, new Set()), [{ text: '환청과 ' }, { term: '환각' }]);
});

test('영문 약어는 단어 경계에서만', function () {
  const m = G.matcher(terms);
  eq(G.split('PANSS 점수', m, new Set()), [{ term: 'PANSS' }, { text: ' 점수' }]);
  eq(G.split('XPANSSY', m, new Set()), [{ text: 'XPANSSY' }]);
});

test('최대 개수 제한', function () {
  const m = G.matcher(terms);
  const used = new Set();
  const segs = G.split('환청 환각 망상', m, used, 2);
  eq(segs.filter(function (s) { return s.term; }).length, 2);
});

test('용어가 없으면 원문 하나', function () {
  const m = G.matcher(terms);
  eq(G.split('아무 말', m, new Set()), [{ text: '아무 말' }]);
});

/* inline: false = 용어 사전 화면·검색에는 나오지만 본문 밑줄에서는 빠지는 흔한 말 */
const common = [
  { term: '도파민', def: 'a', inline: false }, { term: '도파민 가설', def: 'b' },
  { term: '낙인', def: 'c', inline: false }, { term: '자기낙인', def: 'd' },
  { term: '위약', def: 'e', inline: false }, { term: '위약 반응', def: 'f' },
  { term: 'D2 수용체', def: 'g', inline: true }, { term: '환청', def: 'h' }
];

test('inline:false 용어는 본문 밑줄에서 빠진다', function () {
  const m = G.matcher(common);
  eq(G.split('도파민이 많아요', m, new Set()), [{ text: '도파민이 많아요' }]);
  eq(G.split('낙인과 환청', m, new Set()), [{ text: '낙인과 ' }, { term: '환청' }]);
});

test('inline:false 용어를 품은 더 긴 용어는 그대로 잡힌다', function () {
  const m = G.matcher(common);
  eq(G.split('도파민 가설과 도파민', m, new Set()), [{ term: '도파민 가설' }, { text: '과 도파민' }]);
  eq(G.split('자기낙인은 낙인에서', m, new Set()), [{ term: '자기낙인' }, { text: '은 낙인에서' }]);
  eq(G.split('위약 반응과 위약', m, new Set()), [{ term: '위약 반응' }, { text: '과 위약' }]);
});

test('inline 이 없거나 true 이면 전처럼 잡힌다', function () {
  const m = G.matcher(common);
  eq(G.split('D2 수용체와 환청', m, new Set()), [{ term: 'D2 수용체' }, { text: '와 ' }, { term: '환청' }]);
});

test('흔한 말이 밑줄 한도를 먼저 차지하지 않는다', function () {
  const m = G.matcher(common);
  const used = new Set();
  const segs = G.split('도파민 낙인 위약 D2 수용체 환청', m, used, 2);
  eq(segs.filter(function (s) { return s.term; }), [{ term: 'D2 수용체' }, { term: '환청' }]);
});

/* standalone: true = 앞에 다른 한글이 붙으면 잡지 않는 짧은 용어(통합실조증 속 조증 같은 경우) */
const solo = [
  { term: '조증', def: 'a', standalone: true }, { term: '환청', def: 'b' }, { term: '경조증', def: 'c' }
];

test('standalone 용어는 앞에 한글이 붙으면 잡지 않는다', function () {
  const m = G.matcher(solo);
  eq(G.split('統合失調症(통합실조증)으로 바꿨어요', m, new Set()), [{ text: '統合失調症(통합실조증)으로 바꿨어요' }]);
  eq(G.split('통합실조증과 환청', m, new Set()), [{ text: '통합실조증과 ' }, { term: '환청' }]);
});

test('standalone 용어도 띄어 쓰거나 문장 앞·문장부호 뒤에서는 잡힌다', function () {
  const m = G.matcher(solo);
  eq(G.split('조증이 오면', m, new Set()), [{ term: '조증' }, { text: '이 오면' }]);
  eq(G.split('우울·조증 시기', m, new Set()), [{ text: '우울·' }, { term: '조증' }, { text: ' 시기' }]);
  eq(G.split('기분(조증)', m, new Set()), [{ text: '기분(' }, { term: '조증' }, { text: ')' }]);
});

test('standalone 용어를 품은 더 긴 용어는 그대로 잡힌다', function () {
  const m = G.matcher(solo);
  eq(G.split('경조증과 조증', m, new Set()), [{ term: '경조증' }, { text: '과 ' }, { term: '조증' }]);
});

test('standalone 이 없는 용어는 앞에 한글이 붙어도 전처럼 잡힌다', function () {
  const m = G.matcher(solo);
  eq(G.split('목소리환청', m, new Set()), [{ text: '목소리' }, { term: '환청' }]);
});

test('inline:false 만 있으면 matcher 는 null', function () {
  eq(G.matcher([{ term: '도파민', def: 'a', inline: false }]), null);
});

/* 실제 data/glossary.js 검사 */
const fs = require('fs');
const path = require('path');
function loadData(file) {
  const JHB = {};
  new Function('window', 'JHB', fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8'))({ JHB: JHB }, JHB);
  return JHB;
}
const glossary = loadData('glossary.js').glossary;
const tocSlugs = new Set(loadData('toc.js').toc.articles.map(function (a) { return a.slug; }));
const byTerm = {}; glossary.forEach(function (g) { byTerm[g.term] = g; });

test('용어 사전: inline 값은 없거나 false 뿐', function () {
  glossary.forEach(function (g) {
    ok(!('inline' in g) || g.inline === false, g.term + ' 의 inline 값이 ' + JSON.stringify(g.inline));
  });
});

test('용어 사전: 흔한 말(도파민·위약·낙인)은 inline:false', function () {
  ['도파민', '위약', '낙인'].forEach(function (t) {
    ok(byTerm[t], t + ' 항목이 없음');
    eq(byTerm[t].inline, false, t);
  });
});

test('용어 사전: inline:false 는 소수의 흔한 말에만(10개 이하)', function () {
  const off = glossary.filter(function (g) { return g.inline === false; });
  ok(off.length >= 3 && off.length <= 10, 'inline:false ' + off.length + '개');
});

test('용어 사전: 전문 용어는 본문 밑줄 대상', function () {
  ['D2 수용체', '프로락틴', '보호의무자', '본인부담상한제', '다음증', '자기낙인', '위약 반응', '도파민 가설'].forEach(function (t) {
    ok(byTerm[t], t + ' 항목이 없음');
    ok(byTerm[t].inline !== false, t + ' 가 inline:false');
  });
});

test('용어 사전: term 중복 없음, def 160자 이하, related 1~3개이고 toc 에 있음', function () {
  const seen = {};
  glossary.forEach(function (g) {
    ok(!seen[g.term], '중복 ' + g.term); seen[g.term] = 1;
    ok(g.def && g.def.length <= 160, g.term + ' def ' + (g.def || '').length + '자');
    ok(Array.isArray(g.related) && g.related.length >= 1 && g.related.length <= 3, g.term + ' related ' + (g.related || []).length + '개');
    g.related.forEach(function (s) { ok(tocSlugs.has(s), g.term + ' → 없는 글 ' + s); });
  });
});

test('용어 사전: 기존 term 글자 유지(본문 밑줄 모듈이 term 으로 찾음)', function () {
  ['양성 증상', '신경이완제 악성 증후군', 'QT 연장', '위약 반응', '도파민 가설', '고프로락틴혈증', '산정특례', '한국 조기 정신증 코호트 연구(KEPS)'].forEach(function (t) {
    ok(byTerm[t], t + ' 항목이 사라짐');
  });
  ok(glossary.length >= 250, '용어 수 ' + glossary.length);
});

test('용어 사전: standalone 값은 없거나 true 뿐, 조증은 standalone', function () {
  glossary.forEach(function (g) {
    ok(!('standalone' in g) || g.standalone === true, g.term + ' 의 standalone 값이 ' + JSON.stringify(g.standalone));
  });
  ok(byTerm['조증'], '조증 항목이 없음');
  eq(byTerm['조증'].standalone, true, '조증');
  ok(byTerm['조증'].inline !== false, '조증 이 inline:false');
});

test('실제 사전으로: 통합실조증 속 조증에는 밑줄이 없다', function () {
  const m = G.matcher(glossary);
  const used = new Set();
  const segs = G.split('일본정신신경학회는 옛 병명을 "統合失調症(통합실조증)"으로 바꿨어요', m, used);
  ok(!used.has('조증'), '통합실조증 속 조증에 밑줄');
  eq(segs.filter(function (s) { return s.term === '조증'; }).length, 0);
  ok(G.split('양극성 장애의 조증', m, new Set()).some(function (s) { return s.term === '조증'; }), '띄어 쓴 조증은 잡혀야 함');
});

test('실제 사전으로: 흔한 말은 빼고 전문 용어에 밑줄', function () {
  const m = G.matcher(glossary);
  const segs = G.split('도파민 D2 수용체를 막는 약과 위약을 견줬고, 낙인 대신 프로락틴을 봤어요', m, new Set());
  eq(segs.filter(function (s) { return s.term; }).map(function (s) { return s.term; }), ['D2 수용체', '프로락틴']);
});
