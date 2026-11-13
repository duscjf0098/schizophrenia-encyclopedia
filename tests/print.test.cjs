/* 인쇄 모듈(js/ui/print.js, css/ui/print.css) 테스트
   - 순수 도우미: 인쇄한 날, 글 주소(쿼리·조각 없이), 머리 줄, 닫힌 details 고르기, 인쇄 준비·되돌리기
   - css: 어두운 화면 토큰을 인쇄에서 모두 밝은 값으로 강제, 크롬 숨김, 출처 주소, 쪽 나눔, 화면 선택자 접두어 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = function (p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); };
const P = require('../js/ui/print.js');

test('print: dateText 는 현지 날짜를 2026.11.14 꼴로', function () {
  eq(P.dateText(new Date(2026, 10, 14, 23, 59)), '2026.11.14');
  eq(P.dateText(new Date(2026, 0, 5, 0, 0)), '2026.01.05');
  eq(P.dateText(new Date('없는 날')), '');
  eq(P.dateText(null), '');
  eq(P.dateText('2026-11-14'), '');
});

test('print: pageUrl 은 쿼리·조각을 싣지 않아요(검색어 같은 입력이 종이에 남지 않게)', function () {
  eq(P.pageUrl({ origin: 'https://ex.org', pathname: '/a/auditory-hallucination/', search: '?course=family-first', hash: '#h-2' }), 'https://ex.org/a/auditory-hallucination/');
  eq(P.pageUrl({ origin: 'https://ex.org', pathname: '/search/', search: '?q=%EC%A3%BD%EA%B3%A0', href: 'https://ex.org/search/?q=%EC%A3%BD%EA%B3%A0' }), 'https://ex.org/search/');
  not(P.pageUrl({ origin: 'http://localhost:5174', pathname: '/a/x/', search: '?q=abc' }), 'abc');
});

test('print: pageUrl 은 퍼센트 글자를 읽을 수 있게 풀고, 깨진 % 에도 던지지 않아요', function () {
  eq(P.pageUrl({ origin: 'https://ex.org', pathname: '/%ED%99%98%EC%B2%AD/' }), 'https://ex.org/환청/');
  eq(P.pageUrl({ origin: 'https://ex.org', pathname: '/a/%E0%A4/' }), 'https://ex.org/a/%E0%A4/');
  eq(P.pageUrl({ origin: 'https://ex.org', pathname: '/a/b%2Fc/' }), 'https://ex.org/a/b%2Fc/', '예약 글자(%2F)는 그대로');
});

test('print: pageUrl 은 origin 이 없거나 null 이면 href 에서 쿼리·조각만 떼요', function () {
  eq(P.pageUrl({ origin: 'null', href: 'file:///D:/site/a/x/index.html?q=1#top' }), 'file:///D:/site/a/x/index.html');
  eq(P.pageUrl({ href: 'https://ex.org/a/x/#h-1' }), 'https://ex.org/a/x/');
  eq(P.pageUrl(null), '');
  eq(P.pageUrl({}), '');
});

test('print: headLine 은 사이트 이름 + 분류', function () {
  eq(P.headLine('증상과 경험'), '조현병 백과 · 증상과 경험');
  eq(P.headLine(''), '조현병 백과');
  eq(P.headLine(null), '조현병 백과');
  eq(P.SITE, '조현병 백과');
});

test('print: closedOnes 는 닫힌 details 만 골라요', function () {
  const a = { open: false }, b = { open: true }, c = { open: false };
  const got = P.closedOnes([a, b, c]);
  eq(got.length, 2);
  ok(got[0] === a && got[1] === c, '순서 유지');
  eq(P.closedOnes(null), []);
  eq(P.closedOnes([null, undefined]), []);
});

function fakeEnv(list) {
  const cls = {};
  const calls = { prepare: 0 };
  return {
    calls: calls,
    cls: cls,
    env: {
      details: function () { return list; },
      html: { classList: { add: function (c) { cls[c] = true; }, remove: function (c) { delete cls[c]; } } },
      onPrepare: function () { calls.prepare++; }
    }
  };
}

test('print: makePrinter 는 닫힌 것만 펴고, 되돌릴 때 그것만 다시 닫아요', function () {
  const toc = { open: false }, mine = { open: true }, inner = { open: false };
  const f = fakeEnv([toc, mine, inner]);
  const pr = P.makePrinter(f.env);
  ok(pr.prepare(), '준비함');
  ok(toc.open && mine.open && inner.open, '모두 펼침');
  ok(f.cls['prt-printing'], '인쇄 중 표시');
  eq(f.calls.prepare, 1);
  ok(pr.active());
  ok(pr.restore(), '되돌림');
  eq([toc.open, mine.open, inner.open], [false, true, false], '원래 열려 있던 것은 그대로');
  ok(!f.cls['prt-printing']);
  ok(!pr.active());
});

test('print: makePrinter 는 두 번 준비해도(beforeprint + matchMedia) 한 번 되돌리면 끝나요', function () {
  const toc = { open: false };
  const f = fakeEnv([toc]);
  const pr = P.makePrinter(f.env);
  pr.prepare(); pr.prepare();
  ok(toc.open);
  eq(f.calls.prepare, 2, '날짜 고치기는 매번(늦게 온 준비에도 오늘 날짜)');
  ok(pr.restore());
  ok(!toc.open);
  ok(!pr.restore(), '두 번째 되돌리기는 할 일 없음');
  ok(!toc.open);
});

test('print: makePrinter 는 준비 뒤 새로 닫힌 것도 다음 준비 때 펴고 함께 되돌려요', function () {
  const toc = { open: false }, later = { open: true };
  const list = [toc, later];
  const f = fakeEnv(list);
  const pr = P.makePrinter(f.env);
  pr.prepare();
  later.open = false; /* afterprint 가 오지 않은 채 사용자가 하나를 접음 */
  pr.prepare();
  ok(toc.open && later.open);
  pr.restore();
  eq([toc.open, later.open], [false, false]);
});

test('print: makePrinter 는 준비 없이 되돌리면 아무것도 안 해요, reset 은 건드리지 않고 잊어요', function () {
  const d = { open: false };
  const f = fakeEnv([d]);
  const pr = P.makePrinter(f.env);
  ok(!pr.restore());
  eq(d.open, false);
  pr.prepare();
  pr.reset(); /* 다른 화면으로 넘어가 노드가 사라짐 */
  ok(!pr.active());
  ok(!f.cls['prt-printing']);
  eq(d.open, true, 'reset 은 노드를 만지지 않음');
  ok(!pr.restore());
});

test('print: headNumbers 는 위기 글에 109·1577-0199·119, 응급 글에 119', function () {
  const c = P.headNumbers(['위기', '자살']);
  ['109', '1577-0199', '119'].forEach(function (n) { has(c, n); });
  const e = P.headNumbers(['응급', '약']);
  has(e, '119'); not(e, '109 ');
  not(e, '1577-0199');
  eq(P.headNumbers(['위기', '응급']), c, '둘 다면 위기 줄(119 포함)');
  eq(P.headNumbers(['증상']), '');
  eq(P.headNumbers(null), '');
  eq(P.headNumbers('위기'), '', '배열이 아니면 없음');
});

/* ---------- attachDoc: 가짜 DOM(태그·클래스·자손 선택자만) ---------- */
function N(tag, cls, kids) {
  const n = {
    tagName: tag.toUpperCase(), cls: (cls || '').split(' ').filter(Boolean), children: [], parent: null,
    classList: {
      add: function (c) { if (n.cls.indexOf(c) < 0) n.cls.push(c); },
      remove: function (c) { n.cls = n.cls.filter(function (x) { return x !== c; }); },
      contains: function (c) { return n.cls.indexOf(c) >= 0; },
      toggle: function (c, on) { if (on === undefined) on = !n.classList.contains(c); if (on) n.classList.add(c); else n.classList.remove(c); return on; }
    },
    get firstChild() { return n.children[0] || null; },
    appendChild: function (k) { k.parent = n; n.children.push(k); return k; },
    insertBefore: function (k, ref) { k.parent = n; const i = ref ? n.children.indexOf(ref) : -1; if (i < 0) n.children.push(k); else n.children.splice(i, 0, k); return k; },
    insertAdjacentElement: function (where, k) { if (where !== 'afterend') throw new Error(where); const p = n.parent; k.parent = p; p.children.splice(p.children.indexOf(n) + 1, 0, k); return k; },
    querySelector: function (sel) { return qsa(n, sel)[0] || null; },
    querySelectorAll: function (sel) { return qsa(n, sel); }
  };
  (kids || []).forEach(function (k) { n.appendChild(k); });
  return n;
}
function matchOne(n, part) {
  const m = /^([a-z]*)((?:\.[\w-]+)*)$/i.exec(part);
  if (m[1] && n.tagName !== m[1].toUpperCase()) return false;
  return m[2].split('.').filter(Boolean).every(function (c) { return n.cls.indexOf(c) >= 0; });
}
function descendants(n) { const out = []; (function walk(x) { x.children.forEach(function (k) { out.push(k); walk(k); }); })(n); return out; }
function qsa(root, sel) {
  const parts = sel.trim().split(/\s+/);
  return descendants(root).filter(function (n) {
    if (!matchOne(n, parts[parts.length - 1])) return false;
    let i = parts.length - 2, p = n.parent;
    while (i >= 0 && p && p !== root) { if (matchOne(p, parts[i])) i--; p = p.parent; }
    return i < 0;
  });
}
function fakeDoc() {
  const acts = N('div', 'infobox-actions', [N('button', 'btn'), N('button', 'btn')]);
  const macts = N('div', 'acts', [N('button', 'btn'), N('button', 'btn')]);
  const disc = N('div', 'disclaimer');
  const main = N('div', 'doc-main', [N('div', 'doc-meta-m', [macts]), N('div', 'body'), disc, N('nav', 'pager')]);
  const art = N('article', 'doc', [N('aside', 'infobox', [acts]), main]);
  const crumb = N('nav', 'crumb');
  const app = N('main', '', [crumb, art]);
  const html = N('html', '');
  return { app: app, art: art, acts: acts, macts: macts, disc: disc, main: main, crumb: crumb, html: html };
}
function opts(d, extra) {
  const made = { button: 0, head: 0, foot: 0 };
  const o = Object.assign({
    canPrint: true, html: d.html,
    makeButton: function () { made.button++; return N('button', 'btn prt-btn'); },
    makeHead: function () { made.head++; return N('div', 'prt-head'); },
    makeFoot: function () { made.foot++; return N('div', 'prt-foot'); }
  }, extra || {});
  return { o: o, made: made };
}

test('print: attachDoc 는 두 버튼 줄에 버튼 하나씩, 머리는 맨 앞, 꼬리는 고지 바로 뒤에 끼워요', function () {
  const d = fakeDoc(), x = opts(d);
  const r = P.attachDoc(d.app, x.o);
  eq(r, { buttons: 2, head: true, foot: true });
  eq(d.acts.children.length, 3); ok(d.acts.children[2].classList.contains('prt-btn'), '정보 상자 줄 끝');
  eq(d.macts.children.length, 3); ok(d.macts.children[2].classList.contains('prt-btn'), '휴대폰 머리 줄 끝');
  ok(d.app.children[0].classList.contains('prt-head'), '머리는 #app 맨 앞(빵부스러기 앞)');
  ok(d.app.children[1] === d.crumb);
  const i = d.main.children.indexOf(d.disc);
  ok(d.main.children[i + 1].classList.contains('prt-foot'), '꼬리는 고지 바로 뒤');
  ok(d.html.classList.contains('prt-doc'), '바닥글 겹침 막기 표시');
});

test('print: attachDoc 는 다시 불러도(같은 문서에 jhb:article 두 번) 아무것도 두 번 붙이지 않아요', function () {
  const d = fakeDoc(), x = opts(d);
  P.attachDoc(d.app, x.o);
  const r = P.attachDoc(d.app, x.o);
  eq(r, { buttons: 0, head: false, foot: false });
  eq(x.made, { button: 2, head: 1, foot: 1 });
  eq(qsa(d.app, '.prt-btn').length, 2);
  eq(qsa(d.app, '.prt-head').length, 1);
  eq(qsa(d.app, '.prt-foot').length, 1);
});

test('print: attachDoc 는 문서 화면이 아니면 아무것도 안 해요', function () {
  const app = N('main', '', [N('h1', 'page-title'), N('div', 'fp-body')]);
  const html = N('html', 'prt-doc');
  const x = opts({ html: html });
  eq(P.attachDoc(app, x.o), null);
  eq(app.children.length, 2);
  eq(x.made, { button: 0, head: 0, foot: 0 });
  eq(P.attachDoc(null, x.o), null);
});

test('print: attachDoc 는 인쇄를 못 하면 버튼만 빼고, 고지가 없으면 꼬리를 문서 끝에, 꼬리가 없으면 prt-doc 을 떼요', function () {
  const d = fakeDoc();
  d.main.children.splice(d.main.children.indexOf(d.disc), 1);
  const x = opts(d, { canPrint: false });
  eq(P.attachDoc(d.app, x.o), { buttons: 0, head: true, foot: true });
  eq(qsa(d.app, '.prt-btn').length, 0);
  ok(d.main.children[d.main.children.length - 1].classList.contains('prt-foot'), '고지가 없으면 끝에');
  const d2 = fakeDoc();
  d2.html.classList.add('prt-doc');
  const x2 = opts(d2, { makeFoot: function () { return null; } });
  eq(P.attachDoc(d2.app, x2.o).foot, false);
  ok(!d2.html.classList.contains('prt-doc'), '꼬리가 없으면 바닥글을 남김');
});

test('print: 모듈은 저장소·외부 요청을 쓰지 않아요', function () {
  const src = read('js/ui/print.js');
  not(src, 'localStorage');
  not(src, 'sessionStorage');
  not(src, '.store.');
  not(src, 'fetch(');
  not(src, 'XMLHttpRequest');
  not(src, 'location.search');
  not(src, 'location.href');
});

/* ---------- css ---------- */
function blockAfter(css, start) {
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) return css.slice(open + 1, i); }
  }
  return '';
}
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }
function printBlocks(css) {
  const out = [];
  const re = /@media\s+print\s*\{/g;
  let m;
  while ((m = re.exec(css))) out.push(blockAfter(css, m.index));
  return out.join('\n');
}
function tokensIn(block) {
  const out = [];
  const re = /(--[a-z0-9-]+)\s*:/g;
  let m;
  while ((m = re.exec(block))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
}

/* 단순 선택자 특이도 [id, class·속성·가상 클래스, 태그]. :not()·:has() 는 괄호 안 특이도를 더해요 */
function specificity(sel) {
  const s = [0, 0, 0];
  let rest = sel.replace(/:(not|has|is)\(([^()]*)\)/g, function (all, fn, inner) {
    const k = specificity(inner); s[0] += k[0]; s[1] += k[1]; s[2] += k[2]; return '';
  });
  rest = rest.replace(/\[[^\]]*\]/g, function () { s[1]++; return ''; });
  rest = rest.replace(/#[\w-]+/g, function () { s[0]++; return ''; });
  rest = rest.replace(/\.[\w-]+/g, function () { s[1]++; return ''; });
  rest = rest.replace(/::?[\w-]+/g, function (m) { if (m.indexOf('::') === 0) s[2]++; else s[1]++; return ''; });
  rest.replace(/[a-z][\w-]*/gi, function () { s[2]++; return ''; });
  return s;
}
function cmpSpec(a, b) { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }

test('print: 특이도 도우미가 맞게 세요(테스트용)', function () {
  eq(specificity(':root[data-theme="dark"]'), [0, 2, 0]);
  eq(specificity(':root:not([data-theme="light"])'), [0, 2, 0]);
  eq(specificity(':root:has(.fp-body[data-page="ask"])'), [0, 3, 0]);
  eq(specificity('html:root:not([data-print-tokens="own"])'), [0, 2, 1]);
  eq(specificity('html .body .rd-hidden'), [0, 2, 1]);
});

test('print.css: 어두운 화면에서 바뀌는 토큰을 인쇄에서 모두 밝은 값으로 정하고, 특집 화면이 이길 자리를 남겨요', function () {
  const style = stripComments(read('css/style.css'));
  const darkAt = style.indexOf(':root[data-theme="dark"]');
  ok(darkAt > 0, 'style.css 에 어두운 화면 토큰이 있음');
  const darkTokens = tokensIn(blockAfter(style, darkAt));
  ok(darkTokens.length >= 15, '어두운 화면 토큰 ' + darkTokens.length + '개');
  const pr = printBlocks(stripComments(read('css/ui/print.css')));
  const m0 = /(^|[\s}])(html:root[^{]*)\{/.exec(pr);
  ok(m0, '인쇄 블록 안에 토큰 규칙');
  const sel = m0[2].trim();
  const rootBlock = blockAfter(pr, m0.index);
  darkTokens.forEach(function (t) {
    const m = new RegExp(t.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+);').exec(rootBlock);
    ok(m, t + ' 를 인쇄에서 정함');
    not(m[1], '!important', t + ' 는 !important 없이(특집 화면이 덮을 수 있게)');
  });
  has(rootBlock, 'color-scheme: light');
  const sp = specificity(sel);
  ok(cmpSpec(sp, specificity(':root[data-theme="dark"]')) > 0, '어두운 화면(직접 고름)보다 구체적: ' + sp);
  ok(cmpSpec(sp, specificity(':root:not([data-theme="light"])')) > 0, '어두운 화면(운영체제)보다 구체적');
  ok(cmpSpec(sp, specificity(':root:has(.fp-body[data-page="ask"])')) < 0, '특집 화면의 인쇄 토큰(질문 바구니)보다 덜 구체적');
});

test('print.css: 인쇄 글자 크기는 보기 설정을 따르되 13pt 를 넘지 않아요', function () {
  const pr = printBlocks(stripComments(read('css/ui/print.css')));
  const sizes = {};
  const re = /([^{}]+)\{\s*--fs-body:\s*([\d.]+)pt;\s*\}/g;
  let m;
  while ((m = re.exec(pr))) m[1].split(',').forEach(function (s) {
    s = s.trim(); const k = /data-fs="(\w+)"/.exec(s); sizes[k ? k[1] : (s.indexOf(':not([data-fs])') >= 0 ? 'none' : s)] = { pt: +m[2], sp: specificity(s) };
  });
  ['none', 's', 'm', 'l', 'xl', 'xxl'].forEach(function (k) {
    ok(sizes[k], '글자 크기 ' + k + ' 를 인쇄에서 정함');
    ok(sizes[k].pt >= 10 && sizes[k].pt <= 13, k + ' = ' + sizes[k].pt + 'pt');
    ok(cmpSpec(sizes[k].sp, specificity(':root[data-fs="xxl"]')) > 0, k + ' 는 settings.css 의 :root[data-fs] 보다 구체적');
  });
  ok(sizes.s.pt < sizes.m.pt && sizes.m.pt <= sizes.l.pt && sizes.l.pt <= sizes.xxl.pt, '작게 < 보통 ≤ 크게 ≤ 아주 크게');
});

test('print.css: 요약 보기로 접힌 소절은 reading.css(뒤에 실림)보다 구체적인 선택자로 펴요', function () {
  const pr = printBlocks(stripComments(read('css/ui/print.css')));
  const m = /([^{};]*\.rd-hidden)\s*\{\s*display:\s*revert\s*!important/.exec(pr);
  ok(m, '.rd-hidden 펴기 규칙');
  ok(cmpSpec(specificity(m[1].trim()), specificity('.rd-hidden')) > 0, m[1].trim() + ' > .rd-hidden');
});

test('print.css: 차례·본문 details 펴기는 문서 화면에만(특집 화면의 접힌 내용은 건드리지 않음)', function () {
  const pr = printBlocks(stripComments(read('css/ui/print.css')));
  const re = /([^{}]*::details-content[^{}]*)\{/g;
  let m, n = 0;
  while ((m = re.exec(pr))) m[1].split(',').forEach(function (s) { s = s.trim(); if (!s) return; n++; has(s, 'article.doc', s + ' 는 문서 화면만'); });
  ok(n >= 1, 'details 펴기 규칙이 있음');
});

test('print.css: 찾기 입력 줄은 인쇄에서 숨겨요(입력한 말이 종이에 남지 않게)', function () {
  const pr = printBlocks(stripComments(read('css/ui/print.css')));
  has(pr, '#app .searchbar');
  has(pr, 'input[type="search"]');
});

test('print.css: 화면용 규칙은 코어 버튼(.btn)을 바꾸지 않아요', function () {
  const css = stripComments(read('css/ui/print.css'));
  not(css, '.prt-row > .btn');
});

test('print.css: 인쇄에서 크롬을 숨기고 접힌 것을 펴고 출처 주소를 보여요', function () {
  const pr = printBlocks(stripComments(read('css/ui/print.css')));
  has(pr, 'body > :not(.shell):not(.sitefoot)', 'body 바로 아래 장치(상단 바·하단 바·시트·토스트) 숨김');
  ['.sidenav', '.doc-margin', '.rd-bar', '.pager', '.see-also', '.backlinks', '.course-nav', '.prt-btn'].forEach(function (s) { has(pr, s); });
  has(pr, '.rd-hidden', '요약 보기로 접힌 소절');
  has(pr, '::details-content', '자바스크립트 없이도 접힌 차례를 펼침');
  has(pr, 'attr(href)', '출처 링크 뒤 주소');
  has(pr, '.sources a[href^="http"]::after');
  has(pr, 'break-inside: avoid', '표·콜아웃이 쪽 사이에서 잘리지 않게');
  has(pr, '.callout');
  has(pr, 'table');
  has(pr, '.prt-head', '인쇄 머리');
  has(pr, '.prt-foot', '인쇄 꼬리');
  has(pr, '.sitefoot', '바닥 고지를 인쇄에 남김(자바스크립트가 없을 때)');
});

test('print.css: 화면용 규칙은 모두 .prt- 요소만 꾸며요(인쇄 블록 밖)', function () {
  let css = stripComments(read('css/ui/print.css'));
  const re = /@media\s+print\s*\{/g;
  let m; const cut = [];
  while ((m = re.exec(css))) { const b = blockAfter(css, m.index); cut.push([m.index, css.indexOf('{', m.index) + b.length + 2]); }
  for (let i = cut.length - 1; i >= 0; i--) css = css.slice(0, cut[i][0]) + css.slice(cut[i][1]);
  const sels = [];
  css.replace(/([^{}]+)\{[^{}]*\}/g, function (all, sel) { sel.split(',').forEach(function (s) { s = s.trim(); if (s) sels.push(s); }); return ''; });
  ok(sels.length > 0, '화면용 규칙이 있음');
  /* 규칙이 꾸미는 대상(마지막 단위)은 이 모듈의 .prt- 요소만(코어 버튼 모양은 바꾸지 않음) */
  sels.forEach(function (s) { ok(/(^|\s)\.prt-[\w-]+$/.test(s), '선택자 ' + s); });
});
