/* 조현병 백과 · 검색어 속 자해·자살·타해 암시 감지
   detect(text) → null | { level: 'high' | 'harm' | 'watch', matched, harm? }
   high : 본인의 의도·계획이 드러나는 말("죽고 싶", "자살할", "손목을 긋" …). 타해 표현도 함께 있으면 harm: true
   harm : 다른 사람을 해칠 것 같은 말("죽이고 싶", "때릴 것 같", "해칠 것 같" …). high 가 아닐 때
   watch: 정보를 찾는 말("자살", "자해", "위기", "응급" …), 또는 부정이 붙은 high 표현, 또는 정보 검색으로 읽히는 high 표현
   - 한국어는 공백·구두점을 지우고 소문자로 바꾼 뒤 비교하므로 띄어쓰기·어미 변화에 강하다.
   - HIGH 는 모든 일치 위치를 본다. 다른 더 긴 일치에 완전히 덮이는 일치("자해하고싶" 안의 "자해하고")는 빼고,
     부정("안 죽고 싶", "죽고 싶지 않")이 아닌 것이 하나라도 있으면 high ("안 죽고 싶은데 사라지고 싶어" → high).
     모두 부정이면 watch. 부정이 두 번이면 취소("죽고 싶지 않은 건 아니야" → high).
   - 정보 검색으로 읽히는 꼴은 예외 표(EXC)로 내린다: "유서 깊은"·"돈에 목매는" → 없음, "자살할 확률"·"자해할 때 대처법" → watch.
     예외는 그 일치 바로 앞뒤 몇 글자만 본다(뒤쪽 어디엔가 "이유"가 있다고 내리지 않는다).
   - 양·치사 여부를 묻는 말("몇 알 먹으면 죽", "과다복용하면 죽")은 KO_COMBO 로 high.
   - 영어는 정규화하기 전 원문에서 낱말 경계로만 비교한다("twin studies"·"audience" 의 die, "how to diet" 는 걸리지 않음).
     영어 부정은 바로 앞의 "want to"·"going to"·"would" 같은 조동사 구를 건너뛰고 본다("I don't want to kill myself" → watch).
   - 타해 표현은 부정이 붙어도 내리지 않는다("죽이고 싶지 않은데" 처럼 자기 충동이 무서운 사람에게도 같은 안내가 맞다).
   완벽을 노리지 않고, 애매하면 안전한 쪽(high 를 놓치지 않는 쪽)으로 둔다. 감지 결과로 사람을 판단하거나 점수를 매기지 않고
   안내 카드(data/crisis-card.js)만 고른다. 팔레트·검색 화면에서 이 결과는 전화로 바로 이어지지 않는다.
   hasContact(htmlOrText): 글 조각에 위기 연락처(109·1577-0199·119·112·1393)가 있나. 요약 보기가 그 소절을 접지 않게 쓴다. */
(function (root) {
  // 본인의 의도·계획이 드러나는 표현. 공백 없는 꼴로 적는다(어미는 뒤에 무엇이 와도 잡힌다).
  var HIGH = [
    // 죽고 싶다
    '죽고싶', '죽고파', '죽을래', '죽어버리', '죽어야겠', '죽어야지', '죽어야돼', '죽어야해', '죽어야할', '죽을까', '죽고말',
    '죽는게낫', '죽는게나', '죽는게더', '죽어버릴', '죽을거야', '죽을생각', '뒤지고싶', '뒤져버리고싶', '디지고싶',
    // 사라지고 싶다 · 끝내고 싶다 · 세상을 떠나고 싶다
    '사라지고싶', '없어지고싶', '사라지고파', '없어지고파', '사라질래', '없어질래', '사라져버리', '없어져버리',
    '내가사라지', '내가없어지', '내가사라졌', '내가없어졌', '나만사라지', '나만없어지',
    '끝내고싶', '끝내버리', '다끝내', '모두끝내', '전부끝내',
    '세상을떠나고싶', '세상떠나고싶', '세상을뜨고싶', '세상뜨고싶', '하늘나라가고싶', '하늘나라에가고싶',
    '나같은건없', '나같은게없', '나같은건사라', '나같은건죽', '내가없는게나', '나없는게나', '나는없는게나',
    // 살기 싫다 · 그만 살고 싶다 · 다 포기하고 싶다
    '살기싫', '살기가싫', '살고싶지않', '살고싶지가않', '살고싶진않', '살아야할이유', '살이유가없',
    '살이유없', '살아갈이유', '살기힘들어죽', '그만살고싶', '그만살래', '그만살까', '그만살아야', '그만살자',
    '살아서뭐해', '살아서뭐하', '살아봤자뭐', '살의미가없', '살아갈의미가없', '살아갈자신이없',
    '사는게의미없', '사는게의미가없', '사는게무의미',
    '다포기하고싶', '모두포기하고싶', '전부포기하고싶', '모든걸포기하고싶', '모든것을포기하고싶', '다포기할래', '다포기해버리',
    '인생포기', '인생을포기', '삶을포기', '삶포기', '사는걸포기', '살기를포기',
    // 자살 · 자해 의도
    '자살하고싶', '자살할', '자살하려', '자살하고', '자살을하', '자살을할', '자살시도하', '자살을시도', '자살방법',
    '자살하는방법', '자살하는법', '자살도구', '자살충동', '자살생각이', '자살생각을', '자살생각해', '자살생각나', '자살생각들',
    '자살생각만', '자살생각뿐', '자살생각계속', '자살생각자꾸',
    '자해하고싶', '자해할', '자해하려', '자해하고', '자해를하', '자해를할', '자해방법', '자해하는법', '자해충동',
    '목숨을끊', '목숨끊', '극단적선택을하', '극단적선택하', '극단적선택을할', '극단적선택할',
    '극단적인선택을하', '극단적인선택하', '극단적인선택을할', '극단적인선택할',
    // 방법이 드러나는 말
    '손목을긋', '손목긋', '손목을그어', '손목그어', '뛰어내리', '뛰어내릴', '목을매', '목매', '목을맬',
    '약을다먹', '약다먹', '약을한번에', '한꺼번에먹', '한꺼번에다먹', '한번에다먹', '한번에몽땅', '몽땅먹',
    '약을모아', '약모아', '약을모으', '약모으', '약을털어',
    '수면제모아', '수면제를모아', '수면제모으', '수면제를모으', '수면제사모', '수면제를사모',
    '죽는법', '죽는방법', '죽는약', '죽을수있는방법', '죽을수있는약', '치사량',
    '번개탄피우', '번개탄을피우', '번개탄을사', '번개탄사놨', '번개탄사왔', '번개탄사러', '번개탄준비',
    '유서'
  ];
  /* 양·치사 여부를 묻는 말(공백 없는 꼴에서): "수면제 몇 알 먹으면 죽어", "과다복용하면 죽나요", "수면제를 몇 달째 모아놨어".
     "죽" 뒤에는 어미가 와야 한다("밥 다 먹고 죽 끓였어" 의 죽은 아님) */
  var KO_COMBO = [
    /(몇|얼마나|얼만큼|많이|다|몽땅|전부|한꺼번에|한번에|통째로|과다|과량)(알|개|통|정|병|봉지|일치|달치)?(을|를|씩|이나|정도|만)?(먹으면|먹어야|먹고|복용하면|삼키면|털어넣으면)(죽(?:어|을|나|는|지|으|겠|었|고|게|냐|니)|사망|숨지|안깨|못깨)/,
    /(과다복용|과량복용|과다섭취|과량섭취|과다투여)(을|를)?(하면|시|해서|했을때|하면은|으로|로|하고)?(죽(?:어|을|나|는|지|으|겠|었|고|게|냐|니)|사망|숨지)/,
    /(수면제|알약|진통제|안정제|타이레놀|해열제|약)(을|를|도)?(몇달째|몇주째|조금씩|계속|몰래|이만큼|많이|잔뜩|한가득)?(모아뒀|모아놨|모아놓|모아두었|모았어|모으고있|사모았|사모으|모아왔)/,
    /* "내가 없으면 다들 편할 거야" */
    /(내가|나만|나하나|나하나만)(그냥)?(없으면|없어지면|사라지면|죽으면).{0,8}(편할|편해|편하|나을|낫|행복|좋을|좋아질)/
  ];
  // 영어 high: 낱말 사이 공백·구두점은 있어도 없어도 되고, 끝은 낱말 경계("how to diet" 는 아님).
  // 앞에 '^' 가 붙은 것은 앞도 낱말 경계("him suicidal" 의 "im suicidal", "10kms" 는 아님)
  var EN_HIGH = [
    'kill myself', 'killing myself', 'end my life', 'ending my life', 'want to die', 'wanna die', 'wanting to die',
    'hurt myself', 'cut myself', 'end it all', 'take my life', 'take my own life', 'better off dead',
    'suicide plan', 'how to kill', 'how to die',
    'don t want to live', 'do not want to live', 'don t wanna live', 'no reason to live', 'nothing to live for',
    'want to disappear', 'wanna disappear', 'wish i was dead', 'wish i were dead', 'want to end it',
    '^i m suicidal', '^i am suicidal', '^feel suicidal', '^feeling suicidal', '^felt suicidal', '^kms'
  ];

  // 다른 사람을 해칠 것 같은 표현(공백 없는 꼴)
  var HARM = [
    '죽이고싶', '죽이고말', '죽여버리', '죽여버릴', '죽일것같', '죽일거', '죽일까', '죽일생각', '죽일지도',
    '죽이겠', '죽이려고', '때릴것같', '때리고싶', '때릴까', '때려죽이', '때려버리', '때릴지도', '패버리',
    '패고싶', '팰것같', '해칠것같', '해치고싶', '해칠까', '해쳐버리', '해칠생각', '해칠지도', '해치려고',
    '찌르고싶', '찌를것같', '찔러버리', '찌를까', '칼로찌르'
  ];
  /* 타해 표현 바로 앞 낱말(띄어쓰기를 살린 글에서)로 뜻을 가른다. 공백을 지운 글에서는 "누나를"의 "나를"을 가를 수 없어서다.
     - 사람이 아닌 것: "건강을 해칠까", "관계를 해칠 것 같아", "시간 죽이고 싶어", "벌레 죽일까", "드럼 때릴까" → 타해 아님
     - 나 자신 + 바람("나를 해치고 싶어", "내 몸을 때리고 싶어") → 자해(high)
     - 나 자신 + 짐작("나를 죽일 것 같아": 누군가 나를) → 위협을 느끼는 쪽이라 harm. 앞에 "내가"가 있으면 자해(high) */
  var HARM_RE = HARM.map(function (p) { return { p: p, desire: /싶|버리|말/.test(p), re: new RegExp(p.split('').join('\\s?'), 'g') }; });
  var SELF_TOK = /^(나를|날|내몸을|내몸|제몸을|제몸|몸을|스스로를|스스로|자신을|저를|자기를)$/;
  var I_TOK = /^(내가|제가|나도|스스로|내|제)$/;
  var THING_TOK = /^(건강|신장|콩팥|심장|피부|치아|기분|분위기|관계|위장|간|간기능|몸매|이미지|체면|명예|시간|벌레|모기|파리|바퀴벌레|바퀴|개미|쥐|해충|세균|균|잡초|곰팡이|드럼|북|샌드백|베개|인형|공|보스|몬스터|좀비|몹|캐릭터)(을|를|이|가|도|까지|만)?$/;
  var EN_HARM = /(^|[^a-z])(kill|murder|stab|hurt|harm|attack|shoot|strangle)[^a-z]+(him|her|them|someone|somebody|people|everyone|everybody|my[^a-z]+(?:mom|mother|dad|father|parents?|family|wife|husband|partner|brother|sister|son|daughter|kids?|child|children|baby|boss|neighbou?rs?))(?=[^a-z]|$)/;

  // 정보를 찾는 표현. high·harm 이 아닐 때만 쓴다.
  var WATCH = [
    '자살', '자해', '극단적선택', '극단적인선택', '위기', '응급', '죽음', '죽은', '죽는', '죽을', '죽어',
    '죽고', '목숨', '짐이되', '절망', '희망이없', '희망없', '살기', '손목', '유족',
    '과다복용', '과량복용', '번개탄', '떠나고싶', '포기하고싶', '없는게나', '없는게낫', '태어나지말'
  ];
  // 영어 watch: 원문에서 낱말 경계로만
  var EN_WATCH = /(^|[^a-z])(suicid(?:e|es|al|ality)|self[^a-z]*(?:harm(?:ing)?|injur(?:y|ies))|cris[ie]s|emergenc(?:y|ies)|hotlines?|die|dies|died|dying|deaths?|overdos(?:e|es|ed|ing))(?=[^a-z]|$)/;

  // 부정 접두: 바로 앞이 "안"·"못"이면 의도가 아니다("안 죽고 싶"). "불안"·"편안"의 "안"은 제외.
  var NEG_PREFIX = /(^|[^불편미])(안|못)$/;
  // 부정 접미 ①: 바로 뒤가 "지 않" 류("죽고 싶지 않아") ②: "은 게 아니" 류("죽고 싶은 게 아니라").
  // ① 뒤에 ② 가 또 오면("죽고 싶지 않은 건 아니야") 두 번 부정이라 취소한다.
  var NEG_SUFFIX1 = /^(지|진|지는|지가|지도)않/;
  var NEG_SUFFIX2 = /^(은|는|다는|단)?(게|건|것이|것은|거는|거)아니/;
  // 영어 부정 접두("don't want to die", "never kill myself"): 앞 글자에서 영문자만 남긴 끝
  var NEG_PREFIX_EN = /(not|dont|never|no|wont|cant|wouldnt|shouldnt|didnt|doesnt|isnt|arent|wasnt)$/;
  // 영어 부정 앞의 조동사 구: "don't [want to] kill myself", "not [going to]", "never [ever]"
  var EN_AUX_TAIL = /(wantto|wanna|wanting|goingto|gonna|would|will|ever|tryto|try|planto|planningto|evenwantto)$/;

  /* ---------- 정보 검색으로 읽히는 꼴(예외 표) ----------
     before: 일치 앞(공백 없는 꼴), after: 일치 뒤. 'skip' = 이 일치는 없는 것으로, 'watch' = 이 일치는 watch 로 */
  var TASK_BEFORE = /(일|숙제|과제|공부|업무|정리|청소|빨래|설거지|작업|시험|프로젝트|보고서|논문|게임|드라마|책|밥|식사|약속|대화|회의|수업|운동|치료|상담|일정|준비)(을|를|은|는|도|만)?(다|모두|전부|빨리|얼른|좀|먼저|오늘|일찍|금방)*$/;
  var THING_BEFORE = /(벌레|모기|파리|바퀴|해충|개미|쥐|세균|균|바이러스|잡초|풀|암세포|식물|화분|나무|금붕어|물고기|곰팡이)(가|이|이나|도|만)?$/;
  var INFO_AFTER = /^(는|은|한|할|하는|했던|했다는|된)?(확률|위험|가능성|위험성|위험도|비율|이유|원인|사람|사례|경우|요인|통계|뉴스|기사|률)/;
  var COPE_AFTER = /^(이|을|가|에|의|은|는)?((이)?(들|있을|올|생길|날)때)?(대처|대응|관리|다루|다스리|극복|줄이|예방|치료|척도|평가|원인|이유|뜻|의미|란|이란|통계|연구|증상)/;
  var NONE_AFTER = /^(은|이|도|는)?(없|안들|안나|전혀|별로)/;
  function inList(p, list) { return list.indexOf(p) >= 0; }
  var END_P = ['끝내고싶', '끝내버리', '다끝내', '모두끝내', '전부끝내'];
  var GATHER_P = ['약을모아', '약모아', '약을모으', '약모으', '수면제모아', '수면제를모아', '수면제모으', '수면제를모으'];
  var DIE_HOW_P = ['죽는법', '죽는방법', '죽는약', '죽을수있는방법', '죽을수있는약'];
  var ACT_P = ['자살을하', '자해를하', '극단적선택을하', '극단적선택하', '극단적인선택을하', '극단적인선택하',
    '자살을할', '자해를할', '극단적선택을할', '극단적선택할', '극단적인선택을할', '극단적인선택할'];
  var URGE_P = ['자살충동', '자해충동', '자살생각이', '자살생각을', '자살생각해', '자살생각나', '자살생각들', '자살생각만', '자살생각뿐', '자살생각계속', '자살생각자꾸'];
  function exception(p, before, after) {
    /* "그만 살고 싶지 않아"(그만 살고 싶은 게 아님)의 "살고싶지않" 은 앞의 "그만살고싶" 이 부정과 함께 본다 */
    if (/^살고싶/.test(p) && /그만$/.test(before)) return 'skip';
    if (p === '유서') return /^(깊|가깊|가오래|의법|의효력|효력|공증|검인|작성요건|보관|대필)/.test(after) ? 'skip' : null;
    if (p === '목매') return /(에|에게|한테|께|에만|에다)$/.test(before) ? 'skip' : null;
    if (p === '뛰어내리' || p === '뛰어내릴') {
      if (/(버스|차|차량|택시|지하철|기차|열차|계단|침대|담|담장|트럭|말|배|그네|미끄럼틀|비행기|낙하산|트램펄린|의자|소파|책상|무대)(에서|위에서)?$/.test(before)) return 'skip';
      return /^다(가)?(다치|다쳐|다침|넘어|발목|삐)/.test(after) ? 'skip' : null;
    }
    if (inList(p, END_P)) {
      if (p !== '끝내고싶' && p !== '끝내버리' && /^기/.test(after)) return 'skip'; /* "다 끝내기 챌린지" */
      return TASK_BEFORE.test(before) ? 'watch' : null; /* "숙제 다 끝내고", "일 다 끝내고 싶어" */
    }
    if (inList(p, GATHER_P)) {
      return /^(아|서|아서)?(두는|놓는|담는|넣는|넣어두는|보관하는)?(통|함|케이스|상자|용기|박스|보관함|정리함|파우치|달력)|^기(앱|어플|통|함)|^(아|서|아서)?(버리|반납|폐기|처리|수거|버려|약국|보건소)/.test(after) ? 'skip' : null;
    }
    if (p === '죽을까') return (/^(봐|바)/.test(after) || /면$/.test(before)) ? 'skip' : null; /* "죽을까 봐 무서워", "먹으면 죽을까요" */
    if (p === '자살할' || p === '자해할') {
      if (/^(까봐|까바)/.test(after)) return 'skip';
      if (INFO_AFTER.test(after) || /^때(의|에)?(대처|대응|응급|처치|도움|돕|도와|어떻게|가족|부모|보호자|주변|해야)/.test(after)) return 'watch';
      return null;
    }
    if (p === '자살하고' || p === '자해하고') {
      return /^(나서|난뒤|난후|난다음|나면)|^있는(아이|애|자녀|아들|딸|친구|사람|학생|가족|청소년|환자|당사자|동생|형|누나|언니|오빠)/.test(after) ? 'watch' : null;
    }
    if (inList(p, ACT_P)) return (INFO_AFTER.test(after) || /^(기|게)(전|직전|까지)/.test(after)) ? 'watch' : null;
    if (p === '목숨을끊' || p === '목숨끊') return (/^(은|었|는이유|는사람|은사람|었던|은뒤|은후|게되|게된)/.test(after) || INFO_AFTER.test(after)) ? 'watch' : null;
    /* "자살 생각이 있다면 109", "자살 생각이나 행동으로 입원한" 처럼 조건·나열이면 정보 */
    if (inList(p, URGE_P)) return (COPE_AFTER.test(after) || NONE_AFTER.test(after) || /^(있으면|있다면|있는|있을때|있었던|나(행동|감정|충동|계획|시도|의도)|과|와|및|으로|척도)/.test(after)) ? 'watch' : null;
    if (inList(p, DIE_HOW_P)) return THING_BEFORE.test(before) ? 'skip' : null;
    if (p === '한꺼번에먹' || p === '한꺼번에다먹' || p === '한번에다먹') return /^(어도|으면안|는게|는거|는것|어야하|는경우|는실수)/.test(after) ? 'watch' : null;
    if (p === '약을한번에') return /^(먹어도|먹으면안|먹는게|먹는거|먹어야하|복용해도|복용하면안)/.test(after) ? 'watch' : null;
    return null;
  }

  function normalize(text) {
    return String(text == null ? '' : text)
      .slice(0, 500)
      .toLowerCase()
      .replace(/[\s '’"“”`\-_.,!?~…·()\[\]{}:;/\\]+/g, '');
  }
  function rawLower(text) { return String(text == null ? '' : text).slice(0, 500).toLowerCase(); }
  /* 띄어쓰기는 한 칸으로 살리고 구두점은 공백으로 */
  function spaced(text) { return rawLower(text).replace(/[\s'’"“”`\-_.,!?~…·()\[\]{}:;/\\]+/g, ' ').trim(); }

  /* 모든 일치 위치: [{ matched, index }] (앞에서부터, 같은 자리면 긴 것 먼저) */
  function findAll(hay, list) {
    var hits = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i], from = 0, idx;
      while ((idx = hay.indexOf(p, from)) >= 0) { hits.push({ matched: p, index: idx }); from = idx + 1; }
    }
    hits.sort(function (a, b) { return a.index - b.index || b.matched.length - a.matched.length; });
    return hits;
  }
  /* 다른 더 긴 일치에 완전히 덮이는 일치는 뺀다("자해하고싶지않" 의 "자해하고" 를 따로 보면 부정을 못 봐서) */
  function dropCovered(hits) {
    return hits.filter(function (h) {
      var end = h.index + h.matched.length;
      return !hits.some(function (o) {
        return o !== h && o.matched.length > h.matched.length && o.index <= h.index && o.index + o.matched.length >= end;
      });
    });
  }
  function negated(hay, hit) {
    var before = hay.slice(0, hit.index);
    var after = hay.slice(hit.index + hit.matched.length);
    var n = NEG_PREFIX.test(before) ? 1 : 0;
    // 패턴 자체가 부정을 품은 것("살고싶지않")은 그 부정이 한 번
    if (/않$/.test(hit.matched)) { if (NEG_SUFFIX2.test(after)) n++; }
    else {
      var m = NEG_SUFFIX1.exec(after);
      if (m) { n++; if (NEG_SUFFIX2.test(after.slice(m[0].length))) n++; }
      else if (NEG_SUFFIX2.test(after)) n++;
    }
    return n % 2 === 1;
  }
  function enPhraseRe(phrase) {
    var lead = phrase.charAt(0) === '^';
    var words = (lead ? phrase.slice(1) : phrase).split(' ');
    return new RegExp((lead ? '(^|[^a-z0-9])' : '()') + words.join('[^a-z0-9]*') + '(?=[^a-z]|$)', 'g');
  }
  var EN_HIGH_RE = EN_HIGH.map(function (p) { return { p: p.replace(/[ ^]/g, ''), re: enPhraseRe(p) }; });
  function enNegated(raw, index) {
    var before = raw.slice(0, index).replace(/[^a-z]/g, '');
    /* 부정을 먼저 보고, 아니면 조동사 구를 하나 떼고 다시("never" 의 "ever" 를 떼지 않게) */
    for (var k = 0; k < 4; k++) {
      if (NEG_PREFIX_EN.test(before)) return true;
      var b = before.replace(EN_AUX_TAIL, '');
      if (b === before) break;
      before = b;
    }
    return NEG_PREFIX_EN.test(before);
  }
  /* 영어 high 의 모든 일치: [{ matched, index, neg }] */
  function enHighHits(raw) {
    var hits = [];
    EN_HIGH_RE.forEach(function (x) {
      x.re.lastIndex = 0;
      var m;
      while ((m = x.re.exec(raw))) {
        var at = m.index + m[1].length;
        /* "10 kms"(거리)는 아님 */
        if (!(x.p === 'kms' && /\d\s*$/.test(raw.slice(0, at)))) hits.push({ matched: x.p, index: at, neg: enNegated(raw, at) });
        x.re.lastIndex = at + 1;
      }
    });
    hits.sort(function (a, b) { return a.index - b.index; });
    return hits;
  }
  /* 타해 표현: { harm: 처음 걸린 타해 패턴 | null, self: 자해로 읽히는 패턴 | null } */
  function harmScan(sp, raw) {
    var out = { harm: null, self: null, index: Infinity };
    HARM_RE.forEach(function (x) {
      x.re.lastIndex = 0;
      var m;
      while ((m = x.re.exec(sp))) {
        var toks = sp.slice(0, m.index).split(' ').filter(Boolean);
        var prev = toks[toks.length - 1] || '', prev2 = toks[toks.length - 2] || '';
        if (THING_TOK.test(prev)) { /* 사람이 아닌 것을 해침 */ }
        else if (SELF_TOK.test(prev) && (x.desire || I_TOK.test(prev2))) { if (!out.self) out.self = x.p; }
        else if (m.index < out.index) { out.harm = x.p; out.index = m.index; }
        x.re.lastIndex = m.index + 1;
      }
    });
    if (!out.harm) {
      var e = EN_HARM.exec(raw);
      if (e) out.harm = (e[2] + e[3]).replace(/[^a-z]/g, '');
    }
    return out;
  }

  function detect(text) {
    var hay = normalize(text);
    if (!hay) return null;
    var raw = rawLower(text);
    var live = null, neg = null;
    var ko = dropCovered(findAll(hay, HIGH).filter(function (h) {
      h.exc = exception(h.matched, hay.slice(0, h.index), hay.slice(h.index + h.matched.length));
      return h.exc !== 'skip';
    }));
    ko.forEach(function (h) {
      if (h.exc === 'watch' || negated(hay, h)) { if (!neg) neg = h.matched; }
      else if (!live) live = h.matched;
    });
    if (!live) {
      for (var c = 0; c < KO_COMBO.length; c++) { var cm = KO_COMBO[c].exec(hay); if (cm) { live = cm[0]; break; } }
    }
    enHighHits(raw).forEach(function (h) { if (h.neg) { if (!neg) neg = h.matched; } else if (!live) live = h.matched; });
    var hs = harmScan(spaced(text), raw), harm = hs.harm;
    if (!live && hs.self) live = hs.self;
    if (live) return harm ? { level: 'high', matched: live, harm: true } : { level: 'high', matched: live };
    if (harm) return { level: 'harm', matched: harm };
    if (neg) return { level: 'watch', matched: neg };
    var w = findAll(hay, WATCH)[0];
    if (w) return { level: 'watch', matched: w.matched };
    var m = EN_WATCH.exec(raw);
    if (m) return { level: 'watch', matched: m[2].replace(/[^a-z]/g, '') };
    return null;
  }

  /* 위기 연락처가 든 글 조각인가(HTML 이나 글). tel: 링크, 또는 앞뒤가 숫자가 아닌 번호.
     "112개 연구", "1,109명", "119점" 처럼 수를 세는 말은 빼고, 굵게 싼 번호는 태그를 지운 뒤 본다. */
  var CONTACT_TEL = /href=["']tel:(109|112|119|1393|1577-?0199)["']/i;
  var CONTACT_TXT = /(^|[^\d,.\-])(109|112|119|1393|1577-0199)(?![\d\-]|\s*(?:명|개|년|조|항|호|세|살|%|번째|만|천|억|원|회|건|곳|일|시간|분|위|차|쪽|점|개월|주|mg|㎎|kg|cm|쌍|편|곡|마리|대|권))/;
  function hasContact(s) {
    s = String(s == null ? '' : s);
    if (CONTACT_TEL.test(s)) return true;
    return CONTACT_TXT.test(s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' '));
  }

  var api = { detect: detect, normalize: normalize, hasContact: hasContact, HIGH: HIGH, WATCH: WATCH, HARM: HARM, EN_HIGH: EN_HIGH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.crisis = api; }
})(typeof window !== 'undefined' ? window : this);
