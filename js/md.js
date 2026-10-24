/* 조현병 백과 · 소형 Markdown 렌더러
   지원: frontmatter(---), #~### 제목, 문단, **굵게**, *기울임*, `코드`, [링크](url), [^n] 각주(출처),
   - / 1. 목록, > 인용, --- 구분선, | 표 |, ::: 종류 제목 … ::: 콜아웃.
   브라우저(window.JHB.md)와 node(module.exports) 양쪽에서 쓴다. */
(function (root) {
  const CALLOUT_TITLE = { tip: '도움말', warn: '주의', crisis: '지금 위험하다면', note: '알아두기', research: '최신 연구', fact: '잘 알려지지 않은 사실', exp: '당사자 경험' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- frontmatter ---- */
  function parse(src) {
    src = String(src == null ? '' : src).replace(/\r\n?/g, '\n');
    const m = /^---\n([\s\S]*?)\n---\n?/.exec(src);
    if (!m) return { meta: {}, body: src };
    const meta = {};
    let key = null;
    m[1].split('\n').forEach(function (line) {
      const li = /^\s+-\s+(.*)$/.exec(line);
      if (li && key) {
        if (!Array.isArray(meta[key])) meta[key] = [];
        meta[key].push(li[1].trim());
        return;
      }
      const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
      if (kv) { key = kv[1]; meta[key] = kv[2].trim(); }
    });
    if (typeof meta.tags === 'string') {
      meta.tags = meta.tags.replace(/^\[|\]$/g, '').split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean);
    }
    if (Array.isArray(meta.sources)) {
      meta.sources = meta.sources.map(function (s) {
        const p = s.split('|').map(function (x) { return x.trim(); });
        return { org: p[0] || '', title: p[1] || '', year: p[2] || '', url: p[3] || '' };
      });
    }
    return { meta: meta, body: src.slice(m[0].length) };
  }

  /* ---- inline ---- */
  function safeHref(url) {
    const u = String(url).trim();
    if (/^(https?:\/\/|#\/|mailto:|tel:)/i.test(u)) return u;
    return '';
  }
  function inline(text) {
    let s = esc(text);
    s = s.replace(/`([^`]+)`/g, function (_, c) { return '<code>' + c + '</code>'; });
    s = s.replace(/\[\^(\d+)\]/g, function (_, n) { return '<sup class="fn"><a href="#src-' + n + '">' + n + '</a></sup>'; });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, u) {
      const href = safeHref(u.replace(/&amp;/g, '&'));
      if (!href) return t;
      const ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + esc(href) + '"' + ext + '>' + t + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    return s;
  }

  /* ---- block ---- */
  function render(src) {
    const lines = String(src == null ? '' : src).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    const toc = [];
    let hn = 0;
    let i = 0;

    function para(buf) { if (buf.length) out.push('<p>' + inline(buf.join(' ')) + '</p>'); }

    function block(endTest) {
      /* endTest(line) → true면 멈춤. 반환: 소비한 줄 수 */
      let buf = [];
      while (i < lines.length) {
        const line = lines[i];
        if (endTest && endTest(line)) break;
        const t = line.trim();
        if (!t) { para(buf); buf = []; i++; continue; }

        const h = /^(#{1,3})\s+(.+?)\s*#*$/.exec(t);
        if (h) {
          para(buf); buf = [];
          hn++;
          const id = 'h-' + hn, lv = h[1].length, text = h[2];
          out.push('<h' + lv + ' id="' + id + '">' + inline(text) + '</h' + lv + '>');
          if (lv >= 2) toc.push({ id: id, text: text, level: lv });
          i++; continue;
        }
        if (/^(-{3,}|\*{3,})$/.test(t)) { para(buf); buf = []; out.push('<hr>'); i++; continue; }

        const co = /^:::\s*(\w+)\s*(.*)$/.exec(t);
        if (co) {
          para(buf); buf = [];
          i++;
          const type = co[1], title = co[2] || CALLOUT_TITLE[type] || '';
          const start = out.length;
          block(function (l) { return l.trim() === ':::'; });
          const inner = out.splice(start).join('');
          out.push('<aside class="callout callout-' + esc(type) + '">' + (title ? '<div class="callout-title">' + inline(title) + '</div>' : '') + inner + '</aside>');
          if (i < lines.length && lines[i].trim() === ':::') i++;
          continue;
        }
        if (/^[-*]\s+/.test(t)) {
          para(buf); buf = [];
          const items = [];
          while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
          out.push('<ul>' + items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>');
          continue;
        }
        if (/^\d+[.)]\s+/.test(t)) {
          para(buf); buf = [];
          const items = [];
          while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i++; }
          out.push('<ol>' + items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ol>');
          continue;
        }
        if (/^>/.test(t)) {
          para(buf); buf = [];
          const q = [];
          while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
          out.push('<blockquote>' + render(q.join('\n')).html + '</blockquote>');
          continue;
        }
        if (/^\|.*\|$/.test(t)) {
          para(buf); buf = [];
          const rows = [];
          while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i].trim()); i++; }
          const cells = function (r) { return r.slice(1, -1).split('|').map(function (c) { return c.trim(); }); };
          let head = null, body = rows;
          if (rows.length >= 2 && /^\|[\s:|-]+\|$/.test(rows[1])) { head = cells(rows[0]); body = rows.slice(2); }
          let html = '<div class="tbl"><table>';
          if (head) html += '<thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead>';
          html += '<tbody>' + body.map(function (r) { return '<tr>' + cells(r).map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
          out.push(html);
          continue;
        }
        buf.push(t); i++;
      }
      para(buf);
    }

    block(null);
    return { html: out.join('\n'), toc: toc };
  }

  /* 검색·읽기 시간용 평문 */
  function plain(src) {
    return String(src == null ? '' : src)
      .replace(/\r\n?/g, '\n')
      .replace(/^:::\s*\w+\s*/gm, '').replace(/^:::\s*$/gm, '')
      .replace(/^\|[\s:|-]+\|$/gm, '')
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/^\s*(?:[-*]|\d+[.)])\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/^(-{3,}|\*{3,})$/gm, '')
      .replace(/\[\^\d+\]/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*`|]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function readingMinutes(text) {
    const n = plain(text).replace(/\s/g, '').length;
    return Math.max(1, Math.round(n / 500));
  }

  const api = { parse: parse, render: render, plain: plain, readingMinutes: readingMinutes, esc: esc, CALLOUT_TITLE: CALLOUT_TITLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.md = api; }
})(typeof window !== 'undefined' ? window : this);
