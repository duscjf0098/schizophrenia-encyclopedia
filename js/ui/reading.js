/* 조현병 백과 · 읽기 모듈(js/ui/reading.js)
   1) 요약으로 보기 | 전체 보기 — core 소절만 보이고 detail 소절은 제목만 남겨 접는다. 선택은 'jhb.ui.reading.mode' 에 저장.
   2) 읽던 자리 — 문서를 떠날 때 스크롤 비율을 'jhb.ui.reading.pos' 에 저장하고, 7일 안에 다시 열면 그 자리로 돌아간다.
   앱 본체는 고치지 않고 jhb:page / jhb:article 이벤트로만 붙는다. */
(function () {
  if (!window.JHB || !JHB.app) return;
  const A = JHB.app, el = A.el, store = A.store;
  const KEY_MODE = 'jhb.ui.reading.mode', KEY_POS = 'jhb.ui.reading.pos';
  const MAX_POS = 50, MAX_AGE = 7 * 24 * 60 * 60 * 1000, MIN_Y = 0.1;
  const ALWAYS = '.callout-crisis, .callout-warn';

  function mode() { const m = store.get(KEY_MODE, 'full'); return m === 'summary' ? 'summary' : 'full'; }
  function layoutChanged() { window.dispatchEvent(new Event('jhb:layout')); }
  function reduced() { return document.documentElement.getAttribute('data-motion') === 'reduce' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

  /* ---------- 요약/전체 ---------- */
  let cur = null; /* { body, sections:[{h, nodes, open}], switchEl, notice } */

  function collect(body) {
    const sections = [];
    let sec = null;
    Array.prototype.slice.call(body.children).forEach(function (n) {
      if (n.tagName === 'H2') { sec = { h: n, key: n.getAttribute('data-key') || 'detail', nodes: [], open: false }; sections.push(sec); }
      else if (sec) sec.nodes.push(n);
    });
    return sections;
  }

  function setSectionOpen(sec, open) {
    sec.open = open;
    sec.h.setAttribute('aria-expanded', open ? 'true' : 'false');
    sec.h.classList.toggle('rd-open', open);
    sec.nodes.forEach(function (n) {
      if (n.matches(ALWAYS)) { n.classList.remove('rd-hidden'); return; }
      n.classList.toggle('rd-hidden', !open);
    });
  }

  function applyMode(m, announce) {
    if (!cur) return;
    const summary = m === 'summary';
    cur.body.classList.toggle('rd-summary', summary);
    cur.sections.forEach(function (sec) {
      const h = sec.h;
      if (sec.key === 'core') return; /* core 는 늘 보인다 */
      if (summary) {
        h.classList.add('rd-fold');
        h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0');
        setSectionOpen(sec, false);
      } else {
        h.classList.remove('rd-fold', 'rd-open');
        h.removeAttribute('role'); h.removeAttribute('tabindex'); h.removeAttribute('aria-expanded');
        sec.nodes.forEach(function (n) { n.classList.remove('rd-hidden'); });
      }
    });
    cur.notice.hidden = !summary;
    Array.prototype.forEach.call(cur.switchEl.querySelectorAll('[role="radio"]'), function (b) {
      const on = b.getAttribute('data-mode') === m;
      b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
    });
    if (announce) {
      const folded = cur.sections.filter(function (s) { return s.key !== 'core'; }).length;
      A.announce(summary ? '요약으로 보고 있어요. 소절 ' + folded + '개를 접었어요. 제목을 누르면 펼쳐져요.' : '전체를 보고 있어요.');
    }
    layoutChanged();
  }

  function choose(m) { store.set(KEY_MODE, m); applyMode(m, true); }

  function buildSwitch() {
    const btn = function (m, label) {
      const b = el('button.rd-seg', { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-mode': m }, [label]);
      b.addEventListener('click', function () { choose(m); });
      return b;
    };
    const g = el('div.rd-switch', { role: 'radiogroup', 'aria-label': '보기 방식' }, [btn('summary', '요약으로 보기'), btn('full', '전체 보기')]);
    g.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const items = Array.prototype.slice.call(g.querySelectorAll('[role="radio"]'));
      const i = items.indexOf(document.activeElement);
      const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
      const next = items[(Math.max(i, 0) + dir + items.length) % items.length];
      next.focus(); choose(next.getAttribute('data-mode'));
    });
    return g;
  }

  function onHeadActivate(e) {
    if (!cur) return;
    const h = e.target.closest && e.target.closest('h2.rd-fold');
    if (!h || !cur.body.contains(h)) return;
    if (e.type === 'keydown') { if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); }
    const sec = cur.sections.filter(function (s) { return s.h === h; })[0];
    if (!sec) return;
    setSectionOpen(sec, !sec.open);
    layoutChanged();
  }
  document.addEventListener('click', onHeadActivate);
  document.addEventListener('keydown', onHeadActivate);

  /* 차례에서 접힌 소절로 뛰어가면 그 소절을 펼친다 */
  document.addEventListener('click', function (e) {
    if (!cur || !cur.body.classList.contains('rd-summary')) return;
    const a = e.target.closest && e.target.closest('a[href*="#h-"]');
    if (!a) return;
    const id = a.getAttribute('href').split('#')[1];
    const target = id && document.getElementById(id);
    if (!target || !cur.body.contains(target)) return;
    let sec = null;
    cur.sections.forEach(function (s) { if (s.h === target || s.nodes.indexOf(target) >= 0) sec = s; });
    if (sec && sec.key !== 'core' && !sec.open) { setSectionOpen(sec, true); layoutChanged(); }
  }, true);

  function mountSwitch(detail) {
    const body = detail.body;
    if (!body || body.getAttribute('data-rd')) return;
    body.setAttribute('data-rd', '1');
    const sections = collect(body);
    const hasCore = sections.some(function (s) { return s.key === 'core'; });
    const hasDetail = sections.some(function (s) { return s.key !== 'core'; });
    if (!hasCore || !hasDetail) { cur = null; return; } /* 요약할 게 없으면 스위치를 숨긴다 */
    const head = body.parentNode.querySelector('.doc-head');
    if (!head) { cur = null; return; }
    const switchEl = buildSwitch();
    const notice = el('p.rd-notice', { hidden: true }, ['요약만 보고 있어요. 전체 보기로 바꾸면 연구와 세부 설명이 나와요.']);
    const wrap = el('div.rd-bar', null, [switchEl, notice]);
    head.insertAdjacentElement('afterend', wrap);
    cur = { body: body, sections: sections, switchEl: switchEl, notice: notice };
    applyMode(mode(), false);
  }

  /* ---------- 읽던 자리 ---------- */
  let curSlug = null, scrollTimer = null, resumeEl = null;

  function allPos() { const p = store.get(KEY_POS, {}); return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {}; }
  function ratio() {
    const d = document.documentElement;
    const max = d.scrollHeight - window.innerHeight;
    if (max < 200) return null; /* 짧은 문서는 기억할 게 없다 */
    return Math.max(0, Math.min(1, window.scrollY / max));
  }
  function savePos() {
    if (!curSlug) return;
    const y = ratio();
    if (y == null) return;
    const p = allPos();
    p[curSlug] = { y: Math.round(y * 1000) / 1000, at: Date.now() };
    const keys = Object.keys(p).sort(function (a, b) { return (p[b].at || 0) - (p[a].at || 0); });
    keys.slice(MAX_POS).forEach(function (k) { delete p[k]; });
    store.set(KEY_POS, p);
  }
  function forgetPos(slug) { const p = allPos(); if (p[slug]) { delete p[slug]; store.set(KEY_POS, p); } }

  window.addEventListener('scroll', function () { clearTimeout(scrollTimer); scrollTimer = setTimeout(savePos, 500); }, { passive: true });
  window.addEventListener('beforeunload', savePos);
  window.addEventListener('pagehide', savePos);

  function hideResume() { if (resumeEl) { resumeEl.remove(); resumeEl = null; } }
  function showResume(slug) {
    hideResume();
    const top = el('button.rd-resume-top', { type: 'button' }, ['처음부터 보기']);
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      forgetPos(slug); hideResume();
      const h1 = document.querySelector('.doc .page-title'); if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
    });
    const x = el('button.rd-resume-x', { type: 'button', 'aria-label': '알림 닫기' }, ['×']);
    x.addEventListener('click', hideResume);
    resumeEl = el('div.rd-resume', { role: 'status' }, [el('span', null, ['읽던 자리로 돌아왔어요']), el('span.rd-dot', { 'aria-hidden': 'true' }, ['·']), top, x]);
    document.body.appendChild(resumeEl);
    setTimeout(function () { if (resumeEl) resumeEl.classList.add('rd-show'); }, 10);
    setTimeout(hideResume, 9000);
  }
  function restorePos(slug) {
    const rec = allPos()[slug];
    if (!rec || typeof rec.y !== 'number' || rec.y < MIN_Y) return;
    if (!rec.at || Date.now() - rec.at > MAX_AGE) return;
    /* 다른 모듈의 스크롤 처리(show() 의 scrollTo(0,0) 등)가 끝난 뒤에 */
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      if (curSlug !== slug) return;
      const d = document.documentElement;
      const max = d.scrollHeight - window.innerHeight;
      if (max < 200) return;
      window.scrollTo({ top: Math.round(rec.y * max), behavior: 'auto' });
      showResume(slug);
    }); });
  }

  /* ---------- 이벤트 ---------- */
  window.addEventListener('jhb:page', function (e) {
    const d = e.detail || {};
    hideResume();
    clearTimeout(scrollTimer);
    curSlug = d.kind === 'a' && d.id ? d.id : null;
    if (!curSlug) cur = null;
  });
  window.addEventListener('jhb:article', function (e) {
    const d = e.detail || {};
    curSlug = d.slug || curSlug;
    mountSwitch(d);
    restorePos(d.slug);
  });
  /* 모듈이 늦게 실행돼 첫 이벤트를 놓친 경우 */
  (function init() {
    const w = A.where();
    if (w.path[0] === 'a' && w.path[1]) {
      curSlug = w.path[1];
      const body = document.querySelector('#app .doc .body');
      if (body && !body.getAttribute('data-rd')) { mountSwitch({ body: body }); restorePos(curSlug); }
    }
  })();

  JHB.ui = JHB.ui || {};
  JHB.ui.reading = { mode: mode, setMode: choose, savePos: savePos };
})();
