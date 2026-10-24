import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const samples: { safe: boolean; measurable: boolean; width: number; height: number; scroll: number; diagrams: number }[] = [];
    (window as any).__measurements = samples;
    new MutationObserver(() => {
      for (const svg of document.querySelectorAll('body svg')) {
        if (svg.closest('.md-mermaid')) continue;
        const host = svg.closest('[data-md-mermaid-measure]') as HTMLElement | null;
        const css = getComputedStyle(svg);
        const box = svg.getBoundingClientRect();
        samples.push({ safe: !!host && css.visibility === 'hidden' && getComputedStyle(host).position === 'fixed'
            && getComputedStyle(host).pointerEvents === 'none' && host.inert && host.getAttribute('aria-hidden') === 'true',
          measurable: css.display !== 'none' && box.width > 0 && box.height > 0,
          width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
          scroll: window.scrollY, diagrams: document.querySelectorAll('.md-mermaid svg').length });
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto('/e2e/fixtures/mermaid.html');
  await expect(page.locator('.md-mermaid svg')).toHaveCount(3);
});

test('首次多图绘制、主题连续重绘期间隔离临时节点，保留旧图和滚动位置', async ({ page }) => {
  const initial = await page.evaluate(() => (window as any).__measurements);
  expect(initial.length).toBeGreaterThan(0);
  expect(initial.every((s: any) => s.safe)).toBe(true);
  expect(initial.some((s: any) => s.measurable)).toBe(true);
  await expect(page.locator('[data-md-mermaid-measure]')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 700));
  const geometry = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, scroll: window.scrollY }));
  const fill = () => page.locator('.md-mermaid .node rect').first().evaluate(el => getComputedStyle(el).fill);
  const lightFill = await fill();
  let darkFill = '';
  for (const theme of ['dark', 'light', 'dark']) {
    await page.evaluate(() => { (window as any).__measurements.length = 0; });
    await page.getByRole('button', { name: theme, exact: true }).click();
    await expect.poll(fill).not.toBe(theme === 'dark' ? lightFill : darkFill);
    await expect(page.locator('[data-md-mermaid-measure]')).toHaveCount(0);
    const observations = await page.evaluate(() => (window as any).__measurements);
    expect(observations.length).toBeGreaterThan(0);
    for (const sample of observations) {
      expect(sample.safe).toBe(true);
      expect(sample.diagrams).toBe(3);
      expect({ width: sample.width, height: sample.height, scroll: sample.scroll }).toEqual(geometry);
    }
    if (theme === 'dark') darkFill = await fill();
  }
  // 不等待每次重绘完成，最终结果必须对应最后的 dark。
  await page.evaluate(async () => {
    for (const theme of ['light', 'dark', 'light', 'dark']) {
      [...document.querySelectorAll('button')].find(button => button.textContent === theme)!.click();
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  });
  await expect(page.locator('[data-md-mermaid-measure]')).toHaveCount(0);
  for (const node of await page.locator('.md-mermaid .node rect').all()) await expect(node).toHaveCSS('fill', darkFill);
  const dimensions = await page.locator('.md-mermaid svg').evaluateAll(elements => elements.map(svg => {
    const box = (svg as SVGSVGElement).getBBox();
    return { width: box.width, height: box.height, nodes: svg.querySelectorAll('.node').length,
      edges: svg.querySelectorAll('.edgePath, .flowchart-link').length, text: svg.textContent };
  }));
  for (const diagram of dimensions) {
    expect(diagram.width).toBeGreaterThan(100); expect(diagram.height).toBeGreaterThan(30);
    expect(diagram.nodes).toBe(2); expect(diagram.edges).toBeGreaterThan(0);
    expect(diagram.text).toContain('信任 · 共同创业'); expect(diagram.text).toContain('ENT-123');
  }
  expect(await page.evaluate(() => (window as any).__measurements.every((s: any) => s.safe && s.diagrams === 3))).toBe(true);
});

test('渲染异常和绘制中卸载后无测量容器残留', async ({ page }) => {
  await page.getByRole('button', { name: 'fail', exact: true }).click();
  await expect(page.locator('.md-code-block small')).toHaveCount(3);
  await expect(page.locator('[data-md-mermaid-measure]')).toHaveCount(0);
  await expect(page.locator('parsererror')).toHaveCount(0);
  // 新页面在绘制开始后立即卸载，验证最终清理。
  await page.reload();
  await expect(page.locator('.md-mermaid svg')).toHaveCount(3);
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      if (!document.querySelector('[data-md-mermaid-measure] svg')) return;
      observer.disconnect();
      [...document.querySelectorAll('button')].find(button => button.textContent === 'unmount')!.click();
      (window as any).__unmountedDuringRender = true;
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole('button', { name: 'dark', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__unmountedDuringRender)).toBe(true);
  await expect(page.locator('.markdown-render')).toHaveCount(0);
  await expect(page.locator('[data-md-mermaid-measure], [id^="dmd-diagram-"]')).toHaveCount(0);
});
