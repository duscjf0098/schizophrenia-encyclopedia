/* sitemap.xml 의 모든 주소를 IndexNow(빙·네이버 등)에 제출한다.
   공개 사이트에 올린 뒤 실행: node tools/indexnow.cjs
   키 파일(<KEY>.txt)은 사이트 루트에 있어야 하고 지우면 안 된다. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const KEY = '7f51130c8a07a3bd7a23446bb774decc';
const BASE = 'https://duscjf0098.github.io/schizophrenia-encyclopedia/';
const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(function (m) { return m[1]; });
const body = JSON.stringify({ host: 'duscjf0098.github.io', key: KEY, keyLocation: BASE + KEY + '.txt', urlList: urls });
(async function () {
  for (const ep of ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow']) {
    try {
      const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: body });
      console.log(ep, r.status, urls.length + '개');
    } catch (e) { console.log(ep, '실패', e.message); }
  }
})();
