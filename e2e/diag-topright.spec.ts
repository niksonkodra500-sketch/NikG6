import { expect, test } from '@playwright/test';

test('dump top-right elements', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.editor-menu-trigger').click();
  await page.locator('.editor-menu-dropdown').waitFor({ state: 'visible' });

  const info = await page.evaluate(() => {
    const region = { x: 0, y: 0, w: 140, h: 140 };
    const all = Array.from(document.querySelectorAll('*'));
    const hits = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // intersects top-right region
      if (r.x < region.w && r.x + r.width > 0 && r.y < region.h && r.y + r.height > 0) {
        const cs = getComputedStyle(el);
        if (cs.position === 'static') continue;
        hits.push({
          tag: el.tagName,
          class: el.className?.toString().slice(0, 60),
          id: el.id,
          text: (el.textContent || '').trim().slice(0, 30),
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          position: cs.position,
          zIndex: cs.zIndex,
        });
      }
    }
    return { viewport: { w: window.innerWidth, h: window.innerHeight }, hits };
  });
  console.log('TOPRIGHT:', JSON.stringify(info, null, 2));
  expect(info.hits.length).toBeGreaterThan(0);
});