/* js/crisis.js · data/crisis-card.js 테스트: 검색어 속 자해·자살 암시 감지와 안내 카드 */
const C = require('../js/crisis.js');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function level(s) { const r = C.detect(s); return r ? r.level : null; }

test('죽고 싶다: 띄어쓰기·어미 변화', function () {
  ['죽고 싶어', '죽고싶다', '죽고 싶어요', '죽고싶은데', '죽 고 싶 어', '그냥 죽고 싶어요.', '죽을래'].forEach(function (s) {
    eq(level(s), 'high', s);
  });
  eq(C.detect('죽고 싶어'), { level: 'high', matched: '죽고싶' });
});

test('사라지고·없어지고·끝내고 싶다', function () {
  ['사라지고 싶어', '없어지고싶다', '다 끝내고 싶어요', '사라져 버리고 싶어'].forEach(function (s) {
    eq(level(s), 'high', s);
  });
});

test('살기 싫다·살고 싶지 않다', function () {
  ['살기 싫어', '살기싫다', '살고 싶지 않아', '살고싶지않아요', '살고 싶지가 않아'].forEach(function (s) {
    eq(level(s), 'high', s);
  });
});

test('자살·자해 의도', function () {
  ['자살하고 싶어', '자살할 거야', '자살 하려고', '자살 방법', '자해하고싶어', '자해할래'].forEach(function (s) {
    eq(level(s), 'high', s);
  });
});

test('방법이 드러나는 말', function () {
  ['손목을 긋고', '손목 긋는', '뛰어내리고 싶어', '목을 매', '약을 다 먹', '약 모아 두고 있어', '유서 쓰는 법'].forEach(function (s) {
    eq(level(s), 'high', s);
  });
});

test('정보를 찾는 말은 watch', function () {
  ['자살', '자해', '자살 위험', '자살 신호', '자살률', '응급', '위기', '자살 예방 109', '자살 예방'].forEach(function (s) {
    eq(level(s), 'watch', s);
  });
  eq(C.detect('자살 위험'), { level: 'watch', matched: '자살' });
});

test('오탐 줄이기: 정보성 죽음 표현은 watch', function () {
  eq(level('죽음의 공포'), 'watch');
  eq(level('죽은 사람'), 'watch');
  eq(level('죽음에 대한 생각'), 'watch');
});

test('부정이 앞뒤에 붙으면 high로 올리지 않는다(watch)', function () {
  ['안 죽고 싶어', '안죽고싶다', '죽고 싶지 않아', '죽고싶진 않아', '죽고 싶은 게 아니라'].forEach(function (s) {
    eq(level(s), 'watch', s);
  });
  eq(level("I don't want to die"), 'watch');
});

test('"불안"의 "안"은 부정이 아니다', function () {
  eq(level('불안 죽고 싶어'), 'high');
  eq(level('불안해서 죽고 싶어'), 'high');
});

test('평범한 검색어는 null', function () {
  ['환청', '망상', '약 부작용', '클로자핀', '재발 신호', '죽 끓이기', '편안', '가족 대응'].forEach(function (s) {
    eq(level(s), null, s);
  });
});

test('빈 값·공백·null은 null', function () {
  eq(C.detect(''), null);
  eq(C.detect('   '), null);
  eq(C.detect(null), null);
  eq(C.detect(undefined), null);
});

test('영어 표현', function () {
  eq(level('kill myself'), 'high');
  eq(level('I want to kill myself'), 'high');
  eq(level('Want To Die'), 'high');
  eq(level('end my life'), 'high');
  eq(level('suicide'), 'watch');
  eq(level('self harm'), 'watch');
  eq(level('self-harm'), 'watch');
  eq(level('suicidal thoughts'), 'watch');
});

test('high가 watch보다 우선한다', function () {
  eq(level('자살 하고 싶어'), 'high');
  eq(level('위기 상담 죽고 싶어'), 'high');
});

/* 2026-11-14 4번째 수정: 예전에는 앞 500자만 봐서 긴 글 끝의 의도를 놓쳤고 이 테스트가 그것을 null 로 못박아 두었어요(검색창에는 글자 수 한도가 없어요).
   이제 500자 창을 400자씩 밀며 글 전체를 보고, 10,000자가 넘으면 앞뒤 5,000자씩 봐요 */
test('긴 글도 끝까지 본다: 500자 창을 겹쳐 밀며 가장 무거운 등급', function () {
  eq(level('환청 '.repeat(300) + '죽고 싶어'), 'high');
  eq(level('죽고 싶어 ' + '환청 '.repeat(300)), 'high');
  eq(level('요즘 병원에 다니면서 약을 먹고 있고 상담도 받고 있는데 '.repeat(20) + '사실 죽고 싶어'), 'high');
  eq(level('나는 괜찮아 '.repeat(80) + 'kill myself'), 'high');
  eq(level('ㅠ'.repeat(520) + '죽고 싶어'), 'high');
  eq(level('환청 '.repeat(300)), null);
  /* 창 경계에 걸친 말(400·500자 자리)도 어느 한 창에 통째로 든다 */
  for (let pad = 380; pad <= 520; pad += 7) eq(level('가'.repeat(pad) + ' 죽고 싶어 ' + '나'.repeat(300)), 'high', '앞 ' + pad + '자');
  /* 앞 창의 타해와 뒤 창의 자살 의도가 함께면 high + harm */
  eq(C.detect('엄마를 죽이고 싶어 ' + '환청 '.repeat(250) + ' 나도 죽고 싶어'), { level: 'high', matched: '죽고싶', harm: true });
  /* 아주 긴 글(10,000자 넘음)도 끝은 본다 */
  eq(level('환청 '.repeat(5000) + '죽고 싶어'), 'high');
});

test('패턴 목록이 노출되고 비어 있지 않다', function () {
  ok(Array.isArray(C.HIGH) && C.HIGH.length >= 20, 'HIGH ' + C.HIGH.length);
  ok(Array.isArray(C.WATCH) && C.WATCH.length >= 10, 'WATCH ' + C.WATCH.length);
  C.HIGH.concat(C.WATCH).forEach(function (p) {
    eq(C.normalize(p), p, '패턴은 정규화된 꼴로 적는다: ' + p);
  });
});

test('안내 카드: high·watch 모두 전화와 문서 링크를 갖는다', function () {
  const src = fs.readFileSync(path.join(__dirname, '..', 'data', 'crisis-card.js'), 'utf8');
  const sandbox = {}; sandbox.window = sandbox; // 브라우저처럼 window.JHB가 전역 JHB가 된다
  vm.runInNewContext(src, sandbox);
  const card = sandbox.window.JHB.crisisCard;
  ['high', 'watch'].forEach(function (k) {
    const c = card[k];
    ok(c && c.title && c.body, k + ' title/body');
    const sentences = c.body.split(/[.!?]\s*/).filter(Boolean).length;
    ok(sentences >= 2 && sentences <= 3, k + ' body 문장 수 ' + sentences);
    has(c.body, '109'); has(c.body, '1577-0199'); has(c.body, '24시간');
    const hrefs = c.actions.map(function (a) { return a.href; });
    ['tel:109', 'tel:1577-0199', 'tel:119', '#/a/suicide-warning-signs', '#/a/relapse-prevention-plan', '#/a/crisis-hotlines']
      .forEach(function (h) { ok(hrefs.indexOf(h) >= 0, k + ' 에 ' + h + ' 없음'); });
    c.actions.forEach(function (a) {
      ok(a.label && a.href, k + ' action label/href');
      ok(/^(tel:|#\/a\/)/.test(a.href), k + ' href 형식: ' + a.href);
    });
    ['환자', '왜', '그러지 마'].forEach(function (bad) { not(c.body, bad, k + ' 판단·설득 표현'); });
  });
});

/* ---------- 0B: 모든 일치 위치·영어 낱말 경계·타해(harm) ---------- */
test('HIGH 는 모든 일치 위치를 본다: 앞의 부정이 뒤의 위험 표현을 가리지 않는다', function () {
  eq(C.detect('안 죽고 싶은데 사라지고 싶어'), { level: 'high', matched: '사라지고싶' });
  eq(C.detect('죽고 싶지 않은데 자해하고 싶어'), { level: 'high', matched: '자해하고싶' });
  eq(level('죽고 싶은 건 아니고 사라지고 싶어'), 'high');
  /* 모두 부정이면 여전히 watch */
  eq(level('안 죽고 싶어 죽고 싶지 않아'), 'watch');
});

test('영어 짧은 낱말은 원문에서 낱말 경계로만(studies·audience·diet 는 아님)', function () {
  ['studies', 'audience', 'twin studies', 'twin studies schizophrenia', 'how to diet', 'want to diet', 'diet', 'dietary', 'sudden', 'odd', 'crisisplan'].forEach(function (s) {
    eq(level(s), null, s);
  });
  ['die', 'died', 'dying', 'death', 'deaths', 'crisis', 'crises', 'emergency', 'hotline', 'overdose', 'suicide rate', 'Crisis plan'].forEach(function (s) {
    eq(level(s), 'watch', s);
  });
  eq(level('how to die'), 'high');
  eq(level('iwanttodie'), 'high');
  eq(level('never kill myself'), 'watch');
});

test('타해 표현은 harm(부정이 붙어도 내리지 않음)', function () {
  ['죽이고 싶어', '죽여버리고 싶다', '때릴 것 같아', '해칠 것 같아', '누군가를 해칠 것 같아', '아이를 해칠 것 같아', '누나를 해칠 것 같아',
    '죽이고 싶지 않은데 자꾸 그런 생각이 나', '찌르고 싶어', 'I want to kill him', 'hurt someone'].forEach(function (s) {
    eq(level(s), 'harm', s);
  });
  eq(C.detect('죽이고 싶어'), { level: 'harm', matched: '죽이고싶' });
  /* 누가 나를 해칠 것 같다(위협을 느낌)도 같은 안내 */
  eq(level('그 사람이 나를 죽일 것 같아'), 'harm');
  eq(level('저를 때릴 것 같아요'), 'harm');
});

test('사람이 아닌 것을 해치는 말은 타해가 아니다', function () {
  ['약이 간을 해칠까', '건강을 해칠 것 같아', '관계를 해칠까 봐', '기분을 해칠까 봐', 'hurt my back'].forEach(function (s) {
    eq(level(s), null, s);
  });
  eq(level('인간을 해칠 것 같아'), 'harm');
});

test('나 자신을 해치려는 말은 high, 자살·자해와 타해가 함께면 high + harm', function () {
  eq(level('나를 해치고 싶어'), 'high');
  eq(level('내 몸을 해칠 것 같아'), 'high');
  eq(level('내가 나를 해칠 것 같아'), 'high');
  eq(C.detect('엄마를 죽이고 싶고 나도 죽고 싶어'), { level: 'high', matched: '죽고싶', harm: true });
  eq(C.detect('kill myself'), { level: 'high', matched: 'killmyself' });
  /* 부정된 high 보다 타해가 앞선다 */
  eq(level('죽고 싶지 않은데 죽이고 싶어'), 'harm');
});

test('정보 검색 말(watch)은 그대로: 팔레트·찾기에서 전화로 이어지지 않으므로 넓게 둔다', function () {
  ['자살률', '자살 예방', '위기 계획', '응급실', '살기 좋은 동네', '죽음'].forEach(function (s) { eq(level(s), 'watch', s); });
});

test('안내 카드 harm: 112·119·1577-0199 와 응급·화 다루기 글, 낙인 없는 말', function () {
  const src = fs.readFileSync(path.join(__dirname, '..', 'data', 'crisis-card.js'), 'utf8');
  const sandbox = {}; sandbox.window = sandbox;
  vm.runInNewContext(src, sandbox);
  const c = sandbox.window.JHB.crisisCard.harm;
  ok(c && c.title === '지금 위험하다고 느낀다면', 'harm 제목');
  const sentences = c.body.split(/[.!?]\s*/).filter(Boolean).length;
  ok(sentences >= 2 && sentences <= 3, 'harm body 문장 수 ' + sentences);
  has(c.body, '112'); has(c.body, '1577-0199'); has(c.body, '24시간'); has(c.body, '혼자 버티지 않아도');
  const hrefs = c.actions.map(function (a) { return a.href; });
  ['tel:112', 'tel:119', 'tel:1577-0199', '#/a/emergency-response', '#/a/anger-irritability'].forEach(function (h) { ok(hrefs.indexOf(h) >= 0, 'harm 에 ' + h + ' 없음'); });
  eq(hrefs[0], 'tel:112', '112 가 맨 앞');
  ['환자', '왜', '그러지 마', '폭력적', '위험한 사람', '범죄'].forEach(function (bad) { not(c.body + c.title, bad, 'harm 판단·낙인 표현'); });
  /* 링크한 글이 실제로 있다 */
  ['emergency-response', 'anger-irritability'].forEach(function (slug) {
    const found = fs.readdirSync(path.join(__dirname, '..', 'content')).some(function (d) { return fs.existsSync(path.join(__dirname, '..', 'content', d, slug + '.md')); });
    ok(found, slug + '.md 가 없어요');
  });
});

/* ---------- 0B 검토 반영: 놓치던 high, 덮인 일치의 부정, 정보 검색 오탐, 영어 부정 ---------- */
test('본인 의도가 분명한 말은 high(전에는 아무것도 안 뜨던 말)', function () {
  ['그만 살고 싶어', '세상을 떠나고 싶어', '이 세상 떠나고 싶어', 'i dont want to live anymore', "I don't want to live", 'I want to disappear',
    '약을 한꺼번에 먹을까', '수면제 모아뒀어', '남은 약 몇 달째 모아놨어', '다 포기하고 싶어', '인생 포기', '나 같은 건 없는 게 나아', '나 같은 건 없어도 돼',
    '약 과다복용하면 죽나요', '수면제 한꺼번에 먹으면 죽어?', '진통제 많이 먹으면 죽나요', '약 치사량', 'kms', 'KMS',
    '번개탄 피우고 싶어', '살아서 뭐해', '사는 게 의미 없어', '내가 없으면 가족이 편할까', '내가 사라지면'].forEach(function (s) {
    eq(level(s), 'high', s);
  });
  /* 낱말 하나만은 정보 검색일 수도 있어 watch(그래도 109·1577-0199 줄이 보임) */
  ['번개탄', '캠핑 번개탄', '과다복용 증상', '수면제 과다복용', '포기하고 싶어'].forEach(function (s) { eq(level(s), 'watch', s); });
  /* 2026-11-14 고침: 전에는 watch 였어요. 본인 존재를 부정하는 말은 수동적 자살 사고라 원칙 P1(본인 생각은 high)에 맞춰 high 로 올렸어요.
     남 이야기("딸이 태어나지 말았어야 했대요")는 high 여도 되는 watch 예요(문장 모음). */
  eq(level('태어나지 말았어야 했어'), 'high');
  ['10 kms', '그만 살 빼고 싶어', '살 빼고 싶어', '환청이 사라졌으면 좋겠어', '환청 없어지는 약', '물 많이 마시면 죽나요', '밥 다 먹고 죽 끓였어'].forEach(function (s) { eq(level(s), null, s); });
});

test('의도·방법이 드러나는 말은 watch 가 아니라 high', function () {
  ['죽어야겠다', '죽어야겠어', '목숨을 끊고 싶어', '극단적 선택을 하고 싶어', '극단적인 선택을 하고 싶어', '극단적 선택을 할 거야',
    '자살 충동이 심해', '자살 생각이 계속 들어', '자살 생각이 나요', "I'm suicidal", 'I feel suicidal', 'i am suicidal', 'feeling suicidal',
    '고통 없이 죽는 법', '안 아프게 죽는 법', '죽는 방법', '수면제 몇 알 먹으면 죽어'].forEach(function (s) {
    eq(level(s), 'high', s);
  });
  eq(C.detect('죽어야겠다'), { level: 'high', matched: '죽어야겠' });
  /* 앞 낱말 경계: "him suicidal" 의 "im suicidal" 은 아님 */
  eq(level('it made him suicidal'), 'watch');
  ["I'm not suicidal", "I don't feel suicidal"].forEach(function (s) { eq(level(s), 'watch', s); });
});

test('부정: 더 긴 일치에 덮이는 짧은 일치는 따로 보지 않는다(모두 부정이면 watch), 두 번 부정은 취소', function () {
  ['자해하고 싶지 않아', '자살하고 싶지 않아', '자살하고 싶진 않아', '자해하고 싶진 않아', '그만 살고 싶지 않아', '세상을 떠나고 싶지 않아'].forEach(function (s) {
    eq(level(s), 'watch', s);
  });
  eq(C.detect('자살하고 싶지 않아'), { level: 'watch', matched: '자살하고싶' });
  /* 두 번 부정 */
  ['죽고 싶지 않은 건 아니야', '안 죽고 싶은 건 아니야', '자살하고 싶지 않은 건 아니야'].forEach(function (s) { eq(level(s), 'high', s); });
  /* 스스로 부정을 품은 패턴 뒤의 "아니" 는 다시 뒤집는다 */
  eq(level('살고 싶지 않은 건 아니야'), 'watch');
  /* 덮이지 않는 다른 일치는 여전히 따로 본다 */
  eq(level('자해하고 싶지 않은데 죽고 싶어'), 'high');
});

test('정보 검색·일상 말 오탐: high 가 아니다', function () {
  [['유서 깊은 절', null], ['유서 깊은', null], ['유서의 법적 효력', 'watch'], ['돈에 목매는 사람', null], ['성적에 목매지 마', null],
    ['버스에서 뛰어내리다 다침', null], ['약을 모아 두는 통', 'watch'], ['약 모으기 앱', 'watch'], ['약을 모아서 버리는 곳', null], ['다끝내기 챌린지', null],
    ['숙제 다 끝내고 쉬기', 'watch'], ['일 다 끝내고 싶어', 'watch'],
    ['조현병 환자 자살할 확률', 'watch'], ['자살할 위험 요인', 'watch'], ['가족이 자살하고 나서', 'watch'], ['자살을 하는 이유', 'watch'],
    ['자해할 때 대처법', 'watch'], ['자해하고 있는 아이 대처', 'watch'], ['항정신병약 먹으면 죽을까요', 'watch'], ['엄마가 죽을까 봐 무서워', 'watch'],
    ['자살 충동 대처', 'watch'], ['자살 생각이 들 때 대처', 'watch'], ['자살 생각이 없어요', 'watch'], ['자살 생각이 있으면 109', 'watch'],
    ['목숨을 끊은 사람', 'watch'], ['극단적 선택을 하는 이유', 'watch'], ['약을 한 번에 먹어도 되나요', 'watch'], ['아침 저녁 약 한꺼번에 먹어도 되나요', 'watch'],
    ['벌레 죽는 약', 'watch'], ['바퀴벌레 죽는 법', 'watch']
  ].forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
  /* 예외는 그 일치 바로 뒤만 본다: 뒤쪽 다른 자리의 "이유" 로 내리지 않는다 */
  eq(level('자살할 거야 이유는 없어'), 'high');
  eq(level('자해하고 있어'), 'high');
  eq(level('유서 쓰는 법'), 'high');
  eq(level('그냥 죽을까'), 'high');
});

test('사람이 아닌 것(시간·벌레·드럼…)을 죽이고 때리는 말은 타해가 아니다', function () {
  ['시간 죽이고 싶어', '벌레 죽일까', '드럼 때릴까', '모기 죽이고 싶어', '바퀴벌레 죽일 거야', '게임 보스 죽이고 싶어'].forEach(function (s) {
    eq(level(s), null, s);
  });
  eq(level('동생 죽이고 싶어'), 'harm');
});

test('영어 부정은 조동사 구(want to·going to·would)를 건너뛰고 본다', function () {
  ["I don't want to die", 'I dont want to kill myself', 'I would never kill myself', "I'm not going to kill myself", 'i would never ever hurt myself'].forEach(function (s) {
    eq(level(s), 'watch', s);
  });
  ['I want to kill myself', 'I will kill myself', "I don't want to die but I want to kill myself", 'wanting to die'].forEach(function (s) {
    eq(level(s), 'high', s);
  });
});

test('hasContact: 위기 연락처(109·1577-0199·119·112·1393)가 든 조각인가', function () {
  ['<a href="tel:109">109</a>', '<strong><a href="tel:119">119</a></strong>', '1577-0199에 전화', '바로 119에 연락', '<strong>112</strong>(경찰)', '자살예방상담 109'].forEach(function (s) {
    ok(C.hasContact(s), s);
  });
  ['112개 연구', '1,109명 메타분석', '반응 곡선 119개', '2019년', '11190', '1577-01999', '119점', '<a href="tel:1577-1000">1577-1000</a>', ''].forEach(function (s) {
    ok(!C.hasContact(s), s);
  });
});

test('요약 보기: 위기 연락처가 든 소절은 모든 글에서 core(접히지 않음)', function () {
  const md = require('../js/md.js');
  const appSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  const m = /const CORE_H2 = \/(.+)\/;/.exec(appSrc);
  ok(m, 'app.js 에서 CORE_H2 를 못 찾음');
  const CORE_H2 = new RegExp(m[1]);
  has(appSrc, "i === 0 || CORE_H2.test(t) || sectionHasContact(h) ? 'core' : 'detail'", 'app.js 가 연락처 소절을 core 로');
  has(fs.readFileSync(path.join(__dirname, '..', 'js', 'ui', 'reading.js'), 'utf8'), "if (s.key !== 'core' && hasContact(s.nodes)) s.key = 'core';", 'reading.js 도 한 번 더');
  let withContact = 0; const folded = [];
  const root = path.join(__dirname, '..', 'content');
  fs.readdirSync(root).forEach(function (d) {
    const dir = path.join(root, d);
    if (!fs.statSync(dir).isDirectory()) return;
    fs.readdirSync(dir).filter(function (f) { return /\.md$/.test(f); }).forEach(function (f) {
      const p = md.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const tags = p.meta.tags || [];
      if (tags.indexOf('위기') >= 0 || tags.indexOf('응급') >= 0) return; /* 늘 전체 보기 */
      let i = -1;
      md.render(p.body).html.split(/(?=<h2 )/).forEach(function (part) {
        const h = /^<h2 [^>]*>([\s\S]*?)<\/h2>/.exec(part);
        if (!h) return;
        i++;
        const title = h[1].replace(/<[^>]+>/g, '').trim();
        if (!C.hasContact(part.slice(h[0].length))) return;
        withContact++;
        if (!(i === 0 || CORE_H2.test(title) || C.hasContact(part.slice(h[0].length)))) folded.push(f + ' / ' + title);
      });
    });
  });
  ok(withContact >= 20, '연락처 소절이 너무 적음(검사가 안 도는지): ' + withContact);
  eq(folded, [], '요약 보기에서 접히는 연락처 소절');
});

/* ---------- 2026-11-14 다시 지음: 줄기 × 어미, 낮춤 표(P5), 문장 모음·사이트 낱말 ---------- */
const TRY = require('./crisis-try.cjs');
const CORPUS = TRY.loadCorpus();

test('문장 모음(tests/crisis-corpus.json): expect 가 high 이면 반드시 high, 나머지는 expect·allow 안, harm:true 면 harm 표시까지', function () {
  ok(CORPUS.length >= 3400, '문장 모음이 너무 적음(2026-11-14 공격 결과 4번째 수정 뒤 3,446개): ' + CORPUS.length);
  const texts = new Set();
  const bad = [];
  CORPUS.forEach(function (e) {
    ok(!texts.has(e.text), '겹치는 문장: ' + e.text); texts.add(e.text);
    ok(['high', 'watch', 'harm', null].indexOf(e.expect) >= 0 && Array.isArray(e.allow), '형식: ' + e.text);
    const j = TRY.judge(e);
    if (!j.pass) bad.push(TRY.label(j.got) + ' ← ' + (e.expect === null ? 'null' : e.expect) + (e.harm ? '+harm' : '') + ' : ' + e.text);
  });
  eq(bad, [], '어긋난 문장(node tests/crisis-try.cjs --corpus 로 자세히)');
});

test('낮춤 표는 짝으로: 관용구·정보 꼴은 내려가고, 같은 낱말의 본인 의도는 high 로 남는다', function () {
  [ /* [내려가야 하는 말, 기대, 내려가면 안 되는 말] */
    ['돈에 목매는 사람', null, '나무에 목매고 싶어'], ['성적에 목매지 마', null, '방문 고리에 목매려고'], ['넥타이 목 매듭 묶는 법', null, '목맬까'],
    ['유서 깊은 절', null, '유서 보관할 곳 정해 뒀어'], ['다끝내기 챌린지', null, '다 끝내기로 했어'],
    ['버스에서 뛰어내리다 다침', null, '기차에서 뛰어내릴까'], ['뛰어내리기 운동 무릎에 좋아?', null, '차에서 뛰어내릴래'],
    ['약 모아 두는 통 추천', 'watch', '약 모아 뒀어'], ['약 다 먹었어 처방 다시 받아야 해', 'watch', '약 다 먹어버릴까'],
    ['숙제 다 끝내고 싶어', 'watch', '내일 다 끝내고 싶어'], ['이번 주에 다 끝내야지 과제', 'watch', '토요일 다 끝내고 싶어'],
    ['조현병 환자가 자살할 확률', 'watch', '자살할 확률 높은 방법'], ['자살할 위험 요인', 'watch', '자살할 이유밖에 없어'],
    ['가족이 자살하고 나서', 'watch', '자살하고 나서 남은 사람들 괜찮을까'], ['자해하고 있는 아이 대처', 'watch', '자해하고 나면 기분이 나아져'],
    ['자살하기 전 보이는 신호', 'watch', '자살을 하기 전에 연락할게'], ['자살 충동 대처', 'watch', '자살 충동이 없어지질 않아'],
    ['자살 생각이 없어요', 'watch', '자살 생각이 없어지지 않아'], ['엄마가 죽을까 봐 무서워', 'watch', '콱 죽어버릴까'],
    ['숙제 안 하면 엄마한테 죽을 거야', 'watch', '오늘 죽을 거야'], ['뷔페 가서 다 먹고 죽을 거야', 'watch', '수면제 다 먹고 죽을 거야'],
    ['벌레 죽는 약', 'watch', '죽는 약 있어?'], ['환청이 사라졌으면 좋겠어', null, '내가 사라졌으면 좋겠어'],
    ['환청 언제 없어질까요', null, '나 같은 거 없어지면 좋겠다'], ['목숨을 끊은 사람', 'watch', '목숨을 끊고 싶어요'],
    /* 2026-11-14 공격 결과 1번째 수정: 새 낮춤 규칙도 짝으로. 오른쪽은 예전에 null·watch 로 새던 본인 의도 문장 */
    ['딸이 사라졌으면 좋겠대요', 'watch', '요즘은 그냥 사라졌으면 좋겠어'], ['환청이 사라졌으면 좋겠어', null, '고통 없이 사라졌으면 좋겠어'],
    ['돈에 목맨다', null, '나무에 목맨다'], ['선을 긋고 싶어', null, '긋고 싶다'], ['선 그을까 말까', 'watch', '그을까 말까'],
    ['집에 빨리 가고 싶다', 'watch', '병 걸려서 빨리 가고 싶다'], ['학원 그만 가고 싶어', 'watch', '아프지 않게 가고 싶어'],
    ['밤에 안 깨는 법', 'watch', '잠들어서 안 깨는 법'], ['혼자 살 자신이 없어', 'watch', '살 자신이 없어'], ['가방을 뒤지자', 'watch', '뒤지자 그냥'],
    ['시험 다 끝났으면 좋겠다', 'watch', '그냥 다 끝났으면'], ['이 책을 이번 주에 끝낼래', 'watch', '이번 주에 끝낼래'], ['엄마 죽으면 안 돼', 'watch', '죽으면 안 돼?'],
    ['딸이 자해할까 봐 무서워요', 'watch', '자해할까 봐 무서워요'], ['한강 가서 치킨 먹고 싶다', null, '한강 가고 싶다'], ['kms running pace', 'watch', 'ugh no kms'],
    ['자살 생각이 없어요', 'watch', '자살 생각이 안 꺼져'], ['죽고 싶지 않아', 'watch', '죽고 싶지 않다는 건 거짓말이야'],
    /* 2026-11-14 공격 결과 2번째 수정: 새 줄기(뛰어들다·몸을 던지다·안락사·내려놓다·끝내고 싶다·마침표)의 낮춤도 짝으로 */
    ['사업에 뛰어들고 싶다', 'watch', '선로에 뛰어들고 싶다'], ['바다에 뛰어들어 수영하고 싶다', 'watch', '바다에 뛰어들고 싶다'],
    ['일에 몸을 던지고 싶어', 'watch', '강물에 몸을 던지고 싶어'], ['강아지 안락사 하고 싶어', 'watch', '안락사 하고 싶다'],
    ['마음을 이제 내려놓고 싶어', 'watch', '이제 그만 내려놓고 싶어'], ['이 드라마 빨리 끝내고 싶어', 'watch', '모든 게 너무 지쳐서 끝내고 싶어'],
    ['이 게임 end 하고 싶어', 'watch', '그냥 end it 하고 싶어'], ['오늘 방송은 여기까지 안녕', 'watch', '여기까지만 할게 안녕'],
    ['케이크 커팅했어', 'watch', '커팅했어'], ['kms 단위로 기록', 'watch', 'ugh k.m.s'], ['자해공갈단 검거', null, '자해 하고 싶어'],
    ['민족자결주의', null, '자결하고 싶다'], ['나무로 돌아가고 싶어', null, '무로 돌아가고 싶어'], ['누나 없으면 심심해', null, '나 없으면 다 편하겠지'],
    ['나가거든 문 잠가', null, '나 가거든 엄마 잘 부탁해'], ['애들 데리고 같이 여행 떠날래', null, '아이 데리고 같이 떠날래']
  ].forEach(function (x) {
    eq(level(x[0]), x[1], x[0]);
    eq(level(x[2]), 'high', x[2]);
  });
});

test('줄기 × 어미: 활용형·수동적 사고·오타·영어 빈틈', function () {
  ['디질래', '뒤져버릴까', '그냥 죽었으면 좋겠다', '자다가 안 깼으면', '죽어도 상관없어', '죽을 날짜 정했어', '이제 다 끝내기로 했어', '오늘 밤에 다 끝낼 거야',
    '번개탄 피울까', '번개탄 피워야지', '번개탄 샀어', '사라지구싶어', '죽구싶다', '쥭고싶어', '자샇하고싶어', '죽고시퍼',
    '목소리가 죽으라고 해요', '환청이 시켜요 자해하라고', '귀에서 계속 죽어라 죽어라 해요',
    'i dont want to be alive', 'no point living', 'painless way to die', "I'm going to end it tonight", 'want to unalive myself',
    'never wanted to die more than now', "it's not that i don't want to die", "I can't stop thinking about killing myself"].forEach(function (s) {
    eq(level(s), 'high', s);
  });
  /* 같은 줄기라도 의도 어미가 없거나 다른 뜻이면 high 가 아님 */
  /* '배고파 죽겠어'는 2026-11-14 4번째 수정에서 null(기쁨·배고픔의 '-어 죽겠다'는 관계없는 관용구, P5). '피곤해 죽을 것 같아'처럼 지친 말은 watch 로 남겨요 */
  [['죽어라 연습했다', 'watch'], ['배고파 죽겠어', null], ['죽고 못 사는 사이', 'watch'], ['피곤해 죽을 것 같아', 'watch'],
    ['how to kill time at the airport', null], ['can I take my life insurance money early', null], ['suicidal thoughts', 'watch']].forEach(function (x) {
    eq(level(x[0]), x[1], x[0]);
  });
});

test('2026-11-14 2번째 수정: 로마자·영문 자판으로 친 한국어, 끼운 숫자·남은 자음, 한영 섞기는 같은 한국어 규칙으로 본다', function () {
  ['jukgo sipda', 'jasal hago sipda', 'an kkaesseumyeon joketda', 'wnrrhtlvek', '죽고 tlvek', 'wnrrh 싶다', '자1살 하고 싶다', '죽고1싶다', '자살ㅎ하고 싶다',
    'suicide를 하고 싶어', 'OD 해서 응급실 왔어', 'I want to 자살', 'i want to d i e', 'ugh k.m.s', 'sewerslide 하고 싶어', 's*icide 하고 싶어'].forEach(function (s) {
    eq(level(s), 'high', s);
  });
  [['jukgo sipjin ana', 'watch'], ['jasal yebang', 'watch'], ['자1살률', 'watch'], ['wnrdlrhtlvek', 'harm'], ['엄마를 stab 하고 싶어', 'harm'],
    ['jasmine tea', null], ['sale price', null], ['hangang park picnic', null], ['cutting board', null], ['롤에서 kill 할래', null], ['모기 kill 하고싶다', null]].forEach(function (x) {
    eq(level(x[0]), x[1], x[0]);
  });
  /* 동반은 본인 의도(high)이면서 타해(harm:true) */
  ['아이 데리고 같이 떠날래', '애들이랑 같이 하늘나라 갈래'].forEach(function (s) { eq(level(s), 'high', s); eq(C.detect(s).harm, true, s); });
});

test('2026-11-14 3번째 수정 · 본인 의도의 빈틈을 구조로: 명령 환청 × 명령 어미, 약 이름 × 양, 부정 판단, 앞 절 주어', function () {
  /* 명령 환청 = 자기를 해치는 행동 × -라·-래·-라고(장소가 있어도 없어도). 남을 향하면 타해, 자해와 관계없는 명령은 아님 */
  ['목소리가 옥상에서 떨어지라고 해', '환청이 사라져 버리래', '목소리가 쓸모없으니 꺼지래', '환청이 피를 내라고 해요', '환청이 차도로 걸어가래', '목소리가 철로에 누우래',
    '환청이 칼로 나를 찌르래', '하나님이 나보고 하늘로 올라오래'].forEach(function (s) { eq(level(s), 'high', s); });
  eq(level('환청이 엄마를 찌르래'), 'harm');
  ['환청이 집에서 나가라고 해', '엄마가 방에서 나가라고 해', '선생님이 집에 가래', '목소리가 작아지래'].forEach(function (s) { eq(level(s), null, s); });
  /* 약 이름·양 낱말 뒤 조사·'남은 거'·앞에서 꾸미는 '모아 둔 약' · 'N 치'·서랍에 */
  ['루루정 한 통 다 먹을래', '정신과 약 한 통을 다 먹었어', '약 남은 거 다 먹어 버릴래', '모아 둔 수면제 먹을 거야', '약 한 달 치 모아 놨어', '약 안 먹고 서랍에 다 모아 두고 있어',
    '약 모아 통째로 삼킬래', '약을 왕창 먹으면 환청이 멈출까', 'pills 한 통 다 먹을래'].forEach(function (s) { eq(level(s), 'high', s); });
  [['클로자핀 혈액검사', null], ['약 한 달 치 처방받았어', null], ['남은 약 모아서 약국에 반납', null], ['약 모아서 버리지 말고 반납해', null], ['약을 다 먹으면 다시 처방받나요', 'watch']]
    .forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
  /* 부정 판단: '동안·잘못'의 안·못은 부정이 아님, 두 번 부정·시늉·반문·'없었는데 지금은 있어'는 취소, '본 적 없어'는 부정 */
  ['그동안 죽고 싶었어요', '다 내 잘못 죽고 싶다', '죽고 싶은 마음이 없진 않아', '자살 생각이 없는 건 아니야', '죽고 싶지 않다면 거짓말이지', '죽고 싶지 않은 척 하는 게 너무 힘들어',
    '어떻게 안 죽고 싶겠어', '그만 살아도 되지 않을까', '전엔 자살할 생각은 없었는데 지금은 있어', '안 죽을 자신이 없어', '자살 안 할 거라고 장담 못 해'].forEach(function (s) { eq(level(s), 'high', s); });
  ['죽을 이유가 없어', '죽을 마음은 없어', '자살을 생각해 본 적 없어', '사라지기 싫어', '죽지 않을 자신 있어'].forEach(function (s) { eq(level(s), 'watch', s); });
  /* 앞 절의 주어·목적어는 이 말의 주어가 아니다(엄마는 모르겠지만 · 희망을 잃었어). 전하는 말(-대요)이면 남 이야기 */
  ['엄마는 모르겠지만 끝내고 싶어', '희망을 잃었어 끝낼 거야', '엄마가 나를 미워해서 나를 지우고 싶어', '엄마는 반대하지만 나는 안락사 받고 싶어',
    '친구들은 다 잘 사는데 나는 극단적인 생각이 들어'].forEach(function (s) { eq(level(s), 'high', s); });
  [['아들이 끝내겠대요', 'watch'], ['친구가 나쁜 생각이 든대요', 'watch'], ['이 책을 이번 주에 끝낼래', 'watch'], ['딸이 자기 손목을 그어요', 'watch'], ['아들이 눈을 찌르려고 해요', 'watch']]
    .forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
});

test('2026-11-14 3번째 수정 · 낮춤은 짝으로: 내려가야 하는 말과 그대로 high 여야 하는 말', function () {
  [ /* [내려가야 하는 말, 기대, 같은 규칙의 본인 의도 말] */
    ['걱정 없는 사람이 되고 싶어', null, '없는 사람이 되고 싶어'], ['손떨림 없어지는 방법', 'watch', '조용히 사라지는 방법'], ['환청이 사라지는 방법', null, '흔적 없이 사라지는 법'],
    ['곧 없어질 것 같아요 이 기능', 'watch', '내가 사라질 것 같아'], ['할머니가 천국에 갔으면 좋겠어', 'watch', '나 그냥 하늘나라 갔으면 좋겠다'],
    ['우리 이제 끝내자', 'watch', '죽을 각오 했어 이제 끝내자'], ['집으로 빨리 가고 싶다', 'watch', '하늘로 편하게 가고 싶다'],
    ['오늘 방송은 여기까지 안녕', 'watch', '오늘 밤, 내 인생은 여기까지야'], ['이 논란에 이제 마침표를 찍고 싶어', 'watch', '내일 삶에 마침표를 찍을래'],
    ['누나 없으면 심심해', null, '그냥나없으면다편하겠지'], ['밑줄 긋고 싶어', null, '팔에 줄 긋고 싶어'], ['약 모아 두는 통 추천', 'watch', '약 모아서 버리지 않고 숨겨 놨어'],
    ['엄마가 약을 모아서 버리지 않으세요', 'watch', '약 버리는 척하고 모았어'], ['번개탄 캠핑용으로 주문했어', 'watch', '번개탄 주문했어'],
    ['철로 위에 서 있으면 위험해', 'watch', '철로 위에 서 있어'], ['친구가 옥상 난간에 앉아 있대요', 'watch', '옥상 난간에 앉아 있어'],
    ['머리를 잘라 버리고 싶어', null, '손을 잘라 버려야 해'], ['생선을 칼로 꺼내야 해', null, '머리에 칩이 있어서 칼로 꺼내야 해'],
    ['이번 주에 파업을 결행할 거야', 'watch', '이번 주말에 결행할 거야'], ['그 가격이면 그냥 안 살래', 'watch', '입원하면 그냥 안 살 거야'],
    ['당신이 날 데려가 줘', null, '하느님 제발 저 좀 데려가 주세요'], ['당신 곁으로 가고 싶어', 'watch', '하나님 곁으로 가고 싶어'],
    ['자살 생각이 들 때 대처', 'watch', '자살이 자꾸 생각나'], ['자살 시도한 적 있는 사람 상담', 'watch', '자살 시도 두 번 했어'], ['유서 대필 부탁해도 돼요?', 'watch', '방학 동안 유서를 썼어']
  ].forEach(function (x) {
    eq(level(x[0]), x[1], x[0]);
    eq(level(x[2]), 'high', x[2]);
  });
});

test('2026-11-14 3번째 수정 · 타해: 같은 줄기의 다른 꼴(뻔·-러·-려·했), 흉기를 들다(쓰임이 분명하면 아님), 독, 폭력·학대, 맞다(어울리다는 아님), 영어', function () {
  ['아빠를 칼로 찌를 뻔했어', '누가 날 죽이러 오고 있어', '엄마가 나를 때리려고 해', '제가 동생을 다치게 했어요', '아들이 칼을 들었어요', '남편이 칼 들었어요 무서워요',
    '엄마가 음식에 독을 탄 것 같아요', '그놈 가만 안 둘 거야', '엄마가 가짜라서 없애야 해', '가정폭력 당하고 있어요', '남편이 아이를 학대해요', '아빠한테 두들겨 맞았어요',
    '아이가 학교에서 맞고 왔어요', '아빠가 날 반 죽여 놨어', '아들이 저한테 물건을 던져요', '남편이 제 목을 졸랐어요', '아들이 폭력적으로 변했어요', '그놈 얼굴을 그어버리고 싶어',
    'i have thoughts of hurting my kids', 'my dad slapped me', 'my son is violent', 'i want to beat him up'].forEach(function (s) { eq(level(s), 'harm', s); });
  ['칼 들고 요리하는 중', '낫 들고 벌초하러 갔어요', '조현병 환자에게 맞는 약', '딸한테 맞을까요 이 옷', '어떤 사람에게 맞는지 정리했어요', '좀비 다 죽이고 싶다',
    '동생이랑 게임하다 다 죽여버렸어', '분위기 죽였어', '생명을 위협하는 일은 드물어요', '어릴 때 학대받았어요', '혀를 깨물었어 밥 먹다가', '아빠가 비틀거려요',
    'my friend hit me up yesterday', 'my mom beat me at chess', "i'm hurting her feelings"].forEach(function (s) { eq(level(s), null, s); });
  /* 나를 향한 명령·이미 한 일·뒤에 온 목적어는 자해(high), 동반 명령은 high + harm */
  ['목소리가 나를 때리라고 해서 때렸어', '벌을 받아야 해서 나를 때렸어', '죽이고 싶어 나 자신을', '내 눈을 찔러 버리고 싶어', '칼을 들고 손목을 보고 있어'].forEach(function (s) {
    const r = C.detect(s); eq(r && r.level, 'high', s); ok(!r.harm, s + ' 는 타해 표시가 없어야');
  });
  eq(C.detect('환청이 가족이랑 같이 죽으래').harm, true);
  /* 남이 자기 몸에 하려는 일은 watch(타해 카드가 아님) */
  ['딸이 칼을 들고 자기를 찌르겠대요', '아들이 자기 몸에 불을 지르겠대요'].forEach(function (s) { eq(level(s), 'watch', s); });
});

test('타해: 명령 환청·피해 쪽 말·자살과 함께면 high + harm:true', function () {
  ['환청이 엄마를 죽이라고 해요', '남편이 저를 때려요', '아들이 칼을 들고 위협해요', '화가 나면 동생을 칠 것 같아요', '아빠한테 손이 나갈 것 같아', '엄마 kill 하고 싶어']
    .forEach(function (s) { eq(level(s), 'harm', s); });
  ['엄마 죽이고 나도 죽을래', '누굴 죽이기 전에 내가 먼저 죽어야 해', 'i want to kill him and then myself', 'voices tell me to hurt my mom and then die']
    .forEach(function (s) { eq(C.detect(s).harm, true, s); eq(level(s), 'high', s); });
  ['숨 죽이고 봤어', '비가 창문을 때린다', '회사 때려치우고 싶다', '이 약이 나한테 맞아요', '주사 맞고 있어요', '넘어져서 다칠까 봐 걱정이야', '다치고 싶지 않아']
    .forEach(function (s) { eq(level(s), null, s); });
  eq(level('지금 다른 사람이 다칠 것 같으면 112'), null, '"다칠"의 "다"는 사람(다 = 모두)이 아님');
});

test('타해 가르기(2026-11-14): 남이 나를 위협하면 harm, 남이 자기를 해치면 harm 이 아님, 자살 위협은 협박이라도 watch, 동반은 harm', function () {
  ['형이 저를 죽여 버리겠대요', '아빠가 저를 맨날 패요', '친구한테 매일 맞아요', '엄마가 아이랑 같이 죽겠대요', "i'll kill you", 'my husband hits me', 'someone is trying to kill me']
    .forEach(function (s) { eq(level(s), 'harm', s); });
  ['동생이 자기 몸을 자꾸 때려요', '엄마가 죽는다고 협박해요', '여자친구가 자해한다고 협박해요'].forEach(function (s) { const r = C.detect(s); ok(r && !r.harm && r.level !== 'harm', s + ' → ' + JSON.stringify(r)); });
  ['다 같이 죽자', '애들 데리고 같이 죽을까', 'kill my dad and then myself'].forEach(function (s) { eq(C.detect(s).harm, true, s); eq(level(s), 'high', s); });
  ['그 옷 너한테 맞아', '이 약이 나한테 맞아요', 'the song hits me hard', 'hurt my back'].forEach(function (s) { eq(level(s), null, s); });
});

test('긴 글(500자)도 빠르다: 같은 말이 수십 번 되풀이돼도 평균 5ms 안', function () {
  ['죽고 싶어 '.repeat(60), '안 죽고 싶어 '.repeat(50), 'i dont want to die '.repeat(30), '사라졌으면 '.repeat(80)].forEach(function (s) {
    C.detect(s);
    const t0 = Date.now();
    for (let i = 0; i < 20; i++) C.detect(s);
    ok((Date.now() - t0) / 20 < 5, s.slice(0, 10) + ' ' + (Date.now() - t0) / 20 + 'ms');
  });
});

/* ---------- 2026-11-14 4번째 수정: 낱말을 하나씩 덧대지 않고 빈틈의 종류(입력·뒤집힌 바람·부정·사람 낱말·타해가 아닌 쓰임)로 ---------- */
const cc = function () { return String.fromCharCode.apply(null, arguments); };   // 보이지 않는 글자는 코드 값으로(소스에 넣지 않으려고)

test('4번째 수정 · 입력: 띄어쓰기 아닌 기호는 모두 가름, 보이지 않는 글자·조합형·이모지 낱말·떨어진 받침, 문자열이 아닌 값', function () {
  ['죽고' + cc(0x11A2) + '싶다', '그냥' + cc(0x11A2) + '사라지고' + cc(0x11A2) + '싶어', '죽고' + cc(0x318D) + '싶다', '죽고' + cc(0x2025) + '싶다', '죽고' + cc(0x22EF) + '싶다',
    '죽고|싶다', '죽고+싶다', '죽고<싶다', '자#살하고 싶어', '자@살할래', '죽고 싶어'.normalize('NFD'), '사라지고 싶어'.normalize('NFD'),
    '자' + cc(0x200B) + '살' + cc(0x200B) + '하고 싶다', '자' + cc(0xAD) + '살할래', '자' + cc(0x2060) + '살하고 싶어', '죽고' + cc(0x3164) + '싶어', 'k' + cc(0x200B) + 'm' + cc(0x200B) + 's',
    cc(0xD83D, 0xDC8A) + ' 다 먹을래', '오늘 밤 ' + cc(0xD83D, 0xDC8A) + ' 다 털어 넣을 거야', cc(0x26B0, 0xFE0F) + ' 들어가고 싶다', '이제 그만 ' + cc(0xD83D, 0xDC80),
    '주ㄱ고 싶어', '자사ㄹ하고 싶어', '죽고 시ㅍ어', '사ㄹ기 싫어', '죽고ㅅ싶다'].forEach(function (s) { eq(level(s), 'high', JSON.stringify(s)); });
  [['자@살', 'watch'], ['#자살예방', 'watch'], ['#환청 #조현병', null], ['C++ 공부', null], ['1+1=2', null], ['email@naver.com', null], ['가ㄴ다 나 집에', null], ['하ㅋㅋ 웃겨', null],
    [cc(0xD83D, 0xDC8A) + ' 먹을 시간', null], ['도서관 가고 싶다', null], ['박물관에 들어가고 싶다', null]].forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
  /* 문자열로 못 바꾸는 값도 던지지 않는다(검색창은 문자열만 넘기지만 P6) */
  [Object.create(null), { toString: function () { throw new Error('x'); } }, Symbol('s'), NaN, 12, {}].forEach(function (x) { eq(C.detect(x), null, String(typeof x)); });
  eq(level(['죽고 싶어']), 'high');
});

test('4번째 수정 · 뒤집힌 바람(살고 싶·태어나고 싶)은 부정될 때만 high, 안 + 살다는 사는 말을 보고, -ㄹ 리가 없다·아닌데도 부정', function () {
  ['안 살고 싶어', '더 이상 안 살고 싶어', '안살고싶다', '살고 싶을 리가 없잖아', '살고 싶은 건 아닌데...', '다시는 태어나고 싶지 않아', '다음 생엔 안 태어나고 싶어', '환생하고 싶지 않아',
    '숨 쉬고 싶지 않아', '이 세상에서 살고 싶지 않아', '이렇게 살 거면 안 살래', '나 이제 안 살 거야', '안 살아야겠다', '그럴 바엔 안 살래요',
    '죽고 싶지 않은 건 아닌데...', '죽고 싶지 않을 리가 없지', '죽고싶지..않을리가', '안 죽고 싶을 리가 없잖아', '죽고 싶은 마음이 없을 리가 있겠어?', '사라지고 싶지 않을 리 없어',
    '죽고 싶은 게 아닌가 싶어'].forEach(function (s) { eq(level(s), 'high', s); });
  [['살고 싶어', null], ['정말 살고 싶어', null], ['다시 태어나고 싶어', null], ['환생하고 싶어', null], ['살고 싶지 않은 건 아니야', 'watch'], ['죽고 싶은 건 아냐', 'watch'],
    ['죽고 싶을 리 없어', 'watch'], ['그 가격이면 그냥 안 살래', 'watch'], ['이 옷 안 살래', 'watch'], ['비싸서 안 살 거야', 'watch'], ['불안 살짝 있어', null],
    ['서울에서 살고 싶지 않아', 'watch'], ['엄마랑 살고 싶지 않아', 'watch'], ['서울에서 그만 살고 싶다', 'watch'], ['부모님이랑 그만 살고 싶어요', 'watch']].forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
});

test('4번째 수정 · 같은 종류의 본인 의도(줄기 × 어미·뒤집힌 어순·따라가기·작별·준비·자해 진행)와 짝지은 낮춤', function () {
  [ /* [내려가야 하는 말, 기대, 같은 규칙의 본인 의도 말] */
    ['엄마 따라 마트 가고 싶어', null, '엄마 따라가고 싶어'], ['아이가 엄마 따라가고 싶대요', 'watch', '죽은 엄마 따라 가고 싶다'], ['강아지가 무지개다리 건넜어요', null, '나도 무지개다리 건너고 싶다'],
    ['엄마 나도 데려가', null, '하늘에 계신 엄마 나도 데려가요'], ['팀장님이 내일 안 왔으면 좋겠다', 'watch', '내일 안 왔으면 좋겠다'], ['아기가 밤에 안 깨면 좋겠다', 'watch', '영영 깨지 않으면 좋겠다'],
    ['동생이 그릇을 깨지 않았으면', 'watch', '자다가 깨지 않았으면 좋겠다'], ['선 긋는 중', null, '다시 긋고 있어'], ['딸이 다시 긋고 있어요', 'watch', '또 긋기 시작했어'],
    ['찜질방에서 몸 지지고 싶다', null, '담뱃불로 팔을 지졌어'], ['햇빛에 팔 태웠어', null, '라이터로 팔을 태웠어'], ['한강이야 친구들이랑 치킨 먹어 안녕', 'watch', '한강이야 다들 안녕'],
    ['친구가 옥상인데 안 내려간대요', 'watch', '지금 옥상인데 내려가기 싫어'], ['퇴사합니다 그동안 감사했습니다 모두 안녕히', 'watch', '그동안 고마웠어 다들 안녕'],
    ['딸이 엄마 그동안 고마웠다고 하고 연락이 안 돼요', 'watch', "엄마한테 '그동안 고마웠어'라고 문자 보냈어"], ['퇴사 마지막 인사 문구', null, '마지막 인사 하고 갈게'],
    ['군대 가기 전 마지막 편지', null, '엄마한테 마지막 편지 썼어'], ['여행 가서 고양이 맡길 사람 찾아 놨어 이제 준비 끝', 'watch', '고양이 맡길 사람 찾아 놨어 이제 준비 끝'],
    ['할머니 영정사진 미리 찍어 뒀어요', 'watch', '장례식 때 틀 노래 골라 놨어'], ['약 끊으면 죽는다며 그럼 절대 안 끊을래', 'watch', '약 끊으면 죽을 수 있다던데 그래서 끊을 거야'],
    ['과자 몽땅 먹었어', null, '수면제 몽땅 먹었어'], ['감기약 다 먹었는데 아직 기침해요', null, '약 다 먹었는데 아직 안 죽었어'], ['약을 한 번에 못 삼켜요', null, '약을 한 번에 다 털어 넣을래'],
    ['그 사람한테 목매지 마', null, '나무에 목매고 싶어'], ['넥타이 목 매는 법', null, '넥타이로 목 매는 법'], ['배우 유서진', null, '유서 썼어'],
    ['번지점프 뛰어내리고 싶다', 'watch', '번지점프 줄 없이 뛰어내리고 싶다'], ['죽자고 공부했어', null, '그냥 죽자'], ['죽어도 되는 사람은 없다', 'watch', '나 같은 건 죽어도 돼'],
    ['게임에서 죽으면 돼', 'watch', '그냥 죽으면 돼'], ['자해하고 있는 아이 대처', 'watch', '자해를 하고 있어요'], ['딸이 자해를 하고 있어요', 'watch', '선생님한테 자해한다고 말해야 할까요?'],
    ['삶이 무슨 의미인가 철학 책 추천', 'watch', '사는 게 무슨 의미가 있어?'], ['포기하고 싶어 인생 공부', 'watch', '그만두고 싶어 인생'], ['그놈 숨통을 끊고 싶다', 'harm', '숨통을 끊고 싶다'],
    ['오늘이 방학 마지막 날이면 좋겠다', 'watch', '이게 내 마지막 날이면 좋겠다']
  ].forEach(function (x) {
    eq(level(x[0]), x[1], x[0]);
    eq(level(x[2]), 'high', x[2]);
  });
  ['그냥 잠들고 싶어요 영원히', '그만 아프고 싶어 영원히', '영원히 아프지 않고 싶어', '자살할 생각은 없어요 그냥 잠들고 싶어요 영원히', '살아야 하는 이유를 모르겠어', '살아야 되는 이유를 모르겠어',
    '내 생명을 끊고 싶어', '명줄 끊고 싶어', '삶을 끊어 버리고 싶어', '스스로 생명을 끊을까', '끝장내고 싶어 이 인생', '다음 생은 없었으면 좋겠다', '다음 생에는 태어나지 않게 해 주세요',
    '나 하나 없어진다고 아무도 모를 거야', '나 하나 없어도 세상은 잘 굴러가', '형이 자살했어요 저도 따라가고 싶어요', '세상 떠난 엄마 따라가고 싶어', '눈 감으면 끝이었으면 좋겠다',
    '뛰어내리면 편해질까?', '자해하면 마음이 좀 편해질까?', '목소리가 \'뛰어내려\'라고 해요', '환청이 "죽어버려"라고 해', '머릿속에서 "뛰어" "뛰어" 하는 소리가 들려', '목소리가 너는 죽어야 한다고 해',
    '자살 수십 번 생각했어', '자살 100번은 생각했다', '내 장례식에 누가 올까 생각해', "카톡 상메를 '안녕'으로 바꿨어 이제 끝", '편지 남기고 떠날게'].forEach(function (s) { eq(level(s), 'high', s); });
  [['너무 힘들다... 살려 주세요...', 'watch'], ['친구가 이번엔 진짜 마지막이라고 했어요', 'watch'], ['친구가 이제 다 끝났대요', 'watch'], ['아들 방에서 밧줄이 나왔어요', 'watch'],
    ['엄마 서랍에 약이 한가득 모여 있어요', 'watch'], ['딸이 일부러 약을 많이 먹은 것 같아요', 'watch'], ['딸이 팔에 자꾸 줄을 그어요', 'watch'],
    ['웃겨 죽겠다 ㅋㅋㅋ', null], ['좋아 죽겠어', null], ['힘들어 죽겠어', 'watch'], ['아파 죽겠어', 'watch']].forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
});

test('4번째 수정 · 타해: 맞다는 앞 낱말 전체로(누나·언니·할머니), 학교·치료 현장 사람 낱말, 2인칭 위협 · 타해가 아닌 쓰임(사물 주어·몸의 감각·태동·관용구·증상 목적어)', function () {
  ['누나한테 맞았어요', '언니한테 엄청 맞았어', '외할머니한테 맞았어요', '어머니께 맞았어요', '언니에게 맞고 살아요', '누나한테 맞을까 봐 무서워요', '학생이 교사를 때렸어요', '아들이 간호사를 때렸어요',
    '아들이 요양보호사를 때렸어요', '아들이 활동지원사를 때렸어요', '남편이 시어머니를 밀쳤어요', '아들이 외할머니를 때렸어요', '아들이 택시 기사를 때렸어요', '형이 사촌을 팼어요',
    '동생이 매형을 칼로 찔렀어요', '"너 죽인다" 문자가 왔어요', "모르는 번호로 '너 죽는다'고 왔어요", '너 죽을래 진짜', '그 새끼 죽빵 날릴 거야', '남편 밥에 약 타고 싶어요',
    '다 죽여버리고 싶어', '짜증나서 다 죽이고 싶어'].forEach(function (s) { eq(level(s), 'harm', s); });
  ['면역이 자기 몸을 공격해요', '자가면역은 몸을 공격해요', '약이 뇌를 해칠까 봐 걱정돼요', '오래 먹으면 뇌를 해칠까요', '스마트폰이 눈을 해칠까요', '코를 찌를 것 같은 냄새가 나요',
    '하늘을 찌를 것 같은 기세', '칼로 찌르는 듯한 두통', '목 졸리는 느낌이 들어요', '유도 목조르기 기술', '뱃속 아기가 자꾸 차요', '벌이 나를 찔렀어', '주사 바늘이 저를 찔렀어요',
    '환청을 다 없애 버리고 싶어요', '낙인과 편견을 다 없애야 해요', '머리 다 밀어 버리고 싶다', '숙제 다 해치울 거야', '엄마 밥에 약 섞으려고 하는데 괜찮을까요', '조현병 군대 총 쏠 수 있나요',
    '오늘 더위 진짜 사람 죽이겠다', '이 약이 나한테 맞아요', '그 옷 너한테 맞아', '누나한테 맞는 옷'].forEach(function (s) { eq(level(s), null, s); });
  ['목 조르는 꿈', '사진 다 없애 버리고 싶어', '다 깨 버리고 싶다', '일이고 뭐고 다 던져버리고 싶다', '아빠 국에 약 넣으려고요'].forEach(function (s) { eq(level(s), 'watch', s); });
});

test('4번째 수정 · 한영 섞기·외국어: 한국어 행위 낱말(사라지다·없어지다·뒤지다), 영어 약 낱말 × 양 × 먹다, jump × 높은 곳, sh·sui, 띄운 구', function () {
  ['I wanna 사라져', 'I just want to 사라지기', 'i want to 없어지다', 'wanna 뒤지다', 'pills 다 먹을래', 'sleeping pills 한 통 다 먹었어', 'meds 한 통 다 먹었어', '수면제 pills 전부 먹을래',
    'i want to jump 옥상에서', 'jump off 옥상', '그냥 jump 하고 싶다 옥상에서', 'SH 하고 싶어', 'sh 또 했어', '오늘 SH 함', 'sui 할래', 'k i l l m y s e l f', 'K I L L M Y S E L F',
    '死にたい', '想死'].forEach(function (s) { eq(level(s), 'high', s); });
  [['SH공사 청약', null], ['suit 사고 싶어', null], ['sushi 먹고 싶어', null], ['tablet 다 샀어', null], ['meds 먹는 시간 알림', null], ['디지털 카메라 camera', null], ['自殺', 'watch']]
    .forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
});

test('4번째 수정 · P6: 라틴 글자 500자 글도 1ms 안팎(가린 낱말 찾기의 되짚기, 영어 글의 한글 읽기를 줄임)', function () {
  ['a'.repeat(500), 'wnrrhtlvek'.repeat(50), 'jukgosipda'.repeat(50), 'i want to '.repeat(50)].forEach(function (s) {
    for (let i = 0; i < 3; i++) C.detect(s);
    const t0 = Date.now();
    for (let i = 0; i < 40; i++) C.detect(s);
    const ms = (Date.now() - t0) / 40;
    ok(ms < 2, s.slice(0, 12) + '… ' + ms + 'ms(이 PC 0.3~0.8ms, 다른 일이 함께 돌 때를 생각해 2ms 까지)');
  });
});

test('5번째 수정 · 부정 판단의 빈틈(못·-진·시늉·거짓·이중 부정·한시적 부정·부정 뒤 위험 행동)', function () {
  /* '못'은 할 수 없음(생각·시도가 있었음), '안 죽었어'는 살아남음, 시늉·거짓은 부정 하나, '-다고는 못 하겠어'·'-지 않을 수가 없어'는 두 번 부정 */
  ['무서워서 못 뛰어내렸어', '용기가 없어서 못 죽어', '자살도 못 하는 내가 싫어', '죽지도 못하고 살지도 못하겠어', '약 먹었는데 안 죽었어', '왜 안 죽었지', '죽으려다 말았어',
    '살고 싶은 척하는 거야', '살고 싶다고 하면 거짓말이야', '죽고 싶지 않다고는 못 하겠어', '자살 안 한다고 약속 못 해', '자해하지 않을 수가 없었어', '자해 안 한 날이 거의 없어',
    '죽고 싶지 않은 거 아이다', '아직은 안 죽을 거야', '죽진 않을 거야 아마도', '안 죽을 건데 왜 자꾸 다리 위에 서 있게 되지', '자해하려는 건 아닌데 칼을 들고 있어',
    '자해 안 하려고 했는데 결국 했어', '이제 죽어도 괜찮지 않아?', '죽지 않을 이유가 없어', '죽는 게 무섭지 않아'].forEach(function (s) { eq(level(s), 'high', s); });
  /* 짝: 그대로 부정(watch)이어야 하는 말 */
  ['죽진 않을 거야', '죽진 않겠지', '사라지진 않을 거야', '죽고 싶은 척하지 마', '자해 안 할 거야', '자살 안 하기로 했어', '죽고 싶진 않은데 너무 힘들어', '요즘은 안 죽고 싶어',
    '이제 죽어도 괜찮지 않아', '나쁜 생각은 안 해요'].forEach(function (s) { eq(level(s), 'watch', s); });
  [['사고 났는데 다행히 안 죽었어', 'watch'], ['벌레가 안 죽어요', null], ['죽지 않는 식물 추천', null], ['가방을 못 뒤지겠어', null], ['다리 다쳐서 못 뛰어', null],
    ['계단에서 못 뛰어내리겠어', 'watch'], ['아이가 자해를 못 하게 하려면', 'watch']].forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
});

test('5번째 수정 · 본인 의도의 새 꼴(사는 것에 대한 반문·버티다·몸 멈춤·태어나지 않음·조건절·자기 안전)과 짝지은 낮춤', function () {
  [ /* [내려가야 하는 말, 기대, 같은 규칙의 본인 의도 말] */
    ['넌 꼭 살아야 해', 'watch', '꼭 살아야 해?'], ['서울에 안 살면 안 돼?', 'watch', '그냥 안 살면 안 돼?'], ['혼자 살 수가 없어', 'watch', '이렇게는 더는 살 수가 없어'],
    ['너무 비싸서 살 수가 없어', 'watch', '살고 싶지 않은 게 아니라 살 수가 없어'], ['이 회사에서 더 버티고 싶지 않아', 'watch', '더 이상 버티고 싶지 않아'], ['다이어트 버티기 싫어', 'watch', '이제 버티기 싫어'],
    ['아기가 안 태어났을 거야', 'watch', '다시 태어나면 절대 안 태어날 거야'], ['친구가 떠나면 나도 갈래', 'watch', '강아지 떠나면 나도 갈 거야'],
    ['자해하면 안 돼', 'watch', '자해하면 안 돼요?'], ['자살하면 안 되는 이유', 'watch', '자살하면 안 되는 이유 하나만 말해 줘'], ['할머니는 죽음이 두렵지 않대요', 'watch', '죽는 거 하나도 안 무서워'],
    ['이 약 임산부한테 안전하지 않나요', null, '제가 저한테 안전하지 않아요'], ['딸이 자해를 못 끊어요', 'watch', '자해를 못 끊겠어'], ['아기가 밤에 안 깨려면', 'watch', '자고 나서 안 깨려면 어떻게 해']
  ].forEach(function (x) {
    eq(level(x[0]), x[1], x[0]);
    eq(level(x[2]), 'high', x[2]);
  });
  ['숨을 안 쉬면 좋겠어', '심장이 그냥 안 뛰었으면', '숨 쉬는 게 멈췄으면 좋겠어', '태어나지 않는 게 나았어', '엄마 돌아가시면 나도 따라갈래', '강아지 죽으면 나도 따라갈래',
    '여행 가서 사고로 남편 잃었어 남편 따라가고 싶어', '용기만 있으면 죽었을 거야', '엄마 미안해 찾지 마', '지금 혼자 있으면 안전하지 않을 것 같아요', '삶에서 로그아웃하고 싶어',
    '그어도 그어도 안 멈춰', '안 들키게 그으려면 어떻게 해', '약 안 먹으면 죽을 수 있겠지 그래서 안 먹어'].forEach(function (s) { eq(level(s), 'high', s); });
});

test('5번째 수정 · 낮춤 규칙이 본인 의도를 지우지 않는다(낱말 단위·관용구 뒤 의도·같은 절)', function () {
  [ /* [내려가야 하는 말, 기대, 같은 낮춤 규칙에 걸리던 본인 의도 말] */
    ['밑줄 그을래', null, '칼로 줄 긋고 싶다'], ['선 긋고 싶어 이제 그 사람이랑', null, '줄 긋고 싶어 손목에'], ['커터칼로 종이에 선 그어서 접어요', 'watch', '팔에 면도날로 줄 그었어'],
    ['친구가 칼로 줄 긋는대요', 'watch', '종아리에 선 그었어 또'], ['그 새끼 얼굴을 칼로 그어버릴 거야', 'harm', '면도칼로 선 그을까'],
    ['그놈 좀 죽여줘', 'harm', '하나님 제발 죽여주세요'], ['모기 좀 죽여줘', null, '그냥 고통 없이 죽여줘'], ['동생이 편하게 죽여 달래요', 'watch', '편하게 죽여 달라고 빌었어'],
    ['걱정 없는 사람이 되고 싶어', null, '원래 없는 사람이 되고 싶어'], ['유서 깊은 절', null, '내 서랍에 유서 있는 거 아무도 몰라'], ['유서의 법적 효력', 'watch', '유서 효력 있게 써 두려고'],
    ['돈에 목매는 사람', null, '생일에 목맬 거야'], ['퇴사 마지막 인사 문구', null, '알바도 잘리고 이제 진짜 마지막 인사 할게'],
    ['퇴사합니다 그동안 감사했습니다 모두 안녕히', 'watch', '그동안 고마웠어 회사 사람들한테도 전해 줘'], ['한강이야 친구들이랑 치킨 먹어 안녕', 'watch', '아무것도 못 먹겠어 한강이야 다들 안녕'],
    ['감기약 다 먹었는데 아직 기침해요', null, '수면제 한 통 다 먹었는데 아직 멀쩡해'], ['과자 몽땅 먹었어', null, '수면유도제 몽땅 먹었어'],
    ['약 모아 두는 통 추천', 'watch', '약 모아 두는 통이 꽉 찼어 이제 때가 됐어'], ['집에 빨리 가고 싶다', 'watch', '오늘 밤에 조용히 가고 싶어'],
    ['서울에서 그만 살고 싶다', 'watch', '이 고통 속에서 그만 살고 싶어'], ['부모님이랑 같이 그만 살고 싶어', 'watch', '환청이랑 같이 그만 살고 싶어요'],
    ['이 책을 이번 주에 끝낼래', 'watch', '이 몸뚱이를 끝내고 싶어'], ['아들이 끝내겠대요', 'watch', '아이들이 학교 간 사이에 끝내려고요'], ['남이 준 약 모아서 반납', null, '엄마가 준 약 모아 놨어'],
    ['자살 생각이 들면 어떻게 해야 하나요', 'watch', '요즘 자살 생각이 들면 그냥 참아요'], ['자살 생각이 있을 때 받는 치료', 'watch', '자살 생각이 있는데 병원 가야 하나요'],
    ['뷔페 가서 다 먹고 죽을 거야', 'watch', '락스 먹고 죽을 거야'], ['이 약이랑 술 같이 먹으면 죽을까요', 'watch', '수면제 먹으면 죽을까'],
    ['번지점프 뛰어내리고 싶다', 'watch', '어제 뛰어내렸는데 살았어'], ['계곡에서 뛰어내릴 거야', 'watch', '옥상까지 올라갔는데 못 뛰어내렸어'], ['정계에 투신하고 싶어요', null, '한강에 투신하고 싶다'],
    ['욕심을 다 내려놓고 싶어', 'watch', '그냥 다 내려놓고 싶어']
  ].forEach(function (x) {
    eq(level(x[0]), x[1], x[0]);
    eq(level(x[2]), 'high', x[2]);
  });
  /* 타해: 밟아 버리다·족치다는 타해, 주어 없는 '나를 해칠 것 같아'는 자해·위협 둘 다(high + harm), '엄마를 해치지 않을 자신이 없어'는 타해 */
  ['그 새끼 밟아 버리고 싶다', '그놈 족쳐 버리고 싶다', '엄마를 해치지 않을 자신이 없어'].forEach(function (s) { eq(level(s), 'harm', s); });
  eq(C.detect('나를 해칠 것 같아').level, 'high'); eq(C.detect('나를 해칠 것 같아').harm, true);
  ['나를 해치지 않을 자신이 없어', '나 자신을 해치지 않을 자신이 없어요'].forEach(function (s) { eq(level(s), 'high', s); });
});

test('5번째 수정 · 영어: 줄임(idw·idk·idc)·i\'d(had)·가린 글자(d!e)·돌려 말한 수동적 사고·방법 묻기와 짝지은 오탐', function () {
  ['idw live anymore', 'idk why im still alive', 'idc if i die', "i wish i'd never been born", "i wouldn't mind not waking up", "i'm not safe from myself", "i can't promise i won't kill myself",
    "i don't not want to die", "i can't stop cutting", 'why am i still alive', 'would anyone care if i died', 'what if i just disappeared', 'i should be dead', 'i deserve to die',
    'dying to die', "i'd kill to not wake up tomorrow", 'i want death', 'dying sounds peaceful', 'i just want it to be over', 'god please take me', 'i wanna d!e',
    "i'm going to throw myself off the bridge", 'how many pills to die', 'how much of my meds is lethal', 'command hallucinations telling me to jump', "i've been saving my pills",
    'i relapsed. cut again last night', 'cut 또 했어', 'sh 끊은 지 100일인데 다시 했어'].forEach(function (s) { eq(level(s), 'high', s); });
  [['윈도우 kms 인증 방법', null], ['AWS KMS 키 생성', null], ["i'm going to end it with my boyfriend", null], ['how many people die by suicide each year', 'watch'],
    ["i'd kill for a pizza right now", null], ['mom is going to kill me for this', 'watch'], ['my dad is going to kill me he has a knife', 'harm'], ["i'm going to end it with a rope", 'high']]
    .forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
});

test('6번째 수정 · 빈틈의 종류: 양 × 먹다(목록 밖 약 이름·센 양)·물질 × 마시다·방법·곳 찾기·사투리·바꿔 쓴 글자·높임 글말·횟수', function () {
  [ /* 양 × 먹다: 약 이름이 목록에 없거나 오타여도, 숫자·한글 수사로 센 양이어도 */
    '항우울제 한 통 다 먹었어', '수면제 몽땅 먹을래', '감기약 다 마실 거야', '루루정 한 통 다 먹었어', 'pills 다 먹을 거야', '약 30알 먹었어', '루루정 열 알 먹었어',
    '약 서른 알 삼켰어', '수면제 100알', '진통제 백 알 모았어', '약통에 있는 거 다 삼켰어', '루루정 한 통 다 먹으면 어떻게 돼', '약 20알 먹으면 죽어?', '소주에 약 털어 먹었어',
    '루루정이랑 술 같이 먹으면 죽어?', '수면제랑 술 먹고 자면 안 깨?', '약 털어 먹을래',
    /* 물질 × 마시다·먹다·구하다 */
    '락스 마실래', '제초제 먹으면 죽나요', '세제 마셨어', '청산가리 구하는 법', '농약 사 왔어 이제 끝이야',
    /* 방법·곳·때 찾기 */
    '편히 가는 약', '삶을 끝내는 방법', '세상 떠나는 법', '죽기 좋은 곳', '죽을 수 있는 높이', '몇 층이면 죽어요', '손목 얼마나 깊게', '자살 장소 추천', '자해 안 들키는 법', '같이 죽을 사람',
    /* 사투리·어르신 말투·높임 글말 */
    '사는 게 징해서 그만 살랑께', '내는 마 없어지삐고 싶다', '뒤져불까', '약 다 묵어삐까', '영감 따라가고 싶다', '빨리 데려갔으면 좋겠다', '자식들 고생 안 시키게 내가 먼저 가야지',
    '생을 끝내려 합니다', '살고 싶은 건 아닙니다', '저는 이만 죽겠습니다', '죽을끼다', '고마 죽어야제',
    /* 바꿔 쓴 글자·늘인 글자·초성·자모·한자·섞은 영어 */
    '주우욱고 싶다', '쥬글래', '주그고 싶다', '자헤하고 싶다', '자사알하고 싶다', '죽고 시이입다', '나 오늘 또 ㅈㅎ했어', 'ㅈㅅ 충동 와', 'ㅈㅜㄱㄱㅗ ㅅㅣㅍㄷㅏ', '自害하고 싶다',
    '이번 생 logout', '4ever 잠들고 싶다', '죽💀고싶다', '자살ㄹ하고 싶어', '죽는볍', 'unaliving myself', 'easiest way to kill yourself', 'meds overdose how many',
    /* 횟수·기간 · 바람의 줄임 · 털어놓음 */
    '자해 100번 넘게 했어', '자살 세 번 시도했어', '자해 오늘 3번째야', '낼 안깼음', '팔 상처 안 들키려고 여름에도 긴팔 입음', '팔을 피 날 때까지 긁어요', '죽음을 생각하고 있습니다'
  ].forEach(function (s) { eq(level(s), 'high', s); });
  /* 같은 규칙에 걸리지만 내려가야 하는 말(P5): 먹을거리·관용구·길 찾기·벌레 약·책 */
  [['과자 한 통 다 먹었어', null], ['수박 한 통 다 먹었어', null], ['욕 엄청 먹었어', null], ['라면 두 개 다 먹었어', null], ['사다 먹었어', null], ['이거 다 먹을래', 'watch'],
    ['서울역 편하게 가는 법', null], ['공항 조용히 가는 법', null], ['머릿니 죽는 약', null], ['기 죽지 마', null], ['죽을 쑤다', null], ['고마워', null], ['선물 주고 싶다', null],
    ['주거 지원', null], ['몸이 가뿐해', null], ['나아지고 싶어', null], ['정치판에 투신하려 합니다', null], ['농약 사 왔어 밭에 뿌리려고', null],
    ['배고파 죽겠습니다', 'watch'], ['하루에 약 10알 먹었어요', 'watch'], ['게임 끝내는 법', 'watch'], ['죽음을 생각하는 철학', 'watch'], ['죽기 좋은 날 영화', 'watch'],
    ['아이 빨리 데려가 주세요', 'watch'], ['손목 깊게 베였어요', 'watch'], ['계단에서 뛰어내리면 아파?', 'watch'], ['자살 시도 3번 이상인 환자 비율', 'watch'],
    ['아버지가 제초제를 드셨어요', 'watch'], ['친구가 락스 마신대요', 'watch'], ['동생이 약 30알 먹었대요', 'watch'], ['친구가 ㅈㅅ한대', 'watch'], ['살아 있어서 죄송해요', 'watch'],
    ['이 약이랑 술 같이 먹으면 죽을까요', 'watch'], ['벌레 죽는 약', 'watch']
  ].forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
  /* 타해: 바꿔 쓴 '죽이다'(쥬겨·쥑이·디지게 하다)·명령 환청 · 자살과 함께면 high + harm */
  ['그새끼 쥬겨버릴거야', '그 새끼 확 쥑이삘라', '그새끼 디지게 할거야', '확 죽여불까', '목소리가 사람 죽이라고 시켜요'].forEach(function (s) { eq(level(s), 'harm', s); });
  ['니 죽고 내 죽자', '다 같이 죽어불자', '니 죽이고 내도 죽을란다'].forEach(function (s) { eq(C.detect(s).level, 'high', s); eq(C.detect(s).harm, true, s); });
});

test('6번째 수정 · 두 갈래로 읽히는 글이 길어도 느려지지 않는다(양·횟수 되짚기)', function () {
  ['엄청 많이 ', '30알이나 ', '자해 또다시 ', '자해 3번째 ', '다 다 ', 'ㅈㅜㄱ', '주우 '].forEach(function (u) {
    const s = u.repeat(400), t0 = Date.now();
    C.detect(s); C.detect(s + '먹었어');
    ok(Date.now() - t0 < 1000, u + ' × 400: ' + (Date.now() - t0) + 'ms');
  });
});

/* 2026-11-14 7번째 수정: 지우는(null) 길은 모두 관문(gate)을 지난다. 낮춤 규칙마다 [내려가는 말, 기대, 내려가면 안 되는 말]을 짝으로 고정한다 */
test('7번째 수정 · 낮춤은 맥락만으로 지우지 않는다(watch 까지) — 짝: 같은 규칙에 걸리던 본인 의도는 high', function () {
  [ /* [내려가는 말, 기대, 내려가면 안 되는 말] */
    /* 값·상점 말(지시어는 보지 않음, 괴로움 말이 함께면 낮추지 않음) */
    ['비싸서 살 수가 없어', 'watch', '이건 너무 아파서 살 수가 없어'], ['그 가격이면 그냥 안 살래', 'watch', '그거 알아? 나 이제 안 살래'],
    ['이 옷 안 살래', 'watch', '그건 내 탓이야 이제 안 살래'], ['비싼 옷이라 살 수가 없어', 'watch', '이거 너무 힘들어서 살 수가 없어'],
    /* 위험한 곳 × 작별: 지금 놀고 있다는 말만 watch, 풍경·산책은 보지 않음 */
    ['한강이야 치킨 먹으러 왔어 다들 안녕', 'watch', '옥상에서 노을 보면서 다들 안녕'], ['옥상이야 다들 안녕 고기 굽는 중', 'watch', '한강 다리 위야 야경 예쁘다 다들 안녕'],
    ['한강 공원 피크닉 다들 안녕', 'watch', '치킨 먹고 한강 가서 다들 안녕'],
    /* 곳 + 가는 법: 목적지 이름 + 까지·에·으로만 지움, '에서'와 방·화장실·차 안·요양원·병원은 곳이 아님 */
    ['서울역까지 편하게 가는 법', null, '방에서 조용히 가는 방법'], ['공항으로 편하게 가는 법', null, '차 안에서 편하게 가는 법'], ['학원에 편하게 가는 법', 'watch', '요양원에서 편하게 가는 법'],
    /* 유서: 관용구는 글자 그대로(깊은·가 오래된), 남은 글에 준비 말이 있으면 관용구가 아님, 효력·공증은 watch */
    ['유서 깊은 마을 여행', null, '유서 깊숙이 숨겨 놨어'], ['유서 깊은 절', null, '유서 깊은 곳에 숨겨 뒀어'], ['유서가 깊은 한옥 마을 여행', null, '유서가 오래돼서 다시 써야겠어'],
    ['유서 공증 방법', 'watch', '유서 효력 있게 써 놓고 떠날래'], ['유서 대필 부탁해도 돼요?', 'watch', '유서 대필 맡길래'],
    /* 모은 약: 버리기·반납 긍정형만 지움(부정형은 high), 통·케이스는 watch */
    ['약 모아서 약국에 반납했어', null, '약 모아 둔 거 보건소에 안 냈어'], ['약을 모아서 버리는 곳', null, '약 모아 둔 거 약국에 반납 안 할 거야'],
    ['약 모아 두는 통 추천', 'watch', '모아 둔 약 효과 있을까'], ['약 모으기 앱', 'watch', '약 모아 둔 거 못 버리겠어'],
    /* 놀이 맥락: 지우지 않고 watch, 다이빙대·놀이기구 + 의도 어미는 high */
    ['번지점프 뛰어내리고 싶다', 'watch', '놀이기구에서 뛰어내릴래'], ['번지점프대에서 뛰어내리고 싶어', 'watch', '다이빙대에서 뛰어내릴까'],
    ['계곡에서 뛰어내릴 거야', 'watch', '다이빙대에서 뛰어내리고 싶어'],
    /* 다 먹다: 대명사·목적어 없음은 watch, 삼키다·털어 먹다·결과 말이면 high, 먹을거리·관용구만 지움 */
    ['이거 다 먹을래', 'watch', '이거 다 털어 먹으면 끝나겠지'], ['다 먹었어', 'watch', '다 삼켜 버릴래'], ['과자 한 통 다 먹었어', null, '있는 거 다 삼킬 거야'],
    ['욕 엄청 먹었어', null, '이거 다 먹으면 편해지겠지'], ['그냥 다 먹어 버릴 거야', 'watch', '남은 거 다 삼켜 버릴 거야'],
    /* 과제어 + 끝내기(의도 어미 없는 명사꼴)는 지움, 의도 어미가 붙으면 watch */
    ['숙제 다 끝내기', null, '다 끝내기로 했어'], ['오늘 일 다 끝내기', null, '이제 다 끝내기로 마음먹었어'], ['숙제 다 끝내고 싶어', 'watch', '내일 다 끝내고 싶어'],
    /* 퇴사·졸업 자리 낱말이 바로 앞에서 꾸미는 인사만 지움 */
    ['퇴사 마지막 인사 문구', null, '알바도 잘리고 이제 진짜 마지막 인사 할게'], ['군대 가기 전 마지막 편지', null, '엄마한테 마지막 편지 썼어'],
    /* 받는 사람 곁으로·별이 되다 */
    ['당신 곁으로 가고 싶어', 'watch', '여보 당신 곁으로 가고 싶어'], ['별이 되고 싶어', 'watch', '하늘의 별이 되고 싶어']
  ].forEach(function (x) {
    eq(level(x[0]), x[1], x[0]);
    eq(level(x[2]), 'high', x[2]);
  });
});

test('7번째 수정 · 빈틈의 종류: 따라가기 사이의 그리움 절·죽는 생각이 나다·자해 재발 충동·번개탄 구하기·목록 밖 약 이름', function () {
  [ /* 따라가기 */ '엄마 보고 싶어 따라가고 싶다', '할머니 보고 싶어 따라가고 싶어', '엄마 너무 보고 싶다 나도 따라갈래', '엄마가 보고 싶어서 따라가고 싶어', '아빠 그리워 따라가고 싶어',
    /* 죽는 생각 */ '요즘 계속 죽는 생각만 나', '하루 종일 죽는 생각뿐이야', '죽는 생각이 자꾸 나요', '죽는 생각이 떠나지 않아', '죽는 생각밖에 안 나',
    /* 재발 충동 */ '자해 끊은 지 일주일인데 또 하고 싶어', '자해 참은 지 오래됐는데 다시 하고 싶다', '또 하고 싶어 자해', '커팅 멈췄는데 다시 하고 싶어',
    /* 번개탄 구하기 */ '번개탄 어디서 사', '번개탄 살까', '번개탄 구할 수 있어?',
    /* 목록에 없는 약 이름('루루정'은 가짜 이름): 이름 목록 없이 구조로 */
    '루루정 30알 모았어', '모아 둔 루루정 오늘 먹을래', '루루정 한 통 다 먹으면 어떻게 돼', '루루정이랑 술 같이 먹으면 죽어?', '루루정 다 먹어 버릴 거야', 'how many 루루정 먹으면 죽어'
  ].forEach(function (s) { eq(level(s), 'high', s); });
  [['아이가 엄마 보고 싶어서 따라가고 싶대요', 'watch'], ['죽는 생각이 들 때 대처법', 'watch'], ['죽는 생각은 안 해요', 'watch'], ['자해 다시 하고 싶지 않아', 'watch'],
    ['딸이 자해 끊었다가 또 하고 싶대요', 'watch'], ['케이크 커팅 다시 하고 싶어', 'watch'], ['캠핑용 번개탄 어디서 사', 'watch'], ['이 약이랑 술 같이 먹으면 죽을까요', 'watch'],
    ['친구랑 술 먹을래', null], ['안주랑 술 같이 먹을래', null], ['모아 둔 과자 오늘 먹을래', null], ['만두 30개 모았어', null], ['돈 한 달 치 모았어', null],
    ['할머니가 빨리 데려가라고 하세요', 'watch'], ['옥상 문 열려 있는 아파트 찾아', 'watch']].forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
});

test('7번째 수정 · 타해: 총 한 낱말, 타해 쪽으로 넘긴 말을 타해 검사가 못 잡으면 watch, 나를 죽여 줬으면(바람)은 타해 카드가 아니다', function () {
  [['학교에 총 들고 갈 거야', 'harm'], ['총 들고 학교 갈래', 'harm'], ['학교에 칼 들고 갈 거야', 'harm'], ['물총 들고 놀러 가자', null],
    ['그놈 숨통을 끊고 싶다', 'harm'], ['동생 팔 잘라 버리고 싶어', 'watch'], ['환청이 엄마를 베래', 'watch']].forEach(function (x) { eq(level(x[0]), x[1], x[0]); });
  ['누가 나 좀 죽여줬으면', '누가 저 좀 죽여 주면 좋겠다', '누가 날 좀 죽여줬으면 좋겠다', '하나님 저 좀 죽여 주세요'].forEach(function (s) {
    const r = C.detect(s);
    eq(r && r.level, 'high', s);
    ok(!(r && r.harm), s + ': 나를 해치는 바람이라 harm 표시가 없어야 함');
  });
  const r2 = C.detect('그놈이 날 죽여 버리겠대');
  eq(r2 && r2.level, 'harm', '그놈이 날 죽여 버리겠대(위협)');
});

/* 이름을 테스트에 적지 않으려고(P7) 목록의 크기와 꼴만 본다: 약은 묶음 낱말(…제·…약·영어 pills/meds/tablets)만, 물질 목록은 짧게 */
test('7번째 수정 · P7: 약·물질 낱말은 묶음 낱말만(상품명·성분명 목록을 다시 늘리지 않는다)', function () {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'crisis.js'), 'utf8');
  const drug = /var DRUG = '\(\?:([^']*)' \+[^']*'([^']*)'/.exec(src), poison = /var POISONS = '\(\?:([^']*)\)'/.exec(src);
  ok(drug && poison, 'DRUG·POISONS 정의를 못 찾음');
  const words = (drug[1] + drug[2].replace(/\)$/, '')).split('|').filter(Boolean);
  words.forEach(function (w) { ok(/^(약|알약|처방약|정신과약|감기약|두통약|[가-힣]*제|항[가-힣]+|pills\?|meds|medications\?|tablets\?)$/.test(w), '묶음 낱말이 아님: ' + w); });
  ok(poison[1].split('|').length <= 13, '물질 낱말이 늘어남: ' + poison[1].split('|').length);
  const en = /var EN_DRUGS = '\(\?:([^']*)\)'/.exec(src);
  ok(en && en[1].split('|').every(function (w) { return /^(painkillers\?|antidepressants\?|antipsychotics\?|sedatives\?|sleeping pills|sleep meds|benzos)$/.test(w); }), '영어 약 낱말은 묶음 낱말만');
});

/* 사이트 낱말 오탐:글 제목·태그, 용어 사전 term, 일상 말 사전 say 를 모두 넣어 high·harm 이 나오는 것은 아래 허용 목록과 같아야 해요.
   새로 high·harm 이 생기면 감지 규칙을 고치거나, 정말 위기 말이면 이유를 달아 여기 더해요. */
const SITE_ALLOW = {
  /* 글 제목: 가족이 위협을 받는 상황을 직접 다루는 글. 112·119 가 든 harm 카드가 맞아요 */
  '가족이 위협받을 때: 안전 계획과 도움': 'harm',
  /* 일상 말 사전 '피해망상' 항목("누가 나를 해치려·죽이려"): 위협을 느끼는 말이라 harm 안내가 맞아요(P4) */
  '해치려': 'harm', '죽이려': 'harm',
  /* 일상 말 사전 '자살 위험 신호' 항목: 본인 의도 말 그대로를 위기 글로 잇는 항목이라 high 가 맞아요(P1) */
  '죽고 싶': 'high', '죽고싶': 'high', '죽어버리': 'high', '살기 싫': 'high', '사라지고 싶': 'high', '죽을까': 'high',
  /* 같은 항목의 '유서': 자살 준비 신호(P1). '유서 깊은' 같은 관용구만 지워요 */
  '유서': 'high',
  /* 일상 말 사전 '가정폭력·타해' 항목: 맞는 쪽·때릴 것 같은 쪽 모두 harm 안내가 맞아요(P4) */
  '때려요': 'harm', '때릴 것 같': 'harm', '가족을 죽이고 싶': 'harm', '가족을 해치고 싶': 'harm',
  /* 같은 항목의 반말 끝 '때려'(2026-11-14 2번째 수정에서 "엄마가 날 때려"를 harm 으로 잡게 되며 함께 올라옴).
     "남편이 때려·아들이 때려"는 맞는 쪽, "엄마를 때려·가족을 때려"는 때리는 쪽이라 둘 다 112 가 든 harm 카드가 맞아요(P4) */
  '가족을 때려': 'harm', '엄마를 때려': 'harm', '아빠를 때려': 'harm', '부모를 때려': 'harm', '아들이 때려': 'harm', '딸이 때려': 'harm', '남편이 때려': 'harm',
  /* 2026-11-14 3번째 수정에서 함께 올라옴. 같은 항목의 '가정폭력'(글 family-violence-safety 의 태그이기도 함): 가정폭력은 그 자체로
     112 가 든 안전 안내가 맞아요(P4). 반대로 '학교폭력'(원인 항목)·'스토킹'(색정망상 항목)은 정보 검색이 많아 watch 로 두었어요 */
  '가정폭력': 'harm',
  /* 일상 말 사전 '피해망상' 항목의 '독을 탔'("음식에 독을 탄 것 같아"): '해치려·죽이려'와 같은 위협을 느끼는 말이라 harm(P4) */
  '독을 탔': 'harm',
  /* 일상 말 사전 '위험한가·폭력' 항목(faq-dangerous·emergency-response)의 '물건을 부수': 집 안 기물 파손은 112·119 안내가 맞아요(P4) */
  '물건을 부수': 'harm'
};
test('사이트 낱말 오탐: 글 제목·태그·용어·일상 말 가운데 high·harm 은 허용 목록과 같다', function () {
  function load(f) { const sb = {}; sb.window = sb; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sb); return sb.window.JHB; }
  const words = new Set();
  load('data/toc.js').toc.articles.forEach(function (a) { words.add(a.title); (a.tags || []).forEach(function (t) { words.add(t); }); });
  load('data/glossary.js').glossary.forEach(function (g) { words.add(g.term); });
  load('data/synonyms.js').synonyms.forEach(function (s) { s.say.forEach(function (x) { words.add(x); }); });
  ok(words.size > 1000, '사이트 낱말이 너무 적음(읽기 실패?): ' + words.size);
  const got = {};
  words.forEach(function (w) { const r = C.detect(w); if (r && (r.level === 'high' || r.level === 'harm')) got[w] = TRY.label(r); });
  const keys = function (o) { return Object.keys(o).sort(); };
  eq(keys(got), keys(SITE_ALLOW), 'high·harm 사이트 낱말');
  keys(got).forEach(function (w) { eq(got[w], SITE_ALLOW[w], w); });
});

test('빠르고 결정적이다: 문장 1,000개 1초 안, 같은 입력은 같은 결과', function () {
  const texts = CORPUS.map(function (e) { return e.text; });
  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) C.detect(texts[i % texts.length]);
  const ms = Date.now() - t0;
  ok(ms < 1000, '문장 1,000개 ' + ms + 'ms');
  texts.slice(0, 50).forEach(function (s) { eq(C.detect(s), C.detect(s), s); });
});

test('crisis-try.cjs 는 시험 도구라 run.cjs 가 테스트로 줍지 않는다', function () {
  const runSrc = fs.readFileSync(path.join(__dirname, 'run.cjs'), 'utf8');
  const m = /\.filter\(function \(f\) \{ return (\/[^\n]+?\/)\.test\(f\); \}\)/.exec(runSrc);
  ok(m, 'run.cjs 의 파일 거르개를 못 찾음');
  const re = new RegExp(m[1].slice(1, -1));
  ok(!re.test('crisis-try.cjs'), 'run.cjs 가 crisis-try.cjs 를 줍는다');
  ok(!re.test('crisis-corpus.json'), 'run.cjs 가 crisis-corpus.json 을 줍는다');
  ok(re.test('crisis.test.cjs'), '거르개 확인');
});
