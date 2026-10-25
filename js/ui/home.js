/* 조현병 백과 · 쓰는 사람에 맞춰 바뀌는 첫 화면 (home)
   - 처음 온 사람: "어디서 시작할까요?" 세 갈래 카드(당사자·가족·궁금해서). 고르면 jhb.ui.home.role 에 저장
   - 다시 온 사람: 이어서 읽기·읽기 코스를 위로, 역할에 맞는 코스를 앞에, 최근 읽은 문서는 분류 바로 위로
   - 새로 올라온 글: 가장 최근 updated 날짜의 글(최대 6편). 모두 같은 날이면 만들지 않는다
   - 홈 화면에 추가 안내: beforeinstallprompt / iOS Safari 안내. 닫으면 30일 숨김(jhb.ui.home.installHidden)
   공개: JHB.ui.home = { role(), setRole(r), refresh() } */
(function () {
  if (!window.JHB || !JHB.app) return;
  const A = JHB.app, el = A.el, U = JHB.util, store = A.store;
  JHB.ui = JHB.ui || {};
  const K_ROLE = 'jhb.ui.home.role', K_HIDE = 'jhb.ui.home.installHidden';
  const HIDE_DAYS = 30;
  const ROLE_COURSES = {
    self: ['first-diagnosis', 'starting-medication', 'living-with-positive', 'negative-symptoms'],
    family: ['family-first', 'preventing-relapse', 'system-support']
  };
  const courseById = {}; (A.courses || []).forEach(function (c) { courseById[c.id] = c; });

  function role() { const r = store.get(K_ROLE, null); return (r === 'self' || r === 'family' || r === 'curious') ? r : null; }
  function setRole(r) { store.set(K_ROLE, r); }
  function isFirstTime() {
    const read = A.progress ? A.progress.count() : 0;
    const recent = store.get('jhb.recent', []);
    return read === 0 && !(recent && recent.length) && !role();
  }
  function sectionOfCourse(c) {
    const first = c && c.steps && c.steps[0] && A.bySlug[c.steps[0].slug];
    return first ? A.secById[first.section] : null;
  }
  function hue(sec) { return (sec && sec.hue != null) ? sec.hue : 250; }
  function secOf(sel) {
    const m = /^#\/a\/([^?]+)/.exec(sel), a = m && A.bySlug[m[1]];
    if (a) return A.secById[a.section];
    const c = /^#\/course\/([^?]+)/.exec(sel);
    return c ? sectionOfCourse(courseById[c[1]]) : null;
  }
  function sec(portal, name) { return portal.querySelector('section[data-sec="' + name + '"]'); }

  /* ---------- 처음 온 사람: 세 갈래 ---------- */
  function startCards() {
    const items = [
      { r: 'self', t: '당사자예요', d: '진단을 받았거나 증상이 걱정돼요. 병이 무엇인지부터 차근차근.', h: courseById['first-diagnosis'] ? '#/course/first-diagnosis' : '#/courses' },
      { r: 'family', t: '가족·친구예요', d: '가까운 사람이 아파요. 무엇을 알고 어떻게 도울지.', h: courseById['family-first'] ? '#/course/family-first' : '#/courses' },
      { r: 'curious', t: '궁금해서 왔어요', d: '조현병이 어떤 병인지 정확히 알고 싶어요.', h: A.bySlug['what-is-schizophrenia'] ? '#/a/what-is-schizophrenia' : '#/s/1' }
    ];
    return el('section.hm-start', { 'data-sec': 'start', 'aria-labelledby': 'hm-start-h' }, [
      el('h2.h-sec', { id: 'hm-start-h' }, ['어디서 시작할까요?']),
      el('div.hm-cards', null, items.map(function (it) {
        const a = el('a.hm-card', { href: it.h, style: '--h:' + hue(secOf(it.h)), 'data-role': it.r }, [
          el('span.hm-card-t', null, [it.t]),
          el('span.hm-card-d', null, [it.d]),
          el('span.hm-card-go', { 'aria-hidden': 'true' }, ['→'])
        ]);
        a.addEventListener('click', function () { setRole(it.r); });
        return a;
      }))
    ]);
  }

  /* ---------- 다시 온 사람: 재배치 ---------- */
  function rearrange(portal) {
    const today = sec(portal, 'today'), cont = sec(portal, 'continue'), courses = sec(portal, 'courses'), recent = sec(portal, 'recent'), index = sec(portal, 'index');
    if (today) {
      if (cont) portal.insertBefore(cont, today);
      if (courses) portal.insertBefore(courses, today);
    }
    if (recent && index) portal.insertBefore(recent, index);
    const r = role(), want = r && ROLE_COURSES[r];
    if (courses && want) {
      const grid = courses.querySelector('.courses');
      if (grid) {
        const cards = U.qsa('.course', grid);
        const idOf = function (a) { const m = /course\/([a-z0-9-]+)\/?(?:[?#].*)?$/.exec(a.getAttribute('href') || ''); return m ? m[1] : ''; };
        const rank = function (a) { const i = want.indexOf(idOf(a)); return i < 0 ? 99 : i; };
        cards.map(function (c, i) { return { c: c, i: i, k: rank(c) }; })
          .sort(function (x, y) { return x.k - y.k || x.i - y.i; })
          .forEach(function (x) { grid.appendChild(x.c); });
      }
    }
  }

  /* ---------- 새로 올라온 글 ---------- */
  function newSection() {
    const dates = {};
    (A.articles || []).forEach(function (a) { if (a.updated) dates[String(a.updated).slice(0, 10)] = 1; });
    const keys = Object.keys(dates).sort().reverse();
    if (keys.length < 2) return null;
    const latest = keys[0];
    const list = A.articles.filter(function (a) { return String(a.updated || '').slice(0, 10) === latest; })
      .sort(function (a, b) { return Number(a.section) - Number(b.section) || (a.order || 999) - (b.order || 999); })
      .slice(0, 6);
    if (!list.length) return null;
    return el('section.hm-new', { 'data-sec': 'new', 'aria-labelledby': 'hm-new-h' }, [
      el('h2.h-sec', { id: 'hm-new-h' }, ['새로 올라온 글', el('span.hm-new-date', null, [U.fmtDate(latest)])]),
      el('ul.rows', null, list.map(function (a) { return A.row(a); }))
    ]);
  }

  /* ---------- 홈 화면에 추가 ---------- */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    const portal = currentPortal();
    if (portal && !portal.querySelector('.hm-install')) mountInstall(portal);
  });
  window.addEventListener('appinstalled', function () { deferredPrompt = null; removeInstall(); });
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  function isIOS() {
    const ua = navigator.userAgent || '';
    return /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua));
  }
  function installHidden() {
    const t = Number(store.get(K_HIDE, 0)) || 0;
    return t && (Date.now() - t) < HIDE_DAYS * 86400000;
  }
  function removeInstall() { U.qsa('.hm-install').forEach(function (n) { n.remove(); }); }
  function installBanner() {
    if (isStandalone() || installHidden()) return null;
    let body;
    if (deferredPrompt) {
      const b = el('button.hm-install-btn', { type: 'button' }, ['홈 화면에 추가']);
      b.addEventListener('click', function () {
        const p = deferredPrompt; if (!p) return;
        deferredPrompt = null;
        p.prompt();
        (p.userChoice || Promise.resolve({})).then(function (c) {
          if (c && c.outcome === 'accepted') { removeInstall(); if (JHB.ui.toast) JHB.ui.toast('홈 화면에 추가했어요', { kind: 'ok' }); }
          else { deferredPrompt = p; }
        }).catch(function () { });
      });
      body = [el('span.hm-install-t', null, ['앱처럼 쓰기']), b];
    } else if (isIOS() && !navigator.standalone) {
      body = [el('span.hm-install-t', null, ['앱처럼 쓰기']), el('span.hm-install-d', null, ['Safari 아래 공유 버튼 → "홈 화면에 추가"를 누르면 앱처럼 열 수 있어요.'])];
    } else return null;
    const x = el('button.hm-install-x', { type: 'button', 'aria-label': '이 안내 닫기(30일 동안 보이지 않아요)' }, ['×']);
    x.addEventListener('click', function () { store.set(K_HIDE, Date.now()); removeInstall(); });
    return el('div.hm-install', { role: 'note' }, body.concat([x]));
  }
  function mountInstall(portal) {
    const b = installBanner(); if (!b) return;
    const note = portal.querySelector('.portal-note');
    if (note) portal.insertBefore(b, note); else portal.appendChild(b);
  }

  /* ---------- 조립 ---------- */
  function currentPortal() {
    const w = A.where();
    if (w.path.length) return null;
    return A.main.querySelector('.portal');
  }
  function enhance() {
    const portal = currentPortal();
    if (!portal || portal.hasAttribute('data-hm')) return;
    portal.setAttribute('data-hm', '1');
    const head = portal.querySelector('.portal-head');
    if (isFirstTime()) {
      const s = startCards();
      if (head) portal.insertBefore(s, head.nextSibling); else portal.insertBefore(s, portal.firstChild);
    } else {
      rearrange(portal);
    }
    const index = sec(portal, 'index');
    const n = newSection();
    if (n && index) portal.insertBefore(n, index);
    mountInstall(portal);
  }
  window.addEventListener('jhb:page', function (e) { if (e.detail && e.detail.kind === 'home') enhance(); });
  enhance();

  JHB.ui.home = { role: role, setRole: setRole, refresh: enhance };
})();
