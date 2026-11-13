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

test('임의 중단 권유: 앞에 "약"이 없어도 동사 꼴로 잡고, 묻는 꼴·통념 인용은 빼요', function () {
  ['증상이 나아지면 끊어도 괜찮아요.', '좋아지면 끊어도 돼요.', '증상이 없으면 그만 먹어도 괜찮아요.', '졸리면 중단해도 됩니다.',
    '한 달쯤 안 먹어도 좋아요.', '좋아지면 약을 줄여도 돼요.', '약을 빼도 괜찮아요.', '좋아지면 약을 끊어도 돼요.', '안정되면 끊어도 된다.'
  ].forEach(function (s) { hasErr(run({}, BODY + '\n' + s + '\n'), '임의 중단 권유'); });
  ['끊어도 되는지는 담당 의사와 상의해요.', '좋아지면 끊어도 돼요?', '끊어도 괜찮을까요? 하고 묻는 사람이 많아요.',
    '"안정되면 끊어도 된다"는 통념과 달리 다시 나빠지는 일이 많았어요.', '끊어도 된다고 여기기 쉬워요.',
    '자기 상태에 맞게 더 줄여도 돼요.', '이번 주 일정에서 빼도 되는 것 하나 지우기', '약을 줄여도 되지 않을까 싶은 마음이 들어요.'
  ].forEach(function (s) { noErr(run({}, BODY + '\n' + s + '\n')); });
});

test('바로 연락할 신호 표(부작용 총론): 생성기 tools/gen/red-flags.cjs 와 같은 판정을 글 검사에서도 오류로', function () {
  const rf = require('../tools/gen/red-flags.cjs');
  const slugs = rf.contentSlugs(path.join(__dirname, '..'));
  const file = slugs.get(rf.SOURCE_SLUG);
  ok(file, '원천 글');
  const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const base = checkDoc(text, { today: TODAY, path: rel });
  ok(!anyHas(base.errors, '바로 연락할 신호'), '지금 글은 통과해야 해요: ' + JSON.stringify(base.errors));
  /* 할 일을 누그러뜨림 → 생성기도 검사기도 오류 */
  const lines = text.split('\n');
  const at = lines.findIndex(function (l) { return /^\|.*\|\s*오늘 안에 [^|]*연락/.test(l); });
  ok(at > 0, '오늘 안에 연락 줄');
  const soft = lines.slice(); soft[at] = soft[at].replace(/\|\s*오늘 안에 [^|]*\|/, '| 며칠 지켜봐요. |');
  const softText = soft.join('\n');
  ok(rf.extract(softText, { slug: rf.SOURCE_SLUG }).errors.length > 0, '생성기가 멈춰요');
  hasErr(checkDoc(softText, { today: TODAY, path: rel }), '바로 연락할 신호');
  /* 열 이름 바꿈, 소절 제목 바꿈, 표 뒤 안전 문장 빠짐 */
  hasErr(checkDoc(text.replace('| 신호 | 의심되는 상태 | 할 일 | 자세한 글 |', '| 신호 | 상태 | 할 일 | 자세한 글 |'), { today: TODAY, path: rel }), '표 열 이름');
  hasErr(checkDoc(text.replace('## 바로 연락할 신호', '## 곧바로 연락할 신호'), { today: TODAY, path: rel }), '소절을 찾지 못했어요');
  hasErr(checkDoc(text.replace('스스로 끊지 말고', '혼자 정하지 말고'), { today: TODAY, path: rel }), '표 바로 뒤 문단');
  /* 다른 글에는 걸지 않아요 */
  noErr(run({}, BODY, { path: 'content/04-x/other.md' }));
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
  hasErr(run({ section: '7' }, drugBody(withRow('프로락틴', '적은 편'))), '출처 각주가 없어요');
  hasErr(run({ section: '7' }, drugBody(CARD_ROWS.filter(function (r) { return r[0] !== 'QT 연장'; }))), '"QT 연장" 행이 없어요');
  hasErr(run({ section: '7' }, drugBody(CARD_ROWS.concat([['효과 순위', '1위']]))), '정해진 행이 아니에요');
  const renamed = CARD_ROWS.map(function (r) { return r[0] === '체중·대사' ? ['체중/대사', '많은 편[^1]'] : r; });
  const rr = run({ section: '7' }, drugBody(renamed));
  hasErr(rr, '정해진 행이 아니에요: "체중/대사"');
  hasErr(rr, '"체중·대사" 행이 없어요');
  hasErr(run({ section: '7' }, BODY.replace('## 얼마나 흔한가', '## 약 카드\n\n표는 나중에 넣어요.\n\n## 얼마나 흔한가')), '표가 없어요');
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

test('경고 10: 약 카드 순서·계열·제형·등수·7분류 밖(생성기는 통과하니 경고만)', function () {
  const swapped = [CARD_ROWS[1], CARD_ROWS[0]].concat(CARD_ROWS.slice(2));
  hasWarn(run({ section: '7' }, drugBody(swapped)), '행 순서');
  hasWarn(run({ section: '7' }, drugBody(withRow('계열', '3세대[^1]'))), '"계열" 칸');
  hasWarn(run({ section: '7' }, drugBody(withRow('제형', '알약[^2]'))), '"제형" 칸');
  const r = run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '효과 1등 약은 따로 없어요.[^1]')));
  noErr(r);
  hasWarn(r, '"1등"');
  hasWarn(run({ section: '4' }, drugBody()), '7분류 개별 약 글에만');
});

test('오류 5-5: 약 카드의 안전 고지(고정 문구)와 "꼭 알아둘 것" 각주는 검사기만 오류(생성기보다 엄해요)', function () {
  const a = run({ section: '7' }, drugBody(null, ''));
  hasErr(a, '고정 문구');
  noWarn(a, '고정 문구');
  const b = run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '정기 혈액 검사가 꼭 필요한 약이에요.')));
  hasErr(b, '"꼭 알아둘 것" 칸에 출처 각주가 없어요');
  noWarn(b, '출처 각주');
  /* 고정 문구는 표 아래 어디에 있어도 돼요(소절 안이면) */
  noErr(run({ section: '7' }, drugBody(null, '참고: 같은 약이라도 사람마다 반응이 달라요. 이 표로 약을 고르거나 바꾸지 말고 담당 의사와 상의하세요.')));
});

test('오류 5-6: content/07-medication/ 의 글은 약 카드가 없어도 파일 이름 꼴, 비슷한 소절 제목은 오류(생성기가 못 읽어 화면에서 빠짐)', function () {
  const noCard = BODY + '\n## 약 정리\n\n표 없이 써요.\n';
  hasErr(run({ section: '7' }, noCard, { path: 'content/07-medication/Bad_Slug.md' }), '파일 이름(slug) "Bad_Slug"');
  noErr(run({ section: '7' }, noCard, { path: 'content/07-medication/good-slug.md' }));
  /* 07 밖이나 경로가 없으면 약 카드 없는 글의 파일 이름은 보지 않아요(다른 검사 몫) */
  noErr(run({ section: '7' }, noCard, { path: '.claude/work/drafts/Bad_Slug.md' }));
  noErr(run({ section: '7' }, noCard));
  /* 윈도 경로·절대 경로도 같은 기준 */
  hasErr(run({ section: '7' }, noCard, { path: path.join(__dirname, '..', 'content', '07-medication', 'Bad_Slug.md') }), 'Bad_Slug');
  const near = drugBody().replace('## 약 카드\n', '## 약카드\n');
  hasErr(run({ section: '7' }, near, { path: 'content/07-medication/samplezapine.md' }), '"## 약 카드" 그대로');
  const w = run({ section: '7' }, near, { path: '.claude/work/drafts/samplezapine.md' });
  noErr(w);
  hasWarn(w, '"## 약 카드" 그대로');
  hasErr(run({ section: '7' }, drugBody().replace('## 약 카드\n', '## 약 카드 (요약)\n'), { path: 'content/07-medication/samplezapine.md' }), '"## 약 카드" 그대로');
});

test('오류 5-7: 약 카드가 있는 글이 하나도 없으면 전체 검사도 오류(생성기가 멈춰요)', function () {
  const cc = require('../tools/check-content.cjs');
  const withCard = mk({ section: '7' }, drugBody());
  const without = mk({ section: '7' }, BODY);
  eq(cc.medsSetErrors([{ rel: 'content/07-medication/a.md', text: withCard }, { rel: 'content/07-medication/b.md', text: without }]), []);
  hasErr({ errors: cc.medsSetErrors([{ rel: 'content/07-medication/b.md', text: without }, { rel: 'content/04-x/c.md', text: withCard }]) }, '약 카드("## 약 카드")가 있는 글이 하나도 없어요');
});

test('오류 5-3: 약 카드의 넣지 않는 말은 오류 — 복용 횟수·상호작용·상품명·추천·순위·가격·임신·"용량"(자유 칸·괄호 설명도)', function () {
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '하루 1번 먹는 약이에요.[^1]'))), '복용 횟수("하루 1번")');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '하루 두 번 먹어요.[^1]'))), '복용 횟수');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '1일 2회 먹어요.[^1]'))), '복용 횟수');
  hasErr(run({ section: '7' }, drugBody(withRow('졸림', '중간(자기 전에 한 번 먹으면 덜해요)[^2]'))), '복용 횟수');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '다른 약과 상호작용이 많아 함께 먹으면 안 돼요.[^1]'))), '함께 먹는 약 판정("상호작용")');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '상품명이 여러 개예요.[^1]'))), '상품명');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '리스펜®으로도 나와요.[^1]'))), '상품명("®")');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '체중이 걱정되는 사람에게 추천해요.'))), '권하는 말·줄 세우기("추천")');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '이런 사람에게 잘 맞아요.[^1]'))), '"이런 사람에게"');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '약값이 싼 편이에요.[^1]'))), '값 비교');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '임신 중이면 담당 의사와 상의해요.[^1]'))), '임부 안전 등급');
  hasErr(run({ section: '7' }, drugBody(withRow('체중·대사', '중간(용량이 크면 늘어요)[^1]'))), '용량 이야기');
  /* 칸에 넣은 링크도 화면에는 글자로 나가니 글자를 봐요 */
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '[임신과 약](#/a/pregnancy-parenting)도 함께 봐요.[^1]'))), '임부 안전 등급');
  /* "하루 종일" 같은 말은 복용 횟수가 아니에요 */
  noErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '하루 종일 졸리면 담당 의사에게 알려요.[^1]'))));
});

test('오류 5-4: 약 카드 칸 길이(꼭 알아둘 것 140자, 나머지 60자, 띄어쓰기 없이 24자)·빈 칸·머리 줄·updated·파일 이름', function () {
  const note140 = '가'.repeat(20) + (' ' + '나'.repeat(19)).repeat(6);
  eq(note140.length, 140);
  noErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', note140 + '[^1]'))));
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', note140 + '다[^1]'))), '"꼭 알아둘 것" 칸이 너무 길어요(141자, 140자까지)');
  hasErr(run({ section: '7' }, drugBody(withRow('제형', '먹는 약 · 장기지속형 주사 있음 ' + '긴 설명 '.repeat(10) + '[^2]'))), '"제형" 칸이 너무 길어요(68자, 60자까지)');
  noErr(run({ section: '7' }, drugBody(withRow('체중·대사', '적은 편 ' + '가'.repeat(24) + '[^1]'))));
  hasErr(run({ section: '7' }, drugBody(withRow('체중·대사', '적은 편 ' + '가'.repeat(25) + '[^1]'))), '띄어쓰기 없이 25자');
  hasErr(run({ section: '7' }, drugBody(withRow('계열', ''))), '"계열" 칸이 비었어요');
  hasErr(run({ section: '7' }, drugBody(withRow('꼭 알아둘 것', '[^1]'))), '"꼭 알아둘 것" 칸이 비었어요');
  hasErr(run({ section: '7' }, drugBody().replace('| 항목 | 내용 |', '| 이름 | 값 |')), '머리 줄은 "| 항목 | 내용 |"');
  hasErr(run({ section: '7', updated: '2026-13-01' }, drugBody()), 'updated "2026-13-01"');
  hasErr(run({ section: '7' }, drugBody(), { path: 'content/07-medication/Bad Slug.md' }), '파일 이름(slug) "Bad Slug"');
  noErr(run({ section: '7' }, drugBody(), { path: 'content/07-medication/samplezapine.md' }));
});

/* ---------- 약 카드: 생성기(tools/gen/meds.cjs)와 같은 판정 ----------
   표본은 여기 한 곳에 두고 양쪽에 넣어요. reject = 생성기가 멈추는 표(검사기는 오류), pass = 생성기가 통과하는 표(검사기는 오류 0). */
const gen = require('../tools/gen/meds.cjs');
const drugCard = require('../tools/checks/drug-card.cjs');
/* 약 카드 소절(제목부터 고정 문구까지)을 통째로 뺀 본문 */
function dropCard(b) { return b.replace(/## 약 카드\n[\s\S]*?상의하세요\.\n/, ''); }
const CARD_SAMPLES = [
  /* 생성기가 멈추는 것 */
  ['reject', '값 낱말', { rows: withRow('체중·대사', '보통[^1]') }],
  ['reject', '값 낱말(조금)', { rows: withRow('졸림', '조금[^2]') }],
  ['reject', '부작용 칸 각주 없음', { rows: withRow('졸림', '많은 편') }],
  ['reject', '없는 출처 각주', { rows: withRow('졸림', '많은 편[^9]') }],
  ['reject', '용량 단위 mg', { rows: withRow('꼭 알아둘 것', '보통 10 mg 으로 시작해요.[^1]') }],
  ['reject', '용량 단위 ㎎', { rows: withRow('꼭 알아둘 것', '5㎎ 알약이 있어요.[^1]') }],
  ['reject', '용량 단위 ㎍', { rows: withRow('꼭 알아둘 것', '20㎍ 이에요.[^1]') }],
  ['reject', '용량 단위 mcg', { rows: withRow('꼭 알아둘 것', '100mcg 이에요.[^1]') }],
  ['reject', '용량 단위 μg', { rows: withRow('꼭 알아둘 것', '50 μg 이에요.[^1]') }],
  ['reject', '용량 단위 밀리그램', { rows: withRow('졸림', '중간(25 밀리그램이면 덜해요)[^1]') }],
  ['reject', '용량 단위 마이크로그램', { rows: withRow('꼭 알아둘 것', '몇 마이크로그램이에요.[^1]') }],
  ['reject', '"용량"', { rows: withRow('체중·대사', '중간(용량이 크면 늘어요)[^1]') }],
  ['reject', '복용 횟수 하루 1번', { rows: withRow('꼭 알아둘 것', '하루 1번 먹어요.[^1]') }],
  ['reject', '복용 횟수 하루 두 번', { rows: withRow('꼭 알아둘 것', '하루 두 번 먹어요.[^1]') }],
  ['reject', '복용 횟수 1일 2회', { rows: withRow('꼭 알아둘 것', '1일 2회 먹어요.[^1]') }],
  ['reject', '복용 횟수 아침에 한 번', { rows: withRow('꼭 알아둘 것', '아침에 한 번 먹어요.[^1]') }],
  ['reject', '복용 횟수(괄호 설명)', { rows: withRow('졸림', '중간(자기 전에 한 번 먹으면 덜해요)[^2]') }],
  ['reject', '추천', { rows: withRow('꼭 알아둘 것', '첫 약으로 추천돼요.[^1]') }],
  ['reject', '순위', { rows: withRow('꼭 알아둘 것', '효과 순위가 높아요.[^1]') }],
  ['reject', '3위', { rows: withRow('꼭 알아둘 것', '효과가 3위 안에 들어요.[^1]') }],
  ['reject', '별점', { rows: withRow('꼭 알아둘 것', '별점이 높아요.[^1]') }],
  ['reject', '가장 효과적인', { rows: withRow('꼭 알아둘 것', '가장 효과적인 약이에요.[^1]') }],
  ['reject', '이런 사람에게', { rows: withRow('꼭 알아둘 것', '이런 사람에게 맞아요.[^1]') }],
  ['reject', '가격', { rows: withRow('꼭 알아둘 것', '가격이 비싼 편이에요.[^1]') }],
  ['reject', '약값', { rows: withRow('꼭 알아둘 것', '약값이 싸요.[^1]') }],
  ['reject', '값이 싸', { rows: withRow('꼭 알아둘 것', '값이 싸요.[^1]') }],
  ['reject', '임신', { rows: withRow('꼭 알아둘 것', '임신 중에도 괜찮아요.[^1]') }],
  ['reject', '상호작용', { rows: withRow('꼭 알아둘 것', '다른 약과 상호작용이 많아요.[^1]') }],
  ['reject', '상호 작용', { rows: withRow('꼭 알아둘 것', '다른 약과 상호 작용이 있어요.[^1]') }],
  ['reject', '상품명', { rows: withRow('꼭 알아둘 것', '상품명이 여러 개예요.[^1]') }],
  ['reject', '®', { rows: withRow('꼭 알아둘 것', '리스펜®으로도 나와요.[^1]') }],
  ['reject', '™', { rows: withRow('꼭 알아둘 것', '어떤약™ 이에요.[^1]') }],
  ['reject', '링크 글자 속 임신', { rows: withRow('꼭 알아둘 것', '[임신과 약](#/a/pregnancy-parenting)도 봐요.[^1]') }],
  ['reject', '굵게 속 추천', { rows: withRow('꼭 알아둘 것', '**추천** 약은 없어요.[^1]') }],
  ['reject', '빈 칸(계열)', { rows: withRow('계열', '') }],
  ['reject', '빈 칸(각주만)', { rows: withRow('꼭 알아둘 것', '[^1]') }],
  ['reject', '띄어쓰기 없이 25자', { rows: withRow('체중·대사', '적은 편 ' + '가'.repeat(25) + '[^1]') }],
  ['reject', '60자 넘음', { rows: withRow('제형', '먹는 약 · 장기지속형 주사 있음 ' + '긴 설명 '.repeat(10) + '[^2]') }],
  ['reject', '61자(경계)', { rows: withRow('제형', '먹는 약 · 장기지속형 주사 있음 ' + '가나다라 '.repeat(8) + '마바[^2]') }],
  ['reject', '140자 넘음', { rows: withRow('꼭 알아둘 것', '말해요 '.repeat(40) + '[^1]') }],
  ['reject', '행 빠짐', { rows: CARD_ROWS.filter(function (r) { return r[0] !== 'QT 연장'; }) }],
  ['reject', '모르는 행', { rows: CARD_ROWS.concat([['효과', '좋아요[^1]']]) }],
  ['reject', '겹친 행', { rows: CARD_ROWS.concat([['졸림', '적은 편[^1]']]) }],
  ['reject', '3열 줄', { edit: function (b) { return b.replace('| 졸림 | 적은 편[^2] |', '| 졸림 | 적은 편[^2] | 덧말 |'); } }],
  ['reject', '머리 줄', { edit: function (b) { return b.replace('| 항목 | 내용 |', '| 이름 | 값 |'); } }],
  ['reject', '표 없음', { edit: function (b) { return b.replace(/\| 항목 \| 내용 \|[\s\S]*?\n\n/, '표는 나중에 넣어요.\n\n'); } }],
  ['reject', '### 소제목 뒤의 표(소절은 다음 제목 앞까지)', { edit: function (b) { return b.replace('## 약 카드\n', '## 약 카드\n\n### 표\n'); } }],
  ['reject', '약 카드 소절 둘', { edit: function (b) { return b.replace('## 얼마나 흔한가', card(CARD_ROWS) + '\n## 얼마나 흔한가'); } }],
  ['reject', 'updated 달력 꼴', { meta: { updated: '2026-13-01' } }],
  ['reject', 'title 없음', { meta: { title: null } }],
  ['reject', '파일 이름 꼴', { slug: 'Bad_Slug' }],
  ['reject', '약 카드 없는 07 글 + 틀린 파일 이름', { slug: 'Bad_Slug', edit: function (b) { return b.replace('## 약 카드\n', '## 약 정리\n'); } }],
  /* 흔한 한국어 꼴(복용 횟수·간격, 끊어도 된다는 말, 줄 세우기, 수유, 함께 먹는 약, 전각·폭 없는 빈칸) */
  ['reject', '복용 횟수 하루에 한 번', { rows: withRow('꼭 알아둘 것', '하루에 한 번 먹어요.[^1]') }],
  ['reject', '복용 횟수 하루에 두 번', { rows: withRow('꼭 알아둘 것', '하루에 두 번 나눠 먹어요.[^1]') }],
  ['reject', '복용 횟수 하루 한 알', { rows: withRow('꼭 알아둘 것', '하루 한 알이에요.[^1]') }],
  ['reject', '복용 횟수 매일 1번', { rows: withRow('꼭 알아둘 것', '매일 1번 먹어요.[^1]') }],
  ['reject', '복용 횟수 1정씩', { rows: withRow('꼭 알아둘 것', '1정씩 먹어요.[^1]') }],
  ['reject', '복용 횟수 2알', { rows: withRow('꼭 알아둘 것', '처음엔 2알로 시작해요.[^1]') }],
  ['reject', '복용 횟수 반 알', { rows: withRow('꼭 알아둘 것', '반 알로 시작해요.[^1]') }],
  ['reject', '주사 간격 4주에 한 번(제형)', { rows: withRow('제형', '먹는 약 · 장기지속형 주사 있음(4주에 한 번)[^2]') }],
  ['reject', '주사 간격 한 달에 1회(제형)', { rows: withRow('제형', '먹는 약 · 장기지속형 주사 있음(한 달에 1회)[^2]') }],
  ['reject', '주사 간격 2주마다', { rows: withRow('꼭 알아둘 것', '2주마다 맞는 주사가 있어요.[^1]') }],
  ['reject', '주사 간격 매달 한 번', { rows: withRow('꼭 알아둘 것', '매달 한 번 맞는 주사가 있어요.[^1]') }],
  ['reject', '끊어도 괜찮아요', { rows: withRow('꼭 알아둘 것', '증상이 나아지면 끊어도 괜찮아요.[^1]') }],
  ['reject', '그만 먹어도 돼요', { rows: withRow('꼭 알아둘 것', '좋아지면 그만 먹어도 돼요.[^1]') }],
  ['reject', '중단해도 좋아요', { rows: withRow('꼭 알아둘 것', '졸리면 중단해도 좋아요.[^1]') }],
  ['reject', '줄여도 돼요', { rows: withRow('꼭 알아둘 것', '살이 찌면 줄여도 돼요.[^1]') }],
  ['reject', '안 먹어도 괜찮아요', { rows: withRow('꼭 알아둘 것', '주사를 맞으면 약은 안 먹어도 괜찮아요.[^1]') }],
  ['reject', '제일 좋은', { rows: withRow('꼭 알아둘 것', '제일 좋은 약이에요.[^1]') }],
  ['reject', '최고의', { rows: withRow('꼭 알아둘 것', '최고의 약이에요.[^1]') }],
  ['reject', '더 좋은', { rows: withRow('꼭 알아둘 것', '효과가 더 좋은 편이에요.[^1]') }],
  ['reject', '이런 분께', { rows: withRow('꼭 알아둘 것', '이런 분께 잘 맞아요.[^1]') }],
  ['reject', '수유', { rows: withRow('꼭 알아둘 것', '수유 중에는 피해요.[^1]') }],
  ['reject', '같이 먹으면 안 되는 약', { rows: withRow('꼭 알아둘 것', '같이 먹으면 안 되는 약이 있어요.[^1]') }],
  ['reject', '함께 먹으면 안', { rows: withRow('꼭 알아둘 것', '술과 함께 먹으면 안 돼요.[^1]') }],
  ['reject', '전각 ５ｍｇ', { rows: withRow('꼭 알아둘 것', '５ｍｇ로 시작해요.[^1]') }],
  ['reject', '폭 없는 빈칸 낀 "용량"', { rows: withRow('꼭 알아둘 것', '용​량을 지켜요.[^1]') }],
  ['reject', '&reg; 표기', { rows: withRow('꼭 알아둘 것', '어떤약&reg; 이라고도 해요.[^1]') }],
  ['reject', '용량 단위 mL', { rows: withRow('꼭 알아둘 것', '5 mL 시럽이 있어요.[^1]') }],
  /* K9: 놓치던 꼴 — 한글 수 낱알, 주·달 간격, 끊어도 된다는 다른 동사·높임말, 사람을 가리키는 "이런 분…" */
  ['reject', '한 알씩', { rows: withRow('꼭 알아둘 것', '한 알씩 먹어요.[^1]') }],
  ['reject', '두 알', { rows: withRow('꼭 알아둘 것', '처음엔 두 알이에요.[^1]') }],
  ['reject', '두세 알', { rows: withRow('꼭 알아둘 것', '두세 알을 먹기도 해요.[^1]') }],
  ['reject', '한두 알', { rows: withRow('꼭 알아둘 것', '한두 알 더 먹지 말아요.[^1]') }],
  ['reject', '세 알까지', { rows: withRow('꼭 알아둘 것', '세 알까지 먹어요.[^1]') }],
  ['reject', '한 알도', { rows: withRow('꼭 알아둘 것', '한 알도 빠뜨리지 말아요.[^1]') }],
  ['reject', '1.5정씩', { rows: withRow('꼭 알아둘 것', '1.5정씩이에요.[^1]') }],
  ['reject', '2캡슐', { rows: withRow('꼭 알아둘 것', '2캡슐을 먹어요.[^1]') }],
  ['reject', '자기 전 한 알', { rows: withRow('꼭 알아둘 것', '자기 전 한 알이에요.[^1]') }],
  ['reject', '하루 2번', { rows: withRow('꼭 알아둘 것', '하루 2번 먹어요.[^1]') }],
  ['reject', '하루 세 번', { rows: withRow('꼭 알아둘 것', '하루 세 번 먹어요.[^1]') }],
  ['reject', '점심에 한 번', { rows: withRow('꼭 알아둘 것', '점심에 한 번 더 먹어요.[^1]') }],
  ['reject', '두 번 나눠', { rows: withRow('꼭 알아둘 것', '두 번 나눠 먹어요.[^1]') }],
  ['reject', '격일로', { rows: withRow('꼭 알아둘 것', '격일로 먹어요.[^1]') }],
  ['reject', '12시간마다', { rows: withRow('꼭 알아둘 것', '12시간마다 먹어요.[^1]') }],
  ['reject', '일주일에 한 번', { rows: withRow('꼭 알아둘 것', '일주일에 한 번 맞아요.[^1]') }],
  ['reject', '1주일에 1회', { rows: withRow('꼭 알아둘 것', '1주일에 1회 맞아요.[^1]') }],
  ['reject', '격주로', { rows: withRow('꼭 알아둘 것', '격주로 맞는 주사가 있어요.[^1]') }],
  ['reject', '달마다', { rows: withRow('꼭 알아둘 것', '달마다 맞는 주사예요.[^1]') }],
  ['reject', '두 달에 한 번', { rows: withRow('꼭 알아둘 것', '두 달에 한 번 맞아요.[^1]') }],
  ['reject', '석 달마다', { rows: withRow('꼭 알아둘 것', '석 달마다 맞는 주사도 있어요.[^1]') }],
  ['reject', '3개월에 한 번', { rows: withRow('꼭 알아둘 것', '3개월에 한 번 맞는 주사가 있어요.[^1]') }],
  ['reject', '몇 주마다', { rows: withRow('꼭 알아둘 것', '몇 주마다 맞아요.[^1]') }],
  ['reject', '보름에 한 번', { rows: withRow('꼭 알아둘 것', '보름에 한 번 맞아요.[^1]') }],
  ['reject', '매주 한 번 맞아요', { rows: withRow('꼭 알아둘 것', '매주 한 번 맞아요.[^1]') }],
  ['reject', '매 4주', { rows: withRow('꼭 알아둘 것', '매 4주 맞는 주사예요.[^1]') }],
  ['reject', '주 1회', { rows: withRow('꼭 알아둘 것', '주 1회 맞아요.[^1]') }],
  ['reject', '월 1회', { rows: withRow('꼭 알아둘 것', '월 1회 맞는 주사예요.[^1]') }],
  ['reject', '매달마다', { rows: withRow('꼭 알아둘 것', '매달마다 맞아요.[^1]') }],
  ['reject', '한 달에 한 번 맞는 주사(꼭 알아둘 것)', { rows: withRow('꼭 알아둘 것', '한 달에 한 번 맞는 주사가 있어요.[^1]') }],
  ['reject', '제형 괄호 속 격주', { rows: withRow('제형', '먹는 약 · 장기지속형 주사 있음(격주)[^2]') }],
  ['reject', '간격 뒤에 검사 아닌 말(병원에서 맞는)', { rows: withRow('꼭 알아둘 것', '4주마다 병원에서 맞는 주사예요.[^1]') }],
  ['reject', '복용을 멈춰도 돼요', { rows: withRow('꼭 알아둘 것', '복용을 멈춰도 돼요.[^1]') }],
  ['reject', '먹지 않아도 돼요', { rows: withRow('꼭 알아둘 것', '좋아지면 먹지 않아도 돼요.[^1]') }],
  ['reject', '그만 복용해도 돼요', { rows: withRow('꼭 알아둘 것', '이제 그만 복용해도 돼요.[^1]') }],
  ['reject', '끊으셔도 돼요', { rows: withRow('꼭 알아둘 것', '나아지면 끊으셔도 돼요.[^1]') }],
  ['reject', '안 드셔도 괜찮아요', { rows: withRow('꼭 알아둘 것', '졸리면 안 드셔도 괜찮아요.[^1]') }],
  ['reject', '중단하셔도 됩니다', { rows: withRow('꼭 알아둘 것', '부작용이 있으면 중단하셔도 됩니다.[^1]') }],
  ['reject', '약을 쉬어도', { rows: withRow('꼭 알아둘 것', '약을 쉬어도 괜찮아요.[^1]') }],
  ['reject', '그만 드셔도', { rows: withRow('꼭 알아둘 것', '그만 드셔도 됩니다.[^1]') }],
  ['reject', '복용하지 않으셔도', { rows: withRow('꼭 알아둘 것', '복용하지 않으셔도 돼요.[^1]') }],
  ['reject', '끊어도 상관없어요', { rows: withRow('꼭 알아둘 것', '끊어도 상관없어요.[^1]') }],
  ['reject', '끊어도 무방해요', { rows: withRow('꼭 알아둘 것', '끊어도 무방해요.[^1]') }],
  ['reject', '주사를 건너뛰어도', { rows: withRow('꼭 알아둘 것', '주사를 건너뛰어도 돼요.[^1]') }],
  ['reject', '드시지 않아도 괜찮습니다', { rows: withRow('꼭 알아둘 것', '드시지 않아도 괜찮습니다.[^1]') }],
  ['reject', '끊어도 돼.(반말)', { rows: withRow('꼭 알아둘 것', '좋아지면 끊어도 돼.[^1]') }],
  ['reject', '이런 분들에게', { rows: withRow('꼭 알아둘 것', '이런 분들에게 좋아요.[^1]') }],
  ['reject', '이런 분은', { rows: withRow('꼭 알아둘 것', '이런 분은 피해요.[^1]') }],
  ['reject', '최고예요', { rows: withRow('꼭 알아둘 것', '효과가 최고예요.[^1]') }],
  ['reject', '하루 한 번 저녁에 먹어요', { rows: withRow('꼭 알아둘 것', '하루 한 번 저녁에 먹어요.[^1]') }],
  ['reject', '취침 전에 한 번', { rows: withRow('꼭 알아둘 것', '취침 전에 한 번 먹어요.[^1]') }],
  ['reject', '식사 후에 한 알', { rows: withRow('꼭 알아둘 것', '식사 후에 한 알 먹어요.[^1]') }],
  ['reject', '한달에 한번(붙여 씀)', { rows: withRow('꼭 알아둘 것', '한달에 한번 맞아요.[^1]') }],
  ['reject', '주사 간격은 한 달', { rows: withRow('꼭 알아둘 것', '주사 간격은 한 달이에요.[^1]') }],
  ['reject', '투여 간격은 4주', { rows: withRow('꼭 알아둘 것', '투여 간격은 4주예요.[^1]') }],
  ['reject', '4주 1회', { rows: withRow('꼭 알아둘 것', '4주 1회 맞아요.[^1]') }],
  ['reject', '검사 뒤라도 먹는 횟수(혈액 검사 뒤 하루 1번 먹어요)', { rows: withRow('꼭 알아둘 것', '혈액 검사 뒤 하루 1번 먹어요.[^1]') }],
  ['reject', '진료 간격 뒤의 주사(한 달에 한 번 진료 때 주사를 맞아요)', { rows: withRow('꼭 알아둘 것', '한 달에 한 번 진료 때 주사를 맞아요.[^1]') }],
  /* K9 검수: 앞쪽에 체중·혈당·혈압·진료·수치·혈액 같은 낱말이 있어도 복용 횟수·간격을 정하거나 바꾸는 말은 막아요(검사 간격으로 빼 주지 않아요) */
  ['reject', '체중이 늘면 하루 한 번으로 줄여요', { rows: withRow('꼭 알아둘 것', '체중이 늘면 하루 한 번으로 줄여요.[^1]') }],
  ['reject', '혈당이 오르면 하루 2회로 바꿔요', { rows: withRow('꼭 알아둘 것', '혈당이 오르면 하루 2회로 바꿔요.[^1]') }],
  ['reject', '진료 때 의사가 하루 1번으로 정해요', { rows: withRow('꼭 알아둘 것', '진료 때 의사가 하루 1번으로 정해요.[^1]') }],
  ['reject', '혈압이 낮으면 저녁에 한 번만 드려요', { rows: withRow('꼭 알아둘 것', '혈압이 낮으면 저녁에 한 번만 드려요.[^1]') }],
  ['reject', '체중 증가가 흔해서 하루 1회 저녁에', { rows: withRow('체중·대사', '많은 편(체중 증가가 흔해서 하루 1회 저녁에)[^1]') }],
  ['reject', '진료를 보며 4주마다 늘려 가요', { rows: withRow('꼭 알아둘 것', '진료를 보며 4주마다 늘려 가요.[^1]') }],
  ['reject', '수치가 안정되면 2주 간격으로 바꿔요', { rows: withRow('꼭 알아둘 것', '수치가 안정되면 2주 간격으로 바꿔요.[^1]') }],
  ['reject', '혈액 검사 결과에 따라 한 달에 한 번으로 바꿔요', { rows: withRow('꼭 알아둘 것', '혈액 검사 결과에 따라 한 달에 한 번으로 바꿔요.[^1]') }],
  ['reject', '진료는 한 달에 한 번, 주사도 그때 맞아요', { rows: withRow('꼭 알아둘 것', '진료는 한 달에 한 번, 주사도 그때 맞아요.[^1]') }],
  ['reject', '혈액 검사를 하고 하루 세 번', { rows: withRow('꼭 알아둘 것', '혈액 검사를 하고 하루 세 번[^1]') }],
  ['reject', '체중을 보며 3개월 간격으로 조절해요', { rows: withRow('꼭 알아둘 것', '체중을 보며 3개월 간격으로 조절해요.[^1]') }],
  ['reject', '혈압이 낮으면 하루 1회로 바꿔요', { rows: withRow('꼭 알아둘 것', '혈압이 낮으면 하루 1회로 바꿔요.[^1]') }],
  ['reject', '혈당이 높으면 2주마다 한 번이면 돼요', { rows: withRow('꼭 알아둘 것', '혈당이 높으면 2주마다 한 번이면 돼요.[^1]') }],
  ['reject', '혈액 검사는 매주, 약은 하루 1번이에요', { rows: withRow('꼭 알아둘 것', '혈액 검사는 매주, 약은 하루 1번이에요.[^1]') }],
  /* K9 검수: 이틀에 한 번·하루 걸러·횟수 없는 매달·매주 */
  ['reject', '이틀에 한 번 먹어요', { rows: withRow('꼭 알아둘 것', '이틀에 한 번 먹어요.[^1]') }],
  ['reject', '하루 걸러 먹어요', { rows: withRow('꼭 알아둘 것', '하루 걸러 먹어요.[^1]') }],
  ['reject', '매달 맞아요', { rows: withRow('꼭 알아둘 것', '매달 맞아요.[^1]') }],
  ['reject', '매주 맞는 주사', { rows: withRow('꼭 알아둘 것', '매주 맞는 주사예요.[^1]') }],
  /* K9 검수: 끊어도 된다는 말 — 쉬어도·추측 끝맺음·되요·주사 안 맞아도·명령꼴·따옴표 뒤 안심시키는 말 */
  ['reject', '쉬어도 돼요(칸은 목적어 없이도)', { rows: withRow('꼭 알아둘 것', '드시다가 쉬어도 돼요.[^1]') }],
  ['reject', '안 먹어도 될 거예요', { rows: withRow('꼭 알아둘 것', '좋아지면 안 먹어도 될 거예요.[^1]') }],
  ['reject', '끊어도 되겠죠', { rows: withRow('꼭 알아둘 것', '좋아지면 끊어도 되겠죠.[^1]') }],
  ['reject', '끊어도 되요', { rows: withRow('꼭 알아둘 것', '좋아지면 끊어도 되요.[^1]') }],
  ['reject', '주사는 맞지 않아도 돼요', { rows: withRow('꼭 알아둘 것', '주사는 맞지 않아도 돼요.[^1]') }],
  ['reject', '약을 끊으세요', { rows: withRow('꼭 알아둘 것', '졸리면 약을 끊으세요.[^1]') }],
  ['reject', '그만 드세요(칸은 목적어 없이도)', { rows: withRow('꼭 알아둘 것', '좋아지면 그만 드세요.[^1]') }],
  ['reject', '따옴표 뒤 걱정하지 마세요', { rows: withRow('꼭 알아둘 것', '"이제 끊어도 괜찮아요." 걱정하지 마세요.[^1]') }],
  ['reject', '빼먹어도 괜찮아요', { rows: withRow('꼭 알아둘 것', '한두 번 빼먹어도 괜찮아요.[^1]') }],
  ['reject', '걸러도 괜찮아요', { rows: withRow('꼭 알아둘 것', '한 번쯤 걸러도 괜찮아요.[^1]') }],
  ['reject', '약 없이 지내도 돼요', { rows: withRow('꼭 알아둘 것', '좋아지면 약 없이 지내도 돼요.[^1]') }],
  ['reject', '끊는 것도 방법이에요', { rows: withRow('꼭 알아둘 것', '약을 끊는 것도 방법이에요.[^1]') }],
  ['reject', '끊어 봐도 괜찮아요', { rows: withRow('꼭 알아둘 것', '끊어 봐도 괜찮아요.[^1]') }],
  ['reject', '멈추셔도(칸은 목적어 없이도)', { rows: withRow('꼭 알아둘 것', '드시다가 멈추셔도 돼요.[^1]') }],
  ['reject', '건너뛰어도(칸은 목적어 없이도)', { rows: withRow('꼭 알아둘 것', '바쁘면 건너뛰어도 돼요.[^1]') }],
  /* 생성기는 통과하지만 검사기만 오류(검사기가 더 엄해요: 생성기가 그 글을 말없이 빼거나, 안전 고지·출처가 빠진 칸이 나감) */
  ['checker', '소절 제목이 "## 약카드"(생성기가 못 읽어 화면에서 빠짐)', { edit: function (b) { return b.replace('## 약 카드\n', '## 약카드\n'); } }],
  ['checker', '꼭 알아둘 것 각주 없음', { rows: withRow('꼭 알아둘 것', '정기 혈액 검사가 꼭 필요한 약이에요.') }],
  ['checker', '고정 문구 없음', { extra: '' }],
  /* K9: 약 카드처럼 보이는데 제목·수준이 달라 생성기가 말없이 건너뛰는 글 */
  ['checker', '"## 약 정리" 아래의 약 카드 표', { edit: function (b) { return b.replace('## 약 카드\n', '## 약 정리\n'); } }],
  ['checker', '### 약 카드(수준이 다름)', { edit: function (b) { return b.replace('## 약 카드\n', '### 약 카드\n'); } }],
  ['checker', '#### 약 카드', { edit: function (b) { return b.replace('## 약 카드\n', '#### 약 카드\n'); } }],
  ['checker', '## 약 정보 카드', { edit: function (b) { return b.replace('## 약 카드\n', '## 약 정보 카드\n'); } }],
  ['checker', '## 약물 카드', { edit: function (b) { return b.replace('## 약 카드\n', '## 약물 카드\n'); } }],
  ['checker', '## **약 카드**', { edit: function (b) { return b.replace('## 약 카드\n', '## **약 카드**\n'); } }],
  ['checker', '## 약 카드 ##(닫는 #)', { edit: function (b) { return b.replace('## 약 카드\n', '## 약 카드 ##\n'); } }],
  ['checker', '## 약  카드(빈칸 둘)', { edit: function (b) { return b.replace('## 약 카드\n', '## 약  카드\n'); } }],
  /* 생성기가 통과하는 것(정상 표현과 경고만 받는 꼴) */
  ['pass', '약 카드 없는 07 글(올바른 파일 이름)', { edit: dropCard }],
  /* K9: 정상인데 막히던 꼴과 막으면 안 되는 꼴 — 검사 간격, 최고 혈중 농도, 이런 분류, 부정·옮김·묻는 꼴, 낱알 아닌 "알·정" */
  ['pass', '3개월마다 검사해요', { rows: withRow('꼭 알아둘 것', '3개월마다 검사해요.[^1]') }],
  ['pass', '6개월마다 혈당·지질 확인', { rows: withRow('꼭 알아둘 것', '6개월마다 혈당과 지질을 확인해요.[^1]') }],
  ['pass', '처음 18주는 매주 혈액 검사', { rows: withRow('꼭 알아둘 것', '처음 18주는 매주 혈액 검사를 해요.[^1]') }],
  ['pass', '1년에 한 번 심전도', { rows: withRow('꼭 알아둘 것', '1년에 한 번 심전도를 찍어요.[^1]') }],
  ['pass', '몇 달마다 체중을 재요', { rows: withRow('꼭 알아둘 것', '몇 달마다 체중을 재요.[^1]') }],
  ['pass', '석 달마다 혈액 검사', { rows: withRow('꼭 알아둘 것', '석 달마다 혈액 검사로 확인해요.[^1]') }],
  ['pass', '매주 한 번 혈액 검사', { rows: withRow('꼭 알아둘 것', '매주 한 번 혈액 검사를 해요.[^1]') }],
  ['pass', '하루 한 번 혈압을 재 봐요', { rows: withRow('꼭 알아둘 것', '하루 한 번 혈압을 재 봐요.[^1]') }],
  ['pass', '한 달에 한 번 허리둘레', { rows: withRow('꼭 알아둘 것', '한 달에 한 번 허리둘레를 재요.[^1]') }],
  ['pass', '최고 혈중 농도', { rows: withRow('꼭 알아둘 것', '최고 혈중 농도에 이르는 데 몇 시간 걸려요.[^1]') }],
  ['pass', '최고치', { rows: withRow('꼭 알아둘 것', '먹고 몇 시간 뒤 최고치에 이르러요.[^1]') }],
  ['pass', '최고조', { rows: withRow('졸림', '중간(처음 몇 주가 최고조)[^2]') }],
  ['pass', '이런 분류', { rows: withRow('꼭 알아둘 것', '이런 분류의 약은 졸림이 흔해요.[^1]') }],
  ['pass', '이런 분야', { rows: withRow('꼭 알아둘 것', '이런 분야의 연구는 아직 적어요.[^1]') }],
  ['pass', '이런 분위기', { rows: withRow('꼭 알아둘 것', '이런 분위기에서 졸림이 심해질 수 있어요.[^1]') }],
  ['pass', '끊어도 된다는 뜻은 아니에요', { rows: withRow('꼭 알아둘 것', '좋아져도 스스로 끊어도 된다는 뜻은 아니에요.[^1]') }],
  ['pass', '먹지 않아도 되는 것은 아니에요', { rows: withRow('꼭 알아둘 것', '좋아져도 먹지 않아도 되는 것은 아니에요.[^1]') }],
  ['pass', '그만 먹어도 될지는', { rows: withRow('꼭 알아둘 것', '그만 먹어도 될지는 담당 의사와 정해요.[^1]') }],
  ['pass', '"…끊어도 된다"고 생각하기 쉽지만', { rows: withRow('꼭 알아둘 것', '"좋아지면 끊어도 된다"고 생각하기 쉽지만 다시 나빠질 수 있어요.[^1]') }],
  ['pass', '끊어도 괜찮을까요? 묻기', { rows: withRow('꼭 알아둘 것', '끊어도 괜찮을까요? 하고 담당 의사에게 물어요.[^1]') }],
  ['pass', '알아차리기(낱알 아님)', { rows: withRow('꼭 알아둘 것', '처음엔 알아차리기 어려워요.[^1]') }],
  ['pass', '세 가지·한 정신과', { rows: withRow('꼭 알아둘 것', '한 정신과 연구에서 세 가지를 봤어요.[^1]') }],
  ['pass', '세 정도 차이', { rows: withRow('꼭 알아둘 것', '자료마다 세 정도 차이가 나요.[^1]') }],
  ['pass', '한 달쯤 지나면', { rows: withRow('꼭 알아둘 것', '한 달쯤 지나면 나아지기도 해요.[^1]') }],
  ['pass', '시작할 때 한 번', { rows: withRow('꼭 알아둘 것', '시작할 때 한 번 어지러울 수 있어요.[^1]') }],
  ['pass', '두 번째 주', { rows: withRow('꼭 알아둘 것', '두 번째 주부터 졸림이 줄기도 해요.[^1]') }],
  ['pass', '검사 낱말이 앞에(혈액 검사는 3개월마다 해요)', { rows: withRow('꼭 알아둘 것', '혈액 검사는 3개월마다 해요.[^1]') }],
  ['pass', '검사 낱말이 앞에(쉼표 너머)', { rows: withRow('꼭 알아둘 것', '혈액 검사는 처음 18주 동안 매주, 그 뒤로는 한 달마다 해요.[^1]') }],
  ['pass', '6개월마다 피를 뽑아', { rows: withRow('꼭 알아둘 것', '6개월마다 피를 뽑아 혈당을 봐요.[^1]') }],
  ['pass', '1년에 한 번 검진', { rows: withRow('꼭 알아둘 것', '1년에 한 번 검진을 받아요.[^1]') }],
  ['pass', '검사 간격은 3개월', { rows: withRow('꼭 알아둘 것', '검사 간격은 3개월이에요.[^1]') }],
  ['pass', '주 1회 체중', { rows: withRow('꼭 알아둘 것', '주 1회 체중을 재요.[^1]') }],
  ['pass', '몇 주에 한 번씩 살펴요', { rows: withRow('꼭 알아둘 것', '몇 주에 한 번씩 상태를 담당 의사와 살펴요.[^1]') }],
  ['pass', '최고에 이르는', { rows: withRow('꼭 알아둘 것', '혈중 농도가 최고에 이르는 시간은 짧아요.[^1]') }],
  ['pass', '끊는 것도 위험해요', { rows: withRow('꼭 알아둘 것', '갑자기 끊는 것도 위험해요.[^1]') }],
  ['pass', '처음 2주·2~3일 동안', { rows: withRow('꼭 알아둘 것', '맞은 뒤 2~3일 동안 아플 수 있고 처음 2주 동안 졸릴 수 있어요.[^1]') }],
  ['pass', '끊으면 안 돼요', { rows: withRow('꼭 알아둘 것', '스스로 끊으면 안 돼요.[^1]') }],
  ['pass', '세 번째·알레르기', { rows: withRow('꼭 알아둘 것', '세 번째 약으로 쓰기도 하고, 알레르기가 있으면 말해요.[^1]') }],
  ['pass', '절반 정도', { rows: withRow('꼭 알아둘 것', '절반 정도가 처음 몇 주에 겪어요.[^1]') }],
  ['pass', '3 정도', { rows: withRow('졸림', '중간 (10점 중 3 정도)[^2]') }],
  ['pass', '끊어도 되는지 묻기', { rows: withRow('꼭 알아둘 것', '스스로 끊지 말고, 끊어도 되는지는 담당 의사와 상의해요.[^1]') }],
  ['pass', '몇 주에 걸쳐', { rows: withRow('꼭 알아둘 것', '효과는 몇 주에 걸쳐 나타나요.[^1]') }],
  /* K9 검수: 검사 간격은 그대로 통과(검사하는 동작이 뒤에 있거나 검사가 간격의 주어일 때) */
  ['pass', '매달 검사해요', { rows: withRow('꼭 알아둘 것', '매달 검사해요.[^1]') }],
  ['pass', '이틀에 한 번 체중을 재요', { rows: withRow('꼭 알아둘 것', '이틀에 한 번 체중을 재요.[^1]') }],
  ['pass', '하루 걸러 혈압을 재요', { rows: withRow('꼭 알아둘 것', '하루 걸러 혈압을 재요.[^1]') }],
  ['pass', '1년에 한 번 검진을 받아요', { rows: withRow('꼭 알아둘 것', '1년에 한 번 검진을 받아요.[^1]') }],
  ['pass', '따옴표 뒤 근거가 없어요', { rows: withRow('꼭 알아둘 것', '"좋아지면 끊어도 돼요." 이런 말은 근거가 없어요.[^1]') }],
  ['pass', '쉼표 뒤 라는 말은 틀렸어요', { rows: withRow('꼭 알아둘 것', '좋아지면 끊어도 돼요, 라는 말은 틀렸어요.[^1]') }],
  ['pass', '약을 끊지 마세요', { rows: withRow('꼭 알아둘 것', '스스로 약을 끊지 마세요.[^1]') }],
  ['pass', '기본 견본', {}],
  ['pass', '범위', { rows: withRow('졸림', '적은 편~중간 (자료마다 달라요)[^2]') }],
  ['pass', '범위(덧말 없음)', { rows: withRow('졸림', '적은 편~중간[^2]') }],
  ['pass', '범위 위쪽', { rows: withRow('체중·대사', '중간~많은 편 (자료마다 달라요)[^1]') }],
  ['pass', '자료 부족 덧말', { rows: withRow('QT 연장', '자료 부족 (자료마다 크게 달라요)') }],
  ['pass', '부작용 칸 모두 자료 부족', { rows: CARD_ROWS.map(function (r) { return drugCard.FX.indexOf(r[0]) >= 0 ? [r[0], '자료 부족'] : r; }) }],
  ['pass', '행 순서 다름(경고)', { rows: [CARD_ROWS[1], CARD_ROWS[0]].concat(CARD_ROWS.slice(2)) }],
  ['pass', '계열 표기(경고)', { rows: withRow('계열', '3세대[^1]') }],
  ['pass', '등수(경고)', { rows: withRow('꼭 알아둘 것', '효과 1등 약은 따로 없어요.[^1]') }],
  ['pass', '60자(경계)', { rows: withRow('제형', '먹는 약 · 장기지속형 주사 있음 ' + '가나다라 '.repeat(8) + '마[^2]') }],
  ['pass', '낱말 속 mg 글자', { rows: withRow('꼭 알아둘 것', 'Img 검사 결과를 담당 의사와 봐요.[^1]') }],
  ['pass', '하루 종일', { rows: withRow('꼭 알아둘 것', '하루 종일 졸리면 담당 의사에게 알려요.[^1]') }],
  ['pass', '굵게 쓴 값 낱말', { rows: withRow('프로락틴', '**적은 편**[^1]') }],
  ['pass', '링크 주소 속 글자는 화면에 안 나감', { rows: withRow('꼭 알아둘 것', '[허가사항](https://example.org/mg/label)을 봐요.[^1]') }],
  ['pass', '140자 꼭 알아둘 것', { rows: withRow('꼭 알아둘 것', '가'.repeat(20) + (' ' + '나'.repeat(19)).repeat(6) + '[^1]') }],
  ['pass', '띄어쓰기 없이 24자', { rows: withRow('체중·대사', '적은 편 ' + '가'.repeat(24) + '[^1]') }]
];
function cardSampleText(o) {
  let body = drugBody(o.rows || CARD_ROWS, o.extra);
  if (o.edit) body = o.edit(body);
  return mk(Object.assign({ section: '7' }, o.meta || {}), body);
}
/* 생성기 판정: 예외 없이 끝나면 통과(약 카드가 없는 글은 null 로 건너뜀), 예외면 멈춤 */
function genVerdict(text, slug) {
  try { gen.entryFrom(text, slug, 'content/07-medication/' + slug + '.md'); return { ok: true, why: '' }; }
  catch (e) { return { ok: false, why: e.message }; }
}

test('약 카드: 생성기와 검사기가 같은 표본에 같은 판정(생성기가 멈추면 검사기도 오류, 통과하면 오류 0 — 검사기만 엄한 표본은 따로)', function () {
  const bad = [];
  CARD_SAMPLES.forEach(function (s) {
    const want = s[0], name = s[1], o = s[2];
    const slug = o.slug || 'samplezapine';
    const text = cardSampleText(o);
    const g = genVerdict(text, slug);
    const c = checkDoc(text, { today: TODAY, path: 'content/07-medication/' + slug + '.md' });
    const genOk = g.ok, chkOk = !c.errors.length;
    const wantGen = want !== 'reject', wantChk = want === 'pass';
    if (genOk !== wantGen || chkOk !== wantChk) {
      bad.push(name + ' [' + want + '] 생성기 ' + (genOk ? '통과' : '멈춤(' + g.why + ')') + ' / 검사기 ' + (chkOk ? '통과' : '오류 ' + JSON.stringify(c.errors)));
    }
  });
  eq(bad, [], '판정이 다른 표본');
  ok(CARD_SAMPLES.filter(function (s) { return s[0] === 'reject'; }).length >= 120 && CARD_SAMPLES.filter(function (s) { return s[0] === 'pass'; }).length >= 45 &&
    CARD_SAMPLES.filter(function (s) { return s[0] === 'checker'; }).length >= 11, '표본 수');
});

test('약 카드: 생성기는 검사기와 같은 함수(cardProblems)의 첫 오류로 멈춰요(행 모으기·칸 판정이 한 벌)', function () {
  ok(typeof drugCard.cardProblems === 'function', 'drug-card.cjs 가 cardProblems 를 내보내요');
  const mdlib = require('../js/md.js');
  CARD_SAMPLES.forEach(function (s) {
    const text = cardSampleText(s[2]);
    const body = mdlib.parse(text).body;
    const r = drugCard.cardProblems(body);
    let thrown = '';
    try { gen.parseCard(body); } catch (e) { thrown = e.message; }
    if (r.errors.length) eq(thrown, r.errors[0], s[1] + ': 생성기 예외 = 첫 오류');
    else eq(thrown, '', s[1] + ': 오류가 없으면 생성기도 예외 없음');
  });
});

test('약 카드: 생성기의 넣지 않는 말 목록 하나하나를 검사기도 오류로(목록에 새 줄이 생겨도)', function () {
  /* FORBIDDEN 의 줄마다 그 줄에만 걸리는 낱말 하나 */
  const one = { '용량 단위': '10 mg', '용량 이야기': '용량', '복용 횟수': '하루 1번', '끊어도 된다는 말': '끊어도 돼요', '권하는 말·줄 세우기': '추천', '값 비교': '약값', '임부 안전 등급': '임신', '수유 안전': '수유', '함께 먹는 약 판정': '상호작용', '상품명': '상품명' };
  eq(gen.FORBIDDEN.map(function (f) { return f.why; }), Object.keys(one), 'FORBIDDEN 줄이 바뀌면 여기 낱말도 하나 더해요');
  gen.FORBIDDEN.forEach(function (f) {
    const text = cardSampleText({ rows: withRow('꼭 알아둘 것', '이 칸에 ' + one[f.why] + ' 이야기를 써요.[^1]') });
    ok(!genVerdict(text, 'samplezapine').ok, '생성기가 멈춰야 해요: ' + f.why);
    hasErr(checkDoc(text, { today: TODAY }), f.why);
  });
});

/* 지금 약 글 12편: 생성기·검사기 모두 통과하고 약 카드 경고도 0(정상 표현이 걸리지 않음) */
test('약 카드: 실제 약 글 12편은 생성기·검사기 모두 통과, 약 카드 경고 0', function () {
  const dir = path.join(__dirname, '..', 'content', '07-medication');
  const mdlib = require('../js/md.js');
  const files = fs.readdirSync(dir).filter(function (f) { return /\.md$/.test(f); }).filter(function (f) {
    return drugCard.findCard(mdlib.parse(fs.readFileSync(path.join(dir, f), 'utf8')).body).count > 0;
  });
  eq(files.length, 12);
  files.forEach(function (f) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    const doc = mdlib.parse(text);
    ok(genVerdict(text, f.replace(/\.md$/, '')).ok, '생성기: ' + f);
    const errs = [], warns = [];
    drugCard.check({ body: doc.body, meta: doc.meta, section: 7, path: 'content/07-medication/' + f }, { error: function (s) { errs.push(s); }, warn: function (s) { warns.push(s); } });
    eq(errs, [], '약 카드 오류: ' + f);
    eq(warns, [], '약 카드 경고: ' + f);
    /* 화면에 나가는 칸 글자에 넣지 않는 말·길이 초과 0(정상 표현: "적은 편~중간 (자료마다 달라요)" 등) */
    const t = drugCard.findCard(doc.body).table;
    t.slice(2).forEach(function (l) {
      const c = drugCard.cells(l);
      const key = drugCard.KEYS[drugCard.ROWS.indexOf(c[0])];
      eq(drugCard.forbiddenIn(drugCard.cellText(c[1])), [], f + ' ' + c[0]);
      eq(drugCard.tooLong(key, drugCard.cellText(c[1])), '', f + ' ' + c[0]);
    });
  });
});

/* K9: "스스로 끊어도 된다"는 뜻의 말 — 본문 금지 표현('임의 중단 권유')과 약 카드('끊어도 된다는 말')가 tools/checks/safety.cjs 의 한 벌을 써요 */
const STOP_BAD = [
  '좋아지면 약을 먹지 않아도 돼요.', '증상이 없으면 복용을 멈춰도 돼요.', '이제 그만 복용해도 돼요.', '나아지면 끊으셔도 돼요.', '졸리면 안 드셔도 괜찮아요.',
  '부작용이 있으면 중단하셔도 됩니다.', '컨디션이 좋으면 약을 쉬어도 괜찮아요.', '이제 그만 드셔도 됩니다.', '복용하지 않으셔도 돼요.', '살이 찌면 용량을 줄여도 돼요.',
  '좋아지면 끊어도 상관없어요.', '증상이 없으면 약을 안 먹어도 돼.', '바쁘면 주사를 건너뛰어도 돼요.', '드시지 않아도 괜찮습니다.', '좋아지면 끊어도 무방해요.',
  '약물을 줄이셔도 괜찮아요.', '졸리면 복용을 중지해도 됩니다.', '증상이 사라지면 약을 그만둬도 돼요.',
  '약을 한두 번 빼먹어도 괜찮아요.', '약은 한 번쯤 걸러도 괜찮아요.', '좋아지면 약 없이 지내도 돼요.', '약을 끊는 것도 방법이에요.', '끊어 봐도 괜찮아요.',
  '주사를 쉬어도 괜찮아요.', '약은 이제 그만 먹어도 좋아요.', '의사와 상의 없이 끊어도 돼요.',
  /* K9 검수: 따옴표로 옮긴 뒤 안심시키는 말(바로잡는 말이 아님), 되요, 주사를 안 맞는 말, 추측·완곡 끝맺음, 명령꼴, 약 목적어 + 꾸밈말 */
  '"이제 끊어도 괜찮아요." 걱정하지 마세요.', '"약 안 먹어도 돼요." 의사가 그렇게 말했어요. 그러니 위험하지 않아요.',
  '"좋아지면 끊어도 돼요." 담당 의사도 그렇게 말하니 걱정하지 마세요.', '"이제 약은 안 먹어도 괜찮아요." 재발은 잘 생기지 않아요.',
  '좋아지면 끊어도 되요.', '증상이 없으면 안 먹어도 되요.', '주사를 안 맞아도 돼요.', '주사는 맞지 않아도 돼요.', '이제 끊어도 될 거예요.', '끊어도 괜찮을 거예요.',
  '좋아지면 끊어도 문제없어요.', '끊어도 되더라고요.', '졸리면 약을 끊으세요.', '부작용이 있으면 복용을 중단하세요.', '약은 이제 그만 드세요.',
  '좋아지면 안 먹어도 될 거예요.', '좋아지면 끊어도 되겠죠.', '약은 하루쯤 걸러도 돼요.', '저녁 약은 안 먹어도 돼요.', '복용을 잠시 멈춰도 돼요.'
];
const STOP_OK = [
  '먹지 않아도 되는 것은 아니에요.', '끊어도 된다는 뜻이 아니에요.', '"좋아지면 끊어도 된다"라고 생각하기 쉽지만 다시 나빠지는 일이 많아요.',
  '"증상이 없으니 안 먹어도 돼요." 많이 하는 오해예요.', "'이제 그만 먹어도 돼' 하는 마음이 들 수 있어요.", '끊으셔도 되는지는 담당 의사와 상의하세요.',
  '약을 먹지 않아도 될까요?', '복용을 멈춰도 되는지 물어보세요.', '5분 뒤에 그만둬도 성공이에요.',
  '"좋아지면 약은 끊어도 돼요." … 이런 말은 근거가 없어요.', '좋아지면 끊어도 돼요, 라는 말은 틀렸어요.', '스스로 약을 끊지 마세요.', '"이제 끊어도 돼요." 사실이 아니에요.',
  '스스로 끊어도 괜찮다는 연구는 없어요.', '"안 먹어도 괜찮아요"라는 말을 들으면 담당 의사에게 물어요.', '그만 먹어도 될지는 담당 의사와 정해요.',
  '좋아졌다고 약을 줄여도 된다는 뜻은 아니에요.', '중단해도 되는 경우는 담당 의사가 판단해요.', '오늘은 안 먹어도 될 것 같음',
  '"안정되면 끊어도 된다"는 통념과 달리 다시 나빠지는 일이 많았어요.', '끊어도 몇 주 동안 몸에 남아요.',
  '갑자기 끊는 것도 위험해요.', '"끊어도 괜찮아요." 이렇게 말하는 글은 믿지 말아요.', '약을 끊어도 괜찮을까요?', '스스로 끊으면 안 돼요.',
  '먹지 않아도 된다는 말은 사실이 아니에요.', "'이제 안 먹어도 되겠지' 싶을 때 담당 의사와 상의해요.", '약을 줄여도 되는지는 담당 의사가 정해요.'
];
/* 본문에서는 다른 이야기라 통과하지만, 약 이야기뿐인 약 카드 칸에서는 막는 꼴(목적어 없는 줄여도·멈춰도·건너뛰어도, 끊는 것도) */
const STOP_BODY_ONLY_OK = ['자기 상태에 맞게 더 줄여도 돼요.', '읽다가 잠시 멈춰도 괜찮아요.', '이 부분은 건너뛰어도 돼요.', '담배를 끊는 것도 좋아요.',
  /* K9 검수: 본문의 생활·식사·관계 이야기(약이 목적어가 아니면 빼먹어·걸러·중지해·안 맞아는 잡지 않고, 밥·술·담배·연락 같은 목적어가 앞에 있으면 빼요).
     칸에서는 목적어 없이도 막아요("한두 번 빼먹어도 괜찮아요", "드시다가 쉬어도 돼요") */
  '한두 번 빼먹어도 괜찮아요.', '한 번쯤 걸러도 괜찮아요.', '설명하기 지칠 땐 쉬어도 돼요.',
  '운동을 하루쯤 빼먹어도 괜찮아요.', '일기는 하루 걸러도 괜찮아요.', '아침을 걸러도 괜찮아요.', '그날은 숙제를 빼먹어도 돼요.', '모임은 중지해도 돼요.',
  '밥을 먹지 않아도 돼요.', '간식을 먹지 않으셔도 괜찮아요.', '아침은 굳이 드시지 않아도 괜찮아요.', '술은 안 드셔도 괜찮아요.',
  '담배를 끊어도 좋아요.', '힘든 관계라면 연락을 끊어도 괜찮아요.', 'SNS를 잠시 끊어도 괜찮아요.', '읽다가 힘들면 읽기를 중단해도 괜찮아요.',
  '식욕이 없으면 억지로 먹지 않아도 돼요.', '옷이 안 맞아도 괜찮아요.', '생각이 맞지 않아도 괜찮아요.'];
test('K9 끊어도 된다는 말: 다른 동사·높임말도 본문과 약 카드 둘 다 잡고(생성기도 멈춤), 부정·옮김·묻는 꼴과 다른 이야기는 둘 다 통과', function () {
  const safety = require('../tools/checks/safety.cjs');
  const body = safety.stopAdviceRe('body'), card = safety.stopAdviceRe('card');
  const bad = [];
  STOP_BAD.forEach(function (s) {
    if (!anyHas(run({}, BODY + '\n' + s + '\n').errors, '임의 중단 권유')) bad.push('본문이 놓침: ' + s);
    const text = cardSampleText({ rows: withRow('꼭 알아둘 것', s + '[^1]') });
    if (genVerdict(text, 'samplezapine').ok) bad.push('생성기가 놓침: ' + s);
    if (!anyHas(checkDoc(text, { today: TODAY }).errors, '끊어도 된다는 말')) bad.push('약 카드 검사가 놓침: ' + s);
  });
  STOP_OK.forEach(function (s) {
    const r = run({}, BODY + '\n' + s + '\n');
    if (r.errors.length) bad.push('본문이 막음: ' + s + ' ' + JSON.stringify(r.errors));
    const text = cardSampleText({ rows: withRow('꼭 알아둘 것', s + '[^1]') });
    if (!genVerdict(text, 'samplezapine').ok) bad.push('생성기가 막음: ' + s);
    const c = checkDoc(text, { today: TODAY });
    if (c.errors.length) bad.push('약 카드 검사가 막음: ' + s + ' ' + JSON.stringify(c.errors));
    if (body.test(s) || card.test(s)) bad.push('정규식이 걸림: ' + s);
  });
  eq(bad, [], '어긋난 표본');
  /* 약 카드 칸은 약 이야기뿐이라 목적어 없는 "줄여도·건너뛰어도·끊는 것도" 도 막아요(본문은 일정·읽기·담배 이야기라 통과) */
  STOP_BODY_ONLY_OK.forEach(function (s) {
    noErr(run({}, BODY + '\n' + s + '\n'));
    const text = cardSampleText({ rows: withRow('꼭 알아둘 것', s + '[^1]') });
    ok(!genVerdict(text, 'samplezapine').ok, '생성기가 멈춰야 해요: ' + s);
    hasErr(checkDoc(text, { today: TODAY }), '끊어도 된다는 말');
  });
  /* 한 벌: 본문 금지 표현과 약 카드의 넣지 않는 말이 같은 함수로 만든 정규식 */
  const cc = require('../tools/check-content.cjs');
  eq(cc.FORBIDDEN.filter(function (f) { return f.why === '임의 중단 권유'; })[0].re.source, body.source);
  eq(drugCard.FORBIDDEN.filter(function (f) { return f.why === '끊어도 된다는 말'; })[0].re.source, card.source);
});

test('K9 본문: 주사·복용 간격과 검사 간격은 본문에서 정상(약 카드만 막아요), 한글 수 낱알 지시("한 알씩 드세요")는 오류', function () {
  ['한 달에 한 번 맞는 주사예요.', '4주마다 맞는 주사도 있어요.', '일주일에 한 번 기록을 다시 읽어요.', '격주로 맞는 주사도 연구되고 있어요.',
    '3개월마다 혈액 검사를 해요.', '하루에 한 번 먹는 약과 두 번 먹는 약이 있어요.', '몇 주~몇 달에 한 번 맞는, 먹는 약과 같은 성분의 주사예요.'
  ].forEach(function (s) { noErr(run({}, BODY + '\n' + s + '\n')); });
  ['한 알씩 드세요.', '반 알 드세요.', '두세 알 먹으면 돼요.', '2정씩 드세요.', '5 mg 드세요.',
    /* K9 검수: 조사 만·까지·로, 줄여 드세요, 드셔도 돼요 */
    '2정만 드세요.', '한 알만 드세요.', '반알만 드세요.', '반 알로 줄여 드세요.', '두 알까지 드셔도 돼요.', '1정으로 줄여 드세요.'
  ].forEach(function (s) { hasErr(run({}, BODY + '\n' + s + '\n'), '개인별 용량 지시'); });
  /* 지시를 옮겨 말하는 꼴과 명령이 아닌 설명은 정상 */
  ['두 알 드세요라는 말은 의사만 할 수 있어요.', '"한 알씩 드세요"라고 적힌 쪽지를 받았다면 처방전과 견줘 봐요.', '반 알로 나눌 수 있는 약도 있어요.', '두 알을 함께 삼키기 어렵다면 담당 의사에게 말해요.'
  ].forEach(function (s) { noErr(run({}, BODY + '\n' + s + '\n')); });
  noErr(run({}, BODY + '\n간단한 알림을 켜 두면 도움이 돼요. 세 정도의 점수 차이예요.\n'));
});

test('K9 말없이 빠지는 약: 약 카드처럼 보이는 소절의 제목·수준이 다르면 07 폴더는 오류(생성기는 건너뜀), 밖은 경고, 다른 제목·표는 0건', function () {
  const NEAR = ['### 약 카드', '#### 약 카드', '# 약 카드', '## 약카드', '## 약 정보 카드', '## 약물 카드', '## 이 약의 카드', '## **약 카드**', '## 약 카드 (요약)', '## 약 카드 ##', '## 약  카드', '##약 카드', '## 약 정리'];
  NEAR.forEach(function (h) {
    const text = cardSampleText({ edit: function (b) { return b.replace('## 약 카드\n', h + '\n'); } });
    /* 생성기는 예외 없이 이 글을 건너뛰어요(null) — 그래서 말없이 빠져요 */
    eq(gen.entryFrom(text, 'samplezapine', 'content/07-medication/samplezapine.md'), null, h + ': 생성기는 건너뜀');
    hasErr(checkDoc(text, { today: TODAY, path: 'content/07-medication/samplezapine.md' }), '약 카드처럼 보이는 소절이 있는데 제목·수준이 달라요');
    const w = checkDoc(text, { today: TODAY, path: '.claude/work/drafts/07-medication/samplezapine.md' });
    ok(!anyHas(w.errors, '약 카드처럼'), h + ': 07 폴더 밖은 오류가 아니라 경고');
    hasWarn(w, '약 카드처럼 보이는 소절이 있는데 제목·수준이 달라요');
  });
  /* 무엇이 걸렸는지와 파일 줄 번호(frontmatter 줄까지 셈, 화면 링크 검사와 같게). 제목 줄이 걸리면 그 아래 표는 한 번만 */
  const oneText = cardSampleText({ edit: function (b) { return b.replace('## 약 카드\n', '### 약 카드\n'); } });
  const one = checkDoc(oneText, { today: TODAY, path: 'content/07-medication/samplezapine.md' });
  const at = oneText.split('\n').indexOf('### 약 카드') + 1;
  ok(at > 15, '시험 글의 제목 줄');
  hasErr(one, '제목 줄 "### 약 카드"(' + at + '번째 줄)');
  eq(one.errors.filter(function (e) { return e.indexOf('약 카드처럼') >= 0; }).length, 1, '제목 줄과 그 아래 표를 한 번만');
  const tableOnly = cardSampleText({ edit: function (b) { return b.replace('## 약 카드\n', '## 약 정리\n'); } });
  hasErr(checkDoc(tableOnly, { today: TODAY, path: 'content/07-medication/samplezapine.md' }), '표 "| 항목 | 내용 |"(행 계열·제형·체중·대사 …)(' + (tableOnly.split('\n').indexOf('| 항목 | 내용 |') + 1) + '번째 줄)');
  /* 약 카드가 아닌 제목·표는 걸리지 않아요 */
  ['## 약속 지키기', '## 약간의 도움', '## 안전 계획 카드', '## 위기 카드', '## 약을 먹는 이유', '## 약관 읽기', '## 약점 카드',
    /* K9 검수: "약" 앞에 다른 글자가 붙은 낱말(복약·예약·절약), 약과 카드 사이가 먼 제목, 제목 가운데의 "약물 정보 카드" */
    '## 복약 카드 쓰기', '## 예약 카드', '## 절약 카드', '## 약 먹는 시간 기록 카드', '## 위기 때 쓰는 약물 정보 카드'].forEach(function (h) {
    eq(drugCard.nearCards(BODY + '\n' + h + '\n\n본문이에요.\n'), [], h);
    noErr(run({ section: '7' }, BODY + '\n' + h + '\n\n본문이에요.\n', { path: 'content/07-medication/missed-dose.md' }));
  });
  /* K9 검수: 부작용만 견주는 표(머리 줄이 "| 항목 | 내용 |" 이 아니고 계열·제형이 없음)는 약 카드가 아니에요 */
  const fxTable = '\n## 부작용 견주기\n\n| 부작용 | 설명 |\n|---|---|\n| 졸림 | 흔해요 |\n| 프로락틴 | 올라요 |\n| QT 연장 | 드물어요 |\n| 체중·대사 | 늘어요 |\n| 기립성 저혈압 | 어지러워요 |\n';
  eq(drugCard.nearCards(BODY + fxTable), [], '부작용 견주기 표');
  /* 계열·제형을 포함해 정해진 행 이름이 5개 이상이면 머리 줄이 달라도 약 카드처럼 보여요. 7개 미만이면 07 폴더에서도 경고, 7개 이상이면 오류 */
  const fiveRows = fxTable.replace('| 졸림 | 흔해요 |', '| 계열 | 2세대 |').replace('| 프로락틴 | 올라요 |', '| 제형 | 먹는 약 |');
  eq(drugCard.nearCards(BODY + fiveRows).length, 1, '계열·제형 포함 5개');
  const fiveR = run({ section: '7' }, BODY + fiveRows, { path: 'content/07-medication/missed-dose.md' });
  noErr(fiveR);
  hasWarn(fiveR, '약 카드처럼 보이는 소절이 있는데 제목·수준이 달라요');
  ok(drugCard.nearCards(BODY + fiveRows)[0].full === false && drugCard.NEAR_TABLE_FULL === 7, '덜 확실한 표');
  const twoRows = '\n## 정리\n\n| 항목 | 내용 |\n|---|---|\n| 계열 | 2세대 |\n| 졸림 | 적은 편 |\n| 값 | 없음 |\n';
  eq(drugCard.nearCards(BODY + twoRows), [], '정해진 행 이름이 둘뿐인 표');
  eq(drugCard.nearCards(BODY + twoRows.replace('| 값 | 없음 |', '| 제형 | 먹는 약 |')).length, 1, '정해진 행 이름이 셋인 표');
  /* 약 카드가 이미 있으면(생성기가 읽음) 다른 소제목은 보지 않아요 */
  noErr(run({ section: '7' }, drugBody() + '\n### 약 카드 읽는 법\n\n설명이에요.\n', { path: 'content/07-medication/samplezapine.md' }));
  /* 지금 글: 약 카드가 없는 글 가운데 약 카드처럼 보이는 것 0 */
  const mdlib = require('../js/md.js');
  const contentDir = path.join(__dirname, '..', 'content');
  let n = 0;
  fs.readdirSync(contentDir).forEach(function (d) {
    const full = path.join(contentDir, d);
    if (!fs.statSync(full).isDirectory()) return;
    fs.readdirSync(full).filter(function (f) { return /\.md$/.test(f); }).forEach(function (f) {
      const body = mdlib.parse(fs.readFileSync(path.join(full, f), 'utf8')).body;
      if (drugCard.findCard(body).count) return;
      n++;
      eq(drugCard.nearCards(body), [], d + '/' + f);
    });
  });
  ok(n >= 270, '약 카드가 없는 글 수: ' + n);
});

test('K9 바로 연락할 신호 표: 검사 모듈 tools/checks/red-flags.cjs 가 생성기 run() 과 표본마다 같은 이유를 내요(생성기가 멈추면 검사기도 오류, 통과하면 둘 다 0)', function () {
  const rf = require('../tools/gen/red-flags.cjs');
  const mod = require('../tools/checks/red-flags.cjs');
  const ROOT = path.join(__dirname, '..');
  /* 검사는 check-content 안에 따로 적지 않고 모듈 하나로 */
  eq(mod.id, 'red-flags');
  not(fs.readFileSync(path.join(ROOT, 'tools', 'check-content.cjs'), 'utf8'), 'RF.extract', 'check-content.cjs 에 바로 연락할 신호 판정이 따로 남지 않아요');
  const slugs = rf.contentSlugs(ROOT);
  const src = slugs.get(rf.SOURCE_SLUG);
  const rel = path.relative(ROOT, src).replace(/\\/g, '/');
  const text = fs.readFileSync(src, 'utf8');
  /* 생성기 run() 은 폴더를 읽어요: 임시 폴더에 같은 글 이름(빈 파일)과 선언을 두고, 원천 글만 표본으로 바꿔 넣어요 */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jhb-rf-'));
  try {
    slugs.forEach(function (p) {
      const to = path.join(tmp, path.relative(ROOT, p));
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.writeFileSync(to, '');
    });
    fs.mkdirSync(path.join(tmp, 'data', 'pages'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rf.DECL), path.join(tmp, rf.DECL));
    const ROW = '| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 바로 119 | [클로자핀](#/a/clozapine) |';
    ok(text.indexOf(ROW) > 0, '표본을 만들 줄');
    function row(to) { return function (t) { return t.replace(ROW, to); }; }
    const SAMPLES = [
      ['pass', '지금 글', function (t) { return t; }],
      ['pass', '안전 문장 뒤에 문단 더함', function (t) { return t.replace('약에 관한 판단은 의료진이 해요.\n', '약에 관한 판단은 의료진이 해요.\n\n덧붙인 안내 문단이에요.\n'); }],
      ['pass', '신호 칸 굵게', row('| **경련(발작)**을 함[^9][^11][^12] | 경련 발작 | 바로 119 | [클로자핀](#/a/clozapine) |')],
      ['pass', '할 일 첫 마디 뒤에 덧말', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 바로 119. 옆 사람에게도 알려요 | [클로자핀](#/a/clozapine) |')],
      ['pass', '자세한 글 둘', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 바로 119 | [클로자핀](#/a/clozapine), [심장과 약](#/a/heart-and-antipsychotics) |')],
      ['reject', '할 일을 누그러뜨림(지켜봐요)', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 며칠 지켜봐요 | [클로자핀](#/a/clozapine) |')],
      ['reject', '할 일의 부정(연락하지 않아도)', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 오늘 안에 연락하지 않아도 돼요 | [클로자핀](#/a/clozapine) |')],
      ['reject', '할 일의 부정(연락 없이 … 연락)', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 오늘 안에 연락 없이 쉬고 나중에 연락 | [클로자핀](#/a/clozapine) |')],
      ['reject', '할 일 첫 마디 순서(119에 바로)', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 119에 바로 연락 | [클로자핀](#/a/clozapine) |')],
      ['reject', '할 일 첫 마디(연락하세요)', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 오늘 안에 병원에 연락하세요 | [클로자핀](#/a/clozapine) |')],
      ['reject', '열 이름', function (t) { return t.replace('| 신호 | 의심되는 상태 | 할 일 | 자세한 글 |', '| 신호 | 상태 | 할 일 | 자세한 글 |'); }],
      ['reject', '소절 제목', function (t) { return t.replace('## 바로 연락할 신호', '## 곧바로 연락할 신호'); }],
      ['reject', '표 뒤 안전 문장 바뀜', function (t) { return t.replace('약을 스스로 끊지 말고 먼저 연락하세요.', '약은 혼자 정하지 말고 먼저 연락하세요.'); }],
      ['reject', '표와 안전 문장 사이에 문단', function (t) { return t.replace('\n\n약을 스스로 끊지 말고', '\n\n표를 읽는 법이에요.\n\n약을 스스로 끊지 말고'); }],
      ['reject', '표 앞 문장(선언 lead)과 다름', function (t) { return t.replace('대부분은 드물어요. 하지만 이런 신호가', '대부분은 드물어요. 그래도 이런 신호가'); }],
      ['reject', '없는 글 링크', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 바로 119 | [클로자핀](#/a/clozapine-x) |')],
      ['reject', '링크 없음', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 바로 119 | 클로자핀 |')],
      ['reject', '링크 뒤 #자리', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 바로 119 | [클로자핀](#/a/clozapine#h-2) |')],
      ['reject', 'slug 대문자', row('| 경련(발작)을 함[^9][^11][^12] | 경련 발작 | 바로 119 | [클로자핀](#/a/Clozapine) |')],
      ['reject', '빈 신호 칸(각주만)', row('| [^9] | 경련 발작 | 바로 119 | [클로자핀](#/a/clozapine) |')],
      ['reject', '3칸 줄', row('| 경련(발작)을 함[^9][^11][^12] | 바로 119 | [클로자핀](#/a/clozapine) |')],
      ['reject', '출처 밖 각주', row('| 경련(발작)을 함[^99] | 경련 발작 | 바로 119 | [클로자핀](#/a/clozapine) |')],
      ['reject', '|---| 줄 없음', function (t) { return t.replace('|---|---|---|---|\n', ''); }],
      ['reject', '표 없음', function (t) { return t.replace(/\| 신호 \| 의심되는 상태[\s\S]*?\n\n/, '표는 나중에 넣어요.\n\n'); }]
    ];
    const srcTmp = path.join(tmp, path.relative(ROOT, src));
    const bad = [];
    SAMPLES.forEach(function (s) {
      const t = s[2](text);
      if (s[1] !== '지금 글' && t === text) { bad.push(s[1] + ': 표본이 글을 바꾸지 못했어요'); return; }
      fs.writeFileSync(srcTmp, t);
      const g = rf.run(tmp).errors;
      const c = checkDoc(t, { today: TODAY, path: rel }).errors.filter(function (e) { return e.indexOf(mod.PREFIX) === 0; }).map(function (e) { return e.slice(mod.PREFIX.length); });
      if ((s[0] === 'pass') !== (g.length === 0)) bad.push(s[1] + ' [' + s[0] + '] 생성기 ' + JSON.stringify(g));
      if (JSON.stringify(c) !== JSON.stringify(g)) bad.push(s[1] + ': 생성기 ' + JSON.stringify(g) + ' / 검사기 ' + JSON.stringify(c));
    });
    eq(bad, [], '판정이 다른 표본');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  /* 전체 검사에서만: 원천 글이 content/ 에 없으면 생성기처럼 오류 */
  eq(mod.setErrors([{ rel: rel }]), []);
  hasErr({ errors: mod.setErrors([{ rel: 'content/07-medication/other.md' }, { rel: '.claude/work/drafts/side-effects-overview.md' }]) }, '원천 글이 없어요');
});

/* ---------- 글에서 화면으로 가는 링크(tools/checks/routes.cjs) ---------- */
const routes = require('../tools/checks/routes.cjs');
/* 순수 함수용 작은 목록(실제 목록은 아래 '코드에서 만든 목록' 테스트) */
const FAKE_KNOWN = {
  pages: new Set(['plan', 'meds', 'red-flags', 'guide']),
  routes: { search: false, s: true, a: true, fav: false, glossary: false, about: false, courses: false, course: true, random: false },
  sections: new Set(['1', '7', '15']), glossarySections: new Set(['14']), courses: new Set(['first-diagnosis'])
};
function why(h) { return routes.targetProblem(h, FAKE_KNOWN); }

test('화면 링크: 코드에서 만든 목록(data/pages·js/app.js route()·data/sections.js·data/courses.js)', function () {
  const k = routes.loadKnown();
  eq(routes.routeKinds(fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8')),
    { search: false, s: true, a: true, fav: false, glossary: false, about: false, courses: false, course: true, random: false },
    'js/app.js route() 의 규칙이 바뀌면 routes.cjs 가 그대로 따라가는지 보고 이 기대값을 고쳐요');
  ['plan', 'meds', 'guide', 'red-flags', 'me', 'ask', 'browse', 'changes', 'search'].forEach(function (id) { ok(k.pages.has(id), '특집 화면 ' + id); });
  fs.readdirSync(path.join(__dirname, '..', 'data', 'pages')).filter(function (f) { return /\.json$/.test(f); }).forEach(function (f) { ok(k.pages.has(f.replace(/\.json$/, '')), 'data/pages/' + f); });
  ok(k.sections.has('7') && k.sections.has('16') && !k.sections.has('14') && k.glossarySections.has('14'), '분류(용어 사전 14 는 s/ 화면 없음)');
  ok(k.courses.has('first-diagnosis') && k.courses.size >= 10, '읽기 코스');
});

test('화면 링크: 있는 화면은 통과(조각·쿼리는 js/paths.js 규칙대로 떼고 봄)', function () {
  ['#/plan', '#/meds', '#/red-flags', '#/guide', '#/', '#/glossary', '#/about', '#/courses', '#/fav', '#/random', '#/search',
    '#/about#privacy', '#/plan#safety-card', '#/plan/#safety-card', '#/plan?from=a', '#/meds?x=1#h-2', '#/plan/',
    '#/s/7', '#/s/15#hb-g-1', '#/course/first-diagnosis', '#/course/first-diagnosis?x=1#h-3', '#/a/sleep', '#/a/sleep#h-2'
  ].forEach(function (h) { eq(why(h), '', h); });
});

test('화면 링크: 없는 화면·칸이 더 붙은 주소·없는 분류·없는 코스는 이유와 함께', function () {
  has(why('#/plans'), '"plans" 화면이 없어요');
  has(why('#/plans'), '#/plan');
  has(why('#/Plan'), '화면이 없어요');
  has(why('#/tools'), '화면이 없어요');
  has(why('#/plan/safety'), '뒤에 칸이 더 붙었어요');
  has(why('#/about/privacy'), '뒤에 칸이 더 붙었어요');
  has(why('#/s'), '#/s/<id>');
  has(why('#/s/99'), '분류 "99" 가 없어요');
  has(why('#/s/14'), '#/glossary');
  has(why('#/s/7/x'), '뒤에 칸이 더 붙었어요');
  has(why('#/course'), '#/course/<id>');
  has(why('#/course/nope?x=1'), '읽기 코스 "nope" 가 없어요');
  has(why('#/a/'), 'slug 가 없어요');
});

test('화면 링크: 검색 화면 주소에 검색어(쿼리)를 붙이면 오류, 빗금이 겹친 빈 칸도 오류', function () {
  has(why('#/search?q=x'), '검색어');
  has(why('#/search?q=%EC%9E%90%ED%95%B4'), '검색어');
  has(why('#/search/?s=7'), '검색어');
  has(why('#/search?q=x#top'), '검색어');
  eq(why('#/search'), '');
  eq(why('#/search#top'), '');
  has(why('#//plan'), '빈 칸');
  has(why('#/plan//x'), '빈 칸');
  has(why('#//'), '빈 칸');
  has(why('#/course//first-diagnosis'), '빈 칸');
  /* 끝의 빗금 하나와 첫 화면은 괜찮아요 */
  eq(why('#/plan/'), '');
  eq(why('#/'), '');
  eq(why('#/plan/#safety-card'), '');
  hasErr(run({}, BODY + '\n[찾기](#/search?q=자해)\n'), '검색어');
});

test('화면 링크: 본문에서 [글자](#/…) 만 모으고 #/a/<slug> 는 build-links 몫이라 뺌', function () {
  eq(routes.screenLinks('[가](#/plan) 와 [나](#/a/sleep), [다](https://example.org), [라](#/a/)\n둘째 줄 [마](#/about#privacy)'),
    [{ hash: '#/plan', line: 1 }, { hash: '#/a/', line: 1 }, { hash: '#/about#privacy', line: 2 }]);
  eq(routes.screenLinks('주소만 #/plans 처럼 쓴 글자는 링크가 아니에요'), []);
});

test('화면 링크: 글 검사(checkDoc)에서 있는 화면은 0건, 없는 화면은 오류', function () {
  noErr(run({}, BODY + '\n오늘 적어 두려면 [미리 써 두는 종이](#/plan)에서 적고 인쇄할 수 있어요. [바로 연락할 신호 한 장](#/red-flags), [항정신병약 한눈에](#/meds), [상황별 길잡이](#/guide), [소개](#/about#privacy), [첫 코스](#/course/first-diagnosis), [약 분류](#/s/7)\n'));
  const text = mk({}, BODY + '\n[미리 써 두는 종이](#/plans)\n');
  const r = checkDoc(text, { today: TODAY });
  /* 줄 번호는 파일 기준(frontmatter 줄까지 셈) */
  const at = text.split('\n').findIndex(function (l) { return l.indexOf('(#/plans)') >= 0; }) + 1;
  ok(at > 20, '시험 글의 링크 줄');
  hasErr(r, '없는 화면으로 가는 링크 "#/plans"(' + at + '번째 줄)');
  hasErr(run({}, BODY + '\n[용어](#/s/14)\n'), '#/glossary');
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
