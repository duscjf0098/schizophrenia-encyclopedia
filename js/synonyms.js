/* 조현병 백과 · 일상 말 → 문서/용어 매칭
   build(list) → matcher, expand(matcher, query) → { slugs: [{slug, score}], terms: [string] }
   질의와 say 를 소문자·공백 제거로 맞춘 뒤 포함 관계(질의⊃say 또는 say⊃질의, 2글자 이상)로 잡는다.
   겹치는 글자가 길수록 점수가 높고, 여러 항목이 같은 slug 를 가리키면 더한다. slug 는 점수순 최대 8개.
   질의 안에 say 가 통째로 들어간 일치(강한 근거)는 더하고, 짧은 질의가 긴 say 속에 들어간 일치(약한 근거)는 가장 높은 하나만 친다.
   짧은 영문 약어(4자 이하)는 다른 영단어 속에 우연히 들어가지 않도록 글자 경계에서만 잡는다. */
(function (root) {
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ''); }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function build(list) {
    const items = [];
    (list || []).forEach(function (e) {
      const says = (e.say || []).map(norm).filter(function (s) { return s.length >= 2; });
      if (!says.length) return;
      items.push({ says: says, terms: e.terms || [], slugs: e.slugs || [] });
    });
    return { items: items };
  }

  function overlap(q, raw, s) {
    if (q.indexOf(s) >= 0) {
      if (s.length <= 4 && /^[a-z0-9-]+$/.test(s)) {
        if (!new RegExp('(^|[^a-z0-9])' + escRe(s) + '($|[^a-z0-9])').test(raw)) return 0;
      }
      return s.length * 10 + 5;
    }
    return s.indexOf(q) >= 0 ? -(q.length * 5) : 0; /* 음수 = 약한 일치 표시 */
  }

  function expand(matcher, query) {
    const raw = String(query == null ? '' : query).toLowerCase(), q = norm(query);
    const strong = {}, weak = {}, termScore = {};
    if (q.length >= 2 && matcher && matcher.items) {
      matcher.items.forEach(function (it) {
        let best = 0;
        it.says.forEach(function (s) { const v = overlap(q, raw, s); if (Math.abs(v) > Math.abs(best)) best = v; });
        if (!best) return;
        const pts = Math.abs(best);
        it.slugs.forEach(function (slug, i) {
          const v = Math.max(1, pts - i);
          if (best > 0) strong[slug] = (strong[slug] || 0) + v;
          else weak[slug] = Math.max(weak[slug] || 0, v);
        });
        it.terms.forEach(function (t) { termScore[t] = Math.max(termScore[t] || 0, pts); });
      });
    }
    const slugScore = {};
    Object.keys(strong).forEach(function (k) { slugScore[k] = strong[k]; });
    Object.keys(weak).forEach(function (k) { slugScore[k] = (slugScore[k] || 0) + weak[k]; });
    const slugs = Object.keys(slugScore).map(function (k) { return { slug: k, score: slugScore[k] }; })
      .sort(function (a, b) { return b.score - a.score || (a.slug < b.slug ? -1 : 1); }).slice(0, 8);
    const terms = Object.keys(termScore).sort(function (a, b) { return termScore[b] - termScore[a] || a.localeCompare(b, 'ko'); });
    return { slugs: slugs, terms: terms };
  }

  const api = { build: build, expand: expand };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.syn = api; }
})(typeof window !== 'undefined' ? window : this);
