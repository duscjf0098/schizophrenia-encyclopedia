/* 조현병 백과 · 읽은 문서 기록과 "이어서 읽기" 제안 (순수 로직, DOM 없음)
   create(store) → 인스턴스. store 는 { get(key, fallback), set(key, val) } (js/util.js 의 store 와 같은 모양).
   저장 키 'jhb.read'(값 { slug: timestamp }), 'jhb.course'(들어간 읽기 코스, 값 { 코스id: timestamp }).
   문서는 data/toc.js 형식 { slug, section, order, title, tags }, 코스는 { id, title, who, steps: [{slug}] }.
   그 밖에 앱(js/app.js)이 쓰는 순수 함수: 코스 찾기(courseMap·getCourse), 코스 대상 문구(whoText),
   첫 화면 최근 목록 고르기(visibleRecent), 기기 안 기록 지우기 계획(planClear). 테스트는 tests/progress.test.cjs·tests/core.test.cjs */
(function (root) {
  const KEY = 'jhb.read';
  const COURSE_KEY = 'jhb.course';
  /* 맥락 없이 첫 화면에 제목이 뜨지 않게 하는 태그(오늘의 문서·새로 올라온 글과 같은 기준) */
  const SENSITIVE_TAGS = ['위기', '응급'];
  const own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function sameSection(a, b) { return String(a) === String(b); }
  function pct(read, total) { return total ? Math.round(read * 100 / total) : 0; }
  function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
  function isMap(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function hasAnyTag(a, tags) {
    const t = (a && Array.isArray(a.tags)) ? a.tags : [];
    return (tags || []).some(function (x) { return t.indexOf(x) >= 0; });
  }
  function isSensitive(a) { return hasAnyTag(a, SENSITIVE_TAGS); }

  function create(store) {
    function load() {
      const v = store.get(KEY, {});
      return isMap(v) ? v : {};
    }
    function save(map) { store.set(KEY, map); }

    function markRead(slug, now) {
      if (!slug) return false;
      const map = load();
      map[slug] = typeof now === 'number' ? now : Date.now();
      save(map);
      return true;
    }
    function isRead(slug) { return own(load(), slug); }
    function readSlugs() {
      const map = load();
      return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
    }
    function count() { return Object.keys(load()).length; }

    /* ---- 들어간 읽기 코스: 코스 화면을 열었거나 ?course= 로 글을 열었을 때만 남긴다(기록 쉼이면 앱이 부르지 않음) ---- */
    function loadCourses() {
      const v = store.get(COURSE_KEY, {});
      return isMap(v) ? v : {};
    }
    function markCourse(id, now) {
      if (typeof id !== 'string' || !id) return false;
      const map = loadCourses();
      map[id] = typeof now === 'number' ? now : Date.now();
      store.set(COURSE_KEY, map);
      return true;
    }
    /* { 코스id: 시각 } 복사본(원형이 없는 객체) */
    function enteredCourses() {
      const map = loadCourses(), out = Object.create(null);
      Object.keys(map).forEach(function (k) { out[k] = map[k]; });
      return out;
    }

    function progressOf(list) {
      const map = load();
      const read = list.filter(function (a) { return a && map[a.slug] != null; }).length;
      return { read: read, total: list.length, pct: pct(read, list.length) };
    }
    function sectionProgress(articles, sectionId) {
      return progressOf((articles || []).filter(function (a) { return sameSection(a.section, sectionId); }));
    }
    function overall(articles) { return progressOf(articles || []); }

    /* skip(article) 이 true 인 글은 다음 문서 후보에서 뺀다(선택) */
    function nextInSection(articles, slug, skip) {
      const list = articles || [];
      const cur = list.filter(function (a) { return a.slug === slug; })[0];
      if (!cur) return null;
      const map = load();
      const sec = list.filter(function (a) { return sameSection(a.section, cur.section); }).sort(byOrder);
      const idx = sec.indexOf(cur);
      const unread = function (a) { return a.slug !== slug && map[a.slug] == null && !(typeof skip === 'function' && skip(a)); };
      const after = sec.slice(idx + 1).filter(unread);
      if (after.length) return after[0];
      const before = sec.slice(0, idx).filter(unread);
      return before.length ? before[0] : null;
    }

    function courseProgress(course) {
      const map = load();
      const steps = (course && Array.isArray(course.steps)) ? course.steps : [];
      let read = 0, next = null;
      steps.forEach(function (s) {
        if (map[s.slug] != null) read++;
        else if (!next) next = s;
      });
      return { read: read, total: steps.length, pct: pct(read, steps.length), next: next };
    }

    /* opts(선택):
       - entered: 들어간 코스({id: 시각} 또는 id 배열). 주면 그 코스만 "코스 이어 읽기" 후보예요.
         읽은 글만 보고 코스를 짐작해 이름·진도를 붙이지 않게(위기 글 하나만 읽어도 "처음 진단받았어요 코스"가 뜨던 문제).
         주지 않으면 예전처럼 모든 코스가 후보.
       - hideTags: "읽던 글의 다음 문서" 규칙에서 이 태그가 붙은 글은 제안하지 않고, 기준 글이면 그 제목을 이유 문구에 내지 않아요
         (첫 화면에 제목이 뜨지 않게). 기준으로는 써요: 위기 태그가 일상 글(환청·클로자핀 등)에도 붙어 있어서,
         빼면 그런 글을 읽은 사람에게 이어서 읽기가 사라지거나 다른 섹션으로 밀려요. */
    function continueReading(articles, courses, opts) {
      const list = articles || [];
      if (!count()) return null;
      opts = opts || {};
      const bySlug = {};
      list.forEach(function (a) { bySlug[a.slug] = a; });
      let entered = null;
      if (Array.isArray(opts.entered)) { entered = Object.create(null); opts.entered.forEach(function (id) { if (typeof id === 'string') entered[id] = true; }); }
      else if (opts.entered && typeof opts.entered === 'object') entered = opts.entered;
      const hide = Array.isArray(opts.hideTags) && opts.hideTags.length ? function (a) { return hasAnyTag(a, opts.hideTags); } : null;

      let best = null, bestP = null;
      (courses || []).forEach(function (c) {
        if (!c || typeof c.id !== 'string' || !Array.isArray(c.steps)) return;
        if (entered && !own(entered, c.id)) return;
        const p = courseProgress(c);
        if (!p.read || !p.next || p.read >= p.total) return;
        if (!best || p.pct > bestP.pct || (p.pct === bestP.pct && p.read > bestP.read)) { best = c; bestP = p; }
      });
      if (best) {
        const art = bySlug[bestP.next.slug] || { slug: bestP.next.slug, title: bestP.next.title || bestP.next.slug };
        return {
          kind: 'course', course: best, article: art,
          reason: '"' + best.title + '" 코스 ' + bestP.read + '/' + bestP.total + '. 다음 문서예요.'
        };
      }

      const recent = readSlugs().filter(function (s) { return own(bySlug, s); });
      for (let i = 0; i < recent.length; i++) {
        const next = nextInSection(list, recent[i], hide);
        if (next) {
          const last = bySlug[recent[i]];
          /* 기준 글이 숨길 글이면 제목을 내지 않는다(제안 글은 nextInSection 이 이미 숨길 글을 뺐음) */
          return {
            kind: 'section', article: next,
            reason: hide && hide(last) ? '같은 섹션에서 아직 안 읽은 문서예요.'
              : '"' + last.title + '" 다음으로 같은 섹션에서 아직 안 읽은 문서예요.'
          };
        }
      }
      return null;
    }

    function clear() { save({}); }

    return {
      markRead: markRead, isRead: isRead, readSlugs: readSlugs, count: count,
      sectionProgress: sectionProgress, overall: overall, nextInSection: nextInSection,
      continueReading: continueReading, courseProgress: courseProgress, clear: clear,
      markCourse: markCourse, enteredCourses: enteredCourses
    };
  }

  /* ---------- 코스 찾기: ?course=__proto__·toString 같은 이름으로 원형의 값을 집지 않게 ---------- */
  function courseMap(courses) {
    const m = Object.create(null);
    (Array.isArray(courses) ? courses : []).forEach(function (c) {
      if (c && typeof c.id === 'string' && c.id && Array.isArray(c.steps)) m[c.id] = c;
    });
    return m;
  }
  function getCourse(map, id) {
    if (!map || typeof id !== 'string' || !id || !own(map, id)) return null;
    const c = map[id];
    return c && Array.isArray(c.steps) ? c : null;
  }
  /* 코스 카드·코스 화면의 대상 줄: '모두' → '모두에게', '주변 사람' → '주변 사람에게' */
  function whoText(who) {
    const w = typeof who === 'string' ? who.trim() : '';
    return w ? w + '에게' : '';
  }

  /* ---------- 첫 화면 "최근에 읽은 문서": 위기·응급 글은 빼고 limit 개(기록 jhb.recent 자체는 그대로) ---------- */
  function visibleRecent(slugs, bySlug, limit) {
    const out = [], seen = Object.create(null);
    (Array.isArray(slugs) ? slugs : []).forEach(function (s) {
      if (typeof s !== 'string' || seen[s] || !bySlug || !own(bySlug, s)) return;
      seen[s] = true;
      const a = bySlug[s];
      if (a && !isSensitive(a)) out.push(a);
    });
    return typeof limit === 'number' ? out.slice(0, limit) : out;
  }

  /* ---------- 기기 안 기록 지우기 계획(js/app.js 의 JHB.app.privacy.clear 가 씀) ----------
     kinds: 등록된 종류 [{id, keys, session}], ids: 'all' | id | id 배열,
     opts: { keep: [남길 종류 id], paused: 지금 기록 쉼인지, lsKeys: localStorage 의 키 목록 }
     돌려주는 값: { all, done:[지운 종류 id], ls:[지울 localStorage 키], ss:[지울 sessionStorage 키] }
     - 'all' 일 때만 jhb.privacy.* 도 지워요(등록되지 않은 jhb.privacy.* 포함). 기록 쉼(jhb.privacy.paused = true)은 남겨요.
     - keep 의 종류는 지우지 않고, 그 종류의 키는 다른 종류에 함께 있어도 남겨요.
     - ids 를 빠뜨리면(undefined·null·빈 글자·빈 배열) 아무것도 지우지 않아요. */
  const PRIV_PREFIX = 'jhb.privacy.';
  function planClear(kinds, ids, opts) {
    opts = opts || {};
    const all = ids === 'all';
    const none = { all: false, done: [], ls: [], ss: [] };
    if (!all && (ids == null || ids === '' || (Array.isArray(ids) && !ids.length))) return none;
    const want = all ? null : (Array.isArray(ids) ? ids : [ids]);
    const keep = Array.isArray(opts.keep) ? opts.keep : (typeof opts.keep === 'string' ? [opts.keep] : []);
    const list = Array.isArray(kinds) ? kinds : [];
    const keptLs = Object.create(null), keptSs = Object.create(null);
    list.forEach(function (k) {
      if (keep.indexOf(k.id) < 0) return;
      (k.keys || []).forEach(function (x) { keptLs[x] = true; });
      (k.session || []).forEach(function (x) { keptSs[x] = true; });
    });
    const ls = [], ss = [], done = [];
    const addLs = function (x) { if (typeof x === 'string' && x && !keptLs[x] && ls.indexOf(x) < 0) ls.push(x); };
    const addSs = function (x) { if (typeof x === 'string' && x && !keptSs[x] && ss.indexOf(x) < 0) ss.push(x); };
    list.forEach(function (k) {
      if (!k || keep.indexOf(k.id) >= 0) return;
      if (want && want.indexOf(k.id) < 0) return;
      (k.keys || []).forEach(addLs);
      (k.session || []).forEach(addSs);
      done.push(k.id);
    });
    if (all) {
      (Array.isArray(opts.lsKeys) ? opts.lsKeys : []).forEach(function (x) {
        if (typeof x !== 'string' || x.indexOf(PRIV_PREFIX) !== 0) return;
        if (x === PRIV_PREFIX + 'paused' && opts.paused === true) return;
        addLs(x);
      });
    }
    return { all: all, done: done, ls: ls, ss: ss };
  }

  const api = {
    KEY: KEY, COURSE_KEY: COURSE_KEY, SENSITIVE_TAGS: SENSITIVE_TAGS, create: create,
    isSensitive: isSensitive, courseMap: courseMap, getCourse: getCourse, whoText: whoText,
    visibleRecent: visibleRecent, planClear: planClear
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.progress = api; }
})(typeof window !== 'undefined' ? window : this);
