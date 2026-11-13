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
