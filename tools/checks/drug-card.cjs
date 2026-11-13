/* 약 카드(## 약 카드 소절의 2열 표) 검사 (집필가이드 "약 카드")
   이 표는 항정신병약 한눈에(meds/) 화면의 유일한 원천이에요. 화면 자료(data/kb/meds.json)는 생성기 tools/gen/meds.cjs 가 이 표에서 만들어요.
   규칙(행 이름·값 낱말·넣지 않는 말·칸 길이·소절과 표 찾기·칸 글자 다듬기)과 표를 읽어 판정하는 함수 cardProblems 는 이 파일 한 곳에 두고,
   생성기가 require 해서 같은 목록·같은 함수를 써요(생성기는 cardProblems 의 첫 오류로 멈춰요). 그래서 생성기가 멈추는(build-gen 실패)
   약 카드는 이 검사도 모두 오류로 내요. 둘이 어긋나지 않는지는 tests/checks.test.cjs 가 같은 표본을 양쪽에 넣어 맞대요.
   칸 검사는 생성기처럼 칸 글자(cellText: 각주 표시를 빼고 굵게·기울임·코드·링크 표시는 글자만)에 해요. 화면에 나가는 글자예요.
   넣지 않는 말은 판정할 때만 전각·호환 글자를 NFKC 로 펴고 폭 없는 빈칸을 지워서도 봐요(화면 글자는 바꾸지 않아요).
   오류(생성기도 멈춤): ## 약 카드 소절이 둘 이상 / 표 없음 / 머리 줄이 "| 항목 | 내용 |" 이 아님 / 2열이 아님
         / 정해진 행 이름이 아님·빠짐·겹침 / 빈 칸 / 부작용 경향 칸이 정해진 낱말로 시작하지 않음 / 자료 부족이 아닌 부작용 칸에 각주 없음
         / 넣지 않는 말(FORBIDDEN: 용량 단위·"용량"·복용 횟수(숫자·한글 수 낱알 포함)와 주사·복용 간격(주·달·격주 포함, 검사 간격은 아님)
           ·끊어도 된다는 말(본문 '임의 중단 권유'와 한 벌, tools/checks/safety.cjs)·추천·순위·줄 세우기(최고 혈중 농도는 아님)·별점
           ·"이런 사람에게·이런 분께"(이런 분류는 아님)·가격·약값·임신·수유·상호작용·"같이 먹으면 안"·상품명·®·™)
         / 너무 긴 칸(꼭 알아둘 것 140자, 나머지 60자, 띄어쓰기 없이 24자) / 글의 updated 의 달·날
         / 파일 이름(slug) 꼴 — content/07-medication/ 의 글은 약 카드가 없어도 봐요(생성기가 그 폴더의 모든 글에서 먼저 봐요)
   오류(검사기만 — 생성기는 통과하지만 화면에 그대로 나가거나 말없이 빠지는 것):
         고정 문구(안전 고지) 없음 / 꼭 알아둘 것에 각주 없음
         / content/07-medication/ 의 글에서 약 카드처럼 보이는 소절의 제목·수준이 다름(### 약 카드, ## 약 정보 카드, ## 약카드,
           또는 정해진 행 이름이 7개 이상 든 표가 "## 약 카드" 밖에 있음 — 생성기가 못 읽어 그 약이 화면에서 말없이 빠짐)
   경고(생성기는 통과): 행 순서 / 계열·제형 표기 / "1등" 같은 등수 / 7분류 밖
         / 7분류 폴더 밖의 글에서 약 카드처럼 보이는 소절의 제목·수준이 다름
         / 07 폴더에서도 약 카드 표인지 덜 확실한 표(머리 줄 "| 항목 | 내용 |" + 행 이름 3개 이상, 또는 계열·제형을 포함해 5개 이상, 7개 미만) */
'use strict';
const path = require('path');
const safety = require('./safety.cjs');

const ROWS = ['계열', '제형', '체중·대사', '추체외로 증상·좌불안석', '프로락틴', '졸림', 'QT 연장', '기립성 저혈압', '꼭 알아둘 것'];
/* 화면 자료의 열쇠(ROWS 와 같은 순서). 생성기가 rows[].key 로 써요 */
const KEYS = ['class', 'form', 'weight', 'eps', 'prolactin', 'sleep', 'qt', 'ortho', 'note'];
const FX = ROWS.slice(2, 8);
const LEVELS = ['적은 편', '중간', '많은 편', '자료 부족'];
const LEVEL_RE = /^(적은 편|중간|많은 편|자료 부족)/;
/* 소절 제목 줄(앞뒤 빈칸은 걷고 봐요)과 소절 끝(다음 #·##·### 제목) */
const HEAD_RE = /^##\s+약 카드\s*$/;
/* "## 약 카드" 와 비슷한 제목: 제목 글자에서 굵게·기울임·코드 표시를 걷고 빈칸을 하나로 줄인 꼴이 "(이) 약(물)(의)(정보) 카드"로 시작하면.
   수준이 다름(### 약 카드, # 약 카드), 낱말이 다름(## 약카드, ## 약 정보 카드, ## 약물 카드, ## 이 약의 카드, ## **약 카드**, ## 약 카드 (요약)).
   제목 맨 앞에서만 봐요: "복약 카드 쓰기·예약 카드·절약 카드·약 먹는 시간 기록 카드·위기 때 쓰는 약물 정보 카드" 같은 다른 소절은 빼요.
   생성기는 "## 약 카드" 만 읽어서 이런 글은 말없이 건너뛰어요 */
const NEAR_HEAD_RE = /^(?:이\s?)?약(?:물)?\s?(?:의\s?)?(?:정보\s?)?카드/;
/* 약 카드처럼 보이는 표: 머리 줄이 "| 항목 | 내용 |" 이고 첫 칸에 정해진 행 이름이 3개 이상, 또는 머리 줄과 상관없이 계열·제형 가운데 하나를 포함해 5개 이상.
   부작용만 견주는 표("| 부작용 | 설명 |" 아래 졸림·프로락틴·QT 연장)는 세지 않아요 */
const NEAR_TABLE_MIN = 3;
const NEAR_TABLE_ANY = 5;
/* 정해진 행 이름이 이만큼 이상이면(사실상 약 카드 표 전체) 07 폴더에서 오류, 그보다 적으면 경고 */
const NEAR_TABLE_FULL = 7;
const END_RE = /^#{1,3}\s/;
const DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const FIXED = '이 표로 약을 고르거나 바꾸지 말고';
/* 생성기가 읽는 폴더(tools/gen/meds.cjs 의 SRC_DIR, 하위 폴더는 읽지 않아요) */
const MEDS_DIR = 'content/07-medication/';
const ROOT = path.join(__dirname, '..', '..');
/* 칸 어디에도 두지 않는 말(집필가이드 "약 카드"의 넣지 않는 것 + 한계선 L3·L10). 생성기와 검사기가 이 목록 하나를 써요.
   용량 단위는 보여 줄 때 단위만(앞 숫자는 빼고): hit[1] || hit[0] */
const NUM = '(?:\\d+|한두|두세|서너|한|두|세|네)';
/* 낱알 뒤에 올 수 있는 말(1정씩·2알로·한 알씩·세 알까지·한 알도·반 알을 …). "3 정도"·"절반 정도"·"알아요"·"정신" 은 걸리지 않게 */
const PILL_END = '(?=씩|을|를|만|이|로|으|까지|[^가-힣]|$)';
const PILL = '(?:정' + PILL_END + '|알(?=도|과|와|에|씩|을|를|만|이|로|으|까지|[^가-힣]|$)|캡슐)';
/* 검사 간격: 횟수·간격이 검사·측정 이야기면 복용 횟수가 아니에요. 두 꼴만 빼 줘요(넓게 빼면 복용 지시가 빠져나가요).
   - 뒤(같은 마디, 16자 안)에 검사하는 동작이 있고 그 마디에 복용·바꾸기 낱말이 없을 때: "3개월마다 검사해요", "6개월마다 혈당을 확인해요",
     "1년에 한 번 심전도를 찍어요", "몇 달마다 체중을 재요", "1년에 한 번 검진을 받아요". 체중·혈당·혈압·진료 같은 낱말만으로는 빼지 않아요
     ("체중이 늘면 하루 한 번으로 줄여요", "혈당이 오르면 하루 2회로 바꿔요"는 막아요)
   - 또는 검사가 그 간격의 주어일 때: 앞(같은 문장)에 "검사·채혈·심전도·검진(+은·는·도)"가 있고, 그 사이에 약·복용·주사·먹·맞이나 조건 "-면"이 없고,
     간격 바로 뒤가 "해요·받아요·이에요" 같은 가벼운 끝맺음일 때: "혈액 검사는 3개월마다 해요", "혈액 검사는 처음 18주 동안 매주, 그 뒤로는 한 달마다 해요",
     "검사 간격은 3개월이에요" ("혈액 검사는 매주, 약은 하루 1번이에요", "혈액 검사 결과에 따라 한 달에 한 번으로 바꿔요"는 막아요) */
const CL = '[^.,;)\\n]';
const CL_END = '(?:[.,;)\\n]|$)';
const TEST_ACT = '(?:검사|채혈|심전도|검진|측정|점검|확인|살펴|살피|재(?:요|고|어|며|는|야|기|면|\\s*(?:봐|보))|잽니다|찍(?:어|고|는|기|습)|뽑(?:아|고|는))';
const DOSE_W = '(?:먹|맞|복용|투여|투약|드시|드세|드셔|드려|드리|주사|바꿔|바꾸|정해|정하|줄여|줄이|늘려|늘리|조절|조정|(?:써|쓰)(?:요|세요|도|면|고))';
const TEST_BEFORE = '(?<=(?:검사|채혈|심전도|검진)(?:은|는|도)?\\s(?:(?!약|복용|주사|먹|맞|면\\s)[^.\\n]){0,40})';
const LIGHT_END = '\\s*(?:씩\\s*)?(?:해요|해|합니다|한다|해야\\s*(?:해요|합니다)|받아요|받습니다|이에요|예요|입니다|이다)' + CL_END;
const TEST_AFTER = '(?!' +
  '(?=' + CL + '{0,16}?' + TEST_ACT + ')(?:(?!' + DOSE_W + ')' + CL + ')*' + CL_END +
  '|' + TEST_BEFORE + LIGHT_END + ')';
const FREQ = [
  /* 때 + 횟수·낱알: 하루 1번, 하루에 두 번, 하루 한 알, 매일 1번, 아침에 한 번, 자기 전에 한 알 */
  '(?:하루|매일|아침|점심|저녁|자기\\s*전|잠들기\\s*전|잠자기\\s*전|취침\\s*전|식후|식전|식사\\s*(?:후|전))\\s*에?\\s*' + NUM + '\\s*(?:번|회|차례|정|알|캡슐)' + TEST_AFTER,
  /* 1일 2회, 주 1회, 월 1회, 4주 1회 */
  '1\\s*일\\s*\\d+\\s*회' + TEST_AFTER,
  '(?<![가-힣])(?:\\d+\\s*)?(?:주|개월|월|일)\\s*\\d+\\s*회' + TEST_AFTER,
  /* 간격을 이름으로: 투여 간격은 4주, 주사 간격이 한 달 */
  '간격(?:은|이|을|으로)?\\s*(?:\\d+|한|두|세|석|몇)\\s*(?:주일?|달|개월)' + TEST_AFTER,
  /* 낱알 수: 1정씩, 2알로, 한 알씩, 두 알, 두세 알, 반 알 */
  '(?:\\d+(?:\\.\\d+)?|(?<![가-힣])(?:한두|두세|서너|한|두|세|네))\\s*' + PILL,
  '반\\s*' + PILL,
  /* 나눠 먹는 횟수: 두 번 나눠, 2회에 나누어 */
  '(?:두|세|네|\\d+)\\s*(?:번|회|차례)\\s*(?:에\\s*)?(?:나눠|나누어)',
  /* 주사·복용 간격: 4주에 한 번, 한 달에 1회, 2주마다, 3개월 간격, 일주일에 한 번, 1주일에 1회, 몇 달마다, 달마다, 매달마다, 보름에 한 번, 이틀에 한 번 */
  '(?:\\d+\\s*(?:주일?|개월|달|년|일|시간)|(?:한|두|세|네|몇|석|넉|여러|매)\\s*(?:주일?|달)|(?:일|이)\\s*주일|(?<![가-힣])(?:주|달|보름|이틀|사흘|나흘))' +
    '\\s*(?:마다|간격|에\\s*' + NUM + '\\s*(?:번|회|차례))' + TEST_AFTER,
  /* 매주 한 번, 매달 1회, 매 4주, 그리고 횟수 없이 매주·매달 맞아요·먹어요("매달 검사해요"는 괜찮아요) */
  '매\\s*(?:주|달|월|일)\\s*' + NUM + '\\s*(?:번|회|차례)' + TEST_AFTER,
  '매\\s*\\d+\\s*(?:주|개월|달|일)' + TEST_AFTER,
  '매\\s*(?:주|달|월)\\s*(?=맞|먹|복용|투여|주사|드시|드세|드셔)',
  /* 하루 걸러 먹어요 */
  '하루\\s*(?:씩\\s*)?걸러' + TEST_AFTER,
  /* 격주로·격일로·격월로 */
  '(?<![가-힣])격(?:주|일|월)' + TEST_AFTER
];
const FORBIDDEN = [
  { re: /(?:^|[^A-Za-z])(mg|mcg|μg|µg|ml)(?![A-Za-z])|㎎|㎍|㎖|밀리그램|마이크로그램|밀리리터/i, why: '용량 단위' },
  { re: /용량/, why: '용량 이야기' },
  { re: new RegExp(FREQ.join('|')), why: '복용 횟수' },
  /* 끊거나 줄여도 된다는 말: 본문 금지 표현 '임의 중단 권유'와 한 벌(tools/checks/safety.cjs), 칸에서는 목적어 없는 "줄여도·빼도·그만둬도·멈춰도·건너뛰어도"와 "끊는 것도 괜찮아요"까지.
     묻는 꼴("끊어도 되는지"·"끊어도 돼요?")과 부정·옮김("끊어도 된다는 뜻은 아니에요")은 빼요 */
  { re: safety.stopAdviceRe('card'), why: '끊어도 된다는 말' },
  /* 최고 혈중 농도·최고치(약이 몸에 가장 많은 때)는 줄 세우기가 아니에요. "이런 분류·분야·분석"은 사람이 아니에요 */
  { re: /추천|순위|\d\s*위(?![가-힣])|별점|가장\s*(?:좋은|효과적인|잘\s*듣는)|제일\s*(?:좋|효과|잘)|최고(?!\s*(?:혈중|혈장|농도|치|점|조|에\s*(?:이르|달하|도달)))|더\s*(?:좋은|효과적|잘\s*듣)|이런\s*(?:사람에게|사람|분(?:들)?(?=[께에한이은을도만의들]|[^가-힣]|$))/, why: '권하는 말·줄 세우기' },
  { re: /가격|약값|값이?\s*(?:싸|비싸)/, why: '값 비교' },
  { re: /임신/, why: '임부 안전 등급' },
  { re: /수유|모유/, why: '수유 안전' },
  { re: /상호\s*작용|(?:같이|함께)\s*먹으면\s*안/, why: '함께 먹는 약 판정' },
  { re: /상품명|®|™|&reg;|&trade;|&#174;|&#8482;/i, why: '상품명' }
];
/* 경고만(생성기는 막지 않아요): "1등" 같은 등수 */
const RANK_WARN = /\d\s*등(?![가-힣])/;
/* 칸 길이(화면 표의 한 칸에 들어가는 만큼). 띄어쓰기 없이 이어진 글자가 길면 칸 밖으로 넘쳐요 */
const MAX_LEN = { note: 140, other: 60 };
const MAX_RUN = 24;
/* 판정용으로만 지우는 폭 없는 글자(폭 없는 빈칸·이음표·BOM·보이지 않는 줄표) */
const ZERO_WIDTH = /[​-‍⁠﻿­]/g;

function cells(line) {
  return String(line).trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
}
/* 칸 글자: 각주 표시([^n])만 빼고, 굵게·기울임·코드·링크 표시는 글자만 남겨요. 빈칸은 하나로 */
function cellText(raw) {
  return String(raw == null ? '' : raw)
    .replace(/\[\^\d+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
/* 각주 번호(처음 나온 순서, 겹치지 않게) */
function refsOf(raw) {
  const out = [];
  String(raw == null ? '' : raw).replace(/\[\^(\d+)\]/g, function (_, n) { n = Number(n); if (out.indexOf(n) < 0) out.push(n); return _; });
  return out;
}
/* 너무 긴 칸이면 이유 문구, 괜찮으면 ''. key 는 KEYS 의 열쇠('note' 만 140자) */
function tooLong(key, text) {
  const max = key === 'note' ? MAX_LEN.note : MAX_LEN.other;
  const t = String(text == null ? '' : text);
  if (t.length > max) return '너무 길어요(' + t.length + '자, ' + max + '자까지). 자세한 것은 본문에 써요';
  const run = t.split(/\s+/).reduce(function (a, w) { return w.length > a.length ? w : a; }, '');
  if (run.length > MAX_RUN) return '띄어쓰기 없이 ' + run.length + '자가 이어져요(' + MAX_RUN + '자까지): "' + run.slice(0, 30) + '"';
  return '';
}
/* 칸 글자에서 넣지 않는 말 → ['용량 단위("mg")', …]. 글자 그대로 먼저 보고, 없으면 NFKC·폭 없는 글자 지운 꼴로도 봐요 */
function forbiddenIn(text) {
  const raw = String(text == null ? '' : text);
  let alt = null;
  try { alt = raw.normalize('NFKC').replace(ZERO_WIDTH, ''); } catch (e) { alt = raw.replace(ZERO_WIDTH, ''); }
  const out = [];
  FORBIDDEN.forEach(function (f) {
    const hit = f.re.exec(raw) || (alt !== raw ? f.re.exec(alt) : null);
    if (hit) out.push(f.why + '("' + (hit[1] || hit[0]).trim() + '")');
  });
  return out;
}
/* 본문에서 "## 약 카드" 소절과 그 첫 표를 찾아요 → { count: 소절 수, section: 소절 줄들(첫 소절, 제목 줄 빼고), table: 표 줄들 또는 null } */
function findCard(body) {
  const lines = String(body == null ? '' : body).split('\n');
  const starts = [];
  lines.forEach(function (l, i) { if (HEAD_RE.test(l.trim())) starts.push(i); });
  if (!starts.length) return { count: 0, section: [], table: null };
  const s = starts[0];
  let e = lines.length;
  for (let i = s + 1; i < lines.length; i++) if (END_RE.test(lines[i])) { e = i; break; }
  const sec = lines.slice(s + 1, e);
  const t0 = sec.findIndex(function (l) { return /^\s*\|/.test(l); });
  let table = null;
  if (t0 >= 0) {
    let t1 = t0;
    while (t1 < sec.length && /^\s*\|/.test(sec[t1])) t1++;
    table = sec.slice(t0, t1);
  }
  return { count: starts.length, section: sec, table: table };
}
/* 약 카드 표 판정(생성기와 검사기가 같이 써요). 본문 → { count, section, table, byName: {행 이름: 칸 원문}, got: [표에 나온 행 이름 순서],
   errors: [생성기가 멈추는 이유, 생성기가 보는 순서대로], rows: 오류가 없으면 [{ key, name, text, refs }](정해진 순서) 아니면 null }
   생성기는 errors[0] 으로 멈추고, 검사기는 errors 를 모두 알려요. 소절이 없으면 count 0, errors [] */
function cardProblems(body) {
  const found = findCard(body);
  const out = { count: found.count, section: found.section, table: found.table, byName: {}, got: [], errors: [], rows: null };
  if (!found.count) return out;
  const errors = out.errors;
  if (found.count > 1) errors.push('"## 약 카드" 소절이 ' + found.count + '개예요(하나만)');
  if (!found.table) { errors.push('"## 약 카드" 소절에 표가 없어요(소절 제목 바로 아래, ### 소제목 없이)'); return out; }
  const tbl = found.table;
  const head = cells(tbl[0]);
  if (head.length !== 2 || head[0] !== '항목' || head[1] !== '내용') errors.push('약 카드 머리 줄은 "| 항목 | 내용 |" 이어야 해요 — 지금 "' + tbl[0].trim() + '"');
  const byName = out.byName, got = out.got;
  tbl.slice(1).forEach(function (l) {
    if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) return;
    const c = cells(l);
    if (c.length !== 2) { errors.push('약 카드는 2열 표예요: "' + l.trim() + '"'); return; }
    const name = c[0].replace(/\*\*/g, '').trim();
    if (ROWS.indexOf(name) < 0) { errors.push('약 카드에 정해진 행이 아니에요: "' + name + '" (행 이름: ' + ROWS.join(', ') + ')'); return; }
    if (byName[name] != null) { errors.push('약 카드 행 "' + name + '" 이 두 번 있어요'); return; }
    byName[name] = c[1];
    got.push(name);
  });
  /* 칸마다(정해진 행 순서로): 빠짐·빈 칸·넣지 않는 말·길이·부작용 칸의 낱말과 각주 */
  const rows = [];
  ROWS.forEach(function (name, i) {
    const raw = byName[name];
    if (raw == null) { errors.push('약 카드에 "' + name + '" 행이 없어요(근거가 없으면 자료 부족으로 채워요)'); return; }
    const text = cellText(raw);
    const fx = FX.indexOf(name) >= 0;
    if (!text) { errors.push('약 카드 "' + name + '" 칸이 비었어요' + (fx ? '(출처에서 확인 못 한 칸은 자료 부족)' : '')); return; }
    const bad = forbiddenIn(text);
    if (bad.length) errors.push('약 카드 "' + name + '" 칸에 넣지 않는 말: ' + bad.join(', ') + ' — 이 칸은 항정신병약 한눈에(meds/) 화면에 그대로 나가요(필요하면 본문에 출처와 함께)');
    const long = tooLong(KEYS[i], text);
    if (long) errors.push('약 카드 "' + name + '" 칸이 ' + long);
    const refs = refsOf(raw);
    if (fx) {
      if (!LEVEL_RE.test(text)) errors.push('약 카드 "' + name + '" 칸은 ' + LEVELS.join('·') + ' 가운데 하나로 시작해요 — 지금 "' + text + '"');
      else if (!/^자료 부족/.test(text) && !refs.length) errors.push('약 카드 "' + name + '" 칸에 출처 각주가 없어요(출처에서 확인 못 한 칸은 자료 부족)');
    }
    rows.push({ key: KEYS[i], name: name, text: text, refs: refs });
  });
  if (!errors.length) out.rows = rows;
  return out;
}
/* "## 약 카드" 소절이 없는 글에서 약 카드처럼 보이는 것 → [{ kind: 'head'|'table', line: 줄 번호(본문 1부터), what: '제목 줄 "…"' 또는 '표 "…"',
   full: 오류로 낼 만큼 확실한지(제목 줄은 언제나, 표는 정해진 행 이름이 NEAR_TABLE_FULL 개 이상일 때) }].
   제목·수준이 조금 다른 제목 줄(NEAR_HEAD_RE), 또는 약 카드처럼 보이는 표(NEAR_TABLE_MIN·NEAR_TABLE_ANY) */
function nearCards(body) {
  const lines = String(body == null ? '' : body).split('\n');
  const out = [];
  lines.forEach(function (l, i) {
    const h = /^\s{0,3}#{1,6}(.*)$/.exec(l);
    if (!h) return;
    const text = h[1].replace(/\s#+\s*$/, '').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
    if (NEAR_HEAD_RE.test(text)) out.push({ kind: 'head', line: i + 1, what: '제목 줄 "' + l.trim() + '"', full: true });
  });
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i])) continue;
    const start = i;
    const head = cells(lines[i]);
    const names = [];
    for (; i < lines.length && /^\s*\|/.test(lines[i]); i++) {
      const name = cells(lines[i])[0].replace(/\*\*/g, '').trim();
      if (ROWS.indexOf(name) >= 0 && names.indexOf(name) < 0) names.push(name);
    }
    const cardHead = head.length === 2 && head[0].replace(/\*\*/g, '').trim() === '항목' && head[1].replace(/\*\*/g, '').trim() === '내용';
    const hasKind = names.indexOf('계열') >= 0 || names.indexOf('제형') >= 0;
    if ((cardHead && names.length >= NEAR_TABLE_MIN) || (hasKind && names.length >= NEAR_TABLE_ANY)) {
      out.push({ kind: 'table', line: start + 1, what: '표 "' + lines[start].trim() + '"(행 ' + names.slice(0, 3).join('·') + ' …)', full: names.length >= NEAR_TABLE_FULL });
    }
  }
  return out;
}
/* 검사 경로의 파일 이름 → slug(경로가 없으면 null) */
function slugOf(p) {
  const s = String(p == null ? '' : p);
  if (!s) return null;
  return s.split(/[\\/]/).pop().replace(/\.md$/i, '');
}
/* 검사 경로가 생성기가 읽는 폴더(content/07-medication/ 바로 아래 .md)인지. 상대 경로·절대 경로·역빗금 모두 */
function inMedsDir(p) {
  let s = String(p == null ? '' : p);
  if (!s) return false;
  if (path.isAbsolute(s)) s = path.relative(ROOT, s);
  s = s.replace(/\\/g, '/').replace(/^\.\//, '');
  return s.indexOf(MEDS_DIR) === 0 && s.slice(MEDS_DIR.length).indexOf('/') < 0 && /\.md$/.test(s);
}

module.exports = {
  id: 'drug-card',
  ROWS: ROWS, KEYS: KEYS, FX: FX, LEVELS: LEVELS, LEVEL_RE: LEVEL_RE, HEAD_RE: HEAD_RE, NEAR_HEAD_RE: NEAR_HEAD_RE, END_RE: END_RE,
  DAY_RE: DAY_RE, SLUG_RE: SLUG_RE, FIXED: FIXED, FORBIDDEN: FORBIDDEN, RANK_WARN: RANK_WARN, MAX_LEN: MAX_LEN, MAX_RUN: MAX_RUN, MEDS_DIR: MEDS_DIR,
  NEAR_TABLE_MIN: NEAR_TABLE_MIN, NEAR_TABLE_ANY: NEAR_TABLE_ANY, NEAR_TABLE_FULL: NEAR_TABLE_FULL, TEST_AFTER: TEST_AFTER,
  cells: cells, cellText: cellText, refsOf: refsOf, tooLong: tooLong, forbiddenIn: forbiddenIn, findCard: findCard, cardProblems: cardProblems,
  nearCards: nearCards, slugOf: slugOf, inMedsDir: inMedsDir,
  check: function (ctx, report) {
    const inMeds = inMedsDir(ctx.path);
    const r = cardProblems(ctx.body);
    /* 파일 이름(주소): 생성기는 07 폴더의 모든 글에서 약 카드를 보기 전에 봐요. 다른 곳은 약 카드가 있는 글만 */
    const slug = slugOf(ctx.path);
    if ((inMeds || r.count) && slug != null && !SLUG_RE.test(slug)) report.error('약 카드 글의 파일 이름(slug) "' + slug + '" — 영어 소문자·숫자·- 만 써요(항정신병약 한눈에 화면의 링크가 돼요. ' + MEDS_DIR + ' 의 글은 약 카드가 없어도 생성기가 멈춰요)');
    if (!r.count) {
      /* 약 카드처럼 보이는데 제목·수준이 달라 생성기가 말없이 건너뛰는 글. 줄 번호는 파일 기준(frontmatter 줄까지 셈, routes 검사와 같게).
         제목 줄이 걸리면 그 아래 표는 같은 약 카드라 한 번만 알려요 */
      const all = String(ctx.text == null ? ctx.body : ctx.text).replace(/\r\n?/g, '\n').split('\n').length;
      const off = Math.max(0, all - String(ctx.body).split('\n').length);
      const near = nearCards(ctx.body);
      const heads = near.filter(function (n) { return n.kind === 'head'; });
      (heads.length ? heads : near).forEach(function (n) {
        const msg = '약 카드처럼 보이는 소절이 있는데 제목·수준이 달라요: ' + n.what + '(' + (n.line + off) + '번째 줄) — 약 카드 소절 제목은 "## 약 카드" 그대로 써요(다르면 검사·화면이 못 읽어요';
        if (inMeds && n.full) report.error(msg + '. 생성기가 이 글을 건너뛰어 이 약이 항정신병약 한눈에 화면에서 말없이 빠져요)');
        else if (inMeds) report.warn(msg + '. 약 카드라면 생성기가 이 글을 건너뛰어 이 약이 화면에서 말없이 빠져요. 약 카드가 아니면 머리 줄·행 이름을 바꿔요)');
        else report.warn(msg + ')');
      });
      return;
    }
    if (ctx.section !== 7) report.warn('약 카드는 7분류 개별 약 글에만 둬요');
    /* 화면 자료에 들어가는 고친 날 */
    const upd = String(ctx.meta.updated == null ? '' : ctx.meta.updated).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(upd) && !DAY_RE.test(upd)) report.error('약 카드 글의 updated "' + upd + '" — 달은 01~12, 날은 01~31(항정신병약 한눈에 화면의 날짜가 돼요)');

    /* 생성기와 같은 판정(같은 함수) */
    r.errors.forEach(function (e) { report.error(e); });
    /* 검사기만: 안전 고지(고정 문구) */
    if (r.section.join('\n').indexOf(FIXED) < 0) report.error('약 카드 소절에 고정 문구("같은 약이라도 사람마다 반응이 달라요. 이 표로 약을 고르거나 바꾸지 말고 담당 의사와 상의하세요.")가 없어요 — 표 바로 아래 문단으로');
    if (!r.table) return;

    const byName = r.byName, got = r.got;
    const order = ROWS.filter(function (n) { return got.indexOf(n) >= 0; });
    if (order.join('|') !== got.join('|')) report.warn('약 카드 행 순서가 정해진 순서와 다름: ' + ROWS.join(' → '));
    ROWS.forEach(function (name) {
      if (byName[name] == null) return;
      const rank = RANK_WARN.exec(cellText(byName[name]));
      if (rank) report.warn('약 카드 "' + name + '" 칸에 "' + rank[0] + '" — 등수는 넣지 않아요');
    });
    if (byName['계열'] != null && !/^(1세대|2세대)/.test(cellText(byName['계열']))) report.warn('약 카드 "계열" 칸은 1세대 또는 2세대로 시작해요(부분 작용제는 "2세대 · 부분 작용제")');
    if (byName['제형'] != null && !/^먹는 약.*장기지속형 주사 (있음|없음|확인 못 함)/.test(cellText(byName['제형']))) report.warn('약 카드 "제형" 칸은 "먹는 약 · 장기지속형 주사 있음/없음/확인 못 함" 꼴');
    /* 검사기만: 꼭 알아둘 것(건강 문장)의 출처 */
    const note = byName['꼭 알아둘 것'];
    if (note != null && cellText(note) && !refsOf(note).length) report.error('약 카드 "꼭 알아둘 것" 칸에 출처 각주가 없어요 — 이 칸은 항정신병약 한눈에(meds/) 화면에 그대로 나가요');
  }
};
