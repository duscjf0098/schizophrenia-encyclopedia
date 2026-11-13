/* 글에서 화면으로 가는 링크 검사 (집필가이드 "다른 글·화면 링크")
   본문의 [글자](#/…) 링크 가운데 #/a/<slug>(글 링크)가 아닌 것은 실제로 있는 화면이어야 해요. 없는 화면이면 오류.
   #/a/<slug> 의 죽은 링크는 tools/build-links.cjs 가 잡아요(여기서는 보지 않아요). slug 가 빠진 #/a/ 는 여기서 오류.
   있는 화면은 코드에서 만들어요(손으로 적은 목록이 없어요):
   - 특집 화면: data/pages/*.json 의 id(파일 이름과 같은 것. 다르면 build-kb 가 멈춰요)
   - 코어 화면: js/app.js 의 route() 에 있는 p[0] === '<이름>' 규칙. 뒤에 && p[1] 이 붙은 규칙은 id 가 있어야 하는 화면이에요
       s/<id>  = data/sections.js 의 분류(용어 사전 분류는 s/ 화면이 없어요 → #/glossary)
       course/<id> = data/courses.js 의 읽기 코스 id
     그 밖의 코어 화면(용어 사전·소개·읽기 코스 목록·저장한 문서·아무 문서 등)은 뒤에 칸이 붙지 않아요.
   - 첫 화면 #/
   주소 뒤의 조각(#/about#privacy)과 쿼리(?course=…)는 js/paths.js 의 hashToPath 규칙대로 떼고 경로만 봐요.
   다만 검색 화면(#/search)에 쿼리를 붙이면 오류(검색어가 방문 기록에 남지 않게), 빗금이 겹친 빈 칸(#//plan)도 오류.
   실제 사이트는 경로 주소(plan/, s/7/)라서 칸이 더 붙은 주소(#/plan/x)는 없는 페이지예요. */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('../../js/paths.js');

const ROOT = path.join(__dirname, '..', '..');
/* js/md.js 의 링크 문법과 같은 꼴: [글자](주소) — 주소에 빈칸·닫는 괄호 없음 */
const LINK_RE = /\[[^\]]+\]\((#\/[^)\s]*)\)/g;

/* js/app.js 원문 → { 이름: id 가 있어야 하면 true } (route() 안의 p[0] === '이름' 규칙) */
function routeKinds(appSrc) {
  const src = String(appSrc == null ? '' : appSrc);
  const at = src.indexOf('function route()');
  if (at < 0) return {};
  const end = src.indexOf('\n  }', at);
  const body = src.slice(at, end < 0 ? src.length : end);
  const out = {};
  const re = /p\[0\]\s*===\s*'([a-z][a-z0-9-]*)'(\s*&&\s*p\[1\])?/g;
  let m;
  while ((m = re.exec(body))) {
    const needId = !!m[2];
    out[m[1]] = Object.prototype.hasOwnProperty.call(out, m[1]) ? out[m[1]] && needId : needId;
  }
  return out;
}

/* data/*.js(window.JHB 에 값을 거는 파일) 읽기. 없거나 깨졌으면 {} */
function loadJs(root, rel) {
  const win = { JHB: {} };
  try { new Function('window', 'JHB', fs.readFileSync(path.join(root, rel), 'utf8'))(win, win.JHB); }
  catch (e) { return {}; }
  return win.JHB;
}

/* 있는 화면 목록 → { pages: Set(특집 화면 id), routes: {코어 이름: id 필요}, sections: Set(s/ 화면이 있는 분류), glossarySections: Set, courses: Set } */
function loadKnown(root) {
  root = root || ROOT;
  const pages = new Set();
  const dir = path.join(root, 'data', 'pages');
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).filter(function (f) { return /\.json$/.test(f); }).sort().forEach(function (f) {
      const id = f.replace(/\.json$/, '');
      try {
        let t = fs.readFileSync(path.join(dir, f), 'utf8');
        if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
        const d = JSON.parse(t);
        if (d && d.id === id) pages.add(id);
      } catch (e) { }
    });
  }
  let routes = {};
  try { routes = routeKinds(fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8')); } catch (e) { }
  const sections = new Set(), glossarySections = new Set();
  (loadJs(root, 'data/sections.js').sections || []).forEach(function (s) {
    if (!s || s.id == null) return;
    (s.glossary ? glossarySections : sections).add(String(s.id));
  });
  const courses = new Set();
  (loadJs(root, 'data/courses.js').courses || []).forEach(function (c) { if (c && c.id) courses.add(String(c.id)); });
  return { pages: pages, routes: routes, sections: sections, glossarySections: glossarySections, courses: courses };
}

/* 본문 → 화면 링크 주소들(#/a/<slug> 는 빼요). [{ hash, line }] */
function screenLinks(body) {
  const out = [];
  const lines = String(body == null ? '' : body).split('\n');
  lines.forEach(function (l, i) {
    let m;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(l))) {
      /* 글 링크(#/a/<slug>)는 build-links 몫. 빗금이 겹친 #//a/x 같은 꼴은 여기서 봐요 */
      if (m[1].indexOf('#/a/') === 0 && m[1].charAt(4) && '/?#'.indexOf(m[1].charAt(4)) < 0) continue;
      out.push({ hash: m[1], line: i + 1 });
    }
  });
  return out;
}
/* '#/about#privacy' → ['about'], '#/course/x?y=1#h-3' → ['course', 'x'], '#/' → [] */
function segments(hash) {
  const p = P.hashToPath(hash);
  if (p == null) return null;
  const cut = p.search(/[?#]/);
  return (cut >= 0 ? p.slice(0, cut) : p).split('/').filter(Boolean);
}

function screenList(known) {
  const one = [];
  Object.keys(known.routes || {}).sort().forEach(function (k) { if (!known.routes[k] && one.indexOf(k) < 0) one.push(k); });
  Array.from(known.pages || []).sort().forEach(function (k) { if (one.indexOf(k) < 0) one.push(k); });
  return '#/(첫 화면), ' + one.map(function (k) { return '#/' + k; }).join(', ') + ', #/s/<분류 번호>, #/course/<코스 id>';
}

/* 화면 주소 하나 → 문제 이유('' 이면 괜찮음). #/a/<slug> 는 '' (build-links 몫) */
function targetProblem(hash, known) {
  const segs = segments(hash);
  if (segs == null) return '#/ 로 시작하는 주소가 아니에요';
  /* 빗금이 겹친 빈 칸(#//plan, #/plan//x): hashToPath 는 걷어 내지만 글의 주소는 바르게 써요. 끝의 빗금 하나(#/plan/)는 괜찮아요 */
  const raw = String(hash).slice(2).split(/[?#]/)[0];
  if (raw && raw.split('/').slice(0, -1).some(function (p) { return p === ''; })) return '주소에 빈 칸(빗금 두 개 "//")이 있어요 — #/' + segs.join('/') + ' 처럼 써요';
  if (!segs.length) return '';
  const k = segs[0];
  /* 검색 화면에는 검색어를 주소에 붙이지 않아요(누른 순간 민감한 낱말이 그 기기의 방문 기록에 남을 수 있어요) */
  if (k === 'search' && /\?/.test(String(hash).split('#').slice(0, 2).join('#'))) return '검색 화면 주소에 검색어(쿼리 ?…)를 붙이지 않아요 — #/search 까지만 써요(검색어가 방문 기록에 남지 않게)';
  const routes = known.routes || {};
  const hasRoute = Object.prototype.hasOwnProperty.call(routes, k);
  if (k === 'a') return segs.length > 1 ? '' : '글 주소에 slug 가 없어요(#/a/<slug>)';
  if (hasRoute && routes[k]) {
    if (segs.length < 2) return '#/' + k + '/<id> 꼴이어야 해요';
    if (segs.length > 2) return '#/' + k + '/' + segs[1] + ' 뒤에 칸이 더 붙었어요';
    const id = segs[1];
    if (k === 's') {
      if (known.sections && known.sections.has(id)) return '';
      if (known.glossarySections && known.glossarySections.has(id)) return '용어 사전은 분류 화면이 없어요 — #/glossary 로 써요';
      return '분류 "' + id + '" 가 없어요(data/sections.js 의 id: ' + Array.from(known.sections || []).join(', ') + ')';
    }
    if (k === 'course') {
      return known.courses && known.courses.has(id) ? '' : '읽기 코스 "' + id + '" 가 없어요(data/courses.js 의 id)';
    }
    return '';
  }
  const exists = (hasRoute && !routes[k]) || (known.pages && known.pages.has(k));
  if (!exists) return '"' + k + '" 화면이 없어요(있는 화면: ' + screenList(known) + ')';
  if (segs.length > 1) return '#/' + k + ' 뒤에 칸이 더 붙었어요(화면 주소는 #/' + k + ' 까지. 화면 안 자리는 #/' + k + '#자리)';
  return '';
}

let KNOWN = null;
module.exports = {
  id: 'routes',
  LINK_RE: LINK_RE,
  routeKinds: routeKinds, loadKnown: loadKnown, screenLinks: screenLinks, segments: segments, targetProblem: targetProblem,
  check: function (ctx, report) {
    const links = screenLinks(ctx.body);
    if (!links.length) return;
    if (!KNOWN) KNOWN = loadKnown(ROOT);
    /* 본문 줄 번호 → 파일 줄 번호(frontmatter 줄 수만큼 더함. 본문은 파일의 끝부분이에요) */
    const all = String(ctx.text == null ? ctx.body : ctx.text).replace(/\r\n?/g, '\n').split('\n').length;
    const off = Math.max(0, all - String(ctx.body).split('\n').length);
    links.forEach(function (x) {
      const why = targetProblem(x.hash, KNOWN);
      if (why) report.error('없는 화면으로 가는 링크 "' + x.hash + '"(' + (x.line + off) + '번째 줄) — ' + why);
    });
  }
};
