/* 조현병 백과 · 진료 질문 바구니 모듈 (js/ui/ask.js, 화면은 js/pages/ask.js 의 ask/)
   1) 글 본문의 '## 담당 의사에게 물어볼 것' 목록 항목마다 "담기" 버튼(aria-pressed). 누르면 바구니에 넣고 빼요.
      질문 글자는 글에 있는 그대로 담아요(공백만 정리. 지시형으로 바꾸지 않음). jhb:article 에서 붙이고(요약 보기·정적 본문 살리기 뒤에도
      같은 선택자: .body 안의 h2 와 그 소절의 목록), 모듈이 늦게 실려도 이미 그려진 글에 한 번 붙여요.
   2) 저장: 기본은 sessionStorage 'jhb.ui.ask.session'(탭을 닫으면 사라짐). 사용자가 ask/ 화면에서 "이 기기에 기억하기"를 켜야
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

  var core = {
    KEYS: KEYS, MAX_ITEMS: MAX_ITEMS, MAX_LEN: MAX_LEN, HEADING: HEADING,
    norm: norm, isAskHeading: isAskHeading, makeItem: makeItem, groupKey: groupKey, has: has, groups: groups, tidy: tidy,
    sanitize: sanitize, add: add, remove: remove, moveItem: moveItem, moveGroup: moveGroup,
    load: load, save: save, setKeep: setKeep, clearAll: clearAll, heldCount: heldCount
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
  function whereText(st) {
    if (!st.keep) return '이 탭을 닫으면 사라져요';
    if (st.paused) return '이 기기에 저장 중 · "기록 남기지 않기"가 켜져 있어 새로 담는 질문은 이 탭에만 둬요';
    return '이 기기에 저장 중';
  }
  function paintBar(bar, st) {
    var n = st.items.length;
    bar.hidden = !n;
    bar.querySelector('.ask-bar-n').textContent = '진료 질문 ' + n + '개를 담았어요';
    bar.querySelector('.ask-bar-where').textContent = whereText(st);
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
