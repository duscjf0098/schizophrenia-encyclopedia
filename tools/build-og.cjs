/* 공유 미리보기 배너(og.png 1200×630) 생성. tools/og-template.html 의 {{DOCS}} 등을 채운 뒤 브라우저로 찍는다.
   실행: node tools/build-og.cjs   (Playwright 가 없으면 og-filled.html 만 만들고 안내한다) */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function load(file) { const win = { JHB: {} }; new Function('window', 'JHB', fs.readFileSync(path.join(root, file), 'utf8'))(win, win.JHB); return win.JHB; }
const J = Object.assign({}, load('data/toc.js'), load('data/glossary.js'));
const html = fs.readFileSync(path.join(__dirname, 'og-template.html'), 'utf8')
  .replace('{{DOCS}}', String(J.toc.articles.length)).replace('{{TERMS}}', String(J.glossary.length)).replace('{{SOURCES}}', String(J.toc.sources || 0));
const filled = path.join(__dirname, 'og-filled.html');
fs.writeFileSync(filled, html);

let pw = null;
try { pw = require('playwright'); } catch (e) { try { pw = require(path.join(process.env.APPDATA || '', 'npm/node_modules/playwright')); } catch (e2) { } }
if (!pw) { console.log('playwright 모듈이 없어요. ' + filled + ' 를 브라우저로 열어 1200×630 으로 찍어 og.png 로 저장하세요.'); process.exit(0); }
(async function () {
  const browser = await pw.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto('file:///' + filled.replace(/\\/g, '/'));
  await page.evaluate(function () { return document.fonts.ready; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(root, 'og.png'), type: 'png' });
  await browser.close();
  console.log('og.png 생성 (1200×630)');
})();
