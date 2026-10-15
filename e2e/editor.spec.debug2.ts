import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const SAMPLE = path.join(process.cwd(), 'public', 'sample.png');

interface Pixel {
  r: number;
  g: number;
  b: number;
}

async function openSample(page: Page) {
  // Listen to console logs and print them
  page.on('console', msg => {
    console.log(`PAGE CONSOLE: ${msg.text()}`);
  });
  // Also listen to page errors
  page.on('pageerror', err => {
    console.log(`PAGE ERROR: ${err}`);
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'debug-page-loaded.png' });

  console.log('openSample: waiting for Open button');
  const button = page.getByRole('button', { name: 'Open', exact: true });
  const buttonCount = await button.count();
  console.log(`openSample: button count: ${buttonCount}`);
  if (buttonCount > 0) {
    const isVisible = await button.isVisible();
    const isEnabled = await button.isEnabled();
    console.log(`openSample: button visible: ${isVisible}, enabled: ${isEnabled}`);
    // Get the button's outerHTML
    const outerHTML = await button.first().evaluate(el => el.outerHTML);
    console.log(`openSample: button outerHTML: ${outerHTML}`);
    // Take screenshot before click
    await page.screenshot({ path: 'debug-before-click.png' });
    // Click the button
    await button.click();
    console.log('openSample: clicked button');
  } else {
    console.log('openSample: button not found, trying to find by other selectors');
    // Try to find by text content
    const textButton = page.locator('button:has-text("Open")');
    const textCount = await textButton.count();
    console.log(`openSample: button by text count: ${textCount}`);
    if (textCount > 0) {
      const isVisible = await textButton.isVisible();
      const isEnabled = await textButton.isEnabled();
      console.log(`openSample: text button visible: ${isVisible}, enabled: ${isEnabled}`);
      const outerHTML = await textButton.first().evaluate(el => el.outerHTML);
      console.log(`openSample: text button outerHTML: ${outerHTML}`);
      await page.screenshot({ path: 'debug-before-click-text.png' });
      await textButton.click();
      console.log('openSample: clicked text button');
    } else {
      console.log('openSample: no button found at all');
      // Dump the body HTML
      const bodyHTML = await page.evaluate(() => document.body.innerHTML);
      console.log('openSample: body HTML:', bodyHTML.substring(0, 500));
    }
  }

  // Wait for file chooser event with a timeout
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => {
      console.log('openSample: timeout waiting for filechooser event');
      return null;
    }),
    // Also wait a bit to see if click triggers something
    page.waitForTimeout(1000)
  ]);
  if (fileChooser) {
    console.log('openSample: file chooser received');
    await fileChooser.setFiles(SAMPLE);
  } else {
    console.log('openSample: no file chooser, trying to set files directly on input');
    // Find the hidden file input and set files directly
    const fileInput = page.locator('input[type="file"]');
    const inputCount = await fileInput.count();
    console.log(`openSample: file input count: ${inputCount}`);
    if (inputCount > 0) {
      await fileInput.setInputFiles(SAMPLE);
      console.log('openSample: set files directly on input');
    } else {
      console.log('openSample: no file input found');
    }
  }

  await page.waitForFunction(() => {
    const handle =
      (window as unknown as { __editorHandle?: { hasImage(): boolean } })
        .__editorHandle;
    return Boolean(handle?.hasImage());
  }, { timeout: 10000 });
}

function readPixel(page: Page): Promise<Pixel | null> {
  return page.evaluate(() => {
    const handle =
      (
        window as unknown as {
          __editorHandle?: { getCanvasPixel(): Pixel };
        }
      ).__editorHandle;
    return handle ? handle.getCanvasPixel() : null;
  });
}

async function waitForPixel(page: Page, check: 'grey' | 'colored') {
  await page.waitForFunction((c) => {
    const handle =
      (
        window as unknown as {
          __editorHandle?: { getCanvasPixel(): Pixel };
        }
      ).__editorHandle;
    const pixel = handle?.getCanvasPixel();
    if (pixel === undefined) return false;
    return c === 'grey'
      ? pixel.r === pixel.g && pixel.g === pixel.b
      : pixel.r !== pixel.b;
  }, check);
}

test.describe('photo editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens an image and renders it on the canvas', async ({ page }) => {
    await openSample(page);
    await expect(page.locator('canvas').first()).toBeVisible();
    expect(await readPixel(page)).not.toBeNull();
  });

  test('grayscale filter makes the center pixel grey', async ({ page }) => {
    await openSample(page);

    const before = await readPixel(page);
    expect(before).not.toBeNull();
    if (before === null) throw new Error('could not read pixel');
    expect(before.r).not.toBe(before.b);

    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('button', { name: /grayscale/i }).click();
    await waitForPixel(page, 'grey');

    const after = await readPixel(page);
    expect(after).not.toBeNull();
    if (after === null) throw new Error('could not read pixel');
    expect(after.r).toBe(after.g);
    expect(after.g).toBe(after.b);
  });

  test('undo restores the original colors', async ({ page }) => {
    await openSample(page);
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('button', { name: /grayscale/i }).click();
    await waitForPixel(page, 'grey');

    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await waitForPixel(page, 'colored');
  });

  test('exports a PNG data URL', async ({ page }) => {
    await openSample(page);
    const result = await page.evaluate(async () => {
      const handle =
        (
          window as unknown as {
            __editorHandle?: {
              exportImage(format: string, quality: number): Promise<string>;
            };
          }
        ).__editorHandle;
    return handle ? handle.exportImage('png', 1) : null;
    });
    expect(result).toMatch(/^data:image\/png;base64,/);
  });
});
