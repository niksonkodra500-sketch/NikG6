import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const SAMPLE = path.join(process.cwd(), 'public', 'sample.png');

interface Pixel {
  r: number;
  g: number;
  b: number;
}

async function openSample(page: Page) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Open', exact: true }).click(),
  ]);
  await fileChooser.setFiles(SAMPLE);
  await page.waitForFunction(() => {
    const handle =
      (window as unknown as { __editorHandle?: { hasImage(): boolean } })
        .__editorHandle;
    return Boolean(handle?.hasImage());
  });
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
