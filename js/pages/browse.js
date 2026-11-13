/* 둘러보기(browse/): 모든 글을 세 가지 길로 훑어보는 특집 화면
   (1) 분류별 지도: 분류 → 소묶음(data/kb/groups.json) → 글 제목
   (2) 가나다 색인: 모든 글 제목을 가나다순으로, 첫 글자(초성)로 건너뛰기
   (3) 영문·약어 색인: 용어 사전의 영어 이름(en)과 글 제목·용어 속 영문 약어 → 그 글·용어
   staticHtml 에 세 부분을 모두 넣어요(검색엔진·자바스크립트 꺼진 환경, 맨 위 건너뛰기 링크).
   브라우저에서는 같은 내용을 그린 뒤 탭 세 개로 나눠 보여요(주소의 #browse-… 로 처음 탭을 고름).
   아직 없는 글(새 slug)은 링크하지 않고 건너뛰어요. 순수 함수는 page.lib(tests/groups.test.cjs). */
(function (root) {
  const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const CHO_GROUP = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
  /* 가나다 색인 묶음 순서: 한글 초성 → 영문 → 숫자 */
  const INITIALS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'A', '#'];
  const INITIAL_ID = { 'ㄱ': 'g', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄹ': 'r', 'ㅁ': 'm', 'ㅂ': 'b', 'ㅅ': 's', 'ㅇ': 'o', 'ㅈ': 'j', 'ㅊ': 'ch', 'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h', 'A': 'en', '#': 'num' };
  /* 영문·약어 색인 한 항목에 바로 보이는 글 수(영어 이름 · 약어). 더 있으면 "외 N편 · 용어 풀이" 링크로
     그 용어의 풀이(관련 글이 모두 있음)에 보낸다. 휴대폰에서 이 탭이 지나치게 길어지지 않게 */
  const DOCS_NAME = 1, DOCS_ABBR = 4;
  const PARTS = [
    { key: 'map', id: 'browse-map', label: '분류별 지도' },
    { key: 'az', id: 'browse-az', label: '가나다 색인' },
    { key: 'abbr', id: 'browse-abbr', label: '영문·약어 색인' }
  ];

  /* ---------- 정렬과 첫 글자 ---------- */
  function isHangul(c) { return c >= 0xAC00 && c <= 0xD7A3; }
  function isJamo(c) { return c >= 0x3131 && c <= 0x318E; }
  function isLatin(ch) { return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z'); }
  function isDigit(ch) { return ch >= '0' && ch <= '9'; }
  /* 악센트 붙은 라틴 글자(é 등)는 바탕 글자로 */
  function fold(ch) {
    const c = ch.charCodeAt(0);
    if (c >= 0xC0 && c <= 0x24F && ch.normalize) return ch.normalize('NFD').charAt(0);
    return ch;
  }
  /* 글자 갈래: 한글 0, 영문 1, 숫자 2, 그 밖(띄어쓰기·문장부호) 3 */
  function rank(ch) {
    const c = ch.charCodeAt(0);
    if (isHangul(c) || isJamo(c)) return 0;
    if (isLatin(ch)) return 1;
    if (isDigit(ch)) return 2;
    return 3;
  }
  /* 정렬 열쇠: 띄어쓰기·문장부호를 빼고(사전처럼 띄어쓰기 무시) 영문은 소문자로 */
  function sortKey(s) {
    const t = String(s == null ? '' : s);
    let out = '';
    for (let i = 0; i < t.length; i++) {
      const ch = fold(t.charAt(i)).toLowerCase();
      if (rank(ch) < 3) out += ch;
    }
    return out;
  }
  /* 가나다 → 영문(ABC) → 숫자 순. 브라우저·node 의 언어 설정과 상관없이 늘 같은 순서 */
  function compare(a, b) {
    const ka = sortKey(a), kb = sortKey(b);
    const n = Math.min(ka.length, kb.length);
    for (let i = 0; i < n; i++) {
      const x = ka.charAt(i), y = kb.charAt(i);
      if (x === y) continue;
      const rx = rank(x), ry = rank(y);
      if (rx !== ry) return rx - ry;
      return x < y ? -1 : 1;
    }
    if (ka.length !== kb.length) return ka.length - kb.length;
    const sa = String(a), sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  }
  /* 첫 글자 묶음: 한글은 초성(ㄲ→ㄱ 처럼 홑자음으로), 영문 'A', 숫자 '#'. 앞의 따옴표·괄호는 건너뜀 */
  function initial(s) {
    const t = String(s == null ? '' : s);
    for (let i = 0; i < t.length; i++) {
      const ch = fold(t.charAt(i)), c = ch.charCodeAt(0);
      if (isHangul(c)) { const k = CHO[Math.floor((c - 0xAC00) / 588)]; return CHO_GROUP[k] || k; }
      if (isJamo(c)) return CHO.indexOf(ch) >= 0 ? (CHO_GROUP[ch] || ch) : '#';
      if (isLatin(ch)) return 'A';
      if (isDigit(ch)) return '#';
    }
    return '#';
  }
  /* 글 안의 영문 약어: 영문으로 시작하는 낱말(하이픈으로 이어진 것 포함) 가운데 대문자가 둘 이상인 것.
     'anti-NMDA' 처럼 앞마디가 소문자뿐이면 그 마디는 뗀다. 같은 약어는 한 번만 */
  const TOKEN = /[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*/g;
  function upperCount(s) { let n = 0; for (let i = 0; i < s.length; i++) { const ch = s.charAt(i); if (ch >= 'A' && ch <= 'Z') n++; } return n; }
  function abbrs(text) {
    const out = [];
    (String(text == null ? '' : text).match(TOKEN) || []).forEach(function (tok) {
      const parts = tok.split('-');
      while (parts.length > 1 && upperCount(parts[0]) === 0) parts.shift();
      const t = parts.join('-');
      if (upperCount(t) >= 2 && out.indexOf(t) < 0) out.push(t);
    });
    return out;
  }

  /* ---------- 색인 만들기 ---------- */
  function articleList(bySlug) {
    const m = bySlug || {};
    return Object.keys(m).map(function (k) { return m[k]; }).filter(function (a) { return a && a.slug && a.title; });
  }
  function byTitle(a, b) { return compare(a.title, b.title) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0); }
  function byOrder(a, b) { return (a.order || 999) - (b.order || 999) || byTitle(a, b); }
  /* 분류 하나의 묶음: 규칙은 js/ui/hub.js 의 arrange 한 곳에서만 정한다(분류 화면과 지도가 늘 같게).
     node 는 require, 브라우저는 모든 화면에 실리는 hub 모듈(JHB.ui.hub). hub 가 없으면 묶음 없이 평평한 목록 */
  function hubArrange() {
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try { return require('../ui/hub.js').arrange; } catch (e) { return null; }
    }
    const h = typeof window !== 'undefined' && window.JHB && window.JHB.ui && window.JHB.ui.hub;
    return h && typeof h.arrange === 'function' ? h.arrange : null;
  }
  function arrange(entry, list) {
    const fn = hubArrange();
    const r = fn ? fn(entry, list) : null;
    return r && r.groups && r.groups.length ? r.groups : null;
  }
  /* (1) 분류별 지도: 용어 사전을 뺀 분류마다 { id, title, hue, total, groups:[{title, items}] }. 글이 없는 분류는 뺌 */
  function buildMap(sections, groups, bySlug) {
    const arts = articleList(bySlug);
    return (sections || []).filter(function (s) { return s && !s.glossary; }).map(function (s) {
      const list = arts.filter(function (a) { return a.section === s.id; }).sort(byOrder);
      if (!list.length) return null;
      const entry = (groups || []).filter(function (g) { return g && g.section === s.id; })[0] || null;
      return { id: s.id, title: s.title, hue: s.hue, total: list.length, groups: arrange(entry, list) || [{ title: '', items: list }] };
    }).filter(Boolean);
  }
  /* (2) 가나다 색인: [{ key, id, label, short, items }] (INITIALS 순서) */
  function azLabel(k) { return k === 'A' ? '영문' : k === '#' ? '숫자' : k; }
  function azShort(k) { return k === 'A' ? 'A–Z' : k === '#' ? '0–9' : k; }
  function buildAz(bySlug, sections) {
    const gl = {}; (sections || []).forEach(function (s) { if (s && s.glossary) gl[s.id] = true; });
    const by = {};
    articleList(bySlug).filter(function (a) { return !gl[a.section]; }).sort(byTitle).forEach(function (a) {
      const k = initial(a.title);
      (by[k] = by[k] || []).push(a);
    });
    return INITIALS.filter(function (k) { return by[k]; }).map(function (k) {
      return { key: k, id: 'browse-az-' + INITIAL_ID[k], label: azLabel(k), short: azShort(k), items: by[k] };
    });
  }
  /* (3) 영문·약어 색인: [{ key: 'A', id, label, items: [{ key, kind: 'abbr'|'name', terms:[용어], slugs:[글] }] }]
     - 약어(kind abbr): 글 제목 속 약어 → 그 글, 용어 이름·영어 이름 속 약어 → 그 용어와 관련 글(제목에서 찾은 글이 앞)
     - 영어 이름(kind name): 용어 사전의 en → 그 용어와 관련 글
     - 대소문자만 다른 열쇠는 하나로 합치고, 없는 글은 넣지 않음 */
  function letterOf(key) {
    const ch = fold(String(key || '').charAt(0)).toUpperCase();
    return ch >= 'A' && ch <= 'Z' ? ch : '#';
  }
  function buildAbbr(glossary, bySlug) {
    const m = bySlug || {};
    const entries = {}, order = [];
    function entry(key, kind) {
      const k = key.toLowerCase();
      let e = entries[k];
      if (!e) { e = entries[k] = { key: key, kind: kind, terms: [], slugs: [] }; order.push(k); }
      else if (kind === 'abbr' && e.kind !== 'abbr') { e.kind = 'abbr'; e.key = key; }
      return e;
    }
    function addSlug(e, s) { if (m[s] && m[s].title && e.slugs.indexOf(s) < 0) e.slugs.push(s); }
    function addTerm(e, g) { if (e.terms.indexOf(g) < 0) e.terms.push(g); }
    articleList(m).sort(byTitle).forEach(function (a) {
      abbrs(a.title).forEach(function (ab) { addSlug(entry(ab, 'abbr'), a.slug); });
    });
    (glossary || []).forEach(function (g) {
      if (!g || !g.term) return;
      const rel = Array.isArray(g.related) ? g.related : [];
      const en = typeof g.en === 'string' ? g.en.trim() : '';
      abbrs(g.term + ' ' + en).forEach(function (ab) {
        const e = entry(ab, 'abbr'); addTerm(e, g); rel.forEach(function (s) { addSlug(e, s); });
      });
      if (en) { const e = entry(en, 'name'); addTerm(e, g); rel.forEach(function (s) { addSlug(e, s); }); }
    });
    const list = order.map(function (k) { return entries[k]; }).sort(function (x, y) {
      return compare(x.key, y.key) || (x.kind === y.kind ? 0 : x.kind === 'abbr' ? -1 : 1) || (x.key < y.key ? -1 : x.key > y.key ? 1 : 0);
    });
    const by = {}, letters = [];
    list.forEach(function (e) { const L = letterOf(e.key); if (!by[L]) { by[L] = []; letters.push(L); } by[L].push(e); });
    letters.sort(function (a, b) { return a === '#' ? 1 : b === '#' ? -1 : a < b ? -1 : a > b ? 1 : 0; });
    return letters.map(function (L) {
      return { key: L, id: 'browse-ab-' + (L === '#' ? 'num' : L.toLowerCase()), label: L === '#' ? '숫자·기호' : L, short: L === '#' ? '0–9' : L, items: by[L] };
    });
  }

  /* ---------- 자료 모으기 ---------- */
  /* 용어 사전: 브라우저는 JHB.app.glossary. node(build-pages 의 staticHtml 문맥에는 용어 사전이 없음)에서는 data/glossary.js 를 직접 읽는다 */
  function nodeGlossary() {
    if (typeof require !== 'function' || typeof __dirname !== 'string') return [];
    try {
      const fs = require('fs'), path = require('path');
      const src = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'glossary.js'), 'utf8');
      const win = { JHB: {} };
      new Function('window', 'JHB', src)(win, win.JHB);
      return Array.isArray(win.JHB.glossary) ? win.JHB.glossary : [];
    } catch (e) { return []; }
  }
  /* 묶음 자료: 선언 data 로 받지 않는다(받지 못하면 화면 전체가 실패하므로). node(build-pages)는 data/kb/groups.json 을 직접 읽고,
     브라우저는 render 에서 JHB.app.loadData('groups') 로 받아 지도만 다시 짠다 */
  function nodeGroups() {
    if (typeof require !== 'function' || typeof __dirname !== 'string') return [];
    try {
      let t = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'data', 'kb', 'groups.json'), 'utf8');
      if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
      const v = JSON.parse(t);
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function groupsOf(ctx) {
    if (ctx && ctx.data && Array.isArray(ctx.data.groups)) return ctx.data.groups;
    return nodeGroups();
  }
  function glossaryOf(ctx) {
    if (ctx && Array.isArray(ctx.glossary)) return ctx.glossary;
    if (ctx && ctx.app && Array.isArray(ctx.app.glossary)) return ctx.app.glossary;
    if (typeof window !== 'undefined' && window.JHB && Array.isArray(window.JHB.glossary)) return window.JHB.glossary;
    return nodeGlossary();
  }
  function model(src) {
    const bySlug = src.articles || {};
    const sections = Array.isArray(src.sections) ? src.sections : [];
    const glossary = Array.isArray(src.glossary) ? src.glossary : [];
    const secById = {}; sections.forEach(function (s) { if (s) secById[s.id] = s; });
    const az = buildAz(bySlug, sections);
    return {
      bySlug: bySlug, secById: secById,
      map: buildMap(sections, Array.isArray(src.groups) ? src.groups : [], bySlug),
      az: az,
      abbr: buildAbbr(glossary, bySlug),
      total: az.reduce(function (n, g) { return n + g.items.length; }, 0),
      glossSec: sections.filter(function (s) { return s && s.glossary; })[0] || null,
      glossCount: glossary.length
    };
  }

  /* ---------- HTML (정적 페이지와 브라우저가 같은 마크업) ---------- */
  function escFallback(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function spineHtml(s) { return '<span class="spine" style="--h:' + (Number(s && s.hue) || 250) + '" aria-hidden="true"></span>'; }
  function letterNav(list, label, esc, cls) {
    return '<nav class="pg-browse-letters' + (cls ? ' ' + cls : '') + '" aria-label="' + esc(label) + '"><ul>' + list.map(function (g) {
      return '<li><a href="#' + g.id + '"' + (g.short !== g.label ? ' aria-label="' + esc(g.label) + '"' : '') + '>' + esc(g.short) + '</a></li>';
    }).join('') + '</ul></nav>';
  }
  function partOpen(p, note, esc) {
    /* 부분 제목 id 는 '-title'(묶음 id 'browse-az-h'(ㅎ) 와 겹치지 않게) */
    return '<section class="pg-browse-part" id="' + p.id + '" aria-labelledby="' + p.id + '-title"><h2 class="pg-browse-h" id="' + p.id + '-title">' + esc(p.label) + '</h2>' +
      (note ? '<p class="pg-browse-note">' + esc(note) + '</p>' : '');
  }
  function mapHtml(m, esc) {
    let h = partOpen(PARTS[0], m.map.length ? '분류 ' + m.map.length + '개의 글 ' + m.total + '편을 소묶음으로 나눴어요. 분류 이름을 누르면 그 분류 화면으로 가요.' : '', esc);
    if (!m.map.length) return h + '<p class="pg-browse-empty">아직 보여 드릴 글이 없어요.</p></section>';
    h += '<nav class="pg-browse-secs" aria-label="분류로 건너뛰기"><ul>' + m.map.map(function (s) {
      return '<li><a href="#browse-map-' + esc(s.id) + '">' + spineHtml(s) + esc(s.title) + '</a></li>';
    }).join('') + '</ul></nav>';
    const gl = m.glossSec;
    const rows = m.map.slice();
    /* 용어 사전은 분류 순서의 제자리에 한 줄로 */
    const glAt = gl ? m.map.filter(function (s) { return Number(s.id) < Number(gl.id); }).length : -1;
    rows.forEach(function (s, i) {
      if (gl && i === glAt) h += glossLine(gl, m, esc);
      h += '<section class="pg-browse-sec" id="browse-map-' + esc(s.id) + '" aria-labelledby="browse-map-' + esc(s.id) + '-h">' +
        '<h3 id="browse-map-' + esc(s.id) + '-h">' + spineHtml(s) + '<a href="#/s/' + esc(s.id) + '">' + esc(s.title) + '</a><span class="pg-browse-n">' + s.total + '편</span></h3>' +
        s.groups.map(function (g) {
          return '<div class="pg-browse-grp' + (g.extra ? ' pg-browse-extra' : '') + '">' + (g.title ? '<h4>' + esc(g.title) + '</h4>' : '') + '<ul>' + g.items.map(function (a) {
            return '<li><a href="#/a/' + esc(a.slug) + '" data-slug="' + esc(a.slug) + '">' + esc(a.title) + '</a></li>';
          }).join('') + '</ul></div>';
        }).join('') + '</section>';
    });
    if (gl && glAt >= rows.length) h += glossLine(gl, m, esc);
    return h + '</section>';
  }
  function glossLine(gl, m, esc) {
    return '<p class="pg-browse-gl">' + spineHtml(gl) + '<a href="#/glossary">' + esc(gl.title) + '</a>' +
      '<span class="pg-browse-n">' + (m.glossCount ? '용어 ' + m.glossCount + '개, ' : '') + '가나다순 풀이</span></p>';
  }
  function azHtml(m, esc) {
    let h = partOpen(PARTS[1], m.total ? '글 ' + m.total + '편을 제목의 가나다순으로 모았어요. 띄어쓰기는 셈하지 않아요.' : '', esc);
    if (!m.az.length) return h + '<p class="pg-browse-empty">아직 보여 드릴 글이 없어요.</p></section>';
    h += letterNav(m.az, '첫 글자로 건너뛰기', esc, 'pg-browse-ko');
    m.az.forEach(function (g) {
      h += '<section class="pg-browse-az" id="' + g.id + '" style="--n:' + g.items.length + '" aria-labelledby="' + g.id + '-h"><h3 id="' + g.id + '-h">' + esc(g.label) + '</h3><ul>' + g.items.map(function (a) {
        const s = m.secById[a.section];
        return '<li><a href="#/a/' + esc(a.slug) + '" data-slug="' + esc(a.slug) + '">' + esc(a.title) + '</a>' + (s ? '<span class="pg-browse-in">' + esc(s.title) + '</span>' : '') + '</li>';
      }).join('') + '</ul></section>';
    });
    return h + '</section>';
  }
  function abbrHtml(m, esc) {
    let h = partOpen(PARTS[2], m.abbr.length ? '용어 사전의 영어 이름과, 글 제목·용어에 나오는 영문 약어를 알파벳순으로 모았어요. 용어를 누르면 풀이로, 글을 누르면 그 글로 가요.' : '', esc);
    if (!m.abbr.length) return h + '<p class="pg-browse-empty">아직 보여 드릴 영문 이름이 없어요.</p></section>';
    h += letterNav(m.abbr, '알파벳으로 건너뛰기', esc);
    m.abbr.forEach(function (g) {
      h += '<section class="pg-browse-ab" id="' + g.id + '" style="--n:' + g.items.length + '" aria-labelledby="' + g.id + '-h"><h3 id="' + g.id + '-h">' + esc(g.label) + '</h3><dl>' + g.items.map(function (e) {
        const terms = e.terms.map(function (t) {
          const en = typeof t.en === 'string' ? t.en.trim() : '';
          return '<a href="#/glossary?t=' + esc(encodeURIComponent(t.term)) + '">' + esc(t.term) + '</a>' +
            (e.kind === 'abbr' && en && en.toLowerCase() !== e.key.toLowerCase() ? ' <span class="pg-browse-ex" lang="en">' + esc(en) + '</span>' : '');
        });
        /* 글 순서: 제목에 약어가 든 글 → 용어 사전 related 순서(첫 글은 앱이 그 용어의 대표 글로 쓰는 글).
           영어 이름은 첫 글 하나, 약어는 넷까지 보인다. 가릴 글이 두 편 이상이고 갈 용어가 있을 때만 줄이고,
           줄인 글은 "외 N편 · 용어 풀이" 링크로 그 용어 풀이(관련 글이 모두 있음)에 보낸다 */
        const max = e.kind === 'abbr' ? DOCS_ABBR : DOCS_NAME;
        const cut = e.terms.length && e.slugs.length > max + 1;
        const docs = (cut ? e.slugs.slice(0, max) : e.slugs).map(function (s) { return '<a href="#/a/' + esc(s) + '">' + esc(m.bySlug[s].title) + '</a>'; });
        const more = cut ? '<a class="pg-browse-more" href="#/glossary?t=' + esc(encodeURIComponent(e.terms[0].term)) + '">외 ' + (e.slugs.length - max) + '편 · 용어 풀이</a>' : '';
        return '<div class="pg-browse-e' + (e.kind === 'abbr' ? ' pg-browse-abbrk' : '') + '"><dt lang="en">' + esc(e.key) + '</dt><dd>' +
          (terms.length ? '<span class="pg-browse-r"><span class="pg-browse-k">용어</span> ' + terms.join(', ') + '</span>' : '') +
          (docs.length ? '<span class="pg-browse-r"><span class="pg-browse-k">글</span> ' + docs.join(', ') + (more ? ' ' + more : '') + '</span>' : '') +
          '</dd></div>';
      }).join('') + '</dl></section>';
    });
    return h + '</section>';
  }
  function html(m, esc) {
    return '<nav class="pg-browse-skip" aria-label="이 화면의 세 부분"><ul>' + PARTS.map(function (p) {
      return '<li><a href="#' + p.id + '">' + esc(p.label) + '</a></li>';
    }).join('') + '</ul></nav>' + mapHtml(m, esc) + azHtml(m, esc) + abbrHtml(m, esc);
  }

  /* ---------- 브라우저: 탭·읽음 표시 ---------- */
  let cachedGroups = null;
  /* 읽은 글 표시: 기록은 한 번만 읽는다(링크가 500개가 넘어 링크마다 저장소를 읽지 않게) */
  function markRead(mount, app) {
    const read = {};
    try { (app.progress && app.progress.readSlugs ? app.progress.readSlugs() : []).forEach(function (s) { read[s] = true; }); } catch (e) { }
    Array.prototype.forEach.call(mount.querySelectorAll('a[data-slug]'), function (a) {
      a.classList.toggle('pg-browse-read', read[a.getAttribute('data-slug')] === true);
    });
  }
  /* 묶음 자료가 늦게 오면 분류별 지도의 속만 바꾼다(탭·패널 속성·다른 두 부분은 그대로).
     지도를 보고 있었으면 보던 분류가 같은 높이에 남게, 지도 안에 포커스가 있었으면 같은 링크로 돌려놓는다 */
  function swapMap(mount, m, esc) {
    const panel = mount.querySelector('#' + PARTS[0].id);
    if (!panel) return;
    const t = document.createElement('template');
    t.innerHTML = mapHtml(m, esc);
    const fresh = t.content.firstElementChild;
    if (!fresh) return;
    const ae = document.activeElement;
    const focusHref = ae && ae.tagName === 'A' && panel.contains(ae) ? ae.getAttribute('href') : null;
    let anchorId = null, anchorTop = 0;
    if (!panel.hidden && window.scrollY > 0) {
      const bar = document.querySelector('.topbar');
      const lim = bar ? bar.getBoundingClientRect().bottom : 0;
      const secs = panel.querySelectorAll('.pg-browse-sec');
      for (let i = 0; i < secs.length; i++) {
        const b = secs[i].getBoundingClientRect();
        if (b.bottom > lim) { anchorId = secs[i].id; anchorTop = b.top; break; }
      }
    }
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    while (fresh.firstChild) panel.appendChild(fresh.firstChild);
    markRead(panel, (window.JHB && window.JHB.app) || {});
    if (focusHref) {
      const a = Array.prototype.filter.call(panel.querySelectorAll('a[href]'), function (x) { return x.getAttribute('href') === focusHref; })[0];
      if (a) a.focus({ preventScroll: !!anchorId });
    }
    if (anchorId) {
      const n = document.getElementById(anchorId);
      if (n) window.scrollBy(0, n.getBoundingClientRect().top - anchorTop);
    }
  }
  function enhance(mount, ctx) {
    const app = ctx.app, el = ctx.el || app.el;
    /* 내 서재 등에서 기록을 지우면(jhb:privacy clear), 뒤로 가기로 이 화면이 되살아나면(bfcache) 읽음 표시를 다시 맞춘다 */
    markRead(mount, app);
    function onPrivacy(e) { if (e.detail && e.detail.action === 'clear') markRead(mount, app); }
    function onShow(e) { if (e.persisted) markRead(mount, app); }
    window.addEventListener('jhb:privacy', onPrivacy);
    window.addEventListener('pageshow', onShow);
    if (ctx.onCleanup) ctx.onCleanup(function () { window.removeEventListener('jhb:privacy', onPrivacy); window.removeEventListener('pageshow', onShow); });
    const panels = PARTS.map(function (p) { return document.getElementById(p.id); });
    if (panels.some(function (p) { return !p || !mount.contains(p); })) return;
    let cur = -1;
    const tabs = PARTS.map(function (p, i) {
      return el('button.pg-browse-tab', { type: 'button', role: 'tab', id: 'browse-tab-' + p.key, 'aria-controls': p.id, 'aria-selected': 'false', tabindex: '-1', onclick: function () { select(i, true); } }, [p.label]);
    });
    const list = el('div.pg-browse-tabs', { role: 'tablist', 'aria-label': '둘러보는 방법' }, tabs);
    list.addEventListener('keydown', function (e) {
      let j = -1;
      if (e.key === 'ArrowRight') j = (cur + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (cur + tabs.length - 1) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j < 0) return;
      e.preventDefault();
      select(j, true);
      tabs[j].focus();
    });
    const skip = mount.querySelector('.pg-browse-skip');
    if (skip) skip.replaceWith(list); else mount.insertBefore(list, mount.firstChild);
    mount.classList.add('pg-browse-tabbed');
    panels.forEach(function (pn, i) {
      pn.setAttribute('role', 'tabpanel');
      pn.setAttribute('aria-labelledby', tabs[i].id);
    });
    /* 붙박이 첫 글자 줄의 높이만큼 묶음 제목이 가려지지 않게(scroll-margin 에 씀) */
    function measure() {
      panels.forEach(function (pn) {
        if (pn.hidden) return;
        const bar = pn.querySelector('.pg-browse-letters');
        if (bar && bar.offsetHeight) pn.style.setProperty('--pgb-bar', bar.offsetHeight + 'px');
      });
    }
    function select(i, user) {
      if (i === cur) return;
      cur = i;
      tabs.forEach(function (t, j) { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; });
      panels.forEach(function (pn, j) { pn.hidden = j !== i; });
      measure();
      if (user) { try { history.replaceState(history.state, '', location.pathname + location.search + '#' + PARTS[i].id); } catch (e) { } }
    }
    /* 주소의 #조각이 가리키는 곳: 그 부분의 탭을 고르고 그 자리로 */
    function fromHash(scroll) {
      let id = '';
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { id = ''; }
      const t = id && /^browse-[a-z0-9-]+$/.test(id) ? document.getElementById(id) : null;
      const i = t ? panels.findIndex(function (p) { return p === t || p.contains(t); }) : -1;
      if (i < 0) return false;
      select(i, false);
      if (scroll) {
        if (t === panels[i]) list.scrollIntoView({ block: 'start' });
        else t.scrollIntoView({ block: 'start' });
      }
      return true;
    }
    if (!fromHash(true)) select(0, false);
    function onHash() { fromHash(true); }
    let raf = 0;
    function onResize() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; measure(); }); }
    window.addEventListener('hashchange', onHash);
    window.addEventListener('resize', onResize);
    if (ctx.onCleanup) ctx.onCleanup(function () {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    });
  }

  const page = {
    id: 'browse',
    lib: { compare: compare, initial: initial, abbrs: abbrs, buildAz: buildAz, buildAbbr: buildAbbr, buildMap: buildMap, INITIALS: INITIALS, PARTS: PARTS, DOCS_NAME: DOCS_NAME, DOCS_ABBR: DOCS_ABBR },
    staticHtml: function (ctx) {
      const c = ctx || {};
      return html(model({ articles: c.articles, sections: c.sections, groups: groupsOf(c), glossary: glossaryOf(c) }), typeof c.esc === 'function' ? c.esc : escFallback);
    },
    /* 묶음 자료(groups.json)는 기다리지 않는다: 받은 적이 있으면(같은 탭에서 다시 오면) 바로 쓰고,
       아니면 묶음 없이 먼저 그린 뒤 받으면 지도만 바꾼다. 받지 못하면 묶음 없는 지도와 가나다·영문 색인이 그대로 남는다 */
    render: function (mount, ctx) {
      const app = ctx.app, esc = app.esc || escFallback;
      const src = { articles: app.bySlug, sections: app.sections, groups: cachedGroups || (ctx.data && ctx.data.groups) || [], glossary: app.glossary };
      mount.innerHTML = html(model(src), esc);
      enhance(mount, ctx);
      if (cachedGroups || typeof app.loadData !== 'function') return;
      let alive = true;
      if (ctx.onCleanup) ctx.onCleanup(function () { alive = false; });
      app.loadData('groups').then(function (g) {
        if (!Array.isArray(g)) return;
        cachedGroups = g;
        if (!alive || !mount.isConnected) return;
        src.groups = g;
        swapMap(mount, model(src), esc);
      }).catch(function () { /* 묶음 없이 평평한 지도를 그대로 둔다 */ });
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
