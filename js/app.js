/* 조현병 백과 · 라우터와 화면
   경로(실제 페이지): ./ 첫 화면, s/<섹션id>/, a/<slug>/, fav/, glossary/?t=, about/, random/,
   그리고 특집 화면 <id>/ (data/pages/<id>.json 선언 → data/pages.js 의 JHB.pages, 코드는 js/pages/<id>.js 가 registerPage).
   찾기(search/)도 특집 화면이에요. 검색어는 주소에 싣지 않고 goSearch() 가 sessionStorage 로 한 번만 넘겨요.
   각 페이지의 <html data-base data-route> 로 현재 위치를 안다. 화면에서 쓰는 '#/…' 링크는 실제 경로로 바꿔 끼운다.
   공개 API(JHB.app)와 이벤트 규칙은 docs/UI모듈가이드.md
   node(빌드·시험)에서 require 하면 화면을 건드리지 않고 문서 마크업 순수 함수(docKit)와 검색어 넘기기 규칙(handoff)만 내보낸다
   (tools/build-pages.cjs 가 같은 docHtml 로 정적 문서를 그려서, 정적 본문을 살린 화면과 앱이 그린 화면이 같은 DOM 이 된다). */
(function () {
  if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) {
    module.exports = Object.assign(docKit(require('./md.js'), require('./paths.js')), { handoff: handoffKit });
    return;
  }
  const U = JHB.util, el = U.el, esc = U.esc, md = JHB.md, P = JHB.paths;
  const DK = docKit(md, P);
  const BASE = document.documentElement.getAttribute('data-base') || '';
  function L(h) { return P.link(h, BASE); }
  function go(h) { location.href = L(h); }
  /* 화면에 새로 붙는 '#/…' 링크를 실제 경로로 바꾼다 */
  function fixLinks(n) {
    if (!n || n.nodeType !== 1) return;
    if (n.matches('a[href^="#/"]')) n.setAttribute('href', L(n.getAttribute('href')));
    U.qsa('a[href^="#/"]', n).forEach(function (a) { a.setAttribute('href', L(a.getAttribute('href'))); });
  }
  /* 이미 열린 페이지에서 옛 해시 주소(#/…)로 바뀌면 새 주소로 옮긴다.
     같은 화면 안의 id(#h-3 등)로 바뀌면 접힌 소절을 펴고 그 자리로(주소창·뒤로 가기·다른 모듈의 링크) */
  window.addEventListener('hashchange', function () {
    if (location.hash.indexOf('#/') === 0) { location.replace(L(location.hash)); return; }
    scrollToHash();
  });
  new MutationObserver(function (muts) { muts.forEach(function (m) { m.addedNodes.forEach(fixLinks); }); }).observe(document.body, { childList: true, subtree: true });
  const app = U.qs('#app');
  const nav = U.qs('#sidenav');
  const sections = JHB.sections;
  const articles = (JHB.toc && JHB.toc.articles) || [];
  const glossary = JHB.glossary || [];
  const bySlug = {}; articles.forEach(function (a) { bySlug[a.slug] = a; });
  const secById = {}; sections.forEach(function (s) { secById[s.id] = s; });
  const termByName = {}; glossary.forEach(function (g) { termByName[g.term] = g; });
  const cache = {};
  let searchIndex = null;
  /* 선택 모듈: 파일이 없어도 앱은 동작한다 */
  const PRG = JHB.progress || {};
  const PROG = PRG.create ? PRG.create(U.store) : null;
  const COURSES = (Array.isArray(JHB.courses) ? JHB.courses : []).filter(function (c) { return c && typeof c.id === 'string' && Array.isArray(c.steps); });
  /* 문서 링크 지도(data/links.js)는 모든 화면에 싣지 않는다(T11): 정적 문서 페이지만 앱 뒤에 싣고, 앱이 문서를 새로 그릴 때(app-shell 등)는 needLinks() 로 받는다.
     그래서 값은 늘 지금 것을 읽는다(JHB.app.links 도 getter, 아직 없으면 null) */
  function linksNow() { return JHB.links || null; }
  function needLinks() {
    if (JHB.links) return Promise.resolve(JHB.links);
    return load('data/links.js').then(function () { return linksNow(); }).catch(function () { return null; });
  }
  /* 원형이 없는 색인: ?course=__proto__·toString 같은 이름으로 엉뚱한 값을 집지 않게(js/progress.js 의 courseMap·getCourse) */
  const courseById = Object.create(null); COURSES.forEach(function (c) { courseById[c.id] = c; });
  function getCourse(id) {
    if (PRG.getCourse) return PRG.getCourse(courseById, id);
    return typeof id === 'string' && Object.prototype.hasOwnProperty.call(courseById, id) ? courseById[id] : null;
  }
  function whoText(who) { return PRG.whoText ? PRG.whoText(who) : (who ? who + '에게' : ''); }
  function isSensitive(a) { return PRG.isSensitive ? PRG.isSensitive(a) : (a.tags || []).some(function (t) { return t === '위기' || t === '응급'; }); }
  /* 특집 화면 선언(data/pages.js). 없어도 앱은 동작한다 */
  const PAGES = Array.isArray(JHB.pages) ? JHB.pages.filter(function (d) { return d && typeof d.id === 'string'; }) : [];
  const pageById = {}; PAGES.forEach(function (d) { pageById[d.id] = d; });
  function readMark(slug) { return PROG && PROG.isRead(slug) ? el('span.read-mark', null, ['읽음']) : null; }
  function courseProgress(c) { return PROG ? PROG.courseProgress(c) : { read: 0, total: c.steps.length, pct: 0, next: c.steps[0] }; }
  function bar(pct, label) { return el('div', null, [el('div.bar', { role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, [el('i', { style: 'width:' + pct + '%' })]), label ? el('div.bar-label', null, label) : null]); }
  let pageCleanup = [];

  /* 분류의 글(순서대로). 정렬 규칙은 js/paths.js 의 sectionArticles 한 곳(빌드와 같은 규칙).
     배포 직후 옛 캐시의 paths.js 라 그 함수가 없으면 목록 순서(목차가 이미 분류·순서대로)만 지킨다 */
  function sectionArticles(id) {
    if (P.sectionArticles) return P.sectionArticles(articles, id);
    return articles.filter(function (a) { return String(a.section) === String(id); });
  }
  function spine(s) { return el('span.spine', { style: '--h:' + ((s && s.hue) || 250), 'aria-hidden': 'true' }); }
  function ev(a) { return a.evidence ? el('span.ev', { class: 'ev-' + a.evidence, title: (JHB.EVIDENCE[a.evidence] || {}).desc || '' }, [(JHB.EVIDENCE[a.evidence] || {}).label || a.evidence]) : null; }
  function setTitle(t) { document.title = t ? t + ' - 조현병 백과' : '조현병 백과'; }

  /* ---------- 설정 ---------- */
  function favs() { return U.store.get('jhb.fav', []); }
  function isFav(slug) { return favs().indexOf(slug) >= 0; }
  function toggleFav(slug) {
    const f = favs(); const i = f.indexOf(slug);
    if (i >= 0) f.splice(i, 1); else f.unshift(slug);
    U.store.set('jhb.fav', f);
    window.dispatchEvent(new CustomEvent('jhb:fav', { detail: { slug: slug, on: i < 0 } }));
    return i < 0;
  }

  /* ---------- 기기 안 기록(개인정보) ----------
     기록 종류를 등록해 두면 내 서재 같은 화면이 한곳에서 보여 주고 지울 수 있다.
     기록 쉼(paused)이면 코어는 읽음 표시(jhb.read)와 최근 읽은 글(jhb.recent)을 쓰지 않는다. */
  const PRIV_PREFIX = 'jhb.privacy.';
  const Q_CLEARED_KEY = 'jhb.q.cleared'; /* sessionStorage: 최근 검색을 지운 시각(검색어는 아님) */
  const privKinds = [];
  function lsKeys() {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k != null) out.push(k); } } catch (e) { }
    return out;
  }
  function ssRemove(k) { try { sessionStorage.removeItem(k); } catch (e) { } }
  function ssHas(k) { try { return sessionStorage.getItem(k) != null; } catch (e) { return false; } }
  function lsHas(k) { try { return localStorage.getItem(k) != null; } catch (e) { return false; } }
  function privRegister(kind) {
    if (!kind || typeof kind.id !== 'string' || !kind.id) return null;
    const k = {
      id: kind.id, label: String(kind.label || kind.id),
      keys: (kind.keys || []).filter(function (x) { return typeof x === 'string' && x; }),
      session: (kind.session || []).filter(function (x) { return typeof x === 'string' && x; })
    };
    const i = privKinds.findIndex(function (x) { return x.id === k.id; });
    if (i >= 0) privKinds[i] = k; else privKinds.push(k);
    return k;
  }
  function copyKind(k) { return { id: k.id, label: k.label, keys: k.keys.slice(), session: k.session.slice() }; }
  /* 'all' 글자일 때만 전부 지운다. 인자를 빠뜨리면(undefined·null·빈 값) 아무것도 지우지 않는다.
     'all' 은 jhb.privacy.* 설정도 지우지만(등록되지 않은 것 포함) 기록 쉼(paused)은 남긴다: "전부 지우기"를 눌렀는데
     아무 안내 없이 기록이 다시 시작되면 사용자가 기대한 것과 반대라서(0A 뒤 점검). 최근 검색 저장(recentq)은 꺼진다(기본값).
     opts.keep: 남길 종류 id 목록(예: clear('all', { keep: ['settings'] }) = 보기 설정만 남기고 전부). 남기는 종류의 키는 지우지 않는다.
     계획은 js/progress.js 의 planClear(테스트 tests/core.test.cjs).
     jhb:privacy detail: keep 이 없으면 예전 그대로 { action:'clear', ids: 'all' | [지운 id] },
     keep 이 있으면 ids 는 실제로 지운 id 배열이고 all: true, keep: [...] 가 붙는다(남긴 종류를 'all' 로 오해하지 않게) */
  function privClear(ids, opts) {
    if (ids !== 'all' && (ids == null || ids === '' || (Array.isArray(ids) && !ids.length))) return [];
    const keep = opts && opts.keep != null ? (Array.isArray(opts.keep) ? opts.keep : [opts.keep]).filter(function (x) { return typeof x === 'string'; }) : [];
    const paused = U.store.get(PRIV_PREFIX + 'paused', false) === true;
    let plan;
    if (PRG.planClear) plan = PRG.planClear(privKinds, ids, { keep: keep, paused: paused, lsKeys: ids === 'all' ? lsKeys() : [] });
    else {
      /* progress.js 를 못 받았을 때: 등록된 종류만(남길 종류는 빼고) */
      const want = ids === 'all' ? null : (Array.isArray(ids) ? ids : [ids]);
      plan = { all: ids === 'all', done: [], ls: [], ss: [] };
      privKinds.forEach(function (k) { if (keep.indexOf(k.id) >= 0 || (want && want.indexOf(k.id) < 0)) return; plan.done.push(k.id); plan.ls = plan.ls.concat(k.keys); plan.ss = plan.ss.concat(k.session); });
    }
    const all = plan.all;
    plan.ls.forEach(function (key) { U.store.remove(key); });
    plan.ss.forEach(ssRemove);
    const done = plan.done;
    /* 최근 검색을 지우면 이 탭의 찾기 화면 기록(history.state {q, s, at})도 되살리지 않게 지운 시각을 남긴다.
       다른 기록 항목의 state 는 웹 API 로 지울 수 없어서, 찾기 화면이 이 시각보다 오래된 state 를 버린다(js/pages/search.js) */
    if (all || done.indexOf('recentq') >= 0) { try { sessionStorage.setItem(Q_CLEARED_KEY, String(Date.now())); } catch (e) { } }
    const detail = { action: 'clear', ids: all && !keep.length ? 'all' : done };
    if (all && keep.length) { detail.all = true; detail.keep = keep.slice(); }
    window.dispatchEvent(new CustomEvent('jhb:privacy', { detail: detail }));
    return done;
  }
  /* 기록 쉼을 서비스 워커에 알린다(쉼이면 연 페이지를 캐시에 새로 넣지 않음, sw.js). 워커가 아직 없으면 준비된 뒤에 */
  function tellWorker(paused) {
    try {
      const sw = navigator.serviceWorker;
      if (!sw || location.protocol === 'file:') return;
      const msg = { jhb: 'privacy', paused: !!paused };
      if (sw.controller) sw.controller.postMessage(msg);
      if (sw.ready) sw.ready.then(function (reg) { if (reg && reg.active && reg.active !== sw.controller) reg.active.postMessage(msg); }).catch(function () { });
    } catch (e) { }
  }
  const privacy = {
    paused: function () { return U.store.get(PRIV_PREFIX + 'paused', false) === true; },
    setPaused: function (b) {
      if (b) U.store.set(PRIV_PREFIX + 'paused', true); else U.store.remove(PRIV_PREFIX + 'paused');
      tellWorker(!!b);
      window.dispatchEvent(new CustomEvent('jhb:privacy', { detail: { action: 'paused', value: !!b } }));
    },
    /* 최근 검색 저장은 기본 꺼짐. 끄면 저장해 둔 최근 검색도 지운다 */
    recentq: function () { return U.store.get(PRIV_PREFIX + 'recentq', false) === true; },
    setRecentq: function (b) {
      if (b) U.store.set(PRIV_PREFIX + 'recentq', true);
      else { U.store.remove(PRIV_PREFIX + 'recentq'); privClear(['recentq']); }
      window.dispatchEvent(new CustomEvent('jhb:privacy', { detail: { action: 'recentq', value: !!b } }));
    },
    /* 읽기 전용 복사본(바꿔도 등록 목록은 그대로). 등록은 register() 로만 */
    get kinds() { return privKinds.map(copyKind); },
    register: function (kind) { const k = privRegister(kind); return k ? copyKind(k) : null; },
    /* 그 종류의 기록이 이 기기에 하나라도 있으면 true */
    has: function (id) {
      const k = privKinds.filter(function (x) { return x.id === id; })[0];
      return !!k && (k.keys.some(lsHas) || k.session.some(ssHas));
    },
    clear: privClear
  };
  /* 기본 기록 종류: 어느 화면에서든 등록된다(내 서재에서 이름으로 보이고, 다른 화면의 clear('all') 도 지운다).
     읽은 글(read)에는 들어간 읽기 코스 기록(jhb.course)도 함께 든다(코스 진도·이어서 읽기의 바탕이라서).
     plan: 미리 써 두는 종이(js/pages/plan.js, 저장을 켰을 때만 쓰는 키. K5-1 — 그 화면을 연 페이지에서만 등록되던 것을 모든 화면으로) */
  const BASE_KINDS = [
    { id: 'read', label: '읽은 글', keys: ['jhb.read', 'jhb.course'] },
    { id: 'recent', label: '최근 읽은 글', keys: ['jhb.recent'] },
    { id: 'pos', label: '읽던 자리', keys: ['jhb.ui.reading.pos'] },
    { id: 'recentq', label: '최근 검색', keys: ['jhb.ui.palette.recentq'], session: ['jhb.q'] },
    { id: 'fav', label: '저장한 글', keys: ['jhb.fav'] },
    { id: 'role', label: '역할', keys: ['jhb.ui.home.role'] },
    { id: 'settings', label: '보기 설정', keys: ['jhb.theme', 'jhb.fs', 'jhb.ui.settings', 'jhb.ui.reading.mode', 'jhb.ui.home.installHidden', 'jhb.ui.home.recentHidden'] },
    { id: 'plan', label: '미리 써 두는 종이', keys: ['jhb.ui.plan.keep', 'jhb.ui.plan.data'] }
  ];
  BASE_KINDS.forEach(privRegister);
  function reducedMotion() {
    return document.documentElement.getAttribute('data-motion') === 'reduce' || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function effectiveTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  const live = el('div.sr', { 'aria-live': 'polite', id: 'live' }); document.body.appendChild(live);
  function announce(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
  function themeLabel() { U.qs('#btn-theme').setAttribute('aria-label', effectiveTheme() === 'dark' ? '지금 어두운 화면이에요. 누르면 밝게 바뀌어요' : '지금 밝은 화면이에요. 누르면 어둡게 바뀌어요'); }
  /* 옛 글자 크기 단추(보기 설정 모듈이 없을 때만 보임). 머리 스크립트가 다섯 단계(xl·xxl 포함)를 미리 적용하므로 이름도 다섯 단계 */
  function fsLabel() { const cur = document.documentElement.getAttribute('data-fs') || 'm'; U.qs('#btn-fs').setAttribute('aria-label', '글자 크기: ' + ({ s: '작게', m: '보통', l: '크게', xl: '더 크게', xxl: '아주 크게' }[cur] || '보통') + '. 누르면 다음 크기로 바뀌어요'); }
  themeLabel(); fsLabel();
  U.qs('#btn-theme').addEventListener('click', function () {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    U.store.set('jhb.theme', next);
    themeLabel(); announce(next === 'dark' ? '어두운 화면으로 바꿨어요' : '밝은 화면으로 바꿨어요');
  });
  U.qs('#btn-fs').addEventListener('click', function () {
    const order = ['s', 'm', 'l'];
    const cur = document.documentElement.getAttribute('data-fs') || 'm';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    if (next === 'm') document.documentElement.removeAttribute('data-fs'); else document.documentElement.setAttribute('data-fs', next);
    U.store.set('jhb.fs', next);
    fsLabel(); announce('글자 크기: ' + ({ s: '작게', m: '보통', l: '크게' })[next]);
    window.dispatchEvent(new Event('jhb:layout'));
  });

  /* ---------- 왼쪽 분류 목차 (서랍) ---------- */
  const scrim = U.qs('#scrim'), navBtn = U.qs('#btn-nav');
  let navWasOpen = false;
  function setNav(open) {
    nav.classList.toggle('open', open);
    scrim.hidden = !open;
    navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    const drawer = innerWidth <= 1080;
    if (drawer) { app.inert = open; nav.inert = !open; } else { app.inert = false; nav.inert = false; }
    if (open) { const first = nav.querySelector('a'); if (first) first.focus(); }
    else if (navWasOpen) { navBtn.focus(); }
    navWasOpen = open;
  }
  window.addEventListener('resize', function () { if (innerWidth > 1080) { nav.inert = false; app.inert = false; } else if (!nav.classList.contains('open')) nav.inert = true; });
  navBtn.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
  scrim.addEventListener('click', function () { setNav(false); });

  function drawNav(curSec, curSlug, toc, curPage) {
    nav.innerHTML = '';
    nav.appendChild(el('div.nav-sec', null, [el('a.nav-home', { href: '#/' }, [el('span.brand-name', null, ['조현병 백과']), el('span.n', null, ['첫 화면'])])]));
    nav.appendChild(el('div.nav-head', null, ['분류']));
    sections.forEach(function (s) {
      const open = s.id === curSec;
      const n = s.glossary ? glossary.length : sectionArticles(s.id).length;
      const box = el('div.nav-sec', { class: open ? 'open' : '' }, [
        el('a', { href: s.glossary ? '#/glossary' : '#/s/' + s.id, 'aria-current': open && !curSlug ? 'page' : null }, [spine(s), s.title, el('span.n', null, [(!s.glossary && PROG && PROG.sectionProgress(articles, s.id).read) ? PROG.sectionProgress(articles, s.id).read + '/' + n : String(n)])])
      ]);
      if (open && !s.glossary) {
        const ul = el('ul.nav-docs');
        sectionArticles(s.id).forEach(function (a) {
          const li = el('li', { 'data-slug': a.slug }, [el('a', { href: '#/a/' + a.slug, class: PROG && PROG.isRead(a.slug) && a.slug !== curSlug ? 'read' : '', 'aria-current': a.slug === curSlug ? 'page' : null }, [a.title])]);
          if (a.slug === curSlug && toc && toc.length) li.appendChild(tocList(toc));
          ul.appendChild(li);
        });
        box.appendChild(ul);
      }
      nav.appendChild(box);
    });
    /* 살펴보기: nav 에 "side" 가 있는 특집 화면(묶음별). 내 서재(me)는 아래 줄에 따로 둔다 */
    const side = PAGES.filter(function (d) { return d.id !== 'me' && (d.nav || []).indexOf('side') >= 0; });
    if (side.length) {
      const box = el('div.nav-pages', null, [el('div.nav-head', null, ['살펴보기'])]);
      let group = null;
      side.forEach(function (d) {
        if (d.group !== group) { group = d.group; box.appendChild(el('div.nav-group-h', null, [group || ''])); }
        box.appendChild(el('div.nav-sec', null, [el('a', { href: '#/' + d.id, 'aria-current': curPage === d.id ? 'page' : null }, [d.title])]));
      });
      nav.appendChild(box);
    }
    const me = pageById.me;
    nav.appendChild(el('div.nav-extra', null, [
      el('div.nav-sec', null, [me ? el('a', { href: '#/me', 'aria-current': curPage === 'me' ? 'page' : null }, [me.title]) : el('a', { href: '#/fav' }, ['저장한 문서'])]),
      el('div.nav-sec', null, [el('a', { href: '#/about' }, ['이 백과에 대해'])])
    ]));
    const cur = nav.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }
  function tocList(toc) {
    return el('ul.nav-toc', null, toc.map(function (t) {
      return el('li', null, [el('a', { href: '#' + t.id, class: t.level === 3 ? 'l3' : '', 'data-h': t.id, onclick: jumpTo(t.id) }, [t.text])]);
    }));
  }
  /* 이미 그린 목차의 현재 글 밑에 차례만 끼운다(목차가 없거나 그 글이 없으면 전체를 다시 그림) */
  function navToc(slug, toc) {
    const li = U.qsa('.nav-docs > li[data-slug]', nav).filter(function (n) { return n.getAttribute('data-slug') === slug; })[0];
    if (!li) { const a = bySlug[slug]; return drawNav(a ? a.section : null, slug, toc); }
    U.qsa('.nav-toc', li).forEach(function (n) { n.remove(); });
    if (toc && toc.length) li.appendChild(tocList(toc));
  }
  /* 요약 보기에서 늘 보이는 소절 제목(첫 h2 는 따로 늘 core) */
  const CORE_H2 = /한 문장으로|짧은 답|나에게 의미|할 수 있는 것|주변 사람|담당 의사에게|더 읽을 글|근거 수준|먼저|이 글을 읽는 법|들어가며|어떤 경험인가|무엇인가|바로 연락할 신호|지금 할 일/;
  /* 이 h2 부터 다음 h2 앞까지(소절 본문)에 위기 연락처가 있나(js/crisis.js 의 hasContact) */
  function sectionHasContact(h) {
    if (!(JHB.crisis && JHB.crisis.hasContact)) return false;
    let html = '';
    for (let n = h.nextElementSibling; n && n.tagName !== 'H2'; n = n.nextElementSibling) html += n.outerHTML;
    return JHB.crisis.hasContact(html);
  }
  /* 차례(왼쪽 목차·본문 차례)·출처 수 링크: 소절 주소(scrollToHash)와 같은 길로 옮긴다.
     요약 보기로 접힌 소절이면 먼저 펴고(reading 모듈이 있을 때), 옮긴 뒤 포커스도 그 제목으로(Tab 이 그 소절에서 이어지게).
     "읽던 자리로 돌아왔어요" 알림은 reading 모듈이 이 클릭을 보고 감춘다(hashchange 가 없어서) */
  function jumpTo(id) {
    return function (e) {
      e.preventDefault();
      const R = JHB.ui && JHB.ui.reading;
      if (R && typeof R.reveal === 'function') { try { R.reveal(id); } catch (err) { } }
      const n = document.getElementById(id);
      setNav(false);
      if (!n) return;
      n.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      if (n.tabIndex < 0 && !n.hasAttribute('tabindex')) n.setAttribute('tabindex', '-1');
      try { n.focus({ preventScroll: true }); } catch (err) { }
    };
  }

  /* ---------- 라우팅 ---------- */
  function where() {
    const path = (document.documentElement.getAttribute('data-route') || '').split('/').filter(Boolean);
    /* 잘못된 % 주소(?course=%)에도 던지지 않는다(js/paths.js 의 parseQuery, 테스트는 tests/paths.test.cjs) */
    return { path: path, query: P.parseQuery(location.search) };
  }
  /* opts.silent: jhb:page 를 보내지 않음(특집 화면의 "불러오고 있어요" 자리 문구)
     opts.loading: jhb:page 의 detail 에 loading:true(문서 화면의 "불러오고 있어요" 자리 문구. 실제 문서를 그리면 한 번 더 옴) */
  function show(nodes, opts) {
    const fns = pageCleanup; pageCleanup = [];
    fns.forEach(function (f) { try { f(); } catch (e) { setTimeout(function () { throw e; }); } });
    curSlots = null;
    closePop(false, { nav: true }); /* 옛 화면의 anchor 로 포커스를 돌리지 않음(K5-2) */
    app.innerHTML = '';
    (nodes || []).forEach(function (n) { if (n) app.appendChild(n); });
    /* 주소의 조각(about/#privacy, a/<slug>/#h-3)이 화면 안의 id 를 가리키면 맨 위 대신 그 자리로 */
    if (!show.keepScroll && !scrollToHash()) window.scrollTo(0, 0);
    show.keepScroll = false;
    setProgress(0);
    if (opts && opts.silent) return;
    pageEvent(opts);
  }
  /* jhb:page 보내기(show() 와 정적 본문을 그대로 살린 화면이 같이 씀) */
  function pageEvent(opts) {
    const w = where();
    /* 특집 화면은 kind 와 id 가 모두 화면 id(주소에 두 번째 칸이 없어서) */
    const detail = { kind: w.path[0] || 'home', id: w.path[1] || (w.path.length === 1 && hasPage(w.path[0]) ? w.path[0] : null), query: w.query };
    if (opts && opts.loading) detail.loading = true;
    window.dispatchEvent(new CustomEvent('jhb:page', { detail: detail }));
  }
  /* 모듈 스크립트(js/ui/*.js, 앱 뒤의 일반 스크립트)가 모두 실행된 뒤에 한 번. 정적 문서를 살린 화면은 이때 jhb:page·jhb:article 을 보내서
     모듈이 첫 이벤트를 놓치지 않게 한다(앱이 문서를 받아 그리던 때는 받는 동안 모듈이 다 실렸어요) */
  function afterModules(fn) {
    let done = false;
    const run = function () { if (done) return; done = true; fn(); };
    /* 'interactive' 는 DOMContentLoaded 전(defer 스크립트 실행 중)일 수도, 뒤일 수도 있어서 load 도 함께 기다린다(먼저 오는 쪽 한 번) */
    if (document.readyState !== 'complete') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
      window.addEventListener('load', run, { once: true });
    } else setTimeout(run, 0);
  }
  function hasPage(id) { return Object.prototype.hasOwnProperty.call(pageById, id); }
  /* 주소 조각이 가리키는 #app 안의 요소(없으면 null). 옛 해시 주소('#/…')는 아님 */
  function hashTarget() {
    const id = P.fragmentId ? P.fragmentId(location.hash) : null;
    if (!id) return null;
    const n = document.getElementById(id);
    return n && app.contains(n) ? n : null;
  }
  /* 그 자리로 옮긴다. 요약 보기로 접힌 소절이면 먼저 펴고(reading 모듈이 있을 때), 상단 바·따라오는 제목 줄 높이는
     html 의 scroll-padding-top(상단 바, sticky 모듈이 제목 줄만큼 더함)이 반영한다. 옮겼으면 true.
     숨은 요소(hidden 탭 패널 등, 편 뒤에도 상자가 없음)면 옮기지 않고 false(show() 가 맨 위로).
     옮긴 뒤 포커스도 그 자리로(Tab 이 문서 맨 위가 아니라 그 소절에서 시작하게). 이미 그 안에 포커스가 있으면 그대로 */
  function scrollToHash() {
    const n = hashTarget();
    if (!n) return false;
    const R = JHB.ui && JHB.ui.reading;
    if (R && typeof R.reveal === 'function') { try { R.reveal(n.id); } catch (e) { } }
    if (!n.getClientRects().length) return false;
    n.scrollIntoView({ block: 'start' });
    if (!n.contains(document.activeElement)) {
      /* 대상 자체에(제목 안쪽으로 옮기면 페이지를 불러올 때 브라우저의 조각 처리가 포커스를 다시 빼앗음).
         소절을 감싼 section(about/#privacy)의 테두리는 style.css 가 지움 */
      if (n.tabIndex < 0 && !n.hasAttribute('tabindex')) n.setAttribute('tabindex', '-1');
      try { n.focus({ preventScroll: true }); } catch (e) { }
    }
    return true;
  }
  function route() {
    const r = where(), p = r.path;
    setNav(false);
    U.qsa('.tool-link').forEach(function (a) { a.removeAttribute('aria-current'); });
    const tl = U.qs('.tool-link[data-r="' + (p[0] || '') + '"]'); if (tl) tl.setAttribute('aria-current', 'page');
    /* 옛 주소 search/?q=…&s=… : 값은 history.state 로 옮기고 주소에서는 곧바로 지운다(찾기 화면이 state 를 읽음) */
    if (p[0] === 'search' && location.search) {
      /* strict: % 인코딩이 깨진 값(?q=%E0%A4)은 빈 값으로(깨진 원문을 검색어로 넣지 않음) */
      const sq = P.parseQuery(location.search, { strict: true });
      const has = Object.prototype.hasOwnProperty;
      const st = (has.call(sq, 'q') || has.call(sq, 's')) ? { q: String(sq.q || ''), s: String(sq.s || ''), at: Date.now() } : history.state;
      try { history.replaceState(st, '', location.pathname + location.hash); } catch (e) { }
    }
    /* 저장소가 막힌 브라우저에서 goSearch 가 window.name 으로 넘긴 검색어·위기 카드 종류: 찾기 화면이 읽는 history.state 로 옮긴다(다른 화면이면 지우기만) */
    const ho = takeNameHandoff(p[0] === 'search');
    if (ho) { try { history.replaceState(ho, '', location.pathname + location.hash); } catch (e) { } }
    if (!p.length) return home();
    if (p[0] === 's' && p[1]) return section(p[1]);
    if (p[0] === 'a' && p[1]) return article(p[1]);
    if (p[0] === 'fav') return favPage();
    if (p[0] === 'glossary') return glossaryPage();
    if (p[0] === 'about') return about();
    if (p[0] === 'courses') return coursesPage();
    if (p[0] === 'course' && p[1]) return coursePage(p[1]);
    if (p[0] === 'random') { const a = articles[Math.floor(Math.random() * articles.length)]; location.replace(L('#/a/' + a.slug)); return; }
    if (hasPage(p[0])) return featurePage(p[0]);
    /* 배포 직후 옛 캐시의 data/pages.js 에 아직 없는 특집 화면: 정적 내용이 있으면 지우지 않는다 */
    const pre = p.length === 1 ? staticFeatureBody(p[0]) : null;
    if (pre) return keepStatic(pre, '새로 올라온 화면이에요. 새로 고치면 다 보여요.');
    return notFound();
  }

  /* ---------- 배포 직후 옛 캐시 + 새 HTML (T3) ----------
     페이지 이동은 네트워크 먼저라 HTML 은 새것인데, data/toc.js·data/pages.js 는 서비스 워커의 캐시 먼저라 옛것일 수 있다.
     그때 "그런 문서가 없어요"로 정적 본문을 지우지 않고 그대로 둔 채 새로 고치라는 안내를 붙이고, 서비스 워커에 갱신을 부탁한다. */
  function staticFeatureBody(id) {
    return U.qsa('.fp-body[data-page]', app).filter(function (n) { return n.getAttribute('data-page') === id; })[0] || null;
  }
  function requestUpdate() {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistration) {
        navigator.serviceWorker.getRegistration().then(function (reg) { if (reg) return reg.update(); }).catch(function () { });
      }
    } catch (e) { }
  }
  function keepStatic(target, msg) {
    const h1 = U.qs('h1', app);
    setTitle(h1 ? h1.textContent.trim() : '');
    drawNav(null, null, null);
    if (!U.qs('.jhb-stale', app) && target.parentNode) {
      target.parentNode.insertBefore(el('p.notice.jhb-stale', { role: 'status', style: 'margin:16px 0' }, [msg + ' ', reloadBtn()]), target);
    }
    requestUpdate();
  }

  /* ---------- 특집 화면 (data/pages/<id>.json + js/pages/<id>.js + css/pages/<id>.css) ---------- */
  const registered = {};
  /* js/pages/<id>.js 가 실행되면서 부른다(스크립트 onload 보다 먼저) */
  function registerPage(page) {
    if (!page || typeof page.id !== 'string' || !page.id) return false;
    registered[page.id] = page;
    return true;
  }
  /* js·css 를 한 번만 붙인다. src 는 사이트 루트 기준 상대 경로(예: 'js/pages/guide.js') */
  const loading = {};
  function load(src) {
    src = String(src || '');
    if (loading[src]) return loading[src];
    const url = BASE + src;
    let abs = url; try { abs = new URL(url, location.href).href; } catch (e) { }
    const isCss = /\.css(?:[?#]|$)/.test(src), isJs = /\.js(?:[?#]|$)/.test(src);
    loading[src] = new Promise(function (resolve, reject) {
      if (!isCss && !isJs) return reject(new Error('js·css 만 불러올 수 있어요: ' + src));
      const have = U.qsa(isCss ? 'link[rel="stylesheet"][href]' : 'script[src]').filter(function (n) { return (isCss ? n.href : n.src) === abs; })[0];
      if (have) return resolve(have);
      const n = document.createElement(isCss ? 'link' : 'script');
      if (isCss) { n.rel = 'stylesheet'; n.href = url; } else { n.src = url; }
      n.onload = function () { resolve(n); };
      n.onerror = function () { n.remove(); reject(new Error('파일을 받지 못함: ' + src)); };
      document.head.appendChild(n);
    });
    loading[src].catch(function () { delete loading[src]; });
    return loading[src];
  }
  /* data/kb/<name>.json */
  const kbCache = {};
  const kbDone = {}; /* 받은 자료 값(이름 → JSON). revised 고지 날짜가 곧바로 꺼내 써요 */
  function loadData(name) {
    name = String(name || '');
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return Promise.reject(new Error('잘못된 데이터 이름: ' + name));
    if (!kbCache[name]) {
      /* 응답은 왔는데 파일이 없거나(404) JSON 이 깨진 것은 연결 문제가 아니라 자료 문제(reason 'data').
         fetch 자체가 실패한 것(오프라인 등, TypeError)만 'net' */
      kbCache[name] = fetch(BASE + 'data/kb/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw dataError('HTTP ' + r.status + ': data/kb/' + name + '.json');
        return r.json().catch(function () { throw dataError('JSON 오류: data/kb/' + name + '.json'); });
      }).then(function (v) { kbDone[name] = v; return v; }); /* 받은 값을 바로 꺼내 쓸 수 있게(revised 고지 날짜) */
      kbCache[name].catch(function () { delete kbCache[name]; });
    }
    return kbCache[name];
  }
  function crumb(parts) {
    const kids = [];
    (parts || []).forEach(function (p, i) {
      if (i) kids.push(el('span.sep', null, ['/']));
      if (p && typeof p === 'object') kids.push(p.href ? el('a', { href: p.href }, [String(p.text == null ? '' : p.text)]) : String(p.text == null ? '' : p.text));
      else kids.push(String(p == null ? '' : p));
    });
    return el('nav.crumb', { 'aria-label': '위치' }, kids);
  }
  function fromHtml(html) {
    if (!html) return null;
    const t = document.createElement('template'); t.innerHTML = html;
    return t.content.firstElementChild;
  }
  /* 공용 고지 DOM (문구는 js/md.js 의 noticeHtml 과 같다) */
  function notice(kind, arg) { return fromHtml(md.noticeHtml(kind, arg)); }
  /* 고지 날짜(K8): 규칙은 js/progress.js 의 noticeDate 한 곳(빌드 tools/lib/assets.cjs 의 resolveNoticeDate → 정적 고지도 같은 함수).
     - "○○에 확인한 내용"(dated): 선언의 updated(사람이 화면 내용을 원천과 대조해 확인한 날). 자료를 보지 않아요.
     - "○○에 마지막으로 고쳤어요"(revised): 사이트맵과 같은 날. lastmod("kb:<자료>:<날짜 경로>") 자료에서 구한 날짜,
       자료를 아직 못 받았거나 날짜가 없으면 선언의 updated. 자료는 noticeJob 이 그리기 전에 받아 두므로(featurePage) 고지가 그려진 뒤 날짜가 바뀌지 않는다.
     그 밖의 종류는 날짜가 없어요 */
  function noticeDay(d, kind) {
    if (!PRG.noticeDate) return kind === 'dated' || kind === 'revised' ? d.updated : undefined; /* 옛 progress.js 가 캐시에 남은 기기 */
    const ref = PRG.lastmodRef(d.lastmod);
    return PRG.noticeDate(kind, d, ref && Object.prototype.hasOwnProperty.call(kbDone, ref.name) ? kbDone[ref.name] : undefined);
  }
  /* revised 고지에 lastmod 가 있으면 그 자료를 받는 일(실패해도 화면은 그린다: updated 로).
     응답 없이 멈춰도 화면 전체가 10초 시간 초과로 실패하지 않게 NOTICE_WAIT 뒤에는 기다리지 않아요(그 뒤에 와도 이미 그린 날짜는 바꾸지 않음) */
  const NOTICE_WAIT = 3000;
  function noticeJob(d) {
    const ref = PRG.noticeRef ? PRG.noticeRef(d) : null;
    if (!ref) return null;
    let t = 0;
    const give = new Promise(function (res) { t = setTimeout(function () { res(null); }, NOTICE_WAIT); });
    return Promise.race([loadData(ref.name).catch(function () { return null; }), give])
      .then(function (v) { clearTimeout(t); return v; });
  }
  function featureNotices(d) {
    /* 일반 고지는 뺄 수 없고 늘 맨 앞. 위기 줄은 crisisLine 하나로만(notice 의 'crisis' 와 겹쳐 두 번 붙지 않게) */
    const kinds = ['general'].concat((d.notice || []).filter(function (k) { return k !== 'general' && k !== 'crisis'; }));
    const list = kinds.map(function (k) { return notice(k, noticeDay(d, k)); });
    if (d.crisisLine !== false || (d.notice || []).indexOf('crisis') >= 0) list.push(notice('crisis'));
    return el('div.fp-notices', null, list);
  }
  function featureHead(d) {
    return [crumb([{ href: '#/', text: '첫 화면' }, d.title]), el('h1.page-title', null, [d.title]), d.lead ? el('p.page-lead', null, [d.lead]) : null];
  }
  function featurePage(id) {
    const d = pageById[id];
    setTitle(d.title);
    drawNav(null, null, null, id);
    /* 정적 HTML 이 미리 그린 내용이 있으면 그대로 두고, 없으면 자리 문구 */
    const pre = U.qsa('.fp-body[data-page]', app).filter(function (n) { return n.getAttribute('data-page') === id; })[0] || null;
    /* 자리 문구는 jhb:page 를 보내지 않는다(특집 화면의 jhb:page 는 실제 화면이나 실패 화면을 그릴 때 한 번) */
    if (!pre) show(featureHead(d).concat([el('p.empty.fp-loading', null, ['화면을 불러오고 있어요.'])]), { silent: true });
    let timer = null;
    const timeout = new Promise(function (_, reject) { timer = setTimeout(function () { reject(new Error('시간 초과')); }, 10000); });
    const jobs = [
      /* 스크립트는 실행이 끝난 뒤 onload 가 오므로, 그때 등록이 없으면(문법 오류·최상위 예외) 시간 초과를 기다리지 않고 바로 실패 */
      d.hasJs ? load('js/pages/' + id + '.js').then(function () {
        return registered[id] || Promise.reject(codeError('화면 코드가 등록되지 않았어요'));
      }) : Promise.resolve(registered[id] || null),
      Promise.all((d.data || []).map(function (n) { return loadData(n).then(function (v) { return [n, v]; }); })),
      d.hasCss ? load('css/pages/' + id + '.css').catch(function () { return null; }) : null, /* 스타일이 없어도 그린다 */
      noticeJob(d) /* "○○에 마지막으로 고쳤어요"(revised) 날짜의 자료(K5-3·K8). 받지 못해도 그린다 */
    ];
    Promise.race([Promise.all(jobs), timeout]).then(function (res) {
      clearTimeout(timer);
      const data = {}; res[1].forEach(function (kv) { data[kv[0]] = kv[1]; });
      drawFeature(d, res[0], data, pre);
    }).catch(function (e) {
      clearTimeout(timer);
      featureFail(d, pre, e);
    });
  }
  function drawFeature(d, page, data, pre) {
    const canRender = !!(page && typeof page.render === 'function');
    let mount = pre, problem = null, errMsg = '';
    if (canRender || !mount) {
      mount = el('div.fp-body', { 'data-page': d.id });
      if (!canRender && page && typeof page.staticHtml === 'function') {
        /* 정적 HTML(tools/build-pages.cjs)과 같은 문맥: 용어 사전(glossary)·읽기 코스(courses)도 넘긴다 */
        try { mount.innerHTML = String(page.staticHtml({ data: data, esc: esc, articles: bySlug, sections: sections, glossary: glossary, courses: COURSES, page: d }) || ''); }
        catch (e) { problem = 'code'; errMsg = e && e.message; setTimeout(function () { throw e; }); }
      }
    }
    /* 그릴 것이 아무것도 없음: 화면 코드가 있는데 render·staticHtml 이 아무것도 내지 않거나,
       js 가 없는 화면(본문은 원래 비어 있음)에 lead 도 없을 때. 정적 HTML 이 없어 app-shell 로 열린 경우(빌드 전 개발 서버,
       오프라인에서 처음 여는 화면)에도 빈 몸통 대신 안내를 보인다 */
    if (!canRender && !problem && !mount.innerHTML.trim() && (d.hasJs || !d.lead)) problem = 'empty';
    if (problem) mount.appendChild(failLine(problem));
    /* 정적 내용이 있던 화면은 받는 동안 이미 읽거나 스크롤했을 수 있으니 읽던 위치를 그대로 둔다 */
    if (pre) show.keepScroll = true;
    show(featureHead(d).concat([mount, featureNotices(d)]));
    if (canRender) {
      const w = where();
      try {
        page.render(mount, { data: data, query: w.query, path: w.path, app: JHB.app, el: el, page: d, onCleanup: onCleanup });
      } catch (e) {
        problem = 'code'; errMsg = e && e.message;
        mount.innerHTML = '';
        mount.appendChild(failLine('code'));
        setTimeout(function () { throw e; });
      }
    }
    pageReady(d, problem, errMsg);
  }
  /* jhb:pageready: 성공이든 실패든 화면마다 한 번. detail = { id, ok, reason?('net'|'data'|'code'|'empty'), error? } */
  function pageReady(d, reason, err) {
    const detail = { id: d.id, ok: !reason };
    if (reason) { detail.reason = reason; if (err) detail.error = String(err); }
    window.dispatchEvent(new CustomEvent('jhb:pageready', { detail: detail }));
  }
  /* 화면 코드 문제(등록 안 됨·그리기 예외)는 인터넷 연결 탓이 아니므로 안내를 나눈다 */
  function codeError(msg) { const e = new Error(msg); e.jhbCode = true; return e; }
  /* 자료 파일(data/kb) 응답이 404·JSON 오류: 인터넷 연결 탓이 아니다 */
  function dataError(msg) { const e = new Error(msg); e.jhbData = true; return e; }
  function reloadBtn() { return el('button.fp-reload', { type: 'button', onclick: function () { location.reload(); } }, ['새로고침']); }
  function failLine(kind, why) {
    const links = [el('a', { href: '#/' }, ['첫 화면']), ' · ', el('a', { href: '#/search' }, ['찾기'])];
    if (kind === 'net') {
      return el('p.fp-fail', { role: 'status' }, ['화면을 불러오지 못했어요' + (why ? '(' + why + ')' : '') + '. 인터넷 연결을 확인하고 ', reloadBtn(), '해 주세요. '].concat(links));
    }
    const head = kind === 'empty' ? '화면 내용을 불러오지 못했어요. ' : kind === 'data' ? '화면 자료를 찾지 못했어요. ' : '화면을 그리는 중에 문제가 생겼어요. ';
    return el('p.fp-fail', { role: 'status' }, [head, reloadBtn(), '해 보거나 '].concat(links, ['로 가세요.']));
  }
  function featureFail(d, pre, e) {
    const kind = e && e.jhbCode ? 'code' : e && e.jhbData ? 'data' : 'net';
    if (pre) show.keepScroll = true;
    show(featureHead(d).concat([pre, failLine(kind, kind === 'net' && e ? e.message : ''), featureNotices(d)]));
    pageReady(d, kind, e && e.message);
  }
  function onCleanup(fn) { if (typeof fn === 'function') pageCleanup.push(fn); }

  /* ---------- 문서 화면의 확장 자리 ---------- */
  const SLOT_NAMES = ['lead', 'after-body', 'end', 'margin'];
  let curSlots = null;
  function slot(name) {
    const s = curSlots && curSlots[name];
    return s && app.contains(s) ? s : null;
  }
  function mountInSlot(name, node, order) {
    const s = slot(name);
    if (!s || !node || node.nodeType !== 1) return null;
    const o = Number(order) || 0;
    node.setAttribute('data-order', String(o));
    const after = Array.prototype.filter.call(s.children, function (k) { return k !== node && Number(k.getAttribute('data-order') || 0) > o; })[0];
    s.insertBefore(node, after || null);
    window.dispatchEvent(new Event('jhb:layout'));
    return node;
  }

  /* ---------- 문서 행 ---------- */
  function row(a, snippetHtml) {
    const s = secById[a.section] || {};
    return el('li.row', null, [el('a', { href: '#/a/' + a.slug }, [
      el('span.row-t', null, [a.title]),
      el('span.row-s', snippetHtml ? { html: snippetHtml } : null, snippetHtml ? null : [a.summary || '']),
      el('span.row-m', null, [el('span.row-sec', null, [spine(s), s.title || '']), ev(a), readMark(a.slug)])
    ])]);
  }

  /* ---------- 첫 화면 ----------
     빌드한 index.html 에는 처음 온 사람의 첫 화면과 같은 짜임(머리·책꽂이·오늘의 문서·코스·분류·오늘의 용어)이 미리 들어 있다(.portal[data-hm=static]).
     그 정적 첫 화면이 있으면 앱은 모듈 스크립트가 다 실린 뒤(afterModules) 한 번에 바꿔 그린다: 앱의 첫 화면과 모듈(책꽂이·역할·두 입구·살펴보기·새 글)이
     같은 작업 안에서 붙어서, 반쯤 그린 화면이 칠해졌다가 모듈이 위에 끼우며 아래 묶음을 미는 흔들림(처음 온 사람 CLS 0.09~0.13, report-K3)이 없다 */
  function home() {
    setTitle('');
    drawNav(null, null, null);
    const pre = U.qsa('.portal[data-hm="static"]', app).filter(function (n) { return n.parentNode === app; })[0];
    if (pre) { afterModules(function () { if (app.contains(pre)) drawHome(); }); return; }
    drawHome();
  }
  function drawHome() {
    /* 오늘의 문서: 위기·응급 태그 글과 15분류(자주 묻는 질문)는 맥락 없이 첫 화면에 뜨지 않게 뺀다 */
    const todayPool = articles.filter(function (a) {
      const t = a.tags || [];
      return String(a.section) !== '15' && t.indexOf('위기') < 0 && t.indexOf('응급') < 0;
    });
    const pick = todayPool.length ? todayPool[U.dayIndex(todayPool.length)] : null;
    /* 최근에 읽은 문서: 위기·응급 글은 첫 화면 목록에서 뺀다(같은 기기를 쓰는 사람이 첫 화면에서 제목을 보지 않게).
       기록(jhb.recent)은 그대로라 내 서재 목록에는 있다 */
    const recentSlugs = U.store.get('jhb.recent', []);
    const recent = PRG.visibleRecent ? PRG.visibleRecent(recentSlugs, bySlug, 5)
      : (Array.isArray(recentSlugs) ? recentSlugs : []).map(function (s) { return Object.prototype.hasOwnProperty.call(bySlug, s) ? bySlug[s] : null; }).filter(function (a) { return a && !isSensitive(a); }).slice(0, 5);
    const srcCount = (JHB.toc && JHB.toc.sources) || null;
    const dayTerms = [];
    if (glossary.length) { const start = U.dayIndex(glossary.length); for (let i = 0; i < 6; i++) dayTerms.push(glossary[(start + i * 23) % glossary.length]); }
    /* 다시 온 사람(역할을 골랐거나 읽은 기록이 있음)은 처음 그릴 때부터 이어서 읽기·코스를 오늘의 문서 앞에(js/progress.js homeOrder).
       home 모듈(js/ui/home.js rearrange)이 나중에 옮기는 결과와 같아서, 그린 뒤 묶음이 자리를 바꾸며 화면이 밀리지 않는다 */
    const returning = PRG.isReturning ? PRG.isReturning({ role: homeRole(), readCount: PROG ? PROG.count() : 0, recentCount: Array.isArray(recentSlugs) ? recentSlugs.length : 0 }) : false;
    const order = PRG.homeOrder ? PRG.homeOrder(returning) : ['today', 'continue', 'courses', 'recent', 'index', 'terms'];
    const secs = {};
    secs.today = pick ? el('section', { 'data-sec': 'today' }, [
      el('h2.h-sec', null, ['오늘의 문서']),
      el('div.feature', null, [
        el('div.feature-m', null, [el('span.row-sec', null, [spine(secById[pick.section]), (secById[pick.section] || {}).title || '']), ev(pick)]),
        el('h3.feature-t', null, [el('a', { href: '#/a/' + pick.slug }, [pick.title])]),
        el('p.feature-s', null, [pick.summary || '']),
        el('div.feature-actions', null, [
          el('a.btn', { href: '#/a/' + pick.slug }, ['읽기']),
          el('a.btn', { href: '#/random' }, ['아무 문서나 열기'])
        ])
      ])
    ]) : null;
    secs['continue'] = (function () {
      /* 들어간 적 있는 코스(코스 화면·?course=)만 코스 이름·진도를 붙인다. 아니면 "읽던 글의 다음 문서"로만.
         위기·응급 글은 제안하지 않고, 기준 글이면 제목을 내지 않는다(첫 화면에 제목이 뜨지 않게, 읽은 기록으로 꼬리표를 붙이지 않게).
         들어간 코스의 다음 단계가 위기·응급 글이면(c.hidden) 그 글의 제목 없이 코스 화면으로 보낸다(코스 순서는 건너뛰지 않음) */
      const c = PROG && (PROG.enteredCourses ? PROG.continueReading(articles, COURSES, { entered: PROG.enteredCourses(), hideTags: PRG.SENSITIVE_TAGS }) : PROG.continueReading(articles, COURSES));
      if (!c) return null;
      let title, href, go;
      if (c.hidden && c.course) {
        href = '#/course/' + c.course.id; title = c.course.title; go = '코스 이어 보기';
      } else if (c.article && c.article.slug) {
        href = '#/a/' + c.article.slug + (c.course ? '?course=' + c.course.id : ''); title = c.article.title; go = '계속 읽기';
      } else return null;
      return el('section', { 'data-sec': 'continue' }, [
        el('h2.h-sec', null, ['이어서 읽기']),
        el('div.continue', null, [
          el('span.k', null, [c.reason || '']),
          el('h3', null, [el('a', { href: href }, [title])]),
          el('a.btn', { href: href }, [go])
        ])
      ]);
    })();
    secs.courses = COURSES.length ? el('section', { 'data-sec': 'courses' }, [
      el('h2.h-sec', null, ['읽기 코스', el('a.more', { href: '#/courses' }, ['전체 보기'])]),
      el('p.page-lead', { style: 'margin:-4px 0 14px' }, ['상황에 맞게 읽을 순서를 정리했어요. 어디서 시작할지 막막할 때 골라 보세요.']),
      el('div.courses', null, COURSES.slice(0, 4).map(courseCard))
    ]) : null;
    secs.recent = recent.length ? el('section', { 'data-sec': 'recent' }, [
      el('h2.h-sec', null, ['최근에 읽은 문서']),
      el('ul.rows', null, recent.map(function (a) { return row(a); }))
    ]) : null;
    secs.index = el('section', { 'data-sec': 'index' }, [
      el('h2.h-sec', null, ['분류']),
      el('div.index', null, sections.map(function (s) {
        if (s.glossary) {
          return el('div.index-sec', null, [
            el('h3', null, [spine(s), el('a', { href: '#/glossary' }, [s.title]), el('span.n', null, [glossary.length + '개'])]),
            el('p', null, [s.desc])
          ]);
        }
        const list = sectionArticles(s.id);
        const shown = list.slice(0, 5);
        return el('div.index-sec', null, [
          el('h3', null, [spine(s), el('a', { href: '#/s/' + s.id }, [s.title]), el('span.n', null, [list.length + '개'])]),
          el('p', null, [s.desc]),
          el('ul', null, shown.map(function (a) { return el('li', null, [el('a', { href: '#/a/' + a.slug }, [a.title])]); })
            .concat(list.length > shown.length ? [el('li.rest', null, [el('a', { href: '#/s/' + s.id }, ['외 ' + (list.length - shown.length) + '개'])])] : []))
        ]);
      }))
    ]);
    secs.terms = dayTerms.length ? el('section', { 'data-sec': 'terms' }, [
      el('h2.h-sec', null, ['오늘의 용어', el('a.more', { href: '#/glossary' }, ['용어 사전 전체'])]),
      el('dl.terms', null, dayTerms.map(function (g) {
        const rel = (g.related || []).filter(function (r) { return bySlug[r]; })[0];
        return el('div', null, [el('dt', null, [rel ? el('a', { href: '#/a/' + rel }, [g.term]) : g.term]), el('dd', null, [g.def])]);
      }))
    ]) : null;
    /* "기록 가리기"(jhb.ui.home.recentHidden, home 모듈의 단추)가 켜져 있으면 처음 그릴 때부터 가린다.
       home 모듈이 붙기 전 한 프레임 동안 최근 목록 제목·이어서 읽기가 보이던 것(K3 검수). 모듈(enhanceRecent)과 같은 조건(최근 목록이 있을 때)·
       같은 표시(목록 hidden, 첫 화면 .hm-veil → css/ui/home.css 가 이어서 읽기·코스 진도·읽음 표시를 가림)라 모듈이 다시 적용해도 그대로 */
    const veil = !!secs.recent && U.store.get('jhb.ui.home.recentHidden', false) === true;
    if (veil) secs.recent.querySelector('ul.rows').hidden = true;
    const portal = el('div.portal', veil ? { class: 'hm-veil' } : null, [
      el('header.portal-head', null, [
        el('h1.portal-title', null, ['조현병 백과']),
        el('p.portal-sub', null, ['증상과 진단, 약과 치료, 일상과 제도, 최신 연구까지. 조현병에 관해 궁금한 것을 출처와 함께 찾아볼 수 있어요. 어려운 말에는 밑줄이 있고, 누르면 뜻이 나와요.']),
        el('div.portal-stats', null, [
          el('span', null, [el('b', null, [String(articles.length)]), '개 문서']),
          el('span', null, [el('b', null, [String(glossary.length)]), '개 용어']),
          srcCount ? el('span', null, [el('b', null, [srcCount.toLocaleString('ko-KR')]), '개 출처']) : null
        ])
      ])
    ].concat(order.map(function (k) { return secs[k] || null; }), [
      el('p.portal-note', null, ['이 백과의 글은 AI가 공개 자료를 바탕으로 초안을 쓰고 출처를 확인해 만들었어요. 전문가 감수는 받지 않았어요. 진단과 치료는 담당 의사와 상의하세요.'])
    ]));
    show([portal]);
    /* home 모듈이 없으면(불러오지 못함) "기록 보이기" 단추도 없으니 가림을 푼다. 모듈은 이 파일 뒤의 일반 스크립트라 문서를 다 읽은 뒤 확인 */
    if (veil) {
      const unveil = function () {
        if (JHB.ui && JHB.ui.home) return;
        portal.classList.remove('hm-veil');
        const l = portal.querySelector('[data-sec="recent"] ul.rows'); if (l) l.hidden = false;
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', unveil, { once: true }); else unveil();
    }
  }
  /* 첫 화면 역할(js/ui/home.js 와 같은 자리): 이 기기의 jhb.ui.home.role, 기록 쉼이면 이 탭(sessionStorage)에 고른 역할이 먼저 */
  const HOME_ROLE_KEY = 'jhb.ui.home.role';
  function homeRole() {
    const ok = function (v) { return typeof v === 'string' && (!PRG.HOME_ROLES || PRG.HOME_ROLES.indexOf(v) >= 0) ? v : null; };
    if (privacy.paused()) {
      try { const raw = sessionStorage.getItem(HOME_ROLE_KEY); const v = raw == null ? null : ok(JSON.parse(raw)); if (v) return v; } catch (e) { }
    }
    return ok(U.store.get(HOME_ROLE_KEY, null));
  }

  /* ---------- 분류 ---------- */
  function section(id) {
    const s = secById[id];
    if (!s) return notFound();
    if (s.glossary) return glossaryPage();
    setTitle(s.title);
    drawNav(s.id, null, null);
    const list = sectionArticles(id);
    show([
      el('nav.crumb', { 'aria-label': '위치' }, [el('a', { href: '#/' }, ['첫 화면']), el('span.sep', null, ['/']), '분류']),
      el('h1.page-title', null, [s.title]),
      el('p.page-lead', null, [s.desc + '. 문서 ' + list.length + '개.']),
      list.length ? el('ul.rows', { style: 'margin-top:22px' }, list.map(function (a) { return row(a); })) : el('p.empty', null, ['이 분류의 문서를 준비하고 있어요.'])
    ]);
  }

  /* ---------- 문서 ---------- */
  function loadArticle(a) {
    if (typeof a === 'string') { if (!bySlug[a]) return Promise.reject(new Error('없는 글: ' + a)); a = bySlug[a]; }
    if (cache[a.slug]) return Promise.resolve(cache[a.slug]);
    const s = secById[a.section];
    return fetch(BASE + 'content/' + s.dir + '/' + a.slug + '.md', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (txt) { cache[a.slug] = md.parse(txt); return cache[a.slug]; });
  }

  /* 본문 속 용어에 점선 밑줄을 달고, 처음 나올 때만 표시한다 */
  function linkTerms(root, slug) {
    /* 용어 찾기(js/gloss.js)를 못 받았으면 밑줄 없이(글은 그대로 보이고 나머지 동작은 붙는다) */
    if (!(JHB.gloss && JHB.gloss.matcher && JHB.gloss.split)) return [];
    const exclude = glossary.filter(function (g) { return (g.related || [])[0] === slug; }).map(function (g) { return g.term; });
    const re = JHB.gloss.matcher(glossary, { exclude: exclude });
    if (!re) return [];
    const used = new Set(), found = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        let p = n.parentNode;
        while (p && p !== root) {
          if (/^(A|CODE|H2|H3|SUP|TH)$/.test(p.nodeName) || (p.classList && (p.classList.contains('callout-title') || p.classList.contains('term')))) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      if (used.size >= 14) return;
      const segs = JHB.gloss.split(n.nodeValue, re, used, 14);
      if (segs.length === 1 && segs[0].text != null) return;
      const frag = document.createDocumentFragment();
      segs.forEach(function (sg) {
        if (sg.text != null) { frag.appendChild(document.createTextNode(sg.text)); return; }
        const g = termByName[sg.term];
        const b = el('button.term', { type: 'button', 'data-term': sg.term, 'aria-expanded': 'false', 'aria-label': sg.term + ' 뜻 보기' }, [sg.term]);
        found.push({ el: b, g: g });
        frag.appendChild(b);
      });
      n.parentNode.replaceChild(frag, n);
    });
    return found;
  }

  /* 문서 화면. 두 길이 같은 마크업(docKit 의 docHtml)과 같은 동작 붙이기(hydrateDoc → finishDoc)를 쓴다:
     - 정적 본문 살리기: 빌드가 그린 a/<slug>/index.html 에 그 글의 #doc-meta(JSON)가 있으면 #app 을 지우지 않고 그대로 쓴다.
       "문서를 불러오고 있어요"를 보이지 않고 글 원문(.md)을 다시 받지 않는다. 메타는 #doc-meta 와 data/toc.js 에서.
       jhb:page·jhb:article 은 모듈 스크립트가 다 실린 뒤(afterModules) 한 번씩(자리 문구용 loading 이벤트는 없음).
     - 그 밖(오프라인 틀 app-shell, 옛 정적 HTML): 지금처럼 원문을 받아 docHtml 로 그린다(자리 문구 → jhb:page loading, 그린 뒤 jhb:page·jhb:article) */
  function article(slug) {
    const a = bySlug[slug];
    if (!a) {
      /* 배포 직후 옛 글 목록(data/toc.js)에 아직 없는 새 글: 정적 본문이 있으면 지우지 않는다 */
      const sb = U.qs('article.doc .body', app);
      if (sb) return keepStatic(sb, '새로 올라온 글이에요. 화면을 새로 고치면 목차와 용어 풀이가 함께 보여요.');
      return notFound();
    }
    setTitle(a.title);
    const pre = staticDoc(slug);
    if (pre) {
      const d = docData(a, pre.meta, pre.toc, null);
      drawNav(a.section, slug, d.toc);
      const h = hydrateDoc(d, pre.art);
      afterModules(function () {
        /* 그사이 다른 화면으로 바뀌었으면(정적 본문이 없어짐) 그만 */
        if (!app.contains(pre.art)) return;
        finishDoc(d, h, true);
      });
      return;
    }
    drawNav(a.section, slug, null);
    show([el('p.empty', null, ['문서를 불러오고 있어요.'])], { loading: true });
    Promise.all([loadArticle(a), needLinks()]).then(function (res) {
      const doc = res[0];
      const r = md.render(doc.body);
      const d = docData(a, doc.meta, r.toc, doc.body);
      show(htmlNodes(P.rewriteHtml(DK.docHtml(docInput(d, r.html)), BASE)));
      /* 왼쪽 목차는 불러오는 동안 이미 그렸으니 이 글의 차례만 끼운다(전체를 두 번 그리지 않음) */
      navToc(slug, r.toc);
      finishDoc(d, hydrateDoc(d, U.qs('article.doc', app)), false);
    }).catch(function (e) {
      show([el('p.empty', null, ['문서를 불러오지 못했어요(' + e.message + '). 인터넷 연결을 확인하고 새로고침해 주세요.'])]);
    });
  }
  /* 정적 문서(빌드가 docHtml 로 그린 것)가 지금 slug 의 것이고 살릴 수 있는 모양이면 { art, meta(frontmatter), toc } */
  function staticDoc(slug) {
    const s = document.getElementById('doc-meta');
    if (!s) return null;
    let j = null;
    try { j = JSON.parse(s.textContent); } catch (e) { return null; }
    if (!j || j.slug !== slug || !j.meta || typeof j.meta !== 'object') return null;
    const art = U.qsa('article.doc', app).filter(function (n) { return n.parentNode === app; })[0];
    if (!art || !U.qs('.doc-main > .body', art) || !U.qs('.doc-margin > .notes', art)) return null;
    const slots = docSlots(art);
    if (SLOT_NAMES.some(function (n) { return !slots[n]; })) return null;
    return { art: art, meta: j.meta, toc: Array.isArray(j.toc) ? j.toc : [] };
  }
  function docSlots(art) {
    const out = {};
    U.qsa('.doc-slot[data-slot]', art).forEach(function (n) { const k = n.getAttribute('data-slot'); if (SLOT_NAMES.indexOf(k) >= 0 && !out[k]) out[k] = n; });
    return out;
  }
  /* 글 하나의 값: meta 는 지금처럼 toc 항목 + frontmatter(jhb:article 의 meta 와 같음) */
  function docData(a, fm, toc, bodyMd) {
    const meta = Object.assign({}, a, fm);
    const list = sectionArticles(a.section);
    const pn = DK.prevNext(list, a.slug);
    return {
      slug: a.slug, article: a, meta: meta, toc: toc || [], srcs: Array.isArray(meta.sources) ? meta.sources : [], list: list, prev: pn.prev, next: pn.next,
      minutes: meta.minutes || md.readingMinutes(bodyMd || ''), points: md.pointList(meta.points)
    };
  }
  function docInput(d, html) {
    return { slug: d.slug, meta: d.meta, html: html, toc: d.toc, minutes: d.minutes, sec: secById[d.article.section] || {}, secById: secById, list: d.list, articles: articles, bySlug: bySlug, links: linksNow(), EV: JHB.EVIDENCE };
  }
  function htmlNodes(html) {
    const t = document.createElement('template'); t.innerHTML = html;
    return Array.prototype.slice.call(t.content.childNodes);
  }
  /* 문서 DOM 에 동작을 붙인다(마크업은 바꾸지 않고 덧붙이기만): 저장·공유 단추, 차례·출처 수 링크, 출처 번호 팝오버, 용어 밑줄과 여백 주석,
     진행 막대, 코스 길잡이(기기 기록에 따라). 요약 보기 표시(data-key)와 확장 자리 등록은 finishDoc 이 이벤트 직전에 한다 */
  function hydrateDoc(d, art) {
    const slug = d.slug, srcs = d.srcs;
    const body = U.qs('.doc-main > .body', art);
    const notes = U.qs('.doc-margin > .notes', art);
    /* 요약 보기에서 늘 보이는 소절(core). 첫 번째 h2 는 언제나 core(요약 보기가 글의 입구를 숨기지 않게).
       소절 안에 위기 연락처(109·1577-0199·119·112·1393, tel: 링크 포함)가 있으면 그 소절도 core(위기 안내는 접기에서도 빠지지 않음).
       용어 밑줄을 달기 전의 본문으로 셈하고, 값은 finishDoc 이 단다(모듈이 jhb:article 전에 반쯤 붙지 않게) */
    const keys = U.qsa('h2', body).map(function (h, i) {
      const t = h.textContent.trim();
      return i === 0 || CORE_H2.test(t) || sectionHasContact(h) ? 'core' : 'detail';
    });

    /* 저장(문서 정보 상자·휴대폰 머리 줄 두 곳) */
    U.qsa('.js-fav', art).forEach(function (b) {
      if (isFav(slug)) { b.classList.add('on'); b.textContent = '저장됨'; b.setAttribute('aria-pressed', 'true'); }
      b.addEventListener('click', function () {
        const on = toggleFav(slug);
        U.qsa('.js-fav').forEach(function (x) { x.className = 'btn js-fav' + (on ? ' on' : ''); x.textContent = on ? '저장됨' : '저장'; x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      });
    });
    U.qsa('.js-share', art).forEach(function (b) {
      b.addEventListener('click', function () {
        const url = location.href;
        if (navigator.share) navigator.share({ title: d.article.title + ' - 조현병 백과', url: url }).catch(function () { });
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { b.textContent = '주소 복사됨'; });
      });
    });
    /* 본문 차례(휴대폰)·출처 수 링크: 소절 주소와 같은 길(jumpTo) */
    U.qsa('.toc-m a[href^="#"], .infobox a[href="#sources"]', art).forEach(function (x) {
      x.addEventListener('click', jumpTo(x.getAttribute('href').slice(1)));
    });
    /* 코스 길잡이: 주소의 ?course= 나 들어간 코스에 따라(기기 기록이라 정적 HTML 에는 없음). 문서 고지 바로 뒤 */
    const cn = courseNav(slug);
    const disc = U.qs('.doc-main > .disclaimer', art);
    if (cn && disc) disc.parentNode.insertBefore(cn, disc.nextSibling);

    /* 출처 번호: 누르면 출처 팝오버 */
    U.qsa('.fn a', body).forEach(function (link) {
      const n = Number(link.textContent);
      const src = srcs[n - 1];
      if (!src) return;
      link.setAttribute('role', 'button');
      link.setAttribute('aria-label', '출처 ' + n + ' 보기');
      link.setAttribute('aria-expanded', 'false');
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openPop(link, [
          el('b', null, ['출처 ' + n]),
          el('span', null, [src.org ? src.org + '. ' : '', src.title || '', src.year ? ' (' + src.year + ')' : '']),
          el('div.pop-links', null, [
            src.url ? el('a', { href: src.url, target: '_blank', rel: 'noopener' }, ['원문 열기']) : null,
            /* 출처 목록으로: 포커스도 그 줄로(팝오버가 닫히며 포커스가 출처 번호로 돌아갔다가 그 줄로 옮겨 가요. K5-2) */
            el('a', { href: '#src-' + n, onclick: function (ev2) { ev2.preventDefault(); closePop(); const li = document.getElementById('src-' + n); if (li) { if (!li.hasAttribute('tabindex')) li.setAttribute('tabindex', '-1'); try { li.focus({ preventScroll: true }); } catch (e3) { } li.scrollIntoView({ block: 'center' }); li.classList.add('flash'); setTimeout(function () { li.classList.remove('flash'); }, 1800); } } }, ['출처 목록에서 보기'])
          ])
        ]);
      });
    });

    /* 용어: 점선 밑줄, 넓은 화면은 여백 주석, 좁은 화면은 팝오버 */
    const found = linkTerms(body, slug);
    found.forEach(function (f) {
      f.el.addEventListener('click', function () { openPop(f.el, termPopContent(f.g, slug)); });
    });
    const noteEls = [];
    function layoutNotes() {
      notes.innerHTML = ''; noteEls.length = 0;
      const margin = notes.parentNode;
      if (!margin || getComputedStyle(margin).display === 'none' || !found.length) return;
      const top0 = notes.getBoundingClientRect().top;
      let floor = 18;
      found.forEach(function (f) {
        const rel = (f.g.related || []).filter(function (x) { return bySlug[x] && x !== slug; })[0];
        const n = el('div.note', null, [el('b', null, [f.g.term]), f.g.def, rel ? el('div', null, [el('a', { href: '#/a/' + rel }, [bySlug[rel].title + ' 문서'])]) : null]);
        notes.appendChild(n);
        const want = f.el.getBoundingClientRect().top - top0 - 2;
        const top = Math.max(want, floor);
        n.style.top = top + 'px';
        floor = top + n.offsetHeight + 14;
        n.addEventListener('mouseenter', function () { f.el.classList.add('hot'); });
        n.addEventListener('mouseleave', function () { f.el.classList.remove('hot'); });
        f.el.addEventListener('mouseenter', function () { n.classList.add('hot'); });
        f.el.addEventListener('mouseleave', function () { n.classList.remove('hot'); });
        noteEls.push(n);
      });
      notes.style.height = floor + 'px';
    }
    requestAnimationFrame(layoutNotes);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutNotes);
    let rt; const onResize = function () { clearTimeout(rt); rt = setTimeout(layoutNotes, 120); };
    window.addEventListener('resize', onResize);
    window.addEventListener('jhb:layout', onResize);

    /* 읽기 진행 막대와 현재 소제목 표시 */
    const heads = U.qsa('h2[id], h3[id]', body);
    const onScroll = function () {
      const docEl = document.documentElement;
      const max = Math.max(1, docEl.scrollHeight - innerHeight);
      setProgress(Math.min(1, scrollY / max));
      let cur = null;
      for (let i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top < 120) cur = heads[i].id; else break; }
      U.qsa('.nav-toc a', nav).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-h') === cur); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    pageCleanup.push(function () {
      window.removeEventListener('resize', onResize); window.removeEventListener('jhb:layout', onResize); window.removeEventListener('scroll', onScroll);
    });
    return { body: body, keys: keys, slots: docSlots(art) };
  }
  /* 동작을 다 붙인 뒤: 요약 보기 표시를 달고, 확장 자리를 열고, 읽음을 남기고, jhb:article(정적 본문을 살린 화면은 jhb:page 도 먼저) */
  function finishDoc(d, h, fromStatic) {
    const slug = d.slug;
    U.qsa('h2', h.body).forEach(function (x, i) { if (h.keys[i]) x.setAttribute('data-key', h.keys[i]); });
    curSlots = h.slots;
    if (fromStatic) pageEvent();
    /* 기록 쉼이면 읽음 표시·최근 읽은 글을 쓰지 않는다 */
    if (!privacy.paused()) {
      if (PROG) PROG.markRead(slug);
      const recent = U.store.get('jhb.recent', []).filter(function (x) { return x !== slug; }); recent.unshift(slug); U.store.set('jhb.recent', recent.slice(0, 20));
    }
    /* ?course= 로 그 코스의 글을 열었으면 "들어간 코스"로 남긴다(이어서 읽기가 코스 이름을 붙이는 조건) */
    const wantedCourse = getCourse(where().query.course);
    if (wantedCourse && wantedCourse.steps.some(function (st) { return st.slug === slug; })) enterCourse(wantedCourse.id);
    window.dispatchEvent(new CustomEvent('jhb:article', { detail: { slug: slug, article: d.article, meta: d.meta, toc: d.toc, prev: d.prev, next: d.next, minutes: d.minutes, body: h.body, points: d.points.length ? d.points.slice() : null } }));
    /* 소절 주소(a/<slug>/#h-3)로 들어왔으면 모듈이 다 붙은 뒤(요약 보기 접기·제목 줄 여백) 그 소절을 펴고 그 자리로 */
    scrollToHash();
  }

  /* ---------- 문서 마크업(순수 함수, node 겸용: tools/build-pages.cjs 가 require) ----------
     앱(새로 그릴 때)과 빌드(정적 a/<slug>/)가 이 함수 하나로 같은 HTML 을 만든다. 기기 기록에 따라 달라지는 것
     (저장 단추 상태·코스 길잡이·읽음·용어 밑줄·출처 팝오버)은 넣지 않고 hydrateDoc 이 붙인다. 링크는 '#/…' 꼴(빌드 P.rewriteHtml, 앱도 같은 함수로 실제 경로).
     o = { slug, meta(toc 항목 + frontmatter), html(md.render 결과), toc, minutes, sec, list(같은 분류 글, 순서대로), articles, bySlug, links(data/links.js 값이나 null), EV(근거 표) } */
  function docKit(md, P) {
    const esc = md.esc;
    function spineHtml(s) { return '<span class="spine" style="--h:' + ((s && s.hue) || 250) + '" aria-hidden="true"></span>'; }
    function evHtml(key, EV) {
      if (!key) return '';
      const info = (EV && Object.prototype.hasOwnProperty.call(EV, key) ? EV[key] : null) || {};
      return '<span class="ev ev-' + esc(key) + '" title="' + esc(info.desc || '') + '">' + esc(info.label || key) + '</span>';
    }
    function dot(s) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[1] + '.' + m[2] + '.' + m[3] : String(s || ''); }
    function prevNext(list, slug) {
      const l = Array.isArray(list) ? list : [];
      const i = l.findIndex(function (x) { return x.slug === slug; });
      return { prev: i > 0 ? l[i - 1] : null, next: i >= 0 && i < l.length - 1 ? l[i + 1] : null };
    }
    /* 함께 읽기: 태그가 겹치는 글(겹친 수가 많은 순, 같으면 목록 순서) 6편 */
    function related(articles, slug, tags) {
      const t = Array.isArray(tags) ? tags : [];
      return (articles || []).filter(function (x) { return x.slug !== slug && (x.tags || []).some(function (g) { return t.indexOf(g) >= 0; }); })
        .map(function (x) { return { a: x, n: (x.tags || []).filter(function (g) { return t.indexOf(g) >= 0; }).length }; })
        .sort(function (p, q) { return q.n - p.n; }).slice(0, 6).map(function (x) { return x.a; });
    }
    function backlinkList(links, slug, bySlug) {
      const inn = links && links.in && Object.prototype.hasOwnProperty.call(links.in, slug) ? links.in[slug] : null;
      return Array.isArray(inn) ? inn.map(function (x) { return Object.prototype.hasOwnProperty.call(bySlug || {}, x) ? bySlug[x] : null; }).filter(Boolean) : [];
    }
    function docHtml(o) {
      const meta = o.meta || {}, slug = o.slug, s = o.sec || {}, secs = o.secById || null;
      const tags = Array.isArray(meta.tags) ? meta.tags : [];
      const srcs = Array.isArray(meta.sources) ? meta.sources : [];
      const isCrisis = tags.indexOf('위기') >= 0, isEmergency = tags.indexOf('응급') >= 0;
      const points = md.pointList(meta.points);
      const mt = md.docMetaText(o.minutes, meta.updated, meta.reviewed);
      const pn = prevNext(o.list, slug);
      const rel = related(o.articles, slug, tags);
      const backs = backlinkList(o.links, slug, o.bySlug);
      const toc = Array.isArray(o.toc) ? o.toc : [];
      const ev = evHtml(meta.evidence, o.EV);
      const fav = '<button type="button" class="btn js-fav" aria-pressed="false">저장</button>';
      const share = '<button type="button" class="btn js-share">공유</button>';
      const secLink = '<a href="#/s/' + esc(s.id) + '">' + esc(s.title || '') + '</a>';
      function secOf(x) { return secs && Object.prototype.hasOwnProperty.call(secs, x.section) ? secs[x.section] : null; }
      function docLink(x) { return '<li><a href="#/a/' + esc(x.slug) + '">' + spineHtml(secOf(x)) + esc(x.title) + '</a></li>'; }
      let h = '<nav class="crumb" aria-label="위치"><a href="#/">첫 화면</a><span class="sep">/</span>' + secLink + '</nav>' +
        '<article class="doc"><div class="doc-main"><header class="doc-head"><h1 class="page-title">' + esc(meta.title) + '</h1>' +
        (meta.summary ? '<p class="doc-summary">' + esc(meta.summary) + '</p>' : '') +
        '<div class="doc-meta-m">' + ev + '<span>' + esc(mt.minutes) + '</span>' + (mt.updated ? '<span>' + esc(mt.updated) + '</span>' : '') +
        (mt.reviewed ? '<span class="doc-reviewed">' + esc(mt.reviewed) + '</span>' : '') + '<span class="acts">' + fav + share + '</span></div></header>';
      if (isCrisis) h += md.crisisHtml();
      if (isEmergency) h += md.emergencyHtml();
      h += '<div class="doc-slot" data-slot="lead">' + (points.length ? md.keypointsHtml(points, isCrisis).replace('<section class="keypoints"', '<section class="keypoints" data-order="-1000000"') : '') + '</div>';
      if (toc.length >= 3) {
        h += '<details class="toc-m"><summary>이 문서의 차례</summary><ol>' + toc.map(function (t) {
          return '<li' + (t.level === 3 ? ' class="l3"' : '') + '><a href="#' + esc(t.id) + '">' + esc(t.text) + '</a></li>';
        }).join('') + '</ol></details>';
      }
      h += '<div class="body">' + (o.html || '') + '</div><div class="doc-slot" data-slot="after-body"></div>';
      if (srcs.length) {
        h += '<section class="sources" id="sources"><h2>출처</h2><ol>' + srcs.map(function (x, i) {
          return '<li id="src-' + (i + 1) + '">' + (x.org ? esc(x.org) + '. ' : '') +
            (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" aria-label="' + esc((x.title || x.url) + ' (새 창에서 열림)') + '">' + esc(x.title || x.url) + '</a>' : esc(x.title || '')) +
            (x.year ? ' (' + esc(x.year) + ')' : '') + '</li>';
        }).join('') + '</ol></section>';
      }
      h += '<p class="disclaimer">' + esc(md.DISCLAIMER) + '</p>';
      if (backs.length) {
        const shown = backs.slice(0, 10);
        h += '<section class="backlinks"><h2>이 문서를 가리키는 문서 ' + backs.length + '개</h2><ul>' + shown.map(docLink).join('') + '</ul>' +
          (backs.length > shown.length ? '<p class="more">그 밖에 ' + (backs.length - shown.length) + '개 문서가 더 있어요.</p>' : '') + '</section>';
      }
      if (rel.length) h += '<section class="see-also"><h2>함께 읽기</h2><ul>' + rel.map(docLink).join('') + '</ul></section>';
      if (pn.prev || pn.next) {
        h += '<nav class="pager" aria-label="같은 분류의 앞뒤 문서">' +
          (pn.prev ? '<a class="prev" href="#/a/' + esc(pn.prev.slug) + '"><small>앞 문서</small>' + esc(pn.prev.title) + '</a>' : '') +
          (pn.next ? '<a class="next" href="#/a/' + esc(pn.next.slug) + '"><small>다음 문서</small>' + esc(pn.next.title) + '</a>' : '') + '</nav>';
      }
      h += '<div class="doc-slot" data-slot="end"></div></div>' +
        '<aside class="doc-margin" aria-label="문서 정보와 용어 풀이"><section class="infobox" aria-label="문서 정보"><div class="infobox-h">' + spineHtml(s) + '문서 정보</div><dl>' +
        '<dt>분류</dt><dd>' + secLink + '</dd><dt>근거</dt><dd>' + (ev || '없음') + '</dd>' +
        '<dt>출처</dt><dd>' + (srcs.length ? '<a href="#sources">' + srcs.length + '개</a>' : '없음') + '</dd>' +
        '<dt>읽는 시간</dt><dd>약 ' + esc(o.minutes) + '분</dd>' +
        (meta.updated ? '<dt>고친 날</dt><dd>' + esc(dot(meta.updated)) + '</dd>' : '') +
        '</dl><div class="infobox-actions">' + fav + share + '</div></section><div class="doc-slot" data-slot="margin"></div><div class="notes"></div></aside></article>';
      return h;
    }
    /* 정적 문서 머리의 <script type="application/json" id="doc-meta"> 내용: frontmatter(md.parse 의 meta 전부)와 차례. '<' 는 < 로 */
    function metaJson(slug, fm, toc) {
      return JSON.stringify({ v: 1, slug: slug, meta: fm || {}, toc: toc || [] }).replace(/</g, '\\u003c');
    }
    return { docHtml: docHtml, metaJson: metaJson, prevNext: prevNext, related: related, backlinkList: backlinkList, evHtml: evHtml, spineHtml: spineHtml };
  }

  /* ---------- 검색어 넘기기(저장소가 막힌 브라우저용, 순수 함수 · node 겸용) ----------
     goSearch 는 보통 sessionStorage['jhb.q'] 로 넘긴다. 그게 예외면 이 탭의 window.name 에 'jhb.q:' + JSON 을 한 번만 싣는다.
     window.name 은 같은 탭의 다음 페이지까지 메모리로 이어지는 값이라 주소·서버·캐시·저장소에 남지 않는다. 받는 쪽(route)이 읽자마자 지운다.
     위기로 감지된 말(detect 가 값을 돌려줌)은 문장을 싣지 않고 카드 종류만(js/pages/search.js 의 history.state {q:'', s, at, crisis} 과 같은 꼴) */
  function handoffKit() {
    const PREFIX = 'jhb.q:';
    const KINDS = ['high', 'harm', 'watch'];
    /* js/pages/search.js 의 cardKinds 와 같은 규칙 */
    function cardKinds(r) {
      if (!r) return [];
      if (r.level === 'high') return r.harm ? ['high', 'harm'] : ['high'];
      if (r.level === 'harm') return ['harm'];
      return ['watch'];
    }
    function pack(q, s, detect) {
      const v = String(q == null ? '' : q), sec = String(s == null ? '' : s);
      let r = null;
      try { r = typeof detect === 'function' && v ? detect(v) : null; } catch (e) { r = null; }
      return PREFIX + JSON.stringify(r ? { q: '', s: sec, crisis: cardKinds(r) } : { q: v, s: sec });
    }
    /* history.state 로 옮길 값({q, s, at} 또는 {q:'', s, at, crisis}). 꼴이 아니면 null */
    function unpack(name, now) {
      if (typeof name !== 'string' || name.indexOf(PREFIX) !== 0) return null;
      let v = null;
      try { v = JSON.parse(name.slice(PREFIX.length)); } catch (e) { return null; }
      if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
      const s = typeof v.s === 'string' ? v.s : '';
      const k = Array.isArray(v.crisis) ? v.crisis.filter(function (x, i, a) { return KINDS.indexOf(x) >= 0 && a.indexOf(x) === i; }) : [];
      if (k.length) return { q: '', s: s, at: now, crisis: k };
      return { q: typeof v.q === 'string' ? v.q.slice(0, 500) : '', s: s, at: now };
    }
    return { PREFIX: PREFIX, pack: pack, unpack: unpack, cardKinds: cardKinds };
  }

  function termPopContent(g, curSlug) {
    const rels = (g.related || []).filter(function (x) { return bySlug[x] && x !== curSlug; });
    return [
      el('b', null, [g.term]),
      g.en ? el('span.en', null, [g.en]) : null,
      el('span', null, [g.def]),
      el('div.pop-links', null, rels.map(function (x) { return el('a', { href: '#/a/' + x }, [bySlug[x].title]); })
        .concat([el('a', { href: '#/glossary?t=' + encodeURIComponent(g.term) }, ['용어 사전'])]))
    ];
  }

  /* ---------- 팝오버 ----------
     출처 번호·용어(문서 화면), 약 표의 칸(meds) 등이 함께 쓰는 #pop. 760px 이하에서는 아래 시트(.sheet).
     키보드(K5-2): 열리면 팝오버로 포커스가 가요. #pop 은 body 끝에 있어 DOM 순서로는 바닥글·건너뛰기 링크로 새어 나가므로,
     마지막 요소 다음 Tab·첫 요소(또는 팝오버 자신) 앞 Shift+Tab 이면 닫고 연 요소(anchor)로 돌아가요. 그 뒤 Tab 은 anchor 의 다음 요소로 이어져요.
     그 밖에 포커스가 키보드·프로그램으로 팝오버 밖의 요소로 옮겨 가도 닫고 anchor 로 돌아가요. 단 마우스·터치로 누른 곳, 글을 칠 칸(검색창 등),
     다른 모듈의 대화상자로 간 포커스는 빼앗지 않고 닫기만 해요(판정은 js/progress.js 의 popTabOut·popLeave).
     화면을 바꿀 때(show)는 닫기만 하고 옛 anchor 로 포커스를 돌리지 않아요(closePop(false, { nav: true })).
     닫을 때 포커스가 팝오버 안이었으면 BODY 에 떨어지지 않게 anchor 로, anchor 가 안 보이면(display:none·inert 등) 본문 제목이나 #app 으로.
     창 너비가 바뀌거나 화면을 돌리면 다시 자리 잡고(넓은 화면 ↔ 아래 시트), anchor 가 안 보이게 됐으면 닫아요(옛 자리에 남아 가로 넘침이 생기지 않게).
     높이만 바뀌는 경우(휴대폰 주소창이 숨고 나타남)는 그대로 둬요. 마우스로 다른 곳을 눌러 닫는 동작은 예전 그대로 */
  const pop = U.qs('#pop');
  let popAnchor = null, popW = 0, popRaf = 0;
  function shown(n) { return !!n && n.nodeType === 1 && document.contains(n) && n.getClientRects().length > 0 && !(n.closest && n.closest('[inert]')); }
  function popFocusBack(a) {
    if (shown(a)) { a.focus(); return; }
    /* 연 요소가 사라졌거나 숨었으면 보이는 곳(본문 제목, 없으면 #app)으로. 화면은 옮기지 않아요 */
    const h = U.qs('h1', app);
    const to = shown(h) ? h : app;
    if (to !== app && !to.hasAttribute('tabindex')) to.setAttribute('tabindex', '-1');
    try { to.focus({ preventScroll: true }); } catch (e) { to.focus(); }
  }
  function placePop(anchor) {
    popW = innerWidth;
    if (innerWidth <= 760) { pop.classList.add('sheet'); pop.style.left = ''; pop.style.top = ''; return; }
    pop.classList.remove('sheet');
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = r.left + scrollX + r.width / 2 - w / 2;
    left = Math.max(scrollX + 12, Math.min(left, scrollX + innerWidth - w - 12));
    let top = r.bottom + scrollY + 8;
    if (r.bottom + h + 16 > innerHeight && r.top - h - 8 > 0) top = r.top + scrollY - h - 8;
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }
  function openPop(anchor, children) {
    if (popAnchor === anchor && !pop.hidden) { closePop(); return; }
    closePop();
    pop.innerHTML = '';
    children.forEach(function (c) { if (c) pop.appendChild(c); });
    const x = el('button.pop-x', { type: 'button', 'aria-label': '닫기' }, ['×']);
    x.addEventListener('click', function () { closePop(true); });
    pop.appendChild(x);
    pop.hidden = false;
    popAnchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');
    anchor.setAttribute('aria-controls', 'pop');
    const head = pop.querySelector('b'); if (head) { head.id = 'pop-title'; pop.setAttribute('aria-labelledby', 'pop-title'); }
    pop.tabIndex = -1;
    setTimeout(function () { if (!pop.hidden) pop.focus({ preventScroll: true }); }, 0);
    placePop(anchor);
  }
  /* opts.nav: 화면을 바꾸는 중(show). 곧 지워질 옛 화면의 anchor 로 포커스·스크롤을 옮기지 않아요(새 화면의 포커스는 라우터 몫) */
  function closePop(refocus, opts) {
    if (pop.hidden) return;
    const a = popAnchor;
    /* 포커스가 팝오버 안에 있었으면 숨기는 순간 BODY 로 떨어지니 함께 돌려줘요 */
    const inside = pop.contains(document.activeElement);
    pop.hidden = true;
    if (a) { a.setAttribute('aria-expanded', 'false'); }
    popAnchor = null;
    if (opts && opts.nav) return;
    if (refocus || inside) popFocusBack(a);
  }
  document.addEventListener('click', function (e) {
    if (pop.hidden) return;
    if (pop.contains(e.target) || (popAnchor && popAnchor.contains(e.target))) return;
    closePop();
  });
  /* Tab 으로 팝오버 끝을 넘으면 닫고 연 요소로 */
  pop.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || pop.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    const f = U.qsa('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])', pop).filter(function (n) { return !n.disabled && n.getClientRects().length > 0; });
    /* 판정은 순수 함수(js/progress.js 의 popTabOut, 테스트 tests/progress.test.cjs) */
    if (PRG.popTabOut && PRG.popTabOut(f, document.activeElement, e.shiftKey, pop)) { e.preventDefault(); closePop(true); }
  });
  /* 마지막 입력이 마우스·터치였는지(키를 누르면 풀림). 마우스로 다른 곳을 눌러 옮긴 포커스는 빼앗지 않으려고 */
  let popPointer = false;
  document.addEventListener('pointerdown', function () { popPointer = true; }, true);
  document.addEventListener('keydown', function () { popPointer = false; }, true);
  /* 그 밖의 이유로 포커스가 팝오버 밖의 요소로 가면(js/progress.js 의 popLeave):
     키보드·프로그램으로 옮겨 갔으면 닫고 연 요소로(지시서 K5-2). 단 마우스·터치로 누른 곳, 글을 칠 칸(검색창 등),
     다른 모듈의 대화상자로 간 포커스는 빼앗지 않고 닫기만. relatedTarget 이 없으면(다른 탭·앱으로 감) 그대로 두고,
     연 요소로 가면 그 요소의 클릭이 닫기·열기를 맡아요 */
  pop.addEventListener('focusout', function (e) {
    if (pop.hidden) return;
    const to = e.relatedTarget;
    const isEl = !!to && to.nodeType === 1;
    const act = !PRG.popLeave ? 'close' : PRG.popLeave({
      to: isEl,
      inPop: isEl && pop.contains(to),
      inAnchor: isEl && !!popAnchor && popAnchor.contains(to),
      pointer: popPointer,
      typing: isEl && (/^(INPUT|TEXTAREA|SELECT)$/.test(to.tagName) || !!to.isContentEditable),
      dialog: isEl && !!to.closest('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"]')
    });
    if (act === 'stay') return;
    const a = popAnchor;
    closePop();
    /* focusout 안에서 focus() 를 부르면 브라우저마다 다르게 굴어서, 포커스가 실제로 옮겨 간 뒤 그대로일 때만 돌려줘요 */
    if (act === 'back') setTimeout(function () { if (pop.hidden && document.activeElement === to) popFocusBack(a); }, 0);
  });
  /* 창 너비가 바뀌면(화면 돌리기 포함) 한 프레임에 한 번 다시 자리 잡기, 연 요소가 안 보이면 닫기 */
  function popResize() {
    if (popRaf || pop.hidden) return;
    popRaf = requestAnimationFrame(function () {
      popRaf = 0;
      if (pop.hidden || innerWidth === popW) return;
      if (!shown(popAnchor)) { closePop(); return; }
      placePop(popAnchor);
    });
  }
  window.addEventListener('resize', popResize);
  window.addEventListener('orientationchange', popResize);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!pop.hidden) closePop(true); else if (nav.classList.contains('open')) setNav(false); } });

  function setProgress(v) { const p = U.qs('#progress'); if (p) p.style.width = (v * 100).toFixed(2) + '%'; }

  /* ---------- 찾기로 가기 (검색어는 주소·서버·캐시·제목에 남기지 않는다) ----------
     goSearch(q, {section}) : 검색어를 sessionStorage['jhb.q'](JSON {q, s}, 찾기 화면이 읽자마자 지움)에 한 번만 넣고
     쿼리·조각 없는 search/ 로 간다. 이미 찾기 화면이면 화면이 'jhb:gosearch'(취소 가능)를 받아 그 자리에서 찾는다.
     sessionStorage 를 못 쓰면 이 탭의 window.name 에 한 번만 싣는다(handoffKit, 위기 말은 문장 없이 카드 종류만. 주소에는 절대 싣지 않음). */
  const Q_KEY = 'jhb.q';
  const HO = handoffKit();
  function goSearch(q, opts) {
    const v = String(q == null ? '' : q).trim();
    const s = opts && opts.section != null ? String(opts.section) : '';
    let handled = false;
    try { handled = !window.dispatchEvent(new CustomEvent('jhb:gosearch', { detail: { q: v, s: s }, cancelable: true })); } catch (e) { }
    if (handled) return;
    let saved = false;
    try {
      if (v || s) sessionStorage.setItem(Q_KEY, JSON.stringify({ q: v, s: s }));
      else sessionStorage.removeItem(Q_KEY);
      saved = true;
    } catch (e) { }
    /* 사이트 데이터를 막은 브라우저(sessionStorage 가 예외): 이 탭의 window.name 에 한 번만 싣고 간다(주소·저장소에는 싣지 않음).
       위기로 감지된 말은 문장 없이 카드 종류만(handoffKit.pack). 찾기 화면을 여는 route() 가 읽자마자 지우고 history.state 로 옮긴다 */
    if (!saved && (v || s)) { try { window.name = HO.pack(v, s, JHB.crisis && JHB.crisis.detect); } catch (e) { } }
    location.href = L('#/search');
  }
  /* window.name 에 실린 넘기기 값: 어느 화면이든 열리면 지우고, 찾기 화면이면 history.state 꼴로 돌려준다(아니면 null) */
  function takeNameHandoff(isSearch) {
    let name = '';
    try { name = String(window.name || ''); } catch (e) { return null; }
    if (name.indexOf(HO.PREFIX) !== 0) return null;
    try { window.name = ''; } catch (e) { }
    return isSearch ? HO.unpack(name, Date.now()) : null;
  }

  /* ---------- 상단 검색창 #q ----------
     팔레트 모듈(js/ui/palette.js)이 있으면 그쪽이 글자 입력·클릭·Enter·아래 화살표·'/'·Ctrl+K 로 팔레트를 연다.
     포커스만으로는 아무것도 열지 않는다(Tab 이 다음 요소로 그대로 넘어감). 팔레트가 없으면(모듈을 못 받음) Enter → goSearch */
  const q = U.qs('#q');
  function hasPalette() { return !!(JHB.ui && JHB.ui.palette); }
  if (q) {
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !hasPalette()) { e.preventDefault(); const v = q.value; q.value = ''; goSearch(v); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || hasPalette() || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = document.activeElement;
    if (!q || (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable))) return;
    e.preventDefault(); q.focus();
  });

  /* ---------- 본문 검색 색인 (찾기 화면 js/pages/search.js 가 JHB.app.search() 로 받음) ---------- */
  let indexJob = null;
  function loadIndex() {
    if (searchIndex) return Promise.resolve(searchIndex);
    if (indexJob) return indexJob;
    indexJob = fetch(BASE + 'data/search-index.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (docs) { searchIndex = JHB.search.build(docs); indexJob = null; return searchIndex; });
    indexJob.catch(function () { indexJob = null; });
    return indexJob;
  }

  /* ---------- 저장한 문서 ---------- */
  function favPage() {
    setTitle('저장한 문서');
    drawNav(null, null, null);
    const f = favs().map(function (s) { return bySlug[s]; }).filter(Boolean);
    show([
      el('nav.crumb', { 'aria-label': '위치' }, [el('a', { href: '#/' }, ['첫 화면']), el('span.sep', null, ['/']), '저장한 문서']),
      el('h1.page-title', null, ['저장한 문서']),
      f.length ? el('ul.rows', { style: 'margin-top:22px' }, f.map(function (a) { return row(a); }))
        : el('p.page-lead', null, ['문서의 "저장" 버튼을 누르면 여기에 모여요. 이 기기의 브라우저에만 저장돼요.'])
    ]);
  }

  /* ---------- 용어 사전 ---------- */
  function glossaryPage() {
    setTitle('용어 사전');
    drawNav('14', null, null);
    const target = where().query.t || '';
    const items = glossary.slice().sort(function (a, b) { return a.term.localeCompare(b.term, 'ko'); });
    const groups = {}, order = [];
    items.forEach(function (t) { const k = U.chosung(t.term); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(t); });
    const input = el('input', { type: 'search', placeholder: '용어 찾기 (한글이나 영문 약어)', 'aria-label': '용어 찾기' });
    const bodyBox = el('div');
    function idOf(t) { return 'gl-' + encodeURIComponent(t.term).replace(/%/g, ''); }
    function draw() {
      const v = input.value.trim(), lv = v.toLowerCase();
      bodyBox.innerHTML = '';
      order.forEach(function (k) {
        const list = groups[k].filter(function (t) { return !v || t.term.indexOf(v) >= 0 || t.def.indexOf(v) >= 0 || (t.en || '').toLowerCase().indexOf(lv) >= 0; });
        if (!list.length) return;
        bodyBox.appendChild(el('section.gl-group', { id: 'glk-' + k }, [el('h2', null, [k === 'A' ? '영문' : k]), el('dl.gl-list', null, list.map(function (t) {
          const rels = (t.related || []).filter(function (r) { return bySlug[r]; });
          return el('div.gl-item', { id: idOf(t) }, [
            el('dt', null, [t.term, t.en ? el('span.gl-en', null, [t.en]) : null]),
            el('dd', null, [t.def, rels.length ? el('div.gl-rel', null, rels.map(function (r) { return el('a', { href: '#/a/' + r }, [bySlug[r].title]); })) : null])
          ]);
        }))]));
      });
      if (!bodyBox.children.length) bodyBox.appendChild(el('p.empty', null, ['그 말이 들어간 용어가 없어요. 본문 찾기로 찾아보세요.']));
    }
    input.addEventListener('input', draw);
    show([
      el('nav.crumb', { 'aria-label': '위치' }, [el('a', { href: '#/' }, ['첫 화면']), el('span.sep', null, ['/']), '용어 사전']),
      el('h1.page-title', null, ['용어 사전']),
      el('p.page-lead', null, ['문서에 나오는 용어 ' + items.length + '개를 가나다순으로 모았어요. 문서 본문에서 점선 밑줄이 있는 말을 누르면 같은 풀이가 나와요.']),
      el('form.searchbar', { onsubmit: function (e) { e.preventDefault(); } }, [input]),
      el('nav.gl-letters', { 'aria-label': '첫 글자로 이동' }, order.map(function (k) {
        return el('a', { href: '#glk-' + k, onclick: function (e) { e.preventDefault(); const n = document.getElementById('glk-' + k); if (n) n.scrollIntoView({ block: 'start' }); } }, [k === 'A' ? 'A' : k]);
      })),
      bodyBox
    ]);
    draw();
    if (target && termByName[target]) {
      const n = document.getElementById(idOf(termByName[target]));
      if (n) { n.scrollIntoView({ block: 'center' }); n.classList.add('flash'); n.style.background = 'var(--mark)'; setTimeout(function () { n.style.background = ''; }, 2000); }
    }
  }

  /* ---------- 소개 ---------- */
  /* 소개 본문(data/about.js)은 모든 화면에 싣지 않는다(T11). 빌드한 about/ 에는 같은 마크업(tools/build-pages.cjs 의 aboutMainHtml)이
     미리 들어 있어서 그대로 살리고, 정적 본문이 없을 때(오프라인 틀 app-shell)만 받아서 그린다 */
  function about() {
    setTitle('이 백과에 대해');
    drawNav(null, null, null);
    const head = function () { return [el('nav.crumb', { 'aria-label': '위치' }, [el('a', { href: '#/' }, ['첫 화면']), el('span.sep', null, ['/']), '이 백과에 대해']), el('h1.page-title', null, ['이 백과에 대해'])]; };
    const pre = U.qsa('.prose', app).filter(function (n) { return n.parentNode === app; })[0];
    if (pre && U.qs('nav.crumb', app)) { pageEvent(); scrollToHash(); return; }
    const draw = function () { show(head().concat([el('div.prose', { html: JHB.aboutHtml })])); };
    if (JHB.aboutHtml) return draw();
    show(head().concat([el('p.empty', null, ['화면을 불러오고 있어요.'])]), { silent: true });
    load('data/about.js').then(function () {
      if (where().path[0] !== 'about') return;
      if (JHB.aboutHtml) draw(); else throw new Error('소개 본문 없음');
    }).catch(function () {
      show(head().concat([el('p.fp-fail', { role: 'status' }, ['화면을 불러오지 못했어요. 인터넷 연결을 확인하고 ', reloadBtn(), '해 주세요.'])]));
    });
  }

  /* ---------- 읽기 코스 ---------- */
  /* 코스에 "들어갔다"는 기록: 코스 화면을 열었거나 ?course= 로 그 코스의 글을 열었을 때. 기록 쉼이면 남기지 않는다 */
  function enterCourse(id) {
    if (!PROG || privacy.paused() || !PROG.markCourse || !getCourse(id)) return false;
    return PROG.markCourse(id);
  }
  /* 코스 카드(첫 화면·코스 목록). JHB.app.courseCard 로도 공개(첫 화면 모듈이 같은 마크업을 쓰게) */
  function courseCard(c) {
    if (!c || !Array.isArray(c.steps)) return null;
    const p = courseProgress(c);
    return el('a.course', { href: '#/course/' + c.id }, [
      el('div.who', null, [whoText(c.who)]),
      el('h3', null, [c.title]),
      el('p', null, [c.intro]),
      bar(p.pct, [el('span', null, [p.read ? p.read + ' / ' + p.total + ' 읽음' : '문서 ' + p.total + '개']), el('span', null, [p.pct ? p.pct + '%' : ''])])
    ]);
  }
  function coursesPage() {
    setTitle('읽기 코스');
    drawNav(null, null, null);
    show([
      el('nav.crumb', { 'aria-label': '위치' }, [el('a', { href: '#/' }, ['첫 화면']), el('span.sep', null, ['/']), '읽기 코스']),
      el('h1.page-title', null, ['읽기 코스']),
      el('p.page-lead', null, ['지금 상황에 맞는 코스를 고르면 읽을 순서를 안내해요. 읽은 문서는 표시가 남고, 첫 화면에서 이어서 읽을 수 있어요. 기록은 이 기기에만 저장돼요.']),
      COURSES.length ? el('div.courses', { style: 'margin-top:22px' }, COURSES.map(courseCard)) : el('p.empty', null, ['코스를 준비하고 있어요.'])
    ]);
  }
  function coursePage(id) {
    const c = getCourse(id);
    if (!c) return notFound();
    enterCourse(c.id);
    setTitle(c.title);
    drawNav(null, null, null);
    const p = courseProgress(c);
    const next = p.next && bySlug[p.next.slug];
    show([
      el('nav.crumb', { 'aria-label': '위치' }, [el('a', { href: '#/' }, ['첫 화면']), el('span.sep', null, ['/']), el('a', { href: '#/courses' }, ['읽기 코스'])]),
      el('p', { style: 'font-size:13px;color:var(--muted)' }, [whoText(c.who)]),
      el('h1.page-title', null, [c.title]),
      el('p.page-lead', null, [c.intro]),
      el('div', { style: 'max-width:420px;margin-top:14px' }, [bar(p.pct, [el('span', null, [p.read + ' / ' + p.total + ' 읽음']), el('span', null, [p.pct + '%'])])]),
      next ? el('p', { style: 'margin-top:14px' }, [el('a.btn', { href: '#/a/' + next.slug + '?course=' + c.id }, [p.read ? '이어서 읽기' : '첫 문서부터 읽기'])]) : el('p.page-lead', null, ['이 코스의 문서를 모두 읽으셨어요.']),
      el('ol.steps', null, c.steps.map(function (st) {
        const a = bySlug[st.slug]; if (!a) return null;
        return el('li.step', { class: PROG && PROG.isRead(st.slug) ? 'done' : '' }, [el('a', { href: '#/a/' + a.slug + '?course=' + c.id }, [a.title]), el('span.why', null, [st.why || a.summary || ''])]);
      }))
    ]);
  }
  function courseNav(slug) {
    if (!COURSES.length) return null;
    const wanted = where().query.course;
    let c = getCourse(wanted);
    if (!c || !c.steps.some(function (st) { return st.slug === slug; })) {
      /* ?course= 가 없으면 들어간 적 있는 코스만 짐작한다(읽은 글만으로 코스 이름을 붙이지 않게, 첫 화면 이어서 읽기와 같은 기준) */
      const entered = PROG && PROG.enteredCourses ? PROG.enteredCourses() : null;
      const cands = COURSES.filter(function (x) {
        return x.steps.some(function (st) { return st.slug === slug; }) && (!entered || Object.prototype.hasOwnProperty.call(entered, x.id));
      });
      if (!cands.length) return null;
      cands.sort(function (x, y) { return courseProgress(y).pct - courseProgress(x).pct; });
      c = cands[0];
      if (!wanted && courseProgress(c).read === 0) return null;
    }
    const i = c.steps.findIndex(function (st) { return st.slug === slug; });
    const next = c.steps.slice(i + 1).map(function (st) { return bySlug[st.slug]; }).filter(Boolean)[0];
    return el('div.course-nav', null, [
      el('span', null, ['"', el('a', { href: '#/course/' + c.id }, [c.title]), '" 코스 ' + (i + 1) + ' / ' + c.steps.length + '. ']),
      next ? el('span', null, ['다음은 ', el('a', { href: '#/a/' + next.slug + '?course=' + c.id }, [next.title]), '.']) : el('span', null, ['마지막 문서예요.'])
    ]);
  }
  function notFound() {
    setTitle('없는 페이지');
    drawNav(null, null, null);
    show([el('h1.page-title', null, ['그런 문서가 없어요']), el('p.page-lead', null, ['주소가 바뀌었을 수 있어요. 위의 검색창에서 찾거나 ', el('a', { href: '#/', style: 'color:var(--accent);text-decoration:underline' }, ['첫 화면']), '으로 가세요.'])]);
  }

  /* 화면 확장 모듈(js/ui/*.js)이 쓰는 공개 API */
  JHB.app = {
    BASE: BASE, L: L, go: go, where: where, articles: articles, sections: sections, bySlug: bySlug, secById: secById, glossary: glossary, courses: COURSES, progress: PROG,
    sectionArticles: sectionArticles, isFav: isFav, toggleFav: toggleFav, favs: favs, openPop: openPop, closePop: closePop, announce: announce, effectiveTheme: effectiveTheme,
    /* K1: 코스 카드(첫 화면 모듈이 같은 마크업을 쓰게) */
    courseCard: courseCard,
    setNav: setNav, el: el, esc: esc, store: U.store, nav: nav, main: app, row: row, spine: spine, search: function () { return loadIndex(); },
    /* 0B: 검색어를 주소에 싣지 않고 찾기 화면으로 */
    goSearch: goSearch,
    /* 0A 기반 공사: 특집 화면·지연 로딩·화면 도구·문서 자리·고지·기기 안 기록 */
    pages: PAGES, pageById: pageById, registerPage: registerPage,
    load: load, loadData: loadData, loadArticle: function (slug) { return loadArticle(slug); },
    /* links 는 getter: 정적 문서 페이지는 앱 뒤에 data/links.js 를 싣고, 앱이 새로 그리는 문서는 needLinks() 로 받아서(T11) */
    md: md || null, get links() { return linksNow(); },
    show: show, setTitle: setTitle, crumb: crumb, notFound: notFound, onCleanup: onCleanup,
    slot: slot, mount: mountInSlot, notice: notice, privacy: privacy, reducedMotion: reducedMotion
  };
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register(BASE + 'sw.js').catch(function () { }); });
    /* 기록 쉼 상태를 워커에 맞춰 둔다(다른 탭에서 바꿨거나 워커 저장소가 비었을 수 있어서, 페이지를 열 때마다) */
    tellWorker(privacy.paused());
    window.addEventListener('storage', function (e) { if (e.key === PRIV_PREFIX + 'paused' || e.key === null) tellWorker(privacy.paused()); });
    /* 새 서비스 워커가 이 페이지를 넘겨받으면(새 판 설치) jhb:update 를 알리고, 토스트가 있으면 한 줄 안내.
       처음 설치(원래 제어하던 워커가 없음)는 새 판이 아니므로 알리지 않는다 */
    let hadController = !!navigator.serviceWorker.controller, updateSaid = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; }
      if (updateSaid) return;
      updateSaid = true;
      window.dispatchEvent(new CustomEvent('jhb:update'));
      if (JHB.ui && typeof JHB.ui.toast === 'function') JHB.ui.toast('새 판이 준비됐어요. 새로 고치면 보여요.', { duration: 6000 });
    });
  }
})();
