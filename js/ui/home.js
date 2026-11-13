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
     최근 읽은 문서는 분류 바로 위로. 위기·응급 글은 최근 목록에서 제목을 접어 둔다.
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
  /* 글 링크에서 slug 뽑기(#/a/slug, a/slug/, ../a/slug/?x) */
  function slugOfHref(href) {
    const m = /(?:^|[\/#])a\/([a-z0-9-]+)\/?(?:[?#].*)?$/.exec(String(href || ''));
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
    slugOfHref: slugOfHref, isSensitive: isSensitive, isPlainClick: isPlainClick,
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

  /* 기록 종류 등록
     - 가린 최근 목록 상태는 보기 설정의 하나로 내 서재에서 함께 지워지게 한다(같은 종류에 키만 더함)
     - 기록 쉼 중에 고른 역할은 sessionStorage 의 같은 이름 키에 둔다: 역할 종류의 session 에 더해 함께 지워지게 */
  (function registerKeys() {
    const P = A.privacy;
    if (!P || typeof P.register !== 'function') return;
    const kinds = P.kinds || [];
    const pick = function (id) { return kinds.filter(function (k) { return k.id === id; })[0]; };
    const s = pick('settings');
    if (s) { if (s.keys.indexOf(K_RECENT_HIDE) < 0) P.register({ id: s.id, label: s.label, keys: s.keys.concat([K_RECENT_HIDE]), session: s.session }); }
    else P.register({ id: 'home-view', label: '첫 화면 보기', keys: [K_RECENT_HIDE] });
    const r = pick('role');
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
  /* app.js 의 courseCard 와 같은 마크업(첫 4장 밖에 있던 역할 코스를 데려올 때) */
  function courseCard(c) {
    if (!c) return null;
    const p = (A.progress && A.progress.courseProgress) ? A.progress.courseProgress(c) : { read: 0, total: (c.steps || []).length, pct: 0 };
    return el('a.course', { href: A.L('#/course/' + c.id) }, [
      el('div.who', null, [c.who === '모두' ? '당사자와 가족에게' : c.who + '에게']),
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

  /* ---------- 최근에 읽은 문서: 위기·응급 글 접기, 기록 가리기, 기록 쉼 안내 ---------- */
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
  /* 위기·응급 글은 최근 목록에서 제목을 접어 둔다(같은 기기를 쓰는 사람에게 첫 화면에서 바로 보이지 않게) */
  function foldSensitive(list) {
    const rows = U.qsa('li.row', list).filter(function (li) {
      const a = li.querySelector('a[href]');
      const s = a && slugOfHref(a.getAttribute('href'));
      return !!(s && A.bySlug && own(A.bySlug, s) && isSensitive(A.bySlug[s]));
    });
    if (!rows.length) return;
    rows.forEach(function (li) { li.hidden = true; });
    const open = el('button.hm-sens-btn', { type: 'button' }, ['펼치기']);
    const li = el('li.hm-sens', null, [el('span', null, ['힘들 때 보는 글 ' + rows.length + '편은 제목을 접어 두었어요.']), open]);
    open.addEventListener('click', function () {
      rows.forEach(function (r) { r.hidden = false; });
      li.remove();
      const f = rows[0].querySelector('a[href]'); if (f) f.focus();
    });
    list.appendChild(li);
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
    foldSensitive(list);
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
      if ((hit('settings') || hit('home-view')) && applyVeil) applyVeil(store.get(K_RECENT_HIDE, false) === true);
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
