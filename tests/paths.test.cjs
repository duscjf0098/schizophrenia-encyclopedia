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
