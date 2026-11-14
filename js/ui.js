/* 자동 생성: node tools/build-ui-js.cjs — 직접 고치지 마세요. 원본(이 순서): js/ui/palette.js, js/ui/preview.js, js/ui/mobile.js, js/ui/sticky.js, js/ui/reading.js, js/ui/settings.js, js/ui/polish.js, js/ui/home.js, js/ui/shelf.js, js/ui/ask.js, js/ui/hub.js, js/ui/nextsteps.js, js/ui/nowhelp.js, js/ui/print.js, js/ui/trust.js */
/* ===== js/ui/palette.js ===== */
(function () { try {
/* 조현병 백과 · 명령 팔레트 (js/ui/palette.js)
   여는 때: Ctrl+K / Cmd+K, '/', 그리고 상단 검색창 #q 에 글자를 치거나 누르거나(클릭·탭) Enter·아래 화살표.
   #q 에 포커스만 가서는 열지 않는다(Tab 이 도구 링크·설정·목차로 그대로 넘어가게, T1).
   입력 전: 최근 본 문서(jhb.recent, 첫 화면에서 "기록 가리기"를 켰으면 가린다는 한 줄만) · 최근 검색(사용자가 켰을 때만,
   "최근 검색 지우기 · 이 기기에만 저장돼요" 줄과 함께) · 동작(등록 화면 포함).
   입력 후: 위기·타해 안내(맨 위, 기본 선택 아님) · 문서 · 찾으셨나요(오타·초성) · 용어 · 코스 · 동작, 그 아래 "본문까지 찾기",
   맨 아래 차분한 고정 줄 "지금 많이 힘들다면 · 지금 도움"(위기 줄이 떠 있으면 겹쳐 두지 않음).
   특집 화면의 이름(label·title)이나 여러 낱말 찾기 말과 같은 말로 찾으면 그 화면 줄을 문서 사이 위쪽에 둔다(M8, JHB.search.screens·screenSlot).
   찾기 말로만 맞은 화면은 첫 글 뒤(첫 줄은 글), 한 낱말 찾기 말은 119 같은 번호만 올린다(그 밖은 동작 묶음 자리 그대로).
   - 찾기는 js/search.js 의 빠른 찾기(JHB.search.find)를 찾기 화면과 함께 쓴다. 준비물은 한 번만 만든다(글자마다 일상 말 사전을 새로 만들지 않음).
     빠른 찾기가 없으면(파일을 못 받음) 제목 포함만 보는 작은 대체 찾기로.
   - 위기·타해 감지는 원문과 고친 질의(오타·초성 후보) 모두에 돌린다(JHB.search.crisis).
   - 위기 줄을 Enter·클릭하면 전화가 아니라 찾기 화면(위기 카드가 맨 위)으로 간다. 전화는 줄 안의 전화 버튼(109·1577-0199·119 / 112·119)을
     눌러야만 걸린다(Tab 으로 닿고, 줄의 설명이 그렇게 안내함). "찾으셨나요" 는 입력칸 설명(aria-describedby)과 알림(role=status)으로도.
   - 검색 이동은 모두 JHB.app.goSearch(검색어를 주소에 싣지 않음).
   - 최근 검색은 JHB.app.privacy.recentq() 가 true 이고 기록 쉼이 아닐 때만 저장. 위기·타해·정보성 위기 말(감지된 말)은 어떤 경우에도 저장하지 않는다.
     꺼져 있으면 시작할 때 옛 'jhb.ui.palette.recentq' 값을 지운다. */
(function () {
  if (!window.JHB || !JHB.app) return;
  var A = JHB.app, el = A.el, store = A.store;
  var KEY_RQ = 'jhb.ui.palette.recentq';
  var MAX_RECENT = 5, MAX_RQ = 5, MAX_DOCS = 6;
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
  function reducedMotion() { return typeof A.reducedMotion === 'function' ? A.reducedMotion() : !!(reduce && reduce.matches); }

  /* ---------- 빠른 찾기 준비물(한 번만) ---------- */
  var prep = null, prepTried = false;
  function S() { return (JHB.search && typeof JHB.search.find === 'function') ? JHB.search : null; }
  function quick() {
    var s = S();
    if (!s) return null;
    if (!prep && !prepTried) {
      prepTried = true;
      try { prep = s.quickFor ? s.quickFor(A) : s.prepare({ articles: A.articles, glossary: A.glossary, courses: A.courses, sections: A.sections, synonyms: JHB.synonyms, syn: JHB.syn }); } catch (e) { prep = null; }
    }
    return prep;
  }
  function crisisOf(v) { return detect(v); }

  /* ---------- 요소 ---------- */
  var scrim = el('div.pal-scrim', { hidden: true });
  var root = el('div.pal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': '빠르게 찾기와 이동', hidden: true });
  var input = el('input.pal-input', { type: 'search', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'go', placeholder: '문서, 용어, 코스, 동작 찾기', 'aria-label': '문서, 용어, 코스, 동작 찾기', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'true', 'aria-controls': 'pal-list' });
  var list = el('div.pal-list', { id: 'pal-list', role: 'listbox', 'aria-label': '결과' });
  var hint = el('div.pal-hint', { 'aria-hidden': 'true' }, [
    el('span', null, [el('kbd', null, ['↑↓']), ' 이동']), el('span', null, [el('kbd', null, ['Enter']), ' 열기']), el('span', null, [el('kbd', null, ['Esc']), ' 닫기']),
    el('span.pal-hint-k', null, [el('kbd', null, ['Ctrl K']), ' 어디서나 열기'])
  ]);
  var closeBtn = el('button.pal-x', { type: 'button', 'aria-label': '닫기' }, ['×']);
  /* 돋보기 아이콘: el() 은 createElement 라 svg 가 그려지지 않으므로 createElementNS 로 원·손잡이를 따로 만든다
     (HTML 문자열을 옮기면 '<circle …/>' 가 닫히지 않아 손잡이가 원 안에 들어가 그려지지 않았음) */
  function searchIcon() {
    var NS = 'http://www.w3.org/2000/svg';
    function mk(tag, at) { var n = document.createElementNS(NS, tag); Object.keys(at).forEach(function (k) { n.setAttribute(k, at[k]); }); return n; }
    var svg = mk('svg', { 'class': 'pal-ico', viewBox: '0 0 24 24', width: '18', height: '18', 'aria-hidden': 'true', focusable: 'false' });
    svg.appendChild(mk('circle', { cx: '10.5', cy: '10.5', r: '6', stroke: 'currentColor', 'stroke-width': '1.8', fill: 'none' }));
    svg.appendChild(mk('path', { d: 'M15 15l5 5', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' }));
    return svg;
  }
  root.appendChild(el('div.pal-head', null, [searchIcon(), input, closeBtn]));
  root.appendChild(list);
  root.appendChild(hint);
  /* 화면 읽기 프로그램용 알림("‘환청’을 찾으셨나요?", 최근 검색 지움 등). 보이는 글은 목록 안에 그대로 있다 */
  var live = el('div.pal-sr', { role: 'status', 'aria-live': 'polite' });
  root.appendChild(live);
  /* 위기 줄의 전화 버튼 안내(목록 안 줄의 자식은 화면 읽기에서 따로 드러나지 않아서) */
  var telNote = el('span.pal-sr', { id: 'pal-telnote' }, ['전화 버튼은 Tab 키로 갈 수 있어요. 줄을 고르면 찾기 화면에서 연락할 곳과 글을 함께 보여 줘요.']);
  root.appendChild(telNote);
  document.body.appendChild(scrim);
  document.body.appendChild(root);
  var lastLive = '';
  function say(text) { if (text === lastLive) return; lastLive = text; live.textContent = text; }

  var open = false, items = [], sel = -1, returnTo = null;

  /* ---------- 자료 ---------- */
  function low(s) { return String(s || '').toLowerCase(); }
  /* 강조: 질의 낱말이 처음 나오는 자리 하나(띄어쓰기는 그대로 본다) */
  function hl(text, v) {
    var t = String(text || ''), lt = t.toLowerCase(), w = String(v || '').toLowerCase().trim();
    if (!w) return [t];
    var i = lt.indexOf(w), len = w.length;
    if (i < 0) {
      var parts = w.split(/\s+/).filter(function (x) { return x.length >= 2; }).sort(function (a, b) { return b.length - a.length; });
      for (var k = 0; k < parts.length && i < 0; k++) { i = lt.indexOf(parts[k]); len = parts[k].length; }
    }
    if (i < 0) return [t];
    return [t.slice(0, i), el('mark', null, [t.slice(i, i + len)]), t.slice(i + len)];
  }
  function secTitle(a) { return (A.secById[a.section] || {}).title || ''; }
  /* 첫 화면의 "기록 가리기"(jhb.ui.home.recentHidden)를 켰으면 팔레트도 최근 본 문서를 보이지 않는다 */
  function recentHidden() { return store.get('jhb.ui.home.recentHidden', false) === true; }
  function recentDocs() {
    if (recentHidden()) return [];
    return (store.get('jhb.recent', []) || []).map(function (s) { return A.bySlug[s]; }).filter(Boolean).slice(0, MAX_RECENT);
  }
  function recentQ() {
    if (!recentqOn()) return [];
    var v = store.get(KEY_RQ, []);
    return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x && !detect(x); }).slice(0, MAX_RQ) : [];
  }
  /* 원문이나 고친 질의(오타·초성 후보)에서 위기로 감지되나 */
  function flaggedQ(v) {
    if (detect(v)) return true;
    var P = quick();
    if (P && S().plan) { try { return !!S().plan(P, v, { detect: detect, card: JHB.crisisCard }).crisis; } catch (e) { return false; } }
    return false;
  }
  /* 최근 검색만 지운다(저장 켜기는 그대로). 코어의 지우기가 있으면 그것으로(찾기 화면의 history.state 도 함께 비워짐) */
  function clearRecentQ() {
    var done = false;
    if (priv && typeof priv.clear === 'function') { try { priv.clear(['recentq']); done = true; } catch (e) { done = false; } }
    if (!done) store.remove(KEY_RQ);
    store.remove(KEY_RQ);
    render();
    lastLive = '';
    say('최근 검색을 지웠어요.');
  }
  function rememberQ(v) {
    v = String(v || '').trim();
    if (!v || !recentqOn() || flaggedQ(v)) return; /* 감지된 말(위기·타해·정보성 위기, 고친 질의 포함)은 어떤 경우에도 저장하지 않는다 */
    var cur = recentQ().filter(function (x) { return x !== v; }); cur.unshift(v);
    store.set(KEY_RQ, cur.slice(0, MAX_RQ));
  }
  /* 등록 화면(data/pages/*.json 에서 nav 에 "palette" 가 있는 것) */
  function pageAction(d) {
    return { id: d.id, label: d.label || d.title, sub: d.summary || '', keys: [d.title, d.label].concat(d.keywords || []).join(' '), run: function () { A.go('#/' + d.id); } };
  }
  function pageActions() {
    return (A.pages || []).filter(function (d) { return d && (d.nav || []).indexOf('palette') >= 0; }).map(pageAction);
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
  /* 빠른 찾기를 못 쓸 때의 작은 대체 찾기: 제목·용어·코스 제목에 질의가 그대로 들어 있는 것(띄어쓰기를 지우지 않음) */
  function basicFind(v) {
    var lv = low(v).trim();
    function hit(s) { return low(s).indexOf(lv) >= 0; }
    return {
      docs: A.articles.filter(function (a) { return hit(a.title); }).sort(function (x, y) { return x.title.length - y.title.length; }).slice(0, MAX_DOCS).map(function (a) { return { slug: a.slug, a: a, score: 300 }; }),
      terms: (A.glossary || []).filter(function (g) { return hit(g.term) || hit(g.en); }).slice(0, 4).map(function (g) { return { g: g }; }),
      courses: (A.courses || []).filter(function (c) { return hit(c.title); }).slice(0, 3).map(function (c) { return { c: c }; }),
      suggest: null
    };
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
    /* crisis·skip: 기본 선택이 되지 않는 줄(위기 안내, 맨 아래 도움 줄) */
    /* stay: 실행해도 팔레트를 닫지 않는 줄(최근 검색 지우기) */
    items.push({ el: n, run: opts.run, remember: opts.remember, crisis: !!opts.crisis, skip: !!opts.skip, stay: !!opts.stay });
    return n;
  }
  function group(title) { return el('div.pal-group', { role: 'presentation' }, title); }
  function docItem(a, v, tail) {
    return item({
      lead: A.spine(A.secById[a.section]),
      title: hl(a.title, v), sub: a.summary || secTitle(a), tail: tail || secTitle(a),
      remember: v, run: function () { A.go('#/a/' + a.slug); }
    });
  }
  /* 위기·타해 안내 줄. 줄 자체는 찾기 화면(위기 카드가 맨 위)으로 가고, 전화는 줄 안 버튼으로만.
     줄 제목이 말하는 번호는 모두 버튼으로 둔다(109·1577-0199 / 112·119) */
  var TEL_109 = ['109', 'tel:109', '109 자살예방상담에 전화'], TEL_1577 = ['1577-0199', 'tel:1577-0199', '1577-0199 정신건강위기상담에 전화'], TEL_119 = ['119', 'tel:119', '119 구급에 전화'];
  var CRISIS_LINE = {
    high: { title: '지금 바로 이야기할 수 있는 곳 · 109 / 1577-0199', sub: '자살예방상담 109, 정신건강위기상담 1577-0199. 24시간 받아요. 당장 위험하면 119. 누르면 연락할 곳과 글을 함께 보여 줘요.', tels: [TEL_109, TEL_1577, TEL_119] },
    harm: { title: '지금 위험하면 112 · 119', sub: '누군가를 해칠 것 같거나 위협을 느낀다면 혼자 버티지 않아도 돼요. 누르면 연락할 곳과 글을 보여 줘요.', tels: [['112', 'tel:112', '112 경찰에 전화'], ['119', 'tel:119', '119 구급에 전화']] },
    watch: { title: '도움이 필요하면 109 · 1577-0199', sub: '24시간 상담 전화예요. 누르면 찾기 화면에서 관련 글과 함께 보여 줘요.', tels: [TEL_109, TEL_1577] }
  };
  function crisisItem(cl, v) {
    var c = CRISIS_LINE[cl.level] || CRISIS_LINE.watch;
    var n = item({
      cls: 'pal-crisis' + (cl.level === 'watch' ? '.pal-watch' : cl.level === 'harm' ? '.pal-harm' : ''), crisis: true,
      lead: el('span.pal-dot', { 'aria-hidden': 'true' }, [cl.level === 'watch' ? 'i' : '·']),
      title: [c.title], sub: c.sub,
      run: function () { goSearch(v); }
    });
    n.setAttribute('aria-describedby', 'pal-telnote');
    var tels = el('span.pal-tels');
    c.tels.forEach(function (t) {
      var a = el('a.pal-tel', { href: t[1], 'aria-label': t[2] }, [t[0] + ' 전화']);
      a.addEventListener('click', function (e) { e.stopPropagation(); close(false); });
      tels.appendChild(a);
    });
    n.appendChild(tels);
    return n;
  }
  /* 맨 아래 고정 줄: 감지와 상관없이 도움으로 가는 길. 지금 도움 시트(없으면 위기 상담 전화 글). 전화를 걸지 않는다 */
  function helpItem() {
    return item({
      cls: 'pal-help', skip: true,
      title: ['지금 많이 힘들다면 · ', el('span.pal-help-go', null, ['지금 도움'])],
      run: function (from) {
        var nh = JHB.ui && JHB.ui.nowhelp;
        /* 시트를 닫으면 포커스가 돌아갈 곳: 팔레트를 연 곳, 없으면 상단 검색창(숨은 팔레트 입력에 남지 않게) */
        var back = from && from !== document.body && document.contains(from) ? from : (q || null);
        if (nh && typeof nh.open === 'function') { try { if (nh.open(back)) return; } catch (e) { } }
        A.go('#/a/crisis-hotlines');
      }
    });
  }

  /* 대체 찾기용: 위기 카드(data/crisis-card.js)의 글 주소에서 글을 뽑는다 */
  function cardFront(cl) {
    var card = JHB.crisisCard || {}, out = [];
    var kinds = cl.level === 'high' ? (cl.harm ? ['high', 'harm'] : ['high']) : ['harm'];
    kinds.forEach(function (k) {
      ((card[k] && card[k].actions) || []).forEach(function (x) {
        var m = /^#\/a\/([a-z0-9-]+)/.exec(String(x.href || ''));
        if (m && A.bySlug[m[1]] && out.indexOf(A.bySlug[m[1]]) < 0) out.push(A.bySlug[m[1]]);
      });
    });
    return out;
  }

  function render() {
    if (raf) { unframe(raf); raf = 0; }
    var v = input.value.trim();
    list.innerHTML = ''; items = []; sel = -1;
    list.scrollTop = 0; /* 새 결과는 맨 위부터(찾으셨나요·위기 줄이 가려지지 않게) */
    var cl = null;
    var didText = '';
    if (!v) {
      var rd = recentDocs();
      if (rd.length) { list.appendChild(group(['최근 본 문서'])); rd.forEach(function (a) { list.appendChild(docItem(a, '')); }); }
      else if (recentHidden() && (store.get('jhb.recent', []) || []).length) {
        /* 첫 화면에서 기록을 가려 두었음: 제목 없이 한 줄만(누르면 내 서재, 없으면 첫 화면) */
        var meReg = (A.pages || []).some(function (d) { return d && d.id === 'me'; });
        list.appendChild(item({ cls: 'pal-veil', skip: true, title: ['최근 기록은 가려 두었어요'], sub: meReg ? '내 서재에서 보거나 지울 수 있어요' : '첫 화면에서 다시 보이게 할 수 있어요', run: function () { A.go(meReg ? '#/me' : '#/'); } }));
      }
      var rq = recentQ();
      if (rq.length) {
        list.appendChild(group(['최근 검색']));
        rq.forEach(function (s) {
          list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['⌕']), title: [s], tail: '다시 찾기', run: function () { input.value = s; render(); } }));
        });
        /* 저장하는 기능 자리에서 바로 지우기(L6): 기본 선택이 아니고, 지워도 팔레트는 열린 채 */
        list.appendChild(item({ cls: 'pal-rq-clear', skip: true, stay: true, title: ['최근 검색 지우기'], sub: '최근 검색은 이 기기에만 저장돼요', run: clearRecentQ }));
      }
      list.appendChild(group(['동작']));
      actions().forEach(function (ac) { list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['›']), title: [ac.label], sub: ac.sub, run: ac.run })); });
      list.appendChild(item({ cls: 'pal-all', title: ['본문까지 찾기'], sub: '찾기 화면으로 가요', run: function () { goSearch(''); } }));
    } else {
      /* 빠른 찾기 결정(찾기 화면과 같은 JHB.search.plan). 없으면 작은 대체 찾기 */
      var P = quick(), pl = null;
      if (P && S().plan) { try { pl = S().plan(P, v, { detect: detect, card: JHB.crisisCard }); } catch (e) { pl = null; } }
      var r = pl ? pl.r : basicFind(v);
      cl = pl ? pl.crisis : crisisOf(v);
      /* 본인의 위기(high)·타해(harm) 말이면 '본문까지 찾기'(찾기 화면: 위기 카드가 맨 위)를 위기 줄 바로 아래 기본 선택으로 둔다.
         그래서 Enter 한 번이면 전화가 아니라 연락할 곳과 글을 함께 보는 화면으로 간다 */
      var urgent = !!(cl && (cl.level === 'high' || cl.level === 'harm'));
      var allItem = function () { return item({ cls: 'pal-all' + (urgent ? '.pal-all-top' : ''), title: ['본문까지 "' + v + '" 찾기'], sub: urgent ? '연락할 곳과 관련 글을 함께 보여 줘요' : '모든 글의 본문에서 찾아요', remember: v, run: function () { goSearch(v); } }); };
      if (cl) list.appendChild(crisisItem(cl, v));
      if (urgent) list.appendChild(allItem());

      /* 문서: 위기·타해면 위기 카드의 글(위기 상담 전화·자살 위험 신호와 대처·응급 상황 대처·화와 공격성 등)이 맨 앞이고 일부 일치는 빠진다.
         그 밖에는 튼튼한 일치(모든 낱말·일상 말·제목)만, 하나도 없으면 일부 일치 몇 개 */
      var docs = pl ? pl.top.slice(0, MAX_DOCS) : (function () {
        var seen = {}, out = [];
        (urgent ? cardFront(cl).map(function (a) { return { slug: a.slug, a: a }; }) : []).concat(r.docs).forEach(function (x) { if (!seen[x.slug]) { seen[x.slug] = 1; out.push(x); } });
        return out.slice(0, MAX_DOCS);
      })();
      var sug = pl ? pl.sug : null;
      var terms = (r.terms.length ? r.terms : (sug && sug.terms) || []).slice(0, 4);
      var courses = (r.courses || []).slice(0, 3);
      var lv = low(v).replace(/\s+/g, ' ');
      /* 특집 화면을 이름으로 찾기(M8, JHB.search.screens): 화면 이름·여러 낱말 찾기 말과 같거나 이름의 앞부분이면 그 화면 줄을
         문서 사이 위쪽(위기 줄·위기 글 다음, screenSlot)에 둔다. 글 제목에 흔한 낱말(부작용·입원·체중)로는 올리지 않는다 */
      var scr = (pl && P && S().screens) ? S().screens(P, A.pages, v) : [];
      /* 찾기 말로만 맞은 화면(kw: '약 거부'·'물 중독')은 첫 글 뒤에(첫 줄·Enter 기본 선택은 글) */
      var slot = scr.length && S().screenSlot ? Math.min(S().screenSlot(docs, scr[0].strength, scr[0].kw), docs.length) : 0;
      var scrIds = scr.map(function (x) { return x.page.id; });
      var acts = actions().filter(function (ac) { return scrIds.indexOf(ac.id) < 0 && (low(ac.label).indexOf(lv) >= 0 || low(ac.keys).indexOf(lv) >= 0); });
      function screenItem(x) {
        var ac = pageAction(x.page);
        return item({ cls: 'pal-screen', lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['›']), title: hl(ac.label, v), sub: '화면 · ' + ac.sub, tail: '화면', remember: v, run: ac.run });
      }

      if (sug) {
        /* "‘환청’을 찾으셨나요?": 묶음 제목 자리의 안내 한 줄(누르는 줄 아님). 후보로 찾은 글이면 바로 아래에 */
        var J = JHB.search && JHB.search.hangul;
        var dj = (J ? J.josa(sug.text) : '을(를)');
        list.appendChild(group([el('span.pal-did', { id: 'pal-did' }, ['‘', el('b', null, [sug.text]), '’' + dj + ' 찾으셨나요?'])]));
        /* 묶음 제목은 목록 탐색에서 읽히지 않으므로 입력칸 설명과 알림으로도 */
        didText = '‘' + sug.text + '’' + dj + ' 찾으셨나요?' + (pl.useSug || r.initials ? ' 그 말로 찾은 결과예요.' : '');
      }
      if (docs.length || scr.length) {
        if (!(sug && (pl.useSug || r.initials))) list.appendChild(group([scr.length ? (docs.length ? '문서와 화면' : '화면') : '문서']));
        docs.forEach(function (x, i) {
          if (i === slot) scr.forEach(function (s) { list.appendChild(screenItem(s)); });
          list.appendChild(docItem(x.a || A.bySlug[x.slug], pl && pl.useSug ? sug.text : v));
        });
        if (slot >= docs.length) scr.forEach(function (s) { list.appendChild(screenItem(s)); });
      }
      if (terms.length) {
        list.appendChild(group(['용어']));
        terms.forEach(function (x) {
          var g = x.g;
          list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['辭']), title: hl(g.term, sug && !r.terms.length ? sug.text : v), sub: g.def || g.en || '', tail: g.en || '용어', remember: v, run: function () { A.go('#/glossary?t=' + encodeURIComponent(g.term)); } }));
        });
      }
      if (courses.length) {
        list.appendChild(group(['코스']));
        courses.forEach(function (x) {
          var c = x.c;
          list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['☰']), title: hl(c.title, v), sub: c.intro || '', tail: (c.steps || []).length + '편', remember: v, run: function () { A.go('#/course/' + encodeURIComponent(c.id)); } }));
        });
      }
      if (acts.length) { list.appendChild(group(['동작'])); acts.forEach(function (ac) { list.appendChild(item({ lead: el('span.pal-dot', { 'aria-hidden': 'true' }, ['›']), title: hl(ac.label, v), sub: ac.sub, run: ac.run })); }); }
      if (!items.some(function (it) { return !it.crisis && !it.skip && !/pal-all/.test(it.el.className); }) && !cl) list.appendChild(el('div.pal-empty', null, ['제목과 용어에서 찾지 못했어요. 아래에서 본문까지 찾아 보세요.']));
      if (!urgent) list.appendChild(allItem());
    }
    /* 감지와 상관없이 도움으로 가는 길(위기 줄이 이미 있으면 겹쳐 두지 않음) */
    if (!cl) list.appendChild(helpItem());
    if (didText) { input.setAttribute('aria-describedby', 'pal-did'); say(didText); }
    else { input.removeAttribute('aria-describedby'); if (lastLive && lastLive.indexOf('찾으셨나요') >= 0) say(''); }
    /* 기본 선택은 위기 안내 줄·도움 줄이 아닌 첫 항목(Enter 한 번에 엉뚱한 곳으로 가지 않게, 전화가 걸리지 않게) */
    var first = -1;
    for (var i = 0; i < items.length; i++) { if (!items[i].crisis && !items[i].skip) { first = i; break; } }
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
    if (it.stay) { it.run(); try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } return; }
    if (it.remember) rememberQ(it.remember);
    var run = it.run, back = returnTo;
    close(false);
    run(back);
  }
  /* Enter: 고른 줄을 실행(없으면 찾기 화면) */
  function enter() {
    if (sel >= 0 && items[sel]) exec(items[sel]);
    else if (input.value.trim()) { var v = input.value.trim(); rememberQ(v); close(false); goSearch(v); }
  }

  /* ---------- 열고 닫기 ---------- */
  function show(prefill) {
    if (open) { if (prefill != null) { input.value = prefill; render(); } return; }
    open = true;
    input.value = prefill || '';
    root.hidden = false; scrim.hidden = false;
    document.documentElement.classList.add('pal-open');
    if (!reducedMotion()) { root.classList.remove('pal-in'); void root.offsetWidth; root.classList.add('pal-in'); }
    render();
    input.focus({ preventScroll: true });
    try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) { }
    scheduleWarm(1500);
  }
  /* 쉬는 동안 빠른 찾기 준비물·오타 사전·위기 감지 첫 실행을 미리(첫 글자·첫 오타에서 느린 기기가 멈칫하지 않게).
     팔레트를 열 때와 상단 검색창에 처음 포커스가 갈 때 한 번 */
  var warmed = false;
  function scheduleWarm(timeout) {
    if (warmed) return;
    warmed = true;
    /* 준비물 → 첫 실행 → 오타 사전 순서로, 쉬는 시간마다 하나씩(한 번에 길게 막지 않게) */
    var steps = [function () { quick(); }, function () { var P = quick(); if (P && S().warm) S().warm(P, detect, 'run'); }, function () { var P = quick(); if (P && S().warm) S().warm(P, detect, 'vocab'); }];
    var next = function () {
      var f = steps.shift();
      if (!f) return;
      try { if (S()) f(); } catch (e) { }
      later(next);
    };
    var later = function (fn) { if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: timeout }); else setTimeout(fn, 200); };
    later(next);
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
  /* 글자를 칠 때마다가 아니라 한 프레임에 한 번 그린다(긴 글을 붙여 넣거나 빨리 칠 때 느린 기기가 버벅이지 않게).
     키(↑↓·Enter)를 누르면 밀린 그리기를 먼저 끝내 늘 지금 입력의 결과를 고른다 */
  var raf = 0;
  var frame = window.requestAnimationFrame ? function (f) { return window.requestAnimationFrame(f); } : function (f) { return setTimeout(f, 16); };
  var unframe = window.cancelAnimationFrame ? function (id) { window.cancelAnimationFrame(id); } : function (id) { clearTimeout(id); };
  function schedule() { if (raf) return; raf = frame(function () { raf = 0; if (open) render(); }); }
  function flush() { if (!raf) return; unframe(raf); raf = 0; if (open) render(); }
  input.addEventListener('input', schedule);
  /* 한글 조합 중의 키(229)는 조합을 끝내는 데 쓰인다. 그 키가 Enter 였으면(Windows 는 keyup 에서야 Enter 로 보임) 조합이 끝난 뒤 한 번 실행 */
  var imeKey = false;
  input.addEventListener('keydown', function (e) {
    if (e.isComposing || e.keyCode === 229 || e.key === 'Process') { imeKey = true; return; }
    imeKey = false;
    if (/^(ArrowDown|ArrowUp|Home|End|Enter)$/.test(e.key)) flush();
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Home' && items.length && !input.value) { e.preventDefault(); select(0); }
    else if (e.key === 'End' && items.length && !input.value) { e.preventDefault(); select(items.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); enter(); }
  });
  input.addEventListener('keyup', function (e) {
    if (!open || !imeKey || e.key !== 'Enter' || e.isComposing) return;
    imeKey = false;
    flush();
    enter();
  });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key === 'Tab') {
      /* 팔레트 안에서만 순환(입력 → 닫기 → 전화 버튼) */
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
     한글(IME) 입력: 조합 중에 포커스를 팔레트로 옮기면 조합이 끊겨 "환청"이 "ㅎ환청"·"ㅎ완청"처럼 깨진다.
     그래서 한 음절을 조합하는 동안(compositionstart~compositionend)에는 절대 넘기지 않는다. 조합이 끝난 뒤(compositionend) 입력이
     IME_IDLE 동안 멈추면 그 값으로 연다. 조합이 끝난 뒤의 Enter 는 바로 넘겨 고른 줄을 실행한다
     (Windows Chrome 은 조합 중 Enter 를 keydown 229 → compositionend → keyup Enter 로 보내서 keyup 도 본다).
     조합이 아닌 입력(영문·숫자)은 바로 연다. #q 가 비어 있을 때의 '/' 는 글자로 넣지 않고 팔레트만 연다. */
  var IME_IDLE = 500;
  if (q) {
    var composing = false, imeAt = 0, handT = null;
    var now = function () { return Date.now(); };
    var handOff = function (run) {
      clearTimeout(handT); handT = null;
      if (open) return;
      var v = q.value;
      openFrom(q, v);
      q.value = '';
      if (run && String(v).trim()) enter();
    };
    var later = function () { clearTimeout(handT); handT = setTimeout(function () { handT = null; if (!open && !composing && q.value && document.activeElement === q) handOff(false); }, IME_IDLE); };
    var imeNow = function () { return composing || now() - imeAt < 1000; };
    q.addEventListener('compositionstart', function () { composing = true; imeAt = now(); clearTimeout(handT); handT = null; });
    q.addEventListener('compositionupdate', function () { imeAt = now(); });
    q.addEventListener('compositionend', function () { composing = false; imeAt = now(); if (!open && q.value) later(); });
    q.addEventListener('input', function (e) {
      if (open) return;
      e.stopPropagation();
      if (e.isComposing || composing) return; /* 한 음절을 조합하는 중: 기다린다(compositionend 뒤에만 넘김) */
      if (imeNow()) { later(); return; } /* 조합이 막 끝난 뒤의 입력(띄어쓰기 등): 멈추면 넘긴다 */
      handOff(false);
    });
    q.addEventListener('blur', function () { clearTimeout(handT); handT = null; });
    q.addEventListener('focus', function () { scheduleWarm(400); });
    q.addEventListener('click', function () { if (!open) handOff(false); });
    q.addEventListener('keydown', function (e) {
      if (open) return;
      if (e.key === 'Process' || e.keyCode === 229 || e.isComposing) { imeAt = now(); return; } /* IME 가 받은 키 */
      if (e.key === 'Enter') { e.preventDefault(); handOff(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); handOff(false); }
      else if (e.key === '/' && !q.value && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); clearTimeout(handT); handT = null; openFrom(q, ''); }
      else if (e.key === 'Escape' && q.value) { e.preventDefault(); clearTimeout(handT); handT = null; q.value = ''; }
    });
    /* 조합 중 Enter 로 조합이 끝난 경우(Windows): keydown 은 229 라 위에서 걸러지고 keyup 으로 Enter 가 온다 */
    q.addEventListener('keyup', function (e) {
      if (open || composing || e.key !== 'Enter' || !String(q.value).trim() || document.activeElement !== q) return;
      if (now() - imeAt > 1500) return;
      handOff(true);
    });
  }

  JHB.ui = JHB.ui || {};
  JHB.ui.palette = { open: function (v) { openFrom(document.activeElement, v || ''); }, close: function () { close(true); }, toggle: toggle, isOpen: function () { return open; } };
})();

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/preview.js ===== */
(function () { try {
/* 조현병 백과 · 링크 미리보기 (js/ui/preview.js)
   본문·함께 읽기·가리키는 문서·목차·문서 행·색인의 내부 문서 링크(a/<slug>/)에
   마우스를 400ms 올리거나, 키보드 포커스가 400ms 머물거나, 휴대폰에서 500ms 길게 누르면
   분류 색 막대 + 제목 + 요약 + 근거 배지 + 읽음 표시가 담긴 작은 카드가 떠요. 한 번에 하나만.
   공용 팝오버(#pop)가 열려 있으면 띄우지 않아요. app.js 는 고치지 않아요. */
(function () {
  if (!window.JHB || !JHB.app) return;
  var A = JHB.app, el = A.el;
  var HOVER_MS = 400, FOCUS_MS = 400, TOUCH_MS = 500, LEAVE_MS = 120;
  var SCOPE = '.body, .see-also, .backlinks, .nav-docs, .rows .row, .index-sec';
  var pop = document.getElementById('pop');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  var card = el('div.pv', { id: 'pv-card', role: 'tooltip', hidden: true });
  document.body.appendChild(card);

  var cur = null, showTimer = 0, hideTimer = 0, touchTimer = 0, touchLink = null, touchShown = false, lastSlug = null;

  function slugOf(a) {
    var href = a.getAttribute('href') || '';
    if (!href || /^(https?:)?\/\//i.test(href) && a.host !== location.host) return null;
    if (/^(mailto|tel|javascript):/i.test(href)) return null;
    var m = /^#\/a\/([^\/?#]+)\/?$/.exec(href);
    if (m) return m[1];
    var path = (a.pathname || '');
    m = /\/a\/([^\/]+)\/$/.exec(path);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function linkFrom(t) {
    if (!t || t.nodeType !== 1) return null;
    var a = t.closest('a[href]');
    if (!a || !a.closest(SCOPE)) return null;
    if (a.closest('#pv-card')) return null;
    if (a.closest('.doc-head')) return null;
    var slug = slugOf(a);
    if (!slug || !A.bySlug[slug]) return null;
    /* 지금 보는 문서 자신은 건너뛴다 */
    var w = A.where();
    if (w.path[0] === 'a' && w.path[1] === slug) return null;
    return { a: a, slug: slug };
  }

  function build(slug) {
    var art = A.bySlug[slug], sec = A.secById[art.section] || {};
    var ev = art.evidence ? el('span.pv-ev.ev', { class: 'ev-' + art.evidence }, [((JHB.EVIDENCE || {})[art.evidence] || {}).label || art.evidence]) : null;
    var read = (A.progress && A.progress.isRead(slug)) ? el('span.pv-read', null, ['읽음']) : null;
    var mins = art.minutes ? el('span.pv-min', null, [art.minutes + '분']) : null;
    card.innerHTML = '';
    card.appendChild(el('div.pv-top', null, [A.spine(sec), el('span.pv-sec', null, [sec.title || '']), mins]));
    card.appendChild(el('div.pv-title', null, [art.title]));
    if (art.summary) card.appendChild(el('p.pv-sum', null, [art.summary]));
    if (ev || read) card.appendChild(el('div.pv-meta', null, [ev, read]));
  }

  function place(a) {
    var r = a.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var w = card.offsetWidth, h = card.offsetHeight, gap = 8, pad = 12;
    var left = r.left + Math.min(r.width, 320) / 2 - w / 2;
    left = Math.max(pad, Math.min(left, vw - w - pad));
    var below = r.bottom + gap, above = r.top - gap - h;
    var top;
    if (below + h + pad <= vh) { top = below; card.setAttribute('data-side', 'below'); }
    else if (above >= pad) { top = above; card.setAttribute('data-side', 'above'); }
    else { top = Math.max(pad, Math.min(below, vh - h - pad)); card.setAttribute('data-side', 'below'); }
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
  }

  function show(a, slug) {
    if (pop && !pop.hidden) return;
    if (!document.contains(a)) return;
    cur = a;
    if (lastSlug !== slug) { build(slug); lastSlug = slug; }
    card.hidden = false;
    card.classList.remove('pv-in');
    place(a);
    if (!(reduce && reduce.matches)) { void card.offsetWidth; card.classList.add('pv-in'); }
    a.setAttribute('aria-describedby', 'pv-card');
  }
  function hide() {
    clearTimeout(showTimer); clearTimeout(hideTimer); showTimer = hideTimer = 0;
    if (cur) cur.removeAttribute('aria-describedby');
    cur = null; touchShown = false;
    if (!card.hidden) { card.hidden = true; card.classList.remove('pv-in'); }
  }
  function schedule(a, slug, ms) {
    clearTimeout(showTimer); clearTimeout(hideTimer); hideTimer = 0;
    if (cur === a && !card.hidden) return;
    showTimer = setTimeout(function () { showTimer = 0; show(a, slug); }, ms);
  }
  function scheduleHide() {
    clearTimeout(showTimer); showTimer = 0;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { hideTimer = 0; hide(); }, LEAVE_MS);
  }

  /* 마우스 */
  document.addEventListener('mouseover', function (e) {
    if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
    if (card.contains(e.target)) { clearTimeout(hideTimer); hideTimer = 0; return; }
    var L = linkFrom(e.target);
    if (L) schedule(L.a, L.slug, HOVER_MS);
    else if (cur || showTimer) scheduleHide();
  });
  document.addEventListener('mouseout', function (e) {
    var to = e.relatedTarget;
    if (to && (card.contains(to) || (cur && cur.contains(to)))) return;
    var L = linkFrom(e.target);
    if (L || card.contains(e.target)) scheduleHide();
  });

  /* 키보드 포커스 */
  document.addEventListener('focusin', function (e) {
    var L = linkFrom(e.target);
    if (L) schedule(L.a, L.slug, FOCUS_MS);
    else if (!card.contains(e.target)) hide();
  });
  document.addEventListener('focusout', function (e) {
    if (linkFrom(e.target)) scheduleHide();
  });

  /* 휴대폰 길게 누르기 */
  function cancelTouch() { clearTimeout(touchTimer); touchTimer = 0; touchLink = null; }
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { cancelTouch(); return; }
    var t = e.target;
    if (card.contains(t)) return;
    var L = linkFrom(t);
    if (!L) { if (!card.hidden) hide(); cancelTouch(); return; }
    cancelTouch();
    touchLink = L.a; touchShown = false;
    touchTimer = setTimeout(function () {
      touchTimer = 0;
      if (touchLink === L.a) { show(L.a, L.slug); touchShown = !card.hidden; }
    }, TOUCH_MS);
  }, { passive: true });
  document.addEventListener('touchmove', function () { if (touchTimer) cancelTouch(); }, { passive: true });
  document.addEventListener('touchcancel', function () { cancelTouch(); }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (touchTimer) { cancelTouch(); return; }
    if (touchShown && touchLink && (touchLink === e.target || touchLink.contains(e.target))) {
      /* 길게 눌러 카드를 띄웠으면 손을 떼도 이동하지 않는다 */
      e.preventDefault();
      touchShown = false;
    }
    touchLink = null;
  }, { passive: false });
  document.addEventListener('contextmenu', function (e) {
    if (!card.hidden && cur && (cur === e.target || cur.contains(e.target)) && touchLink === cur) e.preventDefault();
  });

  /* 닫는 상황 */
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !card.hidden) hide(); });
  document.addEventListener('scroll', function () { if (!card.hidden) hide(); }, { passive: true, capture: true });
  window.addEventListener('resize', hide);
  window.addEventListener('jhb:page', hide);
  window.addEventListener('jhb:layout', hide);
  document.addEventListener('click', function (e) { if (!card.contains(e.target)) hide(); }, true);
  /* 공용 팝오버가 열리면 미리보기는 비운다 */
  if (pop && window.MutationObserver) new MutationObserver(function () { if (!pop.hidden) hide(); }).observe(pop, { attributes: true, attributeFilter: ['hidden'] });

  JHB.ui = JHB.ui || {};
  JHB.ui.preview = { hide: hide, isOpen: function () { return !card.hidden; } };
})();

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/mobile.js ===== */
(function () { try {
/* js/ui/mobile.js — 휴대폰 하단 바와 스와이프 (화면 폭 760px 이하, 모든 화면)
   하단 바
   - 문서 화면: [차례] [저장] [용어] [위로]. 차례·용어는 바텀시트.
   - 그 밖의 화면: [찾기(팔레트)] [분류(왼쪽 목차 서랍)] [길잡이(guide 가 있을 때만)] [내 서재(me) 또는 저장한 문서].
     위기 입구는 상단 "지금 도움" 하나로 충분해서 하단 바에는 넣지 않아요.
   - 스크롤을 내리면 바가 숨고 올리면 나타나요. 바가 있는 동안 body 에 아래 여백(mb-has-bar)을 줘요.
   - 차례에서 소절로 갈 때 요약 보기로 접힌 소절이면 JHB.ui.reading.reveal(id) 로 먼저 펴요.
   - 차례·용어 바텀시트는 대화상자: 열린 동안 뒤 화면 inert, Tab 은 시트 안에서만 돌아요.
   스와이프(문서 화면): 가로로 80px 이상 밀면 같은 분류의 앞·다음 문서로 가요. 표(.tbl)나 가로 스크롤 요소 위에서 시작한 터치는 무시.
   node: module.exports = { generalItems } (tests/nowhelp.test.cjs) */
(function (root) {
  'use strict';
  /* 문서 밖 화면의 하단 바 칸. pages = JHB.app.pageById, cur = 주소 첫 칸('' 첫 화면, 's', 'search', 'fav', 특집 화면 id …) */
  function generalItems(pages, cur) {
    const P = pages || {}, has = function (id) { return Object.prototype.hasOwnProperty.call(P, id) && !!P[id]; };
    const out = [
      { id: 'search', kind: 'button', label: '찾기', current: cur === 'search' },
      { id: 'nav', kind: 'button', label: '분류', current: false }
    ];
    if (has('guide')) out.push({ id: 'guide', kind: 'link', label: '길잡이', href: '#/guide', current: cur === 'guide' });
    if (has('me')) out.push({ id: 'me', kind: 'link', label: '내 서재', href: '#/me', current: cur === 'me' });
    else out.push({ id: 'fav', kind: 'link', label: '저장한 문서', href: '#/fav', current: cur === 'fav' });
    return out;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { generalItems: generalItems }; return; }

  /* ================= 브라우저 ================= */
  const JHB = root.JHB;
  if (!JHB || !JHB.app) return;
  const A = JHB.app, el = A.el;
  const NARROW = 760;
  function narrow() { return innerWidth <= NARROW; }
  function reduce() { return A.reducedMotion ? A.reducedMotion() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function svg(path) { return el('span', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>' }); }
  const ICON = {
    toc: '<path d="M5 7h14M5 12h14M5 17h9"/>',
    fav: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    term: '<path d="M4 19V6a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13M9 9h6M9 13h4"/>',
    top: '<path d="M12 19V6M6 12l6-6 6 6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    nav: '<path d="M5 4v16M9.5 4v16M14 5l4 14.5"/>',
    guide: '<path d="M12 3v18M12 5h6l2 2.5-2 2.5h-6M12 12H6l-2 2.5L6 17h6"/>',
    me: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>'
  };

  let state = null;          /* 현재 문서: { slug, toc, body, prev, next } */
  let mode = null;           /* 'doc' | 'gen' | null(숨김) */
  let genSig = '', genTimer = 0, navBtnGen = null, navFromBar = false;
  let bar = null, btnToc, btnFav, btnTerm, btnTop, sheet, scrim, hintL, hintR;
  let opener = null, lastY = 0, hintTimer = 0, navigating = false;

  /* ---------- 하단 바 ---------- */
  function btn(cls, icon, label, aria) {
    return el('button.mb-btn.' + cls, { type: 'button', 'aria-label': aria || label }, [svg(ICON[icon]), el('span.mb-l', null, [label])]);
  }
  function build() {
    if (bar) return;
    btnToc = btn('mb-toc', 'toc', '차례', '이 문서의 차례 열기');
    btnFav = btn('mb-fav', 'fav', '저장', '이 문서 저장');
    btnTerm = btn('mb-term', 'term', '용어', '이 문서에 나온 용어 목록 열기');
    btnTop = btn('mb-top', 'top', '위로', '맨 위로');
    btnToc.setAttribute('aria-haspopup', 'dialog'); btnToc.setAttribute('aria-expanded', 'false');
    btnTerm.setAttribute('aria-haspopup', 'dialog'); btnTerm.setAttribute('aria-expanded', 'false');
    bar = el('nav.mb-bar', { 'aria-label': '문서 도구', hidden: true });
    scrim = el('div.mb-scrim', { hidden: true });
    sheet = el('section.mb-sheet', { role: 'dialog', 'aria-modal': 'true', tabindex: '-1', hidden: true });
    hintL = el('div.mb-hint.left', { 'aria-hidden': 'true' });
    hintR = el('div.mb-hint.right', { 'aria-hidden': 'true' });
    document.body.appendChild(bar); document.body.appendChild(scrim); document.body.appendChild(sheet);
    document.body.appendChild(hintL); document.body.appendChild(hintR);

    btnToc.addEventListener('click', function () { if (!sheet.hidden && opener === btnToc) closeSheet(true); else openSheet('toc', btnToc); });
    btnTerm.addEventListener('click', function () { if (!sheet.hidden && opener === btnTerm) closeSheet(true); else openSheet('term', btnTerm); });
    btnTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }); });
    btnFav.addEventListener('click', function () {
      if (!state) return;
      const on = A.toggleFav(state.slug);
      /* 본문 안의 저장 버튼(.js-fav)도 같은 상태로 */
      Array.prototype.forEach.call(document.querySelectorAll('.js-fav'), function (x) { x.className = 'btn js-fav' + (on ? ' on' : ''); x.textContent = on ? '저장됨' : '저장'; x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      syncFav();
      A.announce(on ? '이 문서를 저장했어요' : '저장을 해제했어요');
    });
    /* 본문의 저장 버튼을 눌렀을 때도 하단 바 상태를 맞춘다 */
    window.addEventListener('jhb:fav', function (e) { if (state && e.detail && e.detail.slug === state.slug) syncFav(); });
    scrim.addEventListener('click', function () { closeSheet(true); });
    sheet.addEventListener('keydown', trapSheet);
    document.addEventListener('focusin', function (e) {
      if (sheet.hidden || sheet.contains(e.target)) return;
      if (JHB.ui && JHB.ui.nowhelp && JHB.ui.nowhelp.isOpen && JHB.ui.nowhelp.isOpen()) return;
      const f = sheetFocusables(); (f[0] || sheet).focus({ preventScroll: true });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(true); });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { if (!narrow()) closeSheet(false); });
    watchNav();
  }
  function syncFav() {
    if (!state) return;
    const on = A.isFav(state.slug);
    btnFav.classList.toggle('on', on);
    btnFav.setAttribute('aria-pressed', on ? 'true' : 'false');
    btnFav.setAttribute('aria-label', on ? '저장됨. 누르면 저장을 해제해요' : '이 문서 저장');
    btnFav.querySelector('.mb-l').textContent = on ? '저장됨' : '저장';
    const s = btnFav.querySelector('svg'); if (s) s.setAttribute('fill', on ? 'currentColor' : 'none');
  }
  function onScroll() {
    if (!bar || bar.hidden) return;
    const y = scrollY, dy = y - lastY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (y < 40 || max - y < 40) setHidden(false);
    else if (dy > 8 && sheet.hidden) setHidden(true);
    else if (dy < -8) setHidden(false);
    lastY = y;
  }
  function setHidden(h) { bar.classList.toggle('mb-hidden', h); }
  function showBar(m, n, label) {
    mode = m;
    bar.setAttribute('aria-label', label);
    bar.style.setProperty('--mb-n', String(n));
    bar.hidden = false; setHidden(false); lastY = scrollY;
    document.body.classList.add('mb-has-bar');
  }
  function hideBar() {
    mode = null;
    if (!bar) return;
    bar.hidden = true;
    document.body.classList.remove('mb-has-bar');
  }

  /* ---------- 문서 밖 화면의 칸 ---------- */
  function openSearch(from) {
    /* 찾기 화면이면 그 화면의 입력창으로, 아니면 팔레트, 팔레트가 없으면 찾기 화면으로 */
    const pin = document.querySelector('.fp-body[data-page="search"] input[type="search"]');
    if (pin) { pin.focus(); if (pin.scrollIntoView) pin.scrollIntoView({ block: 'center', behavior: reduce() ? 'auto' : 'smooth' }); return; }
    if (JHB.ui && JHB.ui.palette && JHB.ui.palette.open) { if (from && from.focus) from.focus({ preventScroll: true }); JHB.ui.palette.open(''); return; }
    if (A.goSearch) A.goSearch('');
  }
  function navOpen() { return !!(A.nav && A.nav.classList.contains('open')); }
  /* 서랍이 열려 있는 동안 하단 바는 Tab 으로 닿지 않게, 닫히면 연 칸으로 포커스를 돌린다 */
  function watchNav() {
    if (!A.nav || !window.MutationObserver) return;
    let was = navOpen();
    new MutationObserver(function () {
      const now = navOpen();
      if (now === was) return;
      was = now;
      bar.inert = now;
      if (navBtnGen) navBtnGen.setAttribute('aria-expanded', now ? 'true' : 'false');
      if (!now && navFromBar && navBtnGen && mode === 'gen' && document.contains(navBtnGen) && narrow()) {
        const back = navBtnGen;
        /* setNav(false) 가 상단 목차 버튼으로 옮긴 포커스를 연 칸으로 */
        if (document.activeElement === document.getElementById('btn-nav') || document.activeElement === document.body) back.focus({ preventScroll: true });
      }
      if (!now) navFromBar = false;
    }).observe(A.nav, { attributes: true, attributeFilter: ['class'] });
  }
  function genItemEl(it) {
    let n;
    if (it.kind === 'link') {
      n = el('a.mb-btn.mb-' + it.id, { href: A.L(it.href) }, [svg(ICON[it.id] || ICON.fav), el('span.mb-l', null, [it.label])]);
    } else if (it.id === 'search') {
      n = btn('mb-search', 'search', it.label, '찾기: 문서나 용어 찾기 열기');
      n.setAttribute('aria-haspopup', 'dialog');
      n.addEventListener('click', function () { openSearch(n); });
    } else {
      n = btn('mb-nav', 'nav', it.label, '분류 목차 열기');
      n.setAttribute('aria-controls', 'sidenav');
      n.setAttribute('aria-expanded', navOpen() ? 'true' : 'false');
      n.addEventListener('click', function () { const o = !navOpen(); navFromBar = o; A.setNav(o); });
      navBtnGen = n;
    }
    if (it.current) { n.setAttribute('aria-current', 'page'); n.classList.add('on'); }
    return n;
  }
  function showGeneral() {
    build();
    state = null; closeSheet(false); hideHints();
    const w = A.where();
    const items = generalItems(A.pageById, w.path[0] || '');
    const sig = items.map(function (x) { return x.id + (x.current ? '*' : ''); }).join(',');
    if (mode !== 'gen' || sig !== genSig) {
      bar.textContent = '';
      navBtnGen = null;
      items.forEach(function (it) { bar.appendChild(genItemEl(it)); });
      genSig = sig;
    }
    showBar('gen', items.length, '빠른 이동');
  }

  /* ---------- 바텀시트 ----------
     role=dialog aria-modal=true 라서 열린 동안 뒤 화면(상단 바·본문·바닥글·하단 바)을 inert 로 두고,
     Tab/Shift+Tab 은 시트 안에서 돌고, 포커스가 밖으로 새면 시트로 되돌린다 */
  const BG = '.skip, header.topbar, .shell, footer.sitefoot';
  let locked = [];
  function lockBg() {
    unlockBg();
    Array.prototype.forEach.call(document.querySelectorAll(BG), function (n) { locked.push([n, !!n.inert]); n.inert = true; });
    if (bar) { locked.push([bar, !!bar.inert]); bar.inert = true; }
  }
  function unlockBg() { locked.forEach(function (p) { p[0].inert = p[1]; }); locked = []; }
  function sheetFocusables() {
    return Array.prototype.filter.call(sheet.querySelectorAll('button:not([disabled]), a[href]'), function (n) { return n.getClientRects().length > 0; });
  }
  function trapSheet(e) {
    if (e.key !== 'Tab' || sheet.hidden) return;
    const f = sheetFocusables(); if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1], cur = document.activeElement;
    if (e.shiftKey && (cur === first || cur === sheet || !sheet.contains(cur))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (cur === last || !sheet.contains(cur))) { e.preventDefault(); first.focus(); }
  }
  function closeSheet(refocus) {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true; scrim.hidden = true;
    unlockBg();
    if (opener) opener.setAttribute('aria-expanded', 'false');
    if (refocus && opener && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }
  function openSheet(kind, from) {
    if (!state) return;
    closeSheet(false);
    sheet.innerHTML = '';
    const x = el('button.mb-x', { type: 'button', 'aria-label': '닫기' }, ['×']);
    x.addEventListener('click', function () { closeSheet(true); });
    const items = kind === 'toc' ? tocItems() : termItems();
    const title = kind === 'toc' ? '이 문서의 차례' : '이 문서에 나온 용어';
    sheet.setAttribute('aria-label', title);
    sheet.appendChild(el('div.mb-sheet-h', null, [title, items.length ? el('span.mb-n', null, [items.length + '개']) : null, x]));
    sheet.appendChild(items.length ? el('ul.mb-list', null, items.map(function (b) { return el('li', null, [b]); }))
      : el('p.mb-empty', null, [kind === 'toc' ? '이 문서에는 소제목이 없어요.' : '이 문서에는 밑줄 친 용어가 없어요.']));
    sheet.hidden = false; scrim.hidden = false;
    opener = from; from.setAttribute('aria-expanded', 'true');
    setHidden(false);
    lockBg();
    const first = sheet.querySelector('.mb-item') || x;
    setTimeout(function () { first.focus({ preventScroll: true }); }, 0);
  }
  function scrollToEl(n, block) { n.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: block || 'start' }); }
  function tocItems() {
    const cur = currentHead();
    return (state.toc || []).map(function (t) {
      const b = el('button.mb-item', { type: 'button', class: (t.level === 3 ? 'l3' : '') + (t.id === cur ? ' on' : ''), 'aria-current': t.id === cur ? 'true' : null }, [t.text]);
      b.addEventListener('click', function () {
        closeSheet(false);
        /* 요약 보기로 접힌 소절이면 먼저 편다 */
        if (JHB.ui && JHB.ui.reading && JHB.ui.reading.reveal) JHB.ui.reading.reveal(t.id);
        const n = document.getElementById(t.id);
        if (n) { scrollToEl(n); n.setAttribute('tabindex', '-1'); setTimeout(function () { n.focus({ preventScroll: true }); }, reduce() ? 30 : 400); }
      });
      return b;
    });
  }
  /* 본문 속 요소가 든 소절(앞의 h2)을 편다 */
  function revealNode(n) {
    const R = JHB.ui && JHB.ui.reading;
    if (!R || !R.reveal || !state || !state.body) return;
    let top = n;
    while (top && top.parentElement !== state.body) top = top.parentElement;
    if (!top) return;
    if (top.id) { R.reveal(top.id); return; }
    for (let p = top.previousElementSibling; p; p = p.previousElementSibling) { if (p.tagName === 'H2' && p.id) { R.reveal(p.id); return; } }
  }
  function currentHead() {
    let cur = null;
    const heads = state.body ? state.body.querySelectorAll('h2[id], h3[id]') : [];
    for (let i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top < 120) cur = heads[i].id; else break; }
    return cur;
  }
  function termItems() {
    const seen = {}, out = [];
    const terms = state.body ? state.body.querySelectorAll('.term') : [];
    const defs = {}; (A.glossary || []).forEach(function (g) { defs[g.term] = g.def; });
    Array.prototype.forEach.call(terms, function (t) {
      const name = t.getAttribute('data-term') || t.textContent.trim();
      if (seen[name]) return; seen[name] = 1;
      const def = defs[name] || '';
      const b = el('button.mb-item', { type: 'button' }, [name, def ? el('span.mb-def', null, [def.length > 60 ? def.slice(0, 60) + '…' : def]) : null]);
      b.addEventListener('click', function () {
        closeSheet(false);
        /* 요약 보기로 접힌 소절 안의 용어면 먼저 편다 */
        revealNode(t);
        scrollToEl(t, 'center');
        /* 시트를 닫는 클릭이 문서까지 퍼진 뒤에 눌러야 풀이가 바로 닫히지 않는다 */
        setTimeout(function () { t.click(); }, reduce() ? 60 : 420);
      });
      out.push(b);
    });
    return out;
  }

  /* ---------- 스와이프 ---------- */
  let sx = 0, sy = 0, active = false;
  function hasHScroll(t) {
    let n = t;
    while (n && n !== document.body && n.nodeType === 1) {
      if (n.scrollWidth > n.clientWidth + 2) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll') return true; }
      n = n.parentElement;
    }
    return false;
  }
  function hint(side, text, keep) {
    const h = side === 'left' ? hintL : hintR, other = side === 'left' ? hintR : hintL;
    other.classList.remove('on');
    if (text) h.textContent = text;
    h.classList.add('on');
    clearTimeout(hintTimer);
    if (!keep) hintTimer = setTimeout(hideHints, 900);
  }
  function hideHints() { if (!hintL) return; clearTimeout(hintTimer); hintL.classList.remove('on'); hintR.classList.remove('on'); }
  function swipeOk(e) {
    if (!state || !narrow() || navigating) return false;
    if (e.touches.length !== 1) return false;
    const t = e.target; if (!t || t.nodeType !== 1) return false;
    if (t.closest('.tbl, .mb-sheet, .mb-bar, .nh-sheet, #pop, #sidenav, .topbar, input, textarea, select, pre, code')) return false;
    if (hasHScroll(t)) return false;
    if (!sheet.hidden || navOpen()) return false;
    if (JHB.ui && JHB.ui.nowhelp && JHB.ui.nowhelp.isOpen && JHB.ui.nowhelp.isOpen()) return false;
    return true;
  }
  document.addEventListener('touchstart', function (e) {
    active = swipeOk(e);
    if (!active) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!active) return;
    const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) { active = false; hideHints(); return; }
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) hint('left', state.prev ? '앞 문서 ←' : '앞 문서가 없어요', true);
      else hint('right', state.next ? '→ 다음 문서' : '다음 문서가 없어요', true);
    } else hideHints();
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!active) return; active = false;
    const t = e.changedTouches && e.changedTouches[0]; if (!t) { hideHints(); return; }
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) >= 80 && Math.abs(dx) > Math.abs(dy)) {
      const target = dx > 0 ? state.prev : state.next;
      if (!target) { hint(dx > 0 ? 'left' : 'right', dx > 0 ? '앞 문서가 없어요' : '다음 문서가 없어요'); return; }
      hint(dx > 0 ? 'left' : 'right', dx > 0 ? '앞 문서 ←' : '→ 다음 문서', true);
      navigating = true;
      setTimeout(function () { A.go('#/a/' + target.slug); }, 260);
    } else hideHints();
  }, { passive: true });
  document.addEventListener('touchcancel', function () { active = false; hideHints(); }, { passive: true });

  /* ---------- 화면 이벤트 ---------- */
  function attach(d) {
    build();
    clearTimeout(genTimer);
    state = { slug: d.slug, toc: d.toc || [], body: d.body, prev: d.prev, next: d.next };
    navigating = false;
    if (mode !== 'doc') { bar.textContent = ''; [btnToc, btnFav, btnTerm, btnTop].forEach(function (b) { bar.appendChild(b); }); navBtnGen = null; genSig = ''; }
    btnToc.disabled = !state.toc.length;
    btnTerm.disabled = !(d.body && d.body.querySelector('.term'));
    syncFav();
    showBar('doc', 4, '문서 도구');
  }
  function detach() {
    state = null;
    if (!bar) return;
    closeSheet(false); hideHints();
    hideBar();
  }
  window.addEventListener('jhb:article', function (e) { attach(e.detail); });
  window.addEventListener('jhb:page', function (e) {
    const d = e.detail || {};
    if (d.kind === 'a') {
      /* 문서 화면: 다 그리면 jhb:article 이 곧바로 와요. 오지 않으면(불러오기 실패) 일반 칸으로 */
      detach();
      clearTimeout(genTimer);
      if (!d.loading) genTimer = setTimeout(function () { if (!state) showGeneral(); }, 0);
      return;
    }
    showGeneral();
  });
  /* 모듈이 앱보다 늦게 실려 첫 jhb:page 를 놓쳤을 수 있어요(문서 화면은 jhb:article 을 기다려요) */
  if ((A.where().path[0] || '') !== 'a') showGeneral();

  JHB.ui = JHB.ui || {};
  JHB.ui.mobile = { openToc: function () { if (bar && state) openSheet('toc', btnToc); }, openTerms: function () { if (bar && state) openSheet('term', btnTerm); }, close: function (refocus) { closeSheet(refocus !== false); } };
})(typeof window !== 'undefined' ? window : this);

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/sticky.js ===== */
(function () { try {
/* js/ui/sticky.js — 따라오는 제목 줄 (모든 폭)
   문서 화면에서 .doc-head 가 화면 위로 지나가면 상단 바 바로 아래에 얇은 줄이 붙는다:
   [분류 색 막대] 문서 제목 · 현재 소제목 · 남은 시간. 누르면 차례 드롭다운. 맨 위로 돌아오면 사라진다.
   #progress 막대 색도 현재 문서의 분류 색으로 바꾼다. */
(function () {
  'use strict';
  if (!window.JHB || !JHB.app) return;
  const A = JHB.app, el = A.el;
  const NARROW = 760;
  /* 움직임 줄이기: 보기 설정(html[data-motion=reduce])과 기기 설정을 함께 보는 코어 판정(JHB.app.reducedMotion)을 쓴다. 코어가 없으면 기기 설정만 */
  function reduce() {
    const A = window.JHB && JHB.app;
    if (A && typeof A.reducedMotion === 'function') { try { return !!A.reducedMotion(); } catch (e) { } }
    return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function topH() { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')); return isNaN(v) ? 60 : v; }

  let state = null;          /* { toc, minutes, body, heads, docHead, docMain } */
  let bar, main, spineEl, titleEl, headEl, timeEl, menu, raf = 0, curId = null, shown = false;

  function build() {
    if (bar) return;
    spineEl = el('span.stk-spine', { 'aria-hidden': 'true' });
    titleEl = el('span.stk-title');
    headEl = el('span.stk-head');
    timeEl = el('span.stk-time');
    const caret = el('span.stk-caret', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' });
    main = el('button.stk-main', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'stk-menu', 'aria-haspopup': 'true', title: '차례 열기' },
      [spineEl, titleEl, el('span.stk-sep', { 'aria-hidden': 'true' }, ['·']), headEl, el('span.stk-sep', { 'aria-hidden': 'true' }, ['·']), timeEl, caret]);
    menu = el('ul.stk-menu', { id: 'stk-menu', hidden: true, 'aria-label': '이 문서의 차례' });
    bar = el('nav.stk-bar', { role: 'navigation', 'aria-label': '현재 위치', hidden: true }, [main, menu]);
    document.body.appendChild(bar);
    main.addEventListener('click', function () { if (menu.hidden) openMenu(); else closeMenu(false); });
    document.addEventListener('click', function (e) { if (!menu.hidden && !bar.contains(e.target)) closeMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) closeMenu(true); });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('jhb:layout', schedule);
  }
  function openMenu() {
    if (!state) return;
    menu.hidden = false; main.setAttribute('aria-expanded', 'true');
    markMenu();
    const on = menu.querySelector('a.on') || menu.querySelector('a');
    if (on) { on.focus({ preventScroll: true }); if (on.scrollIntoView) on.scrollIntoView({ block: 'nearest' }); }
  }
  function closeMenu(refocus) {
    if (menu.hidden) return;
    menu.hidden = true; main.setAttribute('aria-expanded', 'false');
    if (refocus) main.focus({ preventScroll: true });
  }
  function fillMenu() {
    menu.innerHTML = '';
    if (!state.toc.length) { menu.appendChild(el('li.stk-empty', null, ['이 문서에는 소제목이 없어요.'])); return; }
    state.toc.forEach(function (t) {
      const a = el('a', { href: '#' + t.id, class: t.level === 3 ? 'l3' : '', 'data-h': t.id }, [t.text]);
      a.addEventListener('click', function (e) {
        e.preventDefault(); closeMenu(false);
        /* 요약 보기로 접힌 소절이면 먼저 편다 */
        if (JHB.ui && JHB.ui.reading && JHB.ui.reading.reveal) JHB.ui.reading.reveal(t.id);
        const n = document.getElementById(t.id);
        if (n) { n.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' }); n.setAttribute('tabindex', '-1'); setTimeout(function () { n.focus({ preventScroll: true }); }, reduce() ? 30 : 400); }
      });
      menu.appendChild(el('li', null, [a]));
    });
  }
  function markMenu() {
    Array.prototype.forEach.call(menu.querySelectorAll('a[data-h]'), function (a) {
      const on = a.getAttribute('data-h') === curId;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }

  function schedule() { if (!state || raf) return; raf = requestAnimationFrame(function () { raf = 0; update(); }); }
  function update() {
    if (!state) return;
    const th = topH();
    const headRect = state.docHead ? state.docHead.getBoundingClientRect() : null;
    const want = !!headRect && headRect.bottom < th && scrollY > 10;
    if (want !== shown) { shown = want; bar.classList.toggle('stk-on', want); if (!want) closeMenu(false); }
    /* 폭: 넓은 화면은 본문 칸에 맞추고, 휴대폰은 전체 폭 */
    if (innerWidth > NARROW && state.docMain) {
      const r = state.docMain.getBoundingClientRect();
      const left = Math.max(0, r.left);
      bar.style.left = left + 'px'; bar.style.width = Math.min(r.width, innerWidth - left) + 'px'; bar.style.right = 'auto';
    } else { bar.style.left = ''; bar.style.width = ''; bar.style.right = ''; }
    if (!want) return;
    /* 현재 소제목: 화면 위 120px 선을 지난 마지막 것 */
    let cur = null, curText = '';
    for (let i = 0; i < state.heads.length; i++) {
      const h = state.heads[i];
      if (h.getBoundingClientRect().top < 120) { cur = h.id; curText = h.textContent.trim(); } else break;
    }
    if (cur !== curId) { curId = cur; headEl.textContent = curText; if (!menu.hidden) markMenu(); }
    /* 남은 시간: 본문(.body) 중 아직 화면 아래에 있는 비율 */
    const b = state.body.getBoundingClientRect();
    const frac = b.height > 0 ? Math.min(1, Math.max(0, (innerHeight - b.top) / b.height)) : 1;
    const left = state.minutes * (1 - frac);
    timeEl.textContent = left < 0.5 ? '거의 다 읽었어요' : '남은 시간 ' + Math.ceil(left) + '분';
  }

  /* 진행 막대 색: 문서의 분류 색, 문서 밖에서는 원래 색 */
  function tintProgress(hue) {
    const p = document.getElementById('progress'); if (!p) return;
    p.style.background = hue == null ? '' : 'hsl(' + hue + ' var(--spine-s, 38%) var(--spine-l, 56%))';
  }

  function attach(d) {
    build();
    const sec = A.secById[d.article && d.article.section] || {};
    const hue = sec.hue != null ? sec.hue : 250;
    state = {
      toc: d.toc || [], minutes: Number(d.minutes) || 1, body: d.body,
      heads: d.body ? Array.prototype.slice.call(d.body.querySelectorAll('h2[id], h3[id]')) : [],
      docHead: document.querySelector('.doc-head'), docMain: document.querySelector('.doc-main')
    };
    curId = null; shown = false; bar.classList.remove('stk-on');
    spineEl.style.setProperty('--h', hue);
    titleEl.textContent = (d.meta && d.meta.title) || (d.article && d.article.title) || '';
    headEl.textContent = ''; timeEl.textContent = '남은 시간 ' + state.minutes + '분';
    fillMenu();
    bar.hidden = false;
    tintProgress(hue);
    /* 소제목으로 뛸 때 제목 줄 아래에 내려앉도록 여백을 더한다 */
    document.documentElement.style.scrollPaddingTop = 'calc(var(--top-h) + 16px + 40px)';
    update();
  }
  function detach() {
    state = null; curId = null; shown = false;
    tintProgress(null);
    document.documentElement.style.scrollPaddingTop = '';
    if (!bar) return;
    closeMenu(false); bar.classList.remove('stk-on'); bar.hidden = true;
  }
  window.addEventListener('jhb:article', function (e) { attach(e.detail); });
  window.addEventListener('jhb:page', function (e) { if (!e.detail || e.detail.kind !== 'a') detach(); });

  JHB.ui = JHB.ui || {};
  JHB.ui.sticky = { update: update, openToc: openMenu, close: function () { closeMenu(true); } };
})();

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/reading.js ===== */
(function () { try {
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

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/settings.js ===== */
(function () { try {
/* 조현병 백과 · 보기 설정 패널(js/ui/settings.js)
   상단의 글자 크기·밝게/어둡게 버튼을 톱니 버튼 하나로 모으고, 패널에서 화면·글자 크기·줄 너비·본문 글꼴·움직임 줄이기를 고른다.
   저장: 'jhb.ui.settings' = { theme, fs, width, font, motion }. 기존 키 'jhb.theme'(light/dark)·'jhb.fs'(s/m/l/xl/xxl) 도 함께 맞춰 둔다. */
(function () {
  const KEY = 'jhb.ui.settings', KEY_THEME = 'jhb.theme', KEY_FS = 'jhb.fs';
  const FS = ['s', 'm', 'l', 'xl', 'xxl'];
  const FS_LABEL = { s: '작게', m: '보통', l: '크게', xl: '더 크게', xxl: '아주 크게' };
  const root = document.documentElement;

  function read(k, fb) { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function remove(k) { try { localStorage.removeItem(k); } catch (e) { } }

  function load() {
    const s = read(KEY, {}) || {};
    const t = read(KEY_THEME, null);
    const f = read(KEY_FS, null);
    return {
      theme: t === 'light' || t === 'dark' ? t : 'auto',
      fs: FS.indexOf(f) >= 0 ? f : 'm',
      width: s.width === 'wide' ? 'wide' : 'normal',
      font: s.font === 'serif' ? 'serif' : 'sans',
      motion: s.motion === 'reduce' ? 'reduce' : 'normal'
    };
  }
  let S = load();

  function attr(name, val, off) { if (val === off) root.removeAttribute(name); else root.setAttribute(name, val); }
  let serifLink = null;
  function ensureSerif() {
    /* 제목용으로만 600·700 굵기가 실려 있어서, 본문 명조에는 400 굵기를 따로 받아온다 */
    if (serifLink || document.querySelector('link[data-set-serif]')) return;
    serifLink = document.createElement('link');
    serifLink.rel = 'stylesheet'; serifLink.setAttribute('data-set-serif', '1');
    serifLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap';
    document.head.appendChild(serifLink);
  }
  function applyAll() {
    attr('data-theme', S.theme, 'auto');
    attr('data-fs', S.fs, 'm');
    attr('data-width', S.width, 'normal');
    attr('data-font', S.font, 'sans');
    attr('data-motion', S.motion, 'normal');
    if (S.font === 'serif') ensureSerif();
  }
  function persist() {
    write(KEY, S);
    if (S.theme === 'auto') remove(KEY_THEME); else write(KEY_THEME, S.theme);
    write(KEY_FS, S.fs);
  }
  /* 바로 적용. 첫 그리기 전 적용은 shell 의 머리 스크립트가 같은 값으로 이미 했다(테마·글자 크기 다섯 단계·줄 너비·본문 글꼴·움직임, F1·T16 —
     load() 의 키·값을 바꾸면 tools/shell.html 의 머리 스크립트도 함께 바꿔요. tests/pages.test.cjs 가 맞대요) */
  applyAll();

  /* 기기 안 기록 지우기(JHB.app.privacy.clear)로 보기 설정 키가 지워지면 기억해 둔 값도 기본값으로 되돌리고 다시 적용한다.
     (되돌리지 않으면 지운 뒤에도 옛 보기가 남고, 다음 set() 때 옛 값이 다시 저장된다.) 저장은 하지 않는다(지운 키를 되살리지 않게).
     ids 가 'all'(keep 에 settings 가 없을 때)이거나 'settings' 를 담고 있을 때만 */
  const DEFAULTS = { theme: 'auto', fs: 'm', width: 'normal', font: 'sans', motion: 'normal' };
  let syncUi = null;
  function settingsCleared(d) {
    if (!d || d.action !== 'clear') return false;
    if (d.ids === 'all') return !(Array.isArray(d.keep) && d.keep.indexOf('settings') >= 0);
    return Array.isArray(d.ids) && d.ids.indexOf('settings') >= 0;
  }
  window.addEventListener('jhb:privacy', function (e) {
    if (!settingsCleared(e && e.detail)) return;
    S = Object.assign({}, DEFAULTS);
    applyAll();
    if (syncUi) syncUi();
    window.dispatchEvent(new Event('jhb:layout'));
  });

  /* ---------- 앱이 준비된 뒤: 버튼과 패널 ---------- */
  function ready() {
    if (!window.JHB || !JHB.app) return;
    const A = JHB.app, el = A.el;
    const tools = document.querySelector('.tools');
    const oldFs = document.getElementById('btn-fs'), oldTheme = document.getElementById('btn-theme');
    if (!tools) return;
    tools.classList.add('set-ready');
    if (oldFs) oldFs.hidden = true;
    if (oldTheme) oldTheme.hidden = true;

    function set(k, v, msg) {
      if (S[k] === v) return;
      S[k] = v; applyAll(); persist(); sync();
      if (msg) A.announce(msg);
      window.dispatchEvent(new Event('jhb:layout'));
    }

    const gear = el('button.iconbtn.set-btn', { type: 'button', id: 'set-btn', 'aria-label': '보기 설정', title: '보기 설정', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'set-panel' }, []);
    gear.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/></svg>';
    if (oldFs && oldFs.parentNode === tools) tools.insertBefore(gear, oldFs); else tools.appendChild(gear);

    /* 세그먼트(라디오 묶음) */
    function seg(name, key, opts) {
      const g = el('div.set-seg', { role: 'radiogroup', 'aria-label': name });
      opts.forEach(function (o) {
        const b = el('button.set-opt', { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-v': o.v }, [o.label]);
        b.addEventListener('click', function () { set(key, o.v, o.msg); });
        g.appendChild(b);
      });
      g.addEventListener('keydown', function (e) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
        e.preventDefault();
        const items = Array.prototype.slice.call(g.querySelectorAll('[role="radio"]'));
        const i = items.indexOf(document.activeElement);
        const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
        const n = items[(Math.max(i, 0) + dir + items.length) % items.length];
        n.focus(); n.click();
      });
      g.setAttribute('data-key', key);
      return g;
    }
    function row(label, control, hint) {
      const id = 'set-l-' + Math.random().toString(36).slice(2, 7);
      const lab = el('div.set-label', { id: id }, [label]);
      control.setAttribute('aria-labelledby', id);
      return el('div.set-row', null, [lab, control, hint || null]);
    }

    const themeSeg = seg('화면', 'theme', [{ v: 'auto', label: '자동', msg: '화면을 기기 설정에 맞춰요' }, { v: 'light', label: '밝게', msg: '밝은 화면으로 바꿨어요' }, { v: 'dark', label: '어둡게', msg: '어두운 화면으로 바꿨어요' }]);
    const widthSeg = seg('줄 너비', 'width', [{ v: 'normal', label: '보통', msg: '줄 너비: 보통' }, { v: 'wide', label: '넓게', msg: '줄 너비: 넓게' }]);
    const fontSeg = seg('본문 글꼴', 'font', [{ v: 'sans', label: '고딕', msg: '본문 글꼴: 고딕' }, { v: 'serif', label: '명조', msg: '본문 글꼴: 명조' }]);

    const fsOut = el('span.set-fs-val', { 'aria-hidden': 'true' }, ['보통']);
    const fsRange = el('input.set-range', { type: 'range', min: '1', max: '5', step: '1', 'aria-valuemin': '1', 'aria-valuemax': '5' });
    fsRange.addEventListener('input', function () {
      const v = FS[Math.max(1, Math.min(5, Number(fsRange.value))) - 1];
      set('fs', v, '글자 크기: ' + FS_LABEL[v]);
    });
    fsRange.setAttribute('aria-labelledby', 'set-l-fs');
    const fsWrap = el('div.set-fs', null, [el('span.set-fs-a', { 'aria-hidden': 'true' }, ['가']), fsRange, el('span.set-fs-a.set-fs-big', { 'aria-hidden': 'true' }, ['가']), fsOut]);
    const fsRow = el('div.set-row', null, [el('div.set-label', { id: 'set-l-fs' }, ['글자 크기']), fsWrap]);

    const motionSw = el('button.set-switch', { type: 'button', role: 'switch', 'aria-checked': 'false' }, [el('span.set-knob', { 'aria-hidden': 'true' }), el('span.set-switch-t', null, ['끔'])]);
    motionSw.addEventListener('click', function () { const on = S.motion !== 'reduce'; set('motion', on ? 'reduce' : 'normal', on ? '움직임을 줄여요' : '움직임을 다시 켰어요'); });

    const reset = el('button.set-reset', { type: 'button' }, ['기본으로 되돌리기']);
    reset.addEventListener('click', function () {
      S = Object.assign({}, DEFAULTS);
      applyAll(); persist(); sync(); A.announce('보기 설정을 기본으로 되돌렸어요');
      window.dispatchEvent(new Event('jhb:layout'));
    });
    const close = el('button.set-x', { type: 'button', 'aria-label': '닫기' }, ['×']);

    const panel = el('div.set-panel', { id: 'set-panel', role: 'dialog', 'aria-labelledby': 'set-title', hidden: true }, [
      el('div.set-head', null, [el('h2.set-title', { id: 'set-title' }, ['보기 설정']), close]),
      row('화면', themeSeg),
      fsRow,
      row('줄 너비', widthSeg),
      row('본문 글꼴', fontSeg),
      el('div.set-row.set-row-switch', null, [el('div.set-label', { id: 'set-l-motion' }, ['움직임 줄이기']), motionSw]),
      el('div.set-foot', null, [reset])
    ]);
    motionSw.setAttribute('aria-labelledby', 'set-l-motion');
    document.body.appendChild(panel);

    function sync() {
      [themeSeg, widthSeg, fontSeg].forEach(function (g) {
        const k = g.getAttribute('data-key');
        Array.prototype.forEach.call(g.querySelectorAll('[role="radio"]'), function (b) {
          const on = b.getAttribute('data-v') === S[k];
          b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
        });
      });
      const lv = FS.indexOf(S.fs) + 1;
      fsRange.value = String(lv);
      fsRange.setAttribute('aria-valuenow', String(lv));
      fsRange.setAttribute('aria-valuetext', FS_LABEL[S.fs]);
      fsOut.textContent = FS_LABEL[S.fs];
      const on = S.motion === 'reduce';
      motionSw.setAttribute('aria-checked', on ? 'true' : 'false');
      motionSw.querySelector('.set-switch-t').textContent = on ? '켬' : '끔';
    }
    sync();
    syncUi = sync;

    /* 열기·닫기 */
    let lastFocus = null;
    function isOpen() { return !panel.hidden; }
    function focusables() {
      return Array.prototype.slice.call(panel.querySelectorAll('button, input, [tabindex]')).filter(function (n) { return !n.disabled && n.tabIndex >= 0 && n.offsetParent !== null; });
    }
    function open() {
      if (isOpen()) return;
      if (A.closePop) A.closePop();
      panel.hidden = false;
      gear.setAttribute('aria-expanded', 'true');
      lastFocus = document.activeElement;
      requestAnimationFrame(function () { panel.classList.add('set-show'); const f = focusables().filter(function (n) { return n !== close; }); (f[0] || close).focus(); });
    }
    function shut(refocus) {
      if (!isOpen()) return;
      panel.classList.remove('set-show');
      panel.hidden = true;
      gear.setAttribute('aria-expanded', 'false');
      if (refocus !== false) gear.focus();
    }
    gear.addEventListener('click', function () { if (isOpen()) shut(); else open(); });
    close.addEventListener('click', function () { shut(); });
    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (panel.contains(e.target) || gear.contains(e.target)) return;
      shut(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); shut(); return; }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }, true);
    window.addEventListener('jhb:page', function () { shut(false); });

    JHB.ui = JHB.ui || {};
    JHB.ui.settings = { get: function () { return Object.assign({}, S); }, set: set, open: open, close: shut };
  }

  if (window.JHB && JHB.app) ready();
  else document.addEventListener('DOMContentLoaded', ready);
})();

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/polish.js ===== */
(function () { try {
/* 조현병 백과 · 화면 전환과 상태 표시 (polish)
   - 페이지 사이 짧은 크로스페이드(브라우저가 같은 사이트 뷰 전환을 지원할 때만, css/ui/polish.css 의 @view-transition)
   - 문서를 불러오는 동안 글 모양 자리표시(skeleton)
   - 토스트: JHB.ui.toast(text, {kind}) — 저장·주소 복사 때 자동으로 띄움
   - 분류 색 길찾기: 상단 줄과 빵부스러기 색 막대를 현재 분류 색으로
   - 새 창으로 열리는 링크에 ↗ 표시(.pol-ext)
   - 넓은 화면의 "목차 건너뛰기"(왼쪽 분류 목차 바로 앞, Tab 으로 닿을 때만 보임 → 본문으로)
   움직임: 운영체제 설정뿐 아니라 앱 설정의 "움직임 줄이기"(<html data-motion="reduce">, 머리 스크립트와 보기 설정 모듈이 맞춰 줌)도 따라
   페이지 사이 화면 전환을 건너뛴다(pageswap·pagereveal 에서 skipTransition, css/ui/polish.css 의 같은 조건).
   공개: JHB.ui.toast, JHB.ui.polish = { toast, setSection, reduced }. node: module.exports = { motionReduced } */
(function () {
  /* 움직임을 줄일지: html 의 data-motion 이 reduce 이거나 운영체제 설정(mq)이 줄이기면 true.
     저장값(jhb.ui.settings)은 보지 않아요 — 머리 스크립트가 첫 그리기 전에 저장값을 속성으로 옮기고, 그 뒤로는 보기 설정 모듈이
     속성을 늘 맞춰 줘요. 저장값을 보면 저장이 실패한 채 '보통'으로 되돌렸을 때 전환이 꺼진 채 남아요 */
  function motionReduced(o) {
    o = o || {};
    return o.attr === 'reduce' || !!o.mq;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { motionReduced: motionReduced }; return; }
  if (!window.JHB || !JHB.app) return;
  const A = JHB.app, el = A.el, U = JHB.util;
  JHB.ui = JHB.ui || {};
  const root = document.documentElement;
  const LOADING = '문서를 불러오고 있어요.';

  /* ---------- 1. 뷰 전환 ----------
     실제 전환은 CSS(@view-transition { navigation: auto })가 맡는다. 지원 여부와 움직임 설정을 html 의 pol-vt 로 적어 두고,
     움직임을 줄이면 떠나는 페이지(pageswap)와 들어오는 페이지(pagereveal) 양쪽에서 전환을 건너뛴다. */
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reducedNow() {
    return motionReduced({ attr: root.getAttribute('data-motion'), mq: mq.matches || !!(A.reducedMotion && A.reducedMotion()) });
  }
  function markVT() {
    const ok = typeof document.startViewTransition === 'function' && !reducedNow();
    root.classList.toggle('pol-vt', ok);
  }
  markVT();
  if (mq.addEventListener) mq.addEventListener('change', markVT);
  /* 보기 설정에서 움직임 줄이기를 켜고 끄면(data-motion 이 바뀜) 바로 반영 */
  new MutationObserver(markVT).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  /* 전환이 건너뛰어질 때(새로고침, 상대 페이지가 옵트인하지 않음, 움직임 줄이기 등) 약속이 거부되며 콘솔에 오류로 남지 않게 받아 둔다 */
  function onVT(e) {
    const vt = e && e.viewTransition;
    if (!vt) return;
    ['finished', 'ready', 'updateCallbackDone'].forEach(function (k) { if (vt[k] && vt[k].catch) vt[k].catch(function () { }); });
    if (reducedNow() && typeof vt.skipTransition === 'function') { try { vt.skipTransition(); } catch (err) { } }
  }
  window.addEventListener('pagereveal', onVT);
  window.addEventListener('pageswap', onVT);

  /* ---------- 2. 자리표시 ---------- */
  function isLoadingP(n) {
    return n && n.nodeType === 1 && n.matches('p.empty') && n.textContent.trim() === LOADING && !n.classList.contains('pol-skel-text');
  }
  function skeleton() {
    function lines(n, cls) {
      const out = [];
      for (let i = 0; i < n; i++) out.push(el('span.pol-skel-line', { class: cls || '' }));
      return out;
    }
    return el('div.pol-skel', { 'aria-hidden': 'true' }, [
      el('span.pol-skel-line.pol-skel-crumb'),
      el('span.pol-skel-line.pol-skel-title'),
      el('div.pol-skel-group', null, lines(2, 'pol-skel-sum')),
      el('div.pol-skel-group.pol-skel-body', null, lines(6, 'pol-skel-p'))
    ]);
  }
  function placeSkeleton(p) {
    if (p.classList.contains('pol-skel-text')) return;
    p.classList.add('pol-skel-text');
    p.parentNode.insertBefore(skeleton(), p.nextSibling);
  }
  function removeSkeleton() {
    U.qsa('.pol-skel', A.main).forEach(function (n) { n.remove(); });
    U.qsa('p.pol-skel-text', A.main).forEach(function (n) { n.classList.remove('pol-skel-text'); });
  }
  U.qsa('#app > p.empty').forEach(function (p) { if (isLoadingP(p)) placeSkeleton(p); });
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (isLoadingP(n) && n.parentNode === A.main) placeSkeleton(n);
      });
    });
  }).observe(A.main, { childList: true });
  window.addEventListener('jhb:article', removeSkeleton);

  /* ---------- 3. 토스트 ---------- */
  let toastEl = null, toastTimer = null;
  function toast(text, opts) {
    opts = opts || {};
    if (!toastEl) {
      toastEl = el('div.pol-toast', { role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastEl);
    }
    clearTimeout(toastTimer);
    toastEl.className = 'pol-toast' + (opts.kind ? ' pol-toast-' + opts.kind : '');
    /* 같은 문구가 이어져도 다시 읽히도록 비운 뒤 채운다 */
    toastEl.textContent = '';
    toastEl.textContent = String(text || '');
    /* 다음 프레임에 show 를 붙여 교체될 때도 살짝 다시 뜨게 */
    toastEl.classList.remove('pol-toast-show');
    void toastEl.offsetWidth;
    toastEl.classList.add('pol-toast-show');
    toastTimer = setTimeout(function () { toastEl.classList.remove('pol-toast-show'); }, opts.duration || 2500);
    return toastEl;
  }
  JHB.ui.toast = toast;

  /* 저장 버튼: 앱의 클릭 처리기(버튼 자신)가 먼저 돌고 난 뒤 document 에서 결과를 읽는다 */
  document.addEventListener('click', function (e) {
    const b = e.target && e.target.closest ? e.target.closest('.js-fav, .mb-fav') : null;
    if (!b) return;
    const on = b.getAttribute('aria-pressed') === 'true';
    toast(on ? '저장했어요' : '저장을 해제했어요', { kind: on ? 'ok' : '' });
  });
  /* 공유 버튼: 글자가 "주소 복사됨"으로 바뀌는 순간 */
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      const t = m.target.nodeType === 3 ? m.target.parentNode : m.target;
      const b = t && t.closest ? t.closest('button.btn') : null;
      if (!b || b.classList.contains('js-fav')) return;
      if (b.textContent.trim() === '주소 복사됨' && !b.hasAttribute('data-pol-toasted')) {
        b.setAttribute('data-pol-toasted', '');
        toast('주소를 복사했어요', { kind: 'ok' });
      }
    });
  }).observe(A.main, { childList: true, subtree: true, characterData: true });

  /* ---------- 4. 분류 색 길찾기 ---------- */
  function sectionOf(detail) {
    const kind = detail.kind, id = detail.id;
    if (kind === 'a' && id && A.bySlug[id]) return A.secById[A.bySlug[id].section] || null;
    if (kind === 's' && id) return A.secById[id] || null;
    if (kind === 'glossary') return A.sections.filter(function (s) { return s.glossary; })[0] || null;
    return null;
  }
  function setSection(sec) {
    if (sec && sec.hue != null) {
      root.style.setProperty('--pol-sec', 'hsl(' + sec.hue + ' var(--spine-s) var(--spine-l))');
      root.classList.add('pol-has-sec');
    } else {
      root.style.removeProperty('--pol-sec');
      root.classList.remove('pol-has-sec');
    }
    /* 빵부스러기의 분류 링크 앞 색 막대 */
    U.qsa('.crumb .pol-crumb-spine', A.main).forEach(function (n) { n.remove(); });
    if (!sec) return;
    const want = A.L(sec.glossary ? '#/glossary' : '#/s/' + sec.id);
    const bar = function () { return el('span.pol-crumb-spine', { style: '--h:' + sec.hue, 'aria-hidden': 'true' }); };
    let done = false;
    U.qsa('.crumb a', A.main).forEach(function (a) {
      if (a.getAttribute('href') !== want) return;
      a.classList.add('pol-crumb-sec');
      a.insertBefore(bar(), a.firstChild);
      done = true;
    });
    /* 분류·용어 사전 화면은 빵부스러기 끝이 링크가 아닌 글자("분류", "용어 사전")라 그 앞에 둔다 */
    const crumb = A.main.querySelector('.crumb');
    if (!done && crumb && crumb.lastChild) crumb.insertBefore(bar(), crumb.lastChild);
  }
  function onPage(detail) { setSection(sectionOf(detail)); }
  window.addEventListener('jhb:page', function (e) { onPage(e.detail || {}); });
  (function () { const w = A.where(); onPage({ kind: w.path[0] || 'home', id: w.path[1] || null }); })();

  /* ---------- 5. 새 창 링크 표시 ---------- */
  function markExt(rootNode) {
    if (!rootNode || rootNode.nodeType !== 1) return;
    if (rootNode.matches('a[target="_blank"]')) rootNode.classList.add('pol-ext');
    U.qsa('a[target="_blank"]:not(.pol-ext)', rootNode).forEach(function (a) { a.classList.add('pol-ext'); });
  }
  markExt(document.body);
  new MutationObserver(function (muts) {
    muts.forEach(function (m) { m.addedNodes.forEach(markExt); });
  }).observe(document.body, { childList: true, subtree: true });

  /* ---------- 6. 목차 건너뛰기 ----------
     넓은 화면(1081px 이상)에서는 왼쪽 분류 목차의 링크(분류·글·차례)가 모두 Tab 순서에 있어 본문까지 60번 넘게 눌러야 해요.
     목차 바로 앞(상단 도구 다음)에 Tab 으로 닿을 때만 보이는 "목차 건너뛰기"를 둬요. 누르면 본문(#app)으로 포커스가 가요.
     목차(#sidenav)는 앱이 화면마다 다시 그리니(innerHTML) 그 밖, 틀(.shell) 안 목차 앞에 둬요.
     공용 .sr(style.css, absolute)을 함께 달아 css/ui/zz-a11y.css 가 없어도 칸 배치(.shell 의 grid)에 끼지 않고 보이지 않아요.
     포커스를 받으면 zz-a11y.css 가 화면 왼쪽 위에 보여 줘요. 좁은 화면은 목차가 서랍(닫히면 inert)이라 숨겨요. */
  const side = document.getElementById('sidenav');
  if (side && side.parentNode && !document.querySelector('.a11y-skipnav')) {
    const skip = el('a.sr.a11y-skipnav', { href: '#app' }, ['목차 건너뛰기']);
    skip.addEventListener('click', function (e) {
      e.preventDefault();
      try { A.main.focus({ preventScroll: true }); } catch (err) { A.main.focus(); }
      const r = A.main.getBoundingClientRect();
      if (r.top < 0 || r.top > innerHeight) A.main.scrollIntoView({ block: 'start' });
    });
    side.parentNode.insertBefore(skip, side);
  }

  JHB.ui.polish = { toast: toast, setSection: setSection, reduced: reducedNow };
})();

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/home.js ===== */
(function () { try {
/* 조현병 백과 · 쓰는 사람에 맞춰 바뀌는 첫 화면 (home)
   - 역할 자리(첫 화면 머리 안, 책꽂이 위): 네 갈래 당사자·가족·주변 사람(친구·동료·교사)·궁금해서
     · 처음 온 사람: "어디서 시작할까요?" 카드 4장. 누르면 jhb.ui.home.role 에 저장하고 그 갈래의 시작점으로
     · 역할을 고른 사람: "지금: 가족으로 보고 있어요 · 바꾸기" 한 줄(누르면 카드 4장이 펴짐, 역할 지우기)
     · 역할 없이 글을 읽은 사람: "어디서 시작할까요? · 고르기" 접힌 한 줄
     · 기록 쉼(privacy.paused)이면 고른 역할은 이 탭(sessionStorage)에만 기억한다
   - 차분한 두 입구(책꽂이 아래): "지금 힘들다면 → 지금 도움"(지금 도움 시트, 없으면 위기 상담 전화 글)과
     "회복은 가능해요 → 회복 이야기". 같은 높이·같은 무게, 빨간색·경고 아이콘 없음. 위기 입구는 이 한 줄뿐.
     인쇄에서는 두 입구 대신 위기 고지(109·1577-0199·119) 한 줄을 찍는다
   - 살펴보기: JHB.app.pages 가운데 nav 에 "home" 이 있는 화면을 카드로(없으면 만들지 않음)
   - 다시 온 사람: 이어서 읽기·읽기 코스를 위로, 역할에 맞는 코스를 앞에(보이지 않던 코스도 데려옴),
     최근 읽은 문서는 분류 바로 위로(위기·응급 글은 코어가 첫 화면 최근 목록에 넣지 않음).
     "기록 가리기"(jhb.ui.home.recentHidden)를 켜면 최근 목록·이어서 읽기·코스 진행·역할 이름을 함께 가린다.
     기록 쉼이면 "기록을 남기지 않는 중이에요" 한 줄
   - 새로 올라온 글: 가장 최근 updated 날짜의 글(최대 6편, 위기·응급 글 빼고). 모두 같은 날이면 만들지 않는다
   - 홈 화면에 추가 안내: beforeinstallprompt / iOS Safari 안내. 닫으면 30일 숨김(jhb.ui.home.installHidden)
   node 에서는 순수 함수만 내보낸다(tests/home.test.cjs).
   공개: JHB.ui.home = { role(), setRole(r) → {role, ok, tab}, refresh(), roles, roleName(r) } */
(function (root) {
  const ROLES = ['self', 'family', 'near', 'curious'];
  const ROLE_TEXT = {
    self: { t: '당사자예요', d: '진단을 받았어요. 차근차근 알아봐요.', name: '당사자', as: '당사자로' },
    family: { t: '가족이에요', d: '가족이 아파요. 무엇을 알고 어떻게 도울지.', name: '가족', as: '가족으로' },
    near: { t: '주변 사람이에요', d: '친구·동료·교사로서 곁에서 할 수 있는 것.', name: '주변 사람', as: '주변 사람으로' },
    curious: { t: '궁금해서 왔어요', d: '조현병이 어떤 병인지 정확히 알고 싶어요.', name: '궁금해서 온 사람', as: '궁금해서 온 사람으로' }
  };
  /* 진단 전인데 증상이 걱정되는 사람에게 따로 건네는 글(당사자 카드는 진단받은 사람의 코스로 가서) */
  const BEFORE_DX = ['diagnostic-process', 'faq-early-signs'];
  /* 역할별로 첫 화면 코스 카드 앞에 둘 코스(있는 것만 씀) */
  const ROLE_COURSES = {
    self: ['first-diagnosis', 'starting-medication', 'living-with-positive', 'negative-symptoms'],
    family: ['family-first', 'preventing-relapse', 'system-support'],
    near: ['near-first', 'negative-symptoms', 'family-first'],
    curious: ['research-curious']
  };
  const RECOVERY = ['recovery', 'faq-recovery-real', 'recovery-commonalities'];
  const own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function normRole(v) { return (typeof v === 'string' && ROLES.indexOf(v) >= 0) ? v : null; }
  function roleName(r) { return normRole(r) ? ROLE_TEXT[r].name : ''; }
  function roleAs(r) { return normRole(r) ? ROLE_TEXT[r].as : ''; }
  /* 그 갈래의 시작점: 코스가 있으면 코스. has = { course(id), article(slug) } */
  function roleDest(r, has) {
    const c = function (id) { return has && has.course && has.course(id); };
    const a = function (s) { return has && has.article && has.article(s); };
    switch (normRole(r)) {
      case 'self': return c('first-diagnosis') ? '#/course/first-diagnosis' : '#/courses';
      case 'family': return c('family-first') ? '#/course/family-first' : '#/courses';
      case 'near': return c('near-first') ? '#/course/near-first' : (a('for-friends') ? '#/a/for-friends' : '#/s/10');
      case 'curious': return a('what-is-schizophrenia') ? '#/a/what-is-schizophrenia' : '#/s/1';
      default: return null;
    }
  }
  function beforeDxSlug(hasArticle) {
    for (let i = 0; i < BEFORE_DX.length; i++) if (hasArticle(BEFORE_DX[i])) return BEFORE_DX[i];
    return null;
  }
  /* 'first' 처음 온 사람(카드 4장) · 'chosen' 역할을 고름(한 줄) · 'collapsed' 역할 없이 읽은 기록이 있음(접힌 한 줄) */
  function startState(o) {
    o = o || {};
    if (normRole(o.role)) return 'chosen';
    return (Number(o.readCount) > 0 || Number(o.recentCount) > 0) ? 'collapsed' : 'first';
  }
  function roleCourses(r) { return normRole(r) ? ROLE_COURSES[r].slice() : []; }
  /* 첫 화면에 보일 코스 카드 순서. 역할 코스(있는 것만)를 앞에, 나머지는 원래 보이던 순서. 개수는 원래 보이던 만큼 */
  function planCourses(allIds, shownIds, want) {
    const all = allIds || [], shown = shownIds || [];
    const max = shown.length, out = [];
    (want || []).concat(shown).forEach(function (id) {
      if (out.length < max && all.indexOf(id) >= 0 && out.indexOf(id) < 0) out.push(id);
    });
    return out;
  }
  function courseIdOf(href) {
    const m = /course\/([a-z0-9-]+)\/?(?:[?#].*)?$/.exec(String(href || ''));
    return m ? m[1] : '';
  }
  function hasTag(a, t) { return !!a && Array.isArray(a.tags) && a.tags.indexOf(t) >= 0; }
  /* 위기·응급 글: 맥락 없이 첫 화면에 제목이 뜨지 않게 하는 기준(오늘의 문서와 같음) */
  function isSensitive(a) { return hasTag(a, '위기') || hasTag(a, '응급'); }
  /* 왼쪽 단추로 그냥 누른 것만(새 탭·새 창으로 열기는 아님) */
  function isPlainClick(e) {
    return !!e && !e.defaultPrevented && (e.button == null || e.button === 0) && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
  }
  /* 새로 올라온 글: 가장 최근 날짜의 글. 위기·응급 글은 맥락 없이 첫 화면에 뜨지 않게 뺀다(오늘의 문서와 같은 기준) */
  function pickNew(articles, max) {
    const list = Array.isArray(articles) ? articles : [];
    const dates = {};
    list.forEach(function (a) { if (a && a.updated) dates[String(a.updated).slice(0, 10)] = 1; });
    const keys = Object.keys(dates).sort().reverse();
    if (keys.length < 2) return null;
    const latest = keys[0];
    const picked = list.filter(function (a) {
      return a && String(a.updated || '').slice(0, 10) === latest && !isSensitive(a);
    }).sort(function (a, b) { return Number(a.section) - Number(b.section) || (a.order || 999) - (b.order || 999); })
      .slice(0, max || 6);
    return picked.length ? { date: latest, list: picked } : null;
  }
  /* 살펴보기: nav 에 "home" 이 있는 특집 화면(선언 순서 그대로). name = label·title, text = lead·summary */
  function homePages(pages) {
    return (Array.isArray(pages) ? pages : []).filter(function (p) {
      return p && typeof p.id === 'string' && Array.isArray(p.nav) && p.nav.indexOf('home') >= 0;
    }).map(function (p) {
      return { id: p.id, name: p.label || p.title || p.id, text: p.lead || p.summary || '' };
    });
  }
  function recoverySlug(hasArticle) {
    for (let i = 0; i < RECOVERY.length; i++) if (hasArticle(RECOVERY[i])) return RECOVERY[i];
    return null;
  }
  function installHiddenAt(t, now, days) {
    const n = Number(t) || 0;
    return !!n && (now - n) < days * 86400000;
  }

  const core = {
    ROLES: ROLES.slice(), ROLE_TEXT: ROLE_TEXT, normRole: normRole, roleName: roleName, roleAs: roleAs, roleDest: roleDest,
    beforeDxSlug: beforeDxSlug, startState: startState, roleCourses: roleCourses, planCourses: planCourses, courseIdOf: courseIdOf,
    isSensitive: isSensitive, isPlainClick: isPlainClick,
    pickNew: pickNew, homePages: homePages, recoverySlug: recoverySlug, installHiddenAt: installHiddenAt
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }
  if (!root.JHB || !root.JHB.app) return;

  /* ================= 브라우저 ================= */
  const JHB = root.JHB, A = JHB.app, el = A.el, U = JHB.util, store = A.store;
  JHB.ui = JHB.ui || {};
  const K_ROLE = 'jhb.ui.home.role', K_HIDE = 'jhb.ui.home.installHidden', K_RECENT_HIDE = 'jhb.ui.home.recentHidden';
  const HIDE_DAYS = 30;
  const courseById = {}; (A.courses || []).forEach(function (c) { if (c && c.id) courseById[c.id] = c; });
  const has = {
    course: function (id) { return own(courseById, id); },
    article: function (slug) { return !!(A.bySlug && own(A.bySlug, slug)); }
  };

  /* 기록 종류 등록: 기록 쉼 중에 고른 역할은 sessionStorage 의 같은 이름 키에 둔다. 역할 종류의 session 에 더해 함께 지워지게.
     (가린 최근 목록 상태 jhb.ui.home.recentHidden 은 코어의 보기 설정(settings) 기본 키라 따로 등록하지 않아요) */
  (function registerKeys() {
    const P = A.privacy;
    if (!P || typeof P.register !== 'function') return;
    const r = (P.kinds || []).filter(function (k) { return k.id === 'role'; })[0];
    if (r) { if (r.session.indexOf(K_ROLE) < 0) P.register({ id: r.id, label: r.label, keys: r.keys, session: r.session.concat([K_ROLE]) }); }
    else P.register({ id: 'role', label: '역할', keys: [K_ROLE], session: [K_ROLE] });
  })();

  function paused() { return !!(A.privacy && A.privacy.paused && A.privacy.paused()); }
  function ssGet(k) { try { const v = sessionStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function ssRemove(k) { try { sessionStorage.removeItem(k); } catch (e) { } }
  /* 기록 쉼 중에 이 탭에서 고른 역할(쉼이 아니면 쓰지 않음) */
  function tabRole() { return paused() ? normRole(ssGet(K_ROLE)) : null; }
  function role() { return tabRole() || normRole(store.get(K_ROLE, null)); }
  /* 역할 저장. 기록 쉼이면 이 기기(localStorage)에 남기지 않고 이 탭에만. 알 수 없는 값·null 이면 둘 다 지운다.
     돌려주는 값: { role, ok(실제로 그렇게 됐는지), tab(이 탭에만 기억했는지) } */
  function setRole(r) {
    const v = normRole(r);
    if (!v) { store.remove(K_ROLE); ssRemove(K_ROLE); return { role: null, ok: role() === null, tab: false }; }
    if (paused()) { const ok = ssSet(K_ROLE, v) && role() === v; return { role: v, ok: ok, tab: true }; }
    ssRemove(K_ROLE);
    const ok = store.set(K_ROLE, v) !== false && role() === v;
    return { role: v, ok: ok, tab: false };
  }
  function readCount() { return A.progress ? A.progress.count() : 0; }
  function recentCount() { const r = store.get('jhb.recent', []); return Array.isArray(r) ? r.length : 0; }
  function sectionOfCourse(c) {
    const first = c && c.steps && c.steps[0] && A.bySlug[c.steps[0].slug];
    return first ? A.secById[first.section] : null;
  }
  function hue(sec) { return (sec && sec.hue != null) ? sec.hue : 250; }
  function secOf(h) {
    let m = /^#\/a\/([^?]+)/.exec(h);
    if (m) { const a = A.bySlug[m[1]]; return a ? A.secById[a.section] : null; }
    m = /^#\/course\/([^?]+)/.exec(h);
    if (m) return sectionOfCourse(courseById[m[1]]);
    m = /^#\/s\/([^?/]+)/.exec(h);
    return m ? A.secById[m[1]] : null;
  }
  function sec(portal, name) { return portal.querySelector('section[data-sec="' + name + '"]'); }
  function currentPortal() {
    const w = A.where();
    if (w.path.length) return null;
    return A.main.querySelector('.portal');
  }
  function toast(t) { if (JHB.ui.toast) JHB.ui.toast(t); else A.announce(t); }
  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else setTimeout(fn, 0);
  }

  /* 읽은 기록 가리기(최근 목록의 "기록 가리기"). 켜져 있으면 역할 이름도 줄에 쓰지 않는다 */
  let veilOn = false;

  /* ---------- 역할 자리 ---------- */
  let roleBox = null;
  function roleCard(r, cur) {
    const it = ROLE_TEXT[r], dest = roleDest(r, has);
    const a = el('a.hm-card', { href: A.L(dest), style: '--h:' + hue(secOf(dest)), 'data-role': r, 'aria-current': cur === r ? 'true' : null }, [
      el('span.hm-card-t', null, [it.t, cur === r ? el('span.hm-card-now', null, ['지금']) : null]),
      el('span.hm-card-d', null, [it.d]),
      el('span.hm-card-go', { 'aria-hidden': 'true' }, ['→'])
    ]);
    a.addEventListener('click', function (e) {
      /* 새 탭으로 살짝 열어 보는 것은 역할을 고른 것이 아니다 */
      if (!isPlainClick(e)) return;
      const res = setRole(r);
      if (!res.ok) toast('역할을 이 기기에 저장하지 못했어요. 이번에만 이 갈래로 안내해요.');
    });
    return a;
  }
  function beforeDxLine() {
    const s = beforeDxSlug(has.article);
    if (!s) return null;
    return el('p.hm-role-alt', null, [
      '아직 진단 전인데 증상이 걱정되면 ',
      el('a', { href: A.L('#/a/' + s) }, [s === 'diagnostic-process' ? '진단 과정과 검사' : A.bySlug[s].title]),
      '부터 봐요.'
    ]);
  }
  function buildRole() {
    const cur = role(), onTab = !!(cur && tabRole() === cur);
    const st = startState({ role: cur, readCount: readCount(), recentCount: recentCount() });
    const cards = el('div.hm-cards', null, ROLES.map(function (r) { return roleCard(r, cur); }));
    const note = el('p.hm-role-note', null, [paused()
      ? '기록을 남기지 않는 중이라 고른 역할은 이 탭에서만 기억해요.'
      : '고른 역할은 이 기기에만 저장돼요.']);
    if (cur) {
      const clear = el('button.hm-role-clear', { type: 'button' }, ['역할 지우기']);
      clear.addEventListener('click', function () {
        const res = setRole(null);
        redrawRole(true);
        const portal = currentPortal();
        if (portal) arrangeCourses(sec(portal, 'courses'));
        toast(res.ok ? '역할을 지웠어요' : '역할을 지우지 못했어요. 이 기기의 저장 공간을 쓸 수 없어요.');
      });
      note.appendChild(clear);
    }
    const alt = beforeDxLine();
    if (st === 'first') {
      return el('section.hm-role', { 'data-sec': 'start', 'data-state': st, 'aria-labelledby': 'hm-start-h' }, [
        el('h2.hm-role-h', { id: 'hm-start-h', tabindex: '-1' }, ['어디서 시작할까요?']),
        cards, alt, note
      ]);
    }
    const panel = el('div.hm-role-panel', { id: 'hm-role-panel', hidden: true }, [cards, alt, note]);
    const btn = el('button.hm-role-btn', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'hm-role-panel' }, [cur ? '바꾸기' : '고르기']);
    if (cur) btn.setAttribute('aria-label', '역할 바꾸기');
    let text;
    if (cur && veilOn) text = el('p.hm-role-now', { id: 'hm-start-h' }, ['역할을 골라 두었어요']);
    else if (cur) {
      text = el('p.hm-role-now', { id: 'hm-start-h' }, [
        '지금: ', el('b', null, [roleName(cur)]), roleAs(cur).slice(roleName(cur).length) + ' 보고 있어요',
        onTab ? el('span.hm-role-tab', null, [' · 이 탭에서만']) : null
      ]);
    } else {
      text = el('div.hm-role-text', null, [
        el('h2.hm-role-h.hm-role-h-s', { id: 'hm-start-h' }, ['어디서 시작할까요?']),
        el('p.hm-role-sub', null, ['고르면 맞는 코스를 앞에 보여 줘요.'])
      ]);
    }
    const box = el('section.hm-role', { 'data-sec': 'start', 'data-state': st, 'aria-labelledby': 'hm-start-h' }, [
      el('div.hm-role-line', null, [text, btn]),
      panel
    ]);
    function setOpen(open) {
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      box.classList.toggle('hm-open', open);
    }
    btn.addEventListener('click', function () { setOpen(panel.hidden); });
    /* 버튼에 포커스가 있어도, 패널 안에 있어도 Esc 로 닫는다 */
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { e.stopPropagation(); setOpen(false); btn.focus(); }
    });
    return box;
  }
  /* 다시 그리기. focus 면 새 자리의 버튼(없으면 제목)으로 포커스를 옮긴다(지운 버튼이 사라지므로) */
  function redrawRole(focus) {
    if (!roleBox || !roleBox.parentNode) return;
    const n = buildRole();
    roleBox.parentNode.replaceChild(n, roleBox);
    roleBox = n;
    if (focus) {
      const t = n.querySelector('.hm-role-btn') || n.querySelector('#hm-start-h');
      if (t) t.focus();
    }
  }

  /* ---------- 차분한 두 입구 ---------- */
  function onHelp(e) {
    if (!isPlainClick(e)) return;
    const nh = JHB.ui.nowhelp;
    /* 시트가 열렸을 때만 링크 이동을 막는다(번호 자료가 없어 열리지 않으면 링크대로) */
    if (nh && typeof nh.open === 'function') { if (nh.open(e.currentTarget) !== false) e.preventDefault(); return; }
    const hb = document.getElementById('btn-help');
    if (hb && hb !== e.currentTarget) { e.preventDefault(); hb.click(); }
    /* 둘 다 없으면 링크대로 위기 상담 전화 글로 간다 */
  }
  function door(kind, href, k, go) {
    return el('a.hm-door', { href: href, 'data-door': kind }, [
      el('span.hm-door-k', null, [k]),
      el('span.hm-door-go', null, [go, el('span.hm-door-ar', { 'aria-hidden': 'true' }, ['→'])])
    ]);
  }
  function buildDoors() {
    const hb = document.getElementById('btn-help');
    const helpHref = (hb && hb.getAttribute('href')) || A.L('#/a/crisis-hotlines');
    const help = door('help', helpHref, '지금 힘들다면', '지금 도움');
    help.addEventListener('click', onHelp);
    /* 지금 도움 시트(nowhelp.js)는 이 모듈 뒤에 실려서, 모든 모듈 스크립트가 끝난 뒤 확인한다 */
    whenReady(function () { if (JHB.ui.nowhelp && typeof JHB.ui.nowhelp.open === 'function') help.setAttribute('aria-haspopup', 'dialog'); });
    const items = [help];
    const rec = recoverySlug(has.article);
    if (rec) items.push(door('recovery', A.L('#/a/' + rec), '회복은 가능해요', '회복 이야기'));
    /* 종이에서는 링크를 누를 수 없어서, 인쇄에만 번호가 든 위기 고지를 싣는다(화면에서는 display:none) */
    const crisis = A.notice ? A.notice('crisis') : null;
    return el('div.hm-doors', { 'data-sec': 'doors' }, [
      el('ul.hm-doors-list', { 'aria-label': '힘들 때와 회복' }, items.map(function (a) { return el('li', null, [a]); })),
      crisis ? el('div.hm-doors-print', null, [crisis]) : null
    ]);
  }

  /* ---------- 살펴보기 ---------- */
  function buildExplore() {
    const list = homePages(A.pages);
    if (!list.length) return null;
    return el('section.hm-explore', { 'data-sec': 'explore', 'aria-labelledby': 'hm-explore-h' }, [
      el('h2.h-sec', { id: 'hm-explore-h' }, ['살펴보기']),
      el('ul.hm-xp-list', null, list.map(function (p) {
        return el('li', null, [el('a.hm-xp', { href: A.L('#/' + p.id) }, [
          el('span.hm-xp-t', null, [p.name]),
          p.text ? el('span.hm-xp-d', null, [p.text]) : null
        ])]);
      }))
    ]);
  }

  /* ---------- 다시 온 사람: 재배치 ---------- */
  /* 첫 4장 밖에 있던 역할 코스를 데려올 때의 카드: 코어 JHB.app.courseCard(첫 화면·코스 목록과 같은 마크업·문구).
     코어에 없을 때(옛 판)만 같은 모양을 여기서 만든다 */
  function courseCard(c) {
    if (!c) return null;
    if (typeof A.courseCard === 'function') return A.courseCard(c);
    const p = (A.progress && A.progress.courseProgress) ? A.progress.courseProgress(c) : { read: 0, total: (c.steps || []).length, pct: 0 };
    return el('a.course', { href: A.L('#/course/' + c.id) }, [
      el('div.who', null, [c.who ? c.who + '에게' : '']),
      el('h3', null, [c.title]),
      el('p', null, [c.intro]),
      el('div', null, [
        el('div.bar', { role: 'progressbar', 'aria-valuenow': p.pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, [el('i', { style: 'width:' + p.pct + '%' })]),
        el('div.bar-label', null, [el('span', null, [p.read ? p.read + ' / ' + p.total + ' 읽음' : '문서 ' + p.total + '개']), el('span', null, [p.pct ? p.pct + '%' : ''])])
      ])
    ]);
  }
  /* 코어가 그린 코스 카드(처음 순서)를 기억해 두고, 역할이 바뀔 때마다 처음 순서에서 다시 고른다 */
  const origCourses = (typeof WeakMap === 'function') ? new WeakMap() : null;
  function arrangeCourses(courses) {
    const grid = courses && courses.querySelector('.courses');
    if (!grid || !origCourses) return;
    if (!origCourses.has(grid)) origCourses.set(grid, U.qsa('.course', grid));
    const orig = origCourses.get(grid);
    /* 처음 순서로 되돌리기(데려온 카드는 빼고) */
    U.qsa('.course', grid).forEach(function (c) { if (orig.indexOf(c) < 0) c.remove(); });
    orig.forEach(function (c) { grid.appendChild(c); });
    const want = roleCourses(role());
    if (!want.length) return;
    const byId = {}, shown = [];
    orig.forEach(function (c) { const id = courseIdOf(c.getAttribute('href')); if (id && !byId[id]) { byId[id] = c; shown.push(id); } });
    const plan = planCourses(Object.keys(courseById), shown, want);
    if (!plan.length) return;
    orig.forEach(function (c) { if (plan.indexOf(courseIdOf(c.getAttribute('href'))) < 0) c.remove(); });
    plan.forEach(function (id) { const n = byId[id] || courseCard(courseById[id]); if (n) grid.appendChild(n); });
  }
  function rearrange(portal) {
    const today = sec(portal, 'today'), cont = sec(portal, 'continue'), courses = sec(portal, 'courses'), recent = sec(portal, 'recent'), index = sec(portal, 'index');
    if (today) {
      if (cont) portal.insertBefore(cont, today);
      if (courses) portal.insertBefore(courses, today);
    }
    if (recent && index) portal.insertBefore(recent, index);
    arrangeCourses(courses);
  }

  /* ---------- 최근에 읽은 문서: 기록 가리기, 기록 쉼 안내 ---------- */
  function pausedLine() {
    const me = A.pageById && A.pageById.me;
    return el('p.hm-paused', null, [
      '기록을 남기지 않는 중이에요. 새로 읽은 글은 여기에 남지 않아요.',
      me ? ' ' : null,
      me ? el('a', { href: A.L('#/me') }, ['기록 설정']) : null
    ]);
  }
  /* 최근 기록이 없을 때의 쉼 안내 자리는 늘 "새로 올라온 글"(없으면 분류) 바로 앞 */
  function drawPaused(portal) {
    U.qsa('.hm-paused, .hm-paused-box', portal).forEach(function (n) { n.remove(); });
    if (!paused()) return;
    const recent = sec(portal, 'recent'), hd = recent && (recent.querySelector('.hm-recent-head') || recent.querySelector('.h-sec'));
    if (hd) { hd.parentNode.insertBefore(pausedLine(), hd.nextSibling); return; }
    const box = el('div.hm-paused-box', { 'data-sec': 'paused' }, [pausedLine()]);
    const at = portal.querySelector('[data-sec="new"]') || sec(portal, 'index');
    if (at) portal.insertBefore(box, at); else portal.appendChild(box);
  }
  /* 기록 가리기 적용 함수(최근 묶음이 있을 때만). jhb:privacy 로 보기 설정을 지우면 다시 부른다 */
  let applyVeil = null;
  function setVeil(portal, on) {
    const was = veilOn;
    veilOn = !!on;
    portal.classList.toggle('hm-veil', veilOn);
    if (was !== veilOn) redrawRole(false);
  }
  function enhanceRecent(portal) {
    applyVeil = null;
    const recent = sec(portal, 'recent');
    const h = recent && recent.querySelector('.h-sec'), list = recent && recent.querySelector('ul.rows');
    if (!h || !list) return;
    list.id = 'hm-recent-list';
    /* 위기·응급 글은 코어가 첫 화면 최근 목록에 아예 넣지 않아요(js/progress.js 의 visibleRecent) */
    /* 버튼은 제목(h2) 밖에: 제목 이름이 "최근에 읽은 문서"로 남게 */
    const head = el('div.hm-recent-head');
    h.parentNode.insertBefore(head, h);
    head.appendChild(h);
    const btn = el('button.hm-recent-btn', { type: 'button', 'aria-controls': list.id });
    head.appendChild(btn);
    const hiddenNote = el('p.hm-recent-hidden', null, ['읽은 기록을 가려 두었어요. 최근 목록, 이어서 읽기, 코스 진행, 고른 역할이 보이지 않아요. "기록 보이기"를 누르면 다시 보여요.']);
    /* 이어서 읽기 묶음에도 가렸다는 한 줄(가릴 때만 보임) */
    const cont = sec(portal, 'continue');
    if (cont && !cont.querySelector('.hm-veil-note')) {
      const ch = cont.querySelector('.h-sec');
      const vn = el('p.hm-veil-note', null, ['읽던 글을 가려 두었어요.']);
      if (ch) ch.parentNode.insertBefore(vn, ch.nextSibling); else cont.insertBefore(vn, cont.firstChild);
    }
    function apply(hide) {
      list.hidden = hide;
      hiddenNote.hidden = !hide;
      btn.textContent = hide ? '기록 보이기' : '기록 가리기';
      btn.setAttribute('aria-expanded', hide ? 'false' : 'true');
      setVeil(portal, hide);
    }
    btn.addEventListener('click', function () {
      const hide = !list.hidden;
      if (hide) store.set(K_RECENT_HIDE, true); else store.remove(K_RECENT_HIDE);
      apply(hide);
      A.announce(hide ? '읽은 기록을 가렸어요' : '읽은 기록을 다시 보여요');
    });
    list.parentNode.insertBefore(hiddenNote, list.nextSibling);
    applyVeil = apply;
    apply(store.get(K_RECENT_HIDE, false) === true);
  }

  /* ---------- 새로 올라온 글 ---------- */
  function newSection() {
    const r = pickNew(A.articles, 6);
    if (!r) return null;
    return el('section.hm-new', { 'data-sec': 'new', 'aria-labelledby': 'hm-new-h' }, [
      el('h2.h-sec', { id: 'hm-new-h' }, ['새로 올라온 글', el('span.hm-new-date', null, [U.fmtDate(r.date)])]),
      el('ul.rows', null, r.list.map(function (a) { return A.row(a); }))
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
  function installHidden() { return installHiddenAt(store.get(K_HIDE, 0), Date.now(), HIDE_DAYS); }
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
  function enhance() {
    const portal = currentPortal();
    if (!portal || portal.hasAttribute('data-hm')) return;
    const head = portal.querySelector('.portal-head');
    /* 역할 자리는 머리 안 끝에: 책꽂이(shelf.js 가 머리 바로 뒤에 끼움)보다 위에 남는다.
       셸이 미리 비워 둔 자리(section[data-sec=start])가 있으면 그 자리를 바꿔 끼운다 */
    veilOn = false;
    roleBox = buildRole();
    const slot = portal.querySelector('section[data-sec="start"]');
    if (slot && slot.parentNode) slot.parentNode.replaceChild(roleBox, slot);
    else if (head) head.appendChild(roleBox);
    else portal.insertBefore(roleBox, portal.firstChild);
    /* data-hm 을 단 순간 home.css 가 잡아 둔 빈자리(::after)가 사라지고 실제 역할 자리가 들어선다(같은 그림 틀 안) */
    portal.setAttribute('data-hm', '1');
    /* 두 입구는 책꽂이 아래. 책꽂이가 이미 있으면 그 뒤에, 없으면 머리 바로 뒤에
       (shelf.js 는 나중에 머리 바로 뒤에 끼우므로 어느 순서로 실려도 "책꽂이 → 두 입구"가 된다) */
    const doors = buildDoors();
    const shelf = portal.querySelector('.sh-shelf');
    const after = shelf || head || roleBox;
    portal.insertBefore(doors, after.nextSibling);
    if (roleBox.getAttribute('data-state') !== 'first') rearrange(portal);
    const xp = buildExplore();
    if (xp) {
      const at = sec(portal, 'today') || sec(portal, 'index');
      if (at) portal.insertBefore(xp, at); else portal.appendChild(xp);
    }
    enhanceRecent(portal);
    const index = sec(portal, 'index');
    const n = newSection();
    if (n && index) portal.insertBefore(n, index);
    drawPaused(portal);
    mountInstall(portal);
  }
  function refresh() {
    const portal = currentPortal();
    if (!portal) return;
    if (!portal.hasAttribute('data-hm')) { enhance(); return; }
    redrawRole(false);
    arrangeCourses(sec(portal, 'courses'));
    drawPaused(portal);
  }
  window.addEventListener('jhb:page', function (e) { if (e.detail && e.detail.kind === 'home') enhance(); });
  /* 기록 쉼을 바꾸거나 기록을 지우면 첫 화면의 해당 자리만 다시 그린다 */
  window.addEventListener('jhb:privacy', function (e) {
    const portal = currentPortal(), d = e.detail || {};
    if (!portal || !portal.hasAttribute('data-hm')) return;
    if (d.action === 'clear') {
      const ids = d.ids === 'all' ? null : (Array.isArray(d.ids) ? d.ids : []);
      const hit = function (id) { return !ids || ids.indexOf(id) >= 0; };
      if (hit('recent')) {
        const r = sec(portal, 'recent'); if (r) r.remove();
        applyVeil = null;
        setVeil(portal, false);
      }
      /* 보기 설정을 지우면 가린 기록도 다시 보인다 */
      if (hit('settings') && applyVeil) applyVeil(store.get(K_RECENT_HIDE, false) === true);
      if (hit('role') || hit('recent') || hit('read')) redrawRole(false);
      if (hit('role')) arrangeCourses(sec(portal, 'courses'));
    } else if (d.action === 'paused') {
      /* 쉼을 켜고 끄면 이 탭에서만 기억한 역할이 보이거나 사라진다 */
      redrawRole(false);
      arrangeCourses(sec(portal, 'courses'));
    }
    drawPaused(portal);
  });
  enhance();

  JHB.ui.home = { role: role, setRole: setRole, refresh: refresh, roles: ROLES.slice(), roleName: roleName };
})(typeof window !== 'undefined' ? window : this);

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/shelf.js ===== */
(function () { try {
/* shelf — 공유 배너(책등형)와 같은 책꽂이 모티프를 사이트에 둔다.
   1) 첫 화면: 머리 아래에 분류를 책등으로 세운 책꽂이(누르면 그 분류로). 책등이 높을수록 문서가 많다(많을수록 높고, 같으면 같은 높이).
      용어 사전은 문서가 아니라 용어를 모은 사전이라 맨 끝에 두꺼운 책으로 세운다(높이는 가장 높은 책과 같음).
      휴대폰(760px 이하)은 두 줄 책꽂이: 책등 하나의 누르는 폭 44px(사전 50px), 높이 44px 이상.
      390px 미만 폰은 css 가 두 줄 묶음을 풀어 한 줄에 6권씩 놓아요(누르는 폭 48px 이상, css/ui/shelf.css).
      라벨 글자는 책등 색마다 흰 글자·먹 글자 중 대비가 큰 쪽을 계산해 고르고, 둘 다 4.5:1 에 못 미치면 책등 명도를 가장 적게 옮긴다
      (밝은·어두운 화면 각각. 테마 값은 css/style.css 의 --spine-s·--spine-l 과 같고 tests/a11y.test.cjs 가 맞댄다).
   2) 분류·용어 사전 화면: 제목 앞에 큰 책등
   3) 공용 색 막대(.spine)는 css/ui/shelf.css 에서 책등 모양으로 다듬는다.
   정적 HTML: html(model(sections, counts), L) 이 같은 마크업 문자열을 만든다(node 에서도). 첫 화면에 같은 책꽂이(data-sig 가 같음)가
   이미 있으면 지우지 않고 그대로 쓴다(빌드가 미리 그려 두면 첫 화면이 흔들리지 않게).
   공개: JHB.ui.shelf = { refresh, model, rows, html }. node: module.exports = 순수 함수 */
(function (root) {
  /* ---------- 순수 함수 ---------- */
  const THEME = { light: { s: 38, l: 56 }, dark: { s: 32, l: 62 } };
  const INK = { light: '#ffffff', dark: '#1b1f27' };   /* 라벨 글자: 흰 글자 / 먹 글자 */
  const MIN = 4.6;                                      /* 4.5:1 에 반올림 여유 */
  /* 책등 높이(px) = a + b × 문서 수. 넓은 화면(hd)·휴대폰(hm). 가장 적은 분류의 라벨도 책등 안에 들어가게 a 를 둔다 */
  const HEIGHT = { hd: { a: 54, b: 4.3 }, hm: { a: 36, b: 2.9 } };
  const TAP_W = 44, DICT_W = 50;                        /* 휴대폰 누르는 폭(css/ui/shelf.css 와 같음) */
  const LONG = 8;                                       /* 띄어쓰기 빼고 8글자 이상이면 휴대폰에서 라벨을 한 단계 작게(세 줄까지) */
  const HINT = '책등을 누르면 그 분류로 가요. 책등이 높을수록 문서가 많아요(두꺼운 용어 사전은 빼고).';

  function hslRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = function (n) { return (n + h / 30) % 12; };
    const a = s * Math.min(l, 1 - l);
    const f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  function hexRgb(hex) { const v = parseInt(String(hex).replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
  function lum(rgb) {
    const c = rgb.map(function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  /* 그 색상각·테마에서 라벨 글자 색(ink: light 흰 / dark 먹)과 책등 명도(l, %), 그때의 대비(ratio) */
  function labelColor(hue, theme) {
    const t = THEME[theme] || THEME.light;
    const W = hexRgb(INK.light), D = hexRgb(INK.dark);
    function at(l) {
      const bg = hslRgb(hue, t.s, l);
      const w = contrast(W, bg), d = contrast(D, bg);
      return w >= d ? { ink: 'light', l: l, ratio: w } : { ink: 'dark', l: l, ratio: d };
    }
    const base = at(t.l);
    if (base.ratio >= MIN) return base;
    /* 0.5%p 씩 넓혀 가며: 어둡게 하면 흰 글자, 밝게 하면 먹 글자. 먼저 기준을 넘는 쪽(같으면 원래 더 나은 쪽) */
    for (let d = 0.5; d <= 40; d += 0.5) {
      const dn = t.l - d, up = t.l + d;
      const w = dn >= 5 ? { ink: 'light', l: dn, ratio: contrast(W, hslRgb(hue, t.s, dn)) } : null;
      const k = up <= 95 ? { ink: 'dark', l: up, ratio: contrast(D, hslRgb(hue, t.s, up)) } : null;
      const okW = w && w.ratio >= MIN, okK = k && k.ratio >= MIN;
      if (okW && okK) return base.ink === 'light' ? w : k;
      if (okW) return w;
      if (okK) return k;
    }
    return base;
  }
  function px(v) { return Math.round(v * 10) / 10; }
  /* 가운뎃점 뒤에만 줄 바꿈 자리(세로 라벨이 책등 안에서 둘로 나뉠 수 있게. 화면에 보이는 글자는 같음).
     앞에는 단어 잇개(U+2060)를 둬서 가운뎃점이 줄 맨 앞으로 떨어지지 않게 */
  function breakable(title) { return String(title || '').replace(/·/g, '⁠·​'); }
  /* sections: JHB.sections, counts: { 분류id: 문서 수(용어 사전은 용어 수) }. 용어 사전은 맨 끝 */
  function model(sections, counts) {
    const docs = [], dict = [];
    (sections || []).forEach(function (s) { (s.glossary ? dict : docs).push(s); });
    const hOf = function (k, n) { return px(HEIGHT[k].a + HEIGHT[k].b * n); };
    let maxN = 0;
    docs.forEach(function (s) { maxN = Math.max(maxN, Number(counts[s.id]) || 0); });
    return docs.concat(dict).map(function (s) {
      const n = Number(counts[s.id]) || 0;
      const hn = s.glossary ? maxN : n;
      const hue = Number(s.hue) || 0;
      return {
        id: s.id, title: s.title || '', text: breakable(s.title), hue: hue, n: n, glossary: !!s.glossary,
        long: String(s.title || '').replace(/\s/g, '').length >= LONG,
        href: s.glossary ? '#/glossary' : '#/s/' + s.id,
        label: (s.title || '') + ' · ' + (s.glossary ? '용어 ' : '문서 ') + n + '개',
        hd: hOf('hd', hn), hm: hOf('hm', hn),
        color: { light: labelColor(hue, 'light'), dark: labelColor(hue, 'dark') }
      };
    });
  }
  /* 휴대폰 두 줄: 앞 절반(올림)과 나머지(용어 사전은 둘째 줄 끝) */
  function rows(m) { const k = Math.ceil(m.length / 2); return [m.slice(0, k), m.slice(k)]; }
  function sig(m) { return m.map(function (b) { return b.id + ':' + b.n + ':' + b.hue; }).join(','); }
  function styleOf(b) {
    return '--h:' + b.hue + ';--hd:' + b.hd + 'px;--hm:' + b.hm + 'px;--sl-l:' + b.color.light.l + '%;--sl-d:' + b.color.dark.l + '%;' +
      '--ink-l:' + INK[b.color.light.ink] + ';--ink-d:' + INK[b.color.dark.ink];
  }
  function escHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* 정적 HTML 문자열. L: '#/s/1' 같은 옛 해시 링크를 실제 경로로 바꾸는 함수(앱의 JHB.app.L, 빌드의 경로 함수) */
  function html(m, L) {
    L = L || function (h) { return h; };
    const book = function (b) {
      return '<a class="sh-spine' + (b.glossary ? ' sh-dict' : '') + (b.long ? ' sh-long' : '') + '" href="' + escHtml(L(b.href)) + '" style="' + styleOf(b) + '" aria-label="' + escHtml(b.label) + '" title="' + escHtml(b.label) + '">' +
        '<span class="sh-label" aria-hidden="true">' + escHtml(b.text) + '</span></a>';
    };
    return '<section class="sh-shelf" data-sec="shelf" aria-label="분류 책꽂이" data-sig="' + escHtml(sig(m)) + '">' +
      '<div class="sh-rows">' + rows(m).map(function (r) { return '<div class="sh-row">' + r.map(book).join('') + '</div>'; }).join('') + '</div>' +
      '<div class="sh-board" aria-hidden="true"></div><p class="sh-hint">' + escHtml(HINT) + '</p></section>';
  }
  const lib = {
    THEME: THEME, INK: INK, MIN: MIN, LONG: LONG, HEIGHT: HEIGHT, TAP_W: TAP_W, DICT_W: DICT_W, HINT: HINT,
    hslRgb: hslRgb, hexRgb: hexRgb, contrast: contrast, labelColor: labelColor, model: model, rows: rows, sig: sig, html: html
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = lib; return; }
  if (!root.JHB || !root.JHB.app) return;

  /* ---------- 브라우저 ---------- */
  const A = root.JHB.app, el = A.el;
  function counts() {
    const m = {};
    A.sections.forEach(function (s) { m[s.id] = s.glossary ? A.glossary.length : A.sectionArticles(s.id).length; });
    return m;
  }
  function buildShelf(m) {
    const book = function (b) {
      return el('a', {
        class: 'sh-spine' + (b.glossary ? ' sh-dict' : '') + (b.long ? ' sh-long' : ''), href: A.L(b.href), style: styleOf(b), 'aria-label': b.label, title: b.label
      }, [el('span.sh-label', { 'aria-hidden': 'true' }, [b.text])]);
    };
    return el('section.sh-shelf', { 'data-sec': 'shelf', 'aria-label': '분류 책꽂이', 'data-sig': sig(m) }, [
      el('div.sh-rows', null, rows(m).map(function (r) { return el('div.sh-row', null, r.map(book)); })),
      el('div.sh-board', { 'aria-hidden': 'true' }),
      el('p.sh-hint', null, [HINT])
    ]);
  }
  function bigSpine(s) {
    return el('span.sh-big', { style: '--h:' + s.hue, 'aria-hidden': 'true' });
  }
  function onPage(d) {
    if (d.kind === 'home') {
      const head = A.main.querySelector('.portal .portal-head');
      const m = model(A.sections, counts());
      const want = sig(m);
      /* 이미 같은 책꽂이가 제자리(머리 바로 뒤)에 있으면 그대로 둔다(정적 HTML·다시 그리기에서 흔들리지 않게) */
      const have = head && head.nextElementSibling && head.nextElementSibling.matches('.sh-shelf') ? head.nextElementSibling : null;
      Array.prototype.forEach.call(document.querySelectorAll('.sh-shelf, .sh-big'), function (n) {
        if (n !== have || n.getAttribute('data-sig') !== want) n.remove();
      });
      if (head && !(have && have.isConnected)) head.parentNode.insertBefore(buildShelf(m), head.nextSibling);
      return;
    }
    Array.prototype.forEach.call(document.querySelectorAll('.sh-shelf, .sh-big'), function (n) { n.remove(); });
    if (d.kind === 's' || d.kind === 'glossary') {
      const s = d.kind === 's' ? A.secById[d.id] : A.sections.filter(function (x) { return x.glossary; })[0];
      const t = A.main.querySelector('.page-title');
      if (s && t) t.insertBefore(bigSpine(s), t.firstChild);
    }
  }
  function refresh() { const w = A.where(); onPage({ kind: w.path[0] || 'home', id: w.path[1] || null }); }
  root.addEventListener('jhb:page', function (e) { if (!(e.detail && e.detail.loading)) onPage(e.detail || {}); });
  refresh();
  root.JHB.ui = root.JHB.ui || {};
  root.JHB.ui.shelf = { refresh: refresh, model: model, rows: rows, html: html };
})(typeof window !== 'undefined' ? window : this);

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/ask.js ===== */
(function () { try {
/* 조현병 백과 · 진료 질문 바구니 모듈 (js/ui/ask.js, 화면은 js/pages/ask.js 의 ask/)
   1) 글 본문의 '## 담당 의사에게 물어볼 것' 목록 항목마다 "담기" 버튼(aria-pressed). 누르면 바구니에 넣고 빼요.
      질문 글자는 글에 있는 그대로 담아요(공백만 정리. 지시형으로 바꾸지 않음). jhb:article 에서 붙이고(요약 보기·정적 본문 살리기 뒤에도
      같은 선택자: .body 안의 h2 와 그 소절의 목록), 모듈이 늦게 실려도 이미 그려진 글에 한 번 붙여요.
   2) 저장: 기본은 sessionStorage 'jhb.ui.ask.session'(이 탭에만. 브라우저의 "닫은 탭 다시 열기"로 그 탭과 함께 돌아올 수 있어요).
      사용자가 ask/ 화면에서 "이 기기에 기억하기"를 켜야
      localStorage 'jhb.ui.ask.keep'(true)·'jhb.ui.ask.items' 에 남아요. 기록 쉼(privacy.paused)이면 기기 저장을 켤 수 없고,
      이미 켜져 있으면 새로 담는 질문은 기기에 쓰지 않고 이 탭에만 둬요(빼기·순서는 기기에도 반영). 읽기(state)는 저장소를 고치지 않아요.
      내 서재가 지울 수 있게 privacy.register({ id: 'ask', … }).
   3) 입력·담은 질문을 분석하지 않고(위기어 검사·분류·추천 없음) 주소·바깥으로 보내지 않아요.
   공개: JHB.ui.ask = { core, state, add, remove, toggle, has, moveItem, moveGroup, setKeep, clearAll, restore, canKeep }
         바뀔 때마다 window 에 'jhb:ask' { count, keep }.
   순수 함수(core)는 node 에서도 읽혀요(tests/ask.test.cjs). */
(function (root) {
  'use strict';
  var KEYS = { session: 'jhb.ui.ask.session', keep: 'jhb.ui.ask.keep', items: 'jhb.ui.ask.items' };
  var MAX_ITEMS = 100, MAX_LEN = 300, MAX_TITLE = 200;
  var SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/, ID_RE = /^[a-z0-9][a-z0-9-]{0,120}$/;
  var HEADING = '담당 의사에게 물어볼 것';

  /* ---------- 순수 함수 ---------- */
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function isAskHeading(t) { return norm(t) === HEADING; }
  /* 짧은 지문(djb2). 같은 글·같은 문장이면 같은 id */
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function idFor(slug, text) { return (slug ? 'a-' + slug : 'm') + '-' + hash((slug || '') + '|' + text); }
  /* { slug?, title?, text } → { id, slug(null = 내 질문), title, text } 또는 null */
  function makeItem(o) {
    if (!o || typeof o !== 'object') return null;
    var text = norm(o.text);
    if (!text || text.length > MAX_LEN) return null;
    var slug = o.slug == null || o.slug === '' ? null : String(o.slug);
    if (slug !== null && !SLUG_RE.test(slug)) return null;
    var title = slug ? norm(o.title).slice(0, MAX_TITLE) : '';
    return { id: idFor(slug, text), slug: slug, title: title, text: text };
  }
  function groupKey(it) { return it && it.slug ? 'a:' + it.slug : 'mine'; }
  function same(a, b) { return !!a && !!b && (a.slug || null) === (b.slug || null) && a.text === b.text; }
  function has(list, it) { return !!it && (list || []).some(function (x) { return same(x, it); }); }
  /* 묶음(글 하나 또는 내 질문)은 처음 담은 순서 */
  function groups(list) {
    var out = [], byKey = {};
    (list || []).forEach(function (it) {
      var k = groupKey(it);
      if (!Object.prototype.hasOwnProperty.call(byKey, k)) { byKey[k] = { key: k, slug: it.slug || null, title: it.title || '', items: [] }; out.push(byKey[k]); }
      byKey[k].items.push(it);
    });
    return out;
  }
  function flat(gs) { var out = []; gs.forEach(function (g) { out.push.apply(out, g.items); }); return out; }
  function tidy(list) { return flat(groups(list)); }
  /* 저장소에서 읽은 값은 믿지 않고 다시 만든다 */
  function sanitize(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [];
    for (var i = 0; i < raw.length && out.length < MAX_ITEMS; i++) {
      var x = raw[i];
      if (!x || typeof x !== 'object' || typeof x.text !== 'string') continue;
      var it = makeItem({ slug: x.slug, title: typeof x.title === 'string' ? x.title : '', text: x.text });
      if (!it || has(out, it)) continue;
      if (typeof x.id === 'string' && ID_RE.test(x.id) && !out.some(function (y) { return y.id === x.id; })) it.id = x.id;
      out.push(it);
    }
    return tidy(out);
  }
  function uniqueId(list, it) {
    var id = it.id, n = 2;
    while (list.some(function (x) { return x.id === id; })) id = it.id + '-' + (n++);
    return id;
  }
  /* 같은 글의 질문은 그 묶음 끝에, 새 글이면 맨 끝에 새 묶음 */
  function add(list, it) {
    list = list || [];
    if (!it || typeof it.text !== 'string' || !it.text) return { list: list, added: false, reason: 'bad' };
    if (has(list, it)) return { list: list, added: false, reason: 'dup' };
    if (list.length >= MAX_ITEMS) return { list: list, added: false, reason: 'full' };
    var item = { id: uniqueId(list, it), slug: it.slug || null, title: it.title || '', text: it.text };
    var gs = groups(list), k = groupKey(item);
    var g = gs.filter(function (x) { return x.key === k; })[0];
    if (g) g.items.push(item); else gs.push({ key: k, slug: item.slug, title: item.title, items: [item] });
    return { list: flat(gs), added: true, item: item };
  }
  function remove(list, id) { return (list || []).filter(function (x) { return x.id !== id; }); }
  /* 같은 묶음 안에서만 한 칸 */
  function moveItem(list, id, dir) {
    var gs = groups(list);
    for (var i = 0; i < gs.length; i++) {
      var items = gs[i].items, j = items.findIndex(function (x) { return x.id === id; });
      if (j < 0) continue;
      var t = j + (dir < 0 ? -1 : 1);
      if (t < 0 || t >= items.length) return { list: list, moved: false };
      var tmp = items[j]; items[j] = items[t]; items[t] = tmp;
      return { list: flat(gs), moved: true, index: t };
    }
    return { list: list, moved: false };
  }
  function moveGroup(list, key, dir) {
    var gs = groups(list), i = gs.findIndex(function (g) { return g.key === key; });
    var t = i + (dir < 0 ? -1 : 1);
    if (i < 0 || t < 0 || t >= gs.length) return { list: list, moved: false };
    var tmp = gs[i]; gs[i] = gs[t]; gs[t] = tmp;
    return { list: flat(gs), moved: true, index: t };
  }

  /* ---------- 저장(env = { local, session }, 둘 다 JSON 단위 get(key)→값|null · set(key, v)→bool · remove(key)) ----------
     - load 는 읽기만 해요(저장소를 고치지 않음). 다른 탭의 storage 이벤트로 다시 읽어도 이 탭의 세션 질문이 기기로 옮겨지거나 지워지지 않아요.
       기기 저장 중이면 화면 목록 = 이 탭(세션)의 목록 + 거기 없는 기기 질문.
     - 합치기·남은 값 정리는 이 탭이 쓸 때(save)만 해요.
     - 기록 쉼(opts.paused) 중 기기 저장이 켜져 있으면: 기기 쪽은 이미 있던 질문을 빼거나 순서를 바꾸는 것만 반영하고 새 질문은 쓰지 않아요.
       화면 목록 전체는 이 탭(세션)에 둬요. keep 키도 다시 쓰지 않아요.
     - 순서: 새 값을 먼저 쓰고, 성공한 뒤에 옛 키를 지워요(실패하면 어디에도 없는 일이 없게). */
  function merge(first, rest) {
    var out = first;
    rest.forEach(function (it) { if (!has(out, it)) out = add(out, it).list; });
    return out;
  }
  function load(env) {
    var sess = sanitize(env.session.get(KEYS.session));
    if (env.local.get(KEYS.keep) !== true) return { keep: false, items: sess };
    return { keep: true, items: merge(sess, sanitize(env.local.get(KEYS.items))) };
  }
  /* 기기 저장 중일 때, 기기에는 없고 이 탭에만 있는 질문 수 */
  function heldCount(env, items) {
    if (env.local.get(KEYS.keep) !== true) return 0;
    var dev = sanitize(env.local.get(KEYS.items));
    return (items || []).filter(function (x) { return !has(dev, x); }).length;
  }
  function saveHeld(env, items) {
    var dev = sanitize(env.local.get(KEYS.items));
    var devNext = items.filter(function (x) { return has(dev, x); });
    var held = devNext.length !== items.length;
    if (held && !env.session.set(KEYS.session, items)) return false;
    if (devNext.length) { if (!env.local.set(KEYS.items, devNext)) return false; }
    else env.local.remove(KEYS.items);
    if (!held) env.session.remove(KEYS.session);
    return true;
  }
  function save(env, st, opts) {
    var items = sanitize(st.items);
    if (st.keep && opts && opts.paused) return saveHeld(env, items);
    if (st.keep) {
      var wasKeep = env.local.get(KEYS.keep) === true;
      if (items.length && !env.local.set(KEYS.items, items)) return false;
      if (!wasKeep && !env.local.set(KEYS.keep, true)) { env.local.remove(KEYS.items); return false; }
      if (!items.length) env.local.remove(KEYS.items);
      env.session.remove(KEYS.session);
      return true;
    }
    if (items.length) { if (!env.session.set(KEYS.session, items)) return false; }
    else env.session.remove(KEYS.session);
    env.local.remove(KEYS.keep); env.local.remove(KEYS.items);
    return true;
  }
  function setKeep(env, st, on) {
    var items = sanitize(st && st.items);
    if (on) {
      if (save(env, { keep: true, items: items })) return { keep: true, items: items };
      var cur = load(env);
      return { keep: cur.keep, items: cur.items, failed: true };
    }
    if (save(env, { keep: false, items: items })) return { keep: false, items: items };
    /* 끄기는 꼭 돼야 해요: 이 탭에 옮기지 못해도 기기 값은 지워요 */
    env.local.remove(KEYS.keep); env.local.remove(KEYS.items);
    return { keep: false, items: load(env).items, failed: true, lost: true };
  }
  function clearAll(env) {
    env.local.remove(KEYS.keep); env.local.remove(KEYS.items); env.session.remove(KEYS.session);
    return { keep: false, items: [] };
  }
  /* 글 화면 안내 줄의 저장 위치(st = state(): { keep, paused, held }).
     이 탭(sessionStorage)에만 있을 때 "탭을 닫으면 사라진다"고 하지 않아요: 브라우저의 "닫은 탭 다시 열기"로 그 탭과 함께 돌아와요.
     기기 저장 중이어도 이 탭에만 있는 질문(held: 다른 탭에서 켰거나 기록 쉼 중에 담음)이 있으면 그 수를 말해요 */
  function barText(st) {
    st = st || {};
    var held = Number(st.held) > 0 ? Math.floor(Number(st.held)) : 0;
    if (!st.keep) return '이 탭에만 있어요. 브라우저의 닫은 탭 다시 열기로 돌아올 수 있어요';
    if (st.paused) return '이 기기에 저장 중 · "기록 남기지 않기"가 켜져 있어 새로 담는 질문은 이 탭에만 둬요' + (held ? '(지금 ' + held + '개)' : '');
    if (held) return '이 기기에 저장 중 · 이 탭에서 담은 ' + held + '개는 아직 이 탭에만 있어요';
    return '이 기기에 저장 중';
  }

  var core = {
    KEYS: KEYS, MAX_ITEMS: MAX_ITEMS, MAX_LEN: MAX_LEN, HEADING: HEADING,
    norm: norm, isAskHeading: isAskHeading, makeItem: makeItem, groupKey: groupKey, has: has, groups: groups, tidy: tidy,
    sanitize: sanitize, add: add, remove: remove, moveItem: moveItem, moveGroup: moveGroup,
    load: load, save: save, setKeep: setKeep, clearAll: clearAll, heldCount: heldCount, barText: barText
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  /* ---------- 브라우저 ---------- */
  var JHB = root.JHB;
  if (!JHB || !JHB.app) return;
  var A = JHB.app, el = A.el, U = JHB.util;
  JHB.ui = JHB.ui || {};

  var sess = {
    get: function (k) { try { var v = root.sessionStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set: function (k, v) { try { root.sessionStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    remove: function (k) { try { root.sessionStorage.removeItem(k); } catch (e) { } }
  };
  var local = {
    get: function (k) { return A.store.get(k, null); },
    set: function (k, v) { return A.store.set(k, v) !== false; },
    remove: function (k) { A.store.remove(k); }
  };
  var ENV = { local: local, session: sess };
  if (A.privacy && A.privacy.register) A.privacy.register({ id: 'ask', label: '진료 질문 바구니', keys: [KEYS.keep, KEYS.items], session: [KEYS.session] });

  function paused() { return !!(A.privacy && A.privacy.paused && A.privacy.paused()); }
  function emit(st) { root.dispatchEvent(new CustomEvent('jhb:ask', { detail: { count: st.items.length, keep: st.keep } })); }
  /* 읽기만(저장소를 고치지 않음). paused·held(기기 저장 중인데 이 탭에만 있는 질문 수)를 함께 */
  function state() {
    var st = load(ENV);
    st.paused = paused();
    st.held = st.keep ? heldCount(ENV, st.items) : 0;
    return st;
  }
  /* 바꾸기: 늘 저장소에서 새로 읽고(다른 탭·내 서재에서 바뀌었을 수 있음) 고친 뒤 저장한다.
     돌려주는 state 는 저장한 뒤 저장소에서 다시 읽은 실제 값이에요. 저장에 실패하면 바뀌기 전 값 그대로라
     화면이 "저장되지 않은 목록"을 보여 주다가 다음 동작에서 말없이 잃는 일이 없어요. */
  function change(fn) {
    var st = state();
    var r = fn(st) || {};
    if (!r.list || r.list === st.items) { r.state = st; r.saved = true; return r; }
    r.saved = save(ENV, { keep: st.keep, items: r.list }, { paused: paused() });
    if (!r.saved) { r.added = false; r.removed = false; r.moved = false; }
    r.state = state();
    emit(r.state);
    return r;
  }
  var api = {
    core: core,
    state: state,
    has: function (it) { return has(state().items, it); },
    add: function (it) { return change(function (st) { return add(st.items, it); }); },
    remove: function (id) { return change(function (st) { var l = remove(st.items, id); return { list: l, removed: l.length !== st.items.length }; }); },
    toggle: function (it) {
      return change(function (st) {
        var cur = st.items.filter(function (x) { return same(x, it); })[0];
        if (cur) return { list: remove(st.items, cur.id), added: false, removed: true };
        return add(st.items, it);
      });
    },
    moveItem: function (id, dir) { return change(function (st) { return moveItem(st.items, id, dir); }); },
    moveGroup: function (key, dir) { return change(function (st) { return moveGroup(st.items, key, dir); }); },
    /* 기록 쉼이면 켜지 못한다(끄기는 언제나 된다) */
    canKeep: function () { return !paused(); },
    setKeep: function (on) {
      if (on && paused()) return { state: state(), refused: 'paused' };
      var r = setKeep(ENV, state(), on);
      var st = state();
      emit(st);
      return { state: st, failed: !!r.failed, lost: !!r.lost };
    },
    clearAll: function () { clearAll(ENV); var st = state(); emit(st); return { state: st }; },
    /* 되돌리기(지우기 직후 화면이 쥔 사본으로). 기록 쉼 중이면 기기 저장을 다시 켜지 않고 이 탭에만 */
    restore: function (snap) {
      var p = paused(), now = load(ENV).keep;
      /* 쉼 중: 지금 기기 저장이 켜져 있으면 그대로 두고(새 것은 이 탭에만), 꺼져 있으면 다시 켜지 않는다 */
      var keep = !!(snap && snap.keep) && (!p || now);
      var okSave = save(ENV, { keep: keep, items: sanitize(snap && snap.items) }, { paused: p });
      var st = state();
      emit(st);
      return { state: st, saved: okSave };
    }
  };
  JHB.ui.ask = api;

  /* ---------- 글 화면: "담기" 버튼 ---------- */
  function toast(text, kind) {
    if (JHB.ui && typeof JHB.ui.toast === 'function') JHB.ui.toast(text, kind ? { kind: kind } : {});
    else A.announce(text);
  }
  /* 항목 글자: 버튼·각주 번호를 뺀 글자 그대로 */
  function liText(li) {
    var c = li.cloneNode(true);
    U.qsa('.ask-add, sup', c).forEach(function (n) { n.remove(); });
    return norm(c.textContent);
  }
  function itemFor(li, slug) {
    var a = A.bySlug[slug];
    return makeItem({ slug: slug, title: a ? a.title : '', text: liText(li) });
  }
  /* 토글 버튼: 이름은 늘 "담기: <질문>"으로 고정하고 상태는 aria-pressed 로만 전해요.
     보이는 글자도 "담기"로 두고(이름 안에 그대로), 담긴 상태는 ✓ 표시와 색으로 보여요. */
  function paint(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('on', on);
    btn.firstChild.textContent = on ? '✓' : '+';
    btn.lastChild.textContent = '담기';
    btn.setAttribute('aria-label', '담기: ' + btn.getAttribute('data-ask-q'));
  }
  function bars() { return U.qsa('.ask-bar', A.main); }
  function paintBar(bar, st) {
    var n = st.items.length;
    bar.hidden = !n;
    bar.querySelector('.ask-bar-n').textContent = '진료 질문 ' + n + '개를 담았어요';
    bar.querySelector('.ask-bar-where').textContent = barText(st);
  }
  function makeBar() {
    return el('p.ask-bar', { hidden: true }, [
      el('span.ask-bar-n'), ' ',
      el('a.ask-bar-go', { href: A.L('#/ask') }, ['바구니 보기']),
      el('span.ask-bar-where')
    ]);
  }
  /* 지금 화면의 버튼·안내 줄을 저장된 상태에 맞춘다 */
  function sync() {
    var btns = U.qsa('.ask-add', A.main);
    if (!btns.length) return;
    var st = state();
    btns.forEach(function (b) {
      var it = { slug: b.getAttribute('data-ask-slug'), text: b.getAttribute('data-ask-q') };
      paint(b, has(st.items, it));
    });
    bars().forEach(function (bar) { paintBar(bar, st); });
  }
  function onPress(e) {
    var b = e.currentTarget;
    var it = makeItem({ slug: b.getAttribute('data-ask-slug'), title: b.getAttribute('data-ask-title'), text: b.getAttribute('data-ask-q') });
    if (!it) return;
    var wasOn = b.getAttribute('aria-pressed') === 'true';
    var r = api.toggle(it);
    if (r.reason === 'full') { toast('질문은 ' + MAX_ITEMS + '개까지 담을 수 있어요. 바구니에서 몇 개를 빼 주세요.'); return; }
    if (r.saved === false) toast(wasOn ? '브라우저 저장 공간을 쓸 수 없어 빼지 못했어요.' : '브라우저 저장 공간을 쓸 수 없어 담지 못했어요.');
    else if (r.added) toast('진료 질문에 담았어요', 'ok');
    else if (r.removed) toast('진료 질문에서 뺐어요');
    sync();
  }
  function attach(body, slug) {
    if (!body || !slug || !A.bySlug[slug]) return 0;
    var n = 0;
    U.qsa('h2', body).forEach(function (h) {
      if (!isAskHeading(h.textContent)) return;
      var lists = [];
      for (var x = h.nextElementSibling; x && x.tagName !== 'H2'; x = x.nextElementSibling) {
        if (x.tagName === 'UL' || x.tagName === 'OL') lists.push(x);
      }
      lists.forEach(function (list) {
        Array.prototype.forEach.call(list.children, function (li) {
          if (li.tagName !== 'LI' || li.querySelector(':scope > .ask-add')) return;
          var it = itemFor(li, slug);
          if (!it) return;
          var b = el('button.ask-add', { type: 'button', 'aria-pressed': 'false', 'data-ask-slug': slug, 'data-ask-title': it.title, 'data-ask-q': it.text }, [el('span.ask-ico', { 'aria-hidden': 'true' }, ['+']), el('span.ask-lbl', null, ['담기'])]);
          b.addEventListener('click', onPress);
          li.appendChild(document.createTextNode(' '));
          li.appendChild(b);
          n++;
        });
      });
      var last = lists[lists.length - 1];
      if (last && !(last.nextElementSibling && last.nextElementSibling.classList.contains('ask-bar'))) last.parentNode.insertBefore(makeBar(), last.nextSibling);
    });
    if (n) sync();
    return n;
  }
  root.addEventListener('jhb:article', function (e) {
    var d = e.detail || {};
    attach(d.body || A.main.querySelector('article.doc .body'), d.slug);
  });
  /* 모듈이 늦게 실려 첫 jhb:article 을 놓쳤을 때: 이미 그려진 글에 한 번 */
  (function () {
    var w = A.where();
    if (w.path[0] === 'a' && w.path[1]) attach(A.main.querySelector('article.doc .body'), w.path[1]);
  })();
  root.addEventListener('jhb:privacy', sync);
  root.addEventListener('pageshow', function (e) { if (e.persisted) sync(); });
  /* 다른 탭에서 바뀌면 다시 읽기만 해요(읽기는 저장소를 고치지 않음) */
  root.addEventListener('storage', function (e) { if (!e.key || e.key.indexOf('jhb.ui.ask.') === 0 || e.key.indexOf('jhb.privacy.') === 0) sync(); });
})(typeof window !== 'undefined' ? window : this);

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/hub.js ===== */
(function () { try {
/* hub — 분류 화면(s/<id>/)을 소묶음으로 다시 짜요.
   - data/kb/groups.json(분류마다 first·groups)을 받아 위에서부터:
     "힘들 때 바로" 한 줄(4·5·10·11 분류) → 먼저 읽을 글(최대 3) → 묶음 건너뛰기 → 묶음 제목·글 수·읽은 수와 글 목록
   - 행은 간소화해요: 분류 이름 반복을 빼고, 휴대폰에서는 요약을 한 줄로
   - 묶음 자료가 없거나 받지 못하면 앱이 그린 전체 목록을 그대로 둬요. 자바스크립트가 없으면 정적 HTML 의 전체 목록이 남아요
   - 다시 짤 때 포커스가 목록 안에 있었으면 같은 글 링크로 돌려놓고, 스크롤 중이었으면 같은 글이 같은 높이에 오게 해요
   - 뒤로·앞으로 가기나 새로 고침으로 다시 열면 떠날 때의 스크롤 위치(history.state.hbY, 다시 짠 화면 기준)로 돌아가요.
     브라우저가 되살린 위치는 다시 짜기 전의 긴 정적 목록에 먼저 걸려 엉뚱한 글을 가리키기 때문이에요
   - 읽음 표시는 기록을 지우거나(jhb:privacy clear) bfcache 로 되살아날 때(pageshow persisted) 다시 맞춰요
   공개: JHB.ui.hub = { refresh, arrange }. node 에서는 순수 함수만 module.exports 로(tests/groups.test.cjs).
   arrange 는 둘러보기(js/pages/browse.js)의 분류별 지도도 그대로 써요(규칙은 여기 한 곳) */
(function (root) {
  const HELP_SECTIONS = ['4', '5', '10', '11'];
  const HELP_SLUG = 'crisis-hotlines';
  const EXTRA_TITLE = '그 밖의 글';

  /* 묶음 자료(entry)와 그 분류의 글 목록(list, 순서대로)으로 화면 계획을 만든다.
     - 묶음 순서·slug 순서를 따르고, 아직 없는 글(새 slug)은 건너뛴다
     - 어느 묶음에도 없는 글은 끝의 "그 밖의 글"로(사라지지 않게)
     - first 는 실제 있는 글만 최대 3편
     같은 입력이면 같은 결과. 묶음 정보가 없으면 null */
  function arrange(entry, list) {
    if (!entry || !Array.isArray(entry.groups) || !entry.groups.length) return null;
    const arts = (list || []).filter(function (a) { return a && a.slug; });
    const by = {}; arts.forEach(function (a) { by[a.slug] = a; });
    const used = {};
    const groups = [];
    entry.groups.forEach(function (g) {
      const items = [];
      (g && Array.isArray(g.slugs) ? g.slugs : []).forEach(function (s) {
        if (by[s] && !used[s]) { used[s] = true; items.push(by[s]); }
      });
      if (items.length) groups.push({ title: String(g.title || ''), items: items });
    });
    const rest = arts.filter(function (a) { return !used[a.slug]; });
    if (rest.length) groups.push({ title: EXTRA_TITLE, items: rest, extra: true });
    if (!groups.length) return null;
    const first = [];
    (Array.isArray(entry.first) ? entry.first : []).forEach(function (s) {
      if (by[s] && first.length < 3 && first.indexOf(by[s]) < 0) first.push(by[s]);
    });
    return { first: first, groups: groups, total: arts.length };
  }

  const lib = { arrange: arrange, HELP_SECTIONS: HELP_SECTIONS, HELP_SLUG: HELP_SLUG, EXTRA_TITLE: EXTRA_TITLE };
  if (typeof module !== 'undefined' && module.exports) { module.exports = lib; return; }

  /* ---------- 브라우저 ---------- */
  if (!root.JHB || !root.JHB.app) return;
  const JHB = root.JHB, A = JHB.app, el = A.el;
  let token = 0;
  /* 이 문서를 뒤로·앞으로 가기나 새로 고침으로 열었으면 첫 그리기에서 한 번 저장된 위치로 돌아간다 */
  let restoreOnce = (function () {
    try { const n = performance.getEntriesByType('navigation')[0]; return !!n && (n.type === 'back_forward' || n.type === 'reload'); } catch (e) { return false; }
  })();
  /* 읽은 글: 그릴 때 한 번만 읽어 둔다(행마다 저장소를 다시 읽지 않게) */
  let readSet = {};
  function loadRead() {
    readSet = {};
    try { (A.progress && A.progress.readSlugs ? A.progress.readSlugs() : []).forEach(function (s) { readSet[s] = true; }); } catch (e) { }
  }
  function isRead(slug) { return readSet[slug] === true; }
  /* 행의 링크 주소('#/a/slug', '../../a/slug/', 'a/slug/')에서 slug */
  function slugOfRow(li) {
    if (!li) return null;
    if (li.getAttribute('data-slug')) return li.getAttribute('data-slug');
    const a = li.querySelector('a[href]');
    const m = a && /(?:^|[\/#])a\/([^\/?#]+)/.exec(a.getAttribute('href') || '');
    return m ? m[1] : null;
  }
  function topOffset() {
    const bar = document.querySelector('.topbar');
    return bar ? bar.getBoundingClientRect().bottom : 0;
  }

  /* 분류 이름을 뺀 문서 행(같은 분류라 반복이 필요 없음) */
  function hubRow(a) {
    const li = A.row(a);
    const sec = li.querySelector('.row-sec');
    if (sec) sec.remove();
    li.setAttribute('data-slug', a.slug);
    return li;
  }
  function firstBox(list) {
    return el('section.hb-first', { 'aria-labelledby': 'hb-first-h' }, [
      el('h2.hb-first-h', { id: 'hb-first-h' }, ['먼저 읽을 글']),
      el('ol', null, list.map(function (a) {
        return el('li', { 'data-slug': a.slug }, [el('a', { href: '#/a/' + a.slug }, [
          el('span.hb-t', null, [a.title, isRead(a.slug) ? el('span.read-mark', null, ['읽음']) : null]),
          a.summary ? el('span.hb-s', null, [a.summary]) : null
        ])]);
      }))
    ]);
  }
  function countLabel(items) {
    const n = items.length;
    const r = items.filter(function (a) { return isRead(a.slug); }).length;
    return n + '편' + (r ? ' · ' + r + '편 읽음' : '');
  }
  function build(s, plan) {
    const kids = [];
    if (HELP_SECTIONS.indexOf(s.id) >= 0 && A.bySlug[HELP_SLUG]) {
      kids.push(el('p.hb-help', null, ['힘들 때 바로: ', el('a', { href: '#/a/' + HELP_SLUG }, ['위기 상담 전화'])]));
    }
    if (plan.first.length) kids.push(firstBox(plan.first));
    if (plan.groups.length > 1) {
      kids.push(el('nav.hb-jump', { 'aria-label': '이 분류의 묶음으로 건너뛰기' }, plan.groups.map(function (g, i) {
        return el('a', { href: '#hb-g-' + (i + 1) }, [g.title, el('span.n', { 'aria-hidden': 'true' }, [String(g.items.length)])]);
      })));
    }
    plan.groups.forEach(function (g, i) {
      const id = 'hb-g-' + (i + 1);
      kids.push(el('section.hb-group', { id: id, 'aria-labelledby': id + '-h', class: g.extra ? 'hb-extra' : null }, [
        el('h2.hb-gh', { id: id + '-h' }, [el('span.hb-gt', null, [g.title]), el('span.hb-gn', null, [countLabel(g.items)])]),
        el('ul.rows.hb-rows', null, g.items.map(hubRow))
      ]));
    });
    return el('div.hb', { 'data-section': s.id }, kids);
  }

  function apply(id) {
    const s = A.secById[id];
    if (!s || s.glossary) return;
    const my = ++token;
    A.loadData('groups').then(function (data) {
      if (my !== token) return;
      const w = A.where();
      if (w.path[0] !== 's' || w.path[1] !== id) return;
      draw(s, Array.isArray(data) ? data : []);
    }).catch(function () { /* 자료가 없으면 전체 목록을 그대로 둔다 */ });
  }
  function draw(s, data) {
    const main = A.main;
    if (main.querySelector('.hb')) return;
    const old = Array.prototype.filter.call(main.children, function (n) { return n.matches('ul.rows'); })[0];
    if (!old) return;
    const entry = data.filter(function (g) { return g && g.section === s.id; })[0] || null;
    const plan = arrange(entry, A.sectionArticles(s.id));
    if (!plan) return;
    /* 다시 짜기 전: 포커스·스크롤 기준이 된 글 */
    const ae = document.activeElement;
    const focusSlug = ae && old.contains(ae) ? slugOfRow(ae.closest('li.row')) : null;
    let anchorSlug = null, anchorTop = 0;
    if (!focusSlug && window.scrollY > 0) {
      const lim = topOffset();
      const rows = old.querySelectorAll('li.row');
      for (let i = 0; i < rows.length; i++) {
        const b = rows[i].getBoundingClientRect();
        if (b.bottom > lim) { anchorSlug = slugOfRow(rows[i]); anchorTop = b.top; break; }
      }
    }
    const saved = restoreOnce ? savedY(s.id) : null;
    restoreOnce = false;
    loadRead();
    const box = build(s, plan);
    old.replaceWith(box);
    const pick = function (slug) { return slug ? box.querySelector('.hb-rows li[data-slug="' + slug + '"]') : null; };
    /* 순서: 목록 안 포커스 → 뒤로 가기·새로 고침의 저장 위치 → 주소의 묶음(#hb-g-N, 공유한 주소) → 보던 글의 높이 */
    const target = /^#hb-g-\d+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;
    if (focusSlug) {
      const li = pick(focusSlug);
      const a = li && li.querySelector('a');
      if (a) a.focus();
    } else if (saved != null) {
      window.scrollTo(0, saved);
    } else if (target) {
      target.scrollIntoView({ block: 'start' });
    } else if (anchorSlug) {
      const li = pick(anchorSlug);
      if (li) window.scrollBy(0, li.getBoundingClientRect().top - anchorTop);
    }
  }

  /* ---------- 떠날 때의 스크롤 위치(이 탭의 기록 항목에만, history.state) ---------- */
  function stateObj() {
    const st = history.state;
    return st == null ? {} : (typeof st === 'object' ? st : null);
  }
  function savedY(id) {
    const st = stateObj();
    return st && st.hbSec === id && typeof st.hbY === 'number' && st.hbY >= 0 ? st.hbY : null;
  }
  function saveY() {
    const box = A.main.querySelector('.hb');
    const st = stateObj();
    if (!box || !st) return;
    const y = Math.round(window.scrollY);
    const id = box.getAttribute('data-section');
    if (st.hbSec === id && st.hbY === y) return;
    try { history.replaceState(Object.assign({}, st, { hbSec: id, hbY: y }), ''); } catch (e) { }
  }
  /* 스크롤이 멈추고 0.3초 뒤에 한 번(replaceState 를 자주 부르지 않게), 글을 누를 때, 떠날 때 */
  let saveTimer = 0;
  window.addEventListener('scroll', function () {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveTimer = 0; saveY(); }, 300);
  }, { passive: true });
  window.addEventListener('pagehide', function () { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; } saveY(); });
  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest ? e.target.closest('.hb a[href]') : null;
    if (a) saveY();
  }, true);

  /* 읽음 표시·읽은 수를 지금 기록에 맞춘다: 기록을 지웠으면 표시를 빼고, 새로 읽은 글(bfcache 로 되살아난 화면)에는 더한다 */
  function updateRead() {
    const box = A.main.querySelector('.hb');
    if (!box) return;
    loadRead();
    const ae = document.activeElement;
    Array.prototype.forEach.call(box.querySelectorAll('.hb-rows li.row[data-slug]'), function (li) {
      const slug = li.getAttribute('data-slug');
      if (isRead(slug) === !!li.querySelector('.read-mark') || !A.bySlug[slug]) return;
      const fresh = hubRow(A.bySlug[slug]);
      const had = ae && li.contains(ae);
      li.replaceWith(fresh);
      const a = had && fresh.querySelector('a');
      if (a) a.focus({ preventScroll: true });
    });
    Array.prototype.forEach.call(box.querySelectorAll('.hb-first li[data-slug]'), function (li) {
      const t = li.querySelector('.hb-t'), mark = li.querySelector('.read-mark');
      const r = isRead(li.getAttribute('data-slug'));
      if (r && !mark && t) t.appendChild(el('span.read-mark', null, ['읽음']));
      else if (!r && mark) mark.remove();
    });
    Array.prototype.forEach.call(box.querySelectorAll('.hb-group'), function (g) {
      const n = g.querySelector('.hb-gn');
      const items = Array.prototype.map.call(g.querySelectorAll('.hb-rows li[data-slug]'), function (li) { return { slug: li.getAttribute('data-slug') }; });
      if (n) n.textContent = countLabel(items);
    });
  }
  function refresh() {
    const w = A.where();
    if (w.path[0] === 's' && w.path[1]) apply(w.path[1]);
  }
  window.addEventListener('jhb:privacy', function (e) { if (e.detail && e.detail.action === 'clear') updateRead(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) updateRead(); });
  window.addEventListener('jhb:page', function (e) {
    const d = e.detail || {};
    if (d.loading) return;
    if (d.kind === 's' && d.id) apply(String(d.id)); else token++;
  });
  refresh();
  JHB.ui = JHB.ui || {};
  JHB.ui.hub = { refresh: refresh, arrange: arrange };
})(typeof window !== 'undefined' ? window : this);

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/nextsteps.js ===== */
(function () { try {
/* js/ui/nextsteps.js — 글 끝 "다음 걸음"과 "이 주제의 자주 묻는 질문" (문서 화면의 after-body 자리: 본문 바로 뒤, 출처 위)
   - 다음 걸음 최대 3편. 고르는 근거는 글 사이 링크·읽기 코스·분류·손으로 정한 표(data/kb/nextsteps.json)뿐이에요.
     읽은 기록으로 사람을 짐작하지 않아요(audit-safety 3장 16). 순서(지시서 M6):
       1) 손 지정 { "slug": { "self"|"family"|"near"|"any": [...] } } — 고른 역할 목록 → any(궁금해서 왔어요·역할 없음은 any 만)
       2) 이 글이 든 코스의 다음 글(역할에 맞는 코스 → 코스 순서)
       3) 본문이 링크한 글(가족·주변 사람이면 10·11 분류 글을 앞에)
       4) 같은 묶음(data/kb/groups.json 이 있으면)의 다음 글, 없으면 같은 분류의 다음 글(끝이면 앞으로 돌아감)
     ?course= 로 들어왔으면 그 코스의 다음 글은 코어의 코스 안내(.course-nav)가 보여 주니 여기서는 빼요(같은 링크 두 번 방지).
     본문 끝 "더 읽을 글"에 이미 있는 글(o.seen)은 같은 층(손 지정 / 자동 규칙) 안에서 뒤로 미뤄요(바로 위 목록과 같은 글이
     이어지지 않게). 손 지정은 "더 읽을 글"과 겹쳐도 자동 규칙보다 앞이에요(손으로 정한 뜻이 본문 링크에 밀리지 않게).
     폭력·응급이 주제인 글(HEAVY)은 그런 글이 아닌 글 끝에서 자동 규칙으로는 맨 앞에 두지 않아요. 자동 규칙의 다른 후보
     (묶음·분류 순서 포함, "더 읽을 글"에 없는 것) 뒤에 두고, 한 편까지만 써요. 손 지정은 그대로예요.
     낙인을 다루는 글 끝에서는 범죄·재판 글(CRIME)도 자동 규칙으로는 맨 앞에 두지 않아요.
     세 편이 모두 위기·응급 태그 글이면 마지막 자리를 위기·응급 아닌 글(위기·응급 글 끝에서는 회복·도움 글 먼저)로 바꿔요.
     실제로 있는 글만, 자기 자신·중복 없이.
   - 15분류(자주 묻는 질문) 글은 다음 걸음에 넣지 않고 아래 "이 주제의 자주 묻는 질문"(최대 4개)으로:
     이 글을 링크한 질문 글(JHB.app.links.in ∩ 15) → 손 지정·본문 링크에 든 질문 글. 위기 글에서는 입원 질문을 뒤로 보내요
     (입원을 다루는 위기 글도 같아요). 폭력·응급 글이 아닌 글 끝에서는 폭력·분노 질문을 맨 앞에 두지 않아요.
     질문 아래에는 그 글 요약의 첫 문장에 균형·단서 문장(다만·하지만…, 의사와 함께, 혼자 끊지 않기)을 더한 답 줄을 붙여요
     (answerOf: 질문만 홀로 보이지 않게, 그리고 잘린 첫 문장이 "안 먹어도 된다"처럼 읽히지 않게).
   - 코어가 그리는 "이 문서를 가리키는 문서"(.backlinks)는 지우지 않고 접힌 <details> 로 감싸 글 끝을 짧게 해요.
   - 고르기 함수는 node 에서도 불러 시험해요(tests/nextsteps.test.cjs):
     module.exports = { pick, courseFor, normRole, firstSentence, answerOf, quiet, isAlarm, isHeavy, ROLES, HELP, HEAVY, CRIME }.
   공개: JHB.ui.nextsteps = { pick, refresh, role } */
(function (root) {
  'use strict';
  const ROLES = ['self', 'family', 'near', 'curious'];
  const ROLE_KEY = 'jhb.ui.home.role';
  const FAQ_SEC = '15';
  const CARE_SECS = ['10', '11'];
  const MAX_STEPS = 3, MAX_FAQ = 4;
  /* 위기·응급 글 뒤에 섞는 회복·도움 글(위기·응급 태그가 없는 것만 씀) */
  const HELP = ['recovery', 'mental-health-center', 'peer-support', 'lived-experience-lessons', 'recovery-commonalities'];
  /* 폭력·응급이 글의 주제인 글. "위기" 태그는 자살·자해를 한 소절이라도 다루면 붙어서(42편) 환청·약 글에도 있으니,
     앞세우지 않을 글은 태그가 아니라 이 목록으로 정해요. 새 글이 이런 주제면 여기에 더해요(tests/nextsteps.test.cjs 가 slug 를 검사) */
  const HEAVY = [
    'suicide-warning-signs', 'crisis-hotlines', 'emergency-response', 'psychiatric-emergency-system', 'suicide-bereavement',
    'family-violence-safety', 'anger-irritability',
    'neuroleptic-malignant-syndrome', 'heart-and-antipsychotics', 'polydipsia-hyponatremia', 'heat-and-medication'
  ];
  /* 폭력·응급 글이 아닌 글 끝에서 위기·응급 태그 카드의 요약을 감추는 말(제목만 보여요).
     상담 전화 이름 "자살예방…"과 "자살이 아니라"처럼 부정하는 말은 감추지 않아요 */
  const QUIET_RE = /자살(?!예방|이 아니라)|자해|타해|폭력|흉기|위협/;
  /* 위기 글 끝에서 뒤로 보내는 질문(입원 걱정이 먼저 보여 연락을 망설이지 않게). 입원을 다루는 위기 글(급성기 등)에서도 같아요 */
  const ADMIT_TAGS = ['강제입원', '입원'];
  /* 폭력·응급 글이 아닌 글 끝에서 관련 질문 맨 앞에 두지 않는 질문(증상 글과 "위험"을 먼저 짝짓지 않게) */
  const FAQ_BACK_TAGS = ['폭력', '분노'];
  /* 낙인을 다루는 글 끝에서 자동 규칙으로는 맨 앞에 두지 않는 글(낙인을 바로잡는 글 뒤에 범죄·재판 글을 먼저 권하지 않게) */
  const CRIME = ['justice-system'];
  /* 질문 아래 답 줄: 첫 문장에 더해, 균형을 잡는 문장("다만·하지만…"으로 시작)과
     의사와 함께·혼자 끊지 않기·공식 창구 확인 같은 단서가 든 문장은 떨어뜨리지 않아요(한계선 L4) */
  const TURN_RE = /^(다만|하지만|그러나|오히려|대신|그래도)/;
  const KEEP_RE = /의사|혼자|스스로|해마다|공식 창구/;
  /* 역할에 맞는 코스(data/courses.js 의 who) */
  const COURSE_WHO = { self: ['당사자'], family: ['가족'], near: ['가족'] };
  const own = Object.prototype.hasOwnProperty;

  function normRole(r) { return ROLES.indexOf(r) >= 0 ? r : null; }
  function has(map, k) { return !!map && typeof k === 'string' && own.call(map, k); }
  function listOf(map, k) { return has(map, k) && Array.isArray(map[k]) ? map[k] : []; }
  function indexBy(articles) { const by = {}; articles.forEach(function (a) { if (a && typeof a.slug === 'string') by[a.slug] = a; }); return by; }
  function tagged(a, t) { return !!a && Array.isArray(a.tags) && a.tags.indexOf(t) >= 0; }
  /* 위기·응급 태그 글(태그 기준, 넓음) */
  function isAlarm(a) { return tagged(a, '위기') || tagged(a, '응급'); }
  /* 폭력·응급이 주제인 글(HEAVY 목록, 좁음) */
  function isHeavy(a) { return !!a && HEAVY.indexOf(a.slug) >= 0; }
  /* 카드의 요약을 감출지: 지금 글이 폭력·응급 글이 아니고, 카드가 위기·응급 태그 글이며 요약에 자살·자해·폭력 같은 말이 있으면.
     위기·응급 태그가 없는 글(피해망상, 미디어 속 조현병 등)의 요약은 감추지 않아요 */
  function quiet(card, cur) { return !!card && isAlarm(card) && !isHeavy(cur) && QUIET_RE.test(String(card.summary || '')); }
  function isFaq(a) { return !!a && String(a.section) === FAQ_SEC; }
  function stepsOf(c) { return c && Array.isArray(c.steps) ? c.steps : []; }
  function inCourse(c, slug) { return stepsOf(c).some(function (st) { return st && st.slug === slug; }); }
  function setOf(list) { const s = {}; (Array.isArray(list) ? list : []).forEach(function (x) { if (typeof x === 'string') s[x] = true; }); return s; }
  /* 요약의 첫 문장(마침표·물음표·느낌표 뒤 공백이나 끝까지). "네."처럼 아주 짧으면 다음 문장까지. 없으면 빈 글자 */
  function firstSentence(t) {
    const s = String(t || '').trim();
    if (!s) return '';
    const re = /[\s\S]+?[.!?](?=\s|$)/g;
    let out = '', m;
    while ((m = re.exec(s))) {
      out = s.slice(0, re.lastIndex);
      if (out.length >= 6) break;
    }
    return out || s;
  }
  /* 요약을 문장으로(마침표·물음표·느낌표 뒤 공백이나 끝까지, 남은 꼬리도 한 문장) */
  function sentences(t) {
    const s = String(t || '').trim();
    const re = /[\s\S]+?[.!?](?=\s|$)/g;
    const out = [];
    let m, end = 0;
    while ((m = re.exec(s))) { out.push(m[0].trim()); end = re.lastIndex; }
    if (s.slice(end).trim()) out.push(s.slice(end).trim());
    return out;
  }
  /* 질문 아래 답 줄: 첫 문장(firstSentence) + 그 뒤의 균형·단서 문장(TURN_RE·KEEP_RE). 순서는 요약 그대로 */
  function answerOf(t) {
    const first = firstSentence(t);
    if (!first) return '';
    const ss = sentences(t);
    const out = [first];
    for (let i = sentences(first).length; i < ss.length; i++) if (TURN_RE.test(ss[i]) || KEEP_RE.test(ss[i])) out.push(ss[i]);
    return out.join(' ');
  }

  /* 이 글이 든 코스: ?course= 가 맞으면 그것(explicit), 아니면 역할에 맞는 코스 → 코스 순서. 읽은 정도로 고르지 않아요 */
  function courseFor(slug, courses, courseId, role) {
    const inC = (Array.isArray(courses) ? courses : []).filter(function (c) { return c && inCourse(c, slug); });
    if (!inC.length) return null;
    if (courseId) {
      const want = inC.filter(function (c) { return c.id === courseId; })[0];
      if (want) return { course: want, explicit: true };
    }
    const who = COURSE_WHO[normRole(role)] || [];
    const pref = inC.filter(function (c) { return who.indexOf(c.who) >= 0; })[0];
    return { course: pref || inC[0], explicit: false };
  }
  function courseNext(slug, c, by) {
    const st = stepsOf(c);
    let i = -1;
    st.forEach(function (x, j) { if (i < 0 && x && x.slug === slug) i = j; });
    for (let j = i + 1; j < st.length; j++) { const s = st[j] && st[j].slug; if (has(by, s)) return s; }
    return null;
  }
  /* groups.json: 배열 [{section, first, groups:[{title, slugs}]}] 또는 그 항목을 값으로 든 객체 */
  function groupList(slug, groups) {
    if (!groups || typeof groups !== 'object') return null;
    const secs = Array.isArray(groups) ? groups : (Array.isArray(groups.sections) ? groups.sections : Object.keys(groups).map(function (k) { return groups[k]; }));
    for (let i = 0; i < secs.length; i++) {
      const gs = secs[i] && Array.isArray(secs[i].groups) ? secs[i].groups : [];
      for (let j = 0; j < gs.length; j++) if (gs[j] && Array.isArray(gs[j].slugs) && gs[j].slugs.indexOf(slug) >= 0) return gs[j].slugs.slice();
    }
    return null;
  }
  function sectionList(cur, articles) {
    return articles.map(function (a, i) { return { a: a, i: i }; })
      .filter(function (x) { return x.a && String(x.a.section) === String(cur.section); })
      .sort(function (p, q) { const d = (Number(p.a.order) || 0) - (Number(q.a.order) || 0); return d || p.i - q.i; })
      .map(function (x) { return x.a.slug; });
  }
  /* 목록에서 이 글 다음 것들, 끝이면 앞으로 돌아감 */
  function around(list, slug) { const i = list.indexOf(slug); return i < 0 ? [] : list.slice(i + 1).concat(list.slice(0, i)); }
  /* 안정 정렬(같은 열쇠면 원래 순서) */
  function stable(list, key) {
    return list.map(function (x, i) { return { x: x, i: i, k: key(x) }; })
      .sort(function (p, q) { return p.k - q.k || p.i - q.i; })
      .map(function (y) { return y.x; });
  }

  function pickCore(o, role) {
    const res = { steps: [], faqs: [] };
    const articles = Array.isArray(o.articles) ? o.articles : [];
    const by = o.bySlug || indexBy(articles);
    const slug = o.slug;
    if (!has(by, slug)) return res;
    const cur = by[slug];
    const links = o.links && typeof o.links === 'object' ? o.links : {};
    const hand = o.hand && typeof o.hand === 'object' && has(o.hand, slug) ? o.hand[slug] : null;
    const seen = setOf(o.seen);
    const skip = setOf(o.skip);
    const used = {}; used[slug] = true;
    const cands = [], faqMore = [];
    function exists(s) { return has(by, s) && !skip[s]; }
    function cand(s, from, extra) {
      if (!exists(s) || s === slug) return;
      if (isFaq(by[s])) { faqMore.push(s); return; }
      cands.push({ slug: s, from: from, extra: extra || null });
    }

    const cf = courseFor(slug, o.courses, o.courseId ? String(o.courseId) : null, role);
    const cnext = cf ? courseNext(slug, cf.course, by) : null;
    /* ?course= 로 왔으면 코스 다음 글은 코어의 코스 안내가 보여 주니 여기서는 빼요 */
    if (cf && cf.explicit && cnext) skip[cnext] = true;
    /* 1) 손 지정: 역할 목록 → any */
    if (hand) {
      const lists = [];
      if (role && role !== 'curious' && Array.isArray(hand[role])) lists.push(hand[role]);
      if (Array.isArray(hand.any)) lists.push(hand.any);
      lists.forEach(function (l) { l.forEach(function (s) { cand(s, 'hand'); }); });
    }
    /* 2) 코스 다음 글 */
    if (cf && !cf.explicit && cnext) cand(cnext, 'course', { course: cf.course.id });
    /* 3) 본문이 링크한 글(가족·주변 사람이면 10·11 분류 먼저, 그 안의 순서는 그대로) */
    let outs = listOf(links.out, slug).filter(exists);
    if (role === 'family' || role === 'near') {
      outs = outs.filter(function (s) { return CARE_SECS.indexOf(String(by[s].section)) >= 0; })
        .concat(outs.filter(function (s) { return CARE_SECS.indexOf(String(by[s].section)) < 0; }));
    }
    outs.forEach(function (s) { cand(s, 'link'); });
    /* 4) 같은 묶음의 다음 글(없으면 같은 분류). 질문 글끼리 엮지 않도록 여기서 나온 질문 글은 건너뜀 */
    const grp = groupList(slug, o.groups);
    around(grp || sectionList(cur, articles), slug).forEach(function (s) {
      if (exists(s) && !isFaq(by[s])) cand(s, grp ? 'group' : 'section');
    });
    /* 고르기 순서(같은 열쇠면 원래 순서):
       손 지정(더 읽을 글에 없는 것 → 있는 것) → 자동 규칙(더 읽을 글에 없는 것 → 있는 것).
       지금 글이 폭력·응급 글이 아니면 자동 규칙의 폭력·응급 글(HEAVY)은 같은 칸(더 읽을 글에 있나 없나)의 다른 후보 뒤로 */
    const curHeavy = isHeavy(cur);
    const curStigma = tagged(cur, '낙인');
    function heavyAuto(c) { return !curHeavy && c.from !== 'hand' && isHeavy(by[c.slug]); }
    /* 낙인을 다루는 글 끝의 범죄·재판 글(CRIME)도 자동 규칙에서는 같은 칸의 다른 후보 뒤로(맨 앞에 두지 않음) */
    function crimeAuto(c) { return curStigma && !curHeavy && c.from !== 'hand' && CRIME.indexOf(c.slug) >= 0; }
    function backAuto(c) { return heavyAuto(c) || crimeAuto(c); }
    const order = stable(cands, function (c) {
      if (c.from === 'hand') return seen[c.slug] ? 1 : 0;
      /* 범죄·재판 글은 다른 후보 뒤, 폭력·응급 글보다는 앞 */
      return 2 + (seen[c.slug] ? 2 : 0) + (heavyAuto(c) ? 1 : crimeAuto(c) ? 0.5 : 0);
    });
    function take(c) {
      used[c.slug] = true;
      const it = { slug: c.slug, from: c.from };
      if (c.extra) Object.keys(c.extra).forEach(function (k) { it[k] = c.extra[k]; });
      res.steps.push(it);
    }
    /* 맨 앞 자리는 자동 규칙의 폭력·응급 글이 아닌 후보(더 읽을 글에 있는 것이라도)로.
       그다음부터 자동 규칙의 폭력·응급 글은 한 편까지만, 자리가 남으면(다른 후보가 없으면) 그때 더 써요 */
    const lead = order.filter(function (c) { return !backAuto(c); })[0];
    if (lead) take(lead);
    let heavyTaken = 0;
    const later = [];
    order.forEach(function (c) {
      if (used[c.slug] || res.steps.length >= MAX_STEPS) return;
      if (heavyAuto(c) && heavyTaken >= 1) { later.push(c); return; }
      if (heavyAuto(c)) heavyTaken++;
      take(c);
    });
    later.forEach(function (c) { if (!used[c.slug] && res.steps.length < MAX_STEPS) take(c); });
    /* 세 편(또는 고른 전부)이 위기·응급 글이면 마지막 자리를 바꿔요.
       위기·응급 글 끝에서는 회복·도움 글(HELP)을 먼저, 그 밖의 글 끝에서는 남은 후보 가운데 위기·응급 아닌 글을 먼저 */
    if (res.steps.length && res.steps.every(function (st) { return isAlarm(by[st.slug]); })) {
      const helps = HELP.filter(function (s) { return exists(s) && s !== slug && !used[s] && !isAlarm(by[s]) && !isFaq(by[s]); })
        .map(function (s) { return { slug: s, from: 'help' }; });
      const rest = order.filter(function (c) { return !used[c.slug] && !isAlarm(by[c.slug]); })
        .map(function (c) { const it = { slug: c.slug, from: c.from }; if (c.extra) Object.keys(c.extra).forEach(function (k) { it[k] = c.extra[k]; }); return it; });
      const h = (isAlarm(cur) ? helps.concat(rest) : rest.concat(helps))[0];
      if (h) {
        used[h.slug] = true;
        if (res.steps.length < MAX_STEPS) res.steps.push(h); else res.steps[res.steps.length - 1] = h;
      }
    }
    /* 관련 질문: 이 글을 링크한 질문 글 → 손 지정·본문 링크의 질문 글.
       폭력·응급 글이 아닌 글이면 폭력·분노 질문(FAQ_BACK_TAGS)을 다른 질문 뒤로,
       위기 글이면(입원을 다루는 위기 글도) 입원 질문을 맨 뒤로, "더 읽을 글"에 이미 있는 질문은 같은 칸의 뒤쪽으로 */
    const faqIn = listOf(links.in, slug).filter(function (s) { return exists(s) && isFaq(by[s]); });
    const crisis = tagged(cur, '위기');
    const uniq = [], fs = {};
    faqIn.concat(faqMore).forEach(function (s) { if (s !== slug && !fs[s]) { fs[s] = true; uniq.push(s); } });
    stable(uniq, function (s) {
      const admit = crisis && ADMIT_TAGS.some(function (t) { return tagged(by[s], t); });
      const back = !curHeavy && FAQ_BACK_TAGS.some(function (t) { return tagged(by[s], t); });
      return (admit ? 4 : back ? 2 : 0) + (seen[s] ? 1 : 0);
    }).forEach(function (s) { if (res.faqs.length < MAX_FAQ) res.faqs.push(s); });
    return res;
  }
  function slugsOf(r) { return r.steps.map(function (st) { return st.slug; }).concat(['|'], r.faqs); }

  /* 고르기(순수 함수). o = { slug, role, courseId, articles, bySlug?, courses, links:{out,in}, hand, groups, seen?, skip? }
     seen: 본문 끝 "더 읽을 글"에 이미 있는 글(뒤로 미룸), skip: 글 끝의 다른 안내가 이미 보여 주는 글(뺌)
     → { steps: [{ slug, from: 'course'|'hand'|'link'|'group'|'section'|'help', course? }], faqs: [slug], byRole }
     byRole: 고른 역할 때문에 결과가 실제로 달라졌는지(역할 없음으로 고른 결과와 비교). 화면 문구 "역할에 맞춰 골랐어요"의 근거 */
  function pick(o) {
    o = o || {};
    const role = normRole(o.role);
    const res = pickCore(o, role);
    res.byRole = !!role && JSON.stringify(slugsOf(res)) !== JSON.stringify(slugsOf(pickCore(o, null)));
    return res;
  }

  const core = { ROLES: ROLES.slice(), HELP: HELP.slice(), HEAVY: HEAVY.slice(), CRIME: CRIME.slice(), normRole: normRole, courseFor: courseFor,
    firstSentence: firstSentence, answerOf: answerOf, quiet: quiet, isAlarm: isAlarm, isHeavy: isHeavy, pick: pick };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  /* ---------- 브라우저 ---------- */
  if (!root.JHB || !root.JHB.app) return;
  const A = root.JHB.app, el = A.el;
  /* 손 지정표를 기다리는 시간. 넘기면 표 없이 먼저 그리고, 표가 나중에 오면 블록이 화면 밖일 때 한 번 다시 그려요 */
  const WAIT = 1200;
  let curSlug = null, token = 0, watcher = null;
  /* groups.json 은 그 자료를 쓰는 분류 소묶음 모듈(hub)이나 그 자료를 선언한 화면(둘러보기 등)이 있을 때만 받아요
     (없는 파일을 받으려다 404 가 콘솔에 남지 않게). 받은 자료는 앱이 한 번만 받아 함께 써요 */
  function hasGroups() {
    if (root.JHB.ui && root.JHB.ui.hub) return true;
    return (A.pages || []).some(function (p) { return p && Array.isArray(p.data) && p.data.indexOf('groups') >= 0; });
  }

  /* 첫 화면과 같은 역할: 첫 화면 모듈(JHB.ui.home.role)이 있으면 그 값(기록 쉼 중에는 이 탭에서 고른 역할이 먼저),
     없으면 코어 homeRole 과 같은 순서로 직접 읽어요. 이 모듈은 역할을 저장하지 않아요 */
  function role() {
    const H = root.JHB.ui && root.JHB.ui.home;
    if (H && typeof H.role === 'function') { try { return normRole(H.role()); } catch (e) { } }
    if (A.privacy && typeof A.privacy.paused === 'function' && A.privacy.paused()) {
      try { const raw = sessionStorage.getItem(ROLE_KEY); const v = raw == null ? null : normRole(JSON.parse(raw)); if (v) return v; } catch (e) { }
    }
    return normRole(A.store.get(ROLE_KEY, null));
  }
  /* 자료를 끝까지 기다리는 프라미스(못 받으면 null) */
  function load(name) {
    if (typeof A.loadData !== 'function') return Promise.resolve(null);
    return A.loadData(name).then(function (v) { return v || null; }, function () { return null; });
  }
  /* 늦으면 null 로 먼저 풀리는 프라미스. timedOut() 으로 시간이 먼저 지났는지 알 수 있어요 */
  function withWait(p, ms) {
    let late = false;
    const q = new Promise(function (resolve) {
      const t = setTimeout(function () { late = true; resolve(null); }, ms);
      p.then(function (v) { clearTimeout(t); resolve(v); });
    });
    q.timedOut = function () { return late; };
    return q;
  }
  function courseById(id) { return (A.courses || []).filter(function (c) { return c && c.id === id; })[0] || null; }
  function link(h) { return typeof A.L === 'function' ? A.L(h) : h; }
  function slugFromHref(h) {
    const m = /(?:^|[#/])a\/([a-z0-9][a-z0-9-]*)/.exec(String(h || ''));
    return m ? m[1] : null;
  }
  /* 본문 끝 "더 읽을 글" 소절의 글 링크(바로 위 목록과 겹치지 않게 뒤로 미룰 것) */
  function readMoreSlugs() {
    const body = document.querySelector('#app article.doc .body');
    if (!body) return [];
    const hs = Array.prototype.slice.call(body.querySelectorAll('h2'));
    let h = null;
    hs.forEach(function (x) { if ((x.textContent || '').replace(/\s+/g, ' ').trim() === '더 읽을 글') h = x; });
    if (!h) return [];
    const nextH = hs[hs.indexOf(h) + 1] || null;
    const out = [];
    Array.prototype.forEach.call(body.querySelectorAll('a[href]'), function (a) {
      if (!(h.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      if (nextH && !(a.compareDocumentPosition(nextH) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      const s = slugFromHref(a.getAttribute('href'));
      if (s && out.indexOf(s) < 0) out.push(s);
    });
    return out;
  }
  /* 코어의 코스 안내(.course-nav)가 이미 보여 주는 다음 글 */
  function courseNavSlugs() {
    const nav = document.querySelector('#app article.doc .course-nav');
    if (!nav) return [];
    return Array.prototype.map.call(nav.querySelectorAll('a[href]'), function (a) { return slugFromHref(a.getAttribute('href')); })
      .filter(function (s) { return !!s; });
  }

  function item(st, i, curSlug) {
    const a = A.bySlug[st.slug], s = A.secById[a.section] || {};
    const c = st.course ? courseById(st.course) : null;
    const meta = [s.title || ''];
    if (c) meta.push('‘' + c.title + '’ 코스의 다음 글');
    /* 폭력·응급 글이 아닌 글 끝에서는 자살·자해·폭력 같은 말이 든 요약을 늘어놓지 않고 제목만 보여요 */
    const sum = a.summary && !quiet(a, A.bySlug[curSlug]) ? a.summary : '';
    const ids = { t: 'ns-t-' + i, s: 'ns-s-' + i, m: 'ns-m-' + i };
    return el('li', null, [el('a.ns-a', { href: link('#/a/' + st.slug), 'aria-labelledby': ids.t, 'aria-describedby': (sum ? ids.s + ' ' : '') + ids.m }, [
      A.spine(s),
      el('span.ns-tx', null, [
        el('span.ns-t', { id: ids.t }, [a.title]),
        sum ? el('span.ns-s', { id: ids.s }, [sum]) : null,
        el('span.ns-m', { id: ids.m }, [meta.join(' · ')])
      ])
    ])]);
  }
  function foot(res) {
    const r = role();
    const me = !!(A.pageById && A.pageById.me);
    /* 역할 이름은 쓰지 않아요(같은 기기를 쓰는 사람에게 읽는 사람의 처지가 드러나지 않게) */
    const line = !r ? '당사자·가족·주변 사람에 맞춰 고를 수도 있어요'
      : res.byRole ? '정해 둔 역할에 맞춰 골랐어요'
        : '이 글은 역할과 상관없이 골랐어요';
    return el('div.ns-foot', null, [
      el('p.ns-role', null, [
        line,
        el('span.ns-dot', { 'aria-hidden': 'true' }, [' · ']),
        el('a.ns-change', { href: link(me ? '#/me' : '#/'), 'aria-label': (r ? '역할 바꾸기' : '역할 정하기') + (me ? ', 내 서재로 가요' : ', 첫 화면으로 가요') }, [r ? '바꾸기' : '정하기'])
      ]),
      el('p.ns-why', null, ['이 글과 이어진 글·읽기 코스에서 골랐어요. 읽은 기록은 쓰지 않아요. 읽은 기록과 역할은 이 기기에만 있어요.'])
    ]);
  }
  function stepsBox(res, slug) {
    return el('section.ns', { 'aria-labelledby': 'ns-h' }, [
      el('h2.ns-h', { id: 'ns-h', tabindex: '-1' }, ['다음 걸음']),
      el('ul.ns-list', null, res.steps.map(function (st, i) { return item(st, i, slug); })),
      foot(res)
    ]);
  }
  function faqBox(faqs) {
    return el('section.ns-faq', { 'aria-labelledby': 'ns-fh' }, [
      el('h2.ns-h', { id: 'ns-fh', tabindex: '-1' }, ['이 주제의 자주 묻는 질문']),
      el('ul.ns-qs', null, faqs.map(function (s, i) {
        const a = A.bySlug[s];
        const ans = answerOf(a.summary);
        const tid = 'ns-qt-' + i, aid = 'ns-qa-' + i;
        return el('li', null, [el('a.ns-q', { href: link('#/a/' + s), 'aria-labelledby': tid, 'aria-describedby': ans ? aid : null }, [
          el('span.ns-qm', { 'aria-hidden': 'true' }, ['Q']),
          el('span.ns-qx', null, [
            el('span.ns-qt', { id: tid }, [a.title]),
            ans ? el('span.ns-qa', { id: aid }, [ans]) : null
          ])
        ])]);
      }))
    ]);
  }
  /* 블록 안에 있던 포커스를 다시 그린 뒤 같은 자리(같은 종류의 몇 번째)로 돌려줘요 */
  const FOCUSABLE = ['ns-a', 'ns-q', 'ns-change', 'ns-h'];
  function focusSpot(wrap) {
    const ae = document.activeElement;
    if (!wrap || !ae || !wrap.contains(ae)) return null;
    const cls = FOCUSABLE.filter(function (c) { return ae.classList && ae.classList.contains(c); })[0];
    if (!cls) return { cls: 'ns-h', i: 0 };
    return { cls: cls, i: Array.prototype.indexOf.call(wrap.querySelectorAll('.' + cls), ae) };
  }
  function restoreFocus(wrap, spot) {
    if (!spot) return;
    const list = wrap ? wrap.querySelectorAll('.' + spot.cls) : [];
    const t = list[Math.max(0, Math.min(spot.i, list.length - 1))] || (wrap && wrap.querySelector('.ns-h')) || null;
    if (t) { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
  }
  function draw(res, slug) {
    const slot = A.slot('after-body');
    if (!slot) return;
    const old = slot.querySelector('.ns-wrap');
    const spot = focusSpot(old);
    if (old) old.parentNode.removeChild(old);
    if (!res.steps.length && !res.faqs.length) {
      if (spot) { const h = document.querySelector('#app article.doc h1'); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } } }
      window.dispatchEvent(new Event('jhb:layout'));
      return;
    }
    const wrap = el('div.ns-wrap', null, [res.steps.length ? stepsBox(res, slug) : null, res.faqs.length ? faqBox(res.faqs) : null]);
    A.mount('after-body', wrap, 10);
    restoreFocus(wrap, spot);
  }

  /* 블록이 화면에 보이지 않고 포커스도 안에 없을 때 fn 을 한 번 불러요(보고 있는 중에 바뀌어 흔들리지 않게) */
  function whenUnseen(fn) {
    if (watcher) { watcher.disconnect(); watcher = null; }
    const slot = A.slot('after-body');
    const wrap = slot && slot.querySelector('.ns-wrap');
    function idle() {
      if (!wrap || !wrap.isConnected) return true;
      if (wrap.contains(document.activeElement)) return false;
      const r = wrap.getBoundingClientRect();
      return r.bottom <= 0 || r.top >= (window.innerHeight || document.documentElement.clientHeight);
    }
    if (idle()) { fn(); return; }
    if (typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) return;
      if (wrap.contains(document.activeElement)) return;
      io.disconnect();
      if (watcher === io) watcher = null;
      fn();
    });
    watcher = io;
    io.observe(wrap);
  }

  /* "이 문서를 가리키는 문서": 지우지 않고 접힌 <details> 로 감싼다(소제목은 summary 안으로) */
  function foldBacklinks() {
    const sec = document.querySelector('#app article.doc .backlinks');
    if (!sec || !sec.parentNode || sec.parentNode.classList.contains('ns-fold')) return;
    const h = sec.querySelector('h2');
    const sum = el('summary.ns-fold-s');
    if (h) { h.classList.add('ns-fold-h'); sum.appendChild(h); } else sum.appendChild(document.createTextNode('이 문서를 가리키는 문서'));
    const det = el('details.ns-fold', null, [sum]);
    sec.parentNode.insertBefore(det, sec);
    det.appendChild(sec);
    det.addEventListener('toggle', function () { window.dispatchEvent(new Event('jhb:layout')); });
  }

  function refresh() {
    const w = A.where();
    if (w.path[0] !== 'a' || !w.path[1] || !A.slot('after-body')) return;
    const slug = w.path[1];
    curSlug = slug;
    if (watcher) { watcher.disconnect(); watcher = null; }
    foldBacklinks();
    const my = ++token;
    function live() { return my === token && curSlug === slug && !!A.slot('after-body'); }
    function build(hand) {
      const input = { slug: slug, role: role(), courseId: w.query && w.query.course, articles: A.articles, bySlug: A.bySlug, courses: A.courses, links: A.links,
        hand: hand, groups: null, seen: readMoreSlugs(), skip: courseNavSlugs() };
      const res = pick(input);
      /* 묶음은 마지막 단계에서만 쓰니, 분류 순서로 채운 자리가 있을 때만 groups.json 을 받아 다시 고름(대부분의 글은 받지 않음) */
      if (!hasGroups() || !res.steps.some(function (st) { return st.from === 'section'; })) { draw(res, slug); return; }
      withWait(load('groups'), WAIT).then(function (g) {
        if (!live()) return;
        input.groups = g;
        draw(g ? pick(input) : res, slug);
      });
    }
    const full = load('nextsteps');
    const first = withWait(full, WAIT);
    first.then(function (hand) { if (live()) build(hand); });
    /* 표가 늦게 왔으면(시간이 먼저 지남) 블록이 화면 밖일 때 표를 넣어 한 번 다시 그려요 */
    full.then(function (hand) {
      if (!hand) return;
      first.then(function () {
        if (!first.timedOut() || !live()) return;
        whenUnseen(function () { if (live()) build(hand); });
      });
    });
  }

  window.addEventListener('jhb:article', refresh);
  window.addEventListener('jhb:page', function (e) {
    const d = e.detail || {};
    if (d.loading) return;
    if (d.kind !== 'a') { curSlug = null; token++; if (watcher) { watcher.disconnect(); watcher = null; } }
  });
  /* 역할을 지우거나(내 서재) 다른 탭에서 바꾸거나 저장소를 통째로 비우면(key 가 null) 다시 고름 */
  window.addEventListener('jhb:privacy', function () { if (curSlug) refresh(); });
  window.addEventListener('storage', function (e) { if ((e.key === ROLE_KEY || e.key === null) && curSlug) refresh(); });
  /* 모듈이 늦게 실행돼 첫 jhb:article 을 놓친 경우 */
  refresh();

  root.JHB.ui = root.JHB.ui || {};
  root.JHB.ui.nextsteps = { pick: pick, refresh: refresh, role: role };
})(typeof window !== 'undefined' ? window : this);

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/nowhelp.js ===== */
(function () { try {
/* js/ui/nowhelp.js — 상단 "지금 도움"(#btn-help)을 누르면 뜨는 시트(대화상자)
   - 내용의 원천은 data/crisis-card.js(JHB.crisisCard) 하나예요. 번호를 이 파일에 다시 적지 않아요.
     전화: high 카드의 tel: 항목(109 · 1577-0199 · 119). 글: 카드에 있는 글 가운데 LINK_ORDER 순서로.
   - "전화가 어렵다면"은 글 crisis-hotlines 의 해당 소절로 가는 링크만(연결 방법은 글이 말해요).
   - 휴대폰(좁은 화면·터치)은 번호 줄 전체가 tel: 링크, 넓은 화면은 번호를 크게(링크 아님) + "번호 복사".
   - 전화가 저절로 걸리는 길은 없어요: 열 때 첫 포커스는 제목, Enter·단축키로 tel: 에 가지 않음,
     시트를 연 직후(GUARD_MS)의 포인터 누름과 시트 밖에서 시작한 누름은 시트 안 링크를 따르지 않음(급한 두 번 누름).
   - 열린 동안 뒤 화면은 inert + 스크롤 잠금. 휴대폰 뒤로 가기는 시트만 닫아요(history 항목 하나, 주소는 그대로).
   - 가운데·Ctrl·Shift·Alt·Meta 클릭, 자바스크립트가 없으면 원래 링크(위기 상담 전화 글)대로 가요.
   - 연 기록을 저장하지 않아요(저장소를 쓰지 않음).
   - "전화가 어렵다면"은 a/crisis-hotlines/#h-N 주소로 가요. 소절을 펴고 옮기는 일은 코어가 해요(이 모듈에는 그 처리가 없어요).
   공개: JHB.ui.nowhelp = { open(from?), close(), isOpen() }
   node: module.exports = 순수 함수(tests/nowhelp.test.cjs) */
(function (root) {
  'use strict';
  /* 시트에 보일 글(카드에 있을 때만, 이 순서로) */
  const LINK_ORDER = ['crisis-hotlines', 'suicide-warning-signs', 'emergency-response'];
  const ALT_SLUG = 'crisis-hotlines';
  /* crisis-hotlines 의 "전화 말고 글로 하고 싶다면" 같은 소절 제목(콘텐츠 계약: tests/nowhelp.test.cjs) */
  const ALT_RE = /전화가 어렵|전화 말고|글로|문자|채팅|SNS/;
  const LEVELS = ['high', 'watch', 'harm'];
  /* 시트를 연 뒤 이 시간 안의 포인터 누름은 시트 안 링크(특히 tel:)를 따르지 않는다 */
  const GUARD_MS = 600;

  /* { label: '109 자살예방상담 (24시간)', href: 'tel:109' } → { num, name, note, href } (전화가 아니면 null) */
  function parseTel(a) {
    if (!a || typeof a.href !== 'string' || a.href.indexOf('tel:') !== 0) return null;
    const num = a.href.slice(4).trim();
    if (!num) return null;
    let name = String(a.label || '').trim(), note = '';
    const m = /\(([^()]*)\)\s*$/.exec(name);
    if (m) { note = m[1].trim(); name = name.slice(0, m.index).trim(); }
    if (name.indexOf(num) === 0) name = name.slice(num.length).trim();
    return { num: num, name: name, note: note, href: 'tel:' + num };
  }
  function actionsOf(card, k) { return card && card[k] && Array.isArray(card[k].actions) ? card[k].actions : []; }
  /* 카드 → { tels: [...], links: [{ slug, label, href }] }. exists(slug) 가 false 인 글은 뺀다 */
  function pickSheet(card, exists) {
    const out = { tels: [], links: [] };
    if (!card || typeof card !== 'object') return out;
    let tels = actionsOf(card, 'high').map(parseTel).filter(Boolean);
    if (!tels.length) LEVELS.forEach(function (k) { tels = tels.concat(actionsOf(card, k).map(parseTel).filter(Boolean)); });
    const seen = {};
    tels.forEach(function (t) { if (!seen[t.num]) { seen[t.num] = 1; out.tels.push(t); } });
    const found = {};
    LEVELS.forEach(function (k) {
      actionsOf(card, k).forEach(function (a) {
        const m = /^#\/a\/([a-z0-9-]+)$/.exec((a && a.href) || '');
        if (m && !Object.prototype.hasOwnProperty.call(found, m[1])) found[m[1]] = String(a.label || '');
      });
    });
    LINK_ORDER.forEach(function (slug) {
      if (!Object.prototype.hasOwnProperty.call(found, slug)) return;
      if (typeof exists === 'function' && !exists(slug)) return;
      out.links.push({ slug: slug, label: found[slug], href: '#/a/' + slug });
    });
    return out;
  }
  /* 글 차례([{id, text, level}])에서 "전화가 어렵다면"에 맞는 h2 소절 id */
  function findAltSection(toc) {
    if (!Array.isArray(toc)) return null;
    for (let i = 0; i < toc.length; i++) {
      const t = toc[i];
      if (t && t.level === 2 && ALT_RE.test(String(t.text || ''))) return t.id || null;
    }
    return null;
  }
  /* 시트로 가로챌 클릭: 왼쪽 버튼(키보드 Enter 포함), 보조키 없음, 아직 처리되지 않음 */
  function isPlainClick(e) {
    if (!e || e.defaultPrevented) return false;
    if (e.button !== undefined && e.button !== 0) return false;
    return !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey);
  }
  /* 시트 안 링크 클릭을 막을지: 포인터 클릭(detail>0)인데 시트 안에서 시작하지 않았거나(armed=false) 연 지 GUARD_MS 가 안 됐으면.
     키보드 Enter·스크린리더 활성화(detail 0)는 그대로 둔다 */
  function linkGuard(e, st) {
    if (!e || !(e.detail > 0)) return false;
    return !(st && st.armed) || !(st.sinceOpen >= GUARD_MS);
  }
  /* jhb:page 가 오면 닫을지: 주소가 열 때와 달라졌을 때만(같은 주소의 첫 그리기·다시 그리기로는 닫지 않음) */
  function closeOnPage(detail, openPath, nowPath) {
    if (!detail || detail.loading) return false;
    return openPath !== nowPath;
  }
  /* '#h-3' → 'h-3', 그 밖은 null */
  function sectionHash(h) {
    const m = /^#(h-\d+)$/.exec(String(h || ''));
    return m ? m[1] : null;
  }
  /* 시트 바닥의 "번호는 ○○에 확인한 내용이에요"에 쓰는 날: 글을 고친 날(updated)이 아니라 출처 확인일(reviewed).
     확인일이 없으면 날짜 문구를 붙이지 않는다(고친 날을 확인한 날처럼 말하지 않으려고) */
  function footDay(art) { return art && typeof art.reviewed === 'string' ? art.reviewed : ''; }
  const pure = { parseTel: parseTel, pickSheet: pickSheet, findAltSection: findAltSection, isPlainClick: isPlainClick, linkGuard: linkGuard, closeOnPage: closeOnPage, sectionHash: sectionHash, footDay: footDay, LINK_ORDER: LINK_ORDER, GUARD_MS: GUARD_MS };
  if (typeof module !== 'undefined' && module.exports) { module.exports = pure; return; }

  /* ================= 브라우저 ================= */
  const JHB = root.JHB;
  if (!JHB || !JHB.app) return;
  const A = JHB.app, el = A.el;
  const NARROW = 760;
  const btn = document.getElementById('btn-help');
  /* 열린 동안 inert 로 둘 뒤 화면(라이브 영역 #live 는 body 바로 아래라 여기에 들지 않음) */
  const BG = '.skip, header.topbar, .shell, footer.sitefoot, .mb-bar';
  let scrim = null, sheet = null, titleEl = null, body = null;
  let opener = null, isOpen = false, phoneMode = null, altId = null, altP = null, altKick = null;
  let openedAt = 0, armed = false, openPath = '', locked = [], pushed = false, ignorePop = 0;

  function data() {
    return pickSheet(JHB.crisisCard, function (s) { return !!(A.bySlug && A.bySlug[s]); });
  }
  function isPhone() {
    if (innerWidth <= NARROW) return true;
    return !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);
  }
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function svg(path) { return el('span.nh-ic', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>' }); }
  const ICON = {
    phone: '<path d="M6.6 3.5h2.6l1.5 4-2 1.4a11 11 0 0 0 6.4 6.4l1.4-2 4 1.5v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>',
    arrow: '<path d="M9 6l6 6-6 6"/>'
  };

  function build() {
    if (sheet) return;
    scrim = el('div.nh-scrim', { hidden: true });
    titleEl = el('h2.nh-title', { id: 'nh-title', tabindex: '-1' }, ['지금 도움이 필요하다면']);
    const x = el('button.nh-x', { type: 'button', 'aria-label': '닫기' }, [el('span', { 'aria-hidden': 'true' }, ['×'])]);
    body = el('div.nh-body');
    sheet = el('section.nh-sheet', { id: 'nh-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'nh-title', 'aria-describedby': 'nh-lead', hidden: true },
      [el('div.nh-head', null, [titleEl, x]), body]);
    document.body.appendChild(scrim); document.body.appendChild(sheet);
    x.addEventListener('click', function () { close(true); });
    /* 연 직후의 누름(입구를 두 번 누름)으로 바로 닫히지 않게 */
    scrim.addEventListener('click', function (e) { if (e.detail > 0 && now() - openedAt < GUARD_MS) return; close(true); });
    sheet.addEventListener('keydown', trap);
    /* 시트 안에서 시작한 누름만 링크를 따른다 */
    sheet.addEventListener('pointerdown', function () { armed = true; }, true);
    sheet.addEventListener('click', onSheetClick, true);
  }
  function onSheetClick(e) {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (linkGuard(e, { armed: armed, sinceOpen: now() - openedAt })) { e.preventDefault(); e.stopPropagation(); return; }
    const href = a.getAttribute('href');
    if (href.indexOf('tel:') === 0 || !isPlainClick(e)) return; /* 전화는 시트를 열어 둔다. 새 탭·창은 브라우저대로 */
    e.preventDefault();
    if (a.parentNode && a.parentNode.classList && a.parentNode.classList.contains('nh-alt') && !altId) {
      /* 소절 id 를 아직 못 찾았으면 잠깐(최대 1.2초) 기다렸다가 간다. 못 찾으면 글 첫머리로 */
      let gone = false;
      const go = function () { if (gone) return; gone = true; leave(altHref()); };
      ensureAlt(true).then(go); setTimeout(go, 1200);
      return;
    }
    leave(a.href);
  }
  /* 시트에서 글로 갈 때: 시트용 history 항목을 새 화면으로 바꿔 끼운다(뒤로 가기 한 번이면 원래 화면) */
  function leave(url) {
    const p = pushed; pushed = false;
    close(false, true);
    if (p) location.replace(url); else location.assign(url);
  }

  function telRow(t, phone) {
    const label = t.num + ' ' + (t.name || '') + (t.note ? ', ' + t.note : '');
    if (phone) {
      return el('li.nh-tel', null, [el('a.nh-call', { href: t.href, 'aria-label': label + '. 전화 걸기' }, [
        svg(ICON.phone),
        el('span.nh-what', null, [el('span.nh-name', null, [t.name || t.num]), t.note ? el('span.nh-note', null, [t.note]) : null]),
        el('span.nh-num', null, [t.num])
      ])]);
    }
    /* 넓은 화면: 번호는 크게 보이기만(링크 아님). 전화 연결 앱이 있는 PC 에서 눌러서 바로 걸리지 않게 */
    const copyBtn = el('button.nh-copy', { type: 'button', 'aria-label': t.num + ' 번호 복사' }, ['번호 복사']);
    copyBtn.addEventListener('click', function () { copyNum(t.num, copyBtn); });
    return el('li.nh-tel.nh-wide', null, [
      el('span.nh-what', null, [el('span.nh-name', null, [t.name || t.num]), t.note ? el('span.nh-note', null, [t.note]) : null]),
      el('span.nh-num', null, [t.num]),
      copyBtn
    ]);
  }
  function linkRow(href, text, sub) {
    return el('li', null, [el('a.nh-link', { href: href }, [el('span.nh-lt', null, [text, sub ? el('span.nh-ls', null, [sub]) : null]), svg(ICON.arrow)])]);
  }
  function altHref() { return A.L('#/a/' + ALT_SLUG) + (altId ? '#' + altId : ''); }
  /* 시트 맨 아래 작은 고지: 일반 정보 · AI 초안 · 감수 없음, 번호를 확인한 날(위기 상담 전화 글의 확인일) */
  function footText() {
    const art = A.bySlug && A.bySlug[ALT_SLUG];
    let dated = '';
    const day = footDay(art);
    if (day && A.md && A.md.noticeHtml) {
      const t = document.createElement('template'); t.innerHTML = A.md.noticeHtml('dated', day);
      const s = t.content.textContent.trim();
      if (s) dated = '번호는 ' + s;
    }
    return '일반 정보예요. 진단과 치료는 담당 의사와 상의해 주세요. AI가 공개 자료로 초안을 썼고 전문가 감수는 받지 않았어요.' + (dated ? ' ' + dated : '');
  }
  function fill() {
    const d = data();
    phoneMode = isPhone();
    sheet.classList.toggle('nh-phone', phoneMode);
    body.textContent = '';
    body.appendChild(el('p.nh-lead', { id: 'nh-lead' }, [phoneMode
      ? '혼자 견디지 않아도 괜찮아요. 번호를 누르면 전화 앱이 열려요.'
      : '혼자 견디지 않아도 괜찮아요. 번호를 휴대폰으로 걸거나 복사해 두세요.']));
    body.appendChild(el('ul.nh-tels', { 'aria-label': '전화' }, d.tels.map(function (t) { return telRow(t, phoneMode); })));
    const links = [];
    if (A.bySlug && A.bySlug[ALT_SLUG]) {
      const alt = linkRow(altHref(), '전화가 어렵다면', '글로 상담하는 곳 안내');
      alt.classList.add('nh-alt');
      links.push(alt);
    }
    d.links.forEach(function (l) { links.push(linkRow(A.L(l.href), l.label || (A.bySlug[l.slug] || {}).title || l.slug)); });
    const guide = A.pageById && A.pageById.guide;
    if (guide) links.push(linkRow(A.L('#/guide'), guide.title || guide.label || '상황별 길잡이'));
    if (links.length) body.appendChild(el('ul.nh-links', { 'aria-label': '더 읽을 곳' }, links));
    body.appendChild(el('p.nh-foot', null, [footText()]));
  }
  /* "전화가 어렵다면" 소절 id: 글 원문을 받아(앱 캐시) 차례에서 찾는다. 못 찾으면 글 첫머리로.
     실패(오프라인 등)하면 다음에 다시 시도한다. soon=true 면 한가할 때를 기다리지 않고 곧바로 */
  function ensureAlt(soon) {
    if (altId) return Promise.resolve(altId);
    if (!A.loadArticle || !A.md || !A.md.render || !(A.bySlug && A.bySlug[ALT_SLUG])) return Promise.resolve(null);
    if (altP) { if (soon && altKick) altKick(); return altP; }
    altP = new Promise(function (res) {
      let started = false;
      function run() {
        if (started) return; started = true; altKick = null;
        A.loadArticle(ALT_SLUG).then(function (doc) {
          let id = null;
          try { id = findAltSection(A.md.render(doc.body).toc); } catch (e) { id = null; }
          altId = id;
          if (altId && sheet) { const a = sheet.querySelector('.nh-alt a'); if (a) a.setAttribute('href', altHref()); }
          res(altId);
        }, function () { altP = null; res(null); });
      }
      altKick = run;
      if (soon) run();
      /* 시트가 뜨는 동안 느린 기기를 붙잡지 않게, 한가할 때 받아 그린다 */
      else if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1500 });
      else setTimeout(run, 300);
    });
    return altP;
  }

  /* ---------- 뒤 화면 잠금 ---------- */
  function lockBg() {
    unlockBg();
    Array.prototype.forEach.call(document.querySelectorAll(BG), function (n) {
      if (n === sheet || n === scrim) return;
      locked.push([n, !!n.inert]); n.inert = true;
    });
    const de = document.documentElement;
    if (innerWidth - de.clientWidth > 0) de.classList.add('nh-gutter');
    de.classList.add('nh-lock');
  }
  function unlockBg() {
    locked.forEach(function (p) { p[0].inert = p[1]; });
    locked = [];
    document.documentElement.classList.remove('nh-lock', 'nh-gutter');
  }

  /* ---------- 열고 닫기 ---------- */
  function open(from) {
    if (!data().tels.length) return false;
    build();
    if (isOpen) { titleEl.focus({ preventScroll: true }); return true; }
    /* 휴대폰 차례·용어 시트가 열려 있으면 먼저 조용히 닫는다(시트가 두 겹으로 뜨지 않게) */
    const ms = document.querySelector('.mb-sheet:not([hidden])');
    if (from && ms && ms.contains(from)) from = btn;
    if (ms && JHB.ui && JHB.ui.mobile && JHB.ui.mobile.close) JHB.ui.mobile.close(false);
    opener = from && from.focus ? from : document.activeElement;
    if (opener && ms && ms.contains(opener)) opener = btn;
    fill();
    isOpen = true; openedAt = now(); armed = false; openPath = location.pathname;
    sheet.classList.toggle('nh-anim', !(A.reducedMotion && A.reducedMotion()));
    scrim.hidden = false; sheet.hidden = false;
    lockBg();
    if (btn) btn.setAttribute('aria-expanded', 'true');
    /* 휴대폰 뒤로 가기가 시트만 닫게(주소·제목은 그대로, 지금 history.state 는 보존) */
    try {
      const st = history.state;
      history.pushState(st && typeof st === 'object' ? Object.assign({}, st, { nh: 1 }) : { nh: 1 }, '');
      pushed = true;
    } catch (x) { pushed = false; }
    titleEl.focus({ preventScroll: true });
    ensureAlt(false);
    return true;
  }
  /* fromHistory: 뒤로 가기(popstate)나 화면 이동으로 닫힐 때(시트용 history 항목을 따로 지우지 않음) */
  function close(refocus, fromHistory) {
    if (!isOpen) return;
    isOpen = false;
    sheet.hidden = true; scrim.hidden = true;
    unlockBg();
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (pushed && !fromHistory) { pushed = false; ignorePop++; history.back(); }
    pushed = false;
    const back = opener; opener = null;
    if (refocus && back && back !== document.body && document.contains(back) && typeof back.focus === 'function') back.focus({ preventScroll: true });
  }
  window.addEventListener('popstate', function () {
    if (ignorePop > 0) { ignorePop--; return; }
    if (isOpen && pushed) { pushed = false; close(true, true); }
  });
  function focusables() {
    return Array.prototype.filter.call(sheet.querySelectorAll('a[href], button:not([disabled])'), function (n) { return n.offsetParent !== null || n.getClientRects().length; });
  }
  function trap(e) {
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1], cur = document.activeElement;
    if (e.shiftKey && (cur === first || cur === titleEl || !sheet.contains(cur))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (cur === last || !sheet.contains(cur))) { e.preventDefault(); first.focus(); }
  }
  /* 열린 동안: Esc 는 시트만 닫고(서랍·팝오버까지 닫지 않게), 팔레트 단축키(Ctrl+K, /)는 막는다(브라우저 기본 동작도) */
  window.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) e.stopPropagation();
  }, true);
  /* 포커스가 시트 밖으로 새면 제목으로 되돌린다 */
  document.addEventListener('focusin', function (e) { if (isOpen && sheet && !sheet.contains(e.target)) titleEl.focus({ preventScroll: true }); });
  window.addEventListener('resize', function () {
    if (!isOpen || isPhone() === phoneMode) return;
    fill(); titleEl.focus({ preventScroll: true });
  });
  /* 같은 주소에서 오는 jhb:page(느린 연결에서 앱이 글을 처음 다 그린 때 등)로는 닫지 않는다 */
  window.addEventListener('jhb:page', function (e) {
    if (isOpen && closeOnPage(e.detail, openPath, location.pathname)) close(true, true);
  });

  /* ---------- 번호 복사 ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      const ta = el('textarea.nh-ghost', { readonly: '', 'aria-hidden': 'true', tabindex: '-1' });
      ta.value = text; sheet.appendChild(ta); ta.select();
      let done = false; try { done = document.execCommand('copy'); } catch (x) { done = false; }
      ta.remove();
      if (done) res(); else rej(new Error('copy'));
    });
  }
  function copyNum(num, b) {
    copyText(num).then(function () {
      b.textContent = '복사했어요'; b.classList.add('nh-done');
      A.announce(num + ' 번호를 복사했어요');
    }, function () {
      b.textContent = '복사하지 못했어요'; b.classList.remove('nh-done');
      A.announce('복사하지 못했어요. ' + num + ' 번호를 직접 적어 주세요');
    }).then(function () {
      if (document.activeElement !== b && sheet.contains(b)) b.focus({ preventScroll: true });
      setTimeout(function () { b.textContent = '번호 복사'; b.classList.remove('nh-done'); }, 2200);
    });
  }

  /* ---------- 상단 "지금 도움" 링크 ---------- */
  if (btn) {
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-controls', 'nh-sheet');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function (e) {
      if (!isPlainClick(e)) return;
      /* 다른 모듈이 .click() 으로 부르면 그 모듈의 버튼으로 포커스를 돌려준다 */
      const from = e.isTrusted ? btn : (document.activeElement && document.activeElement !== document.body ? document.activeElement : btn);
      if (isOpen) { e.preventDefault(); close(true); return; }
      if (open(from)) e.preventDefault();
    });
    /* 누를 낌새가 보이면(마우스를 올림·포커스·터치 시작) 소절 id 를 한가할 때 미리 찾아 둔다 */
    const warm = function () { ensureAlt(false); };
    btn.addEventListener('pointerenter', warm, { once: true });
    btn.addEventListener('focus', warm, { once: true });
    btn.addEventListener('touchstart', warm, { once: true, passive: true });
  }

  /* 글 주소의 #소절(a/<slug>/#h-N, 같은 문서 안의 #h-N 바뀜)은 코어가 펴고 옮겨요(js/app.js 의 scrollToHash,
     reading 모듈은 해시가 있으면 읽던 자리를 되살리지 않음). 이 모듈은 "전화가 어렵다면" 링크에 그 주소를 달기만 해요 */

  JHB.ui = JHB.ui || {};
  JHB.ui.nowhelp = { open: function (from) { return open(from || document.activeElement); }, close: function () { close(true); }, isOpen: function () { return isOpen; } };
})(typeof window !== 'undefined' ? window : this);

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/print.js ===== */
(function () { try {
/* 조현병 백과 · 인쇄 모듈(js/ui/print.js)
   1) 문서 화면의 "인쇄" 버튼: 문서 정보 상자의 버튼 줄(.infobox-actions)과 휴대폰 머리 줄(.doc-meta-m .acts)에 하나씩.
      기존 버튼과 같은 .btn 모양. window.print 가 없는 브라우저(일부 앱 안 브라우저)에는 만들지 않는다.
   2) 인쇄 준비(beforeprint, matchMedia('print')): 접힌 차례(details.toc-m)와 본문 안 details 를 펴고, 끝나면(afterprint) 되돌린다.
      요약 보기로 접힌 소절, 밝은 색 강제, 크롬 숨김, 출처 주소, 쪽 나눔은 css/ui/print.css 의 @media print 가 맡는다
      (자바스크립트가 꺼져도, 인쇄 이벤트가 없는 환경에서도 같은 모양).
   3) 인쇄 머리(.prt-head: 사이트 이름·분류·인쇄한 날·글 주소, `위기` 글은 109·1577-0199·119 / `응급` 글은 119 줄)와 꼬리(.prt-foot: 109·1577-0199·119)를 문서에 끼워 둔다.
      화면에서는 숨기고 인쇄에서만 보인다. 꼬리 앞에는 문서 고지(.disclaimer: 일반 정보·AI 초안·감수 없음)가 있다.
      글 주소는 origin + pathname 만(쿼리·조각 없음) — 사용자가 입력한 글자가 종이에 실리지 않게.
   저장하는 것도, 밖으로 보내는 것도 없다.
   공개: JHB.ui.print = { print, prepare, restore } (특집 화면이 자기 인쇄 버튼에서 불러 써도 된다).
   node 에서는 순수 도우미만 내보낸다(tests/print.test.cjs). */
(function (root) {
  'use strict';
  const SITE = '조현병 백과';

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* 인쇄한 날(현지 시각) 2026.11.14 — 문서의 "2026.10.25 고침"과 같은 꼴 */
  function dateText(d) {
    if (Object.prototype.toString.call(d) !== '[object Date]' || isNaN(d.getTime())) return '';
    return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
  }
  /* 종이에 적을 글 주소: 쿼리·조각은 빼고, 퍼센트 글자는 읽을 수 있게 푼다(깨진 % 면 그대로) */
  function pageUrl(loc) {
    if (!loc) return '';
    let base = '';
    if (loc.origin && loc.origin !== 'null') base = String(loc.origin) + String(loc.pathname || '/');
    else if (loc.href) base = String(loc.href).split(/[?#]/)[0];
    if (!base) return '';
    try { return decodeURI(base); } catch (e) { return base; }
  }
  function headLine(sectionTitle) { return sectionTitle ? SITE + ' · ' + sectionTitle : SITE; }
  function closedOnes(list) {
    return Array.prototype.filter.call(list || [], function (d) { return !!d && !d.open; });
  }
  /* 인쇄 준비·되돌리기. env = { details(): 펼 details 목록, html: 표시 클래스를 달 요소, onPrepare(): 날짜·주소 고치기 }
     준비는 여러 번 와도 된다(beforeprint 와 matchMedia 가 함께 옴). 되돌리기는 이 모듈이 편 것만 다시 닫는다. */
  function makePrinter(env) {
    let opened = null;
    function prepare() {
      if (!opened) opened = [];
      closedOnes(env.details()).forEach(function (d) {
        d.open = true;
        if (opened.indexOf(d) < 0) opened.push(d);
      });
      if (env.html) env.html.classList.add('prt-printing');
      if (env.onPrepare) env.onPrepare();
      return true;
    }
    function restore() {
      if (!opened) return false;
      opened.forEach(function (d) { d.open = false; });
      opened = null;
      if (env.html) env.html.classList.remove('prt-printing');
      return true;
    }
    /* 다른 화면으로 넘어감: 노드는 이미 사라졌으니 만지지 않고 잊는다 */
    function reset() {
      opened = null;
      if (env.html) env.html.classList.remove('prt-printing');
    }
    return { prepare: prepare, restore: restore, reset: reset, active: function () { return !!opened; } };
  }

  /* 인쇄 머리의 전화 줄: `위기` 태그 글은 첫머리에 109·1577-0199·119, `응급` 태그 글은 119. 다른 글은 '' */
  function headNumbers(tags) {
    const t = Array.isArray(tags) ? tags : [];
    if (t.indexOf('위기') >= 0) return '힘들 때 24시간 전화: 자살예방상담 109 · 정신건강위기상담 1577-0199 · 당장 위험하면 119';
    if (t.indexOf('응급') >= 0) return '몸의 응급 신호가 보이면 119에 전화하거나 응급실로 가세요';
    return '';
  }

  /* 문서 화면에 버튼·머리·꼬리를 한 번씩만 끼운다(문서가 아니면 아무것도 안 함).
     app: #app 노드, o = { canPrint, makeButton(), makeHead(), makeFoot(), html }.
     돌려주는 값: 이번에 끼운 것 { buttons, head, foot } 또는 null(문서 화면이 아님) */
  const ROWS = ['.infobox-actions', '.doc-meta-m .acts'];
  function attachDoc(app, o) {
    const art = app && app.querySelector('article.doc');
    if (!art) return null;
    const done = { buttons: 0, head: false, foot: false };
    if (o.canPrint) {
      ROWS.forEach(function (sel) {
        const row = art.querySelector(sel);
        if (row && !row.querySelector('.prt-btn')) { row.appendChild(o.makeButton()); done.buttons++; }
      });
    }
    if (!app.querySelector('.prt-head')) {
      const head = o.makeHead();
      if (head) { app.insertBefore(head, app.firstChild); done.head = true; }
    }
    const main = art.querySelector('.doc-main');
    if (main && !main.querySelector('.prt-foot')) {
      const foot = o.makeFoot();
      if (foot) {
        const disc = main.querySelector('.disclaimer');
        if (disc) disc.insertAdjacentElement('afterend', foot); else main.appendChild(foot);
        done.foot = true;
      }
    }
    /* 문서 꼬리가 있으면 인쇄에서 바닥글(같은 고지)을 겹쳐 싣지 않는다 */
    if (o.html) o.html.classList.toggle('prt-doc', !!(main && main.querySelector('.prt-foot')));
    return done;
  }

  const api = { SITE: SITE, dateText: dateText, pageUrl: pageUrl, headLine: headLine, headNumbers: headNumbers, closedOnes: closedOnes, makePrinter: makePrinter, attachDoc: attachDoc };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  /* ---------- 브라우저 ---------- */
  if (!root.JHB || !root.JHB.app || !root.document) return;
  const A = root.JHB.app, el = A.el, doc = root.document, html = doc.documentElement;
  const canPrint = typeof root.print === 'function';

  function today() { return dateText(new Date()); }
  function sectionTitle(slug) {
    const a = A.bySlug && A.bySlug[slug];
    const s = a && A.secById ? A.secById[a.section] : null;
    return (s && s.title) || '';
  }
  /* 머리의 날짜·주소는 인쇄 직전에 다시 적는다(탭을 열어 둔 채 다음 날 인쇄해도 그날 날짜) */
  function stamp() {
    Array.prototype.forEach.call(doc.querySelectorAll('#app .prt-date'), function (n) { n.textContent = '인쇄한 날 ' + today(); });
    Array.prototype.forEach.call(doc.querySelectorAll('#app .prt-url'), function (n) { n.textContent = pageUrl(root.location); });
  }
  const printer = makePrinter({
    details: function () { return doc.querySelectorAll('#app details.toc-m, #app .body details'); },
    html: html,
    onPrepare: stamp
  });

  function doPrint() {
    /* beforeprint 를 늦게 보내는 브라우저도 있어서 먼저 준비한다. 되돌리기는 afterprint 에서만
       (휴대폰 브라우저는 print() 가 바로 돌아오고 미리 보기를 나중에 그린다) */
    printer.prepare();
    try { root.print(); } catch (e) { printer.restore(); }
  }
  function button() {
    const b = el('button.btn.prt-btn', { type: 'button', title: '이 글 전체를 인쇄하거나 PDF로 저장해요' }, ['인쇄']);
    b.addEventListener('click', doPrint);
    return b;
  }

  function tagsOf(slug, meta) {
    if (meta && Array.isArray(meta.tags)) return meta.tags;
    const a = A.bySlug && A.bySlug[slug];
    return (a && a.tags) || [];
  }
  function attach(slug, meta) {
    const tel = headNumbers(tagsOf(slug, meta));
    attachDoc(A.main || doc.getElementById('app'), {
      canPrint: canPrint,
      html: html,
      makeButton: button,
      makeHead: function () {
        const kids = [
          el('span.prt-site', null, [headLine(sectionTitle(slug))]),
          el('span.prt-date', null, ['인쇄한 날 ' + today()]),
          el('span.prt-url', null, [pageUrl(root.location)])
        ];
        /* 위기·응급 글: 첫머리에 전화 줄(본문의 위기 배너와 겹쳐도 첫 줄에서 바로 보이게) */
        if (tel) kids.push(el('span.prt-tel', null, [tel]));
        return el('div.prt-head', null, kids);
      },
      makeFoot: function () {
        const crisis = A.notice ? A.notice('crisis') : null;
        return crisis ? el('div.prt-foot', null, [crisis]) : null;
      }
    });
  }

  root.addEventListener('beforeprint', printer.prepare);
  root.addEventListener('afterprint', printer.restore);
  const mq = root.matchMedia ? root.matchMedia('print') : null;
  if (mq) {
    const onMq = function (e) { if (e.matches) printer.prepare(); else printer.restore(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  root.addEventListener('jhb:page', function () {
    printer.reset();
    html.classList.remove('prt-doc');
  });
  root.addEventListener('jhb:article', function (e) {
    const d = e.detail || {};
    attach(d.slug, d.meta);
  });
  /* 모듈이 늦게 실행돼 첫 jhb:article 을 놓친 경우(앱이 그린 문서만: 문서 정보 상자가 있음) */
  (function init() {
    const w = A.where();
    if (w.path[0] === 'a' && w.path[1] && doc.querySelector('#app article.doc .infobox')) attach(w.path[1]);
  })();

  root.JHB.ui = root.JHB.ui || {};
  root.JHB.ui.print = { print: doPrint, prepare: printer.prepare, restore: printer.restore };
})(typeof window !== 'undefined' ? window : this);

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
/* ===== js/ui/trust.js ===== */
(function () { try {
/* js/ui/trust.js — 믿음 장치 (문서 화면)
   1) 글 frontmatter 에 reviewed(출처 확인일)가 있으면 "출처 확인 YYYY.MM.DD" 한 줄과 뜻풀이를 보여요.
      넓은 화면은 여백(margin) 자리의 문서 정보 아래, 여백이 숨는 좁은 화면(1080px 이하)과 인쇄는 글 끝(end) 자리.
   2) 고침 기록(data/kb/changes.json)에 그 글의 기록이 있으면 글 끝(end) 자리에 접힌 "이 글의 고친 내역"(최근 5개).
      넓은 화면에서는 여백 상자에 그 내역으로 가는 버튼도 둬요.
   - 사용자 입력·저장·외부 요청이 없어요. 자료는 JHB.app.loadData('changes') 로 한 번만 받아요(못 받으면 내역 없이 조용히 넘어가요).
   - 앞날의 약속(다음 확인 날짜 등)은 쓰지 않아요.
   - node 에서 require 하면 순수 함수만 내보내요(tests/changes.test.cjs). 종류 이름·정렬은 js/pages/changes.js 와 같아야 해요(테스트가 확인).
   공개: JHB.ui.trust = { reviewedOf, reviewedLine, historyFor, KIND_LABEL, TEXT, LIMIT } */
(function (root) {
  'use strict';
  var KINDS = ['new', 'enrich', 'fix', 'feature'];
  var KIND_LABEL = { new: '새 글', enrich: '보강', fix: '바로잡음', feature: '기능' };
  var LIMIT = 5;
  var TEXT = {
    label: '출처 확인',
    def: 'AI 작업자가 이 글의 출처를 다시 열어 본문과 대조한 날이에요. 전문가 감수가 아니에요.',
    hist: '이 글의 고친 내역',
    count: '건',
    recentOnly: '최근 5개만 보여요.',
    all: '고침 기록 전체 보기',
    region: '출처 확인과 고친 내역'
  };

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function isDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : '');
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }
  function fmtDot(d) { return String(d || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3'); }
  /* frontmatter 의 reviewed → 'YYYY-MM-DD' 또는 null(없거나 형식이 틀리면 보이지 않음) */
  function reviewedOf(meta) {
    var v = meta && meta.reviewed;
    if (typeof v !== 'string') return null;
    v = v.trim();
    return isDate(v) ? v : null;
  }
  function reviewedLine(d) { return TEXT.label + ' ' + fmtDot(d); }
  /* js/pages/changes.js 의 compare 와 같은 순서: 날짜 내림차순 → 종류 → 이름 → what */
  function cmpStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function rank(k) { var i = KINDS.indexOf(k); return i < 0 ? KINDS.length : i; }
  function nameOf(e) { return e.slug != null ? String(e.slug) : String(e.title == null ? '' : e.title); }
  function compare(a, b) {
    return cmpStr(String(b.date), String(a.date)) || (rank(a.kind) - rank(b.kind)) || cmpStr(nameOf(a), nameOf(b)) || cmpStr(String(a.what), String(b.what));
  }
  /* 그 글의 기록: { total, items(최신순 LIMIT 개) }. 이상한 항목은 건너뛰어요 */
  function historyFor(list, slug) {
    var mine = (Array.isArray(list) ? list : []).filter(function (e) {
      return isObj(e) && e.slug === slug && isDate(e.date) && KINDS.indexOf(e.kind) >= 0 && typeof e.what === 'string' && e.what.trim();
    }).sort(compare);
    return { total: mine.length, items: mine.slice(0, LIMIT) };
  }

  var api = { KIND_LABEL: KIND_LABEL, TEXT: TEXT, LIMIT: LIMIT, reviewedOf: reviewedOf, reviewedLine: reviewedLine, historyFor: historyFor, fmtDot: fmtDot };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  if (!root.JHB || !root.JHB.app) return;
  root.JHB.ui = root.JHB.ui || {};
  root.JHB.ui.trust = api;

  var A = root.JHB.app, el = A.el;
  var done = typeof WeakSet === 'function' ? new WeakSet() : null;
  var token = 0;

  /* 상자는 랜드마크가 아니에요(div). 이름 붙은 region 은 글 끝의 .trust-end 하나뿐이에요 */
  function revBox(d, extra) {
    return el('div.trust-rev' + (extra || ''), null, [
      el('p.trust-rev-line', null, [el('span.trust-rev-k', null, [TEXT.label]), ' ', el('time.trust-rev-d', { datetime: d }, [fmtDot(d)])]),
      el('p.trust-rev-def', null, [TEXT.def])
    ]);
  }
  function histDetails(h) {
    var list = el('ol.trust-hist-list', null, h.items.map(function (e) {
      return el('li.trust-hist-item', null, [
        el('time.trust-hist-d', { datetime: e.date }, [fmtDot(e.date)]),
        el('span.trust-kind.trust-k-' + e.kind, null, [KIND_LABEL[e.kind]]),
        el('span.trust-hist-w', null, [e.what])
      ]);
    }));
    var foot = [];
    if (h.total > h.items.length) foot.push(TEXT.recentOnly + ' ');
    if (A.pageById && A.pageById.changes) foot.push(el('a', { href: '#/changes' }, [TEXT.all]));
    return el('details.trust-hist', null, [
      /* 건수 앞 빈칸은 글자로 둬요(접근 이름·복사 글자가 "내역 2건"이 되게) */
      el('summary', null, [TEXT.hist, ' ', el('span.trust-hist-n', null, [h.total + TEXT.count])]),
      list,
      foot.length ? el('p.trust-hist-foot', null, foot) : null
    ]);
  }
  function openHistory(details) {
    details.open = true;
    var sum = details.querySelector('summary');
    /* 멀리(두 화면 넘게) 갈 때는 느린 기기에서 오래 미끄러지지 않게 바로 뛰어요 */
    var far = Math.abs(details.getBoundingClientRect().top) > window.innerHeight * 2;
    details.scrollIntoView({ block: 'center', behavior: A.reducedMotion() || far ? 'auto' : 'smooth' });
    if (sum) sum.focus({ preventScroll: true });
  }

  function onArticle(slug, meta) {
    var endSlot = A.slot('end');
    if (!slug || !endSlot) return;
    if (done) { if (done.has(endSlot)) return; done.add(endSlot); }
    else { if (endSlot.getAttribute('data-trust')) return; endSlot.setAttribute('data-trust', '1'); }
    var my = ++token;
    var rev = reviewedOf(meta);
    /* data-print="keep": 인쇄 모듈이 글 끝 자리를 비울 때도 출처 확인 줄은 종이에 남겨요(내역은 css 가 인쇄에서 숨김) */
    var marginBox = null, endSec = el('section.trust-end', { 'aria-label': TEXT.region, 'data-print': 'keep' });
    if (rev) {
      marginBox = revBox(rev);
      A.mount('margin', marginBox, 10);
      endSec.appendChild(revBox(rev, '.trust-rev-m'));
      /* 넓은 화면에서 내역이 없으면 글 끝 상자는 보일 것이 없어요. 빈 상자로 end 자리를 차지하지 않게
         좁아지거나 인쇄할 때·내역이 올 때 끼워요 */
      mountEndWhenNeeded(endSec, my, endSlot);
    }
    /* 내역 자료는 글을 다 그린 뒤 한가할 때 받아요(느린 기기에서 글 그리기와 다투지 않게) */
    idle(function () { if (my === token && A.slot('end') === endSlot) loadHistory(slug, my, endSlot, endSec, marginBox); });
  }
  var WIDE = '(min-width: 1081px)';
  function isWide() { return typeof window.matchMedia === 'function' && window.matchMedia(WIDE).matches; }
  function mountEnd(endSec, my, endSlot) {
    if (endSec.parentNode || my !== token || A.slot('end') !== endSlot) return;
    A.mount('end', endSec, 900);
  }
  function mountEndWhenNeeded(endSec, my, endSlot) {
    if (!isWide()) { mountEnd(endSec, my, endSlot); return; }
    var mq = window.matchMedia(WIDE);
    var forPrint = false;
    function gone() { return my !== token || A.slot('end') !== endSlot; }
    function off() {
      if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq);
      window.removeEventListener('beforeprint', onPrint);
      window.removeEventListener('afterprint', onAfter);
      window.removeEventListener('jhb:article', off);
    }
    /* 좁아지면 끼우고 끝(그 뒤로는 계속 둬요). 내역이 와서 이미 끼워졌으면 그만 들어요 */
    function onMq() {
      if (gone()) { off(); return; }
      if (forPrint) return; /* 인쇄 중 쪽 너비로 바뀐 것은 무시(afterprint 가 정리) */
      if (endSec.parentNode) { off(); return; }
      if (!mq.matches) { mountEnd(endSec, my, endSlot); off(); }
    }
    /* 종이에는 출처 확인 줄을 남겨요(인쇄에서는 여백이 숨어요). 다 찍으면 넓은 화면에서는 다시 빼요 */
    function onPrint() { if (gone()) { off(); return; } if (!endSec.parentNode) { forPrint = true; mountEnd(endSec, my, endSlot); } }
    function onAfter() {
      if (gone()) { off(); return; }
      if (forPrint && mq.matches && !endSec.querySelector('.trust-hist') && endSec.parentNode) {
        endSec.parentNode.removeChild(endSec);
        window.dispatchEvent(new Event('jhb:layout'));
      }
      forPrint = false;
    }
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    window.addEventListener('beforeprint', onPrint);
    window.addEventListener('afterprint', onAfter);
    window.addEventListener('jhb:article', off);
  }
  function idle(fn) {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 1500 });
    else setTimeout(fn, 200);
  }
  function loadHistory(slug, my, endSlot, endSec, marginBox) {
    A.loadData('changes').then(function (list) {
      if (my !== token || A.slot('end') !== endSlot) return;
      var h = historyFor(list, slug);
      if (!h.total) return;
      var det = histDetails(h);
      endSec.appendChild(det);
      mountEnd(endSec, my, endSlot);
      /* 넓은 화면: 여백 상자에서 글 끝의 내역으로 가는 버튼 */
      var jump = el('button.trust-jump', { type: 'button', 'aria-label': TEXT.hist + ' ' + h.total + TEXT.count + ', 글 끝에서 펼치기' }, [TEXT.hist + ' ' + h.total + TEXT.count]);
      jump.addEventListener('click', function () { openHistory(det); });
      if (marginBox) { marginBox.appendChild(jump); window.dispatchEvent(new Event('jhb:layout')); }
      else A.mount('margin', el('div.trust-rev.trust-rev-jump', null, [jump]), 10);
    }).catch(function () { /* 내역 자료를 못 받으면(오프라인 첫 방문 등) 내역 없이 둬요 */ });
  }

  window.addEventListener('jhb:article', function (e) {
    var d = e.detail || {};
    onArticle(d.slug, d.meta);
  });
  /* 모듈이 늦게 실행돼 첫 jhb:article 을 놓쳤으면, 이미 그려진 문서를 한 번 직접 처리 */
  var w = A.where();
  if (w && w.path && w.path[0] === 'a' && w.path[1] && A.slot('end')) {
    var slug0 = w.path[1], slot0 = A.slot('end');
    A.loadArticle(slug0).then(function (doc) {
      if (A.slot('end') === slot0) onArticle(slug0, doc && doc.meta);
    }).catch(function () { });
  }
})(typeof window !== 'undefined' ? window : this);

} catch (e) { setTimeout(function () { throw e; }); } }).call(this);
