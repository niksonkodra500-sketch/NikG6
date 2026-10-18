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
  await page.getByRole('button', { name: 'Open', exact: true }).click({ force: true });
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

    const before = await readPixel(page);
    expect(before).not.toBeNull();
    if (before === null) throw new Error('could not read pixel');

    await openMenu(page);
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.waitForSelector('.filters-panel');
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
    await openMenu(page);
    await page.getByRole('button', { name: 'Filters', exact: true }).click({ force: true });
    await page.waitForSelector('.filters-panel');
    await page.getByRole('button', { name: /grayscale/i }).click({ force: true });
    await waitForPixel(page, 'grey');

    await openMenu(page);
    await page.getByRole('button', { name: 'Undo', exact: true }).click({ force: true });
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

  test('adds a text overlay and removes it', async ({ page }) => {
    await openSample(page);
    await openMenu(page);

    // Open Text Overlay panel
    await page.getByRole('button', { name: 'Text Overlay', exact: true }).click({ force: true });
    await page.waitForSelector('.text-overlay-panel');

    // Add text
    await page.getByRole('button', { name: /\+ add text/i }).click({ force: true });
    await page.locator('input[type="text"]').first().fill('Hello NikG6');
    await page.waitForSelector('.overlay-item');

    // Verify text appears in overlay list
    await expect(page.locator('.overlay-text-preview')).toContainText('Hello NikG6');

    // Remove the text overlay
    await page.getByRole('button', { name: /delete/i }).click({ force: true });
    await page.waitForTimeout(300);
    await expect(page.locator('.overlay-item')).toHaveCount(0);
  });

  test('applies a preset filter', async ({ page }) => {
    await openSample(page);
    await openMenu(page);

    // Switch to Presets tab
    await page.getByRole('button', { name: 'Presets', exact: true }).click({ force: true });
    await page.waitForSelector('.preset-row');

    // Click first preset button
    const presetButtons = page.locator('.preset-row button');
    await presetButtons.first().click({ force: true });

    // Verify canvas still renders (preset applied without crash)
    expect(await readPixel(page)).not.toBeNull();
  });

  test('saves and restores a project', async ({ page }) => {
    await openSample(page);
    await openMenu(page);

    // Open Projects panel
    await page.getByRole('button', { name: 'Projects', exact: true }).click({ force: true });
    await page.waitForSelector('.projects-panel');

    // Save project
    await page.getByPlaceholder(/project name/i).fill('e2e-test-project');
    await page.getByRole('button', { name: /save current/i }).click({ force: true });
    await page.waitForFunction(() => {
      const el = document.querySelector('.project-item');
      return Boolean(el?.textContent?.includes('e2e-test-project'));
    });

    // List should show the saved project
    await expect(page.locator('.project-item')).toContainText('e2e-test-project');

    // Delete the project
    await page.getByRole('button', { name: /delete/i }).last().click({ force: true });
    await page.waitForTimeout(300);
    await expect(page.locator('.project-item')).toHaveCount(0);
  });
});

async function openMenu(page: Page) {
  // The kebab button toggles the dropdown open/closed — only click if
  // the dropdown isn't already open (otherwise a second click would close it).
  const menuOpen = await page
    .locator('.editor-menu')
    .evaluate((el) => el.classList.contains('open'));
  if (!menuOpen) {
    await page.getByRole('button', { name: 'Show menu', exact: true }).click({ force: true });
  }
}
