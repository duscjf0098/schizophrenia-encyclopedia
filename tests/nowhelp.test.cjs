/* js/ui/nowhelp.js · js/ui/mobile.js 의 순수 함수 테스트
   - 지금 도움 시트: data/crisis-card.js 를 유일한 원천으로 전화·글 링크를 고른다(번호를 모듈에 다시 적지 않음)
   - "전화가 어렵다면" 링크: 글 crisis-hotlines 의 해당 소절 id 를 차례에서 찾는다
   - 링크 가로채기: 가운데·Ctrl·Shift·Alt·Meta 클릭은 원래 링크대로
   - 휴대폰 하단 바(문서 밖 화면): 찾기 · 분류 · (길잡이) · 내 서재 또는 저장한 문서 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const NH = require(path.join(ROOT, 'js', 'ui', 'nowhelp.js'));
const MB = require(path.join(ROOT, 'js', 'ui', 'mobile.js'));
const md = require(path.join(ROOT, 'js', 'md.js'));

function loadCard() {
  const src = fs.readFileSync(path.join(ROOT, 'data', 'crisis-card.js'), 'utf8');
  const sandbox = {}; sandbox.window = sandbox; /* 브라우저처럼 window.JHB 가 전역 JHB */
  require('vm').runInNewContext(src, sandbox);
  return sandbox.window.JHB.crisisCard;
}
function loadToc() {
  const src = fs.readFileSync(path.join(ROOT, 'data', 'toc.js'), 'utf8');
  const JHB = {};
  new Function('window', 'JHB', src)({ JHB: JHB }, JHB);
  return JHB.toc;
}
const card = loadCard();
const toc = loadToc();
const slugs = new Set(toc.articles.map(function (a) { return a.slug; }));
const exists = function (s) { return slugs.has(s); };

test('parseTel: "109 자살예방상담 (24시간)" → 번호·이름·덧말', function () {
  eq(NH.parseTel({ label: '109 자살예방상담 (24시간)', href: 'tel:109' }), { num: '109', name: '자살예방상담', note: '24시간', href: 'tel:109' });
  eq(NH.parseTel({ label: '1577-0199 정신건강위기상담 (24시간)', href: 'tel:1577-0199' }), { num: '1577-0199', name: '정신건강위기상담', note: '24시간', href: 'tel:1577-0199' });
  eq(NH.parseTel({ label: '119 구급 (생명이 위급할 때)', href: 'tel:119' }).note, '생명이 위급할 때');
});

test('parseTel: 전화가 아닌 항목·빈 값은 null', function () {
  eq(NH.parseTel({ label: '위기 상담 전화와 기관', href: '#/a/crisis-hotlines' }), null);
  eq(NH.parseTel(null), null);
  eq(NH.parseTel({ label: '', href: 'tel:' }), null);
});

test('parseTel: 덧말이 없어도, 라벨에 번호가 없어도 번호는 href 에서', function () {
  eq(NH.parseTel({ label: '자살예방상담', href: 'tel:109' }), { num: '109', name: '자살예방상담', note: '', href: 'tel:109' });
  eq(NH.parseTel({ label: '109', href: 'tel:109' }), { num: '109', name: '', note: '', href: 'tel:109' });
});

test('pickSheet(실제 crisis-card): 전화는 109 · 1577-0199 · 119 순서', function () {
  const s = NH.pickSheet(card, exists);
  eq(s.tels.map(function (t) { return t.num; }), ['109', '1577-0199', '119']);
  s.tels.forEach(function (t) { eq(t.href, 'tel:' + t.num); ok(t.name, t.num + ' 이름 비어 있음'); });
});

test('pickSheet(실제 crisis-card): 글 링크는 위기 상담 전화와 기관 → 자살 위험 신호와 대처 → 응급 상황 대처', function () {
  const s = NH.pickSheet(card, exists);
  eq(s.links.map(function (l) { return l.slug; }), ['crisis-hotlines', 'suicide-warning-signs', 'emergency-response']);
  eq(s.links.map(function (l) { return l.label; }), ['위기 상담 전화와 기관', '자살 위험 신호와 대처', '응급 상황 대처']);
  s.links.forEach(function (l) { eq(l.href, '#/a/' + l.slug); });
});

test('pickSheet: 글 링크에 전화(tel:)가 섞이지 않고, 없는 글은 빠진다', function () {
  const s = NH.pickSheet(card, function (x) { return x !== 'suicide-warning-signs'; });
  eq(s.links.map(function (l) { return l.slug; }), ['crisis-hotlines', 'emergency-response']);
  s.links.forEach(function (l) { not(l.href, 'tel:'); });
});

test('pickSheet: 같은 번호는 한 번만, 카드가 없으면 빈 목록', function () {
  const dup = { high: { actions: [{ label: '109 가', href: 'tel:109' }, { label: '109 나', href: 'tel:109' }] }, watch: { actions: [{ label: '119 다', href: 'tel:119' }] } };
  eq(NH.pickSheet(dup, exists).tels.map(function (t) { return t.num; }), ['109']);
  eq(NH.pickSheet(null, exists), { tels: [], links: [] });
  eq(NH.pickSheet({}, exists), { tels: [], links: [] });
});

test('pickSheet: high 카드에 전화가 없으면 다른 카드의 전화를 쓴다', function () {
  const c = { high: { actions: [] }, harm: { actions: [{ label: '112 경찰', href: 'tel:112' }] } };
  eq(NH.pickSheet(c, exists).tels.map(function (t) { return t.num; }), ['112']);
});

test('pickSheet: 같은 입력이면 같은 결과(결정적), 카드를 바꾸지 않음', function () {
  const before = JSON.stringify(card);
  eq(JSON.stringify(NH.pickSheet(card, exists)), JSON.stringify(NH.pickSheet(card, exists)));
  eq(JSON.stringify(card), before);
});

/* 콘텐츠 계약 검사: 지금 도움 시트의 "전화가 어렵다면" 링크는 글 crisis-hotlines 의 h2 소절 가운데
   제목에 "전화가 어렵 · 전화 말고 · 글로 · 문자 · 채팅 · SNS" 중 하나가 든 첫 소절로 간다(nowhelp.js 의 ALT_RE).
   이 테스트가 실패하면 대개 M1 코드가 아니라 글의 소제목이 바뀐 거예요. 소제목에 위 말 하나를 다시 넣거나
   ALT_RE 를 함께 고쳐요. 그대로 두면 시트 링크가 소리 없이 글 첫머리로 가요. */
const ALT_CONTRACT = '[콘텐츠 계약] content/11-system/crisis-hotlines.md 에 "전화가 어렵 · 전화 말고 · 글로 · 문자 · 채팅 · SNS" 가 든 h2 소제목이 있어야 해요(지금 도움 시트의 "전화가 어렵다면" 링크가 그 소절로 가요)';
test('findAltSection(콘텐츠 계약): 실제 글 crisis-hotlines 에 "전화가 어렵다면" 링크가 갈 h2 소절이 있다', function () {
  const file = path.join(ROOT, 'content', '11-system', 'crisis-hotlines.md');
  const doc = md.parse(fs.readFileSync(file, 'utf8'));
  const r = md.render(doc.body);
  const id = NH.findAltSection(r.toc);
  ok(/^h-\d+$/.test(String(id)), ALT_CONTRACT + '. 찾은 id: ' + id + ', h2 제목들: ' + r.toc.filter(function (t) { return t.level === 2; }).map(function (t) { return t.text; }).join(' / '));
  const h = r.toc.filter(function (t) { return t.id === id; })[0];
  ok(h && h.level === 2, ALT_CONTRACT + ' (h2 소절이어야 해요)');
  ok(/글|문자|채팅|SNS|전화가 어렵|전화 말고/.test(h.text), ALT_CONTRACT + '. 소절 제목: ' + (h && h.text));
});

test('findAltSection: "전화할 때 무엇을 말하나" 같은 소절은 고르지 않음, 없으면 null', function () {
  eq(NH.findAltSection([{ id: 'h-1', text: '번호 한눈에', level: 2 }, { id: 'h-2', text: '전화할 때 무엇을 말하나', level: 2 }]), null);
  eq(NH.findAltSection([{ id: 'h-4', text: '전화가 어렵다면', level: 2 }]), 'h-4');
  eq(NH.findAltSection([{ id: 'h-5', text: '문자로 상담하기', level: 3 }]), null);
  eq(NH.findAltSection(null), null);
});

test('isPlainClick: 왼쪽 클릭·키보드 Enter 만 시트로, 가운데·보조키 클릭은 원래 링크', function () {
  ok(NH.isPlainClick({ button: 0 }));
  ok(NH.isPlainClick({ button: 0, detail: 0 }), 'Enter 로 생긴 click');
  ok(!NH.isPlainClick({ button: 1 }), '가운데');
  ok(!NH.isPlainClick({ button: 0, ctrlKey: true }), 'Ctrl');
  ok(!NH.isPlainClick({ button: 0, metaKey: true }), 'Meta');
  ok(!NH.isPlainClick({ button: 0, shiftKey: true }), 'Shift');
  ok(!NH.isPlainClick({ button: 0, altKey: true }), 'Alt');
  ok(!NH.isPlainClick({ button: 0, defaultPrevented: true }), '이미 처리됨');
  ok(!NH.isPlainClick(null));
});

test('linkGuard: 시트를 연 직후의 포인터 누름(두 번 누름)은 막는다', function () {
  /* 첫 화면 입구를 급히 두 번 누르면 두 번째 누름이 109 줄에 떨어지는 문제 */
  ok(NH.linkGuard({ detail: 1 }, { armed: true, sinceOpen: 120 }), '연 지 120ms');
  ok(NH.linkGuard({ detail: 2 }, { armed: true, sinceOpen: 300 }), '더블클릭의 두 번째');
  ok(NH.linkGuard({ detail: 1 }, { armed: false, sinceOpen: 5000 }), '시트 안에서 시작하지 않은 누름');
  ok(NH.linkGuard({ detail: 1 }, { armed: true, sinceOpen: NH.GUARD_MS - 1 }), '경계 바로 전');
});

test('linkGuard: 시트 안에서 시작한 누름(충분히 뒤)과 키보드 Enter 는 그대로', function () {
  ok(!NH.linkGuard({ detail: 1 }, { armed: true, sinceOpen: NH.GUARD_MS }), '경계');
  ok(!NH.linkGuard({ detail: 1 }, { armed: true, sinceOpen: 2000 }), '보통 누름');
  ok(!NH.linkGuard({ detail: 0 }, { armed: false, sinceOpen: 10 }), 'Enter 로 생긴 click 은 detail 0');
  ok(!NH.linkGuard(null, { armed: false, sinceOpen: 0 }));
  ok(NH.GUARD_MS >= 400 && NH.GUARD_MS <= 1000, 'GUARD_MS 범위: ' + NH.GUARD_MS);
});

test('closeOnPage: 같은 주소의 첫 그리기(jhb:page)로는 시트를 닫지 않는다', function () {
  /* 느린 연결에서 정적 본문 위에 연 시트가 앱이 글을 다 그리는 순간 닫히던 문제 */
  ok(!NH.closeOnPage({ kind: 'a', id: 'olanzapine' }, '/a/olanzapine/', '/a/olanzapine/'));
  ok(!NH.closeOnPage({ kind: 'a', loading: true }, '/a/x/', '/a/y/'), 'loading 은 늘 무시');
  ok(NH.closeOnPage({ kind: 's', id: '7' }, '/a/olanzapine/', '/s/7/'), '주소가 바뀌면 닫음');
  ok(!NH.closeOnPage(null, '/', '/'));
});

test('sectionHash: 글 소절 해시(#h-N)만 id 로', function () {
  eq(NH.sectionHash('#h-3'), 'h-3');
  eq(NH.sectionHash('#h-12'), 'h-12');
  eq(NH.sectionHash('#/a/x'), null);
  eq(NH.sectionHash('#h-'), null);
  eq(NH.sectionHash('#h-3x'), null);
  eq(NH.sectionHash(''), null);
  eq(NH.sectionHash(null), null);
});

test('generalItems: 특집 화면이 없으면 찾기 · 분류 · 저장한 문서', function () {
  const it = MB.generalItems({}, '');
  eq(it.map(function (x) { return x.id; }), ['search', 'nav', 'fav']);
  eq(it.map(function (x) { return x.label; }), ['찾기', '분류', '저장한 문서']);
  eq(it[2].href, '#/fav');
  eq(it.filter(function (x) { return x.current; }).length, 0);
});

test('generalItems: guide·me 가 등록돼 있으면 찾기 · 분류 · 길잡이 · 내 서재', function () {
  const it = MB.generalItems({ guide: { id: 'guide' }, me: { id: 'me' } }, 'guide');
  eq(it.map(function (x) { return x.id; }), ['search', 'nav', 'guide', 'me']);
  eq(it.map(function (x) { return x.label; }), ['찾기', '분류', '길잡이', '내 서재']);
  eq(it.map(function (x) { return x.href || null; }), [null, null, '#/guide', '#/me']);
  eq(it.map(function (x) { return !!x.current; }), [false, false, true, false]);
});

test('generalItems: me 만 있으면 길잡이 없이 내 서재, 저장한 문서 화면에서는 저장한 문서가 현재', function () {
  eq(MB.generalItems({ me: { id: 'me' } }, 'me').map(function (x) { return x.id + (x.current ? '*' : ''); }), ['search', 'nav', 'me*']);
  eq(MB.generalItems({}, 'fav').map(function (x) { return x.id + (x.current ? '*' : ''); }), ['search', 'nav', 'fav*']);
  eq(MB.generalItems(null, 'search').map(function (x) { return x.id + (x.current ? '*' : ''); }), ['search*', 'nav', 'fav']);
});

test('generalItems: 위기 입구는 하단 바에 넣지 않는다(상단 "지금 도움" 하나)', function () {
  const it = MB.generalItems({ guide: {}, me: {} }, '');
  it.forEach(function (x) { not(String(x.href || ''), 'crisis'); not(x.label, '도움'); });
});
