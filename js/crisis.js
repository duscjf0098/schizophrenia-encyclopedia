/* 조현병 백과 · 검색어 속 자해·자살 암시 감지
   detect(text) → null | { level: 'high' | 'watch', matched }
   high: 본인의 의도·계획이 드러나는 말("죽고 싶", "자살할", "손목을 긋" …)
   watch: 정보를 찾는 말("자살", "자해", "위기", "응급" …). high가 아닐 때만.
   공백·구두점을 지우고 소문자로 바꾼 뒤 비교하므로 띄어쓰기·어미 변화에 강하다.
   부정("안 죽고 싶", "죽고 싶지 않")이 붙은 high 표현은 watch로 내린다. 완벽을 노리지 않고,
   애매하면 안전한 쪽(watch 이상)으로 둔다. 화면 쪽은 data/crisis-card.js의 카드 내용을 쓴다. */
(function (root) {
  // 본인의 의도·계획이 드러나는 표현. 공백 없는 꼴로 적는다(어미는 뒤에 무엇이 와도 잡힌다).
  var HIGH = [
    // 죽고 싶다
    '죽고싶', '죽을래', '죽어버리', '죽어야겨', '죽어야할', '죽을까', '죽고말',
    '죽는게낫', '죽는게나', '죽는게더', '죽어버릴', '죽을거야', '죽을생각',
    // 사라지고 싶다 · 끝내고 싶다
    '사라지고싶', '없어지고싶', '사라져버리', '없어져버리', '끝내고싶', '끝내버리', '다끝내',
    '모두끝내', '전부끝내',
    // 살기 싫다
    '살기싫', '살기가싫', '살고싶지않', '살고싶지가않', '살고싶진않', '살아야할이유', '살이유가없',
    '살이유없', '살아갈이유', '살기힘들어죽',
    // 자살 · 자해 의도
    '자살하고싶', '자살할', '자살하려', '자살하고', '자살을하', '자살시도하', '자살을시도', '자살방법',
    '자살하는방법', '자살하는법', '자살도구', '자해하고싶', '자해할', '자해하려', '자해하고',
    '자해를하', '자해방법', '자해하는법',
    // 방법이 드러나는 말
    '손목을긋', '손목긋', '손목을그어', '손목그어', '뛰어내리', '뛰어내릴', '목을매', '목매', '목을맬',
    '약을다먹', '약다먹', '약을한번에', '약을모아', '약모아', '약을모으', '약모으', '약을털어',
    '유서',
    // 영어
    'killmyself', 'killingmyself', 'endmylife', 'endingmylife', 'wanttodie', 'wannadie',
    'hurtmyself', 'cutmyself', 'enditall', 'takemylife', 'takemyownlife', 'betteroffdead',
    'suicideplan', 'howtokill', 'howtodie'
  ];

  // 정보를 찾는 표현. high가 아닐 때만 쓴다.
  var WATCH = [
    '자살', '자해', '극단적선택', '극단적인선택', '위기', '응급', '죽음', '죽은', '죽는', '죽을', '죽어',
    '죽고', '목숨', '짐이되', '절망', '희망이없', '희망없', '살기', '손목', '유족',
    'suicide', 'suicidal', 'selfharm', 'selfinjury', 'crisis', 'emergency', 'hotline', 'die', 'death',
    'overdose'
  ];

  // 부정 접두: 바로 앞이 "안"·"못"이면 의도가 아니다("안 죽고 싶"). "불안"·"편안"의 "안"은 제외.
  var NEG_PREFIX = /(^|[^불편미])(안|못)$/;
  // 부정 접미: 바로 뒤가 "지 않", "은 게 아니" 류면 의도가 아니다("죽고 싶지 않아").
  var NEG_SUFFIX = /^(지|진|지는|지가|지도)않|^(은|는)?(게|건|것이|것은)아니/;
  // 영어 부정 접두("don't want to die", "never kill myself")
  var NEG_PREFIX_EN = /(not|dont|never|no|wont)$/;

  function normalize(text) {
    return String(text == null ? '' : text)
      .slice(0, 500)
      .toLowerCase()
      .replace(/[\s '’"“”`\-_.,!?~…·()\[\]{}:;/\\]+/g, '');
  }

  function findFirst(hay, list) {
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var idx = hay.indexOf(list[i]);
      if (idx < 0) continue;
      // 가장 앞에서 시작하는 것, 같은 자리면 긴 것
      if (!best || idx < best.index || (idx === best.index && list[i].length > best.matched.length)) {
        best = { matched: list[i], index: idx };
      }
    }
    return best;
  }

  function negated(hay, hit) {
    var before = hay.slice(0, hit.index);
    var after = hay.slice(hit.index + hit.matched.length);
    if (/^[a-z]/.test(hit.matched)) return NEG_PREFIX_EN.test(before);
    // 패턴 자체가 부정을 품은 것("살고싶지않")은 접미 검사에서 제외
    var selfNeg = /않$/.test(hit.matched);
    return NEG_PREFIX.test(before) || (!selfNeg && NEG_SUFFIX.test(after));
  }

  function detect(text) {
    var hay = normalize(text);
    if (!hay) return null;
    var hit = findFirst(hay, HIGH);
    if (hit) {
      if (!negated(hay, hit)) return { level: 'high', matched: hit.matched };
      return { level: 'watch', matched: hit.matched };
    }
    var w = findFirst(hay, WATCH);
    if (w) return { level: 'watch', matched: w.matched };
    return null;
  }

  var api = { detect: detect, normalize: normalize, HIGH: HIGH, WATCH: WATCH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.crisis = api; }
})(typeof window !== 'undefined' ? window : this);
