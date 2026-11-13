/* tools/check-content.cjs 의 checkDoc 과 tools/checks/*.cjs 테스트:
   일부러 틀린 예시 글로 오류(차단)·경고가 잡히는지, 올바른 예시는 0건인지 확인해요. */
const path = require('path');
const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const { checkDoc } = require('../tools/check-content.cjs');

const TODAY = '2026-11-13';
const PAD = '잠이 바뀌는 것은 흔한 신호예요. 일정한 시간에 자고 일어나는 습관이 도움이 될 수 있어요. 낮잠이 길어지면 밤잠이 흔들리기 쉬워요. ';
const BODY = [
  '## 한 문장으로', '',
  '잠은 회복의 바탕이에요. 잠이 흔들리면 다른 증상도 함께 흔들리기 쉬워요.[^1]', '',
  '## 얼마나 흔한가', '',
  '조사에 따라 당사자의 30~80%가 잠 문제를 겪는다고 보고돼요.[^1] ' + PAD.repeat(8), '',
  '::: research 최신 연구',
  '수면 인지행동치료가 도움이 될 수 있다는 연구가 이어지고 있어요.[^2]',
  ':::', '',
  '## 더 읽을 글', '',
  '- [수면](#/a/sleep)',
  '- [재발의 조기 경고 신호](#/a/relapse-signs)', ''
].join('\n');
const GOOD_POINTS = [
  '잠과 조현병의 관계를 다룬 시험용 글이에요.',
  '당사자의 30~80%가 잠 문제를 겪는다고 보고돼요.',
  '잠이 크게 바뀌면 담당 의사에게 알려요.'
];

/* 글 한 편 만들기. meta 의 값이 null 이면 그 줄을 빼고, 배열이면 목록으로 써요. */
function mk(meta, body) {
  const fm = Object.assign({
    title: '시험용 글', section: '4', order: '99', summary: '검사기 시험용 요약이에요.', tags: '시험, 수면',
    updated: '2026-11-13', evidence: '연구'
  }, meta || {});
  let s = '---\n';
  Object.keys(fm).forEach(function (k) {
    const v = fm[k];
    if (v == null) return;
    if (Array.isArray(v)) s += k + ':\n' + v.map(function (x) { return '  - ' + x; }).join('\n') + '\n';
    else s += k + ': ' + v + '\n';
  });
  s += 'sources:\n  - 시험 기관 | 시험 출처 하나 | 2025 | https://example.org/a\n  - 시험 기관 | 시험 출처 둘 | 2024 | https://example.org/b\n';
  s += '---\n';
  return s + (body == null ? BODY : body);
}
function run(meta, body, info) { return checkDoc(mk(meta, body), Object.assign({ today: TODAY }, info || {})); }
function anyHas(list, sub) { return list.some(function (x) { return x.indexOf(sub) >= 0; }); }
function hasErr(r, sub) { ok(anyHas(r.errors, sub), '오류에 "' + sub + '" 가 있어야 해요. 지금 ' + JSON.stringify(r.errors)); }
function noErr(r) { eq(r.errors, [], '오류 0건이어야 해요'); }
function hasWarn(r, sub) { ok(anyHas(r.warnings, sub), '경고에 "' + sub + '" 가 있어야 해요. 지금 ' + JSON.stringify(r.warnings)); }
function noWarn(r, sub) { ok(!anyHas(r.warnings, sub), '경고에 "' + sub + '" 가 없어야 해요. 지금 ' + JSON.stringify(r.warnings)); }

/* 약 카드 */
const CARD_ROWS = [
  ['계열', '2세대 · 부분 작용제[^1]'],
  ['제형', '먹는 약 · 장기지속형 주사 있음[^2]'],
  ['체중·대사', '적은 편[^1]'],
  ['추체외로 증상·좌불안석', '중간(좌불안석이 흔한 편)[^1]'],
  ['프로락틴', '적은 편[^1]'],
  ['졸림', '적은 편[^2]'],
  ['QT 연장', '자료 부족'],
  ['기립성 저혈압', '자료 부족'],
  ['꼭 알아둘 것', '가만히 있지 못하는 느낌이 들면 담당 의사에게 알려요.[^1]']
];
function card(rows, extra) {
  return [
    '## 약 카드', '',
    '| 항목 | 내용 |', '|---|---|'
  ].concat(rows.map(function (r) { return '| ' + r[0] + ' | ' + r[1] + ' |'; })).concat([
    '', (extra != null ? extra : '같은 약이라도 사람마다 반응이 달라요. 이 표로 약을 고르거나 바꾸지 말고 담당 의사와 상의하세요.'), ''
  ]).join('\n');
}
function drugBody(rows, extra) {
  return BODY.replace('## 얼마나 흔한가', card(rows || CARD_ROWS, extra) + '\n## 얼마나 흔한가');
}
function withRow(name, value) {
  return CARD_ROWS.map(function (r) { return r[0] === name ? [name, value] : r; });
}

/* ---------- 올바른 예시: 0건 ---------- */

test('올바른 글: 오류·경고 0건', function () {
  const r = run({ points: GOOD_POINTS });
  eq(r, { errors: [], warnings: [] });
});

test('올바른 글: points 없이 ## 한 문장으로 만 있어도 0건', function () {
  eq(run(), { errors: [], warnings: [] });
});

test('올바른 자주 묻는 질문(15분류, ## 짧은 답): 0건', function () {
  const body = BODY.replace('## 한 문장으로', '## 짧은 답');
  eq(run({ section: '15', tags: 'FAQ, 수면' }, body), { errors: [], warnings: [] });
});

test('올바른 약 카드(7분류): 0건', function () {
  eq(run({ section: '7', points: GOOD_POINTS }, drugBody()), { errors: [], warnings: [] });
});

test('올바른 응급 글: 119 와 warn 콜아웃이 있으면 0건', function () {
  const body = BODY + '\n::: warn 바로 연락할 신호\n높은 열과 함께 몸이 굳으면 바로 **119**에 연락해요.\n:::\n';
  eq(run({ tags: '시험, 응급' }, body), { errors: [], warnings: [] });
});

test('올바른 위기 글: 109·1577-0199 와 points 셋째 줄 번호가 있으면 0건', function () {
  const body = BODY + '\n::: crisis\n지금 위험하다면 **109**, **1577-0199**, **119** 에 연락해요. 자살 생각이 들면 혼자 견디지 말아요. 자해 충동도 말해도 돼요. 자살예방상담은 늘 열려 있어요.\n:::\n';
  const pts = [GOOD_POINTS[0], GOOD_POINTS[1], '지금 힘들면 109나 1577-0199에 연락해요.'];
  eq(run({ tags: '시험, 위기', points: pts }, body), { errors: [], warnings: [] });
});

test('content/ 밖 경로여도 frontmatter section 으로 분류를 알아요', function () {
  const a = run({ section: '15', tags: 'FAQ' }, BODY, { path: '.claude/work/drafts/15-faq/faq-x.md' });
  hasWarn(a, '15분류 글인데 ## 짧은 답');
  const b = run({ section: '4' }, BODY, { path: '.claude/work/drafts/15-faq/faq-x.md' });
  eq(b, { errors: [], warnings: [] });
});

test('기존 검사는 그대로: 각주 범위·금지 표현·위기 전화', function () {
  hasErr(run({}, BODY + '\n범위 밖 각주예요.[^3]\n'), '출처 범위');
  hasErr(run({}, BODY + '\n좋아지면 약을 끊어도 돼요.\n'), '임의 중단 권유');
  hasErr(run({ tags: '위기' }), '위기 글인데 본문에 109 없음');
  hasErr(run({ section: null }), 'frontmatter에 section 없음');
});

/* ---------- 오류(차단) ---------- */

test('오류 1: 응급 태그인데 본문에 119 없음', function () {
  const r = run({ tags: '시험, 응급' }, BODY + '\n::: warn 바로 연락할 신호\n열이 높으면 바로 응급실로 가요.\n:::\n');
  hasErr(r, '응급 태그 글인데 본문에 119 없음');
  /* "1190명" 같은 숫자는 119 로 치지 않아요 */
  hasErr(run({ tags: '응급' }, BODY + '\n1190명이 참여했어요.\n::: warn\n신호\n:::\n'), '본문에 119 없음');
});

test('오류 2: points 줄 수·길이·각주·링크·금지 표현', function () {
  hasErr(run({ points: GOOD_POINTS.slice(0, 2) }), '정확히 3줄');
  hasErr(run({ points: GOOD_POINTS.concat(['넷째 줄이에요.']) }), '정확히 3줄');
  hasErr(run({ points: [GOOD_POINTS[0], GOOD_POINTS[1], '가'.repeat(61)] }), '60자 초과(61자');
  noErr(run({ points: [GOOD_POINTS[0], GOOD_POINTS[1], '가'.repeat(60)] }));
  hasErr(run({ points: [GOOD_POINTS[0], '당사자의 30~80%가 잠 문제를 겪어요.[^1]', GOOD_POINTS[2]] }), '각주 표시');
  hasErr(run({ points: [GOOD_POINTS[0], GOOD_POINTS[1], '다음 글: [수면](#/a/sleep)'] }), '링크');
  hasErr(run({ points: [GOOD_POINTS[0], GOOD_POINTS[1], '좋아지면 약을 끊어도 돼요.'] }), '임의 중단 권유');
  hasErr(run({ points: [GOOD_POINTS[0], GOOD_POINTS[1], '**꼭** 의사에게 알려요.'] }), '굵게');
  hasErr(run({ points: '한 줄로만 썼어요' }), '목록');
});

test('오류 3: reviewed 형식', function () {
  hasErr(run({ reviewed: '2026-1-5' }), 'reviewed 는 YYYY-MM-DD');
  hasErr(run({ reviewed: '2026.11.01' }), 'reviewed 는 YYYY-MM-DD');
  hasErr(run({ reviewed: '' }), 'reviewed 는 YYYY-MM-DD');
  hasErr(run({ reviewed: '2026-02-30' }), '달력에 없음');
  eq(run({ reviewed: '2026-11-01' }), { errors: [], warnings: [] });
});

test('오류 4: "극단적 선택" 표현', function () {
  hasErr(run({}, BODY + '\n극단적 선택이라는 말을 쓰지 않아요.\n'), '극단적 선택');
  hasErr(run({}, BODY + '\n극단적인 선택을 했다는 보도가 있었어요.\n'), '극단적인 선택');
  hasErr(run({ summary: '극단 선택을 다뤄요.' }), '요약에');
  hasErr(run({ points: [GOOD_POINTS[0], GOOD_POINTS[1], '극단적 선택을 막는 법을 알아요.'] }), '극단적 선택');
  /* "극단적인 형태"는 괜찮아요 */
  noErr(run({}, BODY + '\n극단적인 형태가 긴장증이에요.\n'));
});

test('오류 5: 약 카드 값 낱말·mg·행 이름·각주·표', function () {
  hasErr(run({ section: '7' }, drugBody(withRow('체중·대사', '보통[^1]'))), '"체중·대사" 칸은 적은 편·중간·많은 편·자료 부족');
  hasErr(run({ section: '7' }, drugBody(withRow('졸림', '많음[^1]'))), '"졸림" 칸은');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '하루 10 mg 이 흔해요.'))), '용량 단위');
  hasErr(run({ section: '7' }, drugBody(withRow('프로락틴', '적은 편'))), '출처 각주가 없음');
  hasErr(run({ section: '7' }, drugBody(CARD_ROWS.filter(function (r) { return r[0] !== 'QT 연장'; }))), '"QT 연장" 행이 없음');
  hasErr(run({ section: '7' }, drugBody(CARD_ROWS.concat([['효과 순위', '1위']]))), '정해진 행이 아님');
  const renamed = CARD_ROWS.map(function (r) { return r[0] === '체중·대사' ? ['체중/대사', '많은 편[^1]'] : r; });
  const rr = run({ section: '7' }, drugBody(renamed));
  hasErr(rr, '정해진 행이 아님: "체중/대사"');
  hasErr(rr, '"체중·대사" 행이 없음');
  hasErr(run({ section: '7' }, BODY.replace('## 얼마나 흔한가', '## 약 카드\n\n표는 나중에 넣어요.\n\n## 얼마나 흔한가')), '표가 없음');
  /* 자료 부족은 각주 없이도 괜찮아요 */
  noErr(run({ section: '7' }, drugBody(withRow('프로락틴', '자료 부족'))));
});

test('오류 5-2: 약 카드 용량 단위는 ㎎·㎍·mcg·μg 도 잡고, 메시지에는 단위만', function () {
  const r = run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '10mg 부터 시작해요.[^1]')));
  hasErr(r, '용량 단위("mg")');
  ok(!anyHas(r.errors, '0mg'), '메시지에 앞 숫자가 붙으면 안 돼요. 지금 ' + JSON.stringify(r.errors));
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '5㎎ 알약이 있어요.[^1]'))), '용량 단위("㎎")');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '20㎍ 이에요.[^1]'))), '용량 단위("㎍")');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '100mcg 이에요.[^1]'))), '용량 단위("mcg")');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '50 μg 이에요.[^1]'))), '용량 단위("μg")');
  hasErr(run({ section: '7' }, drugBody(withRow('졸림', '중간(25 밀리그램이면 덜해요)[^1]'))), '용량 단위("밀리그램")');
  /* 낱말 속 mg 글자는 단위로 치지 않아요 */
  noErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', 'Img 검사 결과를 담당 의사와 봐요.[^1]'))));
});

/* ---------- 경고(차단 아님) ---------- */

test('경고 1: 자살·자해가 3번 이상인데 위기 태그 없음', function () {
  const body = BODY + '\n자살 생각이 들 때가 있어요. 자해를 한 적이 있다면 말해도 돼요. 자살 생각은 지나가기도 해요.\n';
  const r = run({}, body);
  noErr(r);
  hasWarn(r, '"자살·자해"가 3번');
  noWarn(run({}, BODY + '\n자살 생각이 들 때가 있어요. 자해를 한 적이 있다면 말해도 돼요.\n'), '자살·자해');
  /* 기관·전화·법 이름(자살예방상담전화, 자살예방센터, 자살예방법)은 세지 않아요 */
  noWarn(run({}, BODY + '\n자살예방상담전화 109, 자살예방센터, 자살예방법을 소개해요. 자살 예방 사업도 있어요. 자해 뒤 돌봄도 다뤄요.\n'), '자살·자해');
});

test('경고 2: 본문에 내부 링크(#/a/)가 하나도 없음', function () {
  const body = BODY.replace('- [수면](#/a/sleep)', '- 수면').replace('- [재발의 조기 경고 신호](#/a/relapse-signs)', '- [바깥 자료](https://example.org)');
  const r = run({}, body);
  noErr(r);
  hasWarn(r, '다른 글로 가는 링크');
});

test('경고 3: points 의 숫자가 본문에 없음', function () {
  const r = run({ points: [GOOD_POINTS[0], '당사자의 95%가 잠 문제를 겪어요.', GOOD_POINTS[2]] });
  noErr(r);
  hasWarn(r, '숫자 "95"');
  noWarn(run({ points: GOOD_POINTS }), '숫자');
  /* 각주 표시([^1])나 더 긴 숫자("30") 안의 숫자는 본문에 있는 것으로 치지 않아요 */
  hasWarn(run({ points: [GOOD_POINTS[0], '1명 가운데 잠 문제를 겪는 사람이 많아요.', GOOD_POINTS[2]] }), '숫자 "1"');
  hasWarn(run({ points: [GOOD_POINTS[0], '당사자의 3%가 잠 문제를 겪어요.', GOOD_POINTS[2]] }), '숫자 "3"');
  noWarn(run({ points: [GOOD_POINTS[0], '당사자의 30%가 넘게 잠 문제를 겪어요.', GOOD_POINTS[2]] }), '숫자');
});

test('경고 4: 15분류에 points / 15분류가 아닌데 요약 수단 없음', function () {
  const faq = BODY.replace('## 한 문장으로', '## 짧은 답');
  hasWarn(run({ section: '15', tags: 'FAQ', points: GOOD_POINTS }, faq), '15분류(자주 묻는 질문)는 ## 짧은 답');
  const noSum = BODY.replace('## 한 문장으로', '## 들어가며');
  hasWarn(run({}, noSum), '요약 수단이 없음');
  noWarn(run({ points: GOOD_POINTS }, noSum), '요약 수단');
});

test('경고 5: 11분류의 "YYYY년 기준"이 올해보다 2년 이상 이전', function () {
  const body = BODY + '\n지원 금액은 2023년 6월 기준이에요. 다른 금액은 2025년 기준이에요.\n';
  const r = run({ section: '11', tags: '제도' }, body);
  noErr(r);
  hasWarn(r, '"2023년 6월 기준"');
  noWarn(r, '2025년');
  noWarn(run({ section: '11', tags: '제도' }, BODY + '\n2025년 기준이에요.\n'), '기준 연도');
  noWarn(run({ section: '4' }, body), '기준 연도');
  /* 올해는 info.today 로 정해요 */
  hasWarn(run({ section: '11', tags: '제도' }, BODY + '\n2025년 기준이에요.\n', { today: '2027-01-02' }), '"2025년 기준"');
});

test('경고 6: 응급 태그인데 warn 콜아웃 없음', function () {
  const r = run({ tags: '응급' }, BODY + '\n열이 높고 몸이 굳으면 **119** 에 연락해요.\n');
  noErr(r);
  hasWarn(r, 'warn 콜아웃이 없음');
});

test('경고 7: 위기 글의 points 에 109·1577-0199 없음', function () {
  const body = BODY + '\n::: crisis\n**109**, **1577-0199**, **119**\n:::\n';
  hasWarn(run({ tags: '위기', points: GOOD_POINTS }, body), '109·1577-0199 가 없음');
});

test('경고 8: points 의 단정·지시, 약 글의 용량·중단 낱말', function () {
  hasWarn(run({ points: [GOOD_POINTS[0], GOOD_POINTS[1], '약은 평생 먹어야 해요.'] }), '단정·지시');
  hasWarn(run({ section: '7', points: [GOOD_POINTS[0], GOOD_POINTS[1], '좋아져도 스스로 중단하지 않아요.'] }, drugBody()), '용량·중단');
  hasWarn(run({ section: '7', points: ['효과가 상위권인 2세대 약이에요.', GOOD_POINTS[1], GOOD_POINTS[2]] }, drugBody()), '효능 순위·추천');
});

test('경고 9: reviewed 가 오늘보다 뒤', function () {
  const r = run({ reviewed: '2026-12-01' });
  noErr(r);
  hasWarn(r, 'reviewed 가 오늘');
});

test('경고 10: 약 카드 순서·계열·제형·고정 문구·추천 낱말·7분류 밖', function () {
  const swapped = [CARD_ROWS[1], CARD_ROWS[0]].concat(CARD_ROWS.slice(2));
  hasWarn(run({ section: '7' }, drugBody(swapped)), '행 순서');
  hasWarn(run({ section: '7' }, drugBody(withRow('계열', '3세대[^1]'))), '"계열" 칸');
  hasWarn(run({ section: '7' }, drugBody(withRow('제형', '알약[^2]'))), '"제형" 칸');
  hasWarn(run({ section: '7' }, drugBody(null, '')), '고정 문구');
  hasWarn(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '체중이 걱정되는 사람에게 추천해요.'))), '"추천"');
  hasWarn(run({ section: '4' }, drugBody()), '7분류 개별 약 글에만');
});

test('경고 11: 약 카드의 자유 칸 — 복용 횟수·상호작용·상품명, 꼭 알아둘 것 각주', function () {
  hasWarn(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '하루 1번 먹는 약이에요.[^1]'))), '복용 횟수');
  hasWarn(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '하루 두 번 먹어요.[^1]'))), '복용 횟수');
  hasWarn(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '1일 2회 먹어요.[^1]'))), '복용 횟수');
  hasWarn(run({ section: '7' }, drugBody(withRow('졸림', '중간(자기 전에 한 번 먹으면 덜해요)[^2]'))), '복용 횟수');
  hasWarn(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '다른 약과 상호작용이 많아 함께 먹으면 안 돼요.[^1]'))), '상호작용');
  hasWarn(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '상품명이 여러 개예요.[^1]'))), '상품명');
  const r = run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '정기 혈액 검사가 꼭 필요한 약이에요.')));
  noErr(r);
  hasWarn(r, '"꼭 알아둘 것" 칸에 출처 각주가 없음');
  /* "하루 종일" 같은 말은 복용 횟수가 아니에요 */
  noWarn(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '하루 종일 졸리면 담당 의사에게 알려요.[^1]'))), '복용 횟수');
});

/* ---------- 명령줄 출력 형식 ---------- */

test('명령줄: ✓·! 줄, "경고 K건", 마지막 줄 형식, 종료 코드', function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jhb-checks-'));
  const tool = path.join(__dirname, '..', 'tools', 'check-content.cjs');
  try {
    const warnOnly = path.join(dir, 'warn-only.md');
    fs.writeFileSync(warnOnly, mk({}, BODY.replace('## 한 문장으로', '## 들어가며')));
    const a = cp.spawnSync(process.execPath, [tool, warnOnly], { encoding: 'utf8' });
    eq(a.status, 0, '경고만 있으면 종료 코드 0');
    has(a.stdout, '✓ ');
    has(a.stdout, '! ');
    has(a.stdout, '경고 1건');
    const lines = a.stdout.trim().split(/\r?\n/);
    eq(lines[lines.length - 1], '1편 검사, 문제 0건');

    const bad = path.join(dir, 'bad.md');
    fs.writeFileSync(bad, mk({ tags: '응급' }, BODY + '\n::: warn\n신호\n:::\n'));
    const b = cp.spawnSync(process.execPath, [tool, bad], { encoding: 'utf8' });
    eq(b.status, 1, '오류가 있으면 종료 코드 1');
    has(b.stdout, '✗ ');
    has(b.stdout, '본문에 119 없음');
    const blines = b.stdout.trim().split(/\r?\n/);
    eq(blines[blines.length - 1], '1편 검사, 문제 1건');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
