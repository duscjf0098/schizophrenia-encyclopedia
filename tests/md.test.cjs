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
  has(r.html, '<div class="tbl"><table><thead><tr><th>약</th><th>특징</th></tr></thead><tbody><tr><td>리스페리돈</td><td>흔함</td></tr></tbody></table></div>');
});

test('콜아웃 ::: 종류 제목', function () {
  const r = md.render('::: crisis 지금 위험하다면\n109로 전화하세요.\n:::\n\n::: research\n2024년 연구\n:::');
  /* 0A: 이름 없는 <aside> 랜드마크 대신 div role=note(클래스는 그대로) */
  has(r.html, '<div class="callout callout-crisis" role="note" aria-label="지금 위험하다면"><div class="callout-title">지금 위험하다면</div><p>109로 전화하세요.</p></div>');
  has(r.html, '<div class="callout callout-research" role="note" aria-label="최신 연구"><div class="callout-title">최신 연구</div><p>2024년 연구</p></div>');
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

/* ---------- 0A 추가 ---------- */
test('콜아웃은 aside 가 아니라 role=note 인 div(제목이 이름)', function () {
  const r = md.render('::: warn\n조심\n:::\n\n::: tip **굵은** 제목\n내용\n:::');
  not(r.html, '<aside');
  has(r.html, '<div class="callout callout-warn" role="note" aria-label="주의">');
  has(r.html, '<div class="callout callout-tip" role="note" aria-label="굵은 제목">');
});

test('전화번호 링크: 굵게 싼 상담 번호와 1577-0199 꼴', function () {
  has(md.render('**109**에 전화하세요').html, '<strong><a href="tel:109">109</a></strong>에 전화하세요');
  has(md.render('당장 위험하면 **119**').html, '<strong><a href="tel:119">119</a></strong>');
  has(md.render('**1577-0199**는 24시간').html, '<strong><a href="tel:1577-0199">1577-0199</a></strong>는');
  has(md.render('정신건강위기상담 1577-0199 로').html, '<a href="tel:1577-0199">1577-0199</a> 로');
});

test('전화번호 링크: 다른 숫자·이미 링크·코드는 건드리지 않음', function () {
  not(md.render('109명이 참여했어요').html, 'tel:');
  not(md.render('제119조에 따라').html, 'tel:');
  not(md.render('1190명 가운데').html, 'tel:');
  not(md.render('1990-2017년 자료, j.1600-0447.1996, **119**조, **2024**').html, 'tel:');
  const linked = md.render('[109에 걸기](tel:109) [상담 1577-0199](https://example.org/1577-0199) `1577-0199`').html;
  eq((linked.match(/tel:/g) || []).length, 1, '원래 있던 링크 하나만');
  not(linked, '<a href="tel:1577-0199">');
});

test('고정 안내: 핵심 3가지 상자와 위기 줄, 공용 고지', function () {
  const k = md.keypointsHtml(['하나', '둘 **굵게**', '셋'], true);
  has(k, '<section class="keypoints"><h2 class="keypoints-h">핵심 3가지</h2>');
  has(k, '<li>둘 <strong>굵게</strong></li>');
  has(k, '<p class="keypoints-crisis">지금 힘들면 <a href="tel:109">109</a> · <a href="tel:1577-0199">1577-0199</a></p>');
  has(md.keypointsHtml(['하나', '둘'], false), '핵심 정리');
  not(md.keypointsHtml(['하나', '둘'], false), 'keypoints-crisis');
  eq(md.keypointsHtml([], true), '');
  has(md.noticeHtml('crisis'), 'href="tel:1577-0199"');
  has(md.noticeHtml('dated', '2026-11-13'), '2026년 11월 13일에 확인한 내용이에요');
  eq(md.noticeHtml('dated'), '');
  eq(md.noticeHtml('nope'), '');
  has(md.emergencyHtml(), '<div class="emergency" role="note"><strong>몸의 응급 신호가 보이면</strong> <a href="tel:119">119</a>');
});

test('parse(): points 목록은 배열로 읽힌다', function () {
  const r = md.parse('---\ntitle: x\npoints:\n  - 첫째\n  - 둘째\n  - 셋째\n---\n본문');
  eq(r.meta.points, ['첫째', '둘째', '셋째']);
  eq(md.pointList(r.meta.points).length, 3);
  eq(md.pointList('한 줄'), ['한 줄']);
});

test('전화번호 링크: ISSN·ISBN 뒤 번호와 연도 범위는 건너뛰고 실제 번호는 그대로 잇는다', function () {
  not(md.render('ISSN 1577-0199 학술지').html, 'tel:');
  not(md.render('eISSN: 1588-9191').html, 'tel:');
  not(md.render('ISBN 1600-1234 책').html, 'tel:');
  not(md.render('1650-1750 사이에 쓰인 기록').html, 'tel:');
  not(md.render('(1820-1899)').html, 'tel:');
  has(md.render('생명의전화 1588-9191').html, '<a href="tel:1588-9191">1588-9191</a>');
  has(md.render('상담 **1588-1519**예요').html, '<a href="tel:1588-1519">1588-1519</a>');
  has(md.render('**1577-0199**(정신건강위기상담), ISSN 1234-5678').html, '<a href="tel:1577-0199">1577-0199</a>');
});

test('문서 머리 한 줄: 정적 p.doc-meta-s 와 앱 .doc-meta-m 이 같은 글자', function () {
  eq(md.docMetaText(3, '2026-10-25'), { minutes: '약 3분', updated: '2026.10.25 고침' });
  eq(md.docMetaText('4', ''), { minutes: '약 4분', updated: '' });
  eq(md.docMetaHtml({ evidence: '연구', ev: { label: '연구', desc: '설명 "따옴표"' }, minutes: 3, updated: '2026-10-25' }),
    '<p class="doc-meta-s"><span class="ev ev-연구" title="설명 &quot;따옴표&quot;">연구</span><span>약 3분</span><span>2026.10.25 고침</span></p>');
  eq(md.docMetaHtml({ minutes: 2 }), '<p class="doc-meta-s"><span>약 2분</span></p>');
});
