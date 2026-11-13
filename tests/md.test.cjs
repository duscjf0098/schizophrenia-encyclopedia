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

/* K8: dated = 사람이 원천과 대조해 확인한 날("확인한 내용"), revised = 자료에서 구한 마지막으로 고친 날("마지막으로 고쳤어요") */
test('K8 고지 문구: revised 는 "마지막으로 고쳤어요", dated 문구는 그대로, 날짜가 없으면 빈 글자', function () {
  eq(md.noticeHtml('revised', '2026-11-13'), '<div class="notice notice-revised" role="note">2026년 11월 13일에 마지막으로 고쳤어요. 그 뒤에 바뀌었을 수 있어요.</div>');
  eq(md.noticeHtml('dated', '2026-11-03'), '<div class="notice notice-dated" role="note">2026년 11월 3일에 확인한 내용이에요. 그 뒤에 바뀌었을 수 있어요.</div>');
  not(md.noticeHtml('revised', '2026-11-13'), '확인', '고친 날을 "확인한 날"이라고 하지 않음');
  eq(md.noticeHtml('revised'), '');
  eq(md.noticeHtml('revised', ''), '');
  eq(md.noticeHtml('revised', '어제'), '');
  ok(md.NOTICE_KINDS.indexOf('revised') >= 0 && md.NOTICE_KINDS.indexOf('dated') >= 0, '종류 목록');
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
  eq(md.docMetaText(3, '2026-10-25'), { minutes: '약 3분', updated: '2026.10.25 고침', reviewed: '' });
  eq(md.docMetaText('4', ''), { minutes: '약 4분', updated: '', reviewed: '' });
  eq(md.docMetaHtml({ evidence: '연구', ev: { label: '연구', desc: '설명 "따옴표"' }, minutes: 3, updated: '2026-10-25' }),
    '<p class="doc-meta-s"><span class="ev ev-연구" title="설명 &quot;따옴표&quot;">연구</span><span>약 3분</span><span>2026.10.25 고침</span></p>');
  eq(md.docMetaHtml({ minutes: 2 }), '<p class="doc-meta-s"><span>약 2분</span></p>');
});

/* ---------- K1 코어 정리 ---------- */
test('출처 확인일: reviewed(YYYY-MM-DD)가 있으면 "출처 확인 YYYY.MM.DD"를 덧붙이고, 없거나 틀린 날짜면 지금과 같다', function () {
  eq(md.docMetaText(3, '2026-10-25', '2026-11-12'), { minutes: '약 3분', updated: '2026.10.25 고침', reviewed: '출처 확인 2026.11.12' });
  eq(md.docMetaText(3, '', ' 2026-11-12 ').reviewed, '출처 확인 2026.11.12');
  ['2026-02-30', '2026-13-01', '2026.11.12', '11/12', '', null, undefined, 20261112].forEach(function (v) {
    eq(md.docMetaText(3, '2026-10-25', v).reviewed, '', String(v));
  });
  eq(md.docMetaHtml({ evidence: '연구', ev: { label: '연구' }, minutes: 3, updated: '2026-10-25', reviewed: '2026-11-12' }),
    '<p class="doc-meta-s"><span class="ev ev-연구">연구</span><span>약 3분</span><span>2026.10.25 고침</span><span class="doc-reviewed">출처 확인 2026.11.12</span></p>');
  eq(md.docMetaHtml({ minutes: 2, reviewed: 'x' }), '<p class="doc-meta-s"><span>약 2분</span></p>');
});

test('전화번호 링크: 연도 범위는 문맥(뒤 사이·까지·년대·세기, 앞 년·~, 괄호 속 생몰)으로만 판단', function () {
  /* 범위: 링크 아님 */
  not(md.render('1800-2000 사이에 쓰인 기록').html, 'tel:');
  not(md.render('1650-1750 사이').html, 'tel:');
  not(md.render('1600-1700까지 이어진 전통').html, 'tel:');
  not(md.render('1850-1900 년대 정신의학').html, 'tel:');
  not(md.render('1500-1600 세기').html, 'tel:');
  not(md.render('1900년~1800-1950').html, 'tel:');
  not(md.render('기간 ~1800-1900').html, 'tel:');
  not(md.render('(1820-1899)').html, 'tel:');
  not(md.render('에밀 크레펠린(Emil Kraepelin, 1856-1926)은').html, 'tel:');
  not(md.render('1990-2017년 자료').html, 'tel:');
  /* 실제 대표번호: 링크 */
  has(md.render('대표번호 1588-1600으로 물어보세요').html, '<a href="tel:1588-1600">1588-1600</a>');
  has(md.render('상담 1544-1700').html, '<a href="tel:1544-1700">1544-1700</a>');
  has(md.render('센터(문의 1577-1701, 평일 오전 9시)').html, '<a href="tel:1577-1701">1577-1701</a>');
  has(md.render('콜센터(1577-1800)').html, '<a href="tel:1577-1800">1577-1800</a>', '괄호 속이어도 두 해 차이가 110 이 넘으면 번호');
  has(md.render('**1588-1600** 사이에').html, '<a href="tel:1588-1600">1588-1600</a>', '굵게 싼 번호는 늘 번호');
  /* 범위 문맥이어도 연도 모양이 아니면 번호 */
  has(md.render('1577-0199까지 연락하세요').html, '<a href="tel:1577-0199">1577-0199</a>');
  /* ISSN·DOI 는 그대로 건너뜀 */
  not(md.render('ISSN 1588-1600').html, 'tel:');
  not(md.render('doi:10.1/x.1600-0447').html, 'tel:');
});

test('전화번호 링크: 괄호 속 범위 규칙은 바로 앞에 전화 문맥(전화·상담·문의·번호·콜센터·연락처)이 붙어 있으면 쓰지 않음', function () {
  has(md.render('상담(1588-1600)').html, '<a href="tel:1588-1600">1588-1600</a>');
  has(md.render('대표번호 (1544-1600)').html, '<a href="tel:1544-1600">1544-1600</a>');
  has(md.render('안내 전화(1577-1600)로').html, '<a href="tel:1577-1600">1577-1600</a>');
  has(md.render('(상담 1588-1600)').html, '<a href="tel:1588-1600">1588-1600</a>');
  has(md.render('**상담**(1588-1600)').html, '<a href="tel:1588-1600">1588-1600</a>', '굵게 싼 문맥 낱말도');
  /* 생몰·시기는 그대로 범위 */
  not(md.render('(1820-1899)').html, 'tel:');
  not(md.render('크레펠린(1856-1926)').html, 'tel:');
  not(md.render('에밀 크레펠린(Emil Kraepelin, 1856-1926)은').html, 'tel:');
  not(md.render('상담 기법을 처음 정리한 크레펠린(1856-1926)').html, 'tel:', '문맥 낱말이 멀리(12자 밖) 있으면 보지 않음');
});

test('K3-5 전화번호 링크: 연도 범위 뒤 낱말 경·무렵·동안·년간·에 걸쳐도 범위(조사가 붙어도), 낱말의 일부면 아님', function () {
  ['1800-1900경', '1800-1900 경', '1800-1900경에', '1800-1900경의 기록', '1600-1700 무렵', '1600-1700 무렵부터', '1800-1900 동안', '1800-1900 동안에',
    '1850-1900년간', '1850-1900 년간', '1700-1800에 걸쳐', '1700-1800 에 걸쳐', '(1800-1900 무렵)']
    .forEach(function (s) { not(md.render('정신의학은 ' + s + ' 바뀌었어요').html, 'tel:', s); });
  /* '에' 하나만으로는 범위로 보지 않음(번호 뒤에도 흔히 와서). 낱말의 일부(경기·경찰·동안구·무렵하)는 범위 아님 */
  ['1588-1600에 전화', '1588-1600 경기도 지역', '1588-1600 경찰 민원', '1588-1600 동안구 보건소', '1644-1700 경로당']
    .forEach(function (s) { has(md.render(s).html, 'tel:', s); });
  /* 연도 모양이 아니면(뒤 묶음이 앞보다 작음 등) 낱말이 붙어도 번호 */
  has(md.render('1577-0199 동안 기다려요').html, '<a href="tel:1577-0199">1577-0199</a>');
});

test('K3-5 전화번호 링크: 생몰년 괄호는 앞에 안내·대표·연락 같은 낱말이 있어도 링크가 아님(전화 문맥 낱말이 바로 붙은 경우만 번호)', function () {
  ['크레펠린 연구 안내(1856-1926)', '협회 초대 대표(1856-1926)', '연락이 끊긴 블로일러(1857-1939)', '번역 안내 (Eugen Bleuler, 1857-1939)', '이 번호 체계를 만든 사람(1856-1926)']
    .forEach(function (s) { not(md.render(s).html, 'tel:', s); });
  ['전화(1588-1600)', '상담 전화 (1588-1600)', '문의: (1588-1600)', '연락처(1588-1600)', '콜센터 (1588-1600)', '대표번호(1544-1600)']
    .forEach(function (s) { has(md.render(s).html, 'tel:', s); });
});

test('K3 검수: 센터·조사 붙은 번호 낱말·괄호 속 "(대표 번호)"·근대 이전 연도 꼴 대표(1544-1600)는 다시 번호(생몰년은 그대로 아님)', function () {
  ['상담센터(1588-1600)', '○○상담센터(1588-1600)', '정신건강센터 (1577-1600)', '(대표 1588-1600)', '(안내 1588-1600)', '(연락 1588-1600)', '(대표: 1588-1600)',
    '전화번호는 (1588-1600)', '대표번호는(1588-1600)', '대표(1544-1600)', '안내(1544-1600)', '연락(1544-1600)', '대표 (1588-1600)']
    .forEach(function (s) { has(md.render(s).html, 'tel:', s); });
  /* 생몰년(근대 이후)은 안내·대표·연락이 붙어도 그대로 범위 */
  ['크레펠린 연구 안내(1856-1926)', '협회 초대 대표(1856-1926)', '협회 초대 대표 (1857-1939)', '(1820-1899)', '크레펠린(1856-1926)']
    .forEach(function (s) { not(md.render(s).html, 'tel:', s); });
});

test('전화번호 링크: 굵게 싼 짧은 번호 뒤에 단위(mg·㎎·밀리·점·개월·주·kg·cm·%)가 오면 링크 아님', function () {
  ['**125** mg', '**125**mg', '**120** ㎎', '**120**밀리그램', '**120**점', '**112**개월', '**12**주', '**119**주', '**120** kg', '**120**cm', '**119**%', '**120** g', '**120** mmHg', '**120** kcal', '**112** ml']
    .forEach(function (s) { not(md.render(s + ' 정도').html, 'tel:', s); });
  /* 띄어 쓴 '주'·'점'은 단위로 보지 않음(번호로 둠), 조사·문장 부호도 번호 */
  ['**109** 주 7일 24시간', '**119**에 전화', '**112**(경찰)', '**109**, **119**', '**129**는', '**1388**은', '**119** go'].forEach(function (s) { has(md.render(s).html, 'tel:', s); });
});

test('위기 안내: 문자 109 한 줄이 배너·공용 고지에 같은 글자로 들어가고 번호 세 개는 그대로', function () {
  const line = '전화가 어렵다면 109로 문자를 보낼 수 있어요.';
  [md.crisisHtml(), md.noticeHtml('crisis')].forEach(function (h) {
    has(h, line);
    ['109', '1577-0199', '119'].forEach(function (n) { has(h, '<a href="tel:' + n + '">' + n + '</a>'); });
    eq((h.match(/href="tel:/g) || []).length, 3, '전화 링크는 세 개(문자 안내의 109 는 전화 링크가 아님)');
    not(h, 'sms:');
  });
  has(md.crisisHtml(), '<strong>지금 많이 힘들다면</strong>');
  ok(md.noticeHtml('crisis').indexOf(line) < md.noticeHtml('crisis').indexOf('당장 위험하면'), '119 줄이 맨 끝');
});
