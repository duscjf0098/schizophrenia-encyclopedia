/* js/ui/nextsteps.js — 글 끝 "다음 걸음"과 "이 주제의 자주 묻는 질문" (문서 화면의 after-body 자리: 본문 바로 뒤, 출처 위)
   - 다음 걸음 최대 3편. 고르는 근거는 글 사이 링크·읽기 코스·분류·손으로 정한 표(data/kb/nextsteps.json)뿐이에요.
     읽은 기록으로 사람을 짐작하지 않아요(audit-safety 3장 16). 순서(지시서 M6):
       1) 손 지정 { "slug": { "self"|"family"|"near"|"any": [...] } } — 고른 역할 목록 → any(궁금해서 왔어요·역할 없음은 any 만)
       2) 이 글이 든 코스의 다음 글(역할에 맞는 코스 → 코스 순서)
       3) 본문이 링크한 글(가족·주변 사람이면 10·11 분류 글을 앞에)
       4) 같은 묶음(data/kb/groups.json 이 있으면)의 다음 글, 없으면 같은 분류의 다음 글(끝이면 앞으로 돌아감)
     ?course= 로 들어왔으면 그 코스의 다음 글은 코어의 코스 안내(.course-nav)가 보여 주니 여기서는 빼요(같은 링크 두 번 방지).
     본문 끝 "더 읽을 글"에 이미 있는 글(o.seen)은 뒤로 미뤄요(바로 위 목록과 같은 글이 이어지지 않게). 자리가 남을 때만 써요.
     위기 글 뒤에 위기 글만 이어지면 마지막 자리를 회복·도움 글로 바꿔요. 실제로 있는 글만, 자기 자신·중복 없이.
   - 15분류(자주 묻는 질문) 글은 다음 걸음에 넣지 않고 아래 "이 주제의 자주 묻는 질문"(최대 4개)으로:
     이 글을 링크한 질문 글(JHB.app.links.in ∩ 15) → 손 지정·본문 링크에 든 질문 글. 위기 글에서는 입원 질문을 뒤로 보내요.
     질문 아래에는 그 글 요약의 첫 문장(답의 첫 문장)을 붙여 질문만 홀로 보이지 않게 해요.
   - 코어가 그리는 "이 문서를 가리키는 문서"(.backlinks)는 지우지 않고 접힌 <details> 로 감싸 글 끝을 짧게 해요.
   - 고르기 함수는 node 에서도 불러 시험해요(tests/nextsteps.test.cjs): module.exports = { pick, courseFor, normRole, firstSentence, ROLES, HELP }.
   공개: JHB.ui.nextsteps = { pick, refresh, role } */
(function (root) {
  'use strict';
  const ROLES = ['self', 'family', 'near', 'curious'];
  const ROLE_KEY = 'jhb.ui.home.role';
  const FAQ_SEC = '15';
  const CARE_SECS = ['10', '11'];
  const MAX_STEPS = 3, MAX_FAQ = 4;
  /* 위기 글 뒤에 섞는 회복·도움 글(위기 태그가 없는 것만 씀) */
  const HELP = ['recovery', 'mental-health-center', 'peer-support', 'lived-experience-lessons', 'recovery-commonalities'];
  /* 위기 글 끝에서 뒤로 보내는 질문(입원 걱정이 먼저 보여 연락을 망설이지 않게) */
  const ADMIT_TAGS = ['강제입원', '입원'];
  /* 역할에 맞는 코스(data/courses.js 의 who) */
  const COURSE_WHO = { self: ['당사자'], family: ['가족'], near: ['가족'] };
  const own = Object.prototype.hasOwnProperty;

  function normRole(r) { return ROLES.indexOf(r) >= 0 ? r : null; }
  function has(map, k) { return !!map && typeof k === 'string' && own.call(map, k); }
  function listOf(map, k) { return has(map, k) && Array.isArray(map[k]) ? map[k] : []; }
  function indexBy(articles) { const by = {}; articles.forEach(function (a) { if (a && typeof a.slug === 'string') by[a.slug] = a; }); return by; }
  function tagged(a, t) { return !!a && Array.isArray(a.tags) && a.tags.indexOf(t) >= 0; }
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
    /* 고르기: "더 읽을 글"에 없는 후보를 먼저, 자리가 남으면 그 목록에 있는 후보로 */
    stable(cands, function (c) { return seen[c.slug] ? 1 : 0; }).forEach(function (c) {
      if (used[c.slug] || res.steps.length >= MAX_STEPS) return;
      used[c.slug] = true;
      const it = { slug: c.slug, from: c.from };
      if (c.extra) Object.keys(c.extra).forEach(function (k) { it[k] = c.extra[k]; });
      res.steps.push(it);
    });
    /* 위기 글 뒤에 위기 글만 이어지지 않게 회복·도움 글을 섞음 */
    if (tagged(cur, '위기') && res.steps.length && res.steps.every(function (st) { return tagged(by[st.slug], '위기'); })) {
      const h = HELP.filter(function (s) { return exists(s) && !used[s] && !tagged(by[s], '위기') && !isFaq(by[s]); })[0];
      if (h) {
        const it = { slug: h, from: 'help' };
        if (res.steps.length < MAX_STEPS) res.steps.push(it); else res.steps[res.steps.length - 1] = it;
      }
    }
    /* 관련 질문: 이 글을 링크한 질문 글 → 손 지정·본문 링크의 질문 글.
       위기 글이면 입원 질문을 맨 뒤로, "더 읽을 글"에 이미 있는 질문은 그 앞(뒤쪽)으로 */
    const faqIn = listOf(links.in, slug).filter(function (s) { return exists(s) && isFaq(by[s]); });
    const crisis = tagged(cur, '위기');
    const uniq = [], fs = {};
    faqIn.concat(faqMore).forEach(function (s) { if (s !== slug && !fs[s]) { fs[s] = true; uniq.push(s); } });
    stable(uniq, function (s) {
      const admit = crisis && ADMIT_TAGS.some(function (t) { return tagged(by[s], t); });
      return (admit ? 2 : 0) + (seen[s] ? 1 : 0);
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

  const core = { ROLES: ROLES.slice(), HELP: HELP.slice(), normRole: normRole, courseFor: courseFor, firstSentence: firstSentence, pick: pick };
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

  function role() { return normRole(A.store.get(ROLE_KEY, null)); }
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
    /* 위기 글이 아닌 글 끝에서는 위기 글의 요약(자해·자살·타해 같은 말)을 늘어놓지 않고 제목만 보여요 */
    const quiet = tagged(a, '위기') && !tagged(A.bySlug[curSlug], '위기');
    const sum = a.summary && !quiet ? a.summary : '';
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
        const ans = firstSentence(a.summary);
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
