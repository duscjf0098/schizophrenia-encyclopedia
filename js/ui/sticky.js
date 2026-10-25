/* js/ui/sticky.js — 따라오는 제목 줄 (모든 폭)
   문서 화면에서 .doc-head 가 화면 위로 지나가면 상단 바 바로 아래에 얇은 줄이 붙는다:
   [분류 색 막대] 문서 제목 · 현재 소제목 · 남은 시간. 누르면 차례 드롭다운. 맨 위로 돌아오면 사라진다.
   #progress 막대 색도 현재 문서의 분류 색으로 바꾼다. */
(function () {
  'use strict';
  if (!window.JHB || !JHB.app) return;
  const A = JHB.app, el = A.el;
  const NARROW = 760;
  function reduce() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function topH() { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')); return isNaN(v) ? 60 : v; }

  let state = null;          /* { toc, minutes, body, heads, docHead, docMain } */
  let bar, main, spineEl, titleEl, headEl, timeEl, menu, raf = 0, curId = null, shown = false;

  function build() {
    if (bar) return;
    spineEl = el('span.stk-spine', { 'aria-hidden': 'true' });
    titleEl = el('span.stk-title');
    headEl = el('span.stk-head');
    timeEl = el('span.stk-time');
    const caret = el('span.stk-caret', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' });
    main = el('button.stk-main', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'stk-menu', 'aria-haspopup': 'true', title: '차례 열기' },
      [spineEl, titleEl, el('span.stk-sep', { 'aria-hidden': 'true' }, ['·']), headEl, el('span.stk-sep', { 'aria-hidden': 'true' }, ['·']), timeEl, caret]);
    menu = el('ul.stk-menu', { id: 'stk-menu', hidden: true, 'aria-label': '이 문서의 차례' });
    bar = el('nav.stk-bar', { role: 'navigation', 'aria-label': '현재 위치', hidden: true }, [main, menu]);
    document.body.appendChild(bar);
    main.addEventListener('click', function () { if (menu.hidden) openMenu(); else closeMenu(false); });
    document.addEventListener('click', function (e) { if (!menu.hidden && !bar.contains(e.target)) closeMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) closeMenu(true); });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('jhb:layout', schedule);
  }
  function openMenu() {
    if (!state) return;
    menu.hidden = false; main.setAttribute('aria-expanded', 'true');
    markMenu();
    const on = menu.querySelector('a.on') || menu.querySelector('a');
    if (on) { on.focus({ preventScroll: true }); if (on.scrollIntoView) on.scrollIntoView({ block: 'nearest' }); }
  }
  function closeMenu(refocus) {
    if (menu.hidden) return;
    menu.hidden = true; main.setAttribute('aria-expanded', 'false');
    if (refocus) main.focus({ preventScroll: true });
  }
  function fillMenu() {
    menu.innerHTML = '';
    if (!state.toc.length) { menu.appendChild(el('li.stk-empty', null, ['이 문서에는 소제목이 없어요.'])); return; }
    state.toc.forEach(function (t) {
      const a = el('a', { href: '#' + t.id, class: t.level === 3 ? 'l3' : '', 'data-h': t.id }, [t.text]);
      a.addEventListener('click', function (e) {
        e.preventDefault(); closeMenu(false);
        const n = document.getElementById(t.id);
        if (n) { n.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' }); n.setAttribute('tabindex', '-1'); setTimeout(function () { n.focus({ preventScroll: true }); }, reduce() ? 30 : 400); }
      });
      menu.appendChild(el('li', null, [a]));
    });
  }
  function markMenu() {
    Array.prototype.forEach.call(menu.querySelectorAll('a[data-h]'), function (a) {
      const on = a.getAttribute('data-h') === curId;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }

  function schedule() { if (!state || raf) return; raf = requestAnimationFrame(function () { raf = 0; update(); }); }
  function update() {
    if (!state) return;
    const th = topH();
    const headRect = state.docHead ? state.docHead.getBoundingClientRect() : null;
    const want = !!headRect && headRect.bottom < th && scrollY > 10;
    if (want !== shown) { shown = want; bar.classList.toggle('stk-on', want); if (!want) closeMenu(false); }
    /* 폭: 넓은 화면은 본문 칸에 맞추고, 휴대폰은 전체 폭 */
    if (innerWidth > NARROW && state.docMain) {
      const r = state.docMain.getBoundingClientRect();
      const left = Math.max(0, r.left);
      bar.style.left = left + 'px'; bar.style.width = Math.min(r.width, innerWidth - left) + 'px'; bar.style.right = 'auto';
    } else { bar.style.left = ''; bar.style.width = ''; bar.style.right = ''; }
    if (!want) return;
    /* 현재 소제목: 화면 위 120px 선을 지난 마지막 것 */
    let cur = null, curText = '';
    for (let i = 0; i < state.heads.length; i++) {
      const h = state.heads[i];
      if (h.getBoundingClientRect().top < 120) { cur = h.id; curText = h.textContent.trim(); } else break;
    }
    if (cur !== curId) { curId = cur; headEl.textContent = curText; if (!menu.hidden) markMenu(); }
    /* 남은 시간: 본문(.body) 중 아직 화면 아래에 있는 비율 */
    const b = state.body.getBoundingClientRect();
    const frac = b.height > 0 ? Math.min(1, Math.max(0, (innerHeight - b.top) / b.height)) : 1;
    const left = state.minutes * (1 - frac);
    timeEl.textContent = left < 0.5 ? '거의 다 읽었어요' : '남은 시간 ' + Math.ceil(left) + '분';
  }

  /* 진행 막대 색: 문서의 분류 색, 문서 밖에서는 원래 색 */
  function tintProgress(hue) {
    const p = document.getElementById('progress'); if (!p) return;
    p.style.background = hue == null ? '' : 'hsl(' + hue + ' var(--spine-s, 38%) var(--spine-l, 56%))';
  }

  function attach(d) {
    build();
    const sec = A.secById[d.article && d.article.section] || {};
    const hue = sec.hue != null ? sec.hue : 250;
    state = {
      toc: d.toc || [], minutes: Number(d.minutes) || 1, body: d.body,
      heads: d.body ? Array.prototype.slice.call(d.body.querySelectorAll('h2[id], h3[id]')) : [],
      docHead: document.querySelector('.doc-head'), docMain: document.querySelector('.doc-main')
    };
    curId = null; shown = false; bar.classList.remove('stk-on');
    spineEl.style.setProperty('--h', hue);
    titleEl.textContent = (d.meta && d.meta.title) || (d.article && d.article.title) || '';
    headEl.textContent = ''; timeEl.textContent = '남은 시간 ' + state.minutes + '분';
    fillMenu();
    bar.hidden = false;
    tintProgress(hue);
    /* 소제목으로 뛸 때 제목 줄 아래에 내려앉도록 여백을 더한다 */
    document.documentElement.style.scrollPaddingTop = 'calc(var(--top-h) + 16px + 40px)';
    update();
  }
  function detach() {
    state = null; curId = null; shown = false;
    tintProgress(null);
    document.documentElement.style.scrollPaddingTop = '';
    if (!bar) return;
    closeMenu(false); bar.classList.remove('stk-on'); bar.hidden = true;
  }
  window.addEventListener('jhb:article', function (e) { attach(e.detail); });
  window.addEventListener('jhb:page', function (e) { if (!e.detail || e.detail.kind !== 'a') detach(); });

  JHB.ui = JHB.ui || {};
  JHB.ui.sticky = { update: update, openToc: openMenu, close: function () { closeMenu(true); } };
})();
