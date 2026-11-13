/* js/paths.js 테스트: 옛 해시 주소 → 실제 경로 주소 */
const P = require('../js/paths.js');

test('문서·분류·기타 경로', function () {
  eq(P.hashToPath('#/a/auditory-hallucination'), 'a/auditory-hallucination/');
  eq(P.hashToPath('#/s/2'), 's/2/');
  eq(P.hashToPath('#/glossary'), 'glossary/');
  eq(P.hashToPath('#/fav'), 'fav/');
  eq(P.hashToPath('#/about'), 'about/');
  eq(P.hashToPath('#/random'), 'random/');
});

test('첫 화면은 빈 경로', function () {
  eq(P.hashToPath('#/'), '');
  eq(P.hashToPath('#'), null);
});

test('검색어·용어 같은 쿼리는 유지', function () {
  eq(P.hashToPath('#/search?q=%ED%99%98%EC%B2%AD&s=2'), 'search/?q=%ED%99%98%EC%B2%AD&s=2');
  eq(P.hashToPath('#/glossary?t=PANSS'), 'glossary/?t=PANSS');
});

test('경로 주소가 아닌 해시(소제목·출처)는 null', function () {
  eq(P.hashToPath('#h-3'), null);
  eq(P.hashToPath('#src-1'), null);
  eq(P.hashToPath('https://example.org/#/a/x'), null);
});

test('깊이에 맞는 상대 경로 기준', function () {
  eq(P.baseFor(''), '');
  eq(P.baseFor('glossary'), '../');
  eq(P.baseFor('a/clozapine'), '../../');
  eq(P.baseFor('a/clozapine/'), '../../');
});

test('기준 경로를 붙인 링크', function () {
  eq(P.link('#/a/x', '../../'), '../../a/x/');
  eq(P.link('#/', '../../'), '../../');
  eq(P.link('#/', ''), './');
  eq(P.link('#/s/3', ''), 's/3/');
  eq(P.link('#h-2', '../../'), '#h-2');
});

test('HTML 안의 해시 링크를 한꺼번에 바꾼다', function () {
  const html = '<a href="#/a/x">x</a> <a href="#src-1">1</a> <a href="https://e.org">e</a>';
  eq(P.rewriteHtml(html, '../../'), '<a href="../../a/x/">x</a> <a href="#src-1">1</a> <a href="https://e.org">e</a>');
});

/* ---------- 0B: 주소 쿼리 해석(app.js where() 가 씀). 잘못된 % 에도 던지지 않는다(T8) ---------- */
test('parseQuery: 기본·한글·+ 공백·빈 값', function () {
  eq(P.parseQuery(''), {});
  eq(P.parseQuery('?'), {});
  eq(P.parseQuery(null), {});
  eq(P.parseQuery('?course=family-first'), { course: 'family-first' });
  eq(P.parseQuery('?q=%ED%99%98%EC%B2%AD&s=2'), { q: '환청', s: '2' });
  eq(P.parseQuery('?q=환청'), { q: '환청' });
  eq(P.parseQuery('?q=%ED%99%98%EC%B2%AD+%EB%AA%A9%EC%86%8C%EB%A6%AC'), { q: '환청 목소리' });
  eq(P.parseQuery('?q=a%2Bb'), { q: 'a+b' });
  eq(P.parseQuery('?a=&b&&c=1'), { a: '', b: '', c: '1' });
  eq(P.parseQuery('?x=1=2'), { x: '1=2' });
  eq(P.parseQuery('?q=1&q=2'), { q: '2' });
});

test('parseQuery: 잘못된 % 인코딩은 던지지 않고 그 부분만 글자 그대로', function () {
  eq(P.parseQuery('?course=%'), { course: '%' });
  eq(P.parseQuery('?t=%ZZ'), { t: '%ZZ' });
  eq(P.parseQuery('?q=%E0%A4'), { q: '%E0%A4' });
  eq(P.parseQuery('?q=%E0%A4%ED%99%98'), { q: '%E0%A4환' });
  eq(P.parseQuery('?q=%ED%99%98%ZZ%EC%B2%AD'), { q: '환%ZZ청' });
  eq(P.parseQuery('?q=100%'), { q: '100%' });
  eq(P.parseQuery('?%=1'), { '%': '1' });
});

test('parseQuery: 원형(prototype)을 건드리는 이름은 버린다', function () {
  const r = P.parseQuery('?__proto__=x&constructor=y&ok=1');
  eq(r, { ok: '1' });
  eq(Object.getPrototypeOf(r), Object.prototype);
});

test('찾기 주소는 쿼리 없는 search/', function () {
  eq(P.link('#/search', '../../'), '../../search/');
  eq(P.link('#/course/family-first', ''), 'course/family-first/');
});

test('parseQuery strict: % 인코딩이 깨진 값은 빈 글자(검색어로 깨진 원문을 넣지 않게)', function () {
  eq(P.parseQuery('?q=%E0%A4', { strict: true }), { q: '' });
  eq(P.parseQuery('?q=%E0%A4&s=2', { strict: true }), { q: '', s: '2' });
  eq(P.parseQuery('?q=100%', { strict: true }), { q: '' });
  eq(P.parseQuery('?q=%ED%99%98%EC%B2%AD+%EB%AA%A9%EC%86%8C%EB%A6%AC', { strict: true }), { q: '환청 목소리' });
  eq(P.parseQuery('?q=환청&s=', { strict: true }), { q: '환청', s: '' });
  /* strict 가 아니면 예전처럼 풀 수 있는 만큼 */
  eq(P.parseQuery('?q=%E0%A4'), { q: '%E0%A4' });
});
