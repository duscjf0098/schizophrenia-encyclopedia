/* js/ui/nowhelp.js — 상단 "지금 도움"(#btn-help)을 누르면 뜨는 시트(대화상자)
   - 내용의 원천은 data/crisis-card.js(JHB.crisisCard) 하나예요. 번호를 이 파일에 다시 적지 않아요.
     전화: high 카드의 tel: 항목(109 · 1577-0199 · 119). 글: 카드에 있는 글 가운데 LINK_ORDER 순서로.
   - "전화가 어렵다면"은 글 crisis-hotlines 의 해당 소절로 가는 링크만(연결 방법은 글이 말해요).
   - 휴대폰(좁은 화면·터치)은 번호 줄 전체가 tel: 링크, 넓은 화면은 번호를 크게(링크 아님) + "번호 복사".
   - 전화가 저절로 걸리는 길은 없어요: 열 때 첫 포커스는 제목, Enter·단축키로 tel: 에 가지 않음,
     시트를 연 직후(GUARD_MS)의 포인터 누름과 시트 밖에서 시작한 누름은 시트 안 링크를 따르지 않음(급한 두 번 누름).
   - 열린 동안 뒤 화면은 inert + 스크롤 잠금. 휴대폰 뒤로 가기는 시트만 닫아요(history 항목 하나, 주소는 그대로).
   - 가운데·Ctrl·Shift·Alt·Meta 클릭, 자바스크립트가 없으면 원래 링크(위기 상담 전화 글)대로 가요.
   - 연 기록을 저장하지 않아요(저장소를 쓰지 않음).
   - "전화가 어렵다면"은 a/crisis-hotlines/#h-N 주소로 가요. 소절을 펴고 옮기는 일은 코어가 해요(이 모듈에는 그 처리가 없어요).
   공개: JHB.ui.nowhelp = { open(from?), close(), isOpen() }
   node: module.exports = 순수 함수(tests/nowhelp.test.cjs) */
(function (root) {
  'use strict';
  /* 시트에 보일 글(카드에 있을 때만, 이 순서로) */
  const LINK_ORDER = ['crisis-hotlines', 'suicide-warning-signs', 'emergency-response'];
  const ALT_SLUG = 'crisis-hotlines';
  /* crisis-hotlines 의 "전화 말고 글로 하고 싶다면" 같은 소절 제목(콘텐츠 계약: tests/nowhelp.test.cjs) */
  const ALT_RE = /전화가 어렵|전화 말고|글로|문자|채팅|SNS/;
  const LEVELS = ['high', 'watch', 'harm'];
  /* 시트를 연 뒤 이 시간 안의 포인터 누름은 시트 안 링크(특히 tel:)를 따르지 않는다 */
  const GUARD_MS = 600;

  /* { label: '109 자살예방상담 (24시간)', href: 'tel:109' } → { num, name, note, href } (전화가 아니면 null) */
  function parseTel(a) {
    if (!a || typeof a.href !== 'string' || a.href.indexOf('tel:') !== 0) return null;
    const num = a.href.slice(4).trim();
    if (!num) return null;
    let name = String(a.label || '').trim(), note = '';
    const m = /\(([^()]*)\)\s*$/.exec(name);
    if (m) { note = m[1].trim(); name = name.slice(0, m.index).trim(); }
    if (name.indexOf(num) === 0) name = name.slice(num.length).trim();
    return { num: num, name: name, note: note, href: 'tel:' + num };
  }
  function actionsOf(card, k) { return card && card[k] && Array.isArray(card[k].actions) ? card[k].actions : []; }
  /* 카드 → { tels: [...], links: [{ slug, label, href }] }. exists(slug) 가 false 인 글은 뺀다 */
  function pickSheet(card, exists) {
    const out = { tels: [], links: [] };
    if (!card || typeof card !== 'object') return out;
    let tels = actionsOf(card, 'high').map(parseTel).filter(Boolean);
    if (!tels.length) LEVELS.forEach(function (k) { tels = tels.concat(actionsOf(card, k).map(parseTel).filter(Boolean)); });
    const seen = {};
    tels.forEach(function (t) { if (!seen[t.num]) { seen[t.num] = 1; out.tels.push(t); } });
    const found = {};
    LEVELS.forEach(function (k) {
      actionsOf(card, k).forEach(function (a) {
        const m = /^#\/a\/([a-z0-9-]+)$/.exec((a && a.href) || '');
        if (m && !Object.prototype.hasOwnProperty.call(found, m[1])) found[m[1]] = String(a.label || '');
      });
    });
    LINK_ORDER.forEach(function (slug) {
      if (!Object.prototype.hasOwnProperty.call(found, slug)) return;
      if (typeof exists === 'function' && !exists(slug)) return;
      out.links.push({ slug: slug, label: found[slug], href: '#/a/' + slug });
    });
    return out;
  }
  /* 글 차례([{id, text, level}])에서 "전화가 어렵다면"에 맞는 h2 소절 id */
  function findAltSection(toc) {
    if (!Array.isArray(toc)) return null;
    for (let i = 0; i < toc.length; i++) {
      const t = toc[i];
      if (t && t.level === 2 && ALT_RE.test(String(t.text || ''))) return t.id || null;
    }
    return null;
  }
  /* 시트로 가로챌 클릭: 왼쪽 버튼(키보드 Enter 포함), 보조키 없음, 아직 처리되지 않음 */
  function isPlainClick(e) {
    if (!e || e.defaultPrevented) return false;
    if (e.button !== undefined && e.button !== 0) return false;
    return !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey);
  }
  /* 시트 안 링크 클릭을 막을지: 포인터 클릭(detail>0)인데 시트 안에서 시작하지 않았거나(armed=false) 연 지 GUARD_MS 가 안 됐으면.
     키보드 Enter·스크린리더 활성화(detail 0)는 그대로 둔다 */
  function linkGuard(e, st) {
    if (!e || !(e.detail > 0)) return false;
    return !(st && st.armed) || !(st.sinceOpen >= GUARD_MS);
  }
  /* jhb:page 가 오면 닫을지: 주소가 열 때와 달라졌을 때만(같은 주소의 첫 그리기·다시 그리기로는 닫지 않음) */
  function closeOnPage(detail, openPath, nowPath) {
    if (!detail || detail.loading) return false;
    return openPath !== nowPath;
  }
  /* '#h-3' → 'h-3', 그 밖은 null */
  function sectionHash(h) {
    const m = /^#(h-\d+)$/.exec(String(h || ''));
    return m ? m[1] : null;
  }
  /* 시트 바닥의 "번호는 ○○에 확인한 내용이에요"에 쓰는 날: 글을 고친 날(updated)이 아니라 출처 확인일(reviewed).
     확인일이 없으면 날짜 문구를 붙이지 않는다(고친 날을 확인한 날처럼 말하지 않으려고) */
  function footDay(art) { return art && typeof art.reviewed === 'string' ? art.reviewed : ''; }
  const pure = { parseTel: parseTel, pickSheet: pickSheet, findAltSection: findAltSection, isPlainClick: isPlainClick, linkGuard: linkGuard, closeOnPage: closeOnPage, sectionHash: sectionHash, footDay: footDay, LINK_ORDER: LINK_ORDER, GUARD_MS: GUARD_MS };
  if (typeof module !== 'undefined' && module.exports) { module.exports = pure; return; }

  /* ================= 브라우저 ================= */
  const JHB = root.JHB;
  if (!JHB || !JHB.app) return;
  const A = JHB.app, el = A.el;
  const NARROW = 760;
  const btn = document.getElementById('btn-help');
  /* 열린 동안 inert 로 둘 뒤 화면(라이브 영역 #live 는 body 바로 아래라 여기에 들지 않음) */
  const BG = '.skip, header.topbar, .shell, footer.sitefoot, .mb-bar';
  let scrim = null, sheet = null, titleEl = null, body = null;
  let opener = null, isOpen = false, phoneMode = null, altId = null, altP = null, altKick = null;
  let openedAt = 0, armed = false, openPath = '', locked = [], pushed = false, ignorePop = 0;

  function data() {
    return pickSheet(JHB.crisisCard, function (s) { return !!(A.bySlug && A.bySlug[s]); });
  }
  function isPhone() {
    if (innerWidth <= NARROW) return true;
    return !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);
  }
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function svg(path) { return el('span.nh-ic', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>' }); }
  const ICON = {
    phone: '<path d="M6.6 3.5h2.6l1.5 4-2 1.4a11 11 0 0 0 6.4 6.4l1.4-2 4 1.5v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>',
    arrow: '<path d="M9 6l6 6-6 6"/>'
  };

  function build() {
    if (sheet) return;
    scrim = el('div.nh-scrim', { hidden: true });
    titleEl = el('h2.nh-title', { id: 'nh-title', tabindex: '-1' }, ['지금 도움이 필요하다면']);
    const x = el('button.nh-x', { type: 'button', 'aria-label': '닫기' }, [el('span', { 'aria-hidden': 'true' }, ['×'])]);
    body = el('div.nh-body');
    sheet = el('section.nh-sheet', { id: 'nh-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'nh-title', 'aria-describedby': 'nh-lead', hidden: true },
      [el('div.nh-head', null, [titleEl, x]), body]);
    document.body.appendChild(scrim); document.body.appendChild(sheet);
    x.addEventListener('click', function () { close(true); });
    /* 연 직후의 누름(입구를 두 번 누름)으로 바로 닫히지 않게 */
    scrim.addEventListener('click', function (e) { if (e.detail > 0 && now() - openedAt < GUARD_MS) return; close(true); });
    sheet.addEventListener('keydown', trap);
    /* 시트 안에서 시작한 누름만 링크를 따른다 */
    sheet.addEventListener('pointerdown', function () { armed = true; }, true);
    sheet.addEventListener('click', onSheetClick, true);
  }
  function onSheetClick(e) {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (linkGuard(e, { armed: armed, sinceOpen: now() - openedAt })) { e.preventDefault(); e.stopPropagation(); return; }
    const href = a.getAttribute('href');
    if (href.indexOf('tel:') === 0 || !isPlainClick(e)) return; /* 전화는 시트를 열어 둔다. 새 탭·창은 브라우저대로 */
    e.preventDefault();
    if (a.parentNode && a.parentNode.classList && a.parentNode.classList.contains('nh-alt') && !altId) {
      /* 소절 id 를 아직 못 찾았으면 잠깐(최대 1.2초) 기다렸다가 간다. 못 찾으면 글 첫머리로 */
      let gone = false;
      const go = function () { if (gone) return; gone = true; leave(altHref()); };
      ensureAlt(true).then(go); setTimeout(go, 1200);
      return;
    }
    leave(a.href);
  }
  /* 시트에서 글로 갈 때: 시트용 history 항목을 새 화면으로 바꿔 끼운다(뒤로 가기 한 번이면 원래 화면) */
  function leave(url) {
    const p = pushed; pushed = false;
    close(false, true);
    if (p) location.replace(url); else location.assign(url);
  }

  function telRow(t, phone) {
    const label = t.num + ' ' + (t.name || '') + (t.note ? ', ' + t.note : '');
    if (phone) {
      return el('li.nh-tel', null, [el('a.nh-call', { href: t.href, 'aria-label': label + '. 전화 걸기' }, [
        svg(ICON.phone),
        el('span.nh-what', null, [el('span.nh-name', null, [t.name || t.num]), t.note ? el('span.nh-note', null, [t.note]) : null]),
        el('span.nh-num', null, [t.num])
      ])]);
    }
    /* 넓은 화면: 번호는 크게 보이기만(링크 아님). 전화 연결 앱이 있는 PC 에서 눌러서 바로 걸리지 않게 */
    const copyBtn = el('button.nh-copy', { type: 'button', 'aria-label': t.num + ' 번호 복사' }, ['번호 복사']);
    copyBtn.addEventListener('click', function () { copyNum(t.num, copyBtn); });
    return el('li.nh-tel.nh-wide', null, [
      el('span.nh-what', null, [el('span.nh-name', null, [t.name || t.num]), t.note ? el('span.nh-note', null, [t.note]) : null]),
      el('span.nh-num', null, [t.num]),
      copyBtn
    ]);
  }
  function linkRow(href, text, sub) {
    return el('li', null, [el('a.nh-link', { href: href }, [el('span.nh-lt', null, [text, sub ? el('span.nh-ls', null, [sub]) : null]), svg(ICON.arrow)])]);
  }
  function altHref() { return A.L('#/a/' + ALT_SLUG) + (altId ? '#' + altId : ''); }
  /* 시트 맨 아래 작은 고지: 일반 정보 · AI 초안 · 감수 없음, 번호를 확인한 날(위기 상담 전화 글의 확인일) */
  function footText() {
    const art = A.bySlug && A.bySlug[ALT_SLUG];
    let dated = '';
    const day = footDay(art);
    if (day && A.md && A.md.noticeHtml) {
      const t = document.createElement('template'); t.innerHTML = A.md.noticeHtml('dated', day);
      const s = t.content.textContent.trim();
      if (s) dated = '번호는 ' + s;
    }
    return '일반 정보예요. 진단과 치료는 담당 의사와 상의해 주세요. AI가 공개 자료로 초안을 썼고 전문가 감수는 받지 않았어요.' + (dated ? ' ' + dated : '');
  }
  function fill() {
    const d = data();
    phoneMode = isPhone();
    sheet.classList.toggle('nh-phone', phoneMode);
    body.textContent = '';
    body.appendChild(el('p.nh-lead', { id: 'nh-lead' }, [phoneMode
      ? '혼자 견디지 않아도 괜찮아요. 번호를 누르면 전화 앱이 열려요.'
      : '혼자 견디지 않아도 괜찮아요. 번호를 휴대폰으로 걸거나 복사해 두세요.']));
    body.appendChild(el('ul.nh-tels', { 'aria-label': '전화' }, d.tels.map(function (t) { return telRow(t, phoneMode); })));
    const links = [];
    if (A.bySlug && A.bySlug[ALT_SLUG]) {
      const alt = linkRow(altHref(), '전화가 어렵다면', '글로 상담하는 곳 안내');
      alt.classList.add('nh-alt');
      links.push(alt);
    }
    d.links.forEach(function (l) { links.push(linkRow(A.L(l.href), l.label || (A.bySlug[l.slug] || {}).title || l.slug)); });
    const guide = A.pageById && A.pageById.guide;
    if (guide) links.push(linkRow(A.L('#/guide'), guide.title || guide.label || '상황별 길잡이'));
    if (links.length) body.appendChild(el('ul.nh-links', { 'aria-label': '더 읽을 곳' }, links));
    body.appendChild(el('p.nh-foot', null, [footText()]));
  }
  /* "전화가 어렵다면" 소절 id: 글 원문을 받아(앱 캐시) 차례에서 찾는다. 못 찾으면 글 첫머리로.
     실패(오프라인 등)하면 다음에 다시 시도한다. soon=true 면 한가할 때를 기다리지 않고 곧바로 */
  function ensureAlt(soon) {
    if (altId) return Promise.resolve(altId);
    if (!A.loadArticle || !A.md || !A.md.render || !(A.bySlug && A.bySlug[ALT_SLUG])) return Promise.resolve(null);
    if (altP) { if (soon && altKick) altKick(); return altP; }
    altP = new Promise(function (res) {
      let started = false;
      function run() {
        if (started) return; started = true; altKick = null;
        A.loadArticle(ALT_SLUG).then(function (doc) {
          let id = null;
          try { id = findAltSection(A.md.render(doc.body).toc); } catch (e) { id = null; }
          altId = id;
          if (altId && sheet) { const a = sheet.querySelector('.nh-alt a'); if (a) a.setAttribute('href', altHref()); }
          res(altId);
        }, function () { altP = null; res(null); });
      }
      altKick = run;
      if (soon) run();
      /* 시트가 뜨는 동안 느린 기기를 붙잡지 않게, 한가할 때 받아 그린다 */
      else if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1500 });
      else setTimeout(run, 300);
    });
    return altP;
  }

  /* ---------- 뒤 화면 잠금 ---------- */
  function lockBg() {
    unlockBg();
    Array.prototype.forEach.call(document.querySelectorAll(BG), function (n) {
      if (n === sheet || n === scrim) return;
      locked.push([n, !!n.inert]); n.inert = true;
    });
    const de = document.documentElement;
    if (innerWidth - de.clientWidth > 0) de.classList.add('nh-gutter');
    de.classList.add('nh-lock');
  }
  function unlockBg() {
    locked.forEach(function (p) { p[0].inert = p[1]; });
    locked = [];
    document.documentElement.classList.remove('nh-lock', 'nh-gutter');
  }

  /* ---------- 열고 닫기 ---------- */
  function open(from) {
    if (!data().tels.length) return false;
    build();
    if (isOpen) { titleEl.focus({ preventScroll: true }); return true; }
    /* 휴대폰 차례·용어 시트가 열려 있으면 먼저 조용히 닫는다(시트가 두 겹으로 뜨지 않게) */
    const ms = document.querySelector('.mb-sheet:not([hidden])');
    if (from && ms && ms.contains(from)) from = btn;
    if (ms && JHB.ui && JHB.ui.mobile && JHB.ui.mobile.close) JHB.ui.mobile.close(false);
    opener = from && from.focus ? from : document.activeElement;
    if (opener && ms && ms.contains(opener)) opener = btn;
    fill();
    isOpen = true; openedAt = now(); armed = false; openPath = location.pathname;
    sheet.classList.toggle('nh-anim', !(A.reducedMotion && A.reducedMotion()));
    scrim.hidden = false; sheet.hidden = false;
    lockBg();
    if (btn) btn.setAttribute('aria-expanded', 'true');
    /* 휴대폰 뒤로 가기가 시트만 닫게(주소·제목은 그대로, 지금 history.state 는 보존) */
    try {
      const st = history.state;
      history.pushState(st && typeof st === 'object' ? Object.assign({}, st, { nh: 1 }) : { nh: 1 }, '');
      pushed = true;
    } catch (x) { pushed = false; }
    titleEl.focus({ preventScroll: true });
    ensureAlt(false);
    return true;
  }
  /* fromHistory: 뒤로 가기(popstate)나 화면 이동으로 닫힐 때(시트용 history 항목을 따로 지우지 않음) */
  function close(refocus, fromHistory) {
    if (!isOpen) return;
    isOpen = false;
    sheet.hidden = true; scrim.hidden = true;
    unlockBg();
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (pushed && !fromHistory) { pushed = false; ignorePop++; history.back(); }
    pushed = false;
    const back = opener; opener = null;
    if (refocus && back && back !== document.body && document.contains(back) && typeof back.focus === 'function') back.focus({ preventScroll: true });
  }
  window.addEventListener('popstate', function () {
    if (ignorePop > 0) { ignorePop--; return; }
    if (isOpen && pushed) { pushed = false; close(true, true); }
  });
  function focusables() {
    return Array.prototype.filter.call(sheet.querySelectorAll('a[href], button:not([disabled])'), function (n) { return n.offsetParent !== null || n.getClientRects().length; });
  }
  function trap(e) {
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1], cur = document.activeElement;
    if (e.shiftKey && (cur === first || cur === titleEl || !sheet.contains(cur))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (cur === last || !sheet.contains(cur))) { e.preventDefault(); first.focus(); }
  }
  /* 열린 동안: Esc 는 시트만 닫고(서랍·팝오버까지 닫지 않게), 팔레트 단축키(Ctrl+K, /)는 막는다(브라우저 기본 동작도) */
  window.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) e.stopPropagation();
  }, true);
  /* 포커스가 시트 밖으로 새면 제목으로 되돌린다 */
  document.addEventListener('focusin', function (e) { if (isOpen && sheet && !sheet.contains(e.target)) titleEl.focus({ preventScroll: true }); });
  window.addEventListener('resize', function () {
    if (!isOpen || isPhone() === phoneMode) return;
    fill(); titleEl.focus({ preventScroll: true });
  });
  /* 같은 주소에서 오는 jhb:page(느린 연결에서 앱이 글을 처음 다 그린 때 등)로는 닫지 않는다 */
  window.addEventListener('jhb:page', function (e) {
    if (isOpen && closeOnPage(e.detail, openPath, location.pathname)) close(true, true);
  });

  /* ---------- 번호 복사 ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      const ta = el('textarea.nh-ghost', { readonly: '', 'aria-hidden': 'true', tabindex: '-1' });
      ta.value = text; sheet.appendChild(ta); ta.select();
      let done = false; try { done = document.execCommand('copy'); } catch (x) { done = false; }
      ta.remove();
      if (done) res(); else rej(new Error('copy'));
    });
  }
  function copyNum(num, b) {
    copyText(num).then(function () {
      b.textContent = '복사했어요'; b.classList.add('nh-done');
      A.announce(num + ' 번호를 복사했어요');
    }, function () {
      b.textContent = '복사하지 못했어요'; b.classList.remove('nh-done');
      A.announce('복사하지 못했어요. ' + num + ' 번호를 직접 적어 주세요');
    }).then(function () {
      if (document.activeElement !== b && sheet.contains(b)) b.focus({ preventScroll: true });
      setTimeout(function () { b.textContent = '번호 복사'; b.classList.remove('nh-done'); }, 2200);
    });
  }

  /* ---------- 상단 "지금 도움" 링크 ---------- */
  if (btn) {
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-controls', 'nh-sheet');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function (e) {
      if (!isPlainClick(e)) return;
      /* 다른 모듈이 .click() 으로 부르면 그 모듈의 버튼으로 포커스를 돌려준다 */
      const from = e.isTrusted ? btn : (document.activeElement && document.activeElement !== document.body ? document.activeElement : btn);
      if (isOpen) { e.preventDefault(); close(true); return; }
      if (open(from)) e.preventDefault();
    });
    /* 누를 낌새가 보이면(마우스를 올림·포커스·터치 시작) 소절 id 를 한가할 때 미리 찾아 둔다 */
    const warm = function () { ensureAlt(false); };
    btn.addEventListener('pointerenter', warm, { once: true });
    btn.addEventListener('focus', warm, { once: true });
    btn.addEventListener('touchstart', warm, { once: true, passive: true });
  }

  /* 글 주소의 #소절(a/<slug>/#h-N, 같은 문서 안의 #h-N 바뀜)은 코어가 펴고 옮겨요(js/app.js 의 scrollToHash,
     reading 모듈은 해시가 있으면 읽던 자리를 되살리지 않음). 이 모듈은 "전화가 어렵다면" 링크에 그 주소를 달기만 해요 */

  JHB.ui = JHB.ui || {};
  JHB.ui.nowhelp = { open: function (from) { return open(from || document.activeElement); }, close: function () { close(true); }, isOpen: function () { return isOpen; } };
})(typeof window !== 'undefined' ? window : this);
