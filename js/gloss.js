/* 조현병 백과 · 본문 속 용어 찾기
   matcher(terms, {exclude}) → 정규식 묶음, split(text, matcher, used, limit) → [{text}|{term}]
   긴 용어를 먼저 잡고, 한 문서에서 같은 용어는 처음 한 번만 표시한다. 영문 약어는 단어 경계에서만.
   inline: false 인 용어(도파민·위약·낙인 같은 아주 흔한 말)는 본문 밑줄에서 뺀다.
   용어 사전 화면과 검색에는 그대로 나온다. 흔한 말이 문서당 밑줄 한도를 먼저 차지하지 않게 하려는 것.
   standalone: true 인 짧은 용어(조증 등)는 바로 앞에 다른 한글이 붙어 있으면 잡지 않는다(통합실조증 속 조증). */
(function (root) {
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function matcher(terms, opts) {
    const exclude = new Set((opts && opts.exclude) || []);
    const solo = new Set();
    const list = (terms || []).filter(function (t) { return t && t.inline !== false; })
      .map(function (t) { if (t.standalone === true) solo.add(t.term); return t.term; })
      .filter(function (t) { return t && t.length >= 2 && !exclude.has(t); })
      .sort(function (a, b) { return b.length - a.length; });
    if (!list.length) return null;
    const parts = list.map(function (t) {
      const e = escRe(t);
      if (/^[A-Za-z0-9]/.test(t)) return '(?<![A-Za-z0-9])' + e + '(?![A-Za-z0-9])';
      return solo.has(t) ? '(?<![가-힣])' + e : e;
    });
    return new RegExp(parts.join('|'), 'g');
  }

  function split(text, re, used, limit) {
    const out = [];
    if (!re || !text) return [{ text: text || '' }];
    let last = 0, m;
    re.lastIndex = 0;
    let buf = '';
    while ((m = re.exec(text))) {
      const t = m[0];
      if (used.has(t) || (limit != null && used.size >= limit)) continue;
      used.add(t);
      buf += text.slice(last, m.index);
      if (buf) { out.push({ text: buf }); buf = ''; }
      out.push({ term: t });
      last = m.index + t.length;
    }
    buf += text.slice(last);
    if (buf) out.push({ text: buf });
    return out.length ? out : [{ text: text }];
  }

  const api = { matcher: matcher, split: split };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.gloss = api; }
})(typeof window !== 'undefined' ? window : this);
