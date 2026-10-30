import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/media/preview-image.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#5060a0"/><circle cx="600" cy="400" r="150" fill="#ffcc66"/></svg>' }));
  await page.goto('/e2e/fixtures/image-preview.html');
});

test('keyboard opens a teleported preview; wheel anchors, mouse pans, reset and Escape restore focus', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  const trigger = page.locator('#preview-source img'); await trigger.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog'), stage = page.locator('.md-image-preview__stage');
  await expect(dialog).toBeVisible(); expect(await dialog.evaluate(el => el.parentElement === document.body)).toBe(true);
  await expect(dialog.locator('img')).toHaveJSProperty('naturalWidth', 1200);
  await expect.poll(() => dialog.locator('img').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(800);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.mouse.move(550, 350); await page.mouse.wheel(0, -500);
  await expect.poll(() => stage.evaluate(el => Number(el.getAttribute('data-scale')))).toBeGreaterThan(2);
  await expect.poll(() => stage.evaluate(el => Number(el.getAttribute('data-x')))).toBeLessThan(-20);
  const before = await stage.getAttribute('data-x');
  await page.mouse.move(500, 400); await page.mouse.down(); await page.mouse.move(600, 450, { steps: 5 }); await page.mouse.up();
  expect(await stage.getAttribute('data-x')).not.toBe(before);
  await page.keyboard.press('0'); await expect(stage).toHaveAttribute('data-scale', '1');
  await expect(dialog.locator('button')).toHaveCount(0); await expect(dialog.getByLabel('缩放比例')).toHaveText('100%');
  await page.screenshot({ path: 'test-results/image-preview-light.png' });
  await dialog.locator('img').click(); await expect(dialog).toBeVisible();
  await stage.click({ position: { x: 8, y: 200 } }); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('open preview follows instance colors, system/inherited themes and explicit overrides', async ({ page }) => {
  await page.locator('#preview-source img').click(); const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCSS('background-color', 'rgb(242, 244, 248)');
  const configure = (options: object) => page.evaluate(options => (window as unknown as { previewTest: { configure(options: object): void } }).previewTest.configure(options), options);
  await configure({ theme: 'dark' }); await expect(dialog).toHaveCSS('background-color', 'rgb(18, 24, 33)'); await expect(dialog).toHaveCSS('color', 'rgb(242, 244, 248)');
  await page.screenshot({ path: 'test-results/image-preview-dark.png' });
  await configure({ theme: 'auto' }); await page.emulateMedia({ colorScheme: 'light' }); await expect(dialog).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' }); await expect(dialog).toHaveAttribute('data-theme', 'dark');
  await configure({ theme: '' }); await page.evaluate(() => (window as unknown as { previewTest: { inheritDark(dark: boolean): void } }).previewTest.inheritDark(true));
  await expect(dialog).toHaveCSS('background-color', 'rgb(18, 24, 33)');
  await configure({ options: { background: { dark: '#102030', light: '#eeeeee' } } }); await expect(dialog).toHaveCSS('background-color', 'rgb(16, 32, 48)');
  await configure({ options: false }); await expect(dialog).toHaveCount(0);
  await page.locator('#preview-other img').click(); await expect(dialog).toHaveCSS('background-color', 'rgb(68, 85, 102)');
  await page.keyboard.press('Escape');
});

test('explicit download saves the image; removing content cleans up a live preview', async ({ page }) => {
  await page.locator('#preview-source img').click(); await page.locator('.md-image-preview__image').click({ button: 'right' }); const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载图片', exact: true }).click(); expect((await download).suggestedFilename()).toBe('preview-image.svg');
  await page.evaluate(() => (window as unknown as { previewTest: { configure(options: object): void } }).previewTest.configure({ content: '图片已移除' }));
  await expect(page.getByRole('dialog')).toHaveCount(0); expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test.describe('mobile gestures', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('real two-finger input scales and pans; stationary long press offers download', async ({ page }) => {
    await page.locator('#preview-source img').tap(); const stage = page.locator('.md-image-preview__stage');
    await expect(page.locator('.md-image-preview__image')).toHaveJSProperty('naturalWidth', 1200);
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 165, y: 400, id: 1 }, { x: 225, y: 400, id: 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 95, y: 420, id: 1 }, { x: 335, y: 420, id: 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => stage.evaluate(el => Number(el.getAttribute('data-scale')))).toBeGreaterThan(3);
    await expect.poll(() => stage.evaluate(el => Number(el.getAttribute('data-x')))).toBeGreaterThan(0);
    await expect(page.getByRole('group', { name: '图片操作' })).toHaveCount(0);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 420, id: 1 }] });
    const menu = page.getByRole('group', { name: '图片操作' }); await expect(menu).toBeVisible();
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.screenshot({ path: 'test-results/image-preview-mobile.png' });
    const download = page.waitForEvent('download'); await menu.getByRole('button', { name: '下载图片' }).tap(); expect((await download).suggestedFilename()).toBe('preview-image.svg');
    await menu.getByRole('button', { name: '取消' }).tap(); await expect(page.getByRole('dialog')).toBeFocused();
    await page.keyboard.press('0'); await expect(stage).toHaveAttribute('data-scale', '1');
    await stage.tap({ position: { x: 8, y: 200 } }); await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
