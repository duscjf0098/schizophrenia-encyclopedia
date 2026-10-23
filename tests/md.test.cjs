/* js/md.js 렌더러 테스트 */
const md = require('../js/md.js');

test('frontmatter: 스칼라·목록·태그를 읽는다', function () {
  const src = '---\ntitle: 환청\nsection: 2\ntags: 양성, 환각\nevidence: 가이드라인\nsources:\n  - NIMH | Schizophrenia | 2024 | https://example.org/a\n  - 국립정신건강센터 | 조현병 안내 | 2023 | https://example.org/b\n---\n본문';
  const r = md.parse(src);
  eq(r.meta.title, '환청');
  eq(r.meta.section, '2');
  eq(r.meta.tags, ['양성', '환각']);
  eq(r.meta.sources.length, 2);
  eq(r.meta.sources[1], { org: '국립정신건강센터', title: '조현병 안내', year: '2023', url: 'https://example.org/b' });
  eq(r.body, '본문');
});

test('frontmatter 없으면 meta는 빈 객체, body는 전체', function () {
  const r = md.parse('# 제목\n글');
  eq(r.meta, {});
  eq(r.body, '# 제목\n글');
});

test('제목은 id와 목차를 만든다', function () {
  const r = md.render('# 큰 제목\n\n## 둘째\n\n### 셋째\n\n글');
  has(r.html, '<h1 id="h-1">큰 제목</h1>');
  has(r.html, '<h2 id="h-2">둘째</h2>');
  has(r.html, '<h3 id="h-3">셋째</h3>');
  eq(r.toc, [{ id: 'h-2', text: '둘째', level: 2 }, { id: 'h-3', text: '셋째', level: 3 }]);
});

test('문단과 인라인 서식', function () {
  const r = md.render('이건 **굵게** 그리고 *기울임* 그리고 `코드`.\n\n둘째 문단');
  has(r.html, '<p>이건 <strong>굵게</strong> 그리고 <em>기울임</em> 그리고 <code>코드</code>.</p>');
  has(r.html, '<p>둘째 문단</p>');
});

test('HTML은 이스케이프된다', function () {
  const r = md.render('<script>alert(1)</script> & "따옴표"');
  not(r.html, '<script>');
  has(r.html, '&lt;script&gt;');
  has(r.html, '&amp;');
});

test('링크: 외부는 새 창, 내부(#/)는 그대로', function () {
  const r = md.render('[NIMH](https://nimh.nih.gov) [환청](#/a/auditory)');
  has(r.html, '<a href="https://nimh.nih.gov" target="_blank" rel="noopener">NIMH</a>');
  has(r.html, '<a href="#/a/auditory">환청</a>');
});

test('위험한 링크 스킴은 막는다', function () {
  const r = md.render('[x](javascript:alert(1))');
  not(r.html, 'javascript:');
});

test('목록: 순서 없음·있음·중첩 없이', function () {
  const r = md.render('- 하나\n- 둘\n\n1. 첫째\n2. 둘째');
  has(r.html, '<ul><li>하나</li><li>둘</li></ul>');
  has(r.html, '<ol><li>첫째</li><li>둘째</li></ol>');
});

test('인용·구분선', function () {
  const r = md.render('> 인용문\n> 둘째 줄\n\n---\n\n끝');
  has(r.html, '<blockquote><p>인용문 둘째 줄</p></blockquote>');
  has(r.html, '<hr>');
});

test('표', function () {
  const r = md.render('| 약 | 특징 |\n|---|---|\n| 리스페리돈 | 흔함 |');
  has(r.html, '<table><thead><tr><th>약</th><th>특징</th></tr></thead><tbody><tr><td>리스페리돈</td><td>흔함</td></tr></tbody></table>');
});

test('콜아웃 ::: 종류 제목', function () {
  const r = md.render('::: crisis 지금 위험하다면\n109로 전화하세요.\n:::\n\n::: research\n2024년 연구\n:::');
  has(r.html, '<aside class="callout callout-crisis"><div class="callout-title">지금 위험하다면</div><p>109로 전화하세요.</p></aside>');
  has(r.html, '<aside class="callout callout-research"><div class="callout-title">최신 연구</div><p>2024년 연구</p></aside>');
});

test('각주 [^n]은 출처 링크가 된다', function () {
  const r = md.render('도파민 가설[^1]은 오래됐다[^12].');
  has(r.html, '<sup class="fn"><a href="#src-1">1</a></sup>');
  has(r.html, '<sup class="fn"><a href="#src-12">12</a></sup>');
});

test('plain(): 검색용 평문', function () {
  const t = md.plain('# 제목\n\n**굵게** [링크](https://x.y) 글[^1]\n\n- 항목\n\n::: tip 팁\n내용\n:::');
  eq(t, '제목 굵게 링크 글 항목 팁 내용');
});

test('readingMinutes(): 한글 기준 분 단위', function () {
  eq(md.readingMinutes('가'.repeat(500)), 1);
  eq(md.readingMinutes('가'.repeat(1500)), 3);
});
