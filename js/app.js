/* 조현병 백과 · 라우터와 화면
   경로(실제 페이지): ./ 첫 화면, s/<섹션id>/, a/<slug>/, fav/, glossary/?t=, about/, random/,
   그리고 특집 화면 <id>/ (data/pages/<id>.json 선언 → data/pages.js 의 JHB.pages, 코드는 js/pages/<id>.js 가 registerPage).
   찾기(search/)도 특집 화면이에요. 검색어는 주소에 싣지 않고 goSearch() 가 sessionStorage 로 한 번만 넘겨요.
   각 페이지의 <html data-base data-route> 로 현재 위치를 안다. 화면에서 쓰는 '#/…' 링크는 실제 경로로 바꿔 끼운다.
   공개 API(JHB.app)와 이벤트 규칙은 docs/UI모듈가이드.md */
(function () {
  const U = JHB.util, el = U.el, esc = U.esc, md = JHB.md, P = JHB.paths;
  const BASE = document.documentElement.getAttribute('data-base') || '';
  function L(h) { return P.link(h, BASE); }
  function go(h) { location.href = L(h); }
  /* 화면에 새로 붙는 '#/…' 링크를 실제 경로로 바꾼다 */
  function fixLinks(n) {
    if (!n || n.nodeType !== 1) return;
    if (n.matches('a[href^="#/"]')) n.setAttribute('href', L(n.getAttribute('href')));
    U.qsa('a[href^="#/"]', n).forEach(function (a) { a.setAttribute('href', L(a.getAttribute('href'))); });
  }
  /* 이미 열린 페이지에서 옛 해시 주소(#/…)로 바뀌면 새 주소로 옮긴다 */
  window.addEventListener('hashchange', function () { if (location.hash.indexOf('#/') === 0) location.replace(L(location.hash)); });
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
  const PROG = (JHB.progress && JHB.progress.create) ? JHB.progress.create(U.store) : null;
  const COURSES = JHB.courses || [];
  const LINKS = JHB.links || null;
  const courseById = {}; COURSES.forEach(function (c) { courseById[c.id] = c; });
  /* 특집 화면 선언(data/pages.js). 없어도 앱은 동작한다 */
  const PAGES = Array.isArray(JHB.pages) ? JHB.pages.filter(function (d) { return d && typeof d.id === 'string'; }) : [];
  const pageById = {}; PAGES.forEach(function (d) { pageById[d.id] = d; });
  function readMark(slug) { return PROG && PROG.isRead(slug) ? el('span.read-mark', null, ['읽음']) : null; }
  function courseProgress(c) { return PROG ? PROG.courseProgress(c) : { read: 0, total: c.steps.length, pct: 0, next: c.steps[0] }; }
  function bar(pct, label) { return el('div', null, [el('div.bar', { role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, [el('i', { style: 'width:' + pct + '%' })]), label ? el('div.bar-label', null, label) : null]); }
  let pageCleanup = [];

  function sectionArticles(id) {
    return articles.filter(function (a) { return a.section === id; })
      .sort(function (a, b) { return (a.order || 999) - (b.order || 999) || a.title.localeCompare(b.title, 'ko'); });
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
     'all' 은 jhb.privacy.* 설정도 지우지만 기록 쉼(paused)은 남긴다: "전부 지우기"를 눌렀는데
     아무 안내 없이 기록이 다시 시작되면 사용자가 기대한 것과 반대라서(0A 뒤 점검). 최근 검색 저장(recentq)은 꺼진다(기본값) */
  function privClear(ids) {
    const all = ids === 'all';
    if (!all && (ids == null || ids === '' || (Array.isArray(ids) && !ids.length))) return [];
    const want = all ? null : (Array.isArray(ids) ? ids : [ids]);
    const done = [];
    privKinds.forEach(function (k) {
      if (want && want.indexOf(k.id) < 0) return;
      k.keys.forEach(function (key) { U.store.remove(key); });
      k.session.forEach(ssRemove);
      done.push(k.id);
    });
    if (all) {
      const keepPaused = U.store.get(PRIV_PREFIX + 'paused', false) === true;
      lsKeys().forEach(function (key) { if (key.indexOf(PRIV_PREFIX) === 0) U.store.remove(key); });
      if (keepPaused) U.store.set(PRIV_PREFIX + 'paused', true);
    }
    /* 최근 검색을 지우면 이 탭의 찾기 화면 기록(history.state {q, s, at})도 되살리지 않게 지운 시각을 남긴다.
       다른 기록 항목의 state 는 웹 API 로 지울 수 없어서, 찾기 화면이 이 시각보다 오래된 state 를 버린다(js/pages/search.js) */
    if (all || done.indexOf('recentq') >= 0) { try { sessionStorage.setItem(Q_CLEARED_KEY, String(Date.now())); } catch (e) { } }
    window.dispatchEvent(new CustomEvent('jhb:privacy', { detail: { action: 'clear', ids: all ? 'all' : done } }));
    return done;
  }
  const privacy = {
    paused: function () { return U.store.get(PRIV_PREFIX + 'paused', false) === true; },
    setPaused: function (b) {
      if (b) U.store.set(PRIV_PREFIX + 'paused', true); else U.store.remove(PRIV_PREFIX + 'paused');
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
  [
    { id: 'read', label: '읽은 글', keys: ['jhb.read'] },
    { id: 'recent', label: '최근 읽은 글', keys: ['jhb.recent'] },
    { id: 'pos', label: '읽던 자리', keys: ['jhb.ui.reading.pos'] },
    { id: 'recentq', label: '최근 검색', keys: ['jhb.ui.palette.recentq'], session: ['jhb.q'] },
    { id: 'fav', label: '저장한 글', keys: ['jhb.fav'] },
    { id: 'role', label: '역할', keys: ['jhb.ui.home.role'] },
    { id: 'settings', label: '보기 설정', keys: ['jhb.theme', 'jhb.fs', 'jhb.ui.settings', 'jhb.ui.reading.mode', 'jhb.ui.home.installHidden'] }
  ].forEach(privRegister);
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
  function fsLabel() { const cur = document.documentElement.getAttribute('data-fs') || 'm'; U.qs('#btn-fs').setAttribute('aria-label', '글자 크기: ' + ({ s: '작게', m: '보통', l: '크게' })[cur] + '. 누르면 다음 크기로 바뀌어요'); }
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
  function jumpTo(id) {
    return function (e) {
      e.preventDefault();
      const n = document.getElementById(id);
      if (n) n.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      setNav(false);
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
    closePop();
    app.innerHTML = '';
    (nodes || []).forEach(function (n) { if (n) app.appendChild(n); });
    if (!show.keepScroll) window.scrollTo(0, 0);
    show.keepScroll = false;
    setProgress(0);
    if (opts && opts.silent) return;
    const w = where();
    /* 특집 화면은 kind 와 id 가 모두 화면 id(주소에 두 번째 칸이 없어서) */
    const detail = { kind: w.path[0] || 'home', id: w.path[1] || (w.path.length === 1 && hasPage(w.path[0]) ? w.path[0] : null), query: w.query };
    if (opts && opts.loading) detail.loading = true;
    window.dispatchEvent(new CustomEvent('jhb:page', { detail: detail }));
  }
  function hasPage(id) { return Object.prototype.hasOwnProperty.call(pageById, id); }
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
  function loadData(name) {
    name = String(name || '');
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return Promise.reject(new Error('잘못된 데이터 이름: ' + name));
    if (!kbCache[name]) {
      /* 응답은 왔는데 파일이 없거나(404) JSON 이 깨진 것은 연결 문제가 아니라 자료 문제(reason 'data').
         fetch 자체가 실패한 것(오프라인 등, TypeError)만 'net' */
      kbCache[name] = fetch(BASE + 'data/kb/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw dataError('HTTP ' + r.status + ': data/kb/' + name + '.json');
        return r.json().catch(function () { throw dataError('JSON 오류: data/kb/' + name + '.json'); });
      });
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
  function featureNotices(d) {
    /* 일반 고지는 뺄 수 없고 늘 맨 앞. 위기 줄은 crisisLine 하나로만(notice 의 'crisis' 와 겹쳐 두 번 붙지 않게) */
    const kinds = ['general'].concat((d.notice || []).filter(function (k) { return k !== 'general' && k !== 'crisis'; }));
    const list = kinds.map(function (k) { return notice(k, k === 'dated' ? d.updated : undefined); });
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
      d.hasCss ? load('css/pages/' + id + '.css').catch(function () { return null; }) : null /* 스타일이 없어도 그린다 */
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
        try { mount.innerHTML = String(page.staticHtml({ data: data, esc: esc, articles: bySlug, sections: sections, page: d }) || ''); }
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

  /* ---------- 첫 화면 ---------- */
  function home() {
    setTitle('');
    drawNav(null, null, null);
    /* 오늘의 문서: 위기·응급 태그 글과 15분류(자주 묻는 질문)는 맥락 없이 첫 화면에 뜨지 않게 뺀다 */
    const todayPool = articles.filter(function (a) {
      const t = a.tags || [];
      return String(a.section) !== '15' && t.indexOf('위기') < 0 && t.indexOf('응급') < 0;
    });
    const pick = todayPool.length ? todayPool[U.dayIndex(todayPool.length)] : null;
    const recent = U.store.get('jhb.recent', []).map(function (s) { return bySlug[s]; }).filter(Boolean).slice(0, 5);
    const srcCount = (JHB.toc && JHB.toc.sources) || null;
    const dayTerms = [];
    if (glossary.length) { const start = U.dayIndex(glossary.length); for (let i = 0; i < 6; i++) dayTerms.push(glossary[(start + i * 23) % glossary.length]); }
    show([el('div.portal', null, [
      el('header.portal-head', null, [
        el('h1.portal-title', null, ['조현병 백과']),
        el('p.portal-sub', null, ['증상과 진단, 약과 치료, 일상과 제도, 최신 연구까지. 조현병에 관해 궁금한 것을 출처와 함께 찾아볼 수 있어요. 어려운 말에는 밑줄이 있고, 누르면 뜻이 나와요.']),
        el('div.portal-stats', null, [
          el('span', null, [el('b', null, [String(articles.length)]), '개 문서']),
          el('span', null, [el('b', null, [String(glossary.length)]), '개 용어']),
          srcCount ? el('span', null, [el('b', null, [srcCount.toLocaleString('ko-KR')]), '개 출처']) : null
        ])
      ]),
      pick ? el('section', { 'data-sec': 'today' }, [
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
      ]) : null,
      (function () {
        const c = PROG && PROG.continueReading(articles, COURSES);
        if (!c || !c.article || !c.article.slug) return null;
        const q2 = c.course ? '?course=' + c.course.id : '';
        return el('section', { 'data-sec': 'continue' }, [
          el('h2.h-sec', null, ['이어서 읽기']),
          el('div.continue', null, [
            el('span.k', null, [c.reason || '']),
            el('h3', null, [el('a', { href: '#/a/' + c.article.slug + q2 }, [c.article.title])]),
            el('a.btn', { href: '#/a/' + c.article.slug + q2 }, ['계속 읽기'])
          ])
        ]);
      })(),
      COURSES.length ? el('section', { 'data-sec': 'courses' }, [
        el('h2.h-sec', null, ['읽기 코스', el('a.more', { href: '#/courses' }, ['전체 보기'])]),
        el('p.page-lead', { style: 'margin:-4px 0 14px' }, ['상황에 맞게 읽을 순서를 정리했어요. 어디서 시작할지 막막할 때 골라 보세요.']),
        el('div.courses', null, COURSES.slice(0, 4).map(courseCard))
      ]) : null,
      recent.length ? el('section', { 'data-sec': 'recent' }, [
        el('h2.h-sec', null, ['최근에 읽은 문서']),
        el('ul.rows', null, recent.map(function (a) { return row(a); }))
      ]) : null,
      el('section', { 'data-sec': 'index' }, [
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
      ]),
      dayTerms.length ? el('section', { 'data-sec': 'terms' }, [
        el('h2.h-sec', null, ['오늘의 용어', el('a.more', { href: '#/glossary' }, ['용어 사전 전체'])]),
        el('dl.terms', null, dayTerms.map(function (g) {
          const rel = (g.related || []).filter(function (r) { return bySlug[r]; })[0];
          return el('div', null, [el('dt', null, [rel ? el('a', { href: '#/a/' + rel }, [g.term]) : g.term]), el('dd', null, [g.def])]);
        }))
      ]) : null,
      el('p.portal-note', null, ['이 백과의 글은 AI가 공개 자료를 바탕으로 초안을 쓰고 출처를 확인해 만들었어요. 전문가 감수는 받지 않았어요. 진단과 치료는 담당 의사와 상의하세요.'])
    ])]);
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

  function article(slug) {
    const a = bySlug[slug];
    if (!a) {
      /* 배포 직후 옛 글 목록(data/toc.js)에 아직 없는 새 글: 정적 본문이 있으면 지우지 않는다 */
      const sb = U.qs('article.doc .body', app);
      if (sb) return keepStatic(sb, '새로 올라온 글이에요. 화면을 새로 고치면 목차와 용어 풀이가 함께 보여요.');
      return notFound();
    }
    const s = secById[a.section] || {};
    setTitle(a.title);
    drawNav(a.section, slug, null);
    show([el('p.empty', null, ['문서를 불러오고 있어요.'])], { loading: true });
    loadArticle(a).then(function (doc) {
      const meta = Object.assign({}, a, doc.meta);
      const r = md.render(doc.body);
      const tags = meta.tags || [];
      const srcs = meta.sources || [];
      const list = sectionArticles(a.section);
      const idx = list.findIndex(function (x) { return x.slug === slug; });
      const prev = idx > 0 ? list[idx - 1] : null, next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
      const related = articles.filter(function (x) { return x.slug !== slug && (x.tags || []).some(function (t) { return tags.indexOf(t) >= 0; }); })
        .map(function (x) { return { a: x, n: (x.tags || []).filter(function (t) { return tags.indexOf(t) >= 0; }).length }; })
        .sort(function (p, q) { return q.n - p.n; }).slice(0, 6).map(function (x) { return x.a; });
      const minutes = meta.minutes || md.readingMinutes(doc.body);
      const metaText = md.docMetaText(minutes, meta.updated);
      const points = md.pointList(meta.points);
      const isCrisis = tags.indexOf('위기') >= 0, isEmergency = tags.indexOf('응급') >= 0;
      /* 확장 자리: 모듈이 JHB.app.mount(이름, 노드, 순서)로 끼운다. 비어 있으면 css 에서 숨김 */
      const slots = {};
      SLOT_NAMES.forEach(function (n) { slots[n] = el('div.doc-slot', { 'data-slot': n }); });
      if (points.length) { const kp = fromHtml(md.keypointsHtml(points, isCrisis)); kp.setAttribute('data-order', '-1000000'); slots.lead.appendChild(kp); }

      function favBtn() {
        const b = el('button.btn', { type: 'button', class: isFav(slug) ? 'on' : '', 'aria-pressed': isFav(slug) ? 'true' : 'false' }, [isFav(slug) ? '저장됨' : '저장']);
        b.addEventListener('click', function () {
          const on = toggleFav(slug);
          U.qsa('.js-fav').forEach(function (x) { x.className = 'btn js-fav' + (on ? ' on' : ''); x.textContent = on ? '저장됨' : '저장'; x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        });
        b.classList.add('js-fav');
        return b;
      }
      function shareBtn() {
        const b = el('button.btn', { type: 'button' }, ['공유']);
        b.addEventListener('click', function () {
          const url = location.href;
          if (navigator.share) navigator.share({ title: a.title + ' - 조현병 백과', url: url }).catch(function () { });
          else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { b.textContent = '주소 복사됨'; });
        });
        return b;
      }

      const body = el('div.body', { html: r.html });
      /* 요약 보기에서 늘 보이는 소절(core). 첫 번째 h2 는 언제나 core(요약 보기가 글의 입구를 숨기지 않게).
         소절 안에 위기 연락처(109·1577-0199·119·112·1393, tel: 링크 포함)가 있으면 그 소절도 core(위기 안내는 접기에서도 빠지지 않음) */
      U.qsa('h2', body).forEach(function (h, i) {
        const t = h.textContent.trim();
        h.setAttribute('data-key', i === 0 || CORE_H2.test(t) || sectionHasContact(h) ? 'core' : 'detail');
      });
      const notes = el('div.notes');
      const infobox = el('section.infobox', { 'aria-label': '문서 정보' }, [
        el('div.infobox-h', null, [spine(s), '문서 정보']),
        el('dl', null, [
          el('dt', null, ['분류']), el('dd', null, [el('a', { href: '#/s/' + s.id }, [s.title || ''])]),
          el('dt', null, ['근거']), el('dd', null, [ev(meta) || '없음']),
          el('dt', null, ['출처']), el('dd', null, [srcs.length ? el('a', { href: '#sources', onclick: jumpTo('sources') }, [srcs.length + '개']) : '없음']),
          el('dt', null, ['읽는 시간']), el('dd', null, ['약 ' + minutes + '분']),
          meta.updated ? el('dt', null, ['고친 날']) : null, meta.updated ? el('dd', null, [U.fmtDate(meta.updated)]) : null
        ]),
        el('div.infobox-actions', null, [favBtn(), shareBtn()])
      ]);

      show([
        el('nav.crumb', { 'aria-label': '위치' }, [el('a', { href: '#/' }, ['첫 화면']), el('span.sep', null, ['/']), el('a', { href: '#/s/' + s.id }, [s.title || ''])]),
        el('article.doc', null, [
          el('div.doc-main', null, [
            el('header.doc-head', null, [
              el('h1.page-title', null, [meta.title]),
              meta.summary ? el('p.doc-summary', null, [meta.summary]) : null,
              /* 정적 페이지의 p.doc-meta-s 와 같은 글자(js/md.js 의 docMetaText) */
              el('div.doc-meta-m', null, [ev(meta), el('span', null, [metaText.minutes]), metaText.updated ? el('span', null, [metaText.updated]) : null,
                el('span.acts', null, [favBtn(), shareBtn()])])
            ]),
            isCrisis ? fromHtml(md.crisisHtml()) : null,
            isEmergency ? fromHtml(md.emergencyHtml()) : null,
            slots.lead,
            r.toc.length >= 3 ? el('details.toc-m', null, [el('summary', null, ['이 문서의 차례']), el('ol', null, r.toc.map(function (t) {
              return el('li', { class: t.level === 3 ? 'l3' : '' }, [el('a', { href: '#' + t.id, onclick: jumpTo(t.id) }, [t.text])]);
            }))]) : null,
            body,
            slots['after-body'],
            srcs.length ? el('section.sources', { id: 'sources' }, [el('h2', null, ['출처']), el('ol', null, srcs.map(function (x, i) {
              return el('li', { id: 'src-' + (i + 1) }, [x.org ? x.org + '. ' : '', x.url ? el('a', { href: x.url, target: '_blank', rel: 'noopener', 'aria-label': (x.title || x.url) + ' (새 창에서 열림)' }, [x.title || x.url]) : (x.title || ''), x.year ? ' (' + x.year + ')' : '']);
            }))]) : null,
            el('p.disclaimer', null, [md.DISCLAIMER]),
            courseNav(slug),
            backlinks(slug),
            related.length ? el('section.see-also', null, [el('h2', null, ['함께 읽기']), el('ul', null, related.map(function (x) {
              return el('li', null, [el('a', { href: '#/a/' + x.slug }, [spine(secById[x.section]), x.title])]);
            }))]) : null,
            (prev || next) ? el('nav.pager', { 'aria-label': '같은 분류의 앞뒤 문서' }, [
              prev ? el('a.prev', { href: '#/a/' + prev.slug }, [el('small', null, ['앞 문서']), prev.title]) : null,
              next ? el('a.next', { href: '#/a/' + next.slug }, [el('small', null, ['다음 문서']), next.title]) : null
            ]) : null,
            slots.end
          ]),
          el('aside.doc-margin', { 'aria-label': '문서 정보와 용어 풀이' }, [infobox, slots.margin, notes])
        ])
      ]);
      curSlots = slots;
      /* 왼쪽 목차는 불러오는 동안 이미 그렸으니 이 글의 차례만 끼운다(전체를 두 번 그리지 않음) */
      navToc(slug, r.toc);

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
              el('a', { href: '#src-' + n, onclick: function (ev2) { ev2.preventDefault(); closePop(); const li = document.getElementById('src-' + n); if (li) { li.scrollIntoView({ block: 'center' }); li.classList.add('flash'); setTimeout(function () { li.classList.remove('flash'); }, 1800); } } }, ['출처 목록에서 보기'])
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

      /* 기록 쉼이면 읽음 표시·최근 읽은 글을 쓰지 않는다 */
      if (!privacy.paused()) {
        if (PROG) PROG.markRead(slug);
        const recent = U.store.get('jhb.recent', []).filter(function (x) { return x !== slug; }); recent.unshift(slug); U.store.set('jhb.recent', recent.slice(0, 20));
      }
      window.dispatchEvent(new CustomEvent('jhb:article', { detail: { slug: slug, article: a, meta: meta, toc: r.toc, prev: prev, next: next, minutes: minutes, body: body, points: points.length ? points.slice() : null } }));
    }).catch(function (e) {
      show([el('p.empty', null, ['문서를 불러오지 못했어요(' + e.message + '). 인터넷 연결을 확인하고 새로고침해 주세요.'])]);
    });
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

  /* ---------- 팝오버 ---------- */
  const pop = U.qs('#pop');
  let popAnchor = null;
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
    setTimeout(function () { pop.focus({ preventScroll: true }); }, 0);
    if (innerWidth <= 760) { pop.classList.add('sheet'); pop.style.left = ''; pop.style.top = ''; }
    else {
      pop.classList.remove('sheet');
      const r = anchor.getBoundingClientRect();
      const w = pop.offsetWidth, h = pop.offsetHeight;
      let left = r.left + scrollX + r.width / 2 - w / 2;
      left = Math.max(scrollX + 12, Math.min(left, scrollX + innerWidth - w - 12));
      let top = r.bottom + scrollY + 8;
      if (r.bottom + h + 16 > innerHeight && r.top - h - 8 > 0) top = r.top + scrollY - h - 8;
      pop.style.left = left + 'px'; pop.style.top = top + 'px';
    }
  }
  function closePop(refocus) {
    if (pop.hidden) return;
    const a = popAnchor;
    pop.hidden = true;
    if (a) { a.setAttribute('aria-expanded', 'false'); }
    popAnchor = null;
    if (refocus && a && document.contains(a)) a.focus();
  }
  document.addEventListener('click', function (e) {
    if (pop.hidden) return;
    if (pop.contains(e.target) || (popAnchor && popAnchor.contains(e.target))) return;
    closePop();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!pop.hidden) closePop(true); else if (nav.classList.contains('open')) setNav(false); } });

  function setProgress(v) { const p = U.qs('#progress'); if (p) p.style.width = (v * 100).toFixed(2) + '%'; }

  /* ---------- 찾기로 가기 (검색어는 주소·서버·캐시·제목에 남기지 않는다) ----------
     goSearch(q, {section}) : 검색어를 sessionStorage['jhb.q'](JSON {q, s}, 찾기 화면이 읽자마자 지움)에 한 번만 넣고
     쿼리·조각 없는 search/ 로 간다. 이미 찾기 화면이면 화면이 'jhb:gosearch'(취소 가능)를 받아 그 자리에서 찾는다.
     sessionStorage 를 못 쓰면 검색어 없이 search/ 로 가서 입력창에 포커스만 준다(주소에는 절대 싣지 않음). */
  const Q_KEY = 'jhb.q';
  function goSearch(q, opts) {
    const v = String(q == null ? '' : q).trim();
    const s = opts && opts.section != null ? String(opts.section) : '';
    let handled = false;
    try { handled = !window.dispatchEvent(new CustomEvent('jhb:gosearch', { detail: { q: v, s: s }, cancelable: true })); } catch (e) { }
    if (handled) return;
    try {
      if (v || s) sessionStorage.setItem(Q_KEY, JSON.stringify({ q: v, s: s }));
      else sessionStorage.removeItem(Q_KEY);
    } catch (e) { /* 검색어 없이 간다 */ }
    location.href = L('#/search');
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
  function about() {
    setTitle('이 백과에 대해');
    drawNav(null, null, null);
    show([
      el('nav.crumb', { 'aria-label': '위치' }, [el('a', { href: '#/' }, ['첫 화면']), el('span.sep', null, ['/']), '이 백과에 대해']),
      el('h1.page-title', null, ['이 백과에 대해']),
      el('div.prose', { html: JHB.aboutHtml })
    ]);
  }

  /* ---------- 읽기 코스 ---------- */
  function courseCard(c) {
    const p = courseProgress(c);
    return el('a.course', { href: '#/course/' + c.id }, [
      el('div.who', null, [c.who === '모두' ? '당사자와 가족에게' : c.who + '에게']),
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
    const c = courseById[id];
    if (!c) return notFound();
    setTitle(c.title);
    drawNav(null, null, null);
    const p = courseProgress(c);
    const next = p.next && bySlug[p.next.slug];
    show([
      el('nav.crumb', { 'aria-label': '위치' }, [el('a', { href: '#/' }, ['첫 화면']), el('span.sep', null, ['/']), el('a', { href: '#/courses' }, ['읽기 코스'])]),
      el('p', { style: 'font-size:13px;color:var(--muted)' }, [c.who === '모두' ? '당사자와 가족에게' : c.who + '에게']),
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
    let c = wanted && courseById[wanted];
    if (!c || !c.steps.some(function (st) { return st.slug === slug; })) {
      const cands = COURSES.filter(function (x) { return x.steps.some(function (st) { return st.slug === slug; }); });
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
  function backlinks(slug) {
    if (!LINKS || !LINKS.in || !LINKS.in[slug] || !LINKS.in[slug].length) return null;
    const list = LINKS.in[slug].map(function (x) { return bySlug[x]; }).filter(Boolean);
    const shown = list.slice(0, 10);
    return el('section.backlinks', null, [
      el('h2', null, ['이 문서를 가리키는 문서 ' + list.length + '개']),
      el('ul', null, shown.map(function (x) { return el('li', null, [el('a', { href: '#/a/' + x.slug }, [spine(secById[x.section]), x.title])]); })),
      list.length > shown.length ? el('p.more', null, ['그 밖에 ' + (list.length - shown.length) + '개 문서가 더 있어요.']) : null
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
    setNav: setNav, el: el, esc: esc, store: U.store, nav: nav, main: app, row: row, spine: spine, search: function () { return loadIndex(); },
    /* 0B: 검색어를 주소에 싣지 않고 찾기 화면으로 */
    goSearch: goSearch,
    /* 0A 기반 공사: 특집 화면·지연 로딩·화면 도구·문서 자리·고지·기기 안 기록 */
    pages: PAGES, pageById: pageById, registerPage: registerPage,
    load: load, loadData: loadData, loadArticle: function (slug) { return loadArticle(slug); },
    md: md || null, links: LINKS,
    show: show, setTitle: setTitle, crumb: crumb, notFound: notFound, onCleanup: onCleanup,
    slot: slot, mount: mountInSlot, notice: notice, privacy: privacy, reducedMotion: reducedMotion
  };
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register(BASE + 'sw.js').catch(function () { }); });
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
