import { expect, test } from '@playwright/test';

test('measure trigger vs dropdown', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.editor-menu-trigger').click();
  await page.locator('.editor-menu-dropdown').waitFor({ state: 'visible' });

  const info = await page.evaluate(() => {
    const trigger = document.querySelector('.editor-menu-trigger') as HTMLElement;
    const dropdown = document.querySelector('.editor-menu-dropdown') as HTMLElement;
    const tr = trigger.getBoundingClientRect();
    const dr = dropdown.getBoundingClientRect();
    const firstBtn = dropdown.querySelector('button') as HTMLElement;
    const fr = firstBtn.getBoundingClientRect();
    // overlap area between trigger and dropdown
    const ox = Math.max(0, Math.min(tr.x + tr.width, dr.x + dr.width) - Math.max(tr.x, dr.x));
    const oy = Math.max(0, Math.min(tr.y + tr.height, dr.y + dr.height) - Math.max(tr.y, dr.y));
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      trigger: { x: Math.round(tr.x), y: Math.round(tr.y), w: Math.round(tr.width), h: Math.round(tr.height), bottom: Math.round(tr.y + tr.height) },
      dropdown: { x: Math.round(dr.x), y: Math.round(dr.y), w: Math.round(dr.width), h: Math.round(dr.height), bottom: Math.round(dr.y + dr.height) },
      firstButton: { x: Math.round(fr.x), y: Math.round(fr.y), w: Math.round(fr.width), h: Math.round(fr.height) },
      overlapArea: Math.round(ox * oy),
      dropdownOverflowsLeft: dr.x < 0,
      dropdownOverflowsRight: dr.x + dr.width > window.innerWidth,
    };
  });
  console.log('MEASURE:', JSON.stringify(info, null, 2));
  expect(info.overlapArea).toBe(0);
});