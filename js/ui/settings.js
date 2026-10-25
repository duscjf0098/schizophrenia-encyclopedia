/* 조현병 백과 · 보기 설정 패널(js/ui/settings.js)
   상단의 글자 크기·밝게/어둡게 버튼을 톱니 버튼 하나로 모으고, 패널에서 화면·글자 크기·줄 너비·본문 글꼴·움직임 줄이기를 고른다.
   저장: 'jhb.ui.settings' = { theme, fs, width, font, motion }. 기존 키 'jhb.theme'(light/dark)·'jhb.fs'(s/m/l/xl/xxl) 도 함께 맞춰 둔다. */
(function () {
  const KEY = 'jhb.ui.settings', KEY_THEME = 'jhb.theme', KEY_FS = 'jhb.fs';
  const FS = ['s', 'm', 'l', 'xl', 'xxl'];
  const FS_LABEL = { s: '작게', m: '보통', l: '크게', xl: '더 크게', xxl: '아주 크게' };
  const root = document.documentElement;

  function read(k, fb) { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function remove(k) { try { localStorage.removeItem(k); } catch (e) { } }

  function load() {
    const s = read(KEY, {}) || {};
    const t = read(KEY_THEME, null);
    const f = read(KEY_FS, null);
    return {
      theme: t === 'light' || t === 'dark' ? t : 'auto',
      fs: FS.indexOf(f) >= 0 ? f : 'm',
      width: s.width === 'wide' ? 'wide' : 'normal',
      font: s.font === 'serif' ? 'serif' : 'sans',
      motion: s.motion === 'reduce' ? 'reduce' : 'normal'
    };
  }
  let S = load();

  function attr(name, val, off) { if (val === off) root.removeAttribute(name); else root.setAttribute(name, val); }
  let serifLink = null;
  function ensureSerif() {
    /* 제목용으로만 600·700 굵기가 실려 있어서, 본문 명조에는 400 굵기를 따로 받아온다 */
    if (serifLink || document.querySelector('link[data-set-serif]')) return;
    serifLink = document.createElement('link');
    serifLink.rel = 'stylesheet'; serifLink.setAttribute('data-set-serif', '1');
    serifLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap';
    document.head.appendChild(serifLink);
  }
  function applyAll() {
    attr('data-theme', S.theme, 'auto');
    attr('data-fs', S.fs, 'm');
    attr('data-width', S.width, 'normal');
    attr('data-font', S.font, 'sans');
    attr('data-motion', S.motion, 'normal');
    if (S.font === 'serif') ensureSerif();
  }
  function persist() {
    write(KEY, S);
    if (S.theme === 'auto') remove(KEY_THEME); else write(KEY_THEME, S.theme);
    write(KEY_FS, S.fs);
  }
  /* 첫 그리기 전에 바로 적용(깜빡임 줄이기). 테마와 s/l 글자 크기는 shell 의 인라인 스크립트가 이미 넣었다 */
  applyAll();

  /* ---------- 앱이 준비된 뒤: 버튼과 패널 ---------- */
  function ready() {
    if (!window.JHB || !JHB.app) return;
    const A = JHB.app, el = A.el;
    const tools = document.querySelector('.tools');
    const oldFs = document.getElementById('btn-fs'), oldTheme = document.getElementById('btn-theme');
    if (!tools) return;
    tools.classList.add('set-ready');
    if (oldFs) oldFs.hidden = true;
    if (oldTheme) oldTheme.hidden = true;

    function set(k, v, msg) {
      if (S[k] === v) return;
      S[k] = v; applyAll(); persist(); sync();
      if (msg) A.announce(msg);
      window.dispatchEvent(new Event('jhb:layout'));
    }

    const gear = el('button.iconbtn.set-btn', { type: 'button', id: 'set-btn', 'aria-label': '보기 설정', title: '보기 설정', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'set-panel' }, []);
    gear.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/></svg>';
    if (oldFs && oldFs.parentNode === tools) tools.insertBefore(gear, oldFs); else tools.appendChild(gear);

    /* 세그먼트(라디오 묶음) */
    function seg(name, key, opts) {
      const g = el('div.set-seg', { role: 'radiogroup', 'aria-label': name });
      opts.forEach(function (o) {
        const b = el('button.set-opt', { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-v': o.v }, [o.label]);
        b.addEventListener('click', function () { set(key, o.v, o.msg); });
        g.appendChild(b);
      });
      g.addEventListener('keydown', function (e) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
        e.preventDefault();
        const items = Array.prototype.slice.call(g.querySelectorAll('[role="radio"]'));
        const i = items.indexOf(document.activeElement);
        const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
        const n = items[(Math.max(i, 0) + dir + items.length) % items.length];
        n.focus(); n.click();
      });
      g.setAttribute('data-key', key);
      return g;
    }
    function row(label, control, hint) {
      const id = 'set-l-' + Math.random().toString(36).slice(2, 7);
      const lab = el('div.set-label', { id: id }, [label]);
      control.setAttribute('aria-labelledby', id);
      return el('div.set-row', null, [lab, control, hint || null]);
    }

    const themeSeg = seg('화면', 'theme', [{ v: 'auto', label: '자동', msg: '화면을 기기 설정에 맞춰요' }, { v: 'light', label: '밝게', msg: '밝은 화면으로 바꿨어요' }, { v: 'dark', label: '어둡게', msg: '어두운 화면으로 바꿨어요' }]);
    const widthSeg = seg('줄 너비', 'width', [{ v: 'normal', label: '보통', msg: '줄 너비: 보통' }, { v: 'wide', label: '넓게', msg: '줄 너비: 넓게' }]);
    const fontSeg = seg('본문 글꼴', 'font', [{ v: 'sans', label: '고딕', msg: '본문 글꼴: 고딕' }, { v: 'serif', label: '명조', msg: '본문 글꼴: 명조' }]);

    const fsOut = el('span.set-fs-val', { 'aria-hidden': 'true' }, ['보통']);
    const fsRange = el('input.set-range', { type: 'range', min: '1', max: '5', step: '1', 'aria-valuemin': '1', 'aria-valuemax': '5' });
    fsRange.addEventListener('input', function () {
      const v = FS[Math.max(1, Math.min(5, Number(fsRange.value))) - 1];
      set('fs', v, '글자 크기: ' + FS_LABEL[v]);
    });
    fsRange.setAttribute('aria-labelledby', 'set-l-fs');
    const fsWrap = el('div.set-fs', null, [el('span.set-fs-a', { 'aria-hidden': 'true' }, ['가']), fsRange, el('span.set-fs-a.set-fs-big', { 'aria-hidden': 'true' }, ['가']), fsOut]);
    const fsRow = el('div.set-row', null, [el('div.set-label', { id: 'set-l-fs' }, ['글자 크기']), fsWrap]);

    const motionSw = el('button.set-switch', { type: 'button', role: 'switch', 'aria-checked': 'false' }, [el('span.set-knob', { 'aria-hidden': 'true' }), el('span.set-switch-t', null, ['끔'])]);
    motionSw.addEventListener('click', function () { const on = S.motion !== 'reduce'; set('motion', on ? 'reduce' : 'normal', on ? '움직임을 줄여요' : '움직임을 다시 켰어요'); });

    const reset = el('button.set-reset', { type: 'button' }, ['기본으로 되돌리기']);
    reset.addEventListener('click', function () {
      S = { theme: 'auto', fs: 'm', width: 'normal', font: 'sans', motion: 'normal' };
      applyAll(); persist(); sync(); A.announce('보기 설정을 기본으로 되돌렸어요');
      window.dispatchEvent(new Event('jhb:layout'));
    });
    const close = el('button.set-x', { type: 'button', 'aria-label': '닫기' }, ['×']);

    const panel = el('div.set-panel', { id: 'set-panel', role: 'dialog', 'aria-labelledby': 'set-title', hidden: true }, [
      el('div.set-head', null, [el('h2.set-title', { id: 'set-title' }, ['보기 설정']), close]),
      row('화면', themeSeg),
      fsRow,
      row('줄 너비', widthSeg),
      row('본문 글꼴', fontSeg),
      el('div.set-row.set-row-switch', null, [el('div.set-label', { id: 'set-l-motion' }, ['움직임 줄이기']), motionSw]),
      el('div.set-foot', null, [reset])
    ]);
    motionSw.setAttribute('aria-labelledby', 'set-l-motion');
    document.body.appendChild(panel);

    function sync() {
      [themeSeg, widthSeg, fontSeg].forEach(function (g) {
        const k = g.getAttribute('data-key');
        Array.prototype.forEach.call(g.querySelectorAll('[role="radio"]'), function (b) {
          const on = b.getAttribute('data-v') === S[k];
          b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
        });
      });
      const lv = FS.indexOf(S.fs) + 1;
      fsRange.value = String(lv);
      fsRange.setAttribute('aria-valuenow', String(lv));
      fsRange.setAttribute('aria-valuetext', FS_LABEL[S.fs]);
      fsOut.textContent = FS_LABEL[S.fs];
      const on = S.motion === 'reduce';
      motionSw.setAttribute('aria-checked', on ? 'true' : 'false');
      motionSw.querySelector('.set-switch-t').textContent = on ? '켬' : '끔';
    }
    sync();

    /* 열기·닫기 */
    let lastFocus = null;
    function isOpen() { return !panel.hidden; }
    function focusables() {
      return Array.prototype.slice.call(panel.querySelectorAll('button, input, [tabindex]')).filter(function (n) { return !n.disabled && n.tabIndex >= 0 && n.offsetParent !== null; });
    }
    function open() {
      if (isOpen()) return;
      if (A.closePop) A.closePop();
      panel.hidden = false;
      gear.setAttribute('aria-expanded', 'true');
      lastFocus = document.activeElement;
      requestAnimationFrame(function () { panel.classList.add('set-show'); const f = focusables().filter(function (n) { return n !== close; }); (f[0] || close).focus(); });
    }
    function shut(refocus) {
      if (!isOpen()) return;
      panel.classList.remove('set-show');
      panel.hidden = true;
      gear.setAttribute('aria-expanded', 'false');
      if (refocus !== false) gear.focus();
    }
    gear.addEventListener('click', function () { if (isOpen()) shut(); else open(); });
    close.addEventListener('click', function () { shut(); });
    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (panel.contains(e.target) || gear.contains(e.target)) return;
      shut(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); shut(); return; }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }, true);
    window.addEventListener('jhb:page', function () { shut(false); });

    JHB.ui = JHB.ui || {};
    JHB.ui.settings = { get: function () { return Object.assign({}, S); }, set: set, open: open, close: shut };
  }

  if (window.JHB && JHB.app) ready();
  else document.addEventListener('DOMContentLoaded', ready);
})();
