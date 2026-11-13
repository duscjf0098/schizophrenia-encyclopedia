/* 미리 써 두는 종이(plan) 테스트
   - 선언(data/pages/plan.json)과 양식 자료(data/kb/forms.json)의 모양
   - 칸 이름·도움말·덧말이 바탕 글 본문에 실제로 있는 글자인지(help.quote 는 문장 그대로)
   - 금지 칸(이름·주민번호·주소·계좌·용량 등)과 미리 채운 값이 없는지, WRAP·사전 의향서 같은 이름이 없는지
   - 저장 함수(js/pages/plan.js 의 lib): 기본 저장 안 함, 켜기(기록 쉼이면 거절)·저장·끄기·전부 지우기, 깨진 값 거르기
   - 떠날 때 확인할 링크 고르기(전화 링크·같은 화면 조각·새 창은 막지 않음)
   - 소스 금지: fetch(·XMLHttpRequest·speechSynthesis·sendBeacon·location.search·pushState·innerHTML·위기어 검사 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const A = require('../tools/lib/assets.cjs');
const md = require('../js/md.js');
const page = require('../js/pages/plan.js');
const lib = page.lib;

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
const FORMS = JSON.parse(A.stripBom(read('data/kb/forms.json')));
const ART = {};
fs.readdirSync(path.join(ROOT, 'content'), { withFileTypes: true }).forEach(function (d) {
  if (!d.isDirectory()) return;
  fs.readdirSync(path.join(ROOT, 'content', d.name)).forEach(function (f) {
    if (/\.md$/.test(f)) ART[f.replace(/\.md$/, '')] = path.join(ROOT, 'content', d.name, f);
  });
});
function article(slug) { ok(ART[slug], '글이 없어요: ' + slug); return md.parse(A.stripBom(fs.readFileSync(ART[slug], 'utf8'))); }
/* 본문 글자(마크다운 기호·각주·링크 주소를 뺀 것, 공백 하나로) */
const BODY = {};
function bodyText(slug) { if (!BODY[slug]) BODY[slug] = md.plain(article(slug).body); return BODY[slug]; }
function formBodies(f) { return f.basedOn.map(bodyText).join('\n'); }
/* JSON 단위로 읽고 쓰는 가짜 저장소(앱의 JHB.app.store 와 같은 모양: get(key, fallback)·set → true·remove) */
function mem(opts) {
  const m = {};
  return {
    m: m,
    get: function (k, fb) { return Object.prototype.hasOwnProperty.call(m, k) ? JSON.parse(m[k]) : fb; },
    set: function (k, v) { if (opts && opts.fail && opts.fail(k)) return false; m[k] = JSON.stringify(v); return true; },
    remove: function (k) { delete m[k]; }
  };
}
function keys(s) { return Object.keys(s.m).sort(); }
function each(fn) { FORMS.forEach(function (f) { f.sections.forEach(function (s) { s.fields.forEach(function (x) { fn(f, s, x); }); }); }); }

/* ---------- 선언 ---------- */
test('plan 선언: 규칙 통과, 제목·짧은 이름, 도구 묶음, side·palette, noindex, 일반·기기 고지, 위기 줄, 양식 자료', function () {
  const d = JSON.parse(A.stripBom(read('data/pages/plan.json')));
  eq(A.validateDecl(d, 'plan', { root: ROOT }).errors, []);
  eq(A.validateDecl(d, 'plan', { root: ROOT }).warnings, []);
  eq(d.title, '미리 써 두는 종이'); eq(d.label, '종이 양식'); eq(d.group, '도구');
  eq(d.nav, ['side', 'palette']); eq(d.robots, 'noindex'); eq(d.notice, ['general', 'device']);
  ok(d.crisisLine !== false, '위기 줄'); eq(d.data, ['forms']);
  const n = A.normalizeDecl(d, { root: ROOT });
  ok(n.hasJs && n.hasCss, 'js/pages/plan.js·css/pages/plan.css 있음');
  not(JSON.stringify(d), 'WRAP'); not(JSON.stringify(d), '의향서');
});

/* ---------- 양식 자료 모양 ---------- */
test('forms.json: 당사자 양식 3종(재발·위기 대비 계획, 안전 계획 카드, 내 정보 카드)만, 가족 양식 없음', function () {
  eq(FORMS.map(function (f) { return f.id; }), ['relapse-plan', 'safety-card', 'my-info']);
  eq(FORMS.map(function (f) { return f.title; }), ['재발·위기 대비 계획', '안전 계획 카드', '내 정보 카드']);
  eq(FORMS[0].basedOn[0], 'relapse-prevention-plan');
  eq(FORMS[1].basedOn, ['suicide-warning-signs']);
});
test('forms.json: 선언형 모양(id·title·lead·basedOn·sections·fields), 칸은 type "lines" 와 줄 수 n', function () {
  const FORM_KEYS = ['id', 'title', 'tab', 'lead', 'basedOn', 'fixedTop', 'legal', 'short', 'sections', 'notesTitle', 'notes'];
  const FIELD_KEYS = ['id', 'label', 'hint', 'type', 'n'];
  FORMS.forEach(function (f) {
    Object.keys(f).forEach(function (k) { ok(FORM_KEYS.indexOf(k) >= 0, f.id + ': 모르는 항목 ' + k); });
    ok(/^[a-z][a-z0-9-]{1,30}$/.test(f.id), f.id);
    ok(f.title && f.lead && f.tab, f.id + ': title·lead·tab');
    ok(Array.isArray(f.basedOn) && f.basedOn.length, f.id + ': basedOn');
    f.basedOn.forEach(function (s) { ok(ART[s], f.id + ': 바탕 글 없음 ' + s); });
    if (f.legal) ok(ART[f.legal], f.id + ': legal 글 없음');
    const sids = {}, fids = {};
    f.sections.forEach(function (s) {
      ok(!sids[s.id], f.id + ': 소절 id 겹침 ' + s.id); sids[s.id] = 1;
      ok(s.title && s.help && s.help.slug && s.help.quote, f.id + '/' + s.id + ': title·help');
      ok(f.basedOn.indexOf(s.help.slug) >= 0, f.id + '/' + s.id + ': help.slug 는 바탕 글 가운데 하나');
      ok(s.fields.length, f.id + '/' + s.id + ': 칸 없음');
      s.fields.forEach(function (x) {
        Object.keys(x).forEach(function (k) { ok(FIELD_KEYS.indexOf(k) >= 0, f.id + '.' + x.id + ': 모르는 항목 ' + k + ' (미리 채운 값·예시 금지)'); });
        ok(/^[a-z][a-z0-9-]{1,30}$/.test(x.id), x.id);
        ok(!fids[x.id], f.id + ': 칸 id 겹침 ' + x.id); fids[x.id] = 1;
        eq(x.type, 'lines', f.id + '.' + x.id);
        ok(Number.isInteger(x.n) && x.n >= 1 && x.n <= 6, f.id + '.' + x.id + ': n 1~6');
      });
    });
  });
});
test('모든 양식에 고정 위기 줄 표시 플래그(fixedTop: "crisis")가 있고, 고정 줄은 109·1577-0199·119 전화 링크', function () {
  FORMS.forEach(function (f) { eq(f.fixedTop, 'crisis', f.id); });
  const h = lib.FIXED_HTML;
  has(h, 'href="tel:109"'); has(h, 'href="tel:1577-0199"'); has(h, 'href="tel:119"');
  has(h, '문자'); not(h, '<input'); not(h, '<textarea');
  /* 종이 모형도 늘 고정 줄을 단다(자료에 플래그가 빠져도) */
  const noFlag = Object.assign({}, FORMS[1]); delete noFlag.fixedTop;
  eq(lib.sheet(noFlag, {}).fixed, true);
});

/* ---------- 바탕 글과 맞추기 ---------- */
test('help.quote 는 바탕 글 본문에 문장 그대로 있다(…요. 로 끝나는 한 문장)', function () {
  FORMS.forEach(function (f) {
    f.sections.forEach(function (s) {
      ok(/[요다]\.$/.test(s.help.quote), f.id + '/' + s.id + ': 문장으로 끝나야 해요');
      has(bodyText(s.help.slug), s.help.quote, f.id + '/' + s.id + ' quote');
    });
  });
});
/* 지시서가 정한 화면 말(바탕 글의 낱말이 아님): 내 정보 카드의 "연락할 사람", 약 칸 "처방전대로 직접 적어요" */
const UI_WORDS = { 'my-info.contact': ['연락할 사람', '가족이나 믿는 사람, 전화번호'], 'my-info.meds': ['처방전대로 직접 적어요'] };
test('칸 이름·덧말·notes 는 바탕 글의 글자 그대로(지시서가 정한 화면 말 3개만 예외)', function () {
  each(function (f, s, x) {
    const allowed = UI_WORDS[f.id + '.' + x.id] || [];
    const all = formBodies(f);
    if (allowed.indexOf(x.label) < 0) has(all, x.label, f.id + '.' + x.id + ' label');
    if (x.hint && allowed.indexOf(x.hint) < 0) has(all, x.hint, f.id + '.' + x.id + ' hint');
  });
  FORMS.forEach(function (f) { (f.notes || []).forEach(function (n) { has(formBodies(f), n, f.id + ' note'); }); });
  ok(Object.keys(UI_WORDS).every(function (k) { const p = k.split('.'); return FORMS.some(function (f) { return f.id === p[0] && f.sections.some(function (s) { return s.fields.some(function (x) { return x.id === p[1]; }); }); }); }), '예외 목록이 실제 칸을 가리켜요');
});
test('내 정보 카드: 다니는 병원·담당 의사, 먹는 약(처방전대로 직접 적는 자유 칸), 알레르기·다른 병, 연락할 사람', function () {
  const f = FORMS[2], all = {};
  f.sections.forEach(function (s) { s.fields.forEach(function (x) { all[x.id] = x; }); });
  has(all.clinic.label, '담당 병원과 의사');
  eq(all.meds.label, '먹는 약'); eq(all.meds.hint, '처방전대로 직접 적어요');
  has(all.allergy.label, '알레르기'); has(all.conditions.label, '지병');
  eq(all.contact.label, '연락할 사람');
});
test('안전 계획 카드는 짧게: 칸 5개 이하, 줄 수 합 10 이하, 소절 하나', function () {
  const f = FORMS[1];
  eq(f.sections.length, 1);
  const fs_ = f.sections[0].fields;
  ok(fs_.length <= 5, '칸 ' + fs_.length);
  ok(fs_.reduce(function (a, x) { return a + x.n; }, 0) <= 10, '줄 수');
  eq(f.short, true);
});

/* ---------- 금지 ---------- */
test('금지 칸 없음: id 에 name·rrn·address·account·dose·mg 등, 이름표에 성명·주민·주소·계좌·생년월일·용량·mg', function () {
  const BAD_ID = /(^|-)(name|names|rrn|ssn|resident|address|addr|account|bank|card-number|dose|dosage|mg|birth|birthday|id-number|passport)(-|$)/;
  /* "이름" 칸(내 이름) 금지. 약 이름·병원 이름처럼 다른 것의 이름, "이름만"(약은 이름만 적기)은 괜찮아요 */
  const BAD_LABEL = /^(내|나의|본인|당사자)?\s*이름\s*($|[:(])|성명|주민|주소|계좌|통장|생년월일|용량|복용량|\bmg\b|밀리그램|㎎|여권/i;
  ['이름', '내 이름', '이름:', '본인 이름(한글)', '성명', '주소', '계좌번호', '1회 용량', '10 mg'].forEach(function (bad) { ok(BAD_LABEL.test(bad), '금지 규칙이 잡아야 해요: ' + bad); });
  each(function (f, s, x) {
    ok(!BAD_ID.test(x.id), f.id + '.' + x.id + ' 금지 id');
    ok(!BAD_LABEL.test(x.label), f.id + '.' + x.id + ' 금지 이름표: ' + x.label);
    ok(!x.hint || !BAD_LABEL.test(x.hint), f.id + '.' + x.id + ' 금지 덧말: ' + x.hint);
  });
  ['name', 'rrn', 'address', 'account', 'dose', 'mg'].forEach(function (w) { ok(lib.FORBIDDEN_IDS.indexOf(w) >= 0, 'lib.FORBIDDEN_IDS 에 ' + w); });
});
test('양식 자료에 WRAP·사전 의향서·사전 진술 이름, 점수·판정 말, 약 이름 예시가 없다', function () {
  const txt = JSON.stringify(FORMS);
  ['WRAP', '웰니스', '회복 실천', '의향서', '사전 진술', '사전진술', '점수', '위험도', '판정', '진단', '입원해야', '극단적'].forEach(function (w) { not(txt, w, '금지 말'); });
  /* 약 이름 예시를 미리 채우지 않는다: 약 글(07분류) 가운데 제목이 약 이름 하나인 글의 이름 */
  const names = Object.keys(ART).filter(function (s) { return ART[s].indexOf(path.join('content', '07-medication')) >= 0; })
    .map(function (s) { return String(article(s).meta.title || '').split(/[\s(:·]/)[0]; })
    .filter(function (t) { return /^[가-힣]{3,}$/.test(t) && /(핀|돈|졸|롤|드|진|린|라|프)$/.test(t); });
  ok(names.length >= 5, '약 이름 목록을 찾지 못했어요: ' + names.join(','));
  names.forEach(function (n) { not(txt, n, '약 이름 예시'); });
});
test('소스 금지: 바깥 요청·음성·공유·쿼리 주소·innerHTML·위기어 검사 없음, 저장 키는 jhb.ui.plan.keep·data', function () {
  const src = read('js/pages/plan.js');
  ['fetch(', 'XMLHttpRequest', 'speechSynthesis', 'sendBeacon', 'navigator.share', 'location.search', 'pushState', 'innerHTML', 'JHB.crisis', 'WebSocket', 'importScripts'].forEach(function (w) { not(src, w, '소스'); });
  eq(lib.KEYS, { keep: 'jhb.ui.plan.keep', data: 'jhb.ui.plan.data' });
  has(src, "privacy.register({ id: 'plan'", '기록 종류 등록');
  has(src, 'privacy.paused()', '기록 쉼 존중');
  has(src, "'beforeunload'", '떠날 때 확인');
  has(src, "'pagehide'", '뒤로 가기 저장(bfcache)에 들어갈 때 저장하지 않은 글 지우기');
  has(src, "app.notice('device')", '켤 때 안내는 공용 기기 고지와 같은 글자');
  has(src, 'autocomplete', '입력칸 자동 완성 끔');
  has(src, "spellcheck: 'false'", '맞춤법 검사(클라우드) 끔');
  /* 고정 문구 */
  has(src, '법적 효력이 정해진 문서가 아니에요');
  has(src, '이 종이에는 개인 정보가 있어요. 보관에 주의하세요.');
  has(src, '같은 기기를 쓰는 사람이 볼 수 있어요');
  not(src, 'WRAP'); not(src, '의향서');
});
test('css: 색은 토큰만(hex·rgb 없음), 선택자 접두어 .pg-plan- 또는 화면 범위', function () {
  const css = read('css/pages/plan.css').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), 'hex 색');
  ok(!/\brgba?\(/.test(css), 'rgb 색');
  const sels = css.replace(/@media[^{]*\{/g, '').replace(/\{[^{}]*\}/g, '\n').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  sels.forEach(function (line) {
    line.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (sel) {
      if (sel === '}') return;
      ok(/^(\.pg-plan-|\.fp-body\[data-page="plan"\]|#app:has\(> \.fp-body\[data-page="plan"\]|html\[data-motion="reduce"\] \.pg-plan-|:root:has\(\.fp-body\[data-page="plan"\]\))/.test(sel), '선택자: ' + sel);
    });
  });
});

/* ---------- 정적 HTML(자바스크립트 꺼짐·검색엔진) ---------- */
test('staticHtml: 소개·자바스크립트 안내·고정 위기 줄·양식 3종의 칸 이름(입력칸 없음), 바탕 글 링크, 글자는 esc', function () {
  const arts = {}; Object.keys(ART).forEach(function (s) { arts[s] = { slug: s, title: article(s).meta.title }; });
  const html = page.staticHtml({ data: { forms: FORMS }, esc: md.esc, articles: arts });
  has(html, '자바스크립트'); has(html, 'href="tel:109"'); has(html, '법적 효력이 정해진 문서가 아니에요');
  not(html, '<textarea'); not(html, '<input'); not(html, '<form');
  FORMS.forEach(function (f) { has(html, md.esc(f.title)); f.basedOn.forEach(function (s) { has(html, 'href="#/a/' + s + '"'); }); });
  has(html, md.esc('연락할 사람 두세 명과 전화번호'));
  const evil = JSON.parse(JSON.stringify(FORMS)); evil[0].title = '<b>x</b>'; evil[0].sections[0].fields[0].label = '"><img src=x>';
  const h2 = page.staticHtml({ data: { forms: evil }, esc: md.esc, articles: arts });
  not(h2, '<b>x</b>'); not(h2, '<img src=x>');
  /* 자료가 없거나 깨져도 던지지 않고 안내만 */
  const h3 = page.staticHtml({ data: {}, esc: md.esc, articles: {} });
  has(h3, '자바스크립트'); has(h3, 'href="tel:109"');
});

/* ---------- 저장 함수 ---------- */
const V = { 'relapse-plan': { habits: '아침 산책', 'first-change': '  \n ', bogus: 'x' }, 'safety-card': { people: '언니 010' }, nope: { a: 'b' } };
test('clean: 아는 양식·칸만, 빈 칸(공백만)은 빼고, 글자는 그대로(줄바꿈 정리·길이 제한만)', function () {
  eq(lib.clean(V, FORMS), { 'relapse-plan': { habits: '아침 산책' }, 'safety-card': { people: '언니 010' } });
  eq(lib.normText('가\r\n나\r다'), '가\n나\n다');
  eq(lib.normText('a'.repeat(lib.MAX_LEN + 50)).length, lib.MAX_LEN);
  eq(lib.normText(null), ''); eq(lib.normText(12), '12');
  eq(lib.hasInput(V, FORMS), true);
  eq(lib.hasInput({ 'relapse-plan': { habits: ' \n\t' } }, FORMS), false);
  eq(lib.hasInput({}, FORMS), false);
});
test('load: 아무것도 없으면 저장 꺼짐·빈 값, 읽기만 하고 쓰지 않는다', function () {
  const s = mem();
  eq(lib.load(s, FORMS), { keep: false, values: {}, at: 0 });
  eq(keys(s), []);
  /* keep 이 true 가 아니면 남은 data 는 읽지 않는다 */
  s.set(lib.KEYS.data, { v: 1, at: 5, forms: { 'safety-card': { people: '남은 값' } } });
  eq(lib.load(s, FORMS).values, {});
  eq(keys(s), ['jhb.ui.plan.data'], 'load 는 지우지도 않음');
  /* tidy 는 꺼진 상태의 남은 값을 지운다(화면을 열 때 한 번) */
  eq(lib.tidy(s), true); eq(keys(s), []);
  eq(lib.tidy(s), false);
});
test('기본은 저장 안 함: 켜기 전에는 어떤 키도 쓰지 않는다(save 도 keep 이 꺼져 있으면 거절)', function () {
  const s = mem();
  const r = lib.save(s, V, FORMS, 100);
  eq(r.saved, false); eq(r.reason, 'off'); eq(keys(s), []);
});
test('켜기: 기록 쉼이면 거절(키 0), 아니면 keep=true 와 지금 적은 것을 저장', function () {
  const s = mem();
  const r0 = lib.enable(s, V, FORMS, { paused: true, now: 1 });
  eq(r0.ok, false); eq(r0.refused, 'paused'); eq(keys(s), []);
  const r = lib.enable(s, V, FORMS, { paused: false, now: 1000 });
  eq(r.ok, true); eq(r.at, 1000);
  eq(keys(s), ['jhb.ui.plan.data', 'jhb.ui.plan.keep']);
  eq(s.get(lib.KEYS.keep), true);
  eq(s.get(lib.KEYS.data), { v: 1, at: 1000, forms: { 'relapse-plan': { habits: '아침 산책' }, 'safety-card': { people: '언니 010' } } });
  eq(lib.load(s, FORMS), { keep: true, values: { 'relapse-plan': { habits: '아침 산책' }, 'safety-card': { people: '언니 010' } }, at: 1000 });
  /* 빈 채로 켜면 keep 만 */
  const s2 = mem();
  eq(lib.enable(s2, {}, FORMS, { now: 3 }).ok, true);
  eq(keys(s2), ['jhb.ui.plan.keep']);
});
test('저장(버튼): 켜진 상태에서만 쓰고, 다 비우고 저장하면 data 키를 지운다(keep 은 남음)', function () {
  const s = mem();
  lib.enable(s, V, FORMS, { now: 1 });
  const r = lib.save(s, { 'my-info': { allergy: '페니실린' } }, FORMS, 2000);
  eq(r.saved, true); eq(r.at, 2000);
  eq(lib.load(s, FORMS).values, { 'my-info': { allergy: '페니실린' } });
  const r2 = lib.save(s, { 'my-info': { allergy: '   ' } }, FORMS, 3000);
  eq(r2.saved, true); eq(keys(s), ['jhb.ui.plan.keep']);
  eq(lib.load(s, FORMS), { keep: true, values: {}, at: 0 });
  /* 기록 쉼이면 새로 쓰지 않는다(이미 저장한 것은 그대로) */
  lib.save(s, V, FORMS, 4000);
  const before = JSON.stringify(s.m);
  const r3 = lib.save(s, { 'my-info': { allergy: '새 값' } }, FORMS, 5000, { paused: true });
  eq(r3.saved, false); eq(r3.reason, 'paused'); eq(JSON.stringify(s.m), before);
});
test('끄기·전부 지우기: 두 키를 모두 지운다(키 0)', function () {
  const s = mem();
  lib.enable(s, V, FORMS, { now: 1 });
  lib.disable(s); eq(keys(s), []);
  lib.enable(s, V, FORMS, { now: 1 });
  s.set('jhb.ui.other', 1);
  lib.clearAll(s); eq(keys(s), ['jhb.ui.other'], '다른 키는 건드리지 않음');
});
test('저장 실패(저장소 막힘·용량 초과): 켜기는 반쯤 쓴 값을 남기지 않고, 저장은 실패를 알린다', function () {
  const s = mem({ fail: function (k) { return k === 'jhb.ui.plan.keep'; } });
  const r = lib.enable(s, V, FORMS, { now: 1 });
  eq(r.ok, false); eq(r.reason, 'store'); eq(keys(s), []);
  const s2 = mem({ fail: function (k) { return k === 'jhb.ui.plan.data'; } });
  const r2 = lib.enable(s2, V, FORMS, { now: 1 });
  eq(r2.ok, false); eq(keys(s2), []);
  const s3 = mem(); lib.enable(s3, V, FORMS, { now: 1 });
  const s3b = { m: s3.m, get: s3.get, set: function () { return false; }, remove: s3.remove };
  const r3 = lib.save(s3b, { 'my-info': { allergy: 'x' } }, FORMS, 9);
  eq(r3.saved, false); eq(r3.reason, 'store');
  eq(lib.load(s3, FORMS).values, { 'relapse-plan': { habits: '아침 산책' }, 'safety-card': { people: '언니 010' } }, '옛 값은 그대로');
});
test('load: 깨진 값(글자·배열·모르는 양식·글자가 아닌 칸)도 던지지 않고 거른다', function () {
  [null, 'x', [1, 2], { v: 1, forms: 'x' }, { v: 1, forms: { 'relapse-plan': 'x' } }, { v: 1, forms: { 'relapse-plan': { habits: 5, 'my-steps': { a: 1 } } } }].forEach(function (bad) {
    const s = mem(); s.set(lib.KEYS.keep, true); s.set(lib.KEYS.data, bad);
    const r = lib.load(s, FORMS);
    eq(r.keep, true);
    ok(r.values && typeof r.values === 'object', '빈 값');
    ok(!r.values['relapse-plan'] || typeof r.values['relapse-plan'].habits !== 'number', '숫자 칸은 버림');
  });
  const s = mem(); s.set(lib.KEYS.keep, 'true'); s.set(lib.KEYS.data, { v: 1, forms: { 'safety-card': { people: 'a' } } });
  eq(lib.load(s, FORMS).keep, false, 'keep 은 true 일 때만');
});
test('isDirty: 저장 꺼짐이면 적은 것이 있을 때만, 켜짐이면 마지막 저장과 다를 때만', function () {
  eq(lib.isDirty({}, FORMS, false, ''), false);
  eq(lib.isDirty({ 'safety-card': { people: '  ' } }, FORMS, false, ''), false);
  eq(lib.isDirty({ 'safety-card': { people: 'a' } }, FORMS, false, ''), true);
  const v = { 'safety-card': { people: 'a' } };
  const sig = lib.sig(v, FORMS);
  eq(lib.isDirty(v, FORMS, true, sig), false);
  eq(lib.isDirty({ 'safety-card': { people: 'ab' } }, FORMS, true, sig), true);
  eq(lib.isDirty({ 'safety-card': { people: 'a', 'my-signs': ' ' } }, FORMS, true, sig), false, '공백만 더한 칸은 같은 값');
  eq(lib.sig({ 'safety-card': { people: 'a' }, 'relapse-plan': { habits: 'b' } }, FORMS), lib.sig({ 'relapse-plan': { habits: 'b' }, 'safety-card': { people: 'a' } }, FORMS), '순서와 상관없음');
});

/* ---------- 양식 고르기(조각에는 양식 id 만) ---------- */
test('formFromHash: #<양식 id> 만 받고 나머지는 첫 양식', function () {
  eq(lib.formFromHash('#safety-card', FORMS), 'safety-card');
  eq(lib.formFromHash('#my-info', FORMS), 'my-info');
  eq(lib.formFromHash('', FORMS), 'relapse-plan');
  eq(lib.formFromHash('#', FORMS), 'relapse-plan');
  eq(lib.formFromHash('#bogus', FORMS), 'relapse-plan');
  eq(lib.formFromHash('#safety-card?x=1', FORMS), 'relapse-plan');
  eq(lib.formFromHash('#/a/x', FORMS), 'relapse-plan');
  eq(lib.formFromHash('#__proto__', FORMS), 'relapse-plan');
  eq(lib.fragment('safety-card'), '#safety-card');
});

/* ---------- 떠날 때 확인할 링크 ---------- */
test('leaveKind: 전화·문자 링크는 "tel"(막지 않음), 같은 화면 조각·새 창·보조키·다운로드는 "pass", 다른 화면은 "guard"', function () {
  const here = 'http://localhost:5174/plan/#relapse-plan';
  function k(href, o) { return lib.leaveKind(Object.assign({ href: href, here: here }, o || {})); }
  eq(k('tel:109'), 'tel'); eq(k('tel:1577-0199'), 'tel'); eq(k('sms:109'), 'tel');
  eq(k('mailto:a@b.c'), 'pass');
  eq(k('http://localhost:5174/plan/#safety-card'), 'pass');
  eq(k('http://localhost:5174/plan/'), 'guard', '같은 주소 다시 열기는 새로 고침과 같아요');
  eq(k('http://localhost:5174/a/relapse-prevention-plan/'), 'guard');
  eq(k('https://example.org/'), 'guard');
  eq(k('http://localhost:5174/a/x/', { target: '_blank' }), 'pass');
  eq(k('http://localhost:5174/a/x/', { mods: true }), 'pass');
  eq(k('http://localhost:5174/a/x/', { button: 1 }), 'pass');
  eq(k('http://localhost:5174/a/x/', { download: true }), 'pass');
  eq(k('javascript:void(0)'), 'pass');
  eq(k(''), 'pass');
});

/* ---------- 종이 모형 ---------- */
test('sheet: 적은 칸은 글자 그대로, 빈 칸은 n 줄의 빈 줄, 고정 위기 줄·개인 정보·법적 효력 문구', function () {
  const f = FORMS[1];
  const m = lib.sheet(f, { 'safety-card': { people: '언니\n010-0000-0000', 'my-signs': '   ' } });
  eq(m.title, '안전 계획 카드'); eq(m.fixed, true);
  const fl = m.sections[0].fields;
  eq(fl.map(function (x) { return x.id; }), f.sections[0].fields.map(function (x) { return x.id; }));
  const people = fl.filter(function (x) { return x.id === 'people'; })[0];
  eq(people.text, '언니\n010-0000-0000'); eq(people.lines, 0);
  const signs = fl.filter(function (x) { return x.id === 'my-signs'; })[0];
  eq(signs.text, ''); eq(signs.lines, 2);
  eq(m.privacy, '이 종이에는 개인 정보가 있어요. 보관에 주의하세요.');
  has(m.legal, '법적 효력이 정해진 문서가 아니에요');
  eq(m.notes, f.notes);
});
test('fmtDay·fmtSaved: 인쇄한 날과 저장한 때', function () {
  eq(lib.fmtDay(new Date(2026, 10, 14)), '2026년 11월 14일');
  eq(lib.fmtSaved(new Date(2026, 10, 14, 9, 5).getTime()), '11월 14일 09:05');
  eq(lib.fmtSaved(0), '');
});

/* ---------- 검수 뒤 더한 것 ---------- */
test('고정 위기 줄은 확인한 날·출처를 남기고, 글 crisis-hotlines 의 번호·기관·24시간·문자 안내와 같다', function () {
  eq(lib.TELS_CHECKED, '2026-11-14');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(lib.TELS_CHECKED), 'checked 날짜 꼴');
  ok(Array.isArray(lib.TELS_SOURCES) && lib.TELS_SOURCES.length >= 3, '출처 주소');
  lib.TELS_SOURCES.forEach(function (u) { ok(/^https:\/\//.test(u), '출처는 https: ' + u); });
  const raw = A.stripBom(fs.readFileSync(ART['crisis-hotlines'], 'utf8'));
  const body = bodyText('crisis-hotlines');
  /* 출처 주소는 그 글의 출처 목록에도 있어요 */
  lib.TELS_SOURCES.forEach(function (u) { has(raw, u, '글 출처 목록에 있는 주소'); });
  /* 번호와 기관 이름 */
  eq(lib.TELS.map(function (t) { return t.num; }), ['109', '1577-0199', '119']);
  has(body, '109(자살예방상담, 24시간)'); has(body, '정신건강위기상담'); has(body, '119');
  lib.TELS.slice(0, 2).forEach(function (t) { has(raw, t.what, t.num + ' 기관 이름'); });
  /* 24시간: 글의 요점 줄과 표 */
  has(raw, '자살예방상담 109와 정신건강위기상담 1577-0199는 24시간 받아요.');
  ok(/\|\s*\*\*109\*\*\s*\|[^|]*\|\s*24시간/.test(raw), '표: 109 24시간');
  ok(/\|\s*\*\*1577-0199\*\*\s*\|[^|]*\|\s*24시간/.test(raw), '표: 1577-0199 24시간');
  eq(lib.TEXT.fixedNote, '109·1577-0199는 24시간 받아요. 전화가 어렵다면 109로 문자를 보낼 수 있어요.');
  has(body, '전화가 어렵다면 109로 문자를 보낼 수도 있어요.');
});
test('clickKind: "지금 도움" 버튼·시트 가림막은 확인을 끄지 않고, 시트 안 글 링크는 확인 상자로, 전화·문자만 그대로', function () {
  const here = 'http://localhost:5174/plan/';
  function k(o) { return lib.clickKind(Object.assign({ here: here }, o)); }
  eq(k({ inHelpBtn: true, hasSheet: true, href: 'http://localhost:5174/a/crisis-hotlines/' }), 'none', '시트가 열릴 뿐 떠나지 않아요');
  eq(k({ inHelpBtn: true, hasSheet: false, href: 'http://localhost:5174/a/crisis-hotlines/' }), 'help-nav', '시트가 없으면 위기 글로 바로 가요');
  eq(k({ inScrim: true }), 'none');
  eq(k({ inSheet: true, href: 'tel:109' }), 'tel');
  eq(k({ inSheet: true, href: 'sms:109' }), 'tel');
  eq(k({ inSheet: true, href: 'http://localhost:5174/a/crisis-hotlines/#h-3' }), 'sheet', '시트 안 글 링크는 확인');
  eq(k({ inSheet: true, href: 'http://localhost:5174/guide/' }), 'sheet');
  eq(k({ inSheet: true, href: 'http://localhost:5174/a/x/', mods: true }), 'none', '새 탭은 그대로');
  eq(k({ href: 'http://localhost:5174/a/x/' }), 'guard');
  eq(k({ href: 'tel:1577-0199' }), 'tel');
  eq(k({ href: '' }), 'none');
  /* 소스: "지금 도움" 버튼·시트를 누르는 것만으로 떠날 때 확인을 끄지 않아요(옛 3초 창 없음) */
  const src = read('js/pages/plan.js');
  not(src, "'#btn-help, .tool-help, .nh-sheet, .nh-scrim')) { pass(); return; }");
  not(src, 'passUntil');
});
test('skipGate: 전화 링크 뒤 건너뛰기는 한 번만, 아주 짧게(300ms), 쓰면 바로 풀려요', function () {
  ok(lib.TEL_SKIP_MS <= 300, '전화 뒤 창은 300ms 이하');
  const g = lib.skipGate();
  eq(g.take(0), false, '켜기 전');
  g.arm(1000, lib.TEL_SKIP_MS);
  eq(g.armed(1100), true);
  eq(g.take(1100), true, '그 한 번은 건너뜀');
  eq(g.take(1150), false, '두 번째(곧이어 새로 고침)는 확인');
  g.arm(1000, lib.TEL_SKIP_MS);
  eq(g.take(1000 + lib.TEL_SKIP_MS + 1), false, '창이 지나면 확인');
  eq(g.take(1000 + 10), false, '한 번 지나간 뒤에는 풀림');
});
test('merge: 다른 탭과 양식 단위로 합친다(손대지 않은 종이는 저장소 것, 손댄 종이는 이 화면 것), 겹치면 conflicts', function () {
  /* 탭 A: 저장 꺼짐에서 재발 계획을 적음(base 없음). 탭 B 가 안전 카드를 저장 */
  const stored = { 'safety-card': { people: 'B의 안전 카드' } };
  const localA = { 'relapse-plan': { habits: 'A의 재발 계획' } };
  const m = lib.merge(stored, localA, {}, FORMS);
  eq(m.values, { 'relapse-plan': { habits: 'A의 재발 계획' }, 'safety-card': { people: 'B의 안전 카드' } }, 'B 의 안전 카드가 지워지지 않아요');
  eq(m.adopted, ['safety-card']); eq(m.conflicts, []);
  /* 둘 다 같은 양식을 다르게 고침 */
  const base = { 'safety-card': { people: '처음' } };
  const m2 = lib.merge({ 'safety-card': { people: 'B가 고침' } }, { 'safety-card': { people: 'A가 고침' } }, base, FORMS);
  eq(m2.values, { 'safety-card': { people: 'A가 고침' } }); eq(m2.conflicts, ['safety-card']); eq(m2.adopted, []);
  /* 다른 탭이 양식을 비웠고 이 탭은 손대지 않음 → 비운 것을 따름 */
  const m3 = lib.merge({}, base, base, FORMS);
  eq(m3.values, {}); eq(m3.adopted, ['safety-card']);
  /* 바뀐 것 없음 */
  const m4 = lib.merge(base, base, base, FORMS);
  eq(m4.values, base); eq(m4.adopted, []); eq(m4.conflicts, []);
  /* 공백만 더한 칸은 손대지 않은 것과 같아요 */
  const m5 = lib.merge({ 'safety-card': { people: 'B' } }, { 'safety-card': { people: '처음', 'my-signs': '  ' } }, base, FORMS);
  eq(m5.values, { 'safety-card': { people: 'B' } }); eq(m5.adopted, ['safety-card']);
});
test('tabLabel·titleOf: 양식 제목이 없어도 "undefined" 가 나오지 않는다', function () {
  eq(lib.tabLabel({ id: 'x', title: '제목', tab: '짧게' }), '짧게');
  eq(lib.tabLabel({ id: 'x', title: '제목' }), '제목');
  eq(lib.tabLabel({ id: 'x' }), 'x');
  eq(lib.titleOf({ id: 'x' }), '');
  eq(lib.sheet({ id: 'x', sections: [] }, {}).title, '');
  const src = read('js/pages/plan.js');
  not(src, '[String(f.title)]'); not(src, '[f.tab || f.title]');
});
test('짧은 카드(안전 계획 카드) 종이에는 카드 안에도 일반 고지가 남는다', function () {
  const m = lib.sheet(FORMS[1], {});
  ok(FORMS[1].short, '안전 계획 카드는 short');
  has(m.notice, '일반적인 정보예요'); has(m.notice, '전문가 감수는 받지 않았어요');
  eq(lib.sheet(FORMS[0], {}).notice, '', '긴 양식은 바닥 고지로 충분');
  const general = md.noticeHtml ? String(md.noticeHtml('general')) : '';
  if (general) { has(general, '일반적인 정보예요'); has(general, '전문가 감수는 받지 않았어요'); }
});
test('양식을 바꿀 때 주소에 양식 이름을 새로 남기지 않는다(들어올 때의 조각만 읽음)', function () {
  const src = read('js/pages/plan.js');
  not(src, "location.pathname + fragment(id)");
  has(src, "history.replaceState(history.state, '', location.pathname)");
});
test('저장 상자 문구: 기본은 저장하지 않는다는 말과 기기 고지를 이어 준다, 띠는 저장 상자 밖에서 붙어 따라온다', function () {
  const src = read('js/pages/plan.js'), css = read('css/pages/plan.css');
  has(src, '이 화면은 기본으로 저장하지 않아요.');
  has(src, '켤 때만 맨 아래 안내처럼 이 기기에 남아요.');
  has(src, '[fixed, band, storeBox,');
  ok(/\.pg-plan-band \{[^}]*position: sticky; top: var\(--top-h\)/.test(css), '띠 sticky');
});
