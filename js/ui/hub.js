/* hub — 분류 화면(s/<id>/)을 소묶음으로 다시 짜요.
   - data/kb/groups.json(분류마다 first·groups)을 받아 위에서부터:
     "힘들 때 바로" 한 줄(4·5·10·11 분류) → 먼저 읽을 글(최대 3) → 묶음 건너뛰기 → 묶음 제목·글 수·읽은 수와 글 목록
   - 행은 간소화해요: 분류 이름 반복을 빼고, 휴대폰에서는 요약을 한 줄로
   - 묶음 자료가 없거나 받지 못하면 앱이 그린 전체 목록을 그대로 둬요. 자바스크립트가 없으면 정적 HTML 의 전체 목록이 남아요
   - 다시 짤 때 포커스가 목록 안에 있었으면 같은 글 링크로 돌려놓고, 스크롤 중이었으면 같은 글이 같은 높이에 오게 해요
   - 뒤로·앞으로 가기나 새로 고침으로 다시 열면 떠날 때의 스크롤 위치(history.state.hbY, 다시 짠 화면 기준)로 돌아가요.
     브라우저가 되살린 위치는 다시 짜기 전의 긴 정적 목록에 먼저 걸려 엉뚱한 글을 가리키기 때문이에요
   - 읽음 표시는 기록을 지우거나(jhb:privacy clear) bfcache 로 되살아날 때(pageshow persisted) 다시 맞춰요
   공개: JHB.ui.hub = { refresh, arrange }. node 에서는 순수 함수만 module.exports 로(tests/groups.test.cjs).
   arrange 는 둘러보기(js/pages/browse.js)의 분류별 지도도 그대로 써요(규칙은 여기 한 곳) */
(function (root) {
  const HELP_SECTIONS = ['4', '5', '10', '11'];
  const HELP_SLUG = 'crisis-hotlines';
  const EXTRA_TITLE = '그 밖의 글';

  /* 묶음 자료(entry)와 그 분류의 글 목록(list, 순서대로)으로 화면 계획을 만든다.
     - 묶음 순서·slug 순서를 따르고, 아직 없는 글(새 slug)은 건너뛴다
     - 어느 묶음에도 없는 글은 끝의 "그 밖의 글"로(사라지지 않게)
     - first 는 실제 있는 글만 최대 3편
     같은 입력이면 같은 결과. 묶음 정보가 없으면 null */
  function arrange(entry, list) {
    if (!entry || !Array.isArray(entry.groups) || !entry.groups.length) return null;
    const arts = (list || []).filter(function (a) { return a && a.slug; });
    const by = {}; arts.forEach(function (a) { by[a.slug] = a; });
    const used = {};
    const groups = [];
    entry.groups.forEach(function (g) {
      const items = [];
      (g && Array.isArray(g.slugs) ? g.slugs : []).forEach(function (s) {
        if (by[s] && !used[s]) { used[s] = true; items.push(by[s]); }
      });
      if (items.length) groups.push({ title: String(g.title || ''), items: items });
    });
    const rest = arts.filter(function (a) { return !used[a.slug]; });
    if (rest.length) groups.push({ title: EXTRA_TITLE, items: rest, extra: true });
    if (!groups.length) return null;
    const first = [];
    (Array.isArray(entry.first) ? entry.first : []).forEach(function (s) {
      if (by[s] && first.length < 3 && first.indexOf(by[s]) < 0) first.push(by[s]);
    });
    return { first: first, groups: groups, total: arts.length };
  }

  const lib = { arrange: arrange, HELP_SECTIONS: HELP_SECTIONS, HELP_SLUG: HELP_SLUG, EXTRA_TITLE: EXTRA_TITLE };
  if (typeof module !== 'undefined' && module.exports) { module.exports = lib; return; }

  /* ---------- 브라우저 ---------- */
  if (!root.JHB || !root.JHB.app) return;
  const JHB = root.JHB, A = JHB.app, el = A.el;
  let token = 0;
  /* 이 문서를 뒤로·앞으로 가기나 새로 고침으로 열었으면 첫 그리기에서 한 번 저장된 위치로 돌아간다 */
  let restoreOnce = (function () {
    try { const n = performance.getEntriesByType('navigation')[0]; return !!n && (n.type === 'back_forward' || n.type === 'reload'); } catch (e) { return false; }
  })();
  /* 읽은 글: 그릴 때 한 번만 읽어 둔다(행마다 저장소를 다시 읽지 않게) */
  let readSet = {};
  function loadRead() {
    readSet = {};
    try { (A.progress && A.progress.readSlugs ? A.progress.readSlugs() : []).forEach(function (s) { readSet[s] = true; }); } catch (e) { }
  }
  function isRead(slug) { return readSet[slug] === true; }
  /* 행의 링크 주소('#/a/slug', '../../a/slug/', 'a/slug/')에서 slug */
  function slugOfRow(li) {
    if (!li) return null;
    if (li.getAttribute('data-slug')) return li.getAttribute('data-slug');
    const a = li.querySelector('a[href]');
    const m = a && /(?:^|[\/#])a\/([^\/?#]+)/.exec(a.getAttribute('href') || '');
    return m ? m[1] : null;
  }
  function topOffset() {
    const bar = document.querySelector('.topbar');
    return bar ? bar.getBoundingClientRect().bottom : 0;
  }

  /* 분류 이름을 뺀 문서 행(같은 분류라 반복이 필요 없음) */
  function hubRow(a) {
    const li = A.row(a);
    const sec = li.querySelector('.row-sec');
    if (sec) sec.remove();
    li.setAttribute('data-slug', a.slug);
    return li;
  }
  function firstBox(list) {
    return el('section.hb-first', { 'aria-labelledby': 'hb-first-h' }, [
      el('h2.hb-first-h', { id: 'hb-first-h' }, ['먼저 읽을 글']),
      el('ol', null, list.map(function (a) {
        return el('li', { 'data-slug': a.slug }, [el('a', { href: '#/a/' + a.slug }, [
          el('span.hb-t', null, [a.title, isRead(a.slug) ? el('span.read-mark', null, ['읽음']) : null]),
          a.summary ? el('span.hb-s', null, [a.summary]) : null
        ])]);
      }))
    ]);
  }
  function countLabel(items) {
    const n = items.length;
    const r = items.filter(function (a) { return isRead(a.slug); }).length;
    return n + '편' + (r ? ' · ' + r + '편 읽음' : '');
  }
  function build(s, plan) {
    const kids = [];
    if (HELP_SECTIONS.indexOf(s.id) >= 0 && A.bySlug[HELP_SLUG]) {
      kids.push(el('p.hb-help', null, ['힘들 때 바로: ', el('a', { href: '#/a/' + HELP_SLUG }, ['위기 상담 전화'])]));
    }
    if (plan.first.length) kids.push(firstBox(plan.first));
    if (plan.groups.length > 1) {
      kids.push(el('nav.hb-jump', { 'aria-label': '이 분류의 묶음으로 건너뛰기' }, plan.groups.map(function (g, i) {
        return el('a', { href: '#hb-g-' + (i + 1) }, [g.title, el('span.n', { 'aria-hidden': 'true' }, [String(g.items.length)])]);
      })));
    }
    plan.groups.forEach(function (g, i) {
      const id = 'hb-g-' + (i + 1);
      kids.push(el('section.hb-group', { id: id, 'aria-labelledby': id + '-h', class: g.extra ? 'hb-extra' : null }, [
        el('h2.hb-gh', { id: id + '-h' }, [el('span.hb-gt', null, [g.title]), el('span.hb-gn', null, [countLabel(g.items)])]),
        el('ul.rows.hb-rows', null, g.items.map(hubRow))
      ]));
    });
    return el('div.hb', { 'data-section': s.id }, kids);
  }

  function apply(id) {
    const s = A.secById[id];
    if (!s || s.glossary) return;
    const my = ++token;
    A.loadData('groups').then(function (data) {
      if (my !== token) return;
      const w = A.where();
      if (w.path[0] !== 's' || w.path[1] !== id) return;
      draw(s, Array.isArray(data) ? data : []);
    }).catch(function () { /* 자료가 없으면 전체 목록을 그대로 둔다 */ });
  }
  function draw(s, data) {
    const main = A.main;
    if (main.querySelector('.hb')) return;
    const old = Array.prototype.filter.call(main.children, function (n) { return n.matches('ul.rows'); })[0];
    if (!old) return;
    const entry = data.filter(function (g) { return g && g.section === s.id; })[0] || null;
    const plan = arrange(entry, A.sectionArticles(s.id));
    if (!plan) return;
    /* 다시 짜기 전: 포커스·스크롤 기준이 된 글 */
    const ae = document.activeElement;
    const focusSlug = ae && old.contains(ae) ? slugOfRow(ae.closest('li.row')) : null;
    let anchorSlug = null, anchorTop = 0;
    if (!focusSlug && window.scrollY > 0) {
      const lim = topOffset();
      const rows = old.querySelectorAll('li.row');
      for (let i = 0; i < rows.length; i++) {
        const b = rows[i].getBoundingClientRect();
        if (b.bottom > lim) { anchorSlug = slugOfRow(rows[i]); anchorTop = b.top; break; }
      }
    }
    const saved = restoreOnce ? savedY(s.id) : null;
    restoreOnce = false;
    loadRead();
    const box = build(s, plan);
    old.replaceWith(box);
    const pick = function (slug) { return slug ? box.querySelector('.hb-rows li[data-slug="' + slug + '"]') : null; };
    /* 순서: 목록 안 포커스 → 뒤로 가기·새로 고침의 저장 위치 → 주소의 묶음(#hb-g-N, 공유한 주소) → 보던 글의 높이 */
    const target = /^#hb-g-\d+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;
    if (focusSlug) {
      const li = pick(focusSlug);
      const a = li && li.querySelector('a');
      if (a) a.focus();
    } else if (saved != null) {
      window.scrollTo(0, saved);
    } else if (target) {
      target.scrollIntoView({ block: 'start' });
    } else if (anchorSlug) {
      const li = pick(anchorSlug);
      if (li) window.scrollBy(0, li.getBoundingClientRect().top - anchorTop);
    }
  }

  /* ---------- 떠날 때의 스크롤 위치(이 탭의 기록 항목에만, history.state) ---------- */
  function stateObj() {
    const st = history.state;
    return st == null ? {} : (typeof st === 'object' ? st : null);
  }
  function savedY(id) {
    const st = stateObj();
    return st && st.hbSec === id && typeof st.hbY === 'number' && st.hbY >= 0 ? st.hbY : null;
  }
  function saveY() {
    const box = A.main.querySelector('.hb');
    const st = stateObj();
    if (!box || !st) return;
    const y = Math.round(window.scrollY);
    const id = box.getAttribute('data-section');
    if (st.hbSec === id && st.hbY === y) return;
    try { history.replaceState(Object.assign({}, st, { hbSec: id, hbY: y }), ''); } catch (e) { }
  }
  /* 스크롤이 멈추고 0.3초 뒤에 한 번(replaceState 를 자주 부르지 않게), 글을 누를 때, 떠날 때 */
  let saveTimer = 0;
  window.addEventListener('scroll', function () {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveTimer = 0; saveY(); }, 300);
  }, { passive: true });
  window.addEventListener('pagehide', function () { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; } saveY(); });
  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest ? e.target.closest('.hb a[href]') : null;
    if (a) saveY();
  }, true);

  /* 읽음 표시·읽은 수를 지금 기록에 맞춘다: 기록을 지웠으면 표시를 빼고, 새로 읽은 글(bfcache 로 되살아난 화면)에는 더한다 */
  function updateRead() {
    const box = A.main.querySelector('.hb');
    if (!box) return;
    loadRead();
    const ae = document.activeElement;
    Array.prototype.forEach.call(box.querySelectorAll('.hb-rows li.row[data-slug]'), function (li) {
      const slug = li.getAttribute('data-slug');
      if (isRead(slug) === !!li.querySelector('.read-mark') || !A.bySlug[slug]) return;
      const fresh = hubRow(A.bySlug[slug]);
      const had = ae && li.contains(ae);
      li.replaceWith(fresh);
      const a = had && fresh.querySelector('a');
      if (a) a.focus({ preventScroll: true });
    });
    Array.prototype.forEach.call(box.querySelectorAll('.hb-first li[data-slug]'), function (li) {
      const t = li.querySelector('.hb-t'), mark = li.querySelector('.read-mark');
      const r = isRead(li.getAttribute('data-slug'));
      if (r && !mark && t) t.appendChild(el('span.read-mark', null, ['읽음']));
      else if (!r && mark) mark.remove();
    });
    Array.prototype.forEach.call(box.querySelectorAll('.hb-group'), function (g) {
      const n = g.querySelector('.hb-gn');
      const items = Array.prototype.map.call(g.querySelectorAll('.hb-rows li[data-slug]'), function (li) { return { slug: li.getAttribute('data-slug') }; });
      if (n) n.textContent = countLabel(items);
    });
  }
  function refresh() {
    const w = A.where();
    if (w.path[0] === 's' && w.path[1]) apply(w.path[1]);
  }
  window.addEventListener('jhb:privacy', function (e) { if (e.detail && e.detail.action === 'clear') updateRead(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) updateRead(); });
  window.addEventListener('jhb:page', function (e) {
    const d = e.detail || {};
    if (d.loading) return;
    if (d.kind === 's' && d.id) apply(String(d.id)); else token++;
  });
  refresh();
  JHB.ui = JHB.ui || {};
  JHB.ui.hub = { refresh: refresh, arrange: arrange };
})(typeof window !== 'undefined' ? window : this);
