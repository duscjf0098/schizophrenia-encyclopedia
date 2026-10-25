/* 조현병 백과 · 화면 전환과 상태 표시 (polish)
   - 페이지 사이 짧은 크로스페이드(브라우저가 같은 사이트 뷰 전환을 지원할 때만, css/ui/polish.css 의 @view-transition)
   - 문서를 불러오는 동안 글 모양 자리표시(skeleton)
   - 토스트: JHB.ui.toast(text, {kind}) — 저장·주소 복사 때 자동으로 띄움
   - 분류 색 길찾기: 상단 줄과 빵부스러기 색 막대를 현재 분류 색으로
   - 새 창으로 열리는 링크에 ↗ 표시(.pol-ext)
   공개: JHB.ui.toast, JHB.ui.polish = { toast, setSection } */
(function () {
  if (!window.JHB || !JHB.app) return;
  const A = JHB.app, el = A.el, U = JHB.util;
  JHB.ui = JHB.ui || {};
  const root = document.documentElement;
  const LOADING = '문서를 불러오고 있어요.';

  /* ---------- 1. 뷰 전환 지원 표시 ----------
     실제 전환은 CSS(@view-transition { navigation: auto })가 맡는다. 여기서는 지원 여부만 html 에 적어 둔다. */
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function markVT() {
    const ok = typeof document.startViewTransition === 'function' && !reduced.matches;
    root.classList.toggle('pol-vt', ok);
  }
  markVT();
  if (reduced.addEventListener) reduced.addEventListener('change', markVT);
  /* 전환이 건너뛰어질 때(새로고침, 상대 페이지가 옵트인하지 않음 등) 약속이 거부되며 콘솔에 오류로 남지 않게 받아 둔다 */
  function quiet(e) {
    const vt = e && e.viewTransition;
    if (!vt) return;
    ['finished', 'ready', 'updateCallbackDone'].forEach(function (k) { if (vt[k] && vt[k].catch) vt[k].catch(function () { }); });
  }
  window.addEventListener('pagereveal', quiet);
  window.addEventListener('pageswap', quiet);

  /* ---------- 2. 자리표시 ---------- */
  function isLoadingP(n) {
    return n && n.nodeType === 1 && n.matches('p.empty') && n.textContent.trim() === LOADING && !n.classList.contains('pol-skel-text');
  }
  function skeleton() {
    function lines(n, cls) {
      const out = [];
      for (let i = 0; i < n; i++) out.push(el('span.pol-skel-line', { class: cls || '' }));
      return out;
    }
    return el('div.pol-skel', { 'aria-hidden': 'true' }, [
      el('span.pol-skel-line.pol-skel-crumb'),
      el('span.pol-skel-line.pol-skel-title'),
      el('div.pol-skel-group', null, lines(2, 'pol-skel-sum')),
      el('div.pol-skel-group.pol-skel-body', null, lines(6, 'pol-skel-p'))
    ]);
  }
  function placeSkeleton(p) {
    if (p.classList.contains('pol-skel-text')) return;
    p.classList.add('pol-skel-text');
    p.parentNode.insertBefore(skeleton(), p.nextSibling);
  }
  function removeSkeleton() {
    U.qsa('.pol-skel', A.main).forEach(function (n) { n.remove(); });
    U.qsa('p.pol-skel-text', A.main).forEach(function (n) { n.classList.remove('pol-skel-text'); });
  }
  U.qsa('#app > p.empty').forEach(function (p) { if (isLoadingP(p)) placeSkeleton(p); });
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (isLoadingP(n) && n.parentNode === A.main) placeSkeleton(n);
      });
    });
  }).observe(A.main, { childList: true });
  window.addEventListener('jhb:article', removeSkeleton);

  /* ---------- 3. 토스트 ---------- */
  let toastEl = null, toastTimer = null;
  function toast(text, opts) {
    opts = opts || {};
    if (!toastEl) {
      toastEl = el('div.pol-toast', { role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastEl);
    }
    clearTimeout(toastTimer);
    toastEl.className = 'pol-toast' + (opts.kind ? ' pol-toast-' + opts.kind : '');
    /* 같은 문구가 이어져도 다시 읽히도록 비운 뒤 채운다 */
    toastEl.textContent = '';
    toastEl.textContent = String(text || '');
    /* 다음 프레임에 show 를 붙여 교체될 때도 살짝 다시 뜨게 */
    toastEl.classList.remove('pol-toast-show');
    void toastEl.offsetWidth;
    toastEl.classList.add('pol-toast-show');
    toastTimer = setTimeout(function () { toastEl.classList.remove('pol-toast-show'); }, opts.duration || 2500);
    return toastEl;
  }
  JHB.ui.toast = toast;

  /* 저장 버튼: 앱의 클릭 처리기(버튼 자신)가 먼저 돌고 난 뒤 document 에서 결과를 읽는다 */
  document.addEventListener('click', function (e) {
    const b = e.target && e.target.closest ? e.target.closest('.js-fav, .mb-fav') : null;
    if (!b) return;
    const on = b.getAttribute('aria-pressed') === 'true';
    toast(on ? '저장했어요' : '저장을 해제했어요', { kind: on ? 'ok' : '' });
  });
  /* 공유 버튼: 글자가 "주소 복사됨"으로 바뀌는 순간 */
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      const t = m.target.nodeType === 3 ? m.target.parentNode : m.target;
      const b = t && t.closest ? t.closest('button.btn') : null;
      if (!b || b.classList.contains('js-fav')) return;
      if (b.textContent.trim() === '주소 복사됨' && !b.hasAttribute('data-pol-toasted')) {
        b.setAttribute('data-pol-toasted', '');
        toast('주소를 복사했어요', { kind: 'ok' });
      }
    });
  }).observe(A.main, { childList: true, subtree: true, characterData: true });

  /* ---------- 4. 분류 색 길찾기 ---------- */
  function sectionOf(detail) {
    const kind = detail.kind, id = detail.id;
    if (kind === 'a' && id && A.bySlug[id]) return A.secById[A.bySlug[id].section] || null;
    if (kind === 's' && id) return A.secById[id] || null;
    if (kind === 'glossary') return A.sections.filter(function (s) { return s.glossary; })[0] || null;
    return null;
  }
  function setSection(sec) {
    if (sec && sec.hue != null) {
      root.style.setProperty('--pol-sec', 'hsl(' + sec.hue + ' var(--spine-s) var(--spine-l))');
      root.classList.add('pol-has-sec');
    } else {
      root.style.removeProperty('--pol-sec');
      root.classList.remove('pol-has-sec');
    }
    /* 빵부스러기의 분류 링크 앞 색 막대 */
    U.qsa('.crumb .pol-crumb-spine', A.main).forEach(function (n) { n.remove(); });
    if (!sec) return;
    const want = A.L(sec.glossary ? '#/glossary' : '#/s/' + sec.id);
    const bar = function () { return el('span.pol-crumb-spine', { style: '--h:' + sec.hue, 'aria-hidden': 'true' }); };
    let done = false;
    U.qsa('.crumb a', A.main).forEach(function (a) {
      if (a.getAttribute('href') !== want) return;
      a.classList.add('pol-crumb-sec');
      a.insertBefore(bar(), a.firstChild);
      done = true;
    });
    /* 분류·용어 사전 화면은 빵부스러기 끝이 링크가 아닌 글자("분류", "용어 사전")라 그 앞에 둔다 */
    const crumb = A.main.querySelector('.crumb');
    if (!done && crumb && crumb.lastChild) crumb.insertBefore(bar(), crumb.lastChild);
  }
  function onPage(detail) { setSection(sectionOf(detail)); }
  window.addEventListener('jhb:page', function (e) { onPage(e.detail || {}); });
  (function () { const w = A.where(); onPage({ kind: w.path[0] || 'home', id: w.path[1] || null }); })();

  /* ---------- 5. 새 창 링크 표시 ---------- */
  function markExt(rootNode) {
    if (!rootNode || rootNode.nodeType !== 1) return;
    if (rootNode.matches('a[target="_blank"]')) rootNode.classList.add('pol-ext');
    U.qsa('a[target="_blank"]:not(.pol-ext)', rootNode).forEach(function (a) { a.classList.add('pol-ext'); });
  }
  markExt(document.body);
  new MutationObserver(function (muts) {
    muts.forEach(function (m) { m.addedNodes.forEach(markExt); });
  }).observe(document.body, { childList: true, subtree: true });

  JHB.ui.polish = { toast: toast, setSection: setSection };
})();
