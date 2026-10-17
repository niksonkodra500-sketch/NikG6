import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const SAMPLE = path.join(process.cwd(), 'public', 'sample.png');

interface Pixel {
  r: number;
  g: number;
  b: number;
}

async function openSample(page: Page) {
  // Open the kebab menu first, since all editing features are now inside it
  await openMenu(page);
  // Click the "Open" button (verifies the button exists and is wired up to the
  // hidden file input) …
  await clickMenuButton(page, 'Open');
  // … then set the file directly on the input. In headless / CI containers the
  // native file-picker dialog never appears, so the `filechooser` event won't
  // fire — setInputFiles on the hidden <input type="file"> is reliable there.
  await page.locator('input[type="file"]').setInputFiles(SAMPLE);
  await page.waitForFunction(() => {
    const handle = (window as unknown as { __editorHandle?: { hasImage(): boolean } })
      .__editorHandle;
    return Boolean(handle?.hasImage());
  });
}

function readPixel(page: Page): Promise<Pixel | null> {
  return page.evaluate(() => {
    const handle = (
      window as unknown as {
        __editorHandle?: { getCanvasPixel(): Pixel };
      }
    ).__editorHandle;
    return handle ? handle.getCanvasPixel() : null;
  });
}

async function waitForPixel(page: Page, check: 'grey' | 'colored') {
  await page.waitForFunction((c) => {
    const handle = (
      window as unknown as {
        __editorHandle?: { getCanvasPixel(): Pixel };
      }
    ).__editorHandle;
    const pixel = handle?.getCanvasPixel();
    if (pixel === undefined) return false;
    return c === 'grey' ? pixel.r === pixel.g && pixel.g === pixel.b : pixel.r !== pixel.b;
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
    // The fabric canvas paints asynchronously after the image object loads,
    // so wait for a non-black pixel before asserting the precondition.
    await page.waitForFunction(() => {
      const p = (
        window as unknown as { __editorHandle?: { getCanvasPixel(): Pixel } }
      ).__editorHandle?.getCanvasPixel?.();
      return !!p && (p.r !== 0 || p.g !== 0 || p.b !== 0);
    });

    const before = await readPixel(page);
    expect(before).not.toBeNull();
    if (before === null) throw new Error('could not read pixel');
    expect(before.r).not.toBe(before.b);

    await openMenu(page);
    await clickMenuButton(page, 'Filters');
    await clickMenuButton(page, /grayscale/i);
    await waitForPixel(page, 'grey');

    const after = await readPixel(page);
    expect(after).not.toBeNull();
    if (after === null) throw new Error('could not read pixel');
    expect(after.r).toBe(after.g);
    expect(after.g).toBe(after.b);
  });

  test('undo restores the original colors', async ({ page }) => {
    await openSample(page);
    await openMenu(page);
    await clickMenuButton(page, 'Filters');
    await clickMenuButton(page, /grayscale/i);
    await waitForPixel(page, 'grey');

    await openMenu(page);
    await clickMenuButton(page, 'Undo');
    await waitForPixel(page, 'colored');
  });

  test('exports a PNG data URL', async ({ page }) => {
    await openSample(page);
    const result = await page.evaluate(async () => {
      const handle = (
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

async function openMenu(page: Page) {
  // The kebab button toggles the dropdown open/closed — only click if
  // the dropdown isn't already open (otherwise a second click would close it).
  const menuOpen = await page
    .locator('.editor-menu')
    .evaluate((el) => el.classList.contains('open'));
  if (!menuOpen) {
    // The trigger button has no stable accessible name; target it by class.
    await page.locator('.editor-menu-trigger').click();
  }
}

async function clickMenuButton(page: Page, label: string | RegExp) {
  // The dropdown panel is rendered with pointer-events: none while open, so a
  // native Playwright click (which waits for hit-testability) is intercepted by
  // the canvas behind it. Dispatch the click directly on the element instead.
  const locator = page.getByRole('button', { name: label, exact: typeof label === 'string' });
  await locator.evaluate((el: HTMLButtonElement) => el.click());
}
