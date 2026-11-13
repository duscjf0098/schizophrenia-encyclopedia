/* 조현병 백과 · 미리 써 두는 종이 (plan/, 선언 data/pages/plan.json, 양식 data/kb/forms.json)
   당사자용 양식 3종(재발·위기 대비 계획, 안전 계획 카드, 내 정보 카드)을 화면에서 적고 바로 인쇄해요.
   지킬 장치(docs/UI모듈가이드.md G9, audit-safety 후보 10):
   - 저장 기본은 "저장 안 함". "이 기기에 저장"은 스위치 + "같은 기기를 쓰는 사람이 볼 수 있어요" 확인 뒤에만(jhb.ui.plan.keep·data).
     자동 저장 없음(저장 버튼). 저장 중이면 맨 위에 "이 기기에 저장 중 · 전부 지우기" 띠. 기록 쉼(privacy.paused)이면 켜지도, 새로 쓰지도 않아요.
   - 저장하지 않은 채 떠나려 하면 확인(beforeunload, 그리고 화면 안 링크는 이 화면의 확인 상자). 전화 링크와 "지금 도움"은 막지 않아요.
   - 화면과 종이 맨 위에 고칠 수 없는 고정 줄(109·1577-0199·119). 이름·주민번호·주소·계좌 칸 없음, 약 칸은 자유 칸만.
   - 적은 글을 읽어 분석·채점·판정하지 않아요(위기어 검사 없음). 주소·바깥·음성으로 보내지 않아요. 조각(#)에는 양식 id 만.
   순수 함수(lib)는 node 에서도 require 해서 tests/plan.test.cjs 가 시험해요. */
(function (root) {
  var KEYS = { keep: 'jhb.ui.plan.keep', data: 'jhb.ui.plan.data' };
  var MAX_LEN = 1000;
  /* 양식 칸 id 로 쓰지 않는 말(테스트가 data/kb/forms.json 을 이 목록으로도 봐요) */
  var FORBIDDEN_IDS = ['name', 'rrn', 'ssn', 'resident', 'address', 'addr', 'account', 'bank', 'dose', 'dosage', 'mg', 'birth'];
  var TEXT = {
    privacy: '이 종이에는 개인 정보가 있어요. 보관에 주의하세요.',
    legal: '법적 효력이 정해진 문서가 아니에요. 담당 의사·가족과 미리 나눠 두는 메모예요.',
    device: '이 기기의 브라우저에만 저장돼요. 어디로도 보내지 않아요. 같은 기기를 쓰는 사람이 볼 수 있어요.',
    fixedHead: '지금 힘들면 바로 연락하세요',
    fixedNote: '109·1577-0199는 24시간 받아요. 전화가 어렵다면 109로 문자를 보낼 수 있어요.',
    paused: '"기록 남기지 않기"가 켜져 있어 이 기기에 저장할 수 없어요. 내 서재에서 끌 수 있어요.',
    pausedSave: '"기록 남기지 않기"가 켜져 있어 새로 저장하지 않아요. 이미 저장한 것은 그대로예요. 내 서재에서 끌 수 있어요.',
    storeFail: '저장하지 못했어요. 이 브라우저는 저장 공간을 쓸 수 없어요. 인쇄해 두세요.',
    /* 짧은 카드는 오려서 지니고 다닐 수 있어서 카드 안에도 일반 고지를 한 줄 남겨요(md.js 의 general 고지를 줄인 말) */
    cardNotice: '일반적인 정보예요. AI가 공개 자료로 초안을 쓰고, 전문가 감수는 받지 않았어요.'
  };
  /* 고정 위기 줄: 바꿀 수 없는 상수(양식 자료와 상관없이 늘 맨 위).
     번호·기관 이름·24시간·문자 안내는 공식 페이지와 글 crisis-hotlines 에서 확인했어요(tests/plan.test.cjs 가 그 글과 맞대요) */
  var TELS = [
    { num: '109', what: '자살예방상담' },
    { num: '1577-0199', what: '정신건강위기상담' },
    { num: '119', what: '응급' }
  ];
  var TELS_CHECKED = '2026-11-14';
  var TELS_SOURCES = [
    'https://www.kfsp.or.kr/',
    'https://www.madeullan.or.kr/consult/guide',
    'https://news.seoul.go.kr/welfare/archives/561837',
    'https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1479607&tag=&nPage=1'
  ];
  function escS(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  var FIXED_HTML = '<div class="pg-plan-fixed" role="note" aria-label="위기 연락처">' +
    '<p class="pg-plan-fixed-h">' + escS(TEXT.fixedHead) + '</p>' +
    '<p class="pg-plan-tels">' + TELS.map(function (t) {
      return '<a class="pg-plan-tel" href="tel:' + t.num + '"><b>' + t.num + '</b> <span>' + escS(t.what) + '</span></a>';
    }).join(' ') + '</p>' +
    '<p class="pg-plan-fixed-n">' + escS(TEXT.fixedNote) + '</p></div>';

  /* ---------- 순수 함수 ---------- */
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function normText(v) {
    if (v == null) return '';
    var s = String(v).replace(/\r\n?/g, '\n');
    return s.length > MAX_LEN ? s.slice(0, MAX_LEN) : s;
  }
  function blank(s) { return !/\S/.test(String(s == null ? '' : s)); }
  function okForm(f) { return isObj(f) && typeof f.id === 'string' && /^[a-z][a-z0-9-]*$/.test(f.id) && Array.isArray(f.sections); }
  function formList(forms) { return Array.isArray(forms) ? forms.filter(okForm) : []; }
  function sectionsOf(f) { return f.sections.filter(function (s) { return isObj(s) && Array.isArray(s.fields); }); }
  function fieldsOf(f) {
    var out = [];
    sectionsOf(f).forEach(function (s) { s.fields.forEach(function (x) { if (isObj(x) && typeof x.id === 'string' && x.id) out.push(x); }); });
    return out;
  }
  function clampN(n) { n = Math.round(Number(n)); return n >= 1 && n <= 6 ? n : 2; }
  /* 아는 양식·칸만, 글자인 값만, 공백뿐인 칸은 뺀다. 순서는 양식 자료 순서 */
  function clean(values, forms) {
    var out = {};
    if (!isObj(values)) return out;
    formList(forms).forEach(function (f) {
      var v = own(values, f.id) ? values[f.id] : null;
      if (!isObj(v)) return;
      var o = {}, n = 0;
      fieldsOf(f).forEach(function (x) {
        if (!own(v, x.id) || typeof v[x.id] !== 'string') return;
        var t = normText(v[x.id]);
        if (blank(t)) return;
        o[x.id] = t; n++;
      });
      if (n) out[f.id] = o;
    });
    return out;
  }
  function sig(values, forms) { return JSON.stringify(clean(values, forms)); }
  function hasInput(values, forms) { return Object.keys(clean(values, forms)).length > 0; }
  /* 저장 꺼짐: 적은 것이 있으면 "저장 안 됨". 켜짐: 마지막 저장과 다르면 */
  function isDirty(values, forms, keep, savedSig) { return keep ? sig(values, forms) !== savedSig : hasInput(values, forms); }

  /* 읽기만 한다(쓰지 않음). keep 이 true 일 때만 data 를 읽는다 */
  function load(store, forms) {
    var keep = store.get(KEYS.keep, false) === true;
    if (!keep) return { keep: false, values: {}, at: 0 };
    var d = store.get(KEYS.data, null);
    if (!isObj(d) || !isObj(d.forms)) return { keep: true, values: {}, at: 0 };
    var values = clean(d.forms, forms);
    var at = typeof d.at === 'number' && isFinite(d.at) && d.at > 0 ? d.at : 0;
    return { keep: true, values: values, at: Object.keys(values).length ? at : 0 };
  }
  /* 저장이 꺼졌는데 남은 값(옛 판·다른 탭·지우다 멈춘 것)을 지운다. 화면을 열 때 한 번. 지웠으면 true */
  function tidy(store) {
    if (store.get(KEYS.keep, false) === true) return false;
    var had = store.get(KEYS.data, undefined) !== undefined || store.get(KEYS.keep, undefined) !== undefined;
    if (had) { store.remove(KEYS.data); store.remove(KEYS.keep); }
    return had;
  }
  /* "저장" 버튼. 켜진 상태에서만 쓴다. 다 비었으면 data 키를 지운다(keep 은 남음). 기록 쉼이면 새로 쓰지 않는다 */
  function save(store, values, forms, now, opts) {
    if (opts && opts.paused) return { saved: false, reason: 'paused' };
    if (store.get(KEYS.keep, false) !== true) return { saved: false, reason: 'off' };
    var c = clean(values, forms);
    if (!Object.keys(c).length) { store.remove(KEYS.data); return { saved: true, values: {}, at: 0 }; }
    var at = typeof now === 'number' ? now : Date.now();
    if (!store.set(KEYS.data, { v: 1, at: at, forms: c })) return { saved: false, reason: 'store' };
    return { saved: true, values: c, at: at };
  }
  /* 스위치 켜기(확인 뒤). 지금 적은 것을 함께 저장해요. 하나라도 못 쓰면 반쯤 쓴 값을 남기지 않아요 */
  function enable(store, values, forms, opts) {
    opts = opts || {};
    if (opts.paused) return { ok: false, refused: 'paused' };
    var c = clean(values, forms), has = Object.keys(c).length > 0;
    var at = typeof opts.now === 'number' ? opts.now : Date.now();
    if (has && !store.set(KEYS.data, { v: 1, at: at, forms: c })) { store.remove(KEYS.data); return { ok: false, reason: 'store' }; }
    if (!has) store.remove(KEYS.data);
    if (!store.set(KEYS.keep, true)) { store.remove(KEYS.data); store.remove(KEYS.keep); return { ok: false, reason: 'store' }; }
    return { ok: true, values: c, at: has ? at : 0 };
  }
  function clearAll(store) { store.remove(KEYS.data); store.remove(KEYS.keep); }
  function disable(store) { clearAll(store); }

  /* 조각(#)에는 양식 id 만. 모르는 값이면 첫 양식 */
  function formFromHash(hash, forms) {
    var h = String(hash || '');
    if (h.charAt(0) === '#') h = h.slice(1);
    var ids = formList(forms).map(function (f) { return f.id; });
    return h && /^[a-z][a-z0-9-]*$/.test(h) && ids.indexOf(h) >= 0 ? h : (ids[0] || '');
  }
  function fragment(id) { return '#' + id; }

  /* 링크를 눌렀을 때 떠나기 전에 확인할지: 'guard' 확인, 'tel' 전화·문자(막지 않고 떠날 때 확인도 건너뜀), 'pass' 그대로 */
  function leaveKind(o) {
    var href = String((o && o.href) || '');
    if (!href) return 'pass';
    var u, h;
    try { h = new URL(o.here); u = new URL(href, h.href); } catch (e) { return 'pass'; }
    if (u.protocol === 'tel:' || u.protocol === 'sms:') return 'tel';
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'pass';
    if ((o.target && o.target !== '_self') || o.mods || (o.button != null && o.button !== 0) || o.download) return 'pass';
    if (u.origin === h.origin && u.pathname === h.pathname && u.search === h.search && href.indexOf('#') >= 0) return 'pass';
    return 'guard';
  }
  /* 문서 전체 클릭을 어떻게 다룰지(떠나기 확인과 위기 경로).
     o: { href, here, inHelpBtn, inSheet, inScrim, hasSheet, target, download, button, mods }
     - 'none'  : 그대로 둔다("지금 도움" 버튼·시트 바깥 가림막은 화면을 떠나지 않아요. 확인을 끄지 않아요)
     - 'tel'   : 전화·문자. 막지 않고, 그 한 번의 떠날 때 확인만 아주 잠깐 건너뛰어요
     - 'guard' : 이 화면의 떠나기 확인 상자를 열어요
     - 'sheet' : "지금 도움" 시트 안의 글 링크. 시트를 닫고 떠나기 확인 상자를 열어요
     - 'help-nav' : "지금 도움" 시트가 없어서 버튼이 위기 상담 글로 바로 가요(위기 경로라 막지 않음, 한 번만 건너뜀) */
  function clickKind(o) {
    o = o || {};
    if (o.inHelpBtn) return o.hasSheet ? 'none' : (o.href ? 'help-nav' : 'none');
    if (o.inScrim) return 'none';
    if (!o.href) return 'none';
    var k = leaveKind(o);
    if (k === 'tel') return 'tel';
    if (k !== 'guard') return 'none';
    return o.inSheet ? 'sheet' : 'guard';
  }
  /* 떠날 때 확인을 "한 번만, 짧은 동안" 건너뛰는 표(전화 링크·확인한 떠나기). take 가 한 번 쓰면 풀려요 */
  function skipGate() {
    var until = 0;
    return {
      arm: function (now, ms) { until = now + (ms > 0 ? ms : 0); },
      take: function (now) { if (until && now < until) { until = 0; return true; } until = 0; return false; },
      armed: function (now) { return !!until && now < until; }
    };
  }
  var TEL_SKIP_MS = 300, GO_SKIP_MS = 2000;

  /* 양식별 서명(빈 양식은 '') */
  function formSig(values, id, forms) {
    var c = clean(values, forms);
    return own(c, id) ? JSON.stringify(c[id]) : '';
  }
  /* 다른 탭·저장 버튼에서 합치기. base = 이 탭이 마지막으로 맞춘 저장값, local = 이 탭 화면, stored = 지금 저장소.
     이 탭에서 손대지 않은 양식(local == base)은 저장소 것을, 손댄 양식은 이 탭 것을 써요.
     conflicts: 이 탭에서 손댔고 그 사이 다른 곳에서도 그 양식을 다르게 저장한 양식 id */
  function merge(stored, local, base, forms) {
    var out = {}, conflicts = [], adopted = [];
    formList(forms).forEach(function (f) {
      var s = formSig(stored, f.id, forms), l = formSig(local, f.id, forms), b = formSig(base, f.id, forms);
      var pick;
      if (l === b) { pick = stored; if (s !== l) adopted.push(f.id); }
      else { pick = local; if (s !== b && s !== l) conflicts.push(f.id); }
      var c = clean(pick, forms);
      if (own(c, f.id)) out[f.id] = c[f.id];
    });
    return { values: out, conflicts: conflicts, adopted: adopted };
  }
  /* 탭 이름·제목이 비지 않게 */
  function tabLabel(f) { return String((f && (f.tab || f.title || f.id)) || ''); }
  function titleOf(f) { return String((f && f.title) || ''); }

  /* 종이 모형: 적은 칸은 글자 그대로, 빈 칸은 n 줄의 빈 줄. 고정 위기 줄은 늘 */
  function sheet(form, values) {
    var v = isObj(values) && own(values, form.id) && isObj(values[form.id]) ? values[form.id] : {};
    return {
      id: form.id, title: String(form.title || ''), fixed: true,
      sections: sectionsOf(form).map(function (s) {
        return {
          id: s.id, title: String(s.title || ''),
          fields: s.fields.filter(function (x) { return isObj(x) && typeof x.id === 'string'; }).map(function (x) {
            var t = own(v, x.id) && typeof v[x.id] === 'string' ? normText(v[x.id]) : '';
            if (blank(t)) t = '';
            return { id: x.id, label: String(x.label || ''), hint: String(x.hint || ''), text: t, lines: t ? 0 : clampN(x.n) };
          })
        };
      }),
      notesTitle: String(form.notesTitle || ''),
      notes: Array.isArray(form.notes) ? form.notes.filter(function (n) { return typeof n === 'string'; }) : [],
      privacy: TEXT.privacy, legal: TEXT.legal,
      /* 짧은 카드는 오려 쓰니 카드 안에도 일반 고지를 남겨요 */
      notice: form.short ? TEXT.cardNotice : ''
    };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDay(d) { return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일'; }
  function fmtSaved(ms) {
    if (!ms) return '';
    var d = new Date(ms);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  var lib = {
    KEYS: KEYS, MAX_LEN: MAX_LEN, FORBIDDEN_IDS: FORBIDDEN_IDS, TEXT: TEXT, TELS: TELS, FIXED_HTML: FIXED_HTML,
    TELS_CHECKED: TELS_CHECKED, TELS_SOURCES: TELS_SOURCES, TEL_SKIP_MS: TEL_SKIP_MS, GO_SKIP_MS: GO_SKIP_MS,
    normText: normText, clean: clean, sig: sig, hasInput: hasInput, isDirty: isDirty,
    load: load, tidy: tidy, save: save, enable: enable, disable: disable, clearAll: clearAll,
    formFromHash: formFromHash, fragment: fragment, leaveKind: leaveKind, clickKind: clickKind, skipGate: skipGate,
    formSig: formSig, merge: merge, tabLabel: tabLabel, titleOf: titleOf,
    sheet: sheet, fmtDay: fmtDay, fmtSaved: fmtSaved
  };

  /* ---------- 자바스크립트가 없을 때(검색엔진·꺼진 환경): 소개, 고정 위기 줄, 칸 이름(입력칸 없음) ---------- */
  function staticHtml(ctx) {
    var esc = ctx.esc, arts = ctx.articles || {};
    var forms = formList(ctx.data && ctx.data.forms);
    function title(slug) { var a = own(arts, slug) ? arts[slug] : null; return a && a.title ? a.title : slug; }
    function link(slug) { return '<a href="#/a/' + esc(slug) + '">' + esc(title(slug)) + '</a>'; }
    var h = '<div class="pg-plan-nojs">' + FIXED_HTML +
      '<p>' + esc('재발·위기 대비 계획, 안전 계획 카드, 내 정보 카드를 화면에서 적고 바로 인쇄하는 곳이에요. 칸에 적으려면 자바스크립트가 켜져 있어야 해요.') + '</p>' +
      '<p>' + esc('자바스크립트를 켤 수 없다면 아래 칸 이름을 종이에 옮겨 손으로 써도 돼요. ' + TEXT.legal) + '</p>';
    forms.forEach(function (f) {
      var based = Array.isArray(f.basedOn) ? f.basedOn.filter(function (s) { return typeof s === 'string'; }) : [];
      h += '<section class="pg-plan-nojs-f"><h2 class="pg-plan-h">' + esc(f.title) + '</h2>' +
        (f.lead ? '<p>' + esc(f.lead) + '</p>' : '') +
        (based.length ? '<p class="pg-plan-basis">' + esc('바탕 글: ') + based.map(link).join(', ') + '</p>' : '');
      sectionsOf(f).forEach(function (s) {
        h += '<h3 class="pg-plan-sh">' + esc(s.title) + '</h3><ul>' + s.fields.filter(isObj).map(function (x) {
          return '<li>' + esc(x.label) + (x.hint ? ' <span class="pg-plan-hint">(' + esc(x.hint) + ')</span>' : '') + '</li>';
        }).join('') + '</ul>';
      });
      h += '</section>';
    });
    if (!forms.length) h += '<p>' + esc('양식 자료를 불러오지 못했어요. 새로고침해 보세요.') + '</p>';
    return h + '</div>';
  }

  /* ---------- 화면 ---------- */
  function render(mount, ctx) {
    var app = ctx.app, el = ctx.el, store = app.store, arts = app.bySlug || {};
    var forms = formList(ctx.data && ctx.data.forms).filter(function (f) { return fieldsOf(f).length > 0; });
    if (!forms.length) { mount.appendChild(el('p.fp-fail', { role: 'status' }, ['양식 자료를 불러오지 못했어요. 새로고침해 보세요.'])); return; }
    var ids = forms.map(function (f) { return f.id; });
    function formById(id) { return forms[ids.indexOf(id)] || null; }

    /* 기록 종류 등록: 코어(js/app.js 의 BASE_KINDS)가 모든 화면에서 같은 값으로 등록해요(K5-1). 같은 id 는 덮어쓰니
       여기서 다시 불러도 바뀌지 않고, 배포 직후 옛 app.js 가 캐시에 남은 기기에서도 이 화면에서는 내 서재 API(has·clear)가 이 키를 알아요 */
    if (app.privacy && typeof app.privacy.register === 'function') app.privacy.register({ id: 'plan', label: '미리 써 두는 종이', keys: [KEYS.keep, KEYS.data] });
    function paused() { return !!(app.privacy && app.privacy.paused()); }

    tidy(store);
    var first = load(store, forms);
    var values = JSON.parse(JSON.stringify(first.values));  /* 화면에 적은 것(메모리에만. 저장은 버튼으로) */
    /* base: 이 탭이 마지막으로 맞춘 저장값(켜짐일 때). 다른 탭과 양식 단위로 합칠 때 써요 */
    var keep = first.keep, base = keep ? clean(first.values, forms) : {}, savedSig = keep ? sig(base, forms) : '', savedAt = first.at;
    var cur = formFromHash(location.hash, forms);
    var dirty = false, gate = skipGate(), leaveHref = '', leaveFrom = null, leaveBack = null, clearFrom = null;

    function artTitle(slug) { var a = arts[slug]; return a && a.title ? a.title : slug; }
    function artLink(slug) { return el('a', { href: app.L('#/a/' + slug) }, [artTitle(slug)]); }

    /* --- 고정 위기 줄(고칠 수 없음) --- */
    var fixed = el('div.pg-plan-fixed', { role: 'note', 'aria-label': '위기 연락처' }, [
      el('p.pg-plan-fixed-h', null, [TEXT.fixedHead]),
      el('p.pg-plan-tels', null, TELS.map(function (t) { return el('a.pg-plan-tel', { href: 'tel:' + t.num }, [el('b', null, [t.num]), ' ', el('span', null, [t.what])]); })),
      el('p.pg-plan-fixed-n', null, [TEXT.fixedNote])
    ]);

    /* --- 저장 상태 ---
       띠는 저장 상자 밖(화면 몸통 바로 아래)에 두고 위에 붙여 따라오게 해요(긴 양식을 내려가며 써도 "저장 중"이 보이게) */
    var band = el('div.pg-plan-band', { hidden: true, role: 'region', 'aria-label': '이 기기 저장 상태' }, [
      el('span.pg-plan-dot', { 'aria-hidden': 'true' }),
      el('span.pg-plan-bandt', null, ['이 기기에 저장 중']),
      el('span.pg-plan-sep', { 'aria-hidden': 'true' }, ['·']),
      el('button.pg-plan-link', { type: 'button', 'data-act': 'clear', 'aria-label': '이 기기에 저장한 것과 적은 내용 전부 지우기' }, ['전부 지우기'])
    ]);
    /* 다른 탭에서 저장한 것이 들어왔을 때 띠에 붙는 짧은 알림(자세한 말은 위 상태 줄이 읽어 줘요) */
    var bandNote = el('span.pg-plan-bandnote', { hidden: true });
    band.appendChild(bandNote);
    var where = el('p.pg-plan-where');
    var sw = el('button.pg-plan-switch', { type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-describedby': 'pg-plan-sw-d' }, [
      el('span.pg-plan-track', { 'aria-hidden': 'true' }, [el('span.pg-plan-thumb')]),
      el('span.pg-plan-swt', null, ['이 기기에 저장'])
    ]);
    var swDesc = el('p.pg-plan-swdesc', { id: 'pg-plan-sw-d' });
    var onYes = el('button.btn.pg-plan-primary', { type: 'button', 'data-act': 'on-yes', 'aria-describedby': 'pg-plan-on-d' }, ['저장 켜기']);
    /* 켤 때 안내는 공용 기기 고지(JHB.app.notice('device'))와 같은 글자. 없으면 같은 뜻의 고정 문구 */
    var deviceText = (function () { var n = app.notice ? app.notice('device') : null; var t = n ? String(n.textContent || '').replace(/\s+/g, ' ').trim() : ''; return t || TEXT.device; })();
    var askOn = el('div.pg-plan-confirm', { hidden: true, role: 'group', 'aria-labelledby': 'pg-plan-on-t' }, [
      el('p.pg-plan-confirm-t', { id: 'pg-plan-on-t' }, ['이 기기에 저장할까요?']),
      el('p.pg-plan-confirm-d', { id: 'pg-plan-on-d' }, [deviceText + ' 켠 뒤에 바꾼 내용은 "저장"을 눌러야 남아요. "전부 지우기"로 언제든 지울 수 있어요.']),
      el('div.pg-plan-confirm-acts', null, [onYes, el('button.btn', { type: 'button', 'data-act': 'on-no' }, ['그만두기'])])
    ]);
    var statusTop = el('p.pg-plan-status', { role: 'status' });
    var storeBox = el('div.pg-plan-store', null, [where, el('div.pg-plan-swrow', null, [sw]), swDesc, askOn, statusTop]);

    /* --- 양식 고르기(탭) --- */
    var tabs = el('div.pg-plan-tabs', { role: 'tablist', 'aria-label': '종이 고르기' }, forms.map(function (f) {
      return el('button.pg-plan-tab', { type: 'button', role: 'tab', id: 'pg-plan-tab-' + f.id, 'aria-controls': 'pg-plan-panel', 'data-form': f.id }, [tabLabel(f)]);
    }));
    var panel = el('div.pg-plan-panel', { id: 'pg-plan-panel', role: 'tabpanel' });
    var legalLine = el('p.pg-plan-legal');

    /* --- 인쇄·저장·지우기 --- */
    var printBtn = el('button.btn.pg-plan-primary', { type: 'button', 'data-act': 'print' }, ['인쇄하기']);
    var saveBtn = el('button.btn.pg-plan-save', { type: 'button', 'data-act': 'save', hidden: true, 'aria-describedby': 'pg-plan-save-d' }, ['저장']);
    var clearBtn = el('button.btn.pg-plan-clearbtn', { type: 'button', 'data-act': 'clear' }, ['적은 내용 지우기']);
    var saveNote = el('p.pg-plan-savenote', { id: 'pg-plan-save-d' });
    var clearYes = el('button.btn.pg-plan-danger', { type: 'button', 'data-act': 'clear-yes', 'aria-describedby': 'pg-plan-cl-d' }, ['모두 지우기']);
    var clearDesc = el('p.pg-plan-confirm-d', { id: 'pg-plan-cl-d' });
    var askClear = el('div.pg-plan-confirm', { hidden: true, role: 'group', 'aria-labelledby': 'pg-plan-cl-t' }, [
      el('p.pg-plan-confirm-t', { id: 'pg-plan-cl-t' }, ['모두 지울까요?']),
      clearDesc,
      el('div.pg-plan-confirm-acts', null, [clearYes, el('button.btn', { type: 'button', 'data-act': 'clear-no' }, ['그만두기'])])
    ]);
    var statusBottom = el('p.pg-plan-status', { role: 'status' });
    var actions = el('div.pg-plan-actions', null, [
      el('div.pg-plan-actrow', null, [printBtn, saveBtn, clearBtn]), saveNote, askClear, statusBottom
    ]);

    /* --- 인쇄용 종이(화면에서는 숨김) --- */
    var paper = el('div.pg-plan-sheet');

    /* --- 떠나기 전 확인 --- */
    var stayBtn = el('button.btn.pg-plan-primary', { type: 'button', 'data-act': 'stay' }, ['이 화면에 있기']);
    var saveLeaveBtn = el('button.btn', { type: 'button', 'data-act': 'save-leave' }, ['저장하고 떠나기']);
    var leaveBtn = el('button.btn', { type: 'button', 'data-act': 'leave' }, ['저장하지 않고 떠나기']);
    var lvDesc = el('p.pg-plan-lv-d', { id: 'pg-plan-lv-d' });
    var dlg = typeof root.HTMLDialogElement === 'function'
      ? el('dialog.pg-plan-leave', { 'aria-labelledby': 'pg-plan-lv-t', 'aria-describedby': 'pg-plan-lv-d' }, [
        el('h2.pg-plan-lv-t', { id: 'pg-plan-lv-t' }, ['적은 내용을 아직 저장하지 않았어요']),
        lvDesc,
        el('div.pg-plan-lv-acts', null, [stayBtn, saveLeaveBtn, leaveBtn])
      ]) : null;

    [fixed, band, storeBox, tabs, panel, legalLine, actions, paper, dlg].forEach(function (n) { if (n) mount.appendChild(n); });

    /* ---------- 그리기 ---------- */
    function say(where_, text) {
      statusTop.textContent = ''; statusBottom.textContent = '';
      if (text) (where_ === 'top' ? statusTop : statusBottom).textContent = text;
    }
    function paintStore() {
      var p = paused();
      band.hidden = !keep;
      sw.setAttribute('aria-checked', keep ? 'true' : 'false');
      if (!keep && p) sw.setAttribute('aria-disabled', 'true'); else sw.removeAttribute('aria-disabled');
      if (keep) askOn.hidden = true;
      where.textContent = !keep ? '이 화면은 기본으로 저장하지 않아요. 쓰고 바로 인쇄하세요. 이 화면을 떠나면 적은 내용이 사라져요. 아래 "이 기기에 저장"을 켤 때만 맨 아래 안내처럼 이 기기에 남아요.'
        : (savedAt ? '마지막으로 저장한 때: ' + fmtSaved(savedAt) + '.' : '이 기기에 저장한 내용이 아직 없어요.') + (p ? ' ' + TEXT.pausedSave : '');
      swDesc.textContent = !keep ? (p ? TEXT.paused : '켜면 이 기기의 브라우저에 남아요. 같은 기기를 쓰는 사람이 볼 수 있어요.')
        : '끄면 이 기기에 저장한 것을 지워요. 화면에 적은 내용은 남아요.';
      saveBtn.hidden = !keep;
      if (keep && p) saveBtn.setAttribute('aria-disabled', 'true'); else saveBtn.removeAttribute('aria-disabled');
      paintNote();
    }
    function paintNote() {
      var t = !keep ? (dirty ? '아직 저장하지 않았어요. 이 화면을 떠나면 사라지니 먼저 인쇄하세요.' : '적은 내용은 저장하지 않아요. 쓰고 바로 인쇄하세요.')
        : paused() ? TEXT.pausedSave
          : dirty ? '저장한 뒤 바꾼 내용이 있어요. "저장"을 눌러야 이 기기에 남아요.'
            : savedAt ? '모두 저장했어요(' + fmtSaved(savedAt) + ').' : '저장할 내용이 아직 없어요.';
      if (saveNote.textContent !== t) saveNote.textContent = t;
    }
    function paintTabs() {
      Array.prototype.forEach.call(tabs.children, function (b) {
        var on = b.getAttribute('data-form') === cur;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.setAttribute('tabindex', on ? '0' : '-1');
      });
      panel.setAttribute('aria-labelledby', 'pg-plan-tab-' + cur);
    }
    /* 칸 높이를 글에 맞춰요: 먼저 rows 높이로 되돌린 뒤 넘치면 늘려요(지우면 줄어들어요).
       줄어들 때 페이지가 튀지 않게 재는 동안 스크롤 위치를 지켜요 */
    function grow(t) {
      var y = root.pageYOffset;
      t.style.height = '';
      if (t.value && t.scrollHeight > t.clientHeight + 1) t.style.height = (t.scrollHeight + 2) + 'px';
      if (root.pageYOffset !== y) root.scrollTo(root.pageXOffset, y);
    }
    var regrowRaf = 0;
    function regrowAll() {
      if (regrowRaf) return;
      var run = function () {
        regrowRaf = 0;
        Array.prototype.forEach.call(panel.querySelectorAll('textarea.pg-plan-ta'), function (t) { if (t.value || t.style.height) grow(t); });
      };
      regrowRaf = typeof root.requestAnimationFrame === 'function' ? root.requestAnimationFrame(run) : setTimeout(run, 16);
    }
    /* 짧은 카드는 화면에서 한 줄부터(적으면 늘어나요). 종이에는 n 줄 그대로 */
    function rowsFor(f, x) { return f.short ? 1 : clampN(x.n); }
    function fieldEl(f, x, v) {
      var id = 'pg-plan-' + f.id + '-' + x.id, hintId = id + '-h';
      var ta = el('textarea.pg-plan-ta', {
        id: id, rows: String(rowsFor(f, x)), maxlength: String(MAX_LEN),
        autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false',
        'data-form': f.id, 'data-field': x.id, 'aria-describedby': x.hint ? hintId : null
      });
      ta.value = own(v, x.id) && typeof v[x.id] === 'string' ? v[x.id] : '';
      return el('div.pg-plan-field', null, [
        el('label.pg-plan-label', { for: id }, [String(x.label || '')]),
        x.hint ? el('p.pg-plan-hint', { id: hintId }, [String(x.hint)]) : null,
        ta
      ]);
    }
    function buildPanel() {
      var f = formById(cur), v = isObj(values[f.id]) ? values[f.id] : {};
      var based = (Array.isArray(f.basedOn) ? f.basedOn : []).filter(function (s) { return typeof s === 'string'; });
      var kids = [
        el('h2.pg-plan-ftitle', { id: 'pg-plan-ft', tabindex: '-1' }, [titleOf(f) || tabLabel(f)]),
        f.lead ? el('p.pg-plan-flead', null, [String(f.lead)]) : null,
        based.length ? el('p.pg-plan-basis', null, ['바탕 글: '].concat(based.reduce(function (a, s, i) { if (i) a.push(', '); a.push(artLink(s)); return a; }, []))) : null
      ];
      sectionsOf(f).forEach(function (s, si) {
        var hid = 'pg-plan-s-' + f.id + '-' + si;
        /* 바탕 글이 하나뿐이고 같은 글이면 위 "바탕 글" 줄에 링크가 있으니 여기서는 글자로만(링크·Tab 이 겹치지 않게) */
        var same = based.length === 1 && s.help && s.help.slug === based[0];
        var help = s.help && s.help.quote ? el('p.pg-plan-why', null, [
          el('span.pg-plan-q', null, ['“' + s.help.quote + '”']), ' ',
          el('span.pg-plan-from', null, ['— ', same ? '바탕 글에서' : s.help.slug ? artLink(s.help.slug) : null])
        ]) : null;
        kids.push(el('section.pg-plan-sec', { 'aria-labelledby': hid }, [el('h3.pg-plan-sh', { id: hid }, [String(s.title || '')]), help]
          .concat(s.fields.filter(function (x) { return isObj(x) && typeof x.id === 'string'; }).map(function (x) { return fieldEl(f, x, v); }))));
      });
      var notes = Array.isArray(f.notes) ? f.notes.filter(function (n) { return typeof n === 'string'; }) : [];
      if (notes.length) {
        kids.push(el('div.pg-plan-notes', null, [
          f.notesTitle ? el('p.pg-plan-notes-t', null, [String(f.notesTitle)]) : null,
          el('ul', null, notes.map(function (n) { return el('li', null, [n]); }))
        ]));
      }
      /* 법적 효력 문구는 종이(패널) 바로 아래에(짧은 카드가 휴대폰 한 화면에 들어가게) */
      legalLine.textContent = '';
      [TEXT.legal].concat(f.legal && arts[f.legal]
        ? [' 이렇게 미리 적어 두는 문서를 한국 법에서 어떻게 보는지는 ', artLink(f.legal), '에 있어요.'] : []).forEach(function (n) {
        legalLine.appendChild(typeof n === 'string' ? document.createTextNode(n) : n);
      });
      panel.textContent = '';
      if (f.short) panel.classList.add('pg-plan-short'); else panel.classList.remove('pg-plan-short');
      kids.forEach(function (n) { if (n) panel.appendChild(n); });
      Array.prototype.forEach.call(panel.querySelectorAll('textarea.pg-plan-ta'), function (t) { if (t.value) grow(t); });
    }
    function lines(n) { var out = []; for (var i = 0; i < n; i++) out.push(el('span.pg-plan-line', { 'aria-hidden': 'true' })); return out; }
    function paintSheet() {
      var f = formById(cur), m = sheet(f, values);
      paper.textContent = '';
      paper.setAttribute('data-form', f.id);
      if (f.short) paper.setAttribute('data-short', ''); else paper.removeAttribute('data-short');
      paper.appendChild(el('div.pg-plan-sh-fixed', null, [el('b', null, [TEXT.fixedHead + ': '])]
        .concat(TELS.reduce(function (a, t, i) { if (i) a.push(' · '); a.push(el('span.pg-plan-sh-tel', null, [el('b', null, [t.num]), ' ' + t.what])); return a; }, []))
        .concat([el('br'), TEXT.fixedNote])));
      paper.appendChild(el('div.pg-plan-sh-head', null, [
        el('h2.pg-plan-sh-title', null, [m.title]),
        el('p.pg-plan-sh-date', null, ['인쇄한 날 ' + fmtDay(new Date())]),
        el('p.pg-plan-sh-keep', null, [m.privacy])
      ]));
      m.sections.forEach(function (s) {
        paper.appendChild(el('section.pg-plan-sh-sec', null, [el('h3.pg-plan-sh-h', null, [s.title])].concat(s.fields.map(function (x) {
          return el('div.pg-plan-sh-f', null, [el('p.pg-plan-sh-l', null, [x.label]), x.text ? el('p.pg-plan-sh-t', null, [x.text]) : null].concat(lines(x.lines)));
        }))));
      });
      if (m.notes.length) {
        paper.appendChild(el('div.pg-plan-sh-notes', null, [
          m.notesTitle ? el('p.pg-plan-sh-nt', null, [m.notesTitle]) : null,
          el('ul', null, m.notes.map(function (n) { return el('li', null, [n]); }))
        ]));
      }
      var based = (Array.isArray(f.basedOn) ? f.basedOn : []).filter(function (s) { return typeof s === 'string'; });
      paper.appendChild(el('p.pg-plan-sh-legal', null, [m.legal + (based.length ? ' 바탕 글: 조현병 백과 ' + based.map(function (s) { return '「' + artTitle(s) + '」'; }).join(', ') + '.' : '') +
        (m.notice ? ' ' + m.notice : '')]));
    }

    /* ---------- 저장하지 않은 채 떠나기 ---------- */
    function onBeforeUnload(e) {
      /* 전화 링크·확인한 떠나기 바로 뒤의 그 한 번만 건너뛰어요(쓰면 바로 풀려요) */
      if (gate.take(Date.now()) || !dirty) return undefined;
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
    function pass(ms) { gate.arm(Date.now(), ms); }
    function updateDirty() {
      var d = isDirty(values, forms, keep, savedSig);
      if (d !== dirty) {
        dirty = d;
        if (d) root.addEventListener('beforeunload', onBeforeUnload);
        else root.removeEventListener('beforeunload', onBeforeUnload);
      }
      paintNote();
    }
    /* 화면 안 링크(목차·하단 바·글 링크 등)는 이 화면의 확인 상자로.
       전화·문자 링크는 막지 않고, "지금 도움" 버튼과 시트 열기·닫기도 그대로 둬요(확인을 끄지 않아요).
       시트 안의 글 링크는 시트를 닫고 이 화면의 확인 상자로 보내요 */
    function onDocClick(e) {
      if (!dirty || e.defaultPrevented) return;
      var t = e.target && e.target.closest ? e.target : (e.target && e.target.parentElement);
      if (!t || !t.closest) return;
      var a = t.closest('a[href]');
      var nh = root.JHB && root.JHB.ui && root.JHB.ui.nowhelp;
      var helpBtn = t.closest('#btn-help, .tool-help');
      var k = clickKind({
        href: a ? a.href : (helpBtn && helpBtn.href) || '', here: location.href,
        inHelpBtn: !!helpBtn, hasSheet: !!(nh && typeof nh.open === 'function'),
        inSheet: !!t.closest('.nh-sheet'), inScrim: !!t.closest('.nh-scrim'),
        target: a ? a.getAttribute('target') : null, download: !!(a && a.hasAttribute('download')),
        button: e.button, mods: e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
      });
      if (k === 'tel') { pass(TEL_SKIP_MS); return; }
      if (k === 'help-nav') { pass(GO_SKIP_MS); return; }
      if (k === 'guard') { e.preventDefault(); e.stopPropagation(); openLeave(a); return; }
      if (k === 'sheet') {
        e.preventDefault(); e.stopPropagation();
        /* 시트를 닫아야(뒤 화면 inert 가 풀려야) 이 화면의 확인 상자를 누를 수 있어요. 돌아올 곳은 "지금 도움" 버튼 */
        if (nh && typeof nh.close === 'function') nh.close();
        openLeave(a, document.getElementById('btn-help'));
      }
    }
    function openLeave(a, back) {
      leaveHref = a.href; leaveFrom = a; leaveBack = back || null;
      lvDesc.textContent = keep ? '저장한 뒤 바꾼 내용은 이 화면을 떠나면 사라져요.'
        : '이 화면을 떠나면 적은 내용이 사라져요. 먼저 인쇄하거나 "이 기기에 저장"을 켤 수 있어요.';
      saveLeaveBtn.hidden = !(keep && !paused());
      if (dlg && typeof dlg.showModal === 'function') {
        try { dlg.showModal(); } catch (err) { dlg.setAttribute('open', ''); }
        stayBtn.focus();
      } else if (typeof root.confirm === 'function' && root.confirm(lvDesc.textContent + ' 그래도 떠날까요?')) go();
    }
    function backTarget() {
      var n = leaveBack || leaveFrom;
      return n && document.contains(n) && n.getClientRects().length ? n : null;
    }
    function closeLeave(refocus) {
      if (dlg && dlg.open) dlg.close();
      var n = refocus ? backTarget() : null;
      if (n) { try { n.focus(); } catch (err) { } }
    }
    function go() { pass(GO_SKIP_MS); var h = leaveHref; closeLeave(false); if (h) location.href = h; }

    /* ---------- 동작 ---------- */
    function select(id, opts) {
      opts = opts || {};
      if (!formById(id)) return;
      var changed = id !== cur;
      cur = id;
      paintTabs();
      if (changed) buildPanel();
      if (opts.hash !== false && location.hash) {
        /* 양식을 바꿀 때는 주소에 양식 이름을 새로 남기지 않아요(방문 기록·주소창 자동 완성에 "안전 계획 카드"가 남지 않게).
           들어올 때 붙어 온 조각(#양식 id)만 읽고, 바꾸면 조각을 걷어요. 새 기록을 쌓지 않게 replaceState */
        try { history.replaceState(history.state, '', location.pathname); } catch (err) { }
      }
      if (opts.focusTab) { var b = document.getElementById('pg-plan-tab-' + id); if (b) b.focus(); }
    }
    function onSwitch() {
      if (keep) {
        disable(store);
        keep = false; base = {}; savedSig = ''; savedAt = 0; note('');
        updateDirty(); paintStore();
        say('top', hasInput(values, forms) ? '이 기기에서 지웠어요. 적은 내용은 이 화면에만 남아 있어요. 떠나기 전에 인쇄하세요.' : '이 기기에서 지웠어요.');
        return;
      }
      if (paused()) { say('top', TEXT.paused); return; }
      if (!askClear.hidden) closeClear(false);  /* 확인 상자는 한 번에 하나만 */
      askOn.hidden = false;
      say('top', '');
      onYes.focus();
    }
    function turnOn() {
      var r = enable(store, values, forms, { paused: paused(), now: Date.now() });
      askOn.hidden = true;
      if (!r.ok) { say('top', r.refused === 'paused' ? TEXT.paused : TEXT.storeFail); sw.focus(); return; }
      keep = true; base = clean(r.values, forms); savedSig = sig(base, forms); savedAt = r.at;
      updateDirty(); paintStore();
      say('top', r.at ? '이 기기에 저장했어요. 다음에 이 화면을 열면 그대로 있어요. 바꾼 뒤에는 "저장"을 눌러요.' : '이 기기에 저장을 켰어요. 적은 뒤 "저장"을 눌러요.');
      sw.focus();
    }
    function onSave() {
      if (!keep) return;
      if (paused()) { say('bottom', TEXT.pausedSave); return; }
      if (!dirty) { say('bottom', savedAt ? '바뀐 내용이 없어요. 이미 저장돼 있어요.' : '저장할 내용이 아직 없어요.'); return; }
      /* 저장 직전에 저장소를 다시 읽어 양식 단위로 합쳐요: 이 탭에서 손대지 않은 종이는 다른 탭이 저장한 것을 그대로 둬요 */
      var latest = load(store, forms);
      if (!latest.keep) { resync(); say('bottom', '다른 곳에서 이 기기 저장을 껐어요. 다시 켜야 저장할 수 있어요.'); return false; }
      var mg = merge(latest.values, values, base, forms);
      var r = save(store, mg.values, forms, Date.now(), { paused: false });
      if (!r.saved) {
        if (r.reason === 'off') { resync(); say('bottom', '다른 곳에서 이 기기 저장을 껐어요. 다시 켜야 저장할 수 있어요.'); }
        else say('bottom', TEXT.storeFail);
        return false;
      }
      adopt(mg); note('');
      base = clean(r.values, forms); savedSig = sig(base, forms); savedAt = r.at;
      updateDirty(); paintStore();
      say('bottom', (r.at ? '저장했어요. 이 기기의 브라우저에만 있어요.' : '모두 비운 채로 저장했어요. 이 기기에 남은 내용이 없어요.') +
        (mg.adopted.length ? ' 다른 탭에서 저장한 ' + names(mg.adopted) + '도 함께 남겼어요.' : '') +
        (mg.conflicts.length ? ' ' + names(mg.conflicts) + '는 다른 탭에서도 고쳤는데, 이 화면 것으로 저장했어요.' : ''));
      return true;
    }
    function names(list) { return list.map(function (id) { var f = formById(id); return '「' + (f ? tabLabel(f) : id) + '」'; }).join(', '); }
    /* 합친 값을 화면에 들여요(이 탭에서 손대지 않은 양식만 바뀌어요). 보고 있는 양식이 바뀌었으면 다시 그려요 */
    function adopt(mg) {
      var next = JSON.parse(JSON.stringify(mg.values));
      forms.forEach(function (f) { if (mg.adopted.indexOf(f.id) < 0 && own(values, f.id)) next[f.id] = values[f.id]; });
      var redraw = mg.adopted.indexOf(cur) >= 0;
      var y = root.pageYOffset, act = document.activeElement, focusId = act && panel.contains(act) ? act.id : '';
      values = next;
      if (redraw) {
        buildPanel();
        var n = focusId && document.getElementById(focusId);
        if (n) { try { n.focus({ preventScroll: true }); } catch (err) { } }
        if (root.pageYOffset !== y) root.scrollTo(root.pageXOffset, y);
      }
    }
    function openClear(from) {
      if (!keep && !hasInput(values, forms)) { say(from === band ? 'top' : 'bottom', '지울 내용이 없어요.'); return; }
      clearFrom = from;
      askOn.hidden = true;  /* 확인 상자는 한 번에 하나만 */
      clearDesc.textContent = keep ? '세 종이에 적은 내용과 이 기기에 저장한 것을 모두 지워요. 되돌릴 수 없어요.'
        : '세 종이에 적은 내용을 모두 지워요. 되돌릴 수 없어요.';
      /* 누른 자리 가까이에 확인 상자를 둬요(맨 위 띠에서 누르면 맨 위에) */
      if (from === band) storeBox.insertBefore(askClear, where); else actions.insertBefore(askClear, statusBottom);
      askClear.hidden = false;
      say('', '');
      clearYes.focus();
    }
    function closeClear(refocus) {
      askClear.hidden = true;
      if (refocus) { var b = clearFrom === band ? band.querySelector('[data-act="clear"]') : clearBtn; if (b && !b.hidden) b.focus(); }
      clearFrom = null;
    }
    function doClear() {
      var from = clearFrom;
      clearAll(store);
      values = {}; keep = false; base = {}; savedSig = ''; savedAt = 0; note('');
      askOn.hidden = true;
      closeClear(false);
      buildPanel(); updateDirty(); paintStore(); paintSheet();
      say(from === band ? 'top' : 'bottom', '모두 지웠어요. 이 기기와 이 화면에 남은 내용이 없어요.');
      var b = document.getElementById('pg-plan-tab-' + cur); if (b) b.focus();
    }
    function onPrint() {
      paintSheet();
      var pr = root.JHB && root.JHB.ui && root.JHB.ui.print;
      if (pr && typeof pr.print === 'function') pr.print();
      else if (typeof root.print === 'function') root.print();
    }
    /* 다른 탭·내 서재·기록 쉼이 바뀌면 다시 읽어요(읽기만, 쓰지 않음).
       이 탭에서 손대지 않은 종이는 다른 탭이 저장한 것으로 화면을 바꾸고, 손댄 종이는 화면 글자를 그대로 두고 알려요 */
    function resync() {
      var s2 = load(store, forms), was = keep;
      keep = s2.keep;
      if (!keep) {
        base = {}; savedSig = ''; savedAt = 0;
        updateDirty(); paintStore();
        if (was) say('top', '이 기기에 저장한 종이를 다른 곳에서 지웠어요. 화면에 적은 내용은 아직 남아 있어요.');
        return;
      }
      var mg = merge(s2.values, values, was ? base : {}, forms);
      adopt(mg);
      base = clean(s2.values, forms); savedSig = sig(base, forms); savedAt = s2.at;
      updateDirty(); paintStore();
      var msg = !was ? '다른 곳에서 이 기기 저장을 켰어요.' + (mg.adopted.length ? ' 거기서 저장한 ' + names(mg.adopted) + '를 이 화면에 불러왔어요.' : '') + ' 이 화면에서 바꾼 내용은 "저장"을 눌러야 남아요.'
        : mg.adopted.length || mg.conflicts.length ? '다른 탭에서 저장한 내용이 있어요.' +
          (mg.adopted.length ? ' ' + names(mg.adopted) + '를 그 내용으로 불러왔어요.' : '') +
          (mg.conflicts.length ? ' ' + names(mg.conflicts) + '는 이 화면에서도 고쳐서 화면 글자를 그대로 뒀어요. "저장"을 누르면 이 화면 것으로 바뀌어요.' : '')
          : '';
      if (msg) say('top', msg);
      if (!was || mg.adopted.length || mg.conflicts.length) note(mg.conflicts.length ? '다른 탭에서도 고친 종이가 있어요' : '다른 탭에서 저장한 내용을 불러왔어요');
    }
    function note(t) { bandNote.textContent = t || ''; bandNote.hidden = !t; }

    function onClick(e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || !mount.contains(b)) return;
      if (b.getAttribute('role') === 'tab') { select(b.getAttribute('data-form')); return; }
      if (b === sw) { onSwitch(); return; }
      var act = b.getAttribute('data-act');
      if (act === 'on-yes') return turnOn();
      if (act === 'on-no') { askOn.hidden = true; say('top', '켜지 않았어요. 적은 내용은 저장하지 않아요.'); sw.focus(); return; }
      if (act === 'save') return onSave();
      if (act === 'print') return onPrint();
      if (act === 'clear') return openClear(band.contains(b) ? band : clearBtn);
      if (act === 'clear-yes') return doClear();
      if (act === 'clear-no') return closeClear(true);
      if (act === 'stay') return closeLeave(true);
      if (act === 'leave') return go();
      if (act === 'save-leave') { if (onSave()) go(); else closeLeave(true); }
    }
    function onInput(e) {
      var t = e.target;
      if (!t || t.tagName !== 'TEXTAREA' || !t.classList.contains('pg-plan-ta')) return;
      var f = t.getAttribute('data-form'), k = t.getAttribute('data-field');
      if (!formById(f)) return;
      if (!isObj(values[f])) values[f] = {};
      values[f][k] = normText(t.value);
      grow(t);
      updateDirty();
    }
    function onTabKey(e) {
      var i = ids.indexOf(cur), n = ids.length, j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % n;
      else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      if (j < 0) return;
      e.preventDefault();
      select(ids[j], { focusTab: true });
    }
    function onConfirmKey(e) {
      if (e.key !== 'Escape') return;
      if (!askClear.hidden && askClear.contains(e.target)) { e.preventDefault(); closeClear(true); }
      else if (!askOn.hidden && askOn.contains(e.target)) { e.preventDefault(); askOn.hidden = true; sw.focus(); }
    }
    function onHash() {
      var id = formFromHash(location.hash, forms);
      if (location.hash === fragment(id) && id !== cur) select(id, { hash: false });
    }
    function onStorage(e) { if (!e.key || e.key.indexOf('jhb.ui.plan.') === 0 || e.key.indexOf('jhb.privacy.') === 0) resync(); }
    function onPrivacy() { resync(); }
    function onShow(e) { if (e.persisted) resync(); }
    /* 떠난 화면이 브라우저의 뒤로 가기 저장(bfcache)에 들어갈 때: 저장하지 않은 글은 지우고 저장한 것만 남겨요.
       "떠나면 사라져요"라고 알린 대로, 같은 기기의 다른 사람이 뒤로 가기로 볼 수 없게 */
    function onHide(e) {
      if (!e.persisted) return;
      var s2 = load(store, forms);
      values = JSON.parse(JSON.stringify(s2.values));
      keep = s2.keep; base = keep ? clean(s2.values, forms) : {}; savedSig = keep ? sig(base, forms) : ''; savedAt = s2.at; note('');
      askOn.hidden = true; askClear.hidden = true;
      if (dlg && dlg.open) dlg.close();
      buildPanel(); paper.textContent = '';
      updateDirty(); paintStore(); say('', '');
    }

    mount.addEventListener('click', onClick);
    mount.addEventListener('input', onInput);
    mount.addEventListener('keydown', onConfirmKey);
    tabs.addEventListener('keydown', onTabKey);
    if (dlg) dlg.addEventListener('close', function () { var n = backTarget(); if (n && !dlg.contains(document.activeElement) && document.activeElement === document.body) { try { n.focus(); } catch (err) { } } });
    document.addEventListener('click', onDocClick, true);
    root.addEventListener('hashchange', onHash);
    root.addEventListener('storage', onStorage);
    root.addEventListener('jhb:privacy', onPrivacy);
    root.addEventListener('pageshow', onShow);
    root.addEventListener('pagehide', onHide);
    root.addEventListener('beforeprint', paintSheet);
    /* 글자 크기·화면 폭이 바뀌면 칸 높이를 다시 재요 */
    root.addEventListener('jhb:layout', regrowAll);
    root.addEventListener('resize', regrowAll);
    ctx.onCleanup(function () {
      root.removeEventListener('pagehide', onHide);
      document.removeEventListener('click', onDocClick, true);
      root.removeEventListener('beforeunload', onBeforeUnload);
      root.removeEventListener('hashchange', onHash);
      root.removeEventListener('storage', onStorage);
      root.removeEventListener('jhb:privacy', onPrivacy);
      root.removeEventListener('pageshow', onShow);
      root.removeEventListener('beforeprint', paintSheet);
      root.removeEventListener('jhb:layout', regrowAll);
      root.removeEventListener('resize', regrowAll);
      if (dlg && dlg.open) dlg.close();
    });

    paintTabs();
    buildPanel();
    updateDirty();
    paintStore();
    paintSheet();
    regrowAll();
  }

  var page = { id: 'plan', staticHtml: staticHtml, render: render, lib: lib };
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
