/* js/ui/mobile.js — 휴대폰 하단 바와 스와이프 (화면 폭 760px 이하, 문서 화면에서만)
   하단 바: [차례] [저장] [용어] [위로]. 차례·용어는 바텀시트. 스크롤을 내리면 바가 숨고 올리면 나타난다.
   스와이프: 가로로 80px 이상 밀면 같은 분류의 앞·다음 문서로 간다. 표(.tbl)나 가로 스크롤 요소 위에서 시작한 터치는 무시. */
(function () {
  'use strict';
  if (!window.JHB || !JHB.app) return;
  const A = JHB.app, el = A.el;
  const NARROW = 760;
  function narrow() { return innerWidth <= NARROW; }
  function reduce() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function svg(path) { return el('span', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>' }); }
  const ICON = {
    toc: '<path d="M5 7h14M5 12h14M5 17h9"/>',
    fav: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    term: '<path d="M4 19V6a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13M9 9h6M9 13h4"/>',
    top: '<path d="M12 19V6M6 12l6-6 6 6"/>'
  };

  let state = null;          /* 현재 문서: { slug, toc, body, prev, next } */
  let bar = null, btnToc, btnFav, btnTerm, btnTop, sheet, scrim, hintL, hintR;
  let opener = null, lastY = 0, hintTimer = 0, navigating = false;

  /* ---------- 하단 바 ---------- */
  function build() {
    if (bar) return;
    function btn(cls, icon, label, aria) {
      return el('button.mb-btn.' + cls, { type: 'button', 'aria-label': aria || label }, [svg(ICON[icon]), el('span.mb-l', null, [label])]);
    }
    btnToc = btn('mb-toc', 'toc', '차례', '이 문서의 차례 열기');
    btnFav = btn('mb-fav', 'fav', '저장', '이 문서 저장');
    btnTerm = btn('mb-term', 'term', '용어', '이 문서에 나온 용어 목록 열기');
    btnTop = btn('mb-top', 'top', '위로', '맨 위로');
    btnToc.setAttribute('aria-haspopup', 'dialog'); btnToc.setAttribute('aria-expanded', 'false');
    btnTerm.setAttribute('aria-haspopup', 'dialog'); btnTerm.setAttribute('aria-expanded', 'false');
    bar = el('nav.mb-bar', { 'aria-label': '문서 도구', hidden: true }, [btnToc, btnFav, btnTerm, btnTop]);
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
    document.addEventListener('click', function (e) { if (state && e.target && e.target.closest && e.target.closest('.js-fav')) setTimeout(syncFav, 0); });
    scrim.addEventListener('click', function () { closeSheet(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(true); });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { if (!narrow()) closeSheet(false); });
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

  /* ---------- 바텀시트 ---------- */
  function closeSheet(refocus) {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true; scrim.hidden = true;
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
        const n = document.getElementById(t.id);
        if (n) { scrollToEl(n); n.setAttribute('tabindex', '-1'); setTimeout(function () { n.focus({ preventScroll: true }); }, reduce() ? 30 : 400); }
      });
      return b;
    });
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
  function hideHints() { clearTimeout(hintTimer); hintL.classList.remove('on'); hintR.classList.remove('on'); }
  function swipeOk(e) {
    if (!state || !narrow() || navigating) return false;
    if (e.touches.length !== 1) return false;
    const t = e.target; if (!t || t.nodeType !== 1) return false;
    if (t.closest('.tbl, .mb-sheet, .mb-bar, #pop, #sidenav, .topbar, input, textarea, select, pre, code')) return false;
    if (hasHScroll(t)) return false;
    if (!sheet.hidden || (A.nav && A.nav.classList.contains('open'))) return false;
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
    state = { slug: d.slug, toc: d.toc || [], body: d.body, prev: d.prev, next: d.next };
    navigating = false;
    btnToc.disabled = !state.toc.length;
    btnTerm.disabled = !(d.body && d.body.querySelector('.term'));
    syncFav();
    bar.hidden = false; setHidden(false); lastY = scrollY;
    document.body.classList.add('mb-has-bar');
  }
  function detach() {
    state = null;
    if (!bar) return;
    closeSheet(false); hideHints();
    bar.hidden = true;
    document.body.classList.remove('mb-has-bar');
  }
  window.addEventListener('jhb:article', function (e) { attach(e.detail); });
  window.addEventListener('jhb:page', function (e) { if (!e.detail || e.detail.kind !== 'a') detach(); });

  JHB.ui = JHB.ui || {};
  JHB.ui.mobile = { openToc: function () { if (bar) openSheet('toc', btnToc); }, openTerms: function () { if (bar) openSheet('term', btnTerm); }, close: function () { closeSheet(true); } };
})();
