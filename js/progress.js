/* 조현병 백과 · 읽은 문서 기록과 "이어서 읽기" 제안 (순수 로직, DOM 없음)
   create(store) → 인스턴스. store 는 { get(key, fallback), set(key, val) } (js/util.js 의 store 와 같은 모양).
   저장 키 'jhb.read', 값은 { slug: timestamp } 객체.
   문서는 data/toc.js 형식 { slug, section, order, title }, 코스는 { id, title, steps: [{slug}] }. */
(function (root) {
  const KEY = 'jhb.read';

  function sameSection(a, b) { return String(a) === String(b); }
  function pct(read, total) { return total ? Math.round(read * 100 / total) : 0; }
  function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }

  function create(store) {
    function load() {
      const v = store.get(KEY, {});
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    }
    function save(map) { store.set(KEY, map); }

    function markRead(slug, now) {
      if (!slug) return false;
      const map = load();
      map[slug] = typeof now === 'number' ? now : Date.now();
      save(map);
      return true;
    }
    function isRead(slug) { return Object.prototype.hasOwnProperty.call(load(), slug); }
    function readSlugs() {
      const map = load();
      return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
    }
    function count() { return Object.keys(load()).length; }

    function progressOf(list) {
      const map = load();
      const read = list.filter(function (a) { return a && map[a.slug] != null; }).length;
      return { read: read, total: list.length, pct: pct(read, list.length) };
    }
    function sectionProgress(articles, sectionId) {
      return progressOf((articles || []).filter(function (a) { return sameSection(a.section, sectionId); }));
    }
    function overall(articles) { return progressOf(articles || []); }

    function nextInSection(articles, slug) {
      const list = articles || [];
      const cur = list.filter(function (a) { return a.slug === slug; })[0];
      if (!cur) return null;
      const map = load();
      const sec = list.filter(function (a) { return sameSection(a.section, cur.section); }).sort(byOrder);
      const idx = sec.indexOf(cur);
      const unread = function (a) { return a.slug !== slug && map[a.slug] == null; };
      const after = sec.slice(idx + 1).filter(unread);
      if (after.length) return after[0];
      const before = sec.slice(0, idx).filter(unread);
      return before.length ? before[0] : null;
    }

    function courseProgress(course) {
      const map = load();
      const steps = (course && course.steps) || [];
      let read = 0, next = null;
      steps.forEach(function (s) {
        if (map[s.slug] != null) read++;
        else if (!next) next = s;
      });
      return { read: read, total: steps.length, pct: pct(read, steps.length), next: next };
    }

    function continueReading(articles, courses) {
      const list = articles || [];
      if (!count()) return null;
      const bySlug = {};
      list.forEach(function (a) { bySlug[a.slug] = a; });

      let best = null, bestP = null;
      (courses || []).forEach(function (c) {
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

      const recent = readSlugs().filter(function (s) { return bySlug[s]; });
      for (let i = 0; i < recent.length; i++) {
        const next = nextInSection(list, recent[i]);
        if (next) {
          const last = bySlug[recent[i]];
          return {
            kind: 'section', article: next,
            reason: '"' + last.title + '" 다음으로 같은 섹션에서 아직 안 읽은 문서예요.'
          };
        }
      }
      return null;
    }

    function clear() { save({}); }

    return {
      markRead: markRead, isRead: isRead, readSlugs: readSlugs, count: count,
      sectionProgress: sectionProgress, overall: overall, nextInSection: nextInSection,
      continueReading: continueReading, courseProgress: courseProgress, clear: clear
    };
  }

  const api = { KEY: KEY, create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.progress = api; }
})(typeof window !== 'undefined' ? window : this);
