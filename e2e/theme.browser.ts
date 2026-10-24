import { expect, test } from '@playwright/test';

test('两个组件交换基础色、不透明灰阶、实例隔离及主题继承', async ({ page }) => {
  await page.goto('/e2e/fixtures/theme.html');
  const verify = async (dark: boolean) => {
    for (const id of ['render', 'input']) {
      await expect(page.locator(`#${id}`)).toHaveCSS('background-color', dark ? 'rgb(34, 34, 34)' : 'rgb(238, 238, 238)');
      await expect(page.locator(`#${id}`)).toHaveCSS('color', dark ? 'rgb(238, 238, 238)' : 'rgb(34, 34, 34)');
    }
    const steps = await page.locator('#render').evaluate(el => {
      const resolve = (name: string) => {
        const probe = document.createElement('span'); probe.style.color = `var(${name})`; el.append(probe);
        const value = getComputedStyle(probe).color; probe.remove();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d')!; ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      return ['--md-default-bg', '--md-default-surface', '--md-default-border', '--md-default-muted', '--md-default-text'].map(resolve);
    });
    expect(steps.every(step => step[3] === 255)).toBe(true);
    for (let i = 1; i < steps.length; i++) {
      expect(dark ? steps[i][0] > steps[i - 1][0] : steps[i][0] < steps[i - 1][0]).toBe(true);
    }
    await expect(page.locator('#independent')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  };
  await verify(false);
  await page.screenshot({ path: 'test-results/theme-light.png', fullPage: true });
  await page.getByRole('button', { name: 'dark', exact: true }).click(); await verify(true);
  await page.screenshot({ path: 'test-results/theme-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'auto', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'dark' }); await verify(true);
  await page.emulateMedia({ colorScheme: 'light' }); await verify(false);
  await page.getByRole('button', { name: 'inherit', exact: true }).click();
  await page.evaluate(() => document.documentElement.classList.add('dark')); await verify(true);
  await page.getByRole('button', { name: 'light', exact: true }).click(); await verify(false);
  await page.locator('#input [contenteditable]').pressSequentially(' @');
  await expect(page.locator('#input [role="listbox"]')).toHaveCSS('background-color', 'rgb(238, 238, 238)');
});

test('全内容字号上限覆盖正文、标题、输入及图表，并保持默认兼容', async ({ page }) => {
  await page.goto('/e2e/fixtures/theme.html');
  await expect(page.locator('#render h1')).toHaveCSS('font-size', '24px');
  await expect(page.locator('#render h2')).toHaveCSS('font-size', '26px');
  await expect(page.locator('#independent h1')).toHaveCSS('font-size', '24px');
  await page.getByRole('button', { name: 'large', exact: true }).click();
  await expect(page.locator('#render h1')).toHaveCSS('font-size', '26px');
  for (const level of [2, 3, 4, 5]) await expect(page.locator(`#render h${level}`)).toHaveCSS('font-size', '26px');
  await expect(page.locator('#render h6')).toHaveCSS('font-size', '23.4px');
  await expect(page.locator('#render p').first()).toHaveCSS('font-size', '26px');
  await expect(page.locator('#input [contenteditable]')).toHaveCSS('font-size', '26px');
  for (const selector of ['#render pre', '#render table', '#render p code', '#render blockquote', '#render .md-alert-body']) {
    const size = await page.locator(selector).first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeLessThanOrEqual(26);
  }
  await expect(page.locator('#render .md-math .katex').first()).toHaveCSS('font-size', '26px');
  await expect(page.locator('#render .md-mermaid svg')).toBeVisible();
  const diagramFont = await page.locator('#render .md-mermaid text').first().evaluate(el => {
    const matrix = (el as SVGGraphicsElement).getScreenCTM()!;
    return parseFloat(getComputedStyle(el).fontSize) * Math.hypot(matrix.c, matrix.d);
  });
  expect(diagramFont).toBeLessThanOrEqual(26.01);
  // 清除统一上限后恢复正常缩放；旧变量不再参与约束。
  await page.locator('#render').evaluate(el => {
    (el as HTMLElement).style.removeProperty('--md-font-max-size');
    (el as HTMLElement).style.setProperty('--md-heading-max-size', '10px');
  });
  await expect(page.locator('#render p').first()).toHaveCSS('font-size', '32px');
  await expect(page.locator('#render h1')).toHaveCSS('font-size', '48px');
});

test('宽 Mermaid 图达到容器宽度后仍随字号放大，且受统一字号上限约束', async ({ page }) => {
  await page.goto('/e2e/fixtures/theme.html');
  const root = page.locator('#render');
  await expect(root.locator('.md-mermaid svg')).toBeVisible();
  await root.evaluate(el => {
    (el as HTMLElement).style.removeProperty('--md-font-max-size');
    (el as HTMLElement).style.width = '160px';
    // 固定测试内边距，独立验证字号倍率而非 em 内边距变化。
    const chart = el.querySelector('.md-mermaid') as HTMLElement;
    chart.style.padding = '0'; chart.style.border = '0';
  });
  const measure = () => root.locator('.md-mermaid svg').evaluate(svg => {
    const text = svg.querySelector('text') as SVGGraphicsElement;
    const ctm = text.getScreenCTM()!;
    return { width: svg.getBoundingClientRect().width,
      font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(ctm.c, ctm.d),
      parent: svg.parentElement!.getBoundingClientRect().width };
  });
  await expect(root.locator('.md-mermaid svg')).toBeVisible();
  await page.getByRole('button', { name: 'size-12', exact: true }).click();
  const base = await measure();
  expect(base.width).toBeCloseTo(base.parent, 0);
  await page.getByRole('button', { name: 'size-24', exact: true }).click();
  const doubled = await measure();
  expect(doubled.font / base.font).toBeCloseTo(2, 1);
  expect(doubled.width / base.width).toBeCloseTo(2, 1);
  expect(doubled.width).toBeGreaterThan(doubled.parent);
  await page.getByRole('button', { name: 'size-48', exact: true }).click();
  await root.evaluate(el => (el as HTMLElement).style.setProperty('--md-font-max-size', '12px'));
  const capped = await measure();
  expect(capped.font).toBeLessThanOrEqual(12.01);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
});
