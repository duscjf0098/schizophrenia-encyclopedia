/* 조현병 백과 · 검색
   build(docs) → index, query(index, q, {section, limit}) → [{id, score, snippet}]
   한글은 부분 문자열 일치가 자연스러워서 토큰 색인 대신 소문자 문자열 포함 검사로 점수를 매긴다. */
(function (root) {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); }

  function build(docs) {
    return (docs || []).map(function (d) {
      return {
        id: d.id, section: String(d.section == null ? '' : d.section), title: d.title || '', summary: d.summary || '', body: d.body || '',
        _title: norm(d.title), _tags: norm((d.tags || []).join(' ')), _summary: norm(d.summary), _body: norm(d.body)
      };
    });
  }

  function count(hay, needle) {
    if (!needle) return 0;
    let n = 0, p = 0;
    while ((p = hay.indexOf(needle, p)) >= 0) { n++; p += needle.length; }
    return n;
  }

  function snippet(doc, terms) {
    const body = doc.body, low = doc._body;
    let pos = -1;
    for (let k = 0; k < terms.length; k++) { pos = low.indexOf(terms[k]); if (pos >= 0) break; }
    let text;
    if (pos < 0) text = doc.summary || body.slice(0, 80);
    else {
      const a = Math.max(0, pos - 30), b = Math.min(body.length, pos + 60);
      text = (a > 0 ? '…' : '') + body.slice(a, b) + (b < body.length ? '…' : '');
    }
    let html = esc(text);
    terms.forEach(function (t) {
      if (!t) return;
      const re = new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      html = html.replace(re, function (m) { return '<mark>' + m + '</mark>'; });
    });
    return html;
  }

  function query(index, q, opts) {
    opts = opts || {};
    const terms = norm(q).split(' ').filter(Boolean);
    if (!terms.length) return [];
    const res = [];
    (index || []).forEach(function (d) {
      if (opts.section && d.section !== String(opts.section)) return;
      let score = 0, matched = 0;
      terms.forEach(function (t) {
        let s = 0;
        if (d._title.indexOf(t) >= 0) s += 10;
        if (d._tags.indexOf(t) >= 0) s += 6;
        if (d._summary.indexOf(t) >= 0) s += 3;
        s += Math.min(count(d._body, t), 10);
        if (s) matched++;
        score += s;
      });
      if (!matched) return;
      if (matched === terms.length && terms.length > 1) score += 20;
      res.push({ id: d.id, score: score, title: d.title, section: d.section, snippet: snippet(d, terms) });
    });
    res.sort(function (a, b) { return b.score - a.score || a.title.localeCompare(b.title, 'ko'); });
    return opts.limit ? res.slice(0, opts.limit) : res;
  }

  const api = { build: build, query: query };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.search = api; }
})(typeof window !== 'undefined' ? window : this);
