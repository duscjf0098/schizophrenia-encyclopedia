/* icon-192.png, icon-512.png 생성 (외부 라이브러리 없이). 둥근 보라 바탕 + 흰 원 + 노란 점. node tools/make-icons.cjs */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const r = size * 0.22, cx = size / 2, cy = size / 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (size * 4 + 1) + 1 + x * 4;
      /* 둥근 사각형 */
      const dx = Math.max(Math.abs(x - cx) - (size / 2 - r), 0), dy = Math.max(Math.abs(y - cy) - (size / 2 - r), 0);
      const inside = dx * dx + dy * dy <= r * r;
      let R = 0x5b, G = 0x4f, B = 0xd6, A = inside ? 255 : 0;
      /* 흰 구슬(뇌를 닮은 타원) */
      const ex = (x - cx) / (size * 0.24), ey = (y - cy - size * 0.03) / (size * 0.2);
      if (inside && ex * ex + ey * ey <= 1) { R = G = B = 255; }
      /* 노란 점 */
      const px = x - size * 0.72, py = y - size * 0.28;
      if (inside && px * px + py * py <= (size * 0.07) * (size * 0.07)) { R = 0xf2; G = 0xb5; B = 0x30; }
      raw[o] = R; raw[o + 1] = G; raw[o + 2] = B; raw[o + 3] = A;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
[192, 512].forEach(function (s) {
  fs.writeFileSync(path.join(__dirname, '..', 'icon-' + s + '.png'), png(s));
  console.log('icon-' + s + '.png');
});
