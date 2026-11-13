/* 조현병 백과 · 내 서재 (me/, 선언은 data/pages/me.json)
   이 기기의 브라우저에 남은 기록을 한곳에서 보고, 새로 남기지 않게 하고, 지운다. 위에서 아래로:
   1. 기록 설정: 기록 남기지 않기(JHB.app.privacy.paused), 최근 검색 저장(privacy.recentq, 기본 꺼짐)
   2. 한눈에: 저장한 글·읽은 글·읽기 코스·최근 읽은 글. 기본은 개수만 보이고 "목록 보기"를 눌러야 제목을 만든다
      (같은 기기를 쓰는 사람이 어깨 너머로 보는 일을 줄이려고. 펼친 상태는 어디에도 남기지 않는다)
   3. 나는 이런 사람이에요: 'jhb.ui.home.role' = self·family·near·curious, "정하지 않음"은 키를 지운다
   4. 지우기: privacy.kinds 의 종류마다(다른 모듈이 등록한 종류도 자동으로 보임) + 전부 지우기(확인 대화상자).
      흔적(읽음·최근·읽던 자리·최근 검색·역할·보기 설정)은 바로 지우고, 직접 모은 것(저장한 글, 다른 모듈의 질문·종이 등)은 한 번 묻는다.
      전부 지우기는 보기 설정을 고를 때만 함께 지운다(기본은 남김). 지운 뒤 서비스 워커 캐시(jhb-*)의 쿼리 붙은 항목(옛 검색 주소)도
      지워 본다(실패해도 조용히)
   5. 알아둘 것
   page.lib 는 node 테스트용 순수 함수(tests/me.test.cjs). */
(function (root) {
  'use strict';
  const ROLE_KEY = 'jhb.ui.home.role';
  const ROLES = [
    { v: 'self', t: '당사자예요', d: '진단을 받았거나 증상이 걱정돼요.' },
    { v: 'family', t: '가족이에요', d: '가족이 아파요. 어떻게 도울지 알고 싶어요.' },
    { v: 'near', t: '주변 사람이에요', d: '친구나 동료, 학생이 걱정돼요.' },
    { v: 'curious', t: '궁금해서 왔어요', d: '조현병이 어떤 병인지 알고 싶어요.' }
  ];
  /* 바로 지우는 흔적. 그 밖(저장한 글, 다른 모듈이 등록한 종류)은 확인을 묻는다 */
  const TRACE = ['read', 'recent', 'pos', 'recentq', 'role', 'settings'];
  const HINT = {
    read: '읽음 표시와 읽기 코스 진행',
    recent: '첫 화면의 "최근에 읽은 문서"',
    pos: '글을 다시 열 때 돌아가는 자리',
    recentq: '찾기 창의 최근 검색',
    fav: '"저장" 버튼으로 모은 글',
    role: '위의 "나는 이런 사람이에요"에서 고른 것',
    settings: '글자 크기, 밝게·어둡게 같은 보기 설정'
  };
  const STEP = 20; /* 목록을 한 번에 보여 주는 글 수 */

  /* ---------- 순수 함수 ---------- */
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function isMap(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function roleOf(v) { return ROLES.some(function (r) { return r.v === v; }) ? v : null; }
  function roleLabel(v) { const r = ROLES.filter(function (x) { return x.v === v; })[0]; return r ? r.t : ''; }
  /* jhb.read({slug: 시각}) → 있는 글만 [{slug, at}] 최근 순(같은 시각이면 slug 순) */
  function readEntries(map, bySlug) {
    if (!isMap(map)) return [];
    return Object.keys(map).filter(function (s) { return own(bySlug, s); })
      .map(function (s) { return { slug: s, at: Number(map[s]) || 0 }; })
      .sort(function (a, b) { return b.at - a.at || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0); });
  }
  /* jhb.fav·jhb.recent(slug 배열) → 순서를 지키고 없는 글·중복·글자 아닌 값을 뺀다 */
  function slugList(list, bySlug) {
    if (!Array.isArray(list)) return [];
    const seen = {}, out = [];
    list.forEach(function (s) {
      if (typeof s !== 'string' || !own(bySlug, s) || own(seen, s)) return;
      seen[s] = true; out.push(s);
    });
    return out;
  }
  /* 들어간 코스 기록({코스id: 시각} 또는 id 배열) → 원형 없는 색인. 없으면 null */
  function enteredSet(entered) {
    if (entered == null) return null;
    const set = Object.create(null);
    if (Array.isArray(entered)) entered.forEach(function (id) { if (typeof id === 'string' && id) set[id] = true; });
    else if (typeof entered === 'object') Object.keys(entered).forEach(function (id) { set[id] = true; });
    return set;
  }
  /* 시작한 코스만 [{id, title, read, total, pct, done}]. 진행 중(많이 읽은 순)이 먼저, 다 읽은 코스는 뒤에.
     entered(JHB.app.progress.enteredCourses()): 코스 화면을 열었거나 ?course= 로 글을 연 코스만 "시작한 코스"예요
     (읽은 글이 여러 코스에 겹친다고 시작한 것으로 세지 않음. 이어서 읽기와 같은 기준). 들어갔으면 아직 읽은 글이 없어도 보여요.
     entered 를 주지 않으면(진도 기록 API 가 없는 판) 읽은 글이 하나라도 있는 코스 */
  function courseRows(courses, map, entered) {
    const m = isMap(map) ? map : {};
    const inSet = enteredSet(entered);
    const rows = [];
    (Array.isArray(courses) ? courses : []).forEach(function (c, i) {
      const steps = (c && Array.isArray(c.steps)) ? c.steps : [];
      if (!steps.length) return;
      if (inSet && !(typeof c.id === 'string' && inSet[c.id] === true)) return;
      const read = steps.filter(function (st) { return st && own(m, st.slug) && m[st.slug] != null; }).length;
      if (!read && !inSet) return;
      rows.push({ id: c.id, title: c.title, read: read, total: steps.length, pct: Math.round(read * 100 / steps.length), done: read >= steps.length, i: i });
    });
    rows.sort(function (a, b) { return (a.done - b.done) || (b.pct - a.pct) || (a.i - b.i); });
    return rows.map(function (r) { return { id: r.id, title: r.title, read: r.read, total: r.total, pct: r.pct, done: r.done }; });
  }
  function needsConfirm(id) { return TRACE.indexOf(id) < 0; }
  /* 전부 지우기 계획: 코어 API 한 번 privacy.clear(ids, { keep }).
     ids: 늘 'all'(등록된 키 전부 + jhb.privacy.*, 단 기록 쉼은 남고 최근 검색 저장은 꺼짐).
     keep: 보기 설정을 남기면 ['settings'](그 종류의 키는 지우지 않음).
     extraLs·extraSs: 등록되지 않은 jhb.* 키(모듈이 등록을 빠뜨린 기록도 "전부"에 들게). jhb.privacy.* 는 API 가 다루고,
     sessionStorage 'jhb.q.cleared'(지운 시각, 검색어 아님)는 찾기 화면이 옛 검색어를 되살리지 않게 남긴다 */
  function planClearAll(o) {
    o = o || {};
    const kinds = Array.isArray(o.kinds) ? o.kinds : [];
    const regLs = {}, regSs = {};
    kinds.forEach(function (k) {
      (k.keys || []).forEach(function (x) { regLs[x] = true; });
      (k.session || []).forEach(function (x) { regSs[x] = true; });
    });
    const jhb = function (k) { return typeof k === 'string' && k.indexOf('jhb.') === 0; };
    return {
      ids: 'all',
      keep: o.keepSettings ? ['settings'] : [],
      extraLs: (o.lsKeys || []).filter(function (k) { return jhb(k) && k.indexOf('jhb.privacy.') !== 0 && !own(regLs, k); }),
      extraSs: (o.ssKeys || []).filter(function (k) { return jhb(k) && k !== 'jhb.q.cleared' && !own(regSs, k); })
    };
  }
  /* 확인 대화상자에 보일 "지울 것": 기록이 있는 종류만, 보기 설정은 함께 지울 때만 */
  function clearPreview(kinds, has, keepSettings) {
    return (kinds || []).filter(function (k) { return !(keepSettings && k.id === 'settings') && has(k.id); });
  }
  function isQueryEntry(url) { return typeof url === 'string' && url.indexOf('?') >= 0; }
  /* 서비스 워커가 페이지 이동 때 쿼리를 뗀 주소로 저장한 페이지(열어 본 글 a/<slug>/, 분류·특집 화면).
     사전 캐시의 HTML 은 첫 화면·index.html·app-shell.html 뿐이라, 그 밖의 페이지 항목은 "열어 봤다"는 기록과 같다.
     앱 틀 셋은 남긴다(오프라인에서는 app-shell 로 다시 그려진다). scope 는 사이트 기준 주소('…/') */
  function isPageEntry(url, scope) {
    if (typeof url !== 'string' || typeof scope !== 'string') return false;
    let u;
    try { u = new URL(url); } catch (e) { return false; }
    const s = scope.replace(/[?#].*$/, '');
    const bare = u.origin + u.pathname;
    if (bare.indexOf(s) !== 0) return false;
    const rel = bare.slice(s.length);
    if (rel === '' || rel === 'index.html' || rel === 'app-shell.html') return false;
    return /\/$/.test(rel) || /\.html$/.test(rel);
  }
  /* 역할을 바꿨을 때의 알림. 고른 역할 이름(예: 당사자)은 건강과 관련된 신원이라 크게 띄우지 않는다(라디오 상태로 알 수 있음) */
  function roleToast(v) {
    return v ? '역할을 바꿨어요. 첫 화면에 반영돼요' : '역할을 정하지 않음으로 바꿨어요. 첫 화면은 기본 순서로 보여요';
  }
  const RECENTQ_DESC = '켜면 찾기 창에서 찾은 말 몇 개가 이 기기에 남아 다음에 바로 고를 수 있어요. ' +
    '이 기기의 브라우저에만 남고, 같은 기기를 쓰는 사람이 찾기 창에서 볼 수 있어요. 위기와 관련된 말은 저장하지 않아요. 끄면 남아 있던 최근 검색도 지워요.';
  const RECENTQ_ON = '최근 검색을 이 기기에 저장해요. 같은 기기를 쓰는 사람도 볼 수 있어요';
  const KNOW = [
    '이 기록은 이 기기의 브라우저에만 있어요.',
    '브라우저의 방문 기록과 주소창 자동 완성은 이 화면에서 지울 수 없어요. 브라우저 설정에서 지워요.',
    '찾기 화면에서 찾은 말은 이 탭의 뒤로 가기 기록에 남아 있을 수 있어요. 아래 "최근 검색"이나 "전부 지우기"로 지우면 찾기 화면이 그 말을 되살리지 않아요. ' +
      '탭을 닫아도 브라우저의 "닫은 탭 다시 열기"로 돌아올 수 있으니, 함께 쓰는 기기라면 브라우저 방문 기록도 지워요.',
    '오프라인에서도 볼 수 있게, 열어 본 글 화면은 브라우저가 따로 저장해 둬요. "기록 남기지 않기"를 켜면 그 뒤에 새로 연 화면은 저장하지 않아요. ' +
      '이미 저장된 화면은 "읽은 글", "최근 읽은 글", "읽던 자리"나 "전부 지우기"로 지울 때 함께 지워요.'
  ];
  /* 받침에 맞는 조사: obj 을/를, subj 이/가 */
  function josa(w, withB, without) {
    const s = String(w == null ? '' : w), c = s.charCodeAt(s.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return s + ((c - 0xAC00) % 28 ? withB : without);
    return s + withB + '(' + without + ')';
  }
  function obj(w) { return josa(w, '을', '를'); }
  function subj(w) { return josa(w, '이', '가'); }
  const lib = {
    ROLES: ROLES, roleOf: roleOf, roleLabel: roleLabel, readEntries: readEntries, slugList: slugList, courseRows: courseRows,
    needsConfirm: needsConfirm, planClearAll: planClearAll, clearPreview: clearPreview, isQueryEntry: isQueryEntry, isPageEntry: isPageEntry,
    roleToast: roleToast, RECENTQ_DESC: RECENTQ_DESC, RECENTQ_ON: RECENTQ_ON, KNOW: KNOW, obj: obj, subj: subj
  };

  /* ---------- 브라우저 ---------- */
  function storageOk() {
    try { const k = '__jhb_probe__'; root.localStorage.setItem(k, '1'); root.localStorage.removeItem(k); return true; } catch (e) { return false; }
  }
  function keysOf(st) {
    const out = [];
    try { const s = root[st]; for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k != null) out.push(k); } } catch (e) { }
    return out;
  }
  function ssRemove(k) { try { root.sessionStorage.removeItem(k); } catch (e) { } }
  /* 서비스 워커 캐시(jhb-*) 정리. 실패해도 조용히. 끝나면 지운 개수로 풀리는 Promise(시험용)
     - 늘: 옛 판이 쿼리째 저장한 검색 주소 등(쿼리가 붙은 항목)
     - pages: 열어 본 페이지 항목(isPageEntry). 읽은 글·최근 읽은 글·읽던 자리·전부 지우기 때 */
  function siteScope() {
    try { return new URL(root.document.documentElement.getAttribute('data-base') || './', root.location.href).href; } catch (e) { return ''; }
  }
  function clearCaches(o) {
    const pages = !!(o && o.pages), scope = pages ? siteScope() : '';
    try {
      const C = root.caches;
      if (!C || typeof C.keys !== 'function') return Promise.resolve(0);
      return C.keys().then(function (names) {
        return Promise.all(names.filter(function (n) { return n.indexOf('jhb-') === 0; }).map(function (n) {
          return C.open(n).then(function (c) {
            return c.keys().then(function (reqs) {
              const del = reqs.filter(function (r) { return isQueryEntry(r.url) || (pages && scope && isPageEntry(r.url, scope)); });
              return Promise.all(del.map(function (r) { return c.delete(r); })).then(function () { return del.length; });
            });
          });
        }));
      }).then(function (ns) { return ns.reduce(function (a, b) { return a + b; }, 0); }).catch(function () { return 0; });
    } catch (e) { return Promise.resolve(0); }
  }
  /* 열어 본 페이지 캐시도 함께 지울 종류(그 페이지가 곧 읽은 흔적이라서) */
  const PAGE_KINDS = ['read', 'recent', 'pos'];

  const page = {
    id: 'me',
    /* 자바스크립트가 꺼졌거나 화면 코드를 받기 전: 소개 두세 문장 + 안내(noscript) */
    staticHtml: function () {
      return '<div class="pg-me-static">' +
        '<p>이 화면에서는 이 기기의 브라우저에 남은 기록(저장한 글, 읽은 글, 최근 읽은 글, 읽던 자리, 최근 검색, 고른 역할, 보기 설정)을 보고 지울 수 있어요.</p>' +
        '<p>기록을 새로 남기지 않게 하거나, 첫 화면에 맞출 역할을 고를 수도 있어요. 이 기록은 어디로도 보내지 않아요.</p>' +
        '<noscript><p class="pg-me-nojs">이 화면은 자바스크립트가 필요해요. 브라우저 설정에서 이 사이트의 "사이트 데이터 지우기"로도 기록을 지울 수 있어요. ' +
        '자세한 내용은 <a href="#/about#privacy">이 백과에 대해</a> 화면의 "기록과 개인정보" 소절에 있어요.</p></noscript>' +
        '</div>';
    },
    render: function (mount, ctx) {
      const A = ctx.app, el = ctx.el, P = A.privacy, store = A.store, J = root.JHB || {};
      const doc = root.document;
      const canStore = storageOk();
      function say(text, kind) {
        if (J.ui && typeof J.ui.toast === 'function') J.ui.toast(text, kind ? { kind: kind } : {});
        else A.announce(text);
      }
      function sec(key, title, kids) {
        const hid = 'pg-me-h-' + key;
        return el('section.pg-me-sec', { 'aria-labelledby': hid, 'data-sec': key }, [el('h2.h-sec.pg-me-h', { id: hid }, [title])].concat(kids));
      }
      /* 들어간 코스 기록(코어 progress 의 enteredCourses). 그 함수가 없는 판이면 null(읽은 글 기준으로 셈) */
      function entered() {
        const PG = A.progress;
        if (!PG || typeof PG.enteredCourses !== 'function') return null;
        try { return PG.enteredCourses(); } catch (e) { return null; }
      }
      function snapshot() {
        const readMap = store.get('jhb.read', {});
        return {
          read: readEntries(readMap, A.bySlug),
          fav: slugList(store.get('jhb.fav', []), A.bySlug),
          recent: slugList(store.get('jhb.recent', []), A.bySlug),
          courses: courseRows(A.courses, readMap, entered()),
          total: (A.articles || []).length
        };
      }

      /* ---------- 1. 기록 설정 ---------- */
      function makeSwitch(key, title, desc, onToggle) {
        const tId = 'pg-me-sw-' + key + '-t', dId = 'pg-me-sw-' + key + '-d';
        const state = el('span.pg-me-sw-s', { 'aria-hidden': 'true' }, ['끔']);
        const btn = el('button.pg-me-sw', { type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-labelledby': tId, 'aria-describedby': dId },
          [state, el('span.pg-me-knob', { 'aria-hidden': 'true' })]);
        btn.addEventListener('click', function () { onToggle(btn.getAttribute('aria-checked') !== 'true'); });
        const note = el('p.pg-me-opt-n', { hidden: true });
        const row = el('div.pg-me-opt', null, [
          el('div.pg-me-opt-x', null, [el('p.pg-me-opt-t', { id: tId }, [title]), el('p.pg-me-opt-d', { id: dId }, [desc]), note]),
          btn
        ]);
        return {
          row: row, note: note,
          set: function (on) { btn.setAttribute('aria-checked', on ? 'true' : 'false'); state.textContent = on ? '켬' : '끔'; }
        };
      }
      const swPaused = makeSwitch('paused', '기록 남기지 않기',
        '켜면 읽은 글, 최근 읽은 글, 읽던 자리, 최근 검색이 새로 남지 않아요. 이미 남은 기록은 아래 "지우기"에서 지워요.',
        function (on) {
          P.setPaused(on);
          sync();
          if (P.paused() !== on) return say('이 브라우저에서는 설정을 저장할 수 없어요');
          say(on ? '이제 새 기록을 남기지 않아요' : '다시 기록을 남겨요', 'ok');
        });
      const swRecentq = makeSwitch('recentq', '최근 검색 저장', RECENTQ_DESC,
        function (on) {
          const had = P.has('recentq');
          P.setRecentq(on);
          if (!on) clearCaches();
          sync();
          if (P.recentq() !== on) return say('이 브라우저에서는 설정을 저장할 수 없어요');
          say(on ? RECENTQ_ON :(had ? '최근 검색을 저장하지 않아요. 남아 있던 것도 지웠어요' : '최근 검색을 저장하지 않아요'), 'ok');
        });
      swRecentq.note.textContent = '지금은 "기록 남기지 않기"가 켜져 있어서 최근 검색도 남지 않아요.';

      /* ---------- 2. 한눈에 ---------- */
      function courseList(rows) {
        return el('ul.pg-me-courses', null, rows.map(function (c) {
          return el('li.pg-me-course', { 'data-k': c.id }, [
            el('a.pg-me-course-a', { href: '#/course/' + c.id }, [c.title]),
            el('span.pg-me-course-p', null, [c.done ? '다 읽었어요' : c.read + ' / ' + c.total + ' 읽음']),
            el('span.pg-me-bar', { 'aria-hidden': 'true' }, [el('i', { style: 'width:' + c.pct + '%' })])
          ]);
        }));
      }
      const STATS = [
        {
          id: 'fav', label: '저장한 글', hue: 265,
          read: function (s) { return { n: s.fav.length, v: s.fav.length + '편', sub: s.fav.length ? '' : '글의 "저장" 버튼을 누르면 여기에 모여요.', items: s.fav }; }
        },
        {
          id: 'read', label: '읽은 글', hue: 150,
          read: function (s) { return { n: s.read.length, v: s.read.length + '편', sub: '전체 ' + s.total + '편 가운데', items: s.read.map(function (x) { return x.slug; }) }; }
        },
        {
          id: 'course', label: '읽기 코스', hue: 35, course: true,
          read: function (s) {
            const done = s.courses.filter(function (c) { return c.done; }).length;
            return {
              n: s.courses.length, v: s.courses.length + '개',
              sub: s.courses.length ? '시작한 코스' + (done ? ', 그중 ' + done + '개는 다 읽었어요' : '') : '읽기 코스를 열어 읽으면 진행이 여기에 보여요.',
              items: s.courses.map(function (c) { return c.id + ':' + c.read; }), rows: s.courses
            };
          }
        },
        {
          id: 'recent', label: '최근 읽은 글', hue: 205,
          read: function (s) { return { n: s.recent.length, v: s.recent.length + '편', sub: '', items: s.recent }; }
        }
      ];
      function makeStat(s) {
        const listId = 'pg-me-list-' + s.id;
        const v = el('span.pg-me-stat-v'), sub = el('span.pg-me-stat-s');
        const btn = el('button.pg-me-more', { type: 'button', 'aria-expanded': 'false', 'aria-controls': listId }, ['목록 보기']);
        const list = el('div.pg-me-list', { id: listId, hidden: true });
        const node = el('li.pg-me-stat', { 'data-stat': s.id }, [
          el('div.pg-me-stat-row', null, [
            el('span.spine.pg-me-spine', { style: '--h:' + s.hue, 'aria-hidden': 'true' }),
            el('div.pg-me-stat-x', null, [el('span.pg-me-stat-l', null, [s.label]), v, sub]),
            btn
          ]),
          list
        ]);
        const st = { open: false, limit: STEP, sig: '', cur: null, stamp: '' };
        function label() {
          btn.textContent = st.open ? '목록 접기' : '목록 보기';
          btn.setAttribute('aria-label', s.label + (st.open ? ' 목록 접기' : ' 목록 보기'));
          btn.setAttribute('aria-expanded', st.open ? 'true' : 'false');
        }
        /* 목록 안에 포커스가 있었으면 어느 줄(data-k)이었는지 기억 */
        function focusMark() {
          const ae = doc.activeElement;
          if (!ae || ae === list || !list.contains(ae)) return null;
          const k = ae.closest ? ae.closest('[data-k]') : null;
          return { k: k ? k.getAttribute('data-k') : null, more: !!(ae.classList && ae.classList.contains('pg-me-next')) };
        }
        /* 다시 그린 뒤 같은 줄로, 없으면 "목록 보기" 버튼으로(버튼도 숨었으면 이 칸의 제목으로) 포커스를 돌려준다 */
        function focusBack(m) {
          if (!m) return;
          let to = null;
          if (m.k != null && !list.hidden) {
            const box = Array.prototype.filter.call(list.querySelectorAll('[data-k]'), function (n) { return n.getAttribute('data-k') === m.k; })[0];
            to = box ? box.querySelector('a[href], button') : null;
          }
          if (!to && m.more && !list.hidden) to = list.querySelector('.pg-me-next');
          if (!to && !btn.hidden) to = btn;
          if (!to) { to = doc.getElementById('pg-me-h-glance'); if (to) to.setAttribute('tabindex', '-1'); }
          if (to) { try { to.focus({ preventScroll: true }); } catch (e) { to.focus(); } }
        }
        function draw(force) {
          const r = st.cur; if (!r) return;
          const sig = r.items.join('|') + '#' + st.limit + '#' + st.stamp;
          if (!force && sig === st.sig) return;
          st.sig = sig;
          const mark = focusMark();
          list.innerHTML = '';
          if (s.course) { list.appendChild(courseList(r.rows)); focusBack(mark); return; }
          const shown = r.items.slice(0, st.limit);
          list.appendChild(el('ul.rows.pg-me-rows', null, shown.map(function (slug) {
            const n = A.row(A.bySlug[slug]);
            if (n && n.setAttribute) n.setAttribute('data-k', slug);
            return n;
          })));
          const rest = r.items.length - shown.length;
          if (rest > 0) {
            const more = el('button.pg-me-btn.pg-me-next', { type: 'button' }, [Math.min(STEP, rest) + '편 더 보기 (남은 글 ' + rest + '편)']);
            more.addEventListener('click', function () {
              const from = shown.length;
              st.limit += STEP; draw(true);
              const links = list.querySelectorAll('.row a');
              if (links[from]) links[from].focus();
            });
            list.appendChild(more);
          }
          focusBack(mark);
        }
        function setOpen(on) {
          const mark = on ? null : focusMark();
          st.open = on; st.limit = STEP; label();
          if (on) { draw(true); list.hidden = false; }
          else { list.hidden = true; list.innerHTML = ''; st.sig = ''; if (mark) focusBack({ k: null, more: false }); }
        }
        btn.addEventListener('click', function () { setOpen(!st.open); });
        label();
        return {
          node: node,
          collapse: function () { if (st.open) setOpen(false); },
          update: function (snap) {
            const r = s.read(snap);
            st.cur = r; st.stamp = String(snap.read.length);
            v.textContent = r.v;
            sub.textContent = r.sub; sub.hidden = !r.sub;
            btn.hidden = !r.n;
            if (!r.n && st.open) setOpen(false);
            else if (st.open) draw(false);
          }
        };
      }
      const stats = STATS.map(makeStat);
      const pausedLine = el('p.pg-me-line', { hidden: true }, ['지금은 기록을 남기지 않고 있어요. 아래 숫자는 그 전에 남은 기록이에요.']);

      /* ---------- 3. 나는 이런 사람이에요 ---------- */
      const roleOpts = ROLES.concat([{ v: '', t: '정하지 않음', d: '첫 화면을 기본 순서로 보여 줘요.' }]);
      const roleBox = el('fieldset.pg-me-roles', { 'aria-labelledby': 'pg-me-h-role', 'aria-describedby': 'pg-me-role-d' });
      const radios = roleOpts.map(function (o) {
        const inp = el('input.pg-me-role-i', { type: 'radio', name: 'pg-me-role', value: o.v });
        const lab = el('label.pg-me-role', { 'data-role': o.v || 'none' }, [inp, el('span.pg-me-role-x', null, [el('span.pg-me-role-t', null, [o.t]), el('span.pg-me-role-d', null, [o.d])])]);
        inp.addEventListener('change', function () { if (inp.checked) setRole(o.v); });
        roleBox.appendChild(lab);
        return inp;
      });
      /* 저장은 바로, 알림은 잠깐 미뤄 마지막 선택만(방향키로 칸을 지날 때마다 알림이 연달아 나오지 않게) */
      let roleTimer = 0;
      function setRole(v) {
        let okSave = true;
        if (v) okSave = store.set(ROLE_KEY, v); else store.remove(ROLE_KEY);
        sync();
        clearTimeout(roleTimer); roleTimer = 0;
        if (!okSave) return say('이 브라우저에서는 저장할 수 없어요');
        roleTimer = setTimeout(function () { roleTimer = 0; say(roleToast(v), 'ok'); }, 600);
      }
      ctx.onCleanup(function () { clearTimeout(roleTimer); });

      /* ---------- 4. 지우기 ---------- */
      const kindList = el('ul.pg-me-kinds');
      const kindRows = {};
      function safeId(id) { return String(id).replace(/[^a-z0-9-]/gi, '-'); }
      function countText(id, snap) {
        let n = 0, unit = '편';
        if (id === 'read') n = snap.read.length;
        else if (id === 'recent') n = snap.recent.length;
        else if (id === 'fav') n = snap.fav.length;
        else if (id === 'pos') { const p = store.get('jhb.ui.reading.pos', {}); n = isMap(p) ? Object.keys(p).length : 0; }
        else if (id === 'recentq') { const q = store.get('jhb.ui.palette.recentq', []); n = Array.isArray(q) ? q.length : 0; unit = '개'; }
        return n ? n + unit : '';
      }
      function stateText(id, has, snap) {
        if (!has) return '없어요';
        /* 역할은 이름을 다시 보이지 않는다(바로 위 역할 칸에 있고, 어깨 너머로 보이는 곳을 줄이려고) */
        if (id === 'role') return '있어요';
        const c = countText(id, snap);
        return c ? c + ' 있어요' : '있어요';
      }
      function setOff(btn, off) { if (off) btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled'); }
      function ensureKindRows() {
        P.kinds.forEach(function (k) {
          if (kindRows[k.id]) { kindRows[k.id].t.textContent = k.label; kindRows[k.id].k = k; return; }
          const sId = 'pg-me-k-' + safeId(k.id);
          const t = el('span.pg-me-kind-t', null, [k.label]);
          const state = el('span.pg-me-kind-s', { id: sId });
          const btn = el('button.pg-me-btn.pg-me-kind-b', { type: 'button', 'aria-describedby': sId }, ['지우기']);
          const row = { t: t, state: state, btn: btn, k: k };
          btn.addEventListener('click', function () {
            const kk = row.k;
            /* 화면 표시(aria-disabled)만 믿지 않고 지금 기록을 다시 본다(다른 패널·탭에서 막 생겼을 수 있어서) */
            sync();
            if (!P.has(kk.id)) return say('지울 ' + kk.label + ' 기록이 없어요');
            if (!needsConfirm(kk.id)) return clearKinds([kk.id], kk.label);
            const c = countText(kk.id, snapshot());
            openConfirm({
              title: obj(kk.label) + ' 지울까요?',
              body: [el('p', null, [subj(c ? kk.label + ' ' + c : kk.label) + ' 이 기기에서 지워져요. 지운 것은 되돌릴 수 없어요.'])],
              ok: '지우기', opener: btn,
              onOk: function () { clearKinds([kk.id], kk.label); }
            });
          });
          kindRows[k.id] = row;
          kindList.appendChild(el('li.pg-me-kind', { 'data-kind': k.id }, [
            el('div.pg-me-kind-x', null, [t, HINT[k.id] ? el('span.pg-me-kind-h', null, [HINT[k.id]]) : null, state]),
            btn
          ]));
          btn.setAttribute('aria-label', k.label + ' 지우기');
        });
      }
      /* 보기 설정을 지우면 설정 모듈(js/ui/settings.js)이 jhb:privacy 를 받아 스스로 기본 보기로 되돌려요 */
      function clearKinds(ids, label) {
        P.clear(ids);
        clearCaches({ pages: ids.some(function (id) { return PAGE_KINDS.indexOf(id) >= 0; }) });
        sync();
        say(obj(label) + ' 지웠어요', 'ok');
      }
      const allBtn = el('button.pg-me-btn.pg-me-allb', { type: 'button', 'aria-haspopup': 'dialog', 'aria-describedby': 'pg-me-all-n' }, ['전부 지우기']);
      const allNote = el('p.pg-me-all-n', { id: 'pg-me-all-n' });
      function extras() {
        return planClearAll({ kinds: P.kinds, lsKeys: keysOf('localStorage'), ssKeys: keysOf('sessionStorage'), keepSettings: false });
      }
      function anything() {
        const x = extras();
        return P.kinds.some(function (k) { return P.has(k.id); }) || x.extraLs.length > 0 || x.extraSs.length > 0;
      }
      allBtn.addEventListener('click', function () {
        sync();
        if (!anything()) return say('지울 기록이 없어요');
        openAll();
      });
      function openAll() {
        const snap = snapshot();
        const hasSettings = P.has('settings');
        const list = el('ul.pg-me-dlg-list');
        const empty = el('p.pg-me-dlg-empty', { hidden: true }, ['보기 설정 말고는 지울 기록이 없어요.']);
        function fill(keepSettings) {
          list.innerHTML = '';
          const items = clearPreview(P.kinds, P.has, keepSettings).map(function (k) {
            const c = k.id === 'role' ? '' : countText(k.id, snap);
            return k.label + (c ? ' ' + c : '');
          });
          const x = extras();
          const nx = x.extraLs.length + x.extraSs.length;
          if (nx) items.push('그 밖의 이 백과 기록 ' + nx + '개');
          items.forEach(function (t) { list.appendChild(el('li', null, [t])); });
          list.hidden = !items.length; empty.hidden = !!items.length;
        }
        const check = hasSettings ? el('input', { type: 'checkbox', id: 'pg-me-dlg-cb' }) : null;
        if (check) check.addEventListener('change', function () { fill(!check.checked); });
        fill(hasSettings);
        const notes = [];
        if (P.paused()) notes.push('"기록 남기지 않기"는 켜 둔 채로 둬요.');
        if (P.recentq()) notes.push('"최근 검색 저장"은 꺼져요.');
        notes.push('지운 기록은 되돌릴 수 없어요.');
        openConfirm({
          title: '이 기기의 기록을 전부 지울까요?',
          body: [el('p.pg-me-dlg-k', null, ['지울 것']), list, empty, el('p.pg-me-dlg-note', null, [notes.join(' ')])],
          check: check ? el('label.pg-me-check', { for: 'pg-me-dlg-cb' }, [check, el('span', null, ['보기 설정(글자 크기, 밝게·어둡게)도 지우기'])]) : null,
          ok: '전부 지우기', opener: allBtn,
          onOk: function () {
            const keepSettings = hasSettings && !(check && check.checked);
            const plan = planClearAll({ kinds: P.kinds, lsKeys: keysOf('localStorage'), ssKeys: keysOf('sessionStorage'), keepSettings: keepSettings });
            P.clear(plan.ids, { keep: plan.keep });
            plan.extraLs.forEach(function (k) { store.remove(k); });
            plan.extraSs.forEach(ssRemove);
            clearCaches({ pages: true });
            sync();
            say('이 기기의 기록을 지웠어요' + (keepSettings ? '. 보기 설정은 그대로 뒀어요' : ''), 'ok');
          }
        });
      }

      /* ---------- 확인 대화상자(포커스 가둠, Esc·바깥 누르기로 닫힘, 첫 포커스는 "그만두기") ---------- */
      let dlg = null;
      function openConfirm(o) {
        if (dlg) dlg.close(false);
        const opener = o.opener || doc.activeElement;
        const cancel = el('button.pg-me-btn.pg-me-dlg-no', { type: 'button' }, ['그만두기']);
        const go = el('button.pg-me-btn.pg-me-dlg-go', { type: 'button' }, [o.ok]);
        const box = el('div.pg-me-dlg', { role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'pg-me-dlg-t', 'aria-describedby': 'pg-me-dlg-d', tabindex: '-1' }, [
          el('h2.pg-me-dlg-t', { id: 'pg-me-dlg-t' }, [o.title]),
          el('div.pg-me-dlg-d', { id: 'pg-me-dlg-d' }, o.body),
          o.check || null,
          el('div.pg-me-dlg-acts', null, [cancel, go])
        ]);
        const back = el('div.pg-me-back', null, [box]);
        /* 대화상자 밖은 inert(포커스·누르기·화면 낭독 모두 막힘). 원래 값은 닫을 때 되돌린다 */
        const saved = Array.prototype.map.call(doc.body.children, function (n) { return [n, n.inert]; });
        saved.forEach(function (x) { x[0].inert = true; });
        /* 휴대폰(아래 시트)에서만 뒤 화면 스크롤을 막는다. 넓은 화면에서 막으면 스크롤 막대가 사라지며 화면이 옆으로 밀려서 */
        const html = doc.documentElement, overflow = html.style.overflow;
        if (root.innerWidth <= 760) html.style.overflow = 'hidden';
        doc.body.appendChild(back);
        function focusables() {
          return Array.prototype.filter.call(box.querySelectorAll('button, input, a[href]'), function (n) { return !n.disabled && n.getClientRects().length; });
        }
        function keep(e) { if (dlg && !box.contains(e.target)) cancel.focus(); }
        box.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { e.preventDefault(); close(false); }
          else if (e.key === 'Tab') {
            const f = focusables(); if (!f.length) { e.preventDefault(); return; }
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && (doc.activeElement === first || doc.activeElement === box)) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
          }
          /* 팔레트(Ctrl+K, /) 같은 문서 전체 단축키가 대화상자 뒤에서 열리지 않게 */
          e.stopPropagation();
        });
        /* 바깥 누르기로 닫기. 연 직후(더블클릭·빠른 두 번 탭의 두 번째 누름)는 무시한다 */
        const openedAt = Date.now();
        back.addEventListener('click', function (e) { if (e.target === back && Date.now() - openedAt > 400) close(false); });
        /* 가림막을 눌러도 포커스가 대화상자 밖(body)으로 빠지지 않게(빠지면 Esc·Tab 가둠이 듣지 않는다) */
        back.addEventListener('mousedown', function (e) { if (e.target === back) e.preventDefault(); });
        cancel.addEventListener('click', function () { close(false); });
        go.addEventListener('click', function () { close(true); o.onOk(); });
        doc.addEventListener('focusin', keep);
        function close(done) {
          if (!dlg) return;
          dlg = null;
          doc.removeEventListener('focusin', keep);
          back.remove();
          saved.forEach(function (x) { x[0].inert = x[1]; });
          html.style.overflow = overflow;
          if (opener && doc.contains(opener)) { try { opener.focus({ preventScroll: done }); } catch (e) { opener.focus(); } }
        }
        dlg = { close: close };
        cancel.focus();
      }
      ctx.onCleanup(function () { if (dlg) dlg.close(false); });

      /* ---------- 화면 맞추기(포커스를 지키려고 다시 그리지 않고 제자리에서 바꾼다) ---------- */
      function sync() {
        const snap = snapshot();
        const paused = P.paused(), rq = P.recentq();
        swPaused.set(paused); swRecentq.set(rq);
        swRecentq.note.hidden = !(paused && rq);
        pausedLine.hidden = !paused;
        stats.forEach(function (s) { s.update(snap); });
        const r = roleOf(store.get(ROLE_KEY, null)) || '';
        radios.forEach(function (inp) { inp.checked = inp.value === r; inp.parentNode.classList.toggle('on', inp.checked); });
        ensureKindRows();
        Object.keys(kindRows).forEach(function (id) {
          const row = kindRows[id], has = P.has(id);
          row.state.textContent = stateText(id, has, snap);
          row.state.classList.toggle('pg-me-kind-none', !has);
          setOff(row.btn, !has);
        });
        const any = anything();
        setOff(allBtn, !any);
        allNote.textContent = any ? '한 번 더 물어본 뒤에 지워요. 보기 설정은 고를 때만 함께 지워요.' : '지울 기록이 없어요.';
      }

      /* ---------- 그리기 ---------- */
      mount.appendChild(el('div.pg-me', null, [
        canStore ? null : el('p.pg-me-line.pg-me-nostore', { role: 'note' }, ['이 브라우저에서는 이 기기에 기록을 저장할 수 없어요. 사생활 보호 창이거나 저장이 꺼져 있을 수 있어요. 그래서 여기에 보일 기록도 없어요.']),
        sec('set', '기록 설정', [el('div.pg-me-opts', null, [swPaused.row, swRecentq.row])]),
        sec('glance', '한눈에', [
          el('p.pg-me-desc', null, ['처음에는 개수만 보여요. 제목은 "목록 보기"를 눌러야 펼쳐져요.']),
          pausedLine,
          el('ul.pg-me-stats', null, stats.map(function (s) { return s.node; }))
        ]),
        sec('role', '나는 이런 사람이에요', [
          el('p.pg-me-desc', { id: 'pg-me-role-d' }, ['고르면 첫 화면이 맞는 읽을거리를 먼저 보여 줘요. 언제든 바꿀 수 있어요.']),
          roleBox
        ]),
        sec('clear', '지우기', [
          el('p.pg-me-desc', null, ['종류별로 지우거나 한 번에 지울 수 있어요. 저장한 글처럼 직접 모은 것은 지우기 전에 한 번 더 물어봐요.']),
          kindList,
          el('div.pg-me-all', null, [allBtn, allNote])
        ]),
        sec('know', '알아둘 것', [
          el('ul.pg-me-know', null, KNOW.map(function (t) { return el('li', null, [t]); })),
          el('p.pg-me-know-more', null, ['더 자세한 내용은 ', el('a', { href: '#/about#privacy' }, ['이 백과에 대해']), ' 화면의 "기록과 개인정보" 소절에 있어요.'])
        ])
      ]));
      sync();

      /* 다른 곳(다른 탭, 저장 버튼, 뒤로 가기로 돌아옴)에서 기록이 바뀌면 숫자를 맞춘다 */
      function onChange() { sync(); }
      function onStorage(e) { if (!e || e.key == null || String(e.key).indexOf('jhb.') === 0) sync(); }
      function onShow(e) { if (e && e.persisted) sync(); }
      /* 보기 설정 패널은 jhb:layout 만 보낸다. 자주 올 수 있어 한 프레임에 한 번만 맞춘다 */
      let layoutT = 0;
      function onLayout() { if (!layoutT) layoutT = setTimeout(function () { layoutT = 0; sync(); }, 0); }
      /* 자리를 비우면(다른 탭·앱으로, 화면 꺼짐) 펼친 제목 목록을 접는다(어깨 너머로 보이는 일을 줄이려고) */
      function collapseAll() { stats.forEach(function (s) { s.collapse(); }); }
      function onVis() { if (doc.visibilityState === 'hidden') collapseAll(); }
      root.addEventListener('jhb:privacy', onChange);
      root.addEventListener('jhb:fav', onChange);
      root.addEventListener('jhb:layout', onLayout);
      root.addEventListener('storage', onStorage);
      root.addEventListener('pageshow', onShow);
      root.addEventListener('pagehide', collapseAll);
      doc.addEventListener('visibilitychange', onVis);
      ctx.onCleanup(function () {
        clearTimeout(layoutT);
        root.removeEventListener('jhb:privacy', onChange);
        root.removeEventListener('jhb:fav', onChange);
        root.removeEventListener('jhb:layout', onLayout);
        root.removeEventListener('storage', onStorage);
        root.removeEventListener('pageshow', onShow);
        root.removeEventListener('pagehide', collapseAll);
        doc.removeEventListener('visibilitychange', onVis);
      });
    }
  };
  page.lib = lib; /* 시험용(tests/me.test.cjs) */
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
