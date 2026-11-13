/* 민감 주제 검사 (집필가이드 "민감한 주제", "응급 태그")
   오류: 응급 태그 글에 119 없음 / "극단적 선택" 같은 말(본문·제목·요약)
   경고: 응급 태그 글에 warn 콜아웃 없음 / 자살·자해가 본문에 3번 이상인데 위기 태그 없음 */
module.exports = {
  id: 'safety',
  check: function (ctx, report) {
    const tags = ctx.tags, body = ctx.body, m = ctx.meta;

    if (tags.indexOf('응급') >= 0) {
      if (!/(^|[^\d])119(?!\d)/.test(body)) report.error('응급 태그 글인데 본문에 119 없음');
      if (!/^:::\s*warn\b/m.test(body)) report.warn('응급 태그 글인데 "바로 연락할 신호" warn 콜아웃이 없음');
    }

    [['본문', body], ['제목', m.title], ['요약', m.summary]].forEach(function (w) {
      const hit = ctx.EXTREME_CHOICE.exec(String(w[1] || ''));
      if (hit) report.error(w[0] + '에 "' + hit[0] + '" — 자살을 에두르는 말은 쓰지 않아요(자살예방 보도준칙). "자살"로 쓰고 도움 경로를 함께');
    });

    /* 기관·전화·법 이름(자살예방상담, 자살예방센터, 자살예방법 등)은 세지 않는다 */
    const n = (body.replace(/자살\s*예방\s*(?:상담\s*전화|상담|센터|법|정책|사업)?/g, '').match(/자살|자해/g) || []).length;
    if (n >= 3 && tags.indexOf('위기') < 0) {
      report.warn('본문에 "자살·자해"가 ' + n + '번 — 한 소절 이상 다루면 위기 태그와 109·1577-0199·119');
    }
  }
};
