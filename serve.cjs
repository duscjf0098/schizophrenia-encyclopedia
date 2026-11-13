/* 로컬 미리보기 서버: node serve.cjs → http://localhost:5174 (다른 포트: PORT=5175 node serve.cjs)
   빌드를 돌리지 않아도 새 파일이 보이게 몇 가지를 즉석에서 만든다(tools/lib/assets.cjs 의 같은 함수를 쓴다):
   - /css/ui.css      css/ui/*.css 를 이어 붙여서
   - /data/pages.js   data/pages/*.json 선언으로(검사에 걸린 선언은 빼고 터미널에 알림)
   - 모든 HTML         <!--ui:start-->…<!--ui:end-->(모듈 스크립트)와 <!--top:start-->…<!--top:end-->(상단 링크)를 지금 파일 기준으로
   - <id>/            폴더가 아직 없어도 data/pages/<id>.json 이 있으면 app-shell.html 을 그 주소용으로 채워서
   응답은 모두 Cache-Control: no-store. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const A = require('./tools/lib/assets.cjs');

const root = __dirname;
const port = Number(process.env.PORT || 5174);
const SITE_PATH = '/schizophrenia-encyclopedia/';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};

let lastWarn = '';
function decls() {
  const r = A.pageDecls({ root: root });
  const msg = r.errors.concat(r.warnings).join('\n');
  if (msg && msg !== lastWarn) console.warn('[특집 화면 선언]\n' + msg);
  lastWarn = msg;
  return r.pages;
}
function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}
/* HTML 의 data-base 값(그 페이지에서 사이트 루트까지의 상대 경로)으로 모듈 줄·상단 링크를 다시 채운다 */
function sendHtml(res, code, html) {
  const m = /<html[^>]*\sdata-base="([^"]*)"/.exec(html);
  send(res, code, types['.html'], A.applyShellMarkers(html, m ? m[1] : '', decls(), { root: root }));
}
function declared(id) { return A.ID_RE.test(id) && fs.existsSync(path.join(root, 'data', 'pages', id + '.json')); }

http.createServer(function (req, res) {
  let p;
  const q = req.url.indexOf('?') >= 0 ? req.url.slice(req.url.indexOf('?')) : '';
  try { p = decodeURIComponent(req.url.split('?')[0]); }
  catch (e) { return send(res, 400, 'text/plain; charset=utf-8', 'bad request'); }
  if (p === '/css/ui.css') return send(res, 200, types['.css'], A.uiCss({ root: root }));
  if (p === '/data/pages.js') return send(res, 200, types['.js'], A.pagesJs(decls()));
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(root, p));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, function (err, data) {
    if (err) {
      /* 아직 빌드하지 않은 특집 화면: app-shell 을 그 주소용으로 채운다 */
      const fm = /^\/([a-z][a-z0-9-]{1,19})\/index\.html$/.exec(p);
      if (fm && declared(fm[1]) && fs.existsSync(path.join(root, 'app-shell.html'))) {
        const shell = fs.readFileSync(path.join(root, 'app-shell.html'), 'utf8');
        return sendHtml(res, 200, shell.split('{{BASE}}').join('../').split('{{ROUTE}}').join(fm[1]).split('{{HOME}}').join('../'));
      }
      /* 끝에 / 가 빠진 폴더 주소는 / 를 붙여 보낸다(GitHub Pages 와 같게).
         Location 은 디코딩한 주소를 그대로 쓰지 않고 사이트 루트 기준으로 다시 만든다:
         '//css'·'/\css' 가 다른 호스트로 가는 주소(//css/)가 되거나, 한글 폴더 이름이 헤더 오류로 서버를 멈추지 않게 */
      if (!path.extname(p) && (declared(p.replace(/^\/|\/$/g, '')) || (fs.existsSync(file) && fs.statSync(file).isDirectory()))) {
        const rel = path.relative(root, file).split(path.sep).filter(Boolean).join('/');
        const loc = '/' + (rel ? rel.split('/').map(encodeURIComponent).join('/') + '/' : '') + (/^\?[\x21-\x7e]*$/.test(q) ? q : '');
        res.writeHead(301, { Location: loc, 'Cache-Control': 'no-store' }); return res.end();
      }
      if (/text\/html/.test(req.headers.accept || '') && fs.existsSync(path.join(root, '404.html'))) {
        return sendHtml(res, 404, fs.readFileSync(path.join(root, '404.html'), 'utf8').split(SITE_PATH).join('/'));
      }
      return send(res, 404, 'text/plain; charset=utf-8', 'not found: ' + p);
    }
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html') return sendHtml(res, 200, data.toString('utf8'));
    send(res, 200, types[ext] || 'application/octet-stream', data);
  });
}).listen(port, function () { console.log('조현병 백과 → http://localhost:' + port); });
