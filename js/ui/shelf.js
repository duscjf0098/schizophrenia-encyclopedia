/* shelf — 공유 배너(책등형)와 같은 책꽂이 모티프를 사이트에 둔다.
   1) 첫 화면: 머리 아래에 분류를 책등으로 세운 책꽂이(누르면 그 분류로). 책등이 높을수록 문서가 많다(많을수록 높고, 같으면 같은 높이).
      용어 사전은 문서가 아니라 용어를 모은 사전이라 맨 끝에 두꺼운 책으로 세운다(높이는 가장 높은 책과 같음).
      휴대폰(760px 이하)은 두 줄 책꽂이: 책등 하나의 누르는 폭 44px(사전 50px), 높이 44px 이상.
      390px 미만 폰은 css 가 두 줄 묶음을 풀어 한 줄에 6권씩 놓아요(누르는 폭 48px 이상, css/ui/shelf.css).
      라벨 글자는 책등 색마다 흰 글자·먹 글자 중 대비가 큰 쪽을 계산해 고르고, 둘 다 4.5:1 에 못 미치면 책등 명도를 가장 적게 옮긴다
      (밝은·어두운 화면 각각. 테마 값은 css/style.css 의 --spine-s·--spine-l 과 같고 tests/a11y.test.cjs 가 맞댄다).
   2) 분류·용어 사전 화면: 제목 앞에 큰 책등
   3) 공용 색 막대(.spine)는 css/ui/shelf.css 에서 책등 모양으로 다듬는다.
   정적 HTML: html(model(sections, counts), L) 이 같은 마크업 문자열을 만든다(node 에서도). 첫 화면에 같은 책꽂이(data-sig 가 같음)가
   이미 있으면 지우지 않고 그대로 쓴다(빌드가 미리 그려 두면 첫 화면이 흔들리지 않게).
   공개: JHB.ui.shelf = { refresh, model, rows, html }. node: module.exports = 순수 함수 */
(function (root) {
  /* ---------- 순수 함수 ---------- */
  const THEME = { light: { s: 38, l: 56 }, dark: { s: 32, l: 62 } };
  const INK = { light: '#ffffff', dark: '#1b1f27' };   /* 라벨 글자: 흰 글자 / 먹 글자 */
  const MIN = 4.6;                                      /* 4.5:1 에 반올림 여유 */
  /* 책등 높이(px) = a + b × 문서 수. 넓은 화면(hd)·휴대폰(hm). 가장 적은 분류의 라벨도 책등 안에 들어가게 a 를 둔다 */
  const HEIGHT = { hd: { a: 54, b: 4.3 }, hm: { a: 36, b: 2.9 } };
  const TAP_W = 44, DICT_W = 50;                        /* 휴대폰 누르는 폭(css/ui/shelf.css 와 같음) */
  const LONG = 8;                                       /* 띄어쓰기 빼고 8글자 이상이면 휴대폰에서 라벨을 한 단계 작게(세 줄까지) */
  const HINT = '책등을 누르면 그 분류로 가요. 책등이 높을수록 문서가 많아요(두꺼운 용어 사전은 빼고).';

  function hslRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = function (n) { return (n + h / 30) % 12; };
    const a = s * Math.min(l, 1 - l);
    const f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  function hexRgb(hex) { const v = parseInt(String(hex).replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
  function lum(rgb) {
    const c = rgb.map(function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  /* 그 색상각·테마에서 라벨 글자 색(ink: light 흰 / dark 먹)과 책등 명도(l, %), 그때의 대비(ratio) */
  function labelColor(hue, theme) {
    const t = THEME[theme] || THEME.light;
    const W = hexRgb(INK.light), D = hexRgb(INK.dark);
    function at(l) {
      const bg = hslRgb(hue, t.s, l);
      const w = contrast(W, bg), d = contrast(D, bg);
      return w >= d ? { ink: 'light', l: l, ratio: w } : { ink: 'dark', l: l, ratio: d };
    }
    const base = at(t.l);
    if (base.ratio >= MIN) return base;
    /* 0.5%p 씩 넓혀 가며: 어둡게 하면 흰 글자, 밝게 하면 먹 글자. 먼저 기준을 넘는 쪽(같으면 원래 더 나은 쪽) */
    for (let d = 0.5; d <= 40; d += 0.5) {
      const dn = t.l - d, up = t.l + d;
      const w = dn >= 5 ? { ink: 'light', l: dn, ratio: contrast(W, hslRgb(hue, t.s, dn)) } : null;
      const k = up <= 95 ? { ink: 'dark', l: up, ratio: contrast(D, hslRgb(hue, t.s, up)) } : null;
      const okW = w && w.ratio >= MIN, okK = k && k.ratio >= MIN;
      if (okW && okK) return base.ink === 'light' ? w : k;
      if (okW) return w;
      if (okK) return k;
    }
    return base;
  }
  function px(v) { return Math.round(v * 10) / 10; }
  /* 가운뎃점 뒤에만 줄 바꿈 자리(세로 라벨이 책등 안에서 둘로 나뉠 수 있게. 화면에 보이는 글자는 같음).
     앞에는 단어 잇개(U+2060)를 둬서 가운뎃점이 줄 맨 앞으로 떨어지지 않게 */
  function breakable(title) { return String(title || '').replace(/·/g, '⁠·​'); }
  /* sections: JHB.sections, counts: { 분류id: 문서 수(용어 사전은 용어 수) }. 용어 사전은 맨 끝 */
  function model(sections, counts) {
    const docs = [], dict = [];
    (sections || []).forEach(function (s) { (s.glossary ? dict : docs).push(s); });
    const hOf = function (k, n) { return px(HEIGHT[k].a + HEIGHT[k].b * n); };
    let maxN = 0;
    docs.forEach(function (s) { maxN = Math.max(maxN, Number(counts[s.id]) || 0); });
    return docs.concat(dict).map(function (s) {
      const n = Number(counts[s.id]) || 0;
      const hn = s.glossary ? maxN : n;
      const hue = Number(s.hue) || 0;
      return {
        id: s.id, title: s.title || '', text: breakable(s.title), hue: hue, n: n, glossary: !!s.glossary,
        long: String(s.title || '').replace(/\s/g, '').length >= LONG,
        href: s.glossary ? '#/glossary' : '#/s/' + s.id,
        label: (s.title || '') + ' · ' + (s.glossary ? '용어 ' : '문서 ') + n + '개',
        hd: hOf('hd', hn), hm: hOf('hm', hn),
        color: { light: labelColor(hue, 'light'), dark: labelColor(hue, 'dark') }
      };
    });
  }
  /* 휴대폰 두 줄: 앞 절반(올림)과 나머지(용어 사전은 둘째 줄 끝) */
  function rows(m) { const k = Math.ceil(m.length / 2); return [m.slice(0, k), m.slice(k)]; }
  function sig(m) { return m.map(function (b) { return b.id + ':' + b.n + ':' + b.hue; }).join(','); }
  function styleOf(b) {
    return '--h:' + b.hue + ';--hd:' + b.hd + 'px;--hm:' + b.hm + 'px;--sl-l:' + b.color.light.l + '%;--sl-d:' + b.color.dark.l + '%;' +
      '--ink-l:' + INK[b.color.light.ink] + ';--ink-d:' + INK[b.color.dark.ink];
  }
  function escHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* 정적 HTML 문자열. L: '#/s/1' 같은 옛 해시 링크를 실제 경로로 바꾸는 함수(앱의 JHB.app.L, 빌드의 경로 함수) */
  function html(m, L) {
    L = L || function (h) { return h; };
    const book = function (b) {
      return '<a class="sh-spine' + (b.glossary ? ' sh-dict' : '') + (b.long ? ' sh-long' : '') + '" href="' + escHtml(L(b.href)) + '" style="' + styleOf(b) + '" aria-label="' + escHtml(b.label) + '" title="' + escHtml(b.label) + '">' +
        '<span class="sh-label" aria-hidden="true">' + escHtml(b.text) + '</span></a>';
    };
    return '<section class="sh-shelf" data-sec="shelf" aria-label="분류 책꽂이" data-sig="' + escHtml(sig(m)) + '">' +
      '<div class="sh-rows">' + rows(m).map(function (r) { return '<div class="sh-row">' + r.map(book).join('') + '</div>'; }).join('') + '</div>' +
      '<div class="sh-board" aria-hidden="true"></div><p class="sh-hint">' + escHtml(HINT) + '</p></section>';
  }
  const lib = {
    THEME: THEME, INK: INK, MIN: MIN, LONG: LONG, HEIGHT: HEIGHT, TAP_W: TAP_W, DICT_W: DICT_W, HINT: HINT,
    hslRgb: hslRgb, hexRgb: hexRgb, contrast: contrast, labelColor: labelColor, model: model, rows: rows, sig: sig, html: html
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = lib; return; }
  if (!root.JHB || !root.JHB.app) return;

  /* ---------- 브라우저 ---------- */
  const A = root.JHB.app, el = A.el;
  function counts() {
    const m = {};
    A.sections.forEach(function (s) { m[s.id] = s.glossary ? A.glossary.length : A.sectionArticles(s.id).length; });
    return m;
  }
  function buildShelf(m) {
    const book = function (b) {
      return el('a', {
        class: 'sh-spine' + (b.glossary ? ' sh-dict' : '') + (b.long ? ' sh-long' : ''), href: A.L(b.href), style: styleOf(b), 'aria-label': b.label, title: b.label
      }, [el('span.sh-label', { 'aria-hidden': 'true' }, [b.text])]);
    };
    return el('section.sh-shelf', { 'data-sec': 'shelf', 'aria-label': '분류 책꽂이', 'data-sig': sig(m) }, [
      el('div.sh-rows', null, rows(m).map(function (r) { return el('div.sh-row', null, r.map(book)); })),
      el('div.sh-board', { 'aria-hidden': 'true' }),
      el('p.sh-hint', null, [HINT])
    ]);
  }
  function bigSpine(s) {
    return el('span.sh-big', { style: '--h:' + s.hue, 'aria-hidden': 'true' });
  }
  function onPage(d) {
    if (d.kind === 'home') {
      const head = A.main.querySelector('.portal .portal-head');
      const m = model(A.sections, counts());
      const want = sig(m);
      /* 이미 같은 책꽂이가 제자리(머리 바로 뒤)에 있으면 그대로 둔다(정적 HTML·다시 그리기에서 흔들리지 않게) */
      const have = head && head.nextElementSibling && head.nextElementSibling.matches('.sh-shelf') ? head.nextElementSibling : null;
      Array.prototype.forEach.call(document.querySelectorAll('.sh-shelf, .sh-big'), function (n) {
        if (n !== have || n.getAttribute('data-sig') !== want) n.remove();
      });
      if (head && !(have && have.isConnected)) head.parentNode.insertBefore(buildShelf(m), head.nextSibling);
      return;
    }
    Array.prototype.forEach.call(document.querySelectorAll('.sh-shelf, .sh-big'), function (n) { n.remove(); });
    if (d.kind === 's' || d.kind === 'glossary') {
      const s = d.kind === 's' ? A.secById[d.id] : A.sections.filter(function (x) { return x.glossary; })[0];
      const t = A.main.querySelector('.page-title');
      if (s && t) t.insertBefore(bigSpine(s), t.firstChild);
    }
  }
  function refresh() { const w = A.where(); onPage({ kind: w.path[0] || 'home', id: w.path[1] || null }); }
  root.addEventListener('jhb:page', function (e) { if (!(e.detail && e.detail.loading)) onPage(e.detail || {}); });
  refresh();
  root.JHB.ui = root.JHB.ui || {};
  root.JHB.ui.shelf = { refresh: refresh, model: model, rows: rows, html: html };
})(typeof window !== 'undefined' ? window : this);
