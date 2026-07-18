// What a machine can know about sound: the page boots with zero console
// errors, POWER exists, flipping it constructs an AudioContext. Nothing more.
import { test, expect } from '@playwright/test';

test('boots clean; POWER wakes an AudioContext', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.addInitScript(() => {
    const AC = window.AudioContext;
    window.__acCount = 0;
    window.AudioContext = class extends AC {
      constructor(...a) { super(...a); window.__acCount++; }
    };
  });

  await page.goto('/#s=123456');
  await expect(page).toHaveTitle(/SKYWAVE/);
  await expect(page.locator('#pwr')).toBeVisible();
  // 7-seg readout renders ' 7.1000': six digit cells whose lit segments
  // decode back to the digits — stricter than the old text assertion
  await expect(page.locator('#freq .dig')).toHaveCount(6);
  const masks = await page.$$eval('#freq .dig', ds => ds.map(d =>
    [...d.children].reduce((m, el, b) => m | (el.classList.contains('on') ? 1 << b : 0), 0)));
  expect(masks).toEqual([0x00, 0x07, 0x06, 0x3f, 0x3f, 0x3f]); // ⌴ 7 . 1 0 0 0
  await expect(page.locator('#freq .dp')).toHaveCount(1);
  expect(await page.evaluate(() => window.__acCount)).toBe(0); // silent until gesture

  await page.locator('#pwr').click();
  await expect(page.locator('#pwr')).toHaveClass(/\bon\b/);
  expect(await page.evaluate(() => window.__acCount)).toBe(1);

  await page.waitForTimeout(600); // let the graph and crackle loop settle
  expect(errors).toEqual([]);
});
