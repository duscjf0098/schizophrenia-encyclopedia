/* F3 접근성 다듬기 테스트
   - 책꽂이(js/ui/shelf.js 의 순수 함수): 라벨 글자 대비 4.5:1 이상(밝은·어두운 화면), 책등 높이와 안내 문구가 맞음, 휴대폰 두 줄
   - 화면 전환(js/ui/polish.js 의 순수 함수): 앱 설정의 "움직임 줄이기"도 따름
   - css: zz-a11y.css 가 css/ui.css 의 맨 끝, 특집 화면 css 의 화면용 글자 크기는 --fs-body 를 따름 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SH = require('../js/ui/shelf.js');
const PO = require('../js/ui/polish.js');

function loadData(file) {
  const src = fs.readFileSync(path.join(ROOT, 'data', file), 'utf8');
  const JHB = {};
  new Function('window', 'JHB', src)({ JHB: JHB }, JHB);
  return JHB;
}
const sections = loadData('sections.js').sections;
const articles = loadData('toc.js').toc.articles;
const glossary = loadData('glossary.js').glossary;
function counts() {
  const m = {};
  sections.forEach(function (s) {
    m[s.id] = s.glossary ? glossary.length : articles.filter(function (a) { return a.section === s.id; }).length;
  });
  return m;
}

/* ---------- 책꽂이: 색 계산 ---------- */
test('shelf: 대비 계산이 WCAG 식과 같아요(흰·검 21, #767676 은 흰 바탕에 4.54)', function () {
  eq(Math.round(SH.contrast([255, 255, 255], [0, 0, 0]) * 100) / 100, 21);
  eq(Math.round(SH.contrast([118, 118, 118], [255, 255, 255]) * 100) / 100, 4.54);
  eq(SH.hslRgb(0, 100, 50), [255, 0, 0]);
  eq(SH.hslRgb(120, 100, 25), [0, 128, 0]);
});

test('shelf: 테마별 책등 색이 css/style.css 의 --spine-s·--spine-l 과 같아요', function () {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  const all = [];
  css.replace(/--spine-s:\s*([\d.]+)%;\s*--spine-l:\s*([\d.]+)%/g, function (m, s, l) { all.push([+s, +l]); return m; });
  ok(all.length >= 3, 'style.css 에서 --spine-s/--spine-l 을 3곳(밝음·운영체제 어두움·직접 어두움) 찾아야 해요: ' + all.length);
  eq(all[0], [SH.THEME.light.s, SH.THEME.light.l], '밝은 화면');
  all.slice(1).forEach(function (v, i) { eq(v, [SH.THEME.dark.s, SH.THEME.dark.l], '어두운 화면 ' + (i + 1)); });
});

test('shelf: 모든 분류 책등의 라벨 글자 대비가 밝은·어두운 화면 모두 4.5:1 이상이에요', function () {
  const model = SH.model(sections, counts());
  eq(model.length, sections.length);
  let worst = 99;
  model.forEach(function (b) {
    ['light', 'dark'].forEach(function (t) {
      const c = b.color[t];
      const bg = SH.hslRgb(b.hue, SH.THEME[t].s, c.l);
      const r = SH.contrast(SH.hexRgb(SH.INK[c.ink]), bg);
      ok(r >= 4.5, b.title + ' ' + t + ' 대비 ' + r.toFixed(2));
      eq(Math.round(r * 100) / 100, Math.round(c.ratio * 100) / 100, b.title + ' ' + t + ' 계산값');
      worst = Math.min(worst, r);
    });
  });
  ok(worst >= 4.5, '가장 낮은 대비 ' + worst);
});

test('shelf: 이미 4.5 를 넘는 색은 명도를 바꾸지 않고, 못 넘는 색만 가장 적게 옮겨요', function () {
  for (let h = 0; h < 360; h += 5) {
    ['light', 'dark'].forEach(function (t) {
      const base = SH.THEME[t];
      const c = SH.labelColor(h, t);
      const bg0 = SH.hslRgb(h, base.s, base.l);
      const best0 = Math.max(SH.contrast(SH.hexRgb(SH.INK.light), bg0), SH.contrast(SH.hexRgb(SH.INK.dark), bg0));
      if (best0 >= SH.MIN) eq(c.l, base.l, h + '도 ' + t + ' 는 그대로');
      else ok(c.l !== base.l && Math.abs(c.l - base.l) <= 20, h + '도 ' + t + ' 는 20%p 안에서 옮김: ' + c.l);
      ok(c.ratio >= SH.MIN, h + '도 ' + t + ' 대비 ' + c.ratio);
    });
  }
});

/* ---------- 책꽂이: 높이와 안내 문구 ---------- */
test('shelf: 책등 높이는 문서 수 순서와 같아요(많을수록 높고, 같으면 같음) — 넓은 화면·휴대폰 모두', function () {
  const model = SH.model(sections, counts()).filter(function (b) { return !b.glossary; });
  ['hd', 'hm'].forEach(function (k) {
    model.forEach(function (a) {
      model.forEach(function (b) {
        if (a.n > b.n) ok(a[k] > b[k], k + ' ' + a.title + '(' + a.n + ') > ' + b.title + '(' + b.n + ')');
        if (a.n === b.n) eq(a[k], b[k], k + ' 같은 수');
      });
    });
  });
});

test('shelf: 휴대폰 책등은 누르는 높이 44px 이상, 용어 사전은 두꺼운 책으로 맨 끝에 가장 높게', function () {
  const model = SH.model(sections, counts());
  model.forEach(function (b) { ok(b.hm >= 44, b.title + ' 휴대폰 높이 ' + b.hm); });
  const last = model[model.length - 1];
  ok(last.glossary, '마지막은 용어 사전');
  const docs = model.filter(function (b) { return !b.glossary; });
  eq(last.hd, Math.max.apply(null, docs.map(function (b) { return b.hd; })));
  eq(last.hm, Math.max.apply(null, docs.map(function (b) { return b.hm; })));
  eq(last.label, '용어 사전 · 용어 ' + glossary.length + '개');
});

test('shelf: 휴대폰 두 줄은 반씩(16개면 8·8), 용어 사전은 둘째 줄 끝', function () {
  const rows = SH.rows(SH.model(sections, counts()));
  eq(rows.length, 2);
  eq(rows[0].length, Math.ceil(sections.length / 2));
  eq(rows[0].length + rows[1].length, sections.length);
  ok(rows[1][rows[1].length - 1].glossary);
  /* 390 화면(본문 폭 358px): 첫 줄 8×44, 둘째 줄 7×44 + 사전 50 */
  const w = rows.map(function (r) { return r.reduce(function (s, b) { return s + (b.glossary ? SH.DICT_W : SH.TAP_W); }, 0); });
  ok(w[0] <= 358 && w[1] <= 358, '두 줄 폭 ' + w.join(', '));
});

test('a11y css: 낮은 화면의 고정 막대 합이 25% 아래(높이 400·350 은 상단 42 + 하단 45, 349 이하는 상단 바만)', function () {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'ui', 'zz-a11y.css'), 'utf8');
  const blk = function (q) { const k = css.indexOf('@media ' + q + ' {'); ok(k >= 0, q + ' 규칙'); return css.slice(k, css.indexOf('\n}', k)); };
  const low = blk('screen and (max-height: 400px)');
  const top = Number(/--top-h:\s*(\d+)px/.exec(low)[1]) + 1;                       /* 아래 테두리 1px */
  const btn = Number(/\.mb-btn \{ height: (\d+)px/.exec(blk('screen and (max-height: 400px) and (max-width: 760px)'))[1]);
  const bar = btn + 2 + 2 + 1;                                                     /* mobile.css 의 위아래 2px 여백 + 위 테두리 */
  ok((top + bar) / 350 <= 0.25, '높이 350 에서 ' + (top + bar));
  has(blk('screen and (max-height: 349px)'), '.mb-bar, .stk-bar { display: none !important; }');
  ok(top / 256 <= 0.25, '높이 256 에서 ' + top);
});

/* 위기 전화 알약: 넓힌 누름 범위(::after)가 바깥 여백을 넘지 않아야 줄이 바뀐 알약끼리 겹치지 않아요 */
test('a11y css: 전화 알약의 누름 범위는 자기 바깥 여백 안(다른 번호를 덮지 않음)', function () {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'ui', 'zz-a11y.css'), 'utf8');
  const pill = /\.keypoints-crisis a\[href\^="tel:"\] \{[^}]*margin: (\d+)px (\d+)px;/.exec(css);
  const after = /\.keypoints-crisis a\[href\^="tel:"\]::after \{[^}]*left: -(\d+)px; right: -(\d+)px; top: -(\d+)px; bottom: -(\d+)px;/.exec(css);
  ok(pill && after, '알약 규칙');
  const border = 1;
  ok(Number(after[3]) <= Number(pill[1]) + border && Number(after[1]) <= Number(pill[2]) + border, '세로 ' + after[3] + ' / 여백 ' + pill[1]);
  ok(29 + 2 * Number(after[3]) >= 44, '누름 높이 44 이상');
});

test('shelf: 390px 미만 폰은 한 줄에 6권(누르는 폭 44px 이상: 320 에서 48px)', function () {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'ui', 'shelf.css'), 'utf8');
  const m = /@media \(max-width: 389\.98px\) \{([\s\S]*?)\n\}/.exec(css);
  ok(m, '좁은 폰 규칙이 있어요');
  const cols = /repeat\((\d+), minmax\(0, 1fr\)\)/.exec(m[1]);
  ok(cols, '열 수가 정해져 있어요');
  /* 본문 폭 = 화면 - 양옆 16px. 가장 좁은 320 에서도 칸이 44px 이상, 두 줄 꼴이 끝나는 390 직전까지 */
  ok((320 - 32) / Number(cols[1]) >= 44, '320 에서 ' + (320 - 32) / Number(cols[1]));
  has(m[1], '.sh-row { display: contents; }');
});

test('shelf: 안내 문구가 실제 높이와 맞아요(높이 = 문서 수라고 말하지 않음)', function () {
  has(SH.HINT, '높을수록 문서가 많아요');
  has(SH.HINT, '용어 사전');
  not(SH.HINT, '책등 높이는 문서 수예요');
});

test('shelf: 정적 HTML 조각은 같은 모델로 만들고, 글자는 이스케이프해요', function () {
  const secs = sections.map(function (s) { return Object.assign({}, s); });
  secs[0].title = '이해<하기>';
  const html = SH.html(SH.model(secs, counts()), function (h) { return h; });
  has(html, 'class="sh-shelf"');
  has(html, 'data-sig="');
  has(html, '이해&lt;하기&gt;');
  not(html, '이해<하기>');
  has(html, 'aria-label="이해&lt;하기&gt; · 문서 ');
  has(html, '--ink-l:');
  has(html, '--sl-d:');
  /* 가운뎃점 뒤에는 줄 바꿈 자리(세로 글자가 책등 안에서 두 줄로 나뉠 수 있게) */
  const m = SH.model(sections, counts()).filter(function (b) { return b.title.indexOf('·') >= 0; })[0];
  if (m) has(m.text, '·\u200b');
});

/* ---------- 화면 전환: 움직임 줄이기 ---------- */
test('polish: 화면 전환은 운영체제 설정이나 앱 설정(html 의 data-motion)이 줄이기면 꺼요 — 저장값은 보지 않아요', function () {
  eq(PO.motionReduced({ attr: null, mq: false }), false);
  eq(PO.motionReduced({ attr: 'reduce', mq: false }), true);
  eq(PO.motionReduced({ attr: null, mq: true }), true);
  eq(PO.motionReduced({ attr: 'normal', mq: false }), false);
  /* 저장 실패로 저장값에 reduce 가 남아도, 보기 설정이 속성을 '보통'으로 되돌렸으면 전환을 다시 켜요 */
  eq(PO.motionReduced({ attr: null, mq: false, stored: '{"motion":"reduce"}' }), false);
  /* 첫 그리기 전에 머리 스크립트가 저장값을 속성으로 옮겨요(그래서 저장값을 따로 읽지 않아요) */
  const head = fs.readFileSync(path.join(ROOT, 'tools', 'shell.html'), 'utf8');
  ok(/setAttribute\('data-motion', 'reduce'\)/.test(head), '머리 스크립트가 data-motion 을 달아요');
});

/* ---------- css ---------- */
test('a11y css: zz-a11y.css 가 이어 붙인 css/ui.css 의 맨 끝이에요(덮어쓰기 규칙이 마지막)', function () {
  const files = fs.readdirSync(path.join(ROOT, 'css', 'ui')).filter(function (f) { return /\.css$/.test(f); }).sort();
  eq(files[files.length - 1], 'zz-a11y.css');
  const A = require('../tools/lib/assets.cjs');
  const css = A.uiCss({ root: ROOT });
  const at = css.lastIndexOf('zz-a11y');
  ok(at > 0, 'ui.css 에 zz-a11y 가 들어가요');
  ['shelf.css', 'polish.css', 'sticky.css', 'mobile.css'].forEach(function (f) {
    const head = fs.readFileSync(path.join(ROOT, 'css', 'ui', f), 'utf8').slice(0, 40);
    ok(css.indexOf(head) < at, f + ' 보다 뒤');
  });
});

test('a11y css: 특집 화면 css 의 화면용 글자 크기는 모두 보기 설정(--fs-body)을 따라요(인쇄 규칙은 제외)', function () {
  const dir = path.join(ROOT, 'css', 'pages');
  fs.readdirSync(dir).filter(function (f) { return /\.css$/.test(f); }).forEach(function (f) {
    let css = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    /* @media print { … } 블록 빼기(중괄호 짝 맞춤) */
    let out = '', i = 0;
    while (i < css.length) {
      const k = css.indexOf('@media print', i);
      if (k < 0) { out += css.slice(i); break; }
      out += css.slice(i, k);
      let j = css.indexOf('{', k), depth = 0;
      for (; j < css.length; j++) { if (css[j] === '{') depth++; else if (css[j] === '}') { depth--; if (depth === 0) break; } }
      i = j + 1;
    }
    const bad = [];
    out.replace(/([^{}]*)\{([^{}]*)\}/g, function (blk, sel, body) {
      body.replace(/font-size:\s*([^;}]+)/g, function (m, v) {
        /* '작게'에서도 함께 줄어요: 하한은 읽을 수 있는 최소 12px 만(max(13.5px, …) 같은 하한은 작게를 막아요).
           위기 전화번호(선택자에 tel)만 지금 크기 밑으로 줄이지 않는 하한을 둬요 */
        const floor = /^max\(\s*([\d.]+)px/.exec(v.trim());
        if (floor && Number(floor[1]) > 12 && !/tel/.test(sel)) { bad.push(v.trim() + ' (작게에서 줄지 않음)'); return m; }
        if (/var\(--fs-body\)|em\b|inherit|%/.test(v)) return m;
        bad.push(v.trim());
        return m;
      });
      return blk;
    });
    eq(bad, [], f + ' 의 고정 글자 크기');
  });
});
