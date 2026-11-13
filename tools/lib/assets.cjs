/* 빌드 도구와 개발 서버(serve.cjs)가 함께 쓰는 자산 목록·특집 화면 선언 함수.
   같은 함수를 써야 빌드한 결과와 개발 서버가 즉석에서 만든 결과가 똑같아요.
   - uiModules()      화면 확장 모듈 js/ui/*.js (tools/ui-order.json 순서 + 나머지 이름순)
   - uiCss()          css/ui.css 내용(css/ui/*.css 이름순으로 이어 붙임)
   - pageDecls()      data/pages/<id>.json 특집 화면 선언 읽기·검사·정리
   - pagesJs(pages)   data/pages.js 내용
   - resolveLastmod(decl)  사이트맵·dated 고지 날짜(선언의 "lastmod": "kb:<자료>:<날짜 경로>" → 그 자료의 가장 최근 날짜, 없으면 updated)
   - kbFiles()        data/kb/*.json 목록, kbCheck() JSON 검사
   - uiScriptsHtml(base), topLinksHtml(pages, base), footLinksHtml(pages, base), applyShellMarkers(html, base, pages)  shell 조각 */
const fs = require('fs');
const path = require('path');
/* 날짜 규칙(lastmod 꼴·경로 따라가기·실제 있는 날짜)은 앱과 같은 순수 함수(js/progress.js, K5-3) */
const PR = require('../../js/progress.js');

const ROOT = path.join(__dirname, '..', '..');
const ID_RE = /^[a-z][a-z0-9-]{1,19}$/;
const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
/* 주소로 쓰면 안 되는 이름. search 는 등록 화면으로 옮겨 갈 예정이라 허용해요. */
const RESERVED = ['a', 's', 'fav', 'glossary', 'about', 'courses', 'course', 'random', 'css', 'js', 'data', 'content', 'docs', 'tools', 'tests', 'notfound'];
const GROUPS = ['안내', '지식', '도구', '기록'];
const NAV_PLACES = ['top', 'side', 'home', 'palette'];
const NOTICE_KINDS = ['general', 'crisis', 'emergency', 'device', 'dated'];
const KNOWN_KEYS = ['id', 'title', 'label', 'summary', 'lead', 'group', 'order', 'nav', 'keywords', 'data', 'robots', 'crisisLine', 'notice', 'updated', 'lastmod'];
const SUMMARY_MAX = 155;
/* 사이트맵 날짜를 자료에서 읽는 명시 항목: "lastmod": "kb:<data/kb 이름>:<날짜 경로>" (예: "kb:changes:date", "kb:red-flags:source.updated").
   빌드는 선언에 이렇게 적힌 화면만 자료를 읽어요(자료 모양으로 짐작하지 않음). 꼴은 js/progress.js 의 LASTMOD_RE 하나 */
const LASTMOD_RE = PR.LASTMOD_RE;
/* crisisLine:false(위기 줄 빼기)를 허락받은 화면 id. 위기 안내는 빠지지 않는 게 원칙이라(plan-final 4-4) 총괄만 이 목록에 더해요. 지금은 없음. */
const CRISIS_LINE_OFF_OK = [];

function rootOf(opts) { return (opts && opts.root) || ROOT; }
function listDir(dir, re) {
  try { return fs.readdirSync(dir).filter(function (f) { return re.test(f); }).sort(); } catch (e) { return []; }
}
function stripBom(t) { t = String(t); return t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t; }
function isStrList(v) { return Array.isArray(v) && v.every(function (x) { return typeof x === 'string' && x.trim(); }); }

/* ---------- 화면 확장 모듈 ---------- */
function uiOrder(opts) {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(rootOf(opts), 'tools', 'ui-order.json'), 'utf8'));
    return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }) : [];
  } catch (e) { return []; }
}
/* 기존 모듈은 ui-order.json 순서로 앞에, 새 모듈은 이름순으로 뒤에. 값은 'js/ui/<이름>.js' */
function uiModules(opts) {
  const have = listDir(path.join(rootOf(opts), 'js', 'ui'), /\.js$/).map(function (f) { return f.replace(/\.js$/, ''); });
  const order = uiOrder(opts).filter(function (n) { return have.indexOf(n) >= 0; });
  const rest = have.filter(function (n) { return order.indexOf(n) < 0; });
  return order.concat(rest).map(function (n) { return 'js/ui/' + n + '.js'; });
}
function uiCss(opts) {
  const dir = path.join(rootOf(opts), 'css', 'ui');
  const files = listDir(dir, /\.css$/);
  const out = ['/* 자동 생성: tools/build-ui-css.cjs 가 css/ui/*.css 를 이 순서로 이어 붙인다. 직접 고치지 않는다. */'];
  files.forEach(function (f) { out.push('\n/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(dir, f), 'utf8')); });
  return out.join('\n');
}
function uiCssFiles(opts) { return listDir(path.join(rootOf(opts), 'css', 'ui'), /\.css$/); }

/* ---------- 특집 화면 선언 ---------- */
/* d: JSON 값, fileId: 파일 이름(확장자 뺀 것), opts.root: 사이트 루트(데이터 파일 확인용, 없으면 확인 안 함)
   돌려주는 값: { errors: [..], warnings: [..] } */
function validateDecl(d, fileId, opts) {
  const errors = [], warnings = [];
  const where = 'data/pages/' + fileId + '.json';
  function bad(msg) { errors.push(where + ': ' + msg); }
  if (!d || typeof d !== 'object' || Array.isArray(d)) { bad('JSON 객체가 아니에요'); return { errors: errors, warnings: warnings }; }
  if (d.id !== fileId) bad('id("' + d.id + '")가 파일 이름("' + fileId + '")과 달라요');
  if (typeof d.id !== 'string' || !ID_RE.test(d.id)) bad('id 는 영어 소문자로 시작하고 소문자·숫자·- 로 2~20자여야 해요');
  else if (RESERVED.indexOf(d.id) >= 0) bad('id "' + d.id + '" 는 예약어예요(이미 쓰는 주소나 폴더 이름)');
  if (typeof d.title !== 'string' || !d.title.trim()) bad('title 이 비었어요');
  if (d.label != null && (typeof d.label !== 'string' || !d.label.trim())) bad('label 은 비지 않은 글자여야 해요');
  if (typeof d.summary !== 'string' || !d.summary.trim()) bad('summary 가 비었어요(검색 결과 설명)');
  else if (d.summary.length > SUMMARY_MAX) bad('summary 가 ' + d.summary.length + '자예요(' + SUMMARY_MAX + '자 이하)');
  if (d.lead != null && typeof d.lead !== 'string') bad('lead 는 글자여야 해요');
  if (GROUPS.indexOf(d.group) < 0) bad('group 은 ' + GROUPS.join('·') + ' 가운데 하나여야 해요');
  if (d.order != null && (typeof d.order !== 'number' || !isFinite(d.order))) bad('order 는 숫자여야 해요');
  if (d.nav != null) {
    if (!Array.isArray(d.nav) || d.nav.some(function (x) { return NAV_PLACES.indexOf(x) < 0; })) bad('nav 는 ' + JSON.stringify(NAV_PLACES) + ' 의 부분집합이어야 해요');
    else if (new Set(d.nav).size !== d.nav.length) bad('nav 에 같은 값이 두 번 있어요');
  }
  if (d.keywords != null && !isStrList(d.keywords)) bad('keywords 는 글자 목록이어야 해요');
  if (d.data != null) {
    if (!Array.isArray(d.data) || d.data.some(function (x) { return typeof x !== 'string' || !NAME_RE.test(x); })) bad('data 는 data/kb/<이름>.json 의 이름 목록이어야 해요(소문자·숫자·-)');
    else if (opts && opts.root) d.data.forEach(function (n) { if (!fs.existsSync(path.join(opts.root, 'data', 'kb', n + '.json'))) bad('data/kb/' + n + '.json 이 없어요'); });
  }
  if (d.robots != null && d.robots !== 'index' && d.robots !== 'noindex') bad('robots 는 "index" 나 "noindex" 여야 해요');
  if (d.crisisLine != null && typeof d.crisisLine !== 'boolean') bad('crisisLine 은 true/false 여야 해요');
  if (d.crisisLine === false && CRISIS_LINE_OFF_OK.indexOf(d.id) < 0) bad('crisisLine 을 false 로 둘 수 없어요(위기 줄 109·1577-0199·119 는 빠지지 않아요). 꼭 빼야 하면 총괄이 tools/lib/assets.cjs 의 CRISIS_LINE_OFF_OK 에 id 를 더해요');
  if (d.notice != null) {
    if (!Array.isArray(d.notice) || d.notice.some(function (x) { return NOTICE_KINDS.indexOf(x) < 0; })) bad('notice 는 ' + JSON.stringify(NOTICE_KINDS) + ' 의 부분집합이어야 해요');
    else if (d.notice.indexOf('dated') >= 0 && !d.updated) bad('notice 에 "dated" 를 쓰려면 updated 가 있어야 해요');
  }
  if (d.updated != null && (typeof d.updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.updated))) bad('updated 는 YYYY-MM-DD 꼴이어야 해요');
  if (d.lastmod != null) {
    const lm = typeof d.lastmod === 'string' ? LASTMOD_RE.exec(d.lastmod) : null;
    if (!lm) bad('lastmod 는 "kb:<data/kb 이름>:<날짜 경로>" 꼴이어야 해요(예: "kb:changes:date", "kb:red-flags:source.updated"). 날짜를 직접 적을 때는 updated 를 써요');
    else if (opts && opts.root) {
      const r = kbLastmod(lm[1], lm[2], { root: opts.root });
      if (r.error) bad('lastmod: ' + r.error);
      else if (!r.date) warnings.push(where + ': lastmod 가 가리키는 data/kb/' + lm[1] + '.json 에 "' + lm[2] + '" 날짜(YYYY-MM-DD)가 하나도 없어요(사이트맵에는 updated 를 써요)');
    }
  }
  Object.keys(d).forEach(function (k) { if (KNOWN_KEYS.indexOf(k) < 0) warnings.push(where + ': 모르는 항목 "' + k + '" (무시해요)'); });
  return { errors: errors, warnings: warnings };
}

/* 기본값을 채우고 hasJs·hasCss 를 더한다. 'general' 고지는 늘 맨 앞에 둔다(뺄 수 없음).
   'crisis' 는 notice 에서 빼고 crisisLine 하나로만 붙인다(두 번 붙지 않게). */
function normalizeDecl(d, opts) {
  const root = rootOf(opts);
  const raw = Array.isArray(d.notice) ? d.notice : [];
  const notice = ['general'].concat(raw.filter(function (k, i, a) { return k !== 'general' && k !== 'crisis' && a.indexOf(k) === i; }));
  return {
    id: d.id,
    title: d.title.trim(),
    label: (d.label || d.title).trim(),
    summary: d.summary.trim(),
    lead: typeof d.lead === 'string' ? d.lead.trim() : '',
    group: d.group,
    order: typeof d.order === 'number' ? d.order : 100,
    nav: Array.isArray(d.nav) ? d.nav.slice() : ['side', 'palette'],
    keywords: Array.isArray(d.keywords) ? d.keywords.slice() : [],
    data: Array.isArray(d.data) ? d.data.slice() : [],
    robots: d.robots === 'noindex' ? 'noindex' : 'index',
    crisisLine: d.crisisLine !== false || raw.indexOf('crisis') >= 0,
    notice: notice,
    updated: d.updated || '',
    lastmod: typeof d.lastmod === 'string' ? d.lastmod : '',
    hasJs: fs.existsSync(path.join(root, 'js', 'pages', d.id + '.js')),
    hasCss: fs.existsSync(path.join(root, 'css', 'pages', d.id + '.css'))
  };
}
function sortPages(list) {
  return list.slice().sort(function (a, b) {
    return GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}
/* data/pages/*.json 을 모두 읽어 검사한다. 돌려주는 값: { pages: 정리·정렬된 선언(오류 없는 것만), errors, warnings } */
function pageDecls(opts) {
  const root = rootOf(opts);
  const dir = path.join(root, 'data', 'pages');
  const errors = [], warnings = [], pages = [], seen = {};
  listDir(dir, /\.json$/).forEach(function (f) {
    const fileId = f.replace(/\.json$/, '');
    let d;
    try { d = JSON.parse(stripBom(fs.readFileSync(path.join(dir, f), 'utf8'))); }
    catch (e) { errors.push('data/pages/' + f + ': JSON 으로 읽을 수 없어요(' + e.message + ')'); return; }
    const r = validateDecl(d, fileId, { root: root });
    r.warnings.forEach(function (w) { warnings.push(w); });
    if (r.errors.length) { r.errors.forEach(function (e) { errors.push(e); }); return; }
    const key = d.id.toLowerCase();
    if (seen[key]) { errors.push('data/pages/' + f + ': id "' + d.id + '" 가 ' + seen[key] + ' 와 겹쳐요'); return; }
    seen[key] = 'data/pages/' + f;
    const n = normalizeDecl(d, { root: root });
    if (!n.hasJs) warnings.push('data/pages/' + f + ': js/pages/' + d.id + '.js 가 없어 본문이 비어요(제목·lead·고지만 보여요' + (n.lead ? '' : '. lead 도 없어 앱이 "화면 내용을 불러오지 못했어요"를 보여요') + ')');
    pages.push(n);
  });
  return { pages: sortPages(pages), errors: errors, warnings: warnings };
}
function pagesJs(pages) {
  return '/* 자동 생성: node tools/build-kb.cjs 가 data/pages/*.json 으로 만든다 — 직접 고치지 마세요 */\n' +
    'window.JHB = window.JHB || {};\nJHB.pages = ' + JSON.stringify(pages || [], null, 1).replace(/</g, '\\u003c') + ';\n';
}

/* ---------- 사이트맵 날짜 ---------- */
/* data/kb/<name>.json 을 읽는다. 돌려주는 값: { value } 또는 { error } (파일 없음·JSON 오류·배열이나 객체가 아님) */
function readKb(name, field, opts) {
  const rel = 'data/kb/' + name + '.json';
  const file = path.join(rootOf(opts), 'data', 'kb', name + '.json');
  if (!fs.existsSync(file)) return { error: rel + ' 이 없어요' };
  let v;
  try { v = JSON.parse(stripBom(fs.readFileSync(file, 'utf8'))); }
  catch (e) { return { error: rel + ' 을 JSON 으로 읽을 수 없어요(' + e.message + ')' }; }
  if (!v || typeof v !== 'object') return { error: rel + ' 은 항목 배열이나 객체여야 해요(가장 최근 "' + field + '" 를 찾아요)' };
  return { value: v };
}
/* data/kb/<name>.json 에서 field(점 경로, 배열이면 항목마다) 값 가운데 가장 최근 실제 날짜(YYYY-MM-DD). 규칙은 js/progress.js 의 latestDate.
   돌려주는 값: { date: 'YYYY-MM-DD' | '' } 또는 { error } */
function kbLastmod(name, field, opts) {
  const r = readKb(name, field, opts);
  return r.error ? { error: r.error } : { date: PR.latestDate(r.value, field) };
}
/* 정리된 선언(normalizeDecl)의 사이트맵 날짜이자 "○○에 확인한 내용" 고지 날짜:
   lastmod 가 가리키는 자료의 가장 최근 날짜 → 없으면(자료 없음·깨짐·경로 없음·틀린 날짜) updated → 없으면 ''(사이트맵은 빌드한 날로).
   앱(js/app.js)도 같은 js/progress.js 의 pageDate 로 고지를 그려요 */
function resolveLastmod(decl, opts) {
  const ref = PR.lastmodRef(decl && decl.lastmod);
  let value;
  if (ref) { const r = readKb(ref.name, ref.path, opts); if (!r.error) value = r.value; }
  return PR.pageDate(decl, value) || '';
}

/* ---------- 지식 데이터 ---------- */
function kbFiles(opts) { return listDir(path.join(rootOf(opts), 'data', 'kb'), /\.json$/).map(function (f) { return 'data/kb/' + f; }); }
function kbCheck(opts) {
  const root = rootOf(opts), errors = [];
  kbFiles(opts).forEach(function (rel) {
    const name = path.basename(rel, '.json');
    if (!NAME_RE.test(name)) errors.push(rel + ': 파일 이름은 소문자·숫자·- 만 써요');
    try { JSON.parse(stripBom(fs.readFileSync(path.join(root, rel), 'utf8'))); }
    catch (e) { errors.push(rel + ': JSON 으로 읽을 수 없어요(' + e.message + ')'); }
  });
  return errors;
}
/* 특집 화면 코드·스타일 파일 목록(프리캐시용) */
function pageAssetFiles(opts) {
  const root = rootOf(opts);
  return listDir(path.join(root, 'js', 'pages'), /\.js$/).map(function (f) { return 'js/pages/' + f; })
    .concat(listDir(path.join(root, 'css', 'pages'), /\.css$/).map(function (f) { return 'css/pages/' + f; }));
}

/* ---------- shell 조각 ---------- */
function escAttr(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}
/* base 는 그 페이지에서 사이트 루트까지의 상대 경로. app-shell.html 은 '{{BASE}}' 글자 그대로(서비스 워커가 채움) */
function uiScriptsHtml(base, opts) {
  return '\n' + uiModules(opts).map(function (src) { return '<script src="' + base + src + '"></script>'; }).join('\n') + '\n';
}
function topLinksHtml(pages, base) {
  const list = pages || [];
  const has = {}; list.forEach(function (p) { has[p.id] = true; });
  const links = ['<a href="' + base + 'glossary/" class="tool-link" data-r="glossary">용어 사전</a>'];
  list.forEach(function (p) {
    if ((p.nav || []).indexOf('top') < 0) return;
    links.push('<a href="' + base + p.id + '/" class="tool-link" data-r="' + p.id + '"' + (p.robots === 'noindex' ? ' rel="nofollow"' : '') + '>' + escAttr(p.label || p.title) + '</a>');
  });
  if (!has.browse) links.push('<a href="' + base + 'random/" class="tool-link" data-r="random" rel="nofollow">아무 문서</a>');
  if (!has.me) links.push('<a href="' + base + 'fav/" class="tool-link" data-r="fav" rel="nofollow">저장한 문서</a>');
  return '\n      ' + links.join('\n      ') + '\n      ';
}
/* 바닥글 링크 줄: "이 백과에 대해" 옆에, 고침 기록 화면(changes)이 등록돼 있을 때만 "고침 기록" */
function footLinksHtml(pages, base) {
  const ch = (pages || []).filter(function (p) { return p && p.id === 'changes'; })[0];
  const links = ['<a href="' + base + 'about/">이 백과에 대해</a>'];
  if (ch) links.push('<a href="' + base + 'changes/">' + escAttr(ch.label || ch.title || '고침 기록') + '</a>');
  return links.join(' · ');
}
/* 이미 만들어진 HTML 의 <!--ui:start-->…<!--ui:end-->, <!--top:start-->…<!--top:end-->, <!--foot:start-->…<!--foot:end--> 사이를
   지금 파일 기준으로 바꾼다(개발 서버용. 표식이 없는 옛 HTML 은 그 부분만 그대로) */
function applyShellMarkers(html, base, pages, opts) {
  return String(html)
    .replace(/<!--ui:start-->[\s\S]*?<!--ui:end-->/, function () { return '<!--ui:start-->' + uiScriptsHtml(base, opts) + '<!--ui:end-->'; })
    .replace(/<!--top:start-->[\s\S]*?<!--top:end-->/, function () { return '<!--top:start-->' + topLinksHtml(pages, base) + '<!--top:end-->'; })
    .replace(/<!--foot:start-->[\s\S]*?<!--foot:end-->/, function () { return '<!--foot:start-->' + footLinksHtml(pages, base) + '<!--foot:end-->'; });
}

module.exports = {
  ROOT: ROOT, ID_RE: ID_RE, RESERVED: RESERVED, GROUPS: GROUPS, NAV_PLACES: NAV_PLACES, NOTICE_KINDS: NOTICE_KINDS, SUMMARY_MAX: SUMMARY_MAX, CRISIS_LINE_OFF_OK: CRISIS_LINE_OFF_OK,
  LASTMOD_RE: LASTMOD_RE,
  uiOrder: uiOrder, uiModules: uiModules, uiCss: uiCss, uiCssFiles: uiCssFiles,
  validateDecl: validateDecl, normalizeDecl: normalizeDecl, sortPages: sortPages, pageDecls: pageDecls, pagesJs: pagesJs,
  kbLastmod: kbLastmod, resolveLastmod: resolveLastmod,
  kbFiles: kbFiles, kbCheck: kbCheck, pageAssetFiles: pageAssetFiles,
  stripBom: stripBom, uiScriptsHtml: uiScriptsHtml, topLinksHtml: topLinksHtml, footLinksHtml: footLinksHtml, applyShellMarkers: applyShellMarkers
};
