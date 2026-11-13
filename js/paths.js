/* 조현병 백과 · 주소 규칙
   옛 해시 주소(#/a/slug)를 실제 경로(a/slug/)로 바꾸고, 페이지 깊이에 맞는 상대 기준(../../)을 붙인다.
   브라우저(window.JHB.paths)와 node(module.exports) 양쪽에서 쓴다. */
(function (root) {
  /* '#/about#privacy' 처럼 뒤에 조각(#id)이 붙으면 경로 뒤로 옮긴다: 'about/#privacy', '#/a/x?course=y#h-3' → 'a/x/?course=y#h-3' */
  function hashToPath(h) {
    const s = String(h == null ? '' : h);
    if (s.indexOf('#/') !== 0) return null;
    let rest = s.slice(2);
    const fi = rest.indexOf('#');
    const frag = fi >= 0 ? rest.slice(fi) : '';
    if (fi >= 0) rest = rest.slice(0, fi);
    const qi = rest.indexOf('?');
    const path = (qi >= 0 ? rest.slice(0, qi) : rest).split('/').filter(Boolean).join('/');
    const query = qi >= 0 ? rest.slice(qi) : '';
    return (path ? path + '/' : '') + query + (frag.length > 1 ? frag : '');
  }
  function baseFor(route) {
    const n = String(route || '').split('/').filter(Boolean).length;
    let b = ''; for (let i = 0; i < n; i++) b += '../';
    return b;
  }
  function link(h, base) {
    const p = hashToPath(h);
    if (p == null) return h;
    if (!p) return base || './';
    /* 첫 화면에 쿼리·조각만 붙은 주소('#/#x')는 지금 페이지가 아니라 첫 화면을 가리키게 */
    if (!base && /^[?#]/.test(p)) return './' + p;
    return (base || '') + p;
  }
  /* 주소의 조각이 화면 안 요소 id 를 가리키면 그 id('#privacy' → 'privacy', '#h-3' → 'h-3').
     옛 해시 주소('#/…')·빈 조각은 null. % 인코딩은 풀고, 깨졌으면 글자 그대로 */
  function fragmentId(hash) {
    const s = String(hash == null ? '' : hash);
    if (s.charAt(0) !== '#' || s.length < 2 || s.charAt(1) === '/') return null;
    let id = s.slice(1);
    try { id = decodeURIComponent(id); } catch (e) { }
    return id || null;
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
  /* 분류 화면의 글 순서(한 곳): 그 분류의 글만, order 오름차순(없거나 0 이면 999로 맨 뒤) → 제목 가나다.
     앱(js/app.js sectionArticles → 분류 화면·왼쪽 목차·첫 화면 분류 목록·문서 앞뒤)과 빌드(정적 s/<id>/·첫 화면)가 같은 규칙을 쓰게.
     받은 배열은 바꾸지 않아요. 분류 id 는 글자·숫자 모두(String 으로 맞대요). 테스트는 tests/core.test.cjs(K3-7) */
  function sectionArticles(articles, id) {
    const sid = String(id);
    return (Array.isArray(articles) ? articles : []).filter(function (a) { return a && String(a.section) === sid; })
      .sort(function (a, b) { return (a.order || 999) - (b.order || 999) || String(a.title || '').localeCompare(String(b.title || ''), 'ko'); });
  }
  const api = { hashToPath: hashToPath, baseFor: baseFor, link: link, rewriteHtml: rewriteHtml, parseQuery: parseQuery, fragmentId: fragmentId, sectionArticles: sectionArticles };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.paths = api; }
})(typeof window !== 'undefined' ? window : this);
