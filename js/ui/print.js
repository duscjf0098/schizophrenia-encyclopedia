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
