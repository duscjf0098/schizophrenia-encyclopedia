/* 조현병 백과 · 항정신병약 한눈에 (meds/, 선언 data/pages/meds.json, 자료 data/kb/meds.json ← node tools/gen/meds.cjs)
   - 원천은 개별 약 글의 "## 약 카드" 표 하나뿐이에요. 칸 글자는 그대로 보여 주고, 이 화면이 따로 매긴 값은 없어요.
   - 글자 크기는 보기 설정(--fs-body)을 따라가요(css/pages/meds.css 의 em).
   - 약은 늘 가나다순이에요(바꾸는 단추 없음). 거르기·다시 늘어세우기·"부작용 하나 고르기"·효능 칸·색으로 좋고 나쁨 표시는
     만들지 않아요(한계선 L3). 칸 앞의 작은 세 칸 무늬는 글자와 같은 뜻을 모양으로 한 번 더 보일 뿐이고, 색은 중립이에요.
   - 내용 폭이 넓으면(보통 글자에서 820px 쯤, 글자 크기를 따라 em 으로 컨테이너 질의) 표, 좁으면 약마다 카드. 인쇄는 늘 표.
     표에서는 약마다 줄 둘(tbody 하나): 계열·제형·부작용 6칸 줄과 그 약의 "꼭 알아둘 것" 줄.
   - 칸을 누르면 공용 팝오버(휴대폰은 아래 시트)에 근거(그 글의 출처 제목·주소)와 그 약 글의 약 카드로 가는 링크.
     표 안에서는 Tab 한 번으로 들어와 화살표·Home·End 로 칸을 옮겨요(칸마다 Tab 을 누르지 않게).
   - "자료 부족"이 약 절반을 넘는 칸은 표·카드에서 접어 두고 "근거가 충분하지 않아 접어 뒀어요"라고 밝혀요.
   - 사용자 입력이 없어요. 아무것도 저장하지 않고, 주소(쿼리·조각)를 바꾸지 않고, 밖으로 보내지 않아요.
   - node 에서는 화면 객체를 내보내고, 순수 함수는 page.lib 에 있어요(tests/meds.test.cjs). */
(function (root) {
  var CLASS_KEY = 'class', FORM_KEY = 'form', NOTE_KEY = 'note';
  var FX_KEYS = ['weight', 'eps', 'prolactin', 'sleep', 'qt', 'ortho'];
  var TABLE_KEYS = [CLASS_KEY, FORM_KEY].concat(FX_KEYS);
  /* 자료에 행 이름이 없을 때만 쓰는 이름(약 카드의 행 이름과 같아요) */
  var KEY_NAME = {
    'class': '계열', form: '제형', weight: '체중·대사', eps: '추체외로 증상·좌불안석', prolactin: '프로락틴',
    sleep: '졸림', qt: 'QT 연장', ortho: '기립성 저혈압', note: '꼭 알아둘 것'
  };
  /* 칸 이름이 낯선 사람을 위한 글(값이 아니라 길잡이 링크). 없는 글은 건너뛰어요 */
  var COL_READ = {
    form: 'lai', weight: 'metabolic-side-effects', eps: 'eps', prolactin: 'hyperprolactinemia',
    sleep: 'sedation-anticholinergic', qt: 'heart-and-antipsychotics', ortho: 'orthostatic-hypotension'
  };
  var LEVEL_WORD = { '적은 편': 1, '중간': 2, '많은 편': 3 };
  var NONE_RE = /^자료 부족/;
  var SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
  var FIXED = '같은 약이라도 사람마다 반응이 달라요. 이 표로 약을 고르거나 바꾸지 말고 담당 의사와 상의하세요.';
  /* 접지 않는 자리(인쇄에도 남음): 표가 모든 부작용을 다루지 않는다는 것과 낱말의 뜻 */
  var SCOPE = '여섯 칸 말고도 약마다 다른 부작용이 있어요. 자세한 것은 각 약 글에서 봐요. 적은 편·중간·많은 편은 여러 약을 나란히 견준 종설의 표에 매겨진 정도를 옮긴 말이에요.';
  var FOLD_TEXT = '근거가 충분하지 않아 접어 뒀어요';
  /* 낱말이 이보다 길면 줄 끝에서 묶지 않아요(긴 글자가 가로로 넘치지 않게) */
  var NW_MAX = 6;

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  /* 가나다순(한글 음절은 부호 순서가 곧 가나다 순서), 같으면 slug */
  function byName(a, b) { return cmp(a.name, b.name) || cmp(a.slug, b.slug); }

  /* 자료 → 화면용 모양(실행 중에는 너그럽게: 틀린 항목·행은 건너뜀).
     { slug, name, en, anchor, rows: { key: { key, name, text, refs } }, sources: { n: { n, org, title, year, url } } } 배열, 가나다순 */
  function clean(list) {
    var seen = {};
    return (Array.isArray(list) ? list : []).map(function (e) {
      if (!isObj(e) || typeof e.slug !== 'string' || !SLUG_RE.test(e.slug) || !str(e.name) || !Array.isArray(e.rows)) return null;
      if (seen[e.slug]) return null;
      seen[e.slug] = true;
      var rows = {}, n = 0;
      e.rows.forEach(function (r) {
        if (!isObj(r) || typeof r.key !== 'string' || !str(r.text) || rows[r.key]) return;
        rows[r.key] = {
          key: r.key, name: str(r.name) || KEY_NAME[r.key] || r.key, text: str(r.text),
          refs: (Array.isArray(r.refs) ? r.refs : []).filter(function (x) { return typeof x === 'number' && x > 0 && Math.floor(x) === x; })
        };
        n++;
      });
      if (!n) return null;
      var sources = {};
      (Array.isArray(e.sources) ? e.sources : []).forEach(function (s) {
        if (!isObj(s) || typeof s.n !== 'number' || !str(s.title)) return;
        var url = str(s.url);
        sources[s.n] = { n: s.n, org: str(s.org), title: str(s.title), year: str(s.year), url: /^https?:\/\//i.test(url) ? url : '' };
      });
      return { slug: e.slug, name: str(e.name), en: str(e.en), anchor: /^h-\d+$/.test(str(e.anchor)) ? str(e.anchor) : '', rows: rows, sources: sources };
    }).filter(Boolean).sort(byName);
  }

  /* 칸 글자를 큰 말과 괄호 덧말로 나눠요. main + rest === text (보이는 글자는 그대로) */
  function splitValue(text) {
    var t = String(text == null ? '' : text);
    var i = t.indexOf('(');
    if (i <= 0) return { main: t, rest: '' };
    return { main: t.slice(0, i), rest: t.slice(i) };
  }
  /* 부작용 칸의 정도: 적은 편 1 · 중간 2 · 많은 편 3, 범위는 lo~hi, 자료 부족은 { none: true }. 모르는 말이면 null */
  function levelOf(text) {
    var main = splitValue(text).main.trim();
    if (NONE_RE.test(main)) return { none: true, lo: 0, hi: 0 };
    var parts = main.split('~').map(function (p) { return p.trim(); });
    if (!parts.length || parts.length > 2) return null;
    var nums = [];
    for (var i = 0; i < parts.length; i++) {
      if (!LEVEL_WORD[parts[i]]) return null;
      nums.push(LEVEL_WORD[parts[i]]);
    }
    return { none: false, lo: Math.min.apply(null, nums), hi: Math.max.apply(null, nums) };
  }
  /* 세 칸 무늬(글자와 같은 뜻, 화면 낭독기에는 숨김). f = 채움, r = 범위의 위쪽(빗금), 빈칸, n = 자료 부족(점선) */
  function markHtml(text) {
    var lv = levelOf(text);
    if (!lv) return '';
    var segs = [1, 2, 3].map(function (k) {
      if (lv.none) return '<i class="n"></i>';
      return k <= lv.lo ? '<i class="f"></i>' : k <= lv.hi ? '<i class="r"></i>' : '<i></i>';
    });
    return '<span class="pg-meds-mk" aria-hidden="true">' + segs.join('') + '</span>';
  }
  /* "자료 부족"이 약 절반을 넘는 부작용 칸(접어 둠) */
  function foldedKeys(meds) {
    var n = meds.length;
    if (!n) return [];
    return FX_KEYS.filter(function (k) {
      var none = meds.filter(function (m) { return m.rows[k] && NONE_RE.test(m.rows[k].text); }).length;
      return none * 2 > n;
    });
  }
  /* 칸 이름: 자료의 행 이름(첫 약에서), 없으면 기본 이름 */
  function colNames(meds) {
    var out = {};
    Object.keys(KEY_NAME).forEach(function (k) {
      var hit = null;
      meds.some(function (m) { if (m.rows[k]) { hit = m.rows[k].name; return true; } return false; });
      out[k] = hit || KEY_NAME[k];
    });
    return out;
  }
  /* 표의 출처(같은 주소·제목은 한 번), 처음 나온 순서(가나다 약 → 행 순서 → 각주 번호).
     keys 를 주면 그 칸들에 쓰인 것만, skip(앞에서 이미 든 출처 목록)에 있는 것은 빼요 */
  function srcId(s) { return s.url || (s.org + '|' + s.title); }
  function sourceList(meds, keys, skip) {
    var seen = {}, out = [];
    (skip || []).forEach(function (s) { seen[srcId(s)] = true; });
    meds.forEach(function (m) {
      (keys || TABLE_KEYS.concat([NOTE_KEY])).forEach(function (k) {
        var r = m.rows[k];
        if (!r) return;
        r.refs.forEach(function (n) {
          var s = m.sources[n];
          if (!s) return;
          var id = srcId(s);
          if (seen[id]) return;
          seen[id] = true;
          out.push(s);
        });
      });
    });
    return out;
  }
  function srcText(s) { return (s.org ? s.org + '. ' : '') + s.title + (s.year ? ' (' + s.year + ')' : ''); }
  function fmtDot(d) {
    return d.getFullYear() + '.' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '.' + (d.getDate() < 10 ? '0' : '') + d.getDate();
  }

  /* ---------- 그리기(정적 HTML 과 브라우저가 같은 마크업. live 일 때만 단추·안내가 붙어요) ----------
     o = { esc, link(h) → 주소, title(slug) → 글 제목 | '', live } */
  /* 큰 말은 낱말("적은 편")이 줄 끝에서 갈라지지 않게 묶고, 범위의 "~" 뒤에서만 줄을 바꿀 수 있게(글자는 그대로) */
  function mainHtml(main, esc) {
    var parts = String(main).split('~');
    return parts.map(function (p, i) {
      var lead = p.match(/^\s*/)[0], tail = p.length > lead.length ? p.match(/\s*$/)[0] : '', core = p.trim();
      var tilde = i < parts.length - 1 ? '~' : '';
      /* 짧은 낱말("적은 편")만 묶어요. 긴 글자는 묶지 않아 칸 안에서 줄을 바꿀 수 있게 */
      function nw(s) { return s.length <= NW_MAX + 1 ? '<span class="pg-meds-nw">' + esc(s) + '</span>' : esc(s); }
      /* "~" 는 앞 낱말 끝에 붙여 줄 머리로 넘어가지 않게(사이에 빈칸이 있으면 빈칸 뒤에) */
      if (tilde && tail) return esc(lead) + (core ? nw(core) : '') + esc(tail) + '<span class="pg-meds-nw">~</span>';
      return esc(lead) + (core || tilde ? nw(core + tilde) : '') + esc(tail);
    }).join('<wbr>');
  }
  function cellInner(text, fx, esc) {
    if (!fx) return '<span class="pg-meds-v">' + esc(text) + '</span>';
    var sv = splitValue(text);
    return markHtml(text) + '<span class="pg-meds-v">' + mainHtml(sv.main, esc) + '</span>' + (sv.rest ? '<span class="pg-meds-vn">' + esc(sv.rest) + '</span>' : '');
  }
  function cellHtml(m, i, k, o, sr) {
    var r = m.rows[k];
    if (!r) return '<span class="pg-meds-cell pg-meds-cell-x">-</span>';
    var fx = FX_KEYS.indexOf(k) >= 0;
    var inner = cellInner(r.text, fx, o.esc);
    var cls = 'pg-meds-cell' + (fx ? ' pg-meds-cell-fx' : '');
    if (!o.live) return '<span class="' + cls + '">' + inner + '</span>';
    return '<button type="button" class="' + cls + '" data-i="' + i + '" data-k="' + o.esc(k) + '" aria-expanded="false">' +
      (sr ? '<span class="pg-meds-sr">' + o.esc(sr) + '</span>' : '') + inner + '</button>';
  }
  function nameLink(m, o) {
    return '<a class="pg-meds-name" href="' + o.esc(o.link('#/a/' + m.slug)) + '">' + o.esc(m.name) + '</a>' +
      (m.en ? '<span class="pg-meds-en" lang="en">' + o.esc(m.en) + '</span>' : '');
  }
  function colHead(k, names, o) {
    var slug = COL_READ[k];
    var label = o.esc(names[k]);
    return slug && o.title(slug) ? '<a href="' + o.esc(o.link('#/a/' + slug)) + '" title="' + o.esc(o.title(slug)) + '">' + label + '</a>' : label;
  }
  /* 칸 단추의 숨김 이름 앞머리("리스페리돈 체중·대사: "). 표·카드 모두 같은 이름이라 낭독기가 어느 약 어느 칸인지 읽어요 */
  function srName(m, k, names) { return m.name + ' ' + names[k] + ': '; }
  /* 표: 약마다 tbody 하나(줄 둘). 첫 줄은 계열·제형·부작용 6칸, 둘째 줄은 그 약의 "꼭 알아둘 것"(그 약의 줄 안에 함께) */
  function tableHtml(meds, keys, names, o) {
    var esc = o.esc;
    var h = '<div class="pg-meds-tablewrap"><table class="pg-meds-table">' +
      '<caption class="pg-meds-sr">항정신병약 부작용 경향 표, 약 ' + meds.length + '개, 가나다순. 약마다 아래 줄에 꼭 알아둘 것.' +
      (o.live ? ' 칸을 누르면 근거가 보여요. 키보드는 화살표로 칸을 옮기고 Enter.' : '') + '</caption>' +
      '<colgroup><col class="pg-meds-col-name"><col class="pg-meds-col-class"><col class="pg-meds-col-form">' +
      keys.slice(2).map(function () { return '<col class="pg-meds-col-fx">'; }).join('') + '</colgroup>' +
      '<thead><tr><th scope="col">약</th>' + keys.map(function (k) { return '<th scope="col">' + colHead(k, names, o) + '</th>'; }).join('') + '</tr></thead>';
    meds.forEach(function (m, i) {
      var note = m.rows[NOTE_KEY];
      h += '<tbody class="pg-meds-drug"><tr class="pg-meds-tr"><th scope="row" class="pg-meds-rh"' + (note ? ' rowspan="2"' : '') + '>' + nameLink(m, o) + '</th>' +
        keys.map(function (k) {
          if (k === CLASS_KEY) return '<td class="pg-meds-td-class">' + (m.rows[k] ? esc(m.rows[k].text) : '-') + '</td>';
          return '<td class="pg-meds-td-' + esc(k) + '">' + cellHtml(m, i, k, o, srName(m, k, names)) + '</td>';
        }).join('') + '</tr>' +
        (note ? '<tr class="pg-meds-ntr"><td class="pg-meds-td-note" colspan="' + keys.length + '"><div class="pg-meds-ntw">' +
          '<span class="pg-meds-nh"' + (o.live ? ' aria-hidden="true"' : '') + '>' + esc(names[NOTE_KEY]) + '</span>' +
          cellHtml(m, i, NOTE_KEY, o, srName(m, NOTE_KEY, names)) + '</div></td></tr>' : '') +
        '</tbody>';
    });
    return h + '</table></div>';
  }
  function noteHtml(m, i, o) {
    var r = m.rows[NOTE_KEY];
    if (!r) return '';
    return '<p class="pg-meds-nt">' + o.esc(r.text) + '</p>' +
      (o.live ? '<button type="button" class="pg-meds-srcbtn" data-i="' + i + '" data-k="' + NOTE_KEY + '" aria-expanded="false">근거<span class="pg-meds-sr">: ' + o.esc(m.name) + ' 꼭 알아둘 것</span></button>' : '');
  }
  function cardsHtml(meds, keys, names, o) {
    var esc = o.esc;
    return '<ol class="pg-meds-cards">' + meds.map(function (m, i) {
      var cls = m.rows[CLASS_KEY];
      return '<li class="pg-meds-card" id="pg-meds-c-' + esc(m.slug) + '">' +
        '<h3 class="pg-meds-card-h" tabindex="-1">' + nameLink(m, o) + '</h3>' +
        (cls ? '<p class="pg-meds-card-class"><span class="pg-meds-sr">' + esc(names[CLASS_KEY]) + ': </span>' + esc(cls.text) + '</p>' : '') +
        '<dl class="pg-meds-dl">' + keys.filter(function (k) { return k !== CLASS_KEY && m.rows[k]; }).map(function (k) {
          return '<div class="pg-meds-dr pg-meds-dr-' + esc(k) + '"><dt>' + esc(names[k]) + '</dt><dd>' + cellHtml(m, i, k, o, srName(m, k, names)) + '</dd></div>';
        }).join('') + '</dl>' +
        (m.rows[NOTE_KEY] ? '<div class="pg-meds-card-note"><span class="pg-meds-nh">' + esc(names[NOTE_KEY]) + '</span>' + noteHtml(m, i, o) + '</div>' : '') +
        '</li>';
    }).join('') + '</ol>';
  }
  function foldedHtml(meds, folded, names, o) {
    if (!folded.length) return '';
    var esc = o.esc;
    return '<details class="pg-meds-folded"><summary>' + esc(FOLD_TEXT) + ': ' + esc(folded.map(function (k) { return names[k]; }).join(', ')) + '</summary>' +
      '<p class="pg-meds-folded-p">이 칸은 약 절반 넘게 "자료 부족"이라 표에서 뺐어요. 약마다 적힌 글자를 그대로 옮겼어요.</p>' +
      folded.map(function (k) {
        return '<div class="pg-meds-fold"><h3 class="pg-meds-fold-h">' + esc(names[k]) + '</h3><ul class="pg-meds-fold-list">' +
          meds.filter(function (m) { return m.rows[k]; }).map(function (m) {
            return '<li><span class="pg-meds-fold-n">' + esc(m.name) + '</span> ' + esc(m.rows[k].text) + '</li>';
          }).join('') + '</ul></div>';
      }).join('') + '</details>';
  }
  function legendHtml() {
    var items = [['적은 편', '적은 편'], ['중간', '중간'], ['많은 편', '많은 편'], ['적은 편~중간', '범위(두 범주에 걸치거나 자료마다 달라요)'], ['자료 부족', '자료 부족']];
    return '<p class="pg-meds-legend" aria-hidden="true">' + items.map(function (x) {
      return '<span class="pg-meds-lg">' + markHtml(x[0]) + x[1] + '</span>';
    }).join('') + '</p>';
  }
  function howHtml(names, o) {
    var esc = o.esc;
    var reads = FX_KEYS.concat([FORM_KEY]).filter(function (k) { return COL_READ[k] && o.title(COL_READ[k]); });
    return '<details class="pg-meds-how"><summary>이 표를 읽는 법</summary><div class="pg-meds-how-b">' +
      '<p>칸의 글자는 각 약 글의 "약 카드" 표를 그대로 옮겼어요. 이 화면이 따로 매긴 값은 없어요.</p>' +
      '<p>"적은 편~중간"처럼 범위로 쓴 칸은 표가 두 범주에 걸쳐 매겼거나 두 자료가 서로 달랐다는 뜻이에요. 괄호 안 덧말에 까닭을 적은 칸도 있어요.</p>' +
      '<p>자료 부족은 출처에서 확인하지 못한 칸이에요. 두 자료가 크게 달라 정도를 하나로 정하지 않은 칸도 자료 부족으로 두고, 괄호 안에 그렇다고 적어요.</p>' +
      '<p>약마다 아래 줄의 "꼭 알아둘 것"은 그 약 글의 약 카드 문장 그대로예요.</p>' +
      (reads.length ? '<p class="pg-meds-how-s">칸 이름이 낯설면 이 글을 봐요.</p><ul class="pg-meds-how-l">' + reads.map(function (k) {
        return '<li><span class="pg-meds-how-k">' + esc(names[k]) + '</span><a href="' + esc(o.link('#/a/' + COL_READ[k])) + '">' + esc(o.title(COL_READ[k])) + '</a></li>';
      }).join('') + '</ul>' : '') +
      '</div></details>';
  }
  /* 출처: 부작용 경향 칸의 것과 그 밖(제형·꼭 알아둘 것) 칸의 것을 나눠요. 종이에는 앞의 것만 싣고 뒤의 것은 한 줄 안내로 */
  function sourcesHtml(meds, o) {
    var fx = sourceList(meds, FX_KEYS);
    var rest = sourceList(meds, [CLASS_KEY, FORM_KEY, NOTE_KEY], fx);
    if (!fx.length && !rest.length) return '';
    var esc = o.esc;
    function list(arr, cls) {
      return '<ol class="pg-meds-srclist ' + cls + '">' + arr.map(function (s) {
        return '<li>' + esc(srcText(s)) + (s.url ? ' <a href="' + esc(s.url) + '" target="_blank" rel="noopener">원문</a>' : '') + '</li>';
      }).join('') + '</ol>';
    }
    return '<details class="pg-meds-src"><summary>이 표의 출처 ' + (fx.length + rest.length) + '개</summary>' +
      '<p class="pg-meds-src-p">각 약 글의 출처 목록에서 이 표의 칸에 쓰인 것만 모았어요.' + (o.live ? ' 칸마다 어떤 출처인지는 칸을 누르면 보여요.' : '') + '</p>' +
      (fx.length ? '<h3 class="pg-meds-src-h">부작용 경향 칸 <span>' + fx.length + '개</span></h3>' + list(fx, 'pg-meds-src-fx') : '') +
      (rest.length ? '<h3 class="pg-meds-src-h pg-meds-src-resth">제형·꼭 알아둘 것 칸 <span>' + rest.length + '개</span></h3>' + list(rest, 'pg-meds-src-rest') +
        '<p class="pg-meds-src-prt">제형·꼭 알아둘 것 칸의 출처 ' + rest.length + '개는 각 약 글의 출처 목록에 있어요.</p>' : '') +
      '</details>';
  }
  function jumpHtml(meds, o) {
    return '<nav class="pg-meds-jump" aria-label="약 이름으로 바로 가기"><span class="pg-meds-jump-h" aria-hidden="true">바로 가기</span><ul>' +
      meds.map(function (m) { return '<li><button type="button" data-jump="' + o.esc(m.slug) + '">' + o.esc(m.name) + '</button></li>'; }).join('') + '</ul></nav>';
  }
  function pageHtml(list, o) {
    var esc = o.esc;
    var meds = clean(list);
    var fixed = '<p class="pg-meds-fixed" role="note">' + esc(FIXED) + '</p>';
    if (!meds.length) {
      return '<div class="pg-meds">' + fixed + '<p class="pg-meds-empty">약 카드를 찾지 못했어요. 약 글은 <a href="' + esc(o.link('#/s/7')) + '">약물 치료</a> 분류에서 볼 수 있어요.</p></div>';
    }
    var names = colNames(meds);
    var folded = foldedKeys(meds);
    var keys = TABLE_KEYS.filter(function (k) { return folded.indexOf(k) < 0; });
    return '<div class="pg-meds">' + fixed + '<p class="pg-meds-scope">' + esc(SCOPE) + '</p>' + legendHtml() + howHtml(names, o) +
      '<section class="pg-meds-main" aria-labelledby="pg-meds-main-h">' +
      '<h2 class="pg-meds-h" id="pg-meds-main-h">부작용 경향 <span class="pg-meds-count">약 ' + meds.length + '개 · 가나다순</span></h2>' +
      '<p class="pg-meds-hint">' + (o.live ? '칸을 누르면 근거(출처)와 그 약 글로 가는 길이 보여요.' : '약 이름을 누르면 그 약 글로 가요. 칸마다 근거는 그 글의 약 카드와 출처 목록에 있어요.') + '</p>' +
      (o.live ? jumpHtml(meds, o) : '') +
      tableHtml(meds, keys, names, o) + cardsHtml(meds, keys, names, o) + foldedHtml(meds, folded, names, o) +
      '</section>' + sourcesHtml(meds, o) +
      (o.live ? '<p class="pg-meds-tools"><button type="button" class="btn pg-meds-print">이 표 인쇄하기</button></p>' : '') +
      '</div>';
  }
  function plainEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* ---------- 브라우저: 팝오버·표 안 화살표·바로 가기·인쇄 ---------- */
  function popNodes(A, m, k) {
    var el = A.el, r = m.rows[k];
    var fx = FX_KEYS.indexOf(k) >= 0;
    var nodes = [el('b', null, [m.name + ' · ' + r.name])];
    var v = el('p.pg-meds-pop-v', fx ? { html: cellInner(r.text, true, A.esc) } : null, fx ? null : [r.text]);
    nodes.push(v);
    var srcs = r.refs.map(function (n) { return m.sources[n]; }).filter(Boolean);
    if (srcs.length) {
      nodes.push(el('span.pg-meds-pop-h', null, ['근거(그 글의 출처 번호)']));
      nodes.push(el('ol.pg-meds-pop-src', null, srcs.map(function (s) {
        return el('li', { value: String(s.n) }, [srcText(s) + (s.url ? ' ' : ''),
          s.url ? el('a', { href: s.url, target: '_blank', rel: 'noopener', 'aria-label': '원문 열기: ' + s.title }, ['원문 열기']) : null]);
      })));
    } else {
      nodes.push(el('p.pg-meds-pop-none', null, [popNote(r.text)]));
    }
    nodes.push(el('div.pop-links', null, [
      el('a', { href: A.L('#/a/' + m.slug + (m.anchor ? '#' + m.anchor : '')) }, [m.name + ' 글의 약 카드 보기'])
    ]));
    return nodes;
  }
  /* 출처 각주가 없는 칸의 풀이. 자료 부족에 괄호 덧말이 있으면 그 덧말이 까닭이라 그대로 보여요 */
  function popNote(text) {
    var t = String(text == null ? '' : text);
    if (!NONE_RE.test(t)) return '약 카드의 이 칸에는 따로 단 출처가 없어요.';
    var rest = splitValue(t).rest.trim();
    if (rest) return '약 카드에 자료 부족으로 적은 칸이에요. 까닭은 약 카드의 덧말 그대로예요: ' + rest;
    return '출처에서 확인하지 못해 자료 부족으로 둔 칸이에요.';
  }
  /* 화살표 이동(순수 함수). grid[y][x] = 그 자리의 칸(단추) 또는 null. 열은 표의 열 그대로라
     어떤 약에 칸이 빠져도(null) 위아래 이동이 옆 열로 밀리지 않아요. 여러 열을 차지한 칸(꼭 알아둘 것 줄)은
     그 열마다 같은 칸이 들어 있어요. 갈 곳이 없으면 null(제자리) */
  function gridMove(grid, x, y, key, ctrl) {
    var last = grid.length - 1;
    if (y < 0 || y > last) return null;
    var cur = grid[y][x];
    function pick(row, want) {
      var r = grid[row];
      if (r[want]) return { x: want, y: row };
      for (var d = 1; d < r.length; d++) {
        if (r[want - d]) return { x: want - d, y: row };
        if (r[want + d]) return { x: want + d, y: row };
      }
      return null;
    }
    function edge(row, fromEnd) {
      var r = grid[row];
      for (var i = 0; i < r.length; i++) { var xx = fromEnd ? r.length - 1 - i : i; if (r[xx]) return { x: xx, y: row }; }
      return null;
    }
    var i, out = null;
    switch (key) {
      case 'ArrowRight': for (i = x + 1; i < grid[y].length; i++) if (grid[y][i] && grid[y][i] !== cur) { out = { x: i, y: y }; break; } break;
      case 'ArrowLeft': for (i = x - 1; i >= 0; i--) if (grid[y][i] && grid[y][i] !== cur) { out = { x: i, y: y }; break; } break;
      case 'ArrowDown': out = y < last ? pick(y + 1, x) : null; break;
      case 'ArrowUp': out = y > 0 ? pick(y - 1, x) : null; break;
      case 'PageDown': out = pick(last, x); break;
      case 'PageUp': out = pick(0, x); break;
      case 'Home': out = edge(ctrl ? 0 : y, false); break;
      case 'End': out = edge(ctrl ? last : y, true); break;
      default: return undefined;
    }
    return out;
  }
  /* 표의 tbody 줄 → grid(열은 th 뒤의 td 자리, colspan 만큼 같은 칸). 단추가 하나도 없는 줄은 빼요 */
  function gridOf(table) {
    var grid = [];
    Array.prototype.forEach.call(table.querySelectorAll('tbody tr'), function (tr) {
      var row = [], any = false;
      Array.prototype.forEach.call(tr.children, function (c) {
        if (c.tagName !== 'TD') return;
        var b = c.querySelector('button.pg-meds-cell');
        var span = Math.max(1, Number(c.getAttribute('colspan')) || 1);
        for (var s = 0; s < span; s++) row.push(b || null);
        if (b) any = true;
      });
      if (any) grid.push(row);
    });
    return grid;
  }
  /* 표 안 칸 단추를 Tab 한 번 + 화살표로(지금 칸만 tabindex 0) */
  function gridNav(table) {
    var grid = gridOf(table);
    if (!grid.length) return;
    var at = gridMove(grid, -1, 0, 'Home', false);
    if (!at) return;
    grid.forEach(function (r) { r.forEach(function (b) { if (b) b.setAttribute('tabindex', '-1'); }); });
    function cell(p) { return grid[p.y][p.x]; }
    function set(p) {
      var old = cell(at);
      if (old && old !== cell(p)) old.setAttribute('tabindex', '-1');
      at = p;
      cell(p).setAttribute('tabindex', '0');
    }
    set(at);
    function posOf(b) {
      if (cell(at) === b) return at;
      for (var y = 0; y < grid.length; y++) { var x = grid[y].indexOf(b); if (x >= 0) return { x: x, y: y }; }
      return null;
    }
    table.addEventListener('focusin', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button.pg-meds-cell') : null;
      var p = b ? posOf(b) : null;
      if (p) set(p);
    });
    table.addEventListener('keydown', function (e) {
      if (e.altKey || e.metaKey) return;
      var p = posOf(e.target);
      if (!p) return;
      var to = gridMove(grid, p.x, p.y, e.key, e.ctrlKey);
      if (to === undefined) return;
      e.preventDefault();
      if (!to) return;
      set(to);
      cell(to).focus();
    });
  }

  var lib = {
    FX_KEYS: FX_KEYS, TABLE_KEYS: TABLE_KEYS, KEY_NAME: KEY_NAME, COL_READ: COL_READ, FIXED: FIXED, FOLD_TEXT: FOLD_TEXT, SCOPE: SCOPE,
    clean: clean, byName: byName, splitValue: splitValue, levelOf: levelOf, markHtml: markHtml, foldedKeys: foldedKeys,
    colNames: colNames, sourceList: sourceList, pageHtml: pageHtml, popNote: popNote, gridMove: gridMove
  };

  var page = {
    id: 'meds',
    lib: lib,
    /* 검색엔진·자바스크립트가 꺼진 환경: 같은 표·카드·꼭 알아둘 것·출처(단추 없이). 글 링크는 #/a/slug(빌드가 실제 경로로 바꿈) */
    staticHtml: function (ctx) {
      ctx = ctx || {};
      var arts = ctx.articles || {};
      return pageHtml(ctx.data && ctx.data.meds, {
        esc: typeof ctx.esc === 'function' ? ctx.esc : plainEsc,
        link: function (h) { return h; },
        title: function (slug) { return arts[slug] && arts[slug].title ? arts[slug].title : ''; },
        live: false
      });
    },
    render: function (mount, ctx) {
      var A = ctx.app;
      var meds = clean(ctx.data && ctx.data.meds);
      mount.innerHTML = pageHtml(ctx.data && ctx.data.meds, {
        esc: A.esc,
        link: function (h) { return A.L(h); },
        title: function (slug) { return A.bySlug && A.bySlug[slug] ? A.bySlug[slug].title : ''; },
        live: true
      });
      var table = mount.querySelector('.pg-meds-table');
      if (table) gridNav(table);

      mount.addEventListener('click', function (e) {
        var t = e.target;
        var cell = t.closest ? t.closest('button[data-k]') : null;
        if (cell && mount.contains(cell)) {
          var m = meds[Number(cell.getAttribute('data-i'))], k = cell.getAttribute('data-k');
          if (m && m.rows[k]) A.openPop(cell, popNodes(A, m, k));
          return;
        }
        var jump = t.closest ? t.closest('button[data-jump]') : null;
        if (jump) {
          var card = document.getElementById('pg-meds-c-' + jump.getAttribute('data-jump'));
          if (!card) return;
          card.scrollIntoView({ block: 'start', behavior: A.reducedMotion() ? 'auto' : 'smooth' });
          var h = card.querySelector('.pg-meds-card-h');
          if (h) h.focus({ preventScroll: true });
          return;
        }
        if (t.closest && t.closest('.pg-meds-print')) {
          if (root.JHB && JHB.ui && JHB.ui.print && typeof JHB.ui.print.print === 'function') JHB.ui.print.print();
          else if (typeof root.print === 'function') root.print();
        }
      });
      var tools = mount.querySelector('.pg-meds-tools');
      if (tools && typeof root.print !== 'function') tools.hidden = true;

      /* 인쇄: 출처 목록을 펴고(끝나면 이 화면이 편 것만 다시 접음), 종이 머리에 인쇄한 날과 주소(쿼리·조각 없이) */
      var src = mount.querySelector('.pg-meds-src');
      var opened = false;
      function stamp() {
        var p = mount.querySelector('.pg-meds-prt');
        if (!p) {
          p = A.el('p.pg-meds-prt');
          mount.insertBefore(p, mount.firstChild);
        }
        var url = '';
        try { url = decodeURI(String(location.origin) + String(location.pathname)); } catch (err) { url = String(location.origin) + String(location.pathname); }
        p.textContent = '조현병 백과 · 항정신병약 한눈에 · 인쇄한 날 ' + fmtDot(new Date()) + ' · ' + url;
      }
      function prep() {
        stamp();
        if (src && !src.open) { src.open = true; opened = true; }
      }
      function undo() {
        if (opened && src) src.open = false;
        opened = false;
      }
      root.addEventListener('beforeprint', prep);
      root.addEventListener('afterprint', undo);
      var mq = typeof root.matchMedia === 'function' ? root.matchMedia('print') : null;
      function onMq(e) { if (e.matches) prep(); else undo(); }
      if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }
      ctx.onCleanup(function () {
        root.removeEventListener('beforeprint', prep);
        root.removeEventListener('afterprint', undo);
        if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq); }
        A.closePop();
      });
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
