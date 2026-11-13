/* 바로 연락할 신호 표 검사 (집필가이드 "바로 연락할 신호 표 (부작용 총론 전용)")
   부작용 총론(파일 이름 side-effects-overview)의 "## 바로 연락할 신호" 표는 바로 연락할 신호 한 장(red-flags/) 화면의 유일한 원천이에요.
   화면 자료는 생성기 tools/gen/red-flags.cjs 가 만들어요. 이 검사는 판정을 따로 적지 않고 그 생성기의 함수를 그대로 불러요
   (약 카드가 tools/checks/drug-card.cjs 한 벌을 생성기와 같이 쓰는 것과 같은 까닭: 글 검사를 통과했는데 빌드의 생성기 단계에서 멈추지 않게).
   - extract(글 원문, { slug, slugs: content/ 의 글 }): 소절 찾기, 머리 줄과 |---| 줄, 열 이름 4개, 줄마다 4칸·빈 칸, 자세한 글 링크와 그 글이 있는지,
     할 일의 첫 마디("바로 119" 또는 "오늘 안에 … 연락", 부정 없이), 각주가 출처에 있는지, 표 바로 뒤 "스스로 끊지 말고 … 연락" 문단
   - leadErrors(자료, 선언): 선언 data/pages/red-flags.json 의 lead 와 표 앞 첫 문단이 글자까지 같은지(생성기 run 과 같은 순서로, 표가 읽혔을 때만)
   오류(생성기도 멈춤): 위 판정의 모든 이유. 앞에 '"## 바로 연락할 신호" 표(red-flags/ 화면의 원천): '
   오류(전체 검사에서만, setErrors): 원천 글이 content/ 에 없음(생성기가 '원천 글이 없어요'로 멈춰요)
   다른 글에는 걸지 않아요(생성기도 그 한 편만 읽어요). */
'use strict';
const fs = require('fs');
const path = require('path');
const RF = require('../gen/red-flags.cjs');

const ROOT = path.join(__dirname, '..', '..');
const PREFIX = '"## ' + RF.HEADING + '" 표(red-flags/ 화면의 원천): ';
let SLUGS = null;

/* 검사 경로의 파일 이름 → slug(경로가 없으면 '') */
function slugOf(p) {
  return String(p == null ? '' : p).split(/[\\/]/).pop().replace(/\.md$/i, '');
}
/* 생성기 run() 과 같은 판정을 글 원문 하나에 → 이유 배열(빈 배열이면 통과).
   opts = { slugs: 있는 글(생략하면 content/ 를 한 번 읽어 둠), decl: 선언 객체(생략하면 data/pages/red-flags.json 을 읽음) } */
function problems(text, opts) {
  opts = opts || {};
  let slugs = opts.slugs;
  if (!slugs) { if (!SLUGS) SLUGS = RF.contentSlugs(ROOT); slugs = SLUGS; }
  const r = RF.extract(String(text == null ? '' : text), { slug: RF.SOURCE_SLUG, slugs: slugs });
  const errs = r.errors.slice();
  if (r.data) {
    let decl = opts.decl;
    if (decl === undefined) {
      try { decl = JSON.parse(fs.readFileSync(path.join(ROOT, RF.DECL), 'utf8').replace(/^\uFEFF/, '')); }
      catch (e) { decl = null; errs.push('선언을 읽지 못했어요: ' + RF.DECL.split(path.sep).join('/') + ' (' + (e && e.message ? e.message : e) + ')'); }
    }
    if (decl) RF.leadErrors(r.data, decl).forEach(function (e) { errs.push(e); });
  }
  return errs;
}
/* 전체 검사에서만: files = [{ rel, text }] → 원천 글이 content/ 에 없으면 오류 문구 하나 */
function setErrors(files) {
  const has = (files || []).some(function (f) {
    const rel = String(f.rel || '').replace(/\\/g, '/');
    return rel.indexOf('content/') === 0 && slugOf(rel) === RF.SOURCE_SLUG;
  });
  return has ? [] : ['원천 글이 없어요: content/**/' + RF.SOURCE_SLUG + '.md — 바로 연락할 신호 한 장(red-flags/) 생성기가 멈춰요'];
}

module.exports = {
  id: 'red-flags',
  PREFIX: PREFIX,
  problems: problems,
  setErrors: setErrors,
  check: function (ctx, report) {
    if (slugOf(ctx.path) !== RF.SOURCE_SLUG) return;
    problems(ctx.text).forEach(function (e) { report.error(PREFIX + e); });
  }
};
