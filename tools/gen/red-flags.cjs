/* 생성기: 바로 연락할 신호 한 장(red-flags/)의 자료 data/kb/red-flags.json
   원천은 글 한 곳뿐이에요: content/<분류>/side-effects-overview.md 의 '## 바로 연락할 신호' 소절에 있는 표 하나
   (4열: 신호 | 의심되는 상태 | 할 일 | 자세한 글). 화면은 이 표를 그대로 옮겨 보여 줘요. 따로 가진 내용은 없어요.
   - 실행: node tools/gen/red-flags.cjs (인자 없음). 같은 입력이면 같은 출력. 문제가 있으면 이유를 쓰고 종료 코드 1.
   - 읽는 것: 표 앞 첫 문단(intro), 표, 표 바로 뒤 첫 문단(after), frontmatter 의 title·updated·sources(각주 번호 → 출처).
   - 칸 글자: 각주 [^n] 은 걷어 내 refs 에 번호로, **굵게**·`코드`·[링크](주소) 는 글자만 남겨요.
   - 할 일은 첫 마디로 나눠요: "바로 119…" → kind '119', "오늘 안에 … 연락(.)" → kind 'today'. 그 밖이면 오류
     (모든 줄의 할 일은 119 나 오늘 안에 연락뿐이에요. "괜찮아요"·"지켜봐요"·"연락하지 않아도" 줄은 두지 않아요).
   - 표 바로 뒤 문단은 "약을 스스로 끊지 말고 … 연락" 안전 문장이어야 해요. 다른 문단이 끼면 오류.
   - 선언(data/pages/red-flags.json)의 lead 는 표 앞 문단과 글자까지 같아야 해요(run 에서 견줘요). 다르면 오류.
   - 자세한 글 칸은 [제목](#/a/slug) 링크가 하나 이상, slug 는 content/ 에 실제로 있어야 해요.
   - 생성된 json 은 손으로 고치지 않아요(tests/red-flags.test.cjs 가 다시 돌린 결과와 견줘요).
   node 에서 require 하면 순수 함수만 내보내요(파일을 쓰지 않아요). */
'use strict';
const fs = require('fs');
const path = require('path');

const SOURCE_SLUG = 'side-effects-overview';
const HEADING = '바로 연락할 신호';
const COLUMNS = ['신호', '의심되는 상태', '할 일', '자세한 글'];
const OUT = path.join('data', 'kb', 'red-flags.json');
const DECL = path.join('data', 'pages', 'red-flags.json');
const LINK_RE = /\[([^\]]+)\]\(#\/a\/([^)\s#?]+)\)/g;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/* frontmatter: js/md.js 의 parse 와 같은 규칙(title·updated 와 sources 목록만 씀) */
function parseDoc(src) {
  src = String(src == null ? '' : src).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
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
  return { meta: meta, body: src.slice(m[0].length) };
}
function sourceOf(line, n) {
  const p = String(line).split('|').map(function (x) { return x.trim(); });
  return { n: n, org: p[0] || '', title: p[1] || '', year: p[2] || '', url: p[3] || '' };
}

/* 칸 글자 → { text, refs }: 각주 번호를 모으고 꾸밈을 걷어 낸 한 줄 */
function plain(cell) {
  const refs = [];
  let s = String(cell == null ? '' : cell);
  s = s.replace(/\[\^(\d+)\]/g, function (_, n) { n = Number(n); if (refs.indexOf(n) < 0) refs.push(n); return ''; });
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2').replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\\\|/g, '|').replace(/\s+/g, ' ').trim();
  return { text: s, refs: refs };
}
/* 표 한 줄 → 칸 배열(앞뒤 | 는 떼고, \| 는 칸 나눔이 아님) */
function cells(line) {
  let s = String(line).trim();
  if (s[0] === '|') s = s.slice(1);
  if (s[s.length - 1] === '|' && s[s.length - 2] !== '\\') s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map(function (c) { return c.trim(); });
}
function isSep(line) { return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(String(line).trim()); }

/* 할 일의 첫 마디: 첫 ". " 앞까지(마침표가 없으면 전부) */
function leadOf(action) {
  const s = String(action == null ? '' : action).trim();
  const i = s.indexOf('. ');
  return (i >= 0 ? s.slice(0, i) : s).replace(/\.$/, '');
}
/* 할 일 분류: '119'(바로 119) · 'today'(오늘 안에 … 연락) · null(쓸 수 없음)
   'today' 는 첫 마디가 "연락"으로 끝나야 하고(… 연락하지 않아도 돼요·연락하세요 같은 꼴은 안 받음),
   연락하지 말라는 부정(않·말고·말아·필요 없·안 해도·하지 마·없이)이 있으면 받지 않아요. */
const NEGATION_RE = /않|말고|말아|필요\s*없|안\s*해도|안\s*하|하지\s*마|마세요|없이/;
function classify(action) {
  const lead = leadOf(action);
  if (/^바로 119$/.test(lead)) return '119';
  if (/^오늘 안에 .*연락$/.test(lead) && !NEGATION_RE.test(lead)) return 'today';
  return null;
}
/* 표 바로 뒤 문단은 "약을 스스로 끊지 말고 … 연락"이어야 해요(화면이 그대로 보여 주는 안전 문장) */
const AFTER_MUST = ['스스로 끊지 말고', '연락'];
function afterErrors(after) {
  const s = String(after == null ? '' : after);
  return AFTER_MUST.every(function (w) { return s.indexOf(w) >= 0; }) ? [] :
    ['표 바로 뒤 문단이 "약을 스스로 끊지 말고 먼저 연락하세요…" 문장이 아니에요(표와 그 문장 사이에 다른 문단을 넣지 않아요): ' + JSON.stringify(s)];
}
/* 화면 머리 소개(선언 data/pages/red-flags.json 의 lead)는 글의 표 앞 문장과 같아야 해요 */
function leadErrors(data, decl) {
  const intro = data && typeof data.intro === 'string' ? data.intro : '';
  const lead = decl && typeof decl.lead === 'string' ? decl.lead : '';
  return intro === lead ? [] :
    ['선언(data/pages/red-flags.json)의 lead 가 글의 표 앞 문장과 달라요. lead: ' + JSON.stringify(lead) + ' / 글: ' + JSON.stringify(intro) + ' — 선언의 lead 를 글과 같게 고쳐요'];
}

/* 소절 하나(## HEADING 부터 다음 ## 앞까지)의 줄 배열. 없으면 null */
function sectionLines(body, heading) {
  const lines = String(body).split('\n');
  let at = -1;
  for (let i = 0; i < lines.length; i++) {
    const h = /^##\s+(.+?)\s*#*\s*$/.exec(lines[i]);
    if (h && h[1].trim() === heading) { at = i; break; }
  }
  if (at < 0) return null;
  const out = [];
  for (let i = at + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out;
}
/* 줄 배열에서 i 번째부터 첫 문단(빈 줄·표·콜아웃·목록·제목 앞까지)의 글자 */
function paragraphAt(lines, i) {
  const buf = [];
  for (; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) { if (buf.length) break; continue; }
    if (/^(\||:::|[-*]\s|\d+\.\s|#|>)/.test(l)) break;
    buf.push(l);
  }
  return plain(buf.join(' ')).text;
}

/* 글 원문 → { data, errors }. opts = { slug: 원천 글 slug, slugs: 있는 글(Set·배열·함수) } */
function extract(src, opts) {
  opts = opts || {};
  const errors = [];
  const doc = parseDoc(src);
  const meta = doc.meta;
  const slugSet = opts.slugs;
  function exists(s) {
    if (!slugSet) return true;
    if (typeof slugSet === 'function') return !!slugSet(s);
    if (typeof slugSet.has === 'function') return slugSet.has(s);
    return Array.isArray(slugSet) ? slugSet.indexOf(s) >= 0 : false;
  }
  const sec = sectionLines(doc.body, HEADING);
  if (!sec) return { data: null, errors: ['"## ' + HEADING + '" 소절을 찾지 못했어요'] };
  const ti = sec.findIndex(function (l) { return /^\s*\|/.test(l); });
  if (ti < 0 || !isSep(sec[ti + 1] || '')) return { data: null, errors: ['"' + HEADING + '" 소절에 표가 없어요(머리 줄과 |---| 줄)'] };
  const head = cells(sec[ti]).map(function (c) { return plain(c).text; });
  if (JSON.stringify(head) !== JSON.stringify(COLUMNS)) {
    return { data: null, errors: ['표 열 이름이 달라요: ' + JSON.stringify(head) + ' (기대: ' + JSON.stringify(COLUMNS) + ')'] };
  }
  let end = ti + 2;
  const rows = [];
  const allRefs = [];
  const sources = Array.isArray(meta.sources) ? meta.sources : [];
  for (; end < sec.length && /^\s*\|/.test(sec[end]); end++) {
    const n = rows.length + 1;
    const label = n + '번째 줄: ';
    const c = cells(sec[end]);
    if (c.length !== COLUMNS.length) { errors.push(label + '칸이 ' + c.length + '개예요(' + COLUMNS.length + '개여야 해요)'); continue; }
    const sign = plain(c[0]), state = plain(c[1]), action = plain(c[2]);
    const links = [];
    c[3].replace(LINK_RE, function (_, t, s) {
      if (!SLUG_RE.test(s)) errors.push(label + '자세한 글 slug 형식이 틀렸어요: ' + s);
      else if (!exists(s)) errors.push(label + '자세한 글이 없어요: ' + s);
      else if (!links.some(function (x) { return x.slug === s; })) links.push({ slug: s, title: plain(t).text });
      return '';
    });
    [['신호', sign], ['의심되는 상태', state], ['할 일', action]].forEach(function (p) { if (!p[1].text) errors.push(label + p[0] + ' 칸이 비었어요'); });
    if (!links.length) errors.push(label + '자세한 글 칸에 [제목](#/a/slug) 링크가 없어요');
    const kind = classify(action.text);
    if (action.text && !kind) errors.push(label + '할 일은 "바로 119" 또는 "오늘 안에 … 연락"으로 시작해야 해요: ' + action.text);
    const refs = [];
    [sign, state, action].forEach(function (p) { p.refs.forEach(function (r) { if (refs.indexOf(r) < 0) refs.push(r); }); });
    refs.forEach(function (r) {
      if (!sources[r - 1]) errors.push(label + '[^' + r + '] 에 해당하는 출처가 frontmatter sources 에 없어요');
      if (allRefs.indexOf(r) < 0) allRefs.push(r);
    });
    rows.push({ sign: sign.text, state: state.text, action: action.text, lead: leadOf(action.text), kind: kind, links: links, refs: refs });
  }
  if (!rows.length) errors.push('표에 신호 줄이 없어요');
  const intro = paragraphAt(sec.slice(0, ti), 0);
  const after = paragraphAt(sec, end);
  afterErrors(after).forEach(function (e) { errors.push(e); });
  allRefs.sort(function (a, b) { return a - b; });
  const data = {
    source: { slug: opts.slug || SOURCE_SLUG, title: String(meta.title || ''), heading: HEADING, updated: String(meta.updated || '') },
    intro: intro,
    after: after,
    columns: COLUMNS.slice(),
    rows: rows,
    sources: allRefs.filter(function (r) { return sources[r - 1]; }).map(function (r) { return sourceOf(sources[r - 1], r); })
  };
  return { data: errors.length ? null : data, errors: errors };
}

/* content/ 의 글 slug → 파일 경로 */
function contentSlugs(root) {
  const map = new Map();
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) walk(p);
      else if (/\.md$/.test(d.name)) map.set(d.name.replace(/\.md$/, ''), p);
    });
  })(path.join(root, 'content'));
  return map;
}
function serialize(data) { return JSON.stringify(data, null, 2) + '\n'; }

/* 실제 글에서 자료 만들기(파일은 쓰지 않음) → { data, errors, file } */
function run(root) {
  root = root || path.join(__dirname, '..', '..');
  const slugs = contentSlugs(root);
  const file = slugs.get(SOURCE_SLUG);
  if (!file) return { data: null, errors: ['원천 글이 없어요: content/**/' + SOURCE_SLUG + '.md'], file: null };
  const r = extract(fs.readFileSync(file, 'utf8'), { slug: SOURCE_SLUG, slugs: slugs });
  r.file = file;
  if (r.data) {
    let decl = null;
    try { decl = JSON.parse(fs.readFileSync(path.join(root, DECL), 'utf8').replace(/^﻿/, '')); }
    catch (e) { r.errors.push('선언을 읽지 못했어요: ' + DECL + ' (' + (e && e.message ? e.message : e) + ')'); }
    if (decl) leadErrors(r.data, decl).forEach(function (e) { r.errors.push(e); });
    if (r.errors.length) r.data = null;
  }
  return r;
}

function main() {
  const root = path.join(__dirname, '..', '..');
  const r = run(root);
  if (r.errors.length) {
    r.errors.forEach(function (e) { console.error('red-flags 생성기 오류: ' + e); });
    console.error('red-flags 생성기: ' + (r.file ? path.relative(root, r.file).split(path.sep).join('/') : SOURCE_SLUG) + ' 의 "' + HEADING + '" 표를 고친 뒤 다시 돌려요');
    return 1;
  }
  const out = path.join(root, OUT);
  const text = serialize(r.data);
  const old = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
  if (old !== text) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
  }
  console.log('red-flags: 신호 ' + r.data.rows.length + '줄(바로 119 ' + r.data.rows.filter(function (x) { return x.kind === '119'; }).length +
    ', 오늘 안에 연락 ' + r.data.rows.filter(function (x) { return x.kind === 'today'; }).length + ') → ' + OUT.split(path.sep).join('/') + (old === text ? ' (그대로)' : ''));
  return 0;
}

module.exports = {
  SOURCE_SLUG: SOURCE_SLUG, HEADING: HEADING, COLUMNS: COLUMNS, OUT: OUT, DECL: DECL,
  parseDoc: parseDoc, plain: plain, cells: cells, leadOf: leadOf, classify: classify, afterErrors: afterErrors, leadErrors: leadErrors, sectionLines: sectionLines,
  extract: extract, contentSlugs: contentSlugs, serialize: serialize, run: run
};
if (require.main === module) process.exit(main());
