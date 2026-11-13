/* 조현병 백과 · 바로 연락할 신호 한 장 (red-flags/, 선언 data/pages/red-flags.json, 자료 data/kb/red-flags.json)
   - 자료는 생성기(tools/gen/red-flags.cjs)가 부작용 총론 글의 '## 바로 연락할 신호' 표에서 그대로 뽑아요. 이 화면이 따로 가진 내용은 없어요.
     머리 소개("대부분은 드물어요…")는 선언의 lead(생성기가 글의 표 앞 문장과 같은지 확인), 표 뒤 문장("약을 스스로 끊지 말고…")은
     자료의 after(글의 표 바로 뒤 문단)예요. after 가 그 안전 문장이 아니면 같은 글자의 고정 문장 AFTER 를 보여요.
   - 순서: 당장 위험하면 119(전화 링크) → 표(넓은 화면은 표, 휴대폰은 카드. 같은 마크업에 role 을 달아 표 의미가 남아요)
     → 약을 스스로 끊지 말고 먼저 연락 → 인쇄(자바스크립트가 있을 때만) → 원천 글과 출처.
   - 모두에게 같은 표예요. 역할·기록·입력을 읽지 않고, 아무것도 저장하거나 밖으로 보내지 않아요.
   - 정적 HTML(staticHtml)과 브라우저(render)가 같은 함수로 같은 글자를 그려요. 다른 점은 링크 주소, 인쇄 버튼, 인쇄용 한 줄의 주소·날짜뿐.
   - 인쇄: css/pages/red-flags.css 의 @media print 가 A4 한 장으로(맨 위 119, 바닥은 장치가 붙이는 고지와 109·1577-0199·119).
   - node 에서는 화면 객체를 내보내고, 순수 함수는 page.lib 에 있어요(tests/red-flags.test.cjs). */
(function (root) {
  var ID = 'red-flags';
  var SOURCE = 'side-effects-overview';
  var SITE = '조현병 백과';
  var COLUMNS = ['신호', '의심되는 상태', '할 일', '자세한 글'];
  /* 글에서 표 뒤 문장을 읽지 못했을 때도 빠지지 않는 안전 문장(지시서·글과 같은 글자) */
  var AFTER = '약을 스스로 끊지 말고 먼저 연락하세요. 약에 관한 판단은 의료진이 해요.';
  var SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
  var PHONE = '<svg class="pg-red-flags-ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>';

  function plainEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function str(v) { return typeof v === 'string' ? v : ''; }
  /* 119 번호의 확인한 날·공식 출처(소방청)는 data/kb/contacts.json 의 'rescue-119' 항목에 있어요.
     이 화면의 전화 링크는 그 번호와 같아야 해요(tests/red-flags.test.cjs 가 견줘요). */
  function tel119() { return '<a href="tel:119">119</a>'; }
  /* 이스케이프한 글자 안의 따로 선 119 만 전화 링크로(1190·2119·119-1·119번째는 그대로) */
  function linkTel(escaped) {
    return String(escaped).replace(/(^|[^0-9\-])119(?![0-9\-]|번째)/g, function (_, pre) { return pre + tel119(); });
  }
  function fmtDot(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(d)); return m ? m[1] + '.' + m[2] + '.' + m[3] : ''; }
  function isRow(r) {
    return !!r && typeof r === 'object' && str(r.sign).trim() && str(r.state).trim() && str(r.action).trim() && (r.kind === '119' || r.kind === 'today');
  }
  /* 화면에 그릴 수 있는 줄만(실행 중에는 너그럽게: 이상한 줄은 건너뜀) */
  function rowsOf(data) { return data && Array.isArray(data.rows) ? data.rows.filter(isRow) : []; }
  function linksOf(row) {
    return (Array.isArray(row.links) ? row.links : []).filter(function (l) { return l && SLUG_RE.test(str(l.slug)) && str(l.title).trim(); });
  }

  /* ---------- 그리기(정적 HTML 과 브라우저가 같은 함수) ----------
     o = { esc, href(slug) → 주소, title(slug) → 글 제목|'', tools: 인쇄 버튼을 그릴지, printLine: 인쇄용 한 줄의 덧붙임(이스케이프한 HTML) } */
  function nowHtml() {
    return '<div class="pg-red-flags-now" role="note"><p class="pg-red-flags-now-t"><span class="pg-red-flags-now-l">당장 위험하면</span>' +
      '<a class="pg-red-flags-call" href="tel:119" aria-label="119 전화 걸기">' + PHONE + '<span>119</span></a></p></div>';
  }
  function lbl(name, esc) { return '<span class="pg-red-flags-lbl" aria-hidden="true">' + esc(name) + '</span>'; }
  function actionHtml(row, esc) {
    var action = str(row.action), lead = str(row.lead);
    if (!lead || action.indexOf(lead) !== 0) lead = '';
    return '<strong class="pg-red-flags-lead">' + linkTel(esc(lead || action)) + '</strong>' + (lead ? linkTel(esc(action.slice(lead.length))) : '');
  }
  function rowHtml(row, o) {
    var esc = o.esc;
    var links = linksOf(row).map(function (l) {
      return '<a class="pg-red-flags-go" href="' + esc(o.href(l.slug)) + '">' + esc(l.title) + '</a>';
    }).join('');
    return '<tr class="pg-red-flags-row pg-red-flags-k-' + (row.kind === '119' ? '119' : 'today') + '" role="row">' +
      '<td class="pg-red-flags-sign" role="cell">' + lbl(COLUMNS[0], esc) + '<span class="pg-red-flags-v">' + esc(row.sign) + '</span></td>' +
      '<td class="pg-red-flags-state" role="cell">' + lbl(COLUMNS[1], esc) + '<span class="pg-red-flags-v">' + esc(row.state) + '</span></td>' +
      '<td class="pg-red-flags-act" role="cell">' + lbl(COLUMNS[2], esc) + '<span class="pg-red-flags-v">' + actionHtml(row, esc) + '</span></td>' +
      '<td class="pg-red-flags-more" role="cell">' + lbl(COLUMNS[3], esc) + '<span class="pg-red-flags-v">' + links + '</span></td></tr>';
  }
  function tableHtml(rows, o) {
    if (!rows.length) return '';
    var esc = o.esc;
    return '<div class="pg-red-flags-wrap"><table class="pg-red-flags-table" role="table">' +
      '<caption class="pg-red-flags-cap">바로 연락할 신호 ' + rows.length + '가지와 할 일</caption>' +
      '<thead role="rowgroup"><tr role="row">' + COLUMNS.map(function (c, i) {
        return '<th scope="col" role="columnheader" class="pg-red-flags-c' + (i + 1) + '">' + esc(c) + '</th>';
      }).join('') + '</tr></thead><tbody role="rowgroup">' + rows.map(function (r) { return rowHtml(r, o); }).join('') + '</tbody></table></div>';
  }
  /* 자료의 after 가 안전 문장("스스로 끊지 말고 … 연락")일 때만 그대로, 아니면 고정 문장(생성기도 같은 조건으로 오류를 내요) */
  function isSafeAfter(t) { return t.indexOf('스스로 끊지 말고') >= 0 && t.indexOf('연락') >= 0; }
  function afterHtml(text, esc) {
    var t = str(text).trim();
    if (!isSafeAfter(t)) t = AFTER;
    var i = t.indexOf('. ');
    var first = i >= 0 ? t.slice(0, i + 1) : t, rest = i >= 0 ? t.slice(i + 1) : '';
    return '<p class="pg-red-flags-after"><strong>' + esc(first) + '</strong>' + esc(rest) + '</p>';
  }
  function toolsHtml() {
    return '<div class="pg-red-flags-tools"><button type="button" class="btn pg-red-flags-print">인쇄하기</button>' +
      '<p class="pg-red-flags-tip">A4 한 장으로 나와요. 냉장고처럼 잘 보이는 곳에 붙여 두면 급할 때 바로 볼 수 있어요.</p></div>';
  }
  function fromHtml(data, o) {
    var esc = o.esc;
    var src = data && data.source && typeof data.source === 'object' ? data.source : {};
    var slug = SLUG_RE.test(str(src.slug)) ? src.slug : SOURCE;
    var title = o.title(slug) || str(src.title) || '부작용 총론';
    var day = fmtDot(src.updated);
    return '<p class="pg-red-flags-from">이 표는 <a href="' + esc(o.href(slug)) + '">' + esc(title) + '</a> 글의 \'바로 연락할 신호\' 표를 그대로 옮겼어요' +
      (day ? '(그 글 ' + esc(day) + ' 고침)' : '') + '. 표의 근거와 119에 연락할 때 챙길 것은 그 글에 있어요.</p>';
  }
  function sourcesHtml(data, esc) {
    var list = data && Array.isArray(data.sources) ? data.sources.filter(function (s) { return s && /^https:\/\//.test(str(s.url)) && str(s.title).trim(); }) : [];
    if (!list.length) return '';
    return '<details class="pg-red-flags-src"><summary>이 표의 출처 ' + list.length + '개</summary><ol class="pg-red-flags-src-list">' +
      list.map(function (s) {
        var n = Number(s.n);
        return '<li' + (n > 0 && n === Math.floor(n) ? ' value="' + n + '"' : '') + '>' + (str(s.org) ? esc(s.org) + ' · ' : '') +
          '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" aria-label="' + esc(s.title + ' (새 창에서 열림)') + '">' + esc(s.title) + '</a>' + (str(s.year) ? ' · ' + esc(s.year) : '') + '</li>';
      }).join('') + '</ol><p class="pg-red-flags-src-note">번호는 그 글의 출처 번호예요.</p></details>';
  }
  function printLineHtml(o) {
    return '<p class="pg-red-flags-prt">' + o.esc(SITE) + ' · 바로 연락할 신호 한 장' + (o.printLine || '') + '</p>';
  }
  function pageHtml(data, o) {
    var rows = rowsOf(data);
    return nowHtml() + tableHtml(rows, o) + afterHtml(data && data.after, o.esc) + (o.tools ? toolsHtml() : '') +
      fromHtml(data, o) + printLineHtml(o) + sourcesHtml(data, o.esc);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function today(d) { d = d || new Date(); return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate()); }
  /* 종이에 적을 이 화면 주소: 쿼리·조각 없이 */
  function pageUrl(loc) {
    if (!loc) return '';
    var base = loc.origin && loc.origin !== 'null' ? String(loc.origin) + String(loc.pathname || '/') : String(loc.href || '').split(/[?#]/)[0];
    try { return decodeURI(base); } catch (e) { return base; }
  }

  var lib = { COLUMNS: COLUMNS, AFTER: AFTER, linkTel: linkTel, rowsOf: rowsOf, pageHtml: pageHtml, pageUrl: pageUrl, today: today };

  var page = {
    id: ID,
    lib: lib,
    /* 검색엔진·자바스크립트가 꺼진 환경: 같은 표(글 링크는 #/a/slug, 빌드가 실제 경로로 바꿈). 인쇄 버튼은 없어요 */
    staticHtml: function (ctx) {
      ctx = ctx || {};
      var esc = typeof ctx.esc === 'function' ? ctx.esc : plainEsc;
      var arts = ctx.articles || {};
      var data = ctx.data ? ctx.data[ID] : null;
      return pageHtml(data, {
        esc: esc,
        href: function (slug) { return '#/a/' + slug; },
        title: function (slug) { var a = arts[slug]; return a && a.title ? String(a.title) : ''; },
        tools: false
      });
    },
    render: function (mount, ctx) {
      var A = ctx.app;
      var data = ctx.data ? ctx.data[ID] : null;
      var canPrint = typeof root.print === 'function';
      var o = {
        esc: A.esc,
        href: function (slug) { return A.L('#/a/' + slug); },
        title: function (slug) { var a = A.bySlug && A.bySlug[slug]; return a && a.title ? String(a.title) : ''; },
        tools: canPrint,
        printLine: ''
      };
      mount.innerHTML = pageHtml(data, o);
      var line = mount.querySelector('.pg-red-flags-prt');
      function stamp() {
        if (!line) return;
        line.textContent = SITE + ' · 바로 연락할 신호 한 장 · ' + pageUrl(root.location) + ' · 인쇄한 날 ' + today();
      }
      stamp();
      root.addEventListener('beforeprint', stamp);
      ctx.onCleanup(function () { root.removeEventListener('beforeprint', stamp); });
      var btn = mount.querySelector('.pg-red-flags-print');
      if (btn) btn.addEventListener('click', function () {
        stamp();
        var P = root.JHB && root.JHB.ui && root.JHB.ui.print;
        if (P && typeof P.print === 'function') P.print();
        else { try { root.print(); } catch (e) { /* 인쇄를 막은 브라우저: 아무것도 하지 않아요 */ } }
      });
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
