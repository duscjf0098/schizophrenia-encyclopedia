/* 조현병 백과 · 공통 유틸 */
window.JHB = window.JHB || {};
JHB.util = (function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  /* el('button.primary', {onclick: fn, 'aria-label': 'x'}, ['텍스트', node]) */
  function el(spec, attrs, children) {
    const parts = spec.split('.');
    const node = document.createElement(parts[0] || 'div');
    if (parts.length > 1) node.className = parts.slice(1).join(' ');
    if (attrs) Object.keys(attrs).forEach(function (k) {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'html') node.innerHTML = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'class') node.className += (node.className ? ' ' : '') + v;
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  const store = {
    get: function (key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set: function (key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } },
    remove: function (key) { try { localStorage.removeItem(key); } catch (e) { } }
  };
  function fmtDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? m[1] + '.' + m[2] + '.' + m[3] : String(s || '');
  }
  /* 한글 첫 글자의 초성 (가나다 색인용) */
  const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const CHO_GROUP = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
  function chosung(word) {
    const ch = String(word || '').charCodeAt(0);
    if (ch >= 0xAC00 && ch <= 0xD7A3) { const c = CHO[Math.floor((ch - 0xAC00) / 588)]; return CHO_GROUP[c] || c; }
    if (/[A-Za-z]/.test(String(word || '').charAt(0))) return 'A';
    return '#';
  }
  function dayIndex(n) {
    /* 날짜마다 같은 번호가 나오게 (오늘의 한 가지) */
    const d = new Date();
    const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    let h = key;
    h = ((h >>> 16) ^ h) * 0x45d9f3b; h = ((h >>> 16) ^ h) * 0x45d9f3b; h = (h >>> 16) ^ h;
    return n ? Math.abs(h) % n : 0;
  }
  return { esc: esc, qs: qs, qsa: qsa, el: el, store: store, fmtDate: fmtDate, chosung: chosung, dayIndex: dayIndex };
})();
