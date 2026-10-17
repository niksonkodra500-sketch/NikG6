import pkg from '/workspace/app/node_modules/playwright/index.js';
const { chromium } = pkg;
import fs from 'fs';

const sampleB64 = fs.readFileSync('/workspace/app/dist/sample.png').toString('base64');
const sampleDataUrl = 'data:image/png;base64,' + sampleB64;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 412, height: 792 } });
const page = await context.newPage();

await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const inspect = async (label) => {
  const result = await page.evaluate(() => {
    const wrap = document.querySelector('.editor-canvas-wrap');
    const canvas = document.querySelector('canvas');
    const placeholder = document.querySelector('.editor-placeholder');
    let phVisible = null;
    if (placeholder) {
      const s = getComputedStyle(placeholder);
      phVisible = s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    }
    return {
      wrapExists: !!wrap,
      wrapClientWidth: wrap ? wrap.clientWidth : null,
      wrapClientHeight: wrap ? wrap.clientHeight : null,
      canvasExists: !!canvas,
      canvasAttrWidth: canvas ? canvas.getAttribute('width') : null,
      canvasAttrHeight: canvas ? canvas.getAttribute('height') : null,
      canvasCssWidth: canvas ? getComputedStyle(canvas).width : null,
      canvasCssHeight: canvas ? getComputedStyle(canvas).height : null,
      placeholderExists: !!placeholder,
      placeholderVisible: phVisible,
      hasEditorHandle: !!window.__editorHandle,
    };
  });
  console.log(label, JSON.stringify(result, null, 2));
  return result;
};

await inspect('BEFORE LOAD');

// load sample
const loaded = await page.evaluate(async (du) => {
  if (!window.__editorHandle) return 'no handle';
  try { await window.__editorHandle.loadFromDataUrl(du); return 'loaded'; }
  catch (e) { return 'error: ' + e.message; }
}, sampleDataUrl);
console.log('load result:', loaded);
await page.waitForTimeout(1000);

await inspect('AFTER LOAD');

const pixel = await page.evaluate(() => {
  if (!window.__editorHandle) return 'no handle';
  try { return window.__editorHandle.getCanvasPixel(); }
  catch (e) { return 'error: ' + e.message; }
});
console.log('center pixel:', JSON.stringify(pixel));

await browser.close();
