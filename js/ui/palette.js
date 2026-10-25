/* 조현병 백과 · 명령 팔레트 (js/ui/palette.js)
   Ctrl+K / Cmd+K, 또는 상단 검색창 #q 에 포커스가 가면 화면 위 가운데에 떠요.
   입력 전: 최근 본 문서(jhb.recent) · 최근 검색(jhb.ui.palette.recentq) · 동작.
   입력 후: 위기 안내(맨 위) · 이런 뜻인가요(일상 말 사전) · 문서 · 용어 · 코스 · 동작, 그리고 항상 마지막에 "본문까지 찾기".
   기존 드롭다운(#qs-list)은 숨긴 채 두고, #q 의 input/keydown 은 capture 단계에서 가로채요. app.js 는 고치지 않아요. */
(function () {
  if (!window.JHB || !JHB.app) return;
  var A = JHB.app, el = A.el, store = A.store;
  var KEY_RQ = 'jhb.ui.palette.recentq';
  var MAX_RECENT = 5, MAX_RQ = 5;
  var q = document.getElementById('q'), qsList = document.getElementById('qs-list');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- 요소 ---------- */
  var scrim = el('div.pal-scrim', { hidden: true });
  var root = el('div.pal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': '빠르게 찾기와 이동', hidden: true });
  var input = el('input.pal-input', { type: 'search', autocomplete: 'off', spellcheck: 'false', placeholder: '문서, 용어, 코스, 동작 찾기', 'aria-label': '문서, 용어, 코스, 동작 찾기', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'true', 'aria-controls': 'pal-list' });
  var list = el('div.pal-list', { id: 'pal-list', role: 'listbox', 'aria-label': '결과' });
  var hint = el('div.pal-hint', { 'aria-hidden': 'true' }, [
    el('span', null, [el('kbd', null, ['↑↓']), ' 이동']), el('span', null, [el('kbd', null, ['Enter']), ' 열기']), el('span', null, [el('kbd', null, ['Esc']), ' 닫기'])
  ]);
  var closeBtn = el('button.pal-x', { type: 'button', 'aria-label': '닫기' }, ['×']);
  root.appendChild(el('div.pal-head', null, [
    el('svg', { class: 'pal-ico', viewBox: '0 0 24 24', width: '18', height: '18', 'aria-hidden': 'true', html: '<circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' }),
    input, closeBtn
  ]));
  root.appendChild(list);
  root.appendChild(hint);
  document.body.appendChild(scrim);
  document.body.appendChild(root);
  /* el() 은 createElement 로 svg 를 만들어 그림이 안 나오므로 진짜 svg 로 바꿔 끼운다 */
  (function () {
    var fake = root.querySelector('.pal-ico');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'pal-ico'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '18'); svg.setAttribute('height', '18'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = fake.innerHTML;
    fake.parentNode.replaceChild(svg, fake);
  })();

  var open = false, items = [], sel = -1, returnTo = null, openedFromQ = false, guardQ = false;

  /* ---------- 자료 ---------- */
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }
  function hl(text, v) {
    var t = String(text || ''), i = t.toLowerCase().indexOf(String(v || '').toLowerCase());
    if (i < 0 || !v) return [t];
    return [t.slice(0, i), el('mark', null, [t.slice(i, i + v.length)]), t.slice(i + v.length)];
  }
  function secTitle(a) { return (A.secById[a.section] || {}).title || ''; }
  function recentDocs() {
    return (store.get('jhb.recent', []) || []).map(function (s) { return A.bySlug[s]; }).filter(Boolean).slice(0, MAX_RECENT);
  }
  function recentQ() { var v = store.get(KEY_RQ, []); return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x; }).slice(0, MAX_RQ) : []; }
  function rememberQ(v) {
    v = String(v || '').trim(); if (!v) return;
    var cur = recentQ().filter(function (x) { return x !== v; }); cur.unshift(v);
    store.set(KEY_RQ, cur.slice(0, MAX_RQ));
  }
  function actions() {
    var dark = A.effectiveTheme() === 'dark';
    var fs = document.documentElement.getAttribute('data-fs') || 'm';
    return [
      { label: dark ? '밝게 바꾸기' : '어둡게 바꾸기', sub: '화면 색', keys: '어둡게 밝게 테마 다크 라이트 화면', run: function () { var b = document.getElementById('btn-theme'); if (b) b.click(); } },
      { label: '글자 크기 바꾸기', sub: '지금 ' + ({ s: '작게', m: '보통', l: '크게' })[fs] + ' · 누르면 다음 크기', keys: '글자 크게 작게 글씨 폰트 크기', run: function () { var b = document.getElementById('btn-fs'); if (b) b.click(); } },
      { label: '저장한 문서', sub: '북마크한 글 모아 보기', keys: '저장 북마크 즐겨찾기', run: function () { A.go('#/fav'); } },
      { label: '용어 사전', sub: '가나다순 짧은 정의', keys: '용어 사전 뜻', run: function () { A.go('#/glossary'); } },
      { label: '아무 문서', sub: '무작위로 한 편 읽기', keys: '아무 랜덤 무작위', run: function () { A.go('#/random'); } },
      { label: '읽기 코스', sub: '상황별 읽는 순서', keys: '코스 순서 읽기 가족 당사자', run: function () { A.go('#/courses'); } },
      { label: '첫 화면', sub: '백과 처음으로', keys: '첫 화면 홈 처음', run: function () { A.go('#/'); } }
    ];
  }

  /* ---------- 항목 ---------- */
  function item(opts) {
    var n = el('div.pal-item' + (opts.cls ? '.' + opts.cls : ''), { role: 'option', 'aria-selected': 'false', id: 'pal-i' + items.length });
    if (opts.lead) n.appendChild(opts.lead);
    var tx = el('span.pal-tx');
    tx.appendChild(el('span.pal-t', null, opts.title));
    if (opts.sub) tx.appendChild(el('span.pal-s', null, [opts.sub]));
    n.appendChild(tx);
    if (opts.tail) n.appendChild(el('span.pal-tail', null, [opts.tail]));
    n.addEventListener('mousedown', function (e) { e.preventDefault(); });
    n.addEventListener('click', function () { exec(items[Number(n.id.slice(5))]); });
    n.addEventListener('mousemove', function () { var i = Number(n.id.slice(5)); if (i !== sel) select(i, false); });
    items.push({ el: n, run: opts.run, remember: opts.remember });
    return n;
  }
  function group(title) { return el('div.pal-group', { role: 'presentation' }, [title]); }
  function docItem(a, v, tail) {
    return item({
      lead: A.spine(A.secById[a.section]),
      title: hl(a.title, v), sub: a.summary || secTitle(a), tail: tail || secTitle(a),
      remember: v, run: function () { A.go('#/a/' + a.slug); }
    });
  }

  function render() {
    var v = input.value.trim();
    list.innerHTML = ''; items = []; sel = -1;
    if (!v) {
      var rd = recentDocs();
      if (rd.length) { list.appendChild(group('최근 본 문서')); rd.forEach(function (a) { list.appendChild(docItem(a, '')); }); }
      var rq = recentQ();
      if (rq.length) {
        list.appendChild(group('최근 검색'));
        rq.forEach(function (s) {
          list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['⌕']), title: [s], tail: '다시 찾기', run: function () { input.value = s; render(); } }));
        });
      }
      list.appendChild(group('동작'));
      actions().forEach(function (ac) { list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['›']), title: [ac.label], sub: ac.sub, run: ac.run })); });
      list.appendChild(item({ cls: 'pal-all', title: ['본문까지 찾기'], sub: '검색 화면으로 가요', run: function () { A.go('#/search?q='); } }));
    } else {
      var lv = norm(v);
      var cl = (JHB.crisis && JHB.crisis.detect) ? JHB.crisis.detect(v) : null;
      if (cl) {
        var ci = item({
          cls: 'pal-crisis', lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['!']),
          title: ['지금 바로 이야기할 수 있는 곳 · 109 / 1577-0199'], sub: '자살예방상담 109, 정신건강위기상담 1577-0199. 24시간 받아요.',
          run: function () { location.href = 'tel:109'; }
        });
        var tel = el('a.pal-tel', { href: 'tel:109', tabindex: '-1', 'aria-label': '109에 전화' }, ['전화']); tel.addEventListener('click', function (e) { e.stopPropagation(); close(false); }); ci.appendChild(tel);
        list.appendChild(ci);
      }
      var docs = A.articles.map(function (a) {
        var sc = 0, t = norm(a.title);
        if (t === lv) sc = 100; else if (t.indexOf(lv) === 0) sc = 60; else if (t.indexOf(lv) >= 0) sc = 40;
        return { a: a, sc: sc };
      }).filter(function (x) { return x.sc; }).sort(function (x, y) { return y.sc - x.sc || x.a.title.length - y.a.title.length; }).slice(0, 7);
      var have = {}; docs.forEach(function (x) { have[x.a.slug] = 1; });
      var syn = [];
      if (JHB.syn && JHB.synonyms) {
        try { syn = JHB.syn.expand(JHB.syn.build(JHB.synonyms), v).slugs.filter(function (x) { return A.bySlug[x.slug] && !have[x.slug]; }).slice(0, 5); } catch (e) { syn = []; }
      }
      var terms = A.glossary.filter(function (g) { return norm(g.term).indexOf(lv) >= 0 || norm(g.en).indexOf(lv) >= 0; }).slice(0, 4);
      var courses = (A.courses || []).filter(function (c) { return norm(c.title).indexOf(lv) >= 0; }).slice(0, 3);
      var acts = actions().filter(function (ac) { return norm(ac.label).indexOf(lv) >= 0 || norm(ac.keys).indexOf(lv) >= 0; });
      if (docs.length) { list.appendChild(group('문서')); docs.forEach(function (x) { list.appendChild(docItem(x.a, v)); }); }
      if (syn.length) { list.appendChild(group('이런 뜻인가요')); syn.forEach(function (x) { list.appendChild(docItem(A.bySlug[x.slug], '')); }); }
      if (terms.length) {
        list.appendChild(group('용어'));
        terms.forEach(function (g) {
          list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['辭']), title: hl(g.term, v), sub: g.def || g.en || '', tail: g.en || '용어', remember: v, run: function () { A.go('#/glossary?t=' + encodeURIComponent(g.term)); } }));
        });
      }
      if (courses.length) {
        list.appendChild(group('코스'));
        courses.forEach(function (c) {
          list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['☰']), title: hl(c.title, v), sub: c.intro || '', tail: (c.steps || []).length + '편', remember: v, run: function () { A.go('#/course?course=' + encodeURIComponent(c.id)); } }));
        });
      }
      if (acts.length) { list.appendChild(group('동작')); acts.forEach(function (ac) { list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['›']), title: hl(ac.label, v), sub: ac.sub, run: ac.run })); }); }
      if (!docs.length && !terms.length && !syn.length && !courses.length && !acts.length && !cl) list.appendChild(el('div.pal-empty', null, ['제목과 용어에서 찾지 못했어요. 아래에서 본문까지 찾아 보세요.']));
      list.appendChild(item({ cls: 'pal-all', title: ['본문까지 "' + v + '" 찾기'], sub: '모든 글의 본문에서 찾아요', remember: v, run: function () { A.go('#/search?q=' + encodeURIComponent(v)); } }));
    }
    if (items.length) select(0, false);
    else input.removeAttribute('aria-activedescendant');
  }

  function select(i, scroll) {
    if (sel >= 0 && items[sel]) items[sel].el.setAttribute('aria-selected', 'false');
    sel = i;
    if (sel < 0 || !items[sel]) { input.removeAttribute('aria-activedescendant'); return; }
    items[sel].el.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', items[sel].el.id);
    if (scroll !== false) items[sel].el.scrollIntoView({ block: 'nearest' });
  }
  function move(d) { if (!items.length) return; select((sel + d + items.length) % items.length); }
  function exec(it) {
    if (!it) return;
    if (it.remember) rememberQ(it.remember);
    var run = it.run;
    close(false);
    run();
  }

  /* ---------- 열고 닫기 ---------- */
  function show(prefill, fromQ) {
    if (open) { if (prefill != null) { input.value = prefill; render(); } return; }
    open = true; openedFromQ = !!fromQ;
    if (qsList) qsList.hidden = true;
    if (q) q.setAttribute('aria-expanded', 'false');
    input.value = prefill || '';
    root.hidden = false; scrim.hidden = false;
    document.documentElement.classList.add('pal-open');
    if (!(reduce && reduce.matches)) { root.classList.remove('pal-in'); void root.offsetWidth; root.classList.add('pal-in'); }
    render();
    input.focus({ preventScroll: true });
    try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) { }
  }
  function close(refocus) {
    if (!open) return;
    open = false;
    root.hidden = true; scrim.hidden = true; root.classList.remove('pal-in');
    document.documentElement.classList.remove('pal-open');
    var back = returnTo; returnTo = null;
    if (refocus) {
      if (openedFromQ) {
        /* #q 로 되돌리면 다시 열리므로, #q 앞에 있던 요소로 가거나 포커스를 놓는다 */
        if (back && back !== q && document.contains(back) && typeof back.focus === 'function') back.focus({ preventScroll: true });
        else if (q) { guardQ = true; q.blur(); guardQ = false; }
      } else if (back && document.contains(back) && typeof back.focus === 'function') back.focus({ preventScroll: true });
    }
    openedFromQ = false;
  }
  function toggle() { if (open) close(true); else { returnTo = document.activeElement; show('', false); } }

  /* ---------- 키 ---------- */
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Home' && items.length && !input.value) { e.preventDefault(); select(0); }
    else if (e.key === 'End' && items.length && !input.value) { e.preventDefault(); select(items.length - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (sel >= 0 && items[sel]) exec(items[sel]);
      else if (input.value.trim()) { var v = input.value.trim(); rememberQ(v); close(false); A.go('#/search?q=' + encodeURIComponent(v)); }
    }
  });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key === 'Tab') {
      /* 팔레트 안에서만 순환 */
      var f = Array.prototype.filter.call(root.querySelectorAll('input, button, a[href]'), function (n) { return !n.hidden && n.tabIndex >= 0 && n.offsetParent !== null; });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      var next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i >= f.length - 1 ? 0 : i + 1);
      f[next].focus();
    }
  });
  closeBtn.addEventListener('click', function () { close(true); });
  scrim.addEventListener('click', function () { close(true); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); toggle();
    }
  });
  /* 팔레트가 열린 동안 Esc 가 다른 곳(app.js 의 팝오버/서랍)으로 가지 않게 */
  document.addEventListener('keydown', function (e) { if (open && e.key === 'Escape' && !root.contains(e.target)) { e.stopPropagation(); close(true); } }, true);
  /* 포커스가 밖으로 새면 입력으로 되돌린다 */
  document.addEventListener('focusin', function (e) { if (open && !root.contains(e.target)) input.focus({ preventScroll: true }); });

  /* ---------- 상단 검색창 #q 가로채기 ---------- */
  if (q) {
    document.addEventListener('focusin', function (e) {
      if (e.target !== q || guardQ || open) return;
      returnTo = (e.relatedTarget && e.relatedTarget !== q) ? e.relatedTarget : null;
      var v = q.value; q.value = '';
      show(v, true);
    }, true);
    document.addEventListener('input', function (e) { if (e.target === q) { e.stopPropagation(); if (!open) { var v = q.value; q.value = ''; show(v, true); } } }, true);
    document.addEventListener('keydown', function (e) {
      if (e.target !== q) return;
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!open) show(q.value, true); }
      else if (e.key === 'Escape') { e.preventDefault(); q.blur(); }
    }, true);
  }

  JHB.ui = JHB.ui || {};
  JHB.ui.palette = { open: function (v) { returnTo = document.activeElement; show(v || '', false); }, close: function () { close(true); }, toggle: toggle, isOpen: function () { return open; } };
})();
