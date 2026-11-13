/* 전체 빌드 한 번에: 글 검사 → 특집 화면 선언 → 글 목록·색인·프리캐시 → 문서 링크 지도 → 모듈 css → 정적 페이지.
   하나라도 실패하면 거기서 멈춘다(종료 코드 1). 실행: node tools/build-all.cjs */
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const steps = ['check-content', 'build-kb', 'build-index', 'build-links', 'build-ui-css', 'build-pages'];
const t0 = Date.now();
for (const name of steps) {
  console.log('\n== ' + name + ' ==');
  const r = spawnSync(process.execPath, [path.join(__dirname, name + '.cjs')], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  if (r.status !== 0) {
    console.error('\n' + name + ' 에서 멈췄어요(종료 코드 ' + r.status + '). 위 메시지를 고치고 다시 돌려 주세요.');
    process.exit(1);
  }
}
console.log('\n전체 빌드 끝(' + ((Date.now() - t0) / 1000).toFixed(1) + '초)');
