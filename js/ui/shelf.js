/* shelf — 공유 배너(책등형)와 같은 책꽂이 모티프를 사이트에 둔다.
   1) 첫 화면: 머리 아래에 분류 16개를 책등으로 세운 책꽂이(누르면 그 분류로, 높이는 문서 수)
   2) 분류·용어 사전 화면: 제목 앞에 큰 책등
   3) 공용 색 막대(.spine)는 css/ui/shelf.css 에서 책등 모양으로 다듬는다.
   공개: JHB.ui.shelf = { refresh } */
(function () {
  if (!window.JHB || !JHB.app) return;
  const A = JHB.app, el = A.el;
  /* 밝은 색상각은 글자를 어둡게(배너 build-og.cjs 와 같은 기준) */
  const DARK = { 45: 1, 60: 1, 100: 1, 120: 1, 160: 1, 185: 1 };

  function counts() {
    const m = {}; let max = 1;
    A.sections.forEach(function (s) {
      const n = s.glossary ? A.glossary.length : A.sectionArticles(s.id).length;
      m[s.id] = n; if (!s.glossary && n > max) max = n;
    });
    return { m: m, max: max };
  }
  function spineHeight(s, n, max) {
    const t = s.glossary ? 1 : n / max;
    const h = Math.round(120 + 100 * t);
    const need = (s.title || '').length * 16 + 36;   /* 세로 글자가 들어갈 최소 높이 */
    return Math.max(h, need);
  }
  function buildShelf() {
    const c = counts();
    const row = el('div.sh-row', null, A.sections.map(function (s) {
      const n = c.m[s.id];
      const label = s.title + ' · ' + (s.glossary ? '용어 ' : '문서 ') + n + '개';
      return el('a', {
        class: 'sh-spine' + (DARK[s.hue] ? ' dk' : ''),
        href: A.L(s.glossary ? '#/glossary' : '#/s/' + s.id),
        style: '--h:' + s.hue + ';height:' + spineHeight(s, n, c.max) + 'px',
        'aria-label': label, title: label
      }, [el('span.sh-label', { 'aria-hidden': 'true' }, [s.title])]);
    }));
    return el('section.sh-shelf', { 'data-sec': 'shelf', 'aria-label': '분류 책꽂이' }, [
      row,
      el('div.sh-board', { 'aria-hidden': 'true' }),
      el('p.sh-hint', null, ['책등을 누르면 그 분류로 가요. 책등 높이는 문서 수예요.'])
    ]);
  }
  function bigSpine(s) {
    return el('span.sh-big', { style: '--h:' + s.hue, 'aria-hidden': 'true' });
  }
  function onPage(d) {
    Array.prototype.forEach.call(document.querySelectorAll('.sh-shelf, .sh-big'), function (n) { n.remove(); });
    if (d.kind === 'home') {
      const head = A.main.querySelector('.portal .portal-head');
      if (head) head.parentNode.insertBefore(buildShelf(), head.nextSibling);
    } else if (d.kind === 's' || d.kind === 'glossary') {
      const s = d.kind === 's' ? A.secById[d.id] : A.sections.filter(function (x) { return x.glossary; })[0];
      const t = A.main.querySelector('.page-title');
      if (s && t) t.insertBefore(bigSpine(s), t.firstChild);
    }
  }
  function refresh() { const w = A.where(); onPage({ kind: w.path[0] || 'home', id: w.path[1] || null }); }
  window.addEventListener('jhb:page', function (e) { onPage(e.detail || {}); });
  refresh();
  JHB.ui = JHB.ui || {};
  JHB.ui.shelf = { refresh: refresh };
})();
