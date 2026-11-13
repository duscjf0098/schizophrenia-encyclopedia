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
