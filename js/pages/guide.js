/* 조현병 백과 · 상황별 길잡이 화면 (guide/, 선언은 data/pages/guide.json)
   - 자료: data/kb/guide.json(상황 15개), data/kb/contacts.json(번호 레지스트리. 모든 번호는 공식 페이지에서 직접 확인한 날·주소와 함께)
     상황 = { id, group, label, who: [self|family|near], meds?, contacts: [{ ref, when }], rights: [{ kind?: rule|right, name, text, from }],
              read: [slug], note, noteFrom }
     rights[].text·note 는 from·noteFrom 글 본문의 문장 그대로예요(tests/guide.test.cjs 가 확인).
   - 화면: 맨 위 고정 줄(119·109·1577-0199) → "진단이나 판단이 아니에요" → 상황 버튼(한 단계, 질문지·점수 없음)
     → 고른 상황의 안내(연락할 곳·알아둘 권리와 제도·읽을 글)를 그 묶음 바로 아래에 펼쳐요.
   - 같은 상황이면 누구에게나 같은 안내예요. who 는 자료 정리용이고 화면 내용을 바꾸지 않아요(역할을 읽지 않음).
   - 고른 상황은 이 화면의 메모리에만 있어요. 저장소(localStorage·sessionStorage)·주소(쿼리·조각)·history 에 남기지 않고,
     새로 고치면 사라져요. 바깥으로 보내는 것도 없어요.
   - 인쇄: 고른 상황 하나를 한 장으로(맨 위 고정 줄, 인쇄한 날, 바닥 고지는 화면 장치의 .fp-notices).
   - node 에서는 화면 객체를 내보내고, 순수 함수는 page.lib 에 있어요(tests/guide.test.cjs). */
(function (root) {
  'use strict';
  var WHO = ['self', 'family', 'near'];
  var KINDS = ['rule', 'right'];
  var KIND_TITLE = { rule: '법이 정한 요건과 절차', right: '당사자의 권리' };
  /* 맨 위 고정 줄: 위기 줄 세 번호. 번호는 data/crisis-card.js·contacts.json 과 같아요(테스트) */
  var TOP = [
    { when: '생명이 위급하면', tel: '119' },
    { when: '죽고 싶은 마음이 들면', tel: '109' },
    { when: '정신건강 위기', tel: '1577-0199' }
  ];
  var TEXT = {
    topLabel: '지금 위급하다면',
    notJudge: '이 안내는 진단이나 판단이 아니에요. 같은 상황이면 누구에게나 같은 공공 안내를 보여 드려요.',
    noTrace: '고른 상황은 저장하지 않고 주소에도 남기지 않아요. 새로 고치면 처음 화면으로 돌아가요.',
    trace: '여기서 연 글은 다른 글처럼 이 기기의 기록에 남을 수 있어요.',
    traceLink: '내 서재에서 지우거나 기록 쉼을 켤 수 있어요.',
    empty: '상황 안내를 불러오지 못했어요. 새로 고쳐 보거나 위의 번호로 연락하세요.',
    needsArea: '휴대전화로 걸 때는 지역번호를 먼저 눌러요.',
    ask: '지금 어떤 상황인가요?',
    askHint: '하나를 고르면 바로 아래에 연락할 곳과 알아둘 것을 보여 드려요.',
    nojs: '모든 상황의 안내를 아래에 차례로 실었어요.',
    picked: '고른 상황',
    contacts: '연락할 곳',
    rights: '알아둘 권리와 제도',
    read: '읽을 글',
    meds: '약은 스스로 늘리거나 줄이거나 끊지 말고 먼저 담당 의사와 상의하세요.',
    checked: '확인',
    from: '근거 글',
    print: '이 안내 인쇄',
    back: '다른 상황 고르기',
    region: '지역 사업과 기관 이름은 지역마다 달라요. 가까운 정신건강복지센터는 1577-0199에 전화해 물어볼 수 있어요.',
    printHead: '조현병 백과 · 상황별 길잡이',
    printKeep: '이 종이는 공공 안내예요. 번호와 운영 시간은 확인한 날 이후 바뀌었을 수 있어요.'
  };

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function str(v) { return typeof v === 'string' ? v : ''; }
  function nonEmpty(s) { return typeof s === 'string' && s.trim().length > 0; }
  function isDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : '');
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }
  function fmtDot(d) { return isDate(d) ? d.replace(/-/g, '.') : ''; }
  var TEL_RE = /^(?:1\d{2,3}|1[5-8]\d{2}-\d{4})$/;
  var ID_RE = /^[a-z0-9][a-z0-9-]*$/;
  function plainEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* ---------- 자료 정리(실행 중에는 너그럽게: 이상한 항목은 건너뜀) ---------- */
  function cleanContacts(list) {
    var by = Object.create(null);
    (Array.isArray(list) ? list : []).forEach(function (c) {
      if (!isObj(c) || !ID_RE.test(str(c.id)) || !TEL_RE.test(str(c.tel)) || !nonEmpty(c.name)) return;
      if (!by[c.id]) by[c.id] = c;
    });
    return by;
  }
  /* 상황 목록 + 묶음(처음 나온 순서). 없는 연락처 ref 는 빼고, 글 정보가 없는 slug 도 has(slug) 가 false 면 빼요 */
  function model(guide, contacts, has) {
    var by = cleanContacts(contacts);
    var seen = Object.create(null), groups = [], gIndex = Object.create(null);
    var sits = [];
    (Array.isArray(guide) ? guide : []).forEach(function (s) {
      if (!isObj(s) || !ID_RE.test(str(s.id)) || seen[s.id] === true || !nonEmpty(s.label)) return;
      seen[s.id] = true;
      var g = nonEmpty(s.group) ? s.group : '그 밖의 상황';
      var sit = {
        id: s.id, label: s.label, group: g, meds: s.meds === true,
        contacts: (Array.isArray(s.contacts) ? s.contacts : []).filter(function (c) { return isObj(c) && by[c.ref]; })
          .map(function (c) { return { contact: by[c.ref], when: str(c.when) }; }),
        rights: (Array.isArray(s.rights) ? s.rights : []).filter(function (r) { return isObj(r) && nonEmpty(r.text); })
          .map(function (r) { return { kind: KINDS.indexOf(r.kind) >= 0 ? r.kind : '', name: str(r.name), text: r.text, from: ID_RE.test(str(r.from)) && (!has || has(r.from)) ? r.from : '' }; }),
        read: (Array.isArray(s.read) ? s.read : []).filter(function (x) { return ID_RE.test(str(x)) && (!has || has(x)); }),
        note: str(s.note)
      };
      sits.push(sit);
      if (!(g in gIndex)) { gIndex[g] = groups.length; groups.push({ title: g, items: [] }); }
      groups[gIndex[g]].items.push(sit);
    });
    var byId = Object.create(null);
    sits.forEach(function (s) { byId[s.id] = s; });
    return { sits: sits, groups: groups, byId: byId };
  }
  /* 버튼을 누를 때 다음 선택: 같은 것을 다시 누르면 닫고(null), 다른 것이면 그것. 없는 id 는 null */
  function nextSelection(cur, id, m) {
    if (!m || typeof id !== 'string' || !ID_RE.test(id) || !m.byId[id]) return null;
    return cur === id ? null : id;
  }
  /* 고른 상황이 들어 있는 묶음의 순서(패널을 그 묶음 바로 아래에 끼워요) */
  function groupIndexOf(m, id) {
    for (var i = 0; i < m.groups.length; i++) {
      for (var j = 0; j < m.groups[i].items.length; j++) if (m.groups[i].items[j].id === id) return i;
    }
    return -1;
  }
  /* 권리 칸 나누기: kind 가 있으면 요건·권리 두 칸, 없으면 한 칸.
     두 칸의 좌우는 상황마다 같게 늘 KINDS 순서(요건 → 권리)예요. 자료 순서와 상관없어요 */
  function rightCols(sit) {
    var hasKind = sit.rights.some(function (r) { return !!r.kind; });
    if (!hasKind) return [{ kind: '', items: sit.rights }];
    return KINDS.map(function (k) { return { kind: k, items: sit.rights.filter(function (r) { return (r.kind || 'right') === k; }) }; })
      .filter(function (c) { return c.items.length > 0; });
  }

  /* ---------- 그리기(정적 HTML 과 브라우저가 같은 글자를 씀) ----------
     o = { esc, art(slug) → { title, summary, sec, hue } | null, href(slug) } */
  function telA(tel, label, cls, esc) {
    return '<a class="' + cls + '" href="tel:' + esc(tel) + '"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '>' + esc(tel) + '</a>';
  }
  function topHtml(esc) {
    return '<div class="pg-guide-top" role="group" aria-label="' + esc(TEXT.topLabel) + '"><ul class="pg-guide-top-list">' +
      TOP.map(function (t, i) {
        return '<li class="pg-guide-top-item">' + (i ? '<span class="pg-guide-top-sep" aria-hidden="true"> · </span>' : '') +
          '<span class="pg-guide-top-when">' + esc(t.when) + '</span> ' + telA(t.tel, t.when + ' ' + t.tel + ' 전화', 'pg-guide-top-tel', esc) + '</li>';
      }).join('') + '</ul></div>';
  }
  function contactHtml(c, esc) {
    var k = c.contact;
    var meta = [];
    if (nonEmpty(k.hours)) meta.push('<span>' + esc(k.hours) + '</span>');
    if (isDate(k.checked)) meta.push('<span class="pg-guide-c-checked"><time datetime="' + esc(k.checked) + '">' + esc(fmtDot(k.checked)) + '</time> ' + esc(TEXT.checked) + '</span>');
    /* 휴대전화에서 지역번호가 필요한 번호(1331): 버튼 이름과 '언제' 바로 아래에 같은 크기로 알려요 */
    var area = k.needsArea === true;
    return '<li class="pg-guide-c">' + telA(k.tel, k.name + ' ' + k.tel + ' 전화' + (area ? '. ' + TEXT.needsArea : ''), 'pg-guide-tel', esc) +
      '<div class="pg-guide-c-body"><p class="pg-guide-c-name">' + esc(k.name) + '</p>' +
      (c.when ? '<p class="pg-guide-c-when">' + esc(c.when) + '</p>' : '') +
      (area ? '<p class="pg-guide-c-area">' + esc(TEXT.needsArea) + '</p>' : '') +
      (meta.length ? '<p class="pg-guide-c-meta">' + meta.join('<span class="pg-guide-dot" aria-hidden="true"> · </span>') + '</p>' : '') +
      (nonEmpty(k.note) ? '<p class="pg-guide-c-note">' + esc(k.note) + '</p>' : '') + '</div></li>';
  }
  function rightHtml(r, o) {
    var a = r.from ? o.art(r.from) : null;
    return '<li class="pg-guide-r">' + (r.name ? '<strong class="pg-guide-r-name">' + o.esc(r.name) + '</strong> ' : '') +
      '<span class="pg-guide-r-text">' + o.esc(r.text) + '</span>' +
      (a ? ' <a class="pg-guide-r-from" href="' + o.esc(o.href(r.from)) + '">' + o.esc(TEXT.from) + ': ' + o.esc(a.title) + '</a>' : '') + '</li>';
  }
  function rightsHtml(sit, o, hx) {
    var cols = rightCols(sit);
    if (cols.length === 1 && !cols[0].kind) return '<ul class="pg-guide-rights">' + cols[0].items.map(function (r) { return rightHtml(r, o); }).join('') + '</ul>';
    return '<div class="pg-guide-rcols">' + cols.map(function (c) {
      return '<div class="pg-guide-rcol pg-guide-rcol-' + c.kind + '"><' + hx + ' class="pg-guide-rcol-h">' + o.esc(KIND_TITLE[c.kind]) + '</' + hx + '>' +
        '<ul class="pg-guide-rights">' + c.items.map(function (r) { return rightHtml(r, o); }).join('') + '</ul></div>';
    }).join('') + '</div>';
  }
  function readHtml(sit, o) {
    var items = sit.read.map(function (slug) {
      var a = o.art(slug);
      if (!a) return '';
      return '<li class="row"><a href="' + o.esc(o.href(slug)) + '"><span class="row-t">' + o.esc(a.title) + '</span>' +
        (a.summary ? '<span class="row-s">' + o.esc(a.summary) + '</span>' : '') +
        (a.sec ? '<span class="row-m"><span class="row-sec">' + (a.hue != null && isFinite(Number(a.hue)) ? '<span class="spine" style="--h:' + Number(a.hue) + '" aria-hidden="true"></span>' : '') + o.esc(a.sec) + '</span></span>' : '') +
        '</a></li>';
    }).join('');
    return items ? '<ul class="rows pg-guide-read">' + items + '</ul>' : '';
  }
  /* 상황 하나의 안내. lv = 상황 제목의 머리 수준(3 이면 h3, 소제목 h4, 권리 칸 제목 h5) */
  function situationBody(sit, o, lv) {
    var h = 'h' + (lv + 1), hx = 'h' + (lv + 2), esc = o.esc;
    var out = '';
    if (sit.meds) out += '<p class="pg-guide-meds">' + esc(TEXT.meds) + '</p>';
    if (sit.contacts.length) {
      out += '<section class="pg-guide-sec pg-guide-sec-c"><' + h + ' class="pg-guide-sh">' + esc(TEXT.contacts) + '</' + h + '>' +
        '<ul class="pg-guide-contacts">' + sit.contacts.map(function (c) { return contactHtml(c, esc); }).join('') + '</ul></section>';
    }
    if (sit.rights.length) {
      out += '<section class="pg-guide-sec pg-guide-sec-r"><' + h + ' class="pg-guide-sh">' + esc(TEXT.rights) + '</' + h + '>' + rightsHtml(sit, o, hx) + '</section>';
    }
    var rd = readHtml(sit, o);
    if (rd) out += '<section class="pg-guide-sec pg-guide-sec-a"><' + h + ' class="pg-guide-sh">' + esc(TEXT.read) + '</' + h + '>' + rd + '</section>';
    if (sit.note) out += '<p class="pg-guide-note">' + esc(sit.note) + '</p>';
    return out;
  }
  /* opts.meHref: 내 서재 주소(그 화면이 있을 때만). 여기서 연 글은 다른 글처럼 기기 기록에 남는다는 정직한 한계 */
  function introHtml(esc, isStatic, opts) {
    var meHref = opts && typeof opts.meHref === 'string' && opts.meHref ? opts.meHref : '';
    return '<p class="pg-guide-not">' + esc(TEXT.notJudge) + '</p>' +
      (isStatic ? '<p class="pg-guide-priv">' + esc(TEXT.nojs) + '</p>'
        : '<p class="pg-guide-priv">' + esc(TEXT.noTrace) + ' ' + esc(TEXT.trace) +
          (meHref ? ' <a class="pg-guide-me" href="' + esc(meHref) + '">' + esc(TEXT.traceLink) + '</a>' : '') + '</p>');
  }
  function emptyHtml(esc) { return '<p class="pg-guide-empty" role="status">' + esc(TEXT.empty) + '</p>'; }
  /* 검색엔진·자바스크립트가 꺼진 환경: 모든 상황을 펼친 목록(주소 조각 링크 없이 차례대로) */
  function staticPage(m, o) {
    var esc = o.esc;
    if (!m.sits.length) return topHtml(esc) + emptyHtml(esc);
    return topHtml(esc) + introHtml(esc, true) +
      m.groups.map(function (g) {
        return '<section class="pg-guide-sgroup"><h2 class="pg-guide-sgh">' + esc(g.title) + '</h2>' +
          g.items.map(function (s) {
            return '<section class="pg-guide-panel pg-guide-static" data-sit="' + esc(s.id) + '"><h3 class="pg-guide-ph">' + esc(s.label) + '</h3>' + situationBody(s, o, 3) + '</section>';
          }).join('') + '</section>';
      }).join('') + '<p class="pg-guide-region">' + esc(TEXT.region) + '</p>';
  }
  /* 브라우저 화면의 틀: 고정 줄 + 안내 + 상황 버튼(묶음별). 패널은 render 가 고른 묶음 뒤에 끼워요 */
  function screenHtml(m, esc, opts) {
    var prt = '<p class="pg-guide-prt" aria-hidden="true"><span>' + esc(TEXT.printHead) + '</span> <span class="pg-guide-prt-date"></span> <span class="pg-guide-prt-url"></span></p>';
    /* 자료가 비었거나 모두 걸러지면 고를 것 없는 질문 대신 한 줄과 고정 줄만 */
    if (!m.sits.length) return prt + topHtml(esc) + emptyHtml(esc);
    return prt + topHtml(esc) + introHtml(esc, false, opts) +
      '<h2 class="pg-guide-ask" id="pg-guide-ask">' + esc(TEXT.ask) + '</h2><p class="pg-guide-askhint">' + esc(TEXT.askHint) + '</p>' +
      '<div class="pg-guide-groups">' + m.groups.map(function (g, gi) {
        return '<section class="pg-guide-group" data-g="' + gi + '" aria-labelledby="pg-guide-g' + gi + '"><h3 class="pg-guide-gh" id="pg-guide-g' + gi + '">' + esc(g.title) + '</h3>' +
          '<ul class="pg-guide-sits">' + g.items.map(function (s) {
            return '<li><button type="button" class="pg-guide-sit" data-id="' + esc(s.id) + '" aria-expanded="false" aria-controls="pg-guide-panel">' + esc(s.label) + '</button></li>';
          }).join('') + '</ul></section>';
      }).join('') + '</div><p class="pg-guide-region">' + esc(TEXT.region) + '</p>';
  }
  function panelHtml(sit, o) {
    var esc = o.esc;
    return '<div class="pg-guide-phead"><p class="pg-guide-pk">' + esc(TEXT.picked) + '</p><h3 class="pg-guide-ph" id="pg-guide-ph" tabindex="-1">' + esc(sit.label) + '</h3></div>' +
      situationBody(sit, o, 3) +
      '<p class="pg-guide-keep">' + esc(TEXT.printKeep) + '</p>' +
      '<div class="pg-guide-acts"><button type="button" class="btn pg-guide-print">' + esc(TEXT.print) + '</button>' +
      '<button type="button" class="btn pg-guide-back">' + esc(TEXT.back) + '</button></div>';
  }
  function dateText(d) {
    if (Object.prototype.toString.call(d) !== '[object Date]' || isNaN(d.getTime())) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
  }

  var lib = {
    WHO: WHO, KINDS: KINDS, TOP: TOP, TEXT: TEXT, TEL_RE: TEL_RE,
    isDate: isDate, fmtDot: fmtDot, cleanContacts: cleanContacts, model: model, nextSelection: nextSelection,
    groupIndexOf: groupIndexOf, rightCols: rightCols, topHtml: topHtml, situationBody: situationBody,
    staticPage: staticPage, screenHtml: screenHtml, panelHtml: panelHtml, dateText: dateText
  };

  var page = {
    id: 'guide',
    lib: lib,
    staticHtml: function (ctx) {
      ctx = ctx || {};
      var esc = typeof ctx.esc === 'function' ? ctx.esc : plainEsc;
      var arts = ctx.articles || {}, secs = {};
      (Array.isArray(ctx.sections) ? ctx.sections : []).forEach(function (s) { if (s && s.id != null) secs[s.id] = s; });
      var data = ctx.data || {};
      var m = model(data.guide, data.contacts, function (slug) { return !!arts[slug]; });
      return staticPage(m, {
        esc: esc,
        art: function (slug) {
          var a = arts[slug]; if (!a) return null;
          var s = secs[a.section] || {};
          return { title: a.title, summary: a.summary || '', sec: s.title || '', hue: s.hue };
        },
        href: function (slug) { return '#/a/' + slug; }
      });
    },
    render: function (mount, ctx) {
      var A = ctx.app, data = ctx.data || {};
      var m = model(data.guide, data.contacts, function (slug) { return !!A.bySlug[slug]; });
      var o = {
        esc: A.esc,
        art: function (slug) {
          var a = A.bySlug[slug]; if (!a) return null;
          var s = A.secById[a.section] || {};
          return { title: a.title, summary: a.summary || '', sec: s.title || '', hue: s.hue };
        },
        href: function (slug) { return A.L('#/a/' + slug); }
      };
      var cur = null;
      var meHref = A.pageById && Object.prototype.hasOwnProperty.call(A.pageById, 'me') ? A.L('#/me') : '';
      mount.innerHTML = screenHtml(m, A.esc, { meHref: meHref });
      /* 고른 상황은 메모리에만 있어서, 읽을 글로 갔다가 뒤로 오거나 새로 고치면 처음 화면이에요.
         그때 브라우저가 열린 패널 기준의 스크롤 위치로 되돌리면 맥락 없는 자리(짧아진 화면의 끝)에 떨어지니,
         이 화면의 기록 항목에서만 스크롤 되살리기를 끄고 맨 위(고정 줄·상황 버튼)부터 보여요.
         history.scrollRestoration 은 스크롤 방식만 정하고 고른 상황은 어디에도 남기지 않아요 */
      try { if (root.history && 'scrollRestoration' in root.history) root.history.scrollRestoration = 'manual'; } catch (e) { }
      var groupsEl = mount.querySelector('.pg-guide-groups');
      if (!groupsEl) {
        /* 자료가 비었을 때: 고정 줄과 한 줄 안내만(고를 버튼이 없음) */
        ctx.onCleanup(function () { try { root.history.scrollRestoration = 'auto'; } catch (e) { } });
        return;
      }
      var panel = document.createElement('section');
      panel.className = 'pg-guide-panel';
      panel.id = 'pg-guide-panel';
      panel.hidden = true;
      panel.setAttribute('aria-labelledby', 'pg-guide-ph');
      /* 버튼의 aria-controls 가 늘 있는 요소를 가리키게 처음부터 숨긴 채 둬요 */
      groupsEl.appendChild(panel);

      function stampPrint() {
        var d = mount.querySelector('.pg-guide-prt-date'), u = mount.querySelector('.pg-guide-prt-url');
        if (d) d.textContent = '· 인쇄한 날 ' + dateText(new Date());
        /* 주소는 쿼리·조각 없이 경로만 */
        if (u) { var p = location.origin && location.origin !== 'null' ? location.origin + location.pathname : ''; try { p = decodeURI(p); } catch (e) { } u.textContent = p ? '· ' + p : ''; }
      }
      function scrollTo(node, block) {
        if (!node || !node.scrollIntoView) return;
        try { node.scrollIntoView({ block: block || 'start', behavior: A.reducedMotion && A.reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { node.scrollIntoView(true); }
      }
      /* 화면에서 실제로 보이는 높이(위 막대·아래 하단 바 몫인 scroll-padding 을 뺀 값) */
      function viewSpan() {
        var pt = 0, pb = 0;
        try { var cs = root.getComputedStyle(document.documentElement); pt = parseFloat(cs.scrollPaddingTop) || 0; pb = parseFloat(cs.scrollPaddingBottom) || 0; } catch (e) { }
        return (root.innerHeight || document.documentElement.clientHeight || 0) - pt - pb;
      }
      function buttons() { return Array.prototype.slice.call(mount.querySelectorAll('.pg-guide-sit')); }
      function select(id, opts) {
        cur = nextSelection(cur, id, m);
        buttons().forEach(function (b) { b.setAttribute('aria-expanded', b.getAttribute('data-id') === cur ? 'true' : 'false'); });
        mount.classList.toggle('pg-guide-has-sel', !!cur);
        if (!cur) {
          panel.hidden = true;
          panel.innerHTML = '';
          panel.removeAttribute('data-sit');
          A.announce('안내를 접었어요.');
          return;
        }
        var sit = m.byId[cur];
        panel.innerHTML = panelHtml(sit, o);
        panel.setAttribute('data-sit', cur);
        var g = groupsEl.querySelector('.pg-guide-group[data-g="' + groupIndexOf(m, cur) + '"]');
        if (g && g.nextSibling !== panel) g.parentNode.insertBefore(panel, g.nextSibling);
        panel.hidden = false;
        var h = panel.querySelector('#pg-guide-ph');
        if (!opts || opts.focus !== false) {
          if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
          scrollTo(panel);
        }
      }
      function onClick(e) {
        var t = e.target && e.target.closest ? e.target : null;
        if (!t) return;
        var b = t.closest('.pg-guide-sit');
        if (b && mount.contains(b)) { select(b.getAttribute('data-id')); return; }
        if (t.closest('.pg-guide-print')) {
          stampPrint();
          if (root.JHB && JHB.ui && JHB.ui.print && typeof JHB.ui.print.print === 'function') JHB.ui.print.print();
          else if (typeof root.print === 'function') root.print();
          return;
        }
        if (t.closest('.pg-guide-back')) { backToButtons(); }
      }
      /* 다른 상황 고르기·Esc: 고른 버튼에 포커스. 질문 제목부터 그 버튼까지가 한 화면에 들어가면 제목으로 올리고,
         아니면(뒤쪽 묶음·짧은 화면) 포커스한 버튼을 화면 가운데로 — 포커스가 화면 밖·하단 바 밑에 숨지 않게 */
      function backToButtons() {
        var sb = cur ? mount.querySelector('.pg-guide-sit[data-id="' + cur + '"]') : null;
        var target = sb || mount.querySelector('.pg-guide-sit');
        if (!target) return;
        try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
        var ask = mount.querySelector('#pg-guide-ask');
        var fits = false;
        if (ask) {
          var span = target.getBoundingClientRect().bottom - ask.getBoundingClientRect().top;
          fits = span + 16 <= viewSpan();
        }
        if (fits) scrollTo(ask); else scrollTo(target, 'center');
      }
      function onKey(e) {
        if (e.key === 'Escape' && cur && panel.contains(e.target)) { e.preventDefault(); backToButtons(); }
      }
      mount.addEventListener('click', onClick);
      mount.addEventListener('keydown', onKey);
      /* Ctrl+P 로 바로 인쇄해도 날짜·주소가 찍히게 */
      root.addEventListener('beforeprint', stampPrint);
      ctx.onCleanup(function () {
        root.removeEventListener('beforeprint', stampPrint);
        mount.removeEventListener('click', onClick);
        mount.removeEventListener('keydown', onKey);
        try { root.history.scrollRestoration = 'auto'; } catch (e) { }
        cur = null;
      });
      stampPrint();
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
