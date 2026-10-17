import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

// Larger sample with a strongly colored center so e2e pixel assertions are
// robust. The previous 32x32 gradient, when scaled up ~22x to fill the canvas,
// blended the center pixel to near-grey — which broke the grayscale test's
// "before.r !== before.b" precondition even though the image was rendering fine.
const SIZE = 256;

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

const width = SIZE;
const height = SIZE;
const cx = (width - 1) / 2;
const cy = (height - 1) / 2;
const maxDist = Math.max(cx, cy);
const raw = Buffer.alloc((width * 3 + 1) * height);
let offset = 0;
for (let y = 0; y < height; y++) {
  raw[offset++] = 0; // filter: none
  for (let x = 0; x < width; x++) {
    // Normalised Chebyshev distance from centre (0 at centre, 1 at corners)
    const d = Math.max(Math.abs(x - cx), Math.abs(y - cy)) / maxDist;
    raw[offset++] = Math.round(255 * (1 - d)); // red: 255 at centre, 0 at edge
    raw[offset++] = Math.round(255 * d);        // green: 0 at centre, 255 at edge
    raw[offset++] = 0;                          // blue: 0 everywhere
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type: RGB
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter method
ihdr[12] = 0; // interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync('public', { recursive: true });
writeFileSync('public/sample.png', png);
console.log(`Generated public/sample.png (${width}x${height}, ${png.length} bytes)`);