/* 조현병 백과 · 읽기 모듈(js/ui/reading.js)
   1) 요약으로 보기 | 전체 보기 — core 소절만 보이고 detail 소절은 제목만 남겨 접는다. 선택은 'jhb.ui.reading.mode' 에 저장.
      첫 소절은 늘 core(앱이 data-key 를 달고, 여기서도 한 번 더 지킨다). '위기'·'응급' 태그 글은 요약 모드를 무시하고
      늘 전체를 보인다(스위치 없음, 요약 모드일 때만 "이 글은 늘 전체를 보여 줘요" 한 줄).
   2) 읽던 자리 — 문서를 떠날 때 스크롤 비율을 'jhb.ui.reading.pos' 에 저장하고, 7일 안에 다시 열면 그 자리로 돌아간다.
      기록 쉼(JHB.app.privacy.paused())이면 저장하지 않는다. 주소에 소절 조각(a/<slug>/#h-3)이 있으면 되돌리지 않는다(앱이 그 소절로 옮김).
   3) JHB.ui.reading.reveal(id) — 그 id 의 소절(또는 소절 안 요소)이 접혀 있으면 펼친다(다른 모듈의 차례 이동용).
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

  /* 위기 연락처(109·1577-0199·119·112·1393)가 든 소절은 늘 core(앱이 data-key 를 달지만 여기서도 한 번 더 지킨다) */
  function hasContact(nodes) {
    const C = window.JHB && JHB.crisis;
    if (!(C && C.hasContact)) return false;
    return nodes.some(function (n) { return C.hasContact(n.outerHTML || n.textContent || ''); });
  }
  function collect(body) {
    const sections = [];
    let sec = null;
    Array.prototype.slice.call(body.children).forEach(function (n) {
      if (n.tagName === 'H2') { sec = { h: n, key: sections.length === 0 ? 'core' : (n.getAttribute('data-key') || 'detail'), nodes: [], open: false }; sections.push(sec); }
      else if (sec) sec.nodes.push(n);
    });
    sections.forEach(function (s) { if (s.key !== 'core' && hasContact(s.nodes)) s.key = 'core'; });
    return sections;
  }
  function paused() { return !!(A.privacy && typeof A.privacy.paused === 'function' && A.privacy.paused()); }
  const ALWAYS_FULL_TAGS = ['위기', '응급'];

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
    reveal(a.getAttribute('href').split('#')[1]);
  }, true);

  function tagsOf(detail) {
    const t = (detail.meta && detail.meta.tags) || (detail.article && detail.article.tags) || [];
    return Array.isArray(t) ? t : [];
  }
  function mountSwitch(detail) {
    const body = detail.body;
    if (!body || body.getAttribute('data-rd')) return;
    body.setAttribute('data-rd', '1');
    /* 위기·응급 글은 요약 모드를 무시하고 늘 전체(스위치 없음). 요약 모드를 쓰는 사람에게만 왜인지 한 줄 */
    if (tagsOf(detail).some(function (t) { return ALWAYS_FULL_TAGS.indexOf(t) >= 0; })) {
      cur = null;
      const head0 = body.parentNode && body.parentNode.querySelector('.doc-head');
      if (head0 && mode() === 'summary') head0.insertAdjacentElement('afterend', el('div.rd-bar.rd-always', null, [el('p.rd-notice', null, ['이 글은 늘 전체를 보여 줘요.'])]));
      return;
    }
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
    if (!curSlug || paused()) return; /* 기록 쉼이면 읽던 자리를 남기지 않는다 */
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
  /* 주소의 조각(#h-3, #sources 처럼)이 문서 화면 안의 요소를 가리키면 true.
     그때는 앱(js/app.js)이 그 자리로 옮기니, 읽던 자리로 되돌리지 않고 "읽던 자리로 돌아왔어요" 알림도 띄우지 않는다 */
  function hashInDoc() {
    return idInDoc(location.hash);
  }
  /* '#h-3' 같은 조각이 문서 화면 안의 요소를 가리키면 true(옛 해시 주소 '#/…'는 아님) */
  function idInDoc(hash) {
    const h = String(hash || '');
    if (h.length < 2 || h.charAt(0) !== '#' || h.charAt(1) === '/') return false;
    let id = h.slice(1);
    try { id = decodeURIComponent(id); } catch (e) { }
    const n = id && document.getElementById(id);
    const main = A.main || document.getElementById('app');
    return !!(n && main && main.contains(n));
  }
  /* 같은 문서 안의 소절(#h-N 등)로 옮기면 이미 원하는 자리라서 "읽던 자리로 돌아왔어요" 알림을 감춘다.
     남겨 두면 그 알림의 "처음부터 보기"가 맨 위로 보내고 읽던 자리 기록을 지울 수 있어서.
     - 주소창·다른 화면에서 온 소절 주소: hashchange
     - 왼쪽 목차·본문 차례(js/app.js jumpTo)·따라오는 제목 줄 차례(sticky)·출처 링크: 기본 동작을 막고 옮겨서 hashchange 가 없음.
       그래서 문서 안 '#…' 링크 클릭을 따로 듣는다(잡는 단계라 링크 쪽이 이벤트를 멈춰도 받음) */
  window.addEventListener('hashchange', function () {
    if (hashInDoc()) hideResume();
  });
  document.addEventListener('click', function (e) {
    if (!resumeEl) return;
    const a = e.target && e.target.closest && e.target.closest('a[href^="#"]:not([href^="#/"])');
    if (a && idInDoc(a.getAttribute('href'))) hideResume();
  }, true);
  function restorePos(slug) {
    if (hashInDoc()) return;
    const rec = allPos()[slug];
    if (!rec || typeof rec.y !== 'number' || rec.y < MIN_Y) return;
    if (!rec.at || Date.now() - rec.at > MAX_AGE) return;
    /* 다른 모듈의 스크롤 처리(show() 의 scrollTo(0,0) 등)가 끝난 뒤에 */
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      if (curSlug !== slug || hashInDoc()) return;
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
      /* 앱이 그린 본문(소제목에 data-key 가 있음)만. 정적 HTML 본문(배포 직후 옛 캐시로 남겨 둔 것 등)에는 스위치를 달지 않는다 */
      /* 글 정보(태그)를 함께 넘겨야 위기·응급 글 예외(늘 전체)가 이 길에서도 같다 */
      if (body && !body.getAttribute('data-rd') && body.querySelector('h2[data-key]')) { mountSwitch({ body: body, article: A.bySlug && A.bySlug[curSlug] }); restorePos(curSlug); }
    }
  })();

  /* 그 id 의 소절(제목 h2 이거나 소절 안 요소)이 요약 모드로 접혀 있으면 펼친다. 펼쳤거나 이미 보이면 true */
  function reveal(id) {
    if (!cur || !id) return false;
    const target = document.getElementById(String(id).replace(/^#/, ''));
    if (!target || !cur.body.contains(target)) return false;
    let sec = null;
    cur.sections.forEach(function (s) { if (s.h === target || s.nodes.some(function (n) { return n === target || n.contains(target); })) sec = s; });
    if (!sec) return false;
    if (sec.key !== 'core' && cur.body.classList.contains('rd-summary') && !sec.open) { setSectionOpen(sec, true); layoutChanged(); }
    return true;
  }

  JHB.ui = JHB.ui || {};
  JHB.ui.reading = { mode: mode, setMode: choose, savePos: savePos, reveal: reveal };
})();
