/* 조현병 백과 · 진료 질문 바구니 화면 (ask/, 선언은 data/pages/ask.json)
   - 글의 '담당 의사에게 물어볼 것'에서 담은 질문(js/ui/ask.js 의 JHB.ui.ask)을 글 제목별로 묶어 보여 줘요.
     위·아래 버튼으로 순서 바꾸기(끌기 없음), 하나씩 빼기·전부 지우기(되돌리기), 내 질문 한 줄 더하기.
   - 인쇄: 화면에서는 숨긴 종이(.pg-ask-sheet)를 늘 같은 내용으로 그려 두고, 인쇄할 때만 그 종이를 보여요.
     머리에 인쇄한 날, 질문마다 답 적을 빈 줄, "첫 진료 준비"는 입력칸 없이 종이의 빈 줄로만. 바닥 고지는 화면 장치가 붙이는 고지 줄.
   - 저장 기본은 이 탭(sessionStorage). "이 기기에 기억하기"를 켜야 기기(localStorage)에 남고, 켜 있는 동안 위에 "이 기기에 저장 중 · 지우기".
   - 입력을 분석하지 않아요(위기어 검사·분류·추천 없음). 주소·바깥으로 보내지 않아요. */
(function (root) {
  /* 첫 진료 준비: diagnostic-process 글 '진단받는 날 준비할 것' 목록의 문장 그대로(tests/ask.test.cjs 가 그 소절에 있는지 확인).
     화면에 입력칸은 없고 종이에 빈 줄만. note 는 같은 항목의 원문 문장을 그대로 덧붙인 것 */
  var PREP = [
    { label: '시간표', quote: ['처음 이상하다고 느낀 때, 잠이 달라진 때, 학교·직장을 쉬기 시작한 때'], from: 'diagnostic-process', lines: 3 },
    { label: '약과 물질', quote: ['먹고 있는 약(처방약·한약·건강보조식품), 술·대마·각성제 사용 여부'], note: '기록과 비밀 보장이 걱정되면 진료 전에 물어봐도 돼요.', from: 'diagnostic-process', lines: 3 },
    { label: '신체 증상', quote: ['두통, 경련, 열, 체중 변화, 갑상선 질환 병력'], from: 'diagnostic-process', lines: 2 },
    { label: '가족력', quote: ['가족 중 정신질환, 자살, 치매가 있었는지'], from: 'diagnostic-process', lines: 2 },
    { label: '함께 갈 사람', quote: ['변화를 가까이서 본 가족'], from: 'diagnostic-process', lines: 1 }
  ];
  /* diagnostic-process '질문 목록' 의 질문 그대로 */
  var PREP_ASK = ['지금 생각하시는 진단은 무엇인가요?', '다른 가능성은 무엇인가요?', '어떤 검사를 왜 하나요?'];
  /* 담은 것이 없을 때 보여 줄 글(모두 질문 소절이 있는 글. 테스트로 확인) */
  var SUGGEST = ['antipsychotic-basics', 'side-effects-overview', 'shared-decision-making', 'psychosis-what-is'];
  var ANSWER_LINES = 2;

  function titleOf(articles, slug, fallback) { var a = articles && articles[slug]; return a && a.title ? a.title : (fallback || slug); }
  function fmtDay(d) { return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일'; }

  /* ---------- 자바스크립트가 없을 때(검색엔진·꺼진 환경) ---------- */
  function staticHtml(ctx) {
    var esc = ctx.esc, arts = ctx.articles || {};
    function link(slug) { return '<a href="#/a/' + esc(slug) + '">' + esc(titleOf(arts, slug)) + '</a>'; }
    return '<div class="pg-ask-nojs">' +
      '<p>' + esc('이 화면은 자바스크립트가 켜져 있어야 질문을 담고, 순서를 바꾸고, 인쇄할 수 있어요.') + '</p>' +
      '<p>' + esc('질문은 글마다 끝 쪽의 "담당 의사에게 물어볼 것" 소절에 있어요. 글에서 바로 읽거나 적어 갈 수 있어요. 예를 들면:') + '</p>' +
      '<ul>' + SUGGEST.map(function (s) { return '<li>' + link(s) + '</li>'; }).join('') + '</ul>' +
      '<h2 class="pg-ask-h">' + esc('첫 진료 준비') + '</h2>' +
      '<p>' + esc('처음 진료받는 날 미리 적어 가면 좋은 것이에요. 자세한 내용은 ') + link('diagnostic-process') + esc(' 글에 있어요.') + '</p>' +
      '<ul>' + PREP.map(function (p) { return '<li><b>' + esc(p.label + ':') + '</b> ' + esc(p.quote.join(' ')) + (p.note ? ' ' + esc(p.note) : '') + '</li>'; }).join('') + '</ul>' +
      '</div>';
  }

  /* ---------- 화면 ---------- */
  function render(mount, ctx) {
    var JHB = root.JHB;
    var waiting = ctx.el('p.pg-ask-wait', null, ['화면을 준비하고 있어요.']);
    function api() { return JHB.ui && JHB.ui.ask; }
    function start(a) {
      if (!mount.isConnected) return;
      if (waiting.parentNode) waiting.remove();
      if (!a) { mount.appendChild(ctx.el('p.fp-fail', { role: 'status' }, ['질문 바구니를 준비하지 못했어요. 새로고침해 보세요.'])); return; }
      build(mount, ctx, a);
    }
    if (api()) return start(api());
    /* 모듈(js/ui/ask.js)보다 이 화면 코드가 먼저 실행될 수 있어요: 문서 스크립트가 다 돈 뒤에 다시 보고, 그래도 없으면 직접 불러요 */
    mount.appendChild(waiting);
    var done = false;
    function later() {
      if (done) return; done = true;
      if (api()) return start(api());
      ctx.app.load('js/ui/ask.js').then(function () { start(api() || null); }, function () { start(null); });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', later);
      ctx.onCleanup(function () { done = true; document.removeEventListener('DOMContentLoaded', later); });
    } else later();
  }

  function build(mount, ctx, api) {
    var app = ctx.app, el = ctx.el, core = api.core, arts = app.bySlug || {};
    var st = api.state();
    var snap = null;   /* 되돌리기용 사본(이 화면에 있는 동안만, 메모리에만) */
    var snapTimer = 0; /* 전부 지우기의 되돌리기는 잠깐만(자리를 비운 사이 다른 사람이 되살리지 못하게) */
    var UNDO_ALL_MS = 20000;
    var busy = false;  /* 내가 바꾼 것으로 오는 jhb:ask 는 건너뜀 */
    var withPrep = true; /* 첫 진료 준비는 기본으로 종이에 넣어요(빼고 싶으면 체크 해제) */

    /* --- 맨 위: 저장 상태 --- */
    var keepBar = el('div.pg-ask-keepbar', { hidden: true }, [
      el('span.pg-ask-keepdot', { 'aria-hidden': 'true' }),
      el('span.pg-ask-keeptext', null, ['이 기기에 저장 중']),
      el('button.pg-ask-link', { type: 'button', 'data-act': 'clear-all', 'aria-label': '담은 질문 전부 지우기' }, ['지우기'])
    ]);
    var where = el('p.pg-ask-where');
    var swLabelId = 'pg-ask-sw-l';
    var sw = el('button.pg-ask-switch', { type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-labelledby': swLabelId, 'aria-describedby': 'pg-ask-sw-d' }, [
      el('span.pg-ask-track', { 'aria-hidden': 'true' }, [el('span.pg-ask-thumb')]),
      el('span.pg-ask-swtext', { id: swLabelId }, ['이 기기에 기억하기'])
    ]);
    var swDesc = el('p.pg-ask-swdesc', { id: 'pg-ask-sw-d' });
    /* 기기 고지(notice('device'))는 화면 장치가 바닥에 늘 붙여요. 위에서는 켤 때 상태 줄로 한 번 알려요(같은 글자를 두 번 보이지 않게) */
    var deviceText = (function () { var n = app.notice('device'); return n ? String(n.textContent || '').replace(/\s+/g, ' ').trim() : ''; })();
    var top = el('div.pg-ask-top', null, [keepBar, where, el('div.pg-ask-swrow', null, [sw]), swDesc]);

    var status = el('p.pg-ask-status', { role: 'status' });

    /* --- 담은 질문 --- */
    var listH = el('h2.pg-ask-h', { id: 'pg-ask-h-list', tabindex: '-1' }, ['담은 질문']);
    var listBox = el('div.pg-ask-list');
    var clearBtn = el('button.btn.pg-ask-clear', { type: 'button', 'data-act': 'clear-all' }, ['전부 지우기']);
    var listSec = el('section.pg-ask-sec', { 'aria-labelledby': 'pg-ask-h-list' }, [listH, listBox, el('p.pg-ask-clearrow', null, [clearBtn])]);

    /* --- 내 질문 --- */
    var mineInput = el('input.pg-ask-input', { id: 'pg-ask-mine', type: 'text', maxlength: String(core.MAX_LEN), autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', enterkeyhint: 'done', 'aria-describedby': 'pg-ask-mine-d' });
    var mineForm = el('form.pg-ask-form', { novalidate: true }, [
      el('label.pg-ask-label', { for: 'pg-ask-mine' }, ['진료 때 물어볼 것을 한 줄로 적어요']),
      el('div.pg-ask-row', null, [mineInput, el('button.btn.pg-ask-addbtn', { type: 'submit' }, ['더하기'])]),
      el('p.pg-ask-hint', { id: 'pg-ask-mine-d' }, ['적은 글은 어디로도 보내지 않아요. 담은 질문과 같은 곳에 함께 저장돼요.'])
    ]);
    var mineSec = el('section.pg-ask-sec', { 'aria-labelledby': 'pg-ask-h-mine' }, [el('h2.pg-ask-h', { id: 'pg-ask-h-mine' }, ['내 질문 더하기']), mineForm]);

    /* --- 종이로 뽑기 --- */
    var prepBox = el('input', { type: 'checkbox', id: 'pg-ask-prep', checked: true });
    var printBtn = el('button.btn.pg-ask-printbtn', { type: 'button', 'aria-describedby': 'pg-ask-print-d' }, ['인쇄하기']);
    var printWhy = el('p.pg-ask-hint', { id: 'pg-ask-print-d' });
    var printSec = el('section.pg-ask-sec', { 'aria-labelledby': 'pg-ask-h-print' }, [
      el('h2.pg-ask-h', { id: 'pg-ask-h-print' }, ['종이로 뽑기']),
      el('p.pg-ask-p', null, ['질문마다 답을 적을 빈 줄이 붙고, 맨 위에 인쇄한 날이 들어가요.']),
      el('div.pg-ask-check', null, [prepBox, el('label', { for: 'pg-ask-prep' }, [
        el('span.pg-ask-checkt', null, ['첫 진료 준비 칸도 넣기']),
        el('span.pg-ask-checkd', null, ['처음 진료받는 날 적어 가면 좋은 것(언제부터 달라졌는지, 먹는 약, 몸 증상, 가족력 등)을 종이에 빈 줄로 넣어요. 화면에 적는 칸은 없어요. 다시 가는 진료라면 체크를 풀어도 돼요.'])
      ])]),
      el('p.pg-ask-printrow', null, [printBtn]),
      printWhy
    ]);

    /* --- 인쇄용 종이(화면에서는 숨김) --- */
    var sheetDate = el('p.pg-ask-sh-date');
    var sheetBody = el('div.pg-ask-sh-body');
    var sheet = el('div.pg-ask-sheet', null, [
      el('div.pg-ask-sh-head', null, [
        el('h2.pg-ask-sh-title', null, ['진료 때 물어볼 것']),
        sheetDate,
        el('p.pg-ask-sh-visit', null, ['진료 날', el('span.pg-ask-blank', { 'aria-hidden': 'true' })])
      ]),
      el('p.pg-ask-sh-note', null, ['조현병 백과 글의 "담당 의사에게 물어볼 것"에서 고른 질문을 글에 있는 그대로 옮겼어요. 들은 답은 줄에 적어 두세요.']),
      el('p.pg-ask-sh-keep', null, ['이 종이에는 개인 정보가 적혀요. 보관에 주의하세요.']),
      sheetBody
    ]);

    mount.appendChild(top);
    mount.appendChild(status);
    mount.appendChild(listSec);
    mount.appendChild(mineSec);
    mount.appendChild(printSec);
    mount.appendChild(sheet);

    function say(text, withUndo) {
      status.textContent = '';
      if (!withUndo) dropTimer();
      if (!text) return;
      status.appendChild(document.createTextNode(text));
      if (withUndo) { status.appendChild(document.createTextNode(' ')); status.appendChild(el('button.pg-ask-link', { type: 'button', 'data-act': 'undo' }, ['되돌리기'])); }
    }
    function title(g) { return g.slug ? titleOf(arts, g.slug, g.title) : '내 질문'; }

    /* --- 그리기 --- */
    /* 기록 쉼 중 꺼진 스위치는 disabled 대신 aria-disabled(Tab 으로 닿고 이유를 들을 수 있게) */
    function swLocked() { return sw.getAttribute('aria-disabled') === 'true'; }
    function paintTop() {
      var canKeep = api.canKeep(), pausedNow = !canKeep;
      keepBar.hidden = !st.keep;
      sw.setAttribute('aria-checked', st.keep ? 'true' : 'false');
      var off = !st.keep && pausedNow;
      if (off) sw.setAttribute('aria-disabled', 'true'); else sw.removeAttribute('aria-disabled');
      var heldNote = st.keep && pausedNow;
      where.hidden = st.keep && !heldNote && !st.held;
      where.textContent = !st.keep ? '담은 질문은 이 탭에만 있어요. 탭을 닫으면 사라져요.'
        : heldNote ? '"기록 남기지 않기"가 켜져 있어 새로 담는 질문은 이 기기에 쓰지 않고 이 탭에만 둬요' + (st.held ? '(지금 ' + st.held + '개). 탭을 닫으면 그 질문은 사라져요.' : '. 이미 이 기기에 저장한 질문은 그대로예요.')
        : '이 탭에서 담은 질문 ' + st.held + '개는 아직 이 탭에만 있어요. 바구니를 한 번 고치면 이 기기에 함께 저장돼요.';
      swDesc.textContent = off ? '"기록 남기지 않기"가 켜져 있어 이 기기에 기억할 수 없어요. 이 탭에서만 담아 둬요.'
        : st.keep ? '끄면 이 기기에서 지우고, 이 탭을 닫을 때까지만 남겨요.' : '켜면 탭을 닫아도 이 기기에 남아요. 같은 기기를 쓰는 사람이 볼 수 있어요.';
    }
    function actBtn(act, id, text, label, describedby, disabled) {
      return el('button.pg-ask-btn', { type: 'button', 'data-act': act, 'data-id': id, 'aria-label': label || null, 'aria-describedby': describedby || null, disabled: disabled || null, title: label || null }, text);
    }
    function paintList() {
      var n = st.items.length;
      listH.textContent = n ? '담은 질문 ' + n + '개' : '담은 질문';
      clearBtn.parentNode.hidden = !n;
      listBox.textContent = '';
      if (!n) {
        listBox.appendChild(el('div.pg-ask-empty', null, [
          el('p', null, ['아직 담은 질문이 없어요. 글 끝 쪽의 "담당 의사에게 물어볼 것"에서 질문 옆 "+ 담기"를 누르면 여기에 모여요.']),
          el('p', null, ['이런 글에 질문이 있어요:']),
          el('ul.pg-ask-sugg', null, SUGGEST.filter(function (s) { return arts[s]; }).map(function (s) {
            return el('li', null, [el('a', { href: app.L('#/a/' + s) }, [titleOf(arts, s)])]);
          }))
        ]));
        return;
      }
      var gs = core.groups(st.items), num = 0;
      gs.forEach(function (g, gi) {
        var t = title(g), hid = 'pg-ask-g' + gi;
        var head = el('div.pg-ask-ghead', null, [
          el('h3.pg-ask-gt', { id: hid }, [g.slug && arts[g.slug] ? el('a', { href: app.L('#/a/' + g.slug) }, [t]) : t]),
          gs.length > 1 ? el('div.pg-ask-gacts', null, [
            actBtn('gup', g.key, ['\u2191'], '"' + t + '" 묶음을 위로', null, gi === 0),
            actBtn('gdown', g.key, ['\u2193'], '"' + t + '" 묶음을 아래로', null, gi === gs.length - 1)
          ]) : null
        ]);
        var ol = el('ol.pg-ask-items', { start: String(num + 1), 'aria-labelledby': hid });
        g.items.forEach(function (it, ii) {
          num++;
          var qid = 'pg-ask-q-' + it.id;
          ol.appendChild(el('li.pg-ask-item', { 'data-id': it.id }, [el('div.pg-ask-row2', null, [
            el('p.pg-ask-q', { id: qid }, [it.text]),
            el('div.pg-ask-acts', null, [
              actBtn('up', it.id, [el('span', { 'aria-hidden': 'true' }, ['\u2191 ']), '위로'], null, qid, ii === 0),
              actBtn('down', it.id, [el('span', { 'aria-hidden': 'true' }, ['\u2193 ']), '아래로'], null, qid, ii === g.items.length - 1),
              actBtn('remove', it.id, ['빼기'], null, qid)
            ])
          ])]));
        });
        listBox.appendChild(el('section.pg-ask-group', { 'aria-labelledby': hid }, [head, ol]));
      });
    }
    function lines(n) { var out = []; for (var i = 0; i < n; i++) out.push(el('span.pg-ask-line', { 'aria-hidden': 'true' })); return out; }
    function paintSheet() {
      sheetDate.textContent = '인쇄한 날 ' + fmtDay(new Date());
      sheetBody.textContent = '';
      var num = 0;
      if (withPrep) {
        var srcs = PREP.map(function (p) { return p.from; }).filter(function (s, i, a) { return a.indexOf(s) === i; });
        sheetBody.appendChild(el('section.pg-ask-sh-sec', null, [
          el('h3.pg-ask-sh-h', null, ['첫 진료 준비']),
          el('p.pg-ask-sh-src', null, ['미리 적어 가면 진료 때 잊지 않아요. (조현병 백과 ' + srcs.map(function (s) { return '"' + titleOf(arts, s) + '"'; }).join(', ') + ' 글에서)']),
          el('ul.pg-ask-sh-prep', null, PREP.map(function (p) {
            return el('li', null, [el('p.pg-ask-sh-q', null, [el('b', null, [p.label + ':']), ' ', p.quote.join(' ')]), p.note ? el('p.pg-ask-sh-pnote', null, [p.note]) : null].concat(lines(p.lines)));
          })),
          el('p.pg-ask-sh-sub', null, ['처음 진료에서 물어볼 것']),
          el('ol.pg-ask-sh-list', { start: '1' }, PREP_ASK.map(function (q) { num++; return el('li', null, [el('p.pg-ask-sh-q', null, [q])].concat(lines(ANSWER_LINES))); }))
        ]));
      }
      core.groups(st.items).forEach(function (g) {
        var start = num + 1;
        sheetBody.appendChild(el('section.pg-ask-sh-sec', null, [
          el('h3.pg-ask-sh-h', null, [title(g)]),
          el('ol.pg-ask-sh-list', { start: String(start) }, g.items.map(function (it) { num++; return el('li', null, [el('p.pg-ask-sh-q', null, [it.text])].concat(lines(ANSWER_LINES))); }))
        ]));
      });
      if (!num) sheetBody.appendChild(el('p.pg-ask-sh-q', null, ['담은 질문이 없어요.']));
      var nothing = !st.items.length && !withPrep;
      if (nothing) printBtn.setAttribute('disabled', ''); else printBtn.removeAttribute('disabled');
      printWhy.textContent = nothing ? '담은 질문이 없어요. 질문을 담거나 "첫 진료 준비 칸도 넣기"를 고르면 인쇄할 수 있어요.' : '인쇄 창에서 "PDF로 저장"을 고르면 파일로도 남길 수 있어요.';
    }
    function paintAll() { paintTop(); paintList(); paintSheet(); }

    /* 다시 그린 뒤 같은 질문의 같은 버튼에 포커스(그 버튼이 막혔으면 옆 버튼) */
    function focusAfter(act, id) {
      var sel = function (a) { return listBox.querySelector('.pg-ask-btn[data-act="' + a + '"][data-id="' + cssId(id) + '"]'); };
      var order = { up: ['up', 'down', 'remove'], down: ['down', 'up', 'remove'], remove: ['remove'], gup: ['gup', 'gdown'], gdown: ['gdown', 'gup'] }[act] || [act];
      for (var i = 0; i < order.length; i++) { var b = sel(order[i]); if (b && !b.disabled) { b.focus(); return b; } }
      listH.focus();
      return null;
    }
    function cssId(s) { return String(s).replace(/["\\]/g, ''); }
    function flash(id) {
      if (app.reducedMotion && app.reducedMotion()) return;
      var li = listBox.querySelector('.pg-ask-item[data-id="' + cssId(id) + '"]');
      if (!li) return;
      li.classList.add('pg-ask-moved');
      setTimeout(function () { li.classList.remove('pg-ask-moved'); }, 900);
    }
    /* r.state 는 저장한 뒤 다시 읽은 실제 값이에요(실패하면 바뀌기 전 값). 저장에 실패했으면 false */
    function apply(r) {
      if (r && r.state) st = r.state;
      paintAll();
      return !(r && r.saved === false);
    }
    var FAIL = '브라우저 저장 공간을 쓸 수 없어 ';
    function run(fn) { busy = true; try { return fn(); } finally { busy = false; } }

    /* 되돌리기 사본 버리기: 시간이 지나거나 화면을 떠나거나 가려지면 */
    function dropTimer() { if (snapTimer) { clearTimeout(snapTimer); snapTimer = 0; } }
    function dropUndo() {
      dropTimer();
      if (!snap) return;
      snap = null;
      var u = status.querySelector('[data-act="undo"]');
      if (u) {
        var had = document.activeElement === u;
        u.remove();
        if (had) listH.focus();
      }
    }
    function onVisibility() { if (document.visibilityState === 'hidden') dropUndo(); }

    function clearEverything() {
      if (!st.items.length && !st.keep) { say('지울 질문이 없어요.'); return; }
      var before = { keep: st.keep, items: st.items.slice() };
      apply(run(function () { return api.clearAll(); }));
      snap = before;
      say('다 지웠어요. 이 기기와 이 탭에 남은 질문이 없어요. 되돌리기는 ' + Math.round(UNDO_ALL_MS / 1000) + '초 동안만 할 수 있어요.', true);
      snapTimer = setTimeout(dropUndo, UNDO_ALL_MS);
      var u = status.querySelector('[data-act="undo"]'); if (u) u.focus();
    }
    function onClick(e) {
      var b = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!b || b.disabled || !mount.contains(b)) return;
      var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
      if (act === 'clear-all') return clearEverything();
      if (act === 'undo') {
        if (!snap) return;
        var back = snap; snap = null;
        var u = run(function () { return api.restore(back); });
        if (!apply(u)) { say(FAIL + '되돌리지 못했어요.'); listH.focus(); return; }
        say(st.paused && st.held ? '되돌렸어요. "기록 남기지 않기"가 켜져 있어 이 기기에 없던 질문은 이 탭에만 돌려 놨어요.'
          : back.keep && !st.keep ? '되돌렸어요. "기록 남기지 않기"가 켜져 있어 이 탭에만 담아 뒀어요.' : '되돌렸어요.');
        listH.focus();
        return;
      }
      if (act === 'up' || act === 'down') {
        var r = run(function () { return api.moveItem(id, act === 'up' ? -1 : 1); });
        if (!apply(r)) say(FAIL + '옮기지 못했어요.');
        else if (r.moved) { say(act === 'up' ? '위로 옮겼어요.' : '아래로 옮겼어요.'); flash(id); }
        focusAfter(act, id);
        return;
      }
      if (act === 'gup' || act === 'gdown') {
        var g = run(function () { return api.moveGroup(id, act === 'gup' ? -1 : 1); });
        if (!apply(g)) say(FAIL + '옮기지 못했어요.');
        else if (g.moved) say(act === 'gup' ? '묶음을 위로 옮겼어요.' : '묶음을 아래로 옮겼어요.');
        focusAfter(act, id);
        return;
      }
      if (act === 'remove') {
        var idx = st.items.findIndex(function (x) { return x.id === id; });
        var before = { keep: st.keep, items: st.items.slice() };
        if (!apply(run(function () { return api.remove(id); }))) { say(FAIL + '빼지 못했어요.'); focusAfter('remove', id); return; }
        snap = before;
        say('질문을 뺐어요.', true);
        var next = st.items[Math.min(idx, st.items.length - 1)];
        if (next) focusAfter('remove', next.id); else listH.focus();
      }
    }
    function onSwitch() {
      if (swLocked()) { say('"기록 남기지 않기"가 켜져 있어 이 기기에 기억할 수 없어요. 내 서재에서 끌 수 있어요.'); return; }
      var on = sw.getAttribute('aria-checked') !== 'true';
      var r = run(function () { return api.setKeep(on); });
      if (r.refused === 'paused') { st = r.state; paintAll(); say('"기록 남기지 않기"가 켜져 있어 이 기기에 기억할 수 없어요.'); return; }
      apply(r);
      if (r.lost) say('이 기기에서 지웠어요. 브라우저 저장 공간을 쓸 수 없어 이 탭에도 옮겨 두지 못했어요.');
      else if (r.failed) say(FAIL + '이 기기에 기억하지 못했어요. 이 탭에서만 담아 둬요.');
      else say(on ? '이 기기에 기억하기를 켰어요. 탭을 닫아도 남아요.' + (deviceText ? ' ' + deviceText : '') : '이 기기에서 지웠어요. 이 탭을 닫으면 사라져요.');
    }
    function onSubmit(e) {
      e.preventDefault();
      var it = core.makeItem({ text: mineInput.value });
      if (!it) { say(core.norm(mineInput.value) ? '질문이 너무 길어요. ' + core.MAX_LEN + '자 안으로 줄여 주세요.' : '적은 글이 없어요.'); mineInput.focus(); return; }
      var r = run(function () { return api.add(it); });
      if (r.reason === 'dup') { say('이미 담긴 질문이에요.'); mineInput.focus(); return; }
      if (r.reason === 'full') { say('질문은 ' + core.MAX_ITEMS + '개까지 담을 수 있어요. 몇 개를 빼 주세요.'); mineInput.focus(); return; }
      /* 저장에 실패하면 목록에 넣지 않고 적은 글은 칸에 그대로 둬요 */
      if (!apply(r)) { say(FAIL + '더하지 못했어요. 적은 글은 칸에 그대로 있어요.'); mineInput.focus(); return; }
      say(st.keep && st.paused ? '내 질문을 더했어요. "기록 남기지 않기"가 켜져 있어 이 탭에만 둬요.' : '내 질문을 더했어요.');
      mineInput.value = '';
      mineInput.focus();
    }
    function onPrep() { withPrep = !!prepBox.checked; paintSheet(); }
    function onPrint() { paintSheet(); if (typeof root.print === 'function') root.print(); }
    /* 다른 곳(내 서재·다른 탭·뒤로 가기)에서 바뀌면 다시 읽는다(읽기만) */
    function reload() { if (busy) return; st = api.state(); snap = null; say(''); paintAll(); }
    function onStorage(e) { if (!e.key || e.key.indexOf('jhb.ui.ask.') === 0 || e.key.indexOf('jhb.privacy.') === 0) reload(); }
    function onShow(e) { if (e.persisted) reload(); }
    function onBeforePrint() { paintSheet(); }

    mount.addEventListener('click', onClick);
    sw.addEventListener('click', onSwitch);
    mineForm.addEventListener('submit', onSubmit);
    prepBox.addEventListener('change', onPrep);
    printBtn.addEventListener('click', onPrint);
    root.addEventListener('jhb:ask', reload);
    root.addEventListener('jhb:privacy', reload);
    root.addEventListener('storage', onStorage);
    root.addEventListener('pageshow', onShow);
    root.addEventListener('beforeprint', onBeforePrint);
    document.addEventListener('visibilitychange', onVisibility);
    root.addEventListener('pagehide', dropUndo);
    ctx.onCleanup(function () {
      dropTimer(); snap = null;
      document.removeEventListener('visibilitychange', onVisibility);
      root.removeEventListener('pagehide', dropUndo);
      root.removeEventListener('jhb:ask', reload);
      root.removeEventListener('jhb:privacy', reload);
      root.removeEventListener('storage', onStorage);
      root.removeEventListener('pageshow', onShow);
      root.removeEventListener('beforeprint', onBeforePrint);
    });
    paintAll();
  }

  var page = { id: 'ask', staticHtml: staticHtml, render: render, PREP: PREP, PREP_ASK: PREP_ASK, SUGGEST: SUGGEST };
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
