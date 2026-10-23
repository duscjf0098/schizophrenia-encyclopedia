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
