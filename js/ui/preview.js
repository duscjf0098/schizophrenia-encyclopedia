/* 조현병 백과 · 링크 미리보기 (js/ui/preview.js)
   본문·함께 읽기·가리키는 문서·목차·문서 행·색인의 내부 문서 링크(a/<slug>/)에
   마우스를 400ms 올리거나, 키보드 포커스가 400ms 머물거나, 휴대폰에서 500ms 길게 누르면
   분류 색 막대 + 제목 + 요약 + 근거 배지 + 읽음 표시가 담긴 작은 카드가 떠요. 한 번에 하나만.
   공용 팝오버(#pop)가 열려 있으면 띄우지 않아요. app.js 는 고치지 않아요. */
(function () {
  if (!window.JHB || !JHB.app) return;
  var A = JHB.app, el = A.el;
  var HOVER_MS = 400, FOCUS_MS = 400, TOUCH_MS = 500, LEAVE_MS = 120;
  var SCOPE = '.body, .see-also, .backlinks, .nav-docs, .rows .row, .index-sec';
  var pop = document.getElementById('pop');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  var card = el('div.pv', { id: 'pv-card', role: 'tooltip', hidden: true });
  document.body.appendChild(card);

  var cur = null, showTimer = 0, hideTimer = 0, touchTimer = 0, touchLink = null, touchShown = false, lastSlug = null;

  function slugOf(a) {
    var href = a.getAttribute('href') || '';
    if (!href || /^(https?:)?\/\//i.test(href) && a.host !== location.host) return null;
    if (/^(mailto|tel|javascript):/i.test(href)) return null;
    var m = /^#\/a\/([^\/?#]+)\/?$/.exec(href);
    if (m) return m[1];
    var path = (a.pathname || '');
    m = /\/a\/([^\/]+)\/$/.exec(path);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function linkFrom(t) {
    if (!t || t.nodeType !== 1) return null;
    var a = t.closest('a[href]');
    if (!a || !a.closest(SCOPE)) return null;
    if (a.closest('#pv-card')) return null;
    if (a.closest('.doc-head')) return null;
    var slug = slugOf(a);
    if (!slug || !A.bySlug[slug]) return null;
    /* 지금 보는 문서 자신은 건너뛴다 */
    var w = A.where();
    if (w.path[0] === 'a' && w.path[1] === slug) return null;
    return { a: a, slug: slug };
  }

  function build(slug) {
    var art = A.bySlug[slug], sec = A.secById[art.section] || {};
    var ev = art.evidence ? el('span.pv-ev.ev', { class: 'ev-' + art.evidence }, [((JHB.EVIDENCE || {})[art.evidence] || {}).label || art.evidence]) : null;
    var read = (A.progress && A.progress.isRead(slug)) ? el('span.pv-read', null, ['읽음']) : null;
    var mins = art.minutes ? el('span.pv-min', null, [art.minutes + '분']) : null;
    card.innerHTML = '';
    card.appendChild(el('div.pv-top', null, [A.spine(sec), el('span.pv-sec', null, [sec.title || '']), mins]));
    card.appendChild(el('div.pv-title', null, [art.title]));
    if (art.summary) card.appendChild(el('p.pv-sum', null, [art.summary]));
    if (ev || read) card.appendChild(el('div.pv-meta', null, [ev, read]));
  }

  function place(a) {
    var r = a.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var w = card.offsetWidth, h = card.offsetHeight, gap = 8, pad = 12;
    var left = r.left + Math.min(r.width, 320) / 2 - w / 2;
    left = Math.max(pad, Math.min(left, vw - w - pad));
    var below = r.bottom + gap, above = r.top - gap - h;
    var top;
    if (below + h + pad <= vh) { top = below; card.setAttribute('data-side', 'below'); }
    else if (above >= pad) { top = above; card.setAttribute('data-side', 'above'); }
    else { top = Math.max(pad, Math.min(below, vh - h - pad)); card.setAttribute('data-side', 'below'); }
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
  }

  function show(a, slug) {
    if (pop && !pop.hidden) return;
    if (!document.contains(a)) return;
    cur = a;
    if (lastSlug !== slug) { build(slug); lastSlug = slug; }
    card.hidden = false;
    card.classList.remove('pv-in');
    place(a);
    if (!(reduce && reduce.matches)) { void card.offsetWidth; card.classList.add('pv-in'); }
    a.setAttribute('aria-describedby', 'pv-card');
  }
  function hide() {
    clearTimeout(showTimer); clearTimeout(hideTimer); showTimer = hideTimer = 0;
    if (cur) cur.removeAttribute('aria-describedby');
    cur = null; touchShown = false;
    if (!card.hidden) { card.hidden = true; card.classList.remove('pv-in'); }
  }
  function schedule(a, slug, ms) {
    clearTimeout(showTimer); clearTimeout(hideTimer); hideTimer = 0;
    if (cur === a && !card.hidden) return;
    showTimer = setTimeout(function () { showTimer = 0; show(a, slug); }, ms);
  }
  function scheduleHide() {
    clearTimeout(showTimer); showTimer = 0;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { hideTimer = 0; hide(); }, LEAVE_MS);
  }

  /* 마우스 */
  document.addEventListener('mouseover', function (e) {
    if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
    if (card.contains(e.target)) { clearTimeout(hideTimer); hideTimer = 0; return; }
    var L = linkFrom(e.target);
    if (L) schedule(L.a, L.slug, HOVER_MS);
    else if (cur || showTimer) scheduleHide();
  });
  document.addEventListener('mouseout', function (e) {
    var to = e.relatedTarget;
    if (to && (card.contains(to) || (cur && cur.contains(to)))) return;
    var L = linkFrom(e.target);
    if (L || card.contains(e.target)) scheduleHide();
  });

  /* 키보드 포커스 */
  document.addEventListener('focusin', function (e) {
    var L = linkFrom(e.target);
    if (L) schedule(L.a, L.slug, FOCUS_MS);
    else if (!card.contains(e.target)) hide();
  });
  document.addEventListener('focusout', function (e) {
    if (linkFrom(e.target)) scheduleHide();
  });

  /* 휴대폰 길게 누르기 */
  function cancelTouch() { clearTimeout(touchTimer); touchTimer = 0; touchLink = null; }
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { cancelTouch(); return; }
    var t = e.target;
    if (card.contains(t)) return;
    var L = linkFrom(t);
    if (!L) { if (!card.hidden) hide(); cancelTouch(); return; }
    cancelTouch();
    touchLink = L.a; touchShown = false;
    touchTimer = setTimeout(function () {
      touchTimer = 0;
      if (touchLink === L.a) { show(L.a, L.slug); touchShown = !card.hidden; }
    }, TOUCH_MS);
  }, { passive: true });
  document.addEventListener('touchmove', function () { if (touchTimer) cancelTouch(); }, { passive: true });
  document.addEventListener('touchcancel', function () { cancelTouch(); }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (touchTimer) { cancelTouch(); return; }
    if (touchShown && touchLink && (touchLink === e.target || touchLink.contains(e.target))) {
      /* 길게 눌러 카드를 띄웠으면 손을 떼도 이동하지 않는다 */
      e.preventDefault();
      touchShown = false;
    }
    touchLink = null;
  }, { passive: false });
  document.addEventListener('contextmenu', function (e) {
    if (!card.hidden && cur && (cur === e.target || cur.contains(e.target)) && touchLink === cur) e.preventDefault();
  });

  /* 닫는 상황 */
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !card.hidden) hide(); });
  document.addEventListener('scroll', function () { if (!card.hidden) hide(); }, { passive: true, capture: true });
  window.addEventListener('resize', hide);
  window.addEventListener('jhb:page', hide);
  window.addEventListener('jhb:layout', hide);
  document.addEventListener('click', function (e) { if (!card.contains(e.target)) hide(); }, true);
  /* 공용 팝오버가 열리면 미리보기는 비운다 */
  if (pop && window.MutationObserver) new MutationObserver(function () { if (!pop.hidden) hide(); }).observe(pop, { attributes: true, attributeFilter: ['hidden'] });

  JHB.ui = JHB.ui || {};
  JHB.ui.preview = { hide: hide, isOpen: function () { return !card.hidden; } };
})();
