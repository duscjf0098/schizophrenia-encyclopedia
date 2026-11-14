/* 빌드 도구와 개발 서버(serve.cjs)가 함께 쓰는 자산 목록·특집 화면 선언 함수.
   같은 함수를 써야 빌드한 결과와 개발 서버가 즉석에서 만든 결과가 똑같아요.
   - uiModules()      화면 확장 모듈 js/ui/*.js (tools/ui-order.json 순서 + 나머지 이름순)
   - uiCss()          css/ui.css 내용(css/ui/*.css 이름순으로 이어 붙임)
   - pageDecls()      data/pages/<id>.json 특집 화면 선언 읽기·검사·정리
   - pagesJs(pages)   data/pages.js 내용
   - resolveLastmod(decl)  사이트맵·revised 고지 날짜(선언의 "lastmod": "kb:<자료>:<날짜 경로>" → 그 자료의 가장 최근 날짜, 없으면 updated)
   - resolveNoticeDate(decl, kind)  고지 날짜(dated = 선언의 updated, revised = resolveLastmod 와 같은 날)
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
/* 고지 종류(문구는 js/md.js 의 NOTICE). dated = 사람이 원천과 대조해 확인한 날(선언의 updated), revised = 자료에서 구한 마지막으로 고친 날(K8) */
const NOTICE_KINDS = ['general', 'crisis', 'emergency', 'device', 'dated', 'revised'];
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

/* ---------- 코어 스크립트(자료 + 앱) ----------
   모든 화면이 앱보다 먼저 싣는 자료와 코어 코드, 실행 순서 그대로. 위기 감지(js/crisis.js)와 위기 카드(data/crisis-card.js)는 여기 있어서
   앱·모듈보다 먼저(사용자가 첫 글자를 치기 전에) 준비돼요.
   모든 화면에 싣지 않는 자료(T11): data/about.js(소개 화면, 앱이 필요할 때 받음), data/links.js(문서 화면만 앱 뒤에 싣고, 앱이 새로 그리는 문서는 받아서) */
const CORE_DATA = ['data/sections.js', 'data/toc.js', 'data/glossary.js', 'data/synonyms.js', 'data/crisis-card.js', 'data/courses.js', 'data/pages.js'];
const CORE_JS = ['js/util.js', 'js/paths.js', 'js/md.js', 'js/search.js', 'js/gloss.js', 'js/synonyms.js', 'js/crisis.js', 'js/progress.js', 'js/app.js'];
const LAZY_DATA = ['data/about.js', 'data/links.js'];
/* 묶음 파일(tools/build-ui-js.cjs 가 만드는 생성 파일, 손으로 고치지 않음) */
const BUNDLES = { core: 'js/core.js', ui: 'js/ui.js' };
function coreFiles() { return CORE_DATA.concat(CORE_JS); }
/* 경로(data-route)에 따라 앱 뒤에 더 싣는 자료: 문서 화면(a/<slug>)은 링크 지도(역링크·다음 걸음) */
function pageDataFiles(route) { return /^a\/[^/]+$/.test(String(route || '')) ? ['data/links.js'] : []; }
function tags(base, list) { return list.map(function (src) { return '<script src="' + base + src + '"></script>'; }).join('\n'); }
/* opts.bundle: 묶음 하나(js/core.js), 아니면 낱개(개발 서버). 어느 쪽이든 그 경로의 자료(pageDataFiles)를 뒤에 */
function coreScriptsHtml(base, route, opts) {
  const list = (opts && opts.bundle ? [BUNDLES.core] : coreFiles()).concat(pageDataFiles(route));
  return '\n' + tags(base, list) + '\n';
}

/* ---------- 묶음 만들기(tools/build-ui-js.cjs) ----------
   파일마다 따로 감싸서 이어 붙여요: 한 파일의 최상위 예외가 뒤 파일을 멈추지 않게(낱개 <script> 일 때와 같게).
   예외는 setTimeout 으로 다시 던져 콘솔·window.onerror 에는 그대로 보여요. 감싸도 전역 이름은 그대로예요(파일들이 최상위 선언 없이
   JHB.* 에만 내보냄 — 최상위 선언이 있으면 오류로 멈춤). 문법 오류는 파일마다 검사해 어느 파일인지 알리고 멈춰요. */
function wrapFile(rel, code) {
  return '/* ===== ' + rel + ' ===== */\n(function () { try {\n' + code + '\n} catch (e) { setTimeout(function () { throw e; }); } }).call(this);\n';
}
/* 파일 맨 앞 줄(들여쓰기 없는 줄)에 var·let·const·function·class 선언이 있는지(감싸면 전역에서 사라지므로 묶음에 넣지 않음) */
function topLevelDecl(code) {
  const m = /^(?:var|let|const|function|async\s+function|class)\s+([A-Za-z_$][\w$]*)/m.exec(code);
  return m ? m[1] : null;
}
/* files: 사이트 루트 기준 경로 목록. 돌려주는 값: { text, errors: [..], sizes: { 파일: 바이트 } } */
function bundle(files, opts) {
  const root = rootOf(opts);
  const vm = require('vm');
  const errors = [], parts = [], sizes = {};
  files.forEach(function (rel) {
    let code;
    try { code = stripBom(fs.readFileSync(path.join(root, rel), 'utf8')); }
    catch (e) { errors.push(rel + ': 파일을 읽지 못했어요(' + e.code + ')'); return; }
    try { new vm.Script(code, { filename: rel }); }
    catch (e) { errors.push(rel + ': 문법 오류 — ' + e.message); return; }
    const top = topLevelDecl(code);
    if (top) { errors.push(rel + ': 최상위 선언 "' + top + '" 이 있어요(묶음에서 감싸면 전역에서 사라져요. JHB.* 에 내보내거나 즉시 실행 함수 안으로)'); return; }
    sizes[rel] = Buffer.byteLength(code);
    parts.push(wrapFile(rel, code));
  });
  const head = '/* 자동 생성: node tools/build-ui-js.cjs — 직접 고치지 마세요. 원본(이 순서): ' + files.join(', ') + ' */\n';
  const text = head + parts.join('');
  if (!errors.length) { try { new vm.Script(text, { filename: 'bundle' }); } catch (e) { errors.push('묶음 전체 문법 오류 — ' + e.message); } }
  return { text: text, errors: errors, sizes: sizes };
}

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
    else {
      if (d.notice.indexOf('dated') >= 0 && !d.updated) bad('notice 에 "dated" 를 쓰려면 updated 가 있어야 해요(사람이 화면 내용을 원천과 대조해 확인한 날. lastmod 로 대신하지 않아요)');
      if (d.notice.indexOf('revised') >= 0) {
        if (!d.updated && !d.lastmod) bad('notice 에 "revised" 를 쓰려면 updated 나 lastmod 가 있어야 해요(마지막으로 고친 날)');
        else if (!d.updated) warnings.push(where + ': notice 의 "revised" 는 lastmod 자료를 받지 못하면 updated 를 써요. updated 가 없으면 그때 고지 날짜가 빠지니 updated 도 적어 두세요');
      }
    }
  }
  /* 꼴만이 아니라 실제 있는 날짜여야 해요(2026-02-30 이 고지·사이트맵에 그대로 나가지 않게. lastmod 자료 쪽과 같은 PR.isDay) */
  if (d.updated != null && !PR.isDay(d.updated)) bad('updated 는 실제 있는 날짜(YYYY-MM-DD)여야 해요');
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
/* lastmod 가 가리키는 자료의 값(읽지 못하면 undefined: 날짜는 updated 로) */
function lastmodValue(decl, opts) {
  const ref = PR.lastmodRef(decl && decl.lastmod);
  if (!ref) return undefined;
  const r = readKb(ref.name, ref.path, opts);
  return r.error ? undefined : r.value;
}
/* 정리된 선언(normalizeDecl)의 사이트맵 날짜이자 "○○에 마지막으로 고쳤어요"(revised) 고지 날짜:
   lastmod 가 가리키는 자료의 가장 최근 날짜 → 없으면(자료 없음·깨짐·경로 없음·틀린 날짜) updated → 없으면 ''(사이트맵은 빌드한 날로).
   앱(js/app.js)도 같은 js/progress.js 의 pageDate 로 revised 고지를 그려요 */
function resolveLastmod(decl, opts) {
  return PR.pageDate(decl, lastmodValue(decl, opts)) || '';
}
/* 고지 kind 의 날짜(K8, 정적 고지 tools/build-pages.cjs 의 featureNoticesHtml). 규칙은 앱과 같은 js/progress.js 의 noticeDate:
   dated = 선언의 updated(사람이 원천과 대조해 확인한 날), revised = resolveLastmod 와 같은 날, 그 밖의 종류는 '' */
function resolveNoticeDate(decl, kind, opts) {
  const value = kind === 'revised' ? lastmodValue(decl, opts) : undefined; /* dated 는 자료를 읽지 않아요 */
  return PR.noticeDate(kind, decl, value) || '';
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
/* opts.bundle: 묶음 하나(js/ui.js, 정적 페이지), 아니면 낱개(개발 서버: 빌드 없이 새 모듈이 보이게) */
function uiScriptsHtml(base, opts) {
  return '\n' + tags(base, opts && opts.bundle ? [BUNDLES.ui] : uiModules(opts)) + '\n';
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
/* 이미 만들어진 HTML 의 <!--core:start-->…<!--core:end-->, <!--ui:start-->…<!--ui:end-->, <!--top:start-->…<!--top:end-->,
   <!--foot:start-->…<!--foot:end--> 사이를 지금 파일 기준으로 바꾼다(개발 서버용: 묶음 대신 낱개 스크립트. 표식이 없는 옛 HTML 은 그 부분만 그대로).
   opts.route: 그 페이지의 data-route(문서 화면이면 data/links.js 를 앱 뒤에) */
function applyShellMarkers(html, base, pages, opts) {
  const route = opts && opts.route != null ? opts.route : ((/<html[^>]*\sdata-route="([^"]*)"/.exec(String(html)) || [])[1] || '');
  return String(html)
    .replace(/<!--core:start-->[\s\S]*?<!--core:end-->/, function () { return '<!--core:start-->' + coreScriptsHtml(base, route, opts) + '<!--core:end-->'; })
    .replace(/<!--ui:start-->[\s\S]*?<!--ui:end-->/, function () { return '<!--ui:start-->' + uiScriptsHtml(base, opts) + '<!--ui:end-->'; })
    .replace(/<!--top:start-->[\s\S]*?<!--top:end-->/, function () { return '<!--top:start-->' + topLinksHtml(pages, base) + '<!--top:end-->'; })
    .replace(/<!--foot:start-->[\s\S]*?<!--foot:end-->/, function () { return '<!--foot:start-->' + footLinksHtml(pages, base) + '<!--foot:end-->'; });
}

module.exports = {
  ROOT: ROOT, ID_RE: ID_RE, RESERVED: RESERVED, GROUPS: GROUPS, NAV_PLACES: NAV_PLACES, NOTICE_KINDS: NOTICE_KINDS, SUMMARY_MAX: SUMMARY_MAX, CRISIS_LINE_OFF_OK: CRISIS_LINE_OFF_OK,
  LASTMOD_RE: LASTMOD_RE,
  uiOrder: uiOrder, uiModules: uiModules, uiCss: uiCss, uiCssFiles: uiCssFiles,
  validateDecl: validateDecl, normalizeDecl: normalizeDecl, sortPages: sortPages, pageDecls: pageDecls, pagesJs: pagesJs,
  kbLastmod: kbLastmod, resolveLastmod: resolveLastmod, resolveNoticeDate: resolveNoticeDate,
  kbFiles: kbFiles, kbCheck: kbCheck, pageAssetFiles: pageAssetFiles,
  stripBom: stripBom, uiScriptsHtml: uiScriptsHtml, topLinksHtml: topLinksHtml, footLinksHtml: footLinksHtml, applyShellMarkers: applyShellMarkers,
  CORE_DATA: CORE_DATA, CORE_JS: CORE_JS, LAZY_DATA: LAZY_DATA, BUNDLES: BUNDLES, coreFiles: coreFiles, pageDataFiles: pageDataFiles, coreScriptsHtml: coreScriptsHtml,
  bundle: bundle, wrapFile: wrapFile, topLevelDecl: topLevelDecl
};
