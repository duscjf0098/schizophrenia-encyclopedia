/* js/search.js 테스트 */
const S = require('../js/search.js');

const docs = [
  { id: 'auditory', title: '환청', section: '2', tags: ['양성', '환각'], summary: '들리지 않아야 할 소리가 들리는 경험', body: '환청은 가장 흔한 환각이에요. 목소리가 명령하거나 평가하기도 해요.' },
  { id: 'delusion', title: '망상', section: '2', tags: ['양성'], summary: '굳은 잘못된 믿음', body: '피해망상이 가장 흔해요. 환청과 함께 나타나기도 해요.' },
  { id: 'avolition', title: '무의욕', section: '3', tags: ['음성'], summary: '시작하고 이어가는 힘이 줄어드는 것', body: '음성 증상 중 하나예요.' }
];

test('제목 일치가 본문 일치보다 앞선다', function () {
  const idx = S.build(docs);
  const r = S.query(idx, '환청');
  eq(r.map(function (x) { return x.id; }), ['auditory', 'delusion']);
});

test('대소문자·공백 무시, 여러 단어는 모두 포함한 글이 앞선다', function () {
  const idx = S.build(docs);
  const r = S.query(idx, ' 환청  피해 ');
  eq(r[0].id, 'delusion');
});

test('없는 말은 빈 배열, 빈 질의도 빈 배열', function () {
  const idx = S.build(docs);
  eq(S.query(idx, '토성'), []);
  eq(S.query(idx, '  '), []);
});

test('섹션 필터', function () {
  const idx = S.build(docs);
  eq(S.query(idx, '증상', { section: '3' }).map(function (x) { return x.id; }), ['avolition']);
});

test('스니펫은 일치 부분 주변을 자르고 <mark>로 감싼다', function () {
  const idx = S.build(docs);
  const r = S.query(idx, '명령');
  has(r[0].snippet, '<mark>명령</mark>');
  ok(r[0].snippet.length < 120);
});

test('스니펫도 HTML 이스케이프', function () {
  const idx = S.build([{ id: 'x', title: 't', section: '1', tags: [], summary: '', body: '<b>태그</b> 검색어' }]);
  const r = S.query(idx, '검색어');
  not(r[0].snippet, '<b>');
  has(r[0].snippet, '&lt;b&gt;');
});
