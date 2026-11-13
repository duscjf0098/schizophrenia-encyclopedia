/* 조현병 백과 · 찾기 화면 (search/, 선언은 data/pages/search.json)
   - 검색어는 주소·서버·캐시·탭 제목에 남기지 않는다. 들어오는 길:
     1) JHB.app.goSearch(q) 가 sessionStorage['jhb.q'](JSON {q, s})에 한 번 넣은 값 → 읽자마자 지운다
     2) 뒤로·앞으로·새로 고침 → history.state {q, s}
     3) 옛 주소 search/?q=…&s=… → app.js route() 가 history.state 로 옮기고 주소에서 지운 값(% 인코딩이 깨진 값은 빈 값)
     지금 상태는 history.replaceState({q, s, at}, '', location.pathname) 로만 둔다(주소는 늘 search/).
     내 서재에서 최근 검색(또는 전부)을 지우면 app.js 가 sessionStorage['jhb.q.cleared'] 에 지운 시각을 남기고,
     이 화면은 그보다 오래된 state 의 검색어를 되살리지 않는다(뒤로·앞으로·새로 고침·bfcache 모두). 그 탭을 닫으면 state 도 사라진다.
   - 위기·타해 말(js/crisis.js)이 있으면 결과보다 먼저 안내 카드(data/crisis-card.js): high → high(+harm), harm → harm, watch → watch.
     카드의 전화는 사용자가 직접 눌러야 걸린다.
   - 결과를 그린 뒤 window 에 'jhb:search' { query, section, results:[slug…], total, offline } 를 보낸다.
   - 색인(data/search-index.json)을 못 받으면(오프라인 등) 글 목록의 제목·요약·태그로 찾고 그렇다고 알린다.
   - 이미 찾기 화면일 때 goSearch() 는 'jhb:gosearch' 를 보내고, 이 화면이 받아 그 자리에서 찾는다. */
(function (root) {
  var Q_KEY = 'jhb.q';
  var LIMIT = 60;

  function takeHandoff() {
    try {
      var raw = sessionStorage.getItem(Q_KEY);
      if (raw == null) return null;
      sessionStorage.removeItem(Q_KEY);
      var v = JSON.parse(raw);
      if (v && typeof v === 'object') return { q: String(v.q == null ? '' : v.q), s: String(v.s == null ? '' : v.s) };
      if (typeof v === 'string') return { q: v, s: '' };
    } catch (e) {
      try { sessionStorage.removeItem(Q_KEY); } catch (x) { }
    }
    return null;
  }
  function saveState(q, s) {
    try { history.replaceState({ q: q, s: s, at: Date.now() }, '', location.pathname); } catch (e) { }
  }
  /* 내 서재에서 최근 검색(또는 전부)을 지운 시각. 그보다 오래된 history.state 의 검색어는 되살리지 않는다 */
  var CLEARED_KEY = 'jhb.q.cleared';
  function clearedAt() { try { return Number(sessionStorage.getItem(CLEARED_KEY)) || 0; } catch (e) { return 0; } }
  function stateQuery(st) {
    if (!st || typeof st !== 'object' || typeof st.q !== 'string') return null;
    var c = clearedAt();
    if (c && !(Number(st.at) > c)) return { q: '', s: '' };
    return { q: st.q, s: String(st.s || '') };
  }
  function cardKinds(r) {
    if (!r) return [];
    if (r.level === 'high') return r.harm ? ['high', 'harm'] : ['high'];
    if (r.level === 'harm') return ['harm'];
    return ['watch'];
  }
  /* 색인이 없을 때: 제목·태그·요약만 */
  function offlineQuery(articles, v, sec) {
    var terms = String(v).toLowerCase().split(/\s+/).filter(Boolean);
    var out = [];
    articles.forEach(function (a) {
      if (sec && String(a.section) !== String(sec)) return;
      var t = String(a.title || '').toLowerCase(), g = (a.tags || []).join(' ').toLowerCase(), s = String(a.summary || '').toLowerCase();
      var score = 0, matched = 0;
      terms.forEach(function (w) {
        var x = 0;
        if (t.indexOf(w) >= 0) x += 10;
        if (g.indexOf(w) >= 0) x += 6;
        if (s.indexOf(w) >= 0) x += 3;
        if (x) matched++;
        score += x;
      });
      if (matched) out.push({ id: a.slug, score: score + (matched === terms.length && terms.length > 1 ? 20 : 0), title: a.title, snippet: null });
    });
    out.sort(function (a, b) { return b.score - a.score || String(a.title).localeCompare(String(b.title), 'ko'); });
    return out;
  }

  var page = {
    id: 'search',
    /* 자바스크립트가 꺼진 환경에서만 보이는 안내(검색 양식은 검색어를 주소에 싣게 되므로 두지 않는다) */
    staticHtml: function () {
      return '<noscript><p class="pg-search-nojs">찾기는 자바스크립트가 켜져 있어야 동작해요. ' +
        '<a href="#/">첫 화면</a>의 분류 목록이나 <a href="#/glossary">용어 사전</a>에서 찾아보세요.</p></noscript>';
    },
    render: function (mount, ctx) {
      var A = ctx.app, el = ctx.el, J = root.JHB;
      var secs = A.sections.filter(function (s) { return !s.glossary; });
      function validSec(s) { return secs.some(function (x) { return x.id === s; }) ? s : ''; }

      var init = takeHandoff();
      if (!init) init = stateQuery(history.state);
      if (!init && ctx.query && (ctx.query.q || ctx.query.s)) init = { q: String(ctx.query.q || ''), s: String(ctx.query.s || '') };
      init = init || { q: '', s: '' };
      init.s = validSec(init.s);
      saveState(init.q.trim(), init.s);

      var input = el('input', { type: 'search', placeholder: '찾을 말을 입력하세요', 'aria-label': '찾을 말', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search' });
      input.value = init.q;
      var sel = el('select', { 'aria-label': '분류' }, [el('option', { value: '' }, ['모든 분류'])].concat(secs.map(function (s) { return el('option', { value: s.id }, [s.title]); })));
      sel.value = init.s;
      var cards = el('div.pg-search-cards');
      var hint = el('div.pg-search-hint');
      var status = el('p.status', { role: 'status' });
      var results = el('ul.rows');
      var more = el('p.pg-search-more');
      var form = el('form.searchbar', { role: 'search', 'aria-label': '본문 찾기' }, [input, sel]);
      [form, cards, hint, status, results, more].forEach(function (n) { mount.appendChild(n); });

      var SYN = (J.syn && J.synonyms) ? J.syn.build(J.synonyms) : null;
      function synSlugs(v, sv) {
        if (!SYN) return [];
        var r; try { r = J.syn.expand(SYN, v); } catch (e) { return []; }
        return (r.slugs || []).filter(function (x) { return A.bySlug[x.slug] && (!sv || A.bySlug[x.slug].section === sv); });
      }
      function card(kind) {
        var c = J.crisisCard && J.crisisCard[kind];
        if (!c) return null;
        return el('section.crisis-card', { class: kind === 'watch' ? 'watch' : kind === 'harm' ? 'harm' : '', role: 'region', 'aria-label': c.title }, [
          el('h2', null, [c.title]), el('p', null, [c.body]),
          el('div.acts', null, (c.actions || []).map(function (a) { return el('a', { href: a.href, class: /^tel:/.test(a.href) ? 'tel' : '' }, [a.label]); }))
        ]);
      }
      var lastKinds = null;
      function drawCards(v) {
        var r = (J.crisis && J.crisis.detect) ? J.crisis.detect(v) : null;
        var kinds = cardKinds(r), key = kinds.join(',');
        if (key === lastKinds) return;
        lastKinds = key;
        cards.innerHTML = '';
        kinds.forEach(function (k) { var n = card(k); if (n) cards.appendChild(n); });
        /* 스크린 리더: 화면 위쪽에 안내가 새로 생겼음을 알린다(정보 검색 watch 는 조용히) */
        if (kinds.length && kinds[0] !== 'watch' && J.crisisCard && J.crisisCard[kinds[0]]) A.announce(J.crisisCard[kinds[0]].title + '. 찾은 글보다 먼저 연락할 곳을 보여 드려요.');
      }
      function emptyLinks() {
        more.innerHTML = '';
        more.appendChild(document.createTextNode('다른 길: '));
        [['#/glossary', '용어 사전'], ['#/courses', '읽기 코스'], ['#/', '첫 화면의 분류 목록']].forEach(function (x, i) {
          if (i) more.appendChild(document.createTextNode(' · '));
          more.appendChild(el('a', { href: x[0] }, [x[1]]));
        });
      }
      function emit(v, sv, shown, total, offline) {
        window.dispatchEvent(new CustomEvent('jhb:search', { detail: { query: v, section: sv || null, results: shown, total: total, offline: !!offline } }));
      }
      function draw(v, sv, list, offline) {
        var syn = synSlugs(v, sv);
        hint.innerHTML = '';
        if (syn.length) {
          var seen = {}, snip = {}, synIds = {};
          list.forEach(function (x) { seen[x.id] = 1; snip[x.id] = x.snippet; });
          syn.forEach(function (x) { synIds[x.slug] = 1; });
          var front = syn.map(function (x) { return { id: x.slug, snippet: seen[x.slug] ? snip[x.slug] : null }; });
          list = front.concat(list.filter(function (x) { return !synIds[x.id]; }));
          hint.appendChild(el('p.qs-hint', { style: 'padding:0 0 6px' }, ['일상 말로 입력하신 것 같아 관련 문서를 앞에 두었어요.']));
        }
        if (offline) hint.appendChild(el('p.pg-search-off', null, ['본문 검색은 인터넷이 필요해요. 지금은 글 제목·요약·태그에서 찾은 결과예요.']));
        var total = list.length, shown = list.slice(0, LIMIT);
        results.innerHTML = '';
        shown.forEach(function (x) { var a = A.bySlug[x.id]; if (a) results.appendChild(A.row(a, x.snippet)); });
        status.textContent = total ? (total > LIMIT ? '문서 ' + LIMIT + '개까지 보여 줘요(모두 ' + total + '개).' : '문서 ' + total + '개를 찾았어요.') : '찾은 문서가 없어요. 다른 말로 찾아보세요.';
        if (total) more.innerHTML = ''; else emptyLinks();
        emit(v, sv, shown.map(function (x) { return x.id; }), total, offline);
      }
      var seq = 0;
      function run() {
        var v = input.value.trim(), sv = sel.value;
        saveState(v, sv);
        var my = ++seq;
        drawCards(v);
        if (!v) {
          results.innerHTML = ''; hint.innerHTML = ''; more.innerHTML = '';
          status.textContent = '제목, 요약, 본문, 태그에서 찾아요.';
          emit('', sv, [], 0, false);
          return;
        }
        status.textContent = '찾고 있어요.';
        A.search().then(function (idx) {
          if (my !== seq) return;
          draw(v, sv, J.search.query(idx, v, { section: sv || null }), false);
        }).catch(function () {
          if (my !== seq) return;
          draw(v, sv, offlineQuery(A.articles, v, sv), true);
        });
      }
      var timer = null;
      input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 160); });
      sel.addEventListener('change', run);
      form.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(timer); run(); });
      /* 찾기 화면에서 팔레트 등으로 다시 찾으면 페이지를 다시 받지 않고 여기서 */
      function onGo(e) {
        var d = e.detail || {};
        e.preventDefault();
        input.value = String(d.q || '');
        sel.value = validSec(String(d.s || ''));
        clearTimeout(timer);
        run();
        try { input.focus({ preventScroll: true }); } catch (x) { input.focus(); }
      }
      window.addEventListener('jhb:gosearch', onGo);
      /* 최근 검색(또는 전부)을 지우면 이 화면의 검색어와 결과, history.state 도 비운다 */
      function wipe() { clearTimeout(timer); input.value = ''; run(); }
      function onPrivacy(e) {
        var d = e.detail || {};
        if (d.action === 'clear' && (d.ids === 'all' || (Array.isArray(d.ids) && d.ids.indexOf('recentq') >= 0))) wipe();
      }
      /* 뒤로 가기로 bfcache 에서 돌아왔는데 그 사이 다른 화면에서 지웠다면 */
      function onShow(e) { var sq = stateQuery(history.state); if (e.persisted && input.value && (!sq || !sq.q)) wipe(); }
      window.addEventListener('jhb:privacy', onPrivacy);
      window.addEventListener('pageshow', onShow);
      ctx.onCleanup(function () {
        clearTimeout(timer);
        window.removeEventListener('jhb:gosearch', onGo); window.removeEventListener('jhb:privacy', onPrivacy); window.removeEventListener('pageshow', onShow);
      });

      run();
      /* 검색어 없이 왔으면 입력창으로. 검색어가 있으면 휴대폰 키보드가 결과를 가리지 않게 마우스 환경에서만 */
      var fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
      if (!init.q || fine) { try { input.focus({ preventScroll: true }); } catch (x) { input.focus(); } }
    }
  };
  page.stateQuery = stateQuery; /* 시험용(tests/privacy.test.cjs) */
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
