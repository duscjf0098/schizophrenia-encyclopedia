/* 조현병 백과 · 일상 말 → 문서/용어 매칭
   build(list) → matcher, expand(matcher, query) → { slugs: [{slug, score}], terms: [string] }
   질의와 say 를 소문자로 바꾸고 공백·문장 부호를 지운 "붙인 글"로 맞추되, 낱말 경계를 지킨다(M3).
   - 강한 일치(질의 ⊃ say): say 가 질의의 **낱말이 시작하는 자리**에서 시작할 때만. "장애인 등록" 속 '애인', "임신 약" 속 '신약'은 아님.
     두 글자 say 는 질의의 한 낱말 전체(조사·어미를 뗀 것 포함)와 같을 때만: '운동' ≠ '운동장애', '살쪄' = '살쪄요'.
   - 약한 일치(say ⊃ 질의): 질의가 say 의 낱말이 시작하는 자리에서 시작할 때만. "자살" 은 '혼자 살' 속에 들어가지 않는다.
   - 영문(라틴 글자) say 는 질의의 영문 낱말이 시작하는 자리에서만, 4자 이하는 낱말 끝까지 같아야 한다("exactly" 속 act 아님).
   겹치는 글자가 길수록 점수가 높고, 여러 항목이 같은 slug 를 가리키면 더한다. slug 는 점수순 최대 8개.
   질의 안에 say 가 통째로 들어간 일치(강한 근거)는 더하고, 짧은 질의가 긴 say 속에 들어간 일치(약한 근거)는 가장 높은 하나만 친다.
   build 는 무거우니 한 번만 만들어 두고 expand 만 여러 번 부른다(팔레트·찾기 화면). */
(function (root) {
  var SEP = /[\s·•,.:;!?()[\]{}<>\/\\'"“”‘’`~\-_=+|*&^%$#@]+/;
  var LATIN = /^[a-z0-9]+$/;
  /* 낱말 끝에서 뗄 조사·어미(긴 것부터). 뗀 뒤 두 글자 이상 남을 때만(한 글자 조사는 두 글자 낱말에서 한 글자로도: 약을 → 약).
     js/search.js 의 TAILS 와 같게 둔다 */
  var TAILS = ['이에요', '이예요', '했어요', '었어요', '았어요', '됐어요', '되나요', '하나요', '인가요', '할까요', '을까요', '일까요', '했는데', '는데요',
    '에서', '에게', '한테', '으로', '이랑', '하고', '까지', '부터', '예요', '에요', '어요', '아요', '해요', '나요', '까요', '가요', '해도', '어도', '아도', '는데', '하면', '으면',
    '은', '는', '이', '가', '을', '를', '에', '의', '도', '만', '로', '와', '과', '랑', '요', '야', '다', '니', '냐', '나', '지', '죠', '해', '면'];
  var ONE = { '은': 1, '는': 1, '이': 1, '가': 1, '을': 1, '를': 1, '에': 1, '의': 1, '도': 1, '만': 1, '로': 1, '와': 1, '과': 1 };

  function lower(s) { return String(s == null ? '' : s).toLowerCase(); }
  function norm(s) { return lower(s).replace(/\s+/g, ''); }
  /* 낱말 목록(소문자, 문장 부호로 나눔) */
  function words(s) { return lower(s).split(SEP).filter(Boolean); }
  /* 붙인 글과 낱말이 시작하는 자리 */
  function compact(s) {
    var ws = words(s), c = '', starts = {};
    ws.forEach(function (w) { starts[c.length] = 1; c += w; });
    return { c: c, starts: starts, words: ws };
  }
  function stems(w) {
    var out = [w];
    if (!/[가-힣]/.test(w)) return out;
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

  function build(list) {
    var items = [];
    (list || []).forEach(function (e) {
      var says = [];
      (e.say || []).forEach(function (s) {
        var k = compact(s);
        if (k.c.length >= 2) says.push(k);
      });
      if (!says.length) return;
      items.push({ says: says, terms: e.terms || [], slugs: e.slugs || [] });
    });
    return { items: items };
  }

  /* 질의를 한 번만 나눠 둔다 */
  function prepQuery(query) {
    var k = compact(query);
    var full = {}; /* 두 글자 say 와 견줄 낱말(조사·어미를 뗀 것 포함) */
    k.words.forEach(function (w) { stems(w).forEach(function (x) { full[x] = 1; }); });
    k.full = full;
    return k;
  }

  function isAl(ch) { return ch != null && /[a-z0-9]/.test(ch); }
  /* 강한 일치: say 가 질의의 낱말 시작 자리에서 시작.
     영문 say 는 앞이 낱말 시작이거나 영문·숫자가 아닌 글자("장기지속형lai")일 때, 4자 이하는 뒤도 영문·숫자가 아닐 때("eps가")만 */
  function strongAt(q, s) {
    var c = s.c, latin = LATIN.test(c);
    if (!latin && c.length <= 2) return !!q.full[c];
    var p = q.c.indexOf(c);
    while (p >= 0) {
      if (!latin) { if (q.starts[p]) return true; }
      else {
        var end = p + c.length;
        var startOk = q.starts[p] || !isAl(q.c.charAt(p - 1) || null);
        var endOk = c.length > 4 || end === q.c.length || q.starts[end] || !isAl(q.c.charAt(end));
        if (startOk && endOk) return true;
      }
      p = q.c.indexOf(c, p + 1);
    }
    return false;
  }
  /* 약한 일치: 질의가 say 의 낱말 시작 자리에서 시작 */
  function weakAt(q, s) {
    var c = s.c, p = c.indexOf(q.c);
    while (p >= 0) {
      if (s.starts[p]) return true;
      p = c.indexOf(q.c, p + 1);
    }
    return false;
  }
  function overlap(q, s) {
    if (strongAt(q, s)) return s.c.length * 10 + 5;
    if (q.c.length >= 2 && q.c.length < s.c.length && weakAt(q, s)) return -(q.c.length * 5); /* 음수 = 약한 일치 표시 */
    return 0;
  }

  function expand(matcher, query) {
    var q = prepQuery(query);
    var strong = {}, weak = {}, termScore = {};
    if (q.c.length >= 2 && matcher && matcher.items) {
      matcher.items.forEach(function (it) {
        var best = 0;
        it.says.forEach(function (s) { var v = overlap(q, s); if (Math.abs(v) > Math.abs(best)) best = v; });
        if (!best) return;
        var pts = Math.abs(best);
        it.slugs.forEach(function (slug, i) {
          var v = Math.max(1, pts - i);
          if (best > 0) strong[slug] = (strong[slug] || 0) + v;
          else weak[slug] = Math.max(weak[slug] || 0, v);
        });
        it.terms.forEach(function (t) { termScore[t] = Math.max(termScore[t] || 0, pts); });
      });
    }
    var slugScore = {};
    Object.keys(strong).forEach(function (k) { slugScore[k] = strong[k]; });
    Object.keys(weak).forEach(function (k) { slugScore[k] = (slugScore[k] || 0) + weak[k]; });
    var slugs = Object.keys(slugScore).map(function (k) { return { slug: k, score: slugScore[k] }; })
      .sort(function (a, b) { return b.score - a.score || (a.slug < b.slug ? -1 : 1); }).slice(0, 8);
    var terms = Object.keys(termScore).sort(function (a, b) { return termScore[b] - termScore[a] || a.localeCompare(b, 'ko'); });
    return { slugs: slugs, terms: terms };
  }

  /* 느슨한 일치(빠른 찾기의 낮은 단계에서만 씀. expand 는 바꾸지 않음):
     - 낱말 모음: 두 낱말 이상인 say 의 낱말이 모두 질의 낱말(조사·어미를 뗀 꼴 포함)과 같음 — 순서가 달라도("깜빡하고 약" ↔ '약 깜빡')
     - 앞 구절: say 의 앞 두 낱말 이상이 질의의 이어진 낱말과 같음(글자 4자 이상) — "누가 나를 감시해" ↔ '누가 나를 해치'
     slug 마다 가장 높은 값 하나만(더하지 않음). 강한 일치(expand)가 있는 slug 도 그대로 둔다(부르는 쪽이 더 높은 단계로 씀) */
  function loose(matcher, query) {
    var q = prepQuery(query), qw = q.words.map(stems);
    var best = {};
    if (!(matcher && matcher.items) || q.words.length < 2) return { slugs: [] };
    function has(i, w) { return qw[i] && qw[i].indexOf(w) >= 0; }
    function anyHas(w) { for (var i = 0; i < qw.length; i++) if (has(i, w)) return true; return false; }
    matcher.items.forEach(function (it) {
      var pts = 0;
      it.says.forEach(function (s) {
        var sw = s.words;
        if (sw.length < 2) return;
        if (sw.every(anyHas)) pts = Math.max(pts, s.c.length * 6);
        for (var st = 0; st + 1 < qw.length; st++) {
          var k = 0, chars = 0;
          while (k < sw.length && st + k < qw.length && has(st + k, sw[k])) { chars += sw[k].length; k++; }
          if (k >= 2 && k < sw.length && chars >= 4) pts = Math.max(pts, chars * 5);
        }
      });
      if (!pts) return;
      it.slugs.forEach(function (slug, i) { var v = Math.max(1, pts - i); if (!best[slug] || v > best[slug]) best[slug] = v; });
    });
    var slugs = Object.keys(best).map(function (k) { return { slug: k, score: best[k] }; })
      .sort(function (a, b) { return b.score - a.score || (a.slug < b.slug ? -1 : 1); }).slice(0, 8);
    return { slugs: slugs };
  }

  var api = { build: build, expand: expand, loose: loose, words: words, compact: compact, stems: stems };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JHB = root.JHB || {}; root.JHB.syn = api; }
})(typeof window !== 'undefined' ? window : this);
