/* 조현병 백과 · 명령 팔레트 (js/ui/palette.js)
   여는 때: Ctrl+K / Cmd+K, '/', 그리고 상단 검색창 #q 에 글자를 치거나 누르거나(클릭·탭) Enter·아래 화살표.
   #q 에 포커스만 가서는 열지 않는다(Tab 이 도구 링크·설정·목차로 그대로 넘어가게, T1).
   한글 조합 입력은 #q 에서 치다가 멈추면(IME_IDLE) 그 값으로 연다(조합 중 포커스를 옮기면 "ㅎ환청"처럼 깨져서).
   입력 전: 최근 본 문서(jhb.recent) · 최근 검색(사용자가 켰을 때만) · 동작(등록 화면 포함).
   입력 후: 위기·타해 안내(맨 위, 기본 선택 아님) · 문서 · 이런 뜻인가요 · 용어 · 코스 · 동작, 마지막에 "본문까지 찾기".
   - 위기 줄을 Enter·클릭하면 전화가 아니라 찾기 화면(위기 카드가 맨 위)으로 간다. 전화는 줄 안의 전화 버튼을 눌러야만 걸린다.
   - 검색 이동은 모두 JHB.app.goSearch(검색어를 주소에 싣지 않음).
   - 최근 검색은 JHB.app.privacy.recentq() 가 true 이고 기록 쉼이 아닐 때만 저장. 위기·타해·정보성 위기 말(감지된 말)은 어떤 경우에도 저장하지 않는다.
     꺼져 있으면 시작할 때 옛 'jhb.ui.palette.recentq' 값을 지운다. */
(function () {
  if (!window.JHB || !JHB.app) return;
  var A = JHB.app, el = A.el, store = A.store;
  var KEY_RQ = 'jhb.ui.palette.recentq';
  var MAX_RECENT = 5, MAX_RQ = 5;
  var q = document.getElementById('q');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var priv = A.privacy || null;
  function recentqOn() { return !!(priv && priv.recentq() && !priv.paused()); }
  if (!(priv && priv.recentq())) store.remove(KEY_RQ);
  function detect(v) { return (JHB.crisis && JHB.crisis.detect) ? JHB.crisis.detect(v) : null; }
  function goSearch(v) {
    if (typeof A.goSearch === 'function') A.goSearch(v);
    else A.go('#/search');
  }

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

  var open = false, items = [], sel = -1, returnTo = null;

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
  function recentQ() {
    if (!recentqOn()) return [];
    var v = store.get(KEY_RQ, []);
    return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x && !detect(x); }).slice(0, MAX_RQ) : [];
  }
  function rememberQ(v) {
    v = String(v || '').trim();
    if (!v || !recentqOn() || detect(v)) return; /* 감지된 말(위기·타해·정보성 위기)은 어떤 경우에도 저장하지 않는다 */
    var cur = recentQ().filter(function (x) { return x !== v; }); cur.unshift(v);
    store.set(KEY_RQ, cur.slice(0, MAX_RQ));
  }
  /* 등록 화면(data/pages/*.json 에서 nav 에 "palette" 가 있는 것) */
  function pageActions() {
    return (A.pages || []).filter(function (d) { return d && (d.nav || []).indexOf('palette') >= 0; }).map(function (d) {
      return { label: d.label || d.title, sub: d.summary || '', keys: [d.title, d.label].concat(d.keywords || []).join(' '), run: function () { A.go('#/' + d.id); } };
    });
  }
  function actions() {
    var dark = A.effectiveTheme() === 'dark';
    var fs = document.documentElement.getAttribute('data-fs') || 'm';
    var fsName = ({ s: '작게', m: '보통', l: '크게' })[fs] || '보통';
    return pageActions().concat([
      { label: dark ? '밝게 바꾸기' : '어둡게 바꾸기', sub: '화면 색', keys: '어둡게 밝게 테마 다크 라이트 화면', run: function () { var b = document.getElementById('btn-theme'); if (b) b.click(); } },
      { label: '글자 크기 바꾸기', sub: '지금 ' + fsName + ' · 누르면 다음 크기', keys: '글자 크게 작게 글씨 폰트 크기', run: function () { var b = document.getElementById('btn-fs'); if (b) b.click(); } },
      { label: '저장한 문서', sub: '북마크한 글 모아 보기', keys: '저장 북마크 즐겨찾기', run: function () { A.go('#/fav'); } },
      { label: '용어 사전', sub: '가나다순 짧은 정의', keys: '용어 사전 뜻', run: function () { A.go('#/glossary'); } },
      { label: '아무 문서', sub: '무작위로 한 편 읽기', keys: '아무 랜덤 무작위', run: function () { A.go('#/random'); } },
      { label: '읽기 코스', sub: '상황별 읽는 순서', keys: '코스 순서 읽기 가족 당사자', run: function () { A.go('#/courses'); } },
      { label: '첫 화면', sub: '백과 처음으로', keys: '첫 화면 홈 처음', run: function () { A.go('#/'); } }
    ]);
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
    n.addEventListener('mousedown', function (e) { if (!(e.target.closest && e.target.closest('a'))) e.preventDefault(); });
    n.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a.pal-tel')) return; exec(items[Number(n.id.slice(5))]); });
    n.addEventListener('mousemove', function () { var i = Number(n.id.slice(5)); if (i !== sel) select(i, false); });
    items.push({ el: n, run: opts.run, remember: opts.remember, crisis: !!opts.crisis });
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
  /* 위기·타해 안내 줄. 줄 자체는 찾기 화면(위기 카드가 맨 위)으로 가고, 전화는 줄 안 버튼으로만 */
  var CRISIS_LINE = {
    high: { title: '지금 바로 이야기할 수 있는 곳 · 109 / 1577-0199', sub: '자살예방상담 109, 정신건강위기상담 1577-0199. 24시간 받아요. 누르면 연락할 곳과 글을 함께 보여 줘요.', tels: [['109', 'tel:109', '109 자살예방상담에 전화']] },
    harm: { title: '지금 위험하면 112 · 119', sub: '누군가를 해칠 것 같거나 위협을 느낀다면 혼자 버티지 않아도 돼요. 누르면 연락할 곳과 글을 보여 줘요.', tels: [['112', 'tel:112', '112 경찰에 전화'], ['119', 'tel:119', '119 구급에 전화']] },
    watch: { title: '도움이 필요하면 109 · 1577-0199', sub: '24시간 상담 전화예요. 누르면 찾기 화면에서 관련 글과 함께 보여 줘요.', tels: [['109', 'tel:109', '109 자살예방상담에 전화']] }
  };
  function crisisItem(cl, v) {
    var c = CRISIS_LINE[cl.level] || CRISIS_LINE.watch;
    var n = item({
      cls: 'pal-crisis' + (cl.level === 'watch' ? '.pal-watch' : cl.level === 'harm' ? '.pal-harm' : ''), crisis: true,
      lead: el('span.pal-dot', { 'aria-hidden': 'true' }, [cl.level === 'watch' ? 'i' : '!']),
      title: [c.title], sub: c.sub,
      run: function () { goSearch(v); }
    });
    var tels = el('span.pal-tels');
    c.tels.forEach(function (t) {
      var a = el('a.pal-tel', { href: t[1], 'aria-label': t[2] }, [t[0] + ' 전화']);
      a.addEventListener('click', function (e) { e.stopPropagation(); close(false); });
      tels.appendChild(a);
    });
    n.appendChild(tels);
    return n;
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
      list.appendChild(item({ cls: 'pal-all', title: ['본문까지 찾기'], sub: '찾기 화면으로 가요', run: function () { goSearch(''); } }));
    } else {
      var lv = norm(v);
      var cl = detect(v);
      /* 본인의 위기(high)·타해(harm) 말이면 '본문까지 찾기'(찾기 화면: 위기 카드가 맨 위)를 위기 줄 바로 아래 기본 선택으로 둔다.
         그래서 Enter 한 번이면 전화가 아니라 연락할 곳과 글을 함께 보는 화면으로 간다 */
      var urgent = !!(cl && (cl.level === 'high' || cl.level === 'harm'));
      var allItem = function () { return item({ cls: 'pal-all' + (urgent ? '.pal-all-top' : ''), title: ['본문까지 "' + v + '" 찾기'], sub: urgent ? '연락할 곳과 관련 글을 함께 보여 줘요' : '모든 글의 본문에서 찾아요', remember: v, run: function () { goSearch(v); } }); };
      if (cl) list.appendChild(crisisItem(cl, v));
      if (urgent) list.appendChild(allItem());
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
          list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['☰']), title: hl(c.title, v), sub: c.intro || '', tail: (c.steps || []).length + '편', remember: v, run: function () { A.go('#/course/' + encodeURIComponent(c.id)); } }));
        });
      }
      if (acts.length) { list.appendChild(group('동작')); acts.forEach(function (ac) { list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['›']), title: hl(ac.label, v), sub: ac.sub, run: ac.run })); }); }
      if (!docs.length && !terms.length && !syn.length && !courses.length && !acts.length && !cl) list.appendChild(el('div.pal-empty', null, ['제목과 용어에서 찾지 못했어요. 아래에서 본문까지 찾아 보세요.']));
      if (!urgent) list.appendChild(allItem());
    }
    /* 기본 선택은 위기 안내 줄이 아닌 첫 항목(Enter 한 번에 엉뚱한 곳으로 가지 않게) */
    var first = -1;
    for (var i = 0; i < items.length; i++) { if (!items[i].crisis) { first = i; break; } }
    if (first >= 0) select(first, false);
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
  function show(prefill) {
    if (open) { if (prefill != null) { input.value = prefill; render(); } return; }
    open = true;
    input.value = prefill || '';
    root.hidden = false; scrim.hidden = false;
    document.documentElement.classList.add('pal-open');
    if (!(reduce && reduce.matches)) { root.classList.remove('pal-in'); void root.offsetWidth; root.classList.add('pal-in'); }
    render();
    input.focus({ preventScroll: true });
    try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) { }
  }
  /* refocus: 연 곳(#q 포함)으로 포커스를 돌려준다. #q 는 포커스만으로 열리지 않으므로 다시 열리지 않는다 */
  function close(refocus) {
    if (!open) return;
    open = false;
    root.hidden = true; scrim.hidden = true; root.classList.remove('pal-in');
    document.documentElement.classList.remove('pal-open');
    var back = returnTo; returnTo = null;
    if (refocus && back && back !== document.body && document.contains(back) && typeof back.focus === 'function') back.focus({ preventScroll: true });
  }
  function openFrom(origin, prefill) {
    returnTo = origin || document.activeElement;
    show(prefill || '');
  }
  function toggle() { if (open) close(true); else openFrom(document.activeElement, ''); }

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
      else if (input.value.trim()) { var v = input.value.trim(); rememberQ(v); close(false); goSearch(v); }
    }
  });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key === 'Tab') {
      /* 팔레트 안에서만 순환(입력 → 전화 버튼 → 닫기) */
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
  function typing(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); toggle(); return;
    }
    if (e.key === '/' && !open && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(document.activeElement)) {
      e.preventDefault(); openFrom(document.activeElement, '');
    }
  });
  /* 팔레트가 열린 동안 Esc 가 다른 곳(app.js 의 팝오버/서랍)으로 가지 않게 */
  document.addEventListener('keydown', function (e) { if (open && e.key === 'Escape' && !root.contains(e.target)) { e.stopPropagation(); close(true); } }, true);
  /* 포커스가 밖으로 새면 입력으로 되돌린다 */
  document.addEventListener('focusin', function (e) { if (open && !root.contains(e.target)) input.focus({ preventScroll: true }); });

  /* ---------- 상단 검색창 #q ----------
     포커스만으로는 열지 않는다. 글자 입력·클릭(탭)·Enter·아래 화살표에서 연다. 닫으면 포커스는 #q 로 돌아온다.
     한글(IME) 입력: 조합 중에 포커스를 팔레트로 옮기면 조합이 끊겨 "환청"이 "ㅎ환청"처럼 깨진다.
     그래서 조합으로 치는 동안에는 #q 에 그대로 두고, 입력이 IME_IDLE 동안 멈추면(또는 Enter·아래 화살표·클릭) 그 값을 넘기며 연다.
     넘길 때 아직 조합 중인 글자는 포커스가 옮겨지며 #q 에 확정되고, 읽어 둔 값에 이미 들어 있다. 조합이 아닌 입력(영문·숫자)은 바로 연다. */
  var IME_IDLE = 500;
  if (q) {
    var composing = false, imeAt = 0, handT = null;
    var handOff = function () {
      clearTimeout(handT); handT = null;
      if (open) return;
      var v = q.value;
      openFrom(q, v);
      q.value = '';
    };
    var later = function () { clearTimeout(handT); handT = setTimeout(function () { handT = null; if (!open && q.value && document.activeElement === q) handOff(); }, IME_IDLE); };
    var imeNow = function () { return composing || Date.now() - imeAt < 1000; };
    q.addEventListener('compositionstart', function () { composing = true; imeAt = Date.now(); clearTimeout(handT); handT = null; });
    q.addEventListener('compositionupdate', function () { imeAt = Date.now(); });
    q.addEventListener('compositionend', function () { composing = false; imeAt = Date.now(); if (!open) later(); });
    q.addEventListener('input', function (e) {
      if (open) return;
      e.stopPropagation();
      if (e.isComposing || imeNow()) { later(); return; } /* 한글 조합: 멈출 때까지 #q 에 */
      handOff();
    });
    q.addEventListener('blur', function () { clearTimeout(handT); handT = null; });
    q.addEventListener('click', function () { if (!open) handOff(); });
    q.addEventListener('keydown', function (e) {
      if (open) return;
      if (e.key === 'Process' || e.keyCode === 229) { imeAt = Date.now(); return; } /* IME 가 받은 키 */
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); handOff(); }
      else if (e.key === 'Escape' && q.value) { e.preventDefault(); clearTimeout(handT); handT = null; q.value = ''; }
    });
  }

  JHB.ui = JHB.ui || {};
  JHB.ui.palette = { open: function (v) { openFrom(document.activeElement, v || ''); }, close: function () { close(true); }, toggle: toggle, isOpen: function () { return open; } };
})();
