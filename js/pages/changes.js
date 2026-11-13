/* 조현병 백과 · 고침 기록 화면 (changes/, 선언은 data/pages/changes.json, 자료는 data/kb/changes.json)
   - 자료: [{ date: 'YYYY-MM-DD', kind: 'new'|'enrich'|'fix'|'feature', slug?: 글 slug, title?: 화면·기능 이름, what: 독자에게 보일 한 줄 }]
     날짜 내림차순 → 종류(새 글·보강·바로잡음·기능) → 글 slug·기능 이름 순. 같은 날 같은 글(같은 기능)은 한 번만.
     글이면 slug, 화면·기능이면 title 하나만 써요. 형식·정렬·중복은 tests/changes.test.cjs 가 지켜요.
     새 기록을 더할 때: 항목을 넣고 lib.normalize() 로 정리하거나, 손으로 넣은 뒤 node tests/run.cjs 로 확인해요.
   - 화면: 최근 50개를 날짜별로 묶어 종류·글 링크와 함께 보여 주고, "더 보기"로 50개씩 더. 정적 HTML 에도 같은 50개.
   - 사용자 입력이 없는 화면이에요. 아무것도 저장하지 않고, 바깥으로 보내지 않아요.
   - node 에서는 화면 객체를 내보내고, 순수 함수는 page.lib 에 있어요(테스트·통합 도구용). */
(function (root) {
  var KINDS = ['new', 'enrich', 'fix', 'feature'];
  var KIND_LABEL = { new: '새 글', enrich: '보강', fix: '바로잡음', feature: '기능' };
  var KIND_DESC = {
    new: '새로 쓴 글이에요.',
    enrich: '내용이나 출처를 더한 글이에요.',
    fix: '틀린 내용·수치·표현이나 출처 주소를 고친 글이에요.',
    feature: '화면과 기능을 새로 만들거나 바꾼 것이에요.'
  };
  var KEYS = ['date', 'kind', 'slug', 'title', 'what'];
  var SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
  var WHAT_MIN = 8, WHAT_MAX = 100, TITLE_MAX = 30;
  var PAGE = 50;
  /* what·title 에 쓰지 않는 말. 글 검사기(tools/check-content.cjs)의 금지 표현과, 믿음 장치 규칙
     (감수처럼 보이는 말, 앞날의 약속, 의료기기처럼 보이는 말, 판정형 문장) */
  var FORBIDDEN = [
    { re: /\d+(\.\d+)?\s*(mg|밀리그램|정|알)\s*(씩|을|를)?\s*(드세요|복용하세요|먹으세요|드시면 돼요|먹으면 돼요)/, why: '개인별 용량 지시' },
    { re: /약을?\s*(끊어도|중단해도|안 먹어도|빼도)\s*(돼요|됩니다|괜찮아요|좋아요)/, why: '임의 중단 권유' },
    { re: /정신분열/, why: '옛 병명' },
    { re: /조현병\s*환자/, why: '사람 먼저 표현' },
    { re: /완치(됩니다|돼요|된다)/, why: '단정적 완치 표현' },
    { re: /극단(?:적(?:인)?|의)?\s*선택/, why: '자살을 에두른 말' },
    /* '감수성'(유전적 감수성 등 의학 낱말)은 감수가 아니에요 */
    { re: /감수(?!성)/, why: '감수(이 백과는 전문가 감수가 없어요)' },
    /* 백과 자체의 약속만 잡아요. 글 내용을 옮긴 '출산 예정일'·'시행 예정인 법'은 통과 */
    { re: /다음\s*검토|정기\s*검토|(검토|확인)\s*예정|예정일에\s*다시|(다시\s*(볼|확인할|검토할)|더\s*(보강할|더할)|보강할|고칠)\s*예정|(보강|업데이트)\s*예정/, why: '앞날의 약속' },
    { re: /검증(된|됐|되었|\s*완료|을\s*마쳤)|의학적으로\s*(검증|확인)/, why: '검증을 마친 것처럼 보이는 말' },
    { re: /오류가?\s*없|완벽|100\s*%\s*정확/, why: '틀린 곳이 없다는 단정' },
    { re: /자가\s*(진단|검사)|진단\s*도구|치료\s*앱/, why: '의료기기처럼 보이는 말' },
    { re: /입원해야|위험해요/, why: '판정형 문장' }
  ];

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function isDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : '');
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }
  function nonEmpty(s) { return typeof s === 'string' && s.trim().length > 0; }
  function nameOf(e) { return e.slug != null ? String(e.slug) : String(e.title == null ? '' : e.title); }
  function keyOf(e) { return e.date + '|' + nameOf(e); }
  function cmpStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function kindRank(k) { var i = KINDS.indexOf(k); return i < 0 ? KINDS.length : i; }
  /* 날짜 내림차순 → 종류 순서 → 글 slug·기능 이름 → what */
  function compare(a, b) {
    return cmpStr(String(b.date), String(a.date)) || (kindRank(a.kind) - kindRank(b.kind)) ||
      cmpStr(nameOf(a), nameOf(b)) || cmpStr(String(a.what), String(b.what));
  }
  function sortEntries(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(isObj).slice().sort(compare);
  }
  function forbidden(text) {
    var s = String(text == null ? '' : text), out = [];
    FORBIDDEN.forEach(function (f) { var hit = f.re.exec(s); if (hit) out.push(f.why + ' (' + hit[0] + ')'); });
    return out;
  }
  function has(set, v) {
    if (!set) return true;
    if (typeof set === 'function') return !!set(v);
    if (typeof set.has === 'function') return set.has(v);
    if (Array.isArray(set)) return set.indexOf(v) >= 0;
    return Object.prototype.hasOwnProperty.call(set, v);
  }
  /* 항목 하나의 형식 검사. opts = { slugs: Set·배열·객체·함수(있는 글), today: 'YYYY-MM-DD' } → 오류 문구 배열 */
  function validateEntry(e, opts) {
    opts = opts || {};
    if (!isObj(e)) return ['항목이 객체가 아니에요'];
    var errs = [];
    Object.keys(e).forEach(function (k) { if (KEYS.indexOf(k) < 0) errs.push('모르는 항목 ' + k + ' (쓸 수 있는 것: ' + KEYS.join('·') + ')'); });
    if (!isDate(e.date)) errs.push('date 는 YYYY-MM-DD(달력에 있는 날)이어야 해요: ' + JSON.stringify(e.date));
    else if (opts.today && e.date > opts.today) errs.push('date 가 오늘(' + opts.today + ')보다 뒤예요: ' + e.date);
    if (KINDS.indexOf(e.kind) < 0) errs.push('kind 는 ' + KINDS.join('·') + ' 가운데 하나: ' + JSON.stringify(e.kind));
    var hasSlug = e.slug !== undefined, hasTitle = e.title !== undefined;
    if (hasSlug && hasTitle) errs.push('slug 와 title 은 하나만 써요(글이면 slug, 화면·기능이면 title)');
    if (e.kind === 'feature') {
      if (!hasTitle || !nonEmpty(e.title)) errs.push('feature 는 title(화면·기능 이름)이 있어야 해요');
    } else if (!hasSlug && !hasTitle) {
      errs.push('slug(글) 또는 title(화면·기능 이름)이 있어야 해요');
    }
    if (hasSlug) {
      if (typeof e.slug !== 'string' || !SLUG_RE.test(e.slug)) errs.push('slug 형식이 틀렸어요(영어 소문자·숫자·-): ' + JSON.stringify(e.slug));
      else if (opts.slugs && !has(opts.slugs, e.slug)) errs.push('slug 에 해당하는 글이 없어요: ' + e.slug);
    }
    if (hasTitle) {
      if (!nonEmpty(e.title)) errs.push('title 이 비었어요');
      else {
        if (e.title.length > TITLE_MAX) errs.push('title 은 ' + TITLE_MAX + '자 이하예요');
        forbidden(e.title).forEach(function (w) { errs.push('title 에 금지 표현: ' + w); });
      }
    }
    if (!nonEmpty(e.what)) errs.push('what(독자에게 보일 한 줄)이 없어요');
    else {
      var w = e.what;
      if (/[\r\n]/.test(w)) errs.push('what 은 한 줄이어야 해요');
      if (w !== w.trim()) errs.push('what 앞뒤에 빈칸이 있어요');
      if (w.trim().length < WHAT_MIN) errs.push('what 이 너무 짧아요(' + WHAT_MIN + '자 이상)');
      if (w.length > WHAT_MAX) errs.push('what 이 너무 길어요(' + WHAT_MAX + '자 이하, 지금 ' + w.length + '자)');
      if (!/요\.$/.test(w.trim())) errs.push('what 은 해요체 한 문장으로 "…요."로 끝나요');
      forbidden(w).forEach(function (x) { errs.push('what 에 금지 표현: ' + x); });
    }
    return errs;
  }
  /* 같은 날 같은 글(같은 기능)이 두 번 이상 나오는 열쇠('날짜|slug·이름') 목록 */
  function duplicates(list) {
    var seen = {}, out = [];
    (Array.isArray(list) ? list : []).forEach(function (e) {
      if (!isObj(e)) return;
      var k = keyOf(e);
      if (seen[k] === 1) out.push(k);
      seen[k] = (seen[k] || 0) + 1;
    });
    return out;
  }
  /* 목록 전체 검사: 항목 형식 + 순서 + 중복 → { errors } */
  function validate(list, opts) {
    if (!Array.isArray(list)) return { errors: ['changes.json 은 배열이어야 해요'] };
    var errors = [];
    list.forEach(function (e, i) {
      var label = (i + 1) + '번째(' + (isObj(e) ? (e.date || '?') + ' ' + nameOf(e) : '?') + '): ';
      validateEntry(e, opts).forEach(function (m) { errors.push(label + m); });
      var prev = list[i - 1];
      if (i > 0 && isObj(prev) && isObj(e) && isDate(prev.date) && isDate(e.date) && compare(prev, e) > 0) {
        errors.push(label + '순서가 틀렸어요(날짜 내림차순 → 종류 → 글·기능 이름)');
      }
    });
    duplicates(list).forEach(function (k) { errors.push('같은 날 같은 글·기능이 두 번 이상 있어요(중복): ' + k); });
    return { errors: errors };
  }
  /* 같은 날 같은 글(기능)을 하나로 합치고 정렬. 종류는 앞선 것(새 글 > 보강 > 바로잡음 > 기능), what 은 겹치지 않게 이어 붙임 */
  function normalize(list) {
    var groups = {}, order = [];
    (Array.isArray(list) ? list : []).forEach(function (e) {
      if (!isObj(e)) return;
      var k = keyOf(e);
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(e);
    });
    var out = order.map(function (k) {
      var g = groups[k];
      if (g.length === 1) return g[0];
      var kind = g.map(function (e) { return e.kind; }).sort(function (a, b) { return kindRank(a) - kindRank(b); })[0];
      var whats = [];
      g.forEach(function (e) { var w = String(e.what == null ? '' : e.what).trim(); if (w && whats.indexOf(w) < 0) whats.push(w); });
      var m = { date: g[0].date, kind: kind };
      if (g[0].slug !== undefined) m.slug = g[0].slug; else m.title = g[0].title;
      m.what = whats.join(' ');
      return m;
    });
    return sortEntries(out);
  }
  /* 화면에 보일 만한 항목만(실행 중에는 너그럽게: 이상한 항목은 건너뜀) */
  function clean(list) {
    return (Array.isArray(list) ? list : []).filter(function (e) {
      return isObj(e) && isDate(e.date) && KINDS.indexOf(e.kind) >= 0 && nonEmpty(e.what) &&
        ((typeof e.slug === 'string' && SLUG_RE.test(e.slug)) || (e.slug === undefined && nonEmpty(e.title)));
    });
  }
  function forSlug(list, slug, n) {
    var out = sortEntries(clean(list)).filter(function (e) { return e.slug === slug; });
    return n ? out.slice(0, n) : out;
  }
  function recent(list, n) { return sortEntries(clean(list)).slice(0, n || PAGE); }
  function groupByDate(list) {
    var out = [];
    (list || []).forEach(function (e) {
      var last = out[out.length - 1];
      if (last && last.date === e.date) last.items.push(e);
      else out.push({ date: e.date, items: [e] });
    });
    return out;
  }
  function fmtDay(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
    return m ? m[1] + '년 ' + (+m[2]) + '월 ' + (+m[3]) + '일' : String(d || '');
  }
  function fmtDot(d) { return String(d || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3'); }

  /* ---------- 그리기(정적 HTML 과 브라우저가 같은 글자를 씀) ----------
     o = { esc, info(slug) → { title, hue } | null, href(slug) → 주소 } */
  function kindChip(kind, esc) {
    return '<span class="pg-changes-kind pg-changes-k-' + kind + '">' + esc(KIND_LABEL[kind]) + '</span>';
  }
  function itemHtml(e, o) {
    var esc = o.esc, head;
    if (e.slug) {
      var a = o.info(e.slug) || {};
      var hue = Number(a.hue);
      head = '<a class="pg-changes-t" href="' + esc(o.href(e.slug)) + '">' +
        (isFinite(hue) && a.hue != null ? '<span class="spine" style="--h:' + hue + '" aria-hidden="true"></span>' : '') +
        esc(a.title || e.slug) + '</a>';
    } else {
      head = '<span class="pg-changes-t">' + esc(e.title) + '</span>';
    }
    return '<li class="pg-changes-item">' + kindChip(e.kind, esc) +
      '<div class="pg-changes-main">' + head + '<p class="pg-changes-what">' + esc(e.what) + '</p></div></li>';
  }
  function listHtml(entries, o) {
    return groupByDate(entries).map(function (g) {
      return '<section class="pg-changes-day"><h2 class="pg-changes-h"><time datetime="' + o.esc(g.date) + '">' + o.esc(fmtDay(g.date)) + '</time></h2>' +
        '<ul class="pg-changes-list">' + g.items.map(function (e) { return itemHtml(e, o); }).join('') + '</ul></section>';
    }).join('');
  }
  function aboutHtml(esc) {
    return '<section class="pg-changes-about" aria-labelledby="pg-changes-about-h"><h2 class="pg-changes-about-h" id="pg-changes-about-h">이 기록을 읽는 법</h2>' +
      '<dl class="pg-changes-legend">' + KINDS.map(function (k) {
        return '<div><dt>' + kindChip(k, esc) + '</dt><dd>' + esc(KIND_DESC[k]) + '</dd></div>';
      }).join('') + '</dl>' +
      '<p class="pg-changes-note">글의 "출처 확인" 날짜는 AI 작업자가 그 글의 출처를 다시 열어 본문과 대조한 날이에요. 전문가 감수가 아니에요. ' +
      '넓은 화면에서는 글 오른쪽 문서 정보 아래에, 휴대폰에서는 글 끝에 보여요. 한 글의 고친 내역은 그 글 끝의 "이 글의 고친 내역"에서도 볼 수 있어요.</p></section>';
  }
  /* 전체 화면: 요약 줄 + 날짜 묶음(앞에서 shown 개) + 더 보기(브라우저) 또는 안내(정적) + 읽는 법 */
  function pageHtml(all, shown, o, isStatic) {
    var esc = o.esc;
    if (!all.length) return '<p class="pg-changes-empty">아직 남긴 기록이 없어요.</p>' + aboutHtml(esc);
    var rest = all.length - shown;
    var tail = '';
    if (rest > 0) {
      tail = isStatic
        ? '<noscript><p class="pg-changes-nojs">더 오래된 기록 ' + rest + '개는 자바스크립트를 켜면 볼 수 있어요.</p></noscript>'
        : '<p class="pg-changes-morewrap"><button type="button" class="btn pg-changes-more">더 보기 <span class="pg-changes-rest">(남은 기록 ' + rest + '개)</span></button></p>';
    }
    return '<p class="pg-changes-sum">기록 ' + all.length + '개 · 마지막으로 고친 날 <time datetime="' + esc(all[0].date) + '">' + esc(fmtDot(all[0].date)) + '</time></p>' +
      '<div class="pg-changes-days">' + listHtml(all.slice(0, shown), o) + '</div>' + tail + aboutHtml(esc);
  }
  function plainEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var lib = {
    KINDS: KINDS, KIND_LABEL: KIND_LABEL, KEYS: KEYS, WHAT_MAX: WHAT_MAX, PAGE: PAGE,
    isDate: isDate, compare: compare, sortEntries: sortEntries, forbidden: forbidden, validateEntry: validateEntry, validate: validate,
    duplicates: duplicates, normalize: normalize, clean: clean, forSlug: forSlug, recent: recent, groupByDate: groupByDate,
    fmtDay: fmtDay, fmtDot: fmtDot, listHtml: listHtml, pageHtml: pageHtml
  };

  var page = {
    id: 'changes',
    lib: lib,
    /* 검색엔진·자바스크립트가 꺼진 환경: 최근 50개. 글 링크는 #/a/slug(빌드가 실제 경로로 바꿈) */
    staticHtml: function (ctx) {
      ctx = ctx || {};
      var esc = typeof ctx.esc === 'function' ? ctx.esc : plainEsc;
      var arts = ctx.articles || {}, hues = {};
      (Array.isArray(ctx.sections) ? ctx.sections : []).forEach(function (s) { if (s && s.id != null) hues[s.id] = s.hue; });
      var all = sortEntries(clean(ctx.data && ctx.data.changes));
      return pageHtml(all, Math.min(PAGE, all.length), {
        esc: esc,
        info: function (slug) { var a = arts[slug]; return a ? { title: a.title, hue: hues[a.section] } : null; },
        href: function (slug) { return '#/a/' + slug; }
      }, true);
    },
    render: function (mount, ctx) {
      var A = ctx.app;
      var all = sortEntries(clean(ctx.data && ctx.data.changes));
      var shown = Math.min(PAGE, all.length);
      var o = {
        esc: A.esc,
        info: function (slug) { var a = A.bySlug[slug]; if (!a) return null; var s = A.secById[a.section]; return { title: a.title, hue: s && s.hue }; },
        href: function (slug) { return A.L('#/a/' + slug); }
      };
      function draw(focusAt) {
        mount.innerHTML = pageHtml(all, shown, o, false);
        var more = mount.querySelector('.pg-changes-more');
        if (more) more.addEventListener('click', function () {
          var from = shown;
          shown = Math.min(all.length, shown + PAGE);
          draw(from);
          A.announce('기록 ' + (shown - from) + '개를 더 보여요.');
        });
        if (focusAt != null) {
          var li = mount.querySelectorAll('.pg-changes-item')[focusAt];
          if (li) { li.setAttribute('tabindex', '-1'); li.focus(); }
        }
      }
      draw(null);
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
