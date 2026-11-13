/* 글 검수: 필수 항목, 출처, 각주 번호, 금지 표현(용량 지시·임의 중단 권유), 위기 글의 상담 전화,
   그리고 tools/checks/*.cjs 의 추가 검사(응급 태그, 핵심 3가지, 출처 확인일, 약 카드, 화면 링크, 민감 표현 등).
   생성기와 이어진 글의 약속도 생성기와 같은 판정으로 봐요(이 검사를 통과하면 그 생성기도 글 때문에 멈추지 않아요):
   - 약 카드: 규칙과 판정 함수가 tools/checks/drug-card.cjs 한 곳에 있고 생성기 tools/gen/meds.cjs 가 그것을 가져다 써요.
     content/07-medication/ 의 파일 이름, 약 카드가 있는 글이 하나도 없는 경우(인자 없는 전체 검사에서만)도 봐요.
   - 바로 연락할 신호 표(side-effects-overview 글): 생성기 tools/gen/red-flags.cjs 의 extract·leadErrors 를 그대로 불러 오류로 내요.
   실행: node tools/check-content.cjs [파일...]  (인자 없으면 content/ 전체 + 용어 사전)
         content/ 밖의 초안(.claude/work/drafts/…)도 경로를 주면 검사해요. 분류 번호는 frontmatter section 으로 알아요.
   출력: ✓ 경로 / ✗ 경로(오류) / ! 경로(경고), 마지막에 "경고 K건" 과 "N편 검사, 문제 M건". 오류가 있으면 종료 코드 1, 경고는 종료 코드와 무관.
   모듈: const { checkDoc } = require('./check-content.cjs');  checkDoc(text, info) → { errors: [], warnings: [] }
         info = { path: '보이는 경로(선택)', today: 'YYYY-MM-DD' 또는 Date(선택, 기본 오늘) }
   검사 추가: tools/checks/<이름>.cjs 에 { id, check(ctx, report) } 를 내보내면 자동으로 불러요(이름이 _ 로 시작하면 건너뜀). */
const fs = require('fs');
const path = require('path');
const md = require('../js/md.js');

const root = path.join(__dirname, '..');
const EVIDENCE = ['가이드라인', '연구', '초기연구', '경험'];
const FORBIDDEN = [
  { re: /\d+(\.\d+)?\s*(mg|밀리그램|정|알)\s*(씩|을|를)?\s*(드세요|복용하세요|먹으세요|드시면 돼요|먹으면 돼요)/, why: '개인별 용량 지시' },
  /* 앞에 "약"이 없어도("좋아지면 끊어도 돼요") 잡아요. 줄여도·빼도는 일정 이야기에도 쓰여서 앞에 "약"이 있을 때만.
     묻는 꼴("끊어도 되는지", "끊어도 돼요?")과 통념 인용("…끊어도 된다"는 생각, 끊어도 된다고 여기기)은 빼요 */
  { re: /(?:(?:끊어|그만\s*먹어|중단해|안\s*먹어)|약을?\s*(?:줄여|빼))도\s*(?:돼요|됩니다|괜찮아요|좋아요|된다)(?![가-힣]*\?)(?!['"‘’“”]?\s*(?:는|고|며|라|면))/, why: '임의 중단 권유' },
  { re: /정신분열(?:병|증)?(?![병증])(?!\s*→|\s*\(옛)/, why: '옛 병명 — 역사 설명이 아니면 "조현병"으로' },
  { re: /조현병\s*환자들?(?!라는|이라는|란)/, why: '"조현병 환자" 대신 "조현병이 있는 사람"처럼 사람 먼저' },
  { re: /완치(됩니다|돼요|된다)/, why: '단정적 완치 표현' }
];
/* 자살을 에둘러 미화하는 말(보도준칙 4.0). 본문·제목·요약·핵심 3가지 어디에도 쓰지 않아요. */
const EXTREME_CHOICE = /극단(?:적(?:인)?|의)?\s*선택/;
const CRISIS_PHONES = ['109', '1577-0199'];

function findForbidden(str) {
  const out = [];
  FORBIDDEN.forEach(function (f) { const hit = f.re.exec(str || ''); if (hit) out.push({ why: f.why, hit: hit[0] }); });
  return out;
}

function toDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + 'T00:00:00');
  return new Date();
}
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* tools/checks/*.cjs 자동 로드 (이름순) */
let CHECKS = null;
function loadChecks() {
  if (CHECKS) return CHECKS;
  const dir = path.join(__dirname, 'checks');
  CHECKS = [];
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).filter(function (f) { return /\.cjs$/.test(f) && f[0] !== '_'; }).sort().forEach(function (f) {
      const mod = require(path.join(dir, f));
      if (mod && typeof mod.check === 'function') CHECKS.push({ id: mod.id || f.replace(/\.cjs$/, ''), check: mod.check });
    });
  }
  return CHECKS;
}

/* 기존 검사(필수 항목·출처·각주·h1·금지 표현·위기 전화·분량) */
function baseCheck(ctx, report) {
  const m = ctx.meta, body = ctx.body;
  ['title', 'section', 'summary', 'updated', 'evidence'].forEach(function (k) { if (!m[k]) report.error('frontmatter에 ' + k + ' 없음'); });
  if (m.section && ctx.section == null) report.error('section 은 분류 번호(숫자) — 지금 "' + m.section + '"');
  if (m.updated && !/^\d{4}-\d{2}-\d{2}$/.test(m.updated)) report.error('updated 는 YYYY-MM-DD 형식');
  if (m.evidence && EVIDENCE.indexOf(m.evidence) < 0) report.error('evidence 는 ' + EVIDENCE.join('/') + ' 중 하나');
  if (!ctx.tags.length) report.error('tags 없음');
  const srcs = ctx.sources;
  if (!srcs.length) report.error('출처(sources) 없음');
  srcs.forEach(function (s, i) { if (!/^https?:\/\//.test(s.url)) report.error('출처 ' + (i + 1) + ' 에 URL 없음'); if (!s.title) report.error('출처 ' + (i + 1) + ' 에 제목 없음'); });
  const fns = body.match(/\[\^(\d+)\]/g) || [];
  fns.forEach(function (f) { const n = Number(f.slice(2, -1)); if (n < 1 || n > srcs.length) report.error('각주 ' + f + ' 가 출처 범위(1~' + srcs.length + ')를 벗어남'); });
  if (srcs.length && !fns.length) report.error('본문에 각주([^1] 등)가 하나도 없음');
  if (/^#\s/m.test(body)) report.error('본문에 # 제목(h1) 사용 — 제목은 frontmatter title, 본문은 ## 부터');
  findForbidden(body).forEach(function (h) { report.error(h.why + ': "' + h.hit + '"'); });
  if (ctx.tags.indexOf('위기') >= 0) CRISIS_PHONES.forEach(function (p) { if (body.indexOf(p) < 0) report.error('위기 글인데 본문에 ' + p + ' 없음'); });
  if (ctx.plain.length < 600) report.error('본문이 짧음 (' + ctx.plain.length + '자) — 백과 글은 600자 이상');
}

/* 바로 연락할 신호 표(부작용 총론의 '## 바로 연락할 신호'): red-flags/ 화면과 이어진 약속이라 생성기 tools/gen/red-flags.cjs 의
   판정(extract: 소절·열 이름·할 일의 첫 마디·자세한 글 링크·각주·표 바로 뒤 안전 문장, leadErrors: 선언의 lead 와 표 앞 문장)을
   그대로 가져다 오류로 내요. 원천 글(파일 이름이 side-effects-overview)에만 걸어요. */
let RF = null, RF_SLUGS = null;
function redFlagsCheck(ctx, report) {
  const name = String(ctx.path || '').split(/[\\/]/).pop().replace(/\.md$/i, '');
  if (!RF) RF = require('./gen/red-flags.cjs');
  if (!name || name !== RF.SOURCE_SLUG) return;
  if (!RF_SLUGS) RF_SLUGS = RF.contentSlugs(root);
  const r = RF.extract(ctx.text, { slug: RF.SOURCE_SLUG, slugs: RF_SLUGS });
  let errs = r.errors.slice();
  if (r.data) {
    let decl = null;
    try { decl = JSON.parse(fs.readFileSync(path.join(root, 'data', 'pages', 'red-flags.json'), 'utf8').replace(/^﻿/, '')); }
    catch (e) { errs.push('선언을 읽지 못했어요: data/pages/red-flags.json (' + (e && e.message ? e.message : e) + ')'); }
    if (decl) errs = errs.concat(RF.leadErrors(r.data, decl));
  }
  errs.forEach(function (e) { report.error('"## ' + RF.HEADING + '" 표(red-flags/ 화면의 원천): ' + e); });
}

/* 전체 검사에서만: 생성기 tools/gen/meds.cjs 는 content/07-medication/ 에 약 카드가 있는 글이 하나도 없으면 멈춰요.
   files = [{ rel, text }] → 오류 문구 배열 */
function medsSetErrors(files) {
  const card = require('./checks/drug-card.cjs');
  const any = (files || []).some(function (f) { return card.inMedsDir(f.rel) && card.findCard(md.parse(String(f.text == null ? '' : f.text)).body).count > 0; });
  return any ? [] : ['약 카드("## 약 카드")가 있는 글이 하나도 없어요(' + card.MEDS_DIR + ') — 항정신병약 한눈에(meds/) 생성기가 멈춰요'];
}

function checkDoc(text, info) {
  info = info || {};
  const doc = md.parse(String(text == null ? '' : text));
  const meta = doc.meta, body = doc.body;
  const today = toDate(info.today);
  const secRaw = String(meta.section == null ? '' : meta.section).trim();
  const ctx = {
    text: String(text == null ? '' : text),
    meta: meta,
    body: body,
    plain: md.plain(body),
    section: /^\d{1,2}$/.test(secRaw) ? Number(secRaw) : null,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    sources: Array.isArray(meta.sources) ? meta.sources : [],
    path: info.path || '',
    today: today,
    todayStr: ymd(today),
    year: today.getFullYear(),
    md: md,
    FORBIDDEN: FORBIDDEN,
    EXTREME_CHOICE: EXTREME_CHOICE,
    findForbidden: findForbidden
  };
  const errors = [], warnings = [];
  const report = { error: function (s) { errors.push(s); }, warn: function (s) { warnings.push(s); } };
  baseCheck(ctx, report);
  loadChecks().forEach(function (c) {
    try { c.check(ctx, report); }
    catch (e) { errors.push('검사 모듈 ' + c.id + ' 가 멈춤: ' + (e && e.message ? e.message : e)); }
  });
  try { redFlagsCheck(ctx, report); }
  catch (e) { errors.push('바로 연락할 신호 검사가 멈춤: ' + (e && e.message ? e.message : e)); }
  return { errors: errors, warnings: warnings };
}

function listFiles() {
  const out = [];
  const dir = path.join(root, 'content');
  fs.readdirSync(dir).forEach(function (d) {
    const full = path.join(dir, d);
    if (!fs.statSync(full).isDirectory()) return;
    fs.readdirSync(full).forEach(function (f) { if (/\.md$/.test(f)) out.push(path.join(full, f)); });
  });
  return out;
}

/* 용어 사전 검사 (인자 없이 전체 검사할 때만) */
function checkGlossary() {
  const slugs = new Set(listFiles().map(function (f) { return path.basename(f, '.md'); }));
  const win = { JHB: {} };
  new Function('window', 'JHB', fs.readFileSync(path.join(root, 'data/glossary.js'), 'utf8'))(win, win.JHB);
  const seen = {}; const gErrs = [];
  (win.JHB.glossary || []).forEach(function (g, i) {
    const at = '용어 ' + (i + 1) + ' "' + (g.term || '') + '"';
    if (!g.term || !g.def) gErrs.push(at + ': term/def 없음');
    if (seen[g.term]) gErrs.push(at + ': 중복');
    seen[g.term] = 1;
    if (g.def && g.def.length > 160) gErrs.push(at + ': 정의가 160자 초과 (' + g.def.length + ')');
    (g.related || []).forEach(function (r) { if (!slugs.has(r)) gErrs.push(at + ': 없는 글 ' + r); });
    FORBIDDEN.forEach(function (f) { const hit = f.re.exec(g.def || ''); if (hit) gErrs.push(at + ': ' + f.why); });
  });
  return { errors: gErrs, count: (win.JHB.glossary || []).length };
}

function main(argv) {
  const files = argv.length ? argv.map(function (f) { return path.resolve(f); }) : listFiles();
  let problems = 0, warns = 0;
  const seen = [];
  files.forEach(function (file) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    let res;
    try { const text = fs.readFileSync(file, 'utf8'); seen.push({ rel: rel, text: text }); res = checkDoc(text, { path: rel }); }
    catch (e) { res = { errors: ['파일을 읽지 못함: ' + (e && e.message ? e.message : e)], warnings: [] }; }
    if (res.errors.length) { problems += res.errors.length; console.log('✗ ' + rel); res.errors.forEach(function (e) { console.log('    - ' + e); }); }
    else console.log('✓ ' + rel);
    if (res.warnings.length) { warns += res.warnings.length; console.log('! ' + rel); res.warnings.forEach(function (w) { console.log('    - ' + w); }); }
  });
  if (!argv.length) {
    const g = checkGlossary();
    if (g.errors.length) { problems += g.errors.length; console.log('✗ data/glossary.js'); g.errors.forEach(function (e) { console.log('    - ' + e); }); }
    else console.log('✓ data/glossary.js (' + g.count + '개 용어)');
    const ms = medsSetErrors(seen);
    if (ms.length) { problems += ms.length; console.log('✗ content/07-medication/'); ms.forEach(function (e) { console.log('    - ' + e); }); }
  }
  console.log('\n경고 ' + warns + '건 (차단하지 않아요)');
  console.log(files.length + '편 검사, 문제 ' + problems + '건');
  return problems ? 1 : 0;
}

module.exports = { checkDoc: checkDoc, FORBIDDEN: FORBIDDEN, EXTREME_CHOICE: EXTREME_CHOICE, findForbidden: findForbidden, medsSetErrors: medsSetErrors };

if (require.main === module) process.exit(main(process.argv.slice(2)));
