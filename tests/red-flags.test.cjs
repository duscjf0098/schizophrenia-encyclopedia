/* 바로 연락할 신호 한 장(red-flags/) 테스트
   - 생성기 tools/gen/red-flags.cjs: 견본 글과 실제 글(content/07-medication/side-effects-overview.md 의 '## 바로 연락할 신호' 표)
   - 생성물 data/kb/red-flags.json: 손으로 고치지 않았는지(생성기를 다시 돌린 결과와 같은지), 할 일은 119·오늘 안에 연락뿐, 자세한 글 slug 존재
   - 화면 js/pages/red-flags.js: 정적 HTML 의 순서(대부분 드물어요 → 119 → 표 → 끊지 말고 연락), 이스케이프, 금지 문장 0
   - 선언 data/pages/red-flags.json 과 css/pages/red-flags.css 의 약속(붉은 경고색 없음, 토큰만, 접두어, 휴대폰 카드, 인쇄 한 장) */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const G = require('../tools/gen/red-flags.cjs');
const page = require('../js/pages/red-flags.js');
const L = page.lib;
const md = require('../js/md.js');
const CC = require('../tools/check-content.cjs');
const A = require('../tools/lib/assets.cjs');

function read(rel) { return A.stripBom(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
const DATA = JSON.parse(read('data/kb/red-flags.json'));
const DECL = JSON.parse(read('data/pages/red-flags.json'));
const CSS = read('css/pages/red-flags.css');
const JS = read('js/pages/red-flags.js');
const SLUGS = G.contentSlugs(ROOT);

/* ---------- 견본 글 ---------- */
const SAMPLE = [
  '---',
  'title: 견본 글',
  'updated: 2026-11-01',
  'sources:',
  '  - 가 기관 | 첫째 자료 | 2024 | https://example.org/a',
  '  - 나 기관 | 둘째 자료 | 2025 | https://example.org/b',
  '---',
  '## 한 문장으로',
  '',
  '앞 소절이에요.',
  '',
  '## 바로 연락할 신호',
  '',
  '대부분은 드물어요. 하지만 이런 신호가 보이면 기다리지 말고 연락하세요.',
  '',
  '| 신호 | 의심되는 상태 | 할 일 | 자세한 글 |',
  '|---|---|---|---|',
  '| 열이 나면서 **몸이 굳음**[^1][^2] | 신경이완제 악성 증후군 | 바로 119. 열이 아직 없어도 | [악성 증후군](#/a/neuroleptic-malignant-syndrome) |',
  '| 며칠째 대변이 없음[^2] | 장 운동 저하 | 오늘 안에 담당 의사나 병원에 연락. 연락이 닿지 않으면 119 | [클로자핀](#/a/clozapine), [심장과 약](#/a/heart-and-antipsychotics) |',
  '',
  '약을 스스로 끊지 말고 먼저 연락하세요. 약에 관한 판단은 의료진이 해요.',
  '',
  '::: warn 119에 연락할 때',
  '- 약 이름을 알려요.',
  ':::',
  '',
  '## 다음 소절',
  '',
  '| 갈래 | 대표 증상 | 자세히 |',
  '|---|---|---|',
  '| 운동 | 떨림 | [추체외로](#/a/eps) |',
  ''
].join('\n');
const SAMPLE_SLUGS = new Set(['neuroleptic-malignant-syndrome', 'clozapine', 'heart-and-antipsychotics', 'eps']);

test('생성기 견본: 표 한 개만 읽고, 각주·굵게·링크를 걷어 낸 글자와 근거 번호를 남긴다', function () {
  const r = G.extract(SAMPLE, { slug: 'sample', slugs: SAMPLE_SLUGS });
  eq(r.errors, []);
  const d = r.data;
  eq(d.source, { slug: 'sample', title: '견본 글', heading: '바로 연락할 신호', updated: '2026-11-01' });
  eq(d.intro, '대부분은 드물어요. 하지만 이런 신호가 보이면 기다리지 말고 연락하세요.');
  eq(d.after, '약을 스스로 끊지 말고 먼저 연락하세요. 약에 관한 판단은 의료진이 해요.');
  eq(d.columns, ['신호', '의심되는 상태', '할 일', '자세한 글']);
  eq(d.rows.length, 2, '다음 소절의 표는 읽지 않아요');
  eq(d.rows[0], {
    sign: '열이 나면서 몸이 굳음', state: '신경이완제 악성 증후군', action: '바로 119. 열이 아직 없어도',
    lead: '바로 119', kind: '119', links: [{ slug: 'neuroleptic-malignant-syndrome', title: '악성 증후군' }], refs: [1, 2]
  });
  eq(d.rows[1].kind, 'today');
  eq(d.rows[1].lead, '오늘 안에 담당 의사나 병원에 연락');
  eq(d.rows[1].links.map(function (x) { return x.slug; }), ['clozapine', 'heart-and-antipsychotics']);
  eq(d.sources, [
    { n: 1, org: '가 기관', title: '첫째 자료', year: '2024', url: 'https://example.org/a' },
    { n: 2, org: '나 기관', title: '둘째 자료', year: '2025', url: 'https://example.org/b' }
  ]);
});

test('생성기 견본: 같은 입력이면 같은 출력(글자 그대로 같은 JSON)', function () {
  const a = G.serialize(G.extract(SAMPLE, { slug: 'sample', slugs: SAMPLE_SLUGS }).data);
  const b = G.serialize(G.extract(SAMPLE.replace(/\n/g, '\r\n'), { slug: 'sample', slugs: SAMPLE_SLUGS }).data);
  eq(a, b);
  ok(/\n$/.test(a), '끝에 줄바꿈');
});

function errsFor(src, slugs) { return G.extract(src, { slug: 'sample', slugs: slugs || SAMPLE_SLUGS }).errors; }
function hasErr(list, word) { ok(list.some(function (x) { return x.indexOf(word) >= 0; }), '기대한 오류 "' + word + '" 없음: ' + JSON.stringify(list)); }

test('생성기 견본: 고장 난 글은 이유와 함께 오류(소절·표·열·할 일·자세한 글·근거 번호)', function () {
  hasErr(errsFor(SAMPLE.replace('## 바로 연락할 신호', '## 다른 제목')), '바로 연락할 신호');
  hasErr(errsFor(SAMPLE.replace('| 신호 | 의심되는 상태 | 할 일 | 자세한 글 |', '| 신호 | 상태 | 할 일 | 자세한 글 |')), '열 이름');
  hasErr(errsFor(SAMPLE.replace('| 바로 119. 열이 아직 없어도 |', '| 지켜봐요 |')), '할 일');
  hasErr(errsFor(SAMPLE.replace('| 바로 119. 열이 아직 없어도 |', '| 괜찮아요. 기다려요 |')), '할 일');
  hasErr(errsFor(SAMPLE, new Set(['clozapine', 'heart-and-antipsychotics'])), 'neuroleptic-malignant-syndrome');
  hasErr(errsFor(SAMPLE.replace('[악성 증후군](#/a/neuroleptic-malignant-syndrome)', '악성 증후군')), '자세한 글');
  hasErr(errsFor(SAMPLE.replace('[^1][^2]', '[^7]')), '[^7]');
  hasErr(errsFor(SAMPLE.replace('| 장 운동 저하 |', '|  |')), '비었어요');
  const cut = SAMPLE.split('\n').filter(function (l) { return !/^\| (열이|며칠)/.test(l); }).join('\n');
  hasErr(errsFor(cut), '줄이 없어요');
  hasErr(G.extract('', { slug: 'x' }).errors, '바로 연락할 신호');
});

test('생성기 견본: 할 일 분류는 첫 마디로만(바로 119 → 119, 오늘 안에 … → today, 그 밖은 null)', function () {
  eq(G.leadOf('바로 119. 기다리는 동안 몸을 식혀요'), '바로 119');
  eq(G.leadOf('바로 119'), '바로 119');
  eq(G.leadOf('오늘 안에 담당 의사나 병원에 연락. 미루지 말고'), '오늘 안에 담당 의사나 병원에 연락');
  eq(G.classify('바로 119. 가슴 증상 없이 열만 있으면 오늘 안에 연락'), '119');
  eq(G.classify('오늘 안에 담당 의사나 병원에 연락. 연락이 닿지 않으면 119'), 'today');
  eq(G.classify('오늘 안에 병원에 가 봐요'), null, '오늘 안에여도 연락이 아니면 안 돼요');
  eq(G.classify('지켜봐요'), null);
  eq(G.classify('괜찮아요'), null);
});

test('생성기 견본: "오늘 안에"로 시작해도 연락하지 말라는 첫 마디는 받지 않는다(부정·끝이 연락이 아님)', function () {
  ['오늘 안에 연락하지 않아도 돼요', '오늘 안에 연락할 필요 없어요', '오늘 안에 연락 안 해도 돼요', '오늘 안에 연락하지 말고 지켜봐요',
    '오늘 안에 연락은 하지 마세요', '오늘 안에 연락 없이 기다려요', '오늘 안에 연락하세요'].forEach(function (s) {
    eq(G.classify(s), null, s);
  });
  eq(G.classify('오늘 안에 담당 의사에게 연락'), 'today');
  eq(G.classify('오늘 안에 연락. 미루지 말고'), 'today', '첫 마디 뒤의 말은 보지 않아요');
  hasErr(errsFor(SAMPLE.replace('| 오늘 안에 담당 의사나 병원에 연락. 연락이 닿지 않으면 119 |', '| 오늘 안에 연락하지 않아도 돼요 |')), '할 일');
});

test('생성기 견본: 표 바로 뒤 문단에 "스스로 끊지 말고 … 연락"이 없으면 오류(안전 문장이 빠진 채 나가지 않게)', function () {
  const wedge = SAMPLE.replace('\n\n약을 스스로 끊지 말고', '\n\n표에 이어 다른 설명 문단이 들어왔어요.\n\n약을 스스로 끊지 말고');
  hasErr(errsFor(wedge), '스스로 끊지 말고');
  hasErr(errsFor(SAMPLE.replace('약을 스스로 끊지 말고 먼저 연락하세요. 약에 관한 판단은 의료진이 해요.\n', '')), '스스로 끊지 말고');
  eq(G.afterErrors('약을 스스로 끊지 말고 먼저 연락하세요.'), []);
  ok(G.afterErrors('약을 스스로 끊지 말고 기다려요.').length > 0, '연락이 없으면 오류');
});

test('생성기: 선언의 lead 와 글의 표 앞 문장이 다르면 오류(빌드에서 바로 드러나게)', function () {
  eq(G.leadErrors({ intro: '가 문장이에요.' }, { lead: '가 문장이에요.' }), []);
  hasErr(G.leadErrors({ intro: '새 문장이에요.' }, { lead: '옛 문장이에요.' }), 'lead');
  hasErr(G.leadErrors({ intro: '새 문장이에요.' }, null), 'lead');
});

/* ---------- 실제 글과 생성물 ---------- */
test('실제 글: 부작용 총론의 표를 오류 없이 읽고, 생성물(data/kb/red-flags.json)은 생성기를 다시 돌린 결과와 같다', function () {
  const r = G.run(ROOT);
  eq(r.errors, []);
  eq(r.data.source.slug, 'side-effects-overview');
  ok(r.data.rows.length >= 8, '신호가 8줄 이상: ' + r.data.rows.length);
  eq(G.serialize(DATA), G.serialize(r.data), '생성물이 낡았거나 손으로 고쳤어요 — node tools/gen/red-flags.cjs');
  eq(read('data/kb/red-flags.json'), G.serialize(r.data), '파일 글자 그대로');
});

test('실제 자료: 모든 줄의 할 일은 "바로 119" 또는 "오늘 안에 … 연락"으로 시작하고, 괜찮아요 줄은 없다', function () {
  DATA.rows.forEach(function (row, i) {
    ok(/^바로 119(\.|$)/.test(row.action) || /^오늘 안에 [^.]*연락(\.|$)/.test(row.action), (i + 1) + '번째 줄 할 일: ' + row.action);
    ok(!/않|말고|필요\s*없|안\s*해도|마세요/.test(row.lead), (i + 1) + '번째 줄 첫 마디에 부정: ' + row.lead);
    eq(row.kind, G.classify(row.action), (i + 1) + '번째 줄 분류');
    ok(row.action.indexOf(row.lead) === 0, (i + 1) + '번째 줄 첫 마디');
    ok(/119|연락/.test(row.action), (i + 1) + '번째 줄');
    ok(!/괜찮|안심해도|지켜봐도|기다려도/.test(row.sign + row.state + row.action), (i + 1) + '번째 줄에 안심시키는 말');
  });
  ok(DATA.rows.some(function (r) { return r.kind === '119'; }), '119 줄');
  ok(DATA.rows.some(function (r) { return r.kind === 'today'; }), '오늘 안에 줄');
});

test('실제 자료: 자세한 글 slug 는 모두 실제 글, 근거 번호는 글의 출처 목록에 있다', function () {
  DATA.rows.forEach(function (row, i) {
    ok(row.links.length >= 1, (i + 1) + '번째 줄 자세한 글');
    row.links.forEach(function (l) { ok(SLUGS.has(l.slug), '없는 글: ' + l.slug); ok(l.title.trim(), '링크 글자'); });
    ok(row.refs.length >= 1, (i + 1) + '번째 줄 근거 번호');
  });
  const ns = DATA.sources.map(function (s) { return s.n; });
  DATA.rows.forEach(function (row) { row.refs.forEach(function (n) { ok(ns.indexOf(n) >= 0, '근거 ' + n); }); });
  DATA.sources.forEach(function (s) { ok(/^https:\/\//.test(s.url), '출처 주소: ' + s.url); });
  ok(SLUGS.has(DATA.source.slug), '원천 글');
});

test('실제 자료: 주요 응급 신호가 빠지지 않았다(악성 증후군·심장·심근염·호중구·장·경련·열사병·저나트륨)', function () {
  const states = DATA.rows.map(function (r) { return r.state; }).join(' / ');
  ['신경이완제 악성 증후군', '심장', '심근염', '호중구', '장', '경련', '열사병', '저나트륨'].forEach(function (w) { has(states, w, '의심되는 상태'); });
});

/* 화면·자료 어디에도 쓰지 않는 말: 판정형("당신은 ○○예요", "위험해요", "입원해야"), 안심시키는 행, 용량·중단, 글 검사기 금지 표현 */
const BANNED = [
  { re: /당신은|당신이|너는/, why: '사람에게 판정하는 말' },
  { re: /(이|가)\s*(맞|확실)(아요|해요)|일\s*거예요|입니다\s*$/, why: '단정' },
  { re: /위험해요|입원해야|응급이에요/, why: '판정형 문장' },
  { re: /괜찮아요|안심하세요|걱정\s*안\s*해도/, why: '괜찮아요 행' },
  { re: /\d\s*(mg|㎎|밀리그램)/i, why: '용량' },
  { re: /끊어도|줄여도|안 먹어도|중단해도/, why: '중단 권유' },
  { re: /자가\s*(진단|검사)|진단\s*도구/, why: '의료기기처럼 보이는 말' }
];
function banned(text) {
  const s = String(text || ''), out = [];
  BANNED.forEach(function (b) { const m = b.re.exec(s); if (m) out.push(b.why + ' (' + m[0] + ')'); });
  CC.findForbidden(s).forEach(function (f) { out.push(f.why + ' (' + f.hit + ')'); });
  if (CC.EXTREME_CHOICE.test(s)) out.push('에두른 자살 표현');
  return out;
}
function staticOf(data, articles) {
  return page.staticHtml({ data: { 'red-flags': data }, esc: md.esc, articles: articles || {}, sections: [], page: DECL });
}
function textOf(html) { return String(html).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' '); }

test('금지 문장 0: 자료·선언·화면 글자(정적 HTML)', function () {
  DATA.rows.forEach(function (r, i) { eq(banned([r.sign, r.state, r.action, r.links.map(function (l) { return l.title; }).join(' ')].join(' / ')), [], (i + 1) + '번째 줄'); });
  eq(banned(DATA.intro + ' ' + DATA.after), [], '앞뒤 문장');
  eq(banned([DECL.title, DECL.label, DECL.summary, DECL.lead, (DECL.keywords || []).join(' ')].join(' / ')), [], '선언');
  eq(banned(textOf(staticOf(DATA))), [], '정적 HTML');
  /* 화면 코드의 문구(주석 제외)도 */
  const code = JS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const strings = (code.match(/'(?:[^'\\\n]|\\.)*'/g) || []).join(' ');
  eq(banned(strings), [], '화면 코드 문구');
});

test('상태 이름은 "의심되는 상태" 열의 이름(명사)으로만, 사람에게 하는 판정 문장이 아니다', function () {
  eq(DATA.columns[1], '의심되는 상태');
  DATA.rows.forEach(function (r) {
    ok(!/(요|다|니다)[.!]?$/.test(r.state), '문장으로 끝나요: ' + r.state);
    ok(r.state.length <= 24, '이름이 길어요: ' + r.state);
  });
  const html = staticOf(DATA);
  has(html, '의심되는 상태', '머리글·카드 이름');
});

test('정적 HTML: 대부분 드물어요(머리 소개) → 119 → 표 → "약을 스스로 끊지 말고" 순서, 모든 줄과 글 링크', function () {
  eq(DECL.lead, DATA.intro, '선언 lead = 글의 표 앞 문장');
  eq(DECL.lead, '대부분은 드물어요. 하지만 이런 신호가 보이면 기다리지 말고 연락하세요.');
  const html = staticOf(DATA);
  const iNow = html.indexOf('당장 위험하면'), iCall = html.indexOf('href="tel:119"'), iTable = html.indexOf('<table'), iAfter = html.indexOf('약을 스스로 끊지 말고 먼저 연락하세요');
  ok(iNow >= 0 && iCall > iNow, '당장 위험하면 119(전화 링크)');
  ok(iTable > iCall, '표는 119 다음');
  ok(iAfter > iTable, '끊지 말고 연락은 표 다음');
  has(html, '약에 관한 판단은 의료진이 해요');
  DATA.rows.forEach(function (r) {
    has(html, md.esc(r.sign), '신호');
    has(html, md.esc(r.state), '의심되는 상태');
    r.links.forEach(function (l) { has(html, 'href="#/a/' + l.slug + '"', '자세한 글 링크'); });
  });
  eq((html.match(/<tr\b/g) || []).length, DATA.rows.length + 1, '머리 줄 + 신호 줄');
  has(html, 'href="#/a/side-effects-overview"', '원천 글 링크');
  not(html, '<script', '스크립트 없음');
  not(html, '<button', '자바스크립트 없이 동작하지 않는 버튼 없음');
});

test('정적 HTML: 할 일의 119 는 전화 링크, 첫 마디는 굵게, 표 의미(role·scope)는 휴대폰 카드에서도 남는다', function () {
  const html = staticOf(DATA);
  const calls = (html.match(/href="tel:119"/g) || []).length;
  ok(calls >= 1 + DATA.rows.filter(function (r) { return r.kind === '119'; }).length, '119 전화 링크 수: ' + calls);
  not(html, 'tel:1199');
  has(html, '<strong class="pg-red-flags-lead">바로 <a href="tel:119"');
  has(html, '<strong class="pg-red-flags-lead">오늘 안에');
  has(html, 'role="table"');
  eq((html.match(/<th scope="col" role="columnheader"/g) || []).length, 4, '열 머리 4개');
  eq((html.match(/role="cell"/g) || []).length, DATA.rows.length * 4);
});

test('linkTel: 따로 선 119 만 전화 링크(1190·2119·119-1 은 그대로)', function () {
  eq(L.linkTel('바로 119. 응급실이나 119'), '바로 <a href="tel:119">119</a>. 응급실이나 <a href="tel:119">119</a>');
  eq(L.linkTel('1190 2119 119-1 119번째'), '1190 2119 119-1 119번째');
  eq(L.linkTel('(119)'), '(<a href="tel:119">119</a>)');
});

test('정적 HTML: 자료 글자는 모두 이스케이프하고, 글 링크는 slug 형식만', function () {
  const evil = JSON.parse(JSON.stringify(DATA));
  evil.rows[0].sign = '<img src=x onerror=alert(1)>';
  evil.rows[0].state = '"><script>x</script>';
  evil.rows[0].links = [{ slug: 'x" onclick="y', title: '<b>t</b>' }, { slug: 'clozapine', title: '클로자핀' }];
  evil.after = '<i>a</i>';
  const html = staticOf(evil);
  not(html, '<img src=x');
  not(html, '<script>');
  not(html, 'onclick="y');
  not(html, '<b>t</b>');
  not(html, '<i>a</i>');
  has(html, '&lt;img src=x onerror=alert(1)&gt;');
  has(html, 'href="#/a/clozapine"');
});

test('정적 HTML: 자료가 비거나 이상해도 119·끊지 말고 연락·원천 글 링크는 남는다', function () {
  [null, {}, { rows: 'x' }, { rows: [null, 3, {}] }].forEach(function (d) {
    const html = staticOf(d);
    has(html, 'href="tel:119"');
    has(html, '약을 스스로 끊지 말고 먼저 연락하세요');
    has(html, 'href="#/a/side-effects-overview"');
    not(html, '<table', '그릴 줄이 없으면 표도 없어요');
  });
});

test('정적 HTML: 자료의 after 에 "스스로 끊지 말고 … 연락"이 없으면 고정 안전 문장을 보여 준다', function () {
  const d = JSON.parse(JSON.stringify(DATA));
  d.after = '표에 이어 다른 설명 문단이 들어왔어요.';
  const html = staticOf(d);
  has(html, '약을 스스로 끊지 말고 먼저 연락하세요');
  has(html, '약에 관한 판단은 의료진이 해요');
  eq(DATA.after.indexOf('스스로 끊지 말고') >= 0 && DATA.after.indexOf('연락') >= 0, true, '실제 자료의 after');
});

test('정적 HTML: 출처 링크는 새 창에서 열린다는 것을 읽기 프로그램에도 알린다', function () {
  const html = staticOf(DATA);
  const links = html.match(/<a [^>]*target="_blank"[^>]*>/g) || [];
  ok(links.length === DATA.sources.length && links.length > 0, '출처 링크 수: ' + links.length);
  links.forEach(function (a) { ok(/aria-label="[^"]+\(새 창에서 열림\)"/.test(a), '새 창 표시 없음: ' + a); });
});

test('맨 위 119 는 data/kb/contacts.json 의 rescue-119(확인한 날·공식 출처)와 같은 번호', function () {
  const C = JSON.parse(read('data/kb/contacts.json'));
  const r = (Array.isArray(C) ? C : []).find(function (x) { return x && x.id === 'rescue-119'; });
  ok(r, 'contacts.json 에 rescue-119');
  eq(r.tel, '119');
  ok(/^https:\/\/www\.nfa\.go\.kr\//.test(r.source), '소방청 출처: ' + r.source);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(r.checked), '확인한 날: ' + r.checked);
  has(JS, 'rescue-119', '화면 코드가 번호의 출처 항목을 가리켜요');
  const tels = (JS.replace(/\/\*[\s\S]*?\*\//g, '').match(/tel:[0-9-]+/g) || []);
  ok(tels.length > 0);
  tels.forEach(function (t) { eq(t, 'tel:' + r.tel, '화면 코드의 전화번호'); });
});

test('정적 HTML: 글 제목은 articles 에 있으면 함께, 출처는 접힌 목록(번호·주소)으로', function () {
  const html = staticOf(DATA, { 'side-effects-overview': { title: '부작용 총론' } });
  has(html, '부작용 총론');
  has(html, '<details class="pg-red-flags-src"');
  DATA.sources.forEach(function (s) { has(html, md.esc(s.url)); });
});

/* ---------- 선언·스타일·코드 약속 ---------- */
test('선언: 지식 묶음, 왼쪽 목차·팔레트, 검색 노출, 일반·응급 고지, 위기 줄', function () {
  eq(A.validateDecl(DECL, 'red-flags').errors, []);
  eq(DECL.id, 'red-flags');
  eq(DECL.title, '바로 연락할 신호 한 장');
  eq(DECL.group, '지식');
  eq(DECL.nav, ['side', 'palette']);
  eq(DECL.robots, 'index');
  eq(DECL.notice, ['general', 'emergency']);
  ok(DECL.crisisLine !== false);
  eq(DECL.data, ['red-flags']);
  ok(DECL.summary.length <= A.SUMMARY_MAX);
});

test('스타일: 붉은 경고색·경고 기호 없음, 색은 토큰만, 선택자는 .pg-red-flags- 또는 이 화면 범위', function () {
  const css = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/--bad/.test(css), '--bad(빨강) 토큰을 쓰지 않아요');
  ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), 'hex 색 없음');
  ok(!/\b(rgb|rgba|hsl|hsla)\(/.test(css), 'rgb·hsl 색 없음');
  ok(!/\b(red|crimson|tomato|firebrick|orangered)\b/i.test(css.replace(/red-flags/g, '')), '이름 붙은 빨강 없음');
  not(JS, '⚠', '경고 기호');
  not(JS, '🚨');
  /* 모든 규칙의 선택자: .pg-red-flags- 로 시작하거나 data-page="red-flags" 범위 안 */
  const body = css.replace(/@media[^{]*\{/g, '').replace(/@supports[^{]*\{/g, '');
  const sels = [];
  body.replace(/([^{}]+)\{[^{}]*\}/g, function (_, s) { s.split(',').forEach(function (x) { if (x.trim()) sels.push(x.trim()); }); return ''; });
  ok(sels.length > 10, '선택자 수: ' + sels.length);
  sels.forEach(function (s) {
    ok(/^\.pg-red-flags-/.test(s) || /data-page="red-flags"/.test(s), '범위 밖 선택자: ' + s);
  });
});

test('스타일: 휴대폰(760px 이하)은 카드, 인쇄는 한 장(크롬·버튼·출처 접힘 숨김, 119 맨 위)', function () {
  ok(/@media screen and \(max-width: 760px\)/.test(CSS), '휴대폰 규칙(screen 으로 묶어 인쇄는 표 그대로)');
  ok(!/@media \(max-width/.test(CSS), 'screen 으로 묶지 않은 폭 규칙은 인쇄에도 걸려요');
  ok(/@media print/.test(CSS), '인쇄 규칙');
  const print = CSS.slice(CSS.indexOf('@media print'));
  has(print, '.pg-red-flags-tools', '인쇄 버튼 줄 숨김');
  has(print, '.pg-red-flags-src', '접힌 출처 숨김');
  has(print, 'order: -1', '119 를 맨 위로');
  ok(!/!important/.test(print.replace(/\/\*[\s\S]*?\*\//g, '')), '인쇄 규칙에 !important 없음');
  /* 위기 줄(109·1577-0199)은 종이에서도 멀리서 읽히게 10pt 이상, 번호는 굵게 */
  const m = /\.notice-crisis\s*\{([^}]*)\}/.exec(print);
  ok(m, '인쇄에서 위기 줄 규칙');
  const pt = /font-size:\s*([\d.]+)pt/.exec(m[1]);
  ok(pt && Number(pt[1]) >= 10, '위기 줄 글자 크기: ' + (pt && pt[1]));
  ok(/\.notice-crisis a\s*\{[^}]*font-weight:\s*(8|9)00/.test(print), '위기 줄 번호 굵게');
});

test('스타일: 화면의 열 머리·"당장 위험하면"은 보기 설정 글자 크기(--fs-body)를 따라가고, 휴대폰 할 일 속 119 는 44px 높이', function () {
  const screen = CSS.slice(0, CSS.indexOf('@media print')).replace(/\/\*[\s\S]*?\*\//g, '');
  ok(/\.pg-red-flags-table th\s*\{[^}]*font-size:\s*calc\(var\(--fs-body\)/.test(screen), '열 머리');
  const nowL = screen.match(/\.pg-red-flags-now-l\s*\{[^}]*\}/g) || [];
  ok(nowL.length >= 2, '넓은 화면·휴대폰 규칙');
  nowL.forEach(function (r) { ok(!/font-size:\s*[\d.]+px/.test(r) && /font-size:\s*calc\(var\(--fs-body\)/.test(r), '당장 위험하면: ' + r); });
  const tel = /\.pg-red-flags-act a\[href\^="tel:"\]\s*\{\s*display:\s*inline-block;([^}]*)\}/.exec(screen);
  ok(tel, '휴대폰 할 일 속 119 규칙');
  const pad = /padding:\s*(\d+)px/.exec(tel[1]);
  ok(pad && Number(pad[1]) >= 10, '위아래 여백 10px 이상(글자 24 + 20 = 44): ' + (pad && pad[1]));
});

test('화면 코드: 모두에게 같은 표(저장소·역할·입력을 읽지 않음), 외부 요청 없음, node 와 브라우저 겸용', function () {
  const code = JS.replace(/\/\*[\s\S]*?\*\//g, '');
  ['localStorage', 'sessionStorage', '.store', 'role()', 'jhb.ui.home.role', 'fetch(', 'XMLHttpRequest', 'innerHTML = ctx.query', 'location.search'].forEach(function (w) {
    not(code, w, '화면 코드');
  });
  eq(page.id, 'red-flags');
  eq(typeof page.staticHtml, 'function');
  eq(typeof page.render, 'function');
});
