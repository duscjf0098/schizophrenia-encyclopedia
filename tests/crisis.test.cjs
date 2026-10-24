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
