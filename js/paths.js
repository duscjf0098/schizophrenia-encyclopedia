/* 조현병 백과 · 주소 규칙
   옛 해시 주소(#/a/slug)를 실제 경로(a/slug/)로 바꾸고, 페이지 깊이에 맞는 상대 기준(../../)을 붙인다.
   브라우저(window.JHB.paths)와 node(module.exports) 양쪽에서 쓴다. */
(function (root) {
  function hashToPath(h) {
    const s = String(h == null ? '' : h);
    if (s.indexOf('#/') !== 0) return null;
    const rest = s.slice(2);
    const qi = rest.indexOf('?');
    const path = (qi >= 0 ? rest.slice(0, qi) : rest).split('/').filter(Boolean).join('/');
    const query = qi >= 0 ? rest.slice(qi) : '';
    return (path ? path + '/' : '') + query;
  }
  function baseFor(route) {
    const n = String(route || '').split('/').filter(Boolean).length;
    let b = ''; for (let i = 0; i < n; i++) b += '../';
    return b;
  }
  function link(h, base) {
    const p = hashToPath(h);
    if (p == null) return h;
    return (base || '') + p || './';
  }
  function rewriteHtml(html, base) {
    return String(html).replace(/href="(#\/[^"]*)"/g, function (_, h) { return 'href="' + link(h, base) + '"'; });
  }
  const api = { hashToPath: hashToPath, baseFor: baseFor, link: link, rewriteHtml: rewriteHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.paths = api; }
})(typeof window !== 'undefined' ? window : this);
