/* data/kb/groups.json(분류 소묶음) 과 그것을 쓰는 순수 함수 테스트
   - 모든 분류(14 용어 사전 제외)의 모든 글이 자기 분류의 묶음 하나에 정확히 한 번
   - 묶음의 slug 는 toc 에 있거나 plan-final 3-5 의 새 글 목록에 있다(아직 파일이 없어도 됨)
   - js/ui/hub.js 의 arrange(), js/pages/browse.js 의 색인 함수와 staticHtml */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function load(file) {
  const src = fs.readFileSync(path.join(ROOT, 'data', file), 'utf8');
  const JHB = {};
  new Function('window', 'JHB', src)({ JHB: JHB }, JHB);
  return JHB;
}
function readJson(file) {
  let t = fs.readFileSync(path.join(ROOT, file), 'utf8');
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  return JSON.parse(t);
}
const sections = load('sections.js').sections;
const toc = load('toc.js').toc;
const glossary = load('glossary.js').glossary;
const groups = readJson('data/kb/groups.json');
const hub = require('../js/ui/hub.js');
const browse = require('../js/pages/browse.js');
const esc = require('../js/md.js').esc;

/* plan-final 3-5 의 새 글 33편(분류와 함께). 글이 생기기 전에도 묶음에 미리 넣어 둔다 */
const NEW_SLUGS = {
  'psychosis-what-is': '1',
  'polydipsia-hyponatremia': '4', 'heat-and-medication': '4', 'trauma-and-psychosis': '4', 'comorbid-substance-use': '4',
  'diagnosis-emotions': '5',
  'neuroleptic-malignant-syndrome': '7', 'heart-and-antipsychotics': '7', 'other-medical-care': '7', 'drug-level-test': '7',
  'psychoeducation': '8',
  'shared-decision-making': '9', 'womens-health': '9',
  'family-violence-safety': '10', 'missing-person': '10', 'suicide-bereavement': '10', 'for-friends': '10',
  'for-teachers': '10', 'for-coworkers-managers': '10', 'family-grief': '10',
  'psychiatric-emergency-system': '11', 'guardian-duties': '11', 'treatment-cost-support': '11', 'medical-cost-safety-net': '11',
  'habeas-corpus-relief': '11', 'family-care-leave': '11', 'counseling-voucher-and-screening': '11', 'justice-system': '11',
  'faq-ai-chatbot': '15', 'faq-early-signs': '15', 'faq-hide-meds-in-food': '15', 'faq-family-talk-doctor': '15', 'faq-memory-meds': '15'
};

const bySlug = {}; toc.articles.forEach(function (a) { bySlug[a.slug] = a; });
const secIds = sections.filter(function (s) { return !s.glossary; }).map(function (s) { return s.id; });
function sectionOf(slug) { return bySlug[slug] ? bySlug[slug].section : NEW_SLUGS[slug]; }
function entryOf(id) { return groups.filter(function (g) { return g.section === id; })[0]; }
function secList(id) {
  return toc.articles.filter(function (a) { return a.section === id; })
    .sort(function (a, b) { return (a.order || 999) - (b.order || 999); });
}

/* ---------- groups.json 모양과 빠짐없음 ---------- */
test('groups: 새 글 목록은 33편', function () {
  eq(Object.keys(NEW_SLUGS).length, 33);
});

test('groups: 배열이고 항목마다 section·first·groups 모양', function () {
  ok(Array.isArray(groups), 'groups.json 은 배열');
  groups.forEach(function (g, i) {
    ok(g && typeof g.section === 'string', i + '번째: section 은 글자');
    ok(Array.isArray(g.first) && g.first.length >= 1 && g.first.length <= 3, g.section + ': first 는 1~3개');
    ok(Array.isArray(g.groups) && g.groups.length >= 2, g.section + ': groups 는 2개 이상');
    g.groups.forEach(function (x) {
      ok(typeof x.title === 'string' && x.title.trim() && x.title.length <= 20, g.section + ': 묶음 제목은 1~20자 ' + JSON.stringify(x.title));
      ok(Array.isArray(x.slugs) && x.slugs.length >= 1, g.section + '/' + x.title + ': slugs 가 비어 있음');
    });
    eq(Object.keys(g).sort(), ['first', 'groups', 'section'], g.section + ': 모르는 항목');
  });
});

test('groups: 용어 사전(14)을 뺀 모든 분류가 정확히 한 번', function () {
  const ids = groups.map(function (g) { return g.section; });
  eq(ids.slice().sort(), secIds.slice().sort());
  eq(new Set(ids).size, ids.length, '분류 중복');
  ok(ids.indexOf('14') < 0, '14 는 넣지 않아요');
});

test('groups: toc 에 있는 모든 글이 자기 분류의 묶음에 정확히 한 번', function () {
  const seen = {};
  groups.forEach(function (g) { g.groups.forEach(function (x) { x.slugs.forEach(function (s) { seen[s] = (seen[s] || 0) + 1; }); }); });
  const missing = [], twice = [];
  toc.articles.forEach(function (a) {
    if (a.section === '14') return;
    if (!seen[a.slug]) missing.push(a.slug);
    else if (seen[a.slug] > 1) twice.push(a.slug);
  });
  eq(missing, [], '묶음에 없는 글');
  eq(twice, [], '두 번 이상 든 글');
  Object.keys(seen).forEach(function (s) { eq(seen[s], 1, s + ' 횟수'); });
});

test('groups: 묶음의 slug 는 toc 나 새 글 목록에 있고 그 분류의 글이다', function () {
  groups.forEach(function (g) {
    g.groups.forEach(function (x) {
      x.slugs.forEach(function (s) {
        ok(bySlug[s] || NEW_SLUGS[s], g.section + '/' + x.title + ': 모르는 slug ' + s);
        eq(sectionOf(s), g.section, s + ' 의 분류');
      });
    });
  });
});

test('groups: 새 글 33편이 모두 묶음에 들어 있다', function () {
  const all = new Set();
  groups.forEach(function (g) { g.groups.forEach(function (x) { x.slugs.forEach(function (s) { all.add(s); }); }); });
  const missing = Object.keys(NEW_SLUGS).filter(function (s) { return !all.has(s); });
  eq(missing, []);
});

test('groups: first 는 겹치지 않고 그 분류의 묶음에 든 글', function () {
  groups.forEach(function (g) {
    const mine = new Set();
    g.groups.forEach(function (x) { x.slugs.forEach(function (s) { mine.add(s); }); });
    eq(new Set(g.first).size, g.first.length, g.section + ': first 중복');
    g.first.forEach(function (s) { ok(mine.has(s), g.section + ': first 의 ' + s + ' 가 이 분류 묶음에 없음'); });
  });
});

test('groups: 한 분류 안 묶음 제목은 서로 다르다', function () {
  groups.forEach(function (g) {
    const t = g.groups.map(function (x) { return x.title; });
    eq(new Set(t).size, t.length, g.section + ': 묶음 제목 중복');
  });
});

/* ---------- hub.js arrange() ---------- */
test('hub.arrange: 묶음 순서대로 실제 글만, 없는 slug 는 건너뛰고 빠진 글은 "그 밖의 글"로', function () {
  const list = [{ slug: 'a', order: 1 }, { slug: 'b', order: 2 }, { slug: 'c', order: 3 }, { slug: 'd', order: 4 }];
  const entry = { section: '9', first: ['c', 'zz', 'a', 'b'], groups: [{ title: '둘', slugs: ['c', 'a', 'zz'] }, { title: '빈', slugs: ['yy'] }, { title: '하나', slugs: ['b'] }] };
  const r = hub.arrange(entry, list);
  eq(r.first.map(function (a) { return a.slug; }), ['c', 'a', 'b'], 'first 는 있는 글만, 최대 3');
  eq(r.groups.map(function (g) { return g.title; }), ['둘', '하나', '그 밖의 글'], '빈 묶음은 빼고 남은 글은 끝에');
  eq(r.groups[0].items.map(function (a) { return a.slug; }), ['c', 'a']);
  eq(r.groups[2].items.map(function (a) { return a.slug; }), ['d']);
  ok(r.groups[2].extra === true, '그 밖의 글 표시');
  eq(r.total, 4);
});

test('hub.arrange: 같은 입력이면 같은 결과, 묶음 정보가 없으면 null', function () {
  const list = secList('7');
  const a = hub.arrange(entryOf('7'), list), b = hub.arrange(entryOf('7'), list);
  eq(JSON.stringify(a), JSON.stringify(b));
  eq(hub.arrange(null, list), null);
  eq(hub.arrange({ section: '7', first: [], groups: [] }, list), null);
});

test('hub.arrange: 실제 분류마다 모든 글이 한 번씩 놓이고 "그 밖의 글"은 없다', function () {
  secIds.forEach(function (id) {
    const list = secList(id);
    const r = hub.arrange(entryOf(id), list);
    ok(r, id + ': 묶음 결과');
    const placed = [];
    r.groups.forEach(function (g) { ok(!g.extra, id + ': 그 밖의 글이 생김 ' + JSON.stringify(g.items.map(function (a) { return a.slug; }))); g.items.forEach(function (a) { placed.push(a.slug); }); });
    eq(placed.slice().sort(), list.map(function (a) { return a.slug; }).sort(), id + ': 놓인 글');
    eq(r.total, list.length);
  });
});

test('hub: 위기 한 줄은 4·5·10·11 분류에만, 대상 글은 crisis-hotlines', function () {
  eq(hub.HELP_SECTIONS, ['4', '5', '10', '11']);
  eq(hub.HELP_SLUG, 'crisis-hotlines');
  ok(bySlug['crisis-hotlines'], 'crisis-hotlines 글이 있어야 해요');
});

/* ---------- browse.js 색인 함수 ---------- */
const L = browse.lib;

test('browse.compare: 띄어쓰기·문장부호 무시, 한글 가나다 → 영문 → 숫자, 같은 입력이면 같은 순서', function () {
  const words = ['약값과 건강보험', '약 꾸준히 먹기 전략', 'rTMS와 tDCS', '1세대 항정신병약', '가족 교육', 'AI 챗봇', '환청', '2세대 항정신병약 총론', '각성'];
  const sorted = words.slice().sort(L.compare);
  /* 띄어쓰기를 무시하므로 '약값'(ㄱ) 이 '약 꾸준히'(ㄲ) 보다 앞 */
  eq(sorted, ['가족 교육', '각성', '약값과 건강보험', '약 꾸준히 먹기 전략', '환청', 'AI 챗봇', 'rTMS와 tDCS', '1세대 항정신병약', '2세대 항정신병약 총론']);
  eq(words.slice().reverse().sort(L.compare), sorted);
});

test('browse.initial: 초성(겹자음은 홑자음으로), 영문, 숫자', function () {
  eq(L.initial('까치'), 'ㄱ');
  eq(L.initial('쌍둥이'), 'ㅅ');
  eq(L.initial('환청'), 'ㅎ');
  eq(L.initial('rTMS'), 'A');
  eq(L.initial('1세대'), '#');
  eq(L.initial('“따옴표”로 시작'), 'ㄷ', '앞의 따옴표는 건너뜀');
});

test('browse.abbrs: 대문자 둘 이상인 영문 낱말만(약어), 하이픈 이어진 것 포함', function () {
  eq(L.abbrs('rTMS와 tDCS'), ['rTMS', 'tDCS']);
  eq(L.abbrs('PANSS(양성·음성 증후군 척도)'), ['PANSS']);
  eq(L.abbrs('DSM-5-TR 진단 기준'), ['DSM-5-TR']);
  eq(L.abbrs('ICD-11의 변화'), ['ICD-11']);
  eq(L.abbrs('clinical high risk (CHR), ultra-high risk (UHR)'), ['CHR', 'UHR']);
  eq(L.abbrs('delusional jealousy (Othello syndrome)'), []);
  eq(L.abbrs('정신병에 대한 인지행동치료(CBTp)'), ['CBTp']);
  eq(L.abbrs('심장과 약: QT 연장·빈맥'), ['QT']);
  eq(L.abbrs('D2 수용체'), []);
  eq(L.abbrs('LAI, LAI 그리고 LAI'), ['LAI']);
  eq(L.abbrs('anti-NMDA receptor encephalitis'), ['NMDA'], '소문자 앞마디는 뗌');
});

test('browse.buildAz: 모든 글이 한 번씩, 초성 묶음 순서 ㄱ…ㅎ → 영문 → 숫자', function () {
  const az = L.buildAz(bySlug, sections);
  const flat = [];
  az.forEach(function (g) { g.items.forEach(function (a) { flat.push(a.slug); }); });
  eq(flat.length, toc.articles.length);
  eq(new Set(flat).size, flat.length);
  const keys = az.map(function (g) { return g.key; });
  const order = L.INITIALS;
  for (let i = 1; i < keys.length; i++) ok(order.indexOf(keys[i - 1]) < order.indexOf(keys[i]), '묶음 순서 ' + keys.join(','));
  az.forEach(function (g) {
    g.items.forEach(function (a) { eq(L.initial(a.title), g.key, a.title + ' 의 초성'); });
    for (let i = 1; i < g.items.length; i++) ok(L.compare(g.items[i - 1].title, g.items[i].title) <= 0, g.key + ' 안 정렬');
  });
});

test('browse.buildAbbr: 약어 항목은 실제 글·용어로만 잇고, 영문 이름은 용어 사전의 en', function () {
  const ab = L.buildAbbr(glossary, bySlug);
  const entries = []; ab.forEach(function (g) { g.items.forEach(function (e) { entries.push(e); }); });
  const byKey = {}; entries.forEach(function (e) { byKey[e.key] = e; });
  ok(byKey.LAI, 'LAI 항목');
  ok(byKey.LAI.slugs.indexOf('lai') >= 0, 'LAI → 장기지속형 주사제 글');
  ok(byKey.PANSS && byKey.PANSS.slugs.indexOf('panss') >= 0, 'PANSS → 글');
  ok(byKey.rTMS && byKey.rTMS.slugs.indexOf('rtms-tdcs') >= 0, 'rTMS → 글');
  ok(byKey.AI && byKey.AI.slugs.indexOf('faq-ai-chatbot') >= 0, 'AI → FAQ');
  ok(byKey['auditory hallucination'], '영문 이름 항목');
  eq(byKey['auditory hallucination'].terms.map(function (t) { return t.term; }), ['환청']);
  entries.forEach(function (e) {
    e.slugs.forEach(function (s) { ok(bySlug[s], e.key + ': 없는 글 ' + s); });
    ok(e.slugs.length || e.terms.length, e.key + ': 갈 곳이 없음');
    eq(new Set(e.slugs).size, e.slugs.length, e.key + ': 글 중복');
  });
  const keys = entries.map(function (e) { return e.key.toLowerCase(); });
  eq(new Set(keys).size, keys.length, '항목 중복');
  const glEn = glossary.filter(function (g) { return g.en; }).length;
  ok(entries.length >= glEn, '용어 사전 영문 ' + glEn + '개보다 많거나 같음(약어 포함)');
});

test('browse.buildMap: 분류 순서대로, 아직 없는 새 글은 건너뛰고 모든 글이 한 번', function () {
  const map = L.buildMap(sections, groups, bySlug);
  eq(map.map(function (s) { return s.id; }), secIds);
  const flat = [];
  map.forEach(function (s) { s.groups.forEach(function (g) { g.items.forEach(function (a) { flat.push(a.slug); }); }); });
  eq(flat.slice().sort(), toc.articles.filter(function (a) { return a.section !== '14'; }).map(function (a) { return a.slug; }).sort());
  /* 새 글이 아직 없을 때: 묶음에서 그 slug 를 빼 둔 목록으로 흉내 */
  const partial = {}; Object.keys(bySlug).forEach(function (k) { if (k !== 'for-friends') partial[k] = bySlug[k]; });
  const m2 = L.buildMap(sections, groups, partial);
  const flat2 = [];
  m2.forEach(function (s) { s.groups.forEach(function (g) { g.items.forEach(function (a) { flat2.push(a.slug); }); }); });
  ok(flat2.indexOf('for-friends') < 0, '없는 글은 링크하지 않음');
  eq(flat2.length, flat.length - 1);
});

test('browse.staticHtml: 세 부분과 건너뛰기, 모든 글 링크가 지도·가나다에 한 번씩, 없는 글은 링크 없음', function () {
  const html = browse.staticHtml({ data: { groups: groups }, esc: esc, articles: bySlug, sections: sections, page: { id: 'browse' } });
  has(html, 'id="browse-map"');
  has(html, 'id="browse-az"');
  has(html, 'id="browse-abbr"');
  has(html, 'href="#browse-az"');
  const links = html.match(/href="#\/a\/([a-z0-9-]+)"/g) || [];
  const count = {};
  links.forEach(function (h) { const s = h.slice(10, -1); count[s] = (count[s] || 0) + 1; });
  toc.articles.forEach(function (a) { ok(count[a.slug] >= 2, a.slug + ' 링크 ' + (count[a.slug] || 0) + '개'); });
  Object.keys(count).forEach(function (s) { ok(bySlug[s], '없는 글 링크 ' + s); });
  const sec = html.match(/href="#\/s\/([0-9]+)"/g) || [];
  sec.forEach(function (h) { const id = h.slice(10, -1); ok(secIds.indexOf(id) >= 0, '분류 ' + id); });
  const terms = html.match(/href="#\/glossary\?t=([^"]+)"/g) || [];
  ok(terms.length > 50, '용어 링크 ' + terms.length);
  const names = new Set(glossary.map(function (g) { return g.term; }));
  terms.forEach(function (h) { const t = decodeURIComponent(h.slice('href="#/glossary?t='.length, -1)); ok(names.has(t), '없는 용어 ' + t); });
  not(html, '<script');
  not(html, 'undefined');
});

test('browse.staticHtml: id 는 모두 서로 다르고, 건너뛰기·aria-labelledby 가 가리키는 id 가 있다', function () {
  const html = browse.staticHtml({ data: { groups: groups }, esc: esc, articles: bySlug, sections: sections, page: { id: 'browse' } });
  const ids = (html.match(/ id="([^"]+)"/g) || []).map(function (s) { return s.slice(5, -1); });
  const seen = {}, dup = [];
  ids.forEach(function (i) { if (seen[i]) dup.push(i); seen[i] = true; });
  eq(dup, [], '겹친 id');
  ok(seen['browse-az-h'], 'ㅎ 묶음 id');
  (html.match(/href="#(browse-[^"]+)"/g) || []).forEach(function (h) { const id = h.slice(7, -1); ok(seen[id], '없는 건너뛰기 대상 ' + id); });
  (html.match(/aria-labelledby="([^"]+)"/g) || []).forEach(function (h) { const id = h.slice(17, -1); ok(seen[id], '없는 제목 id ' + id); });
});

test('browse.staticHtml: 글·분류가 비어도(검사용 빈 문맥) 글자를 돌려주고 링크를 만들지 않는다', function () {
  const html = browse.staticHtml({ data: { groups: groups }, esc: esc, articles: {}, sections: [], page: { id: 'browse' } });
  eq(typeof html, 'string');
  not(html, 'href="#/a/');
});

test('browse.staticHtml: 제목의 특수 문자를 이스케이프', function () {
  const fake = { 'x-1': { slug: 'x-1', section: '1', title: '<b>꺾쇠</b> & "따옴표"', order: 1 } };
  const html = browse.staticHtml({ data: { groups: [] }, esc: esc, articles: fake, sections: [sections[0]], page: { id: 'browse' } });
  has(html, '&lt;b&gt;꺾쇠&lt;/b&gt; &amp; &quot;따옴표&quot;');
  not(html, '<b>꺾쇠');
});

test('browse 선언: nav·group·robots 가 지시서대로', function () {
  const d = readJson('data/pages/browse.json');
  eq(d.id, 'browse');
  eq(d.nav, ['top', 'side', 'home', 'palette']);
  eq(d.group, '안내');
  eq(d.robots, 'index');
  ok(d.summary.length <= 155, 'summary 155자 이하');
});

/* ---------- 검수 뒤 더한 것(2026-11-14) ---------- */
test('browse.buildMap: 묶음은 hub.arrange 와 같은 규칙(한 곳에서만 정함)', function () {
  const map = L.buildMap(sections, groups, bySlug);
  map.forEach(function (s) {
    const r = hub.arrange(entryOf(s.id), secList(s.id));
    eq(s.groups.map(function (g) { return [g.title, !!g.extra, g.items.map(function (a) { return a.slug; })]; }),
      r.groups.map(function (g) { return [g.title, !!g.extra, g.items.map(function (a) { return a.slug; })]; }), s.id + ' 묶음');
  });
  /* 빠진 글·없는 slug 가 섞인 가짜 묶음에서도 같다 */
  const fakeSec = [{ id: '9', title: '가짜', hue: 1 }];
  const fakeArts = { a: { slug: 'a', section: '9', title: '가', order: 1 }, b: { slug: 'b', section: '9', title: '나', order: 2 }, c: { slug: 'c', section: '9', title: '다', order: 3 } };
  const fakeGroups = [{ section: '9', first: ['a'], groups: [{ title: '둘', slugs: ['c', 'zz'] }, { title: '빈', slugs: ['yy'] }] }];
  const m = L.buildMap(fakeSec, fakeGroups, fakeArts)[0];
  const h = hub.arrange(fakeGroups[0], [fakeArts.a, fakeArts.b, fakeArts.c]);
  eq(m.groups.map(function (g) { return g.title; }), h.groups.map(function (g) { return g.title; }));
  eq(m.groups[1].items.map(function (a) { return a.slug; }), ['a', 'b']);
});

test('browse.staticHtml: ctx.data 에 groups 가 없어도 node 에서 groups.json 을 읽어 소묶음을 넣는다', function () {
  const html = browse.staticHtml({ data: {}, esc: esc, articles: bySlug, sections: sections, page: { id: 'browse' } });
  const withData = browse.staticHtml({ data: { groups: groups }, esc: esc, articles: bySlug, sections: sections, page: { id: 'browse' } });
  eq(html, withData);
  has(html, '<h4>' + esc(groups[0].groups[0].title) + '</h4>');
});

test('browse.staticHtml: 묶음 자료가 빈 배열이면 분류마다 평평한 목록(모든 글은 그대로)', function () {
  const html = browse.staticHtml({ data: { groups: [] }, esc: esc, articles: bySlug, sections: sections, page: { id: 'browse' } });
  not(html, '<h4>');
  toc.articles.forEach(function (a) { has(html, 'href="#/a/' + a.slug + '"'); });
});

test('browse.staticHtml: 영문·약어 항목의 글을 줄이면 "외 N편" 링크로 그 용어 풀이에 간다', function () {
  const html = browse.staticHtml({ data: { groups: groups }, esc: esc, articles: bySlug, sections: sections, page: { id: 'browse' } });
  const ab = L.buildAbbr(glossary, bySlug);
  let cut = 0;
  ab.forEach(function (g) {
    g.items.forEach(function (e) {
      const max = e.kind === 'abbr' ? L.DOCS_ABBR : L.DOCS_NAME;
      if (e.slugs.length > max + 1 && e.terms.length) {
        cut++;
        has(html, '<a class="pg-browse-more" href="#/glossary?t=' + esc(encodeURIComponent(e.terms[0].term)) + '">외 ' + (e.slugs.length - max) + '편 · 용어 풀이</a>', e.key);
      }
    });
  });
  ok(cut > 0, '줄인 항목이 있어야 시험이 뜻이 있어요');
  eq((html.match(/class="pg-browse-more"/g) || []).length, cut, '"외 N편" 링크 수');
});

test('browse.staticHtml: 가나다·영문 묶음마다 높이 어림용 --n(항목 수)', function () {
  const html = browse.staticHtml({ data: { groups: groups }, esc: esc, articles: bySlug, sections: sections, page: { id: 'browse' } });
  const az = L.buildAz(bySlug, sections);
  az.forEach(function (g) { has(html, '<section class="pg-browse-az" id="' + g.id + '" style="--n:' + g.items.length + '"'); });
  const ab = L.buildAbbr(glossary, bySlug);
  ab.forEach(function (g) { has(html, '<section class="pg-browse-ab" id="' + g.id + '" style="--n:' + g.items.length + '"'); });
});

test('browse 선언: groups 는 선언 data 로 받지 않는다(받지 못해도 화면 전체가 실패하지 않게)', function () {
  const d = readJson('data/pages/browse.json');
  ok(!d.data || d.data.indexOf('groups') < 0, 'data 에 groups 가 있으면 groups.json 실패 때 둘러보기 전체가 실패해요');
});
