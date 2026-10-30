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

test('default diagrams avoid ELK loading; image previews preserve the diagram and explicit ELK remains supported', async ({ page }) => {
  const configure = (content: string) => page.evaluate(content => (window as unknown as { previewTest: { configure(options: object): void } }).previewTest.configure({ content }), content);
  const content = '![图片](/media/preview-image.svg)\n\n```mermaid\ngraph LR\n A-->B\n```';
  await configure(content);
  const svg = page.locator('#preview-source .md-mermaid svg');
  await expect(svg).toBeVisible();
  const id = await svg.getAttribute('id');
  const elkLoaded = () => page.evaluate(() => performance.getEntriesByType('resource').some(entry => /\/elk-[^/]+\.(?:js|mjs)$/.test(new URL(entry.name).pathname)));
  expect(await elkLoaded()).toBe(false);
  for (let index = 0; index < 3; index++) {
    await page.locator('#preview-source img').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(svg).toHaveAttribute('id', id!);
  }
  expect(await elkLoaded()).toBe(false);
  await configure(content.replace('graph LR', '---\nconfig:\n  layout: elk\n---\ngraph LR'));
  await expect(svg).toBeVisible();
  await expect(svg).not.toHaveAttribute('id', id!);
  await expect(svg.locator('.node')).toHaveCount(2);
  expect(await elkLoaded()).toBe(true);
});

test.describe('mobile gestures', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('each tap opens or closes once when reopening and switching images', async ({ page }) => {
    await page.route('**/media/preview-second.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="red"/></svg>' }));
    await page.evaluate(() => {
      const state = window as unknown as { previewTest: { configure(options: object): void }; previewPointers: { type: string; action: string }[] };
      state.previewTest.configure({ content: '![A](/media/preview-image.svg)\n\n![B](/media/preview-second.svg)' });
      state.previewPointers = [];
      for (const type of ['pointerdown', 'pointerup', 'click']) document.addEventListener(type, event => {
        const target = event.target as Element;
        const action = target.matches('#preview-source img') ? 'open' : target.matches('.md-image-preview__stage') ? 'close' : undefined;
        if (action) state.previewPointers.push({ type, action });
      }, true);
    });
    for (const index of [0, 0, 1, 0]) {
      const source = page.locator('#preview-source img').nth(index);
      await source.tap();
      await expect(page.getByRole('dialog')).toHaveCount(1);
      await expect(page.locator('.md-image-preview__image')).toHaveAttribute('src', index === 0 ? '/media/preview-image.svg' : '/media/preview-second.svg');
      await page.locator('.md-image-preview__stage').tap({ position: { x: 8, y: 200 } });
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    const pointers = await page.evaluate(() => (window as unknown as { previewPointers: { type: string; action: string }[] }).previewPointers);
    const expected = Array.from({ length: 4 }, () => ['open', 'close'].flatMap(action => ['pointerdown', 'pointerup', 'click'].map(type => ({ type, action })))).flat();
    expect(pointers).toEqual(expected);
  });
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
