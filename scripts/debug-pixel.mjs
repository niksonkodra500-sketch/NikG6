import { chromium } from '@playwright/test';
import path from 'node:path';

const SAMPLE = path.join(process.cwd(), 'public', 'sample.png');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:5173');

const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.getByRole('button', { name: 'Open', exact: true }).click(),
]);
await fileChooser.setFiles(SAMPLE);
await page.waitForFunction(() => {
  const handle = window.__editorHandle;
  return Boolean(handle && handle.hasImage());
});

const info = await page.evaluate(() => {
  const handle = window.__editorHandle;
  const canvases = Array.from(document.querySelectorAll('canvas')).map((c) => ({
    width: c.width,
    height: c.height,
    className: c.className,
  }));
  const upper = document.querySelector('canvas.upper-canvas');
  let upperPixel = null;
  if (upper) {
    const ctx = upper.getContext('2d');
    const d = ctx.getImageData(16, 16, 1, 1).data;
    upperPixel = { r: d[0], g: d[1], b: d[2], a: d[3] };
  }
  return {
    pixel: handle ? handle.getCanvasPixel() : null,
    canvases,
    upperPixel,
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
