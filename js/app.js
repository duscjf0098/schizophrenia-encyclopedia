/* 조현병 백과 · 라우터와 화면
   경로(실제 페이지): ./ 첫 화면, s/<섹션id>/, a/<slug>/, search/?q=&s=, fav/, glossary/?t=, about/, random/
   각 페이지의 <html data-base data-route> 로 현재 위치를 안다. 화면에서 쓰는 '#/…' 링크는 실제 경로로 바꿔 끼운다. */
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
  const SYN = (JHB.syn && JHB.synonyms) ? JHB.syn.build(JHB.synonyms) : null;
  const COURSES = JHB.courses || [];
  const LINKS = JHB.links || null;
  const courseById = {}; COURSES.forEach(function (c) { courseById[c.id] = c; });
  function readMark(slug) { return PROG && PROG.isRead(slug) ? el('span.read-mark', null, ['읽음']) : null; }
  function synHits(v) { return SYN ? JHB.syn.expand(SYN, v) : { slugs: [], terms: [] }; }
  function crisisLevel(v) { return (JHB.crisis && JHB.crisis.detect) ? JHB.crisis.detect(v) : null; }
  function crisisCard(level) {
    const card = JHB.crisisCard && JHB.crisisCard[level === 'high' ? 'high' : 'watch'];
    if (!card) return null;
    return el('section.crisis-card', { class: level === 'high' ? '' : 'watch', role: 'region', 'aria-label': card.title }, [
      el('h2', null, [card.title]), el('p', null, [card.body]),
      el('div.acts', null, (card.actions || []).map(function (a) { return el('a', { href: a.href, class: /^tel:/.test(a.href) ? 'tel' : '' }, [a.label]); }))
    ]);
  }
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
    return i < 0;
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

  function drawNav(curSec, curSlug, toc) {
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
          const li = el('li', null, [el('a', { href: '#/a/' + a.slug, class: PROG && PROG.isRead(a.slug) && a.slug !== curSlug ? 'read' : '', 'aria-current': a.slug === curSlug ? 'page' : null }, [a.title])]);
          if (a.slug === curSlug && toc && toc.length) {
            li.appendChild(el('ul.nav-toc', null, toc.map(function (t) {
              return el('li', null, [el('a', { href: '#' + t.id, class: t.level === 3 ? 'l3' : '', 'data-h': t.id, onclick: jumpTo(t.id) }, [t.text])]);
            })));
          }
          ul.appendChild(li);
        });
        box.appendChild(ul);
      }
      nav.appendChild(box);
    });
    nav.appendChild(el('div.nav-extra', null, [
      el('div.nav-sec', null, [el('a', { href: '#/fav' }, ['저장한 문서'])]),
      el('div.nav-sec', null, [el('a', { href: '#/about' }, ['이 백과에 대해'])])
    ]));
    const cur = nav.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
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
    const query = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      const p = kv.split('='); if (p[0]) query[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
    });
    return { path: path, query: query };
  }
  function show(nodes) {
    pageCleanup.forEach(function (f) { f(); }); pageCleanup = [];
    closePop();
    app.innerHTML = '';
    nodes.forEach(function (n) { if (n) app.appendChild(n); });
    if (!show.keepScroll) window.scrollTo(0, 0);
    show.keepScroll = false;
    setProgress(0);
    const w = where();
    window.dispatchEvent(new CustomEvent('jhb:page', { detail: { kind: w.path[0] || 'home', id: w.path[1] || null, query: w.query } }));
  }
  function route() {
    const r = where(), p = r.path;
    setNav(false);
    U.qsa('.tool-link').forEach(function (a) { a.removeAttribute('aria-current'); });
    const tl = U.qs('.tool-link[data-r="' + (p[0] || '') + '"]'); if (tl) tl.setAttribute('aria-current', 'page');
    if (!p.length) return home();
    if (p[0] === 's' && p[1]) return section(p[1]);
    if (p[0] === 'a' && p[1]) return article(p[1]);
    if (p[0] === 'search') return search(r.query);
    if (p[0] === 'fav') return favPage();
    if (p[0] === 'glossary') return glossaryPage();
    if (p[0] === 'about') return about();
    if (p[0] === 'courses') return coursesPage();
    if (p[0] === 'course' && p[1]) return coursePage(p[1]);
    if (p[0] === 'random') { const a = articles[Math.floor(Math.random() * articles.length)]; location.replace(L('#/a/' + a.slug)); return; }
    return notFound();
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
    const pick = articles.length ? articles[U.dayIndex(articles.length)] : null;
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
    if (!a) return notFound();
    const s = secById[a.section] || {};
    setTitle(a.title);
    drawNav(a.section, slug, null);
    show([el('p.empty', null, ['문서를 불러오고 있어요.'])]);
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
      U.qsa('h2', body).forEach(function (h) { const t = h.textContent.trim(); h.setAttribute('data-key', /한 문장으로|짧은 답|나에게 의미|할 수 있는 것|주변 사람|담당 의사에게|더 읽을 글/.test(t) ? 'core' : 'detail'); });
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
              el('div.doc-meta-m', null, [ev(meta), el('span', null, ['약 ' + minutes + '분']), meta.updated ? el('span', null, [U.fmtDate(meta.updated) + ' 고침']) : null,
                el('span.acts', null, [favBtn(), shareBtn()])])
            ]),
            tags.indexOf('위기') >= 0 ? el('div.crisis', { role: 'note', html: '<strong>지금 많이 힘들다면</strong> 혼자 견디지 않아도 돼요. 자살예방상담 <a href="tel:109">109</a>, 정신건강위기상담 <a href="tel:1577-0199">1577-0199</a>는 24시간 받아요. 당장 위험하면 <a href="tel:119">119</a>에 전화하세요.' }) : null,
            r.toc.length >= 3 ? el('details.toc-m', null, [el('summary', null, ['이 문서의 차례']), el('ol', null, r.toc.map(function (t) {
              return el('li', { class: t.level === 3 ? 'l3' : '' }, [el('a', { href: '#' + t.id, onclick: jumpTo(t.id) }, [t.text])]);
            }))]) : null,
            body,
            srcs.length ? el('section.sources', { id: 'sources' }, [el('h2', null, ['출처']), el('ol', null, srcs.map(function (x, i) {
              return el('li', { id: 'src-' + (i + 1) }, [x.org ? x.org + '. ' : '', x.url ? el('a', { href: x.url, target: '_blank', rel: 'noopener', 'aria-label': (x.title || x.url) + ' (새 창에서 열림)' }, [x.title || x.url]) : (x.title || ''), x.year ? ' (' + x.year + ')' : '']);
            }))]) : null,
            el('p.disclaimer', null, ['일반적인 정보예요. 사람마다 상황이 달라서 진단과 치료는 담당 의사와 상의하는 게 안전해요. 약은 스스로 늘리거나 줄이거나 끊지 말고 먼저 상의하세요. 이 글은 AI가 초안을 쓰고 출처를 확인했으며, 전문가 감수는 받지 않았어요.']),
            courseNav(slug),
            backlinks(slug),
            related.length ? el('section.see-also', null, [el('h2', null, ['함께 읽기']), el('ul', null, related.map(function (x) {
              return el('li', null, [el('a', { href: '#/a/' + x.slug }, [spine(secById[x.section]), x.title])]);
            }))]) : null,
            (prev || next) ? el('nav.pager', { 'aria-label': '같은 분류의 앞뒤 문서' }, [
              prev ? el('a.prev', { href: '#/a/' + prev.slug }, [el('small', null, ['앞 문서']), prev.title]) : null,
              next ? el('a.next', { href: '#/a/' + next.slug }, [el('small', null, ['다음 문서']), next.title]) : null
            ]) : null
          ]),
          el('aside.doc-margin', { 'aria-label': '문서 정보와 용어 풀이' }, [infobox, notes])
        ])
      ]);
      drawNav(a.section, slug, r.toc);

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

      if (PROG) PROG.markRead(slug);
      const recent = U.store.get('jhb.recent', []).filter(function (x) { return x !== slug; }); recent.unshift(slug); U.store.set('jhb.recent', recent.slice(0, 20));
      window.dispatchEvent(new CustomEvent('jhb:article', { detail: { slug: slug, article: a, meta: meta, toc: r.toc, prev: prev, next: next, minutes: minutes, body: body } }));
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
    const first = pop.querySelector('a, button'); if (first && first !== x) { /* 포커스는 그대로 두되 키보드 사용자는 Tab으로 들어올 수 있게 */ }
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

  /* ---------- 상단 검색 제안 ---------- */
  const q = U.qs('#q'), qsList = U.qs('#qs-list');
  let qsItems = [], qsSel = -1;
  function norm(s) { return String(s || '').toLowerCase(); }
  function hl(text, v) {
    const i = norm(text).indexOf(norm(v));
    if (i < 0 || !v) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + v.length)) + '</mark>' + esc(text.slice(i + v.length));
  }
  function suggest() {
    const v = q.value.trim();
    qsList.innerHTML = ''; qsItems = []; qsSel = -1;
    if (!v) { qsList.hidden = true; q.setAttribute('aria-expanded', 'false'); return; }
    const lv = norm(v);
    const docs = articles.map(function (a) {
      let sc = 0; const t = norm(a.title);
      if (t === lv) sc = 100; else if (t.indexOf(lv) === 0) sc = 60; else if (t.indexOf(lv) >= 0) sc = 40;
      else if ((a.tags || []).some(function (x) { return norm(x).indexOf(lv) >= 0; })) sc = 20;
      else if (norm(a.summary).indexOf(lv) >= 0) sc = 10;
      return { a: a, sc: sc };
    }).filter(function (x) { return x.sc; }).sort(function (x, y) { return y.sc - x.sc || x.a.title.length - y.a.title.length; }).slice(0, 7);
    const terms = glossary.filter(function (g) { return norm(g.term).indexOf(lv) >= 0 || norm(g.en).indexOf(lv) >= 0; }).slice(0, 4);
    const have = {}; docs.forEach(function (x) { have[x.a.slug] = 1; });
    const syn = synHits(v).slugs.filter(function (x) { return bySlug[x.slug] && !have[x.slug]; }).slice(0, 5);
    const cl = crisisLevel(v);
    function item(html, sub, go) {
      const it = el('div.qs-item', { role: 'option', 'aria-selected': 'false', id: 'qs-i' + qsItems.length }, [el('span.qs-t', { html: html }), el('span.qs-s', null, [sub])]);
      it.addEventListener('mousedown', function (e) { e.preventDefault(); go(); });
      qsItems.push({ el: it, go: go });
      return it;
    }
    if (cl) {
      const card = JHB.crisisCard && JHB.crisisCard[cl.level === 'high' ? 'high' : 'watch'];
      if (card) {
        const goSearch = function () { go('#/search?q=' + encodeURIComponent(v)); closeQs(true); };
        const it = el('div.qs-item', { role: 'option', 'aria-selected': 'false', style: 'background:var(--bad-soft)' }, [el('span.qs-t', { style: 'color:var(--bad)' }, [card.title]), el('span.qs-s', null, ['자살예방상담 109, 정신건강위기상담 1577-0199'])]);
        it.addEventListener('mousedown', function (e) { e.preventDefault(); goSearch(); });
        qsItems.push({ el: it, go: goSearch });
        qsList.appendChild(it);
      }
    }
    if (syn.length) {
      qsList.appendChild(el('div.qs-group', null, ['이런 뜻으로 찾으셨나요']));
      syn.forEach(function (x) { const a = bySlug[x.slug]; qsList.appendChild(item(esc(a.title), a.summary || '', function () { go('#/a/' + a.slug); closeQs(true); })); });
    }
    if (docs.length) {
      qsList.appendChild(el('div.qs-group', null, ['문서']));
      docs.forEach(function (x) { qsList.appendChild(item(hl(x.a.title, v), (secById[x.a.section] || {}).title || '', function () { go('#/a/' + x.a.slug); closeQs(true); })); });
    }
    if (terms.length) {
      qsList.appendChild(el('div.qs-group', null, ['용어']));
      terms.forEach(function (g) {
        qsList.appendChild(item(hl(g.term, v), g.def, function () { go('#/glossary?t=' + encodeURIComponent(g.term)); closeQs(true); }));
      });
    }
    if (!docs.length && !terms.length && !syn.length) qsList.appendChild(el('div.qs-empty', null, ['제목과 용어에서 찾지 못했어요. 본문까지 찾으려면 Enter를 누르세요.']));
    const all = el('a.qs-all', { href: '#/search?q=' + encodeURIComponent(v) }, ['본문까지 "' + v + '" 찾기']);
    all.addEventListener('mousedown', function (e) { e.preventDefault(); go('#/search?q=' + encodeURIComponent(v)); closeQs(true); });
    qsList.appendChild(all);
    qsList.hidden = false; q.setAttribute('aria-expanded', 'true');
  }
  function closeQs(clear) { qsList.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); if (clear) { q.value = ''; q.blur(); } }
  function moveSel(d) {
    if (!qsItems.length) return;
    if (qsSel >= 0) qsItems[qsSel].el.setAttribute('aria-selected', 'false');
    qsSel = (qsSel + d + qsItems.length) % qsItems.length;
    qsItems[qsSel].el.setAttribute('aria-selected', 'true');
    if (!qsItems[qsSel].el.id) qsItems[qsSel].el.id = 'qs-i' + qsSel;
    q.setAttribute('aria-activedescendant', qsItems[qsSel].el.id);
    qsItems[qsSel].el.scrollIntoView({ block: 'nearest' });
  }
  q.addEventListener('input', suggest);
  q.addEventListener('focus', function () { if (q.value.trim()) suggest(); });
  q.addEventListener('blur', function () { setTimeout(function () { closeQs(false); }, 120); });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (qsSel >= 0) qsItems[qsSel].go();
      else if (q.value.trim()) { go('#/search?q=' + encodeURIComponent(q.value.trim())); closeQs(true); }
    } else if (e.key === 'Escape') { closeQs(true); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
  });

  /* ---------- 본문 검색 결과 ---------- */
  function loadIndex() {
    if (searchIndex) return Promise.resolve(searchIndex);
    return fetch(BASE + 'data/search-index.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (docs) { searchIndex = JHB.search.build(docs); return searchIndex; });
  }
  function search(query) {
    const v0 = (query.q || '').trim(), sec = query.s || '';
    setTitle(v0 ? '"' + v0 + '" 찾기' : '찾기');
    drawNav(null, null, null);
    const input = el('input', { type: 'search', placeholder: '찾을 말을 입력하세요', value: v0, 'aria-label': '본문 검색' });
    const sel = el('select', { 'aria-label': '분류' }, [el('option', { value: '' }, ['모든 분류'])].concat(sections.filter(function (s) { return !s.glossary; }).map(function (s) { return el('option', { value: s.id, selected: s.id === sec }, [s.title]); })));
    const results = el('ul.rows');
    const status = el('p.status', { role: 'status' });
    const extra = el('div');
    function run() {
      const v = input.value.trim(), sv = sel.value;
      history.replaceState(null, '', '?q=' + encodeURIComponent(v) + (sv ? '&s=' + sv : ''));
      if (!v) { results.innerHTML = ''; status.textContent = '제목, 요약, 본문, 태그에서 찾아요.'; return; }
      status.textContent = '찾고 있어요.';
      extra.innerHTML = '';
      const cl = crisisLevel(v);
      if (cl) { const card = crisisCard(cl.level); if (card) extra.appendChild(card); }
      loadIndex().then(function (idx) {
        let r = JHB.search.query(idx, v, { section: sv || null, limit: 60 });
        const syn = synHits(v).slugs.filter(function (x) { return bySlug[x.slug] && (!sv || bySlug[x.slug].section === sv); });
        if (syn.length) {
          const seen = {}; r.forEach(function (x) { seen[x.id] = 1; });
          const synIds = {}; syn.forEach(function (x) { synIds[x.slug] = x.score; });
          const bySnip = {}; r.forEach(function (x) { bySnip[x.id] = x.snippet; });
          const front = syn.map(function (x) { return { id: x.slug, snippet: seen[x.slug] ? bySnip[x.slug] : null }; });
          r = front.concat(r.filter(function (x) { return !synIds[x.id]; }));
          extra.appendChild(el('p.qs-hint', { style: 'padding:0 0 6px' }, ['일상 말로 입력하신 것 같아 관련 문서를 앞에 두었어요.']));
        }
        results.innerHTML = '';
        status.textContent = r.length ? '문서 ' + r.length + '개를 찾았어요.' : '찾은 문서가 없어요. 다른 말로 찾거나 용어 사전을 열어 보세요.';
        r.forEach(function (x) { const a = bySlug[x.id]; if (a) results.appendChild(row(a, x.snippet)); });
      }).catch(function () { status.textContent = '검색 색인을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 찾아 주세요.'; });
    }
    let timer; input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 160); });
    sel.addEventListener('change', run);
    show([
      el('nav.crumb', { 'aria-label': '위치' }, [el('a', { href: '#/' }, ['첫 화면']), el('span.sep', null, ['/']), '찾기']),
      el('h1.page-title', null, ['본문 찾기']),
      el('form.searchbar', { onsubmit: function (e) { e.preventDefault(); run(); } }, [input, sel]),
      extra, status, results
    ]);
    run(); input.focus();
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
    setNav: setNav, el: el, esc: esc, store: U.store, nav: nav, main: app, row: row, spine: spine, search: function (idx) { return loadIndex(); }
  };
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register(BASE + 'sw.js').catch(function () { }); });
  }
})();
