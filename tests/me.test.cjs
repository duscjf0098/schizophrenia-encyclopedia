/* 내 서재(js/pages/me.js, data/pages/me.json) 테스트: 고르기·정렬·지울 범위 같은 순수 함수와 선언·정적 HTML */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const page = require('../js/pages/me.js');
const L = page.lib;
const md = require('../js/md.js');

const BY = { a1: { slug: 'a1', title: '가' }, a2: { slug: 'a2', title: '나' }, a3: { slug: 'a3', title: '다' } };

test('내 서재: 선언은 지시서 값 그대로(me·내 서재·top/side/palette·noindex·general+device·기록)', function () {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/pages/me.json'), 'utf8').replace(/^﻿/, ''));
  eq(d.id, 'me');
  eq(d.title, '내 서재');
  eq(d.nav, ['top', 'side', 'palette']);
  eq(d.robots, 'noindex');
  eq(d.notice, ['general', 'device']);
  eq(d.group, '기록');
  ok(d.crisisLine !== false, '위기 줄은 빼지 않아요');
  ok(String(d.summary).length <= 155, 'summary 155자 이하');
  eq(page.id, 'me');
});

test('내 서재: 역할은 self·family·near·curious 네 가지만, 나머지는 정하지 않음(null)', function () {
  eq(L.ROLES.map(function (r) { return r.v; }), ['self', 'family', 'near', 'curious']);
  ['self', 'family', 'near', 'curious'].forEach(function (r) { eq(L.roleOf(r), r); });
  [null, undefined, '', 'student', 'SELF', 1, {}, '__proto__'].forEach(function (v) { eq(L.roleOf(v), null, JSON.stringify(v)); });
  eq(L.roleLabel('near'), '주변 사람이에요');
  eq(L.roleLabel('x'), '');
});

test('내 서재: 읽은 글은 있는 글만 최근 순, 같은 시각이면 slug 순, 깨진 값은 빈 목록', function () {
  eq(L.readEntries({ a1: 10, a2: 30, gone: 99, a3: 30 }, BY).map(function (x) { return x.slug; }), ['a2', 'a3', 'a1']);
  eq(L.readEntries(null, BY), []);
  eq(L.readEntries([], BY), []);
  eq(L.readEntries('x', BY), []);
  eq(L.readEntries({ a1: 'nope' }, BY), [{ slug: 'a1', at: 0 }]);
  /* 프로토타입 이름이 섞여도 글로 치지 않는다 */
  eq(L.readEntries({ constructor: 5, a1: 1 }, BY).map(function (x) { return x.slug; }), ['a1']);
});

test('내 서재: 저장·최근 목록은 순서를 지키고 없는 글·중복·글자 아닌 값을 뺀다', function () {
  eq(L.slugList(['a3', 'gone', 'a1', 'a3', 7, null, 'a2'], BY), ['a3', 'a1', 'a2']);
  eq(L.slugList(null, BY), []);
  eq(L.slugList({ a1: 1 }, BY), []);
  eq(L.slugList(['toString', 'a1'], BY), ['a1']);
});

test('내 서재: 코스 진행은 시작한 코스만, 진행 중(많이 읽은 순) 다음 다 읽은 코스', function () {
  const C = [
    { id: 'c1', title: '하나', steps: [{ slug: 'a1' }, { slug: 'a2' }, { slug: 'a3' }] },
    { id: 'c2', title: '둘', steps: [{ slug: 'a1' }, { slug: 'a2' }] },
    { id: 'c3', title: '셋', steps: [{ slug: 'a3' }, { slug: 'zz' }, { slug: 'yy' }, { slug: 'xx' }] },
    { id: 'c4', title: '넷', steps: [] },
    { id: 'c5', title: '다섯', steps: [{ slug: 'qq' }] }
  ];
  const rows = L.courseRows(C, { a1: 1, a2: 2, a3: 3 });
  /* 순서: 진행 중(c3 25%) → 다 읽음(c1·c2, 원래 순서). 단계가 없거나 하나도 안 읽은 코스(c4·c5)는 빠짐 */
  eq(rows.map(function (r) { return [r.id, r.read, r.total, r.pct, r.done]; }), [['c3', 1, 4, 25, false], ['c1', 3, 3, 100, true], ['c2', 2, 2, 100, true]]);
  const rows2 = L.courseRows(C, { a1: 1 });
  eq(rows2.map(function (r) { return [r.id, r.pct]; }), [['c2', 50], ['c1', 33]]);
  eq(L.courseRows(C, null), []);
  eq(L.courseRows(null, { a1: 1 }), []);
});

test('내 서재: "시작한 코스"는 실제로 들어간 코스만(코스 화면·?course= 기록), 읽은 글이 겹친다고 세지 않는다', function () {
  const C = [
    { id: 'c1', title: '하나', steps: [{ slug: 'a1' }, { slug: 'a2' }, { slug: 'a3' }] },
    { id: 'c2', title: '둘', steps: [{ slug: 'a1' }, { slug: 'a2' }] },
    { id: 'c3', title: '셋', steps: [{ slug: 'a3' }, { slug: 'zz' }] }
  ];
  /* 위기 글(a3) 하나만 읽은 사람: 들어간 코스가 없으면 0개(예전에는 a3 가 든 코스 둘이 "시작한 코스"로 셌어요) */
  eq(L.courseRows(C, { a3: 1 }, {}), []);
  eq(L.courseRows(C, { a3: 1 }, []), []);
  /* 들어간 코스만, 아직 읽은 글이 없어도 들어간 코스는 보여요(0 / N) */
  const rows = L.courseRows(C, { a1: 1, a3: 2 }, { c2: 5, c3: 9 });
  eq(rows.map(function (r) { return [r.id, r.read, r.total, r.done]; }), [['c2', 1, 2, false], ['c3', 1, 2, false]]);
  eq(L.courseRows(C, {}, { c1: 1 }).map(function (r) { return [r.id, r.read, r.pct]; }), [['c1', 0, 0]]);
  /* 배열로 줘도 같고, 원형 이름·없는 코스 id 는 무시 */
  eq(L.courseRows(C, { a1: 1 }, ['c1', 'toString', 'nope']).map(function (r) { return r.id; }), ['c1']);
  const proto = Object.create(null); proto.c1 = 1;
  eq(L.courseRows(C, { a1: 1 }, proto).map(function (r) { return r.id; }), ['c1'], '원형 없는 객체(progress.enteredCourses 의 모양)');
  /* entered 를 주지 않으면(진도 기록 API 가 없는 옛 판) 예전처럼 읽은 글 기준 */
  eq(L.courseRows(C, { a3: 1 }).map(function (r) { return r.id; }), ['c3', 'c1']);
});

test('내 서재: 확인을 묻는 종류는 직접 모은 것(저장한 글·다른 모듈이 등록한 것), 흔적은 바로 지움', function () {
  ['read', 'recent', 'pos', 'recentq', 'role', 'settings'].forEach(function (id) { ok(!L.needsConfirm(id), id + ' 는 바로 지워요'); });
  ['fav', 'ask', 'plan', 'something-new'].forEach(function (id) { ok(L.needsConfirm(id), id + ' 는 확인을 물어요'); });
});

test('내 서재: 전부 지우기 계획 — 늘 privacy.clear(\'all\'), 보기 설정을 남기면 keep: [\'settings\']', function () {
  const kinds = [
    { id: 'read', keys: ['jhb.read'], session: [] },
    { id: 'recentq', keys: ['jhb.ui.palette.recentq'], session: ['jhb.q'] },
    { id: 'fav', keys: ['jhb.fav'], session: [] },
    { id: 'settings', keys: ['jhb.theme', 'jhb.fs', 'jhb.ui.settings'], session: [] },
    { id: 'ask', keys: ['jhb.ui.ask.items'], session: ['jhb.ui.ask.session'] }
  ];
  const ls = ['jhb.read', 'jhb.fav', 'jhb.theme', 'jhb.ui.settings', 'jhb.privacy.paused', 'jhb.privacy.recentq', 'jhb.ui.unregistered.x', 'other.app', 'jhbx'];
  const ss = ['jhb.q', 'jhb.q.cleared', 'jhb.ui.ask.session', 'jhb.ui.loose', 'zzz'];
  const all = L.planClearAll({ kinds: kinds, lsKeys: ls, ssKeys: ss, keepSettings: false });
  eq(all.ids, 'all');
  eq(all.keep, []);
  eq(all.extraLs, ['jhb.ui.unregistered.x'], '등록 안 된 jhb.* 만 따로(jhb.privacy.* 는 API 가 다룸)');
  eq(all.extraSs, ['jhb.ui.loose'], 'jhb.q.cleared 는 남김(찾기 화면이 옛 검색어를 되살리지 않게)');
  /* 보기 설정을 남겨도 'all' + keep: 등록되지 않은 jhb.privacy.* 까지 API 가 지우고 최근 검색 저장도 API 가 꺼요(따로 끄는 길 없음) */
  const keep = L.planClearAll({ kinds: kinds, lsKeys: ls, ssKeys: ss, keepSettings: true });
  eq(keep.ids, 'all');
  eq(keep.keep, ['settings']);
  eq(keep.extraLs, ['jhb.ui.unregistered.x'], '보기 설정 키는 등록돼 있어 남아요');
  ok(!('offRecentq' in keep), '옛 대체 길(offRecentq) 없음');
  eq(L.planClearAll({}).ids, 'all');
  eq(L.planClearAll({}).keep, []);
});

test('내 서재: 전부 지우기는 코어 API 한 번(privacy.clear(\'all\', { keep }))으로, 옛 대체 길(setRecentq·resetView)은 없다', function () {
  const src = fs.readFileSync(path.join(ROOT, 'js/pages/me.js'), 'utf8');
  has(src, "P.clear(plan.ids, { keep: plan.keep })");
  not(src, 'offRecentq');
  not(src, 'resetView');
});

test('내 서재: 지울 것 미리 보기는 기록이 있는 종류만, 보기 설정은 고를 때만', function () {
  const kinds = [{ id: 'read', label: '읽은 글' }, { id: 'pos', label: '읽던 자리' }, { id: 'settings', label: '보기 설정' }, { id: 'fav', label: '저장한 글' }];
  const has = function (id) { return id !== 'pos'; };
  eq(L.clearPreview(kinds, has, true).map(function (k) { return k.id; }), ['read', 'fav']);
  eq(L.clearPreview(kinds, has, false).map(function (k) { return k.id; }), ['read', 'settings', 'fav']);
  eq(L.clearPreview(kinds, function () { return false; }, false), []);
});

test('내 서재: 캐시의 옛 검색 주소는 쿼리가 붙은 항목만', function () {
  ok(L.isQueryEntry('http://localhost:5174/search/?q=%ED%99%98%EC%B2%AD'));
  ok(L.isQueryEntry('https://x.github.io/jhb/a/x/?course=family-first'));
  ok(!L.isQueryEntry('http://localhost:5174/search/'));
  ok(!L.isQueryEntry('http://localhost:5174/data/toc.js'));
  ok(!L.isQueryEntry(null));
});

test('내 서재: 서비스 워커가 저장한 열어 본 페이지(a/<slug>/ 등)는 지우고, 앱 틀은 남긴다', function () {
  const S = 'http://localhost:5174/';
  ok(L.isPageEntry(S + 'a/suicide-warning-signs/', S), '열어 본 글');
  ok(L.isPageEntry(S + 's/07-medication/', S), '분류 화면');
  ok(L.isPageEntry(S + 'me/', S), '특집 화면');
  ok(L.isPageEntry(S + 'a/x/index.html', S));
  ok(!L.isPageEntry(S, S), '첫 화면(./)은 사전 캐시라 남김');
  ok(!L.isPageEntry(S + 'index.html', S));
  ok(!L.isPageEntry(S + 'app-shell.html', S), '오프라인 틀은 남김');
  ok(!L.isPageEntry(S + 'data/toc.js', S));
  ok(!L.isPageEntry(S + 'content/01-basics/myths.md', S));
  ok(!L.isPageEntry(S + 'icon-192.png', S));
  /* 하위 경로에 올라간 사이트: 범위 밖은 건드리지 않는다 */
  const G = 'https://x.github.io/jhb/';
  ok(L.isPageEntry(G + 'a/clozapine/', G));
  ok(!L.isPageEntry(G, G));
  ok(!L.isPageEntry('https://x.github.io/other/a/y/', G));
  ok(!L.isPageEntry(null, S));
  ok(!L.isPageEntry('not a url', S));
});

test('내 서재: 역할 토스트와 지우기 줄은 고른 역할 이름을 드러내지 않는다', function () {
  L.ROLES.forEach(function (r) {
    not(L.roleToast(r.v), r.t);
    not(L.roleToast(r.v), r.t.replace(/예요$|이에요$/, ''));
  });
  has(L.roleToast('self'), '바꿨어요');
  has(L.roleToast(''), '정하지 않음');
});

test('내 서재: 알아둘 것·최근 검색 안내는 지나친 안심 없이', function () {
  const know = L.KNOW.join(' ');
  not(know, '탭을 닫으면 사라져요');
  has(know, '닫은 탭 다시 열기');
  has(know, '최근 검색');
  has(L.RECENTQ_DESC, '같은 기기를 쓰는 사람');
  has(L.RECENTQ_ON, '같은 기기를 쓰는 사람');
});

test('내 서재: 알아둘 것의 오프라인 저장 줄은 지금 동작대로(기록 쉼이면 새로 연 화면은 저장하지 않음)', function () {
  const line = L.KNOW.filter(function (t) { return t.indexOf('오프라인') >= 0; })[0];
  ok(line, '오프라인 저장 줄');
  not(line, '켜도 저장돼요');
  has(line, '"기록 남기지 않기"를 켜면 그 뒤에 새로 연 화면은 저장하지 않아요');
  has(line, '이미 저장된 화면은');
  has(line, '지울 때 함께 지워요');
});

test('내 서재: 을/를 은 받침에 맞게', function () {
  eq(L.obj('읽은 글'), '읽은 글을');
  eq(L.obj('읽던 자리'), '읽던 자리를');
  eq(L.obj('보기 설정'), '보기 설정을');
  eq(L.obj('역할'), '역할을');
  eq(L.obj('진료 질문 바구니'), '진료 질문 바구니를');
  eq(L.obj('memo'), 'memo을(를)');
  eq(L.subj('저장한 글 3편'), '저장한 글 3편이');
  eq(L.subj('질문 3개'), '질문 3개가');
  eq(L.subj('진료 질문 바구니'), '진료 질문 바구니가');
});

test('내 서재: 정적 HTML 은 소개와 자바스크립트 안내·소개 링크, 사용자 기록은 없음', function () {
  const html = page.staticHtml({ data: {}, esc: md.esc, articles: {}, sections: [], page: { id: 'me' } });
  has(html, '자바스크립트가 필요해요');
  has(html, 'href="#/about#privacy"', '소개의 "기록과 개인정보" 소절로 바로');
  has(html, '<noscript>');
  not(html, 'localStorage');
  not(html, '<script');
  ok(/<p[ >]/.test(html.split('<noscript>')[0]), 'noscript 밖에도 소개 문장이 있어요');
});

test('소개: "기록과 개인정보"의 지우는 방법이 내 서재를 가리킨다', function () {
  const src = fs.readFileSync(path.join(ROOT, 'data/about.js'), 'utf8');
  const box = {}; box.window = box;
  require('vm').runInNewContext(src, box);
  const html = box.JHB.aboutHtml;
  /* 소절은 id="privacy" 로 찾는다(id 가 감싼 section 에 있든 h2 에 있든). 제목 글자·h2 속성이 바뀌어도 깨지지 않게 */
  const at = html.indexOf('id="privacy"');
  ok(at >= 0, '소개에 id="privacy" 소절이 있어요(내 서재·about/#privacy 링크가 가리킴)');
  const from = html.slice(at);
  const hEnd = from.indexOf('</h2>');
  ok(hEnd >= 0 && /기록과 개인정보/.test(from.slice(0, hEnd)), 'id="privacy" 바로 뒤 제목이 "기록과 개인정보"');
  const sec = from.slice(hEnd + 5).split(/<h2[\s>]/)[0];
  has(sec, 'href="#/me"');
  has(sec, '내 서재');
  /* 그 밖의 소절은 그대로 */
  has(html, '<h2>AI로 만든 백과예요</h2>');
  has(html, 'GitHub Pages');
});

/* ---------- K5-1 미리 써 두는 종이(plan): 내 서재에서 이름으로 보이고, 개수는 내용을 드러내지 않게 ---------- */
/* 종이는 장 수를 세지 않아요: 종이 화면은 지금 양식 목록에 있는 칸만 살려서(plan.js 의 clean),
   양식이 빠지거나 이름이 바뀌면 내 서재의 "N장"과 종이 화면이 어긋날 수 있어서. "있어요/없어요"만(privacy.has) */
test('K5-1 내 서재: 종이 줄은 장 수 없이 있어요·없어요만(양식 이름·적은 글·장 수를 세지 않음)', function () {
  ok(!('planSheets' in L), '장 수를 세는 함수가 없음');
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'pages', 'me.js'), 'utf8');
  const ct = src.slice(src.indexOf('function countText('), src.indexOf('function stateText('));
  ok(ct.length > 0, 'countText');
  not(ct, "'plan'", '종이는 개수 글자를 만들지 않음');
  not(src, 'jhb.ui.plan.data', '종이 내용 키를 읽지 않음');
  eq(L.countLabel('plan', 2), '2편', '단위 표에도 종이 없음(쓰지 않음)');
});

test('K5-1 내 서재: 개수 글자·설명 줄(종이는 이 기기 저장을 말함)', function () {
  eq(L.countLabel('read', 3), '3편');
  eq(L.countLabel('recentq', 4), '4개');
  ok(L.HINT.plan && L.HINT.plan.indexOf('이 기기') >= 0, '설명 줄');
  ['재발', '안전 계획', '내 정보'].forEach(function (w) { not(L.HINT.plan, w, '양식 이름을 드러내지 않음'); });
  eq(L.subj('미리 써 두는 종이 2장'), '미리 써 두는 종이 2장이');
  eq(L.obj('미리 써 두는 종이'), '미리 써 두는 종이를');
  ok(L.needsConfirm('plan'), '직접 쓴 것이라 지우기 전에 한 번 더 물음');
});

test('K5-1 내 서재: 정적 소개 문장에도 진료 질문 바구니·미리 써 두는 종이', function () {
  const html = page.staticHtml({ data: {}, esc: md.esc, articles: {}, sections: [], page: { id: 'me' } });
  has(html, '진료 질문 바구니');
  has(html, '미리 써 두는 종이');
});

/* 기록 쉼 스위치 설명: 종이와 진료 질문 바구니도 새로 저장하지 않는다는 것(plan.js TEXT.pausedSave, js/ui/ask.js 의 기록 쉼과 같은 뜻) */
test('K5-1 내 서재: "기록 남기지 않기" 설명에 미리 써 두는 종이·진료 질문 바구니도', function () {
  const d = L.PAUSED_DESC;
  ok(typeof d === 'string' && d.length > 0, '설명');
  ['읽은 글', '최근 읽은 글', '읽던 자리', '최근 검색', '미리 써 두는 종이', '진료 질문 바구니', '새로 저장하지 않아요', '지우기'].forEach(function (w) { has(d, w); });
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'pages', 'me.js'), 'utf8');
  ok(/makeSwitch\('paused', '기록 남기지 않기',\s*PAUSED_DESC,/.test(src), '스위치가 이 설명을 씀');
});
