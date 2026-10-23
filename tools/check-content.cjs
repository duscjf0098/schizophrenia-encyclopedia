/* 글 검수: 필수 항목, 출처, 각주 번호, 금지 표현(용량 지시·임의 중단 권유), 위기 글의 상담 전화.
   실행: node tools/check-content.cjs [파일...]  (인자 없으면 content/ 전체) */
const fs = require('fs');
const path = require('path');
const md = require('../js/md.js');

const root = path.join(__dirname, '..');
const EVIDENCE = ['가이드라인', '연구', '초기연구', '경험'];
const FORBIDDEN = [
  { re: /\d+(\.\d+)?\s*(mg|밀리그램|정|알)\s*(씩|을|를)?\s*(드세요|복용하세요|먹으세요|드시면 돼요|먹으면 돼요)/, why: '개인별 용량 지시' },
  { re: /약을?\s*(끊어도|중단해도|안 먹어도|빼도)\s*(돼요|됩니다|괜찮아요|좋아요)/, why: '임의 중단 권유' },
  { re: /정신분열(?:병|증)?(?![병증])(?!\s*→|\s*\(옛)/, why: '옛 병명 — 역사 설명이 아니면 "조현병"으로' },
  { re: /조현병\s*환자들?(?!라는|이라는|란)/, why: '"조현병 환자" 대신 "조현병이 있는 사람"처럼 사람 먼저' },
  { re: /완치(됩니다|돼요|된다)/, why: '단정적 완치 표현' }
];
const CRISIS_PHONES = ['109', '1577-0199'];

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

const files = process.argv.length > 2 ? process.argv.slice(2).map(function (f) { return path.resolve(f); }) : listFiles();
let problems = 0;
files.forEach(function (file) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const doc = md.parse(fs.readFileSync(file, 'utf8'));
  const m = doc.meta, body = doc.body;
  const errs = [];
  ['title', 'summary', 'updated', 'evidence'].forEach(function (k) { if (!m[k]) errs.push('frontmatter에 ' + k + ' 없음'); });
  if (m.updated && !/^\d{4}-\d{2}-\d{2}$/.test(m.updated)) errs.push('updated 는 YYYY-MM-DD 형식');
  if (m.evidence && EVIDENCE.indexOf(m.evidence) < 0) errs.push('evidence 는 ' + EVIDENCE.join('/') + ' 중 하나');
  if (!Array.isArray(m.tags) || !m.tags.length) errs.push('tags 없음');
  const srcs = Array.isArray(m.sources) ? m.sources : [];
  if (!srcs.length) errs.push('출처(sources) 없음');
  srcs.forEach(function (s, i) { if (!/^https?:\/\//.test(s.url)) errs.push('출처 ' + (i + 1) + ' 에 URL 없음'); if (!s.title) errs.push('출처 ' + (i + 1) + ' 에 제목 없음'); });
  const fns = body.match(/\[\^(\d+)\]/g) || [];
  fns.forEach(function (f) { const n = Number(f.slice(2, -1)); if (n < 1 || n > srcs.length) errs.push('각주 ' + f + ' 가 출처 범위(1~' + srcs.length + ')를 벗어남'); });
  if (srcs.length && !fns.length) errs.push('본문에 각주([^1] 등)가 하나도 없음');
  if (/^#\s/m.test(body)) errs.push('본문에 # 제목(h1) 사용 — 제목은 frontmatter title, 본문은 ## 부터');
  FORBIDDEN.forEach(function (f) { const hit = f.re.exec(body); if (hit) errs.push(f.why + ': "' + hit[0] + '"'); });
  if ((m.tags || []).indexOf('위기') >= 0) CRISIS_PHONES.forEach(function (p) { if (body.indexOf(p) < 0) errs.push('위기 글인데 본문에 ' + p + ' 없음'); });
  if (md.plain(body).length < 600) errs.push('본문이 짧음 (' + md.plain(body).length + '자) — 백과 글은 600자 이상');
  if (errs.length) { problems += errs.length; console.log('✗ ' + rel); errs.forEach(function (e) { console.log('    - ' + e); }); }
  else console.log('✓ ' + rel);
});
/* 용어 사전 검사 (인자 없이 전체 검사할 때만) */
if (process.argv.length <= 2) {
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
  if (gErrs.length) { problems += gErrs.length; console.log('✗ data/glossary.js'); gErrs.forEach(function (e) { console.log('    - ' + e); }); }
  else console.log('✓ data/glossary.js (' + (win.JHB.glossary || []).length + '개 용어)');
}
console.log('\n' + files.length + '편 검사, 문제 ' + problems + '건');
process.exit(problems ? 1 : 0);
