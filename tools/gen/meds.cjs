/* 생성기: 항정신병약 한눈에(meds/) 화면 자료
   content/07-medication/*.md 가운데 "## 약 카드" 소절이 있는 글(개별 약 글)의 2열 표를 읽어 data/kb/meds.json 을 써요.
   - 원천은 약 카드 표 하나뿐이에요(docs/집필가이드.md "약 카드"). 화면이 따로 가진 값은 없어요.
   - 항목: { slug, name(글 제목), en(본문의 "제목(영문)"), updated(글의 고친 날), anchor(약 카드 소절 id),
           rows: [{ key, name(행 이름), text(칸 글자, 각주 표시만 뺌), refs: [각주 번호] }](9행, 정해진 순서),
           sources: [{ n, org, title, year, url }](칸에 쓰인 각주만, 번호 순) }
   - 약 이름 가나다순(같으면 slug). 같은 글이면 같은 출력(날짜·시각을 쓰지 않아요). 들여쓰기 1칸 JSON + 줄바꿈.
   - 실행: node tools/gen/meds.cjs (인자 없음). 문제가 있으면 이유를 알리고 종료 코드 1(파일은 쓰지 않아요).
   - 막는 것: 행 빠짐·겹침·모르는 행, 부작용 칸이 정해진 낱말로 시작하지 않음, 자료 부족이 아닌 부작용 칸에 각주 없음,
     없는 출처를 가리키는 각주, 빈 칸, 너무 긴 칸(꼭 알아둘 것 140자, 나머지 60자, 띄어쓰기 없이 24자), 용량 단위·복용 횟수·값 비교·임부 등급·권하는 말 같은 표에 넣지 않는 낱말(FORBIDDEN).
   - require 로 불러오면 파일을 쓰지 않고 순수 함수만 내보내요(tests/meds.test.cjs). */
'use strict';
const fs = require('fs');
const path = require('path');
const md = require('../../js/md.js');

const ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT, 'content', '07-medication');
const OUT = path.join(ROOT, 'data', 'kb', 'meds.json');

/* 행 이름은 tools/checks/drug-card.cjs 의 ROWS 와 같아야 해요(테스트가 맞대요) */
const ROWS = ['계열', '제형', '체중·대사', '추체외로 증상·좌불안석', '프로락틴', '졸림', 'QT 연장', '기립성 저혈압', '꼭 알아둘 것'];
const KEYS = ['class', 'form', 'weight', 'eps', 'prolactin', 'sleep', 'qt', 'ortho', 'note'];
const FX_KEYS = KEYS.slice(2, 8);
const LEVEL_RE = /^(적은 편|중간|많은 편|자료 부족)/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const HEAD_RE = /^##\s+약 카드\s*$/;
/* 칸 어디에도 두지 않는 말(집필가이드 "약 카드"의 넣지 않는 것 + 한계선 L3·L10) */
const FORBIDDEN = [
  { re: /(?:^|[^A-Za-z])(mg|mcg|μg|µg)(?![A-Za-z])|㎎|㎍|밀리그램|마이크로그램/i, why: '용량 단위' },
  { re: /용량/, why: '용량 이야기' },
  { re: /하루\s*(?:\d+|한두|두세|한|두|세|네)\s*(?:번|회|차례)|1\s*일\s*\d+\s*회|(?:아침|저녁|자기 전)에?\s*(?:\d+|한)\s*(?:번|회)/, why: '복용 횟수' },
  { re: /추천|순위|\d\s*위(?![가-힣])|별점|가장\s*(?:좋은|효과적인|잘\s*듣는)|이런 사람에게/, why: '권하는 말·줄 세우기' },
  { re: /가격|약값|값이?\s*(?:싸|비싸)/, why: '값 비교' },
  { re: /임신/, why: '임부 안전 등급' },
  { re: /상호\s*작용/, why: '함께 먹는 약 판정' },
  { re: /상품명|®|™/, why: '상품명' }
];

function cells(line) {
  return String(line).trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
}
/* 칸 글자: 각주 표시([^n])만 빼고, 굵게·기울임·코드·링크 표시는 글자만 남겨요. 빈칸은 하나로 */
function cellText(raw) {
  return String(raw == null ? '' : raw)
    .replace(/\[\^\d+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
/* 각주 번호(처음 나온 순서, 겹치지 않게) */
function refsOf(raw) {
  const out = [];
  String(raw == null ? '' : raw).replace(/\[\^(\d+)\]/g, function (_, n) { n = Number(n); if (out.indexOf(n) < 0) out.push(n); return _; });
  return out;
}
/* 칸 길이(화면 표의 한 칸에 들어가는 만큼). 띄어쓰기 없이 이어진 글자가 길면 칸 밖으로 넘쳐요 */
const MAX_LEN = { note: 140, other: 60 };
const MAX_RUN = 24;
function tooLong(key, text) {
  const max = key === 'note' ? MAX_LEN.note : MAX_LEN.other;
  const t = String(text == null ? '' : text);
  if (t.length > max) return '너무 길어요(' + t.length + '자, ' + max + '자까지). 자세한 것은 본문에 써요';
  const run = t.split(/\s+/).reduce(function (a, w) { return w.length > a.length ? w : a; }, '');
  if (run.length > MAX_RUN) return '띄어쓰기 없이 ' + run.length + '자가 이어져요(' + MAX_RUN + '자까지): "' + run.slice(0, 30) + '"';
  return '';
}
function forbiddenIn(text) {
  const out = [];
  FORBIDDEN.forEach(function (f) { const hit = f.re.exec(text); if (hit) out.push(f.why + '("' + (hit[1] || hit[0]).trim() + '")'); });
  return out;
}

/* 본문에서 "## 약 카드" 소절의 표를 읽어요. 소절이 없으면 null, 형식이 틀리면 예외(이유 문구) */
function parseCard(body) {
  const lines = String(body == null ? '' : body).split('\n');
  const starts = [];
  lines.forEach(function (l, i) { if (HEAD_RE.test(l.trim())) starts.push(i); });
  if (!starts.length) return null;
  if (starts.length > 1) throw new Error('"## 약 카드" 소절이 ' + starts.length + '개예요(하나만)');
  const s = starts[0];
  let e = lines.length;
  for (let i = s + 1; i < lines.length; i++) if (/^#{1,3}\s/.test(lines[i])) { e = i; break; }
  const sec = lines.slice(s + 1, e);
  const t0 = sec.findIndex(function (l) { return /^\s*\|/.test(l); });
  if (t0 < 0) throw new Error('"## 약 카드" 소절에 표가 없어요');
  let t1 = t0;
  while (t1 < sec.length && /^\s*\|/.test(sec[t1])) t1++;
  const tbl = sec.slice(t0, t1);
  const head = cells(tbl[0]);
  if (head.length !== 2 || head[0] !== '항목' || head[1] !== '내용') throw new Error('약 카드 머리 줄은 "| 항목 | 내용 |" 이어야 해요');
  const byName = {};
  tbl.slice(1).forEach(function (l) {
    if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) return;
    const c = cells(l);
    if (c.length !== 2) throw new Error('약 카드는 2열 표예요: "' + l.trim() + '"');
    const name = c[0].replace(/\*\*/g, '').trim();
    if (ROWS.indexOf(name) < 0) throw new Error('약 카드에 정해진 행이 아니에요: "' + name + '"');
    if (byName[name] != null) throw new Error('약 카드 행 "' + name + '" 이 두 번 있어요');
    byName[name] = c[1];
  });
  return ROWS.map(function (name, i) {
    if (byName[name] == null) throw new Error('약 카드에 "' + name + '" 행이 없어요');
    const raw = byName[name];
    const text = cellText(raw);
    if (!text) throw new Error('약 카드 "' + name + '" 칸이 비었어요');
    const bad = forbiddenIn(text);
    if (bad.length) throw new Error('약 카드 "' + name + '" 칸에 넣지 않는 말: ' + bad.join(', '));
    const refs = refsOf(raw);
    const key = KEYS[i];
    const long = tooLong(key, text);
    if (long) throw new Error('약 카드 "' + name + '" 칸이 ' + long);
    if (FX_KEYS.indexOf(key) >= 0) {
      if (!LEVEL_RE.test(text)) throw new Error('약 카드 "' + name + '" 칸은 적은 편·중간·많은 편·자료 부족 가운데 하나로 시작해요: "' + text + '"');
      if (!/^자료 부족/.test(text) && !refs.length) throw new Error('약 카드 "' + name + '" 칸에 출처 각주가 없어요(확인 못 한 칸은 자료 부족)');
    }
    return { key: key, name: name, text: text, refs: refs };
  });
}

/* 본문의 "제목(영문)" 첫 꼴에서 영문 성분명. 없으면 '' */
function englishName(title, body) {
  const t = String(title || '').trim();
  if (!t) return '';
  const s = String(body || '');
  const at = s.indexOf(t + '(');
  if (at < 0) return '';
  const m = /^\(([A-Za-z][A-Za-z -]{1,40})\)/.exec(s.slice(at + t.length));
  return m ? m[1].trim() : '';
}

/* 글 한 편 → 항목. 약 카드가 없으면 null. 문제가 있으면 예외(이유 문구, 앞에 파일 이름) */
function entryFrom(text, slug, rel) {
  const where = rel || slug;
  try {
    if (!SLUG_RE.test(String(slug || ''))) throw new Error('slug 형식이 틀렸어요(영어 소문자·숫자·-)');
    const doc = md.parse(String(text == null ? '' : text));
    const meta = doc.meta || {};
    const rows = parseCard(doc.body);
    if (!rows) return null;
    const title = String(meta.title || '').trim();
    if (!title) throw new Error('frontmatter 에 title 이 없어요');
    const updated = String(meta.updated == null ? '' : meta.updated).trim();
    if (!DAY_RE.test(updated)) throw new Error('frontmatter 의 updated 가 YYYY-MM-DD 가 아니에요: "' + updated + '"');
    const srcs = Array.isArray(meta.sources) ? meta.sources : [];
    const used = [];
    rows.forEach(function (r) { r.refs.forEach(function (n) { if (used.indexOf(n) < 0) used.push(n); }); });
    used.sort(function (a, b) { return a - b; });
    const sources = used.map(function (n) {
      const s = srcs[n - 1];
      if (!s || !String(s.title || '').trim()) throw new Error('각주 [^' + n + '] 에 해당하는 출처(sources ' + n + '번째)가 없어요');
      const url = String(s.url || '').trim();
      if (url && !/^https?:\/\//i.test(url)) throw new Error('출처 ' + n + '의 주소가 http(s) 가 아니에요: ' + url);
      return { n: n, org: String(s.org || '').trim(), title: String(s.title).trim(), year: String(s.year || '').trim(), url: url };
    });
    const tocItem = (md.render(doc.body).toc || []).filter(function (h) { return h.level === 2 && String(h.text).trim() === '약 카드'; })[0];
    const out = { slug: slug, name: title, en: englishName(title, doc.body), updated: updated, anchor: tocItem ? tocItem.id : '', rows: rows, sources: sources };
    if (!out.en) delete out.en;
    if (!out.anchor) delete out.anchor;
    return out;
  } catch (e) {
    throw new Error(where + ': ' + e.message);
  }
}

function byName(a, b) {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
}
/* files = [{ slug, rel, text }] → 가나다순 항목 배열. 약 카드가 하나도 없으면 예외 */
function buildFrom(files) {
  const list = [];
  (files || []).forEach(function (f) { const e = entryFrom(f.text, f.slug, f.rel); if (e) list.push(e); });
  if (!list.length) throw new Error('약 카드("## 약 카드")가 있는 글이 하나도 없어요');
  return list.sort(byName);
}
function readDir(dir) {
  return fs.readdirSync(dir).filter(function (f) { return /\.md$/.test(f); }).sort().map(function (f) {
    return { slug: f.replace(/\.md$/, ''), rel: 'content/07-medication/' + f, text: fs.readFileSync(path.join(dir, f), 'utf8') };
  });
}
/* 사람이 읽고 바뀐 곳을 견주기 쉬운 꼴: 약마다 머리 항목은 한 줄씩, 행·출처는 하나에 한 줄 */
function serialize(list) {
  return '[\n' + (list || []).map(function (e) {
    const parts = Object.keys(e).filter(function (k) { return k !== 'rows' && k !== 'sources'; }).map(function (k) {
      return '  ' + JSON.stringify(k) + ': ' + JSON.stringify(e[k]);
    });
    ['rows', 'sources'].forEach(function (k) {
      const arr = Array.isArray(e[k]) ? e[k] : [];
      parts.push('  ' + JSON.stringify(k) + ': ' + (arr.length ? '[\n' + arr.map(function (x) { return '   ' + JSON.stringify(x); }).join(',\n') + '\n  ]' : '[]'));
    });
    return ' {\n' + parts.join(',\n') + '\n }';
  }).join(',\n') + '\n]\n';
}
function build(dir) { return buildFrom(readDir(dir || SRC_DIR)); }

module.exports = {
  ROWS: ROWS, KEYS: KEYS, FX_KEYS: FX_KEYS, FORBIDDEN: FORBIDDEN, OUT: OUT, SRC_DIR: SRC_DIR, MAX_LEN: MAX_LEN, MAX_RUN: MAX_RUN,
  cellText: cellText, refsOf: refsOf, forbiddenIn: forbiddenIn, tooLong: tooLong, parseCard: parseCard, englishName: englishName,
  entryFrom: entryFrom, buildFrom: buildFrom, build: build, serialize: serialize, byName: byName
};

if (require.main === module) {
  let text;
  try { text = serialize(build()); }
  catch (e) { console.error('meds 생성기 실패: ' + e.message); process.exit(1); }
  fs.writeFileSync(OUT, text);
  const n = JSON.parse(text).length;
  console.log('meds: 약 카드 ' + n + '개 → data/kb/meds.json');
}
