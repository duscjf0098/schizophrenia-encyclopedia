/* js/ui/mobile.js — 휴대폰 하단 바와 스와이프 (화면 폭 760px 이하, 모든 화면)
   하단 바
   - 문서 화면: [차례] [저장] [용어] [위로]. 차례·용어는 바텀시트.
   - 그 밖의 화면: [찾기(팔레트)] [분류(왼쪽 목차 서랍)] [길잡이(guide 가 있을 때만)] [내 서재(me) 또는 저장한 문서].
     위기 입구는 상단 "지금 도움" 하나로 충분해서 하단 바에는 넣지 않아요.
   - 스크롤을 내리면 바가 숨고 올리면 나타나요. 바가 있는 동안 body 에 아래 여백(mb-has-bar)을 줘요.
   - 차례에서 소절로 갈 때 요약 보기로 접힌 소절이면 JHB.ui.reading.reveal(id) 로 먼저 펴요.
   - 차례·용어 바텀시트는 대화상자: 열린 동안 뒤 화면 inert, Tab 은 시트 안에서만 돌아요.
   스와이프(문서 화면): 가로로 80px 이상 밀면 같은 분류의 앞·다음 문서로 가요. 표(.tbl)나 가로 스크롤 요소 위에서 시작한 터치는 무시.
   node: module.exports = { generalItems } (tests/nowhelp.test.cjs) */
(function (root) {
  'use strict';
  /* 문서 밖 화면의 하단 바 칸. pages = JHB.app.pageById, cur = 주소 첫 칸('' 첫 화면, 's', 'search', 'fav', 특집 화면 id …) */
  function generalItems(pages, cur) {
    const P = pages || {}, has = function (id) { return Object.prototype.hasOwnProperty.call(P, id) && !!P[id]; };
    const out = [
      { id: 'search', kind: 'button', label: '찾기', current: cur === 'search' },
      { id: 'nav', kind: 'button', label: '분류', current: false }
    ];
    if (has('guide')) out.push({ id: 'guide', kind: 'link', label: '길잡이', href: '#/guide', current: cur === 'guide' });
    if (has('me')) out.push({ id: 'me', kind: 'link', label: '내 서재', href: '#/me', current: cur === 'me' });
    else out.push({ id: 'fav', kind: 'link', label: '저장한 문서', href: '#/fav', current: cur === 'fav' });
    return out;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { generalItems: generalItems }; return; }

  /* ================= 브라우저 ================= */
  const JHB = root.JHB;
  if (!JHB || !JHB.app) return;
  const A = JHB.app, el = A.el;
  const NARROW = 760;
  function narrow() { return innerWidth <= NARROW; }
  function reduce() { return A.reducedMotion ? A.reducedMotion() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function svg(path) { return el('span', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>' }); }
  const ICON = {
    toc: '<path d="M5 7h14M5 12h14M5 17h9"/>',
    fav: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    term: '<path d="M4 19V6a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13M9 9h6M9 13h4"/>',
    top: '<path d="M12 19V6M6 12l6-6 6 6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    nav: '<path d="M5 4v16M9.5 4v16M14 5l4 14.5"/>',
    guide: '<path d="M12 3v18M12 5h6l2 2.5-2 2.5h-6M12 12H6l-2 2.5L6 17h6"/>',
    me: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>'
  };

  let state = null;          /* 현재 문서: { slug, toc, body, prev, next } */
  let mode = null;           /* 'doc' | 'gen' | null(숨김) */
  let genSig = '', genTimer = 0, navBtnGen = null, navFromBar = false;
  let bar = null, btnToc, btnFav, btnTerm, btnTop, sheet, scrim, hintL, hintR;
  let opener = null, lastY = 0, hintTimer = 0, navigating = false;

  /* ---------- 하단 바 ---------- */
  function btn(cls, icon, label, aria) {
    return el('button.mb-btn.' + cls, { type: 'button', 'aria-label': aria || label }, [svg(ICON[icon]), el('span.mb-l', null, [label])]);
  }
  function build() {
    if (bar) return;
    btnToc = btn('mb-toc', 'toc', '차례', '이 문서의 차례 열기');
    btnFav = btn('mb-fav', 'fav', '저장', '이 문서 저장');
    btnTerm = btn('mb-term', 'term', '용어', '이 문서에 나온 용어 목록 열기');
    btnTop = btn('mb-top', 'top', '위로', '맨 위로');
    btnToc.setAttribute('aria-haspopup', 'dialog'); btnToc.setAttribute('aria-expanded', 'false');
    btnTerm.setAttribute('aria-haspopup', 'dialog'); btnTerm.setAttribute('aria-expanded', 'false');
    bar = el('nav.mb-bar', { 'aria-label': '문서 도구', hidden: true });
    scrim = el('div.mb-scrim', { hidden: true });
    sheet = el('section.mb-sheet', { role: 'dialog', 'aria-modal': 'true', tabindex: '-1', hidden: true });
    hintL = el('div.mb-hint.left', { 'aria-hidden': 'true' });
    hintR = el('div.mb-hint.right', { 'aria-hidden': 'true' });
    document.body.appendChild(bar); document.body.appendChild(scrim); document.body.appendChild(sheet);
    document.body.appendChild(hintL); document.body.appendChild(hintR);

    btnToc.addEventListener('click', function () { if (!sheet.hidden && opener === btnToc) closeSheet(true); else openSheet('toc', btnToc); });
    btnTerm.addEventListener('click', function () { if (!sheet.hidden && opener === btnTerm) closeSheet(true); else openSheet('term', btnTerm); });
    btnTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }); });
    btnFav.addEventListener('click', function () {
      if (!state) return;
      const on = A.toggleFav(state.slug);
      /* 본문 안의 저장 버튼(.js-fav)도 같은 상태로 */
      Array.prototype.forEach.call(document.querySelectorAll('.js-fav'), function (x) { x.className = 'btn js-fav' + (on ? ' on' : ''); x.textContent = on ? '저장됨' : '저장'; x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      syncFav();
      A.announce(on ? '이 문서를 저장했어요' : '저장을 해제했어요');
    });
    /* 본문의 저장 버튼을 눌렀을 때도 하단 바 상태를 맞춘다 */
    window.addEventListener('jhb:fav', function (e) { if (state && e.detail && e.detail.slug === state.slug) syncFav(); });
    scrim.addEventListener('click', function () { closeSheet(true); });
    sheet.addEventListener('keydown', trapSheet);
    document.addEventListener('focusin', function (e) {
      if (sheet.hidden || sheet.contains(e.target)) return;
      if (JHB.ui && JHB.ui.nowhelp && JHB.ui.nowhelp.isOpen && JHB.ui.nowhelp.isOpen()) return;
      const f = sheetFocusables(); (f[0] || sheet).focus({ preventScroll: true });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(true); });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { if (!narrow()) closeSheet(false); });
    watchNav();
  }
  function syncFav() {
    if (!state) return;
    const on = A.isFav(state.slug);
    btnFav.classList.toggle('on', on);
    btnFav.setAttribute('aria-pressed', on ? 'true' : 'false');
    btnFav.setAttribute('aria-label', on ? '저장됨. 누르면 저장을 해제해요' : '이 문서 저장');
    btnFav.querySelector('.mb-l').textContent = on ? '저장됨' : '저장';
    const s = btnFav.querySelector('svg'); if (s) s.setAttribute('fill', on ? 'currentColor' : 'none');
  }
  function onScroll() {
    if (!bar || bar.hidden) return;
    const y = scrollY, dy = y - lastY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (y < 40 || max - y < 40) setHidden(false);
    else if (dy > 8 && sheet.hidden) setHidden(true);
    else if (dy < -8) setHidden(false);
    lastY = y;
  }
  function setHidden(h) { bar.classList.toggle('mb-hidden', h); }
  function showBar(m, n, label) {
    mode = m;
    bar.setAttribute('aria-label', label);
    bar.style.setProperty('--mb-n', String(n));
    bar.hidden = false; setHidden(false); lastY = scrollY;
    document.body.classList.add('mb-has-bar');
  }
  function hideBar() {
    mode = null;
    if (!bar) return;
    bar.hidden = true;
    document.body.classList.remove('mb-has-bar');
  }

  /* ---------- 문서 밖 화면의 칸 ---------- */
  function openSearch(from) {
    /* 찾기 화면이면 그 화면의 입력창으로, 아니면 팔레트, 팔레트가 없으면 찾기 화면으로 */
    const pin = document.querySelector('.fp-body[data-page="search"] input[type="search"]');
    if (pin) { pin.focus(); if (pin.scrollIntoView) pin.scrollIntoView({ block: 'center', behavior: reduce() ? 'auto' : 'smooth' }); return; }
    if (JHB.ui && JHB.ui.palette && JHB.ui.palette.open) { if (from && from.focus) from.focus({ preventScroll: true }); JHB.ui.palette.open(''); return; }
    if (A.goSearch) A.goSearch('');
  }
  function navOpen() { return !!(A.nav && A.nav.classList.contains('open')); }
  /* 서랍이 열려 있는 동안 하단 바는 Tab 으로 닿지 않게, 닫히면 연 칸으로 포커스를 돌린다 */
  function watchNav() {
    if (!A.nav || !window.MutationObserver) return;
    let was = navOpen();
    new MutationObserver(function () {
      const now = navOpen();
      if (now === was) return;
      was = now;
      bar.inert = now;
      if (navBtnGen) navBtnGen.setAttribute('aria-expanded', now ? 'true' : 'false');
      if (!now && navFromBar && navBtnGen && mode === 'gen' && document.contains(navBtnGen) && narrow()) {
        const back = navBtnGen;
        /* setNav(false) 가 상단 목차 버튼으로 옮긴 포커스를 연 칸으로 */
        if (document.activeElement === document.getElementById('btn-nav') || document.activeElement === document.body) back.focus({ preventScroll: true });
      }
      if (!now) navFromBar = false;
    }).observe(A.nav, { attributes: true, attributeFilter: ['class'] });
  }
  function genItemEl(it) {
    let n;
    if (it.kind === 'link') {
      n = el('a.mb-btn.mb-' + it.id, { href: A.L(it.href) }, [svg(ICON[it.id] || ICON.fav), el('span.mb-l', null, [it.label])]);
    } else if (it.id === 'search') {
      n = btn('mb-search', 'search', it.label, '찾기: 문서나 용어 찾기 열기');
      n.setAttribute('aria-haspopup', 'dialog');
      n.addEventListener('click', function () { openSearch(n); });
    } else {
      n = btn('mb-nav', 'nav', it.label, '분류 목차 열기');
      n.setAttribute('aria-controls', 'sidenav');
      n.setAttribute('aria-expanded', navOpen() ? 'true' : 'false');
      n.addEventListener('click', function () { const o = !navOpen(); navFromBar = o; A.setNav(o); });
      navBtnGen = n;
    }
    if (it.current) { n.setAttribute('aria-current', 'page'); n.classList.add('on'); }
    return n;
  }
  function showGeneral() {
    build();
    state = null; closeSheet(false); hideHints();
    const w = A.where();
    const items = generalItems(A.pageById, w.path[0] || '');
    const sig = items.map(function (x) { return x.id + (x.current ? '*' : ''); }).join(',');
    if (mode !== 'gen' || sig !== genSig) {
      bar.textContent = '';
      navBtnGen = null;
      items.forEach(function (it) { bar.appendChild(genItemEl(it)); });
      genSig = sig;
    }
    showBar('gen', items.length, '빠른 이동');
  }

  /* ---------- 바텀시트 ----------
     role=dialog aria-modal=true 라서 열린 동안 뒤 화면(상단 바·본문·바닥글·하단 바)을 inert 로 두고,
     Tab/Shift+Tab 은 시트 안에서 돌고, 포커스가 밖으로 새면 시트로 되돌린다 */
  const BG = '.skip, header.topbar, .shell, footer.sitefoot';
  let locked = [];
  function lockBg() {
    unlockBg();
    Array.prototype.forEach.call(document.querySelectorAll(BG), function (n) { locked.push([n, !!n.inert]); n.inert = true; });
    if (bar) { locked.push([bar, !!bar.inert]); bar.inert = true; }
  }
  function unlockBg() { locked.forEach(function (p) { p[0].inert = p[1]; }); locked = []; }
  function sheetFocusables() {
    return Array.prototype.filter.call(sheet.querySelectorAll('button:not([disabled]), a[href]'), function (n) { return n.getClientRects().length > 0; });
  }
  function trapSheet(e) {
    if (e.key !== 'Tab' || sheet.hidden) return;
    const f = sheetFocusables(); if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1], cur = document.activeElement;
    if (e.shiftKey && (cur === first || cur === sheet || !sheet.contains(cur))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (cur === last || !sheet.contains(cur))) { e.preventDefault(); first.focus(); }
  }
  function closeSheet(refocus) {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true; scrim.hidden = true;
    unlockBg();
    if (opener) opener.setAttribute('aria-expanded', 'false');
    if (refocus && opener && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }
  function openSheet(kind, from) {
    if (!state) return;
    closeSheet(false);
    sheet.innerHTML = '';
    const x = el('button.mb-x', { type: 'button', 'aria-label': '닫기' }, ['×']);
    x.addEventListener('click', function () { closeSheet(true); });
    const items = kind === 'toc' ? tocItems() : termItems();
    const title = kind === 'toc' ? '이 문서의 차례' : '이 문서에 나온 용어';
    sheet.setAttribute('aria-label', title);
    sheet.appendChild(el('div.mb-sheet-h', null, [title, items.length ? el('span.mb-n', null, [items.length + '개']) : null, x]));
    sheet.appendChild(items.length ? el('ul.mb-list', null, items.map(function (b) { return el('li', null, [b]); }))
      : el('p.mb-empty', null, [kind === 'toc' ? '이 문서에는 소제목이 없어요.' : '이 문서에는 밑줄 친 용어가 없어요.']));
    sheet.hidden = false; scrim.hidden = false;
    opener = from; from.setAttribute('aria-expanded', 'true');
    setHidden(false);
    lockBg();
    const first = sheet.querySelector('.mb-item') || x;
    setTimeout(function () { first.focus({ preventScroll: true }); }, 0);
  }
  function scrollToEl(n, block) { n.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: block || 'start' }); }
  function tocItems() {
    const cur = currentHead();
    return (state.toc || []).map(function (t) {
      const b = el('button.mb-item', { type: 'button', class: (t.level === 3 ? 'l3' : '') + (t.id === cur ? ' on' : ''), 'aria-current': t.id === cur ? 'true' : null }, [t.text]);
      b.addEventListener('click', function () {
        closeSheet(false);
        /* 요약 보기로 접힌 소절이면 먼저 편다 */
        if (JHB.ui && JHB.ui.reading && JHB.ui.reading.reveal) JHB.ui.reading.reveal(t.id);
        const n = document.getElementById(t.id);
        if (n) { scrollToEl(n); n.setAttribute('tabindex', '-1'); setTimeout(function () { n.focus({ preventScroll: true }); }, reduce() ? 30 : 400); }
      });
      return b;
    });
  }
  /* 본문 속 요소가 든 소절(앞의 h2)을 편다 */
  function revealNode(n) {
    const R = JHB.ui && JHB.ui.reading;
    if (!R || !R.reveal || !state || !state.body) return;
    let top = n;
    while (top && top.parentElement !== state.body) top = top.parentElement;
    if (!top) return;
    if (top.id) { R.reveal(top.id); return; }
    for (let p = top.previousElementSibling; p; p = p.previousElementSibling) { if (p.tagName === 'H2' && p.id) { R.reveal(p.id); return; } }
  }
  function currentHead() {
    let cur = null;
    const heads = state.body ? state.body.querySelectorAll('h2[id], h3[id]') : [];
    for (let i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top < 120) cur = heads[i].id; else break; }
    return cur;
  }
  function termItems() {
    const seen = {}, out = [];
    const terms = state.body ? state.body.querySelectorAll('.term') : [];
    const defs = {}; (A.glossary || []).forEach(function (g) { defs[g.term] = g.def; });
    Array.prototype.forEach.call(terms, function (t) {
      const name = t.getAttribute('data-term') || t.textContent.trim();
      if (seen[name]) return; seen[name] = 1;
      const def = defs[name] || '';
      const b = el('button.mb-item', { type: 'button' }, [name, def ? el('span.mb-def', null, [def.length > 60 ? def.slice(0, 60) + '…' : def]) : null]);
      b.addEventListener('click', function () {
        closeSheet(false);
        /* 요약 보기로 접힌 소절 안의 용어면 먼저 편다 */
        revealNode(t);
        scrollToEl(t, 'center');
        /* 시트를 닫는 클릭이 문서까지 퍼진 뒤에 눌러야 풀이가 바로 닫히지 않는다 */
        setTimeout(function () { t.click(); }, reduce() ? 60 : 420);
      });
      out.push(b);
    });
    return out;
  }

  /* ---------- 스와이프 ---------- */
  let sx = 0, sy = 0, active = false;
  function hasHScroll(t) {
    let n = t;
    while (n && n !== document.body && n.nodeType === 1) {
      if (n.scrollWidth > n.clientWidth + 2) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll') return true; }
      n = n.parentElement;
    }
    return false;
  }
  function hint(side, text, keep) {
    const h = side === 'left' ? hintL : hintR, other = side === 'left' ? hintR : hintL;
    other.classList.remove('on');
    if (text) h.textContent = text;
    h.classList.add('on');
    clearTimeout(hintTimer);
    if (!keep) hintTimer = setTimeout(hideHints, 900);
  }
  function hideHints() { if (!hintL) return; clearTimeout(hintTimer); hintL.classList.remove('on'); hintR.classList.remove('on'); }
  function swipeOk(e) {
    if (!state || !narrow() || navigating) return false;
    if (e.touches.length !== 1) return false;
    const t = e.target; if (!t || t.nodeType !== 1) return false;
    if (t.closest('.tbl, .mb-sheet, .mb-bar, .nh-sheet, #pop, #sidenav, .topbar, input, textarea, select, pre, code')) return false;
    if (hasHScroll(t)) return false;
    if (!sheet.hidden || navOpen()) return false;
    if (JHB.ui && JHB.ui.nowhelp && JHB.ui.nowhelp.isOpen && JHB.ui.nowhelp.isOpen()) return false;
    return true;
  }
  document.addEventListener('touchstart', function (e) {
    active = swipeOk(e);
    if (!active) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!active) return;
    const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) { active = false; hideHints(); return; }
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) hint('left', state.prev ? '앞 문서 ←' : '앞 문서가 없어요', true);
      else hint('right', state.next ? '→ 다음 문서' : '다음 문서가 없어요', true);
    } else hideHints();
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!active) return; active = false;
    const t = e.changedTouches && e.changedTouches[0]; if (!t) { hideHints(); return; }
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) >= 80 && Math.abs(dx) > Math.abs(dy)) {
      const target = dx > 0 ? state.prev : state.next;
      if (!target) { hint(dx > 0 ? 'left' : 'right', dx > 0 ? '앞 문서가 없어요' : '다음 문서가 없어요'); return; }
      hint(dx > 0 ? 'left' : 'right', dx > 0 ? '앞 문서 ←' : '→ 다음 문서', true);
      navigating = true;
      setTimeout(function () { A.go('#/a/' + target.slug); }, 260);
    } else hideHints();
  }, { passive: true });
  document.addEventListener('touchcancel', function () { active = false; hideHints(); }, { passive: true });

  /* ---------- 화면 이벤트 ---------- */
  function attach(d) {
    build();
    clearTimeout(genTimer);
    state = { slug: d.slug, toc: d.toc || [], body: d.body, prev: d.prev, next: d.next };
    navigating = false;
    if (mode !== 'doc') { bar.textContent = ''; [btnToc, btnFav, btnTerm, btnTop].forEach(function (b) { bar.appendChild(b); }); navBtnGen = null; genSig = ''; }
    btnToc.disabled = !state.toc.length;
    btnTerm.disabled = !(d.body && d.body.querySelector('.term'));
    syncFav();
    showBar('doc', 4, '문서 도구');
  }
  function detach() {
    state = null;
    if (!bar) return;
    closeSheet(false); hideHints();
    hideBar();
  }
  window.addEventListener('jhb:article', function (e) { attach(e.detail); });
  window.addEventListener('jhb:page', function (e) {
    const d = e.detail || {};
    if (d.kind === 'a') {
      /* 문서 화면: 다 그리면 jhb:article 이 곧바로 와요. 오지 않으면(불러오기 실패) 일반 칸으로 */
      detach();
      clearTimeout(genTimer);
      if (!d.loading) genTimer = setTimeout(function () { if (!state) showGeneral(); }, 0);
      return;
    }
    showGeneral();
  });
  /* 모듈이 앱보다 늦게 실려 첫 jhb:page 를 놓쳤을 수 있어요(문서 화면은 jhb:article 을 기다려요) */
  if ((A.where().path[0] || '') !== 'a') showGeneral();

  JHB.ui = JHB.ui || {};
  JHB.ui.mobile = { openToc: function () { if (bar && state) openSheet('toc', btnToc); }, openTerms: function () { if (bar && state) openSheet('term', btnTerm); }, close: function (refocus) { closeSheet(refocus !== false); } };
})(typeof window !== 'undefined' ? window : this);
