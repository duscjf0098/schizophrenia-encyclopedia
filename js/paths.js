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
  /* 주소의 쿼리('?a=1&b=2')를 { a: '1', b: '2' } 로. 값의 '+' 는 공백, 같은 이름이 두 번이면 뒤의 것.
     잘못된 % 인코딩('%', '%ZZ', '%E0%A4')이 있어도 던지지 않는다(T8: 앱 전체가 멈추던 문제).
     그때는 올바른 %XX 묶음만 풀고 나머지는 글자 그대로 둔다. */
  function decodePart(s) {
    s = String(s).replace(/\+/g, ' ');
    try { return decodeURIComponent(s); } catch (e) { }
    return s.replace(/(?:%[0-9A-Fa-f]{2})+/g, function (m) {
      /* UTF-8 한 글자는 1~4바이트: 앞에서부터 풀리는 가장 긴 묶음을 풀고, 안 풀리는 바이트는 그대로 */
      let out = '', i = 0;
      while (i < m.length) {
        let n = 4;
        for (; n >= 1; n--) {
          if (i + n * 3 > m.length) continue;
          try { out += decodeURIComponent(m.slice(i, i + n * 3)); break; } catch (e) { }
        }
        if (n >= 1) i += n * 3; else { out += m.slice(i, i + 3); i += 3; }
      }
      return out;
    });
  }
  /* opts.strict: 값의 % 인코딩이 깨져 있으면 그 값은 빈 글자로('?q=%E0%A4' → { q: '' }). 검색어처럼 깨진 원문을 그대로 쓰면 안 되는 곳에서 */
  function strictPart(s) {
    try { return decodeURIComponent(String(s).replace(/\+/g, ' ')); } catch (e) { return ''; }
  }
  function parseQuery(search, opts) {
    const out = {};
    const strict = !!(opts && opts.strict);
    String(search == null ? '' : search).replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      const i = kv.indexOf('=');
      const k = decodePart(i >= 0 ? kv.slice(0, i) : kv);
      if (!k || k === '__proto__' || k === 'constructor' || k === 'prototype') return;
      out[k] = i >= 0 ? (strict ? strictPart(kv.slice(i + 1)) : decodePart(kv.slice(i + 1))) : '';
    });
    return out;
  }
  const api = { hashToPath: hashToPath, baseFor: baseFor, link: link, rewriteHtml: rewriteHtml, parseQuery: parseQuery };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.paths = api; }
})(typeof window !== 'undefined' ? window : this);
