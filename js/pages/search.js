/* 조현병 백과 · 찾기 화면 (search/, 선언은 data/pages/search.json)
   - 검색어는 주소·서버·캐시·탭 제목에 남기지 않는다. 들어오는 길:
     1) JHB.app.goSearch(q) 가 sessionStorage['jhb.q'](JSON {q, s})에 한 번 넣은 값 → 읽자마자 지운다
     2) 뒤로·앞으로·새로 고침 → history.state {q, s}
     3) 옛 주소 search/?q=…&s=… → app.js route() 가 history.state 로 옮기고 주소에서 지운 값(% 인코딩이 깨진 값은 빈 값)
     지금 상태는 history.replaceState({q, s, at}, '', location.pathname) 로만 둔다(주소는 늘 search/).
     위기·타해·정보성 위기로 감지된 질의는 문장 없이 {q:'', s, at, crisis:[카드 종류]} 로만 두고(돌아오면 카드와 그 글만 다시 보임),
     기록 쉼 중에는 검색어를 남기지 않는다.
     내 서재에서 최근 검색(또는 전부)을 지우면 app.js 가 sessionStorage['jhb.q.cleared'] 에 지운 시각을 남기고,
     이 화면은 그보다 오래된 state 의 검색어를 되살리지 않는다(뒤로·앞으로·새로 고침·bfcache 모두). 그 탭을 닫으면 state 도 사라진다.
   - 두 단계 결과(M3): 이미 실려 있는 글 목록(제목·요약·태그)과 일상 말 사전으로 빠른 찾기(JHB.search.find, 팔레트와 같은 함수) 결과를
     곧바로 그리고, 본문 색인(data/search-index.json)이 오면 보강한다(JHB.search.merge: 먼저 보인 튼튼한 결과의 순서는 그대로).
     색인을 못 받으면(오프라인 등) 빠른 찾기 결과와 "본문 검색은 인터넷이 필요해요" 안내.
   - 위기·타해 말(js/crisis.js)은 원문과 고친 질의 모두에 감지를 돌린다. 감지되면 결과보다 먼저 안내 카드(data/crisis-card.js):
     high → high(+harm), harm → harm, watch → watch. high·harm 이면 카드 아래 첫 결과로 그 카드의 글을 두고, 일부 낱말만 맞는 글은 빼요.
     카드의 전화는 사용자가 직접 눌러야 걸린다.
   - 감지에 기대지 않는 안전망: 검색어가 있고 위기·타해 카드가 없을 때(정보 검색 watch 카드만 있을 때 포함) 입력창 바로 아래 "지금 많이 힘들다면 · 지금 도움" 한 줄(지금 도움 시트, 없으면 위기 상담 전화 글).
   - 오타·초성: 결과가 없거나 약하면 "○○을(를) 찾으셨나요?" 한 줄과 그 말로 찾은 글. 본문에 원래 말이 있으면 원래 말 결과로 돌아간다.
   - 질문 꼴(…되나요, …할까요, ?) 질의의 맨 위 결과가 자주 묻는 질문(15분류) 글이면 그 글의 "## 짧은 답" 소절을 글자 그대로 보여 주는 카드
     + "결정은 담당 의사와 상의하세요." + "자세히 읽기". 요약하거나 새로 짓지 않는다. 위기 감지(watch 포함)가 있거나 그 글이 질의의
     일부 낱말에만 맞으면 띄우지 않는다(JHB.search.plan 의 answer). 위기 태그 글이면 카드 안에 109·1577-0199·119 고지.
   - 결과를 그린 뒤 window 에 'jhb:search' { query, crisis, section, results:[slug…], total, offline } 를 보낸다(검색어가 들어 있으니 받는 쪽은 저장·전송 금지).
     위기로 감지된 질의는 query 를 '' 로, crisis 에 카드 종류만 싣는다.
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
  /* 위기·타해로 감지된 질의(crisis: 카드 종류)는 문장을 남기지 않고 등급만 남긴다(돌아오면 카드와 그 글만 다시 보임).
     기록 쉼(privacy.paused) 중에도 검색어를 남기지 않는다 */
  var KINDS = { high: 1, harm: 1, watch: 1 };
  function saveState(q, s, kinds) {
    try {
      if (kinds && kinds.length) history.replaceState({ q: '', s: s, at: Date.now(), crisis: kinds.slice() }, '', location.pathname);
      else history.replaceState({ q: q, s: s, at: Date.now() }, '', location.pathname);
    } catch (e) { }
  }
  /* 내 서재에서 최근 검색(또는 전부)을 지운 시각. 그보다 오래된 history.state 의 검색어는 되살리지 않는다 */
  var CLEARED_KEY = 'jhb.q.cleared';
  function clearedAt() { try { return Number(sessionStorage.getItem(CLEARED_KEY)) || 0; } catch (e) { return 0; } }
  function isCleared(st) { var c = clearedAt(); return !!(c && st && typeof st === 'object' && !(Number(st.at) > c)); }
  function stateQuery(st) {
    if (!st || typeof st !== 'object' || typeof st.q !== 'string') return null;
    if (isCleared(st)) return { q: '', s: '' };
    var out = { q: st.q, s: String(st.s || '') };
    var k = Array.isArray(st.crisis) ? st.crisis.filter(function (x) { return KINDS[x]; }) : [];
    if (!st.q && k.length) out.kinds = k;
    return out;
  }
  function cardKinds(r) {
    if (!r) return [];
    if (r.level === 'high') return r.harm ? ['high', 'harm'] : ['high'];
    if (r.level === 'harm') return ['harm'];
    return ['watch'];
  }

  var page = {
    id: 'search',
    /* 자바스크립트가 꺼진 환경에서만 보이는 안내(검색 양식은 검색어를 주소에 싣게 되므로 두지 않는다) */
    staticHtml: function () {
      return '<noscript><p class="pg-search-nojs">찾기는 자바스크립트가 켜져 있어야 동작해요. ' +
        '<a href="#/">첫 화면</a>의 분류 목록, <a href="#/s/15">자주 묻는 질문</a>, <a href="#/courses">읽기 코스</a>, <a href="#/glossary">용어 사전</a>에서 찾아보세요. ' +
        '지금 많이 힘들다면 <a href="#/a/crisis-hotlines">위기 상담 전화와 기관</a>(109 · 1577-0199)을 보세요.</p></noscript>';
    },
    render: function (mount, ctx) {
      var A = ctx.app, el = ctx.el, J = root.JHB;
      var SR = J.search;
      var secs = A.sections.filter(function (s) { return !s.glossary; });
      function validSec(s) { return secs.some(function (x) { return x.id === s; }) ? s : ''; }

      var init = takeHandoff();
      if (!init) init = stateQuery(history.state);
      if (!init && ctx.query && (ctx.query.q || ctx.query.s)) init = { q: String(ctx.query.q || ''), s: String(ctx.query.s || '') };
      init = init || { q: '', s: '' };
      init.s = validSec(init.s);
      /* history.state 는 아래 run()(또는 showKept) 이 위기 여부를 본 뒤에 남긴다(위기 문장이 잠깐이라도 남지 않게) */

      var input = el('input', { type: 'search', placeholder: '찾을 말을 입력하세요', 'aria-label': '찾을 말', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search' });
      input.value = init.q;
      var sel = el('select', { 'aria-label': '분류' }, [el('option', { value: '' }, ['모든 분류'])].concat(secs.map(function (s) { return el('option', { value: s.id }, [s.title]); })));
      sel.value = init.s;
      var cards = el('div.pg-search-cards');
      var help = el('p.pg-search-help', { hidden: true });
      var did = el('p.pg-search-did', { hidden: true });
      var answer = el('div.pg-search-answer-slot');
      var hint = el('div.pg-search-hint');
      var status = el('p.status', { role: 'status' });
      var results = el('ul.rows.pg-search-rows');
      var more = el('div.pg-search-more');
      var form = el('form.searchbar', { role: 'search', 'aria-label': '본문 찾기' }, [input, sel]);
      [form, cards, help, did, answer, hint, status, results, more].forEach(function (n) { mount.appendChild(n); });

      /* 지금 도움 한 줄: 누르면 시트(없으면 링크대로 위기 상담 전화 글) */
      var helpLink = el('a.pg-search-help-go', { href: '#/a/crisis-hotlines' }, ['지금 도움']);
      helpLink.addEventListener('click', function (e) {
        if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        var nh = J.ui && J.ui.nowhelp;
        if (nh && typeof nh.open === 'function') { var ok = false; try { ok = nh.open(helpLink); } catch (x) { ok = false; } if (ok) e.preventDefault(); }
      });
      help.appendChild(document.createTextNode('지금 많이 힘들다면 · '));
      help.appendChild(helpLink);

      var P = null;
      function quick() {
        if (!P && SR && SR.quickFor) { try { P = SR.quickFor(A); } catch (e) { P = null; } }
        return P;
      }
      function detect(v) { return (J.crisis && J.crisis.detect) ? J.crisis.detect(v) : null; }
      function card(kind) {
        var c = J.crisisCard && J.crisisCard[kind];
        if (!c) return null;
        return el('section.crisis-card', { class: kind === 'watch' ? 'watch' : kind === 'harm' ? 'harm' : '', role: 'region', 'aria-label': c.title }, [
          el('h2', null, [c.title]), el('p', null, [c.body]),
          el('div.acts', null, (c.actions || []).map(function (a) { return el('a', { href: a.href, class: /^tel:/.test(a.href) ? 'tel' : '' }, [a.label]); }))
        ]);
      }
      var lastKinds = null;
      function drawCards(kinds, v) {
        var key = kinds.join(',');
        /* 안전망 줄은 위기·타해 카드가 없을 때 늘 둔다(정보 검색 watch 카드만 있을 때도) */
        help.hidden = !v || kinds.some(function (k) { return k !== 'watch'; });
        if (key === lastKinds) return;
        lastKinds = key;
        cards.innerHTML = '';
        kinds.forEach(function (k) { var n = card(k); if (n) cards.appendChild(n); });
        /* 스크린 리더: 화면 위쪽에 안내가 새로 생겼음을 알린다(정보 검색 watch 는 조용히) */
        if (kinds.length && kinds[0] !== 'watch' && J.crisisCard && J.crisisCard[kinds[0]]) A.announce(J.crisisCard[kinds[0]].title + '. 찾은 글보다 먼저 연락할 곳을 보여 드려요.');
      }
      function josa(s) { return SR && SR.hangul ? SR.hangul.josa(s) : '을(를)'; }
      function drawDid(sug, showing) {
        did.innerHTML = '';
        if (!sug) { did.hidden = true; return; }
        did.hidden = false;
        var b = el('button.pg-search-did-go', { type: 'button' }, [sug.text]);
        b.addEventListener('click', function () { input.value = sug.text; clearTimeout(timer); run(); try { input.focus({ preventScroll: true }); } catch (x) { input.focus(); } });
        did.appendChild(document.createTextNode('‘'));
        did.appendChild(b);
        did.appendChild(document.createTextNode('’' + josa(sug.text) + ' 찾으셨나요?' + (showing ? ' 그 말로 찾은 글을 보여 드려요.' : '')));
      }
      function emptyLinks() {
        more.innerHTML = '';
        var links = [['#/glossary', '용어 사전'], ['#/courses', '읽기 코스'], ['#/s/15', '자주 묻는 질문']];
        if (A.pageById && A.pageById.guide) links.push(['#/guide', A.pageById.guide.label || A.pageById.guide.title]);
        if (A.pageById && A.pageById.browse) links.push(['#/browse', A.pageById.browse.label || A.pageById.browse.title]);
        links.push(['#/', '첫 화면의 분류 목록']);
        var p = el('p.pg-search-more-links', null, ['이런 곳에서 찾아볼 수도 있어요: ']);
        links.forEach(function (x, i) {
          if (i) p.appendChild(document.createTextNode(' · '));
          p.appendChild(el('a', { href: x[0] }, [x[1]]));
        });
        more.appendChild(p);
      }
      /* 위기·타해·정보성 위기로 감지된 질의는 이벤트에도 문장을 싣지 않는다(query '' + crisis: 카드 종류) */
      var curKinds = [];
      function emit(v, sv, shown, total, offline) {
        var k = curKinds.slice();
        window.dispatchEvent(new CustomEvent('jhb:search', { detail: { query: k.length ? '' : v, crisis: k.length ? k : null, section: sv || null, results: shown, total: total, offline: !!offline } }));
      }

      /* 짧은 답 카드(자주 묻는 질문 글의 "## 짧은 답" 원문 그대로).
         wantSlug: 지금 보여야 할 글, shownSlug: 이미 그린 글. 글을 받는 동안 같은 글로 다시 찾으면(글자 하나 더 침 등)
         새로 받지 않고 받던 것을 그대로 그린다(전에는 받던 응답을 버리고 다시 받지도 않아 카드가 끝내 뜨지 않았음) */
      var wantSlug = null, shownSlug = null;
      function drawAnswer(slug) {
        if (slug === wantSlug) return;
        wantSlug = slug; shownSlug = null;
        answer.innerHTML = '';
        if (!slug || !A.loadArticle || !SR || !SR.shortAnswer) return;
        var a = A.bySlug[slug];
        if (!a) return;
        A.loadArticle(slug).then(function (doc) {
          if (wantSlug !== slug || shownSlug === slug) return;
          var text = SR.shortAnswer(doc && doc.body);
          if (!text) return;
          shownSlug = slug;
          /* 각주 번호는 글의 출처 목록을 가리키므로 여기서는 뺀다(문장은 그대로). 뺀 자리가 있으면 출처는 글에서 본다고 알린다 */
          var hadNotes = /\[\^\d+\]/.test(text);
          var html = A.md && A.md.render ? A.md.render(text.replace(/\[\^\d+\]/g, '')).html : A.esc(text);
          var go = el('a.pg-search-answer-more', { href: '#/a/' + slug }, ['자세히 읽기']);
          /* 위기 태그 글이면 카드 안에 연락처 한 줄(109·1577-0199·119, 문구는 코어의 공용 고지) */
          var crisisNote = (a.tags || []).indexOf('위기') >= 0 && typeof A.notice === 'function' ? A.notice('crisis') : null;
          answer.innerHTML = '';
          answer.appendChild(el('section.pg-search-answer', { 'aria-label': '짧은 답: ' + a.title }, [
            el('p.pg-search-answer-k', null, ['자주 묻는 질문 · 짧은 답']),
            el('h2.pg-search-answer-t', null, [a.title]),
            el('div.pg-search-answer-b', { html: html }),
            el('p.pg-search-answer-note', null, ['결정은 담당 의사와 상의하세요.']),
            hadNotes ? el('p.pg-search-answer-src', null, ['수치와 내용의 출처는 글에서 볼 수 있어요.']) : null,
            crisisNote,
            go
          ]));
        }).catch(function () { /* 오프라인 등: 카드 없이 결과만. 다음에 같은 글로 찾으면 다시 받아 본다 */ if (wantSlug === slug && shownSlug !== slug) wantSlug = null; });
      }

      function drawList(v, sv, list, offline, final, note) {
        var total = list.length, shown = list.slice(0, LIMIT);
        results.innerHTML = '';
        shown.forEach(function (x) { var a = A.bySlug[x.id]; if (a) results.appendChild(A.row(a, x.snippet)); });
        hint.innerHTML = '';
        if (offline) hint.appendChild(el('p.pg-search-off', null, ['본문 검색은 인터넷이 필요해요. 지금은 글 제목·요약·태그에서 찾은 결과예요.']));
        var count = total ? (total > LIMIT ? '문서 ' + LIMIT + '개까지 보여 줘요(모두 ' + total + '개).' : '문서 ' + total + '개를 찾았어요.') : '찾은 문서가 없어요. 다른 말로 찾아보세요.';
        status.textContent = (note && total ? note + ' ' : '') + count + (final || !total ? '' : ' 본문에서 더 찾고 있어요.');
        if (total) more.innerHTML = ''; else emptyLinks();
        if (final) emit(v, sv, shown.map(function (x) { return x.id; }), total, offline);
      }

      var seq = 0;
      function paused() { try { return !!(A.privacy && A.privacy.paused && A.privacy.paused()); } catch (e) { return false; } }
      /* 위기 질의로 찾았던 화면에 뒤로·새로 고침으로 돌아옴: 문장 없이 그 등급의 카드와 카드의 글만 다시 보인다 */
      function showKept(kinds, sv) {
        ++seq;
        curKinds = kinds.slice();
        input.value = '';
        saveState('', sv, kinds);
        drawCards(kinds, '');
        did.hidden = true; did.innerHTML = '';
        drawAnswer(null);
        var slugs = SR && SR.cardSlugs ? SR.cardSlugs(J.crisisCard, kinds).filter(function (s) { return A.bySlug[s]; }) : [];
        drawList('', sv, slugs.map(function (s) { return { id: s, snippet: null }; }), false, true, '');
        more.innerHTML = '';
        status.textContent = '찾은 말은 이 기기에 남겨 두지 않았어요. 연락할 곳과 관련 글을 다시 보여 드려요.';
      }
      function run() {
        var v = input.value.trim(), sv = sel.value;
        var my = ++seq;
        if (!v) {
          curKinds = [];
          saveState('', sv);
          drawCards([], '');
          did.hidden = true; did.innerHTML = '';
          drawAnswer(null);
          results.innerHTML = ''; hint.innerHTML = ''; more.innerHTML = '';
          status.textContent = '제목, 요약, 본문, 태그에서 찾아요.';
          emit('', sv, [], 0, false);
          return;
        }
        /* 빠른 찾기 결정(팔레트와 같은 JHB.search.plan): 위기 등급, 위기 카드 글, 찾으셨나요, 먼저 보일 글 */
        var Pq = quick(), pl = null;
        if (Pq && SR.plan) { try { pl = SR.plan(Pq, v, { detect: detect, card: J.crisisCard, section: sv || null }); } catch (e) { pl = null; } }
        if (!pl) {
          var c0 = detect(v);
          pl = { r: { query: v, docs: [], question: false }, crisis: c0, kinds: cardKinds(c0), urgent: !!(c0 && c0.level !== 'watch'), front: [], sug: null, useSug: false, base: [], top: [], bodyQ: v, question: false, answer: null };
        }
        var kinds = pl.kinds || cardKinds(pl.crisis);
        curKinds = kinds.slice();
        /* 위기어가 감지된 질의는 어디에도 남기지 않는다: history.state 에는 등급만. 기록 쉼이면 검색어를 남기지 않는다 */
        saveState(kinds.length || paused() ? '' : v, sv, kinds);
        drawCards(kinds, v);
        drawDid(pl.sug, pl.useSug);
        var note = pl.useSug ? '고친 말로 찾은 결과예요.' : '';
        /* 짧은 답: plan 이 고른 글(질문 꼴·위기 감지 없음·맨 위가 자주 묻는 질문 글·모든 낱말이 맞음)이 지금 목록의 맨 위일 때만 */
        function maybeAnswer(list) {
          drawAnswer(pl.answer && list[0] && list[0].id === pl.answer ? pl.answer : null);
        }
        var first = pl.top.map(function (x) { return { id: x.slug, snippet: null }; });
        drawList(v, sv, first, false, false, note);
        maybeAnswer(first);
        A.search().then(function (idx) {
          if (my !== seq) return;
          var res = SR.results(pl, idx, { section: sv || null });
          /* 원래 말이 본문에 다 들어 있는 글이 있으면 원래 말 결과로(본문에만 있는 낱말을 오타로 보지 않게) */
          if (res.switched) drawDid(pl.sug, false);
          drawList(v, sv, res.list, false, true, res.switched ? '' : note);
          maybeAnswer(res.list);
        }).catch(function () {
          if (my !== seq) return;
          drawList(v, sv, SR && SR.merge ? SR.merge(pl.base, [], { front: pl.front, strict: pl.urgent }) : first, true, true, note);
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
      function onShow(e) {
        if (!e.persisted || !input.value) return;
        var st = history.state, sq = stateQuery(st);
        if (sq && sq.kinds && !isCleared(st)) { showKept(sq.kinds, sel.value); return; } /* 위기 질의: 문장은 지우고 카드는 그대로 */
        if (!sq || !sq.q) wipe();
      }
      window.addEventListener('jhb:privacy', onPrivacy);
      window.addEventListener('pageshow', onShow);
      ctx.onCleanup(function () {
        clearTimeout(timer); seq++;
        window.removeEventListener('jhb:gosearch', onGo); window.removeEventListener('jhb:privacy', onPrivacy); window.removeEventListener('pageshow', onShow);
      });

      if (!init.q && init.kinds && init.kinds.length) showKept(init.kinds, init.s); else run();
      /* 쉬는 동안 오타 사전을 미리(첫 오타 고치기에서 느린 기기가 멈칫하지 않게) */
      var warmUp = function () { var Pw = quick(); if (Pw && SR.warm) { try { SR.warm(Pw, detect, 'vocab'); } catch (e) { } } };
      if (window.requestIdleCallback) window.requestIdleCallback(warmUp, { timeout: 2000 }); else setTimeout(warmUp, 300);
      /* 검색어 없이 왔으면 입력창으로. 검색어가 있으면 휴대폰 키보드가 결과를 가리지 않게 마우스 환경에서만 */
      var fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
      if (!init.q || fine) { try { input.focus({ preventScroll: true }); } catch (x) { input.focus(); } }
    }
  };
  page.stateQuery = stateQuery; /* 시험용(tests/privacy.test.cjs) */
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
