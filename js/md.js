/* 조현병 백과 · 소형 Markdown 렌더러
   지원: frontmatter(---), #~### 제목, 문단, **굵게**, *기울임*, `코드`, [링크](url), [^n] 각주(출처),
   - / 1. 목록, > 인용, --- 구분선, | 표 |, ::: 종류 제목 … ::: 콜아웃(div role=note).
   본문의 상담 전화번호(**109** 처럼 굵게 싼 번호, 1577-0199 꼴)는 tel: 링크가 된다.
   앱 화면과 정적 페이지가 똑같이 쓰는 고정 안내(위기 배너·응급 줄·핵심 3가지·문서 고지·공용 고지)도 여기서 만든다.
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
    return telLinks(s);
  }

  /* ---- 본문 전화번호 → tel: 링크 ----
     1) 1577-0199 꼴(15xx~18xx-xxxx)은 굵게가 아니어도. 건너뛰는 것:
        앞 글자가 숫자·영문·-./ (DOI·주소 속 숫자), 뒤가 숫자·-·"년", 바로 앞 낱말이 ISSN·ISBN,
        연도 범위: 두 번째 묶음이 첫 묶음보다 큰 1500~2099 이면서 문맥이 범위일 때만 —
        뒤에 사이·까지·년대·세기·년간·에 걸쳐·경·무렵·동안("1800-2000 사이", "1800-1900경에"), 앞에 년·~,
        또는 괄호 속 생몰·시기 "(1820-1899)"(두 해 차이 110 이하, 바로 뒤 ')', 번호 바로 앞에 전화·상담·문의·번호·센터·연락처가
        붙어 있지 않을 때(아래 TEL_CONTEXT, 안내·대표·연락은 telContext 의 두 경우만). "상담(1588-1600)"은 번호, "크레펠린 연구 안내(1856-1926)"는 생몰년).
        그래서 1588-1600·1544-1700 같은 대표번호는 링크가 돼요. 굵게 싼 번호(**1588-1600**)는 늘 링크
     2) 굵게 싼 짧은 번호: 109·112·119·129 같은 세 자리 공공 번호와 13xx 네 자리. 뒤에 명·조·년·mg·kg·% 같은 단위가 붙으면 건너뜀
        (주·점은 붙여 쓴 것만: "**120**점", "**12**주". "**109** 주 7일"처럼 띄우면 번호로 둠)
     이미 링크(<a>…</a>)나 코드(<code>…</code>) 안이면 건드리지 않는다. 옛 사파리 때문에 lookbehind 는 쓰지 않는다. */
  const TEL_LONG = /(^|[^\w\-./])(1[5-8]\d{2}-\d{4})(?![\d-]|\s*년)/g;
  const TEL_UNITS = '명|개|년|조|항|호|세|살|%|％|번째|만|천|억|원|회|건|곳|일|시간|분|위|차|쪽|밀리|킬로|센티|그램|칼로리|mg|㎎|mcg|μg|µg|㎍|kg|㎏|g(?![A-Za-z])|ml|mL|㎖|cc|cm|㎝|mm|kcal|bpm';
  const TEL_SHORT = new RegExp('<strong>(109|110|112|114|117|118|119|120|122|125|127|128|129|131|132|182|13\\d{2})<\\/strong>(?!\\s*(?:' + TEL_UNITS + ')|주|점)', 'g');
  const TEL_NOT_AFTER = /(?:e?ISSN|ISBN(?:-1[03])?)[\s:：]*$/i;
  /* 범위 뒤 낱말: 사이·까지·년대·세기·년간·에 걸쳐, 그리고 경·무렵·동안(K3). 경·무렵·동안·년간은 조사가 붙어도("1800-1900경에")
     낱말로 끝날 때만(경기·경찰·동안구처럼 낱말의 일부면 범위가 아님). '에' 하나만으로는 범위로 보지 않는다(번호 뒤에도 흔히 와서) */
  const RANGE_AFTER = /^\s*(?:사이|까지|년대|세기|에\s*걸쳐|(?:경|무렵|동안|년간)(?:으로|에서|에는|부터|까지|에|의|은|는|이|가|을|를|과|와|로|도|만|엔)?(?![가-힣]))/;
  const RANGE_BEFORE = /(?:년|~|～|〜|∼)\s*$/;
  /* 괄호 속 생몰·시기 규칙을 쓰지 않는 전화 문맥: 전화를 뜻하는 낱말이 번호 바로 앞에 붙어 있을 때만("상담(1588-1600)", "(상담 1588-1600)",
     "대표번호 (1544-1600)", "상담센터(1588-1600)", "전화번호는 (1588-1600)"). 멀리 떨어진 낱말은 보지 않는다.
     안내·대표·연락처럼 뜻이 넓은 낱말은 두 경우만 전화 문맥(K3 검수):
     - 괄호 안에서 번호 앞에 그 낱말 하나만 있을 때: "(대표 1588-1600)", "(안내: 1588-1600)"
     - 번호 바로 앞에 붙어 있고 첫 묶음이 1700 보다 작을 때: "대표(1544-1600)". 근대 이후 생몰년("협회 초대 대표(1856-1926)",
       "크레펠린 연구 안내(1856-1926)")은 그대로 범위로 둔다 */
  const TEL_CONTEXT = /(?:전화|상담|문의|번호|센터|연락처|ARS|☎|☏)(?:은|는)?\s*[(:：]?\s*[(]?\s*$/i;
  const TEL_CONTEXT_PAREN = /\(\s*(?:대표|안내|연락)\s*[:：]?\s+$/;
  const TEL_CONTEXT_WEAK = /(?:대표|안내|연락)\s*\(\s*$/;
  function telContext(before, firstYear) {
    const t = before.replace(/<[^>]*>/g, '').slice(-16);
    return TEL_CONTEXT.test(t) || TEL_CONTEXT_PAREN.test(t) || (firstYear < 1700 && TEL_CONTEXT_WEAK.test(t));
  }
  function telA(n) { return '<a href="tel:' + n + '">' + n + '</a>'; }
  function longTel(m, pre, n, off, str) {
    const at = off + pre.length;
    const before = str.slice(0, at), after = str.slice(at + n.length);
    if (TEL_NOT_AFTER.test(before)) return m;
    const bold = /<strong>$/.test(before) && /^<\/strong>/.test(after);
    const a = Number(n.slice(0, 4)), b = Number(n.slice(5));
    if (!bold && b >= 1500 && b <= 2099 && b > a) {
      if (RANGE_AFTER.test(after) || RANGE_BEFORE.test(before)) return m;
      if (/^\)/.test(after) && b - a <= 110 && !telContext(before, a)) return m;
    }
    return pre + telA(n);
  }
  function telLinks(html) {
    return String(html).split(/(<a\b[^>]*>[\s\S]*?<\/a>|<code>[\s\S]*?<\/code>)/).map(function (part, i) {
      if (i % 2) return part;
      return part.replace(TEL_LONG, longTel)
        .replace(TEL_SHORT, function (_, n) { return '<strong>' + telA(n) + '</strong>'; });
    }).join('');
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
          out.push('<div class="callout callout-' + esc(type) + '" role="note"' + (title ? ' aria-label="' + esc(plain(title)) + '"' : '') + '>' + (title ? '<div class="callout-title">' + inline(title) + '</div>' : '') + inner + '</div>');
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

  /* ---- 고정 안내: 앱(js/app.js)과 정적 페이지(tools/build-pages.cjs)가 같은 문구를 쓴다 ---- */
  const DISCLAIMER = '일반적인 정보예요. 사람마다 상황이 달라서 진단과 치료는 담당 의사와 상의하는 게 안전해요. 약은 스스로 늘리거나 줄이거나 끊지 말고 먼저 상의하세요. 이 글은 AI가 초안을 쓰고 출처를 확인했으며, 전문가 감수는 받지 않았어요.';
  /* 문자 상담 한 줄: 한국생명존중희망재단 마들랜 공식 안내(https://www.madeullan.or.kr/consult/guide, 2026-11-14 확인)
     "문자(109), 카카오톡, 앱을 통해 전 국민 대상 24시간 자살예방SNS상담" — content/11-system/crisis-hotlines.md 와 같은 뜻.
     109 를 tel: 로 잇지 않는다(누르면 전화가 걸려서 문자 안내와 어긋남) */
  const SMS_LINE = '전화가 어렵다면 109로 문자를 보낼 수 있어요.';
  function crisisHtml() {
    return '<div class="crisis" role="note"><strong>지금 많이 힘들다면</strong> 혼자 견디지 않아도 돼요. 자살예방상담 ' + telA('109') + ', 정신건강위기상담 ' + telA('1577-0199') + '는 24시간 받아요. ' + SMS_LINE + ' 당장 위험하면 ' + telA('119') + '에 전화하세요.</div>';
  }
  function emergencyHtml() {
    return '<div class="emergency" role="note"><strong>몸의 응급 신호가 보이면</strong> ' + telA('119') + '에 전화하거나 응급실로 가세요. 약 때문인지 헷갈려도 먼저 연락하는 게 안전해요.</div>';
  }
  /* frontmatter points: 를 목록으로(글자 하나면 한 줄짜리 목록) */
  function pointList(v) {
    const list = Array.isArray(v) ? v : (typeof v === 'string' && v.trim() ? [v] : []);
    return list.map(function (x) { return String(x).trim(); }).filter(Boolean);
  }
  /* 핵심 3가지 상자(줄 수가 3이 아니면 "핵심 정리"). crisis = 위기 태그 글이면 마지막에 상담 전화 줄 */
  function keypointsHtml(points, crisis) {
    const list = pointList(points);
    if (!list.length) return '';
    return '<section class="keypoints"><h2 class="keypoints-h">' + (list.length === 3 ? '핵심 3가지' : '핵심 정리') + '</h2><ul>' +
      list.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>' +
      (crisis ? '<p class="keypoints-crisis">지금 힘들면 ' + telA('109') + ' · ' + telA('1577-0199') + '</p>' : '') + '</section>';
  }
  function fmtDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? m[1] + '년 ' + Number(m[2]) + '월 ' + Number(m[3]) + '일' : '';
  }
  function dotDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? m[1] + '.' + m[2] + '.' + m[3] : '';
  }
  /* 실제 있는 날짜인 YYYY-MM-DD 만(출처 확인일은 형식이 틀리면 보이지 않게. js/ui/trust.js 의 reviewedOf 와 같은 기준) */
  function realDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s.trim() : '');
    if (!m) return '';
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? m[1] + '.' + m[2] + '.' + m[3] : '';
  }
  /* 문서 머리 한 줄(근거 칩·읽는 시간·고친 날·출처 확인일). 앱의 .doc-meta-m(휴대폰 머리 줄)과 정적 페이지의 p.doc-meta-s 가 같은 글자를 쓴다.
     reviewed(frontmatter 의 출처 확인일 YYYY-MM-DD)가 있으면 "출처 확인 YYYY.MM.DD"(없거나 형식이 틀리면 빈 글자) */
  function docMetaText(minutes, updated, reviewed) {
    const d = dotDate(updated), r = realDay(reviewed);
    return { minutes: '약 ' + (Number(minutes) || 1) + '분', updated: d ? d + ' 고침' : '', reviewed: r ? '출처 확인 ' + r : '' };
  }
  /* 근거 칩: 앱의 ev() 와 같은 마크업. info = JHB.EVIDENCE[key] ({label, desc}) */
  function evChipHtml(key, info) {
    if (!key) return '';
    info = info || {};
    return '<span class="ev ev-' + esc(key) + '"' + (info.desc ? ' title="' + esc(info.desc) + '"' : '') + '>' + esc(info.label || key) + '</span>';
  }
  /* o = { evidence: 키, ev: {label, desc}, minutes, updated, reviewed } */
  function docMetaHtml(o) {
    o = o || {};
    const t = docMetaText(o.minutes, o.updated, o.reviewed);
    return '<p class="doc-meta-s">' + evChipHtml(o.evidence, o.ev) + '<span>' + esc(t.minutes) + '</span>' + (t.updated ? '<span>' + esc(t.updated) + '</span>' : '') +
      (t.reviewed ? '<span class="doc-reviewed">' + esc(t.reviewed) + '</span>' : '') + '</p>';
  }
  const NOTICE = {
    general: function () { return '일반적인 정보예요. 사람마다 상황이 달라서 진단과 치료는 담당 의사와 상의하는 게 안전해요. 이 백과의 내용은 AI가 공개 자료로 초안을 쓰고 출처를 확인해 만들었으며, 전문가 감수는 받지 않았어요.'; },
    crisis: function () { return '힘든 생각이 들면 자살예방상담 ' + telA('109') + ', 정신건강위기상담 ' + telA('1577-0199') + '에 24시간 전화할 수 있어요. ' + SMS_LINE + ' 당장 위험하면 ' + telA('119') + '에 전화하세요.'; },
    emergency: function () { return '<strong>몸의 응급 신호가 보이면</strong> ' + telA('119') + '에 전화하거나 응급실로 가세요. 약 때문인지 헷갈려도 먼저 연락하는 게 안전해요.'; },
    device: function () { return '이 기기의 브라우저에만 저장돼요. 어디로도 보내지 않아요. 같은 기기를 쓰는 사람이 볼 수 있어요.'; },
    /* dated: 사람이 화면 내용을 원천과 대조해 확인한 날(특집 화면은 선언의 updated). revised: 자료에서 구한 마지막으로 고친 날(K8).
       고친 날을 "확인한 내용"이라고 하지 않아요(글 하나만 고쳐도 표 전체를 그날 확인한 것처럼 보이지 않게) */
    dated: function (arg) { const d = fmtDay(arg); return d ? d + '에 확인한 내용이에요. 그 뒤에 바뀌었을 수 있어요.' : ''; },
    revised: function (arg) { const d = fmtDay(arg); return d ? d + '에 마지막으로 고쳤어요. 그 뒤에 바뀌었을 수 있어요.' : ''; }
  };
  /* 공용 고지 한 줄. kind: general | crisis | emergency | device | dated·revised(arg = 'YYYY-MM-DD'). 모르는 종류거나 날짜가 없으면 '' */
  function noticeHtml(kind, arg) {
    const f = Object.prototype.hasOwnProperty.call(NOTICE, kind) ? NOTICE[kind] : null;
    const body = f ? f(arg) : '';
    return body ? '<div class="notice notice-' + kind + '" role="note">' + body + '</div>' : '';
  }

  const api = {
    parse: parse, render: render, plain: plain, readingMinutes: readingMinutes, esc: esc, CALLOUT_TITLE: CALLOUT_TITLE,
    inline: inline, telLinks: telLinks, DISCLAIMER: DISCLAIMER, crisisHtml: crisisHtml, emergencyHtml: emergencyHtml,
    pointList: pointList, keypointsHtml: keypointsHtml, noticeHtml: noticeHtml, NOTICE_KINDS: Object.keys(NOTICE),
    docMetaText: docMetaText, docMetaHtml: docMetaHtml, evChipHtml: evChipHtml
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.md = api; }
})(typeof window !== 'undefined' ? window : this);
