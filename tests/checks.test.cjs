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
  /* 생성기는 통과하지만 검사기만 오류(검사기가 더 엄해요: 생성기가 그 글을 말없이 빼거나, 안전 고지·출처가 빠진 칸이 나감) */
  ['checker', '소절 제목이 "## 약카드"(생성기가 못 읽어 화면에서 빠짐)', { edit: function (b) { return b.replace('## 약 카드\n', '## 약카드\n'); } }],
  ['checker', '꼭 알아둘 것 각주 없음', { rows: withRow('꼭 알아둘 것', '정기 혈액 검사가 꼭 필요한 약이에요.') }],
  ['checker', '고정 문구 없음', { extra: '' }],
  /* 생성기가 통과하는 것(정상 표현과 경고만 받는 꼴) */
  ['pass', '약 카드 없는 07 글(올바른 파일 이름)', { edit: function (b) { return b.replace('## 약 카드\n', '## 약 정리\n'); } }],
  ['pass', '절반 정도', { rows: withRow('꼭 알아둘 것', '절반 정도가 처음 몇 주에 겪어요.[^1]') }],
  ['pass', '3 정도', { rows: withRow('졸림', '중간 (10점 중 3 정도)[^2]') }],
  ['pass', '끊어도 되는지 묻기', { rows: withRow('꼭 알아둘 것', '스스로 끊지 말고, 끊어도 되는지는 담당 의사와 상의해요.[^1]') }],
  ['pass', '몇 주에 걸쳐', { rows: withRow('꼭 알아둘 것', '효과는 몇 주에 걸쳐 나타나요.[^1]') }],
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
  ok(CARD_SAMPLES.filter(function (s) { return s[0] === 'reject'; }).length >= 70 && CARD_SAMPLES.filter(function (s) { return s[0] === 'pass'; }).length >= 20, '표본 수');
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
