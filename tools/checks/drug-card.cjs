/* 약 카드(## 약 카드 소절의 2열 표) 검사 (집필가이드 "약 카드")
   이 표는 항정신병약 한눈에(meds/) 화면의 유일한 원천이라 행 이름·값 낱말을 글자 그대로 고정해요.
   오류: 표 없음 / 2열이 아님 / 정해진 행 이름이 아님·빠짐·겹침 / 부작용 경향 칸이 정해진 낱말로 시작하지 않음
         / 자료 부족이 아닌 부작용 칸에 각주 없음 / 표 안에 용량 단위(mg·㎎·mcg·μg·㎍·밀리그램) / ## 약 카드 소절이 둘 이상
   경고: 행 순서 / 계열·제형 표기 / 꼭 알아둘 것 빈칸·각주 없음 / 추천·순위·가격·임신 같은 낱말
         / 복용 횟수("하루 1번")·상호작용·상품명 낱말(자유롭게 쓰는 칸도 표 전체에서 찾아요) / 고정 문구 없음 / 7분류 밖 */
const ROWS = ['계열', '제형', '체중·대사', '추체외로 증상·좌불안석', '프로락틴', '졸림', 'QT 연장', '기립성 저혈압', '꼭 알아둘 것'];
const FX = ROWS.slice(2, 8);
const LEVELS = ['적은 편', '중간', '많은 편', '자료 부족'];
const LEVEL_RE = /^(적은 편|중간|많은 편|자료 부족)/;
const FIXED = '이 표로 약을 고르거나 바꾸지 말고';
/* 용량 단위. 보여 줄 때는 단위만(앞 숫자는 빼고): hit[1] || hit[0] */
const DOSE_UNIT = /(?:^|[^A-Za-z])(mg|mcg|μg|µg)(?![A-Za-z])|㎎|㎍|밀리그램|마이크로그램/i;
/* 표 어디에 있어도 경고하는 낱말(자유롭게 쓰는 "꼭 알아둘 것"·괄호 설명 포함) */
const TABLE_WARN = [
  { re: /추천|순위|\d\s*위(?![가-힣])|\d\s*등(?![가-힣])|가장\s*(?:좋은|효과적인|잘\s*듣는)|별점|가격|약값|값이?\s*(?:싸|비싸)|임신|이런 사람에게/, why: '추천·순위·가격·임신 등급은 넣지 않아요' },
  { re: /용량/, why: '용량 이야기는 표에 넣지 않아요' },
  { re: /하루\s*(?:\d+|한두|두세|한|두|세|네)\s*(?:번|회|차례)|1\s*일\s*\d+\s*회|(?:아침|저녁|자기 전)에?\s*(?:\d+|한)\s*(?:번|회)/, why: '복용 횟수는 쓰지 않아요' },
  { re: /상호\s*작용/, why: '상호작용 판정은 넣지 않아요(필요하면 본문에 출처와 함께)' },
  { re: /상품명|®|™/, why: '상품명은 표에 넣지 않아요(본문에 국내 대표 상품명 한 번만)' }
];

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
}

module.exports = {
  id: 'drug-card',
  ROWS: ROWS,
  LEVELS: LEVELS,
  check: function (ctx, report) {
    const lines = ctx.body.split('\n');
    const starts = [];
    lines.forEach(function (l, i) { if (/^##\s+약 카드\s*$/.test(l)) starts.push(i); });
    if (!starts.length) {
      if (/^##\s+약\s*카드/m.test(ctx.body)) report.warn('약 카드 소절 제목은 "## 약 카드" 그대로 써요(다르면 검사·화면이 못 읽어요)');
      return;
    }
    if (starts.length > 1) report.error('## 약 카드 소절이 ' + starts.length + '개 — 하나만');
    if (ctx.section !== 7) report.warn('약 카드는 7분류 개별 약 글에만 둬요');

    const s = starts[0];
    let e = lines.length;
    for (let i = s + 1; i < lines.length; i++) if (/^##\s/.test(lines[i])) { e = i; break; }
    const sec = lines.slice(s + 1, e);
    const secText = sec.join('\n');
    if (secText.indexOf(FIXED) < 0) report.warn('약 카드 소절에 고정 문구("같은 약이라도 사람마다 반응이 달라요. 이 표로 약을 고르거나 바꾸지 말고 담당 의사와 상의하세요.")가 없음');

    const t0 = sec.findIndex(function (l) { return /^\s*\|/.test(l); });
    if (t0 < 0) { report.error('## 약 카드 소절에 표가 없음'); return; }
    let t1 = t0;
    while (t1 < sec.length && /^\s*\|/.test(sec[t1])) t1++;
    const tbl = sec.slice(t0, t1);
    const tableText = tbl.join('\n');

    const mg = DOSE_UNIT.exec(tableText);
    if (mg) report.error('약 카드 표에 용량 단위("' + (mg[1] || mg[0]) + '") — 용량은 쓰지 않아요');
    TABLE_WARN.forEach(function (w) {
      const hit = w.re.exec(tableText);
      if (hit) report.warn('약 카드 표에 "' + hit[0] + '" — ' + w.why);
    });

    const head = cells(tbl[0]);
    if (head.length !== 2 || head[0] !== '항목' || head[1] !== '내용') report.warn('약 카드 머리 줄은 "| 항목 | 내용 |"');

    const got = [];
    const byName = {};
    tbl.slice(1).forEach(function (l) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) return;
      const c = cells(l);
      if (c.length !== 2) { report.error('약 카드는 2열 표 — "' + l.trim() + '"'); return; }
      const name = c[0].replace(/\*\*/g, '').trim();
      if (ROWS.indexOf(name) < 0) { report.error('약 카드에 정해진 행이 아님: "' + name + '" (행 이름: ' + ROWS.join(', ') + ')'); return; }
      if (byName[name] != null) { report.error('약 카드 행 "' + name + '" 이 겹침'); return; }
      byName[name] = c[1];
      got.push(name);
    });
    ROWS.forEach(function (r) { if (byName[r] == null) report.error('약 카드에 "' + r + '" 행이 없음(근거가 없으면 자료 부족으로 채워요)'); });
    const order = ROWS.filter(function (r) { return got.indexOf(r) >= 0; });
    if (order.join('|') !== got.join('|')) report.warn('약 카드 행 순서가 정해진 순서와 다름: ' + ROWS.join(' → '));

    FX.forEach(function (r) {
      const v = byName[r];
      if (v == null) return;
      if (!LEVEL_RE.test(v)) { report.error('약 카드 "' + r + '" 칸은 ' + LEVELS.join('·') + ' 중 하나로 시작해요 — 지금 "' + v + '"'); return; }
      if (!/^자료 부족/.test(v) && !/\[\^\d+\]/.test(v)) report.error('약 카드 "' + r + '" 칸에 출처 각주가 없음 — 출처에서 확인 못 한 칸은 자료 부족');
    });
    if (byName['계열'] != null && !/^(1세대|2세대)/.test(byName['계열'])) report.warn('약 카드 "계열" 칸은 1세대 또는 2세대로 시작해요(부분 작용제는 "2세대 · 부분 작용제")');
    if (byName['제형'] != null && !/^먹는 약.*장기지속형 주사 (있음|없음|확인 못 함)/.test(byName['제형'])) report.warn('약 카드 "제형" 칸은 "먹는 약 · 장기지속형 주사 있음/없음/확인 못 함" 꼴');
    const note = byName['꼭 알아둘 것'];
    if (note != null && !note.replace(/\[\^\d+\]/g, '').trim()) report.warn('약 카드 "꼭 알아둘 것" 칸이 비어 있음');
    else if (note != null && !/\[\^\d+\]/.test(note)) report.warn('약 카드 "꼭 알아둘 것" 칸에 출처 각주가 없음 — 이 칸은 항정신병약 한눈에(meds/) 화면에도 그대로 나가요');
  }
};
