/* 상황별 길잡이(js/pages/guide.js, data/kb/guide.json, data/kb/contacts.json, data/pages/guide.json) 테스트
   - 번호 레지스트리: 모든 번호에 확인한 날·공식 출처·alsoIn, 번호가 그 글 본문에 실제로 있음, data/crisis-card.js 와 같은 번호·같은 뜻
   - 상황: read·from slug 존재, 권리 문장·덧말은 근거 글 본문의 문장 그대로, 입원 관련은 요건과 권리를 같은 비중으로
   - 문구: 판정형 표현(허용 목록 방식)·약 중단 권유·글 검사기 금지 표현 0
   - 화면 코드: 고른 상황을 저장·주소·history 에 남기지 않음, 역할로 내용을 바꾸지 않음 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const page = require('../js/pages/guide.js');
const G = page.lib;
const md = require('../js/md.js');
const CC = require('../tools/check-content.cjs');

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^﻿/, '')); }
const CONTACTS = readJson('data/kb/contacts.json');
const GUIDE = readJson('data/kb/guide.json');
const DECL = readJson('data/pages/guide.json');
const SRC = fs.readFileSync(path.join(ROOT, 'js', 'pages', 'guide.js'), 'utf8');

/* 글은 content/ 의 실제 파일에서 (data/toc.js 는 빌드 전이면 옛것일 수 있어요) */
const ARTS = {};
(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (/\.md$/.test(d.name)) {
      const doc = md.parse(fs.readFileSync(p, 'utf8'));
      const slug = d.name.replace(/\.md$/, '');
      ARTS[slug] = { slug: slug, title: doc.meta.title, summary: doc.meta.summary, section: String(doc.meta.section), body: doc.body, plain: md.plain(doc.body) };
    }
  });
})(path.join(ROOT, 'content'));
function seoulToday() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
const TODAY = seoulToday();
const BY = {}; CONTACTS.forEach(function (c) { BY[c.id] = c; });
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
/* 본문에 번호가 따로 있는지(더 긴 번호·숫자의 일부가 아님) */
function hasNumber(text, tel) {
  const re = new RegExp('(^|[^0-9-])' + tel.replace(/-/g, '\\-') + '(?![0-9-]|\\s*(명|개|년|건|%|일|조|쪽|mg))');
  return re.test(text);
}
/* 문장이 글 본문(md.plain)에 그대로 있는지: 끝의 마침표만 빼고 비교 */
function inArticle(text, slug) {
  const a = ARTS[slug];
  if (!a) return false;
  const t = String(text).replace(/\s+/g, ' ').trim().replace(/[.。]$/, '');
  return t.length >= 6 && a.plain.indexOf(t) >= 0;
}
function loadCrisisCard() {
  const src = fs.readFileSync(path.join(ROOT, 'data', 'crisis-card.js'), 'utf8');
  const sb = {}; sb.window = sb;
  vm.runInNewContext(src, sb);
  return sb.window.JHB.crisisCard;
}

/* ---------- 선언 ---------- */
test('guide 선언: 지시서의 이름표(제목·짧은 이름·묶음·nav·robots·고지·자료)', function () {
  eq(DECL.id, 'guide');
  eq(DECL.title, '상황별 길잡이');
  eq(DECL.label, '길잡이');
  eq(DECL.group, '안내');
  eq(DECL.nav, ['top', 'side', 'home', 'palette']);
  eq(DECL.robots, 'index');
  eq(DECL.notice, ['general', 'dated']);
  eq(DECL.data, ['guide', 'contacts']);
  ok(DECL.crisisLine !== false, '위기 줄은 빠지지 않아요');
  ok(G.isDate(DECL.updated), 'updated 는 YYYY-MM-DD');
  ok(DECL.summary.length <= 155, 'summary 155자 이하: ' + DECL.summary.length);
});

/* ---------- 번호 레지스트리 ---------- */
test('contacts.json: 모든 번호에 이름·번호·확인한 날·공식 출처(https)·alsoIn, id 중복 없음', function () {
  ok(Array.isArray(CONTACTS) && CONTACTS.length >= 5, '배열이어야 해요');
  const ids = new Set(), tels = new Set();
  const KEYS = ['id', 'name', 'tel', 'needsArea', 'hours', 'hoursSource', 'note', 'noteSource', 'checked', 'source', 'alsoIn'];
  CONTACTS.forEach(function (c) {
    const at = c.id + ': ';
    Object.keys(c).forEach(function (k) { ok(KEYS.indexOf(k) >= 0, at + '모르는 항목 ' + k); });
    ok(/^[a-z0-9][a-z0-9-]*$/.test(c.id), at + 'id 형식');
    ok(!ids.has(c.id), at + 'id 중복'); ids.add(c.id);
    ok(!tels.has(c.tel), at + '같은 번호가 두 번'); tels.add(c.tel);
    ok(typeof c.name === 'string' && c.name.trim(), at + 'name');
    ok(G.TEL_RE.test(c.tel), at + '번호 형식(공공 짧은 번호나 15xx~18xx-xxxx): ' + c.tel);
    ok(c.hours === null || (typeof c.hours === 'string' && c.hours.trim()), at + 'hours 는 글자나 null');
    ok(G.isDate(c.checked), at + 'checked 는 YYYY-MM-DD');
    ok(c.checked <= TODAY, at + 'checked 가 오늘보다 뒤예요');
    ok(/^https:\/\/[^\s]+$/.test(c.source), at + 'source 는 https 주소');
    if (c.noteSource !== undefined) ok(/^https:\/\/[^\s]+$/.test(c.noteSource), at + 'noteSource 는 https 주소');
    if (c.hoursSource !== undefined) ok(/^https:\/\/[^\s]+$/.test(c.hoursSource) && c.hours, at + 'hoursSource 는 https 주소이고 hours 가 있어야 해요');
    ok(c.needsArea === undefined || c.needsArea === true, at + 'needsArea 는 true 이거나 없음');
    ok(c.note === null || (typeof c.note === 'string' && c.note.trim()), at + 'note 는 글자나 null');
    ok(Array.isArray(c.alsoIn) && c.alsoIn.length >= 1, at + 'alsoIn 이 비었어요');
  });
});

test('contacts.json: 공공기관·전국 공통 번호만(병원·의원·의사 이름 없음)', function () {
  CONTACTS.forEach(function (c) {
    ok(!/병원|의원|클리닉|의사|선생님/.test(c.name), c.id + ': 병원·의사 이름은 싣지 않아요: ' + c.name);
    /* 정부·공공기관 누리집(go.kr·or.kr, 대한민국 정책브리핑 korea.kr) */
    ok(/^https:\/\/([a-z0-9-]+\.)*([a-z0-9-]+\.(go|or)\.kr|korea\.kr)\//.test(c.source + '/'), c.id + ': 공식 기관 주소여야 해요: ' + c.source);
  });
});

test('contacts.json: 번호가 alsoIn 글 본문에 실제로 있다', function () {
  CONTACTS.forEach(function (c) {
    c.alsoIn.forEach(function (slug) {
      ok(ARTS[slug], c.id + ': alsoIn 글이 없어요: ' + slug);
      ok(hasNumber(ARTS[slug].body, c.tel), c.id + ': ' + slug + ' 본문에 ' + c.tel + ' 이 없어요');
    });
  });
});

test('contacts.json: data/crisis-card.js 의 번호(109·1577-0199·119·112)와 같은 번호·같은 뜻', function () {
  const card = loadCrisisCard();
  const seen = {};
  Object.keys(card).forEach(function (k) {
    (card[k].actions || []).forEach(function (a) {
      const m = /^tel:(.+)$/.exec(a.href || '');
      if (!m) return;
      seen[m[1]] = a.label;
    });
  });
  ['109', '1577-0199', '119'].forEach(function (t) { ok(seen[t], 'crisis-card 에 ' + t + ' 이 있어야 해요'); });
  Object.keys(seen).forEach(function (tel) {
    const c = CONTACTS.filter(function (x) { return x.tel === tel; })[0];
    ok(c, 'contacts.json 에 ' + tel + ' 이 없어요');
    const label = seen[tel];
    /* '109 자살예방상담 (24시간)' → 이름 낱말 '자살예방상담', 덧말 '24시간' */
    const word = label.replace(/^[0-9-]+\s*/, '').replace(/\s*\(.*$/, '').trim();
    ok(c.name.replace(/\s/g, '').indexOf(word.replace(/\s/g, '')) >= 0, tel + ': 이름 뜻이 달라요(crisis-card "' + word + '", contacts "' + c.name + '")');
    if (/24시간/.test(label)) ok(/24시간/.test(c.hours || ''), tel + ': crisis-card 는 24시간인데 contacts 의 hours 가 달라요: ' + c.hours);
  });
});

test('contacts.json: 글에 운영 시간이 적힌 번호는 글과 같은 시간', function () {
  /* crisis-hotlines 표: 129 는 평일 9~18시와 긴급복지지원·정신건강 상담 24시간, 1388 은 싣지 않음 */
  has(BY['welfare-129'].hours, '평일 9~18시');
  has(BY['welfare-129'].hours, '24시간');
  has(ARTS['crisis-hotlines'].plain, '긴급복지지원·정신건강 상담은 24시간');
  /* 132: habeas-corpus-relief·justice-system 의 '평일 오전 9시~11시 50분, 오후 1시~5시 50분' */
  has(ARTS['justice-system'].plain, '평일 오전 9시~11시 50분, 오후 1시~5시 50분');
  has(BY['legalaid-132'].hours, '9시~11시 50분');
  has(BY['legalaid-132'].hours, '13시~17시 50분');
  /* 1366: family-violence-safety 의 '365일 24시간' */
  has(ARTS['family-violence-safety'].plain, '365일 24시간');
  eq(BY['women-1366'].hours, '365일 24시간');
  /* 109 문자: crisis-hotlines 의 문장과 같은 뜻, 확인한 공식 주소가 따로 있음 */
  has(ARTS['crisis-hotlines'].plain, '109로 문자를 보낼 수도 있어요');
  ok(/madeullan\.or\.kr/.test(BY['suicide-109'].noteSource || ''), '109 문자 안내는 마들랜 공식 안내로 확인');
});

/* crisis-hotlines 의 '번호 한눈에' 표 전체: 레지스트리에 있는 번호는 운영 시간이 같아야 해요.
   공식 페이지에서 운영 시간 문장을 찾지 못해 hours 를 비워 둔 번호는 아래 목록에 이유와 함께 적어요(목록 밖이면 실패). */
const HOURS_UNCONFIRMED = {
  /* 비어 있어요. 119 는 정책브리핑(소방방재청 브리핑 '1년 365일 24시간 … 신고접수 및 출동'), 112 는 경찰청 사이버범죄 신고시스템
     ('긴급신고 112(무료) - 상담 가능시간 : 365일 24시간')에서 확인해 contacts 의 hours·hoursSource 를 채웠어요(2026-11-14, K6). */
};
function hourTokens(s) { return (String(s || '').replace(/\[\^\d+\]/g, '').match(/\d+~\d+시|24시간/g) || []).sort(); }
test('contacts.json: crisis-hotlines 표의 운영 시간과 같다(표 전체)', function () {
  const rows = ARTS['crisis-hotlines'].body.split('\n').filter(function (l) { return /^\|\s*\*\*[0-9-]+\*\*\s*\|/.test(l); });
  ok(rows.length >= 5, '표 행을 찾지 못했어요: ' + rows.length);
  let compared = 0;
  rows.forEach(function (l) {
    const cells = l.split('|').map(function (x) { return x.trim(); });
    const tel = cells[1].replace(/\*/g, ''), hours = cells[3];
    const c = CONTACTS.filter(function (x) { return x.tel === tel; })[0];
    if (!c) return;
    if (c.hours === null) {
      ok(HOURS_UNCONFIRMED[tel], tel + ': 글 표는 "' + hours + '"인데 contacts 에 운영 시간이 없어요(확인 못 했으면 HOURS_UNCONFIRMED 에 이유를)');
      return;
    }
    eq(hourTokens(c.hours), hourTokens(hours), tel + ': 운영 시간이 글 표와 달라요');
    compared++;
  });
  ok(compared >= 3, '비교한 번호가 너무 적어요: ' + compared);
  Object.keys(HOURS_UNCONFIRMED).forEach(function (tel) {
    const c = CONTACTS.filter(function (x) { return x.tel === tel; })[0];
    ok(c && c.hours === null, tel + ': 운영 시간을 채웠다면 HOURS_UNCONFIRMED 에서 빼요');
  });
});

test('contacts.json: 휴대전화에서 지역번호가 필요한 번호(1331)는 needsArea 로 표시하고 화면에 크게 보인다', function () {
  eq(BY['humanrights-1331'].needsArea, true);
  const sit = G.model(GUIDE, CONTACTS).byId.unjust;
  const o = { esc: esc, art: function (x) { return ARTS[x] || null; }, href: function (x) { return '#/a/' + x; } };
  const html = G.situationBody(sit, o, 3);
  has(html, '<p class="pg-guide-c-area">' + G.TEXT.needsArea + '</p>');
  has(html, 'aria-label="국가인권위원회 인권상담 1331 전화. ' + G.TEXT.needsArea + '"');
  /* 지역번호가 필요 없는 번호에는 붙지 않아요 */
  const life = G.situationBody(G.model(GUIDE, CONTACTS).byId.life, o, 3);
  not(life, 'pg-guide-c-area');
});

test('guide.json: 한 상황 안에서 연락처 덧말과 권리 문장이 겹치지 않는다', function () {
  function core(s) { return String(s || '').replace(/[\s.,·"]/g, '').replace(/(수도|수)있어요$/, ''); }
  GUIDE.forEach(function (s) {
    const notes = s.contacts.map(function (c) { return core((BY[c.ref] || {}).note); }).filter(Boolean);
    s.rights.forEach(function (r) {
      const t = core(r.text);
      notes.forEach(function (n) { ok(t.indexOf(n) < 0 && n.indexOf(t) < 0, s.id + ': 덧말과 같은 권리 문장 ' + r.text); });
    });
  });
});

/* ---------- 상황 ---------- */
test('guide.json: 상황 12~15개, id·이름 중복 없음, who 는 당사자·가족·주변 사람', function () {
  ok(Array.isArray(GUIDE), '배열');
  ok(GUIDE.length >= 12 && GUIDE.length <= 15, '상황 수: ' + GUIDE.length);
  const ids = new Set(), labels = new Set();
  const KEYS = ['id', 'group', 'label', 'who', 'meds', 'contacts', 'rights', 'read', 'note', 'noteFrom'];
  GUIDE.forEach(function (s) {
    Object.keys(s).forEach(function (k) { ok(KEYS.indexOf(k) >= 0, s.id + ': 모르는 항목 ' + k); });
    ok(/^[a-z0-9][a-z0-9-]*$/.test(s.id), s.id + ': id 형식');
    ok(!ids.has(s.id), '중복 id ' + s.id); ids.add(s.id);
    ok(!labels.has(s.label), '중복 이름 ' + s.label); labels.add(s.label);
    ok(typeof s.group === 'string' && s.group.trim(), s.id + ': group');
    ok(s.label.length <= 18, s.id + ': 버튼 이름은 짧게(18자 이하): ' + s.label);
    ok(Array.isArray(s.who) && s.who.length >= 1, s.id + ': who');
    s.who.forEach(function (w) { ok(G.WHO.indexOf(w) >= 0, s.id + ': who 값 ' + w); });
  });
});

test('guide.json: 지시서의 상황 15개가 모두 있다', function () {
  const want = ['생명이 위급해요', '죽고 싶은 마음이 들어요', '가족이 위협을 느껴요', '증상이 심해져 입원을 고민해요', '병원에 가지 않으려 해요',
    '약을 먹지 않겠다고 해요', '부작용이 너무 힘들어요', '연락이 끊겼어요', '경찰 조사·재판을 받게 됐어요', '입원이 부당하다고 느껴요',
    '병원비가 걱정돼요', '생활비가 끊겼어요', '처음 진단받았어요', '퇴원을 앞두고 있어요', '돌보다 지쳤어요'];
  eq(GUIDE.map(function (s) { return s.label; }).slice().sort(), want.slice().sort());
});

test('guide.json: 연락처 ref 는 레지스트리에 있고 언제 거는지(when)가 있다, 상황마다 1곳 이상', function () {
  GUIDE.forEach(function (s) {
    ok(Array.isArray(s.contacts) && s.contacts.length >= 1, s.id + ': 연락할 곳이 없어요');
    const refs = new Set();
    s.contacts.forEach(function (c) {
      ok(BY[c.ref], s.id + ': 없는 연락처 ' + c.ref);
      ok(!refs.has(c.ref), s.id + ': 같은 연락처 두 번 ' + c.ref); refs.add(c.ref);
      ok(typeof c.when === 'string' && c.when.trim().length >= 4, s.id + ': ' + c.ref + ' 의 when');
    });
  });
  /* 모든 레지스트리 번호가 어느 상황에선가 쓰임(쓰지 않는 번호를 싣지 않음) */
  CONTACTS.forEach(function (c) {
    ok(GUIDE.some(function (s) { return s.contacts.some(function (x) { return x.ref === c.id; }); }), c.id + ' 은 어느 상황에도 쓰이지 않아요');
  });
});

test('guide.json: read 2~4편(slug 존재·중복 없음), rights 의 from·note 의 noteFrom slug 존재', function () {
  GUIDE.forEach(function (s) {
    ok(Array.isArray(s.read) && s.read.length >= 2 && s.read.length <= 4, s.id + ': read 2~4편: ' + (s.read || []).length);
    eq(new Set(s.read).size, s.read.length, s.id + ': read 중복');
    s.read.forEach(function (slug) { ok(ARTS[slug], s.id + ': 없는 글 ' + slug); });
    ok(Array.isArray(s.rights) && s.rights.length >= 1, s.id + ': 알아둘 권리와 제도가 없어요');
    s.rights.forEach(function (r) {
      ok(ARTS[r.from], s.id + ': rights.from 글이 없어요 ' + r.from);
      ok(typeof r.name === 'string' && r.name.trim() && r.name.length <= 16, s.id + ': rights.name 짧은 이름: ' + r.name);
      ok(r.kind === undefined || G.KINDS.indexOf(r.kind) >= 0, s.id + ': rights.kind ' + r.kind);
    });
    ok(typeof s.note === 'string' && s.note.trim(), s.id + ': note');
    ok(ARTS[s.noteFrom], s.id + ': noteFrom 글이 없어요 ' + s.noteFrom);
  });
});

test('guide.json: 권리·제도 문장과 덧말은 근거 글 본문의 문장 그대로(뜻을 바꾸지 않은 짧은 문장)', function () {
  GUIDE.forEach(function (s) {
    s.rights.forEach(function (r) {
      ok(/요(\([^)]*\))?\.$/.test(r.text), s.id + ': 해요체 한 문장(…요. 끝의 조문 괄호는 괜찮아요): ' + r.text);
      ok(r.text.length <= 140, s.id + ': 짧은 문장(140자 이하): ' + r.text.length);
      ok(inArticle(r.text, r.from), s.id + ': ' + r.from + ' 본문에 이 문장이 없어요: ' + r.text);
    });
    s.note.split(/(?<=요\.)\s+/).forEach(function (sent) {
      ok(inArticle(sent, s.noteFrom), s.id + ': ' + s.noteFrom + ' 본문에 덧말 문장이 없어요: ' + sent);
    });
  });
});

/* 강제 입원·입원 요건을 말하는 상황(권리 문장·덧말에서 자동으로 골라요) */
const ADMISSION_RE = /강제\s*입원|입원\s*요건|입원.{0,20}요건|요건.{0,20}입원|입원시키|입원적합성|보호의무자\s*입원|행정입원/;
function admissionSits() {
  return GUIDE.filter(function (s) {
    return s.rights.some(function (r) { return r.kind === 'rule' || ADMISSION_RE.test(r.text); }) || ADMISSION_RE.test(s.note);
  }).map(function (s) { return s.id; });
}
test('guide.json: 입원 관련 상황 고르기는 자동(admission·unjust 를 포함하고, 요건 문장이 있으면 모두)', function () {
  const ids = admissionSits();
  ok(ids.indexOf('admission') >= 0 && ids.indexOf('unjust') >= 0, '입원 관련 상황: ' + ids.join(','));
  ok(ids.indexOf('refuse-care') < 0, 'refuse-care 에는 강제 입원 요건 문장을 두지 않아요(권리 칸이 없으니까)');
});
test('guide.json: 입원 관련 상황은 요건과 당사자의 권리를 같은 비중으로(퇴원 등 심사 청구·인신보호·절차조력)', function () {
  admissionSits().forEach(function (id) {
    const s = GUIDE.filter(function (x) { return x.id === id; })[0];
    ok(s, id + ' 상황이 있어야 해요');
    const rule = s.rights.filter(function (r) { return r.kind === 'rule'; });
    const right = s.rights.filter(function (r) { return r.kind === 'right'; });
    ok(rule.length >= 1, id + ': 요건(rule)이 있어야 해요');
    ok(right.length >= rule.length, id + ': 권리(right)가 요건보다 적어요 ' + right.length + ' < ' + rule.length);
    const names = right.map(function (r) { return r.name; }).join(' ');
    ['퇴원 등 심사 청구', '인신보호', '절차조력'].forEach(function (w) { has(names, w, id + ' 권리'); });
    /* 화면에서도 두 칸이 같은 모양으로 */
    const m = G.model([s], CONTACTS);
    /* 두 칸의 좌우는 상황마다 같게: 늘 요건(rule) → 권리(right) */
    eq(G.rightCols(m.sits[0]).map(function (c) { return c.kind; }), ['rule', 'right']);
  });
  /* 자료 순서가 권리 먼저여도 칸 순서는 그대로 */
  const flipped = G.model([{ id: 'z', label: 'Z', rights: [{ kind: 'right', name: 'a', text: 'A' }, { kind: 'rule', name: 'b', text: 'B' }], read: [] }], CONTACTS);
  eq(G.rightCols(flipped.sits[0]).map(function (c) { return c.kind; }), ['rule', 'right']);
});

test('guide.json: 폭력·위협 상황에는 맥락 문장(대부분 폭력과 관계없고 오히려 피해를 입기 쉬움)이 1개 이상', function () {
  const CONTEXT = /대부분은\s*폭력(을\s*쓰지\s*않|과\s*관계없)/;
  const vs = GUIDE.filter(function (s) { return /위협|폭력/.test(s.label); });
  ok(vs.length >= 1, '폭력·위협 상황');
  vs.forEach(function (s) {
    const texts = [s.note].concat(s.rights.map(function (r) { return r.text; }));
    ok(texts.some(function (t) { return CONTEXT.test(t); }), s.id + ': 맥락 문장이 없어요');
    has(s.note + s.rights.map(function (r) { return r.text; }).join(' '), '피해를 입기 쉬워요', s.id);
  });
});

test('guide.json: 약 관련 상황의 권리 칸에 치료 선택지(주사제·선택지 목록)를 두지 않고, 응급이 아닐 때 연락할 곳이 있다', function () {
  GUIDE.filter(function (s) { return s.meds; }).forEach(function (s) {
    s.rights.forEach(function (r) { ok(!/주사제|선택지/.test(r.name + ' ' + r.text), s.id + ': 치료 선택지 문장 ' + r.name); });
    ok(s.contacts.some(function (c) { return c.ref === 'crisis-1577-0199'; }), s.id + ': 응급이 아닐 때 연락할 곳(1577-0199)이 없어요');
  });
});

test('guide.json: 약 관련 상황은 "스스로 끊지 말고 담당 의사와"를 보이고 중단을 권하지 않는다', function () {
  const meds = GUIDE.filter(function (s) { return /약|부작용/.test(s.label); });
  ok(meds.length >= 2, '약 관련 상황');
  meds.forEach(function (s) {
    eq(s.meds, true, s.id + ': meds 표시');
    const html = G.situationBody(G.model([s], CONTACTS).sits[0], { esc: esc, art: function (x) { return ARTS[x] || null; }, href: function (x) { return '#/a/' + x; } }, 3);
    has(html, G.TEXT.meds, s.id);
  });
  has(G.TEXT.meds, '끊지 말고');
  has(G.TEXT.meds, '담당 의사');
});

/* 화면에 보이는 모든 글자(자료 + 화면 고정 문구) */
function allTexts() {
  const out = [];
  CONTACTS.forEach(function (c) { out.push(['contact ' + c.id, c.name], ['contact ' + c.id, c.hours || ''], ['contact ' + c.id, c.note || '']); });
  GUIDE.forEach(function (s) {
    out.push([s.id, s.label], [s.id, s.group], [s.id, s.note]);
    s.contacts.forEach(function (c) { out.push([s.id + ' when', c.when]); });
    s.rights.forEach(function (r) { out.push([s.id + ' right', r.name], [s.id + ' right', r.text]); });
  });
  Object.keys(G.TEXT).forEach(function (k) { out.push(['TEXT.' + k, G.TEXT[k]]); });
  G.TOP.forEach(function (t) { out.push(['TOP', t.when]); });
  out.push(['decl', DECL.summary], ['decl', DECL.lead]);
  return out;
}
/* 판정형 표현: 걸리면 실패. 허용 목록은 법이 기관에 지운 의무·금지를 옮긴 문장만(사람에 대한 판정이 아님) */
const JUDGE = [
  /해야\s*(해요|합니다|한다|돼요)/, /입원시키|입원시켜/, /위험한\s*사람/, /위험해요/, /입원이\s*필요(해|합)/, /입원해야/,
  /가능성이\s*(높|커|있어)/, /당신은/, /조현병\s*환자/, /(진단|판정)(해|해 드려|을 내려)/, /틀림없/, /(이|가)\s*맞아요/, /\d+\s*(점|개)\s*이상이면/
];
const ALLOW = {
  '병원은 본인 동의를 받아 퇴원 사실을 관할 정신건강복지센터에 알려야 하고, 통보를 받은 센터는 본인이나 보호의무자와 상담해 재활과 사회 적응 지원 방안을 마련해야 해요.': '정신건강복지법 제52조가 병원·센터에 지운 의무',
  '응급입원을 빼면, 전문의의 대면 진단 없이는 입원시키거나 기간을 늘릴 수 없어요(제68조).': '정신건강복지법 제68조의 금지(당사자를 지키는 조항)'
};
test('문구: 판정형 표현 0(허용 목록 방식)', function () {
  const bad = [];
  allTexts().forEach(function (p) {
    if (Object.prototype.hasOwnProperty.call(ALLOW, p[1])) return;
    JUDGE.forEach(function (re) { const m = re.exec(p[1]); if (m) bad.push(p[0] + ': ' + m[0] + ' — ' + p[1]); });
  });
  eq(bad, []);
  /* 허용 목록의 문장은 실제로 쓰이는 것만 */
  Object.keys(ALLOW).forEach(function (t) { ok(allTexts().some(function (p) { return p[1] === t; }), '쓰이지 않는 허용 문장: ' + t); });
});

const STOP = [
  /(끊|중단하|줄이|줄여|빼)\s*(어도|여도|해도|도)\s*(돼|괜찮|좋)/, /(끊|중단하|줄이)(세요|으세요|십시오)/, /안\s*먹어도\s*(돼|괜찮)/,
  /먹지\s*않아도\s*(돼|괜찮)/, /(끊|중단하)는\s*(게|것이)\s*(좋|나아)/, /\d+\s*(mg|밀리그램|정|알)\b/
];
test('문구: 약 중단 권유·용량 0, 글 검사기 금지 표현 0, 에두른 자살 표현 0', function () {
  const bad = [];
  allTexts().forEach(function (p) {
    STOP.forEach(function (re) { const m = re.exec(p[1]); if (m) bad.push(p[0] + ': ' + m[0]); });
    CC.findForbidden(p[1]).forEach(function (f) { bad.push(p[0] + ': ' + f.why + ' ' + f.hit); });
    if (CC.EXTREME_CHOICE.test(p[1])) bad.push(p[0] + ': 에두른 자살 표현');
  });
  eq(bad, []);
});

/* ---------- 순수 함수 ---------- */
test('model: 묶음은 처음 나온 순서, 없는 연락처·글은 건너뛰고 이상한 항목은 버린다', function () {
  const m = G.model([
    { id: 'a', group: '하나', label: 'A', contacts: [{ ref: 'police-112', when: 'x' }, { ref: 'nope', when: 'y' }], rights: [{ name: 'n', text: 't', from: 'zz' }], read: ['ok-slug', 'BAD SLUG', 'gone'], note: '' },
    { id: 'b', group: '둘', label: 'B' }, { id: 'a', label: '중복' }, { id: 'C!', label: '잘못된 id' }, null, { id: 'c', group: '하나', label: 'C' }
  ], CONTACTS, function (slug) { return slug === 'ok-slug'; });
  eq(m.groups.map(function (g) { return g.title + ':' + g.items.map(function (s) { return s.id; }).join(','); }), ['하나:a,c', '둘:b']);
  eq(m.byId.a.contacts.map(function (c) { return c.contact.tel; }), ['112']);
  eq(m.byId.a.read, ['ok-slug']);
  eq(m.byId.a.rights[0].from, '', '없는 글이면 근거 링크 없이 문장만');
  eq(G.groupIndexOf(m, 'c'), 0); eq(G.groupIndexOf(m, 'b'), 1); eq(G.groupIndexOf(m, 'x'), -1);
});

test('nextSelection: 고르기·다시 누르면 접기·다른 상황으로 바꾸기·없는 id 는 무시', function () {
  const m = G.model(GUIDE, CONTACTS);
  eq(G.nextSelection(null, 'life', m), 'life');
  eq(G.nextSelection('life', 'life', m), null);
  eq(G.nextSelection('life', 'income', m), 'income');
  eq(G.nextSelection('life', 'nope', m), null);
  eq(G.nextSelection(null, '__proto__', m), null);
});

test('같은 상황이면 누구에게나 같은 안내: 화면 코드는 역할(jhb.ui.home.role)·who 를 읽지 않는다', function () {
  not(SRC, 'home.role');
  not(SRC, 'jhb.ui.home');
  not(SRC, 'nextsteps');
  ok(!/\.who\b/.test(SRC.replace(/\/\*[\s\S]*?\*\//g, '')), '코드가 who 로 내용을 고르지 않아요');
  const m = G.model(GUIDE, CONTACTS);
  const o = { esc: esc, art: function (x) { return ARTS[x] || null; }, href: function (x) { return '#/a/' + x; } };
  eq(G.panelHtml(m.byId.admission, o), G.panelHtml(G.model(GUIDE.map(function (s) { return Object.assign({}, s, { who: ['self'] }); }), CONTACTS).byId.admission, o));
});

test('화면 코드: 고른 상황을 저장소·주소·history·바깥으로 보내지 않는다', function () {
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'pushState', 'replaceState', 'location.hash', 'location.search', 'location.href =', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'navigator.share', 'speechSynthesis', 'store.set', 'goSearch'].forEach(function (w) {
    not(code, w, 'guide.js 에 ' + w);
  });
  ok(!/location\s*\.\s*(assign|replace)\s*\(/.test(code), 'location 이동 없음');
  /* 버튼은 링크(href)가 아니라 button: 고른 상황이 주소에 남지 않게 */
  const html = G.screenHtml(G.model(GUIDE, CONTACTS), esc);
  not(html, 'href="#', '상황 버튼은 주소 조각 링크가 아니에요');
  eq((html.match(/<button type="button" class="pg-guide-sit"/g) || []).length, GUIDE.length);
});

test('맨 위 고정 줄: 119·109·1577-0199 전화 링크와 지시서의 문구', function () {
  const top = G.topHtml(esc);
  ['tel:119', 'tel:109', 'tel:1577-0199'].forEach(function (t) { has(top, 'href="' + t + '"'); });
  const text = top.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  eq(text, '생명이 위급하면 119 · 죽고 싶은 마음이 들면 109 · 정신건강 위기 1577-0199');
  /* 번호는 레지스트리와 같아요 */
  G.TOP.forEach(function (t) { ok(CONTACTS.some(function (c) { return c.tel === t.tel; }), t.tel); });
  /* 화면(브라우저)과 정적 HTML 모두 맨 앞쪽에 고정 줄 */
  const m = G.model(GUIDE, CONTACTS);
  ok(G.screenHtml(m, esc).indexOf('pg-guide-top') < 300, '화면 첫머리');
});

test('staticHtml: 모든 상황을 펼친 목록(연락처 확인한 날, 근거 글 링크, 진단이 아니라는 문구), 주소 조각 링크 없음', function () {
  const html = page.staticHtml({ data: { guide: GUIDE, contacts: CONTACTS }, esc: esc, articles: ARTS, sections: [{ id: '11', title: '제도', hue: 200 }] });
  has(html, G.TEXT.notJudge);
  has(html, 'href="tel:1577-0199"');
  GUIDE.forEach(function (s) {
    has(html, '<h3 class="pg-guide-ph">' + esc(s.label) + '</h3>', s.id);
    s.read.forEach(function (slug) { has(html, 'href="#/a/' + slug + '"', s.id); });
  });
  CONTACTS.forEach(function (c) { has(html, '<time datetime="' + c.checked + '">' + c.checked.replace(/-/g, '.') + '</time>', c.id); });
  ok(!/href="#(?!\/a\/)/.test(html), '정적 HTML 에 주소 조각 링크가 없어요');
  not(html, '<button', '정적 HTML 은 버튼 없이 읽을 수 있어요');
  /* 사용자 글자가 없는 화면이지만 자료 글자는 모두 이스케이프 */
  const evil = page.staticHtml({ data: { guide: [{ id: 'x', group: '<b>', label: '<img src=x>', contacts: [{ ref: 'police-112', when: '"<a>' }], rights: [{ name: '<i>', text: '<script>', from: 'emergency-response' }], read: ['emergency-response'], note: '<u>' }], contacts: CONTACTS }, esc: esc, articles: ARTS });
  not(evil, '<img'); not(evil, '<script'); not(evil, '<b>'); not(evil, '<u>');
});

test('panelHtml: 연락할 곳(이름·번호·운영 시간·확인한 날)·권리·읽을 글·인쇄 버튼', function () {
  const m = G.model(GUIDE, CONTACTS);
  const o = { esc: esc, art: function (x) { const a = ARTS[x]; return a ? { title: a.title, summary: a.summary, sec: '분류', hue: 10 } : null; }, href: function (x) { return '#/a/' + x; } };
  const html = G.panelHtml(m.byId.threat, o);
  has(html, 'href="tel:1366"'); has(html, '여성긴급전화'); has(html, '365일 24시간'); has(html, '2026.11.14');
  has(html, G.TEXT.contacts); has(html, G.TEXT.rights); has(html, G.TEXT.read);
  has(html, 'class="btn pg-guide-print"'); has(html, 'class="btn pg-guide-back"');
  has(html, 'aria-label="여성긴급전화 1366 전화"');
  /* 요건·권리 두 칸 */
  const adm = G.panelHtml(m.byId.admission, o);
  has(adm, '법이 정한 요건과 절차'); has(adm, '당사자의 권리');
});

test('자료가 비면: 빈 질문 대신 불러오지 못했다는 한 줄과 고정 줄만', function () {
  [[], null, [{ id: 'BAD!', label: 'x' }]].forEach(function (g) {
    const m = G.model(g, CONTACTS);
    eq(m.sits.length, 0);
    const html = G.screenHtml(m, esc, {});
    has(html, 'pg-guide-top');
    has(html, G.TEXT.empty);
    not(html, G.TEXT.ask);
    not(html, 'pg-guide-groups');
    const st = page.staticHtml({ data: { guide: g, contacts: CONTACTS }, esc: esc, articles: ARTS });
    has(st, G.TEXT.empty);
    has(st, 'href="tel:119"');
  });
  /* 자료가 있으면 질문과 버튼 */
  const full = G.screenHtml(G.model(GUIDE, CONTACTS), esc, {});
  has(full, G.TEXT.ask); not(full, G.TEXT.empty);
});

test('화면: 여기서 연 글이 기기 기록에 남을 수 있다는 한 줄(내 서재 링크는 주어질 때만)', function () {
  const m = G.model(GUIDE, CONTACTS);
  const withMe = G.screenHtml(m, esc, { meHref: '/me/' });
  has(withMe, G.TEXT.trace);
  has(withMe, 'href="/me/"');
  has(withMe, G.TEXT.traceLink);
  const noMe = G.screenHtml(m, esc, {});
  has(noMe, G.TEXT.trace);
  not(noMe, G.TEXT.traceLink);
});

test('css: 화면 글자 크기는 보기 설정(--fs-body)을 따라요(인쇄 규칙 밖에 고정 px 글자 크기 없음)', function () {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'pages', 'guide.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const i = css.indexOf('@media print');
  ok(i > 0, '인쇄 규칙');
  const screen = css.slice(0, i);
  const bad = (screen.match(/font-size:\s*[^;}]+/g) || []).filter(function (d) { return !/var\(--fs-body\)/.test(d) && !/em\b|inherit/.test(d); });
  eq(bad, []);
  /* 인쇄 규칙: 안내 문구·버튼은 종이에서 빼고, 글자는 pt 고정 */
  const print = css.slice(i);
  ok(/\.pg-guide-priv,\s*\.pg-guide-askhint,\s*\.pg-guide-acts,\s*\.pg-guide-region\s*\{\s*display:\s*none\s*!important;\s*\}/.test(print), '인쇄에서 숨기는 규칙');
  not(print, 'var(--fs-body)', '인쇄 규칙에는 화면 글자 크기를 쓰지 않아요');
});

test('화면 코드: 다른 상황 고르기·Esc 로 돌아갈 때 포커스한 버튼이 화면 안에 보이게, 뒤로 오면 맨 위부터', function () {
  has(SRC, "scrollTo(target, 'center')");
  has(SRC, 'scrollRestoration');
});
