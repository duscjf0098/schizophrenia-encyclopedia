/* 생성기 실행: tools/gen/*.cjs 를 이름순으로 돌려 글에서 화면 데이터(data/kb/*.json)를 만든다.
   생성기는 인자 없이 돌고, 같은 입력이면 같은 출력을 내고, 실패하면 종료 코드 1을 낸다.
   하나라도 실패하면 여기서 멈춘다(종료 코드 1). 실행: node tools/build-gen.cjs
   규칙: 생성된 json 은 손으로 고치지 않는다. 이름이 _ 로 시작하는 파일은 건너뛴다. */
const fs = require('fs'), path = require('path');
const spawnSync = require('child_process').spawnSync;
const dir = path.join(__dirname, 'gen');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(function (f) { return /\.cjs$/.test(f) && f[0] !== '_'; }).sort() : [];
if (!files.length) { console.log('생성기 없음(tools/gen/*.cjs)'); process.exit(0); }
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  if (r.status !== 0) { console.error('생성기 ' + f + ' 실패(종료 코드 ' + r.status + ')'); process.exit(1); }
}
console.log('생성기 ' + files.length + '개 실행(' + files.join(', ') + ')');
