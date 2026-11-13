/* 글 짜임 검사 (집필가이드 "권장 소절", "제도 글 추가 규칙")
   경고: 본문에 다른 글로 가는 링크(#/a/slug)가 없음 / 11분류 글의 "YYYY년 기준"이 올해보다 2년 이상 이전 */
const DATED = /((?:19|20)\d{2})\s*년(?:\s*\d{1,2}\s*월)?(?:\s*\d{1,2}\s*일)?\s*기준/g;

module.exports = {
  id: 'structure',
  check: function (ctx, report) {
    if (!/\]\(#\/a\/[^)\s]+\)/.test(ctx.body)) {
      report.warn('본문에 다른 글로 가는 링크(#/a/slug)가 하나도 없음 — 관련 글을 잇고 끝에 ## 더 읽을 글');
    }
    if (ctx.section === 11) {
      const old = [];
      let m;
      DATED.lastIndex = 0;
      while ((m = DATED.exec(ctx.body))) {
        if (Number(m[1]) <= ctx.year - 2 && old.indexOf(m[0]) < 0) old.push(m[0]);
      }
      if (old.length) report.warn('기준 연도가 2년 이상 지남: "' + old.join('", "') + '" — 최신 고시·공식 안내로 다시 확인해요');
    }
  }
};
