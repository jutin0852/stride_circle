import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

await mkdir('.artifacts/home', { recursive: true });
const browser = await chromium.launch({ channel: process.env.HOME_BROWSER_CHANNEL ?? 'msedge', headless: true });
const errors = [];
try {
  for (const width of [320, 393, 760]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:8091/?long=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await expect(page.getByRole('heading', { name: /Your walking day/ })).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('6,240', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Goal reached', { exact: true })).toHaveCount(0);
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error(`Horizontal overflow at ${width}px`);
    await page.screenshot({ path: `.artifacts/home/home-${width}.png` });
    await page.getByRole('button', { name: 'Switch featured circle' }).click();
    await page.getByRole('button', { name: 'Lunch Loop', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Lunch Loop', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Send Nice work to Maya' }).click();
    await expect(page.getByRole('button', { name: 'Cheer sent', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Open your private profile and health settings' }).click();
    await expect(page.getByRole('heading', { name: 'Health connection', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close settings', exact: true }).last().click();
    await page.getByRole('button', { name: 'Simulate goal crossing', exact: true }).click();
    await expect(page.getByText('Goal reached', { exact: true })).toBeVisible();
    await expect(page.getByText('8,240', { exact: true })).toBeVisible();
    await page.close();
    console.log(`PASS: ${width}px layout, circle switch, cheer confirmation, private settings, goal crossing`);
  }
  for (const state of ['unavailable', 'stale', 'zero', 'empty', 'loading', 'circle-error', 'circle-loading', 'goal']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 844 }, reducedMotion: 'reduce', colorScheme: 'dark' });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:8091/?state=${state}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await expect(page.getByRole('heading', { name: /Your walking day/ })).toBeVisible({ timeout: 60000 });
    if (state === 'unavailable') { await expect(page.getByText('Health access needs attention', { exact: true })).toBeVisible(); await expect(page.getByText('Today’s total is unavailable', { exact: true })).toBeVisible(); }
    if (state === 'stale') await expect(page.getByText('Today’s total may be incomplete', { exact: true })).toBeVisible();
    if (state === 'zero') await expect(page.getByText('A few steps is a lovely start.', { exact: true })).toBeVisible();
    if (state === 'empty') await expect(page.getByRole('button', { name: 'Find your circle', exact: true })).toBeVisible();
    if (state === 'circle-error') await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
    if (state !== 'goal') await expect(page.getByText('Goal reached', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `.artifacts/home/${state}-dark-320.png` });
    await page.close();
    console.log(`PASS: ${state}, dark appearance, reduced motion`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }
