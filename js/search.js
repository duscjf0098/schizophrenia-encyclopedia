/* 조현병 백과 · 검색 두뇌 (브라우저 JHB.search, node require 겸용. 외부 라이브러리 없음)
   - hangul: 자모 분해(jamo), 초성(initials), 자모 기준 편집 거리(distance)
   - quick(빠른 찾기): 팔레트와 찾기 화면이 함께 쓰는 한 함수. 대상은 글 제목·태그·요약·분류 이름, 용어 사전(term·en),
     읽기 코스, 일상 말 사전. 순위: 제목 완전 일치 > 제목 접두 > 제목 포함 > 일상 말 일치 > 태그 > 요약.
     질의의 낱말 경계를 지켜요(공백을 지워 붙인 부분 일치로 "자살" → "혼자 살기" 같은 글이 오르지 않게). 영문은 낱말 단위.
     결과가 없거나 약하면 오타(자모 편집 거리: 짧은 말 1, 긴 말 2 이내)·초성으로 "○○을(를) 찾으셨나요?" 후보를 찾아요.
     prepare(src) 를 한 번 만들고 find(P, q) 를 여러 번 불러요(일상 말 사전을 글자마다 새로 만들지 않음).
   - build(docs)·query(index, q, opts): 본문 색인 검색(찾기 화면의 두 번째 단계). 모든 낱말이 맞는 글 먼저(AND),
     한 글자 낱말은 가볍게, 조각 강조는 원문에서 자리를 찾은 뒤 조각마다 이스케이프(quot·amp 검색에서 엔티티가 깨지지 않게).
   - merge(quick, body, opts): 두 단계 결과를 순서가 크게 흔들리지 않게 합치기. 위기·타해 질의는 crisis-card 의 글을 맨 앞에.
   - shortAnswer(body): 자주 묻는 질문 글의 "## 짧은 답" 소절 원문 그대로(요약·생성 없음).
   - M8: 정의 질문(defOf: "X가 뭐예요·X란·X 뜻")은 X 를 설명하는 글을 맨 앞에. 짧은 답 카드는 그 글이 정말 그 질문의 답일 때만(cardOk,
     내용 낱말 rootsOf 로 제목과 질의가 같은 것을 묻는지 본다). screens·screenSlot: 특집 화면을 이름으로 찾기(팔레트·찾기 화면).
   - crisis(detect, texts): 원문과 교정된 질의 모두에 위기 감지를 돌려 가장 무거운 등급을 고른다.
   검색어는 이 파일 안에서만 쓰고 어디에도 저장하거나 보내지 않아요. */
(function (root) {
  /* ---------------- 공통 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lower(s) { return String(s == null ? '' : s).toLowerCase(); }
  var SEP = /[\s·•,.:;!?()[\]{}<>\/\\'"“”‘’`~\-_=+|*&^%$#@…]+/;
  function words(s) { return lower(s).split(SEP).filter(Boolean); }
  /* 붙인 글(공백·문장 부호 없음)과 낱말이 시작하는 자리 */
  function compact(s) {
    var ws = words(s), c = '', st = {};
    ws.forEach(function (w) { st[c.length] = 1; c += w; });
    return { c: c, starts: st, words: ws };
  }
  function isLatin(s) { return /^[a-z0-9]+$/.test(s); }
  function isHangulWord(s) { return /[가-힣]/.test(s); }
  /* hay 에 v 가 있나. 영문·숫자 낱말은 낱말이 시작하는 자리에서만("eps" 는 "keps" 속에서 맞지 않음, "cbt" 는 "수면cbt"·"cbtp" 에서 맞음) */
  function hasIn(hay, v) {
    var p = hay.indexOf(v);
    if (p < 0 || !isLatin(v)) return p >= 0;
    while (p >= 0) {
      if (p === 0 || !/[a-z0-9]/.test(hay.charAt(p - 1))) return true;
      p = hay.indexOf(v, p + 1);
    }
    return false;
  }

  /* ---------------- 한글 도구 ---------------- */
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  var JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  var JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  /* 음절을 호환 자모로(초성·중성·종성). 다른 글자는 소문자로 그대로 */
  function jamo(s) {
    s = lower(s);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xAC00 && c <= 0xD7A3) {
        var k = c - 0xAC00;
        out += CHO.charAt(Math.floor(k / 588)) + JUNG.charAt(Math.floor((k % 588) / 28)) + JONG[k % 28];
      } else out += s.charAt(i);
    }
    return out;
  }
  /* 초성 문자열: 음절은 초성 자모로, 호환 자모·영문·숫자는 그대로, 공백·문장 부호는 뺀다 */
  function initials(s) {
    var c = compact(s).c, out = '';
    for (var i = 0; i < c.length; i++) {
      var k = c.charCodeAt(i);
      out += (k >= 0xAC00 && k <= 0xD7A3) ? CHO.charAt(Math.floor((k - 0xAC00) / 588)) : c.charAt(i);
    }
    return out;
  }
  /* 질의가 초성 자모(ㄱ~ㅎ)로만 이뤄졌나(공백 무시, 두 자 이상) */
  function isInitials(q) {
    var c = String(q == null ? '' : q).replace(/\s+/g, '');
    return c.length >= 2 && /^[ㄱ-ㅎ]+$/.test(c);
  }
  /* 편집 거리(레벤슈타인). max 를 넘으면 max+1 로 일찍 끝낸다 */
  function lev(a, b, max) {
    if (max == null) max = Infinity;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    if (!la) return lb;
    if (!lb) return la;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i;
      var rowMin = i, ca = a.charCodeAt(i - 1);
      for (j = 1; j <= lb; j++) {
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca === b.charCodeAt(j - 1) ? 0 : 1));
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      var t = prev; prev = cur; cur = t;
    }
    return prev[lb];
  }
  /* 자모 기준 편집 거리: "환쳥"↔"환청" 1, "클로자삔"↔"클로자핀" 1 */
  function distance(a, b, max) { return lev(jamo(compact(a).c), jamo(compact(b).c), max); }
  /* 받침이 있으면 '을', 없으면 '를'(영문·숫자는 '을(를)') */
  function josaEulReul(s) {
    s = String(s || '');
    var c = s.charCodeAt(s.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 ? '을' : '를';
    return '을(를)';
  }
  var hangul = { jamo: jamo, initials: initials, isInitials: isInitials, distance: distance, lev: lev, josa: josaEulReul };

  /* ---------------- 질의 다듬기 ---------------- */
  /* 낱말 끝에서 뗄 조사·어미(긴 것부터). 뗀 뒤 두 글자 이상 남을 때만(한 글자 조사는 두 글자 낱말에서 한 글자로도: 약을 → 약) */
  var TAILS = ['이에요', '이예요', '했어요', '었어요', '았어요', '됐어요', '되나요', '하나요', '인가요', '할까요', '을까요', '일까요', '했는데', '는데요',
    '에서', '에게', '한테', '으로', '이랑', '하고', '까지', '부터', '예요', '에요', '어요', '아요', '해요', '나요', '까요', '가요', '해도', '어도', '아도', '는데', '하면', '으면',
    '은', '는', '이', '가', '을', '를', '에', '의', '도', '만', '로', '와', '과', '랑', '요', '야', '다', '니', '냐', '나', '지', '죠', '해', '면'];
  var ONE = { '은': 1, '는': 1, '이': 1, '가': 1, '을': 1, '를': 1, '에': 1, '의': 1, '도': 1, '만': 1, '로': 1, '와': 1, '과': 1 };
  function stems(w) {
    var out = [w];
    if (!isHangulWord(w)) return out;
    for (var i = 0; i < TAILS.length; i++) {
      var t = TAILS[i], rest = w.length - t.length;
      if (rest < 1 || w.slice(-t.length) !== t) continue;
      if (rest >= 2 || (rest === 1 && ONE[t] && w.length === 2)) {
        var s = w.slice(0, -t.length);
        if (out.indexOf(s) < 0) out.push(s);
        break; /* 가장 긴 꼬리 하나만 뗀다(환청이에요 → 환청) */
      }
    }
    return out;
  }
  /* 기능어: 다른 낱말이 있으면 찾는 말에서 뺀다("약 끊어도 되나요" → 약·끊어도) */
  var STOP = {};
  ('되나요 하나요 있나요 없나요 되요 돼요 해요 할까요 될까요 인가요 뭐예요 뭐에요 뭔가요 뭐야 뭐지 무엇인가요 무엇 어떻게 어떡해 어떡하죠 어떡하나요 ' +
    '왜 뭐 정말 그냥 너무 좀 진짜 혹시 수 있어요 없어요 해야 하나 되나 될까 할까 괜찮나요 괜찮아요 괜찮을까요 어떤가요 알려줘 알려주세요 궁금해요 ' +
    '안 못 거 것 게 건가요 건지 걸까요 i m s the a an is to of and or my me ' +
    /* M8: 기능어뿐인 질의(하니·이거 뭐야·왜 그래요)에 엉뚱한 짧은 답이 뜨지 않게 */
    '하니 이거 그거 저거 이게 그게 저게 이건 그건 그래요 그래 왜요 어때요 어때 뭔데 뭐죠 뭘까요 뭐니 뭐냐 뭐임 뭔지 무엇이에요 무엇일까요 무엇인가 무엇인지 what ' +
    /* M8 검수 뒤: 부정어를 붙여 쓴 꼴("약 끊으면 안되나요")도 '안 되나요' 와 같게 기능어로 */
    '안되나요 안되나 안돼요 안되요 안돼 안될까요 안되죠 안되는지 못하나요 못해요').split(' ').forEach(function (w) { STOP[w] = 1; });
  /* 질문 꼴: 물음표, 또는 묻는 어미로 끝남. 한 글자 꼬리(나·니·냐·까)는 동사 어간 꼴일 때만
     ("되나·하니·있냐·할까"는 질문, "누나·언니·어머니·할머니"는 아님) */
  var Q_END = /(나요|까요|가요|니까|래요|죠|지요|는지|을지|되요|돼요|해도|어도|아도|셔도|해야|해야 하나|야 하나|뭐야|뭐지|뭐예요|뭐에요|뭔데|인데요|있어요|없어요)\s*$/;
  var VSTEM = '되하있없했됐었았였겠는먹갔왔봤돼싶좋맞찮프픈갈될할줄볼먹';
  function oneTail(s) {
    var m = /([가-힣])(나|니|냐|까)$/.exec(s);
    if (!m) return false;
    var c = m[1].charCodeAt(0) - 0xAC00;
    if (m[2] === '까' && c % 28 === 8) return true; /* 받침 ㄹ + 까: 할까·될까·먹을까 */
    return VSTEM.indexOf(m[1]) >= 0;
  }
  function isQuestion(raw) {
    var s = String(raw || '').trim();
    if (!s || !words(s).length) return false; /* 문장 부호만('?', '...')은 질문이 아님 */
    if (/[?？]\s*$/.test(s)) return true;
    var t = s.replace(/[\s.!~…]+$/, '');
    return Q_END.test(t) || oneTail(t) || /^(왜|어떻게|언제|누가|무엇|뭐가|뭘|어디)\s/.test(t);
  }
  /* 아주 긴 질의(붙여 넣은 글)는 앞 MAX_Q 글자·MAX_W 낱말만 찾는다(느린 기기에서 화면이 멈추지 않게). 위기 감지는 원문 전체에 따로 돌린다 */
  var MAX_Q = 100, MAX_W = 12;
  function clip(raw) {
    raw = String(raw == null ? '' : raw).trim();
    if (raw.length > MAX_Q) raw = raw.slice(0, MAX_Q).replace(/\s+\S*$/, '') || raw.slice(0, MAX_Q);
    var ws = raw.split(/\s+/);
    if (ws.length > MAX_W) raw = ws.slice(0, MAX_W).join(' ');
    return raw;
  }
  /* 음절의 받침 번호(0 = 받침 없음, -1 = 한글 음절 아님)와 가운데 소리 번호 */
  function jongOf(ch) { var c = String(ch || '').charCodeAt(0) - 0xAC00; return c >= 0 && c <= 11171 ? c % 28 : -1; }
  function jungOf(ch) { var c = String(ch || '').charCodeAt(0) - 0xAC00; return c >= 0 && c <= 11171 ? Math.floor((c % 588) / 28) : -1; }
  /* 받침 없이 ㅏ·ㅐ·ㅓ·ㅕ·ㅘ·ㅙ·ㅝ 로 끝나는 음절: 뒤에 '도' 가 붙으면 대개 연결 어미 -어도·-아도(먹어도·마셔도·봐도) */
  var VERB_VOWEL = { 0: 1, 1: 1, 4: 1, 6: 1, 9: 1, 10: 1, 14: 1 };
  function verbVowel(ch) { return jongOf(ch) === 0 && !!VERB_VOWEL[jungOf(ch)]; }
  /* 구절(제목 포함 검사)용 어간: 뜻이 갈리는 연결 어미(-야·-면·-어도 등)는 떼지 않는다
     ("약을 먹어야 하나요" 가 "약을 먹어도 목소리가 …" 제목에 구절로 맞지 않게. M8) */
  var KEEP_TAIL = { '야': 1, '면': 1, '해도': 1, '어도': 1, '아도': 1, '하면': 1, '으면': 1 };
  /* '하/되' 만 다른 꼴(입원하면 ↔ 입원되면, 치료해도 ↔ 치료돼도): 같은 말로 본다. 없으면 '' */
  var HADOE = { '하면': '되면', '되면': '하면', '해도': '돼도', '돼도': '해도' };
  function hadoe(w) { var t = w.slice(-2); return w.length >= 4 && HADOE[t] ? w.slice(0, -2) + HADOE[t] : ''; }
  /* hd: 질문 꼴 질의에서만 '하/되' 꼴을 함께 견준다("입원하면 어떻게 되나요" → 제목 "…입원되면 어떻게 되나요?". 낱말 하나 "입원하면" 은 그대로) */
  function phraseStems(w, hd) {
    var s = stems(w);
    if (s.length < 2) return s;
    var tail = w.slice(s[1].length);
    if (KEEP_TAIL[tail] || (tail === '도' && verbVowel(s[1].charAt(s[1].length - 1)))) { var h = hd ? hadoe(w) : ''; return h ? [w, h] : [w]; }
    return s;
  }
  /* 낱말 목록의 조사·어미를 뗀 구절들(최대 16개, 공백 빼고 두 글자 이상) */
  function phrasesOf(list, hd) {
    var phrases = [''];
    list.forEach(function (w) {
      var next = [];
      phraseStems(w, hd).forEach(function (v) { phrases.forEach(function (p) { if (next.length < 16) next.push(p ? p + ' ' + v : v); }); });
      phrases = next;
    });
    return phrases.filter(function (p) { return p.replace(/\s/g, '').length >= 2; });
  }

  /* ---------------- 정의 질문(M8) ---------------- */
  /* "X가 뭐예요 / X이 뭔가요 / X 뭐야 / X란 / X이란 무엇인가요 / X 뜻 / X가 무슨 병이에요 / what is X" → X.
     조사는 받침에 맞을 때만 뗀다("아이 뭐예요" 의 '이' 는 조사가 아님, "혼란" 은 "혼+란" 이 아님).
     X 가 기능어뿐이면(이거 뭐야) 정의 질문이 아니다. defOf(raw) → { x, xc, alt, altc } | null (alt: 조사를 떼지 않은 꼴) */
  var DEF_Q = ['무엇인가요', '무엇입니까', '무엇이에요', '무엇일까요', '무엇이죠', '무엇인지', '무엇인가', '무엇이야', '뭐예요', '뭐에요', '뭔가요', '뭘까요', '뭡니까',
    '뭐야', '뭐지', '뭔데', '뭐죠', '뭐니', '뭐냐', '뭐임', '뭔지', '뭐'];
  var DEF_KIND = /\s*(?:무슨|어떤)\s*(?:병|질환|증상|약|뜻|말|것|거|치료|검사|제도|상태|개념|용어)(?:이에요|이예요|예요|에요|인가요|이야|야|이죠|죠|일까요|입니까|이니|이냐|인지|이요)?$/;
  var DEF_WORD = /\s*(?:뜻|의미|정의)(?:이|가|은|는|을|를)?$/;
  var DEF_EN = /^(?:what\s+is|what's|whats|what\s+are)\s+(?:an?\s+|the\s+)?(.+)$/;
  function unjosa(t) {
    function prevOk(end, needJong) {
      var ch = t.charAt(end - 1), j = jongOf(ch);
      if (j < 0) return /[a-z0-9]/.test(ch);
      return needJong ? j > 0 : j === 0;
    }
    if (t.length > 2 && t.slice(-2) === '이란' && prevOk(t.length - 2, true)) return [t.slice(0, -2), 'ran'];
    if (t.length > 2 && t.slice(-1) === '란' && prevOk(t.length - 1, false)) return [t.slice(0, -1), 'ran'];
    var m = /(이|은|가|는|의)$/.exec(t);
    if (m && t.length > 1 && (m[1] === '의' || prevOk(t.length - 1, m[1] === '이' || m[1] === '은'))) return [t.slice(0, -1), 'josa'];
    return [t, ''];
  }
  function defOf(raw) {
    var t = lower(clip(raw)).replace(/[\s?？!.~…]+$/, '').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    var marked = false, m, en = DEF_EN.exec(t);
    if (en) { t = en[1].trim(); marked = true; }
    else {
      for (var i = 0; i < DEF_Q.length; i++) {
        var w = DEF_Q[i];
        if (t.length > w.length && t.slice(-w.length) === w) { t = t.slice(0, -w.length).trim(); marked = true; break; }
      }
      if ((m = DEF_KIND.exec(t)) && m.index > 0) { t = t.slice(0, m.index).trim(); marked = true; }
      if ((m = DEF_WORD.exec(t)) && m.index > 0) { t = t.slice(0, m.index).trim(); marked = true; }
    }
    var u = unjosa(t), x = u[0].trim();
    if (!marked && u[1] !== 'ran') return null;
    if (compact(x).c.length < 2) { if (u[1] === 'josa') x = t; else return null; }
    var ws = words(x);
    if (!ws.length || ws.length > 4 || ws.every(function (v) { return STOP[v]; })) return null;
    if (compact(x).c.length < 2 || /^(왜|어떻게|언제|누가|어디|무엇|무엇이|뭐|뭐가|뭘|무슨|어떤|이|그|저)$/.test(ws[0])) return null;
    var alt = x !== t ? words(t).join(' ') : '';
    /* ran: "X란" 꼴 하나뿐(묻는 말 없음). "코크란" 처럼 원래 '란' 으로 끝나는 낱말일 수 있어 X 가 실제로 있는 말일 때만 정의 질문으로 본다(findQ) */
    return { x: ws.join(' '), xc: compact(x).c, alt: alt, altc: alt ? compact(alt).c : '', ran: !marked };
  }

  /* 제목이 무엇을 설명하는 글인지(붙인 꼴): "조현병이란 무엇인가" → 조현병, "망상 총론과 형성 과정" → 망상, "병식: 내가 …" → 병식,
     "장기지속형 주사제(LAI)" → 장기지속형주사제, "항정신병약의 원리" → 항정신병약. 없으면 null.
     쉼표는 보지 않는다("음성 증상, 당사자가 할 수 있는 것" 은 음성 증상을 설명하는 글이 아님) */
  function headOf(title) {
    var t = lower(title).replace(/\s+/g, ' ').trim(), h = null, m;
    if ((m = /^([^:(（]+?)\s*[:(（]/.exec(t))) h = m[1];
    var base = h || t;
    if ((m = /^(.+?)\s*(?:총론|개요|한눈에)(?:과|와|\s|$)/.exec(base))) h = m[1];
    else if ((m = /^(.+?)의\s*(?:원리|이해|기초)(?:\s|$)/.exec(base))) h = m[1];
    else if ((m = /^(.+?)(?:이란|란)(?:\s|$)/.exec(base))) { var u = unjosa(m[0].trim()); if (u[1] === 'ran') h = u[0]; }
    h = h ? compact(h).c : '';
    return h.length >= 2 && h !== compact(title).c ? h : null;
  }
  /* 정의 질문의 과녁 글과 띠: 제목이 X 그대로 1000 · 제목이 정말 그 정의 질문인 FAQ("조현병 초기 증상은 뭔가요?") 995 ·
     X 를 설명하는 제목(X이란·X 총론·X:) 985 · 용어 사전 X 의 첫 관련 글 975 · 일상 말 X 의 첫 글 965.
     조사를 뗀 꼴(xc)에서 하나도 없을 때만 떼지 않은 꼴(altc: "고양이" 의 '이')로 */
  function sameDef(a, xc) { return a === xc || a === '조현병' + xc || xc === '조현병' + a; }
  /* 어떤 글의 제목이 xc 로 시작하거나 낱말 시작에 xc 를 담고 있나(그 글은 제목 띠 900·800 으로 앞에 온다) */
  function titleHas(P, xc) {
    if (!P.thas) P.thas = {};
    if (!(xc in P.thas)) P.thas[xc] = P.docs.some(function (d) { return d.tc.indexOf(xc) === 0 || atStart(d.tc, d.ts, xc); });
    return P.thas[xc];
  }
  /* 일상 말 첫 글(sayFirst)을 정의 질문의 과녁으로 써도 되나: 자주 묻는 질문이 아닌 글 가운데 제목에 X 를 담은 글이 있는데
     일상 말 첫 글이 그 글들 밖이면 쓰지 않는다(재발 신호 → 재발과 재발 신호, 대마 → 대마와 조현병).
     X 를 담은 제목이 질문 글뿐이거나(목소리 → 약을 먹어도 목소리가 …) 첫 글이 그 가운데 하나면(주사제 → 장기지속형 주사제) 그대로 쓴다 */
  function sayFirstOk(P, xc, slug) {
    var nf = P.docs.filter(function (d) { return d.section !== '15' && (d.tc.indexOf(xc) === 0 || atStart(d.tc, d.ts, xc)); });
    return !nf.length || nf.some(function (d) { return d.slug === slug; });
  }
  /* 검수 뒤 고침:
     - 일상 말 첫 글(965)은 제목 띠의 대체로만 쓴다. 질문 글이 아닌 글의 제목에 X 를 담은 글이 따로 있으면 쓰지 않는다(sayFirstOk)
       ("재발 신호가 뭐예요" 는 재발 예방 계획 쓰기가 아니라 "재발과 재발 신호" 가 1위. 그냥 "재발 신호" 와 같게).
       "X란" 꼴은 제목에 X 를 담은 글이 있으면 정의 질문으로 본다(findQ)
     - "X증"(무쾌감증·무의욕증)은 과녁이 없으면 '증' 을 뗀 X 로
     - "조현병 + 낱말"(조현병 증상·조현병 치료·조현병 원인)은 그 말을 설명하는 제목 글이 없으면 뒤 낱말(원인 → 원인 총론)의 과녁을
       조금 낮은 띠로, 그다음 조현병 총론(조현병이란 무엇인가, 930)을 과녁으로 둔다. 다른 질문의 FAQ(초기 증상은 뭔가요)가
       제목 띠로 1위가 되지 않게 */
  function defTargets(P, def, syn) {
    var out = {}, hit = false;
    function put(slug, b) { if (P.bySlug[slug] && !(out[slug] >= b)) { out[slug] = b; hit = true; } }
    function look(xc, drop) {
      P.docs.forEach(function (d) {
        if (d.tc === xc) put(d.slug, 1000 - drop);
        else if (d.fdef && sameDef(d.fdef, xc)) put(d.slug, 995 - drop);
        else if (d.head === xc) put(d.slug, 985 - drop);
      });
      /* 용어(영문·약어로 물어도 그 용어로): 제목이 그 용어 그대로 1000 · 그 용어를 설명하는 제목 985 · 용어의 첫 관련 글 975 */
      var g = P.gterm[xc];
      if (g) {
        if (g.tc !== xc) P.docs.forEach(function (d) { if (d.tc === g.tc) put(d.slug, 1000 - drop); else if (d.head === g.tc) put(d.slug, 985 - drop); });
        put(g.rel, 975 - drop);
      }
      if (!hit && P.sayFirst[xc] && sayFirstOk(P, xc, P.sayFirst[xc])) put(P.sayFirst[xc], 965 - drop);
    }
    [def.xc, def.altc].forEach(function (xc) { if (xc && !hit) look(xc, 0); });
    var xc = def.xc || '';
    if (!hit && xc.length >= 3 && xc.slice(-1) === '증' && !titleHas(P, xc)) look(xc.slice(0, -1), 0);
    if (!hit && xc.length > 4 && xc.indexOf('조현병') === 0 && !titleHas(P, xc)) {
      var rest = xc.slice(3);
      look(rest, 20);
      if (!hit && rest.length >= 3 && rest.slice(-1) === '증') look(rest.slice(0, -1), 20);
      /* 뒤 낱말의 과녁도 없으면 일상 말이 X 전체를 먼저 이어 준 글(세 글자 이상 say: "조현병 전조 증상" → 초기 증상 FAQ) */
      if (!hit && syn && syn.first && syn.firstScore >= 35) put(syn.first, 945);
      P.docs.forEach(function (d) { if (d.head === '조현병') put(d.slug, 930); });
    }
    return out;
  }

  /* ---------------- 짧은 답 카드용 내용 낱말(M8) ---------------- */
  /* 제목과 질의가 "같은 것을 묻는지" 견줄 때 쓰는 내용 낱말의 뿌리. 조사와 끝맺는 어미만 떼고(약을→약, 유전되나요→유전,
     쪘어요→쪘), 뜻이 갈리는 연결 어미(먹어야·먹어도·끊으면)는 그대로 둔다. 조사는 받침에 맞을 때만 */
  var ROOT_TAILS = ['이에요', '이예요', '었어요', '았어요', '했어요', '됐어요', '되나요', '하나요', '인가요', '한가요', '할까요', '일까요', '인지', '되나', '하나',
    '에서', '에게', '한테', '으로', '이랑', '까지', '부터', '보다', '예요', '에요', '어요', '아요', '해요', '나요', '까요', '가요',
    '은', '는', '이', '가', '을', '를', '에', '의', '로', '와', '과', '랑', '나', '요', '도'];
  var NEED_JONG = { '은': true, '이': true, '을': true, '과': true, '으로': true, '이랑': true, '는': false, '가': false, '를': false, '와': false, '랑': false };
  var NOT_CONTENT = { '있는': 1, '없는': 1, '하는': 1, '되는': 1, '같아요': 1, '같은': 1, '때문에': 1, '대해': 1, '대한': 1, '많이': 1, '아닌지': 1,
    '내': 1, '제': 1, '저': 1, '나': 1, '우리': 1, '뭘': 1, '무슨': 1, '어떤': 1, '무엇을': 1, '얼마나': 1 };
  function rootOf(w) {
    if (!isHangulWord(w)) return w;
    for (var i = 0; i < ROOT_TAILS.length; i++) {
      var t = ROOT_TAILS[i], r = w.slice(0, -t.length);
      if (w.length <= t.length || w.slice(-t.length) !== t) continue;
      var last = r.charAt(r.length - 1);
      if (t in NEED_JONG && jongOf(last) >= 0 && (NEED_JONG[t] ? jongOf(last) === 0 : jongOf(last) > 0)) continue; /* 받침이 맞지 않는 조사 */
      if ((t === '나' || t === '의' || t === '도') && w.length < 3) continue; /* 누나·주의·정도 같은 두 글자 낱말은 그대로 */
      if (t === '도' && verbVowel(last)) continue; /* -어도·-아도 */
      return r;
    }
    return w;
  }
  function rootsOf(s) {
    var out = [];
    words(s).forEach(function (w) {
      if (STOP[w] || NOT_CONTENT[w]) return;
      var r = rootOf(w);
      /* '하/되' 만 다른 꼴은 같은 뿌리로(입원되면 = 입원하면) */
      if (r && HADOE[r.slice(-2)] && r.length >= 4 && (r.slice(-2) === '되면' || r.slice(-2) === '돼도')) r = hadoe(r);
      if (r && out.indexOf(r) < 0) out.push(r);
    });
    return out;
  }
  /* 제목의 내용 낱말 뿌리: 전체와 물음표로 나뉜 절마다("강제로 입원시킬 수 있나요? 입원되면 어떻게 되나요?" → 두 절) */
  function titleRoots(d) {
    if (!d.roots) {
      d.roots = rootsOf(d.a.title);
      var cl = String(d.a.title).split(/[?？]/).map(rootsOf).filter(function (r) { return r.length; });
      d.croots = cl.length > 1 ? cl : [];
    }
    return d.roots;
  }
  /* 질의 뿌리 qr 이 제목 뿌리 tr 의 절반 이상(내용 낱말이 넷 이상인 긴 제목은 절반을 넘게)을 담나 */
  function halfHit(tr, qr) {
    var hit = tr.filter(function (t) { return qr.indexOf(t) >= 0; }).length;
    return tr.length && (tr.length >= 4 ? hit * 2 > tr.length : hit * 2 >= tr.length);
  }
  /* 순위 띠 755 용(sameAsk 보다 엄격): 질의의 내용 낱말이 모두 제목의 내용 낱말이고 둘 이상 겹침("나도 조현병인가요" 는 '나도' 가 제목에 없어 아님) */
  function askBand(d, qr, qw) {
    var tr = titleRoots(d);
    return qr.length >= 2 && qr.every(function (t) { return tr.indexOf(t) >= 0; }) && sameAsk(d, qr, qw);
  }
  /* 제목(또는 제목의 한 절)과 같은 것을 묻나: 내용 낱말 절반 이상 + 왜·어떻게 같은 묻는 말이 제목에도 있음 */
  function sameAsk(d, qr, qw) {
    var tr = titleRoots(d);
    if (!qr.length || !(halfHit(tr, qr) || d.croots.some(function (c) { return halfHit(c, qr); }))) return false;
    var tw = whOf(d.a.title);
    return (qw || []).every(function (w) { return tw.indexOf(w) >= 0; });
  }

  function analyze(raw, noDef) {
    raw = clip(raw);
    var def = noDef ? null : defOf(raw);
    var Q = analyzeText(def ? def.x : raw);
    var content = words(raw).filter(function (w) { return !STOP[w]; }).length;
    /* 정의 질문은 X 만으로 찾고(뭐예요·무슨 병 같은 말은 찾는 말이 아님), 원문은 raw 로 둔다 */
    Q.raw = raw; Q.def = def; Q.rc = compact(raw).c; Q.sq = def ? def.x : raw; Q.content = content;
    Q.question = isQuestion(raw) || !!def;
    return Q;
  }
  function analyzeText(raw) {
    var k = compact(raw), all = k.words;
    var keepIdx = [], at = 0, spans = [];
    all.forEach(function (w, i) { spans.push([at, at + w.length]); at += w.length; if (!STOP[w]) keepIdx.push(i); });
    if (!keepIdx.length) keepIdx = all.map(function (w, i) { return i; });
    var keep = keepIdx.map(function (i) { return all[i]; });
    /* span: 붙인 꼴(c) 안의 자리. 일상 말이 질의의 어느 낱말을 덮었는지 볼 때 쓴다 */
    var list = keepIdx.map(function (i) { var w = all[i]; return { w: w, vars: stems(w), one: w.length === 1, span: spans[i] }; });
    /* 조사·어미를 뗀 구절들("처음 진단받았어요" → "처음 진단받았", "약을 빠뜨렸어요" → "약을 빠뜨렸"). 제목 포함 검사에 쓴다.
       기능어를 뺀 구절도 함께("환청이 뭐예요" → "환청이"·"환청": 제목 "환청"과 맞게) */
    var hd = isQuestion(raw);
    var phrases = phrasesOf(all, hd);
    var kphr = keep.length < all.length ? phrasesOf(keep, hd) : [];
    kphr.forEach(function (p) { if (phrases.indexOf(p) < 0) phrases.push(p); });
    /* 제목 띠에 견줄 붙인 꼴: 전체(c), 기능어를 뺀 것(c2), 기능어를 빼고 조사·어미를 뗀 것(cx, 제목과 똑같을 때만 씀) */
    var c2 = keep.join('');
    var cx = [];
    (keep.length < all.length ? kphr : []).forEach(function (p) { var x = p.replace(/\s+/g, ''); if (x !== c2 && cx.indexOf(x) < 0) cx.push(x); });
    var low2 = keep.join(' ');
    return { raw: raw, low: lower(raw).replace(/\s+/g, ' '), c: k.c, c2: c2 !== k.c ? c2 : '', cx: cx, low2: low2 !== lower(raw).replace(/\s+/g, ' ') ? low2 : '', starts: k.starts, all: all, words: all.length ? list : [], phrases: phrases, question: isQuestion(raw) };
  }

  /* ---------------- 빠른 찾기 준비 ---------------- */
  function atStart(c, starts, needle) {
    var p = c.indexOf(needle);
    while (p >= 0) { if (starts[p]) return true; p = c.indexOf(needle, p + 1); }
    return false;
  }
  function prepare(src) {
    src = src || {};
    var syn = src.syn || (root.JHB && root.JHB.syn) || null;
    var secWords = {};
    (src.sections || []).forEach(function (s) {
      var ws = [];
      words(s.title).forEach(function (w) { stems(w).forEach(function (x) { if (ws.indexOf(x) < 0) ws.push(x); }); });
      secWords[String(s.id)] = ws;
    });
    var P = {
      syn: syn, matcher: (syn && src.synonyms) ? syn.build(src.synonyms) : null,
      docs: [], bySlug: {}, terms: [], courses: [], df: {}, vocab: null, hay: ''
    };
    var hay = [];
    P.gterm = {}; P.sayFirst = {};
    (src.articles || []).forEach(function (a, i) {
      var k = compact(a.title), tags = (a.tags || []).map(lower), section = String(a.section == null ? '' : a.section);
      var fd = section === '15' ? defOf(a.title) : null;
      var d = {
        a: a, slug: a.slug, i: i, section: section,
        t: lower(a.title).replace(/\s+/g, ' '), tc: k.c, ts: k.starts, tw: k.words,
        tags: tags, tagc: tags.map(function (x) { return compact(x).c; }), sum: lower(a.summary),
        sec: secWords[String(a.section)] || [], ini: null,
        head: headOf(a.title), fdef: fd ? fd.xc : null, roots: null
      };
      P.bySlug[a.slug] = { a: a, d: d };
      P.docs.push(d);
      hay.push(lower(a.title), tags.join(' '), lower(a.summary));
    });
    (src.glossary || []).forEach(function (g) {
      var k = compact(g.term);
      P.terms.push({ g: g, t: lower(g.term), tc: k.c, ts: k.starts, en: lower(g.en || ''), enw: words(g.en || ''), ini: null });
      hay.push(lower(g.term), lower(g.en || ''));
      /* 정의 질문의 과녁: 용어(한글·영문·괄호 속 약어) → 그 용어의 첫 관련 글 */
      var rel = (g.related || [])[0];
      if (!rel) return;
      var en = String(g.en || ''), paren = /\(([^)]*)\)/.exec(en), keys = [k.c, compact(en.replace(/\([^)]*\)/g, '')).c];
      if (paren) keys.push(compact(paren[1]).c);
      keys.forEach(function (x) { if (x && x.length >= 2 && !(x in P.gterm)) P.gterm[x] = { rel: rel, tc: k.c }; });
    });
    (src.synonyms || []).forEach(function (e) {
      (e.say || []).forEach(function (s) { var x = compact(s).c; if (x.length >= 2 && !(x in P.sayFirst) && e.slugs && e.slugs[0]) P.sayFirst[x] = e.slugs[0]; });
    });
    (src.courses || []).forEach(function (c) {
      var k = compact(c.title);
      P.courses.push({ c: c, t: lower(c.title).replace(/\s+/g, ' '), tc: k.c, ts: k.starts, ini: null });
      hay.push(lower(c.title));
    });
    (src.synonyms || []).forEach(function (e) { (e.say || []).forEach(function (s) { hay.push(lower(s)); }); });
    P.hay = '\n' + hay.join('\n') + '\n';
    P.says = src.synonyms || [];
    return P;
  }

  /* 낱말(변형)이 글의 어느 칸에 있나: 4 제목, 3 태그와 같음, 2 태그·분류 이름에 들어 있음, 1 요약, 0 없음 */
  function fieldOf(d, v, one) {
    if (hasIn(d.t, v)) return 4;
    for (var i = 0; i < d.tags.length; i++) if (d.tags[i] === v || d.tagc[i] === v) return 3;
    if (d.sec.indexOf(v) >= 0) return 3;
    if (one) return 0; /* 한 글자 낱말은 제목·태그 전체·분류 이름만(요약·태그 일부에서는 너무 흔해서) */
    for (var j = 0; j < d.tags.length; j++) if (hasIn(d.tags[j], v)) return 2;
    if (hasIn(d.sum, v)) return 1;
    return 0;
  }
  /* 질의 전체가 제목(띄어 쓴 그대로) 안에: 한글은 낱말 속도 되고("망상" ⊂ "피해망상"), 영문만인 질의는 낱말 시작에서만 */
  function phraseIn(t, low, latinOnly) { return low.length >= 2 && (latinOnly ? hasIn(t, low) : t.indexOf(low) >= 0); }
  var FW = [0, 1, 2, 2.5, 3];
  function bestField(d, x) {
    var best = 0, w = 0;
    for (var i = 0; i < x.vars.length; i++) {
      var f = fieldOf(d, x.vars[i], x.vars[i].length === 1);
      var wt = FW[f] * (i === 0 ? 1 : 0.9);
      if (wt > w) { w = wt; best = f; }
    }
    return { k: best, w: w };
  }
  function idf(P, x) {
    var key = x.vars.join('|');
    if (P.df[key] == null) {
      var n = 0;
      P.docs.forEach(function (d) { if (bestField(d, x).k) n++; });
      P.df[key] = n;
    }
    var N = P.docs.length || 1;
    return Math.log(1 + N / (1 + P.df[key])) * (x.one ? 0.4 : 1);
  }

  /* 일상 말: 강한 일치(expand)와 느슨한 일치(loose: 낱말 순서·조사가 달라도) */
  function synScores(P, raw) {
    var strong = {}, loose = {}, first = null;
    if (P.syn && P.matcher) {
      /* 강한 일치는 사전이 정한 순서(점수순)의 자리(0~7)로 */
      try { P.syn.expand(P.matcher, raw).slugs.forEach(function (x, i) { strong[x.slug] = i + 1; if (!i) first = x; }); } catch (e) { }
      if (P.syn.loose) { try { P.syn.loose(P.matcher, raw).slugs.forEach(function (x) { loose[x.slug] = x.score; }); } catch (e) { } }
    }
    /* first: 사전이 먼저 고른 글과 그 점수(세 글자 이상 say 하나면 35 이상, 두 글자 say 하나뿐이면 25 안팎) */
    return { strong: strong, loose: loose, first: first ? first.slug : null, firstScore: first ? first.score : 0 };
  }

  /* 글 점수. 띠(band): 1000 제목 완전 · 900 제목 접두 · 800 제목의 낱말 시작에 질의 전체 · 760 제목 안에 질의 전체 ·
     400~499 일상 말(사전이 정한 순서가 먼저) · 380~ 모든 낱말이 제목에(떨어져 있음) · 300~ 모든 낱말이 제목·태그·분류에 ·
     250~ 일상 말(느슨) · 200~ 모든 낱말이 어딘가에(요약 포함) · ~150 일부 낱말만.
     질문 꼴 질의는 같은 띠 안에서 자주 묻는 질문(15분류) 글을 조금 앞으로(띠를 넘지 않음). 같은 점수면 분류·순서대로.
     정의 질문(M8, "X가 뭐예요")은 X 를 설명하는 글이 맨 앞(defTargets 의 띠 965~1000)이고, 자주 묻는 질문 글을 앞으로 당기는 덤은
     그 글의 제목이 정말 그 정의 질문일 때만 준다("조현병이 있는 사람은 위험한가요?" 가 "조현병이 뭐예요" 의 1위가 되지 않게) */
  function scoreDocs(P, Q, opts) {
    opts = opts || {};
    var sec = opts.section ? String(opts.section) : '';
    var syn = synScores(P, Q.sq || Q.raw);
    Q.syn1 = syn.first; Q.syn1s = syn.firstScore;
    var defT = Q.def ? defTargets(P, Q.def, syn) : null;
    var ws = Q.words, multi = ws.length > 1;
    var latinOnly = !!Q.c && isLatin(Q.c);
    var weights = ws.map(function (x) { return idf(P, x); });
    var wTotal = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    /* 질의 안에 낱말 시작부터 그대로 들어 있는 일상 말(say)의 자리. slug → [[시작, 끝]…] */
    var saySpans = {};
    /* 짧은 답 카드(M8 검수 뒤): 묶음의 첫 글로 이어 준 말이 모두 nocard(그 글의 답이 이 질문의 답이 아님: 가족에게 하는 답에 이어진
       "병원 안 가", 진단을 묻는 "내가 조현병", 절망을 담은 "인생 끝")이면 일상 말만으로는 카드를 띄우지 않는다 */
    var sayYes = {}, sayNo = {};
    if (Q.c) {
      (P.says || []).forEach(function (e) {
        (e.say || []).forEach(function (s) {
          var cs = compact(s).c;
          if (cs.length < 2) return;
          var p = Q.c.indexOf(cs);
          while (p >= 0 && !Q.starts[p]) p = Q.c.indexOf(cs, p + 1);
          if (p < 0) return;
          (e.slugs || []).forEach(function (sl) { (saySpans[sl] = saySpans[sl] || []).push([p, p + cs.length]); });
          var f = (e.slugs || [])[0];
          if (f) { if (e.nocard === true || (e.nocard && e.nocard.indexOf(s) >= 0)) sayNo[f] = 1; else sayYes[f] = 1; }
        });
      });
    }
    Q.synBlock = !!(syn.first && sayNo[syn.first] && !sayYes[syn.first]);
    /* 같은 질문(FAQ 제목과 내용 낱말 절반 이상·묻는 말이 같음)을 견줄 질의 뿌리 */
    var qroots = Q.def ? null : rootsOf(Q.raw), qwh = Q.def ? null : whOf(Q.raw);
    function sayCovers(slug, x) {
      var ss = saySpans[slug];
      if (!ss || !x.span) return false;
      for (var i = 0; i < ss.length; i++) if (ss[i][0] < x.span[1] && x.span[0] < ss[i][1]) return true;
      return false;
    }
    var out = [];
    P.docs.forEach(function (d) {
      if (sec && d.section !== sec) return;
      var band = 0, why = '';
      if (Q.c) {
        /* 기능어를 뺀 꼴(c2·cx·low2)도 견준다: "환청이 뭐예요" → 제목 "환청" 완전 일치 */
        if (d.tc === Q.c || d.tc === Q.rc || (Q.c2 && d.tc === Q.c2) || Q.cx.indexOf(d.tc) >= 0) band = 1000;
        else if (defT && defT[d.slug]) band = defT[d.slug];
        else if (d.tc.indexOf(Q.c) === 0 || (Q.c2 && d.tc.indexOf(Q.c2) === 0)) band = 900;
        else if ((Q.c.length >= 2 && atStart(d.tc, d.ts, Q.c)) || (Q.c2.length >= 2 && atStart(d.tc, d.ts, Q.c2))) band = 800;
        else if (phraseIn(d.t, Q.low, latinOnly) || (Q.low2 && phraseIn(d.t, Q.low2, latinOnly))) band = 760;
        else if (!latinOnly && Q.phrases.some(function (p) { return p.length >= 2 && d.t.indexOf(p) >= 0; })) band = 750;
        if (band) why = 'title';
      }
      var all = true, any = false, inTitle = true, inTT = true, wsum = 0, got = 0, long = false, cov = 0;
      ws.forEach(function (x, i) {
        var f = bestField(d, x);
        if (f.k || sayCovers(d.slug, x)) cov += weights[i];
        if (!f.k) { all = false; inTitle = false; inTT = false; return; }
        any = true; got += weights[i];
        if (!x.one) long = true;
        if (f.k < 4) inTitle = false;
        if (f.k < 2) inTT = false;
        wsum += weights[i] * f.w;
      });
      /* FAQ 제목을 말만 바꾼 질문(검수 뒤): 질의의 모든 낱말이 제목에 있고 제목과 같은 것을 묻으면(sameAsk) 제목 구절 띠(750·760)
         바로 위 755 로. 일상 말 띠(400~)가 다른 글을 앞세우지 않게("정신과 기록이 취업에 남나요" → 정신과 진료 기록이 취업에 남나요?) */
      if (qroots && Q.question && multi && d.section === '15' && band < 755 && all && inTitle && askBand(d, qroots, qwh)) { band = 755; why = 'title'; }
      var extra = Math.min(60, wsum * 4);
      var qa = Q.question && d.section === '15' && (!Q.def || band >= 990) ? 8 : 0;
      var s = 0;
      if (band) s = band + extra / 10 + qa;
      /* 일상 말: 사전 순서 한 자리에 6점, 모든 낱말이 글의 칸에도 있으면 최대 +5(사전 순서를 한 자리 넘게 뒤집지 않음) */
      if (!s && syn.strong[d.slug]) { s = 400 + 60 - 6 * (syn.strong[d.slug] - 1) + 5 * (got / wTotal) + qa; why = 'syn'; }
      /* 모든 낱말이 제목에(떨어져 있음): 낱말이 고친 꼴이 아니라 그대로 제목에 있으면 +2("약을 먹어야" → "약을 평생 먹어야 하나요?" 가
         "약을 먹어도 목소리가 …" 보다 앞. 400 아래라 일상 말 띠는 넘지 않음) */
      if (!s && multi && all && inTitle) { s = 380 + Math.min(13, extra / 4) + (ws.every(function (x) { return hasIn(d.t, x.w); }) ? 2 : 0) + qa; why = 'title'; }
      if (!s && all && inTT) { s = 300 + extra + qa; why = 'tag'; }
      if (!s && syn.loose[d.slug]) { s = 250 + Math.min(40, syn.loose[d.slug]) + qa; why = 'syn'; }
      if (!s && all && any) { s = 200 + Math.min(40, extra) + qa; why = 'summary'; }
      /* 일부 일치: 한 글자 낱말만 맞은 글은 내지 않는다("임신 약" 의 "약"만 맞은 글) */
      if (!s && any && (long || !ws.some(function (x) { return !x.one; }))) { s = Math.round(150 * got / wTotal) + extra / 10; why = 'partial'; }
      if (!s) return;
      /* cover: 질의 낱말(무게) 가운데 이 글의 칸(제목·태그·분류·요약)에 있거나 이 글로 이어지는 일상 말이 덮은 몫 0~1.
         짧은 답 카드를 띄울지 가를 때 쓴다(질의의 일부 낱말에만 맞는 FAQ 의 답을 '답'처럼 보이지 않게) */
      /* tt: 질의의 모든 낱말이 이 글의 제목·태그(·분류 이름)에 있음(요약·일상 말만으로 맞은 것은 아님). 짧은 답 카드의 "같은 질문" 판정에 쓴다 */
      out.push({ slug: d.slug, a: d.a, score: s, why: why, all: all || band > 0, cover: band > 0 ? 1 : Math.round(100 * cov / wTotal) / 100, tt: all && inTT });
    });
    out.sort(function (x, y) {
      return y.score - x.score || Number(x.a.section) - Number(y.a.section) || (x.a.order || 0) - (y.a.order || 0) || (x.slug < y.slug ? -1 : 1);
    });
    return out;
  }

  function scoreTerms(P, Q) {
    var out = [];
    var en = Q.all.filter(isLatin);
    P.terms.forEach(function (t) {
      var s = 0;
      if (Q.c) {
        if (t.tc === Q.c || (Q.c2 && t.tc === Q.c2) || Q.cx.indexOf(t.tc) >= 0) s = 100;
        else if (t.tc.indexOf(Q.c) === 0) s = 80;
        else if (Q.c.length >= 2 && atStart(t.tc, t.ts, Q.c)) s = 60;
        else if (phraseIn(t.t, Q.low, isLatin(Q.c))) s = 50;
      }
      /* 영문: 질의의 영문 낱말이 용어 영문 낱말의 앞부분과 같을 때만(EPS ≠ first-episode, KEPS) */
      if (!s && en.length && t.enw.length) {
        var hit = en.every(function (w) { return t.enw.some(function (x) { return x === w || (w.length >= 3 && x.indexOf(w) === 0); }); });
        if (hit) s = en.some(function (w) { return t.enw.indexOf(w) >= 0; }) ? 90 : 70;
      }
      if (s) out.push({ g: t.g, score: s });
    });
    out.sort(function (x, y) { return y.score - x.score || x.g.term.length - y.g.term.length; });
    return out;
  }
  function scoreCourses(P, Q) {
    var out = [];
    P.courses.forEach(function (c) {
      var s = 0;
      if (Q.c) {
        if (c.tc === Q.c) s = 100;
        else if (c.tc.indexOf(Q.c) === 0) s = 80;
        else if (Q.c.length >= 2 && atStart(c.tc, c.ts, Q.c)) s = 60;
        else if (phraseIn(c.t, Q.low, isLatin(Q.c))) s = 50;
        else if (Q.words.length > 1 && Q.words.every(function (x) { return x.vars.some(function (v) { return v.length > 1 && c.t.indexOf(v) >= 0; }); })) s = 40;
      }
      if (s) out.push({ c: c.c, score: s });
    });
    out.sort(function (x, y) { return y.score - x.score; });
    return out;
  }

  /* ---------------- 오타·초성 ---------------- */
  function vocabOf(P) {
    if (P.vocab) return P.vocab;
    var seen = {}, list = [];
    function add(w, kind) {
      w = lower(w).replace(/\s+/g, '');
      if (w.length < 2 || !(isHangulWord(w) || /^[a-z]{3,}$/.test(w))) return;
      if (seen[w]) { seen[w].n++; return; }
      var v = { w: w, j: jamo(w), n: 1, kind: kind, syl: w.length };
      seen[w] = v; list.push(v);
    }
    P.docs.forEach(function (d) { d.tw.forEach(function (w) { add(w, 'title'); }); add(d.tc, 'title'); d.tags.forEach(function (t) { add(t, 'tag'); words(t).forEach(function (w) { add(w, 'tag'); }); }); });
    P.terms.forEach(function (t) { add(t.tc, 'term'); words(t.g.term).forEach(function (w) { add(w, 'term'); }); t.enw.forEach(function (w) { add(w, 'term'); }); });
    P.courses.forEach(function (c) { words(c.c.title).forEach(function (w) { add(w, 'course'); }); });
    P.says.forEach(function (e) { (e.say || []).forEach(function (s) { add(s, 'say'); words(s).forEach(function (w) { add(w, 'say'); }); }); });
    P.vocab = list;
    return list;
  }
  function known(P, v) { return P.hay.indexOf(v) >= 0; }
  /* 오타 사전을 미리 만들어 둔다(첫 오타 고치기에서 느린 기기가 멈칫하지 않게, 쉬는 시간에 부름) */
  /* step: 'vocab'(오타 사전) | 'run'(처음 한 번 도는 비용: 정규식 준비 등. 결과는 버리고 아무것도 저장하지 않음) | 없으면 둘 다.
     느린 기기에서 한 번에 길게 막지 않게 부르는 쪽이 쉬는 시간마다 나눠 부른다 */
  function warm(P, detect, step) {
    if (!P) return P;
    if (!step || step === 'vocab') vocabOf(P);
    if (!step || step === 'run') { try { find(P, '환청 약'); if (typeof detect === 'function') detect('환청'); } catch (e) { } }
    return P;
  }
  /* 낱말 하나 고치기: 자모 편집 거리 짧은 말(세 글자 이하) 1, 긴 말 2 이내에서 가장 가까운 낱말 */
  function fixWord(P, w) {
    var max = w.length <= 3 ? 1 : 2;
    var jw = jamo(w), best = null;
    vocabOf(P).forEach(function (v) {
      if (Math.abs(v.syl - w.length) > 1 && !isLatin(w)) return;
      if (isLatin(w) !== isLatin(v.w)) return;
      var dd = lev(jw, v.j, max);
      if (dd > max || dd === 0) return;
      if (!best || dd < best.d || (dd === best.d && (v.n > best.v.n || (v.n === best.v.n && v.w < best.v.w)))) best = { v: v, d: dd };
    });
    return best ? best.v.w : null;
  }
  /* 질의 고치기: 모르는 낱말(어디에도 없는 말)을 가장 가까운 낱말로. 고친 것이 없으면 null */
  var FIX_MAX_C = 30, FIX_MAX_W = 4;
  function correct(P, Q) {
    var changed = [], tried = 0;
    /* 긴 질의(붙여 넣은 글)에서는 고치지 않는다(낱말마다 사전 전체와 편집 거리를 재면 느린 기기가 멈춤). 모르는 낱말은 앞 4개까지만 */
    if (Q.c.length > FIX_MAX_C) return null;
    Q.all.forEach(function (w) {
      if (STOP[w] || w.length < 2 || tried >= FIX_MAX_W) return;
      if (stems(w).some(function (v) { return v.length >= 2 && known(P, v); })) return;
      tried++;
      /* 조사·어미를 뗀 꼴부터 고쳐 본다(환쳥이 → 환청이) */
      var vs = stems(w).filter(function (v) { return v.length >= 2; }).sort(function (a, b) { return b.length - a.length; });
      for (var k = 0; k < vs.length; k++) {
        var f = fixWord(P, vs[k]);
        if (f) { changed.push([w, f + w.slice(vs[k].length)]); return; }
      }
    });
    if (!changed.length) return null;
    /* 원문의 띄어쓰기·문장 부호는 그대로 두고 고친 낱말만 바꾼다 */
    var text = Q.raw, low = lower(text), at = 0;
    changed.forEach(function (c) {
      var p = low.indexOf(c[0], at);
      if (p < 0) return;
      text = text.slice(0, p) + c[1] + text.slice(p + c[0].length);
      low = lower(text);
      at = p + c[1].length;
    });
    return { text: text, changed: changed };
  }
  function iniOf(o, s) { if (o.ini == null) o.ini = initials(s); return o.ini; }
  /* 초성 질의: 제목·용어·코스·일상 말의 초성과 견준다 */
  function byInitials(P, raw, opts) {
    var q = raw.replace(/\s+/g, ''), sec = opts && opts.section ? String(opts.section) : '';
    var docs = [], terms = [], courses = [], cands = [];
    function sc(ini) { return ini === q ? 3 : ini.indexOf(q) === 0 ? 2 : 0; }
    P.docs.forEach(function (d) {
      if (sec && d.section !== sec) return;
      var s = sc(iniOf(d, d.a.title));
      if (!s) { /* 제목 낱말 하나의 초성과 같음 */ if (d.tw.some(function (w) { return initials(w) === q; })) s = 1; }
      if (s) docs.push({ slug: d.slug, a: d.a, score: 900 + s * 30 - d.a.title.length / 100, why: 'initials', all: true });
      if (s === 3) cands.push({ w: d.a.title, r: 2 });
    });
    P.terms.forEach(function (t) {
      var s = sc(iniOf(t, t.g.term));
      if (s) { terms.push({ g: t.g, score: s * 30 }); if (s === 3) cands.push({ w: t.g.term, r: 3 }); }
    });
    P.courses.forEach(function (c) { var s = sc(iniOf(c, c.c.title)); if (s) courses.push({ c: c.c, score: s * 30 }); });
    P.says.forEach(function (e) { (e.say || []).forEach(function (s) { if (initials(s) === q) cands.push({ w: s, r: 1, slugs: e.slugs }); }); });
    docs.sort(function (x, y) { return y.score - x.score; });
    terms.sort(function (x, y) { return y.score - x.score || x.g.term.length - y.g.term.length; });
    cands.sort(function (x, y) { return y.r - x.r || x.w.length - y.w.length; });
    /* 일상 말 초성 일치는 그 말의 글로 */
    if (!docs.length) {
      var seen = {};
      cands.forEach(function (c) {
        (c.slugs || []).forEach(function (s, i) {
          var d = P.docs.filter(function (x) { return x.slug === s; })[0];
          if (d && !seen[s] && (!sec || d.section === sec)) { seen[s] = 1; docs.push({ slug: s, a: d.a, score: 500 - i, why: 'initials', all: true }); }
        });
      });
    }
    var uniq = [], seenW = {};
    cands.forEach(function (c) { var k = c.w.replace(/\s+/g, ''); if (!seenW[k]) { seenW[k] = 1; uniq.push(c.w); } });
    /* "찾으셨나요" 로 내세울 말은 용어·제목과 초성이 똑같을 때만(일상 말 후보만 있으면 "ㅈㅅ" 처럼 뜻이 여럿이라 내세우지 않음) */
    return { docs: docs, terms: terms, courses: courses, candidates: uniq, best: cands.length && cands[0].r >= 2 ? cands[0].w : null };
  }

  /* ---------------- 빠른 찾기 ---------------- */
  /* 질의 분석 + "X란" 꼴만으로 정의 질문이 된 경우의 확인: X(조사를 뗀 꼴)를 설명하는 글이 없으면 정의 질문이 아니다("코크란" ≠ 코크+란) */
  function findQ(P, q) {
    var Q = analyze(q);
    if (Q.def && Q.def.ran && !Object.keys(defTargets(P, { xc: Q.def.xc, altc: '' })).length && !titleHas(P, Q.def.xc)) Q = analyze(q, true);
    return Q;
  }
  /* find(P, q, {section}) → { query, question, initials, docs:[{slug,a,score,why,all,cover,tt}], terms:[{g}], courses:[{c}], suggest, weak,
       def, content, roots, wh, syn1, syn1s }
     suggest = { text, changed, kind: 'typo'|'initials', docs, terms, candidates } — "○○을(를) 찾으셨나요?"
     def: 정의 질문이면 { x, xc }(M8) · content: 기능어가 아닌 낱말 수 · roots: 짧은 답 카드를 견줄 내용 낱말 · wh: 왜·어떻게 같은 묻는 말 ·
     syn1·syn1s: 일상 말 사전이 먼저 고른 글과 그 점수 */
  function find(P, q, opts) {
    opts = opts || {};
    var Q = findQ(P, q);
    var out = { query: Q.raw, question: Q.question, initials: false, docs: [], terms: [], courses: [], suggest: null, weak: true, words: Q.words.map(function (x) { return x.w; }),
      def: Q.def ? { x: Q.def.x, xc: Q.def.xc } : null, content: Q.content, roots: rootsOf(Q.def ? Q.def.x : Q.raw), wh: whOf(Q.raw), syn1: null };
    if (!Q.raw || !Q.words.length) return out; /* 문장 부호·기호만('?', '...', '(')이면 찾을 낱말이 없음: 빈 결과 */
    if (isInitials(Q.raw)) {
      var r = byInitials(P, Q.raw, opts);
      out.initials = true;
      out.docs = r.docs; out.terms = r.terms; out.courses = r.courses;
      /* 후보(위기 감지에도 씀)는 늘 싣고, 보여 줄 말(text)은 용어·제목과 똑같을 때만 */
      if (r.candidates.length) out.suggest = { kind: 'initials', text: r.best, candidates: r.candidates.slice(0, 5), docs: [], terms: [] };
      out.weak = !r.docs.length;
      return out;
    }
    out.docs = scoreDocs(P, Q, opts);
    out.syn1 = Q.syn1 || null; out.syn1s = Q.syn1s || 0; out.synBlock = !!Q.synBlock;
    out.terms = scoreTerms(P, Q);
    out.courses = scoreCourses(P, Q);
    /* 약함: 글이 없거나, 맨 위 글도 일부 낱말만 맞음(모든 낱말·일상 말·제목 일치가 하나도 없음) */
    out.weak = !(out.docs.length && out.docs[0].score >= 200);
    if (out.weak) {
      var fx = correct(P, Q);
      if (fx) {
        var F = findQ(P, fx.text), fd = scoreDocs(P, F, opts);
        out.suggest = { kind: 'typo', text: fx.text, changed: fx.changed, docs: fd, terms: scoreTerms(P, F) };
        /* 고친 말로 찾은 결과를 먼저 보일 때 짧은 답 카드는 고친 질의의 낱말로 본다(cardOk 가 읽는 칸 그대로) */
        out.suggest.ask = { question: F.question, content: F.content, def: F.def ? { x: F.def.x, xc: F.def.xc } : null, roots: rootsOf(F.def ? F.def.x : F.raw),
          wh: whOf(F.raw), syn1: F.syn1 || null, syn1s: F.syn1s || 0, synBlock: !!F.synBlock };
      }
    }
    return out;
  }

  /* ---------------- 본문 색인 검색 ---------------- */
  function build(docs) {
    return (docs || []).map(function (d) {
      return {
        id: d.id, section: String(d.section == null ? '' : d.section), title: d.title || '', summary: d.summary || '', body: d.body || '',
        _title: lower(d.title).replace(/\s+/g, ' '), _tags: lower((d.tags || []).join(' ')), _summary: lower(d.summary), _body: lower(d.body)
      };
    });
  }
  function count(hay, needle, cap) {
    if (!needle) return 0;
    var n = 0, p = 0, lat = isLatin(needle);
    while ((p = hay.indexOf(needle, p)) >= 0) {
      if (!lat || p === 0 || !/[a-z0-9]/.test(hay.charAt(p - 1))) { n++; if (n >= cap) break; }
      p += needle.length;
    }
    return n;
  }
  /* 조각: 원문에서 자리를 찾고, 겹친 자리를 합친 뒤 조각마다 이스케이프해서 <mark> 를 끼운다 */
  function markHtml(text, terms) {
    text = String(text == null ? '' : text);
    var low = text.toLowerCase();
    if (low.length !== text.length) return esc(text);
    var ranges = [];
    terms.forEach(function (t) {
      if (!t) return;
      var p = 0;
      while ((p = low.indexOf(t, p)) >= 0) { ranges.push([p, p + t.length]); p += t.length; }
    });
    if (!ranges.length) return esc(text);
    ranges.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push([r[0], r[1]]);
    });
    var html = '', at = 0;
    merged.forEach(function (r) { html += esc(text.slice(at, r[0])) + '<mark>' + esc(text.slice(r[0], r[1])) + '</mark>'; at = r[1]; });
    return html + esc(text.slice(at));
  }
  function snippet(doc, terms) {
    var body = doc.body, low = doc._body, pos = -1;
    var order = terms.slice().sort(function (a, b) { return b.length - a.length; });
    for (var k = 0; k < order.length; k++) { pos = low.indexOf(order[k]); if (pos >= 0) break; }
    var text;
    if (pos < 0) text = doc.summary || body.slice(0, 80);
    else {
      var a = Math.max(0, pos - 30), b = Math.min(body.length, pos + 60);
      text = (a > 0 ? '…' : '') + body.slice(a, b) + (b < body.length ? '…' : '');
    }
    var marks = terms.filter(function (t) { return t.length >= 2 || terms.length === 1; });
    return markHtml(text, marks);
  }
  /* query(index, q, {section, limit, strict}) → [{id, score, title, section, snippet, all}]
     모든 낱말이 맞는 글(all) 먼저. strict 면 모든 낱말이 맞는 글만(위기·타해 질의에서 관계가 먼 글 수백 개가 뜨지 않게) */
  function query(index, q, opts) {
    opts = opts || {};
    var Q = analyze(q);
    var terms = Q.words;
    if (!terms.length) return [];
    var res = [];
    var nLong = terms.filter(function (x) { return !x.one; }).length, hasLong = nLong > 0;
    var needLong = Math.ceil(nLong / 2); /* 일부 일치는 두 글자 이상 낱말의 절반 이상이 맞을 때만(낱말 하나씩 OR 로 수백 개가 뜨지 않게) */
    (index || []).forEach(function (d) {
      if (opts.section && d.section !== String(opts.section)) return;
      var score = 0, matched = 0, long = 0;
      terms.forEach(function (x) {
        var best = 0;
        x.vars.forEach(function (t, vi) {
          var s = 0;
          if (hasIn(d._title, t)) s += 10;
          if (hasIn(d._tags, t)) s += 6;
          if (hasIn(d._summary, t)) s += 3;
          s += Math.min(count(d._body, t, 10), 10);
          if (t.length === 1) s *= 0.3;
          if (vi) s *= 0.9;
          if (s > best) best = s;
        });
        if (best) { matched++; if (!x.one) long++; }
        score += best;
      });
      if (!matched) return;
      var all = matched === terms.length;
      if (opts.strict && !all) return;
      if (!all && hasLong && long < needLong) return; /* 한 글자 낱말("약", "병")만 맞은 글이나 낱말 절반도 안 맞은 글은 내지 않는다 */
      if (all && terms.length > 1) score += 100;
      res.push({ id: d.id, score: score, title: d.title, section: d.section, all: all, snippet: snippet(d, terms.map(function (x) { return x.w; })) });
    });
    res.sort(function (a, b) { return b.score - a.score || a.title.localeCompare(b.title, 'ko'); });
    return opts.limit ? res.slice(0, opts.limit) : res;
  }

  /* ---------------- 두 단계 합치기 ---------------- */
  /* merge(quickDocs, bodyRes, {front, strict}) → [{id, snippet}]
     1) front(위기·타해 질의의 crisis-card 글) 2) 빠른 찾기의 튼튼한 결과(모든 낱말·일상 말·제목) — 이미 보인 순서 그대로
     3) 본문에서 모든 낱말이 맞은 글 4) 빠른 찾기의 일부 일치 5) 본문의 일부 일치. strict 면 4)·5) 를 뺀다 */
  function merge(quick, body, opts) {
    opts = opts || {};
    var seen = {}, out = [], snip = {};
    (body || []).forEach(function (b) { snip[b.id] = b.snippet; });
    function push(id) { if (!id || seen[id]) return; seen[id] = 1; out.push({ id: id, snippet: snip[id] || null }); }
    (opts.front || []).forEach(push);
    (quick || []).forEach(function (x) { if (x.score >= 200 || x.all) push(x.slug); });
    (body || []).forEach(function (b) { if (b.all) push(b.id); });
    if (!opts.strict) {
      (quick || []).forEach(function (x) { push(x.slug); });
      (body || []).forEach(function (b) { push(b.id); });
    }
    return out;
  }

  /* ---------------- 위기 ---------------- */
  var RANK = { high: 3, harm: 2, watch: 1 };
  /* detect 를 여러 글(원문·고친 질의·초성 후보)에 돌려 가장 무거운 등급. high 와 harm 이 함께면 {level:'high', harm:true} */
  function crisis(detect, texts) {
    if (typeof detect !== 'function') return null;
    var best = null, harm = false;
    (texts || []).forEach(function (t) {
      if (!t) return;
      var r = null;
      try { r = detect(t); } catch (e) { r = null; }
      if (!r || !r.level) return;
      if (r.level === 'harm' || r.harm) harm = true;
      if (!best || RANK[r.level] > RANK[best.level]) best = { level: r.level };
    });
    if (!best) return null;
    if (best.level === 'high' && harm) best.harm = true;
    return best;
  }
  /* 위기 카드(data/crisis-card.js)의 글 주소에서 slug 를 뽑는다(번호·글을 모듈에 다시 적지 않으려고) */
  function cardSlugs(card, kinds) {
    var out = [];
    (kinds || []).forEach(function (k) {
      ((card && card[k] && card[k].actions) || []).forEach(function (a) {
        var m = /^#\/a\/([a-z0-9-]+)/.exec(String(a.href || ''));
        if (m && out.indexOf(m[1]) < 0) out.push(m[1]);
      });
    });
    return out;
  }

  /* ---------------- 팔레트·찾기 화면이 함께 쓰는 결정 ---------------- */
  function kindsOf(cl) {
    if (!cl) return [];
    if (cl.level === 'high') return cl.harm ? ['high', 'harm'] : ['high'];
    if (cl.level === 'harm') return ['harm'];
    return ['watch'];
  }
  /* plan(P, q, {detect, card, section}) →
     { r: find 결과, crisis, kinds: 카드 종류, urgent: high·harm, front: 위기 카드 글 slug, sug: 보여 줄 "찾으셨나요"(위기면 null),
       useSug: 원래 결과가 약해 후보 결과를 먼저 보임, base: 빠른 결과(순서 그대로), top: 먼저 보일 글(팔레트·찾기 화면 첫 그림),
       bodyQ: 본문 색인에 넣을 말 }
     - 위기 감지는 원문 + 고친 질의 + 초성 후보(최대 5)에. high·harm 이면 위기 카드의 글을 맨 앞에, 일부 낱말만 맞는 글은 뺀다 */
  function plan(P, q, o) {
    o = o || {};
    var r = find(P, q, { section: o.section });
    /* 위기 감지는 자르지 않은 원문 전체에도(긴 글 끝에 있는 말을 놓치지 않게) */
    var full = String(q == null ? '' : q).trim();
    var texts = full !== r.query ? [full, r.query] : [r.query];
    if (r.suggest) { texts.push(r.suggest.text); (r.suggest.candidates || []).slice(0, 5).forEach(function (c) { texts.push(c); }); }
    var cl = crisis(o.detect, texts), kinds = kindsOf(cl);
    var urgent = !!(cl && (cl.level === 'high' || cl.level === 'harm'));
    var front = urgent ? cardSlugs(o.card, kinds).filter(function (s) { return P.bySlug[s]; }) : [];
    var sug = (!urgent && r.suggest && r.suggest.text) ? r.suggest : null;
    var sugDocs = sug && !r.initials ? (sug.docs || []).filter(function (x) { return x.score >= 200; }) : [];
    var useSug = !!(sug && r.weak && sugDocs.length);
    var base = useSug ? sugDocs : r.docs;
    var strong = base.filter(function (x) { return x.score >= 200 || r.initials; });
    var seen = {}, top = [];
    function push(x) { if (x && !seen[x.slug]) { seen[x.slug] = 1; top.push(x); } }
    front.forEach(function (s) { push({ slug: s, a: P.bySlug[s].a, score: 2000, why: 'crisis', all: true }); });
    (strong.length || urgent ? strong : base.slice(0, 4)).forEach(push);
    /* 짧은 답 카드를 띄울 글: 위기 감지(watch 포함)가 없고, 맨 위가 자주 묻는 질문(15분류) 글이며, 그 글이 정말 그 질문의 답일 때만(cardOk) */
    var t0 = top[0];
    var answer = (!cl && t0 && t0.why !== 'crisis' && cardOk(P, t0, useSug && sug.ask ? sug.ask : r)) ? t0.slug : null;
    /* 본문 색인에는 정의 질문이면 X 만(뭐예요·무슨 병 같은 말로 관계 먼 글이 섞이지 않게) */
    var bodyQ = useSug ? sug.text : (r.def ? r.def.x : r.query);
    return { r: r, crisis: cl, kinds: kinds, urgent: urgent, front: front, sug: sug, useSug: useSug, base: base, top: top, bodyQ: bodyQ, question: r.question, answer: answer };
  }
  /* 짧은 답 카드 규칙(M8). 맨 위 글 x 가 자주 묻는 질문 글이고
     1) 질의에 기능어가 아닌 낱말이 있고(되나요·하니·이거 뭐야 에는 없음), 질의의 모든 낱말이 그 글(제목·태그·요약·그 글로 이어지는 일상 말)에 맞고(cover)
     2) 질문 꼴이거나, 질의의 내용 낱말이 제목의 내용 낱말과 똑같고(제목을 그대로 넣은 "약 먹고 살이 쪘어요")
     3) 같은 것을 묻는다:
        가) 제목의 내용 낱말 절반 이상을 질의가 담고, 질의의 낱말이 모두 그 글의 제목·태그에 있고(요약·일상 말로만 맞은 "커피" 는 아님),
            왜·언제·어떻게 같은 묻는 말이 제목과 같다("왜 생기나요" ≠ "스트레스 때문에 생기나요?"). 또는
        나) 일상 말 사전이 그 질의를 이 글로 먼저 이어 주고, 제목의 내용 낱말 하나 이상을 질의가 담거나 이어 준 말이 세 글자 이상이다
            ("낫나요" → 완치되나요 는 됨, 두 글자 '재발' 하나로 이어진 "재발하면 어떻게 하나요" → 재발인지 아닌지 어떻게 알아요 는 안 됨).
        "약을 먹어야 하나요" 는 "약을 먹어도 목소리가 계속 들려요" 의 내용 낱말 다섯 가운데 하나(약)만 담아 뜨지 않는다(먹어야 ≠ 먹어도)
     4) 정의 질문("조현병이 뭐예요")은 그 글의 제목도 정의 질문이고 X 가 같을 때만("초기 증상이 뭐예요" → 조현병 초기 증상은 뭔가요?).
        X 가 제목 X 의 일부일 뿐이면 아님("조현병 증상이 뭐예요" ≠ 초기 증상). 일상 말이 그 글로 먼저 이어 주고 절반 이상이면 같은 질문
        ("조현병 전조 증상은 뭔가요")
     검수 뒤: 물음표로 나뉜 두 질문 제목은 절마다 견주고(sameAsk), 일상 말 경로 나)는 이어 준 말이 모두 nocard 이면 쓰지 않는다(synBlock) */
  var WH = ['왜', '어떻게', '언제', '어디', '어디서', '누가', '무엇', '뭘', '얼마나', '어느', '몇'];
  function whOf(s) { var ws = words(s); return WH.filter(function (w) { return ws.indexOf(w) >= 0; }); }
  function cardOk(P, x, r) {
    var rec = P.bySlug[x.slug], d = rec && rec.d;
    if (!d || d.section !== '15' || !r.content || !(x.cover >= 1)) return false;
    var tr = titleRoots(d), qr = r.roots || [];
    if (!tr.length || !qr.length) return false;
    var hit = tr.filter(function (t) { return qr.indexOf(t) >= 0; }).length;
    /* same: 제목을 그대로 옮긴 말(내용 낱말 둘 이상이 제목과 똑같음. 띄어쓰기만 다른 "약 먹고 살쪘어요" 도: 뿌리를 이어 붙이면 같음).
       질문 꼴이 아닌 질의는 이때만 카드를 띄운다("군대"·"퇴원하면" 한 낱말에는 띄우지 않음) */
    var same = qr.length >= 2 && ((hit === tr.length && qr.every(function (t) { return tr.indexOf(t) >= 0; })) || (qr.join('') === tr.join('') && hit * 2 >= tr.length));
    if (!(r.question || same)) return false;
    var synOk = r.syn1 === x.slug && !r.synBlock;
    if (r.def) return !!d.fdef && (sameDef(d.fdef, r.def.xc) || same || (synOk && halfHit(tr, qr)));
    if (same) return true;
    /* 가) 같은 것을 묻고(절반 이상·묻는 말이 같음) 질의 낱말이 모두 제목·태그에 · 나) 일상 말 */
    return (!!x.tt && sameAsk(d, qr, r.wh)) || (synOk && (hit >= 1 || r.syn1s >= 30));
  }
  /* results(pl, index, {section}) → { list:[{id, snippet}], switched }: 찾기 화면의 두 번째 단계(본문 색인으로 보강).
     후보 결과를 먼저 보였는데 원래 말이 본문에 다 들어 있는 글이 있으면 원래 말 결과로 돌아간다(switched) */
  function results(pl, index, o) {
    o = o || {};
    var sec = o.section || null;
    var body = query(index, pl.bodyQ, { section: sec, strict: pl.urgent });
    var base = pl.base, switched = false;
    if (pl.useSug && query(index, pl.r.query, { section: sec, strict: true }).length) {
      body = query(index, pl.r.query, { section: sec });
      base = pl.r.docs; switched = true;
    }
    return { list: merge(base, body, { front: pl.front, strict: pl.urgent }), switched: switched };
  }

  /* ---------------- 특집 화면을 이름으로 찾기(M8) ---------------- */
  /* screens(P, pages, q) → [{ page, strength, exact, kw }] 센 것부터 최대 2개. 팔레트에 등록된 화면(nav 에 'palette')만.
     3: 화면 이름(label·title)과 같음 · 2: 여러 낱말로 된 찾기 말(keywords)과 같음, 또는 이름의 앞부분(두 글자 이상이고 이름의 절반 이상)
     1: 숫자만인 한 낱말 찾기 말(119)과 같음.
     '부작용'·'입원'·'체중'·'좌불안석' 처럼 낱말 하나가 찾기 말 하나와 같을 뿐이면 올리지 않는다(화면 줄이 글을 밀어내지 않게).
     exact: 화면 이름과 똑같음(찾기 화면의 "이 화면을 찾으셨나요" 줄) */
  /* 검수 뒤 고침: exact("이 화면을 찾으셨나요" 줄)는 화면 이름(label·title)과 같을 때만(여러 낱말 찾기 말 '기립성 저혈압'·'약 거부' 는 아님).
     한 낱말 찾기 말(1)은 119 같은 번호(숫자만)일 때만 올린다('좌불안석'·'경련'·'지도' 같은 낱말은 팔레트 '동작' 묶음 자리 그대로).
     kw: 이름이 아니라 찾기 말로만 맞음 → 팔레트에서 첫 글 뒤에 둔다(screenSlot) */
  function screens(P, pages, q) {
    var qc = compact(q).c, out = [];
    if (qc.length < 2) return out;
    (pages || []).forEach(function (pg) {
      if (!pg || (pg.nav || []).indexOf('palette') < 0) return;
      var s = 0, exact = false, kw = false;
      [pg.label, pg.title].forEach(function (n) {
        var nc = compact(n).c;
        if (!nc) return;
        if (nc === qc) { s = 3; exact = true; }
        else if (s < 2 && nc.indexOf(qc) === 0 && qc.length * 2 >= nc.length) s = 2;
      });
      if (s < 2) {
        (pg.keywords || []).forEach(function (k) {
          if (compact(k).c !== qc) return;
          if (words(k).length > 1) { s = 2; kw = true; }
          else if (!s && /^[0-9]{2,}$/.test(qc)) { s = 1; kw = true; }
        });
      }
      if (s) out.push({ page: pg, strength: s, exact: exact, kw: kw });
    });
    out.sort(function (a, b) { return b.strength - a.strength || (a.kw ? 1 : 0) - (b.kw ? 1 : 0); });
    return out.slice(0, 2);
  }
  /* 화면 줄을 넣을 자리(top 의 몇 번째 글 뒤). 위기 카드 글 뒤에서, 3 → 제목이 똑같은 글(1000 이상) 뒤 ·
     2 → 제목이 그 말로 시작하거나 그 말을 낱말 시작에 담은 글(800 이상) 두 편까지 뒤 · 1 → 글 두 편 뒤.
     kw(찾기 말로만 맞음)면 첫 글이 튼튼한 일치(300 이상: 모든 낱말이 제목·태그에, 일상 말, 제목 띠)일 때 적어도 그 글 뒤
     (Enter 기본 선택이 그 글이 되게. "약 한눈에" 처럼 첫 글이 일부 낱말만 맞은 글이면 화면 줄이 앞) */
  function screenSlot(top, strength, kw) {
    var k = 0, n = 0, lim = strength >= 3 ? 1000 : strength === 2 ? 800 : -Infinity;
    top = top || [];
    while (k < top.length && top[k].why === 'crisis') k++;
    while (k + n < top.length && n < 2 && top[k + n].score >= lim) n++;
    if (kw && !n && k < top.length && top[k].score >= 300) n = 1;
    return k + n;
  }

  /* ---------------- 짧은 답 ---------------- */
  /* 글 본문(Markdown)에서 "## 짧은 답" 소절의 원문(다음 ## 소제목 전까지). 없으면 '' */
  function shortAnswer(body) {
    var lines = String(body == null ? '' : body).replace(/\r\n?/g, '\n').split('\n');
    var i = 0, out = [];
    for (; i < lines.length; i++) if (/^##\s*짧은\s*답\s*$/.test(lines[i])) break;
    if (i >= lines.length) return '';
    for (i++; i < lines.length; i++) {
      if (/^#{1,2}\s/.test(lines[i])) break;
      out.push(lines[i]);
    }
    return out.join('\n').trim();
  }

  /* ---------------- 브라우저에서 같이 쓰는 준비물 ---------------- */
  var shared = null, sharedKey = null;
  /* 팔레트와 찾기 화면이 같은 준비물을 쓴다(한 번만 만듦). app = JHB.app */
  function quickFor(app) {
    var J = root.JHB || {};
    if (!app) return null;
    if (shared && sharedKey === app.articles) return shared;
    shared = prepare({ articles: app.articles, glossary: app.glossary, courses: app.courses, sections: app.sections, synonyms: J.synonyms, syn: J.syn });
    sharedKey = app.articles;
    return shared;
  }

  var api = {
    build: build, query: query, merge: merge, hangul: hangul,
    prepare: prepare, warm: warm, find: find, plan: plan, results: results, kinds: kindsOf, analyze: analyze, stems: stems, isQuestion: isQuestion, correct: correct,
    crisis: crisis, cardSlugs: cardSlugs, shortAnswer: shortAnswer, markHtml: markHtml, quickFor: quickFor, esc: esc,
    defOf: defOf, roots: rootsOf, cardOk: cardOk, screens: screens, screenSlot: screenSlot
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.search = api; }
})(typeof window !== 'undefined' ? window : this);
