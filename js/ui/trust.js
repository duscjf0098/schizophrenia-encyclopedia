/* js/ui/trust.js — 믿음 장치 (문서 화면)
   1) 글 frontmatter 에 reviewed(출처 확인일)가 있으면 "출처 확인 YYYY.MM.DD" 한 줄과 뜻풀이를 보여요.
      넓은 화면은 여백(margin) 자리의 문서 정보 아래, 여백이 숨는 좁은 화면(1080px 이하)과 인쇄는 글 끝(end) 자리.
   2) 고침 기록(data/kb/changes.json)에 그 글의 기록이 있으면 글 끝(end) 자리에 접힌 "이 글의 고친 내역"(최근 5개).
      넓은 화면에서는 여백 상자에 그 내역으로 가는 버튼도 둬요.
   - 사용자 입력·저장·외부 요청이 없어요. 자료는 JHB.app.loadData('changes') 로 한 번만 받아요(못 받으면 내역 없이 조용히 넘어가요).
   - 앞날의 약속(다음 확인 날짜 등)은 쓰지 않아요.
   - node 에서 require 하면 순수 함수만 내보내요(tests/changes.test.cjs). 종류 이름·정렬은 js/pages/changes.js 와 같아야 해요(테스트가 확인).
   공개: JHB.ui.trust = { reviewedOf, reviewedLine, historyFor, KIND_LABEL, TEXT, LIMIT } */
(function (root) {
  'use strict';
  var KINDS = ['new', 'enrich', 'fix', 'feature'];
  var KIND_LABEL = { new: '새 글', enrich: '보강', fix: '바로잡음', feature: '기능' };
  var LIMIT = 5;
  var TEXT = {
    label: '출처 확인',
    def: 'AI 작업자가 이 글의 출처를 다시 열어 본문과 대조한 날이에요. 전문가 감수가 아니에요.',
    hist: '이 글의 고친 내역',
    count: '건',
    recentOnly: '최근 5개만 보여요.',
    all: '고침 기록 전체 보기',
    region: '출처 확인과 고친 내역'
  };

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function isDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : '');
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }
  function fmtDot(d) { return String(d || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3'); }
  /* frontmatter 의 reviewed → 'YYYY-MM-DD' 또는 null(없거나 형식이 틀리면 보이지 않음) */
  function reviewedOf(meta) {
    var v = meta && meta.reviewed;
    if (typeof v !== 'string') return null;
    v = v.trim();
    return isDate(v) ? v : null;
  }
  function reviewedLine(d) { return TEXT.label + ' ' + fmtDot(d); }
  /* js/pages/changes.js 의 compare 와 같은 순서: 날짜 내림차순 → 종류 → 이름 → what */
  function cmpStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function rank(k) { var i = KINDS.indexOf(k); return i < 0 ? KINDS.length : i; }
  function nameOf(e) { return e.slug != null ? String(e.slug) : String(e.title == null ? '' : e.title); }
  function compare(a, b) {
    return cmpStr(String(b.date), String(a.date)) || (rank(a.kind) - rank(b.kind)) || cmpStr(nameOf(a), nameOf(b)) || cmpStr(String(a.what), String(b.what));
  }
  /* 그 글의 기록: { total, items(최신순 LIMIT 개) }. 이상한 항목은 건너뛰어요 */
  function historyFor(list, slug) {
    var mine = (Array.isArray(list) ? list : []).filter(function (e) {
      return isObj(e) && e.slug === slug && isDate(e.date) && KINDS.indexOf(e.kind) >= 0 && typeof e.what === 'string' && e.what.trim();
    }).sort(compare);
    return { total: mine.length, items: mine.slice(0, LIMIT) };
  }

  var api = { KIND_LABEL: KIND_LABEL, TEXT: TEXT, LIMIT: LIMIT, reviewedOf: reviewedOf, reviewedLine: reviewedLine, historyFor: historyFor, fmtDot: fmtDot };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  if (!root.JHB || !root.JHB.app) return;
  root.JHB.ui = root.JHB.ui || {};
  root.JHB.ui.trust = api;

  var A = root.JHB.app, el = A.el;
  var done = typeof WeakSet === 'function' ? new WeakSet() : null;
  var token = 0;

  /* 상자는 랜드마크가 아니에요(div). 이름 붙은 region 은 글 끝의 .trust-end 하나뿐이에요 */
  function revBox(d, extra) {
    return el('div.trust-rev' + (extra || ''), null, [
      el('p.trust-rev-line', null, [el('span.trust-rev-k', null, [TEXT.label]), ' ', el('time.trust-rev-d', { datetime: d }, [fmtDot(d)])]),
      el('p.trust-rev-def', null, [TEXT.def])
    ]);
  }
  function histDetails(h) {
    var list = el('ol.trust-hist-list', null, h.items.map(function (e) {
      return el('li.trust-hist-item', null, [
        el('time.trust-hist-d', { datetime: e.date }, [fmtDot(e.date)]),
        el('span.trust-kind.trust-k-' + e.kind, null, [KIND_LABEL[e.kind]]),
        el('span.trust-hist-w', null, [e.what])
      ]);
    }));
    var foot = [];
    if (h.total > h.items.length) foot.push(TEXT.recentOnly + ' ');
    if (A.pageById && A.pageById.changes) foot.push(el('a', { href: '#/changes' }, [TEXT.all]));
    return el('details.trust-hist', null, [
      /* 건수 앞 빈칸은 글자로 둬요(접근 이름·복사 글자가 "내역 2건"이 되게) */
      el('summary', null, [TEXT.hist, ' ', el('span.trust-hist-n', null, [h.total + TEXT.count])]),
      list,
      foot.length ? el('p.trust-hist-foot', null, foot) : null
    ]);
  }
  function openHistory(details) {
    details.open = true;
    var sum = details.querySelector('summary');
    /* 멀리(두 화면 넘게) 갈 때는 느린 기기에서 오래 미끄러지지 않게 바로 뛰어요 */
    var far = Math.abs(details.getBoundingClientRect().top) > window.innerHeight * 2;
    details.scrollIntoView({ block: 'center', behavior: A.reducedMotion() || far ? 'auto' : 'smooth' });
    if (sum) sum.focus({ preventScroll: true });
  }

  function onArticle(slug, meta) {
    var endSlot = A.slot('end');
    if (!slug || !endSlot) return;
    if (done) { if (done.has(endSlot)) return; done.add(endSlot); }
    else { if (endSlot.getAttribute('data-trust')) return; endSlot.setAttribute('data-trust', '1'); }
    var my = ++token;
    var rev = reviewedOf(meta);
    /* data-print="keep": 인쇄 모듈이 글 끝 자리를 비울 때도 출처 확인 줄은 종이에 남겨요(내역은 css 가 인쇄에서 숨김) */
    var marginBox = null, endSec = el('section.trust-end', { 'aria-label': TEXT.region, 'data-print': 'keep' });
    if (rev) {
      marginBox = revBox(rev);
      A.mount('margin', marginBox, 10);
      endSec.appendChild(revBox(rev, '.trust-rev-m'));
      /* 넓은 화면에서 내역이 없으면 글 끝 상자는 보일 것이 없어요. 빈 상자로 end 자리를 차지하지 않게
         좁아지거나 인쇄할 때·내역이 올 때 끼워요 */
      mountEndWhenNeeded(endSec, my, endSlot);
    }
    /* 내역 자료는 글을 다 그린 뒤 한가할 때 받아요(느린 기기에서 글 그리기와 다투지 않게) */
    idle(function () { if (my === token && A.slot('end') === endSlot) loadHistory(slug, my, endSlot, endSec, marginBox); });
  }
  var WIDE = '(min-width: 1081px)';
  function isWide() { return typeof window.matchMedia === 'function' && window.matchMedia(WIDE).matches; }
  function mountEnd(endSec, my, endSlot) {
    if (endSec.parentNode || my !== token || A.slot('end') !== endSlot) return;
    A.mount('end', endSec, 900);
  }
  function mountEndWhenNeeded(endSec, my, endSlot) {
    if (!isWide()) { mountEnd(endSec, my, endSlot); return; }
    var mq = window.matchMedia(WIDE);
    var forPrint = false;
    function gone() { return my !== token || A.slot('end') !== endSlot; }
    function off() {
      if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq);
      window.removeEventListener('beforeprint', onPrint);
      window.removeEventListener('afterprint', onAfter);
      window.removeEventListener('jhb:article', off);
    }
    /* 좁아지면 끼우고 끝(그 뒤로는 계속 둬요). 내역이 와서 이미 끼워졌으면 그만 들어요 */
    function onMq() {
      if (gone()) { off(); return; }
      if (forPrint) return; /* 인쇄 중 쪽 너비로 바뀐 것은 무시(afterprint 가 정리) */
      if (endSec.parentNode) { off(); return; }
      if (!mq.matches) { mountEnd(endSec, my, endSlot); off(); }
    }
    /* 종이에는 출처 확인 줄을 남겨요(인쇄에서는 여백이 숨어요). 다 찍으면 넓은 화면에서는 다시 빼요 */
    function onPrint() { if (gone()) { off(); return; } if (!endSec.parentNode) { forPrint = true; mountEnd(endSec, my, endSlot); } }
    function onAfter() {
      if (gone()) { off(); return; }
      if (forPrint && mq.matches && !endSec.querySelector('.trust-hist') && endSec.parentNode) {
        endSec.parentNode.removeChild(endSec);
        window.dispatchEvent(new Event('jhb:layout'));
      }
      forPrint = false;
    }
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    window.addEventListener('beforeprint', onPrint);
    window.addEventListener('afterprint', onAfter);
    window.addEventListener('jhb:article', off);
  }
  function idle(fn) {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 1500 });
    else setTimeout(fn, 200);
  }
  function loadHistory(slug, my, endSlot, endSec, marginBox) {
    A.loadData('changes').then(function (list) {
      if (my !== token || A.slot('end') !== endSlot) return;
      var h = historyFor(list, slug);
      if (!h.total) return;
      var det = histDetails(h);
      endSec.appendChild(det);
      mountEnd(endSec, my, endSlot);
      /* 넓은 화면: 여백 상자에서 글 끝의 내역으로 가는 버튼 */
      var jump = el('button.trust-jump', { type: 'button', 'aria-label': TEXT.hist + ' ' + h.total + TEXT.count + ', 글 끝에서 펼치기' }, [TEXT.hist + ' ' + h.total + TEXT.count]);
      jump.addEventListener('click', function () { openHistory(det); });
      if (marginBox) { marginBox.appendChild(jump); window.dispatchEvent(new Event('jhb:layout')); }
      else A.mount('margin', el('div.trust-rev.trust-rev-jump', null, [jump]), 10);
    }).catch(function () { /* 내역 자료를 못 받으면(오프라인 첫 방문 등) 내역 없이 둬요 */ });
  }

  window.addEventListener('jhb:article', function (e) {
    var d = e.detail || {};
    onArticle(d.slug, d.meta);
  });
  /* 모듈이 늦게 실행돼 첫 jhb:article 을 놓쳤으면, 이미 그려진 문서를 한 번 직접 처리 */
  var w = A.where();
  if (w && w.path && w.path[0] === 'a' && w.path[1] && A.slot('end')) {
    var slug0 = w.path[1], slot0 = A.slot('end');
    A.loadArticle(slug0).then(function (doc) {
      if (A.slot('end') === slot0) onArticle(slug0, doc && doc.meta);
    }).catch(function () { });
  }
})(typeof window !== 'undefined' ? window : this);
