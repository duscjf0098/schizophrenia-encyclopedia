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

test('너무 긴 입력도 앞 500자 안에서 처리한다', function () {
  const long = '환청 '.repeat(300) + '죽고 싶어';
  eq(level(long), null);
  eq(level('죽고 싶어 ' + '환청 '.repeat(300)), 'high');
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
    '클로자핀 과다복용하면 죽나요', '수면제 한꺼번에 먹으면 죽어?', '타이레놀 많이 먹으면 죽나요', '클로자핀 치사량', 'kms', 'KMS',
    '번개탄 피우고 싶어', '살아서 뭐해', '사는 게 의미 없어', '내가 없으면 가족이 편할까', '내가 사라지면'].forEach(function (s) {
    eq(level(s), 'high', s);
  });
  /* 낱말 하나만은 정보 검색일 수도 있어 watch(그래도 109·1577-0199 줄이 보임) */
  ['번개탄', '캠핑 번개탄', '과다복용 증상', '수면제 과다복용', '포기하고 싶어', '태어나지 말았어야 했어'].forEach(function (s) { eq(level(s), 'watch', s); });
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
  [['유서 깊은 절', null], ['유서 깊은', null], ['유서의 법적 효력', null], ['돈에 목매는 사람', null], ['성적에 목매지 마', null],
    ['버스에서 뛰어내리다 다침', null], ['약을 모아 두는 통', null], ['약 모으기 앱', null], ['약을 모아서 버리는 곳', null], ['다끝내기 챌린지', null],
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
