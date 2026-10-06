import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { expect } = require('playwright/test');
const output = '.artifacts/history';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.HISTORY_BROWSER_CHANNEL ?? 'msedge', headless: true });
const errors = [];
try {
  for (const width of [320, 390, 760]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:8090');
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${output}/history-${width}.png`, fullPage: true });
    const future = page.getByRole('button', { name: /October 21, 2026/ });
    await expect(future).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Next month', exact: true })).toBeDisabled();
    const day = page.getByRole('button', { name: /Friday, October 2, 2026/ });
    const bounds = await day.boundingBox();
    // Seven columns and the approved 3px gaps leave ~42px per column on
    // 320px phones. Rows retain at least 44px of vertical touch space.
    if (bounds.width < 40 || bounds.height < 44) throw new Error(`Day target too small at ${width}px: ${bounds.width}×${bounds.height}`);
    const gridBounds = await page.getByTestId('history-calendar-grid').boundingBox();
    const expectedGridHeight = width < 360 ? 237 : 252;
    if (Math.abs(gridBounds.height - expectedGridHeight) > 1) throw new Error(`Calendar stretched at ${width}px: ${gridBounds.height}px`);
    const journey = await page.getByTestId('history-journey').locator('path').getAttribute('d');
    if (!journey.includes('L ')) throw new Error('Populated calendar journey has no connecting segments');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) throw new Error(`Horizontal page overflow at ${width}px`);
    await day.click();
    await expect(page.getByText('8,750', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /October 8, 2026/ }).click();
    await expect(page.getByText('An earned protection kept your streak going.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /walking streak/ }).click();
    await expect(page.getByRole('heading', { name: /Small steps/ })).toBeVisible();
    await expect(page.getByText('A week of walks', { exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/milestones-${width}.png` });
    await page.getByRole('button', { name: 'Keep stepping', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Keep stepping', exact: true })).toBeVisible();
    await expect(page.getByText('Your walking year', { exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/milestones-bottom-${width}.png` });
    await page.getByRole('button', { name: 'Close milestones', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Small steps/ })).not.toBeVisible();
    await page.getByRole('button', { name: 'Previous month', exact: true }).click();
    await expect(page.getByText('September 2026', { exact: true })).toBeVisible();
    await expect(page.getByText('No steps were recorded for this day.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next month', exact: true }).click();
    await expect(page.getByText('October 2026', { exact: true })).toBeVisible();
    await page.close();
    console.log(`PASS: ${width}px layout, calendar targets, day selection, protection, milestones, month navigation`);
  }
  for (const state of ['empty', 'loading', 'error', 'goal-error']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:8090/?state=${state}`);
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
    if (state === 'empty') await expect(page.getByText('No steps were recorded for this day.', { exact: true })).toBeVisible();
    if (state === 'loading') {
      await expect(page.getByRole('button', { name: /walking streak/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Friday, October 2, 2026/ })).toBeVisible();
      await expect(page.getByText('No steps were recorded for this day.', { exact: true })).not.toBeVisible();
    }
    if (state === 'error') await expect(page.getByText('This month couldn’t load', { exact: true })).toBeVisible();
    if (state === 'goal-error') await expect(page.getByText('Your goal is unavailable. Saved steps are shown above.', { exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/${state}.png`, fullPage: true });
    await page.close();
    console.log(`PASS: ${state} state`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser.close();
}
