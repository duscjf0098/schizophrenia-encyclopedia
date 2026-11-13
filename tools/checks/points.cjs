/* 핵심 3가지(frontmatter points)와 요약 수단 검사 (집필가이드 "핵심 3가지")
   오류: 3줄이 아님 / 한 줄이 60자 초과(공백 포함) / 각주·링크·굵게 / 금지 표현·"극단적 선택"
   경고: 본문에 없는 숫자 / 단정·지시 표현 / 효능 순위·추천 낱말 / 약 글의 용량·중단 낱말 / 위기 글인데 109·1577-0199 없음
         15분류에 points 있음 / 15분류에 ## 짧은 답 없음 / 15분류가 아닌데 points·## 한 문장으로·## 짧은 답 모두 없음 */
const MAX = 60;

/* points 의 숫자가 본문에 있는지. 각주 표시([^1])·링크 주소·목록 번호를 뺀 글(ctx.plain)에서
   숫자 덩어리 전체로 찾아요("3" 은 "30" 이나 "1.3" 안에서 찾은 것으로 치지 않아요). */
function numberInBody(num, plain) {
  const esc = num.replace(/[.,]/g, '\\$&');
  return new RegExp('(?:^|[^\\d.,])' + esc + '(?!\\d|[.,]\\d)').test(String(plain || ''));
}

module.exports = {
  id: 'points',
  check: function (ctx, report) {
    const m = ctx.meta, body = ctx.body;
    const has = Object.prototype.hasOwnProperty.call(m, 'points');
    const hasShort = /^##\s+짧은 답/m.test(body);
    const hasOne = /^##\s+한 문장으로/m.test(body);

    if (ctx.section === 15) {
      if (has) report.warn('15분류(자주 묻는 질문)는 ## 짧은 답 이 요약이라 points 를 쓰지 않아요');
      if (!hasShort) report.warn('15분류 글인데 ## 짧은 답 소절이 없음');
    } else if (ctx.section != null && !has && !hasShort && !hasOne) {
      report.warn('요약 수단이 없음 — points 3줄이나 ## 한 문장으로 소절을 더해요');
    }
    if (!has) return;

    const pts = m.points;
    if (!Array.isArray(pts)) {
      report.error('points 는 목록 3줄(다음 줄부터 두 칸 들여쓰고 "- 한 줄") — 지금 목록이 아님');
      return;
    }
    if (pts.length !== 3) report.error('points 는 정확히 3줄 — 지금 ' + pts.length + '줄');

    pts.forEach(function (p, i) {
      const at = 'points ' + (i + 1) + '번째 줄';
      const len = Array.from(p).length;
      if (!p) report.error(at + '이 비어 있음');
      if (len > MAX) report.error(at + '이 ' + MAX + '자 초과(' + len + '자, 공백 포함)');
      if (/\[\^\d+\]/.test(p)) report.error(at + '에 각주 표시([^n]) — 핵심 3가지에는 각주를 달지 않아요');
      if (/\[[^\]]*\]\([^)]*\)|https?:\/\/|#\/a\//.test(p)) report.error(at + '에 링크 — 링크는 본문과 ## 더 읽을 글에');
      if (/\*\*|__/.test(p)) report.error(at + '에 굵게 표시 — 핵심 3가지는 꾸밈 없는 글자만');
      ctx.findForbidden(p).forEach(function (h) { report.error(at + ': ' + h.why + ': "' + h.hit + '"'); });
      const ex = ctx.EXTREME_CHOICE.exec(p);
      if (ex) report.error(at + '에 "' + ex[0] + '" — 쓰지 않는 말');

      const seen = {};
      (p.match(/\d+(?:[.,]\d+)*/g) || []).forEach(function (num) {
        if (seen[num]) return;
        seen[num] = 1;
        if (!numberInBody(num, ctx.plain)) report.warn(at + '의 숫자 "' + num + '" 가 본문에 없음 — 본문에 있는 숫자만 다시 말해요');
      });
      const strong = /[가-힣]+야\s*(?:해요|합니다|한다|돼요|됩니다)|반드시|무조건|절대로?/.exec(p);
      if (strong) report.warn(at + ': 단정·지시 표현인지 확인("' + strong[0] + '")');
      const rank = /상위권|하위권|순위|\d\s*위(?![가-힣])|추천|가장 (?:좋은|효과적인|잘 듣는)/.exec(p);
      if (rank) report.warn(at + ': 효능 순위·추천처럼 읽히는지 확인("' + rank[0] + '")');
      if (ctx.section === 7) {
        const dose = /mg|밀리그램|용량|증량|감량|끊|중단/i.exec(p);
        if (dose) report.warn(at + ': 약 글의 핵심 3가지에 용량·중단 판단이 들어갔는지 확인("' + dose[0] + '")');
      }
    });

    if (ctx.tags.indexOf('위기') >= 0 && !pts.some(function (p) { return /109|1577-0199/.test(p); })) {
      report.warn('위기 글의 핵심 3가지에 109·1577-0199 가 없음 — 셋째 줄에 넣어요');
    }
  }
};
