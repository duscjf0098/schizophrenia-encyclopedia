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
    '안 못 거 것 게 건가요 건지 걸까요 i m s the a an is to of and or my me').split(' ').forEach(function (w) { STOP[w] = 1; });
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
  /* 낱말 목록의 조사·어미를 뗀 구절들(최대 16개, 공백 빼고 두 글자 이상) */
  function phrasesOf(list) {
    var phrases = [''];
    list.forEach(function (w) {
      var next = [];
      stems(w).forEach(function (v) { phrases.forEach(function (p) { if (next.length < 16) next.push(p ? p + ' ' + v : v); }); });
      phrases = next;
    });
    return phrases.filter(function (p) { return p.replace(/\s/g, '').length >= 2; });
  }
  function analyze(raw) {
    raw = clip(raw);
    var k = compact(raw), all = k.words;
    var keepIdx = [], at = 0, spans = [];
    all.forEach(function (w, i) { spans.push([at, at + w.length]); at += w.length; if (!STOP[w]) keepIdx.push(i); });
    if (!keepIdx.length) keepIdx = all.map(function (w, i) { return i; });
    var keep = keepIdx.map(function (i) { return all[i]; });
    /* span: 붙인 꼴(c) 안의 자리. 일상 말이 질의의 어느 낱말을 덮었는지 볼 때 쓴다 */
    var list = keepIdx.map(function (i) { var w = all[i]; return { w: w, vars: stems(w), one: w.length === 1, span: spans[i] }; });
    /* 조사·어미를 뗀 구절들("처음 진단받았어요" → "처음 진단받았", "약을 빠뜨렸어요" → "약을 빠뜨렸"). 제목 포함 검사에 쓴다.
       기능어를 뺀 구절도 함께("환청이 뭐예요" → "환청이"·"환청": 제목 "환청"과 맞게) */
    var phrases = phrasesOf(all);
    var kphr = keep.length < all.length ? phrasesOf(keep) : [];
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
    (src.articles || []).forEach(function (a, i) {
      var k = compact(a.title), tags = (a.tags || []).map(lower);
      P.bySlug[a.slug] = { a: a };
      P.docs.push({
        a: a, slug: a.slug, i: i, section: String(a.section == null ? '' : a.section),
        t: lower(a.title).replace(/\s+/g, ' '), tc: k.c, ts: k.starts, tw: k.words,
        tags: tags, tagc: tags.map(function (x) { return compact(x).c; }), sum: lower(a.summary),
        sec: secWords[String(a.section)] || [], ini: null
      });
      hay.push(lower(a.title), tags.join(' '), lower(a.summary));
    });
    (src.glossary || []).forEach(function (g) {
      var k = compact(g.term);
      P.terms.push({ g: g, t: lower(g.term), tc: k.c, ts: k.starts, en: lower(g.en || ''), enw: words(g.en || ''), ini: null });
      hay.push(lower(g.term), lower(g.en || ''));
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
    var strong = {}, loose = {};
    if (P.syn && P.matcher) {
      /* 강한 일치는 사전이 정한 순서(점수순)의 자리(0~7)로 */
      try { P.syn.expand(P.matcher, raw).slugs.forEach(function (x, i) { strong[x.slug] = i + 1; }); } catch (e) { }
      if (P.syn.loose) { try { P.syn.loose(P.matcher, raw).slugs.forEach(function (x) { loose[x.slug] = x.score; }); } catch (e) { } }
    }
    return { strong: strong, loose: loose };
  }

  /* 글 점수. 띠(band): 1000 제목 완전 · 900 제목 접두 · 800 제목의 낱말 시작에 질의 전체 · 760 제목 안에 질의 전체 ·
     400~499 일상 말(사전이 정한 순서가 먼저) · 380~ 모든 낱말이 제목에(떨어져 있음) · 300~ 모든 낱말이 제목·태그·분류에 ·
     250~ 일상 말(느슨) · 200~ 모든 낱말이 어딘가에(요약 포함) · ~150 일부 낱말만.
     질문 꼴 질의는 같은 띠 안에서 자주 묻는 질문(15분류) 글을 조금 앞으로(띠를 넘지 않음). 같은 점수면 분류·순서대로 */
  function scoreDocs(P, Q, opts) {
    opts = opts || {};
    var sec = opts.section ? String(opts.section) : '';
    var syn = synScores(P, Q.raw);
    var ws = Q.words, multi = ws.length > 1;
    var latinOnly = !!Q.c && isLatin(Q.c);
    var weights = ws.map(function (x) { return idf(P, x); });
    var wTotal = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    /* 질의 안에 낱말 시작부터 그대로 들어 있는 일상 말(say)의 자리. slug → [[시작, 끝]…] */
    var saySpans = {};
    if (Q.c) {
      (P.says || []).forEach(function (e) {
        (e.say || []).forEach(function (s) {
          var cs = compact(s).c;
          if (cs.length < 2) return;
          var p = Q.c.indexOf(cs);
          while (p >= 0 && !Q.starts[p]) p = Q.c.indexOf(cs, p + 1);
          if (p < 0) return;
          (e.slugs || []).forEach(function (sl) { (saySpans[sl] = saySpans[sl] || []).push([p, p + cs.length]); });
        });
      });
    }
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
        if (d.tc === Q.c || (Q.c2 && d.tc === Q.c2) || Q.cx.indexOf(d.tc) >= 0) band = 1000;
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
      var extra = Math.min(60, wsum * 4);
      var qa = Q.question && d.section === '15' ? 8 : 0;
      var s = 0;
      if (band) s = band + extra / 10 + qa;
      /* 일상 말: 사전 순서 한 자리에 6점, 모든 낱말이 글의 칸에도 있으면 최대 +5(사전 순서를 한 자리 넘게 뒤집지 않음) */
      if (!s && syn.strong[d.slug]) { s = 400 + 60 - 6 * (syn.strong[d.slug] - 1) + 5 * (got / wTotal) + qa; why = 'syn'; }
      if (!s && multi && all && inTitle) { s = 380 + Math.min(13, extra / 4) + qa; why = 'title'; }
      if (!s && all && inTT) { s = 300 + extra + qa; why = 'tag'; }
      if (!s && syn.loose[d.slug]) { s = 250 + Math.min(40, syn.loose[d.slug]) + qa; why = 'syn'; }
      if (!s && all && any) { s = 200 + Math.min(40, extra) + qa; why = 'summary'; }
      /* 일부 일치: 한 글자 낱말만 맞은 글은 내지 않는다("임신 약" 의 "약"만 맞은 글) */
      if (!s && any && (long || !ws.some(function (x) { return !x.one; }))) { s = Math.round(150 * got / wTotal) + extra / 10; why = 'partial'; }
      if (!s) return;
      /* cover: 질의 낱말(무게) 가운데 이 글의 칸(제목·태그·분류·요약)에 있거나 이 글로 이어지는 일상 말이 덮은 몫 0~1.
         짧은 답 카드를 띄울지 가를 때 쓴다(질의의 일부 낱말에만 맞는 FAQ 의 답을 '답'처럼 보이지 않게) */
      out.push({ slug: d.slug, a: d.a, score: s, why: why, all: all || band > 0, cover: band > 0 ? 1 : Math.round(100 * cov / wTotal) / 100 });
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
  /* find(P, q, {section}) → { query, question, initials, docs:[{slug,a,score,why,all}], terms:[{g}], courses:[{c}], suggest, weak }
     suggest = { text, changed, kind: 'typo'|'initials', docs, terms, candidates } — "○○을(를) 찾으셨나요?" */
  function find(P, q, opts) {
    opts = opts || {};
    var Q = analyze(q);
    var out = { query: Q.raw, question: Q.question, initials: false, docs: [], terms: [], courses: [], suggest: null, weak: true, words: Q.words.map(function (x) { return x.w; }) };
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
    out.terms = scoreTerms(P, Q);
    out.courses = scoreCourses(P, Q);
    /* 약함: 글이 없거나, 맨 위 글도 일부 낱말만 맞음(모든 낱말·일상 말·제목 일치가 하나도 없음) */
    out.weak = !(out.docs.length && out.docs[0].score >= 200);
    if (out.weak) {
      var fx = correct(P, Q);
      if (fx) {
        var F = analyze(fx.text);
        out.suggest = { kind: 'typo', text: fx.text, changed: fx.changed, docs: scoreDocs(P, F, opts), terms: scoreTerms(P, F) };
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
    /* 짧은 답 카드를 띄울 글: 질문 꼴이고, 위기 감지(watch 포함)가 없고, 맨 위가 자주 묻는 질문(15분류) 글이며
       질의의 모든 낱말이 그 글(제목·태그·요약 또는 그 글로 이어지는 일상 말)에 맞을 때만 */
    var t0 = top[0];
    var answer = (!cl && r.question && t0 && String(t0.a && t0.a.section) === '15' && t0.cover >= 1) ? t0.slug : null;
    return { r: r, crisis: cl, kinds: kinds, urgent: urgent, front: front, sug: sug, useSug: useSug, base: base, top: top, bodyQ: useSug ? sug.text : r.query, question: r.question, answer: answer };
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
    crisis: crisis, cardSlugs: cardSlugs, shortAnswer: shortAnswer, markHtml: markHtml, quickFor: quickFor, esc: esc
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.search = api; }
})(typeof window !== 'undefined' ? window : this);
