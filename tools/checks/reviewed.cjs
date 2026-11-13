/* 출처 확인일(frontmatter reviewed) 검사 (집필가이드 "출처 확인일")
   오류: reviewed 가 있는데 YYYY-MM-DD 형식이 아니거나 달력에 없는 날
   경고: reviewed 가 오늘보다 뒤 */
module.exports = {
  id: 'reviewed',
  check: function (ctx, report) {
    const m = ctx.meta;
    if (!Object.prototype.hasOwnProperty.call(m, 'reviewed')) return;
    const v = typeof m.reviewed === 'string' ? m.reviewed.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      report.error('reviewed 는 YYYY-MM-DD 형식(모든 출처를 다시 열어 본문과 대조한 날) — 확인하지 않았으면 줄을 지워요');
      return;
    }
    const d = new Date(v + 'T00:00:00');
    const back = isNaN(d) ? '' : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (back !== v) { report.error('reviewed 날짜가 달력에 없음: ' + v); return; }
    if (v > ctx.todayStr) report.warn('reviewed 가 오늘(' + ctx.todayStr + ')보다 뒤: ' + v);
  }
};
