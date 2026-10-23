/* 조현병 백과 · 라우터와 화면
   경로: #/ 홈 · #/s/<섹션id> · #/a/<slug> · #/search?q=&s= · #/fav · #/glossary · #/about */
(function () {
  const U = JHB.util, el = U.el, esc = U.esc, md = JHB.md;
  const app = U.qs('#app');
  const sections = JHB.sections;
  const articles = (JHB.toc && JHB.toc.articles) || [];
  const bySlug = {}; articles.forEach(function (a) { bySlug[a.slug] = a; });
  const secById = {}; sections.forEach(function (s) { secById[s.id] = s; });
  const cache = {};
  let searchIndex = null;

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
  U.qs('#btn-theme').addEventListener('click', function () {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    U.store.set('jhb.theme', next);
  });
  U.qs('#btn-fs').addEventListener('click', function () {
    const order = ['s', 'm', 'l'];
    const cur = document.documentElement.getAttribute('data-fs') || 'm';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    if (next === 'm') document.documentElement.removeAttribute('data-fs'); else document.documentElement.setAttribute('data-fs', next);
    U.store.set('jhb.fs', next);
  });

  /* ---------- 라우팅 ---------- */
  function parseHash() {
    const h = (location.hash || '#/').replace(/^#/, '');
    const qi = h.indexOf('?');
    const path = (qi >= 0 ? h.slice(0, qi) : h).split('/').filter(Boolean);
    const query = {};
    if (qi >= 0) h.slice(qi + 1).split('&').forEach(function (kv) {
      const p = kv.split('='); if (p[0]) query[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
    });
    return { path: path, query: query };
  }
  function setTitle(t) { document.title = t ? t + ' · 조현병 백과' : '조현병 백과'; }
  function show(nodes, cls) {
    app.innerHTML = '';
    app.className = 'wrap' + (cls ? ' ' + cls : '');
    nodes.forEach(function (n) { if (n) app.appendChild(n); });
    window.scrollTo(0, 0);
  }
  function route() {
    const r = parseHash();
    const p = r.path;
    if (!p.length) return home();
    if (p[0] === 's' && p[1]) return section(p[1]);
    if (p[0] === 'a' && p[1]) return article(p[1]);
    if (p[0] === 'search') return search(r.query);
    if (p[0] === 'fav') return favPage();
    if (p[0] === 'glossary') return glossary();
    if (p[0] === 'about') return about();
    return notFound();
  }
  window.addEventListener('hashchange', route);

  /* ---------- 조각 ---------- */
  function searchBox(q, sec) {
    const input = el('input', { type: 'search', placeholder: '궁금한 말을 입력하세요 (예: 환청, 클로자핀)', value: q || '', 'aria-label': '검색' });
    const form = el('form.searchbox', { onsubmit: function (e) { e.preventDefault(); location.hash = '#/search?q=' + encodeURIComponent(input.value.trim()) + (sec ? '&s=' + sec : ''); } }, [input, el('button.pill.primary', { type: 'submit' }, ['찾기'])]);
    return form;
  }
  function sectionArticles(id) {
    return articles.filter(function (a) { return a.section === id; }).sort(function (a, b) { return (a.order || 999) - (b.order || 999) || a.title.localeCompare(b.title, 'ko'); });
  }
  function articleItem(a, snippetHtml) {
    const s = secById[a.section] || {};
    return el('a.item.tinted', { href: '#/a/' + a.slug, style: '--h:' + (s.hue || 250) }, [
      el('h3', null, [a.title]),
      el('p', snippetHtml ? { html: snippetHtml } : null, snippetHtml ? null : [a.summary || '']),
      el('div.meta', null, [
        el('span', null, [s.title || '']),
        a.evidence ? el('span.badge', { class: 'ev-' + a.evidence }, [(JHB.EVIDENCE[a.evidence] || {}).label || a.evidence]) : null,
        el('span', null, [(a.minutes || 1) + '분'])
      ])
    ]);
  }
  function disclaimer() {
    return el('div.disclaimer', null, ['이 글은 일반적인 정보예요. 사람마다 상황이 달라서, 진단과 치료는 담당 의사와 상의하는 게 안전해요. 약은 스스로 늘리거나 줄이거나 끊지 말고 꼭 먼저 상의하세요.']);
  }
  function crisisBanner() {
    return el('div.crisis', { html: '<strong>지금 많이 힘들다면</strong> 혼자 견디지 않아도 돼요. 자살예방상담 <a href="tel:109">109</a>, 정신건강위기상담 <a href="tel:1577-0199">1577-0199</a>는 24시간 받아요. 당장 위험하면 <a href="tel:119">119</a>.' });
  }

  /* ---------- 화면 ---------- */
  function home() {
    setTitle('');
    const total = articles.length;
    const pick = total ? articles[U.dayIndex(total)] : null;
    const f = favs().map(function (s) { return bySlug[s]; }).filter(Boolean).slice(0, 3);
    show([
      el('section.hero', null, [
        el('div.eyebrow', null, ['출처와 함께 읽는']),
        el('h1', { html: '조현병을 <em>제대로</em> 아는 백과' }),
        el('p.lead', null, ['증상, 진단, 치료, 함께 살아가기, 제도, 최신 연구까지. 어려운 말은 풀어서, 근거는 출처로 남겼어요.']),
        searchBox('')
      ]),
      pick ? el('div', null, [
        el('h2.sec-title', null, ['오늘의 한 가지']),
        el('a.today.tinted', { href: '#/a/' + pick.slug, style: '--h:' + ((secById[pick.section] || {}).hue || 250) }, [
          el('div.eyebrow', null, [(secById[pick.section] || {}).title || '']),
          el('h3', null, [pick.title]), el('p', null, [pick.summary || ''])
        ])
      ]) : null,
      f.length ? el('div', null, [
        el('h2.sec-title', null, ['저장한 글', el('a.more', { href: '#/fav' }, ['전체 보기'])]),
        el('div.list', null, f.map(function (a) { return articleItem(a); }))
      ]) : null,
      el('h2.sec-title', null, ['목차', el('span.more', null, [total + '편'])]),
      el('div.grid', null, sections.map(function (s) {
        const n = s.glossary ? (JHB.glossary || []).length : sectionArticles(s.id).length;
        return el('a.sec-card.tinted', { href: s.glossary ? '#/glossary' : '#/s/' + s.id, style: '--h:' + s.hue }, [
          el('span.num', null, [('0' + s.id).slice(-2)]), el('h3', null, [s.title]), el('p', null, [s.desc]),
          el('span.cnt', null, [n + (s.glossary ? '개 용어' : '편')])
        ]);
      }))
    ]);
  }

  function section(id) {
    const s = secById[id];
    if (!s) return notFound();
    if (s.glossary) return glossary();
    setTitle(s.title);
    const list = sectionArticles(id);
    show([
      el('div.crumb', null, [el('a', { href: '#/' }, ['홈']), '›', s.title]),
      el('div.sec-head.tinted', { style: '--h:' + s.hue }, [el('h1', null, [s.title]), el('p', null, [s.desc])]),
      list.length ? el('div.list', null, list.map(function (a) { return articleItem(a); })) : el('div.empty', null, ['아직 글을 준비 중이에요.'])
    ]);
  }

  function loadArticle(a) {
    if (cache[a.slug]) return Promise.resolve(cache[a.slug]);
    const s = secById[a.section];
    return fetch('content/' + s.dir + '/' + a.slug + '.md', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (txt) { cache[a.slug] = md.parse(txt); return cache[a.slug]; });
  }
  function article(slug) {
    const a = bySlug[slug];
    if (!a) return notFound();
    const s = secById[a.section] || {};
    setTitle(a.title);
    show([el('div.crumb', null, [el('a', { href: '#/' }, ['홈']), '›', el('a', { href: '#/s/' + s.id }, [s.title || '']), '›', a.title]), el('div.empty', null, ['불러오는 중…'])]);
    loadArticle(a).then(function (doc) {
      if (parseHash().path[1] !== slug) return;
      const meta = Object.assign({}, a, doc.meta);
      const r = md.render(doc.body);
      const tags = meta.tags || [];
      const favBtn = el('button.pill', { type: 'button', class: isFav(slug) ? 'on' : '', onclick: function () { const on = toggleFav(slug); favBtn.className = 'pill' + (on ? ' on' : ''); favBtn.textContent = on ? '★ 저장됨' : '☆ 저장'; } }, [isFav(slug) ? '★ 저장됨' : '☆ 저장']);
      const shareBtn = el('button.pill', { type: 'button', onclick: function () {
        const url = location.href;
        if (navigator.share) navigator.share({ title: a.title + ' · 조현병 백과', url: url }).catch(function () { });
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { shareBtn.textContent = '주소 복사됨'; });
      } }, ['공유']);
      const list = sectionArticles(a.section);
      const idx = list.findIndex(function (x) { return x.slug === slug; });
      const prev = idx > 0 ? list[idx - 1] : null, next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
      const related = articles.filter(function (x) { return x.slug !== slug && (x.tags || []).some(function (t) { return tags.indexOf(t) >= 0; }); }).slice(0, 4);
      const srcs = meta.sources || [];
      show([
        el('div.crumb', null, [el('a', { href: '#/' }, ['홈']), '›', el('a', { href: '#/s/' + s.id }, [s.title || '']), '›', a.title]),
        el('article.article.tinted', { style: '--h:' + (s.hue || 250) }, [
          el('header.article-head', null, [
            el('h1', null, [meta.title]),
            meta.summary ? el('p.summary', null, [meta.summary]) : null,
            el('div.meta', null, [
              meta.evidence ? el('span.badge', { class: 'ev-' + meta.evidence, title: (JHB.EVIDENCE[meta.evidence] || {}).desc || '' }, [(JHB.EVIDENCE[meta.evidence] || {}).label || meta.evidence]) : null,
              el('span', null, ['읽는 데 약 ' + (meta.minutes || md.readingMinutes(doc.body)) + '분']),
              meta.updated ? el('span', null, [U.fmtDate(meta.updated) + ' 갱신']) : null
            ]),
            el('div.article-tools', null, [favBtn, shareBtn])
          ]),
          tags.indexOf('위기') >= 0 ? crisisBanner() : null,
          r.toc.length >= 3 ? el('nav.toc', { 'aria-label': '글 목차' }, [el('div.toc-t', null, ['이 글의 차례']), el('ol', null, r.toc.map(function (t) { return el('li', { class: t.level === 3 ? 'l3' : '' }, [el('a', { href: '#' + t.id, onclick: function (e) { e.preventDefault(); const n = document.getElementById(t.id); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, [t.text])]); }))]) : null,
          el('div.body', { html: r.html }),
          srcs.length ? el('section.sources', null, [el('h2', null, ['출처']), el('ol', null, srcs.map(function (x, i) {
            return el('li', { id: 'src-' + (i + 1) }, [x.org ? x.org + '. ' : '', x.url ? el('a', { href: x.url, target: '_blank', rel: 'noopener' }, [x.title || x.url]) : (x.title || ''), x.year ? ' (' + x.year + ')' : '']);
          }))]) : null,
          disclaimer(),
          related.length ? el('section.related', null, [el('h2.sec-title', null, ['관련 글']), el('div.list', null, related.map(function (x) { return articleItem(x); }))]) : null,
          (prev || next) ? el('nav.prevnext', null, [
            prev ? el('a.prev', { href: '#/a/' + prev.slug }, [el('span', null, ['이전']), prev.title]) : el('span'),
            next ? el('a.next', { href: '#/a/' + next.slug }, [el('span', null, ['다음']), next.title]) : el('span')
          ]) : null
        ])
      ]);
      const recent = U.store.get('jhb.recent', []).filter(function (x) { return x !== slug; }); recent.unshift(slug); U.store.set('jhb.recent', recent.slice(0, 20));
    }).catch(function (e) {
      show([el('div.empty', null, ['글을 불러오지 못했어요. (' + e.message + ') 파일을 더블클릭해 연 경우라면 node serve.cjs 로 띄워 주세요.'])]);
    });
  }

  function loadIndex() {
    if (searchIndex) return Promise.resolve(searchIndex);
    return fetch('data/search-index.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (docs) { searchIndex = JHB.search.build(docs); return searchIndex; });
  }
  function search(query) {
    const q = (query.q || '').trim(), sec = query.s || '';
    setTitle(q ? '"' + q + '" 검색' : '검색');
    const input = el('input', { type: 'search', placeholder: '궁금한 말을 입력하세요', value: q, 'aria-label': '검색', autofocus: true });
    const sel = el('select', { 'aria-label': '섹션' }, [el('option', { value: '' }, ['전체'])].concat(sections.filter(function (s) { return !s.glossary; }).map(function (s) { return el('option', { value: s.id, selected: s.id === sec }, [s.title]); })));
    const results = el('div.list');
    const status = el('p.small.muted', { style: 'margin:6px 0 12px' });
    function run() {
      const v = input.value.trim(), sv = sel.value;
      history.replaceState(null, '', '#/search?q=' + encodeURIComponent(v) + (sv ? '&s=' + sv : ''));
      if (!v) { results.innerHTML = ''; status.textContent = '제목, 요약, 본문, 태그에서 찾아요.'; return; }
      loadIndex().then(function (idx) {
        const r = JHB.search.query(idx, v, { section: sv || null, limit: 50 });
        results.innerHTML = '';
        status.textContent = r.length ? r.length + '편 찾음' : '찾은 글이 없어요. 다른 말로 찾아보거나 용어 사전을 봐 주세요.';
        r.forEach(function (x) { const a = bySlug[x.id]; if (a) results.appendChild(articleItem(a, x.snippet)); });
        const lv = v.toLowerCase();
        const g = (JHB.glossary || []).filter(function (t) { return t.term.indexOf(v) >= 0 || t.def.indexOf(v) >= 0 || (t.en || '').toLowerCase().indexOf(lv) >= 0; }).slice(0, 5);
        if (g.length) results.appendChild(el('dl.gl-item', null, g.map(function (t) { return el('div', null, [el('dt', null, [t.term, t.en ? el('span.gl-en', null, [t.en]) : null]), el('dd', null, [t.def])]); })));
      }).catch(function () { status.textContent = '검색 색인을 불러오지 못했어요.'; });
    }
    let timer; input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 150); });
    sel.addEventListener('change', run);
    show([
      el('div.crumb', null, [el('a', { href: '#/' }, ['홈']), '›', '검색']),
      el('form.searchbox', { onsubmit: function (e) { e.preventDefault(); run(); } }, [input, sel]),
      status, results
    ]);
    run(); input.focus();
  }

  function favPage() {
    setTitle('저장한 글');
    const f = favs().map(function (s) { return bySlug[s]; }).filter(Boolean);
    show([
      el('div.crumb', null, [el('a', { href: '#/' }, ['홈']), '›', '저장한 글']),
      el('h1.hero', { style: 'font-size:24px;padding:12px 0' }, ['저장한 글']),
      f.length ? el('div.list', null, f.map(function (a) { return articleItem(a); })) : el('div.empty', null, ['글 위의 "☆ 저장"을 누르면 여기에 모여요.'])
    ]);
  }

  function glossary() {
    setTitle('용어 사전');
    const s = secById['14'] || { hue: 100 };
    const items = (JHB.glossary || []).slice().sort(function (a, b) { return a.term.localeCompare(b.term, 'ko'); });
    const groups = {}; const order = [];
    items.forEach(function (t) { const k = U.chosung(t.term); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(t); });
    const input = el('input', { type: 'search', placeholder: '용어 찾기', 'aria-label': '용어 찾기' });
    const body = el('div');
    function draw() {
      const v = input.value.trim();
      body.innerHTML = '';
      order.forEach(function (k) {
        const lv = v.toLowerCase();
        const list = groups[k].filter(function (t) { return !v || t.term.indexOf(v) >= 0 || t.def.indexOf(v) >= 0 || (t.en || '').toLowerCase().indexOf(lv) >= 0; });
        if (!list.length) return;
        body.appendChild(el('div.gl-group', { id: 'gl-' + k }, [el('h2', null, [k]), el('dl', null, list.map(function (t) {
          return el('div.gl-item', null, [el('dt', null, [t.term, t.en ? el('span.gl-en', null, [t.en]) : null]), el('dd', null, [t.def]),
            (t.related || []).filter(function (r) { return bySlug[r]; }).length ? el('div.rel', null, t.related.filter(function (r) { return bySlug[r]; }).map(function (r) { return el('a', { href: '#/a/' + r }, ['→ ' + bySlug[r].title]); })) : null]);
        }))]));
      });
      if (!body.children.length) body.appendChild(el('div.empty', null, ['해당하는 용어가 없어요.']));
    }
    input.addEventListener('input', draw);
    show([
      el('div.crumb', null, [el('a', { href: '#/' }, ['홈']), '›', '용어 사전']),
      el('div.sec-head.tinted', { style: '--h:' + s.hue }, [el('h1', null, ['용어 사전']), el('p', null, [items.length + '개 용어를 가나다순으로 정리했어요.'])]),
      el('form.searchbox', { onsubmit: function (e) { e.preventDefault(); } }, [input]),
      el('div.gl-index', null, order.map(function (k) { return el('a', { href: '#gl-' + k, onclick: function (e) { e.preventDefault(); const n = document.getElementById('gl-' + k); if (n) n.scrollIntoView({ behavior: 'smooth' }); } }, [k]); })),
      body
    ]);
    draw();
  }

  function about() {
    setTitle('이 백과에 대해');
    show([
      el('div.crumb', null, [el('a', { href: '#/' }, ['홈']), '›', '이 백과에 대해']),
      el('div.about', { html:
        '<h1 class="hero" style="font-size:24px;padding:12px 0">이 백과에 대해</h1>' +
        '<p>공공기관·학회·진료 지침·연구 논문을 바탕으로 조현병을 정리한 한국어 백과예요. 어려운 말은 풀어 쓰고, 근거는 글마다 출처로 남겼어요.</p>' +
        '<h2>AI로 만든 백과예요</h2>' +
        '<p>이 백과의 글은 AI(Anthropic의 Claude)가 공개 자료를 찾아 초안을 쓰고, 출처가 실제로 있는지 확인해 만들었어요. 의사나 전문가의 감수는 아직 받지 않았어요. 그래서 틀린 내용이 있을 수 있어요. 중요한 결정은 이 백과만 보고 내리지 말고, 글 아래의 출처와 담당 의사의 의견을 함께 확인하세요.</p>' +
        '<h2>글을 쓰는 원칙</h2><ul>' +
        '<li>출처 우선순위: 국립정신건강센터·대한조현병학회·보건복지부 → NICE·APA 진료 지침, NIMH, WHO → 메타분석·학술지 논문 → 그 밖의 자료.</li>' +
        '<li>글마다 근거 수준 배지를 달아요. <b>가이드라인</b>(진료 지침·공공기관), <b>연구</b>(비교적 확립된 연구), <b>초기 연구</b>(더 검증이 필요한 가설), <b>경험</b>(당사자·임상 경험).</li>' +
        '<li>약 용량이나 복용 중단 같은 개인별 지시는 쓰지 않아요. 그런 결정은 담당 의사와 하는 거예요.</li>' +
        '<li>낙인이 되는 표현은 쓰지 않아요. "조현병 환자"보다 "조현병이 있는 사람"처럼 사람을 먼저 써요.</li></ul>' +
        '<h2>꼭 알아둘 것</h2><p>이 백과는 의료 조언이 아니에요. 증상이 심해지거나 위험하다고 느끼면 담당 의사, 정신건강위기상담 1577-0199, 자살예방상담 109, 응급 시 119에 연락하세요.</p>' +
        '<h2>틀린 내용을 찾았다면</h2><p>출처가 바뀌거나 더 나은 연구가 나오면 글을 고쳐요. 틀린 부분을 알려 주시면 확인해서 반영할게요.</p>'
      })
    ]);
  }

  function notFound() {
    setTitle('없는 페이지');
    show([el('div.empty', null, ['그런 페이지가 없어요. ', el('a', { href: '#/', style: 'text-decoration:underline' }, ['홈으로'])])]);
  }

  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  }
})();
